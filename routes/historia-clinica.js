const express = require("express")
const { pool } = require("../config/database")
const { authenticateToken, verifyRole } = require("../middleware/auth")

const router = express.Router()

// Crear nueva historia clínica (solo médicos)
router.post("/", authenticateToken, verifyRole(["medico"]), async (req, res) => {
  const connection = await pool.getConnection()
  
  try {
    await connection.beginTransaction()
    
    const {
      paciente_id,
      cita_id,
      motivo_consulta,
      sintomas,
      examen_fisico,
      diagnostico,
      observaciones,
      presion_arterial,
      frecuencia_cardiaca,
      temperatura,
      peso,
      altura,
      tratamiento,
      recomendaciones
    } = req.body
    
    const medico_id = req.user.id

    // Validaciones básicas
    if (!paciente_id || !cita_id || !motivo_consulta || !diagnostico) {
      return res.status(400).json({
        success: false,
        message: "Paciente, cita, motivo de consulta y diagnóstico son requeridos",
      })
    }

    // Verificar que la cita existe y pertenece al médico
    const [citas] = await connection.execute(
      "SELECT id, estado FROM citas WHERE id = ? AND medico_id = ? AND paciente_id = ?",
      [cita_id, medico_id, paciente_id]
    )

    if (citas.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: "Cita no encontrada o no autorizada",
      })
    }

    // Verificar si ya existe historia clínica para esta cita
    const [historiaExistente] = await connection.execute(
      "SELECT id FROM historia_clinica WHERE cita_id = ?",
      [cita_id]
    )

    if (historiaExistente.length > 0) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: "Ya existe una historia clínica para esta cita",
      })
    }

    // Crear la historia clínica
    const [result] = await connection.execute(
      `INSERT INTO historia_clinica 
       (paciente_id, medico_id, cita_id, motivo_consulta, sintomas, examen_fisico, 
        diagnostico, observaciones, presion_arterial, frecuencia_cardiaca, 
        temperatura, peso, altura, tratamiento, recomendaciones) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paciente_id, medico_id, cita_id, motivo_consulta, sintomas, examen_fisico,
        diagnostico, observaciones, presion_arterial, frecuencia_cardiaca,
        temperatura, peso, altura, tratamiento, recomendaciones
      ]
    )

    // Actualizar el estado de la cita a completada
    await connection.execute(
      'UPDATE citas SET estado = "completada" WHERE id = ?',
      [cita_id]
    )

    await connection.commit()

    // Obtener la historia clínica creada
    const [historiaCreada] = await connection.execute(
      `SELECT 
        hc.*,
        p.nombre as paciente_nombre,
        m.nombre as medico_nombre, 
        m.especialidad
       FROM historia_clinica hc
       JOIN usuarios p ON hc.paciente_id = p.id
       JOIN usuarios m ON hc.medico_id = m.id
       WHERE hc.id = ?`,
      [result.insertId]
    )

    res.status(201).json({
      success: true,
      message: "Historia clínica creada exitosamente",
      data: historiaCreada[0],
    })
  } catch (error) {
    await connection.rollback()
    console.error("Error creando historia clínica:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  } finally {
    connection.release()
  }
})

// Obtener historia clínica de un paciente (médicos y el propio paciente)
router.get("/paciente/:paciente_id", authenticateToken, async (req, res) => {
  try {
    const { paciente_id } = req.params
    const userId = req.user.id
    const userRole = req.user.rol

    // Verificar autorización
    if (userRole === "paciente" && userId != paciente_id) {
      return res.status(403).json({
        success: false,
        message: "No autorizado para ver esta historia clínica",
      })
    }

    // Obtener la historia clínica completa del paciente
    const [historias] = await pool.execute(
      `SELECT 
        hc.*,
        m.nombre as medico_nombre,
        m.especialidad,
        c.fecha as fecha_cita,
        c.hora as hora_cita
       FROM historia_clinica hc
       JOIN usuarios m ON hc.medico_id = m.id
       JOIN citas c ON hc.cita_id = c.id
       WHERE hc.paciente_id = ?
       ORDER BY hc.fecha_consulta DESC`,
      [paciente_id]
    )

    res.json({
      success: true,
      message: "Historia clínica obtenida exitosamente",
      data: historias,
    })
  } catch (error) {
    console.error("Error obteniendo historia clínica:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Obtener historia clínica específica por ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.rol

    // Obtener la historia clínica
    const [historias] = await pool.execute(
      `SELECT 
        hc.*,
        p.nombre as paciente_nombre,
        p.email as paciente_email,
        p.telefono as paciente_telefono,
        m.nombre as medico_nombre,
        m.especialidad,
        c.fecha as fecha_cita,
        c.hora as hora_cita
       FROM historia_clinica hc
       JOIN usuarios p ON hc.paciente_id = p.id
       JOIN usuarios m ON hc.medico_id = m.id
       JOIN citas c ON hc.cita_id = c.id
       WHERE hc.id = ?`,
      [id]
    )

    if (historias.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Historia clínica no encontrada",
      })
    }

    const historia = historias[0]

    // Verificar autorización
    if (userRole === "paciente" && userId != historia.paciente_id) {
      return res.status(403).json({
        success: false,
        message: "No autorizado para ver esta historia clínica",
      })
    } else if (userRole === "medico" && userId != historia.medico_id) {
      return res.status(403).json({
        success: false,
        message: "No autorizado para ver esta historia clínica",
      })
    }

    res.json({
      success: true,
      message: "Historia clínica obtenida exitosamente",
      data: historia,
    })
  } catch (error) {
    console.error("Error obteniendo historia clínica:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Actualizar historia clínica (solo el médico que la creó)
router.put("/:id", authenticateToken, verifyRole(["medico"]), async (req, res) => {
  try {
    const { id } = req.params
    const medico_id = req.user.id
    const {
      motivo_consulta,
      sintomas,
      examen_fisico,
      diagnostico,
      observaciones,
      presion_arterial,
      frecuencia_cardiaca,
      temperatura,
      peso,
      altura,
      tratamiento,
      recomendaciones
    } = req.body

    // Verificar que la historia clínica existe y pertenece al médico
    const [historias] = await pool.execute(
      "SELECT id FROM historia_clinica WHERE id = ? AND medico_id = ?",
      [id, medico_id]
    )

    if (historias.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Historia clínica no encontrada o no autorizada",
      })
    }

    // Actualizar la historia clínica
    await pool.execute(
      `UPDATE historia_clinica 
       SET motivo_consulta = ?, sintomas = ?, examen_fisico = ?, diagnostico = ?,
           observaciones = ?, presion_arterial = ?, frecuencia_cardiaca = ?,
           temperatura = ?, peso = ?, altura = ?, tratamiento = ?, 
           recomendaciones = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        motivo_consulta, sintomas, examen_fisico, diagnostico, observaciones,
        presion_arterial, frecuencia_cardiaca, temperatura, peso, altura,
        tratamiento, recomendaciones, id
      ]
    )

    // Obtener historia clínica actualizada
    const [historiaActualizada] = await pool.execute(
      `SELECT 
        hc.*,
        p.nombre as paciente_nombre,
        m.nombre as medico_nombre,
        m.especialidad
       FROM historia_clinica hc
       JOIN usuarios p ON hc.paciente_id = p.id
       JOIN usuarios m ON hc.medico_id = m.id
       WHERE hc.id = ?`,
      [id]
    )

    res.json({
      success: true,
      message: "Historia clínica actualizada exitosamente",
      data: historiaActualizada[0],
    })
  } catch (error) {
    console.error("Error actualizando historia clínica:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Obtener todas las historias clínicas de un médico
router.get("/medico/todas", authenticateToken, verifyRole(["medico"]), async (req, res) => {
  try {
    const medico_id = req.user.id

    const [historias] = await pool.execute(
      `SELECT 
        hc.id,
        hc.fecha_consulta,
        hc.diagnostico,
        p.nombre as paciente_nombre,
        c.fecha as fecha_cita
       FROM historia_clinica hc
       JOIN usuarios p ON hc.paciente_id = p.id
       JOIN citas c ON hc.cita_id = c.id
       WHERE hc.medico_id = ?
       ORDER BY hc.fecha_consulta DESC`,
      [medico_id]
    )

    res.json({
      success: true,
      message: "Historias clínicas obtenidas exitosamente",
      data: historias,
    })
  } catch (error) {
    console.error("Error obteniendo historias clínicas:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Obtener historia clínica por ID de cita
router.get("/cita/:cita_id", authenticateToken, async (req, res) => {
  try {
    const { cita_id } = req.params
    const userId = req.user.id
    const userRole = req.user.rol

    // Obtener la historia clínica de la cita
    const [historias] = await pool.execute(
      `SELECT 
        hc.*,
        m.nombre as medico_nombre,
        m.especialidad,
        p.nombre as paciente_nombre,
        c.fecha as fecha_cita,
        c.hora as hora_cita
       FROM historia_clinica hc
       JOIN usuarios m ON hc.medico_id = m.id
       JOIN usuarios p ON hc.paciente_id = p.id
       JOIN citas c ON hc.cita_id = c.id
       WHERE hc.cita_id = ?`,
      [cita_id]
    )

    if (historias.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Historia clínica no encontrada para esta cita"
      })
    }

    const historia = historias[0]

    // Verificar autorización
    if (userRole === "paciente" && userId != historia.paciente_id) {
      return res.status(403).json({
        success: false,
        message: "No autorizado para ver esta historia clínica"
      })
    }

    if (userRole === "medico" && userId != historia.medico_id) {
      return res.status(403).json({
        success: false,
        message: "No autorizado para ver esta historia clínica"
      })
    }

    // Verificar si tiene receta asociada
    const [recetas] = await pool.execute(
      "SELECT id FROM recetas_medicas WHERE historia_clinica_id = ?",
      [historia.id]
    )

    res.json({
      success: true,
      message: "Historia clínica obtenida exitosamente",
      data: {
        ...historia,
        tiene_receta: recetas.length > 0,
        receta_id: recetas.length > 0 ? recetas[0].id : null
      }
    })
  } catch (error) {
    console.error("Error obteniendo historia clínica por cita:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    })
  }
})

module.exports = router