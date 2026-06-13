import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database, UserRole } from '@/lib/supabase/database.types';

const ROLE_HOME: Record<UserRole, string> = {
  TENANT:   '/tenant',
  LANDLORD: '/landlord',
  ADMIN:    '/admin',
};

const PROTECTED_PREFIXES: [UserRole, string][] = [
  ['TENANT',   '/tenant'],
  ['LANDLORD', '/landlord'],
  ['ADMIN',    '/admin'],
];

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Always call getUser() — it refreshes the session cookie automatically
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  let role: UserRole | undefined;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_suspended')
      .eq('id', user.id)
      .single();

    if (profile?.is_suspended) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'account_suspended');
      return NextResponse.redirect(url);
    }

    // Use profile role if available, otherwise fall back to JWT metadata
    const rawRole = profile?.role ?? (user.user_metadata?.role as string | undefined);
    if (rawRole && ['TENANT', 'LANDLORD', 'ADMIN'].includes(rawRole)) {
      role = rawRole as UserRole;
    }
  }

  // Redirect authenticated users away from auth pages
  if (AUTH_PAGES.some((p) => pathname.startsWith(p)) && role) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
  }

  // Enforce role-based access on protected routes
  const matched = PROTECTED_PREFIXES.find(([, prefix]) => pathname.startsWith(prefix));
  if (matched) {
    const [requiredRole] = matched;

    if (!user || !role) {
      const callbackUrl = encodeURIComponent(pathname + request.nextUrl.search);
      return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
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
  ],
};
