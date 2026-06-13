'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard, Users, Building2, BookOpen,
  Shield, BarChart3, Newspaper, HelpCircle, LogOut, Menu,
} from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { BrandMark } from '@/components/common/brand-mark';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import type { Session } from 'next-auth';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/properties', label: 'Properties', icon: Building2 },
  { href: '/admin/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/content', label: 'Content', icon: Newspaper },
  { href: '/admin/support', label: 'Support', icon: HelpCircle },
];

function NavLink({ href, label, icon: Icon, exact, badge, onClick }: {
  href: string; label: string; icon: React.ComponentType<{ className?: string }>;
  exact?: boolean; badge?: number; onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link href={href} onClick={onClick}
      className={cn('group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
        active ? 'bg-red-600 text-white dark:bg-red-500' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-muted-foreground group-hover:text-foreground')} />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className={cn('flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold',
          active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300')}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({ user, unreadCount, onClose }: {
  user: NonNullable<Session['user']>; unreadCount: number; onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-4">
        <BrandMark />
        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">ADMIN</span>
      </div>
      <Separator />
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} badge={item.href === '/admin/support' ? unreadCount : undefined} onClick={onClose} />
          ))}
        </nav>
      </div>
      <Separator />
      <div className="px-3 py-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-muted/60 px-3.5 py-2.5">
          <Avatar className="h-9 w-9 rounded-lg">
            {user.avatar ? <AvatarImage src={user.avatar} alt={user.name ?? 'Admin'} /> : null}
            <AvatarFallback className="rounded-lg text-xs">{initials(user.name ?? 'A')}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{user.name}</p>
            <p className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400">
              <Shield className="h-3 w-3" /> Administrator
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={() => signOut({ callbackUrl: '/' })}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

export function AdminSidebar({ user, unreadCount }: { user: NonNullable<Session['user']>; unreadCount: number }) {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-0 flex h-dvh flex-col border-r border-border bg-card">
        <SidebarContent user={user} unreadCount={unreadCount} />
      </div>
    </aside>
  );
}

export function AdminMobileNav({ user, unreadCount }: { user: NonNullable<Session['user']>; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <BrandMark iconClassName="h-6 w-6" />
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300">ADMIN</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0" hideClose>
          <SheetHeader className="sr-only"><SheetTitle>Admin Navigation</SheetTitle></SheetHeader>
          <SidebarContent user={user} unreadCount={unreadCount} onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
