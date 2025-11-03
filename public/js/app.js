// Sistema de Gestión de Citas Médicas - Frontend JavaScript
// Configuración global
const API_BASE_URL = "/api"
let currentUser = null
let authToken = null

// Elementos del DOM
const elements = {
  landingPage: document.getElementById("landingPage"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  dashboard: document.getElementById("dashboard"),
  mainNav: document.getElementById("mainNav"),
  loadingSpinner: document.getElementById("loadingSpinner"),
  toastContainer: document.getElementById("toastContainer"),
}

// Inicialización de la aplicación
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
  setupEventListeners()
})

// Inicializar aplicación
async function initializeApp() {
  // Verificar si hay token guardado
  authToken = localStorage.getItem("authToken")

  if (authToken) {
    try {
      await verifyToken()
    } catch (error) {
      console.error("Token inválido:", error)
      localStorage.removeItem("authToken")
      authToken = null
      showLanding()
    }
  } else {
    showLanding()
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Formulario de login
  document.getElementById("loginFormElement").addEventListener("submit", handleLogin)

  // Formulario de registro
  document.getElementById("registerFormElement").addEventListener("submit", handleRegister)

  // Formulario de nueva cita
  document.getElementById("newAppointmentForm").addEventListener("submit", handleNewAppointment)

  // Configurar fecha mínima para citas (hoy)
  const fechaInput = document.getElementById("appointmentFecha")
  if (fechaInput) {
    const today = new Date().toISOString().split("T")[0]
    fechaInput.min = today
  }
}

// Funciones de navegación
function showLanding() {
  hideAllSections()
  elements.landingPage.style.display = "block"
  elements.mainNav.style.display = "none"
}

function showLogin() {
  hideAllSections()
  elements.loginForm.style.display = "block"
  elements.mainNav.style.display = "none"
}

function showRegister() {
  hideAllSections()
  elements.registerForm.style.display = "block"
  elements.mainNav.style.display = "none"
}

function showDashboard() {
  hideAllSections()
  elements.dashboard.style.display = "block"
  elements.mainNav.style.display = "flex"
  loadDashboardData()
}

function hideAllSections() {
  elements.landingPage.style.display = "none"
  elements.loginForm.style.display = "none"
  elements.registerForm.style.display = "none"
  elements.dashboard.style.display = "none"
}

// Funciones de autenticación
async function handleLogin(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const loginData = {
    email: formData.get("email"),
    password: formData.get("password"),
  }

  try {
    showLoading(true)

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginData),
    })

    const result = await response.json()

    if (result.success) {
      authToken = result.data.token
      currentUser = result.data.user

      localStorage.setItem("authToken", authToken)

      showToast("Inicio de sesión exitoso", "success")
      updateUserInterface()
      showDashboard()
    } else {
      showToast(result.message || "Error en el inicio de sesión", "error")
    }
  } catch (error) {
    console.error("Error en login:", error)
    showToast("Error de conexión", "error")
  } finally {
    showLoading(false)
  }
}

async function handleRegister(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const registerData = {
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    password: formData.get("password"),
    rol: formData.get("rol"),
    especialidad: formData.get("especialidad"),
    telefono: formData.get("telefono"),
  }

  try {
    showLoading(true)

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registerData),
    })

    const result = await response.json()

    if (result.success) {
      authToken = result.data.token
      currentUser = result.data.user

      localStorage.setItem("authToken", authToken)

      showToast("Registro exitoso", "success")
      updateUserInterface()
      showDashboard()
    } else {
      showToast(result.message || "Error en el registro", "error")
    }
  } catch (error) {
    console.error("Error en registro:", error)
    showToast("Error de conexión", "error")
  } finally {
    showLoading(false)
  }
}

async function verifyToken() {
  const response = await fetch(`${API_BASE_URL}/auth/verify`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })

  const result = await response.json()

  if (result.success) {
    currentUser = result.data.user
    updateUserInterface()
    showDashboard()
  } else {
    throw new Error("Token inválido")
  }
}

function logout() {
  authToken = null
  currentUser = null
  localStorage.removeItem("authToken")
  showToast("Sesión cerrada", "success")
  showLanding()
}

