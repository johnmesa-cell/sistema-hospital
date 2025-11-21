// Configuración y constantes
const API_BASE_URL = '/api';
const token = localStorage.getItem('authToken');

// Elementos del DOM
const fechaInput = document.getElementById('fecha');
const inicioInput = document.getElementById('inicio');
const finInput = document.getElementById('fin');
const intervalSel = document.getElementById('intervalo');
const btnAgregar = document.getElementById('agregar');
const tbody = document.getElementById('listaDisponibilidad');
const loadingSpinner = document.getElementById('loadingSpinner');
const toastContainer = document.getElementById('toastContainer');

// Verificación inicial de autenticación
if (!token) {
    showToast('Por favor inicia sesión.', 'error');
    setTimeout(() => {
        window.location.href = '/';
    }, 2000);
}

// Funciones de utilidad
function showLoading() {
    loadingSpinner.style.display = 'flex';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Mostrar toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Ocultar y remover toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    return timeString.slice(0, 5); // HH:MM
}

// Verificación de sesión y autorización
async function verifyAndGuard() {
    if (!token) {
        showToast('Por favor inicia sesión.', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        return false;
    }

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const result = await response.json();

        if (!result.success) {
            showToast('Sesión inválida. Vuelve a iniciar sesión.', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return false;
        }

        const user = result.data.user;
        
        // Mostrar información del usuario
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        
        userName.textContent = `Dr(a). ${user.nombre}`;
        userRole.textContent = user.rol.toUpperCase();
        userInfo.style.display = 'flex';

        // Verificar que sea médico
        if (user.rol !== 'medico') {
            showToast('Esta página es solo para médicos.', 'error');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error verificando sesión:', error);
        showToast('No se pudo verificar la sesión. Intenta de nuevo.', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        return false;
    } finally {
        hideLoading();
    }
}

// Cargar lista de disponibilidad
async function cargarDisponibilidad() {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}/disponibilidad/mia`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const data = result.data || [];

        tbody.innerHTML = '';

        if (data.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <div>No hay tramos de disponibilidad configurados</div>
                    <small>Agrega tu primer tramo usando el formulario de arriba</small>
                </td>
            `;
            tbody.appendChild(tr);
            return;
        }

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(row.fecha)}</td>
                <td>${formatTime(row.hora_inicio)}</td>
                <td>${formatTime(row.hora_fin)}</td>
                <td>${row.intervalo_minutos} minutos</td>
                <td>
                    <button 
                        data-id="${row.id}" 
                        class="btn-delete"
                        title="Eliminar tramo"
                        onclick="eliminarTramo(${row.id})"
                    >
                        Eliminar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Error cargando disponibilidad:', error);
        showToast('Error cargando disponibilidad', 'error');
    } finally {
        hideLoading();
    }
}

// Crear nuevo tramo de disponibilidad
async function crearTramo() {
    try {
        const fecha = fechaInput.value;
        const horaInicio = inicioInput.value;
        const horaFin = finInput.value;
        const intervalo = Number(intervalSel.value);

        // Validaciones
        if (!fecha || !horaInicio || !horaFin || !intervalo) {
            showToast('Todos los campos son requeridos', 'error');
            return;
        }

        if (horaInicio >= horaFin) {
            showToast('La hora de fin debe ser posterior a la hora de inicio', 'error');
            return;
        }

        // Calcular diferencia en minutos
        const inicio = new Date(`2000-01-01T${horaInicio}`);
        const fin = new Date(`2000-01-01T${horaFin}`);
        const diferenciaMinutos = (fin - inicio) / (1000 * 60);

        if (diferenciaMinutos < intervalo) {
            showToast('El intervalo no puede ser mayor que la duración del tramo', 'error');
            return;
        }

        showLoading();

        const body = {
            fecha,
            hora_inicio: horaInicio,
            hora_fin: horaFin,
            intervalo_minutos: intervalo
        };

        const response = await fetch(`${API_BASE_URL}/disponibilidad`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Error creando tramo');
        }

        showToast('Tramo de disponibilidad agregado exitosamente', 'success');
        
        // Limpiar formulario
        fechaInput.value = '';
        inicioInput.value = '08:00';
        finInput.value = '12:00';
        intervalSel.value = '30';

        // Recargar lista
        cargarDisponibilidad();

    } catch (error) {
        console.error('Error creando tramo:', error);
        showToast(error.message || 'Error creando tramo de disponibilidad', 'error');
    } finally {
        hideLoading();
    }
}

// Eliminar tramo de disponibilidad
async function eliminarTramo(id) {
    if (!confirm('¿Está seguro de que desea eliminar este tramo de disponibilidad?')) {
        return;
    }

    try {
        showLoading();

        const response = await fetch(`${API_BASE_URL}/disponibilidad/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Error eliminando tramo');
        }

        showToast('Tramo eliminado exitosamente', 'success');
        cargarDisponibilidad();

    } catch (error) {
        console.error('Error eliminando tramo:', error);
        showToast(error.message || 'Error eliminando tramo', 'error');
    } finally {
        hideLoading();
    }
}

// Event listeners
if (btnAgregar) {
    btnAgregar.addEventListener('click', crearTramo);
}

// Validación en tiempo real de horarios
if (inicioInput && finInput) {
    inicioInput.addEventListener('change', validarHorarios);
    finInput.addEventListener('change', validarHorarios);
}

function validarHorarios() {
    const inicio = inicioInput.value;
    const fin = finInput.value;

    if (inicio && fin && inicio >= fin) {
        finInput.setCustomValidity('La hora de fin debe ser posterior a la hora de inicio');
        showToast('La hora de fin debe ser posterior a la hora de inicio', 'error');
    } else {
        finInput.setCustomValidity('');
    }
}

// Inicializar Flatpickr para el selector de fechas
if (fechaInput) {
    flatpickr(fechaInput, {
        dateFormat: 'Y-m-d',
        minDate: 'today',
        locale: {
            firstDayOfWeek: 1,
            weekdays: {
                shorthand: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
                longhand: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
            },
            months: {
                shorthand: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dec'],
                longhand: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
            }
        },
        onChange: function(selectedDates, dateStr, instance) {
            // Validar que no sea fin de semana (opcional)
            // const fecha = new Date(dateStr);
            // const diaSemana = fecha.getDay();
            // if (diaSemana === 0 || diaSemana === 6) {
            //     showToast('Se recomienda no programar disponibilidad en fines de semana', 'warning');
            // }
        }
    });
}

// Inicialización de la página
async function init() {
    const isAuthorized = await verifyAndGuard();
    if (isAuthorized) {
        cargarDisponibilidad();
    }
}

// Iniciar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', init);