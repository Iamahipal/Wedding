'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef } from 'react'

import { domRefs } from '@/lib/domRefs'

/**
 * The canvas is client-only: there is no WebGL context on the server, and the
 * DPR cap has to be read from the real device at mount.
 *
 * This wrapper exists purely so that `ssr: false` is legal — it is not allowed
 * inside a Server Component, and app/layout.tsx is one.
 */
const Stage = dynamic(() => import('./Stage'), { ssr: false })

export default function StageMount() {
  const ref = useRef<HTMLDivElement>(null)

  // Registered, not React state. The frame driver fades this element out as the
  // film hands over to उत्सव, and it writes to it directly every frame.
  useEffect(() => {
    domRefs.stage = ref.current
    return () => {
      domRefs.stage = null
    }
  }, [])

  return (
    <div id="stage" ref={ref} aria-hidden="true">
      <Stage />
    </div>
  )
}
