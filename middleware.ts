/**
 * Supabase SSR Middleware
 * Refreshes the user session on every request and enforces role-based routing.
 * Replaces the previous NextAuth-based middleware.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/database.types';
import type { UserRole } from '@/lib/supabase/database.types';

const ROLE_HOME: Record<UserRole, string> = {
  TENANT:   '/tenant',
  LANDLORD: '/landlord',
  ADMIN:    '/admin',
};

const ROLE_PREFIXES: Record<UserRole, string> = {
  TENANT:   '/tenant',
  LANDLORD: '/landlord',
  ADMIN:    '/admin',
};

const AUTH_PAGES = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Always call getUser() — it refreshes the session cookie.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Fetch the user's role from the profiles table
  let role: UserRole | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', user.id)
      .single();

    if (profile?.is_suspended) {
      // Signed-out suspended users to login with an error message
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'account_suspended');
      return NextResponse.redirect(url);
    }

    role = profile?.role as UserRole | undefined;
  }

  // Redirect authenticated users away from auth pages
  const isAuthPage = AUTH_PAGES.some(p => pathname.startsWith(p));
  if (isAuthPage && role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  // Enforce role-based access on protected prefixes
  const matchedEntry = (Object.entries(ROLE_PREFIXES) as [UserRole, string][]).find(
    ([, prefix]) => pathname.startsWith(prefix),
  );

  if (matchedEntry) {
    const [requiredRole] = matchedEntry;

    if (!user || !role) {
      const callbackUrl = encodeURIComponent(pathname + request.nextUrl.search);
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${callbackUrl}`, request.url),
      );
    }

    if (role !== requiredRole) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/tenant/:path*',
    '/landlord/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/((?!_next/static|_next/image|favicon.ico|public|api/auth/callback).*)',
  ],
};
