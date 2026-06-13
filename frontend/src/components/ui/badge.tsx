import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/constants';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-700 text-white',
        secondary: 'border-transparent bg-secondary-600 text-white',
        outline: 'border-border text-foreground bg-transparent',
        success: 'border-transparent bg-secondary-100 text-secondary-800 dark:bg-secondary-500/15 dark:text-secondary-300',
        warning: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
        destructive: 'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        info: 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
        muted: 'border-transparent bg-muted text-muted-foreground',
        brand: 'border-transparent bg-gradient-to-r from-primary-700 to-secondary-600 text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const toneToVariant: Record<Tone, BadgeProps['variant']> = {
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
  info: 'info',
  muted: 'muted',
  brand: 'brand',
};

/** Convenience badge driven by the shared `Tone` used in constants metadata maps. */
function StatusBadge({ tone, label, className }: { tone: Tone; label: string; className?: string }) {
  return (
    <Badge variant={toneToVariant[tone]} className={cn('normal-case tracking-normal font-semibold', className)}>
      {label}
    </Badge>
  );
}

export { Badge, StatusBadge };
