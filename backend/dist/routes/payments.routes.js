"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * GET   /api/payments           — payment history (tenant or landlord scope)
 * PATCH /api/payments/:id       — mark rent as paid
 */
const express_1 = require("express");
const db_1 = require("../lib/db");
const auth_middleware_1 = require("../middleware/auth.middleware");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// GET /api/payments?scope=landlord OR scope=tenant (default)
router.get('/', auth_middleware_1.authenticate, async (req, res) => {
    const { user } = req;
    const scope = req.query.scope;
    if (scope === 'landlord') {
        const lp = await db_1.prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
        if (!lp) {
            res.status(400).json({ error: 'Landlord profile not found' });
            return;
        }
        const data = await db_1.prisma.rentPayment.findMany({
            where: { property: { landlordId: lp.id } },
            include: {
                tenant: { select: { name: true, phone: true } },
                property: { select: { title: true } },
            },
            orderBy: { dueDate: 'desc' },
        });
        res.json({ data });
    }
    else {
        const data = await db_1.prisma.rentPayment.findMany({
            where: { tenantId: user.id },
            include: { property: { select: { title: true, coverImage: true } } },
            orderBy: { dueDate: 'desc' },
        });
        res.json({ data });
    }
});
// PATCH /api/payments/:id — mark as paid
router.patch('/:id', auth_middleware_1.authenticate, async (req, res) => {
    const { user } = req;
    const payment = await db_1.prisma.rentPayment.findUnique({
        where: { id: req.params.id },
        select: { tenantId: true, status: true, amount: true },
    });
    if (!payment) {
        res.status(404).json({ error: 'Payment not found' });
        return;
    }
    if (payment.tenantId !== user.id && user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Access denied' });
        return;
    }
    if (payment.status === 'PAID') {
        res.status(409).json({ error: 'Already paid' });
        return;
    }
    const receiptNumber = `LS-${Date.now().toString(36).toUpperCase()}-${(0, uuid_1.v4)().slice(0, 6).toUpperCase()}`;
    await db_1.prisma.rentPayment.update({
        where: { id: req.params.id },
        data: { status: 'PAID', paidDate: new Date(), receiptNumber },
    });
    await db_1.prisma.notification.create({
        data: {
            userId: payment.tenantId,
            type: 'PAYMENT',
            title: 'Rent Payment Confirmed',
            message: `Your rent payment of ₹${payment.amount} has been recorded. Receipt: ${receiptNumber}`,
            link: '/tenant/rent',
        },
    });
    res.json({ success: true, receipt_number: receiptNumber, paid_at: new Date().toISOString() });
});
exports.default = router;
//# sourceMappingURL=payments.routes.js.map