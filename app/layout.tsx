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
      {/* Captures anything that throws before — or instead of — hydration, so
          `?diag` can report it on a device with no console attached. Inline and
          dependency-free on purpose: it has to run before the bundle does. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            'window.__errs=[];' +
            "addEventListener('error',function(e){window.__errs.push((e.message||e.type)+' @ '+(e.filename||'?').split('/').pop()+':'+(e.lineno||0))});" +
            "addEventListener('unhandledrejection',function(e){window.__errs.push('promise: '+((e.reason&&e.reason.message)||e.reason))});",
        }}
      />
      <body className="antialiased">
        {/* The one canvas. Mounted here, once, and never unmounted. */}
        <StageMount />
        {children}
      </body>
    </html>
  )
}
