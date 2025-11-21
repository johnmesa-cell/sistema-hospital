// Historial Médico JavaScript para Pacientes
let currentUser = null;
let currentHistoriaDetallada = null;

// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado en historial médico');
    
    if (!verificarAutenticacion()) {
        return;
    }

    // Configurar eventos de pestañas
    document.getElementById('historias-tab').addEventListener('click', cargarHistoriasClinicas);
    document.getElementById('recetas-tab').addEventListener('click', cargarRecetasMedicas);

    // Cargar historias clínicas por defecto
    cargarHistoriasClinicas();
});

// Verificar autenticación
function verificarAutenticacion() {
    console.log('Verificando autenticación en historial médico...');
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
    
    // Si no hay información en sessionStorage, intentar desde localStorage
    if (!user) {
        console.log('No hay userInfo, intentando desde localStorage...');
        const storedUser = localStorage.getItem('user');
        console.log('User en localStorage:', storedUser);
        if (storedUser) {
            user = JSON.parse(storedUser);
            console.log('Usuario parseado desde localStorage:', user);
        }
    }
    
    if (!user || (user.rol !== 'paciente' && user.tipo !== 'paciente')) {
        console.error('Usuario no válido o no es paciente:', user);
        showAlert('Acceso no autorizado. Esta página es solo para pacientes.', 'danger');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return false;
    }
    
    currentUser = user;
    console.log('Usuario autorizado para historial médico:', user);
    document.getElementById('userInfo').textContent = currentUser.nombre;
    return true;
}

