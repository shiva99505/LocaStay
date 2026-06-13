import { redirect } from 'next/navigation';
import { User, Camera } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { formatDate, initials, cn } from '@/lib/utils';
import { ProfileEditForm } from '@/components/tenant/profile-edit-form';

export const revalidate = 0;

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'TENANT') redirect('/login');

  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });

  const fields = [
    session.user.name, session.user.email, session.user.phone,
    profile?.dob, profile?.occupation, profile?.address,
    profile?.aadhaarNumber, profile?.panNumber,
  ];
  const profilePct = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">My Profile</h1>
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
              <button type="button" aria-label="Change avatar" className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary-700 text-white shadow-sm hover:bg-primary-800">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="font-display text-xl font-bold text-foreground">{session.user.name}</h2>
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
            monthlyIncome: profile?.monthlyIncome,
            familySize: profile?.familySize,
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
              { label: 'Monthly income', value: profile?.monthlyIncome ? `₹${profile.monthlyIncome.toLocaleString('en-IN')}` : null },
              { label: 'Family size', value: profile?.familySize ? `${profile.familySize} member${profile.familySize > 1 ? 's' : ''}` : null },
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

    </div>
  );
}
