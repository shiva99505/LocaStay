import { redirect } from 'next/navigation';
import { auth, ROLE_HOME } from '@/lib/auth';
import { getUnreadNotificationsCount } from '@/lib/data-access';
import { TenantSidebar, TenantMobileNav } from '@/components/tenant/tenant-sidebar';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'TENANT') redirect(ROLE_HOME[session.user.role]);

  const unreadCount = await getUnreadNotificationsCount(session.user.id);

  return (
    <div className="flex min-h-dvh bg-background">
      <TenantSidebar user={session.user} unreadCount={unreadCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TenantMobileNav user={session.user} unreadCount={unreadCount} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
