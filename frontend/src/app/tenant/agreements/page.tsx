import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText, Download, Eye, CheckCircle2, Clock } from 'lucide-react';
import { SignAgreementButton } from '@/components/common/sign-agreement-button';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { AGREEMENT_STATUS_META, type AgreementStatus } from '@/lib/constants';

export const revalidate = 0;

export default async function AgreementsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  const supabase = await createClient();
  const { data: agreements = [] } = await supabase
    .from('agreements')
    .select('*, property:properties!property_id(id, title, city, state, cover_image)')
    .eq('tenant_id', session.user.id)
    .order('created_at', { ascending: false });

  const active = (agreements ?? []).filter((a) => a.status === 'ACTIVE');
  const others = (agreements ?? []).filter((a) => a.status !== 'ACTIVE');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Rental Agreements</h1>
        <p className="mt-1 text-sm text-muted-foreground">View, download and manage your digital rental agreements.</p>
      </div>

      {(agreements ?? []).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <p className="font-semibold text-foreground">No agreements yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Once your booking is approved, your digital agreement will appear here.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/tenant/stay">View bookings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Active Agreement</h2>
              {active.map((agreement) => (
                <AgreementCard key={agreement.id} agreement={agreement} />
              ))}
            </div>
          )}
          {others.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Past / Draft Agreements</h2>
              <div className="space-y-3">
                {others.map((agreement) => (
                  <AgreementCard key={agreement.id} agreement={agreement} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Agreement = {
  id: string;
  status: string;
  rent_amount: number;
  deposit_amount: number;
  start_date: string;
  end_date: string | null;
  tenant_signed_at: string | null;
  property: { id: string; title: string; city: string; state: string; cover_image: string | null };
};

function AgreementCard({ agreement }: { agreement: Agreement }) {
  const meta = AGREEMENT_STATUS_META[agreement.status as AgreementStatus];
  const isActive = agreement.status === 'ACTIVE';

  return (
    <Card className={cn(isActive && 'border-secondary-200 dark:border-secondary-500/30')}>
      <CardContent className="pt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="relative h-20 w-full overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-32 sm:shrink-0">
            {agreement.property.cover_image ? (
              <img src={agreement.property.cover_image} alt={agreement.property.title} className="h-full w-full object-cover" />
            ) : (
              <FileText className="absolute inset-0 m-auto h-7 w-7 text-muted-foreground/40" />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-display text-base font-bold text-foreground">{agreement.property.title}</h3>
              <StatusBadge tone={meta.tone} label={meta.label} />
            </div>
            <p className="text-sm text-muted-foreground">{agreement.property.city}, {agreement.property.state}</p>

            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Monthly rent</p>
                <p className="font-semibold text-foreground">{formatCurrency(agreement.rent_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deposit</p>
                <p className="font-semibold text-foreground">{formatCurrency(agreement.deposit_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Start date</p>
                <p className="font-semibold text-foreground">{formatDate(agreement.start_date)}</p>
              </div>
              {agreement.end_date && (
                <div>
                  <p className="text-xs text-muted-foreground">End date</p>
                  <p className="font-semibold text-foreground">{formatDate(agreement.end_date)}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              {agreement.tenant_signed_at ? (
                <span className="flex items-center gap-1 text-secondary-600 dark:text-secondary-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> You signed {formatDate(agreement.tenant_signed_at)}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5" /> Awaiting your signature
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> View Agreement
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Download className="h-3.5 w-3.5" /> Download PDF
          </Button>
          {!agreement.tenant_signed_at && (agreement.status === 'PENDING_SIGNATURE' || agreement.status === 'DRAFT') && (
            <SignAgreementButton agreementId={agreement.id} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
