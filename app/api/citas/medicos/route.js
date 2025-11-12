import pool from '@/lib/db';

export async function GET() {
  const [rows] = await pool.query('SELECT id, nombre FROM medicos');
  return Response.json(rows);
}