import { redirect } from 'next/navigation';
import { ShieldCheck, Camera, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/badge';
import { initials, cn } from '@/lib/utils';
import { LandlordProfileEditForm } from '@/components/landlord/profile-edit-form';

export const revalidate = 30;

export default async function LandlordProfilePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const supabase = await createClient();
  const [{ data: landlordProfile }, { data: documents = [] }] = await Promise.all([
    supabase
      .from('landlord_profiles')
      .select('*, properties:properties(id)')
      .eq('user_id', session.user.id)
      .single(),
    supabase
      .from('documents')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
  ]);

  const propertiesCount = (landlordProfile?.properties ?? []).length;

  const fields = [session.user.name, session.user.email, session.user.phone, landlordProfile?.bio, landlordProfile?.upi_id, landlordProfile?.pan_number, landlordProfile?.city];
  const pct = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  const verStatus = landlordProfile?.verification_status ?? 'PENDING';
  const verMeta = { VERIFIED: { tone: 'success' as const, label: 'Verified' }, PENDING: { tone: 'warning' as const, label: 'Pending Verification' }, REJECTED: { tone: 'destructive' as const, label: 'Rejected' } };
  const ver = verMeta[verStatus as keyof typeof verMeta] ?? verMeta.PENDING;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your landlord profile, bank details and KYC documents.</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar className="h-20 w-20 rounded-2xl border-2 border-border">
                {session.user.avatar ? <AvatarImage src={session.user.avatar} alt={session.user.name ?? ''} /> : null}
                <AvatarFallback className="rounded-2xl text-2xl">{initials(session.user.name ?? 'L')}</AvatarFallback>
              </Avatar>
              <button type="button" aria-label="Change profile photo" className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-secondary-600 text-white shadow-sm hover:bg-secondary-700">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold text-foreground">{session.user.name}</h2>
                <StatusBadge tone={ver.tone} label={ver.label} />
              </div>
              <p className="text-sm text-muted-foreground">{session.user.email} · {session.user.phone}</p>
              <p className="text-xs text-muted-foreground">{propertiesCount} properties listed</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Profile completeness</span><span className="font-medium text-foreground">{pct}%</span></div>
                <Progress value={pct} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold">Business Details</CardTitle>
          <LandlordProfileEditForm initial={{
            businessName: landlordProfile?.business_name,
            bio: landlordProfile?.bio,
            address: landlordProfile?.address,
            city: landlordProfile?.city,
            state: landlordProfile?.state,
            upiId: landlordProfile?.upi_id,
            panNumber: landlordProfile?.pan_number,
            gstNumber: landlordProfile?.gst_number,
            bankAccount: landlordProfile?.bank_account,
            ifscCode: landlordProfile?.ifsc_code,
          }} />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Full name', value: session.user.name },
              { label: 'Business name', value: landlordProfile?.business_name },
              { label: 'Email', value: session.user.email },
              { label: 'Phone', value: session.user.phone },
              { label: 'City', value: landlordProfile?.city },
              { label: 'State', value: landlordProfile?.state },
              { label: 'UPI ID', value: landlordProfile?.upi_id },
              { label: 'PAN Number', value: landlordProfile?.pan_number },
              { label: 'GST Number', value: landlordProfile?.gst_number },
              { label: 'Response rate', value: landlordProfile?.response_rate ? `${landlordProfile.response_rate}%` : null },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className={cn('mt-1 text-sm font-semibold', value ? 'text-foreground' : 'text-muted-foreground/50')}>{value ?? 'Not set'}</p>
              </div>
            ))}
          </div>
          {landlordProfile?.bio && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bio</p>
              <p className="mt-1 text-sm text-foreground/90">{landlordProfile.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold"><ShieldCheck className="h-4 w-4 text-secondary-600" /> KYC Documents</CardTitle>
          <Badge variant={verStatus === 'VERIFIED' ? 'success' : verStatus === 'REJECTED' ? 'destructive' : 'warning'} className="normal-case tracking-normal font-semibold">{ver.label}</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {(documents ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No documents uploaded</p>
              <Button size="sm" className="gap-1.5">Upload PAN Card</Button>
            </div>
          ) : (
            (documents ?? []).map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <FileText className="h-5 w-5 shrink-0 text-secondary-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{doc.type.replace('_', ' ')}</p>
                  {doc.number && <p className="text-xs text-muted-foreground">···· {doc.number.slice(-4)}</p>}
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', doc.status === 'VERIFIED' ? 'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300' : doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{doc.status}</span>
              </div>
            ))
          )}
          <Button variant="outline" size="sm" className="w-full mt-2 gap-1.5">+ Upload document</Button>
        </CardContent>
      </Card>
    </div>
  );
}
