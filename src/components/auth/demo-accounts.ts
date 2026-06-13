import type { UserRole } from '@/lib/constants';

export type DemoAccount = { role: UserRole; label: string; email: string; hint: string };

/** Mirrors prisma/seed.ts — keep credentials in sync if the seed data changes. */
export const DEMO_PASSWORD = 'Demo@1234';

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: 'TENANT', label: 'Tenant', email: 'aarav.mehta@locastay.in', hint: 'Active tenancy, payments & reviews' },
  { role: 'LANDLORD', label: 'Landlord', email: 'ramesh.yadav@locastay.in', hint: 'Verified, 6 listings & leads' },
  { role: 'ADMIN', label: 'Admin', email: 'admin@locastay.in', hint: 'Full platform oversight' },
];
