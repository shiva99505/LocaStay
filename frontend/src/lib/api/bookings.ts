import { api } from './client';

export function createBooking(data: { property_id: string; move_in_date?: string; duration_months?: number; message?: string }) {
  return api.post('/bookings', data);
}

export function getBooking(id: string) {
  return api.get(`/bookings/${id}`);
}

export function approveBooking(id: string) {
  return api.patch(`/bookings/${id}`, { action: 'APPROVE' });
}

export function rejectBooking(id: string) {
  return api.patch(`/bookings/${id}`, { action: 'REJECT' });
}

export function cancelBooking(id: string) {
  return api.delete(`/bookings/${id}`);
}

export function getMyBookings() {
  return api.get('/tenant/bookings');
}
