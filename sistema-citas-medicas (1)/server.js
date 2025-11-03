const express = require("express")
const cors = require("cors")
const path = require("path")
require("dotenv").config()

// Importar rutas
const authRoutes = require("./routes/auth")
const citasRoutes = require("./routes/citas")
const usuariosRoutes = require("./routes/usuarios")

// Importar configuración de base de datos
const { testConnection } = require("./config/database")

const app = express()
const PORT = process.env.PORT || 3000

// Middlewares
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, "public")))

// Rutas de la API
app.use("/api/auth", authRoutes)
app.use("/api/citas", citasRoutes)
app.use("/api/usuarios", usuariosRoutes)

// Ruta principal - servir el frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error("Error:", err.stack)
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// Middleware para rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  })
})

// Iniciar servidor
async function startServer() {
  try {
    // Probar conexión a la base de datos
    const dbConnected = await testConnection()

    if (!dbConnected) {
      console.error("❌ No se pudo conectar a la base de datos")
      process.exit(1)
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`)
      console.log(`📊 Base de datos: ${process.env.DB_NAME}`)
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || "development"}`)
    })
  } catch (error) {
    console.error("❌ Error iniciando el servidor:", error)
    process.exit(1)
  }
}

startServer()
