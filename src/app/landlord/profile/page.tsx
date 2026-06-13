import { redirect } from 'next/navigation';
import { Camera } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { initials, cn } from '@/lib/utils';
import { LandlordProfileEditForm } from '@/components/landlord/profile-edit-form';

export const revalidate = 0;

export default async function LandlordProfilePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'LANDLORD') redirect('/login');

  const landlordProfile = await prisma.landlordProfile.findUnique({
    where: { userId: session.user.id },
    include: { _count: { select: { properties: true } } },
  });

  const fields = [session.user.name, session.user.email, session.user.phone, landlordProfile?.bio, landlordProfile?.upiId, landlordProfile?.panNumber, landlordProfile?.city];
  const pct = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your landlord profile and bank details.</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar className="h-20 w-20 rounded-2xl border-2 border-border">
                {session.user.avatar ? <AvatarImage src={session.user.avatar} alt={session.user.name ?? ''} /> : null}
                <AvatarFallback className="rounded-2xl text-2xl">{initials(session.user.name ?? 'L')}</AvatarFallback>
              </Avatar>
              <button type="button" aria-label="Change avatar" className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-secondary-600 text-white shadow-sm hover:bg-secondary-700">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="font-display text-xl font-bold text-foreground">{session.user.name}</h2>
              <p className="text-sm text-muted-foreground">{session.user.email} · {session.user.phone}</p>
              <p className="text-xs text-muted-foreground">{landlordProfile?._count.properties ?? 0} properties listed</p>
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
            businessName: landlordProfile?.businessName,
            bio: landlordProfile?.bio,
            address: landlordProfile?.address,
            city: landlordProfile?.city,
            state: landlordProfile?.state,
            upiId: landlordProfile?.upiId,
            panNumber: landlordProfile?.panNumber,
            gstNumber: landlordProfile?.gstNumber,
            bankAccount: landlordProfile?.bankAccount,
            ifscCode: landlordProfile?.ifscCode,
          }} />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Full name', value: session.user.name },
              { label: 'Business name', value: landlordProfile?.businessName },
              { label: 'Email', value: session.user.email },
              { label: 'Phone', value: session.user.phone },
              { label: 'City', value: landlordProfile?.city },
              { label: 'State', value: landlordProfile?.state },
              { label: 'UPI ID', value: landlordProfile?.upiId },
              { label: 'PAN Number', value: landlordProfile?.panNumber },
              { label: 'GST Number', value: landlordProfile?.gstNumber },
              { label: 'Response rate', value: landlordProfile?.responseRate ? `${landlordProfile.responseRate}%` : null },
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

    </div>
  );
}
