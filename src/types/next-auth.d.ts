import type { UserRole } from '@/lib/constants';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    role: UserRole;
    phone: string;
    avatar?: string | null;
    isVerified: boolean;
    language: string;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      phone: string;
      avatar?: string | null;
      isVerified: boolean;
      language: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    phone: string;
    avatar?: string | null;
    isVerified: boolean;
    language: string;
  }
}
