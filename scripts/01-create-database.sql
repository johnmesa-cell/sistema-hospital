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
