-- Crear tabla de disponibilidad médica
USE sistema_citas_medicas;

CREATE TABLE IF NOT EXISTS disponibilidad_medico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medico_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    intervalo_minutos INT NOT NULL DEFAULT 30,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (medico_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    
    -- Índices para optimizar consultas
    INDEX idx_medico_fecha (medico_id, fecha),
    INDEX idx_fecha (fecha),
    
    -- Constraint para evitar solapamientos (se maneja en la aplicación)
    UNIQUE KEY unique_medico_fecha_hora (medico_id, fecha, hora_inicio, hora_fin)
);
