import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tended',
    short_name: 'Tended',
    description: 'Household inventory & smart kitchen management',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A0A0B',
    theme_color: '#0A0A0B',
    categories: ['lifestyle', 'productivity', 'food'],
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purpose: 'any' as any,
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        purpose: 'maskable' as any,
      },
    ],
    screenshots: [],
  };
}
