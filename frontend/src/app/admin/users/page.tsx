import { redirect } from 'next/navigation';
import { Users, Building2, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
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

  const supabase = await createClient();
  const { data: users = [] } = await supabase
    .from('profiles')
    .select(`
      *,
      landlord_profile:landlord_profiles!user_id(verification_status, properties:properties(id)),
      documents:documents(id, status),
      bookings:bookings(id)
    `)
    .order('created_at', { ascending: false });

  // Compute role counts from data
  const roleCounts: Record<string, number> = {};
  for (const u of (users ?? [])) {
    roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">{(users ?? []).length} registered users</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Users, label: 'Tenants', key: 'TENANT', color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { icon: Building2, label: 'Landlords', key: 'LANDLORD', color: 'text-secondary-600', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
          { icon: ShieldCheck, label: 'Admins', key: 'ADMIN', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', s.bg)}>
                <s.icon className={cn('h-5 w-5', s.color)} />
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold text-foreground">{roleCounts[s.key] ?? 0}</p>
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
                  {['User', 'Role', 'Status', 'KYC', 'Activity', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(users ?? []).map((user) => {
                  const docs = user.documents ?? [];
                  const verifiedDocs = docs.filter((d: { status: string }) => d.status === 'VERIFIED').length;
                  const pendingDocs = docs.filter((d: { status: string }) => d.status === 'PENDING').length;
                  const activity = user.role === 'TENANT'
                    ? `${(user.bookings ?? []).length} bookings`
                    : user.role === 'LANDLORD'
                    ? `${(user.landlord_profile?.properties ?? []).length} properties`
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
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', user.is_verified ? 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/15' : 'bg-muted text-muted-foreground')}>{user.is_verified ? 'Verified' : 'Unverified'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {docs.length === 0 ? (
                          <span className="text-muted-foreground">None</span>
                        ) : (
                          <span className={cn(pendingDocs > 0 ? 'font-semibold text-amber-700' : 'text-secondary-700')}>
                            {verifiedDocs}/{docs.length}
                            {pendingDocs > 0 && ` · ${pendingDocs} pending`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{activity}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3">
                        <UserActionButtons
                          userId={user.id}
                          isVerified={user.is_verified}
                          isSuspended={user.is_suspended}
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
