/**
 * DOM elements that are written to every frame from inside the render loop.
 *
 * They are here, in a plain module object, for the same reason scroll progress
 * is: touching them through React state would re-render the tree on every frame
 * of a scrub. The overlay registers them on mount; the frame driver mutates
 * their style directly.
 */
export const domRefs: {
  curtain: HTMLDivElement | null
  hud: HTMLDivElement | null
} = {
  curtain: null,
  hud: null,
}
