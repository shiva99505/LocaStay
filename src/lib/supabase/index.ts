/**
 * Barrel export for all Supabase helpers.
 * Import from '@/lib/supabase' in your components and API routes.
 */

// Clients
export { createClient as createBrowserClient }  from './client';
export { createClient as createServerClient }   from './server';
export { getAdminClient }                        from './admin';

// Types
export type * from './database.types';

// Helpers
export * from './profiles';
export * from './properties';
export * from './bookings';
export * from './reviews';
export * from './storage';
export * from './notifications';
