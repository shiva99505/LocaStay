import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText, Download, Eye, CheckCircle2, Clock, Plus } from 'lucide-react';
import { SignAgreementButton } from '@/components/common/sign-agreement-button';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AGREEMENT_STATUS_META, type AgreementStatus } from '@/lib/constants';

export const revalidate = 0;

export default async function LandlordAgreementsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const landlordProfile = await prisma.landlordProfile.findUnique({ where: { userId: session.user.id } });
  if (!landlordProfile) redirect('/login');

  const agreements = await prisma.agreement.findMany({
    where: { landlordId: landlordProfile.id },
    include: {
      property: { select: { title: true, city: true, state: true } },
      booking: { select: { tenant: { select: { name: true, phone: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Rental Agreements</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generate, manage and download digital rental agreements.</p>
        </div>
        <Button asChild size="sm" className="gap-1.5 bg-secondary-600 hover:bg-secondary-700">
          <Link href="/landlord/agreements/new"><Plus className="h-4 w-4" /> Generate Agreement</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {agreements.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No agreements yet. Accept a booking to auto-generate one.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {agreements.map((agreement) => {
                const meta = AGREEMENT_STATUS_META[agreement.status as AgreementStatus];
                return (
                  <div key={agreement.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-semibold text-foreground">{agreement.property.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Tenant: {agreement.booking?.tenant.name ?? 'N/A'} · {agreement.property.city}, {agreement.property.state}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(agreement.startDate)}{agreement.endDate ? ` → ${formatDate(agreement.endDate)}` : ''} · {formatCurrency(agreement.rentAmount)}/mo
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={meta.tone} label={meta.label} />
                      {agreement.landlordSignedAt ? (
                        <span className="flex items-center gap-1 text-[11px] text-secondary-600 dark:text-secondary-400"><CheckCircle2 className="h-3 w-3" /> Signed</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400"><Clock className="h-3 w-3" /> Awaiting signature</span>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-lg px-2.5 text-xs"><Eye className="h-3 w-3" /> View</Button>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-lg px-2.5 text-xs"><Download className="h-3 w-3" /> PDF</Button>
                      {!agreement.landlordSignedAt && <SignAgreementButton agreementId={agreement.id} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
