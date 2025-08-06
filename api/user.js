// ProyectoFN/api/user.js

import { auth } from '../FireBase/firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import axios from 'axios';

/**
 * Registrar usuario en Firebase y luego en tu API SQL.
 */
export const registerUser = async (email, password, nombre, apellidos, numTel, fechaNac, idRol, nombreCasa, direccionCasa, telefonoCasa, correoCasa) => {
  // 1. Crear el usuario en Firebase
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // 2. Enviar correo de verificación
  await sendEmailVerification(userCredential.user);

  // 3. Obtener el UID de Firebase para guardarlo en tu base de datos
  const firebaseUID = userCredential.user.uid;

  // --- CORRECCIÓN ---
  // Se llama al endpoint correcto `/api/registroConCasa` y se envían todos los datos.
  await axios.post('http://192.168.0.223:3000/api/registroConCasa', {
    firebaseUID,
    Nombre: nombre,
    Apellidos: apellidos,
    Correo: email,
    NumTel: numTel,
    FechaNacimiento: fechaNac,
    idRol,
    nombreCasa,
    direccionCasa,
    telefonoCasa,
    correoCasa
  });

  // 4. Cerrar sesión en Firebase para forzar al usuario a verificar su correo
  await signOut(auth);

  // Se devuelve el usuario de Firebase, aunque ya se ha cerrado la sesión.
  // La app lo usará para saber que el registro fue exitoso.
  return userCredential.user;
};

/**
 * Iniciar sesión y verificar si está validado el email.
 */
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);

  // Muy importante: verificar que el email haya sido validado por el usuario.
  if (!userCredential.user.emailVerified) {
    await signOut(auth); // Cerrar sesión si no está verificado
    const error = new Error('Por favor, verifica tu correo antes de iniciar sesión.');
    error.code = 'auth/email-not-verified'; // Código de error personalizado para manejarlo en la UI
    throw error;
  }

  return userCredential.user;
};

/**
 * Cerrar sesión.
 */
export const logoutUser = async () => {
  await signOut(auth);
};

/**
 * Consultar rol del usuario usando el email.
 */
export async function fetchUserRole(email) {
  // Cambia la IP/puerto si tu backend está en localhost o en otra IP
  // Ejemplo para localhost:
  // const url = `http://localhost:3000/api/rol/by-email?email=${encodeURIComponent(email)}`;
  // Ejemplo para tu IP actual:
  const url = `http://192.168.0.223:3000/api/rol/by-email?email=${encodeURIComponent(email)}`;

  const resp = await fetch(url);

  if (!resp.ok) {
    // Lanza un error si la respuesta no es exitosa (ej. 404, 500)
    throw new Error(`Error al obtener el rol: ${resp.status}`);
  }

  const { role } = await resp.json();
  return role;
}