import type { Metadata } from 'next'
import { Inter, Space_Mono } from 'next/font/google'
import './globals.css'
import ConditionalNavbar from '@/components/ConditionalNavbar'
import { AuthProvider } from '@/components/AuthProvider'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FitLegend',
  description: 'Track lifts. Build streaks. Become legendary.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'FitLegend',
    description: 'Track lifts. Build streaks. Become legendary.',
    type: 'website',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'theme-color': '#09090b',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceMono.variable}`}>
      <body>
        <div className="mx-auto w-full" style={{ maxWidth: 480 }}>
          <AuthProvider>
            {children}
            <ConditionalNavbar />
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}
