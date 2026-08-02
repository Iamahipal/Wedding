import type { Metadata, Viewport } from 'next'

// Self-hosted, latin subset only. No CDN on the critical path of the opening,
// and no Devanagari webfont at all — see PART 5: every Devanagari glyph in this
// film is a committed outline, shaped once at build time.
import '@fontsource/cormorant-garamond/latin-300.css'
import '@fontsource/cormorant-garamond/latin-400.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import './globals.css'

import StageMount from '@/components/StageMount'
import { site } from '@/lib/content'

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
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
