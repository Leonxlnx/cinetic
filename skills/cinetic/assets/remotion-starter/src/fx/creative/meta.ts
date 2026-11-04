// The creative elements, as data (no React: the timeline, the deal and scripts/deck.py read this file). Each entry is
// one finished device in fx/creative/ (the component and its recipe live there; index.ts joins them). A film is dealt
// two or three of them at random (scripts/deck.py writes src/dealt.ts; a template without one deals from the name),
// never the set of the last films, and each takes a whole beat: a line device draws the line's beat, a picture device
// draws the picture's beat with the product's scene inside it. Keep each entry on one line: deck.py reads them.
//
//   role     line: draws a line (its words and their entrance); picture: draws a picture beat around the product's scene
//   family   what kind of idea it is (a deal never takes two of one family)
//   needs    what the script must give it: swap (2-3 alternatives for the key word), logos (the products it works with,
//            official marks), count (a real figure), before (the old way: 2-4 steps; bubble-swarm takes 4-7 pings or
//            questions), photos (pictures worth showing: photo-arc streams them, 5 or more)
//   prefer   where it says the most: first (the opening picture or line), middle, proof (a later picture), any
//   ends     picture: 'scene' when its last frame is the product's scene at rest (it may play the film's last picture)
//   handover line: its last frame is the picture's first (it carries the line into the picture; no seam between them)
//   tail     line: f@60 it plays after its words start to leave (its transformation into the picture)
//   min      picture: seconds it needs at least
//   colour   it is the film's one colour event (the claim's colour field then stays off)

export type CreativeRole = 'line' | 'picture';
export type CreativeNeed = 'swap' | 'logos' | 'count' | 'before' | 'photos';
export type CreativeMeta = {
  id: string; role: CreativeRole; family: string; needs: readonly CreativeNeed[]; prefer: 'first' | 'middle' | 'proof' | 'any';
  ends?: 'scene' | 'self'; handover?: boolean; tail?: number; min?: number; colour?: boolean; about: string;
};

