import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { prisma } from '../lib/db';
import { AuthenticatedRequest, UserRole } from '../lib/types';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  let payload;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = await prisma.user.findUnique({
    where:  { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, isSuspended: true },
  });

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  if (user.isSuspended) {
    res.status(403).json({ error: 'Account suspended. Contact support.' });
    return;
  }

  (req as AuthenticatedRequest).user = {
    id:          user.id,
    email:       user.email,
    name:        user.name,
    role:        user.role as UserRole,
    isSuspended: user.isSuspended,
  };

  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
      return;
    }
    next();
  };
}

export const requireAdmin    = requireRole('ADMIN');
export const requireLandlord = requireRole('LANDLORD', 'ADMIN');
export const requireTenant   = requireRole('TENANT', 'ADMIN');
