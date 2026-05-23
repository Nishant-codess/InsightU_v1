import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import bcrypt from 'bcrypt';
import { generateTokens } from '../services/auth/jwt';

const router = Router();

/**
 * Admin Login
 * POST /api/auth/admin-login
 */
router.post('/admin-login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { message: 'Email and password are required' }
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { admin: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(401).json({
        error: { message: 'Invalid admin credentials' }
      });
    }

    // Verify password
    if (!user.passwordHash) {
      return res.status(401).json({
        error: { message: 'Invalid admin credentials' }
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: { message: 'Invalid admin credentials' }
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role as any, user.email);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    console.log(`[Admin Login] Success for: ${email}`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        admin: user.admin
      },
      accessToken,
      refreshToken
    });
  } catch (error: any) {
    console.error('[Admin Login] Error:', error);
    res.status(500).json({
      error: { message: error.message || 'Admin login failed' }
    });
  }
});

export default router;
