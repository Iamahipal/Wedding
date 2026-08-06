/**
 * DOM elements that are written to every frame from inside the render loop.
 *
 * They are here, in a plain module object, for the same reason scroll progress
 * is: touching them through React state would re-render the tree on every frame
 * of a scrub. The overlay registers them on mount; the frame driver mutates
 * their style directly.
 */
import type { ActName } from './film'

export const domRefs: {
  curtain: HTMLDivElement | null
  hud: HTMLDivElement | null
  /**
   * Every caption block, with the act it belongs to.
   *
   * Captions are faded by scrubbed GSAP timelines, and a scrub is *smoothed* —
   * it lags the playhead by design. Scroll quickly across an act boundary and
   * the outgoing caption is still catching up, so Akasha's line was landing on
   * Vayu's cloth and Vayu's on Agni's fire. Re-timing cannot fix it, because
   * the lag is the feature.
   *
   * So the render loop enforces the boundary outright: a caption whose act does
   * not own the playhead is hidden, whatever its tween currently believes.
   */
  captions: { act: ActName; el: HTMLElement }[]
} = {
  curtain: null,
  hud: null,
  captions: [],
}
