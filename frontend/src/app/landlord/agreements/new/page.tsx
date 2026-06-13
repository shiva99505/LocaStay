import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getLandlordApprovedBookings } from '@/lib/actions/agreement.actions';
import { AgreementGeneratorForm } from '@/components/landlord/agreement-generator-form';
import { Button } from '@/components/ui/button';

export const revalidate = 0;

export default async function LandlordAgreementNewPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const [approvedBookings] = await Promise.all([
    getLandlordApprovedBookings(),
  ]);

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, phone')
    .eq('id', session.user.id)
    .single();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/landlord/agreements"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Generate Rental Agreement</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Fill in the details or auto-fill from an approved booking. The tenant will be notified to sign.
          </p>
        </div>
      </div>

      <AgreementGeneratorForm
        approvedBookings={approvedBookings}
        landlordInfo={{
          name:  profile?.name  ?? session.user.name,
          phone: profile?.phone ?? session.user.phone,
        }}
      />
    </div>
  );
}
