import Curtain from '@/components/Curtain'
import Diag from '@/components/Diag'
import FilmChoreography from '@/components/Film'
import Invitation from '@/components/Invitation'
import Overlay from '@/components/Overlay'
import SoundToggle from '@/components/SoundToggle'
import { ACT_LENGTH_VH, ACT_ORDER } from '@/lib/film'

/**
 * The document is almost nothing: a stack of empty sections whose only job is to
 * give the scroll something to measure, and then the invitation.
 *
 * All of the film's *height* lives here, all of its *timing* lives in Film.tsx,
 * and all of its *images* live in the canvas mounted up in app/layout.tsx. The
 * three are independent on purpose — the film can be re-paced by changing a
 * number in ACT_LENGTH_VH without touching a shader.
 */
export default function Page() {
  return (
    <>
      <FilmChoreography />
      <Overlay />
      <Curtain />
      {/* rendered in the first paint, before the film makes a sound */}
      <SoundToggle />
      <Diag />

      <main className="relative z-10">
        <div data-film aria-hidden="true">
          {ACT_ORDER.map((act) => (
            <section key={act} data-act={act} style={{ height: `${ACT_LENGTH_VH[act]}vh` }} />
          ))}
        </div>

        <Invitation />
      </main>
    </>
  )
}
