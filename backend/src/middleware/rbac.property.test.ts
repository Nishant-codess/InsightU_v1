import fc from 'fast-check';
import { Response, NextFunction } from 'express';
import { checkPermission, AuthenticatedRequest } from './rbac';
import { UserRole } from '../services/auth/jwt';

describe('Feature: insightu-platform, Property 6: Role-based access control', () => {
  it('should allow access if user has required role and reject otherwise', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(UserRole)), // User's actual role
        fc.array(fc.constantFrom(...Object.values(UserRole)), { minLength: 1 }), // Required roles
        (userRole, requiredRoles) => {
          const req = {
            user: {
              userId: 'user123',
              role: userRole,
              email: 'test@example.com',
            },
          } as AuthenticatedRequest;

          const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
          } as unknown as Response;

          const next = jest.fn() as NextFunction;

          const middleware = checkPermission(requiredRoles);
          middleware(req, res, next);

          if (requiredRoles.includes(userRole)) {
            // Should be allowed
            expect(next).toHaveBeenCalledTimes(1);
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
          } else {
            // Should be forbidden
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Insufficient permissions' });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject access if no user is authenticated', () => {
    const req = {} as AuthenticatedRequest; // No req.user

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    const middleware = checkPermission([UserRole.STUDENT]);
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: User not authenticated' });
  });
});
