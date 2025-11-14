// app/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const rol = request.cookies.get('rol')?.value; // Leer rol de cookie

  const { pathname } = request.nextUrl;

  console.log('Middleware - Ruta:', pathname, 'Token existe:', !!token, 'Rol:', rol); // DEBUG

  // Validar autenticación para rutas protegidas
  if ((pathname.startsWith('/dashboard') || pathname.startsWith('/usuarios')) && !token) {
    console.log('Middleware - Redirigiendo a login por falta de token'); // DEBUG
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Validar rol para rutas administrativas (solo admin puede acceder)
  if ((pathname.startsWith('/usuarios')) && rol !== 'admin') {
    console.log('Middleware - Redirigiendo a dashboard por rol no admin:', rol); // DEBUG
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Para dashboard general, permitir cualquier usuario autenticado
  if (pathname.startsWith('/dashboard') && rol && rol !== 'admin') {
    console.log('Middleware - Permitiendo acceso a dashboard para rol no admin:', rol); // DEBUG
  }

  // Si todo está bien, continuar
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/usuarios/:path*'],
};
