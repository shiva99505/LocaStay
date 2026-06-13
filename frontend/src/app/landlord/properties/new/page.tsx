import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PropertyCreateForm } from '@/components/landlord/property-create-form';

export const revalidate = 30;

export default async function LandlordPropertyNewPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const supabase = await createClient();
  const { data: landlordProfile } = await supabase
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .single();
  if (!landlordProfile) redirect('/login');

  return (
    <div className="mx-auto mt-8 max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Add a new property</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create a listing that will be reviewed and published once approved.</p>
        </div>
        <PropertyCreateForm />
      </div>
    </div>
  );
}
