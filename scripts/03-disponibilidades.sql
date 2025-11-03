USE sistema_citas_medicas;  -- Usa el nombre de tu BD del .env

CREATE TABLE IF NOT EXISTS disponibilidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medico_id INT NOT NULL,
  fecha DATE NOT NULL,           -- Fecha específica
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  intervalo_minutos INT NOT NULL DEFAULT 30,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_disp_medico FOREIGN KEY (medico_id) REFERENCES usuarios(id)
);

-- Ejemplo de disponibilidad (médico 1, para una fecha específica)
-- Ajusta medico_id a un usuario con rol 'medico' que exista en tu tabla 'usuarios'
INSERT INTO disponibilidades (medico_id, fecha, hora_inicio, hora_fin, intervalo_minutos, activo)
VALUES (1, '2025-10-30', '08:00:00', '12:00:00', 30, 1);
