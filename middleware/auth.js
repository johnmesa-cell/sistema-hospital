const jwt = require("jsonwebtoken")
const { pool } = require("../config/database")

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de acceso requerido",
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Verificar que el usuario existe en la base de datos
    const [users] = await pool.execute("SELECT id, nombre, email, rol FROM usuarios WHERE id = ?", [decoded.userId])

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Usuario no válido",
      })
    }

    req.user = users[0]
    next()
  } catch (error) {
    console.error("Error verificando token:", error)
    return res.status(401).json({
      success: false,
      message: "Token no válido",
    })
  }
}

// Middleware para verificar rol específico
const verifyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
      })
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para acceder a este recurso",
      })
    }

    next()
  }
}

module.exports = {
  authenticateToken,
  verifyRole,
}
