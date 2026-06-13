'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useLocale } from '@/components/providers/locale-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/components/auth/demo-accounts';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email:    z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginValues = z.infer<typeof loginSchema>;

const ROLE_HOME: Record<string, string> = {
  TENANT:   '/tenant',
  LANDLORD: '/landlord',
  ADMIN:    '/admin',
};

export function LoginForm() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams  = useSearchParams();
  const callbackUrl   = searchParams.get('callbackUrl') || undefined;
  const errorParam    = searchParams.get('error');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition]    = useTransition();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = (values: LoginValues, demoLabel?: string) => {
    startTransition(async () => {
      const supabase = createBrowserClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email:    values.email,
        password: values.password,
      });

      if (error || !data.user) {
        toast.error('Could not sign in', {
          description: error?.message ?? 'Check your email and password and try again.',
        });
        return;
      }

      // Fetch role from profiles to redirect correctly
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const home = ROLE_HOME[profile?.role ?? 'TENANT'] ?? '/';
      toast.success(demoLabel ? `Signed in as ${demoLabel}` : 'Welcome back!');
      router.push(callbackUrl ?? home);
      router.refresh();
    });
  };

  const fillDemo = (email: string, label: string) => {
    form.setValue('email', email);
    form.setValue('password', DEMO_PASSWORD);
    submit({ email, password: DEMO_PASSWORD }, label);
  };

  return (
    <div className="space-y-6">
      {errorParam === 'account_suspended' && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Your account has been suspended. Please contact support.
        </div>
      )}

      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{t.auth.loginTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.auth.loginSubtitle}</p>
      </div>

      <form onSubmit={form.handleSubmit((v) => submit(v))} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input
            id="email" type="email" autoComplete="email" placeholder="you@example.com"
            icon={<Mail className="h-4 w-4" />} {...form.register('email')}
          />
          {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Link href="#" className="text-xs font-medium text-primary-700 hover:underline dark:text-primary-300">{t.auth.forgotPassword}</Link>
          </div>
          <div className="relative">
            <Input
              id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
              placeholder="••••••••" icon={<Lock className="h-4 w-4" />} className="pr-11"
              {...form.register('password')}
            />
            <button
              type="button" onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isPending}>{t.auth.signIn}</Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{' '}
        <Link href="/register" className="font-semibold text-primary-700 hover:underline dark:text-primary-300">{t.auth.signUpLink}</Link>
      </p>

      <Card className="border-dashed bg-muted/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-accent-500" /> {t.auth.orContinueWith}
          </CardTitle>
          <CardDescription className="text-xs">{t.auth.demoHint}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 pt-0 sm:grid-cols-3">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              disabled={isPending}
              onClick={() => fillDemo(acc.email, acc.label)}
              className={cn(
                'group flex flex-col items-start gap-1 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-soft disabled:pointer-events-none disabled:opacity-50',
              )}
            >
              <span className="text-sm font-semibold text-foreground">{acc.label}</span>
              <span className="text-[11px] leading-snug text-muted-foreground">{acc.hint}</span>
              <span className="mt-1 truncate text-[11px] font-medium text-primary-700 group-hover:underline dark:text-primary-300">{acc.email}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-muted-foreground">{t.auth.agreeTerms}</p>
    </div>
  );
}
