import { useEffect, useState } from "react";
import LoadingSpinner from "../LoadingSpinner";

type Rol = "admin" | "recepcionista" | "medico" | "paciente";
interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  especialidad?: string | null;
  telefono?: string | null;
  createdAt?: string;
}

export default function UsuariosAdminUI() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/usuarios")
      .then((res) => res.json())
      .then((data) => {
        setUsuarios(data.usuarios || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Administración de usuarios</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Especialidad</th>
            <th>Teléfono</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.length === 0 ? (
            <tr>
              <td colSpan={7}>No se encontraron usuarios</td>
            </tr>
          ) : (
            usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td>{usuario.id}</td>
                <td>{usuario.nombre}</td>
                <td>{usuario.email}</td>
                <td>{usuario.rol}</td>
                <td>{usuario.especialidad || "-"}</td>
                <td>{usuario.telefono || "-"}</td>
                <td>
                  {/* Aquí irían los botones para editar/eliminar */}
                  <button className="px-2 py-1 bg-blue-500 text-white rounded mr-1">Editar</button>
                  <button className="px-2 py-1 bg-red-500 text-white rounded">Eliminar</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* Aquí puedes agregar el formulario para agregar/editar usuario */}
    </div>
  );
}
