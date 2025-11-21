const express = require("express")
const { pool } = require("../config/database")
const { authenticateToken, verifyRole } = require("../middleware/auth")

const router = express.Router()

// Crear nueva cita (solo pacientes)
router.post("/", authenticateToken, verifyRole(["paciente"]), async (req, res) => {
  try {
    const { medico_id, fecha, hora, motivo } = req.body
    const paciente_id = req.user.id

    // Validaciones básicas
    if (!medico_id || !fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: "Médico, fecha y hora son requeridos",
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

// Obtener citas del usuario actual
router.get("/mis-citas", authenticateToken, async (req, res) => {
  try {
    let query, params

    if (req.user.rol === "paciente") {
      // Citas del paciente
      query = `
                SELECT 
                    c.id, c.fecha, c.hora, c.motivo, c.estado, c.created_at,
                    m.nombre as medico_nombre, m.especialidad, m.telefono as medico_telefono,
                    CASE WHEN hc.id IS NOT NULL THEN 1 ELSE 0 END as tiene_historia_clinica,
                    hc.id as historia_clinica_id,
                    CASE WHEN rm.id IS NOT NULL THEN 1 ELSE 0 END as tiene_receta,
                    rm.id as receta_id
                FROM citas c
                JOIN usuarios m ON c.medico_id = m.id
                LEFT JOIN historia_clinica hc ON c.id = hc.cita_id
                LEFT JOIN recetas_medicas rm ON c.id = rm.cita_id
                WHERE c.paciente_id = ?
                ORDER BY c.fecha DESC, c.hora DESC
            `
      params = [req.user.id]
    } else if (req.user.rol === "medico") {
      // Citas del médico
      query = `
                SELECT 
                    c.id, c.fecha, c.hora, c.motivo, c.estado, c.created_at,
                    p.nombre as paciente_nombre, p.telefono as paciente_telefono, p.id as paciente_id,
                    CASE WHEN hc.id IS NOT NULL THEN 1 ELSE 0 END as tiene_historia_clinica,
                    hc.id as historia_clinica_id,
                    hc.diagnostico,
                    hc.tratamiento,
                    CASE WHEN rm.id IS NOT NULL THEN 1 ELSE 0 END as tiene_receta,
                    rm.id as receta_id,
                    (SELECT COUNT(*) FROM receta_medicamentos WHERE receta_id = rm.id) as total_medicamentos
                FROM citas c
                JOIN usuarios p ON c.paciente_id = p.id
                LEFT JOIN historia_clinica hc ON c.id = hc.cita_id
                LEFT JOIN recetas_medicas rm ON c.id = rm.cita_id
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
router.get("/estadisticas", authenticateToken, async (req, res) => {
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
router.put("/:id/estado", authenticateToken, verifyRole(["medico"]), async (req, res) => {
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
router.delete("/:id", authenticateToken, async (req, res) => {
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
router.get("/horarios-disponibles/:medico_id/:fecha", authenticateToken, async (req, res) => {
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

// Obtener cita específica con información completa
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.rol

    let query, params

    if (userRole === "paciente") {
      query = `
        SELECT 
          c.id, c.fecha, c.hora, c.motivo, c.estado, c.created_at,
          m.nombre as medico_nombre, m.especialidad, m.telefono as medico_telefono,
          CASE WHEN hc.id IS NOT NULL THEN 1 ELSE 0 END as tiene_historia_clinica,
          hc.id as historia_clinica_id,
          CASE WHEN rm.id IS NOT NULL THEN 1 ELSE 0 END as tiene_receta,
          rm.id as receta_id
        FROM citas c
        JOIN usuarios m ON c.medico_id = m.id
        LEFT JOIN historia_clinica hc ON c.id = hc.cita_id
        LEFT JOIN recetas_medicas rm ON c.id = rm.cita_id
        WHERE c.id = ? AND c.paciente_id = ?
      `
      params = [id, userId]
    } else if (userRole === "medico") {
      query = `
        SELECT 
          c.id, c.fecha, c.hora, c.motivo, c.estado, c.created_at,
          p.nombre as paciente_nombre, p.telefono as paciente_telefono, p.id as paciente_id,
          CASE WHEN hc.id IS NOT NULL THEN 1 ELSE 0 END as tiene_historia_clinica,
          hc.id as historia_clinica_id,
          hc.diagnostico,
          hc.tratamiento,
          CASE WHEN rm.id IS NOT NULL THEN 1 ELSE 0 END as tiene_receta,
          rm.id as receta_id,
          (SELECT COUNT(*) FROM receta_medicamentos WHERE receta_id = rm.id) as total_medicamentos
        FROM citas c
        JOIN usuarios p ON c.paciente_id = p.id
        LEFT JOIN historia_clinica hc ON c.id = hc.cita_id
        LEFT JOIN recetas_medicas rm ON c.id = rm.cita_id
        WHERE c.id = ? AND c.medico_id = ?
      `
      params = [id, userId]
    } else {
      return res.status(403).json({
        success: false,
        message: "Rol no autorizado",
      })
    }

    const [citas] = await pool.execute(query, params)

    if (citas.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cita no encontrada o no autorizada",
      })
    }

    res.json({
      success: true,
      message: "Cita obtenida exitosamente",
      data: citas[0],
    })
  } catch (error) {
    console.error("Error obteniendo cita:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Reprogramar cita (solo pacientes)
router.put("/:id/reprogramar", authenticateToken, verifyRole(["paciente"]), async (req, res) => {
  try {
    const { id } = req.params
    const { fecha, hora } = req.body
    const paciente_id = req.user.id

    // Validaciones
    if (!fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: "Fecha y hora son requeridos",
      })
    }

    // Verificar que la cita existe y pertenece al paciente
    const [citas] = await pool.execute("SELECT medico_id FROM citas WHERE id = ? AND paciente_id = ?", [
      id,
      paciente_id,
    ])

    if (citas.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cita no encontrada o no autorizada",
      })
    }

    const medico_id = citas[0].medico_id

    // Verificar que no haya conflicto de horario con el mismo médico
    const [conflictos] = await pool.execute(
      'SELECT id FROM citas WHERE medico_id = ? AND fecha = ? AND hora = ? AND estado != "cancelada" AND id != ?',
      [medico_id, fecha, hora, id],
    )

    if (conflictos.length > 0) {
      return res.status(400).json({
        success: false,
        message: "El médico ya tiene una cita programada en ese horario",
      })
    }

    // Actualizar la cita
    await pool.execute('UPDATE citas SET fecha = ?, hora = ?, estado = "pendiente" WHERE id = ?', [fecha, hora, id])

    // Obtener cita actualizada
    const [citaActualizada] = await pool.execute(
      `
            SELECT 
                c.id, c.fecha, c.hora, c.motivo, c.estado,
                m.nombre as medico_nombre, m.especialidad
            FROM citas c
            JOIN usuarios m ON c.medico_id = m.id
            WHERE c.id = ?
        `,
      [id],
    )

    res.json({
      success: true,
      message: "Cita reprogramada exitosamente",
      data: citaActualizada[0],
    })
  } catch (error) {
    console.error("Error reprogramando cita:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Obtener citas de un médico en una fecha específica (para verificar disponibilidad)
router.get("/medico/:medicoId", authenticateToken, async (req, res) => {
  try {
    const { medicoId } = req.params
    const { fecha } = req.query

    let query = `
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        c.estado,
        u.nombre as paciente_nombre
      FROM citas c
      JOIN usuarios u ON c.paciente_id = u.id
      WHERE c.medico_id = ? AND c.estado != 'cancelada'
    `
    
    let params = [medicoId]

    if (fecha) {
      query += " AND c.fecha = ?"
      params.push(fecha)
    }

    query += " ORDER BY c.fecha ASC, c.hora ASC"

    const [rows] = await pool.execute(query, params)

    res.json({
      success: true,
      data: rows
    })
  } catch (error) {
    console.error("Error obteniendo citas del médico:", error)
    res.status(500).json({
      success: false,
      message: "Error obteniendo citas del médico"
    })
  }
})

module.exports = router
