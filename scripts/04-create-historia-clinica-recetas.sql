-- Script para agregar historia clínica y recetas médicas
-- Sistema de Gestión de Citas Médicas

USE sistema_citas_medicas;

-- Tabla de historia clínica
CREATE TABLE historia_clinica (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    cita_id INT NOT NULL,
    fecha_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Datos de la consulta
    motivo_consulta TEXT NOT NULL,
    sintomas TEXT,
    examen_fisico TEXT,
    diagnostico TEXT NOT NULL,
    observaciones TEXT,
    
    -- Signos vitales
    presion_arterial VARCHAR(20),
    frecuencia_cardiaca VARCHAR(10),
    temperatura VARCHAR(10),
    peso DECIMAL(5,2),
    altura DECIMAL(5,2),
    
    -- Tratamiento
    tratamiento TEXT,
    recomendaciones TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (paciente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (medico_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE CASCADE
);

-- Tabla de recetas médicas
CREATE TABLE recetas_medicas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    cita_id INT NOT NULL,
    historia_clinica_id INT NOT NULL,
    
    -- Información general de la receta
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    diagnostico VARCHAR(500) NOT NULL,
    indicaciones_generales TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (paciente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (medico_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (cita_id) REFERENCES citas(id) ON DELETE CASCADE,
    FOREIGN KEY (historia_clinica_id) REFERENCES historia_clinica(id) ON DELETE CASCADE
);

-- Tabla de medicamentos en la receta
CREATE TABLE receta_medicamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receta_id INT NOT NULL,
    
    -- Detalles del medicamento
    medicamento VARCHAR(200) NOT NULL,
    concentracion VARCHAR(100),
    forma_farmaceutica VARCHAR(100), -- tabletas, cápsulas, jarabe, etc.
    dosis VARCHAR(100) NOT NULL,
    frecuencia VARCHAR(100) NOT NULL, -- cada 8 horas, 3 veces al día, etc.
    duracion VARCHAR(100) NOT NULL, -- por 7 días, por 2 semanas, etc.
    cantidad_total VARCHAR(50), -- cantidad total a dispensar
    via_administracion VARCHAR(50), -- oral, tópica, etc.
    instrucciones_especiales TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (receta_id) REFERENCES recetas_medicas(id) ON DELETE CASCADE
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_historia_paciente ON historia_clinica(paciente_id);
CREATE INDEX idx_historia_medico ON historia_clinica(medico_id);
CREATE INDEX idx_historia_fecha ON historia_clinica(fecha_consulta);

CREATE INDEX idx_recetas_paciente ON recetas_medicas(paciente_id);
CREATE INDEX idx_recetas_medico ON recetas_medicas(medico_id);
CREATE INDEX idx_recetas_fecha ON recetas_medicas(fecha_emision);

CREATE INDEX idx_medicamentos_receta ON receta_medicamentos(receta_id);