import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PropertyCreateForm } from '@/components/landlord/property-create-form';

export const revalidate = 0;

export default async function LandlordPropertyNewPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const landlordProfile = await prisma.landlordProfile.findUnique({ where: { userId: session.user.id } });
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
