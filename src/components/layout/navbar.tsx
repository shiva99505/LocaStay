'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Menu, MapPin, Search, Building2, LayoutDashboard } from 'lucide-react';
import { BrandMark } from '@/components/common/brand-mark';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { UserMenu } from '@/components/layout/user-menu';

const ThemeToggle = dynamic(
  () => import('@/components/layout/theme-toggle').then((m) => ({ default: m.ThemeToggle })),
  { ssr: false, loading: () => <div className="h-9 w-9" /> },
);
const LanguageToggle = dynamic(
  () => import('@/components/layout/language-toggle').then((m) => ({ default: m.LanguageToggle })),
  { ssr: false, loading: () => <div className="h-9 w-9" /> },
);
import { useLocale } from '@/components/providers/locale-provider';
import { ROLE_HOME } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/properties', label: 'explore', icon: Search },
  { href: '/map', label: 'mapMyStay', icon: MapPin, fallback: 'Map My Stay' },
  { href: '/landlord', label: 'landlord', icon: Building2 },
];

export function Navbar() {
  const { t, locale } = useLocale();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const user = session?.user;
  const home = user ? ROLE_HOME[user.role] : null;

  const linkLabel = (key: string, fallback?: string) => {
    const dict = t.nav as Record<string, string>;
    return dict[key] ?? fallback ?? key;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <BrandMark />
          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  pathname?.startsWith(link.href) && 'bg-muted text-foreground',
                )}
              >
                <link.icon className="h-4 w-4" />
                {linkLabel(link.label, link.fallback)}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:flex sm:items-center sm:gap-1.5">
            <LanguageToggle />
            <ThemeToggle />
          </div>

          {status === 'loading' ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <>
              {home && (
                <Button asChild variant="ghost" size="sm" className="hidden gap-1.5 lg:inline-flex">
                  <Link href={home}><LayoutDashboard className="h-4 w-4" /> {t.nav.dashboard}</Link>
                </Button>
              )}
              <UserMenu user={user} />
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{t.nav.login}</Link>
              </Button>
              <Button asChild size="sm" className="shadow-glow-primary">
                <Link href="/register">{t.nav.register}</Link>
              </Button>
            </div>
          )}

          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle><BrandMark /></SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
            {NAV_LINKS.map((link) => (
              <SheetClose asChild key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted',
                    pathname?.startsWith(link.href) && 'bg-muted',
                  )}
                >
                  <link.icon className="h-[18px] w-[18px] text-primary-700 dark:text-primary-300" />
                  {linkLabel(link.label, link.fallback)}
                </Link>
              </SheetClose>
            ))}

            {user && home && (
              <SheetClose asChild>
                <Link href={home} className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
                  <LayoutDashboard className="h-[18px] w-[18px] text-primary-700 dark:text-primary-300" />
                  {t.nav.dashboard}
                </Link>
              </SheetClose>
            )}

            <Separator className="my-2" />

            <div className="flex items-center justify-between rounded-xl px-3.5 py-2">
              <span className="text-sm font-semibold text-muted-foreground">Theme &amp; language</span>
              <div className="flex items-center gap-1">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>

            {!user && (
              <div className="mt-2 flex flex-col gap-2 px-1">
                <SheetClose asChild>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">{t.nav.login}</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild size="lg">
                    <Link href="/register">{t.nav.register}</Link>
                  </Button>
                </SheetClose>
              </div>
            )}
          </div>
          {locale === 'hi' && (
            <p className="border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">लोकास्टे — आपका भरोसेमंद किराया साथी</p>
          )}
        </SheetContent>
      </Sheet>
    </header>
  );
}
