/**
 * Hand-written database types matching 001_schema_and_rls.sql.
 * Replace this file with the output of `supabase gen types typescript` once
 * you have a live Supabase project:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 */

// ─── Enum literals ───────────────────────────────────────────────────────────
export type UserRole           = 'TENANT' | 'LANDLORD' | 'ADMIN';
export type KycStatus          = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type PropertyType       = 'HOUSE' | 'HOSTEL' | 'PG' | 'ROOM' | 'FARM_HOUSE' | 'APARTMENT' | 'VILLA';
export type PropertyStatus     = 'PENDING' | 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'DELISTED' | 'REJECTED';
export type BookingStatus      = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus      = 'PENDING' | 'PAID' | 'OVERDUE' | 'FAILED' | 'REFUNDED';
export type PaymentMethod      = 'UPI' | 'NEFT' | 'CASH' | 'CARD';
export type AgreementStatus    = 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type DocumentType       = 'AADHAAR' | 'PAN' | 'POLICE_VERIFICATION' | 'INCOME_PROOF' | 'PROPERTY_DEED';
export type NotificationType   = 'BOOKING' | 'PAYMENT' | 'AGREEMENT' | 'KYC' | 'SYSTEM' | 'COMPLAINT' | 'MAINTENANCE' | 'LEAD';
export type ComplaintCategory  = 'MAINTENANCE' | 'NEIGHBOR' | 'LANDLORD' | 'SAFETY' | 'BILLING' | 'OTHER';
export type ComplaintStatus    = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type PriorityLevel      = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type MaintenanceCategory = 'PLUMBING' | 'ELECTRICAL' | 'CLEANING' | 'STRUCTURAL' | 'APPLIANCE' | 'OTHER';
export type ExpenseCategory    = 'REPAIR' | 'TAX' | 'INSURANCE' | 'UTILITIES' | 'STAFF' | 'MARKETING' | 'OTHER';
export type LeadSource         = 'WHATSAPP' | 'CALL' | 'SITE_VISIT' | 'WALK_IN';
export type LeadStatus         = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
export type BillType           = 'WATER' | 'ELECTRICITY' | 'INTERNET' | 'GAS' | 'MAINTENANCE';
export type BillStatus         = 'PENDING' | 'PAID' | 'OVERDUE';
export type SupportCategory    = 'TECHNICAL' | 'BILLING' | 'BOOKING' | 'ACCOUNT' | 'OTHER';
export type TicketStatus       = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type FraudEntityType    = 'USER' | 'PROPERTY' | 'BOOKING' | 'REVIEW';
export type FraudStatus        = 'FLAGGED' | 'UNDER_REVIEW' | 'CONFIRMED' | 'CLEARED';
export type NoticeAudience     = 'ALL' | 'TENANT' | 'LANDLORD';

// ─── Row types (read from DB) ─────────────────────────────────────────────────
export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  language: string;
  bio: string | null;
  address: string | null;
  village: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  dob: string | null;
  occupation: string | null;
  monthly_income: number | null;
  family_size: number | null;
  kyc_status: KycStatus;
  aadhaar_number: string | null;
  aadhaar_url: string | null;
  pan_number: string | null;
  credit_score: number;
  preferred_amenities: string[];
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LandlordProfile {
  id: string;
  user_id: string;
  business_name: string | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  bank_account: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  pan_number: string | null;
  gst_number: string | null;
  verification_status: VerificationStatus;
  response_rate: number;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  landlord_id: string;
  title: string;
  description: string | null;
  type: PropertyType;
  status: PropertyStatus;
  rent: number;
  deposit: number;
  address: string;
  village: string | null;
  city: string;
  district: string | null;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  square_feet: number | null;
  available_from: string;
  total_rooms: number;
  occupied_rooms: number;
  cover_image: string | null;
  images: string[];
  videos: string[];
  documents: string[];
  virtual_tour_url: string | null;
  distance_to_school: number | null;
  distance_to_hospital: number | null;
  distance_to_college: number | null;
  distance_to_market: number | null;
  distance_to_bus_stand: number | null;
  distance_to_railway: number | null;
  distance_to_atm: number | null;
  ai_suggested_rent: number | null;
  performance_score: number;
  views: number;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_featured: boolean;
  rejection_reason: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  tenant_id: string;
  property_id: string;
  status: BookingStatus;
  move_in_date: string;
  duration_months: number;
  message: string | null;
  rejection_reason: string | null;
  requested_at: string;
  responded_at: string | null;
}

