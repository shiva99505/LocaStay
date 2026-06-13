import Link from 'next/link';
import { MapPin, ShieldCheck, FileSignature, Wallet } from 'lucide-react';
import { BrandMark } from '@/components/common/brand-mark';

const PITCH_POINTS = [
  { icon: MapPin, title: 'GPS-mapped listings', text: 'See real distances to schools, hospitals, markets & transit before you commit.' },
  { icon: ShieldCheck, title: 'Verified landlords & tenants', text: 'KYC, document checks and AI fraud screening keep both sides safe.' },
  { icon: FileSignature, title: 'Digital agreements', text: 'Generate, e-sign and store rental agreements without a single trip to a typist.' },
  { icon: Wallet, title: 'Transparent rent tracking', text: 'Auto-reminders, UPI receipts and a full payment history in one place.' },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent-400 blur-3xl" />
          <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative z-10">
          <BrandMark className="text-white" iconClassName="h-9 w-9" href={null} />
          <p className="mt-1 text-sm text-white/70">India&apos;s First GPS-Powered Rural Property Marketplace</p>
        </div>

        <div className="relative z-10 max-w-md space-y-7">
          <h2 className="font-display text-3xl font-bold leading-tight">
            Find a home, list a home — trust the whole way through.
          </h2>
          <ul className="space-y-5">
            {PITCH_POINTS.map((p) => (
              <li key={p.title} className="flex gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <p.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-white/70">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/50">© {new Date().getFullYear()} LocaStay. Built for Bharat&apos;s rural rental economy.</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="mb-8 lg:hidden">
          <BrandMark />
        </div>
        <div className="mx-auto w-full max-w-md">{children}</div>
        <p className="mx-auto mt-10 max-w-md text-center text-xs text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