// Funciones de interfaz de usuario
function updateUserInterface() {
  if (currentUser) {
    document.getElementById("userName").textContent = currentUser.nombre
    const roleElement = document.getElementById("userRole")
    roleElement.textContent = currentUser.rol
    roleElement.className = `role-badge ${currentUser.rol}`

    // Mostrar/ocultar botón de nueva cita según el rol
    const newAppointmentBtn = document.getElementById("newAppointmentBtn")
    if (currentUser.rol === "paciente") {
      newAppointmentBtn.style.display = "block"
    } else {
      newAppointmentBtn.style.display = "none"
    }

    // ⬇️ AQUI MISMO, justo después, añade esto:
    const linkDisp = document.getElementById("linkDisponibilidad")
    if (linkDisp) {
      linkDisp.style.display = (currentUser.rol === "medico") ? "inline-block" : "none"
    }

    // Actualizar título del dashboard
    const dashboardTitle = document.getElementById("dashboardTitle")
    if (currentUser.rol === "medico") {
      dashboardTitle.textContent = `Panel Médico - ${currentUser.especialidad || "Medicina General"}`
    } else {
      dashboardTitle.textContent = "Panel del Paciente"
    }
  }
}

// Funciones del dashboard
async function loadDashboardData() {
  if (!currentUser) return

  try {
    showLoading(true)

    // Cargar estadísticas
    await loadStatistics()

    // Cargar citas
    await loadAppointments()

    // Mostrar dashboard apropiado según el rol
    if (currentUser.rol === "paciente") {
      document.getElementById("pacienteDashboard").style.display = "block"
      document.getElementById("medicoDashboard").style.display = "none"
      await loadMedicos() // Cargar lista de médicos para el modal
    } else {
      document.getElementById("pacienteDashboard").style.display = "none"
      document.getElementById("medicoDashboard").style.display = "block"
    }
  } catch (error) {
    console.error("Error cargando dashboard:", error)
    showToast("Error cargando datos del dashboard", "error")
  } finally {
    showLoading(false)
  }
}

