import type { Property, Amenity, Review, User, LandlordProfile } from '@prisma/client';
import type { PropertyStatus, PropertyType } from '@/lib/constants';

/** View-model used by property cards across tenant search, dashboards & comparisons. */
export type PropertyCardData = Property & {
  amenities: Amenity[];
  landlord: LandlordProfile & { user: Pick<User, 'name' | 'avatar' | 'isVerified'> };
  _count?: { reviews: number; bookings: number };
  distanceKm?: number | null;
  isSaved?: boolean;
};

/** Full detail view-model for the property detail page. */
export type PropertyDetailData = PropertyCardData & {
  reviews: (Review & { tenant: Pick<User, 'name' | 'avatar'> })[];
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
