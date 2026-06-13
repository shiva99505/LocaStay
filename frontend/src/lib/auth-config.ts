export type UserRole = 'TENANT' | 'LANDLORD' | 'ADMIN';

export const ROLE_HOME: Record<string, string> = {
  TENANT:   '/tenant',
  LANDLORD: '/landlord',
  ADMIN:    '/admin',
};
