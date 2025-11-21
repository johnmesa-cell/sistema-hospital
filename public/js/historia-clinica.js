// Historia Clínica JavaScript
let currentCita = null;
let currentHistoriaClinica = null;
let medicamentoCount = 0;

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    if (!verificarAutenticacion()) {
        return;
    }

    // Obtener ID de la cita de los parámetros URL
    const urlParams = new URLSearchParams(window.location.search);
    const citaId = urlParams.get('cita');
    
    if (citaId) {
        cargarCita(citaId);
    } else {
        showAlert('No se especificó una cita válida', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }

    // Configurar eventos con verificación
    const form = document.getElementById('formHistoriaClinica');
    if (form) {
        form.addEventListener('submit', guardarHistoriaClinica);
        console.log('Event listener del formulario configurado');
    } else {
        console.error('Formulario formHistoriaClinica no encontrado');
    }
    
    // Agregar event listeners para botones si existen
    setupButtonListeners();
});

// Verificar autenticación
function verificarAutenticacion() {
    console.log('Verificando autenticación...');
    const token = localStorage.getItem('authToken');
    console.log('Token encontrado:', token ? 'Sí' : 'No');
    
    if (!token) {
        console.error('No hay token de autenticación');
        showAlert('Acceso no autorizado. Debe iniciar sesión.', 'danger');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return false;
    }
    
    // Obtener información del usuario desde sessionStorage
    let user = null;
    const userInfo = sessionStorage.getItem('userInfo');
    console.log('UserInfo en sessionStorage:', userInfo);
    if (userInfo) {
        user = JSON.parse(userInfo);
        console.log('Usuario parseado desde userInfo:', user);
    }
    
    // Si no hay información en sessionStorage, intentar desde localStorage (para compatibilidad)
    if (!user) {
        console.log('No hay userInfo, intentando desde localStorage...');
        const storedUser = localStorage.getItem('user');
        console.log('User en localStorage:', storedUser);
        if (storedUser) {
            user = JSON.parse(storedUser);
            console.log('Usuario parseado desde localStorage:', user);
        }
    }
    
    if (!user || (user.rol !== 'medico' && user.tipo !== 'medico')) {
        console.error('Usuario no válido o no es médico:', user);
        showAlert('Acceso no autorizado. Esta página es solo para médicos.', 'danger');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return false;
    }
    
    console.log('Usuario autorizado:', user);
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement) {
        userInfoElement.textContent = `Dr. ${user.nombre} (${user.tipo || user.rol})`;
    }
    return true;
}

// Configurar listeners para botones
function setupButtonListeners() {
    // Hacer las funciones globales para que puedan ser llamadas desde HTML
    window.mostrarFormularioReceta = mostrarFormularioReceta;
    window.agregarMedicamento = agregarMedicamento;
    window.eliminarMedicamento = eliminarMedicamento;
    window.guardarReceta = guardarReceta;
    window.verReceta = verReceta;
    window.editarHistoriaClinica = editarHistoriaClinica;
    window.logout = logout;
    window.volverAlDashboard = volverAlDashboard;
    
    console.log('Funciones globales configuradas');
}

// Función para inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando página');
    
    // Configurar funciones globales
    setupButtonListeners();
    
    // Verificar autenticación
    verificarAutenticacion();
    
    // La información del usuario se configura en verificarAutenticacion()
    console.log('Autenticación verificada correctamente');
    
    // Obtener información de la cita
    const citaInfo = sessionStorage.getItem('citaInfo');
    if (citaInfo) {
        const cita = JSON.parse(citaInfo);
        console.log('Información de cita encontrada:', cita);
        currentCita = cita;
        mostrarInformacionCita(cita);
        cargarHistorialPaciente(cita.paciente_id);
    } else {
        console.log('No hay información de cita en sessionStorage');
    }
    
    // Configurar formulario de historia clínica
    configurarFormularioHistoriaClinica();
    
    // Debug: Verificar elementos críticos
    console.log('=== DEBUGGING ELEMENTOS ===');
    console.log('citaInfo:', document.getElementById('citaInfo'));
    console.log('historiaClinicaForm:', document.getElementById('historiaClinicaForm'));
    console.log('userInfo:', document.getElementById('userInfo'));
    console.log('motivo_consulta:', document.getElementById('motivo_consulta'));
    console.log('Total textareas:', document.querySelectorAll('textarea').length);
    console.log('Total inputs:', document.querySelectorAll('input').length);
    console.log('=== FIN DEBUG ===');
});

