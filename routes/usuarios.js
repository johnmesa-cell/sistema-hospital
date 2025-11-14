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

//Administración de usuarios (solo Admin)
router.get("/", verifyToken, verifyRole(["admin"]), async (req, res) => {
  try {
    const { rol, q } = req.query;
    const filters = [];
    const params = [];

    if (rol) { filters.push("rol = ?"); params.push(rol); }
    if (q) { filters.push("(nombre LIKE ? OR email LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const [rows] = await pool.execute(
      `SELECT id, nombre, email, rol, especialidad, telefono, created_at
       FROM usuarios
       ${where}
       ORDER BY created_at DESC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error listando usuarios:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

router.post("/", verifyToken, verifyRole(["admin"]), async (req, res) => {
  try {
    const { nombre, email, passwordHash, rol, especialidad, telefono } = req.body;

    if (!nombre || !email || !passwordHash || !rol) {
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios" });
    }

    if (!["admin", "recepcionista", "medico", "paciente"].includes(rol)) {
      return res.status(400).json({ success: false, message: "Rol inválido" });
    }

    const emailNorm = String(email).trim().toLowerCase();

    const [exists] = await pool.execute("SELECT id FROM usuarios WHERE email = ?", [emailNorm]);
    if (exists.length) {
      return res.status(409).json({ success: false, message: "Email ya registrado" });
    }

    await pool.execute(
      "INSERT INTO usuarios (nombre, email, password, rol, especialidad, telefono) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre, emailNorm, passwordHash, rol, especialidad || null, telefono || null]
    );

    res.status(201).json({ success: true, message: "Usuario creado" });
  } catch (error) {
    console.error("Error creando usuario:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

router.put("/:id/rol", verifyToken, verifyRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    if (!["admin", "recepcionista", "medico", "paciente"].includes(rol)) {
      return res.status(400).json({ success: false, message: "Rol inválido" });
    }

    await pool.execute("UPDATE usuarios SET rol = ? WHERE id = ?", [rol, id]);
    res.json({ success: true, message: "Rol actualizado" });
  } catch (error) {
    console.error("Error actualizando rol:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

router.delete("/:id", verifyToken, verifyRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: "No puedes eliminar tu propia cuenta" });
    }

    await pool.execute("DELETE FROM usuarios WHERE id = ?", [id]);
    res.json({ success: true, message: "Usuario eliminado" });
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

module.exports = router
