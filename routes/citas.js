const express = require("express");
const { pool } = require("../config/database");
const { verifyToken, verifyRole } = require("../middleware/auth");

const router = express.Router();

/**
 * Crear nueva cita
 * - Paciente crea la suya.
 * - Recepcionista puede crear en nombre de un paciente (enviar paciente_id en body).
 */
router.post("/", verifyToken, verifyRole(["paciente", "recepcionista"]), async (req, res) => {
  try {
    const { medico_id, fecha, hora, motivo, paciente_id: pacienteIdBody } = req.body;
    const paciente_id = req.user.rol === "paciente" ? req.user.id : pacienteIdBody;

    if (!paciente_id || !medico_id || !fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: "Paciente, médico, fecha y hora son requeridos",
      });
    }

    const [medicos] = await pool.execute(
      'SELECT id FROM usuarios WHERE id = ? AND rol = "medico"',
      [medico_id]
    );
    if (medicos.length === 0) {
      return res.status(400).json({ success: false, message: "Médico no encontrado" });
    }

    const [conflictos] = await pool.execute(
      'SELECT id FROM citas WHERE medico_id = ? AND fecha = ? AND hora = ? AND estado != "cancelada"',
      [medico_id, fecha, hora]
    );
    if (conflictos.length > 0) {
      return res.status(409).json({ success: false, message: "Horario no disponible" });
    }

    await pool.execute(
      "INSERT INTO citas (paciente_id, medico_id, fecha, hora, motivo, estado) VALUES (?, ?, ?, ?, ?, 'pendiente')",
      [paciente_id, medico_id, fecha, hora, motivo || null]
    );

    res.status(201).json({ success: true, message: "Cita creada correctamente" });
  } catch (error) {
    console.error("Error creando cita:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

/**
 * Listado global de citas (admin/recepcionista)
 */
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

/**
 * Mis citas
 */
router.get("/mis-citas", verifyToken, async (req, res) => {
  try {
    const { rol, id } = req.user;

    if (rol === "paciente") {
      const [rows] = await pool.execute(
        `
        SELECT c.id, c.fecha, c.hora, c.motivo, c.estado,
               m.id AS medico_id, m.nombre AS medico_nombre, m.especialidad
        FROM citas c
        JOIN usuarios m ON m.id = c.medico_id
        WHERE c.paciente_id = ?
        ORDER BY c.fecha DESC, c.hora DESC
        `,
        [id]
      );
      return res.json({ success: true, data: rows });
    }

    if (rol === "medico") {
      const [rows] = await pool.execute(
        `
        SELECT c.id, c.fecha, c.hora, c.motivo, c.estado,
               p.id AS paciente_id, p.nombre AS paciente_nombre
        FROM citas c
        JOIN usuarios p ON p.id = c.paciente_id
        WHERE c.medico_id = ?
        ORDER BY c.fecha DESC, c.hora DESC
        `,
        [id]
      );
      return res.json({ success: true, data: rows });
    }

    return res.status(403).json({
      success: false,
      message: "Rol no autorizado para este recurso. Usa /api/citas para listado global",
    });
  } catch (error) {
    console.error("Error en mis-citas:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

/**
 * Actualizar estado de cita
 */
router.put("/:id/estado", verifyToken, verifyRole(["medico", "recepcionista", "admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!["pendiente", "confirmada", "cancelada", "completada"].includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado no válido" });
    }

    if (req.user.rol === "medico") {
      const [rows] = await pool.execute(
        "SELECT id FROM citas WHERE id = ? AND medico_id = ?",
        [id, req.user.id]
      );
      if (rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "No puedes modificar citas de otros médicos",
        });
      }
    }

    await pool.execute("UPDATE citas SET estado = ? WHERE id = ?", [estado, id]);
    res.json({ success: true, message: "Estado actualizado" });
  } catch (error) {
    console.error("Error actualizando estado:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

/**
 * Cancelar cita
 */
router.delete("/:id", verifyToken, verifyRole(["paciente", "recepcionista", "admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.rol === "paciente") {
      const [rows] = await pool.execute(
        'SELECT id FROM citas WHERE id = ? AND paciente_id = ? AND estado = "pendiente"',
        [id, req.user.id]
      );
      if (rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Solo puedes cancelar tus citas pendientes",
        });
      }
    }

    await pool.execute("UPDATE citas SET estado = 'cancelada' WHERE id = ?", [id]);
    res.json({ success: true, message: "Cita cancelada" });
  } catch (error) {
    console.error("Error cancelando cita:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

module.exports = router;


