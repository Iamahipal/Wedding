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
    /**
     * The act now holds both real practices, in the order they happen: गुण
     * मिलान decides the marriage, ध्रुव and अरुन्धती दर्शन witness it.
     *
     * The line used to say "two stars, and the moment they meet". Matching the
     * birth nakshatras is entirely real — most of the 36 गुण are computed from
     * them — but the *merging* was invented, and the accurate version is the
     * better image anyway: a line drawn between two stars that stay where they
     * are, which is what a match actually is.
     */
    line: 'Two birth stars, matched. And the pole star that never wavers.',
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

/* ─────────────────────────────────────────────────────── the celebration ───── */

/**
 * The seven functions.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  THIS LIST IS INVENTED. Replace it with the functions that are actually   ║
 * ║  happening — add मायरा / भात, सेहरा बंदी, a reception; delete whatever    ║
 * ║  this family does not hold. Deleting an entry deletes its panel, and the  ║
 * ║  order here is the order they appear in.                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * `side` is not decoration either: it decides which regional vocabulary frames
 * the panel — the groom's राजस्थान cusped arch or the bride's अवध multifoil —
 * against REGION_OF above. It is the same argument the film makes in gold, so
 * it has to be *true*, not alternated for rhythm.
 *
 * हल्दी is marked as the bride's although it is held at both houses; it is the
 * bride's haldi that gets photographed. विवाह is the only `both`, and it is the
 * only panel where the two arches interlock — which is गठबंधन, in 2D.
 *
 * `palette` is not here. Each panel's colour lives in app/globals.css keyed on
 * `[data-fn="…"]`, next to the other six, because a palette is only ever chosen
 * against its neighbours.
 */
export type FunctionKey =
  | 'tilak'
  | 'mehndi'
  | 'haldi'
  | 'sangeet'
  | 'baraat'
  | 'vivah'
  | 'vidaai'

export interface Celebration {
  key: FunctionKey
  name: string
  /** a key in content/devanagari.json — re-run `npm run devanagari` if you add one */
  devanagariKey: string
  side: 'bride' | 'groom' | 'both'
  date: string
  time: string
  venue: string
  address: string
  /** Google Maps: share → copy link. Omitted means the panel shows no map link. */
  map?: string
  dress?: string
  note?: string
  /** one line of what actually happens, for a guest who has never been to one */
  line: string
  /**
   * The photograph's slug in assets/photos — `haldi.jpg` becomes `haldi`.
   * A function with no photograph yet draws its ornament instead, which is a
   * designed state rather than a hole.
   */
  photo: string
}

export const celebrations: Celebration[] = [
  {
    key: 'tilak',
    name: 'Tilak', // «PLACEHOLDER» — every entry in this array is invented
    devanagariKey: 'tilak',
    side: 'groom',
    date: 'Tuesday, 9 February 2027',
    time: '11:00 am',
    venue: 'Placeholder House',
    address: 'Chandpole, Udaipur, Rajasthan 313001',
    map: '',
    dress: 'Saffron and white',
    line: 'The bride’s family marks the groom’s forehead, and the two households are formally joined.',
    photo: 'tilak',
  },
  {
    key: 'mehndi',
    name: 'Mehndi',
    devanagariKey: 'mehndi',
    side: 'bride',
    date: 'Wednesday, 10 February 2027',
    time: '4:00 pm onwards',
    venue: 'The Courtyard, Placeholder Palace',
    address: 'Lake Road, Udaipur, Rajasthan 313001',
    map: '',
    dress: 'Garden florals',
    line: 'Henna, drawn on the bride’s hands and feet, and on anyone else who sits still long enough.',
    photo: 'mehndi',
  },
  {
    key: 'haldi',
    name: 'Haldi',
    devanagariKey: 'haldi',
    side: 'bride',
    date: 'Thursday, 11 February 2027',
    time: '11:00 am',
    venue: 'The Lawns, Placeholder Palace',
    address: 'Lake Road, Udaipur, Rajasthan 313001',
    map: '',
    dress: 'Yellow, and clothes you do not love',
    line: 'Turmeric, on both of them, at both houses. Nobody leaves clean.',
    photo: 'haldi',
  },
  {
    key: 'sangeet',
    name: 'Sangeet',
    devanagariKey: 'sangeet',
    side: 'groom',
    date: 'Thursday, 11 February 2027',
    time: '8:00 pm',
    venue: 'Durbar Hall, Placeholder Palace',
    address: 'Lake Road, Udaipur, Rajasthan 313001',
    map: '',
    dress: 'Indian formal',
    line: 'Both families, one stage, and a running order nobody will keep to.',
    photo: 'sangeet',
  },
  {
    key: 'baraat',
    name: 'Baraat',
    devanagariKey: 'baraat',
    side: 'groom',
    date: 'Friday, 12 February 2027',
    time: '5:30 pm',
    venue: 'Assembling at the East Gate',
    address: 'Lake Road, Udaipur, Rajasthan 313001',
    map: '',
    note: 'Please arrive by 5:00 pm — the procession will not wait.',
    line: 'The groom’s procession, on the move, loudly, the whole way.',
    photo: 'baraat',
  },
  {
    key: 'vivah',
    name: 'Vivah',
    devanagariKey: 'vivah',
    side: 'both',
    date: 'Friday, 12 February 2027',
    time: '7:42 pm, the muhurat',
    venue: 'The Mandap, Water Garden',
    address: 'Lake Road, Udaipur, Rajasthan 313001',
    map: '',
    dress: 'Indian traditional',
    line: 'The fire, the seven steps, and the knot. Everything else is around this.',
    photo: 'vivah',
  },
  {
    key: 'vidaai',
    name: 'Vidaai',
    devanagariKey: 'vidaai',
    side: 'bride',
    date: 'Saturday, 13 February 2027',
    time: 'At first light',
    venue: 'The North Court',
    address: 'Lake Road, Udaipur, Rajasthan 313001',
    line: 'The bride leaves her parents’ house. It is the quietest hour of the week.',
    photo: 'vidaai',
  },
]

