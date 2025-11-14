// app/dashboard/page.tsx - VERSIÓN DEBUG
// app/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomeRedirect() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    (async () => {
      const res = await fetch("/api/auth/verify", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        localStorage.removeItem("token");
        router.replace("/login");
        return;
      }
      // Si el usuario existe, redirige por rol
      const user = data?.data?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      switch (user.rol) {
        case "admin":
          router.replace("/usuarios"); // ruta específica para admin
          break;
        case "recepcionista":
          router.replace("/dashboard/recepcion"); // ruta de recepción
          break;
        case "medico":
          router.replace("/dashboard/medico"); // ruta de médicos
          break;
        case "paciente":
        default:
          router.replace("/dashboard"); // ruta general por defecto
          break;
      }
      setLoading(false);
    })();
  }, [router]);

  return <p>Cargando inicio…</p>;
}
