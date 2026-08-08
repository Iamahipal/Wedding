import { ARCH } from '@/lib/ornament'

/**
 * The two arches, once, as clip paths the whole celebration refers to.
 *
 * `clipPathUnits="objectBoundingBox"` is what lets one 0..1 path clip a frame
 * of any size, so these are defined a single time for the page rather than
 * inlined per panel.
 *
 * The host element is sized to nothing rather than hidden with `display: none`.
 * A `display: none` subtree is not laid out, and several engines will then
 * refuse to resolve a `clip-path: url(#…)` that points into it — the photograph
 * simply appears unclipped, on some browsers and not others.
 */
export default function UtsavDefs() {
  return (
    <svg className="u-defs" aria-hidden="true" focusable="false">
      <defs>
        {/* राजस्थान — the cusped jharokha arch, a point on the apex */}
        <clipPath id="u-arch-rajasthan" clipPathUnits="objectBoundingBox">
          <path d={ARCH.rajasthan} />
        </clipPath>
        {/* अवध — the multifoil, a lobe on the apex */}
        <clipPath id="u-arch-awadh" clipPathUnits="objectBoundingBox">
          <path d={ARCH.awadh} />
        </clipPath>
      </defs>
    </svg>
  )
}
