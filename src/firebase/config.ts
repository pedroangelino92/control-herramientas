import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID as required
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling conforming to Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const isUnavailable = (error as any)?.code === 'unavailable' || 
    (error instanceof Error && (error.message.includes('unavailable') || error.message.includes('offline')));

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  if (isUnavailable) {
    console.warn(`Firestore [${operationType}] at "${path}": Temporary offline/unavailable state. Operating from cache until connection reconnects.`);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }

  throw new Error(JSON.stringify(errInfo));
}

// Validation connection test on startup as required by skill (only when authenticated)
export async function testFirestoreConnection() {
  if (!auth.currentUser) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    // Gracefully handle offline or network transient states
    if (error?.code === 'unavailable' || (error instanceof Error && error.message.includes('offline'))) {
      console.warn('Firebase connection: operating in cached/offline state until connection stabilizes.');
    }
  }
}
