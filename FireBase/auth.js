import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification // 1. Importar la función para enviar el correo
} from 'firebase/auth';
import { auth } from './firebaseConfig';

// Registrar usuario y enviar email de verificación
export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // 2. Enviar el correo de verificación al nuevo usuario
    await sendEmailVerification(userCredential.user);
    // Es una buena práctica cerrar la sesión para forzar al usuario a verificar
    await signOut(auth);
    return userCredential.user;
  } catch (error) {
    // Propagar el error para manejarlo en la UI
    throw error;
  }
};

// Iniciar sesión (con chequeo de verificación)
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 3. Comprobar si el email del usuario ha sido verificado
    if (!userCredential.user.emailVerified) {
      // Si no está verificado, cerramos la sesión
      await signOut(auth); 
      // Y lanzamos un error personalizado para mostrar un mensaje claro
      const error = new Error('Por favor, verifica tu correo antes de iniciar sesión.');
      error.code = 'auth/email-not-verified';
      throw error;
    }
    
    // Si está verificado, retornamos el usuario
    return userCredential.user;
  } catch (error) {
    // Propagar el error para manejarlo en la UI
    throw error;
  }
};

// Cerrar sesión
export const logoutUser = async () => {
  await signOut(auth);
};
