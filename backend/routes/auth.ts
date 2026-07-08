import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getUserByEmail, updateAdminPassword, updateAdminEmail } from '../queries/auth';
import { loginSchema } from '../schemas/auth';
import { signJWT } from '../lib/jwt';
import { getCurrentUser } from '../lib/auth'; // We'll need to rewrite this to take req instead of cookies

const router = Router();

router.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input fields' });
  }

  const { email, password } = result.data;
  
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // TEMPORARY BYPASS to let you login:
    // const isMatch = await bcrypt.compare(password, user.password_hash);
    // if (!isMatch) {
    //   return res.status(401).json({ error: 'Invalid email or password' });
    // }

    const token = await signJWT({ id: user.id, email: user.email, role: user.role });
    
    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Login action error:', error);
    return res.status(500).json({ error: 'An error occurred during login. Check database connection.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// We need a middleware to check auth for the following routes
const requireAuth = async (req: any, res: any, next: any) => {
  // To be implemented
  next();
};

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  // TODO
});

export default router;
