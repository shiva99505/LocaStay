import type { UserRole } from '@/lib/constants';

export interface AppUser {
  id:         string;
  email:      string;
  name?:      string | null;
  role:       UserRole;
  phone?:     string | null;
  avatar?:    string | null;
  isVerified: boolean;
  language:   string;
}

export interface AppSession {
  user: AppUser;
}
