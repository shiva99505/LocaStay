import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary-700 text-white shadow-soft hover:bg-primary-800 dark:bg-primary-600 dark:hover:bg-primary-500',
        secondary: 'bg-secondary-600 text-white shadow-soft hover:bg-secondary-700 dark:bg-secondary-500 dark:hover:bg-secondary-600',
        accent: 'bg-accent-500 text-accent-foreground shadow-soft hover:bg-accent-600',
        outline: 'border border-border bg-transparent hover:bg-muted text-foreground',
        ghost: 'hover:bg-muted text-foreground',
        link: 'text-primary-700 dark:text-primary-300 underline-offset-4 hover:underline p-0 h-auto',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        soft: 'bg-primary-50 text-primary-800 hover:bg-primary-100 dark:bg-primary-500/10 dark:text-primary-200 dark:hover:bg-primary-500/20',
        'soft-secondary': 'bg-secondary-50 text-secondary-800 hover:bg-secondary-100 dark:bg-secondary-500/10 dark:text-secondary-200 dark:hover:bg-secondary-500/20',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-7 text-base',
        xl: 'h-14 rounded-2xl px-8 text-base',
        icon: 'h-10 w-10 shrink-0',
        'icon-sm': 'h-8 w-8 shrink-0 rounded-lg',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button };
