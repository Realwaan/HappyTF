import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HappyTF Work OS — Collaborative Work Management',
    short_name: 'HappyTF',
    description: 'Enterprise-grade multi-workspace sprint planning, agile task tracking, and collaborative boards platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07090e',
    theme_color: '#6366f1',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
