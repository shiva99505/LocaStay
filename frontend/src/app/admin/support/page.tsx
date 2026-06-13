import { redirect } from 'next/navigation';
import { HelpCircle, MessageSquare, CheckCircle2, Clock, AlertTriangle, Phone } from 'lucide-react';
import { AdminSupportResolveButton } from '@/components/admin/support-action-button';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { timeAgo, initials, cn } from '@/lib/utils';

export const revalidate = 0;

const PRIORITY_STYLE: Record<string, string> = {
  LOW: 'bg-muted text-muted-foreground',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15',
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-500/15',
  URGENT: 'bg-red-600 text-white dark:bg-red-500',
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15',
  RESOLVED: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/15',
  CLOSED: 'bg-muted text-muted-foreground',
};

export default async function AdminSupportPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login');

  const supabase = await createClient();
  const { data: tickets = [] } = await supabase
    .from('support_tickets')
    .select('*, user:profiles!user_id(name, email, phone, avatar, role)')
    .order('created_at', { ascending: false });

  const open = (tickets ?? []).filter((t) => t.status === 'OPEN').length;
  const inProgress = (tickets ?? []).filter((t) => t.status === 'IN_PROGRESS').length;
  const resolved = (tickets ?? []).filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const urgent = (tickets ?? []).filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Support Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">{(tickets ?? []).length} total tickets · {open} open</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Open', value: open, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: 'In Progress', value: inProgress, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Resolved', value: resolved, icon: CheckCircle2, color: 'text-secondary-600', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
          { label: 'High Priority', value: urgent, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', s.bg)}>
                <s.icon className={cn('h-5 w-5', s.color)} />
              </div>
              <div>
                <p className="font-display text-xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">All Tickets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(tickets ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <HelpCircle className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No support tickets yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(tickets ?? []).map((ticket) => (
                <div key={ticket.id} className="flex flex-col gap-2 px-5 py-4 hover:bg-muted/20 sm:flex-row sm:items-start sm:gap-4">
                  <Avatar className="h-8 w-8 rounded-lg shrink-0">
                    {ticket.user.avatar ? <AvatarImage src={ticket.user.avatar} alt="" /> : null}
                    <AvatarFallback className="rounded-lg text-xs">{initials(ticket.user.name ?? 'U')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{ticket.subject}</p>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', PRIORITY_STYLE[ticket.priority] ?? PRIORITY_STYLE.LOW)}>{ticket.priority}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_STYLE[ticket.status] ?? STATUS_STYLE.OPEN)}>{ticket.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{ticket.user.name} ({ticket.user.role}) · {ticket.user.email}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(ticket.created_at)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {ticket.user.phone && (
                      <Button asChild size="sm" variant="outline" className="h-7 gap-1 rounded-lg px-2.5 text-xs">
                        <a href={`tel:${ticket.user.phone}`}><Phone className="h-3 w-3" /></a>
                      </Button>
                    )}
                    <AdminSupportResolveButton ticketId={ticket.id} status={ticket.status} />
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
