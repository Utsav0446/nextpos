'use server';

import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import { getUserByEmail, updateAdminPassword } from '@/queries/auth';
import { loginSchema, LoginInput } from '@/schemas/auth';
import { signJWT } from '@/lib/jwt';
import { getCurrentUser } from '@/lib/auth';

/**
 * Validates credentials, verifies hash, and sets HttpOnly cookie.
 */
export async function loginAction(data: LoginInput) {
  const result = loginSchema.safeParse(data);
  if (!result.success) {
    return { error: 'Invalid input fields' };
  }

  const { email, password } = result.data;
  
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return { error: 'Invalid email or password' };
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return { error: 'Invalid email or password' };
    }

    const token = await signJWT({ id: user.id, email: user.email });
    
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return { success: true };
  } catch (error) {
    console.error('Login action error:', error);
    return { error: 'An error occurred during login. Check database connection.' };
  }
}

/**
 * Deletes the HttpOnly session token.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
  return { success: true };
}

/**
 * Changes password of the currently authenticated admin.
 */
export async function changePasswordAction(currentPassword: string, newPassword: string) {
  if (newPassword.length < 6) {
    return { error: 'New password must be at least 6 characters long' };
  }

  const admin = await getCurrentUser();
  if (!admin) {
    return { error: 'Session expired. Please log in again.' };
  }

  try {
    const user = await getUserByEmail(admin.email);
    if (!user) {
      return { error: 'User record not found.' };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return { error: 'Current password is incorrect.' };
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    
    await updateAdminPassword(user.id, newHash);
    
    return { success: true };
  } catch (error) {
    console.error('Change password action error:', error);
    return { error: 'Failed to update password.' };
  }
}
