// Receta Médica JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Obtener ID de la receta de los parámetros URL
    const urlParams = new URLSearchParams(window.location.search);
    const recetaId = urlParams.get('receta');
    
    if (recetaId) {
        cargarReceta(recetaId);
    } else {
        mostrarError('No se especificó una receta válida');
    }
});

// Cargar datos de la receta
async function cargarReceta(recetaId) {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            mostrarError('No tiene permisos para ver esta receta');
            return;
        }

        const response = await fetch(`/api/recetas/${recetaId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarReceta(data.data);
            document.getElementById('loadingMessage').style.display = 'none';
        } else {
            mostrarError(data.message);
        }
    } catch (error) {
        console.error('Error cargando receta:', error);
        mostrarError('Error al cargar la receta médica');
    }
}

// Mostrar datos de la receta
function mostrarReceta(data) {
    const { receta, medicamentos } = data;
    
    // Header de la receta
    const fechaEmision = new Date(receta.fecha_emision).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    document.getElementById('recetaHeader').innerHTML = `
        <div class="col-md-6">
            <h6 class="text-primary mb-1">INFORMACIÓN MÉDICA</h6>
            <p class="mb-0"><strong>Dr. ${receta.medico_nombre}</strong></p>
            <p class="mb-0">${receta.especialidad}</p>
            <p class="mb-0">Tel: ${receta.medico_telefono || 'No registrado'}</p>
        </div>
        <div class="col-md-6 text-end">
            <h6 class="text-primary mb-1">RECETA N°</h6>
            <p class="mb-0"><strong>${String(receta.id).padStart(6, '0')}</strong></p>
            <p class="mb-0">${fechaEmision}</p>
        </div>
    `;

    // Información del paciente
    document.getElementById('pacienteInfo').innerHTML = `
        <div class="col-12">
            <div class="border p-3 rounded bg-light">
                <div class="row">
                    <div class="col-md-8">
                        <h6 class="text-primary mb-2">DATOS DEL PACIENTE</h6>
                        <p class="mb-1"><strong>Nombre:</strong> ${receta.paciente_nombre}</p>
                        <p class="mb-1"><strong>Email:</strong> ${receta.paciente_email}</p>
                        <p class="mb-0"><strong>Teléfono:</strong> ${receta.paciente_telefono || 'No registrado'}</p>
                    </div>
                    <div class="col-md-4">
                        <h6 class="text-primary mb-2">FECHA DE CONSULTA</h6>
                        <p class="mb-1"><strong>Fecha:</strong> ${new Date(receta.fecha_cita).toLocaleDateString('es-ES')}</p>
                        <p class="mb-0"><strong>Hora:</strong> ${receta.hora_cita}</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Diagnóstico
    document.getElementById('diagnostico').textContent = receta.diagnostico;

    // Medicamentos
    let medicamentosHtml = '';
    medicamentos.forEach((med, index) => {
        medicamentosHtml += `
            <div class="medicamento-item mb-4">
                <div class="row">
                    <div class="col-12">
                        <h6 class="text-success mb-2">
                            <i class="bi bi-capsule"></i> ${index + 1}. ${med.medicamento}
                            ${med.concentracion ? ` - ${med.concentracion}` : ''}
                            ${med.forma_farmaceutica ? ` (${med.forma_farmaceutica})` : ''}
                        </h6>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-4 mb-2">
                        <strong><i class="bi bi-prescription2"></i> Dosis:</strong> ${med.dosis}
                    </div>
                    <div class="col-md-4 mb-2">
                        <strong><i class="bi bi-clock"></i> Frecuencia:</strong> ${med.frecuencia}
                    </div>
                    <div class="col-md-4 mb-2">
                        <strong><i class="bi bi-calendar-range"></i> Duración:</strong> ${med.duracion}
                    </div>
                </div>
                
                ${med.cantidad_total || med.via_administracion ? `
                    <div class="row">
                        ${med.cantidad_total ? `
                            <div class="col-md-6 mb-2">
                                <strong><i class="bi bi-boxes"></i> Cantidad:</strong> ${med.cantidad_total}
                            </div>
                        ` : ''}
                        ${med.via_administracion ? `
                            <div class="col-md-6 mb-2">
                                <strong><i class="bi bi-arrow-down-circle"></i> Vía:</strong> ${med.via_administracion}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                ${med.instrucciones_especiales ? `
                    <div class="row">
                        <div class="col-12">
                            <div class="alert alert-info py-2 mb-0">
                                <strong><i class="bi bi-info-circle"></i> Instrucciones especiales:</strong> 
                                ${med.instrucciones_especiales}
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    document.getElementById('medicamentos').innerHTML = medicamentosHtml;

    // Indicaciones generales
    if (receta.indicaciones_generales) {
        document.getElementById('indicaciones').textContent = receta.indicaciones_generales;
        document.getElementById('indicacionesSection').style.display = 'block';
    }

    // Firma del médico
    document.getElementById('fechaEmision').textContent = fechaEmision;
    document.getElementById('nombreMedico').textContent = `Dr. ${receta.medico_nombre}`;
    document.getElementById('especialidadMedico').textContent = receta.especialidad;
    document.getElementById('telefonoMedico').textContent = receta.medico_telefono || 'No registrado';
}

// Mostrar error
function mostrarError(mensaje) {
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('errorText').textContent = mensaje;
    document.getElementById('errorMessage').style.display = 'block';
}