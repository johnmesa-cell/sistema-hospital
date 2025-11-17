const bcrypt = require("bcryptjs")
const { pool } = require("../config/database")

async function crearAdmin() {
  try {
    console.log("🔧 Iniciando creación de usuario administrador...")

    // Generar hash de la contraseña
    const password = "admin123"
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // Verificar si ya existe el admin
    const [existingAdmin] = await pool.execute(
      "SELECT * FROM usuarios WHERE email = ?",
      ["admin@hospital.com"]
    )

    if (existingAdmin.length > 0) {
      console.log("⚠️  El usuario admin ya existe. Actualizando contraseña...")
      
      // Actualizar la contraseña del admin existente
      await pool.execute(
        "UPDATE usuarios SET password = ? WHERE email = ?",
        [passwordHash, "admin@hospital.com"]
      )
      
      console.log("✅ Contraseña del administrador actualizada correctamente")
    } else {
      // Insertar nuevo usuario admin
      await pool.execute(
        "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)",
        ["Administrador", "admin@hospital.com", passwordHash, "administrador"]
      )
      
      console.log("✅ Usuario administrador creado correctamente")
    }

    console.log("\n📋 CREDENCIALES DE ACCESO:")
    console.log("   Email: admin@hospital.com")
    console.log("   Contraseña: admin123")
    console.log("\n⚠️  IMPORTANTE: Cambia esta contraseña después del primer login\n")

    process.exit(0)
  } catch (error) {
    console.error("❌ Error al crear administrador:", error.message)
    process.exit(1)
  }
}

crearAdmin()
