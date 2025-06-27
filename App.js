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
  Image
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { auth, authFunctions } from './FireBase';
import { onAuthStateChanged } from 'firebase/auth';

// Importar solo las pantallas necesarias desde models
import CunaScreen from './Models/Cuna';
import ChartScreen from './Models/Chart';
import HomeScreen from './Models/Home';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  useEffect(() => {
    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleAuth = async () => {
    if (!email.includes('@')) {
      shakeAnimation();
      Alert.alert('Error', 'Correo electrónico inválido');
      return;
    }
    if (password.length < 6) {
      shakeAnimation();
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegistering) {
        await authFunctions.registerUser(email, password);
        Alert.alert('Éxito', 'Usuario registrado correctamente');
      } else {
        await authFunctions.loginUser(email, password);
      }
    } catch (error) {
      let errorMessage = "Ocurrió un error inesperado.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo ya está registrado';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuario no encontrado';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El formato del correo electrónico es inválido.';
      }
      shakeAnimation();
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const shakeAnimation = () => {
    const shake = new Animated.Value(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    
    return shake.interpolate({
      inputRange: [-10, 0, 10],
      outputRange: ['-10deg', '0deg', '10deg'],
    });
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.keyboardContainer}
    >
      <Animated.View 
        style={[
          styles.authContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Image 
          source={require('./assets/Logo.png')} // Asegúrate de tener una imagen en esta ruta
          style={styles.logo}
        />
        
        <Text style={styles.title}>{isRegistering ? 'Crear Cuenta' : 'Bienvenido'}</Text>
        <Text style={styles.subtitle}>
          {isRegistering ? 'Regístrate para comenzar' : 'Inicia sesión para continuar'}
        </Text>
        
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        
        <TouchableOpacity 
          style={styles.authButton}
          onPress={handleAuth}
          disabled={isLoading}
        >
          {isLoading ? (
            <Ionicons name="refresh-outline" size={24} color="white" style={styles.loadingIcon} />
          ) : (
            <Text style={styles.authButtonText}>
              {isRegistering ? 'Registrarse' : 'Iniciar Sesión'}
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.switchButton}
          onPress={() => setIsRegistering(!isRegistering)}
        >
          <Text style={styles.switchButtonText}>
            {isRegistering ? 
              '¿Ya tienes cuenta? Inicia Sesión' : 
              '¿No tienes cuenta? Regístrate'}
          </Text>
        </TouchableOpacity>
        
        {!isRegistering && (
          <TouchableOpacity style={styles.forgotButton}>
            <Text style={styles.forgotButtonText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Cuna': iconName = 'bed'; break;
            case 'Gráficos': iconName = 'stats-chart'; break;
            default: iconName = 'alert';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6a1b9a',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#f8f9fa',
          borderTopWidth: 0,
          elevation: 10,
          shadowOpacity: 0.1,
          shadowRadius: 10,
          height: 60,
          paddingBottom: 5,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Gráficos" component={ChartScreen} />
      <Tab.Screen name="cuna" component={CunaScreen} options={{ title: 'Cuna' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserData(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <NavigationContainer>
      {userData ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabNavigator} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator>
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen} 
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#fff',
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#6a1b9a',
    textAlign: 'center',
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
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#333',
  },
  authButton: {
    backgroundColor: '#6a1b9a',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#6a1b9a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingIcon: {
    transform: [{ rotate: '360deg' }],
  },
  switchButton: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#6a1b9a',
    fontSize: 14,
  },
  forgotButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotButtonText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});