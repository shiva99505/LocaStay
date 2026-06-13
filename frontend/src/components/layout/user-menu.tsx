'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, User, Bell, LogOut, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_HOME, type UserRole } from '@/lib/auth-config';
import { createClient } from '@/lib/supabase/client';
import { initials } from '@/lib/utils';
import { useLocale } from '@/components/providers/locale-provider';

const ROLE_LABEL: Record<string, string> = { TENANT: 'Tenant', LANDLORD: 'Landlord', ADMIN: 'Administrator' };

interface MenuUser {
  name?: string | null;
  email?: string | null;
  role: UserRole;
  avatar?: string | null;
  isVerified?: boolean;
}

export function UserMenu({ user }: { user: MenuUser }) {
  const { t } = useLocale();
  const router = useRouter();
  const home = ROLE_HOME[user.role] ?? '/';

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 transition-colors hover:border-primary-300 hover:bg-muted/60">
          <Avatar className="h-8 w-8 rounded-xl">
            {user.avatar ? <AvatarImage src={user.avatar} alt={user.name ?? 'User'} /> : null}
            <AvatarFallback className="rounded-xl text-xs">{initials(user.name ?? user.email ?? 'U')}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[8rem] truncate text-sm font-semibold text-foreground sm:inline">{user.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 normal-case tracking-normal">
          <Avatar className="h-10 w-10 rounded-xl">
            {user.avatar ? <AvatarImage src={user.avatar} alt={user.name ?? 'User'} /> : null}
            <AvatarFallback className="rounded-xl">{initials(user.name ?? user.email ?? 'U')}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 dark:text-primary-300">
              <ShieldCheck className="h-3 w-3" /> {ROLE_LABEL[user.role] ?? user.role}
              {user.isVerified && <span className="text-secondary-600 dark:text-secondary-400">· Verified</span>}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={home}><LayoutDashboard className="h-4 w-4" /> {t.nav.dashboard}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${home}/profile`}><User className="h-4 w-4" /> {t.nav.profile}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`${home}/notifications`}><Bell className="h-4 w-4" /> {t.nav.notifications}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" /> {t.nav.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
