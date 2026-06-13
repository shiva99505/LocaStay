import { api } from './client';
import { createClient } from '@/lib/supabase/client';

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'TENANT' | 'LANDLORD';
  language?: string;
}

export async function register(data: RegisterData) {
  return api.post<{ success: boolean; userId: string }>('/auth/register', data);
}

export async function login(email: string, password: string) {
  // Use Supabase client-side sign-in so the session cookie is set in the browser
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export function getMe() {
  return api.get<{ user: { id: string; name: string; role: string; email: string } }>('/auth/me');
}
