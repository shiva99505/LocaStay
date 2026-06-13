import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const ROLE_HOME: Record<string, string> = {
  TENANT:   '/tenant',
  LANDLORD: '/landlord',
  ADMIN:    '/admin',
};

const ROLE_PREFIXES: Record<string, string> = {
  TENANT:   '/tenant',
  LANDLORD: '/landlord',
  ADMIN:    '/admin',
};

const AUTH_PAGES = ['/login', '/register'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role as string | undefined;

  // Redirect authenticated users away from auth pages
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  if (isAuthPage && role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/', req.url));
  }

  // Enforce role-based access on protected prefixes
  const entry = Object.entries(ROLE_PREFIXES).find(([, prefix]) => pathname.startsWith(prefix));
  if (entry) {
    const [requiredRole] = entry;
    if (!role) {
      const callbackUrl = encodeURIComponent(pathname + req.nextUrl.search);
      return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url));
    }
    if (role !== requiredRole) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/tenant/:path*',
    '/landlord/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};