// Cargar historias clínicas del paciente
async function cargarHistoriasClinicas() {
    const content = document.getElementById('historiasContent');
    content.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2">Cargando historias clínicas...</p>
        </div>
    `;
    
    // Limpiar cualquier elemento flotante que pueda estar causando problemas
    const floatingElements = document.querySelectorAll('button:not(.btn-close):not([data-bs-dismiss])');
    floatingElements.forEach(btn => {
        if (!btn.closest('.container')) {
            console.log('Eliminando botón flotante:', btn);
            btn.remove();
        }
    });

    try {
        const response = await fetch(`/api/historia-clinica/paciente/${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarHistoriasClinicas(data.data);
        } else {
            content.innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="bi bi-exclamation-triangle"></i> ${data.message}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando historias clínicas:', error);
        content.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="bi bi-exclamation-circle"></i> Error al cargar las historias clínicas
            </div>
        `;
    }
}

// Mostrar historias clínicas
function mostrarHistoriasClinicas(historias) {
    const content = document.getElementById('historiasContent');
    
    if (historias.length === 0) {
        content.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-file-medical" style="font-size: 3rem;"></i>
                <h5 class="mt-3">No tienes historias clínicas registradas</h5>
                <p>Cuando tengas consultas completadas, aparecerán aquí.</p>
            </div>
        `;
        return;
    }

    let historiasHtml = '';
    historias.forEach(historia => {
        const fechaConsulta = new Date(historia.fecha_consulta).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const fechaCita = new Date(historia.fecha_cita).toLocaleDateString('es-ES');

        historiasHtml += `
            <div class="card mb-3">
                <div class="card-header">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h6 class="mb-1">
                                <i class="bi bi-calendar-check text-success"></i>
                                Consulta del ${fechaConsulta}
                            </h6>
                            <p class="mb-0 text-muted">
                                <strong>Dr. ${historia.medico_nombre}</strong> - ${historia.especialidad}
                                <br>
                                <small>Cita original: ${fechaCita}</small>
                            </p>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-outline-primary me-2" onclick="verHistoriaDetallada(${historia.id})" style="min-width: 110px;">
                                <i class="bi bi-eye"></i> Ver Completa
                            </button>
                            <button class="btn btn-outline-info" onclick="imprimirHistoriaDirecta(${historia.id})" style="min-width: 110px;">
                                <i class="bi bi-printer"></i> Imprimir
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="text-primary"><i class="bi bi-clipboard-pulse"></i> Diagnóstico</h6>
                            <p class="mb-3">${historia.diagnostico}</p>
                            
                            <h6 class="text-primary"><i class="bi bi-chat-text"></i> Motivo de Consulta</h6>
                            <p class="mb-3">${historia.motivo_consulta}</p>
                        </div>
                        <div class="col-md-6">
                            ${historia.sintomas ? `
                                <h6 class="text-primary"><i class="bi bi-thermometer"></i> Síntomas</h6>
                                <p class="mb-3">${historia.sintomas}</p>
                            ` : ''}
                            
                            ${historia.tratamiento ? `
                                <h6 class="text-primary"><i class="bi bi-prescription2"></i> Tratamiento</h6>
                                <p class="mb-3">${historia.tratamiento}</p>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${historia.recomendaciones ? `
                        <div class="alert alert-info">
                            <h6 class="alert-heading"><i class="bi bi-lightbulb"></i> Recomendaciones Médicas</h6>
                            <p class="mb-0">${historia.recomendaciones}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    content.innerHTML = historiasHtml;
}

// Cargar recetas médicas del paciente
async function cargarRecetasMedicas() {
    const content = document.getElementById('recetasContent');
    content.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2">Cargando recetas médicas...</p>
        </div>
    `;

    try {
        const response = await fetch(`/api/recetas/paciente/${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarRecetasMedicas(data.data);
        } else {
            content.innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="bi bi-exclamation-triangle"></i> ${data.message}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando recetas médicas:', error);
        content.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="bi bi-exclamation-circle"></i> Error al cargar las recetas médicas
            </div>
        `;
    }
}

// Mostrar recetas médicas
function mostrarRecetasMedicas(recetas) {
    const content = document.getElementById('recetasContent');
    
    if (recetas.length === 0) {
        content.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-prescription" style="font-size: 3rem;"></i>
                <h5 class="mt-3">No tienes recetas médicas registradas</h5>
                <p>Cuando tengas consultas con prescripciones médicas, aparecerán aquí.</p>
            </div>
        `;
        return;
    }

    let recetasHtml = '';
    recetas.forEach(receta => {
        const fechaEmision = new Date(receta.fecha_emision).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const fechaCita = new Date(receta.fecha_cita).toLocaleDateString('es-ES');

        recetasHtml += `
            <div class="card mb-3">
                <div class="card-header bg-light">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h6 class="mb-1">
                                <i class="bi bi-prescription text-info"></i>
                                Receta N° ${String(receta.id).padStart(6, '0')}
                            </h6>
                            <p class="mb-0 text-muted">
                                <strong>Dr. ${receta.medico_nombre}</strong> - ${receta.especialidad}
                                <br>
                                <small>Emitida el ${fechaEmision} | Consulta: ${fechaCita}</small>
                            </p>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-outline-primary me-2" onclick="verRecetaCompleta(${receta.id})" style="min-width: 110px;">
                                <i class="bi bi-eye"></i> Ver Completa
                            </button>
                            <button class="btn btn-outline-info" onclick="imprimirReceta(${receta.id})" style="min-width: 110px;">
                                <i class="bi bi-printer"></i> Imprimir
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-12">
                            <h6 class="text-primary"><i class="bi bi-clipboard-pulse"></i> Diagnóstico</h6>
                            <p class="mb-3">${receta.diagnostico}</p>
                            
                            ${receta.indicaciones_generales ? `
                                <h6 class="text-primary"><i class="bi bi-info-circle"></i> Indicaciones Generales</h6>
                                <p class="mb-3">${receta.indicaciones_generales}</p>
                            ` : ''}
                            
                            <div class="alert alert-warning">
                                <i class="bi bi-exclamation-triangle"></i>
                                <strong>Importante:</strong> Esta receta médica debe ser presentada en la farmacia. 
                                Siga las indicaciones del médico y no modifique las dosis prescritas.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    content.innerHTML = recetasHtml;
}

// Ver historia clínica detallada en modal
async function verHistoriaDetallada(historiaId) {
    try {
        const response = await fetch(`/api/historia-clinica/${historiaId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentHistoriaDetallada = data.data;
            mostrarHistoriaEnModal(data.data);
            
            const modal = new bootstrap.Modal(document.getElementById('modalHistoria'));
            modal.show();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        console.error('Error cargando historia detallada:', error);
        showAlert('Error al cargar la historia clínica', 'danger');
    }
}

// Mostrar historia en modal
function mostrarHistoriaEnModal(historia) {
    const content = document.getElementById('modalHistoriaContent');
    const fechaConsulta = new Date(historia.fecha_consulta).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    content.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3">Información de la Consulta</h6>
                <p><strong>Fecha:</strong> ${fechaConsulta}</p>
                <p><strong>Médico:</strong> Dr. ${historia.medico_nombre}</p>
                <p><strong>Especialidad:</strong> ${historia.especialidad}</p>
            </div>
            <div class="col-md-6">
                <h6 class="text-primary mb-3">Datos del Paciente</h6>
                <p><strong>Nombre:</strong> ${historia.paciente_nombre}</p>
                <p><strong>Email:</strong> ${historia.paciente_email}</p>
                ${historia.paciente_telefono ? `<p><strong>Teléfono:</strong> ${historia.paciente_telefono}</p>` : ''}
            </div>
        </div>

        <hr>

        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3"><i class="bi bi-clipboard-pulse"></i> Datos Clínicos</h6>
                <p><strong>Motivo de Consulta:</strong></p>
                <p class="border p-2 rounded bg-light">${historia.motivo_consulta}</p>
                
                ${historia.sintomas ? `
                    <p><strong>Síntomas:</strong></p>
                    <p class="border p-2 rounded bg-light">${historia.sintomas}</p>
                ` : ''}
                
                ${historia.examen_fisico ? `
                    <p><strong>Examen Físico:</strong></p>
                    <p class="border p-2 rounded bg-light">${historia.examen_fisico}</p>
                ` : ''}
                
                <p><strong>Diagnóstico:</strong></p>
                <p class="border p-2 rounded bg-light">${historia.diagnostico}</p>
            </div>
            
            <div class="col-md-6">
                <h6 class="text-primary mb-3"><i class="bi bi-heart-pulse"></i> Signos Vitales</h6>
                <div class="row">
                    <div class="col-6">
                        <p><strong>Presión Arterial:</strong><br>${historia.presion_arterial || 'No registrada'}</p>
                        <p><strong>Frecuencia Cardíaca:</strong><br>${historia.frecuencia_cardiaca || 'No registrada'}</p>
                        <p><strong>Temperatura:</strong><br>${historia.temperatura || 'No registrada'}</p>
                    </div>
                    <div class="col-6">
                        <p><strong>Peso:</strong><br>${historia.peso ? historia.peso + ' kg' : 'No registrado'}</p>
                        <p><strong>Altura:</strong><br>${historia.altura ? historia.altura + ' cm' : 'No registrada'}</p>
                    </div>
                </div>
            </div>
        </div>

        <hr>

        <div class="row">
            <div class="col-12">
                <h6 class="text-primary mb-3"><i class="bi bi-prescription2"></i> Tratamiento y Recomendaciones</h6>
                
                ${historia.tratamiento ? `
                    <p><strong>Tratamiento:</strong></p>
                    <p class="border p-2 rounded bg-light">${historia.tratamiento}</p>
                ` : ''}
                
                ${historia.recomendaciones ? `
                    <p><strong>Recomendaciones:</strong></p>
                    <p class="border p-2 rounded bg-light">${historia.recomendaciones}</p>
                ` : ''}
                
                ${historia.observaciones ? `
                    <p><strong>Observaciones:</strong></p>
                    <p class="border p-2 rounded bg-light">${historia.observaciones}</p>
                ` : ''}
            </div>
        </div>
    `;
}

// Ver receta completa
function verRecetaCompleta(recetaId) {
    window.open(`receta.html?receta=${recetaId}`, '_blank');
}

// Imprimir receta
function imprimirReceta(recetaId) {
    window.open(`receta.html?receta=${recetaId}`, '_blank');
}

// Imprimir historia clínica directamente
function imprimirHistoriaDirecta(historiaId) {
    verHistoriaDetallada(historiaId).then(() => {
        setTimeout(() => {
            imprimirHistoria();
        }, 1000);
    });
}

// Imprimir historia desde modal
function imprimirHistoria() {
    if (!currentHistoriaDetallada) {
        showAlert('No hay historia clínica cargada para imprimir', 'warning');
        return;
    }

    // Crear una nueva ventana para imprimir
    const printWindow = window.open('', '_blank');
    const historia = currentHistoriaDetallada;
    const fechaConsulta = new Date(historia.fecha_consulta).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Historia Clínica - ${historia.paciente_nombre}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                .section { margin-bottom: 20px; }
                .section h3 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .box { border: 1px solid #ddd; padding: 10px; border-radius: 5px; background: #f9f9f9; }
                .signature-area { margin-top: 50px; border-top: 1px solid #000; text-align: right; padding-top: 20px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>HISTORIA CLÍNICA</h1>
                <h3>Sistema de Gestión de Citas Médicas</h3>
            </div>
            
            <div class="info-grid">
                <div>
                    <h3>Información del Paciente</h3>
                    <p><strong>Nombre:</strong> ${historia.paciente_nombre}</p>
                    <p><strong>Email:</strong> ${historia.paciente_email}</p>
                    <p><strong>Teléfono:</strong> ${historia.paciente_telefono || 'No registrado'}</p>
                </div>
                <div>
                    <h3>Información de la Consulta</h3>
                    <p><strong>Fecha:</strong> ${fechaConsulta}</p>
                    <p><strong>Médico:</strong> Dr. ${historia.medico_nombre}</p>
                    <p><strong>Especialidad:</strong> ${historia.especialidad}</p>
                </div>
            </div>

            <div class="section">
                <h3>Motivo de Consulta</h3>
                <div class="box">${historia.motivo_consulta}</div>
            </div>

            ${historia.sintomas ? `
                <div class="section">
                    <h3>Síntomas</h3>
                    <div class="box">${historia.sintomas}</div>
                </div>
            ` : ''}

            ${historia.examen_fisico ? `
                <div class="section">
                    <h3>Examen Físico</h3>
                    <div class="box">${historia.examen_fisico}</div>
                </div>
            ` : ''}

            <div class="section">
                <h3>Diagnóstico</h3>
                <div class="box">${historia.diagnostico}</div>
            </div>

            <div class="section">
                <h3>Signos Vitales</h3>
                <div class="info-grid">
                    <div>
                        <p><strong>Presión Arterial:</strong> ${historia.presion_arterial || 'No registrada'}</p>
                        <p><strong>Frecuencia Cardíaca:</strong> ${historia.frecuencia_cardiaca || 'No registrada'}</p>
                        <p><strong>Temperatura:</strong> ${historia.temperatura || 'No registrada'}</p>
                    </div>
                    <div>
                        <p><strong>Peso:</strong> ${historia.peso ? historia.peso + ' kg' : 'No registrado'}</p>
                        <p><strong>Altura:</strong> ${historia.altura ? historia.altura + ' cm' : 'No registrada'}</p>
                    </div>
                </div>
            </div>

            ${historia.tratamiento ? `
                <div class="section">
                    <h3>Tratamiento</h3>
                    <div class="box">${historia.tratamiento}</div>
                </div>
            ` : ''}

            ${historia.recomendaciones ? `
                <div class="section">
                    <h3>Recomendaciones</h3>
                    <div class="box">${historia.recomendaciones}</div>
                </div>
            ` : ''}

            ${historia.observaciones ? `
                <div class="section">
                    <h3>Observaciones</h3>
                    <div class="box">${historia.observaciones}</div>
                </div>
            ` : ''}

            <div class="signature-area">
                <p><strong>Dr. ${historia.medico_nombre}</strong></p>
                <p>${historia.especialidad}</p>
                <p>Fecha: ${fechaConsulta}</p>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
}

// Funciones auxiliares
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

// Función para cerrar sesión
function logout() {
    localStorage.clear();
    sessionStorage.clear();
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

// Configurar todas las funciones como globales
window.logout = logout;
window.volverAlDashboard = volverAlDashboard;
window.verHistoriaDetallada = verHistoriaDetallada;
window.imprimirHistoriaDirecta = imprimirHistoriaDirecta;
window.verRecetaCompleta = verRecetaCompleta;
window.imprimirReceta = imprimirReceta;
window.imprimirHistoria = imprimirHistoria;

console.log('Funciones globales configuradas en historial médico:', {
    logout: typeof window.logout,
    volverAlDashboard: typeof window.volverAlDashboard,
    verHistoriaDetallada: typeof window.verHistoriaDetallada,
    imprimirHistoriaDirecta: typeof window.imprimirHistoriaDirecta,
    verRecetaCompleta: typeof window.verRecetaCompleta,
    imprimirReceta: typeof window.imprimirReceta
});