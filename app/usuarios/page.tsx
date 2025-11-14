// app/usuarios/page.tsx
// app/usuarios/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

import LoadingSpinner from "../../components/ui/LoadingSpinner";
import UsuariosAdminUI from "../../components/ui/admin/UsuariosAdminUI";

export default function UsuariosAdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Spinner mientras carga la sesión
  if (authLoading) return <LoadingSpinner />;

  // Si no hay usuario o el rol NO es admin, redirige
  if (!user || user.rol !== "admin") {
    useEffect(() => {
      router.replace("/dashboard");
    }, [router]);
    return null;
  }

  // Renderiza la UI específica de administración de usuarios
  return <UsuariosAdminUI />;
}
