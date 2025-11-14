// app/login/page.tsx
'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com"); // Pre-llena para testing
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Error de login");

      // Guardar token y rol en localStorage
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("rol", data.data.user.rol);

      // Validar sincronización con cookie 'rol'
      const match = document.cookie.match('(^|;)\\s*rol\\s*=\\s*([^;]+)');
      const cookieRol = match ? match.pop() : null;

      if (!cookieRol || cookieRol !== data.data.user.rol) {
        // Si cookie no existe o no coincide, limpiar localStorage y mostrar error
        localStorage.removeItem("token");
        localStorage.removeItem("rol");
        setErr("Error de sincronización de sesión, por favor intente nuevamente.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={onSubmit} className="p-8 bg-white rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Iniciar Sesión</h2>

        {err && <p className="text-red-500 text-sm mb-4">{err}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded mb-4"
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded mb-4"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Iniciando..." : "Iniciar Sesión"}
        </button>
      </form>
    </div>
  );
}
