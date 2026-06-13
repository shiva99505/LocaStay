import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LocaStay — GPS-Powered Rural Property Marketplace',
    short_name: 'LocaStay',
    description: 'Discover verified rural rental homes, track rent, sign digital agreements and manage your stay — all GPS-mapped to your neighbourhood.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0e3b9a',
    orientation: 'portrait-primary',
    categories: ['lifestyle', 'real estate', 'utilities'],
    icons: [
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-maskable.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
