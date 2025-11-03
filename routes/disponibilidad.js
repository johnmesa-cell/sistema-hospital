const express = require("express")
const router = express.Router()
const { pool } = require("../config/database")
const { verifyToken, verifyRole } = require("../middleware/auth")

// Helpers tiempo
function toMinutes(hm) {
  const [h, m] = hm.split(":").map(Number)
  return h * 60 + m
}
function toHHMM(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0")
  const m = String(mins % 60).padStart(2, "0")
  return `${h}:${m}`
}

/**
 * GET /api/disponibilidad/mia
 * Lista tramos del médico autenticado
 */
router.get(
  "/mia",
  verifyToken,
  verifyRole(["medico"]),
  async (req, res) => {
    try {
      const medicoId = req.user.id
      const [rows] = await pool.execute(
        `SELECT id, DATE_FORMAT(fecha,'%Y-%m-%d') AS fecha,
                TIME_FORMAT(hora_inicio,'%H:%i') AS hora_inicio,
                TIME_FORMAT(hora_fin,'%H:%i')   AS hora_fin,
                intervalo_minutos, activo
         FROM disponibilidades
         WHERE medico_id=? 
         ORDER BY fecha, hora_inicio`,
        [medicoId],
      )
      res.json({ success: true, data: rows })
    } catch (error) {
      console.error("Error listando disponibilidad:", error)
      res.status(500).json({ success: false, message: "Error interno" })
    }
  },
)

/**
 * POST /api/disponibilidad
 * Crea tramo de disponibilidad para el médico autenticado
 * body: { fecha('YYYY-MM-DD'), hora_inicio('HH:MM'), hora_fin('HH:MM'), intervalo_minutos? }
 */
router.post(
  "/",
  verifyToken,
  verifyRole(["medico"]),
  async (req, res) => {
    try {
      const medico_id = req.user.id
      const { fecha, hora_inicio, hora_fin, intervalo_minutos = 30 } = req.body

      if ([fecha, hora_inicio, hora_fin].some(v => v === undefined)) {
        return res.status(400).json({ success: false, message: "Faltan campos" })
      }

      // Validaciones
      if (toMinutes(hora_inicio) >= toMinutes(hora_fin)) {
        return res.status(400).json({ success: false, message: "Hora de inicio debe ser antes de la hora de fin" })
      }
      if (intervalo_minutos <= 0) {
        return res.status(400).json({ success: false, message: "Intervalo debe ser positivo" })
      }

      // Verificar solapamientos en la misma fecha
      const [existing] = await pool.execute(
        `SELECT id FROM disponibilidades
         WHERE medico_id=? AND fecha=? AND activo=1
         AND (
           (hora_inicio < ? AND hora_fin > ?) OR
           (hora_inicio < ? AND hora_fin > ?) OR
           (hora_inicio >= ? AND hora_fin <= ?)
         )`,
        [medico_id, fecha, `${hora_fin}:00`, `${hora_inicio}:00`, `${hora_inicio}:00`, `${hora_fin}:00`, `${hora_inicio}:00`, `${hora_fin}:00`]
      )
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: "Este tramo se solapa con uno existente en la fecha" })
      }

      await pool.execute(
        `INSERT INTO disponibilidades
           (medico_id, fecha, hora_inicio, hora_fin, intervalo_minutos, activo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [medico_id, fecha, `${hora_inicio}:00`, `${hora_fin}:00`, intervalo_minutos],
      )
      res.status(201).json({ success: true, message: "Tramo creado" })
    } catch (error) {
      console.error("Error creando disponibilidad:", error)
      res.status(500).json({ success: false, message: "Error interno" })
    }
  },
)

/**
 * DELETE /api/disponibilidad/:id
 * Elimina un tramo (solo del propio médico)
 */
router.delete(
  "/:id",
  verifyToken,
  verifyRole(["medico"]),
  async (req, res) => {
    try {
      const medicoId = req.user.id
      const { id } = req.params
      await pool.execute(
        `DELETE FROM disponibilidades WHERE id=? AND medico_id=?`,
        [id, medicoId],
      )
      res.json({ success: true, message: "Tramo eliminado" })
    } catch (error) {
      console.error("Error eliminando tramo:", error)
      res.status(500).json({ success: false, message: "Error interno" })
    }
  },
)

/**
 * GET /api/disponibilidad/:medicoId/slots?fecha=YYYY-MM-DD
 * Genera horas disponibles por médico/fecha a partir de sus tramos + citas ocupadas
 */
router.get(
  "/:medicoId/slots",
  verifyToken, // o público si lo prefieren
  async (req, res) => {
    try {
      const { medicoId } = req.params
      const { fecha } = req.query
      if (!fecha) return res.status(400).json({ success:false, message: "fecha requerida (YYYY-MM-DD)" })

      // Tramos activos de la fecha
      const [bloques] = await pool.execute(
        `SELECT TIME_FORMAT(hora_inicio,'%H:%i') AS hora_inicio,
                TIME_FORMAT(hora_fin,'%H:%i')   AS hora_fin,
                intervalo_minutos
         FROM disponibilidades
         WHERE medico_id=? AND fecha=? AND activo=1`,
        [medicoId, fecha],
      )

      // Citas ocupadas ese día (no canceladas)
      const [ocupadasRows] = await pool.execute(
        `SELECT TIME_FORMAT(hora,'%H:%i') AS hora
         FROM citas
         WHERE medico_id=? AND fecha=? AND estado IN ('pendiente','confirmada','completada')`,
        [medicoId, fecha],
      )
      const ocupadas = new Set(ocupadasRows.map(r => r.hora)) // 'HH:MM'

      // Generar slots
      const slots = []
      for (const b of bloques) {
        const step = Number(b.intervalo_minutos)
        let t = toMinutes(b.hora_inicio)
        const end = toMinutes(b.hora_fin)
        while (t + step <= end) {
          const hhmm = toHHMM(t)
          if (!ocupadas.has(hhmm)) slots.push(hhmm)
          t += step
        }
      }

      const unicos = [...new Set(slots)].sort()
      res.json({ success: true, data: unicos, medicoId: Number(medicoId), fecha })
    } catch (error) {
      console.error("Error generando slots:", error)
      res.status(500).json({ success: false, message: "Error interno" })
    }
  },
)

module.exports = router