export interface RentPayment {
  id: string;
  tenant_id: string;
  property_id: string;
  booking_id: string | null;
  period: string;
  amount: number;
  late_fee: number;
  due_date: string;
  paid_date: string | null;
  status: PaymentStatus;
  method: PaymentMethod | null;
  transaction_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agreement {
  id: string;
  tenant_id: string;
  landlord_id: string;
  property_id: string;
  booking_id: string | null;
  rent_amount: number;
  deposit_amount: number;
  start_date: string;
  end_date: string | null;
  renewal_date: string | null;
  terms: string[];
  status: AgreementStatus;
  tenant_signed_at: string | null;
  landlord_signed_at: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  property_id: string;
  tenant_id: string;
  rating: number;
  comment: string | null;
  images: string[];
  landlord_reply: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  type: DocumentType;
  url: string;
  number: string | null;
  status: KycStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Complaint {
  id: string;
  user_id: string;
  property_id: string | null;
  category: ComplaintCategory;
  title: string;
  description: string;
  attachments: string[];
  status: ComplaintStatus;
  priority: PriorityLevel;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relation: string;
  created_at: string;
}

export interface Bill {
  id: string;
  user_id: string;
  type: BillType;
  provider: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: BillStatus;
  bill_number: string | null;
  created_at: string;
}

export interface MaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id: string | null;
  category: MaintenanceCategory;
  title: string;
  description: string;
  images: string[];
  priority: PriorityLevel;
  status: ComplaintStatus;
  cost: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  landlord_id: string;
  property_id: string | null;
  category: ExpenseCategory;
  amount: number;
  date: string;
  note: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  landlord_id: string;
  property_id: string | null;
  tenant_id: string | null;
  name: string;
  phone: string;
  message: string | null;
  source: LeadSource;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: SupportCategory;
  description: string;
  status: TicketStatus;
  priority: PriorityLevel;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_staff: boolean;
  created_at: string;
}

export interface FraudFlag {
  id: string;
  entity_type: FraudEntityType;
  user_id: string | null;
  property_id: string | null;
  risk_score: number;
  reasons: string[];
  status: FraudStatus;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedProperty {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

// ─── Database interface (for createClient<Database>()) ────────────────────────
export interface Database {
  public: {
    Tables: {
      profiles:             { Row: Profile;           Insert: Partial<Profile> & Pick<Profile, 'id' | 'name' | 'email'>;         Update: Partial<Profile> };
      landlord_profiles:    { Row: LandlordProfile;   Insert: Omit<LandlordProfile, 'id' | 'created_at' | 'updated_at'>;         Update: Partial<LandlordProfile> };
      properties:           { Row: Property;          Insert: Omit<Property, 'id' | 'created_at' | 'updated_at' | 'views' | 'rating' | 'review_count' | 'performance_score'>; Update: Partial<Property> };
      bookings:             { Row: Booking;           Insert: Omit<Booking, 'id' | 'requested_at'>;                               Update: Partial<Booking> };
      rent_payments:        { Row: RentPayment;       Insert: Omit<RentPayment, 'id' | 'created_at' | 'updated_at'>;              Update: Partial<RentPayment> };
      agreements:           { Row: Agreement;         Insert: Omit<Agreement, 'id' | 'created_at' | 'updated_at'>;                Update: Partial<Agreement> };
      reviews:              { Row: Review;            Insert: Omit<Review, 'id' | 'created_at' | 'updated_at'>;                   Update: Partial<Review> };
      documents:            { Row: Document;          Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'>;                 Update: Partial<Document> };
      notifications:        { Row: Notification;      Insert: Omit<Notification, 'id' | 'created_at'>;                            Update: Partial<Notification> };
      complaints:           { Row: Complaint;         Insert: Omit<Complaint, 'id' | 'created_at'>;                               Update: Partial<Complaint> };
      emergency_contacts:   { Row: EmergencyContact;  Insert: Omit<EmergencyContact, 'id' | 'created_at'>;                        Update: Partial<EmergencyContact> };
      bills:                { Row: Bill;              Insert: Omit<Bill, 'id' | 'created_at'>;                                    Update: Partial<Bill> };
      maintenance_requests: { Row: MaintenanceRequest; Insert: Omit<MaintenanceRequest, 'id' | 'created_at' | 'updated_at'>;     Update: Partial<MaintenanceRequest> };
      expenses:             { Row: Expense;           Insert: Omit<Expense, 'id' | 'created_at'>;                                 Update: Partial<Expense> };
      leads:                { Row: Lead;              Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'>;                     Update: Partial<Lead> };
      support_tickets:      { Row: SupportTicket;     Insert: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>;            Update: Partial<SupportTicket> };
      ticket_messages:      { Row: TicketMessage;     Insert: Omit<TicketMessage, 'id' | 'created_at'>;                           Update: Partial<TicketMessage> };
      fraud_flags:          { Row: FraudFlag;         Insert: Omit<FraudFlag, 'id' | 'created_at' | 'updated_at'>;                Update: Partial<FraudFlag> };
      saved_properties:     { Row: SavedProperty;     Insert: Omit<SavedProperty, 'id' | 'created_at'>;                           Update: Partial<SavedProperty> };
    };
    Views:   Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      kyc_status: KycStatus;
      property_type: PropertyType;
      property_status: PropertyStatus;
      booking_status: BookingStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      agreement_status: AgreementStatus;
    };
  };
}
