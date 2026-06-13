/**
 * POST /api/auth/register  — create account (TENANT or LANDLORD)
 * POST /api/auth/login     — email + password → JWT
 * GET  /api/auth/me        — current user (requires Bearer token)
 * POST /api/auth/refresh   — issue new token (re-validates user in DB)
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/db';
import { signToken } from '../lib/jwt';
import { authenticate } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../lib/types';

const router = Router();

const registerSchema = z.object({
  name:     z.string().trim().min(2, 'Name must be at least 2 characters'),
  email:    z.string().trim().toLowerCase().email('Invalid email'),
  phone:    z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role:     z.enum(['TENANT', 'LANDLORD']),
  language: z.enum(['en', 'hi', 'mr', 'gu', 'pa']).default('en'),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { name, email, phone, password, role, language } = parsed.data;

  const existing = await prisma.user.findFirst({
    where:  { OR: [{ email }, { phone }] },
    select: { email: true, phone: true },
  });
  if (existing) {
    const field = existing.email === email ? 'email' : 'phone number';
    res.status(409).json({ error: `An account with this ${field} already exists.` });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name, email, phone, passwordHash, role, language,
      profile: { create: { kycStatus: 'PENDING' } },
      ...(role === 'LANDLORD' ? { landlordProfile: { create: {} } } : {}),
      notifications: {
        create: {
          type: 'GENERAL',
          title: 'Welcome to LocaStay!',
          message: `Hi ${name}, your account has been created. Complete your profile to get started.`,
        },
      },
    },
    select: { id: true },
  });

  const token = signToken({ sub: user.id, email, role, name });
  res.status(201).json({ success: true, userId: user.id, access_token: token });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const schema = z.object({
    email:    z.string().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({
    where:  { email: parsed.data.email },
    select: { id: true, email: true, name: true, role: true, passwordHash: true, avatar: true, isSuspended: true },
  });

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (user.isSuspended) {
    res.status(403).json({ error: 'Account suspended. Contact support.' });
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
  res.json({
    access_token: token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  res.json({ user });
});

// POST /api/auth/refresh
router.post('/refresh', authenticate, (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
  res.json({ access_token: token });
});

export default router;
