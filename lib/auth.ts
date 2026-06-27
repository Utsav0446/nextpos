import { cookies } from 'next/headers';
import { verifyJWT } from './jwt';

/**
 * Retrieves the session payload from the 'auth_token' cookie.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJWT(token);
}

/**
 * Retrieves the logged-in admin details, or null if unauthenticated.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return {
    id: session.id as number,
    email: session.email as string,
  };
}

/**
 * Helper to check if the current user session is valid.
 */
export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}
