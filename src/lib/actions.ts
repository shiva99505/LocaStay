'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type ActionResult<T = unknown> = { success: boolean; error?: string; data?: T };

// ── TENANT ACTIONS ──────────────────────────────────────────────────────────

export async function bookProperty(
  propertyId: string,
  moveInDate: string,
  durationMonths: number,
  message?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return { success: false, error: 'Unauthorized' };
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { landlord: { include: { user: { select: { id: true } } } } },
  });
  if (!property) return { success: false, error: 'Property not found' };

  const existing = await prisma.booking.findFirst({
    where: { tenantId: session.user.id, propertyId, status: { in: ['PENDING', 'APPROVED'] } },
  });
  if (existing) return { success: false, error: 'You already have an active booking for this property.' };

  const tenant = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, phone: true },
  });

  const booking = await prisma.booking.create({
    data: {
      tenantId: session.user.id,
      propertyId,
      moveInDate: new Date(moveInDate),
      durationMonths,
      message: message?.trim() || undefined,
    },
  });

  // Create lead for landlord
  await prisma.lead.create({
    data: {
      landlordId: property.landlordId,
      propertyId,
      tenantId: session.user.id,
      name: tenant?.name ?? 'Unknown',
      phone: tenant?.phone ?? '',
      source: 'SITE_VISIT',
      message: message?.trim() || undefined,
      status: 'NEW',
    },
  });

  // Notify landlord
  await prisma.notification.create({
    data: {
      userId: property.landlord.user.id,
      type: 'BOOKING',
      title: 'New Booking Request',
      message: `${tenant?.name ?? 'A tenant'} has requested to book "${property.title}".`,
      link: '/landlord/tenants',
    },
  });

  revalidatePath('/tenant/stay');
  revalidatePath('/landlord');
  revalidatePath('/landlord/tenants');

  return { success: true, data: booking };
}

export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return { success: false, error: 'Unauthorized' };
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, tenantId: session.user.id },
  });
  if (!booking) return { success: false, error: 'Booking not found' };
  if (!['PENDING', 'APPROVED'].includes(booking.status)) {
    return { success: false, error: 'Cannot cancel this booking' };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
  });

  revalidatePath('/tenant/stay');
  revalidatePath('/landlord');
  revalidatePath('/landlord/tenants');

  return { success: true };
}

export async function saveProperty(propertyId: string): Promise<ActionResult<{ saved: boolean }>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Unauthorized' };

  const existing = await prisma.savedProperty.findUnique({
    where: { userId_propertyId: { userId: session.user.id, propertyId } },
  });

  if (existing) {
    await prisma.savedProperty.delete({ where: { id: existing.id } });
    revalidatePath('/tenant/saved');
    return { success: true, data: { saved: false } };
  } else {
    await prisma.savedProperty.create({ data: { userId: session.user.id, propertyId } });
    revalidatePath('/tenant/saved');
    return { success: true, data: { saved: true } };
  }
}

