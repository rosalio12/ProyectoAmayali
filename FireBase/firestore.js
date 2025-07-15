import { 
  collection, 
  addDoc, 
  getDocs,
  doc, 
  updateDoc,
  deleteDoc 
} from 'firebase/firestore';
import { db } from './firebaseConfig'; // ✅ SDK oficial
 // Asegúrate de que la ruta sea correcta

// Crear documento
export const createDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Leer documentos
export const getDocuments = async (collectionName) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Actualizar documento
export const updateDocument = async (collectionName, docId, newData) => {
  await updateDoc(doc(db, collectionName, docId), newData);
};

// Eliminar documento
export const deleteDocument = async (collectionName, docId) => {
  await deleteDoc(doc(db, collectionName, docId));
};