/**
 * The muhurat, as a real instant.
 *
 * The countdown is arithmetic, so this has to be a machine-readable date with an
 * explicit offset — `+05:30`, always, even though the wedding is in India and so
 * is most of the guest list. Without the offset the string is parsed in the
 * *reader's* timezone, and a cousin opening this in Dubai or Toronto is shown a
 * countdown to the wrong moment with total confidence.
 */
export const muhurat = {
  iso: '2027-02-12T19:42:00+05:30', // «PLACEHOLDER»
  label: 'until the muhurat',
  /** Read aloud instead of the ticking numerals, which no screen reader wants. */
  spoken: 'The muhurat falls at 7:42 in the evening on Friday, 12 February 2027.', // «PLACEHOLDER»
  passed: 'The muhurat has passed. Thank you for being there.',
}

/* ──────────────────────────────────────────────────────── the households ───── */

/**
 * Blessings. Grandparents first, then parents, both sides.
 *
 * Get the honorifics and the spellings from the families themselves and paste
 * them in exactly. This is the single most-read paragraph on any Indian wedding
 * invitation and the one place where being approximately right is worse than
 * being absent.
 */
export const blessings = {
  eyebrow: 'With the blessings of',
  devanagariKey: 'aashirvad',
  sides: [
    {
      household: 'The bride’s family', // «PLACEHOLDER» — all of it
      grandparents: ['Late Shri Placeholder Sharma & Smt. Placeholder Sharma'],
      parents: 'Shri Placeholder Sharma & Smt. Placeholder Sharma',
    },
    {
      household: 'The groom’s family',
      grandparents: ['Shri Placeholder Verma & Late Smt. Placeholder Verma'],
      parents: 'Shri Placeholder Verma & Smt. Placeholder Verma',
    },
  ],
}

/* ───────────────────────────────────────────────────────────── the story ───── */

export const story = {
  eyebrow: 'Our story',
  /** Paragraphs. Rough notes are fine — they get drafted, then corrected. */
  paragraphs: [
    'We met in a way that seemed unremarkable at the time and does not seem unremarkable now. «PLACEHOLDER»', // «PLACEHOLDER»
    'What followed took several years, two cities and a great deal of patience from both families. «PLACEHOLDER»',
    'We would like you there for the part that comes next. «PLACEHOLDER»',
  ],
}

export const portraits = {
  eyebrow: 'Meet the two of them',
  bride: {
    heading: 'The bride',
    bio: 'A paragraph about Niharika, in her own words rather than her family’s. «PLACEHOLDER»', // «PLACEHOLDER»
    photo: 'bride',
  },
  groom: {
    heading: 'The groom',
    bio: 'A paragraph about Mahipal, same. «PLACEHOLDER»', // «PLACEHOLDER»
    photo: 'groom',
  },
}

export const gallery = {
  eyebrow: 'The years before this',
  /** Everything named gallery-* in assets/photos, in filename order. */
  empty: 'Photographs go in assets/photos as gallery-01, gallery-02, and so on.',
}

/* ─────────────────────────────────────────────────────────────── replies ───── */

export const rsvp = {
  headline: 'Kindly respond',
  line: 'We would be grateful to know by the fifteenth of January.', // «PLACEHOLDER»
  /**
   * Static export — there is no server, so the reply has to leave the site
   * entirely. WhatsApp is not a fallback here, it is the *right* channel: this
   * invitation reaches people by being forwarded in a family group, and asking
   * someone to fill in a web form when they are already in the app that
   * delivered it is friction for its own sake.
   *
   * Country code, no `+`, no spaces. wa.me rejects anything else.
   */
  whatsapp: '910000000000', // «PLACEHOLDER»
  /** Pre-filled, so the reply arrives already legible. */
  message: 'Namaste! This is —, and we will be coming to the wedding.',
  cta: 'RSVP on WhatsApp',
  contacts: [
    { name: 'Placeholder Sharma', role: 'for the bride', tel: '+91 00000 00000' }, // «PLACEHOLDER»
    { name: 'Placeholder Verma', role: 'for the groom', tel: '+91 00000 00000' }, // «PLACEHOLDER»
  ],
}

/** The wa.me deep link. Opens the app on a phone and web on a desktop. */
export function whatsappHref(): string {
  return `https://wa.me/${rsvp.whatsapp}?text=${encodeURIComponent(rsvp.message)}`
}

export const social = {
  hashtag: '#PlaceholderWedsPlaceholder', // «PLACEHOLDER»
  line: 'Tag anything you take. We would rather have your photographs than the ones we paid for.',
  handles: [
    { label: 'Niharika', handle: 'placeholder' }, // «PLACEHOLDER»
    { label: 'Mahipal', handle: 'placeholder' }, // «PLACEHOLDER»
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
