'use client';

import './globals.css';
import { useEffect, useState } from 'react';
import NavBarAdmin from '../components/ui/NavBarAdmin';
import NavBarPaciente from '../components/ui/NavBar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedRol = localStorage.getItem('rol');
    // Leer rol de la cookie (solo cliente)
    const match = document.cookie.match('(^|;)\\s*rol\\s*=\\s*([^;]+)');
    const cookieRol = match ? match.pop() : null;

    // Si no hay cookie de rol (posible sesión expirada o eliminada en backend)
    if (!cookieRol) {
      localStorage.removeItem('rol');
      setRol(null);
      setLoading(false);
      // window.location.href = "/login"; // Descomenta si quieres redirigir a login automáticamente
      return;
    }

    // Si hay desincronización entre cookie y localStorage
    if (storedRol && storedRol !== cookieRol) {
      localStorage.removeItem('rol');
      setRol(null);
      setLoading(false);
      // window.location.href = "/login"; // Redirigir a login si hay conflicto
      return;
    }

    // Por defecto, el rol viene de la cookie
    setRol(cookieRol);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <html lang="es">
        <body>
          <div style={{ padding: 32, textAlign: "center" }}>Cargando aplicación...</div>
        </body>
      </html>
    );
  }

  if (!rol) {
    // Puedes personalizar aquí una UI para usuarios no autenticados o no autorizados
    return (
      <html lang="es">
        <body>
          <NavBarPaciente />
          <main style={{ padding: 16 }}>{children}</main>
        </body>
      </html>
    );
  }

  return (
    <html lang="es">
      <body>
        {rol === 'admin' ? <NavBarAdmin /> : <NavBarPaciente />}
        <main style={{ padding: 16 }}>{children}</main>
      </body>
    </html>
  );
}