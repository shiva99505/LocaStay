import Link from 'next/link';
import { cn } from '@/lib/utils';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('h-8 w-8', className)} aria-hidden="true">
      <defs>
        <linearGradient id="locastay-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0e3b9a" />
          <stop offset="1" stopColor="#1d56c9" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#locastay-logo-bg)" />
      <path d="M24 8 8 20.5V40h10V29h12v11h10V20.5L24 8Z" fill="#fff" />
      <circle cx="24" cy="24.5" r="3.4" fill="#f59f0a" />
    </svg>
  );
}

export function BrandMark({ className, href = '/', iconClassName }: { className?: string; href?: string | null; iconClassName?: string }) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5 font-display font-bold tracking-tight', className)}>
      <BrandLogo className={iconClassName} />
      <span className="text-lg leading-none text-foreground">
        Loca<span className="text-primary-700 dark:text-primary-300">Stay</span>
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex shrink-0 transition-opacity hover:opacity-80">
      {content}
    </Link>
  );
}
