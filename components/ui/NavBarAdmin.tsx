import Link from 'next/link';

export default function NavBarAdmin() {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <ul className="flex space-x-4">
        <li>
          <Link href="/dashboard">Dashboard</Link>
        </li>
        <li>
          <Link href="/usuarios">Usuarios</Link>
        </li>
        <li>
          <Link href="/configuracion">Configuración</Link>
        </li>
        <li>
          <Link href="/logout">Cerrar sesión</Link>
        </li>
      </ul>
    </nav>
  );
}
