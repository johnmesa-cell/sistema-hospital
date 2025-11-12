import pool from '@/lib/db';

export async function POST(request) {
  const { id_medico, id_paciente, fecha, hora } = await request.json();

  // Verificar si ya existe una cita en ese horario
  const [existing] = await pool.query(
    'SELECT id FROM citas WHERE id_medico = ? AND fecha = ? AND hora = ?',
    [id_medico, fecha, hora]
  );

  if (existing.length > 0) {
    return Response.json(
      { error: 'El médico ya tiene una cita en ese horario.' },
      { status: 400 }
    );
  }

  // Crear la cita
  const [result] = await pool.query(
    'INSERT INTO citas (id_medico, id_paciente, fecha, hora, estado) VALUES (?, ?, ?, ?, "pendiente")',
    [id_medico, id_paciente, fecha, hora]
  );

  return Response.json({
    success: true,
    message: 'Cita programada con éxito',
    id: result.insertId
  });
}