import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

// Protected pages
const protectedPaths = [
  '/dashboard',
  '/menu',
  '/orders',
  '/billing',
  '/expenses',
  '/reports',
  '/settings',
  '/tables',
  '/kitchen',
];

// Define role-based path permissions
const rolePermissions: Record<string, string[]> = {
  Admin: ['/dashboard', '/menu', '/orders', '/billing', '/expenses', '/reports', '/settings', '/tables', '/kitchen'],
  Cashier: ['/dashboard', '/tables', '/orders', '/billing', '/settings', '/kitchen'],
  Waiter: ['/tables', '/orders', '/kitchen'],
  Kitchen: ['/orders', '/kitchen'],
};

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
    
    // Check API route role limits
    const role = (session.role || 'Admin') as string;
    const isRestrictedApi = pathname.startsWith('/api/reports') || pathname.startsWith('/api/expenses');
    if (isRestrictedApi && (role === 'Waiter' || role === 'Kitchen')) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden: Insufficient privileges.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Redirect root path '/' based on role
  if (pathname === '/') {
    if (isLoggedIn) {
      const role = (session.role || 'Admin') as string;
      const allowedPaths = rolePermissions[role] || [];
      const landingPage = allowedPaths.includes('/dashboard') ? '/dashboard' : (allowedPaths[0] || '/');
      return NextResponse.redirect(new URL(landingPage, request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  // Access control check for protected pages
  if (isProtected) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    const role = (session.role || 'Admin') as string;
    const allowedPaths = rolePermissions[role] || [];
    const isAllowed = allowedPaths.some((path) => pathname.startsWith(path));
    
    if (!isAllowed) {
      // Redirect to their primary default path if they try to access an unauthorized section
      const fallback = allowedPaths.includes('/dashboard') ? '/dashboard' : (allowedPaths[0] || '/');
      return NextResponse.redirect(new URL(fallback, request.url));
    }
  }

  // Prevent logged-in user from visiting login page
  if (pathname === '/login' && isLoggedIn) {
    const role = (session.role || 'Admin') as string;
    const allowedPaths = rolePermissions[role] || [];
    const landingPage = allowedPaths.includes('/dashboard') ? '/dashboard' : (allowedPaths[0] || '/');
    return NextResponse.redirect(new URL(landingPage, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    }
  });
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/menu/:path*',
    '/orders/:path*',
    '/billing/:path*',
    '/expenses/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/tables/:path*',
    '/kitchen/:path*',
    '/api/:path*',
  ],
};
