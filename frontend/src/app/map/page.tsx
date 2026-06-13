import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export const revalidate = 0;

export default async function MapRoutePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'TENANT') redirect('/');
  redirect('/tenant/map');
}
