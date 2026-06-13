/**
 * GET  /api/properties  — paginated property listing with filters
 * POST /api/properties  — landlord creates a property listing
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20', 10));
  const skip     = (page - 1) * pageSize;

  const where: Prisma.PropertyWhereInput = { status: 'AVAILABLE' };

  const city      = searchParams.get('city');
  const state     = searchParams.get('state');
  const type      = searchParams.get('type');
  const minRent   = searchParams.get('minRent');
  const maxRent   = searchParams.get('maxRent');
  const minRooms  = searchParams.get('minRooms');
  const verified  = searchParams.get('verified');
  const featured  = searchParams.get('featured');
  const q         = searchParams.get('q');

  if (city)     where.city  = { contains: city };
  if (state)    where.state = { contains: state };
  if (type)     where.type  = type;
  if (minRent || maxRent) {
    where.rent = {};
    if (minRent) where.rent.gte = Number(minRent);
    if (maxRent) where.rent.lte = Number(maxRent);
  }
  if (minRooms) where.totalRooms = { gte: Number(minRooms) };
  if (verified === 'true') where.isVerified = true;
  if (featured === 'true') where.isFeatured = true;
  if (q) {
    where.OR = [
      { title:   { contains: q } },
      { city:    { contains: q } },
      { village: { contains: q } },
      { address: { contains: q } },
    ];
  }

  const sortBy  = searchParams.get('sortBy') ?? 'createdAt';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
  const SORT_MAP: Record<string, string> = { created_at: 'createdAt', rent: 'rent', rating: 'rating', views: 'views' };
  const orderField = SORT_MAP[sortBy] ?? sortBy;

  const [properties, count] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { [orderField]: sortDir },
      skip,
      take: pageSize,
      include: {
        amenities: { select: { label: true } },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.property.count({ where }),
  ]);

  return NextResponse.json({ properties, total: count, page, pageSize });
}

const createSchema = z.object({
  title:         z.string().trim().min(5).max(120),
  type:          z.enum(['HOUSE','HOSTEL','PG','ROOM','FARM_HOUSE','APARTMENT','VILLA']),
  rent:          z.number().int().positive(),
  deposit:       z.number().int().min(0),
  address:       z.string().trim().min(5),
  village:       z.string().trim().optional(),
  city:          z.string().trim().min(2),
  district:      z.string().trim().optional(),
  state:         z.string().trim().min(2),
  pincode:       z.string().trim().regex(/^\d{6}$/),
  latitude:      z.number(),
  longitude:     z.number(),
  totalRooms:    z.number().int().positive().default(1),
  availableFrom: z.string().datetime({ offset: true }).optional(),
  description:   z.string().trim().max(2000).optional(),
  coverImage:    z.string().url().optional(),
  images:        z.array(z.string().url()).max(10).optional(),
  distanceToSchool:   z.number().optional(),
  distanceToHospital: z.number().optional(),
  distanceToMarket:   z.number().optional(),
  distanceToBusStand: z.number().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const landlordProfile = await prisma.landlordProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!landlordProfile) {
    return NextResponse.json({ error: 'Landlord profile not found. Please complete your profile first.' }, { status: 403 });
  }

  const d = parsed.data;
  const property = await prisma.property.create({
    data: {
      landlordId:         landlordProfile.id,
      title:              d.title,
      type:               d.type,
      rent:               d.rent,
      deposit:            d.deposit,
      address:            d.address,
      village:            d.village,
      city:               d.city,
      district:           d.district,
      state:              d.state,
      pincode:            d.pincode,
      latitude:           d.latitude,
      longitude:          d.longitude,
      totalRooms:         d.totalRooms,
      availableFrom:      d.availableFrom ? new Date(d.availableFrom) : undefined,
      description:        d.description,
      coverImage:         d.coverImage,
      images:             JSON.stringify(d.images ?? []),
      distanceToSchool:   d.distanceToSchool,
      distanceToHospital: d.distanceToHospital,
      distanceToMarket:   d.distanceToMarket,
      distanceToBusStand: d.distanceToBusStand,
    },
  });

  return NextResponse.json({ property }, { status: 201 });
}
