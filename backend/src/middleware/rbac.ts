import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../services/auth/jwt';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
    email: string;
  };
}

/**
 * Middleware to check if the authenticated user has one of the required roles
 * @param requiredRoles Array of allowed UserRoles
 */
export const checkPermission = (requiredRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
