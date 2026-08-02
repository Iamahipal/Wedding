'use client'

import dynamic from 'next/dynamic'

/**
 * The canvas is client-only: there is no WebGL context on the server, and the
 * DPR cap has to be read from the real device at mount.
 *
 * This wrapper exists purely so that `ssr: false` is legal — it is not allowed
 * inside a Server Component, and app/layout.tsx is one.
 */
const Stage = dynamic(() => import('./Stage'), { ssr: false })

export default function StageMount() {
  return (
    <div id="stage" aria-hidden="true">
      <Stage />
    </div>
  )
}
