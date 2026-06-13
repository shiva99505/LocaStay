/**
 * Canonical "enum" values for fields stored as plain strings in SQLite
 * (see prisma/schema.prisma doc-comments for the Postgres `enum` mapping).
 * Centralising them here keeps labels/colors/options consistent everywhere.
 */

export const USER_ROLES = ['TENANT', 'LANDLORD', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PROPERTY_TYPES = ['HOUSE', 'HOSTEL', 'PG', 'ROOM', 'FARM_HOUSE', 'APARTMENT', 'VILLA'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  HOUSE: 'House', HOSTEL: 'Hostel', PG: 'PG', ROOM: 'Single Room', FARM_HOUSE: 'Farm House',
  APARTMENT: 'Apartment', VILLA: 'Villa',
};

export const PROPERTY_STATUSES = ['PENDING', 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'DELISTED', 'REJECTED'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const PROPERTY_STATUS_META: Record<PropertyStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending Review', tone: 'warning' },
  AVAILABLE: { label: 'Available', tone: 'success' },
  OCCUPIED: { label: 'Occupied', tone: 'info' },
  MAINTENANCE: { label: 'Under Maintenance', tone: 'warning' },
  DELISTED: { label: 'Delisted', tone: 'muted' },
  REJECTED: { label: 'Rejected', tone: 'destructive' },
};

export const BOOKING_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_META: Record<BookingStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Awaiting Response', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'destructive' },
  CANCELLED: { label: 'Cancelled', tone: 'muted' },
  COMPLETED: { label: 'Completed', tone: 'info' },
};

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'OVERDUE', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Due', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  OVERDUE: { label: 'Overdue', tone: 'destructive' },
  FAILED: { label: 'Failed', tone: 'destructive' },
  REFUNDED: { label: 'Refunded', tone: 'info' },
};

export const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const AGREEMENT_STATUSES = ['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED'] as const;
export type AgreementStatus = (typeof AGREEMENT_STATUSES)[number];

export const AGREEMENT_STATUS_META: Record<AgreementStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Draft', tone: 'muted' },
  PENDING_SIGNATURE: { label: 'Awaiting Signature', tone: 'warning' },
  ACTIVE: { label: 'Active', tone: 'success' },
  EXPIRED: { label: 'Expired', tone: 'destructive' },
  TERMINATED: { label: 'Terminated', tone: 'muted' },
};

