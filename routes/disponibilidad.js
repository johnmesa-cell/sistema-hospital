const express = require("express")
const { pool } = require("../config/database")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

// Middleware para verificar que es médico
const verifyMedico = (req, res, next) => {
  if (req.user.rol !== 'medico') {
    return res.status(403).json({
      success: false,
      message: "Solo los médicos pueden gestionar disponibilidad"
    })
  }
  next()
}

// Obtener disponibilidad del médico actual
router.get("/mia", authenticateToken, verifyMedico, async (req, res) => {
  try {
    const medicoId = req.user.id

    const query = `
      SELECT 
        id,
        fecha,
        hora_inicio,
        hora_fin,
        intervalo_minutos,
        creado_en
      FROM disponibilidad_medico 
      WHERE medico_id = ?
      ORDER BY fecha ASC, hora_inicio ASC
    `

    const [rows] = await pool.execute(query, [medicoId])

    // Formatear las fechas para asegurar compatibilidad
    const formattedRows = rows.map(row => ({
      ...row,
      fecha: row.fecha instanceof Date ? 
        row.fecha.toISOString().split('T')[0] : 
        row.fecha
    }))

    res.json({
      success: true,
      data: formattedRows
    })
  } catch (error) {
    console.error("Error obteniendo disponibilidad:", error)
    res.status(500).json({
      success: false,
      message: "Error obteniendo disponibilidad"
    })
  }
})

// Obtener disponibilidad de un médico específico (para pacientes)
router.get("/medico/:medicoId", authenticateToken, async (req, res) => {
  try {
    const { medicoId } = req.params
    const fechaDesde = req.query.fecha_desde || new Date().toISOString().split('T')[0]

    const query = `
      SELECT 
        id,
        fecha,
        hora_inicio,
        hora_fin,
        intervalo_minutos
      FROM disponibilidad_medico 
      WHERE medico_id = ? AND fecha >= ?
      ORDER BY fecha ASC, hora_inicio ASC
    `

    const [rows] = await pool.execute(query, [medicoId, fechaDesde])

    // Formatear las fechas para asegurar compatibilidad
    const formattedRows = rows.map(row => ({
      ...row,
      fecha: row.fecha instanceof Date ? 
        row.fecha.toISOString().split('T')[0] : 
        row.fecha
    }))

    res.json({
      success: true,
      data: formattedRows
    })
  } catch (error) {
    console.error("Error obteniendo disponibilidad del médico:", error)
    res.status(500).json({
      success: false,
      message: "Error obteniendo disponibilidad del médico"
    })
  }
})

// Crear nuevo tramo de disponibilidad
router.post("/", authenticateToken, verifyMedico, async (req, res) => {
  try {
    const { fecha, hora_inicio, hora_fin, intervalo_minutos } = req.body
    const medicoId = req.user.id

    // Validaciones básicas
    if (!fecha || !hora_inicio || !hora_fin || !intervalo_minutos) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos"
      })
    }

    // Validar que la fecha no sea en el pasado
    const fechaSeleccionada = new Date(fecha)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    if (fechaSeleccionada < hoy) {
      return res.status(400).json({
        success: false,
        message: "No se puede crear disponibilidad en fechas pasadas"
      })
    }

    // Validar que hora_fin sea mayor que hora_inicio
    if (hora_inicio >= hora_fin) {
      return res.status(400).json({
        success: false,
        message: "La hora de fin debe ser posterior a la hora de inicio"
      })
    }

    // Verificar si ya existe disponibilidad que se solape
    const checkQuery = `
      SELECT id FROM disponibilidad_medico 
      WHERE medico_id = ? AND fecha = ? 
      AND (
        (hora_inicio <= ? AND hora_fin > ?) OR
        (hora_inicio < ? AND hora_fin >= ?) OR
        (hora_inicio >= ? AND hora_fin <= ?)
      )
    `

    const [existingRows] = await pool.execute(checkQuery, [
      medicoId, fecha, 
      hora_inicio, hora_inicio,
      hora_fin, hora_fin,
      hora_inicio, hora_fin
    ])

    if (existingRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya existe disponibilidad que se solapa con este horario"
      })
    }

    // Insertar nueva disponibilidad
    const insertQuery = `
      INSERT INTO disponibilidad_medico 
      (medico_id, fecha, hora_inicio, hora_fin, intervalo_minutos, creado_en)
      VALUES (?, ?, ?, ?, ?, NOW())
    `

    const [result] = await pool.execute(insertQuery, [
      medicoId, fecha, hora_inicio, hora_fin, intervalo_minutos
    ])

    res.status(201).json({
      success: true,
      message: "Disponibilidad creada exitosamente",
      data: {
        id: result.insertId,
        medico_id: medicoId,
        fecha,
        hora_inicio,
        hora_fin,
        intervalo_minutos
      }
    })
  } catch (error) {
    console.error("Error creando disponibilidad:", error)
    res.status(500).json({
      success: false,
      message: "Error creando disponibilidad"
    })
  }
})

