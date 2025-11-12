import pool from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id_medico = searchParams.get('id_medico');
  const fecha = searchParams.get('fecha');
  const hora = searchParams.get('hora');

  const [rows] = await pool.query(
    'SELECT id FROM citas WHERE id_medico = ? AND fecha = ? AND hora = ?',
    [id_medico, fecha, hora]
  );

  return Response.json({ disponible: rows.length === 0 });
}