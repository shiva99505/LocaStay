import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { MapPin, ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BookPropertyForm } from '@/components/properties/book-property-form';

export const revalidate = 0;

export default async function PropertyBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) notFound();

  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  return (
    <div className="mx-auto mt-8 max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3 text-sm font-medium text-muted-foreground">
        <Link href={`/properties/${property.id}`} className="inline-flex items-center gap-2 text-primary-700 hover:text-primary-900">
          <ArrowLeft className="h-4 w-4" /> Back to property
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr] items-start">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Book this stay</p>
                <h1 className="mt-3 text-3xl font-extrabold text-foreground">{property.title}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  <MapPin className="inline-block h-4 w-4" /> {property.address}, {property.city}, {property.state}
                </p>
              </div>
              <div className="ml-auto rounded-3xl bg-secondary-50 px-4 py-3 text-right text-sm font-semibold text-secondary-700">
                <div>{formatCurrency(property.rent)}/mo</div>
                <div className="text-xs text-muted-foreground">Rent</div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Deposit</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(property.deposit)}</p>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Available from</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{formatDate(property.availableFrom ?? new Date())}</p>
              </div>
            </div>
          </div>

          <BookPropertyForm
            property={{
              id: property.id,
              title: property.title,
              city: property.city,
              state: property.state,
              rent: property.rent,
              deposit: property.deposit,
              availableFrom: property.availableFrom ? formatDate(property.availableFrom) : null,
            }}
          />
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6">
            <p className="text-sm font-semibold text-foreground">Need help?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You can also message the landlord directly if you need to confirm availability or move-in details.
            </p>
            <div className="mt-4 rounded-2xl bg-secondary-50 p-4 text-sm text-secondary-700">
              <p className="font-semibold">Next steps</p>
              <ul className="mt-2 space-y-2 text-muted-foreground">
                <li>Submit your booking request</li>
                <li>Wait for landlord approval</li>
                <li>Sign your agreement and confirm move-in</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
