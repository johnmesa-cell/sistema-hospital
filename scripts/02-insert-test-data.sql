-- Datos de prueba para el Sistema de Gestión de Citas Médicas

USE sistema_citas_medicas;

-- Insertar usuario administrador primero
-- Password: password123
INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES
('Administrador del Sistema', 'admin@hospital.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.yZ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5O', 'administrador', '+34-600-000-000');

-- Insertar usuarios de prueba (médicos)
-- Password para todos: password123
INSERT INTO usuarios (nombre, email, password, rol, especialidad, telefono) VALUES
('Dr. María González', 'maria.gonzalez@hospital.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.yZ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5O', 'medico', 'Cardiología', '+34-600-123-456'),
('Dr. Carlos Rodríguez', 'carlos.rodriguez@hospital.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.yZ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5O', 'medico', 'Medicina General', '+34-600-123-457'),
('Dra. Ana Martínez', 'ana.martinez@hospital.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.yZ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5O', 'medico', 'Pediatría', '+34-600-123-458');

-- Insertar usuarios de prueba (pacientes)
-- Password para todos: password123
INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES
('Juan Pérez', 'juan.perez@email.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.yZ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5O', 'paciente', '+34-600-234-567'),
('Laura Sánchez', 'laura.sanchez@email.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.yZ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5O', 'paciente', '+34-600-234-568'),
('Pedro López', 'pedro.lopez@email.com', '$2b$10$rOvHPGp8.uRd6/VpGl4Gv.yZ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5qJ5O', 'paciente', '+34-600-234-569');

-- Insertar citas de prueba
INSERT INTO citas (paciente_id, medico_id, fecha, hora, motivo, estado) VALUES
(4, 1, '2024-01-15', '09:00:00', 'Consulta de rutina cardiológica', 'confirmada'),
(5, 2, '2024-01-15', '10:30:00', 'Revisión médica general', 'pendiente'),
(6, 3, '2024-01-16', '11:00:00', 'Control pediátrico', 'pendiente'),
(4, 2, '2024-01-17', '14:00:00', 'Seguimiento tratamiento', 'confirmada');

-- Mostrar datos insertados para verificación
SELECT 'USUARIOS ADMINISTRADORES:' as info;
SELECT id, nombre, email, rol, telefono FROM usuarios WHERE rol = 'administrador';

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
