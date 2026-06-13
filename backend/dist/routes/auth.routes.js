"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * POST /api/auth/register  — create account (TENANT or LANDLORD)
 * POST /api/auth/login     — email + password → JWT
 * GET  /api/auth/me        — current user (requires Bearer token)
 * POST /api/auth/refresh   — issue new token (re-validates user in DB)
 */
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const db_1 = require("../lib/db");
const jwt_1 = require("../lib/jwt");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().trim().toLowerCase().email('Invalid email'),
    phone: zod_1.z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    role: zod_1.z.enum(['TENANT', 'LANDLORD']),
    language: zod_1.z.enum(['en', 'hi', 'mr', 'gu', 'pa']).default('en'),
});
// POST /api/auth/register
router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
    }
    const { name, email, phone, password, role, language } = parsed.data;
    const existing = await db_1.prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] },
        select: { email: true, phone: true },
    });
    if (existing) {
        const field = existing.email === email ? 'email' : 'phone number';
        res.status(409).json({ error: `An account with this ${field} already exists.` });
        return;
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const user = await db_1.prisma.user.create({
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
    const token = (0, jwt_1.signToken)({ sub: user.id, email, role, name });
    res.status(201).json({ success: true, userId: user.id, access_token: token });
});
// POST /api/auth/login
router.post('/login', async (req, res) => {
    const schema = zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }
    const user = await db_1.prisma.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true, email: true, name: true, role: true, passwordHash: true, avatar: true, isSuspended: true },
    });
    if (!user || !user.passwordHash) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }
    const valid = await bcryptjs_1.default.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }
    if (user.isSuspended) {
        res.status(403).json({ error: 'Account suspended. Contact support.' });
        return;
    }
    await db_1.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = (0, jwt_1.signToken)({ sub: user.id, email: user.email, role: user.role, name: user.name });
    res.json({
        access_token: token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
    });
});
// GET /api/auth/me
router.get('/me', auth_middleware_1.authenticate, (req, res) => {
    const { user } = req;
    res.json({ user });
});
// POST /api/auth/refresh
router.post('/refresh', auth_middleware_1.authenticate, (req, res) => {
    const { user } = req;
    const token = (0, jwt_1.signToken)({ sub: user.id, email: user.email, role: user.role, name: user.name });
    res.json({ access_token: token });
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map