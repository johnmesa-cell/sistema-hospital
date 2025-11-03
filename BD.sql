-- Script para crear la base de datos del Sistema de Gestión de Citas Médicas
-- Proyecto académico MVP

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS sistema_citas_medicas;
USE sistema_citas_medicas;

-- Tabla de usuarios (médicos y pacientes)
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('medico', 'paciente') NOT NULL,
    especialidad VARCHAR(100) NULL, -- Solo para médicos
    telefono VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de citas
CREATE TABLE citas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    motivo TEXT NULL,
    estado ENUM('pendiente', 'confirmada', 'cancelada', 'completada') DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (medico_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cita (medico_id, fecha, hora)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_citas_fecha ON citas(fecha);
CREATE INDEX idx_citas_medico ON citas(medico_id);
CREATE INDEX idx_citas_paciente ON citas(paciente_id);


-- Datos de prueba para el Sistema de Gestión de Citas Médicas

USE sistema_citas_medicas;

-- Insertar usuarios de prueba (médicos)
INSERT INTO usuarios (nombre, email, password, rol, especialidad, telefono) VALUES
('Dr. María González', 'maria.gonzalez@hospital.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.QX9Q8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'medico', 'Cardiología', '+34-600-123-456'),
('Dr. Carlos Rodríguez', 'carlos.rodriguez@hospital.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.QX9Q8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'medico', 'Medicina General', '+34-600-123-457'),
('Dra. Ana Martínez', 'ana.martinez@hospital.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.QX9Q8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'medico', 'Pediatría', '+34-600-123-458');

-- Insertar usuarios de prueba (pacientes)
INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES
('Juan Pérez', 'juan.perez@email.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.QX9Q8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'paciente', '+34-600-234-567'),
('Laura Sánchez', 'laura.sanchez@email.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.QX9Q8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'paciente', '+34-600-234-568'),
('Pedro López', 'pedro.lopez@email.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.QX9Q8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'paciente', '+34-600-234-569');

-- Insertar citas de prueba
INSERT INTO citas (paciente_id, medico_id, fecha, hora, motivo, estado) VALUES
(4, 1, '2024-01-15', '09:00:00', 'Consulta de rutina cardiológica', 'confirmada'),
(5, 2, '2024-01-15', '10:30:00', 'Revisión médica general', 'pendiente'),
(6, 3, '2024-01-16', '11:00:00', 'Control pediátrico', 'pendiente'),
(4, 2, '2024-01-17', '14:00:00', 'Seguimiento tratamiento', 'confirmada');

-- Mostrar datos insertados para verificación
SELECT 'USUARIOS MÉDICOS:' as info;
SELECT id, nombre, email, rol, especialidad FROM usuarios WHERE rol = 'medico';

SELECT 'USUARIOS PACIENTES:' as info;
SELECT id, nombre, email, rol FROM usuarios WHERE rol = 'paciente';

SELECT 'CITAS PROGRAMADAS:' as info;
SELECT 
    c.id,
    p.nombre as paciente,
    m.nombre as medico,
    m.especialidad,
    c.fecha,
    c.hora,
    c.motivo,
    c.estado
FROM citas c
JOIN usuarios p ON c.paciente_id = p.id
JOIN usuarios m ON c.medico_id = m.id
ORDER BY c.fecha, c.hora;

select * from usuarios;