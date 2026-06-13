"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * GET    /api/properties          — list with filters (public)
 * POST   /api/properties          — create (LANDLORD)
 * GET    /api/properties/:id      — single property + reviews (public)
 * PATCH  /api/properties/:id      — update (LANDLORD owner or ADMIN)
 * DELETE /api/properties/:id      — soft-delist
 * GET    /api/properties/:id/save — check saved status
 * POST   /api/properties/:id/save — toggle save
 */
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../lib/db");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/properties
router.get('/', async (req, res) => {
    const { type, city, state, minRent, maxRent, rooms, search, page = '1', limit = '12' } = req.query;
    const pageNum = Math.max(1, Number(page));
    const pageSize = Math.min(50, Math.max(1, Number(limit)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where = {
        status: { in: ['AVAILABLE', 'OCCUPIED'] },
        ...(type && { type }),
        ...(state && { state }),
        ...(city && { city: { contains: city } }),
        ...(minRent && { rent: { gte: Number(minRent) } }),
        ...(maxRent && { rent: { lte: Number(maxRent) } }),
        ...(rooms && { totalRooms: { gte: Number(rooms) } }),
        ...(search && {
            OR: [
                { title: { contains: search } },
                { city: { contains: search } },
                { village: { contains: search } },
            ],
        }),
    };
    const [data, total] = await Promise.all([
        db_1.prisma.property.findMany({
            where,
            select: {
                id: true, title: true, type: true, rent: true, deposit: true,
                city: true, state: true, village: true, coverImage: true, images: true,
                rating: true, reviewCount: true, isVerified: true, isFeatured: true,
                totalRooms: true, occupiedRooms: true, latitude: true, longitude: true,
                status: true, landlordId: true, createdAt: true,
            },
            orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
            skip: (pageNum - 1) * pageSize,
            take: pageSize,
        }),
        db_1.prisma.property.count({ where }),
    ]);
    res.json({ data, page: pageNum, limit: pageSize, total });
});
// POST /api/properties
router.post('/', auth_middleware_1.authenticate, auth_middleware_1.requireLandlord, async (req, res) => {
    const schema = zod_1.z.object({
        title: zod_1.z.string().trim().min(5),
        type: zod_1.z.enum(['HOUSE', 'PG', 'HOSTEL', 'FLAT', 'ROOM', 'FARMHOUSE']),
        description: zod_1.z.string().trim().optional(),
        rent: zod_1.z.number().positive(),
        deposit: zod_1.z.number().min(0).default(0),
        address: zod_1.z.string().trim().min(5),
        village: zod_1.z.string().trim().optional(),
        city: zod_1.z.string().trim().min(2),
        state: zod_1.z.string().trim().min(2),
        pincode: zod_1.z.string().regex(/^\d{6}$/),
        latitude: zod_1.z.number().min(-90).max(90),
        longitude: zod_1.z.number().min(-180).max(180),
        totalRooms: zod_1.z.number().int().positive().default(1),
        availableFrom: zod_1.z.string().optional(),
        distanceToSchool: zod_1.z.number().min(0).optional(),
        distanceToHospital: zod_1.z.number().min(0).optional(),
        distanceToMarket: zod_1.z.number().min(0).optional(),
        distanceToBusStand: zod_1.z.number().min(0).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
    }
    const { user } = req;
    const lp = await db_1.prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!lp) {
        res.status(400).json({ error: 'Landlord profile not found' });
        return;
    }
    const { availableFrom, ...rest } = parsed.data;
    const property = await db_1.prisma.property.create({
        data: {
            ...rest,
            landlordId: lp.id,
            status: 'PENDING',
            availableFrom: availableFrom ? new Date(availableFrom) : new Date(),
        },
    });
    res.status(201).json({ data: property });
});
// GET /api/properties/:id
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const [property, reviews] = await Promise.all([
        db_1.prisma.property.findUnique({
            where: { id },
            include: { landlord: { include: { user: { select: { name: true, avatar: true, phone: true } } } } },
        }),
        db_1.prisma.review.findMany({
            where: { propertyId: id },
            include: { tenant: { select: { name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20,
        }),
    ]);
    if (!property) {
        res.status(404).json({ error: 'Property not found' });
        return;
    }
    db_1.prisma.property.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => { });
    res.json({ data: property, reviews });
});
// PATCH /api/properties/:id
router.patch('/:id', auth_middleware_1.authenticate, async (req, res) => {
    const { id } = req.params;
    const { user } = req;
    const property = await db_1.prisma.property.findUnique({ where: { id }, select: { landlordId: true } });
    if (!property) {
        res.status(404).json({ error: 'Property not found' });
        return;
    }
    if (user.role !== 'ADMIN') {
        const lp = await db_1.prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
        if (!lp || lp.id !== property.landlordId) {
            res.status(403).json({ error: 'You do not own this property' });
            return;
        }
    }
    const SAFE = ['title', 'description', 'rent', 'deposit', 'totalRooms', 'address',
        'coverImage', 'village', 'city', 'state', 'pincode',
        'distanceToSchool', 'distanceToHospital', 'distanceToMarket', 'distanceToBusStand'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => SAFE.includes(k)));
    const updated = await db_1.prisma.property.update({ where: { id }, data: updates });
    res.json({ data: updated });
});
// DELETE /api/properties/:id
router.delete('/:id', auth_middleware_1.authenticate, async (req, res) => {
    const { id } = req.params;
    const { user } = req;
    const property = await db_1.prisma.property.findUnique({ where: { id }, select: { landlordId: true } });
    if (!property) {
        res.status(404).json({ error: 'Property not found' });
        return;
    }
    if (user.role !== 'ADMIN') {
        const lp = await db_1.prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
        if (!lp || lp.id !== property.landlordId) {
            res.status(403).json({ error: 'You do not own this property' });
            return;
        }
    }
    await db_1.prisma.property.update({ where: { id }, data: { status: 'DELISTED' } });
    res.json({ success: true });
});
// GET /api/properties/:id/save
router.get('/:id/save', auth_middleware_1.authenticate, async (req, res) => {
    const { user } = req;
    const saved = await db_1.prisma.savedProperty.findUnique({
        where: { userId_propertyId: { userId: user.id, propertyId: req.params.id } },
    });
    res.json({ saved: !!saved });
});
// POST /api/properties/:id/save
router.post('/:id/save', auth_middleware_1.authenticate, async (req, res) => {
    const { user } = req;
    const key = { userId: user.id, propertyId: req.params.id };
    const existing = await db_1.prisma.savedProperty.findUnique({ where: { userId_propertyId: key } });
    if (existing) {
        await db_1.prisma.savedProperty.delete({ where: { userId_propertyId: key } });
        res.json({ saved: false });
    }
    else {
        await db_1.prisma.savedProperty.create({ data: key });
        res.json({ saved: true });
    }
});
exports.default = router;
//# sourceMappingURL=properties.routes.js.map