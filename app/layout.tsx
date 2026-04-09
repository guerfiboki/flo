// file: app/layout.tsx
import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Navbar } from '@/components/Navbar'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'WaveCamp Morocco — Surf & Stay',
  description:
    'Book your perfect surf camp or beach accommodation in Morocco. Taghazout, Agadir, Imsouane and beyond.',
  openGraph: {
    title: 'WaveCamp Morocco',
    description: 'Book surf camps & accommodation in Morocco',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-body bg-white text-gray-900 antialiased">
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
