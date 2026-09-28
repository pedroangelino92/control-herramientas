import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase/config';
import { Usuario, RolUsuario, EstadoUsuario, SUPERADMIN_EMAIL } from '../types';

const ADMIN_EMAILS = [
  SUPERADMIN_EMAIL.toLowerCase()
];

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: Usuario | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isTechnician: boolean;
  isPending: boolean;
  isRejected: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, nombre: string, telefono?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  quickAdminAccess: (email: string, pass?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize user profile in Firestore
  const syncUserProfile = async (user: FirebaseUser, customName?: string, customPhone?: string): Promise<Usuario> => {
    const userDocRef = doc(db, 'usuarios', user.uid);
    const userEmail = (user.email || '').toLowerCase().trim();
    const isSuperAdminEmail = userEmail === SUPERADMIN_EMAIL.toLowerCase();
    const isAutoAdmin = ADMIN_EMAILS.includes(userEmail) || isSuperAdminEmail;

    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const existingData = docSnap.data() as Usuario;
        // If it is the superadmin or auto-admin, ensure appropriate role and active status
        const targetRole: RolUsuario = isSuperAdminEmail ? 'superadmin' : 'admin';
        if (isAutoAdmin && (existingData.rol !== targetRole || existingData.estado !== 'activo')) {
          const updated: Partial<Usuario> = {
            rol: targetRole,
            estado: 'activo',
            aprobadoPor: 'Sistema (Super-Admin)',
            fechaAprobacion: new Date().toISOString()
          };
          await setDoc(userDocRef, updated, { merge: true });
          return { ...existingData, ...updated } as Usuario;
        }
        return existingData;
      } else {
        // Create initial user profile safely without undefined values
        const targetRole: RolUsuario = isSuperAdminEmail ? 'superadmin' : (isAutoAdmin ? 'admin' : 'tecnico');
        const newProfile: Usuario = {
          uid: user.uid,
          email: userEmail,
          nombre: customName || user.displayName || userEmail.split('@')[0] || (isSuperAdminEmail ? 'Pedro Angelino' : 'Usuario'),
          rol: targetRole,
          estado: (isAutoAdmin ? 'activo' : 'pendiente') as EstadoUsuario,
          fechaCreacion: new Date().toISOString(),
          telefono: customPhone || '',
        };

        if (isAutoAdmin) {
          newProfile.aprobadoPor = isSuperAdminEmail ? 'Sistema (Super-Admin)' : 'Sistema (Auto-Admin)';
          newProfile.fechaAprobacion = new Date().toISOString();
        }

        await setDoc(userDocRef, newProfile);
        return newProfile;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `usuarios/${user.uid}`);
    }
  };

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Sync first to guarantee document exists
          await syncUserProfile(user);

          // Real-time listener on user's profile document so instant approvals reflect immediately
          const userDocRef = doc(db, 'usuarios', user.uid);
          unsubscribeDoc = onSnapshot(
            userDocRef,
            (docSnapshot) => {
              if (docSnapshot.exists()) {
                setUserProfile(docSnapshot.data() as Usuario);
              }
              setLoading(false);
            },
            (error) => {
              handleFirestoreError(error, OperationType.GET, `usuarios/${user.uid}`);
              setLoading(false);
            }
          );
        } catch (error) {
          console.error('Error syncing user profile:', error);
          setLoading(false);
        }
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await syncUserProfile(cred.user);
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, nombre: string, telefono?: string) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      await syncUserProfile(cred.user, nombre, telefono);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(cred.user);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const quickAdminAccess = async (adminEmail: string, pass: string = 'admin123456') => {
    setLoading(true);
    try {
      try {
        const cred = await signInWithEmailAndPassword(auth, adminEmail.trim(), pass);
        await syncUserProfile(cred.user);
      } catch (err: any) {
        if (
          err.code === 'auth/invalid-credential' ||
          err.code === 'auth/user-not-found'
        ) {
          // If login fails because user account hasn't been created yet, auto-register
          const cred = await createUserWithEmailAndPassword(auth, adminEmail.trim(), pass);
          const defaultName = adminEmail.includes('angelino') 
            ? 'Pedro Angelino' 
            : adminEmail.includes('mongelos') 
            ? 'Pedro Mongelos' 
            : 'Administrador';
          await syncUserProfile(cred.user, defaultName);
        } else {
          throw err;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await syncUserProfile(currentUser);
    }
  };

  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const isSuperAdmin = userEmail === SUPERADMIN_EMAIL.toLowerCase();
  const isAutoAdmin = ADMIN_EMAILS.includes(userEmail) || isSuperAdmin;

  // Role and status resolution
  const isAdmin = isSuperAdmin || ((userProfile?.rol === 'admin' || userProfile?.rol === 'superadmin') && userProfile?.estado === 'activo');
  const isTechnician = !isAdmin && userProfile?.rol === 'tecnico' && userProfile?.estado === 'activo';
  const isPending = !isAutoAdmin && (userProfile?.estado === 'pendiente' || !userProfile?.estado);
  const isRejected = !isAutoAdmin && userProfile?.estado === 'rechazado';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isSuperAdmin,
        isAdmin,
        isTechnician,
        isPending,
        isRejected,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        resetPassword,
        quickAdminAccess,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