export const COMPLAINT_CATEGORIES = ['MAINTENANCE', 'NEIGHBOR', 'LANDLORD', 'SAFETY', 'BILLING', 'OTHER'] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_META: Record<TicketStatus, { label: string; tone: Tone }> = {
  OPEN: { label: 'Open', tone: 'warning' },
  IN_PROGRESS: { label: 'In Progress', tone: 'info' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
  CLOSED: { label: 'Closed', tone: 'muted' },
};

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_META: Record<Priority, { label: string; tone: Tone }> = {
  LOW: { label: 'Low', tone: 'muted' },
  MEDIUM: { label: 'Medium', tone: 'info' },
  HIGH: { label: 'High', tone: 'warning' },
  URGENT: { label: 'Urgent', tone: 'destructive' },
};

export const BILL_TYPES = ['WATER', 'ELECTRICITY', 'INTERNET', 'GAS', 'MAINTENANCE'] as const;
export type BillType = (typeof BILL_TYPES)[number];

export const BILL_TYPE_META: Record<BillType, { label: string; icon: string }> = {
  WATER: { label: 'Water', icon: 'droplets' },
  ELECTRICITY: { label: 'Electricity', icon: 'zap' },
  INTERNET: { label: 'Internet / Broadband', icon: 'wifi' },
  GAS: { label: 'Cooking Gas', icon: 'flame' },
  MAINTENANCE: { label: 'Maintenance', icon: 'wrench' },
};

export const DOCUMENT_TYPES = ['AADHAAR', 'PAN', 'POLICE_VERIFICATION', 'INCOME_PROOF', 'PROPERTY_DEED'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const LEAD_SOURCES = ['WHATSAPP', 'CALL', 'SITE_VISIT', 'WALK_IN'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const MAINTENANCE_CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'CLEANING', 'STRUCTURAL', 'APPLIANCE', 'OTHER'] as const;
export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];

export const MAINTENANCE_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const EXPENSE_CATEGORIES = ['REPAIR', 'TAX', 'INSURANCE', 'UTILITIES', 'STAFF', 'MARKETING', 'OTHER'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const FRAUD_STATUSES = ['FLAGGED', 'UNDER_REVIEW', 'CONFIRMED', 'CLEARED'] as const;
export type FraudStatus = (typeof FRAUD_STATUSES)[number];

export const NOTICE_AUDIENCES = ['ALL', 'TENANT', 'LANDLORD'] as const;
export type NoticeAudience = (typeof NOTICE_AUDIENCES)[number];

export type Tone = 'success' | 'warning' | 'destructive' | 'info' | 'muted' | 'brand';

// ── Amenities ──────────────────────────────────────────────────────────
export const AMENITIES = [
  { key: 'WIFI', label: 'WiFi', icon: 'wifi' },
  { key: 'PARKING', label: 'Parking', icon: 'square-parking' },
  { key: 'WATER', label: '24×7 Water', icon: 'droplets' },
  { key: 'ELECTRICITY', label: 'Power Backup', icon: 'zap' },
  { key: 'CCTV', label: 'CCTV Security', icon: 'camera' },
  { key: 'FOOD', label: 'Food / Mess', icon: 'utensils' },
  { key: 'LAUNDRY', label: 'Laundry', icon: 'shirt' },
  { key: 'ATTACHED_BATHROOM', label: 'Attached Bathroom', icon: 'bath' },
  { key: 'STUDY_AREA', label: 'Study Area', icon: 'book-open' },
  { key: 'SECURITY', label: '24×7 Security', icon: 'shield-check' },
  { key: 'AC', label: 'Air Conditioning', icon: 'snowflake' },
  { key: 'FURNISHED', label: 'Furnished', icon: 'sofa' },
] as const;
export type AmenityKey = (typeof AMENITIES)[number]['key'];

// ── Nearby distance categories shown on property pages ───────────────────
export const NEARBY_PLACES = [
  { key: 'distanceToSchool', label: 'School', icon: 'school' },
  { key: 'distanceToHospital', label: 'Hospital', icon: 'cross' },
  { key: 'distanceToBusStand', label: 'Bus Stand', icon: 'bus' },
  { key: 'distanceToRailway', label: 'Railway Station', icon: 'train-front' },
  { key: 'distanceToMarket', label: 'Market', icon: 'shopping-basket' },
  { key: 'distanceToCollege', label: 'College', icon: 'graduation-cap' },
  { key: 'distanceToATM', label: 'ATM', icon: 'banknote' },
] as const;

// ── Geography (demo coverage area: rural clusters around real Indian towns) ──
export const COVERAGE_STATES = ['Madhya Pradesh', 'Bihar', 'Rajasthan', 'Uttar Pradesh', 'Gujarat', 'Maharashtra'] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha',
  'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

// ── Local services directory categories ───────────────────────────────────
export const LOCAL_SERVICE_CATEGORIES = [
  { key: 'HOSPITAL', label: 'Hospitals & Clinics', icon: 'cross' },
  { key: 'PHARMACY', label: 'Pharmacies', icon: 'pill' },
  { key: 'GROCERY', label: 'Grocery & Kirana', icon: 'shopping-cart' },
  { key: 'ELECTRICIAN', label: 'Electricians', icon: 'plug-zap' },
  { key: 'PLUMBER', label: 'Plumbers', icon: 'wrench' },
  { key: 'TRANSPORT', label: 'Transport & Auto', icon: 'car' },
  { key: 'POLICE', label: 'Police Station', icon: 'shield' },
  { key: 'SCHOOL', label: 'Schools', icon: 'school' },
  { key: 'BANK', label: 'Banks & ATMs', icon: 'landmark' },
] as const;

// ── Helpers for JSON-encoded array columns (SQLite has no native arrays) ──
export function toJsonArray(value: unknown[]): string {
  return JSON.stringify(value ?? []);
}

export function fromJsonArray<T = string>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
