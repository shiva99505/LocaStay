"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * GET   /api/reviews?propertyId= — list reviews for a property
 * POST  /api/reviews             — create review (tenant with APPROVED booking)
 * PATCH /api/reviews/:id         — update review / add landlord reply
 * DELETE /api/reviews/:id        — delete review
 */
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../lib/db");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/reviews
router.get('/', async (req, res) => {
    const propertyId = req.query.propertyId;
    if (!propertyId) {
        res.status(400).json({ error: 'propertyId query param is required' });
        return;
    }
    const data = await db_1.prisma.review.findMany({
        where: { propertyId },
        include: { tenant: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ data });
});
// POST /api/reviews
router.post('/', auth_middleware_1.authenticate, async (req, res) => {
    const schema = zod_1.z.object({
        propertyId: zod_1.z.string().cuid(),
        rating: zod_1.z.number().int().min(1).max(5),
        comment: zod_1.z.string().trim().min(10).max(1000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
    }
    const { user } = req;
    const booking = await db_1.prisma.booking.findFirst({
        where: { tenantId: user.id, propertyId: parsed.data.propertyId, status: 'APPROVED' },
        select: { id: true },
    });
    if (!booking) {
        res.status(403).json({ error: 'You can only review a property you have an approved booking for' });
        return;
    }
    const dup = await db_1.prisma.review.findFirst({
        where: { tenantId: user.id, propertyId: parsed.data.propertyId },
    });
    if (dup) {
        res.status(409).json({ error: 'You have already reviewed this property' });
        return;
    }
    const data = await db_1.prisma.review.create({
        data: {
            tenantId: user.id,
            propertyId: parsed.data.propertyId,
            rating: parsed.data.rating,
            comment: parsed.data.comment,
        },
    });
    // Update property rating average
    const allReviews = await db_1.prisma.review.findMany({
        where: { propertyId: parsed.data.propertyId },
        select: { rating: true },
    });
    const avgRating = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await db_1.prisma.property.update({
        where: { id: parsed.data.propertyId },
        data: { rating: Math.round(avgRating * 10) / 10, reviewCount: allReviews.length },
    });
    res.status(201).json({ data });
});
// PATCH /api/reviews/:id
router.patch('/:id', auth_middleware_1.authenticate, async (req, res) => {
    const { user } = req;
    const review = await db_1.prisma.review.findUnique({
        where: { id: req.params.id },
        include: { property: { select: { landlordId: true, landlord: { select: { userId: true } } } } },
    });
    if (!review) {
        res.status(404).json({ error: 'Review not found' });
        return;
    }
    const isAuthor = review.tenantId === user.id;
    const isLandlord = review.property.landlord.userId === user.id;
    if (!isAuthor && !isLandlord && user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Access denied' });
        return;
    }
    const updates = {};
    if ((isAuthor || user.role === 'ADMIN') && req.body.rating)
        updates.rating = Number(req.body.rating);
    if ((isAuthor || user.role === 'ADMIN') && req.body.comment)
        updates.comment = req.body.comment;
    if ((isLandlord || user.role === 'ADMIN') && req.body.landlordReply) {
        updates.landlordReply = req.body.landlordReply;
    }
    const data = await db_1.prisma.review.update({ where: { id: req.params.id }, data: updates });
    res.json({ data });
});
// DELETE /api/reviews/:id
router.delete('/:id', auth_middleware_1.authenticate, async (req, res) => {
    const { user } = req;
    const review = await db_1.prisma.review.findUnique({
        where: { id: req.params.id },
        select: { tenantId: true },
    });
    if (!review) {
        res.status(404).json({ error: 'Review not found' });
        return;
    }
    if (review.tenantId !== user.id && user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Access denied' });
        return;
    }
    await db_1.prisma.review.delete({ where: { id: req.params.id } });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=reviews.routes.js.map