// Actualizar disponibilidad
router.put("/:id", authenticateToken, verifyMedico, async (req, res) => {
  try {
    const { id } = req.params
    const { fecha, hora_inicio, hora_fin, intervalo_minutos } = req.body
    const medicoId = req.user.id

    // Validar que la disponibilidad existe y pertenece al médico
    const checkQuery = `
      SELECT id FROM disponibilidad_medico 
      WHERE id = ? AND medico_id = ?
    `

    const [existingRows] = await pool.execute(checkQuery, [id, medicoId])

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Disponibilidad no encontrada"
      })
    }

    // Validaciones básicas
    if (!fecha || !hora_inicio || !hora_fin || !intervalo_minutos) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos"
      })
    }

    // Validar que hora_fin sea mayor que hora_inicio
    if (hora_inicio >= hora_fin) {
      return res.status(400).json({
        success: false,
        message: "La hora de fin debe ser posterior a la hora de inicio"
      })
    }

    // Verificar si ya existe otra disponibilidad que se solape
    const overlapQuery = `
      SELECT id FROM disponibilidad_medico 
      WHERE medico_id = ? AND fecha = ? AND id != ?
      AND (
        (hora_inicio <= ? AND hora_fin > ?) OR
        (hora_inicio < ? AND hora_fin >= ?) OR
        (hora_inicio >= ? AND hora_fin <= ?)
      )
    `

    const [overlapRows] = await pool.execute(overlapQuery, [
      medicoId, fecha, id,
      hora_inicio, hora_inicio,
      hora_fin, hora_fin,
      hora_inicio, hora_fin
    ])

    if (overlapRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya existe disponibilidad que se solapa con este horario"
      })
    }

    // Actualizar disponibilidad
    const updateQuery = `
      UPDATE disponibilidad_medico 
      SET fecha = ?, hora_inicio = ?, hora_fin = ?, intervalo_minutos = ?
      WHERE id = ? AND medico_id = ?
    `

    await pool.execute(updateQuery, [
      fecha, hora_inicio, hora_fin, intervalo_minutos, id, medicoId
    ])

    res.json({
      success: true,
      message: "Disponibilidad actualizada exitosamente"
    })
  } catch (error) {
    console.error("Error actualizando disponibilidad:", error)
    res.status(500).json({
      success: false,
      message: "Error actualizando disponibilidad"
    })
  }
})

// Eliminar disponibilidad
router.delete("/:id", authenticateToken, verifyMedico, async (req, res) => {
  try {
    const { id } = req.params
    const medicoId = req.user.id

    // Validar que la disponibilidad existe y pertenece al médico
    const checkQuery = `
      SELECT id FROM disponibilidad_medico 
      WHERE id = ? AND medico_id = ?
    `

    const [existingRows] = await pool.execute(checkQuery, [id, medicoId])

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Disponibilidad no encontrada"
      })
    }

    // Verificar si hay citas asociadas a esta disponibilidad
    const citasQuery = `
      SELECT COUNT(*) as total FROM citas 
      WHERE medico_id = ? AND fecha = (
        SELECT fecha FROM disponibilidad_medico WHERE id = ?
      )
      AND hora >= (
        SELECT hora_inicio FROM disponibilidad_medico WHERE id = ?
      )
      AND hora <= (
        SELECT hora_fin FROM disponibilidad_medico WHERE id = ?
      )
      AND estado != 'cancelada'
    `

    const [citasRows] = await pool.execute(citasQuery, [medicoId, id, id, id])

    if (citasRows[0].total > 0) {
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar disponibilidad con citas programadas"
      })
    }

    // Eliminar disponibilidad
    const deleteQuery = `
      DELETE FROM disponibilidad_medico 
      WHERE id = ? AND medico_id = ?
    `

    await pool.execute(deleteQuery, [id, medicoId])

    res.json({
      success: true,
      message: "Disponibilidad eliminada exitosamente"
    })
  } catch (error) {
    console.error("Error eliminando disponibilidad:", error)
    res.status(500).json({
      success: false,
      message: "Error eliminando disponibilidad"
    })
  }
})

// Obtener horarios disponibles para una fecha específica
router.get("/horarios/:medicoId/:fecha", authenticateToken, async (req, res) => {
  try {
    const { medicoId, fecha } = req.params

    // Obtener la disponibilidad del médico para esa fecha
    const disponibilidadQuery = `
      SELECT hora_inicio, hora_fin, intervalo_minutos
      FROM disponibilidad_medico 
      WHERE medico_id = ? AND fecha = ?
      ORDER BY hora_inicio ASC
    `

    const [disponibilidad] = await pool.execute(disponibilidadQuery, [medicoId, fecha])

    if (disponibilidad.length === 0) {
      return res.json({
        success: true,
        data: []
      })
    }

    // Obtener las citas ya programadas
    const citasQuery = `
      SELECT hora FROM citas 
      WHERE medico_id = ? AND fecha = ? AND estado != 'cancelada'
    `

    const [citasOcupadas] = await pool.execute(citasQuery, [medicoId, fecha])
    const horasOcupadas = citasOcupadas.map(cita => cita.hora)

    // Generar horarios disponibles
    let horariosDisponibles = []

    for (const tramo of disponibilidad) {
      const inicio = new Date(`2000-01-01T${tramo.hora_inicio}`)
      const fin = new Date(`2000-01-01T${tramo.hora_fin}`)
      const intervalo = tramo.intervalo_minutos

      let horaActual = new Date(inicio)

      while (horaActual < fin) {
        const horaString = horaActual.toTimeString().substring(0, 5)
        
        if (!horasOcupadas.includes(horaString)) {
          horariosDisponibles.push(horaString)
        }

        horaActual.setMinutes(horaActual.getMinutes() + intervalo)
      }
    }

    res.json({
      success: true,
      data: horariosDisponibles
    })
  } catch (error) {
    console.error("Error obteniendo horarios disponibles:", error)
    res.status(500).json({
      success: false,
      message: "Error obteniendo horarios disponibles"
    })
  }
})

module.exports = router