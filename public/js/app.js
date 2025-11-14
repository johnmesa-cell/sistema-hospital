// Sistema de Gestión de Citas Médicas - Frontend JavaScript
// Configuración global
// Sistema de Gestión de Citas Médicas - Frontend JavaScript

// URL base para las peticiones API
const API_BASE_URL = "/api";

// Variables para usuario autenticado y token
let currentUser = null;
let authToken = null;

// Elementos del DOM que se manipulan a lo largo de la app
const elements = {
  landingPage: document.getElementById("landingPage"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  dashboard: document.getElementById("dashboard"),
  mainNav: document.getElementById("mainNav"),
  loadingSpinner: document.getElementById("loadingSpinner"),
  toastContainer: document.getElementById("toastContainer"),
  dashboardTitle: document.getElementById("dashboardTitle"),
  btnLogout: document.getElementById("btnLogout"),
  adminPanel: document.getElementById("adminPanel"),
  medicoPanel: document.getElementById("medicoPanel"),
  pacientePanel: document.getElementById("pacientePanel"),
  appointmentsList: document.getElementById("appointmentsList"),
  statsTotalPacientes: document.getElementById("statsTotalPacientes"),
  statsCitasPendientes: document.getElementById("statsCitasPendientes"),
  statsDoctores: document.getElementById("statsDoctores"),
  toastMessage: document.getElementById("toastMessage"),
};

// Cuando carga la página, se inicializa la app y se añaden event listeners
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  setupEventListeners();
});

// Inicializa la app verificando token guardado y cargando datos del dashboard si usuario autenticado
async function initializeApp() {
  authToken = localStorage.getItem("authToken");
  if (authToken) {
    try {
      await verifyToken(); // Verifica que el token sea válido y obtiene usuario
    } catch {
      localStorage.removeItem("authToken");
      authToken = null;
      showLanding(); // Mostrar pantalla de inicio si token inválido
      return;
    }
    updateUserInterface(); // Configura UI según usuario
    loadDashboardData(); // Carga datos importantes del dashboard
  } else {
    showLanding(); // Si no hay token, mostrar pantalla de inicio
  }
}

// Establece los event listeners para formularios y botones logout
function setupEventListeners() {
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.registerForm.addEventListener("submit", handleRegister);
  elements.btnLogout.addEventListener("click", logout);
}

// Procesa el login: envía datos, recibe token y configura UI/alamacena token
async function handleLogin(event) {
  event.preventDefault();
  const email = elements.loginForm.email.value.trim();
  const password = elements.loginForm.password.value.trim();
  try {
    showLoading(true); // Mostrar spinner mientras carga
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      authToken = data.token;
      localStorage.setItem("authToken", authToken);
      currentUser = data.user;
      updateUserInterface();
      loadDashboardData();
      showToast("Login exitoso");
    } else {
      showToast(data.message || "Error en login");
    }
  } catch (error) {
    showToast("Error de conexión");
  } finally {
    showLoading(false);
  }
}

// Procesa registro de nuevo usuario
async function handleRegister(event) {
  event.preventDefault();
  const nombre = elements.registerForm.nombre.value.trim();
  const email = elements.registerForm.email.value.trim();
  const password = elements.registerForm.password.value.trim();
  const rol = elements.registerForm.rol.value;
  try {
    showLoading(true);
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password, rol }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Registro exitoso, por favor inicia sesión");
      showLogin();
    } else {
      showToast(data.message || "Error en registro");
    }
  } catch (error) {
    showToast("Error de conexión");
  } finally {
    showLoading(false);
  }
}

// Verifica validez del token y recupera info del usuario
async function verifyToken() {
  const res = await fetch(`${API_BASE_URL}/auth/verify`, {
    headers: { Authorization: "Bearer " + authToken },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error("Token inválido");
  }
  currentUser = data.user;
}

// Cierra sesión: elimina token y datos, pone UI en estado inicial
function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("authToken");
  updateUserInterface();
  showLanding();
  showToast("Sesión cerrada");
}

