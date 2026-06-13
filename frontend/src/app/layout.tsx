import type { Metadata, Viewport } from 'next';
import { DM_Sans, Poppins } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { LocaleProvider } from '@/components/providers/locale-provider';
import { SessionProvider } from '@/components/providers/session-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const fontSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const fontDisplay = Poppins({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: { default: 'LocaStay — India\'s First GPS-Powered Rural Property Marketplace', template: '%s · LocaStay' },
  description: 'Discover verified rural & semi-urban rental homes, PGs, hostels and farmhouses near you — with GPS-mapped neighbourhoods, transparent rent tracking, digital agreements and trusted local landlords.',
  applicationName: 'LocaStay',
  keywords: ['rural rental', 'PG near me', 'house for rent India', 'GPS property search', 'LocaStay', 'verified landlords', 'rent agreement online'],
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg', apple: '/icons/icon-192.svg' },
  openGraph: {
    title: 'LocaStay — India\'s First GPS-Powered Rural Property Marketplace',
    description: 'Verified rural rental homes, transparent rent tracking and digital agreements — all in one place.',
    siteName: 'LocaStay',
    type: 'website',
    locale: 'en_IN',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontDisplay.variable} font-sans antialiased`}>
        <SessionProvider>
          <ThemeProvider>
            <LocaleProvider>
              <TooltipProvider delayDuration={150}>
                {children}
                <Toaster />
              </TooltipProvider>
            </LocaleProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
