import { redirect } from 'next/navigation';
import { BookOpen, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency, formatDate, timeAgo, initials, cn } from '@/lib/utils';
import { BookingActionButtons } from '@/components/admin/admin-action-buttons';

export const revalidate = 0;

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15',
  ACTIVE: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/15',
  COMPLETED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-500/15',
};

export default async function AdminBookingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login');

  const supabase = await createClient();
  const { data: bookings = [] } = await supabase
    .from('bookings')
    .select(`
      *,
      tenant:profiles!tenant_id(name, email, phone, avatar),
      property:properties!property_id(
        title, city, rent,
        landlord:landlord_profiles!landlord_id(user:profiles!user_id(name))
      )
    `)
    .order('requested_at', { ascending: false });

  // Compute status counts from data
  const counts: Record<string, number> = {};
  for (const b of (bookings ?? [])) {
    counts[b.status] = (counts[b.status] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Booking Oversight</h1>
        <p className="mt-1 text-sm text-muted-foreground">{(bookings ?? []).length} total bookings</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Pending', key: 'PENDING', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Active', key: 'ACTIVE', icon: CheckCircle2, color: 'text-secondary-600', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
          { label: 'Completed', key: 'COMPLETED', icon: BookOpen, color: 'text-muted-foreground', bg: 'bg-muted' },
          { label: 'Cancelled', key: 'CANCELLED', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10' },
        ].map((s) => (
          <Card key={s.key}>
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', s.bg)}>
                <s.icon className={cn('h-5 w-5', s.color)} />
              </div>
              <div>
                <p className="font-display text-xl font-extrabold text-foreground">{counts[s.key] ?? 0}</p>
                <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bookings table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">All Bookings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Tenant', 'Property', 'Landlord', 'Rent', 'Status', 'Move-in', 'Requested', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(bookings ?? []).map((booking) => (
                  <tr key={booking.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 rounded-lg shrink-0">
                          {booking.tenant.avatar ? <AvatarImage src={booking.tenant.avatar} alt="" /> : null}
                          <AvatarFallback className="rounded-lg text-[10px]">{initials(booking.tenant.name ?? 'T')}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate max-w-[110px] font-semibold text-foreground">{booking.tenant.name}</p>
                          <p className="text-[10px] text-muted-foreground">{booking.tenant.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate max-w-[120px] font-medium text-foreground">{booking.property.title}</p>
                      <p className="text-[10px] text-muted-foreground">{booking.property.city}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{booking.property.landlord?.user?.name ?? 'Unknown'}</td>
                    <td className="px-4 py-3 font-bold text-foreground">{formatCurrency(booking.property.rent)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_STYLE[booking.status] ?? STATUS_STYLE.PENDING)}>{booking.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(booking.move_in_date)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(booking.requested_at)}</td>
                    <td className="px-4 py-3">
                      <BookingActionButtons bookingId={booking.id} status={booking.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
