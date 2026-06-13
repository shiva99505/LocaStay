"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * GET   /api/landlord/profile       — get landlord profile
 * PATCH /api/landlord/profile       — update landlord profile
 * GET   /api/landlord/dashboard     — dashboard stats
 * GET   /api/landlord/leads         — list leads
 * PATCH /api/landlord/leads/:id     — update lead status
 * POST  /api/landlord/remind/:tenantId — send rent reminder notification
 */
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../lib/db");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, auth_middleware_1.requireLandlord);
// GET /api/landlord/profile
router.get('/profile', async (req, res) => {
    const { user } = req;
    const profile = await db_1.prisma.landlordProfile.findUnique({
        where: { userId: user.id },
        include: { user: { select: { name: true, email: true, phone: true, avatar: true, isVerified: true } } },
    });
    res.json({ data: profile });
});
// PATCH /api/landlord/profile
router.patch('/profile', async (req, res) => {
    const schema = zod_1.z.object({
        businessName: zod_1.z.string().trim().max(100).optional(),
        bio: zod_1.z.string().max(500).optional(),
        address: zod_1.z.string().trim().optional(),
        city: zod_1.z.string().trim().optional(),
        state: zod_1.z.string().trim().optional(),
        bankAccount: zod_1.z.string().trim().optional(),
        ifscCode: zod_1.z.string().trim().optional(),
        upiId: zod_1.z.string().trim().optional(),
        panNumber: zod_1.z.string().trim().optional(),
        gstNumber: zod_1.z.string().trim().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
    }
    const { user } = req;
    const updated = await db_1.prisma.landlordProfile.update({
        where: { userId: user.id },
        data: parsed.data,
    });
    res.json({ data: updated });
});
// GET /api/landlord/dashboard
router.get('/dashboard', async (req, res) => {
    const { user } = req;
    const lp = await db_1.prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!lp) {
        res.status(400).json({ error: 'Landlord profile not found' });
        return;
    }
    const [properties, pendingBookings, pendingRent, newLeads] = await Promise.all([
        db_1.prisma.property.findMany({
            where: { landlordId: lp.id },
            select: { id: true, status: true, rent: true, occupiedRooms: true, totalRooms: true, views: true, rating: true },
        }),
        db_1.prisma.booking.count({ where: { property: { landlordId: lp.id }, status: 'PENDING' } }),
        db_1.prisma.rentPayment.count({ where: { property: { landlordId: lp.id }, status: { in: ['PENDING', 'OVERDUE'] } } }),
        db_1.prisma.lead.count({ where: { landlordId: lp.id, status: 'NEW' } }),
    ]);
    const totalRent = properties.reduce((s, p) => s + p.rent, 0);
    const occupied = properties.filter((p) => p.status === 'OCCUPIED').length;
    const available = properties.filter((p) => p.status === 'AVAILABLE').length;
    const totalViews = properties.reduce((s, p) => s + p.views, 0);
    res.json({
        total_properties: properties.length,
        occupied,
        available,
        total_rent: totalRent,
        total_views: totalViews,
        pending_bookings: pendingBookings,
        pending_rent: pendingRent,
        new_leads: newLeads,
    });
});
// GET /api/landlord/leads
router.get('/leads', async (req, res) => {
    const { user } = req;
    const lp = await db_1.prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!lp) {
        res.status(400).json({ error: 'Landlord profile not found' });
        return;
    }
    const leads = await db_1.prisma.lead.findMany({
        where: { landlordId: lp.id },
        include: {
            tenant: { select: { name: true, phone: true } },
            property: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ data: leads });
});
// PATCH /api/landlord/leads/:id
router.patch('/leads/:id', async (req, res) => {
    const schema = zod_1.z.object({ status: zod_1.z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid status' });
        return;
    }
    const { user } = req;
    const lp = await db_1.prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    const lead = await db_1.prisma.lead.findUnique({ where: { id: req.params.id }, select: { landlordId: true } });
    if (!lead || lead.landlordId !== lp?.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
    }
    const updated = await db_1.prisma.lead.update({
        where: { id: req.params.id },
        data: { status: parsed.data.status },
    });
    res.json({ data: updated });
});
// POST /api/landlord/remind/:tenantId
router.post('/remind/:tenantId', async (req, res) => {
    const { user } = req;
    const lp = await db_1.prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!lp) {
        res.status(400).json({ error: 'Landlord profile not found' });
        return;
    }
    const overduePayments = await db_1.prisma.rentPayment.findMany({
        where: {
            tenantId: req.params.tenantId,
            status: { in: ['PENDING', 'OVERDUE'] },
            property: { landlordId: lp.id },
        },
        select: { id: true },
    });
    if (!overduePayments.length) {
        res.status(400).json({ error: 'No pending/overdue payments found for this tenant' });
        return;
    }
    await db_1.prisma.notification.create({
        data: {
            userId: req.params.tenantId,
            type: 'PAYMENT',
            title: 'Rent Reminder',
            message: `Friendly reminder: You have ${overduePayments.length} pending rent payment(s). Please pay at your earliest convenience.`,
            link: '/tenant/rent',
        },
    });
    res.json({ success: true, payments_reminded: overduePayments.length });
});
exports.default = router;
//# sourceMappingURL=landlord.routes.js.map