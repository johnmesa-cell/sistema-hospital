const express = require("express")
const { pool } = require("../config/database")
const { authenticateToken, verifyRole } = require("../middleware/auth")

const router = express.Router()

// Crear nueva receta médica (solo médicos)
router.post("/", authenticateToken, verifyRole(["medico"]), async (req, res) => {
  const connection = await pool.getConnection()
  
  try {
    await connection.beginTransaction()
    
    const {
      paciente_id,
      cita_id,
      historia_clinica_id,
      diagnostico,
      indicaciones_generales,
      medicamentos // Array de medicamentos
    } = req.body
    
    const medico_id = req.user.id

    // Validaciones básicas
    if (!paciente_id || !cita_id || !historia_clinica_id || !diagnostico || !medicamentos || medicamentos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos y debe incluir al menos un medicamento",
      })
    }

    // Verificar que la historia clínica existe y pertenece al médico
    const [historias] = await connection.execute(
      "SELECT id FROM historia_clinica WHERE id = ? AND medico_id = ? AND paciente_id = ? AND cita_id = ?",
      [historia_clinica_id, medico_id, paciente_id, cita_id]
    )

    if (historias.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: "Historia clínica no encontrada o no autorizada",
      })
    }

    // Verificar si ya existe receta para esta historia clínica
    const [recetaExistente] = await connection.execute(
      "SELECT id FROM recetas_medicas WHERE historia_clinica_id = ?",
      [historia_clinica_id]
    )

    if (recetaExistente.length > 0) {
      await connection.rollback()
      return res.status(400).json({
        success: false,
        message: "Ya existe una receta para esta historia clínica",
      })
    }

    // Crear la receta médica
    const [result] = await connection.execute(
      `INSERT INTO recetas_medicas 
       (paciente_id, medico_id, cita_id, historia_clinica_id, diagnostico, indicaciones_generales) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [paciente_id, medico_id, cita_id, historia_clinica_id, diagnostico, indicaciones_generales]
    )

    const receta_id = result.insertId

    // Insertar los medicamentos
    for (const medicamento of medicamentos) {
      const {
        medicamento: nombre_medicamento,
        concentracion,
        forma_farmaceutica,
        dosis,
        frecuencia,
        duracion,
        cantidad_total,
        via_administracion,
        instrucciones_especiales
      } = medicamento

      if (!nombre_medicamento || !dosis || !frecuencia || !duracion) {
        await connection.rollback()
        return res.status(400).json({
          success: false,
          message: "Cada medicamento debe tener nombre, dosis, frecuencia y duración",
        })
      }

      await connection.execute(
        `INSERT INTO receta_medicamentos 
         (receta_id, medicamento, concentracion, forma_farmaceutica, dosis, 
          frecuencia, duracion, cantidad_total, via_administracion, instrucciones_especiales) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receta_id, nombre_medicamento, concentracion, forma_farmaceutica,
          dosis, frecuencia, duracion, cantidad_total, via_administracion,
          instrucciones_especiales
        ]
      )
    }

    await connection.commit()

    // Obtener la receta completa creada
    const [recetaCreada] = await connection.execute(
      `SELECT 
        rm.*,
        p.nombre as paciente_nombre,
        p.email as paciente_email,
        m.nombre as medico_nombre, 
        m.especialidad,
        hc.diagnostico as diagnostico_historia
       FROM recetas_medicas rm
       JOIN usuarios p ON rm.paciente_id = p.id
       JOIN usuarios m ON rm.medico_id = m.id
       JOIN historia_clinica hc ON rm.historia_clinica_id = hc.id
       WHERE rm.id = ?`,
      [receta_id]
    )

    // Obtener los medicamentos
    const [medicamentosCreados] = await connection.execute(
      "SELECT * FROM receta_medicamentos WHERE receta_id = ? ORDER BY id",
      [receta_id]
    )

    res.status(201).json({
      success: true,
      message: "Receta médica creada exitosamente",
      data: {
        receta: recetaCreada[0],
        medicamentos: medicamentosCreados
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error("Error creando receta médica:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  } finally {
    connection.release()
  }
})

// Obtener recetas de un paciente
router.get("/paciente/:paciente_id", authenticateToken, async (req, res) => {
  try {
    const { paciente_id } = req.params
    const userId = req.user.id
    const userRole = req.user.rol

    // Verificar autorización
    if (userRole === "paciente" && userId != paciente_id) {
      return res.status(403).json({
        success: false,
        message: "No autorizado para ver estas recetas",
      })
    }

    // Obtener las recetas del paciente
    const [recetas] = await pool.execute(
      `SELECT 
        rm.*,
        m.nombre as medico_nombre,
        m.especialidad,
        c.fecha as fecha_cita
       FROM recetas_medicas rm
       JOIN usuarios m ON rm.medico_id = m.id
       JOIN citas c ON rm.cita_id = c.id
       WHERE rm.paciente_id = ?
       ORDER BY rm.fecha_emision DESC`,
      [paciente_id]
    )

    res.json({
      success: true,
      message: "Recetas obtenidas exitosamente",
      data: recetas,
    })
  } catch (error) {
    console.error("Error obteniendo recetas:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Obtener receta específica con medicamentos
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.rol

    // Obtener la receta
    const [recetas] = await pool.execute(
      `SELECT 
        rm.*,
        p.nombre as paciente_nombre,
        p.email as paciente_email,
        p.telefono as paciente_telefono,
        m.nombre as medico_nombre,
        m.especialidad,
        m.telefono as medico_telefono,
        c.fecha as fecha_cita,
        c.hora as hora_cita
       FROM recetas_medicas rm
       JOIN usuarios p ON rm.paciente_id = p.id
       JOIN usuarios m ON rm.medico_id = m.id
       JOIN citas c ON rm.cita_id = c.id
       WHERE rm.id = ?`,
      [id]
    )

    if (recetas.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Receta no encontrada",
      })
    }

    const receta = recetas[0]

    // Verificar autorización
    if (userRole === "paciente" && userId != receta.paciente_id) {
      return res.status(403).json({
        success: false,
        message: "No autorizado para ver esta receta",
      })
    } else if (userRole === "medico" && userId != receta.medico_id) {
      return res.status(403).json({
        success: false,
        message: "No autorizado para ver esta receta",
      })
    }

    // Obtener los medicamentos de la receta
    const [medicamentos] = await pool.execute(
      "SELECT * FROM receta_medicamentos WHERE receta_id = ? ORDER BY id",
      [id]
    )

    res.json({
      success: true,
      message: "Receta obtenida exitosamente",
      data: {
        receta,
        medicamentos
      },
    })
  } catch (error) {
    console.error("Error obteniendo receta:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Obtener todas las recetas creadas por un médico
router.get("/medico/todas", authenticateToken, verifyRole(["medico"]), async (req, res) => {
  try {
    const medico_id = req.user.id

    const [recetas] = await pool.execute(
      `SELECT 
        rm.id,
        rm.fecha_emision,
        rm.diagnostico,
        p.nombre as paciente_nombre,
        c.fecha as fecha_cita
       FROM recetas_medicas rm
       JOIN usuarios p ON rm.paciente_id = p.id
       JOIN citas c ON rm.cita_id = c.id
       WHERE rm.medico_id = ?
       ORDER BY rm.fecha_emision DESC`,
      [medico_id]
    )

    res.json({
      success: true,
      message: "Recetas obtenidas exitosamente",
      data: recetas,
    })
  } catch (error) {
    console.error("Error obteniendo recetas:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  }
})

// Actualizar receta médica (solo el médico que la creó)
router.put("/:id", authenticateToken, verifyRole(["medico"]), async (req, res) => {
  const connection = await pool.getConnection()
  
  try {
    await connection.beginTransaction()
    
    const { id } = req.params
    const medico_id = req.user.id
    const {
      diagnostico,
      indicaciones_generales,
      medicamentos
    } = req.body

    // Verificar que la receta existe y pertenece al médico
    const [recetas] = await connection.execute(
      "SELECT id FROM recetas_medicas WHERE id = ? AND medico_id = ?",
      [id, medico_id]
    )

    if (recetas.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: "Receta no encontrada o no autorizada",
      })
    }

    // Actualizar la receta
    await connection.execute(
      `UPDATE recetas_medicas 
       SET diagnostico = ?, indicaciones_generales = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [diagnostico, indicaciones_generales, id]
    )

    // Si se proporcionan medicamentos, actualizar la lista
    if (medicamentos && medicamentos.length > 0) {
      // Eliminar medicamentos existentes
      await connection.execute(
        "DELETE FROM receta_medicamentos WHERE receta_id = ?",
        [id]
      )

      // Insertar nuevos medicamentos
      for (const medicamento of medicamentos) {
        const {
          medicamento: nombre_medicamento,
          concentracion,
          forma_farmaceutica,
          dosis,
          frecuencia,
          duracion,
          cantidad_total,
          via_administracion,
          instrucciones_especiales
        } = medicamento

        if (!nombre_medicamento || !dosis || !frecuencia || !duracion) {
          await connection.rollback()
          return res.status(400).json({
            success: false,
            message: "Cada medicamento debe tener nombre, dosis, frecuencia y duración",
          })
        }

        await connection.execute(
          `INSERT INTO receta_medicamentos 
           (receta_id, medicamento, concentracion, forma_farmaceutica, dosis, 
            frecuencia, duracion, cantidad_total, via_administracion, instrucciones_especiales) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, nombre_medicamento, concentracion, forma_farmaceutica,
            dosis, frecuencia, duracion, cantidad_total, via_administracion,
            instrucciones_especiales
          ]
        )
      }
    }

    await connection.commit()

    // Obtener receta actualizada
    const [recetaActualizada] = await connection.execute(
      `SELECT 
        rm.*,
        p.nombre as paciente_nombre,
        m.nombre as medico_nombre,
        m.especialidad
       FROM recetas_medicas rm
       JOIN usuarios p ON rm.paciente_id = p.id
       JOIN usuarios m ON rm.medico_id = m.id
       WHERE rm.id = ?`,
      [id]
    )

    // Obtener medicamentos actualizados
    const [medicamentosActualizados] = await connection.execute(
      "SELECT * FROM receta_medicamentos WHERE receta_id = ? ORDER BY id",
      [id]
    )

    res.json({
      success: true,
      message: "Receta actualizada exitosamente",
      data: {
        receta: recetaActualizada[0],
        medicamentos: medicamentosActualizados
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error("Error actualizando receta:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  } finally {
    connection.release()
  }
})

// Eliminar receta médica (solo el médico que la creó)
router.delete("/:id", authenticateToken, verifyRole(["medico"]), async (req, res) => {
  const connection = await pool.getConnection()
  
  try {
    await connection.beginTransaction()
    
    const { id } = req.params
    const medico_id = req.user.id

    // Verificar que la receta existe y pertenece al médico
    const [recetas] = await connection.execute(
      "SELECT id FROM recetas_medicas WHERE id = ? AND medico_id = ?",
      [id, medico_id]
    )

    if (recetas.length === 0) {
      await connection.rollback()
      return res.status(404).json({
        success: false,
        message: "Receta no encontrada o no autorizada",
      })
    }

    // Eliminar medicamentos asociados
    await connection.execute(
      "DELETE FROM receta_medicamentos WHERE receta_id = ?",
      [id]
    )

    // Eliminar la receta
    await connection.execute(
      "DELETE FROM recetas_medicas WHERE id = ?",
      [id]
    )

    await connection.commit()

    res.json({
      success: true,
      message: "Receta eliminada exitosamente",
    })
  } catch (error) {
    await connection.rollback()
    console.error("Error eliminando receta:", error)
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    })
  } finally {
    connection.release()
  }
})

module.exports = router