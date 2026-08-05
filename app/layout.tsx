import type { Metadata, Viewport } from 'next'

// Self-hosted, latin subset only. No CDN on the critical path of the opening,
// and no Devanagari webfont at all — see PART 5: every Devanagari glyph in this
// film is a committed outline, shaped once at build time.
import '@fontsource/cormorant-garamond/latin-300.css'
import '@fontsource/cormorant-garamond/latin-400.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import './globals.css'

import StageMount from '@/components/StageMount'
import { asset } from '@/lib/basePath'
import { site } from '@/lib/content'

/**
 * Absolute, because a relative og:image is ignored by most crawlers — and this
 * invitation will be *forwarded*, not typed into a browser bar. WhatsApp is how
 * it actually reaches people, and what they see there is this card.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://iamahipal.github.io/Wedding/'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: site.title,
  description: site.description,
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: site.title,
    title: site.title,
    description: site.description,
    url: SITE_URL,
    images: [
      {
        // dimensions declared so the card renders large rather than as a
        // thumbnail while the image is still being fetched
        url: asset('/og.png'),
        width: 1200,
        height: 630,
        alt: `${site.title} — ${site.closingRoman}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
    images: [asset('/og.png')],
  },
}

export const viewport: Viewport = {
  themeColor: '#050301',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* The one canvas. Mounted here, once, and never unmounted. */}
        <StageMount />
        {children}
      </body>
    </html>
  )
}
