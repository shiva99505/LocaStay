"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * GET   /api/admin/dashboard          — stats overview
 * GET   /api/admin/users              — list users (paginated)
 * PATCH /api/admin/users/:id          — verify / suspend / unsuspend
 * GET   /api/admin/properties         — list all properties
 * PATCH /api/admin/properties/:id     — approve / reject
 * GET   /api/admin/bookings           — list all bookings
 * GET   /api/admin/support            — list support tickets
 * PATCH /api/admin/support/:id        — resolve / update ticket
 */
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../lib/db");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, auth_middleware_1.requireAdmin);
// GET /api/admin/dashboard
router.get('/dashboard', async (_req, res) => {
    const [totalUsers, totalProperties, pendingProperties, totalBookings, openTickets] = await Promise.all([
        db_1.prisma.user.count(),
        db_1.prisma.property.count(),
        db_1.prisma.property.count({ where: { status: 'PENDING' } }),
        db_1.prisma.booking.count(),
        db_1.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    ]);
    res.json({ totalUsers, totalProperties, pendingProperties, totalBookings, openTickets });
});
// GET /api/admin/users
router.get('/users', async (req, res) => {
    const { role, search, page = '1' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const size = 20;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where = {
        ...(role && { role }),
        ...(search && {
            OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
            ],
        }),
    };
    const [data, total] = await Promise.all([
        db_1.prisma.user.findMany({
            where,
            select: {
                id: true, name: true, email: true, phone: true, role: true,
                isVerified: true, isSuspended: true, createdAt: true,
                profile: { select: { kycStatus: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (pageNum - 1) * size,
            take: size,
        }),
        db_1.prisma.user.count({ where }),
    ]);
    res.json({ data, total, page: pageNum });
});
// PATCH /api/admin/users/:id
router.patch('/users/:id', async (req, res) => {
    const schema = zod_1.z.object({ action: zod_1.z.enum(['VERIFY', 'SUSPEND', 'UNSUSPEND']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'action must be VERIFY, SUSPEND, or UNSUSPEND' });
        return;
    }
    const target = await db_1.prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!target) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    const { action } = parsed.data;
    if (action === 'VERIFY') {
        await db_1.prisma.$transaction([
            db_1.prisma.user.update({ where: { id: req.params.id }, data: { isVerified: true } }),
            db_1.prisma.profile.upsert({
                where: { userId: req.params.id },
                update: { kycStatus: 'VERIFIED' },
                create: { userId: req.params.id, kycStatus: 'VERIFIED' },
            }),
        ]);
    }
    else {
        await db_1.prisma.user.update({
            where: { id: req.params.id },
            data: { isSuspended: action === 'SUSPEND' },
        });
    }
    const NOTIF = {
        VERIFY: { title: 'Account Verified', message: 'Your account has been verified by LocaStay admin.' },
        SUSPEND: { title: 'Account Suspended', message: 'Your account has been suspended. Contact support.' },
        UNSUSPEND: { title: 'Account Reinstated', message: 'Your account suspension has been lifted. Welcome back!' },
    };
    await db_1.prisma.notification.create({
        data: { userId: req.params.id, type: 'GENERAL', ...NOTIF[action] },
    });
    const { user: adminUser } = req;
    await db_1.prisma.auditLog.create({
        data: {
            actorId: adminUser.id,
            action: action === 'VERIFY' ? 'VERIFY_KYC' : action === 'SUSPEND' ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
            entityType: 'USER',
            entityId: req.params.id,
        },
    });
    res.json({ success: true });
});
// GET /api/admin/properties
router.get('/properties', async (req, res) => {
    const { status, page = '1' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const size = 20;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
        db_1.prisma.property.findMany({
            where,
            select: {
                id: true, title: true, type: true, city: true, state: true,
                status: true, rent: true, landlordId: true, createdAt: true,
                landlord: { select: { user: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (pageNum - 1) * size,
            take: size,
        }),
        db_1.prisma.property.count({ where }),
    ]);
    res.json({ data, total, page: pageNum });
});
// PATCH /api/admin/properties/:id
router.patch('/properties/:id', async (req, res) => {
    const schema = zod_1.z.object({
        action: zod_1.z.enum(['APPROVE', 'REJECT']),
        reason: zod_1.z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'action must be APPROVE or REJECT' });
        return;
    }
    const property = await db_1.prisma.property.findUnique({
        where: { id: req.params.id },
        select: { title: true, landlordId: true, landlord: { select: { userId: true } } },
    });
    if (!property) {
        res.status(404).json({ error: 'Property not found' });
        return;
    }
    const newStatus = parsed.data.action === 'APPROVE' ? 'AVAILABLE' : 'REJECTED';
    await db_1.prisma.property.update({
        where: { id: req.params.id },
        data: { status: newStatus, ...(parsed.data.reason ? { rejectionReason: parsed.data.reason } : {}) },
    });
    await db_1.prisma.notification.create({
        data: {
            userId: property.landlord.userId,
            type: 'PROPERTY',
            title: newStatus === 'AVAILABLE' ? 'Property Approved!' : 'Property Rejected',
            message: newStatus === 'AVAILABLE'
                ? `Your property "${property.title}" has been approved and is now live.`
                : `Your property "${property.title}" was rejected. ${parsed.data.reason ? 'Reason: ' + parsed.data.reason : ''}`,
            link: '/landlord/properties',
        },
    });
    const { user: adminUser } = req;
    await db_1.prisma.auditLog.create({
        data: {
            actorId: adminUser.id,
            action: parsed.data.action === 'APPROVE' ? 'APPROVE_PROPERTY' : 'REJECT_PROPERTY',
            entityType: 'PROPERTY',
            entityId: req.params.id,
        },
    });
    res.json({ success: true, status: newStatus });
});
// GET /api/admin/bookings
router.get('/bookings', async (req, res) => {
    const { status, page = '1' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const size = 20;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where = status ? { status } : {};
    const [data, total] = await Promise.all([
        db_1.prisma.booking.findMany({
            where,
            include: {
                tenant: { select: { name: true, phone: true } },
                property: { select: { title: true, city: true } },
            },
            orderBy: { requestedAt: 'desc' },
            skip: (pageNum - 1) * size,
            take: size,
        }),
        db_1.prisma.booking.count({ where }),
    ]);
    res.json({ data, total, page: pageNum });
});
// GET /api/admin/support
router.get('/support', async (req, res) => {
    const { status = 'OPEN', page = '1' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const size = 20;
    const [data, total] = await Promise.all([
        db_1.prisma.supportTicket.findMany({
            where: { status },
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            skip: (pageNum - 1) * size,
            take: size,
        }),
        db_1.prisma.supportTicket.count({ where: { status } }),
    ]);
    res.json({ data, total, page: pageNum });
});
// PATCH /api/admin/support/:id
router.patch('/support/:id', async (req, res) => {
    const schema = zod_1.z.object({
        status: zod_1.z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
        response: zod_1.z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input' });
        return;
    }
    const ticket = await db_1.prisma.supportTicket.findUnique({
        where: { id: req.params.id },
        select: { userId: true },
    });
    if (!ticket) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
    }
    await db_1.prisma.supportTicket.update({
        where: { id: req.params.id },
        data: { status: parsed.data.status },
    });
    if (parsed.data.response) {
        await db_1.prisma.$transaction([
            db_1.prisma.ticketMessage.create({
                data: {
                    ticketId: req.params.id,
                    senderId: req.user.id,
                    message: parsed.data.response,
                    isStaff: true,
                },
            }),
            db_1.prisma.notification.create({
                data: {
                    userId: ticket.userId,
                    type: 'GENERAL',
                    title: 'Support Ticket Updated',
                    message: `Your support ticket has been updated: ${parsed.data.response}`,
                    link: '/tenant/support',
                },
            }),
        ]);
    }
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map