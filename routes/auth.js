const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

/**
 * Helper: normalizar email
 */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Registro de usuario
 * - Permite roles: admin, recepcionista, medico, paciente.
 * - Opcionalmente restringe auto-registro de roles privilegiados con ALLOW_SELF_ADMIN_REG=false.
 */
router.post("/register", async (req, res) => {
  try {
    const { nombre, email, password, rol, especialidad, telefono } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos obligatorios deben ser completados",
      });
    }

    const emailNorm = normalizeEmail(email);

    const ROLES_PERMITIDOS = ["admin", "recepcionista", "medico", "paciente"];
    if (!ROLES_PERMITIDOS.includes(rol)) {
      return res.status(400).json({
        success: false,
        message:
          'Rol no válido. Debe ser "admin", "recepcionista", "medico" o "paciente"',
      });
    }

    // Bloqueo opcional de auto-registro de admin/recepcionista
    const allowPrivilegedSelfReg =
      String(process.env.ALLOW_SELF_ADMIN_REG || "false").toLowerCase() ===
      "true";
    if ((rol === "admin" || rol === "recepcionista") && !allowPrivilegedSelfReg) {
      return res.status(403).json({
        success: false,
        message:
          "Registro de roles privilegiados restringido. Use un endpoint protegido o habilite ALLOW_SELF_ADMIN_REG=true",
      });
    }

    // Email único
    const [existingUsers] = await pool.execute(
      "SELECT id FROM usuarios WHERE email = ?",
      [emailNorm]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "El email ya está registrado",
      });
    }

    // Hash de contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insertar usuario
    const [result] = await pool.execute(
      "INSERT INTO usuarios (nombre, email, password, rol, especialidad, telefono) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre, emailNorm, hashedPassword, rol, especialidad || null, telefono || null]
    );

    // JWT
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Configuración inválida: falta JWT_SECRET",
      });
    }

    const token = jwt.sign(
      { userId: result.insertId, email: emailNorm, rol },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      data: {
        user: {
          id: result.insertId,
          nombre,
          email: emailNorm,
          rol,
          especialidad: especialidad || null,
          telefono: telefono || null,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

/**
 * Login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const emailNorm = normalizeEmail(email);
    const [users] = await pool.execute(
      "SELECT id, nombre, email, password, rol, especialidad, telefono FROM usuarios WHERE email = ?",
      [emailNorm]
    );

    if (users.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Credenciales inválidas" });
    }

    const user = users[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(401)
        .json({ success: false, message: "Credenciales inválidas" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Configuración inválida: falta JWT_SECRET",
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

     // Rol: no httpOnly para que el cliente pueda leerlo si es necesario (ej. para layout)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.cookie("rol", user.rol, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    // Respuesta JSON igual que antes (para compatibilidad con frontend)
    res.json({
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          especialidad: user.especialidad,
          telefono: user.telefono,
        },
        token,
      },
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

/**
 * Verificar token
 */
router.get("/verify", verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Token válido",
      data: { user: req.user },
    });
  } catch (error) {
    console.error("Error verificando token:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

module.exports = router;
