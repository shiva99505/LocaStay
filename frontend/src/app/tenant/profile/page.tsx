import { redirect } from 'next/navigation';
import { ShieldCheck, User, FileText, Clock, CheckCircle2, XCircle, Camera } from 'lucide-react';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/ui/badge';
import { formatDate, initials, cn } from '@/lib/utils';
import { ProfileEditForm } from '@/components/tenant/profile-edit-form';

export const revalidate = 30;

const KYC_DOC_LABELS: Record<string, string> = {
  AADHAAR: 'Aadhaar Card', PAN: 'PAN Card',
  POLICE_VERIFICATION: 'Police Verification', INCOME_PROOF: 'Income Proof',
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  const supabase = await createClient();
  const [{ data: profile }, { data: documents }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', session.user.id).single(),
    supabase.from('documents').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
  ]);

  const fields = [
    session.user.name, session.user.email, session.user.phone,
    profile?.dob, profile?.occupation, profile?.address,
    profile?.aadhaar_number, profile?.pan_number,
  ];
  const profilePct = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  const kycStatus = profile?.kyc_status ?? 'PENDING';
  const kycMeta = { VERIFIED: { tone: 'success', label: 'KYC Verified', icon: CheckCircle2 },
    PENDING: { tone: 'warning', label: 'KYC Pending', icon: Clock },
    REJECTED: { tone: 'destructive', label: 'KYC Rejected', icon: XCircle } } as const;
  const kyc = kycMeta[kycStatus as keyof typeof kycMeta] ?? kycMeta.PENDING;
  const KycIcon = kyc.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Profile & KYC</h1>
        <p className="mt-1 text-sm text-muted-foreground">Keep your profile updated to access all LocaStay features.</p>
      </div>

      {/* Profile completion */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar className="h-20 w-20 rounded-2xl border-2 border-border">
                {session.user.avatar ? <AvatarImage src={session.user.avatar} alt={session.user.name ?? 'User'} /> : null}
                <AvatarFallback className="rounded-2xl text-2xl">{initials(session.user.name ?? 'T')}</AvatarFallback>
              </Avatar>
              <button className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary-700 text-white shadow-sm hover:bg-primary-800">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold text-foreground">{session.user.name}</h2>
                <StatusBadge tone={kyc.tone} label={kyc.label} />
              </div>
              <p className="text-sm text-muted-foreground">{session.user.email} · {session.user.phone}</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Profile completeness</span>
                  <span className="text-foreground">{profilePct}%</span>
                </div>
                <Progress value={profilePct} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <User className="h-4 w-4 text-primary-600" /> Personal Details
          </CardTitle>
          <ProfileEditForm initial={{
            bio: profile?.bio,
            address: profile?.address,
            village: profile?.village,
            city: profile?.city,
            state: profile?.state,
            pincode: profile?.pincode,
            occupation: profile?.occupation,
            monthlyIncome: profile?.monthly_income,
            familySize: profile?.family_size,
          }} />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Full name', value: session.user.name },
              { label: 'Email address', value: session.user.email },
              { label: 'Phone number', value: session.user.phone },
              { label: 'Date of birth', value: profile?.dob ? formatDate(profile.dob) : null },
              { label: 'Occupation', value: profile?.occupation },
              { label: 'Monthly income', value: profile?.monthly_income ? `₹${profile.monthly_income.toLocaleString('en-IN')}` : null },
              { label: 'Family size', value: profile?.family_size ? `${profile.family_size} member${profile.family_size > 1 ? 's' : ''}` : null },
              { label: 'Address', value: profile?.address ? `${profile.address}, ${profile.city ?? ''}, ${profile.state ?? ''}`.trim().replace(/^,\s*|,\s*$/g, '') : null },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className={cn('mt-1 text-sm font-semibold', value ? 'text-foreground' : 'text-muted-foreground/60')}>
                  {value ?? 'Not set'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KYC documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <ShieldCheck className="h-4 w-4 text-primary-600" /> KYC Documents
          </CardTitle>
          <Badge variant={kycStatus === 'VERIFIED' ? 'success' : kycStatus === 'REJECTED' ? 'destructive' : 'warning'} className="normal-case tracking-normal font-semibold">
            <KycIcon className="h-3.5 w-3.5" /> {kyc.label}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {kycStatus === 'PENDING' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Upload Aadhaar and PAN card to verify your identity and unlock all features including booking requests.
            </div>
          )}
          {(documents ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
              <Button size="sm" className="gap-1.5">Upload Aadhaar Card</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {(documents ?? []).map((doc) => {
                const label = KYC_DOC_LABELS[doc.type] ?? doc.type;
                const statusMeta = { PENDING: { tone: 'warning', label: 'Under Review' }, VERIFIED: { tone: 'success', label: 'Verified' }, REJECTED: { tone: 'destructive', label: 'Rejected' } } as const;
                const meta = statusMeta[doc.status as keyof typeof statusMeta] ?? statusMeta.PENDING;
                return (
                  <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <FileText className="h-5 w-5 shrink-0 text-primary-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      {doc.number && <p className="text-xs text-muted-foreground">···· {doc.number.slice(-4)}</p>}
                    </div>
                    <StatusBadge tone={meta.tone} label={meta.label} />
                  </div>
                );
              })}
            </div>
          )}
          <Button variant="outline" size="sm" className="mt-2 gap-1.5 w-full">
            + Upload new document
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
