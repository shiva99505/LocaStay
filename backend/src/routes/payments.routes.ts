/**
 * GET   /api/payments           — payment history (tenant or landlord scope)
 * PATCH /api/payments/:id       — mark rent as paid
 */
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/payments?scope=landlord OR scope=tenant (default)
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const scope = req.query.scope as string;

  if (scope === 'landlord') {
    const lp = await prisma.landlordProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!lp) { res.status(400).json({ error: 'Landlord profile not found' }); return; }

    const data = await prisma.rentPayment.findMany({
      where:   { property: { landlordId: lp.id } },
      include: {
        tenant:   { select: { name: true, phone: true } },
        property: { select: { title: true } },
      },
      orderBy: { dueDate: 'desc' },
    });
    res.json({ data });
  } else {
    const data = await prisma.rentPayment.findMany({
      where:   { tenantId: user.id },
      include: { property: { select: { title: true, coverImage: true } } },
      orderBy: { dueDate: 'desc' },
    });
    res.json({ data });
  }
});

// PATCH /api/payments/:id — mark as paid
router.patch('/:id', authenticate, async (req: Request<{ id: string }>, res: Response) => {
  const { user } = req as AuthenticatedRequest;

  const payment = await prisma.rentPayment.findUnique({
    where:  { id: req.params.id },
    select: { tenantId: true, status: true, amount: true },
  });

  if (!payment) { res.status(404).json({ error: 'Payment not found' }); return; }
  if (payment.tenantId !== user.id && user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  if (payment.status === 'PAID') { res.status(409).json({ error: 'Already paid' }); return; }

  const receiptNumber = `LS-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 6).toUpperCase()}`;

  await prisma.rentPayment.update({
    where: { id: req.params.id },
    data: { status: 'PAID', paidDate: new Date(), receiptNumber },
  });

  await prisma.notification.create({
    data: {
      userId:  payment.tenantId,
      type:    'PAYMENT',
      title:   'Rent Payment Confirmed',
      message: `Your rent payment of ₹${payment.amount} has been recorded. Receipt: ${receiptNumber}`,
      link:    '/tenant/rent',
    },
  });

  res.json({ success: true, receipt_number: receiptNumber, paid_at: new Date().toISOString() });
});

export default router;
