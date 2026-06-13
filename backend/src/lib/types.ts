import { Request } from 'express';

export interface AuthUser {
  id:          string;
  email:       string;
  role:        'TENANT' | 'LANDLORD' | 'ADMIN';
  name:        string | null;
  isSuspended: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AuthenticatedRequest<P = any> extends Request<P> {
  user: AuthUser;
}

export type UserRole = 'TENANT' | 'LANDLORD' | 'ADMIN';

export interface ApiError {
  error:    string;
  details?: unknown;
}
