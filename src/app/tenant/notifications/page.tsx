import { redirect } from 'next/navigation';
import { Bell, ChevronRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { timeAgo, cn } from '@/lib/utils';
import { MarkAllReadButton } from '@/components/common/mark-read-button';

export const revalidate = 0;

const TYPE_META: Record<string, { label: string; color: string }> = {
  BOOKING: { label: 'Booking', color: 'bg-blue-500' },
  PAYMENT: { label: 'Payment', color: 'bg-secondary-500' },
  AGREEMENT: { label: 'Agreement', color: 'bg-primary-600' },
  KYC: { label: 'KYC', color: 'bg-amber-500' },
  SYSTEM: { label: 'System', color: 'bg-muted-foreground' },
  COMPLAINT: { label: 'Complaint', color: 'bg-orange-500' },
  MAINTENANCE: { label: 'Maintenance', color: 'bg-red-500' },
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unread = notifications.filter((n) => !n.isRead);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread.length > 0 ? `${unread.length} unread notification${unread.length > 1 ? 's' : ''}` : 'All notifications are read'}
          </p>
        </div>
        <MarkAllReadButton unreadCount={unread.length} />
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => {
                const typeMeta = TYPE_META[notif.type] ?? { label: notif.type, color: 'bg-muted-foreground' };
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'flex gap-4 px-5 py-4 transition-colors hover:bg-muted/20',
                      !notif.isRead && 'bg-primary-50/40 dark:bg-primary-500/5',
                    )}
                  >
                    <div className="relative flex-shrink-0 pt-1">
                      <div className={cn('h-2.5 w-2.5 rounded-full', notif.isRead ? 'bg-transparent' : 'bg-primary-600 dark:bg-primary-400')} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{notif.title}</p>
                        <Badge variant="muted" className="normal-case tracking-normal text-[10px] py-0.5">{typeMeta.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{notif.message}</p>
                      {notif.link && (
                        <a href={notif.link} className="flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline dark:text-primary-300">
                          View details <ChevronRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(notif.createdAt)}</span>
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
