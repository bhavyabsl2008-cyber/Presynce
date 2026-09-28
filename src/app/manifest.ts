import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Presynce',
    short_name: 'Presynce',
    description: 'Attendance intelligence platform for Chitkara University CSE students.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F2EC',
    theme_color: '#11100F',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
