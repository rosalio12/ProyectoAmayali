"use client"

import { useEffect, useState } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
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
  ScrollView,
} from "react-native"
import Ionicons from "react-native-vector-icons/Ionicons"

import { fetchUserRole, registerUser, loginUser, logoutUser } from "./api/user"

// Importación de pantallas
import CunaScreen from "./Models/Cuna"
import ChartScreen from "./Models/Chart"
import HomeScreen from "./Models/Home"
import HistoryScreen from "./Models/historial"
import CunaEnfermeroScreen from "./ScreensEnfermero/CunaEnfermero"
import ChartEnfermeroScreen from "./ScreensEnfermero/ChartEnfermero"
import HomeEnfermeroScreen from "./ScreensEnfermero/HomeEnfermero"
import HistoryEnfermeroScreen from "./ScreensEnfermero/HistorialEnfermero"
import RegistroAlimentacionScreen from "./ScreensEnfermero/alimentacion"

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function AuthScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [apellidos, setApellidos] = useState("")
  const [numTel, setNumTel] = useState("")
  const [fechaNac, setFechaNac] = useState("")
  const [nombreCasa, setNombreCasa] = useState("")
  const [direccionCasa, setDireccionCasa] = useState("")
  const [telefonoCasa, setTelefonoCasa] = useState("")
  const [correoCasa, setCorreoCasa] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [esMadre, setEsMadre] = useState(false)

  const fadeAnim = useState(new Animated.Value(0))[0]
  const slideAnim = useState(new Animated.Value(50))[0]

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1200,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handleAuth = async () => {
    if (!email.includes("@")) return Alert.alert("Error", "Correo electrónico inválido.")
    if (password.length < 6) return Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.")

    if (isRegistering) {
      if (!nombre || !apellidos || !numTel || !fechaNac || !nombreCasa)
        return Alert.alert("Error", "Por favor, completa todos los campos de registro.")
    }

    setIsLoading(true)
    try {
      if (isRegistering) {
        await registerUser(
          email,
          password,
          nombre,
          apellidos,
          numTel,
          fechaNac,
          esMadre ? 2 : 1,
          nombreCasa,
          direccionCasa,
          telefonoCasa,
          correoCasa,
        )

        Alert.alert(
          "¡Registro Exitoso!",
          "Hemos enviado un enlace de verificación a tu correo. Por favor, revísalo para poder iniciar sesión.",
        )
        setIsRegistering(false)
      } else {
        const user = await loginUser(email, password)
        if (user) {
          onLoginSuccess(user)
        }
      }
    } catch (e) {
      console.error("Error en handleAuth:", e)
      const msg =
        e.code === "auth/email-not-verified"
          ? "Tu correo no ha sido verificado. Por favor, revisa tu bandeja de entrada."
          : e.response?.data?.error || e.message || "Ocurrió un error inesperado."
      Alert.alert("Error de Autenticación", msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Fondo degradado púrpura */}
      <View style={styles.gradientBackground} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardContainer}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Tarjeta principal de login */}
            <View style={styles.loginCard}>
              {/* Header con logo */}
              <View style={styles.headerContainer}>
                <View style={styles.logoContainer}>
                  <Ionicons name="pulse" size={32} color="#6366F1" />
                </View>
                <Text style={styles.appTitle}>Ameyalli</Text>
                <Text style={styles.appSubtitle}>Cuneros Inteligentes</Text>
                <Text style={styles.appDescription}>Sistema de Monitoreo Inteligente</Text>
              </View>

              {/* Formulario */}
              <View style={styles.formContainer}>
                <Text style={styles.formTitle}>{isRegistering ? "Crear Nueva Cuenta" : "Iniciar Sesión"}</Text>

                {/* Campo Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Correo Electrónico</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="usuario@hospital.com"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                {/* Campo Contraseña */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contraseña</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="••••••••"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Campos adicionales para registro */}
                {isRegistering && (
                  <>
                    <View style={styles.sectionDivider}>
                      <Text style={styles.sectionTitle}>Información Personal</Text>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Nombre(s)</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Ingresa tu nombre"
                          placeholderTextColor="#9CA3AF"
                          value={nombre}
                          onChangeText={setNombre}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Apellidos</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="people-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Ingresa tus apellidos"
                          placeholderTextColor="#9CA3AF"
                          value={apellidos}
                          onChangeText={setApellidos}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Teléfono</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Número de teléfono"
                          placeholderTextColor="#9CA3AF"
                          value={numTel}
                          onChangeText={setNumTel}
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Fecha de Nacimiento</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#9CA3AF"
                          value={fechaNac}
                          onChangeText={setFechaNac}
                        />
                      </View>
                    </View>

                    <View style={styles.sectionDivider}>
                      <Text style={styles.sectionTitle}>Información del Hogar</Text>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Nombre de la Casa</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="home-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Nombre del hogar"
                          placeholderTextColor="#9CA3AF"
                          value={nombreCasa}
                          onChangeText={setNombreCasa}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Dirección</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="location-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Dirección completa"
                          placeholderTextColor="#9CA3AF"
                          value={direccionCasa}
                          onChangeText={setDireccionCasa}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Teléfono de Casa</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Teléfono del hogar"
                          placeholderTextColor="#9CA3AF"
                          value={telefonoCasa}
                          onChangeText={setTelefonoCasa}
                          keyboardType="phone-pad"
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Correo de Casa</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="correo@hogar.com"
                          placeholderTextColor="#9CA3AF"
                          value={correoCasa}
                          onChangeText={setCorreoCasa}
                          keyboardType="email-address"
                        />
                      </View>
                    </View>

                    {/* Selector de rol */}
                    <View style={styles.roleContainer}>
                      <Text style={styles.inputLabel}>Registrar como:</Text>
                      <View style={styles.roleOptions}>
                        <TouchableOpacity
                          onPress={() => setEsMadre(false)}
                          style={[styles.roleButton, !esMadre && styles.roleButtonSelected]}
                        >
                          <Ionicons name="man-outline" size={20} color={!esMadre ? "#FFFFFF" : "#6366F1"} />
                          <Text style={[styles.roleButtonText, !esMadre && styles.roleButtonTextSelected]}>Padre</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setEsMadre(true)}
                          style={[styles.roleButton, esMadre && styles.roleButtonSelected]}
                        >
                          <Ionicons name="woman-outline" size={20} color={esMadre ? "#FFFFFF" : "#6366F1"} />
                          <Text style={[styles.roleButtonText, esMadre && styles.roleButtonTextSelected]}>Madre</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}

                {/* Botón principal */}
                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                  onPress={handleAuth}
                  disabled={isLoading}
                >
                  <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>
                    {isLoading ? "Procesando..." : isRegistering ? "Crear Cuenta" : "Iniciar Sesión"}
                  </Text>
                </TouchableOpacity>

                {/* Botón cambiar modo */}
                <TouchableOpacity
                  style={styles.switchButton}
                  onPress={() => setIsRegistering(!isRegistering)}
                  disabled={isLoading}
                >
                  <Text style={styles.switchButtonText}>
                    {isRegistering ? "¿Ya tienes una cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

           
                     </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

function ParentTabNavigator({ userId }) {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          title: "Inicio",
        }}
      >
        {(props) => <HomeScreen {...props} userId={userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Alertas"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" size={size} color={color} />,
          title: "Alertas",
        }}
      >
        {(props) => <ChartScreen {...props} userId={userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Cuna"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="bed-outline" size={size} color={color} />,
          title: "Mi Bebé",
        }}
      >
        {(props) => <CunaScreen {...props} userId={userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Historial"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
          title: "Historial",
        }}
      >
        {(props) => <HistoryScreen {...props} userId={userId} />}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

