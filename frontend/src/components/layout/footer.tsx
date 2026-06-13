import Link from 'next/link';
import { Mail, MapPin, Phone, Facebook, Instagram, Twitter } from 'lucide-react';
import { BrandMark } from '@/components/common/brand-mark';

const FOOTER_LINKS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Discover',
    links: [
      { label: 'Explore properties', href: '/properties' },
      { label: 'Map My Stay', href: '/map' },
      { label: 'Compare properties', href: '/properties?compare=1' },
      { label: 'Local services directory', href: '/properties#local-services' },
    ],
  },
  {
    title: 'For landlords',
    links: [
      { label: 'List your property', href: '/landlord/properties' },
      { label: 'Landlord hub', href: '/landlord' },
      { label: 'Pricing & AI tools', href: '/landlord' },
      { label: 'Success stories', href: '/landlord' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About LocaStay', href: '/' },
      { label: 'How verification works', href: '/' },
      { label: 'Support center', href: '/tenant/support' },
      { label: 'Terms & privacy', href: '/' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <BrandMark />
            <p className="max-w-xs text-sm text-muted-foreground">
              India&apos;s first GPS-powered rural property marketplace — connecting verified landlords with tenants across Tier-2 &amp; Tier-3 India.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary-600" /> Bhopal, Madhya Pradesh, India</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary-600" /> +91 98765 00000</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary-600" /> support@locastay.in</li>
            </ul>
            <div className="flex items-center gap-2 pt-1">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a key={i} href="#" aria-label="Social link" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary-300 hover:text-primary-700 dark:hover:text-primary-300">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-bold text-foreground">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} LocaStay Technologies Pvt. Ltd. All rights reserved.</p>
          <p>Made with ❤ for Bharat&apos;s rural rental economy · GPS-verified listings across 5 states</p>
        </div>
      </div>
    </footer>
  );
}
