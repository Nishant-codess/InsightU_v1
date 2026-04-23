import { Request, Response, NextFunction } from 'express';
import { validateToken, TokenPayload } from '../services/auth/jwt';

export interface AuthRequest extends Request {
  userAuth?: TokenPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header missing or invalid' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = validateToken(token);
    req.userAuth = payload;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Authentication failed' });
    return;
  }
};