async function loadStatistics() {
  try {
    const response = await fetch(`${API_BASE_URL}/citas/estadisticas`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    const result = await response.json()

    if (result.success) {
      const stats = result.data

      if (currentUser.rol === "paciente") {
        document.getElementById("totalCitasPaciente").textContent = stats.total
        document.getElementById("citasPendientesPaciente").textContent = stats.pendientes
        document.getElementById("citasConfirmadasPaciente").textContent = stats.confirmadas
      } else {
        document.getElementById("totalCitasMedico").textContent = stats.total
        document.getElementById("citasPendientesMedico").textContent = stats.pendientes
        document.getElementById("citasHoyMedico").textContent = stats.hoy
      }
    }
  } catch (error) {
    console.error("Error cargando estadísticas:", error)
  }
}

async function loadAppointments() {
  try {
    const response = await fetch(`${API_BASE_URL}/citas/mis-citas`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    const result = await response.json()

    if (result.success) {
      const citas = result.data

      if (currentUser.rol === "paciente") {
        renderPacienteCitas(citas)
      } else {
        renderMedicoCitas(citas)
      }
    }
  } catch (error) {
    console.error("Error cargando citas:", error)
  }
}

function renderPacienteCitas(citas) {
  const container = document.getElementById("pacienteCitas")

  if (citas.length === 0) {
    container.innerHTML = '<p class="no-appointments">No tienes citas programadas</p>'
    return
  }

  container.innerHTML = citas
    .map(
      (cita) => `
        <div class="appointment-card">
            <div class="appointment-header">
                <div class="appointment-date">
                    <strong>${formatDate(cita.fecha)}</strong> a las <strong>${formatTime(cita.hora)}</strong>
                </div>
                <span class="appointment-status ${cita.estado}">${getStatusText(cita.estado)}</span>
            </div>
            <div class="appointment-details">
                <div class="doctor-info">
                    <strong>Dr. ${cita.medico_nombre}</strong>
                    <span class="specialty">${cita.especialidad || "Medicina General"}</span>
                </div>
                ${cita.motivo ? `<div class="appointment-reason"><strong>Motivo:</strong> ${cita.motivo}</div>` : ""}
                ${cita.medico_telefono ? `<div class="contact-info"><strong>Teléfono:</strong> ${cita.medico_telefono}</div>` : ""}
            </div>
            <div class="appointment-actions">
                ${
                  cita.estado === "pendiente"
                    ? `
                    <button class="btn btn-outline btn-sm" onclick="cancelAppointment(${cita.id})">
                        Cancelar Cita
                    </button>
                `
                    : ""
                }
            </div>
        </div>
    `,
    )
    .join("")
}

function renderMedicoCitas(citas) {
  const container = document.getElementById("medicoCitas")

  if (citas.length === 0) {
    container.innerHTML = '<p class="no-appointments">No tienes citas solicitadas</p>'
    return
  }

  container.innerHTML = citas
    .map(
      (cita) => `
        <div class="appointment-card">
            <div class="appointment-header">
                <div class="appointment-date">
                    <strong>${formatDate(cita.fecha)}</strong> a las <strong>${formatTime(cita.hora)}</strong>
                </div>
                <span class="appointment-status ${cita.estado}">${getStatusText(cita.estado)}</span>
            </div>
            <div class="appointment-details">
                <div class="patient-info">
                    <strong>${cita.paciente_nombre}</strong>
                    ${cita.paciente_telefono ? `<span class="contact">Tel: ${cita.paciente_telefono}</span>` : ""}
                </div>
                ${cita.motivo ? `<div class="appointment-reason"><strong>Motivo:</strong> ${cita.motivo}</div>` : ""}
            </div>
            <div class="appointment-actions">
                ${
                  cita.estado === "pendiente"
                    ? `
                    <button class="btn btn-primary btn-sm" onclick="updateAppointmentStatus(${cita.id}, 'confirmada')">
                        Confirmar
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="updateAppointmentStatus(${cita.id}, 'cancelada')">
                        Cancelar
                    </button>
                `
                    : ""
                }
                ${
                  cita.estado === "confirmada"
                    ? `
                    <button class="btn btn-primary btn-sm" onclick="updateAppointmentStatus(${cita.id}, 'completada')">
                        Marcar Completada
                    </button>
                `
                    : ""
                }
            </div>
        </div>
    `,
    )
    .join("")
}

// Funciones de citas
async function loadMedicos() {
  try {
    const response = await fetch(`${API_BASE_URL}/usuarios/medicos`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    const result = await response.json()

    if (result.success) {
      const select = document.getElementById("appointmentMedico")
      select.innerHTML =
        '<option value="">Seleccionar médico...</option>' +
        result.data
          .map(
            (medico) =>
              `<option value="${medico.id}">${medico.nombre} - ${medico.especialidad || "Medicina General"}</option>`,
          )
          .join("")
    }
  } catch (error) {
    console.error("Error cargando médicos:", error)
  }
}

function showNewAppointmentModal() {
  document.getElementById("newAppointmentModal").style.display = "flex"
}

function closeNewAppointmentModal() {
  document.getElementById("newAppointmentModal").style.display = "none"
  document.getElementById("newAppointmentForm").reset()
}

async function handleNewAppointment(event) {
  event.preventDefault()

  const formData = new FormData(event.target)
  const appointmentData = {
    medico_id: formData.get("medico_id"),
    fecha: formData.get("fecha"),
    hora: formData.get("hora"),
    motivo: formData.get("motivo"),
  }

  try {
    showLoading(true)

    const response = await fetch(`${API_BASE_URL}/citas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(appointmentData),
    })

    const result = await response.json()

    if (result.success) {
      showToast("Cita creada exitosamente", "success")
      closeNewAppointmentModal()
      loadDashboardData() // Recargar datos
    } else {
      showToast(result.message || "Error creando la cita", "error")
    }
  } catch (error) {
    console.error("Error creando cita:", error)
    showToast("Error de conexión", "error")
  } finally {
    showLoading(false)
  }
}

async function cancelAppointment(citaId) {
  if (!confirm("¿Estás seguro de que quieres cancelar esta cita?")) {
    return
  }

  try {
    showLoading(true)

    const response = await fetch(`${API_BASE_URL}/citas/${citaId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    const result = await response.json()

    if (result.success) {
      showToast("Cita cancelada exitosamente", "success")
      loadDashboardData() // Recargar datos
    } else {
      showToast(result.message || "Error cancelando la cita", "error")
    }
  } catch (error) {
    console.error("Error cancelando cita:", error)
    showToast("Error de conexión", "error")
  } finally {
    showLoading(false)
  }
}

async function updateAppointmentStatus(citaId, nuevoEstado) {
  try {
    showLoading(true)

    const response = await fetch(`${API_BASE_URL}/citas/${citaId}/estado`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ estado: nuevoEstado }),
    })

    const result = await response.json()

    if (result.success) {
      showToast(`Cita ${getStatusText(nuevoEstado).toLowerCase()} exitosamente`, "success")
      loadDashboardData() // Recargar datos
    } else {
      showToast(result.message || "Error actualizando la cita", "error")
    }
  } catch (error) {
    console.error("Error actualizando cita:", error)
    showToast("Error de conexión", "error")
  } finally {
    showLoading(false)
  }
}

// Funciones de utilidad
function toggleEspecialidad() {
  const rol = document.getElementById("registerRole").value
  const especialidadGroup = document.getElementById("especialidadGroup")

  if (rol === "medico") {
    especialidadGroup.style.display = "block"
    document.getElementById("registerEspecialidad").required = true
  } else {
    especialidadGroup.style.display = "none"
    document.getElementById("registerEspecialidad").required = false
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatTime(timeString) {
  const [hours, minutes] = timeString.split(":")
  return `${hours}:${minutes}`
}

function getStatusText(status) {
  const statusMap = {
    pendiente: "Pendiente",
    confirmada: "Confirmada",
    cancelada: "Cancelada",
    completada: "Completada",
  }
  return statusMap[status] || status
}

function showLoading(show) {
  elements.loadingSpinner.style.display = show ? "flex" : "none"
}

function showToast(message, type = "info") {
  const toast = document.createElement("div")
  toast.className = `toast ${type}`
  toast.innerHTML = `
        <div class="toast-content">
            <strong>${type === "success" ? "✓" : type === "error" ? "✗" : "ℹ"}</strong>
            <span>${message}</span>
        </div>
    `

  elements.toastContainer.appendChild(toast)

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast)
    }
  }, 5000)

  // Remove on click
  toast.addEventListener("click", () => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast)
    }
  })
}

