// @ts-nocheck
/**
 * Booking & RentPayment CRUD helpers.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Booking, RentPayment, BookingStatus } from './database.types';

type DB = SupabaseClient<Database>;

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface CreateBookingInput {
  tenantId:       string;
  propertyId:     string;
  moveInDate:     string;     // ISO date string
  durationMonths?: number;
  message?:       string;
}

/** Tenant submits a booking request. */
export async function createBooking(db: DB, input: CreateBookingInput): Promise<Booking> {
  // Guard: block if tenant already has a PENDING/APPROVED booking for this property
  const { data: existing } = await db
    .from('bookings')
    .select('id, status')
    .eq('tenant_id', input.tenantId)
    .eq('property_id', input.propertyId)
    .in('status', ['PENDING', 'APPROVED'])
    .maybeSingle();

  if (existing) {
    throw new Error(
      existing.status === 'APPROVED'
        ? 'You already have an active booking for this property.'
        : 'A booking request is already pending for this property.',
    );
  }

  const { data, error } = await db
    .from('bookings')
    .insert({
      tenant_id:      input.tenantId,
      property_id:    input.propertyId,
      move_in_date:   input.moveInDate,
      duration_months: input.durationMonths ?? 11,
      message:        input.message,
      status:         'PENDING',
    })
    .select()
    .single();

  if (error) throw new Error(`createBooking: ${error.message}`);
  return data;
}

/** Get a single booking by ID. */
export async function getBooking(db: DB, id: string): Promise<Booking | null> {
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`getBooking: ${error.message}`);
  }
  return data;
}

/** List bookings for a tenant. */
export async function getTenantBookings(
  db: DB,
  tenantId: string,
  status?: BookingStatus,
): Promise<Booking[]> {
  let query = db
    .from('bookings')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('requested_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`getTenantBookings: ${error.message}`);
  return data ?? [];
}

/** List bookings for all properties owned by a landlord. */
export async function getLandlordBookings(
  db: DB,
  landlordId: string,
  status?: BookingStatus,
): Promise<Booking[]> {
  let query = db
    .from('bookings')
    .select(`
      *,
      properties!inner(id, title, landlord_id),
      profiles!tenant_id(id, name, email, phone, avatar)
    `)
    .eq('properties.landlord_id', landlordId)
    .order('requested_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`getLandlordBookings: ${error.message}`);
  return (data ?? []) as unknown as Booking[];
}

/** Landlord approves a booking. */
export async function approveBooking(db: DB, id: string): Promise<Booking> {
  const { data, error } = await db
    .from('bookings')
    .update({ status: 'APPROVED', responded_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`approveBooking: ${error.message}`);
  return data;
}

/** Landlord rejects a booking with a reason. */
export async function rejectBooking(
  db: DB,
  id: string,
  reason?: string,
): Promise<Booking> {
  const { data, error } = await db
    .from('bookings')
    .update({
      status:           'REJECTED',
      rejection_reason: reason ?? null,
      responded_at:     new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`rejectBooking: ${error.message}`);
  return data;
}

/** Tenant cancels their own PENDING booking. */
export async function cancelBooking(db: DB, id: string, tenantId: string): Promise<void> {
  const { error } = await db
    .from('bookings')
    .update({ status: 'CANCELLED' })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('status', 'PENDING');

  if (error) throw new Error(`cancelBooking: ${error.message}`);
}

// ─── Rent Payments ────────────────────────────────────────────────────────────

/** Fetch all payments for a tenant. */
export async function getTenantPayments(
  db: DB,
  tenantId: string,
): Promise<RentPayment[]> {
  const { data, error } = await db
    .from('rent_payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: false });

  if (error) throw new Error(`getTenantPayments: ${error.message}`);
  return data ?? [];
}

/** Fetch all payments for properties owned by a landlord. */
export async function getLandlordPayments(
  db: DB,
  landlordId: string,
): Promise<RentPayment[]> {
  const { data, error } = await db
    .from('rent_payments')
    .select(`
      *,
      properties!inner(id, title, landlord_id)
    `)
    .eq('properties.landlord_id', landlordId)
    .order('due_date', { ascending: false });

  if (error) throw new Error(`getLandlordPayments: ${error.message}`);
  return (data ?? []) as unknown as RentPayment[];
}

export interface PayRentInput {
  paymentId:     string;
  tenantId:      string;
  method:        RentPayment['method'];
  transactionId: string;
}

/** Mark a rent payment as PAID (UPI / NEFT simulation). */
export async function markRentPaid(db: DB, input: PayRentInput): Promise<RentPayment> {
  const { data, error } = await db
    .from('rent_payments')
    .update({
      status:         'PAID',
      method:         input.method,
      transaction_id: input.transactionId,
      paid_date:      new Date().toISOString(),
    })
    .eq('id', input.paymentId)
    .eq('tenant_id', input.tenantId)
    .eq('status', 'PENDING')
    .select()
    .single();

  if (error) throw new Error(`markRentPaid: ${error.message}`);
  return data;
}

/** Create a rent payment record (landlord / admin action). */
export async function createRentPayment(
  db: DB,
  input: Omit<RentPayment, 'id' | 'created_at' | 'updated_at'>,
): Promise<RentPayment> {
  const { data, error } = await db
    .from('rent_payments')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`createRentPayment: ${error.message}`);
  return data;
}

/** Get overdue payments (admin / landlord dashboard). */
export async function getOverduePayments(db: DB): Promise<RentPayment[]> {
  const { data, error } = await db
    .from('rent_payments')
    .select('*')
    .eq('status', 'PENDING')
    .lt('due_date', new Date().toISOString())
    .order('due_date', { ascending: true });

  if (error) throw new Error(`getOverduePayments: ${error.message}`);
  return data ?? [];
}
