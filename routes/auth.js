const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { pool } = require("../config/database")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Registro de usuario
router.post("/register", async (req, res) => {
  try {
    const { nombre, email, password, rol, especialidad, telefono } = req.body

    // Validaciones básicas
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos obligatorios deben ser completados",
      })
    }

    if (!["medico", "paciente"].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol no válido. Debe ser "medico" o "paciente"',
      })
    }

    // Verificar si el email ya existe
    const [existingUsers] = await pool.execute("SELECT id FROM usuarios WHERE email = ?", [email])

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "El email ya está registrado",
      })
    }

    // Encriptar contraseña
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Insertar usuario en la base de datos
    const [result] = await pool.execute(
      "INSERT INTO usuarios (nombre, email, password, rol, especialidad, telefono) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre, email, hashedPassword, rol, especialidad || null, telefono || null],
    )

    // Generar token JWT
    const token = jwt.sign({ userId: result.insertId, email, rol }, process.env.JWT_SECRET, { expiresIn: "24h" })

    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      data: {
        user: {
          id: result.insertId,
          nombre,
          email,
          rol,
          especialidad: especialidad || null,
        },
        token,
      },
    })
  } catch (error) {
    console.error("Error en registro:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Inicio de sesión
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email y contraseña son requeridos",
      })
    }

    // Buscar usuario por email
    const [users] = await pool.execute(
      "SELECT id, nombre, email, password, rol, especialidad FROM usuarios WHERE email = ?",
      [email],
    )

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    const user = users[0]

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      })
    }

    // Generar token JWT
    const token = jwt.sign({ userId: user.id, email: user.email, rol: user.rol }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    })

    res.json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          especialidad: user.especialidad,
        },
        token,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Verificar token (para mantener sesión)
router.get("/verify", authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: "Token válido",
    data: {
      user: req.user,
    },
  })
})

// Cerrar sesión (opcional - el frontend puede simplemente eliminar el token)
router.post("/logout", authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: "Sesión cerrada exitosamente",
  })
})

module.exports = router