// Cerrar modal al hacer clic fuera de él
window.addEventListener("click", (event) => {
  const modal = document.getElementById("newAppointmentModal")
  if (event.target === modal) {
    closeNewAppointmentModal()
  }
})


// --- Selectores del modal (usar los IDs reales del HTML de tu modal) ---
const medicoSelect = document.getElementById("appointmentMedico"); // <select name="medico_id">
const fechaInput   = document.getElementById("appointmentFecha");  // <input type="date" name="fecha">
const horaSelect   = document.getElementById("appointmentHora");   // <select name="hora">

async function cargarSlots() {
  const medicoId = medicoSelect?.value;
  const fechaISO = fechaInput?.value; // YYYY-MM-DD

  if (!medicoId || !fechaISO) return;

  // Limpiar opciones
  horaSelect.innerHTML = '<option value="">Cargando...</option>';
  horaSelect.disabled = true;

  try {
    const resp = await fetch(`${API_BASE_URL}/disponibilidad/${medicoId}/slots?fecha=${fechaISO}`, {
      headers: { Authorization: `Bearer ${authToken}` } // <- IMPORTANTE
    });
    const result = await resp.json();
    horaSelect.innerHTML = ''; // limpiar

    // Nuestro backend retorna { success: true, data: ["08:00","08:30",...] }
    const slots = Array.isArray(result.data) ? result.data : [];

    if (slots.length) {
      slots.forEach(hhmm => {
        const opt = document.createElement('option');
        opt.value = `${hhmm}:00`;   // el backend de /citas espera TIME completo 'HH:MM:00'
        opt.textContent = hhmm;     // lo visible
        horaSelect.appendChild(opt);
      });
      horaSelect.disabled = false;
    } else {
      horaSelect.innerHTML = '<option value="">Sin cupos</option>';
      horaSelect.disabled = true;
    }
  } catch (e) {
    console.error(e);
    horaSelect.innerHTML = '<option value="">Error</option>';
    horaSelect.disabled = true;
  }
}

// Disparar cuando cambie médico o fecha (si existen en DOM)
medicoSelect?.addEventListener('change', cargarSlots);
fechaInput?.addEventListener('change', cargarSlots);

// Si el modal se abre con valores cargados, llama a cargarSlots() al abrir el modal:
function showNewAppointmentModal() {
  document.getElementById("newAppointmentModal").style.display = "flex";
  // si ya hay médico/fecha seleccionados, precarga:
  cargarSlots();
}
