import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { formatDate, cn } from '@/lib/utils';
import { PRIORITY_META, TICKET_STATUS_META, type Priority, type TicketStatus } from '@/lib/constants';
import { ComplaintForm } from '@/components/tenant/complaint-form';

export const revalidate = 0;

const CATEGORY_LABELS: Record<string, string> = {
  MAINTENANCE: 'Maintenance', NEIGHBOR: 'Neighbor', LANDLORD: 'Landlord',
  SAFETY: 'Safety', BILLING: 'Billing', OTHER: 'Other',
};

export default async function ComplaintsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  const [complaints, maintenanceRequests] = await Promise.all([
    prisma.complaint.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.maintenanceRequest.findMany({
      where: { tenantId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const open = complaints.filter((c) => c.status === 'OPEN').length;
  const resolved = complaints.filter((c) => c.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Complaints & Maintenance</h1>
          <p className="mt-1 text-sm text-muted-foreground">Raise issues, track maintenance requests and get resolutions.</p>
        </div>
        <ComplaintForm />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center"><CardContent className="pt-5"><p className="font-display text-2xl font-extrabold text-foreground">{complaints.length}</p><p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Total</p></CardContent></Card>
        <Card className={cn(open > 0 && 'border-amber-200 bg-amber-50/30 dark:border-amber-500/20')} ><CardContent className="pt-5 text-center"><p className="font-display text-2xl font-extrabold text-foreground">{open}</p><p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Open</p></CardContent></Card>
        <Card><CardContent className="pt-5 text-center"><p className="font-display text-2xl font-extrabold text-secondary-700 dark:text-secondary-400">{resolved}</p><p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Resolved</p></CardContent></Card>
      </div>

      {/* Complaints */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Complaints ({complaints.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {complaints.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No complaints raised — keep it that way! 😊</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {complaints.map((complaint) => {
                const priorityMeta = PRIORITY_META[complaint.priority as Priority];
                const statusMeta = TICKET_STATUS_META[complaint.status as TicketStatus];
                return (
                  <div key={complaint.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{complaint.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{CATEGORY_LABELS[complaint.category] ?? complaint.category} · {formatDate(complaint.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge tone={priorityMeta.tone} label={priorityMeta.label} />
                        <StatusBadge tone={statusMeta.tone} label={statusMeta.label} />
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{complaint.description}</p>
                    {complaint.resolution && (
                      <p className="mt-2 rounded-lg bg-secondary-50 px-3 py-2 text-xs font-medium text-secondary-800 dark:bg-secondary-500/10 dark:text-secondary-300">
                        Resolution: {complaint.resolution}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance requests */}
      {maintenanceRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Maintenance Requests ({maintenanceRequests.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {maintenanceRequests.map((req) => (
              <div key={req.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', req.status === 'RESOLVED' ? 'bg-secondary-500' : req.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-red-500')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{req.title}</p>
                  <p className="text-xs text-muted-foreground">{req.category.toLowerCase()} · {req.status.toLowerCase().replace(/_/g, ' ')} · {formatDate(req.createdAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