function NurseTabNavigator({ userId }) {
  return (
    <Tab.Navigator screenOptions={nurseTabScreenOptions}>
      <Tab.Screen
        name="Inicio"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          title: "Panel",
        }}
      >
        {(props) => <HomeEnfermeroScreen {...props} userId={userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Cuna"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="bed-outline" size={size} color={color} />,
          title: "Cunas",
        }}
      >
        {(props) => <CunaEnfermeroScreen {...props} userId={userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Gráficos"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" size={size} color={color} />,
          title: "Alertas",
        }}
      >
        {(props) => <ChartEnfermeroScreen {...props} userId={userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Historial"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
          title: "Historial",
        }}
      >
        {(props) => <HistoryEnfermeroScreen {...props} userId={userId} />}
      </Tab.Screen>
      <Tab.Screen
        name="Alimentación"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="nutrition-outline" size={size} color={color} />,
          title: "Cuidados",
        }}
      >
        {(props) => <RegistroAlimentacionScreen {...props} idUsuario={userId} />}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

export default function App() {
  const [userSession, setUserSession] = useState(null)

  useEffect(() => {
    // logoutUser();
  }, [])

  const handleLoginSuccess = async (firebaseUser) => {
    try {
      const role = await fetchUserRole(firebaseUser.email)
      console.log("Rol obtenido de la API (a través de user.js):", role)

      if (!role) {
        Alert.alert("Error", "No se encontró un rol para este usuario.")
        await logoutUser()
        return
      }

      const userIdApiUrl = `http://192.168.0.223:3000/api/usuario-id-by-email?email=${encodeURIComponent(firebaseUser.email)}`
      const responseId = await fetch(userIdApiUrl)

      if (!responseId.ok) {
        const errorBody = await responseId.text()
        throw new Error(`Error al obtener ID de usuario: ${responseId.status} - ${errorBody}`)
      }

      const { idUsuario } = await responseId.json()
      console.log("ID de usuario obtenido del nuevo endpoint de la API:", idUsuario)

      if (idUsuario === undefined || idUsuario === null) {
        Alert.alert("Error", "No se pudo recuperar el ID de usuario de la base de datos.")
        await logoutUser()
        return
      }

      setUserSession({ firebaseUser, role, idUsuario })
      console.log("Sesión de usuario actualizada con rol e idUsuario:", { firebaseUser, role, idUsuario })
    } catch (error) {
      console.error("Error en handleLoginSuccess:", error)
      Alert.alert(
        "Error de Inicio de Sesión",
        "Ocurrió un problema durante el inicio de sesión. Por favor, intenta de nuevo. Detalle: " + error.message,
      )
      await logoutUser()
    }
  }

  // Botón de logout
  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch (e) {}
    setUserSession(null)
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!userSession ? (
          <Stack.Screen name="Auth" options={{ headerShown: false }}>
            {(props) => <AuthScreen {...props} onLoginSuccess={handleLoginSuccess} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen
            name="Main"
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#ffffffff' },
              headerTitleStyle: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
              headerRight: () => (
                <TouchableOpacity onPress={handleLogout} style={{ marginRight: 18, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="log-out-outline" size={24} color="purple" />
                </TouchableOpacity>
              ),
            }}
          >
            {(props) =>
              userSession.role === "Enfermero" ? (
                <NurseTabNavigator userId={userSession.idUsuario} />
              ) : (
                <ParentTabNavigator userId={userSession.idUsuario} />
              )
            }
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const tabScreenOptions = {
  tabBarActiveTintColor: "#6366F1",
  tabBarInactiveTintColor: "#9CA3AF",
  tabBarStyle: {
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: "600",
  },
  headerShown: false,
}

const nurseTabScreenOptions = {
  tabBarActiveTintColor: "#8B5CF6",
  tabBarInactiveTintColor: "#9CA3AF",
  tabBarStyle: {
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: "600",
  },
  headerShown: false,
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#8B5CF6",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  loginCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  sectionDivider: {
    alignItems: "center",
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6366F1",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleContainer: {
    marginBottom: 24,
  },
  roleOptions: {
    flexDirection: "row",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: "#6366F1",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    gap: 8,
  },
  roleButtonSelected: {
    backgroundColor: "#6366F1",
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6366F1",
  },
  roleButtonTextSelected: {
    color: "#FFFFFF",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0.1,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  switchButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  switchButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6366F1",
    textDecorationLine: "underline",
  },
  featuresContainer: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    backdropFilter: "blur(10px)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 20,
  },
})

