import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { CategoriaItem, DEFAULT_CATEGORIES, Herramienta } from '../types';

let isSeedingCategories = false;

/**
 * Subscribes to real-time updates of the categories collection.
 * If the collection is empty, automatically seeds with standard default categories.
 */
export const subscribeToCategorias = (
  onSuccess: (categorias: CategoriaItem[]) => void,
  onError?: (err: unknown) => void
) => {
  const collectionRef = collection(db, 'categorias');
  const q = query(collectionRef, orderBy('nombre', 'asc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      // If collection is empty and not currently seeding, seed defaults once
      if (snapshot.empty && !isSeedingCategories) {
        isSeedingCategories = true;
        try {
          const batch = writeBatch(db);
          for (const catName of DEFAULT_CATEGORIES) {
            const newDocRef = doc(collectionRef);
            batch.set(newDocRef, {
              nombre: catName,
              descripcion: '',
              fechaCreacion: new Date().toISOString(),
              creadoPor: 'Sistema'
            });
          }
          await batch.commit();
        } catch (seedErr) {
          console.error('Error auto-seeding categories:', seedErr);
        } finally {
          isSeedingCategories = false;
        }
        return;
      }

      const items: CategoriaItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as CategoriaItem[];

      onSuccess(items);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, 'categorias');
    }
  );
};

/**
 * Creates a new category in Firestore.
 */
export const createCategoria = async (
  nombre: string,
  descripcion?: string,
  creadoPor: string = 'Admin'
): Promise<string> => {
  const cleanNombre = nombre.trim();
  if (!cleanNombre) {
    throw new Error('El nombre de la categoría es obligatorio.');
  }

  // Check duplicate
  const collectionRef = collection(db, 'categorias');
  const q = query(collectionRef);
  const snap = await getDocs(q);
  const exists = snap.docs.some(
    (d) => (d.data().nombre || '').trim().toLowerCase() === cleanNombre.toLowerCase()
  );

  if (exists) {
    throw new Error(`Ya existe una categoría con el nombre "${cleanNombre}".`);
  }

  try {
    const docRef = await addDoc(collectionRef, {
      nombre: cleanNombre,
      descripcion: descripcion?.trim() || '',
      fechaCreacion: new Date().toISOString(),
      creadoPor: creadoPor.trim() || 'Admin',
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'categorias');
    throw error;
  }
};

/**
 * Updates an existing category.
 * If the name changes, updates all tools in Firestore that use the old name.
 */
export const updateCategoria = async (
  id: string,
  oldNombre: string,
  newNombre: string,
  descripcion?: string
): Promise<void> => {
  const cleanNewNombre = newNombre.trim();
  if (!cleanNewNombre) {
    throw new Error('El nombre de la categoría no puede estar vacío.');
  }

  // Check duplicate if name is changed
  if (oldNombre.toLowerCase() !== cleanNewNombre.toLowerCase()) {
    const collectionRef = collection(db, 'categorias');
    const snap = await getDocs(collectionRef);
    const exists = snap.docs.some(
      (d) => d.id !== id && (d.data().nombre || '').trim().toLowerCase() === cleanNewNombre.toLowerCase()
    );
    if (exists) {
      throw new Error(`Ya existe otra categoría llamada "${cleanNewNombre}".`);
    }
  }

  try {
    const catRef = doc(db, 'categorias', id);
    await updateDoc(catRef, {
      nombre: cleanNewNombre,
      descripcion: descripcion?.trim() || '',
    });

    // If name changed, synchronize existing tools
    if (oldNombre.trim() !== cleanNewNombre) {
      const toolsRef = collection(db, 'herramientas');
      const q = query(toolsRef, where('categoria', '==', oldNombre.trim()));
      const toolsSnap = await getDocs(q);

      if (!toolsSnap.empty) {
        const batch = writeBatch(db);
        toolsSnap.docs.forEach((toolDoc) => {
          batch.update(toolDoc.ref, { categoria: cleanNewNombre });
        });
        await batch.commit();
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `categorias/${id}`);
    throw error;
  }
};

/**
 * Deletes a category from Firestore.
 * STRICT ENFORCEMENT: Rejects deletion if any tools have this category assigned.
 */
export const deleteCategoria = async (
  id: string,
  nombre: string,
  herramientas: Herramienta[]
): Promise<void> => {
  const cleanNombre = nombre.trim();

  // 1. In-memory check against loaded tools
  const inMemoryCount = herramientas.filter(
    (h) => (h.categoria || '').trim().toLowerCase() === cleanNombre.toLowerCase()
  ).length;

  if (inMemoryCount > 0) {
    throw new Error(
      `No se puede eliminar la categoría "${cleanNombre}" porque tiene ${inMemoryCount} herramienta(s) asignada(s). Debes reasignar o eliminar primero esas herramientas.`
    );
  }

  // 2. Direct Firestore query verification for absolute consistency
  try {
    const toolsRef = collection(db, 'herramientas');
    const q = query(toolsRef, where('categoria', '==', cleanNombre));
    const toolsSnap = await getDocs(q);

    if (!toolsSnap.empty) {
      throw new Error(
        `No se puede eliminar la categoría "${cleanNombre}" porque tiene ${toolsSnap.size} herramienta(s) registrada(s) en la base de datos.`
      );
    }

    const catRef = doc(db, 'categorias', id);
    await deleteDoc(catRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categorias/${id}`);
    throw error;
  }
};
