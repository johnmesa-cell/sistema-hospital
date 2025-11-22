const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const { pool } = require("../config/database")
const { authenticateToken } = require("../middleware/auth")

// Middleware para verificar que el usuario sea administrador
function isAdmin(req, res, next) {
  if (req.user.rol !== "administrador") {
    return res.status(403).json({
      success: false,
      message: "Acceso denegado. Se requieren permisos de administrador",
    })
  }
  next()
}

router.use(authenticateToken)
router.use(isAdmin)

// Obtener todos los usuarios
router.get("/usuarios", async (req, res) => {
  try {
    const [usuarios] = await pool.execute(
      "SELECT id, nombre, email, rol, especialidad, telefono, created_at FROM usuarios ORDER BY created_at DESC",
    )

    res.json({
      success: true,
      data: usuarios,
    })
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener usuarios",
    })
  }
})

// Obtener todas las citas
router.get("/citas", async (req, res) => {
  try {
    const [citas] = await pool.execute(`
            SELECT 
                c.*,
                p.nombre as paciente_nombre,
                p.email as paciente_email,
                m.nombre as medico_nombre,
                m.especialidad,
                m.email as medico_email
            FROM citas c
            JOIN usuarios p ON c.paciente_id = p.id
            JOIN usuarios m ON c.medico_id = m.id
            ORDER BY c.fecha DESC, c.hora DESC
        `)

    res.json({
      success: true,
      data: citas,
    })
  } catch (error) {
    console.error("Error obteniendo citas:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener citas",
    })
  }
})

// Actualizar contraseña de un usuario
router.put("/usuarios/:id/password", async (req, res) => {
  try {
    const { id } = req.params
    const { password } = req.body

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "La contraseña debe tener al menos 6 caracteres",
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await pool.execute("UPDATE usuarios SET password = ? WHERE id = ?", [hashedPassword, id])

    res.json({
      success: true,
      message: "Contraseña actualizada exitosamente",
    })
  } catch (error) {
    console.error("Error actualizando contraseña:", error)
    res.status(500).json({
      success: false,
      message: "Error al actualizar contraseña",
    })
  }
})

// Eliminar usuario
router.delete("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params

    // No permitir eliminar al propio administrador
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "No puedes eliminar tu propio usuario",
      })
    }

    await pool.execute("DELETE FROM usuarios WHERE id = ?", [id])

    res.json({
      success: true,
      message: "Usuario eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error eliminando usuario:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar usuario",
    })
  }
})

// Eliminar cita
router.delete("/citas/:id", async (req, res) => {
  try {
    const { id } = req.params

    await pool.execute("DELETE FROM citas WHERE id = ?", [id])

    res.json({
      success: true,
      message: "Cita eliminada exitosamente",
    })
  } catch (error) {
    console.error("Error eliminando cita:", error)
    res.status(500).json({
      success: false,
      message: "Error al eliminar cita",
    })
  }
})

// Obtener estadísticas generales
router.get("/estadisticas", async (req, res) => {
  try {
    const [[{ total_usuarios }]] = await pool.execute("SELECT COUNT(*) as total_usuarios FROM usuarios")

    const [[{ total_medicos }]] = await pool.execute("SELECT COUNT(*) as total_medicos FROM usuarios WHERE rol = 'medico'")

    const [[{ total_pacientes }]] = await pool.execute(
      "SELECT COUNT(*) as total_pacientes FROM usuarios WHERE rol = 'paciente'",
    )

    const [[{ total_citas }]] = await pool.execute("SELECT COUNT(*) as total_citas FROM citas")

    const [[{ citas_pendientes }]] = await pool.execute(
      "SELECT COUNT(*) as citas_pendientes FROM citas WHERE estado = 'pendiente'",
    )

    res.json({
      success: true,
      data: {
        total_usuarios,
        total_medicos,
        total_pacientes,
        total_citas,
        citas_pendientes,
      },
    })
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error)
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas",
    })
  }
})

module.exports = router