// Configurar el formulario de historia clínica
function configurarFormularioHistoriaClinica() {
    const formHistoriaClinica = document.getElementById('formHistoriaClinica');
    if (formHistoriaClinica) {
        formHistoriaClinica.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Formulario de historia clínica enviado');
            guardarHistoriaClinica();
        });
        console.log('Event listener del formulario de historia clínica configurado');
    } else {
        console.error('Formulario de historia clínica no encontrado');
    }
}

// Cargar información de la cita
async function cargarCita(citaId) {
    try {
        const response = await fetch(`/api/citas/${citaId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentCita = data.data;
            mostrarInformacionCita(currentCita);
            
            if (currentCita.tiene_historia_clinica) {
                cargarHistoriaClinicaExistente(currentCita.historia_clinica_id);
            } else {
                mostrarFormularioHistoriaClinica();
            }
            
            // Cargar historial médico del paciente
            cargarHistorialPaciente(currentCita.paciente_id);
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        console.error('Error cargando cita:', error);
        showAlert('Error al cargar la información de la cita', 'danger');
    }
}

// Mostrar información de la cita
function mostrarInformacionCita(cita) {
    const citaDetails = document.getElementById('citaDetails');
    const citaInfo = document.getElementById('citaInfo');
    
    if (!citaDetails) {
        console.error('Elemento citaDetails no encontrado');
        return;
    }
    
    const fechaCita = new Date(cita.fecha).toLocaleDateString('es-ES');
    
    citaDetails.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <strong><i class="bi bi-person"></i> Paciente:</strong> ${cita.paciente_nombre}<br>
                <strong><i class="bi bi-telephone"></i> Teléfono:</strong> ${cita.paciente_telefono || 'No registrado'}<br>
                <strong><i class="bi bi-calendar3"></i> Fecha:</strong> ${fechaCita}<br>
            </div>
            <div class="col-md-6">
                <strong><i class="bi bi-clock"></i> Hora:</strong> ${cita.hora}<br>
                <strong><i class="bi bi-chat-text"></i> Motivo:</strong> ${cita.motivo || 'No especificado'}<br>
                <strong><i class="bi bi-info-circle"></i> Estado:</strong> 
                <span class="badge ${getEstadoBadgeClass(cita.estado)}">${cita.estado.toUpperCase()}</span>
            </div>
        </div>
    `;
    
    if (citaInfo) citaInfo.style.display = 'block';
    
    // Verificar si ya existe una historia clínica para esta cita
    verificarHistoriaClinicaExistente(cita.id);
}

// Verificar si existe historia clínica para la cita
async function verificarHistoriaClinicaExistente(citaId) {
    try {
        console.log('Verificando historia clínica para cita ID:', citaId);
        const response = await fetch(`/api/historia-clinica/cita/${citaId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Historia clínica encontrada:', result.data);
            currentHistoriaClinica = result.data;
            mostrarHistoriaClinicaExistente(result.data);
        } else if (response.status === 404) {
            console.log('No existe historia clínica, mostrando formulario');
            currentHistoriaClinica = null;
            mostrarFormularioHistoriaClinica();
        } else {
            console.error('Error verificando historia clínica:', response.statusText);
            currentHistoriaClinica = null;
            mostrarFormularioHistoriaClinica(); // Mostrar formulario por defecto
        }
    } catch (error) {
        console.error('Error verificando historia clínica:', error);
        currentHistoriaClinica = null;
        mostrarFormularioHistoriaClinica(); // Mostrar formulario por defecto
    }
}

// Mostrar formulario de nueva historia clínica
function mostrarFormularioHistoriaClinica() {
    console.log('Mostrando formulario de historia clínica');
    
    const pacienteIdInput = document.getElementById('paciente_id');
    const citaIdInput = document.getElementById('cita_id');
    const motivoInput = document.getElementById('motivo_consulta');
    const formContainer = document.getElementById('historiaClinicaForm');
    const viewContainer = document.getElementById('verHistoriaClinica');
    
    // Verificar que currentCita esté disponible
    if (!currentCita) {
        console.error('currentCita no está definida');
        showAlert('Error: No hay información de la cita disponible', 'danger');
        return;
    }
    
    console.log('Configurando campos del formulario con cita:', currentCita);
    
    if (pacienteIdInput) {
        pacienteIdInput.value = currentCita.paciente_id;
        console.log('paciente_id configurado:', currentCita.paciente_id);
    }
    
    if (citaIdInput) {
        citaIdInput.value = currentCita.id;
        console.log('cita_id configurado:', currentCita.id);
    }
    
    // Pre-llenar el motivo de consulta si está disponible
    if (currentCita.motivo && motivoInput) {
        motivoInput.value = currentCita.motivo;
        console.log('Motivo prellenado:', currentCita.motivo);
    }
    
    // Mostrar el formulario
    if (formContainer) {
        formContainer.style.display = 'block';
        console.log('Formulario mostrado');
    } else {
        console.error('Contenedor del formulario no encontrado');
    }
    
    // Ocultar vista de historia clínica existente
    if (viewContainer) {
        viewContainer.style.display = 'none';
    }
    
    // Forzar re-renderizado de los elementos de formulario
    setTimeout(() => {
        const textareas = document.querySelectorAll('#historiaClinicaForm textarea');
        const inputs = document.querySelectorAll('#historiaClinicaForm input');
        
        console.log('Textareas encontrados:', textareas.length);
        console.log('Inputs encontrados:', inputs.length);
        
        // Forzar estilos para asegurar visibilidad
        textareas.forEach(textarea => {
            textarea.style.display = 'block';
            textarea.style.width = '100%';
            textarea.style.minHeight = '80px';
        });
        
        inputs.forEach(input => {
            if (input.type !== 'hidden') {
                input.style.display = 'block';
                input.style.width = '100%';
            }
        });
    }, 100);
}

// Cargar historia clínica existente
async function cargarHistoriaClinicaExistente(historiaId) {
    try {
        const response = await fetch(`/api/historia-clinica/${historiaId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentHistoriaClinica = data.data;
            mostrarHistoriaClinicaExistente(currentHistoriaClinica);
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        console.error('Error cargando historia clínica:', error);
        showAlert('Error al cargar la historia clínica', 'danger');
    }
}

// Mostrar historia clínica existente
function mostrarHistoriaClinicaExistente(historia) {
    const content = document.getElementById('historiaClinicaContent');
    const fechaConsulta = new Date(historia.fecha_consulta).toLocaleDateString('es-ES');
    
    content.innerHTML = `
        <div class="row">
            <div class="col-md-12 mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="text-success"><i class="bi bi-check-circle"></i> Historia clínica completada el ${fechaConsulta}</h6>
                    <div>
                        ${currentCita.tiene_receta 
                            ? `<button class="btn btn-info btn-sm me-2" onclick="verReceta(${currentCita.receta_id})">
                                 <i class="bi bi-prescription"></i> Ver Receta
                               </button>`
                            : `<button class="btn btn-outline-info btn-sm me-2" onclick="mostrarFormularioReceta()">
                                 <i class="bi bi-prescription"></i> Crear Receta
                               </button>`
                        }
                        <button class="btn btn-outline-secondary btn-sm" onclick="editarHistoriaClinica()">
                            <i class="bi bi-pencil"></i> Editar
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row historia-resumen-texto">
            <div class="col-md-6">
                <h6 class="text-primary"><i class="bi bi-clipboard-pulse"></i> Datos de la Consulta</h6>
                <p><strong>Motivo:</strong> ${historia.motivo_consulta}</p>
                <p><strong>Síntomas:</strong> ${historia.sintomas || 'No registrados'}</p>
                <p><strong>Examen Físico:</strong> ${historia.examen_fisico || 'No registrado'}</p>
                <p><strong>Diagnóstico:</strong> ${historia.diagnostico}</p>
            </div>
            
            <div class="col-md-6">
                <h6 class="text-primary"><i class="bi bi-heart-pulse"></i> Signos Vitales</h6>
                <p><strong>Presión Arterial:</strong> ${historia.presion_arterial || 'No registrada'}</p>
                <p><strong>Frecuencia Cardíaca:</strong> ${historia.frecuencia_cardiaca || 'No registrada'}</p>
                <p><strong>Temperatura:</strong> ${historia.temperatura || 'No registrada'}</p>
                <p><strong>Peso:</strong> ${historia.peso ? historia.peso + ' kg' : 'No registrado'}</p>
                <p><strong>Altura:</strong> ${historia.altura ? historia.altura + ' cm' : 'No registrada'}</p>
            </div>
        </div>
        
        <div class="row historia-resumen-texto">
            <div class="col-md-12">
                <h6 class="text-primary"><i class="bi bi-prescription2"></i> Tratamiento y Recomendaciones</h6>
                <p><strong>Tratamiento:</strong> ${historia.tratamiento || 'No especificado'}</p>
                <p><strong>Recomendaciones:</strong> ${historia.recomendaciones || 'No especificadas'}</p>
                <p><strong>Observaciones:</strong> ${historia.observaciones || 'No registradas'}</p>
            </div>
        </div>
    `;
    
    document.getElementById('verHistoriaClinica').style.display = 'block';
    document.getElementById('historiaClinicaForm').style.display = 'none';
}

// Cargar historial médico del paciente
async function cargarHistorialPaciente(pacienteId) {
    try {
        const response = await fetch(`/api/historia-clinica/paciente/${pacienteId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            mostrarHistorialPaciente(data.data);
        }
    } catch (error) {
        console.error('Error cargando historial del paciente:', error);
    }
}

// Mostrar historial médico del paciente
function mostrarHistorialPaciente(historial) {
    const content = document.getElementById('historialContent');
    
    if (historial.length === 0) {
        content.innerHTML = '<p class="text-muted">No hay registros médicos anteriores para este paciente.</p>';
    } else {
        let historialHtml = '';
        
        historial.forEach(registro => {
            const fechaConsulta = new Date(registro.fecha_consulta).toLocaleDateString('es-ES');
            const fechaCita = new Date(registro.fecha_cita).toLocaleDateString('es-ES');
            
            historialHtml += `
                <div class="card mb-2">
                    <div class="card-header py-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <strong>${fechaConsulta} - Dr. ${registro.medico_nombre} (${registro.especialidad})</strong>
                            <small class="text-muted">${fechaCita}</small>
                        </div>
                    </div>
                    <div class="card-body py-2 historia-resumen-texto">
                        <p class="mb-1"><strong>Diagnóstico:</strong> ${registro.diagnostico}</p>
                        <p class="mb-1"><strong>Tratamiento:</strong> ${registro.tratamiento}</p>
                        ${registro.tratamiento ? `<p class="mb-0"><strong>Motivo:</strong> ${registro.motivo_consulta}</p>` : ''}
                    </div>
                </div>
            `;
        });
        
        content.innerHTML = historialHtml;
    }
    
    document.getElementById('historialPaciente').style.display = 'block';
}

// Guardar historia clínica
async function guardarHistoriaClinica(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const historiaData = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/api/historia-clinica', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(historiaData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Historia clínica guardada exitosamente', 'success');
            currentHistoriaClinica = data.data;
            currentCita.tiene_historia_clinica = 1;
            currentCita.historia_clinica_id = data.data.id;
            mostrarHistoriaClinicaExistente(data.data);
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        console.error('Error guardando historia clínica:', error);
        showAlert('Error al guardar la historia clínica', 'danger');
    }
}

// Mostrar formulario de receta médica
function mostrarFormularioReceta() {
    console.log('mostrarFormularioReceta llamada');
    console.log('currentHistoriaClinica:', currentHistoriaClinica);
    
    if (!currentHistoriaClinica) {
        showAlert('Debe crear primero la historia clínica antes de generar una receta', 'warning');
        return;
    }
    
    // Verificar que los elementos existan
    const recetaPacienteId = document.getElementById('receta_paciente_id');
    const recetaCitaId = document.getElementById('receta_cita_id');
    const recetaHistoriaId = document.getElementById('receta_historia_clinica_id');
    const recetaDiagnostico = document.getElementById('receta_diagnostico');
    const medicamentosContainer = document.getElementById('medicamentosContainer');
    const modalReceta = document.getElementById('modalReceta');
    
    if (!recetaPacienteId || !recetaCitaId || !recetaHistoriaId || !recetaDiagnostico || !medicamentosContainer || !modalReceta) {
        console.error('Elementos del modal de receta no encontrados');
        showAlert('Error al cargar el formulario de receta', 'danger');
        return;
    }
    
    recetaPacienteId.value = currentCita.paciente_id;
    recetaCitaId.value = currentCita.id;
    recetaHistoriaId.value = currentHistoriaClinica.id;
    recetaDiagnostico.value = currentHistoriaClinica.diagnostico;
    
    // Limpiar medicamentos anteriores
    medicamentosContainer.innerHTML = '';
    medicamentoCount = 0;
    
    // Agregar el primer medicamento
    agregarMedicamento();
    
    const modal = new bootstrap.Modal(modalReceta);
    modal.show();
}

// Agregar medicamento al formulario
function agregarMedicamento() {
    medicamentoCount++;
    const container = document.getElementById('medicamentosContainer');
    
    const medicamentoHtml = `
        <div class="card mb-3" id="medicamento_${medicamentoCount}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Medicamento ${medicamentoCount}</h6>
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="eliminarMedicamento(${medicamentoCount})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Medicamento *</label>
                        <input type="text" class="form-control" name="medicamentos[${medicamentoCount}][medicamento]" required>
                    </div>
                    <div class="col-md-3 mb-3">
                        <label class="form-label">Concentración</label>
                        <input type="text" class="form-control" name="medicamentos[${medicamentoCount}][concentracion]" placeholder="500mg">
                    </div>
                    <div class="col-md-3 mb-3">
                        <label class="form-label">Forma Farmacéutica</label>
                        <select class="form-control" name="medicamentos[${medicamentoCount}][forma_farmaceutica]">
                            <option value="">Seleccionar</option>
                            <option value="tabletas">Tabletas</option>
                            <option value="cápsulas">Cápsulas</option>
                            <option value="jarabe">Jarabe</option>
                            <option value="gotas">Gotas</option>
                            <option value="crema">Crema</option>
                            <option value="pomada">Pomada</option>
                            <option value="inyectable">Inyectable</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Dosis *</label>
                        <input type="text" class="form-control" name="medicamentos[${medicamentoCount}][dosis]" placeholder="1 tableta" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Frecuencia *</label>
                        <input type="text" class="form-control" name="medicamentos[${medicamentoCount}][frecuencia]" placeholder="cada 8 horas" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Duración *</label>
                        <input type="text" class="form-control" name="medicamentos[${medicamentoCount}][duracion]" placeholder="por 7 días" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Cantidad Total</label>
                        <input type="text" class="form-control" name="medicamentos[${medicamentoCount}][cantidad_total]" placeholder="21 tabletas">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Vía de Administración</label>
                        <select class="form-control" name="medicamentos[${medicamentoCount}][via_administracion]">
                            <option value="">Seleccionar</option>
                            <option value="oral">Oral</option>
                            <option value="tópica">Tópica</option>
                            <option value="intramuscular">Intramuscular</option>
                            <option value="intravenosa">Intravenosa</option>
                            <option value="subcutánea">Subcutánea</option>
                        </select>
                    </div>
                    <div class="col-md-12 mb-3">
                        <label class="form-label">Instrucciones Especiales</label>
                        <textarea class="form-control" name="medicamentos[${medicamentoCount}][instrucciones_especiales]" rows="2"></textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', medicamentoHtml);
}

// Eliminar medicamento
function eliminarMedicamento(id) {
    const medicamento = document.getElementById(`medicamento_${id}`);
    if (medicamento) {
        medicamento.remove();
    }
}

// Guardar receta médica
async function guardarReceta() {
    const form = document.getElementById('formReceta');
    const formData = new FormData(form);
    
    const recetaData = {
        paciente_id: formData.get('paciente_id'),
        cita_id: formData.get('cita_id'),
        historia_clinica_id: formData.get('historia_clinica_id'),
        diagnostico: formData.get('diagnostico'),
        indicaciones_generales: formData.get('indicaciones_generales'),
        medicamentos: []
    };
    
    // Procesar medicamentos
    const medicamentosInputs = form.querySelectorAll('[name^="medicamentos"]');
    const medicamentosData = {};
    
    medicamentosInputs.forEach(input => {
        const match = input.name.match(/medicamentos\[(\d+)\]\[([^\]]+)\]/);
        if (match) {
            const index = match[1];
            const field = match[2];
            
            if (!medicamentosData[index]) {
                medicamentosData[index] = {};
            }
            
            medicamentosData[index][field] = input.value;
        }
    });
    
    // Convertir a array y filtrar medicamentos válidos
    recetaData.medicamentos = Object.values(medicamentosData).filter(med => 
        med.medicamento && med.dosis && med.frecuencia && med.duracion
    );
    
    if (recetaData.medicamentos.length === 0) {
        showAlert('Debe agregar al menos un medicamento válido', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/recetas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(recetaData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Receta médica creada exitosamente', 'success');
            currentCita.tiene_receta = 1;
            currentCita.receta_id = data.data.receta.id;
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalReceta'));
            modal.hide();
            
            // Actualizar la vista de historia clínica
            if (currentHistoriaClinica) {
                mostrarHistoriaClinicaExistente(currentHistoriaClinica);
            }
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        console.error('Error guardando receta:', error);
        showAlert('Error al guardar la receta médica', 'danger');
    }
}

// Ver receta existente
function verReceta(recetaId) {
    window.open(`receta.html?receta=${recetaId}`, '_blank');
}

// Editar historia clínica
function editarHistoriaClinica() {
    // Llenar formulario con datos existentes
    if (currentHistoriaClinica) {
        document.getElementById('motivo_consulta').value = currentHistoriaClinica.motivo_consulta || '';
        document.getElementById('sintomas').value = currentHistoriaClinica.sintomas || '';
        document.getElementById('examen_fisico').value = currentHistoriaClinica.examen_fisico || '';
        document.getElementById('diagnostico').value = currentHistoriaClinica.diagnostico || '';
        document.getElementById('observaciones').value = currentHistoriaClinica.observaciones || '';
        document.getElementById('presion_arterial').value = currentHistoriaClinica.presion_arterial || '';
        document.getElementById('frecuencia_cardiaca').value = currentHistoriaClinica.frecuencia_cardiaca || '';
        document.getElementById('temperatura').value = currentHistoriaClinica.temperatura || '';
        document.getElementById('peso').value = currentHistoriaClinica.peso || '';
        document.getElementById('altura').value = currentHistoriaClinica.altura || '';
        document.getElementById('tratamiento').value = currentHistoriaClinica.tratamiento || '';
        document.getElementById('recomendaciones').value = currentHistoriaClinica.recomendaciones || '';
    }
    
    document.getElementById('verHistoriaClinica').style.display = 'none';
    document.getElementById('historiaClinicaForm').style.display = 'block';
    
    // Cambiar el evento del formulario para editar
    const form = document.getElementById('formHistoriaClinica');
    form.removeEventListener('submit', guardarHistoriaClinica);
    form.addEventListener('submit', actualizarHistoriaClinica);
}

// Actualizar historia clínica existente
async function actualizarHistoriaClinica(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const historiaData = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`/api/historia-clinica/${currentHistoriaClinica.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(historiaData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Historia clínica actualizada exitosamente', 'success');
            currentHistoriaClinica = data.data;
            mostrarHistoriaClinicaExistente(data.data);
            
            // Restaurar el evento original del formulario
            const form = document.getElementById('formHistoriaClinica');
            form.removeEventListener('submit', actualizarHistoriaClinica);
            form.addEventListener('submit', guardarHistoriaClinica);
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        console.error('Error actualizando historia clínica:', error);
        showAlert('Error al actualizar la historia clínica', 'danger');
    }
}

// Funciones auxiliares
function getEstadoBadgeClass(estado) {
    const classes = {
        'pendiente': 'bg-warning',
        'confirmada': 'bg-info',
        'completada': 'bg-success',
        'cancelada': 'bg-danger'
    };
    return classes[estado] || 'bg-secondary';
}

function showAlert(message, type) {
    // Crear elemento de alerta
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Función para volver al dashboard
function volverAlDashboard() {
    window.close();
    // Si no se puede cerrar la ventana, redirigir
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 100);
}