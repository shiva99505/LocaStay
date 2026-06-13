import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUnreadNotificationsCount } from '@/lib/data-access';
import { LandlordSidebar, LandlordMobileNav } from '@/components/landlord/landlord-sidebar';

export default async function LandlordLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  // Auto-create LandlordProfile on first login if it doesn't exist yet
  const existing = await prisma.landlordProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!existing) {
    await prisma.landlordProfile.create({ data: { userId: session.user.id } });
  }

  const unreadCount = await getUnreadNotificationsCount(session.user.id);

  return (
    <div className="flex min-h-dvh bg-background">
      <LandlordSidebar user={session.user} unreadCount={unreadCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <LandlordMobileNav user={session.user} unreadCount={unreadCount} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
