/**
 * Frontend API client — all calls to the Express backend go through here.
 * Usage:
 *   import { api } from '@/lib/api/client';
 *   const properties = await api.get('/properties?city=Bhopal');
 *   const booking = await api.post('/bookings', { property_id: '...' });
 */
import { createClient } from '@/lib/supabase/client';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function request<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options?: { formData?: FormData },
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let bodyInit: BodyInit | undefined;
  if (options?.formData) {
    bodyInit = options.formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyInit = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body: bodyInit,
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error ?? 'Request failed'), { status: res.status, data: err });
  }

  return res.json() as Promise<T>;
}

export const api = {
  get:    <T = unknown>(path: string)                       => request<T>('GET',    path),
  post:   <T = unknown>(path: string, body?: unknown)       => request<T>('POST',   path, body),
  patch:  <T = unknown>(path: string, body?: unknown)       => request<T>('PATCH',  path, body),
  delete: <T = unknown>(path: string)                       => request<T>('DELETE', path),
  upload: <T = unknown>(path: string, formData: FormData)   => request<T>('POST',   path, undefined, { formData }),
};
