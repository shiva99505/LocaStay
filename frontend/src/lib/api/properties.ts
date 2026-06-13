import { api } from './client';

export interface Property {
  id: string;
  title: string;
  type: string;
  rent: number;
  city: string;
  state: string;
  village?: string;
  cover_image?: string;
  images: string[];
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_featured: boolean;
  total_rooms: number;
  occupied_rooms: number;
  latitude?: number;
  longitude?: number;
  status: string;
}

export interface PropertyFilters {
  type?: string;
  city?: string;
  state?: string;
  minRent?: number;
  maxRent?: number;
  rooms?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export function listProperties(filters: PropertyFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params.set(k, String(v)); });
  const qs = params.toString();
  return api.get<{ data: Property[]; total: number; page: number }>(`/properties${qs ? '?' + qs : ''}`);
}

export function getProperty(id: string) {
  return api.get<{ data: Property; reviews: unknown[] }>(`/properties/${id}`);
}

export function createProperty(data: Partial<Property>) {
  return api.post<{ data: Property }>('/properties', data);
}

export function updateProperty(id: string, data: Partial<Property>) {
  return api.patch<{ data: Property }>(`/properties/${id}`, data);
}

export function delistProperty(id: string) {
  return api.delete(`/properties/${id}`);
}

export function checkSaved(id: string) {
  return api.get<{ saved: boolean }>(`/properties/${id}/save`);
}

export function toggleSaved(id: string) {
  return api.post<{ saved: boolean }>(`/properties/${id}/save`);
}
