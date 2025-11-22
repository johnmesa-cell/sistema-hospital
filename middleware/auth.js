const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

// Verificar token JWT y cargar usuario
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Token de acceso requerido" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: "Falta JWT_SECRET en configuración" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Confirmar existencia del usuario y obtener rol actual desde BD
    const [users] = await pool.execute(
      "SELECT id, nombre, email, rol FROM usuarios WHERE id = ?",
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "Usuario no válido" });
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error("Error verificando token:", error);
    return res.status(401).json({ success: false, message: "Token no válido o expirado" });
  }
};

// Verificar rol: acepta lista de roles o parámetros variádicos
const verifyRole = (...rolesOrArray) => {
  const allowed = Array.isArray(rolesOrArray[0]) ? rolesOrArray[0] : rolesOrArray;
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Usuario no autenticado" });
    }
    if (!allowed.includes(req.user.rol)) {
      return res.status(403).json({ success: false, message: "No tienes permisos para acceder a este recurso" });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  verifyRole,
};

