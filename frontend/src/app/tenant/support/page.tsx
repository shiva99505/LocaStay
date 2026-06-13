import { redirect } from 'next/navigation';
import { HelpCircle, MessageSquare, ChevronRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { formatDate, cn } from '@/lib/utils';
import { TICKET_STATUS_META, type TicketStatus } from '@/lib/constants';
import { SupportTicketForm } from '@/components/common/support-ticket-form';

export const revalidate = 0;

const FAQ = [
  { q: 'How do I pay rent online?', a: 'Go to Rent Tracker → Pay Now. We support UPI, NEFT and debit cards. Receipts are auto-generated.' },
  { q: 'How long does KYC verification take?', a: 'Usually 1–2 business days after uploading Aadhaar and PAN. You\'ll get a notification once approved.' },
  { q: 'Can I cancel a booking request?', a: 'Yes. Go to My Stay → Pending Requests and click Cancel. Once approved, contact your landlord directly.' },
  { q: 'How do I report a landlord issue?', a: 'Use the Complaints page. Our team reviews and mediates within 72 hours for high-priority issues.' },
];

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  const supabase = await createClient();
  const { data: tickets = [] } = await supabase
    .from('support_tickets')
    .select('*, messages:support_ticket_messages(message, created_at)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  // Sort messages descending and take latest per ticket
  const ticketsWithLatest = (tickets ?? []).map((ticket) => ({
    ...ticket,
    messages: (ticket.messages ?? []).sort((a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 1),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Support Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">Get help with your account, listings, payments and more.</p>
        </div>
        <SupportTicketForm />
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <HelpCircle className="h-4 w-4 text-primary-600" /> Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          {FAQ.map((item, idx) => (
            <details key={idx} className={cn('group py-3', idx < FAQ.length - 1 && 'border-b border-border')}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-foreground hover:text-primary-700 dark:hover:text-primary-300">
                {item.q}
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </CardContent>
      </Card>

      {/* Support tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <MessageSquare className="h-4 w-4 text-primary-600" /> Your Tickets ({ticketsWithLatest.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ticketsWithLatest.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No support tickets yet. We hope you haven&apos;t needed us! 😊</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {ticketsWithLatest.map((ticket) => {
                const meta = TICKET_STATUS_META[ticket.status as TicketStatus];
                return (
                  <div key={ticket.id} className="px-5 py-4 hover:bg-muted/20 cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{ticket.category} · #{ticket.id.slice(0, 8)} · {formatDate(ticket.created_at)}</p>
                        {ticket.messages[0] && (
                          <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">Last: {ticket.messages[0].message}</p>
                        )}
                      </div>
                      <StatusBadge tone={meta.tone} label={meta.label} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Contact Us</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'WhatsApp', desc: '+91 98765 00000', href: 'https://wa.me/919876500000', color: 'bg-secondary-600' },
            { label: 'Email', desc: 'support@locastay.in', href: 'mailto:support@locastay.in', color: 'bg-primary-600' },
            { label: 'Phone', desc: '10am – 6pm, Mon–Sat', href: 'tel:+919876500000', color: 'bg-amber-600' },
          ].map((channel) => (
            <a key={channel.label} href={channel.href} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:border-primary-300 hover:bg-muted/30">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white text-sm font-bold', channel.color)}>
                {channel.label[0]}
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{channel.label}</p>
                <p className="text-xs text-muted-foreground">{channel.desc}</p>
              </div>
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
