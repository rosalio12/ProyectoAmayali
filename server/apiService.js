// Cambia esta IP por la que te muestre el servidor al iniciarse
const API_BASE_URL = "http://192.168.0.223:3000/api" // Actualiza con la IP correcta

class ApiService {
  constructor() {
    this.token = null
    this.baseUrl = API_BASE_URL
  }

  setToken(token) {
    this.token = token
  }

  // Método para cambiar la URL base dinámicamente
  setBaseUrl(url) {
    this.baseUrl = url
    console.log(`🔧 URL base actualizada a: ${this.baseUrl}`)
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    }

    console.log(`📡 Haciendo petición a: ${url}`)
    console.log(`📋 Configuración:`, JSON.stringify(config, null, 2))

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      console.log(`📥 Respuesta recibida:`, data)

      if (!response.ok) {
        throw new Error(data.error || `Error HTTP: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error("❌ Error en API:", error.message)

      // Si es un error de conexión, proporcionar más información
      if (error.message.includes("Failed to fetch") || error.message.includes("Network request failed")) {
        throw new Error(
          `No se puede conectar al servidor en ${url}. Verifica que el servidor esté ejecutándose y la IP sea correcta.`,
        )
      }

      throw error
    }
  }

  // Método para probar la conexión
  async testConnection() {
    try {
      const response = await this.makeRequest("/test")
      console.log("✅ Conexión exitosa:", response)
      return response
    } catch (error) {
      console.error("❌ Error probando conexión:", error.message)
      throw error
    }
  }

  // Autenticación
  async register(userData) {
    console.log("📝 Registrando usuario:", userData)
    return this.makeRequest("/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async login(correo, password) {
    console.log("🔐 Iniciando sesión:", correo)
    const response = await this.makeRequest("/login", {
      method: "POST",
      body: JSON.stringify({ correo, password }),
    })

    if (response.success && response.token) {
      this.setToken(response.token)
      console.log("✅ Token guardado")
    }

    return response
  }

  // Cunas
  async getCunas() {
    return this.makeRequest("/cunas")
  }

  // Bebés
  async getBebes() {
    return this.makeRequest("/bebes")
  }

  async createBebe(bebeData) {
    return this.makeRequest("/bebes", {
      method: "POST",
      body: JSON.stringify(bebeData),
    })
  }
}

export default new ApiService()
