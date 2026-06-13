import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';

export const revalidate = 0;

export default async function LandlordAgreementNewPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const landlordProfile = await prisma.landlordProfile.findUnique({ where: { userId: session.user.id } });
  if (!landlordProfile) redirect('/login');

  return (
    <div className="mx-auto mt-8 max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        <h1 className="font-display text-3xl font-extrabold text-foreground">Generate rental agreements</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Agreements are generated automatically when you approve a tenant booking. If you want to create a new agreement, first accept a booking request from your tenant requests.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/landlord/tenants">View tenant requests</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/landlord/agreements">Back to agreements</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
