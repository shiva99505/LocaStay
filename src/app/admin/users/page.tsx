import { redirect } from 'next/navigation';
import { Users, Building2, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, initials, cn } from '@/lib/utils';
import { UserActionButtons } from '@/components/admin/admin-action-buttons';

export const revalidate = 0;

const ROLE_STYLE: Record<string, string> = {
  TENANT: 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300',
  LANDLORD: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300',
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login');

  const [users, totals] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        landlordProfile: { select: { _count: { select: { properties: true } } } },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
  ]);

  const counts = Object.fromEntries(totals.map((t) => [t.role, t._count.id]));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">{users.length} registered users</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Users, label: 'Tenants', value: counts.TENANT ?? 0, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { icon: Building2, label: 'Landlords', value: counts.LANDLORD ?? 0, color: 'text-secondary-600', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
          { icon: ShieldCheck, label: 'Admins', value: counts.ADMIN ?? 0, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', s.bg)}>
                <s.icon className={cn('h-5 w-5', s.color)} />
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['User', 'Role', 'Status', 'Activity', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const activity = user.role === 'TENANT'
                    ? `${user._count.bookings} bookings`
                    : user.role === 'LANDLORD'
                    ? `${user.landlordProfile?._count.properties ?? 0} properties`
                    : 'Administrator';

                  return (
                    <tr key={user.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-lg shrink-0">
                            {user.avatar ? <AvatarImage src={user.avatar} alt={user.name ?? ''} /> : null}
                            <AvatarFallback className="rounded-lg text-xs">{initials(user.name ?? 'U')}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="max-w-[140px] truncate font-semibold text-foreground">{user.name}</p>
                            <p className="max-w-[140px] truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', ROLE_STYLE[user.role] ?? ROLE_STYLE.TENANT)}>{user.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', user.isVerified ? 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/15' : 'bg-muted text-muted-foreground')}>{user.isVerified ? 'Verified' : 'Unverified'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{activity}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <UserActionButtons
                          userId={user.id}
                          isVerified={user.isVerified}
                          isSuspended={user.isSuspended}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
