require("dotenv").config()
const express = require("express")
const sql = require("mssql")
const cors = require("cors")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const app = express()

// Conexión a SQL Server (igual que tu MongoDB)
const config = {
  server: "MAL_EDUCADA",
  database: "Ameyalli",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    trustedConnection: true, // Autenticación de Windows como tu callcenter2025
  },
}

let pool

sql
  .connect(config)
  .then((poolConnection) => {
    pool = poolConnection
    console.log("✅ Conectado a SQL Server")
  })
  .catch((err) => {
    console.error("❌ Error de conexión:", err.message)
  })

// Middlewares
app.use(express.json())
app.use(cors({ origin: "*" }))

// Ruta para registrar usuario
app.post("/api/register", async (req, res) => {
  try {
    const { correo, password, nombreUsuario, nombre, primerApellido, segundoApellido } = req.body

    if (!pool) {
      return res.status(503).send({ error: "Base de datos no conectada" })
    }

    // Verificar si usuario existe
    const checkUser = await pool
      .request()
      .input("correo", sql.NVarChar, correo)
      .query("SELECT idUsuario FROM usuario WHERE correo = @correo")

    if (checkUser.recordset.length > 0) {
      return res.status(400).send({ error: "El correo ya está registrado" })
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insertar usuario
    const result = await pool
      .request()
      .input("nombreUsuario", sql.NVarChar, nombreUsuario)
      .input("nombre", sql.NVarChar, nombre)
      .input("primerApellido", sql.NVarChar, primerApellido)
      .input("segundoApellido", sql.NVarChar, segundoApellido)
      .input("correo", sql.NVarChar, correo)
      .input("passwordHash", sql.NVarChar, hashedPassword)
      .query(`
        INSERT INTO usuario (nombreUsuario, nombre, primerApellido, segundoApellido, correo, passwordHash, tipoUsuario, rol)
        OUTPUT INSERTED.idUsuario
        VALUES (@nombreUsuario, @nombre, @primerApellido, @segundoApellido, @correo, @passwordHash, 'Hogar', 'Padre')
      `)

    res.status(201).send({ success: true, userId: result.recordset[0].idUsuario })
  } catch (err) {
    res.status(500).send({ error: err.message })
  }
})

// Ruta para login
app.post("/api/login", async (req, res) => {
  try {
    const { correo, password } = req.body

    if (!pool) {
      return res.status(503).send({ error: "Base de datos no conectada" })
    }

    // Buscar usuario
    const result = await pool
      .request()
      .input("correo", sql.NVarChar, correo)
      .query("SELECT * FROM usuario WHERE correo = @correo AND activo = 1")

    if (result.recordset.length === 0) {
      return res.status(401).send({ error: "Usuario no encontrado" })
    }

    const user = result.recordset[0]

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return res.status(401).send({ error: "Contraseña incorrecta" })
    }

    // Generar token
    const token = jwt.sign({ idUsuario: user.idUsuario, correo: user.correo }, "mi_secreto_jwt", {
      expiresIn: "24h",
    })

    // Remover password de la respuesta
    delete user.passwordHash

    res.send({ success: true, token, user })
  } catch (err) {
    res.status(500).send({ error: err.message })
  }
})

// Ruta para obtener usuarios (como tu ruta de películas)
app.get("/api/usuarios", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).send({ error: "Base de datos no conectada" })
    }

    const data = await pool
      .request()
      .query("SELECT idUsuario, nombreUsuario, nombre, correo FROM usuario WHERE activo = 1")
    res.send(data.recordset)
  } catch (err) {
    res.status(500).send({ error: err.message })
  }
})

// Iniciar servidor
const PORT = 3000
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})
