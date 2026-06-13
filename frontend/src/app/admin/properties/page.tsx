import { redirect } from 'next/navigation';
import { Building2, MapPin, Eye } from 'lucide-react';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import Link from 'next/link';
import { PropertyActionButtons } from '@/components/admin/admin-action-buttons';

export const revalidate = 0;

const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/15',
  OCCUPIED: 'bg-primary-100 text-primary-700 dark:bg-primary-500/15',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15',
  MAINTENANCE: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15',
  DELISTED: 'bg-muted text-muted-foreground',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-500/15',
};

export default async function AdminPropertiesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login');

  // Use admin client so we always see all properties regardless of RLS
  const { getAdminClient } = await import('@/lib/supabase/admin');
  const admin = getAdminClient();
  const { data: properties = [] } = await admin
    .from('properties')
    .select('*, landlord_profile:landlord_profiles!landlord_id(user_id)')
    .order('created_at', { ascending: false });

  // Fetch landlord names separately to avoid nested join type issues
  const landlordUserIds = [...new Set(
    (properties ?? []).map((p) => (p as any).landlord_profile?.user_id).filter(Boolean)
  )];
  const { data: landlordUsers = [] } = landlordUserIds.length
    ? await admin.from('profiles').select('id, name, phone').in('id', landlordUserIds)
    : { data: [] };
  const landlordMap = Object.fromEntries((landlordUsers ?? []).map((u) => [u.id, u]));

  // Compute status counts from data
  const statusCounts: Record<string, number> = {};
  for (const p of (properties ?? [])) {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  }
  const pendingCount = statusCounts.PENDING ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Property Moderation</h1>
          <p className="mt-1 text-sm text-muted-foreground">{(properties ?? []).length} total · {pendingCount} pending review</p>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Available', key: 'AVAILABLE', color: 'text-secondary-600', bg: 'bg-secondary-50 dark:bg-secondary-500/10' },
          { label: 'Occupied', key: 'OCCUPIED', color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { label: 'Pending Review', key: 'PENDING', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Delisted', key: 'DELISTED', color: 'text-muted-foreground', bg: 'bg-muted' },
        ].map((s) => (
          <Card key={s.key}>
            <CardContent className="flex items-center gap-3 rounded-xl pt-4 pb-4">
              <Building2 className={cn('h-6 w-6 shrink-0', s.color)} />
              <div>
                <p className="font-display text-xl font-extrabold text-foreground">{statusCounts[s.key] ?? 0}</p>
                <p className={cn('text-xs font-semibold', s.color)}>{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Properties table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">All Properties</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Property', 'Landlord', 'Type', 'Rent', 'Status', 'Listed', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(properties ?? []).map((prop) => {
                  const coverImg = prop.cover_image ?? (prop.images as string[])?.[0] ?? null;
                  return (
                    <tr key={prop.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {coverImg ? (
                              <img src={coverImg} alt={prop.title} className="h-full w-full object-cover" />
                            ) : (
                              <Building2 className="m-auto mt-2.5 h-5 w-5 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[150px] truncate font-semibold text-foreground">{prop.title}</p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{prop.city}, {prop.state}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">{landlordMap[(prop as any).landlord_profile?.user_id]?.name ?? 'Unknown'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{prop.type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 font-bold text-foreground">{formatCurrency(prop.rent)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_STYLE[prop.status] ?? STATUS_STYLE.DELISTED)}>{prop.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(prop.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button asChild size="sm" variant="outline" className="h-7 w-7 gap-0 rounded-lg px-0">
                            <Link href={`/properties/${prop.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                          </Button>
                          <PropertyActionButtons propertyId={prop.id} status={prop.status} />
                        </div>
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
