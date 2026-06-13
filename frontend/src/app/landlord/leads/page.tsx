import { redirect } from 'next/navigation';
import { MessageSquare, Phone } from 'lucide-react';
import { LeadStatusSelect } from '@/components/landlord/lead-status-button';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/utils';
import { whatsappLink, telLink } from '@/lib/utils';

export const revalidate = 0;

const SOURCE_LABELS: Record<string, string> = { WHATSAPP: 'WhatsApp', CALL: 'Call', SITE_VISIT: 'Site Visit', WALK_IN: 'Walk-in' };
const STATUS_COLORS: Record<string, string> = { NEW: 'bg-blue-100 text-blue-700', CONTACTED: 'bg-amber-100 text-amber-700', QUALIFIED: 'bg-secondary-100 text-secondary-700', CONVERTED: 'bg-green-100 text-green-700 dark:bg-green-500/15', LOST: 'bg-muted text-muted-foreground' };

export default async function LeadsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const supabase = await createClient();
  const { data: landlordProfile } = await supabase
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .single();
  if (!landlordProfile) redirect('/login');

  const { data: leads = [] } = await supabase
    .from('leads')
    .select('*, property:properties!property_id(title)')
    .eq('landlord_id', landlordProfile.id)
    .order('created_at', { ascending: false });

  const grouped = {
    new: (leads ?? []).filter((l) => l.status === 'NEW').length,
    contacted: (leads ?? []).filter((l) => l.status === 'CONTACTED').length,
    converted: (leads ?? []).filter((l) => l.status === 'CONVERTED').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Leads & Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">{(leads ?? []).length} total · {grouped.new} new · {grouped.contacted} contacted · {grouped.converted} converted</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {(leads ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No leads yet. Leads appear when tenants call or WhatsApp from your listings.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(leads ?? []).map((lead) => (
                <div key={lead.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{lead.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_COLORS[lead.status] ?? STATUS_COLORS.NEW}`}>{lead.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{lead.property?.title ?? 'General'} · {SOURCE_LABELS[lead.source] ?? lead.source} · {timeAgo(lead.created_at)}</p>
                    {lead.message && <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{lead.message}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
                    <Button asChild variant="outline" size="sm" className="h-7 gap-1 rounded-lg px-2.5 text-xs">
                      <a href={telLink(lead.phone)}><Phone className="h-3 w-3" /> {lead.phone}</a>
                    </Button>
                    <Button asChild size="sm" className="h-7 gap-1 rounded-lg bg-secondary-600 px-2.5 text-xs hover:bg-secondary-700">
                      <a href={whatsappLink(lead.phone)} target="_blank" rel="noopener noreferrer"><MessageSquare className="h-3 w-3" /></a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
