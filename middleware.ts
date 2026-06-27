import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/jwt';

// Protected pages
const protectedPaths = [
  '/dashboard',
  '/menu',
  '/orders',
  '/billing',
  '/expenses',
  '/reports',
  '/settings',
  '/inventory',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets/API bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;
  const session = token ? await verifyJWT(token) : null;
  const isLoggedIn = !!session;

  // Protect internal REST API routes
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/login')) {
    if (!isLoggedIn) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized access. Log in to continue.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Redirect root path '/' to dashboard or login
  if (pathname === '/') {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  // Access control
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Prevent logged-in admin from visiting login page
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
