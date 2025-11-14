const express = require("express")
const { pool } = require("../config/database")
const { verifyToken, verifyRole } = require("../middleware/auth")

const router = express.Router()

// Crear nueva cita (solo pacientes)
router.post("/", verifyToken, verifyRole(["paciente"]), async (req, res) => {
  try {
    const { medico_id, fecha, hora, motivo } = req.body
    const paciente_id = req.user.id

    // Validaciones básicas
    if (!medico_id || !fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: "Paciente, médico, fecha y hora son requeridos",
      })
    }

    // Verificar que el médico existe
    const [medicos] = await pool.execute('SELECT id FROM usuarios WHERE id = ? AND rol = "medico"', [medico_id])

    if (medicos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Médico no encontrado",
      })
    }

    // Verificar que no haya conflicto de horario
    const [conflictos] = await pool.execute(
      'SELECT id FROM citas WHERE medico_id = ? AND fecha = ? AND hora = ? AND estado != "cancelada"',
      [medico_id, fecha, hora],
    )

    if (conflictos.length > 0) {
      return res.status(400).json({
        success: false,
        message: "El médico ya tiene una cita programada en ese horario",
      })
    }

    // Crear la cita
    const [result] = await pool.execute(
      'INSERT INTO citas (paciente_id, medico_id, fecha, hora, motivo, estado) VALUES (?, ?, ?, ?, ?, "pendiente")',
      [paciente_id, medico_id, fecha, hora, motivo || null],
    )

    // Obtener la cita creada con información del médico
    const [citaCreada] = await pool.execute(
      `
            SELECT 
                c.id, c.fecha, c.hora, c.motivo, c.estado,
                m.nombre as medico_nombre, m.especialidad
            FROM citas c
            JOIN usuarios m ON c.medico_id = m.id
            WHERE c.id = ?
        `,
      [result.insertId],
    )

    res.status(201).json({
      success: true,
      message: "Cita creada exitosamente",
      data: citaCreada[0],
    })
  } catch (error) {
    console.error("Error creando cita:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Listado global de citas (admin/recepcionista)
router.get("/", verifyToken, verifyRole(["admin", "recepcionista"]), async (req, res) => {
  try {
    const { estado, fecha, medico_id, paciente_id } = req.query;

    const filters = [];
    const params = [];

    if (estado) { filters.push("c.estado = ?"); params.push(estado); }
    if (fecha) { filters.push("c.fecha = ?"); params.push(fecha); }
    if (medico_id) { filters.push("c.medico_id = ?"); params.push(medico_id); }
    if (paciente_id) { filters.push("c.paciente_id = ?"); params.push(paciente_id); }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [rows] = await pool.execute(
      `
      SELECT 
        c.id, c.fecha, c.hora, c.motivo, c.estado,
        p.id AS paciente_id, p.nombre AS paciente_nombre,
        m.id AS medico_id, m.nombre AS medico_nombre, m.especialidad
      FROM citas c
      JOIN usuarios p ON p.id = c.paciente_id
      JOIN usuarios m ON m.id = c.medico_id
      ${where}
      ORDER BY c.fecha DESC, c.hora DESC
      `,
      params
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error listando citas:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

// Obtener citas del usuario actual
router.get("/mis-citas", verifyToken, async (req, res) => {
  try {
    let query, params

    if (req.user.rol === "paciente") {
      // Citas del paciente
      query = `
                SELECT 
                    c.id, c.fecha, c.hora, c.motivo, c.estado, c.created_at,
                    m.nombre as medico_nombre, m.especialidad, m.telefono as medico_telefono
                FROM citas c
                JOIN usuarios m ON c.medico_id = m.id
                WHERE c.paciente_id = ?
                ORDER BY c.fecha DESC, c.hora DESC
            `
      params = [req.user.id]
    } else if (req.user.rol === "medico") {
      // Citas del médico
      query = `
                SELECT 
                    c.id, c.fecha, c.hora, c.motivo, c.estado, c.created_at,
                    p.nombre as paciente_nombre, p.telefono as paciente_telefono
                FROM citas c
                JOIN usuarios p ON c.paciente_id = p.id
                WHERE c.medico_id = ?
                ORDER BY c.fecha DESC, c.hora DESC
            `
      params = [req.user.id]
    } else {
      return res.status(403).json({
        success: false,
        message: "Rol no autorizado",
      })
    }

    const [citas] = await pool.execute(query, params)

    res.json({
      success: true,
      message: "Citas obtenidas exitosamente",
      data: citas,
    })
  } catch (error) {
    console.error("Error obteniendo citas:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Obtener estadísticas de citas del usuario
router.get("/estadisticas", verifyToken, async (req, res) => {
  try {
    let queries = {}
    const userId = req.user.id

    if (req.user.rol === "paciente") {
      // Estadísticas para paciente
      const [total] = await pool.execute("SELECT COUNT(*) as count FROM citas WHERE paciente_id = ?", [userId])

      const [pendientes] = await pool.execute(
        'SELECT COUNT(*) as count FROM citas WHERE paciente_id = ? AND estado = "pendiente"',
        [userId],
      )

      const [confirmadas] = await pool.execute(
        'SELECT COUNT(*) as count FROM citas WHERE paciente_id = ? AND estado = "confirmada"',
        [userId],
      )

      queries = {
        total: total[0].count,
        pendientes: pendientes[0].count,
        confirmadas: confirmadas[0].count,
      }
    } else if (req.user.rol === "medico") {
      // Estadísticas para médico
      const [total] = await pool.execute("SELECT COUNT(*) as count FROM citas WHERE medico_id = ?", [userId])

      const [pendientes] = await pool.execute(
        'SELECT COUNT(*) as count FROM citas WHERE medico_id = ? AND estado = "pendiente"',
        [userId],
      )

      const [hoy] = await pool.execute(
        "SELECT COUNT(*) as count FROM citas WHERE medico_id = ? AND fecha = CURDATE()",
        [userId],
      )

      queries = {
        total: total[0].count,
        pendientes: pendientes[0].count,
        hoy: hoy[0].count,
      }
    }

    res.json({
      success: true,
      message: "Estadísticas obtenidas exitosamente",
      data: queries,
    })
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Actualizar estado de cita (solo médicos)
router.put("/:id/estado", verifyToken, verifyRole(["medico"]), async (req, res) => {
  try {
    const { id } = req.params
    const { estado } = req.body
    const medico_id = req.user.id

    // Validar estado
    const estadosValidos = ["pendiente", "confirmada", "cancelada", "completada"]
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: "Estado no válido",
      })
    }

    // Verificar que la cita pertenece al médico
    const [citas] = await pool.execute("SELECT id FROM citas WHERE id = ? AND medico_id = ?", [id, medico_id])

    if (citas.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cita no encontrada o no autorizada",
      })
    }

    // Actualizar estado
    await pool.execute("UPDATE citas SET estado = ? WHERE id = ?", [estado, id])

    // Obtener cita actualizada
    const [citaActualizada] = await pool.execute(
      `
            SELECT 
                c.id, c.fecha, c.hora, c.motivo, c.estado, c.created_at,
                p.nombre as paciente_nombre, p.telefono as paciente_telefono
            FROM citas c
            JOIN usuarios p ON c.paciente_id = p.id
            WHERE c.id = ?
        `,
      [id],
    )

    res.json({
      success: true,
      message: "Estado de cita actualizado exitosamente",
      data: citaActualizada[0],
    })
  } catch (error) {
    console.error("Error actualizando estado de cita:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Cancelar cita (pacientes pueden cancelar sus propias citas)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.rol

    let query, params

    if (userRole === "paciente") {
      // Paciente puede cancelar sus propias citas
      query = "SELECT id FROM citas WHERE id = ? AND paciente_id = ?"
      params = [id, userId]
    } else if (userRole === "medico") {
      // Médico puede cancelar citas asignadas a él
      query = "SELECT id FROM citas WHERE id = ? AND medico_id = ?"
      params = [id, userId]
    } else {
      return res.status(403).json({
        success: false,
        message: "No autorizado",
      })
    }

    // Verificar que la cita existe y pertenece al usuario
    const [citas] = await pool.execute(query, params)

    if (citas.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cita no encontrada o no autorizada",
      })
    }

    // Marcar como cancelada en lugar de eliminar
    await pool.execute('UPDATE citas SET estado = "cancelada" WHERE id = ?', [id])

    res.json({
      success: true,
      message: "Cita cancelada exitosamente",
    })
  } catch (error) {
    console.error("Error cancelando cita:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Obtener horarios disponibles de un médico en una fecha específica
router.get("/horarios-disponibles/:medico_id/:fecha", verifyToken, async (req, res) => {
  try {
    const { medico_id, fecha } = req.params

    // Verificar que el médico existe
    const [medicos] = await pool.execute('SELECT id FROM usuarios WHERE id = ? AND rol = "medico"', [medico_id])

    if (medicos.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Médico no encontrado",
      })
    }

    // Obtener citas ocupadas en esa fecha
    const [citasOcupadas] = await pool.execute(
      'SELECT hora FROM citas WHERE medico_id = ? AND fecha = ? AND estado != "cancelada"',
      [medico_id, fecha],
    )

    // Horarios de trabajo típicos (8:00 AM a 6:00 PM, cada 30 minutos)
    const horariosDisponibles = []
    const horaInicio = 8 // 8:00 AM
    const horaFin = 18 // 6:00 PM

    for (let hora = horaInicio; hora < horaFin; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 30) {
        const horaFormateada = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}:00`

        // Verificar si esta hora está ocupada
        const estaOcupada = citasOcupadas.some((cita) => cita.hora === horaFormateada)

        if (!estaOcupada) {
          horariosDisponibles.push(horaFormateada)
        }
      }
    }

    res.json({
      success: true,
      message: "Horarios disponibles obtenidos exitosamente",
      data: horariosDisponibles,
    })
  } catch (error) {
    console.error("Error obteniendo horarios disponibles:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

module.exports = router
