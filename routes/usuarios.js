const express = require("express")
const { pool } = require("../config/database")
const { verifyToken, verifyRole } = require("../middleware/auth")

const router = express.Router()

// Obtener todos los médicos (para que los pacientes puedan elegir)
router.get("/medicos", verifyToken, async (req, res) => {
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
router.get("/perfil", verifyToken, async (req, res) => {
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
router.put("/perfil", verifyToken, async (req, res) => {
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

module.exports = router
