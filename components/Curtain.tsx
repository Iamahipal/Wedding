'use client'

import { useEffect, useRef } from 'react'

import { domRefs } from '@/lib/domRefs'

/**
 * The dissolve that covers every cut between acts.
 *
 * Two acts never share a camera position — a weighted average of two stations
 * would point the lens at the empty space between them — so the film cuts, and
 * this covers the cut the way a film does: it reaches full opacity on the exact
 * frame the camera changes station, in whatever colour the outgoing act was
 * already full of, so it reads as the image continuing rather than as an
 * overlay dropped on top of it.
 *
 * Its opacity is written every frame from inside the render loop, never through
 * React state — one clock, one frame, no re-render on the scroll path.
 */
export default function Curtain() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    domRefs.curtain = ref.current
    return () => {
      domRefs.curtain = null
    }
  }, [])

  return <div id="curtain" ref={ref} aria-hidden="true" />
}
