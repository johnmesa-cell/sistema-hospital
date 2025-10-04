# Sistema de Gestión de Citas Médicas - MVP

Un sistema completo para la gestión de citas médicas desarrollado como proyecto académico.

## 🏥 Características

- **Autenticación de usuarios** con dos roles: Médico y Paciente
- **Gestión de citas** - Los pacientes pueden solicitar citas con médicos
- **Panel de control** diferenciado por rol de usuario
- **Estadísticas** en tiempo real de citas
- **Interfaz responsive** y profesional
- **Base de datos MySQL** con solo 2 tablas principales

## 🚀 Tecnologías Utilizadas

### Backend
- **Node.js** - Servidor backend
- **Express.js** - Framework web
- **MySQL** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Encriptación de contraseñas

### Frontend
- **HTML5** - Estructura
- **CSS3** - Estilos (diseño médico profesional)
- **JavaScript** - Funcionalidad interactiva

## 📋 Requisitos Previos

- Node.js (v14 o superior)
- MySQL (v8.0 o superior)
- npm o yarn

## 🛠️ Instalación

1. **Clonar el repositorio**
   \`\`\`bash
   git clone <url-del-repositorio>
   cd sistema-citas-medicas
   \`\`\`

2. **Instalar dependencias**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configurar base de datos**
   - Crear una base de datos MySQL
   - Copiar `.env.example` a `.env`
   - Configurar las variables de entorno:
   \`\`\`env
   DB_HOST=localhost
   DB_USER=tu_usuario
   DB_PASSWORD=tu_password
   DB_NAME=sistema_citas_medicas
   JWT_SECRET=tu_clave_secreta_muy_segura
   PORT=3000
   \`\`\`

4. **Ejecutar scripts SQL**
   \`\`\`bash
   # Ejecutar en MySQL los archivos en orden:
   # 1. scripts/01-create-database.sql
   # 2. scripts/02-insert-test-data.sql
   \`\`\`

5. **Iniciar el servidor**
   \`\`\`bash
   npm start
   # o para desarrollo:
   npm run dev
   \`\`\`

6. **Acceder a la aplicación**
   - Abrir navegador en `http://localhost:3000`

## 👥 Usuarios de Prueba

### Médicos
- **Dr. María González** (Cardiología)
  - Email: `maria.gonzalez@hospital.com`
  - Password: `123456`

- **Dr. Carlos Rodríguez** (Medicina General)
  - Email: `carlos.rodriguez@hospital.com`
  - Password: `123456`

### Pacientes
- **Juan Pérez**
  - Email: `juan.perez@email.com`
  - Password: `123456`

- **Laura Sánchez**
  - Email: `laura.sanchez@email.com`
  - Password: `123456`

## 📊 Estructura de la Base de Datos

### Tabla `usuarios`
- `id` - Identificador único
- `nombre` - Nombre completo
- `email` - Email único
- `password` - Contraseña encriptada
- `rol` - 'medico' o 'paciente'
- `especialidad` - Solo para médicos
- `telefono` - Número de contacto

### Tabla `citas`
- `id` - Identificador único
- `paciente_id` - Referencia al paciente
- `medico_id` - Referencia al médico
- `fecha` - Fecha de la cita
- `hora` - Hora de la cita
- `motivo` - Motivo de la consulta
- `estado` - 'pendiente', 'confirmada', 'cancelada', 'completada'

## 🎯 Funcionalidades por Rol

### Pacientes
- ✅ Registrarse e iniciar sesión
- ✅ Ver dashboard con estadísticas personales
- ✅ Solicitar nuevas citas con médicos
- ✅ Ver historial de citas
- ✅ Cancelar citas pendientes

### Médicos
- ✅ Registrarse e iniciar sesión
- ✅ Ver dashboard con citas solicitadas
- ✅ Confirmar o cancelar citas
- ✅ Marcar citas como completadas
- ✅ Ver estadísticas de consultas

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/verify` - Verificar token

### Usuarios
- `GET /api/usuarios/medicos` - Listar médicos
- `GET /api/usuarios/perfil` - Obtener perfil
- `PUT /api/usuarios/perfil` - Actualizar perfil

### Citas
- `POST /api/citas` - Crear nueva cita
- `GET /api/citas/mis-citas` - Obtener citas del usuario
- `GET /api/citas/estadisticas` - Estadísticas de citas
- `PUT /api/citas/:id/estado` - Actualizar estado de cita
- `DELETE /api/citas/:id` - Cancelar cita

## 🎨 Diseño

El sistema utiliza un diseño médico profesional inspirado en:
- Colores: Púrpura primario (#4c1d95) con acentos en cyan
- Tipografía: Inter font family
- Interfaz limpia y moderna
- Responsive design para móviles y tablets

## 📝 Notas del Proyecto

Este es un **MVP (Minimum Viable Product)** desarrollado con fines académicos que incluye:
- Funcionalidades básicas pero completas
- Código bien estructurado y comentado
- Base de datos normalizada
- Seguridad básica implementada
- Interfaz de usuario intuitiva

## 🚀 Posibles Mejoras Futuras

- Notificaciones por email
- Sistema de recordatorios
- Integración con calendario
- Historial médico de pacientes
- Sistema de pagos
- Reportes avanzados
- API REST completa
- Tests automatizados

## 📄 Licencia

Este proyecto es de uso académico y está bajo licencia MIT.
