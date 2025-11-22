const mysql = require("mysql2/promise")
require("dotenv").config()

// Configuración de la conexión a MySQL
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sistema_citas_medicas",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig)

// Función para probar la conexión
async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log("✅ Conexión a MySQL establecida correctamente")
    connection.release()
    return true
  } catch (error) {
    console.error("❌ Error conectando a MySQL:", error.message)
    return false
  }
}

module.exports = {
  pool,
  testConnection,
}
