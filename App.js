import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ScrollView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { fetchUserRole, registerUser, loginUser, logoutUser } from './api/user';

// Importación de pantallas (sin cambios aquí)
import CunaScreen from './Models/Cuna';
import ChartScreen from './Models/Chart';
import HomeScreen from './Models/Home';
import EmergenciaScreen from './Models/emergencia';
import HistoryScreen from './Models/historial';
import CunaEnfermeroScreen from './ScreensEnfermero/CunaEnfermero';
import ChartEnfermeroScreen from './ScreensEnfermero/ChartEnfermero';
import HomeEnfermeroScreen from './ScreensEnfermero/HomeEnfermero';
import HistoryEnfermeroScreen from './ScreensEnfermero/HistorialEnfermero';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --- AuthScreen (sin cambios significativos en su lógica interna de autenticación) ---
// (El código de AuthScreen es el que me proporcionaste, lo mantengo intacto para ti)
function AuthScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [numTel, setNumTel] = useState('');
  const [fechaNac, setFechaNac] = useState('');
  const [nombreCasa, setNombreCasa] = useState('');
  const [direccionCasa, setDireccionCasa] = useState('');
  const [telefonoCasa, setTelefonoCasa] = useState('');
  const [correoCasa, setCorreoCasa] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [esMadre, setEsMadre] = useState(false);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true })
    ]).start();
  }, []);

  const handleAuth = async () => {
    if (!email.includes('@')) return Alert.alert('Error', 'Correo electrónico inválido.');
    if (password.length < 6) return Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');

    if (isRegistering) {
      if (!nombre || !apellidos || !numTel || !fechaNac || !nombreCasa)
        return Alert.alert('Error', 'Por favor, completa todos los campos de registro.');
    }

    setIsLoading(true);
    try {
      if (isRegistering) {
        await registerUser(
          email,
          password,
          nombre,
          apellidos,
          numTel,
          fechaNac,
          esMadre ? 2 : 1, // idRol: 2 para Madre, 1 para Padre
          nombreCasa,
          direccionCasa,
          telefonoCasa,
          correoCasa
        );

        Alert.alert('¡Registro Exitoso!', 'Hemos enviado un enlace de verificación a tu correo. Por favor, revísalo para poder iniciar sesión.');
        setIsRegistering(false);
      } else {
        const user = await loginUser(email, password);
        if (user) {
          onLoginSuccess(user);
        }
      }
    } catch (e) {
      console.error("Error en handleAuth:", e);
      const msg = e.code === 'auth/email-not-verified'
        ? 'Tu correo no ha sido verificado. Por favor, revisa tu bandeja de entrada.'
        : (e.response?.data?.error || e.message || 'Ocurrió un error inesperado.');
      Alert.alert('Error de Autenticación', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardContainer}>
      <ScrollView contentContainerStyle={styles.authContainer}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.title}>{isRegistering ? 'Crear Cuenta' : 'Bienvenido'}</Text>
          <Text style={styles.subtitle}>{isRegistering ? 'Ingresa tus datos para registrarte' : 'Inicia sesión para continuar'}</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#888" />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#888" />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {isRegistering && (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#888" />
                <TextInput style={styles.input} placeholder="Nombre(s)" value={nombre} onChangeText={setNombre} />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="people-outline" size={20} color="#888" />
                <TextInput style={styles.input} placeholder="Apellidos" value={apellidos} onChangeText={setApellidos} />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#888" />
                <TextInput style={styles.input} placeholder="Teléfono" value={numTel} onChangeText={setNumTel} keyboardType="phone-pad" />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={20} color="#888" />
                <TextInput style={styles.input} placeholder="Fecha de Nacimiento (YYYY-MM-DD)" value={fechaNac} onChangeText={setFechaNac} />
              </View>

              <Text style={styles.section}>Datos de la Casa</Text>
              <TextInput style={styles.inputField} placeholder="Nombre de la Casa" value={nombreCasa} onChangeText={setNombreCasa} />
              <TextInput style={styles.inputField} placeholder="Dirección de la Casa" value={direccionCasa} onChangeText={setDireccionCasa} />
              <TextInput style={styles.inputField} placeholder="Teléfono de la Casa" value={telefonoCasa} onChangeText={setTelefonoCasa} keyboardType="phone-pad" />
              <TextInput style={styles.inputField} placeholder="Correo de la Casa" value={correoCasa} onChangeText={setCorreoCasa} keyboardType="email-address" />

              <View style={styles.roleContainer}>
                <Text style={styles.roleLabel}>Registrar como:</Text>
                <View style={styles.roleOptions}>
                  <TouchableOpacity onPress={() => setEsMadre(false)} style={[styles.roleBtn, !esMadre && styles.roleSelected]}>
                    <Text style={!esMadre ? styles.roleTextSel : styles.roleText}>Padre</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEsMadre(true)} style={[styles.roleBtn, esMadre && styles.roleSelected]}>
                    <Text style={esMadre ? styles.roleTextSel : styles.roleText}>Madre</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.authButton} onPress={handleAuth} disabled={isLoading}>
            <Text style={styles.authButtonText}>{isLoading ? 'Cargando...' : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.switchButton} onPress={() => setIsRegistering(!isRegistering)} disabled={isLoading}>
            <Text style={styles.switchButtonText}>{isRegistering ? '¿Ya tienes una cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ParentTabNavigator({ userId }) {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      >
        {props => <HomeScreen {...props} userId={userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Alertas"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      >
        {props => <ChartScreen {...props} userId={userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Cuna"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="bed-outline" size={size} color={color} />,
        }}
      >
        {props => <CunaScreen {...props} userId={userId} />}
      </Tab.Screen>
    
      <Tab.Screen
        name="Historial"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      >
        {props => <HistoryScreen {...props} userId={userId} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function NurseTabNavigator({ userId }) {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Inicio"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      >
        {props => <HomeEnfermeroScreen {...props} userId={userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Cuna"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="bed-outline" size={size} color={color} />,
        }}
      >
        {props => <CunaEnfermeroScreen {...props} userId={userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Gráficos"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
        }}
      >
        {props => <ChartEnfermeroScreen {...props} userId={userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Historial"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      >
        {props => <HistoryEnfermeroScreen {...props} userId={userId} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  // userSession ahora contendrá { firebaseUser, role, idUsuario }
  const [userSession, setUserSession] = useState(null);

  // Puedes comentar logoutUser() durante el desarrollo si te molesta
  // que la sesión se cierre cada vez que reinicias la app.
  useEffect(() => {
    // logoutUser();
  }, []);

  const handleLoginSuccess = async firebaseUser => {
    try {
      // 1. PRIMERA LLAMADA A LA API: Obtener el rol del usuario (espera una cadena como "Enfermero")
      const role = await fetchUserRole(firebaseUser.email);
      console.log('Rol obtenido de la API (a través de user.js):', role); // Para depuración

      if (!role) {
        Alert.alert('Error', 'No se encontró un rol para este usuario.');
        await logoutUser();
        return;
      }

      // 2. SEGUNDA LLAMADA A LA API: Obtener el idUsuario usando el nuevo endpoint
      // Asegúrate de que esta URL sea correcta y que tu backend esté corriendo en esa IP y puerto
      const userIdApiUrl = `http://172.18.2.158:3000/api/usuario-id-by-email?email=${encodeURIComponent(firebaseUser.email)}`;
      const responseId = await fetch(userIdApiUrl);
      
      if (!responseId.ok) {
        // Si hay un error HTTP, leemos el cuerpo de la respuesta para más detalles
        const errorBody = await responseId.text();
        throw new Error(`Error al obtener ID de usuario: ${responseId.status} - ${errorBody}`);
      }
      
      const { idUsuario } = await responseId.json();
      console.log('ID de usuario obtenido del nuevo endpoint de la API:', idUsuario); // Para depuración

      if (idUsuario === undefined || idUsuario === null) {
        Alert.alert('Error', 'No se pudo recuperar el ID de usuario de la base de datos.');
        await logoutUser();
        return;
      }

      // Almacenamos la sesión de usuario completa, incluyendo firebaseUser, role e idUsuario
      setUserSession({ firebaseUser, role, idUsuario });
      console.log('Sesión de usuario actualizada con rol e idUsuario:', { firebaseUser, role, idUsuario }); // Para depuración

    } catch (error) {
      console.error("Error en handleLoginSuccess:", error);
      Alert.alert('Error de Inicio de Sesión', 'Ocurrió un problema durante el inicio de sesión. Por favor, intenta de nuevo. Detalle: ' + error.message);
      await logoutUser();
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!userSession ? (
          <Stack.Screen name="Auth">
            {props => <AuthScreen {...props} onLoginSuccess={handleLoginSuccess} />}
          </Stack.Screen>
        ) : (
          // Pasamos el idUsuario de userSession a los navegadores de pestañas
          <Stack.Screen name="Main">
            {props =>
              userSession.role === 'Enfermero' ? (
                <NurseTabNavigator userId={userSession.idUsuario} />
              ) : (
                <ParentTabNavigator userId={userSession.idUsuario} />
              )
            }
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const tabScreenOptions = {
  tabBarActiveTintColor: '#6a1b9a',
  tabBarInactiveTintColor: 'gray',
  tabBarStyle: { height: 60, paddingBottom: 5, backgroundColor: '#ffffff' },
  headerShown: false,
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    height: 50,
    marginLeft: 10,
    color: '#333',
    fontSize: 16,
  },
  inputField: {
    backgroundColor: '#f7f7f7',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
  },
  section: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  roleContainer: {
    marginVertical: 15,
  },
  roleLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  roleOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#6a1b9a',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  roleSelected: {
    backgroundColor: '#6a1b9a',
  },
  roleText: {
    color: '#6a1b9a',
    fontWeight: 'bold',
  },
  roleTextSel: {
    color: '#fff',
    fontWeight: 'bold',
  },
  authButton: {
    backgroundColor: '#6a1b9a',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  authButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 25,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#6a1b9a',
    fontSize: 15,
    fontWeight: '600',
  }
});