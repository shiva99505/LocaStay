'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Mail, Phone, User2, Home, Building2 } from 'lucide-react';
import { useLocale } from '@/components/providers/locale-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const registerSchema = z
  .object({
    name:            z.string().trim().min(2, 'Enter your full name'),
    email:           z.string().trim().toLowerCase().email('Enter a valid email address'),
    phone:           z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    password:        z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string(),
    role:            z.enum(['TENANT', 'LANDLORD']),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof registerSchema>;

const ROLE_HOME: Record<string, string> = {
  TENANT:   '/tenant',
  LANDLORD: '/landlord',
};

export function RegisterForm() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition]    = useTransition();

  const form = useForm<RegisterValues>({
    resolver:      zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'TENANT' },
  });
  const role = form.watch('role');

  const submit = (values: RegisterValues) => {
    startTransition(async () => {
      const supabase = createClient();

      // Sign up — Supabase creates the auth user and the DB trigger creates the profile row
      const { data, error } = await supabase.auth.signUp({
        email:    values.email,
        password: values.password,
        options: {
          data: {
            name:     values.name,
            phone:    values.phone,
            role:     values.role,
            language: locale ?? 'en',
          },
          // After email confirmation, send user to their dashboard
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${ROLE_HOME[values.role]}`,
        },
      });

      if (error) {
        toast.error('Could not create account', {
          description: error.message,
        });
        return;
      }

      // If email confirmation is required, Supabase won't auto-sign in
      if (data.session) {
        // Email confirmation disabled — signed in immediately
        toast.success('Welcome to LocaStay! Your account is ready.');
        router.push(ROLE_HOME[values.role]);
        router.refresh();
      } else {
        // Email confirmation required
        toast.success('Account created!', {
          description: 'Check your email and click the confirmation link to activate your account.',
          duration: 8000,
        });
        router.push('/login');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{t.auth.registerTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.auth.registerSubtitle}</p>
      </div>

      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        {/* Role selector */}
        <div className="space-y-1.5">
          <Label>{t.auth.role}</Label>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: 'TENANT',   label: t.auth.tenant,   icon: Home },
                { value: 'LANDLORD', label: t.auth.landlord, icon: Building2 },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => form.setValue('role', opt.value, { shouldValidate: true })}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-all',
                  role === opt.value
                    ? 'border-primary-600 bg-primary-50 text-primary-800 shadow-soft dark:bg-primary-500/10 dark:text-primary-200'
                    : 'border-border bg-card text-foreground hover:border-primary-300',
                )}
              >
                <opt.icon className="h-4 w-4 shrink-0" />
                <span className="leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">{t.auth.name}</Label>
          <Input id="name" placeholder="Aarav Mehta" icon={<User2 className="h-4 w-4" />} {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Email + Phone */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" icon={<Mail className="h-4 w-4" />} {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t.auth.phone}</Label>
            <Input id="phone" type="tel" inputMode="numeric" maxLength={10} placeholder="98XXXXXXXX" icon={<Phone className="h-4 w-4" />} {...form.register('phone')} />
            {form.formState.errors.phone && (
              <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
            )}
          </div>
        </div>

        {/* Password + Confirm */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">{t.auth.password}</Label>
            <div className="relative">
              <Input
                id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                placeholder="••••••••" icon={<Lock className="h-4 w-4" />} className="pr-11"
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
            <Input
              id="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
              placeholder="••••••••" icon={<Lock className="h-4 w-4" />}
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isPending}>
          {t.auth.createAccount}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">{t.auth.agreeTerms}</p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t.auth.haveAccount}{' '}
        <Link href="/login" className="font-semibold text-primary-700 hover:underline dark:text-primary-300">
          {t.auth.signInLink}
        </Link>
      </p>
    </div>
  );
}
