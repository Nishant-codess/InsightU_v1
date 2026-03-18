import { Router, Request, Response } from 'express';
import passport from 'passport';
import { initiateGoogleOAuth, handleGoogleCallback } from '../services/auth/oauth';

import { registerWithEmail, loginWithEmail } from '../services/auth/emailAuth';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const result = await registerWithEmail(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: {
        code: 'REGISTRATION_FAILED',
        message: error instanceof Error ? error.message : 'Registration failed',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const result = await loginWithEmail(req.body);
    res.json(result);
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'LOGIN_FAILED',
        message: error instanceof Error ? error.message : 'Invalid credentials',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get('/google', (_req: Request, res: Response) => {
  try {
    const { url } = initiateGoogleOAuth();
    res.json({ url });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'OAUTH_INIT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to initiate OAuth',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.query.code as string;

    if (!code) {
      res.status(400).json({
        error: {
          code: 'MISSING_AUTH_CODE',
          message: 'Authorization code is required',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const result = await handleGoogleCallback(code);

    // Return tokens and user data
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'OAUTH_CALLBACK_FAILED',
        message: error instanceof Error ? error.message : 'OAuth callback failed',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * Alternative: Using Passport.js middleware directly
 * This is kept for reference but not used in the current implementation
 */
router.get(
  '/google/passport',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback/passport',
  passport.authenticate('google', { session: false }),
  (req: Request, res: Response) => {
    // User is available in req.user after successful authentication
    const user = req.user as any;
    
    // In a real implementation, you would generate tokens here
    res.json({
      message: 'Authentication successful',
      user,
    });
  }
);

export default router;
