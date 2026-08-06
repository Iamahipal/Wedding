/**
 * lib/content.ts — ALL copy. Names, dates, venues, shlokas, RSVP.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  EVERYTHING MARKED «PLACEHOLDER» IS FAKE AND MUST BE REPLACED.           ║
 * ║  Nothing else in the codebase contains copy. Change it here, once.       ║
 * ║                                                                          ║
 * ║  Devanagari strings live in content/devanagari.json instead, because      ║
 * ║  they are shaped into committed SVG outlines at build time rather than    ║
 * ║  rendered with a webfont. Edit that file, then re-run:                    ║
 * ║      npm run devanagari                                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import devanagari from '../content/devanagari.json'

/** Flip to false once real copy has replaced every «PLACEHOLDER» below. */
export const USING_PLACEHOLDERS = true

/**
 * The two households.
 *
 * The Panch Mahabhuta structure is pan-Vedic and carries the film; the regions
 * are its *surface* — ornament, textile and architecture, never a separate act.
 * Each vocabulary stays distinct through the film and the two resolve into one
 * at गठबंधन, which is the wedding stated in material rather than in words.
 *
 * Swap these two values to swap which side carries which tradition. Nothing
 * else in the codebase hard-codes it.
 */
export type Region = 'rajasthan' | 'awadh'

export const REGION_OF = {
  bride: 'awadh', // Banarasi brocade, Awadhi multifoil arches, deep-daan
  groom: 'rajasthan', // leheriya and bandhani, jaali and jharokha, the baori
} as const satisfies Record<'bride' | 'groom', Region>

export const DEV = devanagari as unknown as Record<string, string>

/* ─────────────────────────────────────────────────────────── the couple ───── */

export const couple = {
  bride: {
    name: 'Niharika',
    devanagariKey: 'brideName',
    /** Birth nakshatra — drives which star aligns in Akasha. 0..26 */
    nakshatra: 16, // «PLACEHOLDER» Anuradha
    parents: 'daughter of Mr. & Mrs. Placeholder Sharma', // «PLACEHOLDER»
  },
  groom: {
    name: 'Mahipal',
    devanagariKey: 'groomName',
    nakshatra: 4, // «PLACEHOLDER» Mrigashira
    parents: 'son of Mr. & Mrs. Placeholder Verma', // «PLACEHOLDER»
  },
} as const

/* ───────────────────────────────────────────────────────────── the acts ───── */

export interface ActCopy {
  devanagariKey: string
  roman: string
  english: string
  line: string
}

export const actCopy = {
  shunya: {
    devanagariKey: 'actShunya',
    roman: 'Shunya',
    english: 'the void',
    line: 'Before anything, nothing. Then a single point of light.',
  },
  akasha: {
    devanagariKey: 'actAkasha',
    roman: 'Akasha',
    english: 'ether',
    line: 'Twenty-seven lunar mansions. Two stars, and the moment they meet.',
  },
  vayu: {
    devanagariKey: 'actVayu',
    roman: 'Vayu',
    english: 'air',
    line: 'Breath, and the space between two people.',
  },
  agni: {
    devanagariKey: 'actAgni',
    roman: 'Agni',
    english: 'fire',
    /**
     * NOT "seven steps around the fire". सप्तपदी is seven steps taken
     * *together*, and फेरे are the circumambulations — two different rites that
     * popular writing runs into one. The phera count also varies by family
     * (four for the four पुरुषार्थ is as standard as seven), so this line
     * deliberately claims no count of circuits at all.
     */
    line: 'Seven steps taken together. Seven promises, before the fire.',
  },
  jal: {
    devanagariKey: 'actJal',
    roman: 'Jal',
    english: 'water',
    line: 'Stillness. The kalash, the lotus, and a lamp on dark water.',
  },
  prithvi: {
    devanagariKey: 'actPrithvi',
    roman: 'Prithvi',
    english: 'earth',
    line: 'Gold made solid. The mandap rises.',
  },
  gathbandhan: {
    devanagariKey: 'actGathbandhan',
    roman: 'Gathbandhan',
    english: 'the knot',
    line: 'Two become one, and the knot is tied.',
  },
} satisfies Record<string, ActCopy>

/* ────────────────────────────────────────────────────────── the seven ───── */

/**
 * The सप्तपदी — seven steps.
 *
 * These are the *themes* of the seven vows: each is the single Sanskrit word
 * that its step is named for, which is safe to display.
 *
 * DO NOT ADD THE FULL SAPTAPADI MANTRAS HERE, and do not let anyone paraphrase
 * or reconstruct them. The complete verses are liturgical text and vary by
 * tradition, region and family. If the family wants the full Sanskrit, get the
 * exact text from their pandit and paste it in verbatim. Displaying approximated
 * scripture at a real wedding is worse than displaying none.
 */
