'use client'

import Act from './Act'
import Agni from './Agni'
import Akasha from './Akasha'
import Gathbandhan from './Gathbandhan'
import Jal from './Jal'
import Prithvi from './Prithvi'
import Shunya from './Shunya'
import Vayu from './Vayu'

/**
 * The whole world, in film order.
 *
 * Every act is mounted here exactly once and never unmounted — see the note at
 * the top of lib/film.ts. <Act> parks each one at its own station and switches
 * the subtree off the moment the playhead leaves it, so the running cost is
 * that of the single live act rather than of all seven.
 */
export default function Acts() {
  return (
    <>
      <Act name="shunya">
        <Shunya />
      </Act>
      <Act name="akasha">
        <Akasha />
      </Act>
      <Act name="vayu">
        <Vayu />
      </Act>
      <Act name="agni">
        <Agni />
      </Act>
      <Act name="jal">
        <Jal />
      </Act>
      <Act name="prithvi">
        <Prithvi />
      </Act>
      <Act name="gathbandhan">
        <Gathbandhan />
      </Act>
    </>
  )
}
