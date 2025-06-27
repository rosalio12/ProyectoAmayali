require("dotenv").config()
const sql = require("mssql")

// Configuración igual a tu callcenter2025
const config = {
  server: "MAL_EDUCADA",
  database: "Ameyalli", // Cambiaremos a esta BD
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    trustedConnection: true, // Autenticación de Windows
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
}

async function testWindowsAuth() {
  console.log("🧪 Probando conexión con autenticación de Windows...")
  console.log("📋 Configuración (igual a callcenter2025):")
  console.log(`   - Servidor: ${config.server}`)
  console.log(`   - Autenticación: Windows (Trusted Connection)`)

  try {
    // Primero conectar sin especificar BD para verificar acceso
    const tempConfig = { ...config }
    delete tempConfig.database

    console.log("\n🔄 Paso 1: Conectando al servidor...")
    let pool = await sql.connect(tempConfig)
    console.log("✅ Conexión al servidor exitosa")

    // Verificar información del usuario
    const userInfo = await pool.request().query(`
      SELECT 
        SYSTEM_USER as Usuario,
        @@SERVERNAME as Servidor,
        GETDATE() as Fecha
    `)

    console.log("👤 Información del usuario:")
    console.log(`   - Usuario: ${userInfo.recordset[0].Usuario}`)
    console.log(`   - Servidor: ${userInfo.recordset[0].Servidor}`)

    // Verificar si la BD Ameyalli existe
    console.log("\n🔄 Paso 2: Verificando base de datos Ameyalli...")
    const dbCheck = await pool.request().query(`
      SELECT name FROM sys.databases WHERE name = 'Ameyalli'
    `)

    if (dbCheck.recordset.length === 0) {
      console.log("⚠️  Base de datos 'Ameyalli' no existe. Creándola...")
      await pool.request().query("CREATE DATABASE Ameyalli")
      console.log("✅ Base de datos 'Ameyalli' creada")
    } else {
      console.log("✅ Base de datos 'Ameyalli' encontrada")
    }

    await pool.close()

    // Ahora conectar específicamente a Ameyalli
    console.log("\n🔄 Paso 3: Conectando a base de datos Ameyalli...")
    pool = await sql.connect(config)
    console.log("✅ Conectado a Ameyalli exitosamente")

    // Verificar tablas
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `)

    console.log(`\n📋 Tablas encontradas: ${tablesResult.recordset.length}`)
    if (tablesResult.recordset.length > 0) {
      tablesResult.recordset.forEach((table) => {
        console.log(`   - ${table.TABLE_NAME}`)
      })
    } else {
      console.log("   (No hay tablas - se crearán automáticamente)")
    }

    await pool.close()

    console.log("\n🎉 ¡Prueba exitosa!")
    console.log("✅ La configuración funciona correctamente")
    console.log("✅ Puedes usar autenticación de Windows")
    console.log("✅ La base de datos Ameyalli está lista")

    console.log("\n📋 Tu archivo .env debe tener:")
    console.log("DB_SERVER=MAL_EDUCADA")
    console.log("DB_DATABASE=Ameyalli")
    console.log("# No necesitas DB_USER ni DB_PASSWORD")
  } catch (error) {
    console.error("\n❌ Error en la prueba:")
    console.error(`   - Código: ${error.code}`)
    console.error(`   - Mensaje: ${error.message}`)

    if (error.originalError) {
      console.error(`   - Error original: ${error.originalError.message}`)
    }

    console.log("\n🔧 Posibles soluciones:")
    console.log("1. Asegúrate de que SQL Server esté ejecutándose")
    console.log("2. Ejecuta este script como el mismo usuario que usa callcenter2025")
    console.log("3. Verifica que tengas permisos en el servidor MAL_EDUCADA")
  }
}

testWindowsAuth()
