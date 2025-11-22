// app/components/NavBar.tsx
// app/components/NavBar.tsx - MODIFICAR EXISTENTE
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth"; // ← IMPORTAR NUEVO HOOK

export default function NavBar() {
  const { user, loading } = useAuth(); // ← REEMPLAZAR useState POR HOOK
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && user?.rol === "admin" && pathname === "/dashboard") {
      router.replace("/usuarios");
    }
  }, [loading, user, pathname, router]);

  function logout() {
    localStorage.removeItem("token");
    router.push("/login");
  }

  if (loading) {
    return (
      <nav className="flex gap-3 items-center p-3 border-b border-gray-200">
        <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
      </nav>
    );
  }

  return (
    <nav className="flex gap-3 items-center p-3 border-b border-gray-200 bg-white">
      <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
        Inicio
      </Link>
      <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
        Dashboard
      </Link>
      {user?.rol === "admin" && (
        <Link href="/usuarios" className="text-blue-600 hover:text-blue-800 font-medium">
          Usuarios
        </Link>
      )}
      
      <div className="ml-auto flex gap-3 items-center">
        {user ? (
          <>
            <span className="text-sm text-gray-700">
              Hola, <strong>{user.nombre}</strong> ({user.rol})
            </span>
            <button 
              onClick={logout}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
            >
              Salir
            </button>
          </>
        ) : (
          <Link 
            href="/login" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Ingresar
          </Link>
        )}
      </div>
    </nav>
  );
}


