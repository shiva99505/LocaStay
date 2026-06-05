import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LocaStay - India\'s Rural Property Marketplace',
  description: 'GPS-powered rural property marketplace in India',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