// Actualiza la UI según si el usuario está autenticado y su rol
function updateUserInterface() {
  if (currentUser) {
    elements.mainNav.style.display = "block";
    elements.btnLogout.style.display = "inline";
    elements.dashboardTitle.textContent = `Bienvenido ${currentUser.nombre} (${currentUser.rol})`;
    showDashboardPanel(currentUser.rol);
  } else {
    elements.mainNav.style.display = "none";
    elements.btnLogout.style.display = "none";
    hideAllSections();
    showLanding();
  }
}

// Muestra el panel apropiado según rol
function showDashboardPanel(role) {
  elements.adminPanel.style.display = role === "admin" ? "block" : "none";
  elements.medicoPanel.style.display = role === "medico" ? "block" : "none";
  elements.pacientePanel.style.display = role === "paciente" ? "block" : "none";
  elements.dashboard.style.display = "block";
  elements.landingPage.style.display = "none";
  elements.loginForm.style.display = "none";
  elements.registerForm.style.display = "none";
}

// Oculta todas las secciones visibles
function hideAllSections() {
  elements.landingPage.style.display = "none";
  elements.loginForm.style.display = "none";
  elements.registerForm.style.display = "none";
  elements.dashboard.style.display = "none";
}

// Muestra pantalla de inicio
function showLanding() {
  hideAllSections();
  elements.landingPage.style.display = "block";
}

// Muestra formulario login
function showLogin() {
  hideAllSections();
  elements.loginForm.style.display = "block";
}

// Muestra formulario registro
function showRegister() {
  hideAllSections();
  elements.registerForm.style.display = "block";
}

// Carga datos del dashboard: estadísticas y citas
async function loadDashboardData() {
  showLoading(true);
  try {
    await Promise.all([loadStatistics(), loadAppointments()]);
  } catch {
    showToast("Error cargando datos del dashboard");
  } finally {
    showLoading(false);
  }
}

// Carga estadísticas y actualiza UI correspondiente
async function loadStatistics() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API_BASE_URL}/citas/estadisticas`, {
      headers: { Authorization: "Bearer " + authToken },
    });
    const data = await res.json();
    if (res.ok) {
      elements.statsTotalPacientes.textContent = data.data.totalPacientes || data.data.total || 0;
      elements.statsCitasPendientes.textContent = data.data.citasPendientes || data.data.pendientes || 0;
      elements.statsDoctores.textContent = data.data.doctores || 0;
    }
  } catch {
    // No interrumpir carga por error de estadísticas
  }
}

// Carga citas para usuario actual y actualiza la lista en UI
async function loadAppointments() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API_BASE_URL}/citas/mis-citas`, {
      headers: { Authorization: "Bearer " + authToken },
    });
    const data = await res.json();
    if (res.ok) {
      elements.appointmentsList.innerHTML = data.data.length
        ? data.data.map(appointmentToHtml).join("")
        : "<li>No hay citas para mostrar</li>";
    }
  } catch {
    elements.appointmentsList.innerHTML = "<li>Error cargando citas</li>";
  }
}

// Helper para renderizar cita en HTML para mostrar en lista
function appointmentToHtml(appointment) {
  return `<li>
    <strong>Fecha:</strong> ${appointment.fecha} ${appointment.hora} <br>
    <strong>Motivo:</strong> ${appointment.motivo || "No especificado"} <br>
    <strong>Estado:</strong> ${appointment.estado}
  </li>`;
}

// Muestra u oculta el spinner de carga
function showLoading(show) {
  elements.loadingSpinner.style.display = show ? "block" : "none";
}

// Muestra un mensaje toast temporal
function showToast(message) {
  elements.toastMessage.textContent = message;
  elements.toastContainer.style.display = "block";
  setTimeout(() => {
    elements.toastContainer.style.display = "none";
  }, 3000);
}
