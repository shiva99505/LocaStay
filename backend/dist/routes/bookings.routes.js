"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * POST   /api/bookings      — create booking request (TENANT)
 * GET    /api/bookings/:id  — get booking details
 * PATCH  /api/bookings/:id  — approve / reject (LANDLORD/ADMIN)
 * DELETE /api/bookings/:id  — cancel
 */
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../lib/db");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// POST /api/bookings
router.post('/', auth_middleware_1.authenticate, auth_middleware_1.requireTenant, async (req, res) => {
    const schema = zod_1.z.object({
        propertyId: zod_1.z.string().cuid(),
        moveInDate: zod_1.z.string().datetime(),
        durationMonths: zod_1.z.number().int().min(1).max(120).default(11),
        message: zod_1.z.string().max(500).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
    }
    const { user } = req;
    const property = await db_1.prisma.property.findUnique({
        where: { id: parsed.data.propertyId },
        select: { status: true, landlordId: true, title: true, landlord: { select: { userId: true } } },
    });
    if (!property) {
        res.status(404).json({ error: 'Property not found' });
        return;
    }
    if (property.status !== 'AVAILABLE') {
        res.status(409).json({ error: 'Property is not available for booking' });
        return;
    }
    const dup = await db_1.prisma.booking.findFirst({
        where: { tenantId: user.id, propertyId: parsed.data.propertyId, status: { in: ['PENDING', 'APPROVED'] } },
    });
    if (dup) {
        res.status(409).json({ error: 'You already have an active booking for this property' });
        return;
    }
    const booking = await db_1.prisma.booking.create({
        data: {
            tenantId: user.id,
            propertyId: parsed.data.propertyId,
            moveInDate: new Date(parsed.data.moveInDate),
            durationMonths: parsed.data.durationMonths,
            message: parsed.data.message,
            status: 'PENDING',
        },
    });
    // Notify landlord
    await db_1.prisma.notification.create({
        data: {
            userId: property.landlord.userId,
            type: 'BOOKING',
            title: 'New Booking Request',
            message: `${user.name ?? 'A tenant'} has requested to book "${property.title}".`,
            link: '/landlord/tenants',
        },
    });
    res.status(201).json({ data: booking });
});
// GET /api/bookings/:id
router.get('/:id', auth_middleware_1.authenticate, async (req, res) => {
    const { user } = req;
    const booking = await db_1.prisma.booking.findUnique({
        where: { id: req.params.id },
        include: {
            tenant: { select: { name: true, avatar: true, phone: true } },
            property: { select: { title: true, city: true, rent: true, landlordId: true, landlord: { select: { userId: true } } } },
        },
    });
    if (!booking) {
        res.status(404).json({ error: 'Booking not found' });
        return;
    }
    const isOwner = booking.tenantId === user.id;
    const isLandlord = booking.property.landlord.userId === user.id;
    if (!isOwner && !isLandlord && user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Access denied' });
        return;
    }
    res.json({ data: booking });
});
// PATCH /api/bookings/:id
router.patch('/:id', auth_middleware_1.authenticate, async (req, res) => {
    const schema = zod_1.z.object({
        action: zod_1.z.enum(['APPROVE', 'REJECT']),
        rejectionReason: zod_1.z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'action must be APPROVE or REJECT' });
        return;
    }
    const { user } = req;
    const booking = await db_1.prisma.booking.findUnique({
        where: { id: req.params.id },
        include: { property: { select: { landlordId: true, title: true, rent: true, deposit: true, landlord: { select: { userId: true, id: true } } } } },
    });
    if (!booking) {
        res.status(404).json({ error: 'Booking not found' });
        return;
    }
    if (booking.status !== 'PENDING') {
        res.status(409).json({ error: 'Booking is no longer pending' });
        return;
    }
    if (user.role !== 'ADMIN') {
        const lp = await db_1.prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
        if (!lp || lp.id !== booking.property.landlordId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
    }
    const newStatus = parsed.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await db_1.prisma.$transaction(async (tx) => {
        await tx.booking.update({
            where: { id: req.params.id },
            data: { status: newStatus, respondedAt: new Date(), rejectionReason: parsed.data.rejectionReason },
        });
        if (newStatus === 'APPROVED') {
            // Mark property occupied
            await tx.property.update({
                where: { id: booking.propertyId },
                data: { status: 'OCCUPIED', occupiedRooms: { increment: 1 } },
            });
            // Auto-create agreement draft
            await tx.agreement.create({
                data: {
                    tenantId: booking.tenantId,
                    landlordId: booking.property.landlordId,
                    propertyId: booking.propertyId,
                    bookingId: req.params.id,
                    rentAmount: booking.property.rent,
                    depositAmount: booking.property.deposit,
                    startDate: booking.moveInDate,
                    status: 'DRAFT',
                },
            });
        }
        // Notify tenant
        await tx.notification.create({
            data: {
                userId: booking.tenantId,
                type: 'BOOKING',
                title: newStatus === 'APPROVED' ? 'Booking Approved!' : 'Booking Rejected',
                message: newStatus === 'APPROVED'
                    ? `Your booking for "${booking.property.title}" has been approved.`
                    : `Your booking for "${booking.property.title}" was not approved.`,
                link: '/tenant/stay',
            },
        });
    });
    res.json({ success: true, status: newStatus });
});
// DELETE /api/bookings/:id
router.delete('/:id', auth_middleware_1.authenticate, async (req, res) => {
    const { user } = req;
    const booking = await db_1.prisma.booking.findUnique({
        where: { id: req.params.id },
        select: { tenantId: true, status: true },
    });
    if (!booking) {
        res.status(404).json({ error: 'Booking not found' });
        return;
    }
    if (booking.tenantId !== user.id && user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Access denied' });
        return;
    }
    if (!['PENDING', 'APPROVED'].includes(booking.status)) {
        res.status(409).json({ error: `Cannot cancel a booking in status: ${booking.status}` });
        return;
    }
    await db_1.prisma.booking.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=bookings.routes.js.map