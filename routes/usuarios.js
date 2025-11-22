const express = require("express")
const { pool } = require("../config/database")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Obtener usuarios con filtro opcional por rol
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { rol } = req.query
    
    let query = 'SELECT id, nombre, email, rol, especialidad, telefono FROM usuarios'
    let params = []
    
    if (rol) {
      query += ' WHERE rol = ?'
      params.push(rol)
    }
    
    query += ' ORDER BY nombre'
    
    const [usuarios] = await pool.execute(query, params)

    res.json({
      success: true,
      message: "Usuarios obtenidos exitosamente",
      data: usuarios,
    })
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Obtener todos los médicos (para que los pacientes puedan elegir)
router.get("/medicos", authenticateToken, async (req, res) => {
  try {
    const [medicos] = await pool.execute(
      'SELECT id, nombre, especialidad, telefono FROM usuarios WHERE rol = "medico" ORDER BY nombre',
      [],
    )

    res.json({
      success: true,
      message: "Médicos obtenidos exitosamente",
      data: medicos,
    })
  } catch (error) {
    console.error("Error obteniendo médicos:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Obtener perfil del usuario actual
router.get("/perfil", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, nombre, email, rol, especialidad, telefono, created_at FROM usuarios WHERE id = ?",
      [req.user.id],
    )

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    res.json({
      success: true,
      message: "Perfil obtenido exitosamente",
      data: users[0],
    })
  } catch (error) {
    console.error("Error obteniendo perfil:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Actualizar perfil del usuario
router.put("/perfil", authenticateToken, async (req, res) => {
  try {
    const { nombre, telefono, especialidad } = req.body
    const userId = req.user.id

    // Validaciones básicas
    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: "El nombre es requerido",
      })
    }

    // Actualizar usuario
    await pool.execute("UPDATE usuarios SET nombre = ?, telefono = ?, especialidad = ? WHERE id = ?", [
      nombre,
      telefono || null,
      especialidad || null,
      userId,
    ])

    // Obtener usuario actualizado
    const [updatedUser] = await pool.execute(
      "SELECT id, nombre, email, rol, especialidad, telefono FROM usuarios WHERE id = ?",
      [userId],
    )

    res.json({
      success: true,
      message: "Perfil actualizado exitosamente",
      data: updatedUser[0],
    })
  } catch (error) {
    console.error("Error actualizando perfil:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Crear un nuevo usuario
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { nombre, email, rol, especialidad, telefono } = req.body

    // Validaciones básicas
    if (!nombre || !email || !rol) {
      return res.status(400).json({
        success: false,
        message: "Nombre, email y rol son requeridos",
      })
    }

    // Insertar nuevo usuario
    const [result] = await pool.execute(
      "INSERT INTO usuarios (nombre, email, rol, especialidad, telefono) VALUES (?, ?, ?, ?, ?)",
      [nombre, email, rol, especialidad || null, telefono || null]
    )

    // Obtener usuario recién creado
    const [newUser] = await pool.execute(
      "SELECT id, nombre, email, rol, especialidad, telefono FROM usuarios WHERE id = ?",
      [result.insertId],
    )

    res.json({
      success: true,
      message: "Usuario creado exitosamente",
      data: newUser[0],
    })
  } catch (error) {
    console.error("Error creando usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

module.exports = router
