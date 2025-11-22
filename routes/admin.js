const express = require("express");
const router = express.Router();

// Ruta principal del panel administrador
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Bienvenido al panel ADMIN ✅",
  });
});

// Ejemplo extra: obtener usuarios, estadísticas, etc
router.get("/dashboard", (req, res) => {
  res.json({
    success: true,
    stats: {
      totalPacientes: 50,
      citasPendientes: 8,
      doctores: 4
    }
  });
});

module.exports = router;