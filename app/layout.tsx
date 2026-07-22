import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Jost, Montserrat } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const jost = Jost({
  variable: '--font-jost',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

// Montserrat powers the tracked-out uppercase eyebrows/labels on the public
// marketing site (brand spec). Kept light-weight — only the weights we use.
const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HerCoach Jess',
  description: 'Private coaching platform, nutrition & fitness by Jess, RD',
}

// iOS / Android polish: lock the viewport without preventing user zoom, paint
// the iPhone status bar to match the dark UI, and respect the device safe
// areas via env() in globals.css.
export const viewport: Viewport = {
  themeColor: '#080808',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  )
}