export async function initiatePayment(paymentId: string): Promise<ActionResult<{ receiptNumber: string }>> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return { success: false, error: 'Unauthorized' };
  }

  const payment = await prisma.rentPayment.findFirst({
    where: { id: paymentId, tenantId: session.user.id },
    include: { property: { select: { title: true } } },
  });
  if (!payment) return { success: false, error: 'Payment not found' };
  if (payment.status === 'PAID') return { success: false, error: 'Already paid' };

  const receiptNumber = `RCPT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  await prisma.rentPayment.update({
    where: { id: paymentId },
    data: {
      status: 'PAID',
      paidDate: new Date(),
      method: 'UPI',
      receiptNumber,
    },
  });

  await prisma.notification.create({
    data: {
      userId: session.user.id,
      type: 'PAYMENT',
      title: 'Rent Payment Successful',
      message: `Rent paid for ${payment.period} — ${payment.property.title}. Receipt: ${receiptNumber}`,
      link: '/tenant/rent',
    },
  });

  revalidatePath('/tenant/rent');
  revalidatePath('/landlord/rent');

  return { success: true, data: { receiptNumber } };
}

export async function updateTenantProfile(data: {
  bio?: string;
  address?: string;
  village?: string;
  city?: string;
  state?: string;
  pincode?: string;
  occupation?: string;
  monthlyIncome?: number;
  familySize?: number;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return { success: false, error: 'Unauthorized' };
  }

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  revalidatePath('/tenant/profile');
  return { success: true };
}

export async function submitComplaint(
  propertyId: string,
  data: { category: string; title: string; description: string; priority: string },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return { success: false, error: 'Unauthorized' };
  }

  await prisma.complaint.create({
    data: {
      userId: session.user.id,
      propertyId,
      category: data.category,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: 'OPEN',
    },
  });

  revalidatePath('/tenant/complaints');
  return { success: true };
}

export async function submitMaintenanceRequest(
  propertyId: string,
  data: { title: string; description: string; priority: string },
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return { success: false, error: 'Unauthorized' };
  }

  await prisma.maintenanceRequest.create({
    data: {
      propertyId,
      tenantId: session.user.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      category: 'OTHER',
      status: 'OPEN',
    },
  });

  revalidatePath('/tenant/complaints');
  return { success: true };
}

export async function submitReview(
  propertyId: string,
  rating: number,
  comment: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') {
    return { success: false, error: 'Unauthorized' };
  }

  // Check tenant has completed/approved booking
  const booking = await prisma.booking.findFirst({
    where: {
      tenantId: session.user.id,
      propertyId,
      status: { in: ['APPROVED', 'COMPLETED'] },
    },
  });
  if (!booking) {
    return { success: false, error: 'You can only review properties you have booked.' };
  }

  // Check for duplicate review
  const existing = await prisma.review.findFirst({
    where: { propertyId, tenantId: session.user.id },
  });
  if (existing) return { success: false, error: 'You have already reviewed this property.' };

  await prisma.review.create({
    data: { propertyId, tenantId: session.user.id, rating, comment },
  });

  // Update property rating
  const reviews = await prisma.review.findMany({ where: { propertyId }, select: { rating: true } });
  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  await prisma.property.update({
    where: { id: propertyId },
    data: { rating: avgRating, reviewCount: reviews.length },
  });

  revalidatePath(`/properties/${propertyId}`);
  return { success: true };
}

export async function markNotificationsRead(ids: string[]): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Unauthorized' };

  if (ids.length === 0) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { id: { in: ids }, userId: session.user.id },
      data: { isRead: true },
    });
  }

  revalidatePath('/tenant/notifications');
  revalidatePath('/landlord/notifications');
  return { success: true };
}

// ── LANDLORD ACTIONS ─────────────────────────────────────────────────────────

export async function respondToBooking(
  bookingId: string,
  action: 'APPROVED' | 'REJECTED',
  reason?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') {
    return { success: false, error: 'Unauthorized' };
  }

  const landlordProfile = await prisma.landlordProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!landlordProfile) return { success: false, error: 'Landlord profile not found' };

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, property: { landlordId: landlordProfile.id } },
    include: { property: { select: { title: true } } },
  });
  if (!booking) return { success: false, error: 'Booking not found' };
  if (booking.status !== 'PENDING') return { success: false, error: 'Booking is no longer pending' };

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: action,
      rejectionReason: action === 'REJECTED' ? reason : undefined,
      respondedAt: new Date(),
    },
  });

  if (action === 'APPROVED') {
    // Increment occupiedRooms
    await prisma.property.update({
      where: { id: booking.propertyId },
      data: { occupiedRooms: { increment: 1 } },
    });

    // Create draft agreement
    await prisma.agreement.create({
      data: {
        tenantId: booking.tenantId,
        landlordId: landlordProfile.id,
        propertyId: booking.propertyId,
        bookingId: booking.id,
        rentAmount: 0, // to be filled
        depositAmount: 0,
        startDate: booking.moveInDate,
        status: 'DRAFT',
      },
    });
  }

  // Notify tenant
  await prisma.notification.create({
    data: {
      userId: booking.tenantId,
      type: 'BOOKING',
      title: action === 'APPROVED' ? 'Booking Approved!' : 'Booking Rejected',
      message:
        action === 'APPROVED'
          ? `Your booking for "${booking.property.title}" has been approved. Welcome aboard!`
          : `Your booking for "${booking.property.title}" was rejected.${reason ? ` Reason: ${reason}` : ''}`,
      link: '/tenant/stay',
    },
  });

  revalidatePath('/landlord');
  revalidatePath('/landlord/tenants');
  revalidatePath('/tenant/stay');

  return { success: true };
}

export async function updatePropertyStatus(propertyId: string, status: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') {
    return { success: false, error: 'Unauthorized' };
  }

  const landlordProfile = await prisma.landlordProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!landlordProfile) return { success: false, error: 'Landlord profile not found' };

  const property = await prisma.property.findFirst({
    where: { id: propertyId, landlordId: landlordProfile.id },
  });
  if (!property) return { success: false, error: 'Property not found' };

  await prisma.property.update({ where: { id: propertyId }, data: { status } });

  revalidatePath('/landlord/properties');
  revalidatePath('/landlord');
  return { success: true };
}

export async function updateLandlordProfile(data: {
  businessName?: string;
  bio?: string;
  city?: string;
  state?: string;
  upiId?: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') {
    return { success: false, error: 'Unauthorized' };
  }

  await prisma.landlordProfile.update({
    where: { userId: session.user.id },
    data,
  });

  revalidatePath('/landlord/profile');
  return { success: true };
}

// ── ADMIN ACTIONS ─────────────────────────────────────────────────────────────

export async function adminUpdatePropertyStatus(
  propertyId: string,
  status: 'AVAILABLE' | 'REJECTED',
  reason?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { landlord: { include: { user: { select: { id: true } } } } },
  });
  if (!property) return { success: false, error: 'Property not found' };

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      status,
      isVerified: status === 'AVAILABLE' ? true : property.isVerified,
      rejectionReason: status === 'REJECTED' ? reason : undefined,
    },
  });

  await prisma.notification.create({
    data: {
      userId: property.landlord.user.id,
      type: 'SYSTEM',
      title: status === 'AVAILABLE' ? 'Property Approved' : 'Property Rejected',
      message:
        status === 'AVAILABLE'
          ? `Your property "${property.title}" has been approved and is now live.`
          : `Your property "${property.title}" was rejected.${reason ? ` Reason: ${reason}` : ''}`,
      link: '/landlord/properties',
    },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/properties');
  revalidatePath('/landlord/properties');
  revalidatePath(`/properties/${propertyId}`);

  return { success: true };
}

export async function adminUpdateUserStatus(
  userId: string,
  action: 'VERIFY' | 'SUSPEND' | 'UNSUSPEND',
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: 'User not found' };

  const updateData =
    action === 'VERIFY'
      ? { isVerified: true }
      : action === 'SUSPEND'
        ? { isSuspended: true }
        : { isSuspended: false };

  await prisma.user.update({ where: { id: userId }, data: updateData });

  const notifMsg = {
    VERIFY: { title: 'Account Verified', message: 'Your account has been verified by LocaStay admin.' },
    SUSPEND: { title: 'Account Suspended', message: 'Your account has been suspended. Contact support for assistance.' },
    UNSUSPEND: { title: 'Account Reinstated', message: 'Your account suspension has been lifted.' },
  };

  await prisma.notification.create({
    data: {
      userId,
      type: 'KYC',
      title: notifMsg[action].title,
      message: notifMsg[action].message,
    },
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin');

  return { success: true };
}

export async function adminRespondToBooking(
  bookingId: string,
  action: 'APPROVED' | 'REJECTED',
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { property: { select: { title: true } } },
  });
  if (!booking) return { success: false, error: 'Booking not found' };

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: action, respondedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId: booking.tenantId,
      type: 'BOOKING',
      title: action === 'APPROVED' ? 'Booking Approved' : 'Booking Rejected',
      message:
        action === 'APPROVED'
          ? `Your booking for "${booking.property.title}" has been approved.`
          : `Your booking for "${booking.property.title}" was rejected by admin.`,
      link: '/tenant/stay',
    },
  });

  revalidatePath('/admin/bookings');
  revalidatePath('/admin');
  revalidatePath('/tenant/stay');

  return { success: true };
}

export async function adminUpdateDocumentStatus(
  documentId: string,
  status: 'VERIFIED' | 'REJECTED',
  reason?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return { success: false, error: 'Document not found' };

  await prisma.document.update({
    where: { id: documentId },
    data: {
      status,
      rejectionReason: status === 'REJECTED' ? reason : undefined,
    },
  });

  await prisma.notification.create({
    data: {
      userId: doc.userId,
      type: 'KYC',
      title: status === 'VERIFIED' ? 'Document Verified' : 'Document Rejected',
      message:
        status === 'VERIFIED'
          ? `Your ${doc.type} document has been verified.`
          : `Your ${doc.type} document was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    },
  });

  revalidatePath('/admin/users');
  return { success: true };
}

export async function createSupportTicket(
  subject: string,
  description: string,
  priority: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Unauthorized' };

  await prisma.supportTicket.create({
    data: {
      userId: session.user.id,
      subject,
      description,
      priority,
      status: 'OPEN',
    },
  });

  revalidatePath('/tenant/support');
  return { success: true };
}