export const CREATIVE_META = [
  { id: 'word-swap', role: 'line', family: 'type-swap', needs: ['swap'], prefer: 'first', tail: 0, about: 'one word of the line rolls through two or three alternatives in place and lands on the real one' },
  { id: 'scale-contrast', role: 'line', family: 'type-scale', needs: [], prefer: 'middle', tail: 0, about: 'the key word huge, the rest of the line small above and under it' },
  { id: 'type-window', role: 'line', family: 'type-image', needs: [], prefer: 'any', handover: true, tail: 68, about: 'the key word grows to fill the frame, its letters windows onto the product, then opens into it' },
  { id: 'type-object', role: 'line', family: 'type-object', needs: [], prefer: 'middle', handover: true, tail: 64, about: 'the key word grows a pill round it that becomes the product\'s frame and opens into the picture' },
  { id: 'letter-swing', role: 'line', family: 'type-swing', needs: [], prefer: 'any', tail: 0, about: 'the line builds and its key word\'s letters swing up into place on an arc one after another, landing upright in the accent' },
  { id: 'split-around', role: 'line', family: 'type-split', needs: [], prefer: 'middle', handover: true, tail: 28, about: 'the line parts at its key word, the product grows in the gap, then opens to the frame' },
  { id: 'pixel-assemble', role: 'picture', family: 'system', needs: [], prefer: 'first', ends: 'scene', min: 1.8, about: 'a grid of tiles assembles the product from its focus point outward' },
  { id: 'shape-morph', role: 'picture', family: 'shape', needs: [], prefer: 'first', ends: 'scene', min: 2.0, about: 'a dot morphs through a pill and a square into the product\'s frame, which opens' },
  { id: 'object-turn', role: 'picture', family: 'object', needs: [], prefer: 'any', ends: 'self', min: 1.6, about: 'the product enters edge-on and turns to face the camera on one move, landing still' },
  { id: 'logo-orbit', role: 'picture', family: 'logos', needs: ['logos'], prefer: 'proof', ends: 'scene', min: 2.2, about: 'the products it works with orbit on a ring, then collapse into the centre where the product grows' },
  { id: 'split-compare', role: 'picture', family: 'compare', needs: ['before'], prefer: 'middle', ends: 'scene', min: 2.4, about: 'the old way and the product side by side behind a divider, then the product takes the frame' },
  { id: 'data-sculpture', role: 'picture', family: 'data', needs: ['count'], prefer: 'proof', ends: 'self', min: 1.8, about: 'lit columns rise toward a figure that counts up and lands' },
  { id: 'colour-flood', role: 'picture', family: 'colour', needs: [], prefer: 'proof', ends: 'scene', min: 2.2, colour: true, about: 'the accent floods out of the element just pressed, a check draws on the colour, then it drains back' },
  { id: 'zoom-wall', role: 'picture', family: 'scale', needs: [], prefer: 'proof', ends: 'self', min: 2.0, about: 'the product turns out to be one tile in a wall of it at other moments, the camera pulling back' },
  { id: 'photo-arc', role: 'picture', family: 'river', needs: ['photos'], prefer: 'any', ends: 'scene', min: 2.2, about: 'the film\'s photos stream through in one level row, one way, and slow until the chosen one lands at the centre and opens to the frame' },
  { id: 'cursor-follow', role: 'picture', family: 'pointer', needs: [], prefer: 'middle', ends: 'scene', min: 2.2, about: 'close on the product, the camera rides a pointer to its button, it clicks on the hit and the camera pulls back to the whole product reacting' },
  { id: 'bubble-swarm', role: 'picture', family: 'swarm', needs: ['before'], prefer: 'first', ends: 'scene', min: 2.4, about: 'the old way\'s pings and questions pop up as bubbles round an empty centre, faster and faster, then the product arrives and draws them all in' },
  { id: 'dot-button', role: 'picture', family: 'point', needs: [], prefer: 'first', ends: 'scene', min: 1.8, about: 'a dot travels to the product\'s button, grows into it, is pressed, and the product irises open' },
] as const satisfies readonly CreativeMeta[];

export type CreativeId = (typeof CREATIVE_META)[number]['id'];
export const CREATIVE_IDS = CREATIVE_META.map((m) => m.id) as readonly CreativeId[];
/** One device's entry. */
export const metaOf = (id: string): CreativeMeta | undefined => (CREATIVE_META as readonly CreativeMeta[]).find((m) => m.id === id);

// ---- line devices: when the line is whole (f@60 from its first frame), the arithmetic of their components
/** The build every line device starts with: words 6 f apart, a 16 f fade, the row re-centring over 20 f. */
const build = (n: number) => 6 * Math.max(0, n - 1) + 20;
/** word-swap's rolls: 6 f after the build, then 20, 16, 13, 11 f apart, each 8 f, settling 6 f. */
const SWAP_GAPS = [20, 16, 13, 11];
/**
 * When a line drawn by device `id` is whole (f@60): n words, the key word's letters, `a` alternatives (word-swap).
 * Undefined for a device that does not draw lines.
 */
export const lineResolve = (id: string, n: number, keyChars = 6, a = 0): number | undefined => {
  switch (id) {
    case 'word-swap': {
      if (!a) return build(n);
      let x = build(n) + 6;
      for (let j = 0; j < a - 1; j++) x += SWAP_GAPS[Math.min(j, SWAP_GAPS.length - 1)];
      return x + 8 + 6;
    }
    case 'scale-contrast':
      return Math.max(3 * Math.max(0, keyChars - 1) + 26, 30);
    case 'type-window':
    case 'type-object':
    case 'split-around':
      return build(n);
    case 'letter-swing':
      // the key word's letters swing in after the last word lands (3 f apart, 32 f each)
      return Math.max(build(n), 6 * Math.max(0, n - 1) + 3 * Math.max(0, keyChars - 1) + 32);
    default:
      return undefined;
  }
};
