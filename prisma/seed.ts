/**
 * LocaStay demo seed — populates the local SQLite database with a realistic,
 * internally-consistent dataset spanning all three roles (Tenant / Landlord /
 * Admin) so every dashboard has real data to render from the moment you run
 * `npm run db:seed` (or `npm run db:reset`).
 *
 * All demo accounts share the password printed at the end of this script.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AMENITIES, toJsonArray } from '../src/lib/constants';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo@1234';

// ---------------------------------------------------------------------------
// Small date helpers (kept deterministic — no Math.random — so reseeding
// always produces the same screenshots/demo state)
// ---------------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000;
const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * DAY_MS);
const daysFromNow = (n: number) => new Date(today.getTime() + n * DAY_MS);
const monthsAgo = (n: number) => {
  const d = new Date(today);
  d.setMonth(d.getMonth() - n);
  return d;
};
const monthsFromNow = (n: number) => {
  const d = new Date(today);
  d.setMonth(d.getMonth() + n);
  return d;
};
const periodLabel = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const pick = <T,>(arr: readonly T[], i: number) => arr[i % arr.length];

const PROPERTY_IMAGES = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80',
  'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=1200&q=80',
  'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
  'https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=1200&q=80',
  'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?w=1200&q=80',
  'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80',
];
const AVATAR = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

async function main() {
  console.log('🌱  Seeding LocaStay demo data...\n');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // -------------------------------------------------------------------------
  // 0. Wipe existing data (dependency-safe order) so the script is re-runnable
  // -------------------------------------------------------------------------
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.analyticsEvent.deleteMany(),
    prisma.fraudFlag.deleteMany(),
    prisma.localService.deleteMany(),
    prisma.ticketMessage.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.blogPost.deleteMany(),
    prisma.notice.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.maintenanceRequest.deleteMany(),
    prisma.qRCode.deleteMany(),
    prisma.bill.deleteMany(),
    prisma.emergencyContact.deleteMany(),
    prisma.complaint.deleteMany(),
    prisma.document.deleteMany(),
    prisma.review.deleteMany(),
    prisma.agreement.deleteMany(),
    prisma.rentPayment.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.comparisonItem.deleteMany(),
    prisma.comparisonList.deleteMany(),
    prisma.propertyView.deleteMany(),
    prisma.savedProperty.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.rentalHistory.deleteMany(),
    prisma.property.deleteMany(),
    prisma.amenity.deleteMany(),
    prisma.landlordProfile.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // -------------------------------------------------------------------------
  // 1. Amenities (shared lookup table)
  // -------------------------------------------------------------------------
  const amenities = await Promise.all(
    AMENITIES.map((a) => prisma.amenity.create({ data: { key: a.key, label: a.label, icon: a.icon } })),
  );
  const amenityByKey = new Map(amenities.map((a) => [a.key, a]));
  console.log(`✓ ${amenities.length} amenities`);

  // -------------------------------------------------------------------------
  // 2. Admin
  // -------------------------------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      name: 'Anita Sharma',
      email: 'admin@locastay.in',
      phone: '9000000001',
      passwordHash,
      role: 'ADMIN',
      avatar: AVATAR('admin-anita'),
      isVerified: true,
      language: 'en',
      lastLoginAt: daysAgo(0),
    },
  });
  console.log('✓ Admin account');

  // -------------------------------------------------------------------------
  // 3. Landlords (User + LandlordProfile)
  // -------------------------------------------------------------------------
  type LandlordSeed = {
    name: string; email: string; phone: string; businessName: string;
    city: string; state: string; bankAccount: string; ifsc: string; upiId: string;
    gst?: string; verification: 'VERIFIED' | 'PENDING'; responseRate: number; avatarSeed: string;
  };
  const landlordSeeds: LandlordSeed[] = [
    { name: 'Ramesh Yadav', email: 'ramesh.yadav@locastay.in', phone: '9000000011', businessName: 'Yadav Properties', city: 'Sehore', state: 'Madhya Pradesh', bankAccount: '0291**********4521', ifsc: 'SBIN0007654', upiId: 'rameshyadav@oksbi', gst: '23ABCPY1234F1Z5', verification: 'VERIFIED', responseRate: 96, avatarSeed: 'landlord-ramesh' },
    { name: 'Sunita Devi', email: 'sunita.devi@locastay.in', phone: '9000000012', businessName: 'Devi Niwas Rentals', city: 'Begusarai', state: 'Bihar', bankAccount: '3847**********1190', ifsc: 'PUNB0284700', upiId: 'sunitadevi@okicici', verification: 'VERIFIED', responseRate: 91, avatarSeed: 'landlord-sunita' },
    { name: 'Vikram Singh Rathore', email: 'vikram.rathore@locastay.in', phone: '9000000013', businessName: 'Rathore Estates', city: 'Bikaner', state: 'Rajasthan', bankAccount: '6210**********7782', ifsc: 'HDFC0001122', upiId: 'vikramrathore@okhdfcbank', gst: '08AACFR5678G1Z2', verification: 'VERIFIED', responseRate: 98, avatarSeed: 'landlord-vikram' },
    { name: 'Manoj Patel', email: 'manoj.patel@locastay.in', phone: '9000000014', businessName: 'Patel Properties', city: 'Anand', state: 'Gujarat', bankAccount: '1029**********3344', ifsc: 'ICIC0001234', upiId: 'manojpatel@okaxis', verification: 'PENDING', responseRate: 88, avatarSeed: 'landlord-manoj' },
    { name: 'Geeta Kulkarni', email: 'geeta.kulkarni@locastay.in', phone: '9000000015', businessName: 'Kulkarni Stays', city: 'Satara', state: 'Maharashtra', bankAccount: '5566**********9988', ifsc: 'BARB0SATARA', upiId: 'geetakulkarni@okhdfcbank', verification: 'VERIFIED', responseRate: 94, avatarSeed: 'landlord-geeta' },
  ];

  const landlords = [];
  for (const seed of landlordSeeds) {
    const user = await prisma.user.create({
      data: {
        name: seed.name, email: seed.email, phone: seed.phone, passwordHash,
        role: 'LANDLORD', avatar: AVATAR(seed.avatarSeed), isVerified: seed.verification === 'VERIFIED',
        language: 'en', lastLoginAt: daysAgo(1),
        landlordProfile: {
          create: {
            businessName: seed.businessName,
            bio: `${seed.businessName} has been helping families and students find trusted, verified rental homes in and around ${seed.city} for years.`,
            address: `${seed.businessName}, Near Bus Stand`, city: seed.city, state: seed.state,
            bankAccount: seed.bankAccount, ifscCode: seed.ifsc, upiId: seed.upiId,
            panNumber: 'ABCPL1234D', gstNumber: seed.gst, verificationStatus: seed.verification, responseRate: seed.responseRate,
          },
        },
      },
      include: { landlordProfile: true },
    });
    landlords.push({ user, profile: user.landlordProfile! });
  }
  console.log(`✓ ${landlords.length} landlords`);

  // -------------------------------------------------------------------------
  // 4. Tenants (User + Profile)
  // -------------------------------------------------------------------------
  type TenantSeed = {
    name: string; email: string; phone: string; occupation: string; monthlyIncome: number;
    familySize: number; city: string; state: string; kyc: 'VERIFIED' | 'PENDING' | 'REJECTED';
    creditScore: number; preferred: string[]; avatarSeed: string;
  };
  const tenantSeeds: TenantSeed[] = [
    { name: 'Aarav Mehta', email: 'aarav.mehta@locastay.in', phone: '9000000021', occupation: 'College Student', monthlyIncome: 8000, familySize: 1, city: 'Sehore', state: 'Madhya Pradesh', kyc: 'VERIFIED', creditScore: 712, preferred: ['WIFI', 'STUDY_AREA', 'FOOD'], avatarSeed: 'tenant-aarav' },
    { name: 'Priya Sharma', email: 'priya.sharma@locastay.in', phone: '9000000022', occupation: 'Schoolteacher', monthlyIncome: 28000, familySize: 1, city: 'Pali', state: 'Rajasthan', kyc: 'VERIFIED', creditScore: 745, preferred: ['SECURITY', 'WATER', 'FURNISHED'], avatarSeed: 'tenant-priya' },
    { name: 'Rohit Kumar', email: 'rohit.kumar@locastay.in', phone: '9000000023', occupation: 'Bank Officer', monthlyIncome: 42000, familySize: 3, city: 'Satara', state: 'Maharashtra', kyc: 'VERIFIED', creditScore: 768, preferred: ['PARKING', 'ELECTRICITY', 'CCTV'], avatarSeed: 'tenant-rohit' },
    { name: 'Sneha Joshi', email: 'sneha.joshi@locastay.in', phone: '9000000024', occupation: 'Freelance Designer', monthlyIncome: 35000, familySize: 2, city: 'Bhopal', state: 'Madhya Pradesh', kyc: 'PENDING', creditScore: 690, preferred: ['WIFI', 'AC', 'FURNISHED'], avatarSeed: 'tenant-sneha' },
    { name: 'Imran Khan', email: 'imran.khan@locastay.in', phone: '9000000025', occupation: 'Agricultural Trader', monthlyIncome: 51000, familySize: 4, city: 'Bikaner', state: 'Rajasthan', kyc: 'VERIFIED', creditScore: 730, preferred: ['PARKING', 'WATER', 'SECURITY'], avatarSeed: 'tenant-imran' },
    { name: 'Lakshmi Reddy', email: 'lakshmi.reddy@locastay.in', phone: '9000000026', occupation: 'Nursing Student', monthlyIncome: 6000, familySize: 1, city: 'Muzaffarpur', state: 'Bihar', kyc: 'REJECTED', creditScore: 655, preferred: ['FOOD', 'LAUNDRY', 'WIFI'], avatarSeed: 'tenant-lakshmi' },
  ];

  const tenants = [];
  for (const [i, seed] of tenantSeeds.entries()) {
    const user = await prisma.user.create({
      data: {
        name: seed.name, email: seed.email, phone: seed.phone, passwordHash,
        role: 'TENANT', avatar: AVATAR(seed.avatarSeed), isVerified: seed.kyc === 'VERIFIED',
        language: i % 4 === 0 ? 'hi' : 'en', lastLoginAt: daysAgo(i),
        profile: {
          create: {
            bio: `${seed.occupation} looking for a safe, well-connected place to call home.`,
            address: `House No. ${12 + i}, Main Road`, city: seed.city, state: seed.state, pincode: `45${1000 + i * 37}`.slice(0, 6),
            occupation: seed.occupation, monthlyIncome: seed.monthlyIncome, familySize: seed.familySize,
            kycStatus: seed.kyc, aadhaarNumber: `${2345 + i * 11} ${6789 + i * 7} ${1000 + i * 91}`,
            aadhaarUrl: seed.kyc !== 'PENDING' ? `https://api.dicebear.com/7.x/identicon/svg?seed=aadhaar-${i}` : null,
            panNumber: `${String.fromCharCode(65 + i)}BCDE${1234 + i}F`,
            creditScore: seed.creditScore, preferredAmenities: toJsonArray(seed.preferred),
          },
        },
      },
      include: { profile: true },
    });
    tenants.push({ user, profile: user.profile!, seed });
  }
  console.log(`✓ ${tenants.length} tenants`);

  // -------------------------------------------------------------------------
  // 5. Properties — rural & semi-urban listings spread across 5 states
  // -------------------------------------------------------------------------
  type PropertySeed = {
    landlord: number; title: string; type: string; status: string; rent: number; deposit: number;
    address: string; village?: string; city: string; district?: string; state: string; pincode: string;
    lat: number; lng: number; sqft: number; rooms: number; occupied: number;
    distances: Partial<Record<'distanceToSchool' | 'distanceToHospital' | 'distanceToCollege' | 'distanceToMarket' | 'distanceToBusStand' | 'distanceToRailway' | 'distanceToATM', number>>;
    amenities: string[]; rating: number; reviewCount: number; views: number; performanceScore: number;
    aiSuggestedRent?: number; isVerified: boolean; isFeatured: boolean; description: string;
  };

  const propertySeeds: PropertySeed[] = [
    {
      landlord: 0, title: 'Sunrise Farmhouse Retreat', type: 'FARM_HOUSE', status: 'AVAILABLE', rent: 8000, deposit: 16000,
      address: 'Plot 14, Kothri Road', village: 'Kothri', city: 'Sehore', district: 'Sehore', state: 'Madhya Pradesh', pincode: '466001',
      lat: 23.2210, lng: 77.0790, sqft: 1800, rooms: 3, occupied: 0,
      distances: { distanceToSchool: 2.4, distanceToHospital: 4.1, distanceToMarket: 1.8, distanceToBusStand: 3.2, distanceToRailway: 6.5, distanceToATM: 2.0 },
      amenities: ['WIFI', 'PARKING', 'WATER', 'SECURITY', 'FURNISHED'], rating: 4.6, reviewCount: 18, views: 412, performanceScore: 82,
      aiSuggestedRent: 8400, isVerified: true, isFeatured: true,
      description: 'A peaceful farmhouse surrounded by mango orchards, perfect for families wanting fresh air without leaving city conveniences behind. Borewell water, solar backup, and a large courtyard for kids to play.',
    },
    {
      landlord: 0, title: 'Yadav Family PG for Boys', type: 'PG', status: 'OCCUPIED', rent: 4500, deposit: 4500,
      address: '22 College Road', city: 'Sehore', district: 'Sehore', state: 'Madhya Pradesh', pincode: '466001',
      lat: 23.2032, lng: 77.0844, sqft: 650, rooms: 6, occupied: 5,
      distances: { distanceToSchool: 1.1, distanceToCollege: 0.6, distanceToHospital: 2.8, distanceToMarket: 0.9, distanceToBusStand: 1.4, distanceToATM: 0.5 },
      amenities: ['WIFI', 'FOOD', 'LAUNDRY', 'STUDY_AREA', 'CCTV', 'ATTACHED_BATHROOM'], rating: 4.3, reviewCount: 27, views: 588, performanceScore: 88,
      aiSuggestedRent: 4800, isVerified: true, isFeatured: false,
      description: 'Walking distance from Govt. PG College, this all-boys PG offers home-style meals twice a day, high-speed WiFi, and a quiet study hall — trusted by students for three generations.',
    },
    {
      landlord: 0, title: 'Vidisha Heritage House', type: 'HOUSE', status: 'AVAILABLE', rent: 9500, deposit: 19000,
      address: '8 Udayagiri Marg', city: 'Vidisha', district: 'Vidisha', state: 'Madhya Pradesh', pincode: '464001',
      lat: 23.5251, lng: 77.8081, sqft: 1450, rooms: 3, occupied: 0,
      distances: { distanceToSchool: 1.6, distanceToHospital: 2.2, distanceToMarket: 0.8, distanceToBusStand: 1.9, distanceToRailway: 3.0, distanceToATM: 1.0 },
      amenities: ['PARKING', 'WATER', 'ELECTRICITY', 'FURNISHED', 'SECURITY'], rating: 4.4, reviewCount: 9, views: 203, performanceScore: 71,
      aiSuggestedRent: 9200, isVerified: true, isFeatured: false,
      description: 'Renovated 90-year-old stone house with modern plumbing and wiring, a private garden, and views of the Udayagiri caves. Ideal for a small family that loves history and quiet mornings.',
    },
    {
      landlord: 1, title: 'Devi Niwas — 2BHK Family Home', type: 'HOUSE', status: 'AVAILABLE', rent: 7000, deposit: 14000,
      address: 'Ward 9, Station Road', city: 'Begusarai', district: 'Begusarai', state: 'Bihar', pincode: '851101',
      lat: 25.4182, lng: 86.1272, sqft: 1100, rooms: 2, occupied: 0,
      distances: { distanceToSchool: 0.9, distanceToHospital: 1.5, distanceToMarket: 0.6, distanceToBusStand: 1.2, distanceToRailway: 2.4, distanceToATM: 0.7 },
      amenities: ['WATER', 'ELECTRICITY', 'PARKING', 'CCTV'], rating: 4.1, reviewCount: 11, views: 274, performanceScore: 64,
      aiSuggestedRent: 7300, isVerified: true, isFeatured: false,
      description: 'Bright, freshly-whitewashed 2BHK on a quiet residential lane, two minutes from the railway colony market. Owner lives next door — quick help whenever you need it.',
    },
    {
      landlord: 1, title: 'Riverside Hostel for Students', type: 'HOSTEL', status: 'AVAILABLE', rent: 3500, deposit: 3500,
      address: 'Near Ramna Maidan', city: 'Muzaffarpur', district: 'Muzaffarpur', state: 'Bihar', pincode: '842001',
      lat: 26.1209, lng: 85.3647, sqft: 2200, rooms: 12, occupied: 8,
      distances: { distanceToCollege: 1.0, distanceToSchool: 1.8, distanceToHospital: 2.6, distanceToMarket: 0.5, distanceToBusStand: 1.1, distanceToATM: 0.4 },
      amenities: ['WIFI', 'FOOD', 'LAUNDRY', 'STUDY_AREA', 'WATER', 'CCTV'], rating: 3.9, reviewCount: 34, views: 701, performanceScore: 76,
      aiSuggestedRent: 3700, isVerified: true, isFeatured: true,
      description: 'Budget-friendly hostel popular with first-year university students. Mess serves regional thali twice daily, dorms cleaned weekly, and a warden on-site round the clock.',
    },
    {
      landlord: 1, title: 'Cozy Single Room near Market', type: 'ROOM', status: 'AVAILABLE', rent: 2800, deposit: 2800,
      address: 'Gandhi Chowk Lane 3', city: 'Begusarai', district: 'Begusarai', state: 'Bihar', pincode: '851101',
      lat: 25.4151, lng: 86.1310, sqft: 220, rooms: 1, occupied: 0,
      distances: { distanceToMarket: 0.2, distanceToHospital: 1.3, distanceToBusStand: 0.8, distanceToATM: 0.3 },
      amenities: ['WATER', 'ELECTRICITY', 'ATTACHED_BATHROOM'], rating: 4.0, reviewCount: 6, views: 156, performanceScore: 58,
      aiSuggestedRent: 2900, isVerified: false, isFeatured: false,
      description: 'Compact single-occupancy room above a family-run grocery store — you will never run out of essentials. Attached bathroom, large window, and a ceiling fan included.',
    },
    {
      landlord: 2, title: 'Rathore Haveli Apartment', type: 'APARTMENT', status: 'AVAILABLE', rent: 11000, deposit: 22000,
      address: 'C-12, Rani Bazar Extension', city: 'Bikaner', district: 'Bikaner', state: 'Rajasthan', pincode: '334001',
      lat: 28.0229, lng: 73.3119, sqft: 1350, rooms: 3, occupied: 0,
      distances: { distanceToSchool: 1.2, distanceToHospital: 2.0, distanceToMarket: 0.7, distanceToBusStand: 1.6, distanceToRailway: 2.8, distanceToATM: 0.5 },
      amenities: ['WIFI', 'PARKING', 'AC', 'CCTV', 'SECURITY', 'FURNISHED', 'ELECTRICITY'], rating: 4.7, reviewCount: 22, views: 533, performanceScore: 90,
      aiSuggestedRent: 11500, isVerified: true, isFeatured: true,
      description: 'Sandstone-facade apartment in a gated complex with 24×7 security guards, power backup, and reserved covered parking — a five-minute walk from Rani Bazar market.',
    },
    {
      landlord: 2, title: 'Desert View Villa', type: 'VILLA', status: 'AVAILABLE', rent: 18000, deposit: 36000,
      address: 'Plot 3, Jaisalmer Bypass', city: 'Bikaner', district: 'Bikaner', state: 'Rajasthan', pincode: '334003',
      lat: 28.0473, lng: 73.2776, sqft: 2800, rooms: 4, occupied: 0,
      distances: { distanceToSchool: 3.5, distanceToHospital: 4.8, distanceToMarket: 3.0, distanceToBusStand: 4.2, distanceToRailway: 6.1, distanceToATM: 2.7 },
      amenities: ['WIFI', 'PARKING', 'AC', 'SECURITY', 'CCTV', 'FURNISHED', 'WATER'], rating: 4.8, reviewCount: 14, views: 389, performanceScore: 85,
      aiSuggestedRent: 17200, isVerified: true, isFeatured: true,
      description: 'Spacious single-storey villa with a private courtyard and rooftop terrace looking out over the Thar dunes — a calm retreat for families relocating from the city.',
    },
    {
      landlord: 2, title: "Pali Working Women's PG", type: 'PG', status: 'OCCUPIED', rent: 5000, deposit: 5000,
      address: 'Near Sumerpur Road', city: 'Pali', district: 'Pali', state: 'Rajasthan', pincode: '306401',
      lat: 25.7711, lng: 73.3234, sqft: 900, rooms: 8, occupied: 7,
      distances: { distanceToSchool: 1.4, distanceToHospital: 1.0, distanceToMarket: 0.6, distanceToBusStand: 1.0, distanceToATM: 0.4 },
      amenities: ['WIFI', 'FOOD', 'LAUNDRY', 'SECURITY', 'CCTV', 'ATTACHED_BATHROOM'], rating: 4.5, reviewCount: 31, views: 644, performanceScore: 92,
      aiSuggestedRent: 5300, isVerified: true, isFeatured: false,
      description: 'Exclusively for working women, with a strict visitor policy, biometric entry log, and a warden who has run this PG for over a decade. Includes breakfast and dinner.',
    },
    {
      landlord: 3, title: 'Patel Farmhouse & Orchard Stay', type: 'FARM_HOUSE', status: 'AVAILABLE', rent: 10000, deposit: 20000,
      address: 'Borsad Road, Plot 7', village: 'Borsad', city: 'Anand', district: 'Anand', state: 'Gujarat', pincode: '388001',
      lat: 22.5645, lng: 72.9289, sqft: 2100, rooms: 3, occupied: 0,
      distances: { distanceToSchool: 2.8, distanceToHospital: 3.4, distanceToMarket: 2.1, distanceToBusStand: 2.6, distanceToRailway: 4.0, distanceToATM: 2.2 },
      amenities: ['WIFI', 'PARKING', 'WATER', 'FURNISHED', 'SECURITY'], rating: 4.5, reviewCount: 13, views: 298, performanceScore: 79,
      aiSuggestedRent: 10400, isVerified: true, isFeatured: false,
      description: 'Set inside a working banana and papaya orchard, this farmhouse offers fresh produce, a tractor-trail view from the porch, and a peaceful break from city traffic.',
    },
    {
      landlord: 3, title: 'Junagadh Cottage House', type: 'HOUSE', status: 'PENDING', rent: 8500, deposit: 17000,
      address: 'Girnar Taleti Road', city: 'Junagadh', district: 'Junagadh', state: 'Gujarat', pincode: '362001',
      lat: 21.5222, lng: 70.4579, sqft: 1250, rooms: 2, occupied: 0,
      distances: { distanceToSchool: 1.9, distanceToHospital: 2.5, distanceToMarket: 1.1, distanceToBusStand: 1.7, distanceToRailway: 2.9, distanceToATM: 1.3 },
      amenities: ['WATER', 'ELECTRICITY', 'PARKING'], rating: 0, reviewCount: 0, views: 47, performanceScore: 35,
      aiSuggestedRent: 8200, isVerified: false, isFeatured: false,
      description: 'Newly-listed cottage at the base of Girnar hill, two rooms with attached verandas and a small kitchen garden plot. Awaiting LocaStay verification visit.',
    },
    {
      landlord: 3, title: 'Anand Tech Park PG', type: 'PG', status: 'AVAILABLE', rent: 6000, deposit: 6000,
      address: 'V V Nagar Ring Road', city: 'Anand', district: 'Anand', state: 'Gujarat', pincode: '388120',
      lat: 22.5970, lng: 72.8300, sqft: 1050, rooms: 10, occupied: 6,
      distances: { distanceToCollege: 0.8, distanceToHospital: 1.7, distanceToMarket: 1.0, distanceToBusStand: 1.3, distanceToATM: 0.6 },
      amenities: ['WIFI', 'FOOD', 'AC', 'LAUNDRY', 'STUDY_AREA', 'CCTV', 'SECURITY'], rating: 4.2, reviewCount: 19, views: 455, performanceScore: 81,
      aiSuggestedRent: 6300, isVerified: true, isFeatured: false,
      description: 'Modern co-living PG built for IT and university crowds — AC rooms, fibre WiFi, in-house cafeteria, and a rooftop common area for evening hangouts.',
    },
    {
      landlord: 4, title: 'Kulkarni Family Home', type: 'HOUSE', status: 'OCCUPIED', rent: 9000, deposit: 18000,
      address: 'Shukrawar Peth Lane 2', city: 'Satara', district: 'Satara', state: 'Maharashtra', pincode: '415001',
      lat: 17.6805, lng: 74.0183, sqft: 1400, rooms: 3, occupied: 3,
      distances: { distanceToSchool: 0.8, distanceToHospital: 1.4, distanceToMarket: 0.5, distanceToBusStand: 1.0, distanceToRailway: 5.5, distanceToATM: 0.6 },
      amenities: ['WATER', 'ELECTRICITY', 'PARKING', 'SECURITY', 'FURNISHED'], rating: 4.6, reviewCount: 16, views: 321, performanceScore: 84,
      aiSuggestedRent: 9300, isVerified: true, isFeatured: false,
      description: 'Traditional Maharashtrian wada-style home with a sunlit courtyard, modernised kitchen, and warm long-term tenants who treat it like family.',
    },
    {
      landlord: 4, title: 'Wardha Budget Hostel', type: 'HOSTEL', status: 'AVAILABLE', rent: 3200, deposit: 3200,
      address: 'Sevagram Road', city: 'Wardha', district: 'Wardha', state: 'Maharashtra', pincode: '442001',
      lat: 20.7453, lng: 78.6022, sqft: 1900, rooms: 10, occupied: 4,
      distances: { distanceToCollege: 1.5, distanceToSchool: 1.0, distanceToHospital: 2.1, distanceToMarket: 0.7, distanceToBusStand: 0.9, distanceToATM: 0.5 },
      amenities: ['WIFI', 'FOOD', 'WATER', 'STUDY_AREA'], rating: 3.8, reviewCount: 21, views: 367, performanceScore: 67,
      aiSuggestedRent: 3400, isVerified: true, isFeatured: false,
      description: 'No-frills hostel near Sevagram with simple home-cooked meals and a quiet reading room — favoured by students preparing for competitive exams.',
    },
    {
      landlord: 4, title: 'Hilltop Single Room', type: 'ROOM', status: 'AVAILABLE', rent: 3000, deposit: 3000,
      address: 'Kanher Dam Road', city: 'Satara', district: 'Satara', state: 'Maharashtra', pincode: '415002',
      lat: 17.6450, lng: 73.9800, sqft: 260, rooms: 1, occupied: 0,
      distances: { distanceToMarket: 2.4, distanceToHospital: 3.1, distanceToBusStand: 2.0, distanceToATM: 1.8 },
      amenities: ['WATER', 'ELECTRICITY', 'PARKING'], rating: 4.3, reviewCount: 5, views: 122, performanceScore: 54,
      aiSuggestedRent: 2950, isVerified: true, isFeatured: false,
      description: 'Standalone room with a private entrance and a view of Kanher backwaters — quiet, breezy, and a short scooter ride from the city centre.',
    },
    {
      landlord: 4, title: 'Sahyadri Villa Retreat', type: 'VILLA', status: 'MAINTENANCE', rent: 15000, deposit: 30000,
      address: 'Yavateshwar Hill Road', city: 'Satara', district: 'Satara', state: 'Maharashtra', pincode: '415003',
      lat: 17.6920, lng: 73.9700, sqft: 2600, rooms: 4, occupied: 0,
      distances: { distanceToSchool: 4.0, distanceToHospital: 5.2, distanceToMarket: 3.6, distanceToBusStand: 3.8, distanceToRailway: 8.0, distanceToATM: 3.0 },
      amenities: ['WIFI', 'PARKING', 'AC', 'SECURITY', 'FURNISHED', 'CCTV'], rating: 4.7, reviewCount: 8, views: 211, performanceScore: 73,
      aiSuggestedRent: 14600, isVerified: true, isFeatured: false,
      description: 'Hillside villa with panoramic Sahyadri views, presently undergoing monsoon roof maintenance — bookings reopen next month.',
    },
  ];

  const properties: { row: Awaited<ReturnType<typeof prisma.property.create>>; seed: PropertySeed }[] = [];
  for (const [i, seed] of propertySeeds.entries()) {
    const landlord = landlords[seed.landlord];
    const images = [pick(PROPERTY_IMAGES, i), pick(PROPERTY_IMAGES, i + 3), pick(PROPERTY_IMAGES, i + 6)];
    const property = await prisma.property.create({
      data: {
        landlordId: landlord.profile.id,
        title: seed.title,
        description: seed.description,
        type: seed.type,
        status: seed.status,
        rent: seed.rent,
        deposit: seed.deposit,
        address: seed.address,
        village: seed.village,
        city: seed.city,
        district: seed.district,
        state: seed.state,
        pincode: seed.pincode,
        latitude: seed.lat,
        longitude: seed.lng,
        squareFeet: seed.sqft,
        availableFrom: seed.status === 'AVAILABLE' ? daysFromNow(7) : daysAgo(30),
        totalRooms: seed.rooms,
        occupiedRooms: seed.occupied,
        coverImage: images[0],
        images: toJsonArray(images),
        ...seed.distances,
        aiSuggestedRent: seed.aiSuggestedRent,
        performanceScore: seed.performanceScore,
        views: seed.views,
        rating: seed.rating,
        reviewCount: seed.reviewCount,
        isVerified: seed.isVerified,
        isFeatured: seed.isFeatured,
        publishedAt: seed.status === 'PENDING' ? null : daysAgo(45 - i),
        amenities: { connect: seed.amenities.map((key) => ({ id: amenityByKey.get(key)!.id })) },
      },
    });
    properties.push({ row: property, seed });
  }
  console.log(`✓ ${properties.length} properties`);

  // QR codes for verified, published listings
  for (const [i, p] of properties.entries()) {
    if (p.seed.isVerified) {
      await prisma.qRCode.create({
        data: { propertyId: p.row.id, code: `LOCASTAY-PROP-${p.row.id.slice(-8).toUpperCase()}`, scans: 12 + i * 7 },
      });
    }
  }
  console.log('✓ QR codes for verified listings');

  // -------------------------------------------------------------------------
  // 6. Bookings → Agreements → Rent Payments (3 active tenancies + a few in-flight)
  // -------------------------------------------------------------------------
  const findProperty = (title: string) => properties.find((p) => p.row.title === title)!.row;

  type TenancySeed = { tenant: number; propertyTitle: string; moveIn: Date; months: number; signedDaysAgo: number };
  const activeTenancies: TenancySeed[] = [
    { tenant: 0, propertyTitle: 'Yadav Family PG for Boys', moveIn: monthsAgo(5), months: 11, signedDaysAgo: 150 },
    { tenant: 1, propertyTitle: "Pali Working Women's PG", moveIn: monthsAgo(8), months: 11, signedDaysAgo: 240 },
    { tenant: 2, propertyTitle: 'Kulkarni Family Home', moveIn: monthsAgo(14), months: 11, signedDaysAgo: 420 },
  ];

  for (const t of activeTenancies) {
    const tenant = tenants[t.tenant];
    const property = findProperty(t.propertyTitle);
    const landlordUser = landlords.find((l) => l.profile.id === property.landlordId)!;

    const booking = await prisma.booking.create({
      data: {
        tenantId: tenant.user.id, propertyId: property.id, status: 'APPROVED',
        moveInDate: t.moveIn, durationMonths: t.months,
        message: `Hi, I'd like to rent ${property.title} starting ${t.moveIn.toDateString()}. Happy to share references.`,
        requestedAt: daysAgo(t.signedDaysAgo + 5), respondedAt: daysAgo(t.signedDaysAgo + 3),
      },
    });

    const agreement = await prisma.agreement.create({
      data: {
        tenantId: tenant.user.id, landlordId: property.landlordId, propertyId: property.id, bookingId: booking.id,
        rentAmount: property.rent, depositAmount: property.deposit, startDate: t.moveIn, endDate: monthsFromNow(t.months - (today.getMonth() - t.moveIn.getMonth() + 12 * (today.getFullYear() - t.moveIn.getFullYear()))),
        renewalDate: monthsFromNow(2),
        terms: toJsonArray([
          'Rent is due on or before the 5th of every month via UPI or bank transfer.',
          'Security deposit is refundable within 30 days of vacating, subject to inspection.',
          `${t.months}-month lock-in period from the date of move-in.`,
          'Tenant is responsible for electricity and water bills unless stated otherwise.',
          'A 30-day written notice is required before vacating the property.',
        ]),
        status: 'ACTIVE', tenantSignedAt: daysAgo(t.signedDaysAgo), landlordSignedAt: daysAgo(t.signedDaysAgo - 1),
        documentUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=agreement-${booking.id}`,
      },
    });

    // Rent payment history: last 4 months paid, current month due/overdue
    for (let m = 4; m >= 1; m--) {
      const due = monthsAgo(m);
      due.setDate(5);
      const paidOn = new Date(due);
      paidOn.setDate(due.getDate() + (m % 2 === 0 ? -1 : 2));
      await prisma.rentPayment.create({
        data: {
          tenantId: tenant.user.id, propertyId: property.id, bookingId: booking.id,
          period: periodLabel(due), amount: property.rent, lateFee: m % 2 === 0 ? 0 : 100,
          dueDate: due, paidDate: paidOn, status: 'PAID', method: m % 2 === 0 ? 'UPI' : 'NEFT',
          transactionId: `TXN${due.getFullYear()}${String(due.getMonth() + 1).padStart(2, '0')}${1000 + m}`,
          receiptNumber: `LCS-RCPT-${property.id.slice(-5).toUpperCase()}-${periodLabel(due).replace('-', '')}`,
        },
      });
    }
    const currentDue = new Date(today);
    currentDue.setDate(5);
    const isOverdue = today.getDate() > 5;
    await prisma.rentPayment.create({
      data: {
        tenantId: tenant.user.id, propertyId: property.id, bookingId: booking.id,
        period: periodLabel(today), amount: property.rent, lateFee: isOverdue ? 150 : 0,
        dueDate: currentDue, status: isOverdue ? 'OVERDUE' : 'PENDING',
      },
    });

    // Notifications for both sides
    await prisma.notification.createMany({
      data: [
        { userId: tenant.user.id, type: 'PAYMENT', title: isOverdue ? 'Rent overdue' : 'Rent due soon', message: `Your rent of ₹${property.rent.toLocaleString('en-IN')} for ${property.title} is ${isOverdue ? 'overdue' : 'due on the 5th'}. Pay now to avoid late fees.`, link: '/tenant/rent' },
        { userId: tenant.user.id, type: 'AGREEMENT', title: 'Agreement active', message: `Your rental agreement for ${property.title} is now active and signed by both parties.`, link: '/tenant/agreements' },
        { userId: landlordUser.user.id, type: 'PAYMENT', title: 'Payment received', message: `${tenant.user.name} paid rent for ${property.title} — ${periodLabel(monthsAgo(1))}.`, link: '/landlord/rent' },
      ],
    });

    void agreement;
  }
  console.log('✓ 3 active tenancies with agreements + rent payment history');

  // In-flight booking requests (pending / rejected)
  const pendingBookings: { tenant: number; propertyTitle: string; status: string; moveIn: Date; reason?: string }[] = [
    { tenant: 3, propertyTitle: 'Sunrise Farmhouse Retreat', status: 'PENDING', moveIn: daysFromNow(20) },
    { tenant: 4, propertyTitle: 'Rathore Haveli Apartment', status: 'PENDING', moveIn: daysFromNow(14) },
    { tenant: 5, propertyTitle: 'Riverside Hostel for Students', status: 'REJECTED', moveIn: daysFromNow(10), reason: 'Hostel is currently full for the new academic term — please check back next month.' },
  ];
  for (const b of pendingBookings) {
    const tenant = tenants[b.tenant];
    const property = findProperty(b.propertyTitle);
    await prisma.booking.create({
      data: {
        tenantId: tenant.user.id, propertyId: property.id, status: b.status, moveInDate: b.moveIn, durationMonths: 11,
        message: `Hello, I'm interested in moving into ${property.title}. Could we schedule a visit?`,
        rejectionReason: b.reason, requestedAt: daysAgo(4),
        respondedAt: b.status === 'REJECTED' ? daysAgo(2) : null,
      },
    });
    await prisma.notification.create({
      data: {
        userId: tenant.user.id,
        type: 'BOOKING',
        title: b.status === 'PENDING' ? 'Booking request sent' : 'Booking request update',
        message: b.status === 'PENDING'
          ? `Your request to book ${property.title} has been sent to the landlord.`
          : `Your request for ${property.title} was declined: ${b.reason}`,
        link: '/tenant/bookings',
      },
    });
  }
  console.log('✓ Pending/rejected booking requests');

  // -------------------------------------------------------------------------
  // 7. Reviews
  // -------------------------------------------------------------------------
  const reviewSeeds: { propertyTitle: string; tenant: number; rating: number; comment: string; reply?: string; daysAgo: number }[] = [
    { propertyTitle: 'Yadav Family PG for Boys', tenant: 0, rating: 5, comment: 'Best PG near the college — food is homely and WiFi never drops during exams.', reply: 'Thank you Aarav! Always happy to have you with us.', daysAgo: 60 },
    { propertyTitle: 'Yadav Family PG for Boys', tenant: 5, rating: 4, comment: 'Clean rooms and a caring warden, though hot water is limited in winter mornings.', daysAgo: 95 },
    { propertyTitle: "Pali Working Women's PG", tenant: 1, rating: 5, comment: 'I have lived here for 8 months and never felt unsafe. The biometric entry really works.', reply: 'So glad you feel at home here, Priya ji!', daysAgo: 40 },
    { propertyTitle: 'Kulkarni Family Home', tenant: 2, rating: 5, comment: 'Geeta ma\'am treats tenants like family. The courtyard is perfect for our kids.', reply: 'You are family to us too, Rohit! 🙏', daysAgo: 200 },
    { propertyTitle: 'Rathore Haveli Apartment', tenant: 4, rating: 5, comment: 'Felt completely secure — the security guards know every resident by name.', daysAgo: 25 },
    { propertyTitle: 'Riverside Hostel for Students', tenant: 5, rating: 3, comment: 'Good value for money but dorms can get noisy during weekends.', daysAgo: 70 },
    { propertyTitle: 'Desert View Villa', tenant: 4, rating: 5, comment: 'Stayed here for a family function — the rooftop sunset view was unforgettable.', daysAgo: 110 },
  ];
  for (const r of reviewSeeds) {
    const property = findProperty(r.propertyTitle);
    await prisma.review.create({
      data: {
        propertyId: property.id, tenantId: tenants[r.tenant].user.id, rating: r.rating, comment: r.comment,
        landlordReply: r.reply, createdAt: daysAgo(r.daysAgo), updatedAt: daysAgo(r.daysAgo),
      },
    });
  }
  console.log(`✓ ${reviewSeeds.length} reviews`);

  // -------------------------------------------------------------------------
  // 8. Saved properties / wishlist + comparison list + property views
  // -------------------------------------------------------------------------
  const wishlist: [number, string][] = [
    [0, 'Vidisha Heritage House'], [0, 'Anand Tech Park PG'],
    [1, 'Desert View Villa'], [1, 'Devi Niwas — 2BHK Family Home'],
    [3, 'Hilltop Single Room'], [3, 'Sunrise Farmhouse Retreat'], [3, 'Wardha Budget Hostel'],
    [4, 'Patel Farmhouse & Orchard Stay'],
  ];
  for (const [tenantIdx, title] of wishlist) {
    await prisma.savedProperty.create({ data: { userId: tenants[tenantIdx].user.id, propertyId: findProperty(title).id } });
  }

  const comparison = await prisma.comparisonList.create({ data: { userId: tenants[3].user.id, name: 'MP Shortlist' } });
  for (const title of ['Sunrise Farmhouse Retreat', 'Vidisha Heritage House', 'Anand Tech Park PG']) {
    await prisma.comparisonItem.create({ data: { listId: comparison.id, propertyId: findProperty(title).id } });
  }

  for (const [i, p] of properties.entries()) {
    const tenant = tenants[i % tenants.length];
    await prisma.propertyView.create({ data: { userId: tenant.user.id, propertyId: p.row.id, viewedAt: daysAgo(i % 14) } });
  }
  console.log('✓ Wishlist, comparison list, property views');

  // -------------------------------------------------------------------------
  // 9. Documents (KYC) for tenants
  // -------------------------------------------------------------------------
  for (const [i, t] of tenants.entries()) {
    await prisma.document.create({
      data: {
        userId: t.user.id, type: 'AADHAAR', url: `https://api.dicebear.com/7.x/identicon/svg?seed=aadhaar-doc-${i}`,
        number: t.profile.aadhaarNumber, status: t.seed.kyc, createdAt: daysAgo(60 - i * 4),
        rejectionReason: t.seed.kyc === 'REJECTED' ? 'Aadhaar image is blurred — please re-upload a clearer photo of both sides.' : null,
      },
    });
    if (t.seed.kyc !== 'REJECTED') {
      await prisma.document.create({
        data: { userId: t.user.id, type: 'PAN', url: `https://api.dicebear.com/7.x/identicon/svg?seed=pan-doc-${i}`, number: t.profile.panNumber, status: t.seed.kyc, createdAt: daysAgo(58 - i * 4) },
      });
    }
  }
  console.log('✓ KYC documents');

  // -------------------------------------------------------------------------
  // 10. Complaints, Emergency Contacts, Bills
  // -------------------------------------------------------------------------
  const complaintSeeds = [
    { tenant: 0, property: 'Yadav Family PG for Boys', category: 'MAINTENANCE', title: 'Leaking tap in shared bathroom', description: 'The cold-water tap in the second-floor bathroom has been leaking for 3 days and is wasting water.', status: 'IN_PROGRESS', priority: 'MEDIUM', daysAgo: 3 },
    { tenant: 1, property: "Pali Working Women's PG", category: 'SAFETY', title: 'Street light outside gate not working', description: 'The street light right outside our PG gate has been off for a week — feels unsafe returning after dark.', status: 'OPEN', priority: 'HIGH', daysAgo: 1 },
    { tenant: 2, property: 'Kulkarni Family Home', category: 'BILLING', title: 'Electricity bill higher than usual', description: 'This month\'s shared electricity bill seems double the usual amount — could we review the meter reading together?', status: 'RESOLVED', priority: 'LOW', daysAgo: 20, resolution: 'Meter reading was mistakenly carried over from the neighbouring unit; corrected and refunded ₹420 to the tenant.' },
  ];
  for (const c of complaintSeeds) {
    await prisma.complaint.create({
      data: {
        userId: tenants[c.tenant].user.id, propertyId: findProperty(c.property).id, category: c.category,
        title: c.title, description: c.description, status: c.status, priority: c.priority,
        resolution: c.resolution, resolvedAt: c.status === 'RESOLVED' ? daysAgo(c.daysAgo - 4) : null,
        createdAt: daysAgo(c.daysAgo),
      },
    });
  }

  const emergencyContactSeeds: [number, string, string, string][] = [
    [0, 'Sehore District Police Control Room', '100', 'Police'],
    [0, 'Mother — Kavita Mehta', '9123456701', 'Family'],
    [1, 'Pali City Hospital Emergency', '108', 'Ambulance'],
    [1, 'Brother — Rahul Sharma', '9123456702', 'Family'],
    [2, 'Landlord — Geeta Kulkarni', '9000000015', 'Landlord'],
    [2, 'Satara Fire Station', '101', 'Fire'],
  ];
  for (const [tenantIdx, name, phone, relation] of emergencyContactSeeds) {
    await prisma.emergencyContact.create({ data: { userId: tenants[tenantIdx].user.id, name, phone, relation } });
  }

  const billTypes: { type: string; provider: string; amountRange: [number, number] }[] = [
    { type: 'ELECTRICITY', provider: 'MP Poorv Kshetra Vidyut', amountRange: [620, 980] },
    { type: 'WATER', provider: 'Municipal Water Board', amountRange: [120, 220] },
    { type: 'INTERNET', provider: 'Jio Fiber', amountRange: [499, 799] },
  ];
  for (const [i, t] of [tenants[0], tenants[1], tenants[2]].entries()) {
    for (const [j, b] of billTypes.entries()) {
      const due = daysFromNow(j * 6 - 4);
      const amount = b.amountRange[0] + ((i + j) * 53) % (b.amountRange[1] - b.amountRange[0]);
      const status = j === 0 ? 'OVERDUE' : j === 1 ? 'PAID' : 'PENDING';
      await prisma.bill.create({
        data: {
          userId: t.user.id, type: b.type, provider: b.provider, amount,
          dueDate: due, status, paidDate: status === 'PAID' ? daysAgo(2) : null,
          billNumber: `BILL-${b.type.slice(0, 3)}-${100000 + i * 37 + j}`,
        },
      });
    }
  }
  console.log('✓ Complaints, emergency contacts, bill tracker entries');

  // -------------------------------------------------------------------------
  // 11. Maintenance requests, Expenses, Leads (landlord operations)
  // -------------------------------------------------------------------------
  const maintenanceSeeds = [
    { property: 'Yadav Family PG for Boys', tenant: 0, category: 'PLUMBING', title: 'Bathroom tap replacement', description: 'Second-floor shared bathroom tap needs replacing — reported by tenants.', priority: 'MEDIUM', status: 'IN_PROGRESS', cost: 450, daysAgo: 3 },
    { property: 'Kulkarni Family Home', tenant: 2, category: 'ELECTRICAL', title: 'Kitchen exhaust fan not working', description: 'Exhaust fan in the kitchen stopped spinning — likely a worn-out motor.', priority: 'LOW', status: 'OPEN', daysAgo: 6 },
    { property: 'Sahyadri Villa Retreat', tenant: null, category: 'STRUCTURAL', title: 'Monsoon roof waterproofing', description: 'Annual roof inspection flagged seepage near the north wall — full waterproofing scheduled before the next monsoon.', priority: 'HIGH', status: 'ASSIGNED', cost: 18000, daysAgo: 10 },
    { property: 'Riverside Hostel for Students', tenant: 5, category: 'CLEANING', title: 'Deep-clean of dorm B after term-end', description: 'Dorm B needs a deep clean and pest control before the new intake arrives next month.', priority: 'MEDIUM', status: 'RESOLVED', cost: 2200, resolvedAt: 2, daysAgo: 12 },
  ];
  for (const m of maintenanceSeeds) {
    await prisma.maintenanceRequest.create({
      data: {
        propertyId: findProperty(m.property).id, tenantId: m.tenant !== null ? tenants[m.tenant].user.id : null,
        category: m.category, title: m.title, description: m.description, priority: m.priority, status: m.status,
        cost: m.cost, resolvedAt: m.resolvedAt ? daysAgo(m.resolvedAt) : null, createdAt: daysAgo(m.daysAgo),
      },
    });
  }

  const expenseSeeds: { landlord: number; property?: string; category: string; amount: number; note: string; daysAgo: number }[] = [
    { landlord: 0, property: 'Yadav Family PG for Boys', category: 'REPAIR', amount: 450, note: 'Bathroom tap replacement (plumber visit)', daysAgo: 2 },
    { landlord: 0, category: 'TAX', amount: 6200, note: 'Quarterly property tax — Sehore municipal corp.', daysAgo: 35 },
    { landlord: 2, property: 'Desert View Villa', category: 'STAFF', amount: 9000, note: 'Caretaker salary — June', daysAgo: 5 },
    { landlord: 2, category: 'INSURANCE', amount: 14500, note: 'Annual property insurance renewal — 3 listings', daysAgo: 50 },
    { landlord: 4, property: 'Sahyadri Villa Retreat', category: 'REPAIR', amount: 18000, note: 'Roof waterproofing advance payment', daysAgo: 8 },
    { landlord: 4, category: 'MARKETING', amount: 1200, note: 'Local newspaper listing — Satara Samachar', daysAgo: 18 },
  ];
  for (const e of expenseSeeds) {
    await prisma.expense.create({
      data: {
        landlordId: landlords[e.landlord].profile.id, propertyId: e.property ? findProperty(e.property).id : null,
        category: e.category, amount: e.amount, note: e.note, date: daysAgo(e.daysAgo), createdAt: daysAgo(e.daysAgo),
      },
    });
  }

  const leadSeeds: { landlord: number; property?: string; tenant?: number; name: string; phone: string; message: string; source: string; status: string; daysAgo: number }[] = [
    { landlord: 0, property: 'Sunrise Farmhouse Retreat', name: 'Deepak Verma', phone: '9876543201', message: 'Is the farmhouse available for a 6-month stay starting July?', source: 'WHATSAPP', status: 'NEW', daysAgo: 1 },
    { landlord: 0, property: 'Vidisha Heritage House', tenant: 3, name: 'Sneha Joshi', phone: '9000000024', message: 'Can I visit this weekend with my partner?', source: 'WHATSAPP', status: 'CONTACTED', daysAgo: 4 },
    { landlord: 2, property: 'Rathore Haveli Apartment', tenant: 4, name: 'Imran Khan', phone: '9000000025', message: 'Interested — please share more interior photos.', source: 'CALL', status: 'QUALIFIED', daysAgo: 6 },
    { landlord: 2, property: 'Desert View Villa', name: 'Karan Oberoi', phone: '9876543202', message: 'Looking for a villa for a family wedding event in October.', source: 'SITE_VISIT', status: 'CONVERTED', daysAgo: 25 },
    { landlord: 4, property: 'Wardha Budget Hostel', name: 'Mahesh Tiwari', phone: '9876543203', message: 'Do you have AC rooms available too?', source: 'WALK_IN', status: 'LOST', daysAgo: 15 },
  ];
  for (const l of leadSeeds) {
    await prisma.lead.create({
      data: {
        landlordId: landlords[l.landlord].profile.id, propertyId: l.property ? findProperty(l.property).id : null,
        tenantId: l.tenant !== undefined ? tenants[l.tenant].user.id : null,
        name: l.name, phone: l.phone, message: l.message, source: l.source, status: l.status, createdAt: daysAgo(l.daysAgo),
      },
    });
  }
  console.log('✓ Maintenance requests, expenses, WhatsApp/call leads');

  // -------------------------------------------------------------------------
  // 12. Content management (Banners, Notices, Blog posts)
  // -------------------------------------------------------------------------
  await prisma.banner.createMany({
    data: [
      { title: 'Monsoon Move-in Offer', subtitle: 'Zero brokerage on verified rural homes — this month only', imageUrl: pick(PROPERTY_IMAGES, 1), link: '/properties?type=HOUSE', position: 0, isActive: true, startsAt: daysAgo(5), endsAt: daysFromNow(25) },
      { title: 'Now live in 5 states', subtitle: 'GPS-verified listings across MP, Bihar, Rajasthan, Gujarat & Maharashtra', imageUrl: pick(PROPERTY_IMAGES, 7), link: '/properties', position: 1, isActive: true },
      { title: 'List your property in minutes', subtitle: 'Free AI-assisted description & pricing for new landlords', imageUrl: pick(PROPERTY_IMAGES, 11), link: '/landlord/properties/new', position: 2, isActive: true },
    ],
  });

  await prisma.notice.createMany({
    data: [
      { title: 'Scheduled maintenance — June 10, 12 AM–3 AM', content: 'LocaStay will be briefly unavailable for a platform upgrade. Bookings made just before the window will be confirmed once we are back online.', audience: 'ALL', isPinned: true },
      { title: 'New: AI rent suggestions for landlords', content: 'Your property dashboard now shows an AI-suggested rent range based on nearby listings, amenities, and seasonal demand.', audience: 'LANDLORD', isPinned: false },
      { title: 'KYC reminder for new tenants', content: 'Complete your Aadhaar & PAN verification to unlock instant booking approval and higher response priority from landlords.', audience: 'TENANT', isPinned: false },
    ],
  });

  const blogSeeds = [
    { landlord: 0, title: '5 Questions to Ask Before Renting a Farmhouse', slug: '5-questions-before-renting-a-farmhouse', excerpt: 'From water sources to road access — what rural tenants often forget to check.', content: 'Renting outside the city has unique considerations: water source reliability, monsoon road access, mobile network coverage, nearest hospital distance, and local transport options. Always visit during both day and night before signing...', isPublished: true, daysAgo: 40 },
    { landlord: 2, title: 'How We Verify Every Listing on LocaStay', slug: 'how-we-verify-every-listing', excerpt: 'A peek into our on-ground verification process for rural and semi-urban homes.', content: 'Every property that earns a "Verified" badge has been physically visited by a LocaStay field partner who checks ownership documents, photographs each room, measures GPS coordinates, and records nearby essential services...', isPublished: true, daysAgo: 70 },
    { landlord: 4, title: 'Setting Fair Rent: A Landlord\'s Guide', slug: 'setting-fair-rent-a-landlords-guide', excerpt: 'Why pricing slightly below market often fills vacancies faster — with real numbers.', content: 'Our data across 200+ rural listings shows that properties priced within 5% of the AI-suggested range get booked 2.3x faster than those priced 15% above it. Here is how to read your performance score...', isPublished: false, daysAgo: 5 },
  ];
  for (const b of blogSeeds) {
    await prisma.blogPost.create({
      data: {
        landlordId: landlords[b.landlord].profile.id, title: b.title, slug: b.slug, excerpt: b.excerpt, content: b.content,
        coverImage: pick(PROPERTY_IMAGES, 9), isPublished: b.isPublished, publishedAt: b.isPublished ? daysAgo(b.daysAgo) : null, createdAt: daysAgo(b.daysAgo + 2),
      },
    });
  }
  console.log('✓ Banners, notices, blog posts');

  // -------------------------------------------------------------------------
  // 13. Support center (tickets + threaded messages)
  // -------------------------------------------------------------------------
  const ticket1 = await prisma.supportTicket.create({
    data: {
      userId: tenants[5].user.id, subject: 'KYC document rejected — need help re-uploading', category: 'ACCOUNT',
      description: 'My Aadhaar upload was rejected for being blurry. I tried again but the app keeps showing the old status. Please help.',
      status: 'IN_PROGRESS', priority: 'MEDIUM', createdAt: daysAgo(6),
    },
  });
  await prisma.ticketMessage.createMany({
    data: [
      { ticketId: ticket1.id, senderId: tenants[5].user.id, message: 'My Aadhaar upload was rejected for being blurry. I tried again but the app keeps showing the old status.', isStaff: false, createdAt: daysAgo(6) },
      { ticketId: ticket1.id, senderId: admin.id, message: 'Thanks for reaching out, Lakshmi. Please clear your app cache and re-upload — I have manually reset your KYC status so you can try again right away.', isStaff: true, createdAt: daysAgo(5) },
      { ticketId: ticket1.id, senderId: tenants[5].user.id, message: 'That worked, thank you! Re-uploading now.', isStaff: false, createdAt: daysAgo(5) },
    ],
  });

  const ticket2 = await prisma.supportTicket.create({
    data: {
      userId: landlords[3].user.id, subject: 'Payout not received for May rent', category: 'BILLING',
      description: 'Two of my tenants paid rent through the app in May but the payout to my bank account has not reflected yet.',
      status: 'OPEN', priority: 'HIGH', createdAt: daysAgo(2),
    },
  });
  await prisma.ticketMessage.create({
    data: { ticketId: ticket2.id, senderId: landlords[3].user.id, message: 'Two of my tenants paid rent through the app in May but the payout to my bank account has not reflected yet. Could someone check?', isStaff: false, createdAt: daysAgo(2) },
  });

  const ticket3 = await prisma.supportTicket.create({
    data: {
      userId: tenants[3].user.id, subject: 'How do I cancel a booking request?', category: 'BOOKING',
      description: 'I sent a booking request by mistake and would like to withdraw it before the landlord responds.',
      status: 'RESOLVED', priority: 'LOW', createdAt: daysAgo(15), updatedAt: daysAgo(14),
    },
  });
  await prisma.ticketMessage.createMany({
    data: [
      { ticketId: ticket3.id, senderId: tenants[3].user.id, message: 'I sent a booking request by mistake — how do I withdraw it?', isStaff: false, createdAt: daysAgo(15) },
      { ticketId: ticket3.id, senderId: admin.id, message: 'You can cancel any pending request from "My Bookings" → tap the request → Cancel Request. I have also cancelled this one for you manually.', isStaff: true, createdAt: daysAgo(14) },
    ],
  });
  console.log('✓ Support tickets with message threads');

  // -------------------------------------------------------------------------
  // 14. Fraud flags (AI trust & safety, for Admin review)
  // -------------------------------------------------------------------------
  await prisma.fraudFlag.createMany({
    data: [
      {
        entityType: 'PROPERTY', propertyId: findProperty('Junagadh Cottage House').id, riskScore: 62,
        reasons: toJsonArray(['Listing price is 38% below nearby comparable properties', 'Cover image appears in a reverse-image search on an unrelated listing site', 'Landlord account created less than 14 days ago']),
        status: 'UNDER_REVIEW', createdAt: daysAgo(3),
      },
      {
        entityType: 'USER', userId: tenants[5].user.id, riskScore: 38,
        reasons: toJsonArray(['Multiple booking requests cancelled within 24 hours', 'KYC document rejected twice for tampering signals']),
        status: 'FLAGGED', createdAt: daysAgo(7),
      },
      {
        entityType: 'PROPERTY', propertyId: findProperty('Cozy Single Room near Market').id, riskScore: 22,
        reasons: toJsonArray(['New listing with no verification visit yet']),
        status: 'CLEARED', reviewedBy: admin.id, createdAt: daysAgo(20), updatedAt: daysAgo(18),
      },
    ],
  });
  console.log('✓ AI fraud-detection flags for admin review');

  // -------------------------------------------------------------------------
  // 15. Local services directory
  // -------------------------------------------------------------------------
  const localServiceSeeds: { name: string; category: string; phone: string; address: string; city: string; lat: number; lng: number; rating: number; verified: boolean }[] = [
    { name: 'Sehore District Hospital', category: 'HOSPITAL', phone: '07562-226633', address: 'Bhopal Naka Road', city: 'Sehore', lat: 23.2050, lng: 77.0860, rating: 4.1, verified: true },
    { name: 'Apna Medical Store', category: 'PHARMACY', phone: '9425012345', address: 'Station Road', city: 'Sehore', lat: 23.2040, lng: 77.0850, rating: 4.4, verified: true },
    { name: 'Sharma Kirana & General Store', category: 'GROCERY', phone: '9425023456', address: 'Gandhi Chowk', city: 'Begusarai', lat: 25.4160, lng: 86.1300, rating: 4.0, verified: false },
    { name: 'Verma Electricals', category: 'ELECTRICIAN', phone: '9876512340', address: 'Ward 9', city: 'Begusarai', lat: 25.4190, lng: 86.1280, rating: 4.6, verified: true },
    { name: 'Rajesh Plumbing Works', category: 'PLUMBER', phone: '9876512341', address: 'Rani Bazar', city: 'Bikaner', lat: 28.0235, lng: 73.3110, rating: 4.3, verified: true },
    { name: 'Bikaner Auto & Tempo Stand', category: 'TRANSPORT', phone: '9876512342', address: 'Bus Stand Road', city: 'Bikaner', lat: 28.0210, lng: 73.3140, rating: 3.9, verified: false },
    { name: 'Rani Bazar Police Chowki', category: 'POLICE', phone: '100', address: 'Rani Bazar', city: 'Bikaner', lat: 28.0225, lng: 73.3125, rating: 4.0, verified: true },
    { name: 'Anand Public School', category: 'SCHOOL', phone: '02692-240123', address: 'V V Nagar Road', city: 'Anand', lat: 22.5660, lng: 72.9300, rating: 4.5, verified: true },
    { name: 'Bank of Baroda — Anand Branch', category: 'BANK', phone: '02692-250456', address: 'Station Road', city: 'Anand', lat: 22.5630, lng: 72.9270, rating: 4.2, verified: true },
    { name: 'Satara City Hospital', category: 'HOSPITAL', phone: '02162-234567', address: 'Shukrawar Peth', city: 'Satara', lat: 17.6810, lng: 74.0190, rating: 4.3, verified: true },
    { name: 'Kulkarni Medicos', category: 'PHARMACY', phone: '9876512345', address: 'Shukrawar Peth Lane 1', city: 'Satara', lat: 17.6800, lng: 74.0175, rating: 4.5, verified: true },
    { name: 'Yavateshwar Auto Service', category: 'TRANSPORT', phone: '9876512346', address: 'Hill Road', city: 'Satara', lat: 17.6900, lng: 73.9750, rating: 3.7, verified: false },
  ];
  await prisma.localService.createMany({
    data: localServiceSeeds.map((s) => ({ name: s.name, category: s.category, phone: s.phone, address: s.address, city: s.city, latitude: s.lat, longitude: s.lng, rating: s.rating, isVerified: s.verified })),
  });
  console.log(`✓ ${localServiceSeeds.length} local service directory entries`);

  // -------------------------------------------------------------------------
  // 16. Analytics events + audit log (admin overview charts)
  // -------------------------------------------------------------------------
  const eventTypes = ['PROPERTY_VIEW', 'SEARCH', 'BOOKING', 'PAYMENT', 'LOGIN'] as const;
  const analyticsRows = [];
  for (let d = 29; d >= 0; d--) {
    const date = daysAgo(d);
    for (const [idx, type] of eventTypes.entries()) {
      const base = { PROPERTY_VIEW: 38, SEARCH: 26, BOOKING: 5, PAYMENT: 4, LOGIN: 21 }[type];
      const variance = ((d * 7 + idx * 13) % 17) - 8;
      const count = Math.max(1, base + variance);
      for (let c = 0; c < count; c += Math.max(1, Math.floor(count / 3))) {
        analyticsRows.push({ type, entityId: pick(properties, c + d).row.id, metadata: JSON.stringify({ count }), createdAt: date });
      }
    }
  }
  // Cap volume to keep seeding fast while still giving charts a real 30-day shape
  const trimmed = analyticsRows.filter((_, i) => i % 2 === 0);
  await prisma.analyticsEvent.createMany({ data: trimmed });
  console.log(`✓ ${trimmed.length} analytics events (30-day activity shape)`);

  await prisma.auditLog.createMany({
    data: [
      { actorId: admin.id, action: 'VERIFY_KYC', entityType: 'USER', entityId: tenants[0].user.id, metadata: JSON.stringify({ result: 'VERIFIED' }), createdAt: daysAgo(58) },
      { actorId: admin.id, action: 'APPROVE_LISTING', entityType: 'PROPERTY', entityId: findProperty('Rathore Haveli Apartment').id, metadata: JSON.stringify({ result: 'AVAILABLE' }), createdAt: daysAgo(44) },
      { actorId: admin.id, action: 'FEATURE_LISTING', entityType: 'PROPERTY', entityId: findProperty('Sunrise Farmhouse Retreat').id, createdAt: daysAgo(30) },
      { actorId: admin.id, action: 'SUSPEND_USER', entityType: 'USER', entityId: tenants[5].user.id, metadata: JSON.stringify({ reason: 'Repeated cancelled bookings — under review', reverted: true }), createdAt: daysAgo(7) },
      { actorId: admin.id, action: 'REJECT_LISTING', entityType: 'PROPERTY', entityId: findProperty('Junagadh Cottage House').id, metadata: JSON.stringify({ reason: 'Pending field verification visit' }), createdAt: daysAgo(3) },
    ],
  });
  console.log('✓ Audit log entries');

  // -------------------------------------------------------------------------
  // 17. General notifications (system / KYC / lead) so notification centers aren't empty
  // -------------------------------------------------------------------------
  await prisma.notification.createMany({
    data: [
      { userId: tenants[3].user.id, type: 'KYC', title: 'KYC under review', message: 'Your Aadhaar and PAN documents are being reviewed. This usually takes 24–48 hours.', link: '/tenant/profile' },
      { userId: tenants[5].user.id, type: 'KYC', title: 'KYC document rejected', message: 'Your Aadhaar upload was rejected: blurred image. Please re-upload a clearer copy.', link: '/tenant/profile' },
      { userId: landlords[0].user.id, type: 'LEAD', title: 'New WhatsApp lead', message: 'Deepak Verma is interested in Sunrise Farmhouse Retreat — reply within 2 hours for higher conversion.', link: '/landlord/leads' },
      { userId: landlords[3].user.id, type: 'SYSTEM', title: 'Verification pending', message: 'Your landlord profile is pending verification. Upload your PAN and a address proof to get the "Verified Landlord" badge.', link: '/landlord/profile' },
      { userId: admin.id, type: 'SYSTEM', title: 'New fraud flag raised', message: 'AI trust & safety flagged "Junagadh Cottage House" for review — risk score 62/100.', link: '/admin/fraud' },
    ],
  });
  console.log('✓ System / KYC / lead notifications');

  console.log('\n✅  Seed complete!\n');
  console.log('───────────────────────────────────────────────');
  console.log(' Demo login — password for ALL accounts below:');
  console.log(`   ${DEMO_PASSWORD}`);
  console.log('───────────────────────────────────────────────');
  console.log(`  Admin     →  admin@locastay.in`);
  console.log(`  Landlord  →  ramesh.yadav@locastay.in   (verified, 6 listings)`);
  console.log(`  Landlord  →  vikram.rathore@locastay.in (verified, premium listings)`);
  console.log(`  Tenant    →  aarav.mehta@locastay.in    (active tenancy + payments)`);
  console.log(`  Tenant    →  priya.sharma@locastay.in   (active tenancy + reviews)`);
  console.log('───────────────────────────────────────────────\n');
}

main()
  .catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
