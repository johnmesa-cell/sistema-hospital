import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',        // Cambia si usas otro
  password: 'A1B7C8H9+',        // Tu contraseña
  database: 'sistemas_citas_medicas', // Nombre de tu BD
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool; 