import { cache } from 'react';
import { prisma } from '@/lib/db';

export const getFeaturedProperties = cache(async () => {
  const properties = await prisma.property.findMany({
    where: { status: { in: ['AVAILABLE', 'OCCUPIED'] } },
    orderBy: [{ isFeatured: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
    take: 8,
  });
  return properties;
});

export const getPropertyById = cache(async (id: string) => {
  return prisma.property.findUnique({
    where: { id },
    include: {
      landlord: {
        include: { user: { select: { id: true, name: true, phone: true, avatar: true, isVerified: true, createdAt: true } } },
      },
      amenities: { select: { key: true, label: true, icon: true } },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { tenant: { select: { name: true, avatar: true } } },
      },
    },
  });
});

export const getPropertiesWithCount = cache(async (params: {
  page: number;
  pageSize: number;
  where: Record<string, unknown>;
}) => {
  const { page, pageSize, where } = params;
  const [total, raw] = await Promise.all([
    prisma.property.count({ where: where as any }),
    prisma.property.findMany({
      where: where as any,
      orderBy: [{ isFeatured: 'desc' }, { rating: 'desc' }, { views: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, properties: raw };
});

export const getTenantProfile = cache(async (userId: string) => {
  return prisma.profile.findUnique({ where: { userId } });
});

export const getLandlordProfile = cache(async (userId: string) => {
  return prisma.landlordProfile.findUnique({ where: { userId } });
});

export const getUnreadNotificationsCount = cache(async (userId: string) => {
  return prisma.notification.count({ where: { userId, isRead: false } });
});

export const getAdminCounts = cache(async () => {
  const [
    totalUsers, totalTenants, totalLandlords, totalProperties,
    pendingProperties, pendingKyc, activeBookings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'TENANT' } }),
    prisma.user.count({ where: { role: 'LANDLORD' } }),
    prisma.property.count(),
    prisma.property.count({ where: { status: 'PENDING' } }),
    prisma.document.count({ where: { status: 'PENDING' } }),
    prisma.booking.count({ where: { status: 'ACTIVE' } }),
  ]);
  return { totalUsers, totalTenants, totalLandlords, totalProperties, pendingProperties, pendingKyc, activeBookings };
});