export const saptapadi = [
  { numKey: 'num1', key: 'step1', roman: 'anna', english: 'nourishment and sustenance' },
  { numKey: 'num2', key: 'step2', roman: 'bala', english: 'strength, in body and in spirit' },
  { numKey: 'num3', key: 'step3', roman: 'dhana', english: 'prosperity, honourably earned' },
  { numKey: 'num4', key: 'step4', roman: 'sukha', english: 'happiness and harmony' },
  { numKey: 'num5', key: 'step5', roman: 'prajā', english: 'family, and its continuation' },
  { numKey: 'num6', key: 'step6', roman: 'ṛtu', english: 'health through every season' },
  // "the vow the other six rest on" used to be appended here. It is a common
  // and lovely reading, but it is a *reading* — editorial gloss presented in
  // the same voice as the tradition. Left as the plain meaning instead.
  { numKey: 'num7', key: 'step7', roman: 'sakhya', english: 'friendship, and lifelong companionship' },
] as const

/* ─────────────────────────────────────────────────────── the invitation ───── */

export const invitation = {
  eyebrow: 'Together with their families', // «PLACEHOLDER»
  headline: 'request the honour of your presence', // «PLACEHOLDER»
  dateLine: 'Friday, the twelfth of February, Two Thousand Twenty-Seven', // «PLACEHOLDER»
  cityLine: 'Udaipur, Rajasthan', // «PLACEHOLDER»
  muhuratLine: 'The auspicious hour falls at 7:42 in the evening', // «PLACEHOLDER»
}

export interface EventEntry {
  key: string
  name: string
  devanagariKey?: string
  date: string
  time: string
  venue: string
  address: string
  note?: string
  dress?: string
}

export const events: EventEntry[] = [
  {
    key: 'mehndi',
    name: 'Mehndi', // «PLACEHOLDER» — all six entries below are placeholders
    date: 'Wednesday, 10 February 2027',
    time: '4:00 pm onwards',
    venue: 'The Courtyard, Placeholder Palace',
    address: 'Lake Road, Udaipur, Rajasthan 313001',
    dress: 'Garden florals',
  },
  {
    key: 'haldi',
    name: 'Haldi',
    date: 'Thursday, 11 February 2027',
    time: '11:00 am',
    venue: 'The Lawns, Placeholder Palace',
    address: 'Lake Road, Udaipur, Rajasthan 313001',
    dress: 'Yellow, and clothes you do not love',
  },
  {
    key: 'sangeet',
    name: 'Sangeet',
    date: 'Thursday, 11 February 2027',
    time: '8:00 pm',
    venue: 'Durbar Hall, Placeholder Palace',
    address: 'Lake Road, Udaipur, Rajasthan 313001',
    dress: 'Indian formal',
  },
  {
    key: 'baraat',
    name: 'Baraat',
    date: 'Friday, 12 February 2027',
    time: '5:30 pm',
    venue: 'Assembling at the East Gate',
    address: 'Lake Road, Udaipur, Rajasthan 313001',
    note: 'Please arrive by 5:00 pm — the procession will not wait.',
  },
  {
    key: 'vivah',
    name: 'Vivah',
    devanagariKey: 'vivah',
    date: 'Friday, 12 February 2027',
    time: '7:42 pm, the muhurat',
    venue: 'The Mandap, Water Garden',
    address: 'Lake Road, Udaipur, Rajasthan 313001',
    dress: 'Indian traditional',
  },
  {
    key: 'reception',
    name: 'Reception',
    date: 'Saturday, 13 February 2027',
    time: '7:00 pm',
    venue: 'The Terrace, Placeholder Palace',
    address: 'Lake Road, Udaipur, Rajasthan 313001',
    dress: 'Black tie or Indian formal',
  },
]

export const rsvp = {
  headline: 'Kindly respond',
  line: 'We would be grateful to know by the fifteenth of January.', // «PLACEHOLDER»
  /**
   * Static export — there is no server. Point this at a Google Form, a Typeform,
   * a mailto:, or anything else that lives outside this build.
   */
  href: 'https://example.com/rsvp', // «PLACEHOLDER»
  cta: 'RSVP',
  contacts: [
    { name: 'Placeholder Sharma', role: 'for the bride', tel: '+91 00000 00000' }, // «PLACEHOLDER»
    { name: 'Placeholder Verma', role: 'for the groom', tel: '+91 00000 00000' }, // «PLACEHOLDER»
  ],
}

export const travel = {
  headline: 'Getting there',
  items: [
    {
      title: 'By air',
      body: 'Maharana Pratap Airport (UDR) is 40 minutes from the venue. «PLACEHOLDER»',
    },
    {
      title: 'By rail',
      body: 'Udaipur City station is 20 minutes from the venue. «PLACEHOLDER»',
    },
    {
      title: 'Staying',
      body: 'A block of rooms is held under the family name until 1 January. «PLACEHOLDER»',
    },
  ],
}

export const site = {
  title: 'Niharika & Mahipal',
  description:
    'A wedding invitation told through the five great elements — शून्य, आकाश, वायु, अग्नि, जल, पृथ्वी.',
  closingKey: 'panchMahabhuta',
  closingRoman: 'Panch Mahabhuta — the five great elements',
}
