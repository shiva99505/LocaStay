import type { PropertyStatus, PropertyType } from '@/lib/constants';

/** Generic property card data (Supabase-based, no Prisma). */
export type PropertyCardData = {
  id: string;
  title: string;
  type: PropertyType;
  rent: number;
  village?: string | null;
  city: string;
  state: string;
  cover_image?: string | null;
  rating?: number | null;
  review_count?: number | null;
  is_verified?: boolean;
  is_featured?: boolean;
  total_rooms?: number | null;
  occupied_rooms?: number | null;
  status?: PropertyStatus;
  distanceKm?: number | null;
  isSaved?: boolean;
};

export type PropertyDetailData = PropertyCardData & {
  address?: string | null;
  description?: string | null;
  amenities?: string[];
  images?: string[];
  latitude?: number | null;
  longitude?: number | null;
  landlord?: {
    id: string;
    name?: string | null;
    avatar?: string | null;
    upi_id?: string | null;
  } | null;
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'TENANT' | 'LANDLORD' | 'ADMIN';
  avatar?: string | null;
  isVerified: boolean;
};

export type LatLng = { lat: number; lng: number };

export type NearbyPlaceKey =
  | 'distanceToSchool' | 'distanceToHospital' | 'distanceToBusStand'
  | 'distanceToRailway' | 'distanceToMarket' | 'distanceToCollege' | 'distanceToATM';

export type { PropertyStatus, PropertyType };
