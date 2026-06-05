import { UserRole, PropertyType, PropertyStatus, BookingStatus, PaymentStatus } from '@prisma/client';

export type UserWithRole = {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
};

export type PropertyCard = {
  id: string;
  title: string;
  type: PropertyType;
  rent: number;
  deposit: number;
  coverImage?: string;
  city: string;
  distance?: number;
  rating: number;
  reviewCount: number;
};

export type PropertyDetail = PropertyCard & {
  description?: string;
  address: string;
  squareFeet?: number;
  totalRooms: number;
  images: string[];
  videos: string[];
  amenities: string[];
  reviews: ReviewType[];
};

export type ReviewType = {
  id: string;
  rating: number;
  comment?: string;
  userName: string;
  createdAt: Date;
};

export type BookingType = {
  id: string;
  propertyId: string;
  status: BookingStatus;
  startDate: Date;
  endDate?: Date;
};

export type PaymentType = {
  id: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: PaymentStatus;
};
