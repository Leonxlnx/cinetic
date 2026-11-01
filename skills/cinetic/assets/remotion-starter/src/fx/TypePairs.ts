/**
 * Type pairings: the film's premium type, dealt per film. A pairing is a VOICE (the film's words: statements, the
 * claim, numerals at size, the wordmark; FONT.text) and a TEXT face (product UI, captions, the tagline; FONT.ui), plus
 * the mono for code. Every face is open-licence (SIL OFL 1.1) and ships with the starter (public/fonts, licences in
 * public/fonts/fonts.json and each folder's OFL.txt), so nothing is fetched at render time and a dealt pairing works
 * on the first render. src/brand/fonts.ts registers them; scripts/type-deal.mjs writes a film's pairing into
 * src/brand/tokens.ts (FONT, FACES and the TYPE roles at the pairing's weights and tracking).
 *
 * Why pairings: one neutral grotesk on every film reads as the default. Each pairing below is a complete setting
 * (weights per role, tracking that tightens with size, line height per size, figures, the wordmark's weight), so
 * an agent never sets type by guesswork. The deal is random over the whole table (seeded by the film's name, so the
 * same name deals the same pairing); a mood only weights it, and the films made just before can be avoided, so two
 * films in a row never share a voice.
 *
 *   id          voice (FONT.text)                    text (FONT.ui)   character
 *   swiss       Instrument Sans                     Inter            crisp Swiss editorial grotesk, exact and quiet
 *   newsroom    Schibsted Grotesk                   Inter            a sturdy newsroom grotesk: firm verticals, open counters
 *   studio      Host Grotesk                        Host Grotesk     contemporary studio grotesk with soft terminals
 *   funnel      Funnel Display                      Funnel Sans      a display grotesk with cut details, its own text cut
 *   wide        Mona Sans Wide (wdth 112.5)         Mona Sans        an expanded voice over a normal-width text cut
 *   precise     Hanken Grotesk                      Inter            a neat neo-grotesk, light on its feet
 *   technical   Geist                               Geist            developer type, with Geist Mono
 *   geometric   DM Sans (optical sizes)             DM Sans          round, open, friendly-precise
 *   friendly    Manrope                             Manrope          warm, open, semi-geometric
 *   expressive  Bricolage Grotesque (optical sizes) Inter            ink traps and character at display sizes
 *   product     Inter Display (optical sizes)       Inter            the neutral SF-class product type
 *
 * Numbers are px at 1080p and em. Tracking is optical: a pairing gives it at anchor sizes (40, 84, 160, 400 px) and
 * trackAt() interpolates on log size, so big type tightens and small type opens, the way a type designer spaces a
 * display cut. Pure and import-free (a deal file read in Node may import it): no DOM except inkGaps(), which needs a
 * canvas and returns null without one.
 */

export type FaceId =
  | 'inter'
  | 'instrument-sans'
  | 'schibsted-grotesk'
  | 'host-grotesk'
  | 'funnel-display'
  | 'funnel-sans'
  | 'mona-sans'
  | 'mona-sans-wide'
  | 'hanken-grotesk'
  | 'geist'
  | 'dm-sans'
  | 'manrope'
  | 'bricolage-grotesque'
  | 'geist-mono';

export type BundledFace = {
  family: string; // the CSS family name src/brand/fonts.ts registers (or the npm package declares)
  dir?: string; // public/fonts/<dir>/ (bundled); absent: an npm package imported by fonts.ts (Inter, Geist Mono)
  axis?: 'wght' | 'standard' | 'opsz'; // which variable file: the subset files are <dir>-<subset>-<axis>-normal.woff2
  weight: [number, number];
  stretch?: [number, number] | number; // % (a single value fixes the width axis: the wide cut)
  optical?: boolean; // an opsz axis: font-optical-sizing auto picks the cut from the size
  mono?: boolean;
  tabPunct?: boolean; // its tabular figures give punctuation a figure's width too ("1 , 284"): figures set proportional
};

/** The faces the pairings use. `mona-sans-wide` is Mona Sans registered at a fixed 112.5 % width (one file, two families). */
export const FACE_SET: Record<FaceId, BundledFace> = {
  inter: { family: 'Inter Variable', weight: [100, 900], optical: true },
  'instrument-sans': { family: 'Instrument Sans Variable', dir: 'instrument-sans', axis: 'standard', weight: [400, 700], stretch: [75, 100] },
  'schibsted-grotesk': { family: 'Schibsted Grotesk Variable', dir: 'schibsted-grotesk', axis: 'wght', weight: [400, 900], tabPunct: true },
  'host-grotesk': { family: 'Host Grotesk Variable', dir: 'host-grotesk', axis: 'wght', weight: [300, 800] },
  'funnel-display': { family: 'Funnel Display Variable', dir: 'funnel-display', axis: 'wght', weight: [300, 800] },
  'funnel-sans': { family: 'Funnel Sans Variable', dir: 'funnel-sans', axis: 'wght', weight: [300, 800] },
  'mona-sans': { family: 'Mona Sans Variable', dir: 'mona-sans', axis: 'standard', weight: [200, 900], stretch: [75, 125] },
  'mona-sans-wide': { family: 'Mona Sans Wide Variable', dir: 'mona-sans', axis: 'standard', weight: [200, 900], stretch: 112.5 },
  'hanken-grotesk': { family: 'Hanken Grotesk Variable', dir: 'hanken-grotesk', axis: 'wght', weight: [100, 900] },
  geist: { family: 'Geist Variable', dir: 'geist', axis: 'wght', weight: [100, 900] },
  'dm-sans': { family: 'DM Sans Variable', dir: 'dm-sans', axis: 'opsz', weight: [100, 1000], optical: true },
  manrope: { family: 'Manrope Variable', dir: 'manrope', axis: 'wght', weight: [200, 800] },
  'bricolage-grotesque': { family: 'Bricolage Grotesque Variable', dir: 'bricolage-grotesque', axis: 'standard', weight: [200, 800], stretch: [75, 100], optical: true },
  'geist-mono': { family: 'Geist Mono Variable', weight: [100, 900], mono: true },
};

/** The unicode ranges of the two bundled subsets (the same for every face: fontsource's latin and latin-ext). */
export const SUBSETS = {
  'latin-ext':
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
} as const;

/** The @font-face rules for every bundled face, with `url(file)` mapped by `urlOf` (fonts.ts passes staticFile). */
export const fontFaceCss = (urlOf: (path: string) => string) =>
  (Object.values(FACE_SET) as BundledFace[])
    .filter((f) => f.dir && f.axis)
    .flatMap((f) =>
      (Object.keys(SUBSETS) as (keyof typeof SUBSETS)[]).map((sub) => {
        const st = f.stretch === undefined ? '' : `  font-stretch: ${Array.isArray(f.stretch) ? `${f.stretch[0]}% ${f.stretch[1]}%` : `${f.stretch}%`};\n`;
        return `@font-face {\n  font-family: '${f.family}';\n  font-style: normal;\n  font-display: block;\n  font-weight: ${f.weight[0]} ${f.weight[1]};\n${st}  src: url(${urlOf(`fonts/${f.dir}/${f.dir}-${sub}-${f.axis}-normal.woff2`)}) format('woff2-variations');\n  unicode-range: ${SUBSETS[sub]};\n}`;
      }),
    )
    .join('\n');

// ------------------------------------------------------------------------------------------------ the pairings

export type PairId = 'swiss' | 'newsroom' | 'studio' | 'funnel' | 'wide' | 'precise' | 'technical' | 'geometric' | 'friendly' | 'expressive' | 'product';
export type Mood = 'calm' | 'technical' | 'friendly' | 'editorial' | 'bold' | 'consumer' | 'finance' | 'creative' | 'ai';
export type RoleName = 'ui' | 'caption' | 'line' | 'display' | 'hero' | 'giant';
export type TypeFamilyName = 'calm' | 'bold';
/** Tracking (em) at 40, 84, 160 and 400 px. */
export type TrackAnchors = readonly [number, number, number, number];

export type Pair = {
  id: PairId;
  name: string;
  voice: FaceId;
  text: FaceId;
  mono: FaceId;
  /** voice weights per type family: the sentence line, statements (display), the hero and the giant word */
  weights: Record<TypeFamilyName, { line: number; display: number; hero: number; giant: number }>;
  /** text-face weights (UI strings and captions) per type family */
  textWeight: Record<TypeFamilyName, number>;
  /** the wordmark (the end card's name) and the emphasis weight (a key word set heavier) */
  wordmark: number;
  emphasis: number;
  /** voice tracking per type family at 40 / 84 / 160 / 400 px */
  track: Record<TypeFamilyName, TrackAnchors>;
  /** text-face tracking at UI sizes (40 px) and caption sizes (46 px) */
  textTrack: [ui: number, caption: number];
  /** line height multipliers over TYPE's leads (a wide voice wants a little more air, a tight one less) */
  leadK?: number;
  /** figures: OpenType features the voice sets numerals with (always tabular lining for counters) */
  figures?: string;
  moods: readonly Mood[];
  about: string;
};

export const PAIRS: Record<PairId, Pair> = {
  swiss: {
    id: 'swiss', name: 'Swiss editorial', voice: 'instrument-sans', text: 'inter', mono: 'geist-mono',
    weights: { calm: { line: 460, display: 500, hero: 520, giant: 540 }, bold: { line: 580, display: 600, hero: 620, giant: 620 } },
    textWeight: { calm: 450, bold: 500 }, wordmark: 620, emphasis: 640,
    track: { calm: [0.005, -0.008, -0.018, -0.026], bold: [-0.006, -0.022, -0.032, -0.04] }, textTrack: [0.01, 0.008],
    moods: ['calm', 'editorial', 'finance', 'creative'], about: 'crisp, exact, a little narrow: premium editorial product type',
  },
  newsroom: {
    id: 'newsroom', name: 'Newsroom grotesk', voice: 'schibsted-grotesk', text: 'inter', mono: 'geist-mono',
    weights: { calm: { line: 450, display: 500, hero: 520, giant: 540 }, bold: { line: 600, display: 640, hero: 660, giant: 680 } },
    textWeight: { calm: 450, bold: 500 }, wordmark: 680, emphasis: 650,
    track: { calm: [0.0, -0.012, -0.022, -0.03], bold: [-0.01, -0.026, -0.036, -0.045] }, textTrack: [0.01, 0.008],
    moods: ['editorial', 'bold', 'finance', 'consumer'], about: 'firm verticals and open counters: confident, newsworthy',
  },
  studio: {
    id: 'studio', name: 'Studio grotesk', voice: 'host-grotesk', text: 'host-grotesk', mono: 'geist-mono',
    weights: { calm: { line: 440, display: 480, hero: 500, giant: 520 }, bold: { line: 580, display: 620, hero: 640, giant: 640 } },
    textWeight: { calm: 440, bold: 500 }, wordmark: 640, emphasis: 640,
    track: { calm: [0.006, -0.008, -0.02, -0.03], bold: [-0.006, -0.024, -0.034, -0.042] }, textTrack: [0.012, 0.01],
    moods: ['creative', 'consumer', 'calm', 'ai'], about: 'contemporary, soft terminals: a design studio voice',
  },
  funnel: {
    id: 'funnel', name: 'Funnel display', voice: 'funnel-display', text: 'funnel-sans', mono: 'geist-mono',
    weights: { calm: { line: 450, display: 500, hero: 520, giant: 540 }, bold: { line: 600, display: 640, hero: 660, giant: 680 } },
    textWeight: { calm: 430, bold: 480 }, wordmark: 680, emphasis: 660,
    track: { calm: [0.004, -0.01, -0.022, -0.032], bold: [-0.008, -0.026, -0.036, -0.046] }, textTrack: [0.012, 0.01],
    moods: ['bold', 'creative', 'ai', 'technical'], about: 'a display grotesk with cut details over its own text cut',
  },
  wide: {
    id: 'wide', name: 'Wide voice', voice: 'mona-sans-wide', text: 'mona-sans', mono: 'geist-mono',
    weights: { calm: { line: 460, display: 520, hero: 540, giant: 560 }, bold: { line: 600, display: 660, hero: 680, giant: 700 } },
    textWeight: { calm: 450, bold: 500 }, wordmark: 700, emphasis: 680, leadK: 1.04,
    track: { calm: [0.0, -0.014, -0.026, -0.036], bold: [-0.012, -0.03, -0.04, -0.05] }, textTrack: [0.01, 0.006],
    moods: ['bold', 'technical', 'ai', 'finance'], about: 'an expanded, confident voice over a normal-width text cut',
  },
  precise: {
    id: 'precise', name: 'Precise grotesk', voice: 'hanken-grotesk', text: 'inter', mono: 'geist-mono',
    weights: { calm: { line: 460, display: 520, hero: 540, giant: 560 }, bold: { line: 600, display: 640, hero: 660, giant: 680 } },
    textWeight: { calm: 450, bold: 500 }, wordmark: 680, emphasis: 660,
    track: { calm: [0.004, -0.01, -0.022, -0.03], bold: [-0.008, -0.024, -0.034, -0.044] }, textTrack: [0.01, 0.008],
    moods: ['calm', 'finance', 'consumer', 'editorial'], about: 'a neat neo-grotesk, light on its feet',
  },
  technical: {
    id: 'technical', name: 'Technical', voice: 'geist', text: 'geist', mono: 'geist-mono',
    weights: { calm: { line: 450, display: 500, hero: 520, giant: 540 }, bold: { line: 580, display: 620, hero: 640, giant: 660 } },
    textWeight: { calm: 440, bold: 480 }, wordmark: 640, emphasis: 640,
    track: { calm: [-0.005, -0.018, -0.028, -0.036], bold: [-0.016, -0.034, -0.044, -0.052] }, textTrack: [0.0, -0.004],
    moods: ['technical', 'ai'], about: 'developer type: a crisp grotesk with its mono',
  },
  geometric: {
    id: 'geometric', name: 'Soft geometric', voice: 'dm-sans', text: 'dm-sans', mono: 'geist-mono',
    weights: { calm: { line: 460, display: 500, hero: 520, giant: 540 }, bold: { line: 600, display: 640, hero: 660, giant: 680 } },
    textWeight: { calm: 450, bold: 500 }, wordmark: 660, emphasis: 660,
    track: { calm: [0.0, -0.01, -0.02, -0.028], bold: [-0.01, -0.026, -0.036, -0.044] }, textTrack: [0.006, 0.004],
    moods: ['consumer', 'friendly', 'ai', 'calm'], about: 'round, open, friendly-precise product type',
  },
  friendly: {
    id: 'friendly', name: 'Friendly open', voice: 'manrope', text: 'manrope', mono: 'geist-mono',
    weights: { calm: { line: 540, display: 580, hero: 600, giant: 620 }, bold: { line: 660, display: 700, hero: 720, giant: 740 } },
    textWeight: { calm: 520, bold: 560 }, wordmark: 740, emphasis: 740,
    track: { calm: [-0.002, -0.014, -0.024, -0.032], bold: [-0.012, -0.028, -0.038, -0.046] }, textTrack: [0.004, 0.0],
    moods: ['friendly', 'consumer', 'calm'], about: 'warm, open, semi-geometric (runs light: weights a step up)',
  },
  expressive: {
    id: 'expressive', name: 'Expressive display', voice: 'bricolage-grotesque', text: 'inter', mono: 'geist-mono',
    weights: { calm: { line: 480, display: 540, hero: 560, giant: 580 }, bold: { line: 620, display: 660, hero: 680, giant: 700 } },
    textWeight: { calm: 450, bold: 500 }, wordmark: 700, emphasis: 700, leadK: 0.98,
    track: { calm: [-0.004, -0.016, -0.028, -0.038], bold: [-0.014, -0.032, -0.042, -0.052] }, textTrack: [0.01, 0.008],
    moods: ['creative', 'consumer', 'bold'], about: 'ink traps and character at display sizes, quiet text below',
  },
  product: {
    id: 'product', name: 'Neutral product', voice: 'inter', text: 'inter', mono: 'geist-mono',
    weights: { calm: { line: 450, display: 500, hero: 500, giant: 500 }, bold: { line: 600, display: 600, hero: 600, giant: 600 } },
    textWeight: { calm: 450, bold: 500 }, wordmark: 620, emphasis: 650,
    track: { calm: [0.01, 0.0, -0.01, -0.012], bold: [-0.01, -0.03, -0.035, -0.045] }, textTrack: [0.01, 0.01],
    moods: ['calm', 'technical', 'finance'], about: 'the quiet SF-class grotesk of product type (the neutral fallback)',
  },
};

export const PAIR_IDS = Object.keys(PAIRS) as PairId[];

// ------------------------------------------------------------------------------------------------ the deal

const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const mulberry = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * A film's pairing from its seed (the product's name): a weighted random pick over the whole table, a pairing that
 * suits `mood` three times as likely, `avoid` (the pairings of the films made just before) left out, `product` (the
 * neutral fallback) a third as likely as the rest. Pure: the same seed and options, the same pairing.
 */
export const dealPair = (seed: string | number, o: { mood?: Mood; avoid?: readonly PairId[] } = {}): PairId => {
  const rnd = mulberry(hashStr(`type|${seed}`));
  const pool = PAIR_IDS.filter((id) => !o.avoid?.includes(id));
  const ids = pool.length ? pool : PAIR_IDS;
  const w = ids.map((id) => (id === 'product' ? 1 / 3 : 1) * (o.mood && PAIRS[id].moods.includes(o.mood) ? 3 : 1));
  let r = rnd() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ids.length; i++) if ((r -= w[i]) <= 0) return ids[i];
  return ids[ids.length - 1];
};

// ------------------------------------------------------------------------------------------------ setting

const ANCHORS = [40, 84, 160, 400] as const;
/** Optical tracking (em) at `px` for a set of anchors: interpolated on log size, held flat past the end anchors. */
export const trackAt = (anchors: TrackAnchors, px: number) => {
  const x = Math.log(Math.max(1, px));
  const xs = ANCHORS.map((a) => Math.log(a));
  if (x <= xs[0]) return anchors[0];
  if (x >= xs[3]) return anchors[3];
  for (let i = 0; i < 3; i++)
    if (x <= xs[i + 1]) {
      const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
      return Math.round((anchors[i] + (anchors[i + 1] - anchors[i]) * t) * 10000) / 10000;
    }
  return anchors[3];
};

/** Line height by size: 1.3 at UI sizes, 1.2 at a sentence line, 1.05 at statements, 0.92 at poster sizes (log size). */
export const leadAt = (px: number, k = 1) => {
  const pts: [number, number][] = [[40, 1.3], [84, 1.2], [160, 1.05], [400, 0.92]];
  const x = Math.log(Math.max(1, px));
  let v = pts[pts.length - 1][1];
  if (x <= Math.log(pts[0][0])) v = pts[0][1];
  else
    for (let i = 0; i < pts.length - 1; i++) {
      const a = Math.log(pts[i][0]);
      const b = Math.log(pts[i + 1][0]);
      if (x <= b) {
        v = pts[i][1] + ((pts[i + 1][1] - pts[i][1]) * (x - a)) / (b - a);
        break;
      }
    }
  return Math.round(v * k * 1000) / 1000;
};

const VOICE_ROLES: readonly RoleName[] = ['line', 'display', 'hero', 'giant'];
/** Whether a role is set in the voice (statements) or the text face (UI, captions). */
export const isVoiceRole = (role: RoleName) => VOICE_ROLES.includes(role);

export type RoleSetting = { face: FaceId; family: string; weight: number; track: number; lead: number };

/**
 * One role of a pairing at a size (px at 1080p): which face, its weight inside the face's axis, the optical tracking
 * at that size and the line height. The house sizes are TYPE's (calm line 84, display 160, hero 200, giant 640; bold
 * line 120, display 200, hero 240, giant 900; ui 40, caption 46).
 */
export const roleSetting = (pairId: PairId, role: RoleName, px: number, family: TypeFamilyName = 'calm'): RoleSetting => {
  const p = PAIRS[pairId];
  const voice = isVoiceRole(role);
  const face = voice ? p.voice : p.text;
  const f = FACE_SET[face];
  const raw = voice ? p.weights[family][role as 'line' | 'display' | 'hero' | 'giant'] : p.textWeight[family];
  const weight = Math.min(f.weight[1], Math.max(f.weight[0], raw));
  const track = voice ? trackAt(p.track[family], px) : role === 'ui' ? p.textTrack[0] : p.textTrack[1];
  return { face, family: f.family, weight, track, lead: leadAt(px, voice ? p.leadK ?? 1 : 1) };
};

/** A CSS stack for a face (the registered family first, then the system's sans or mono). */
export const stackOf = (face: FaceId) => (FACE_SET[face].mono ? `"${FACE_SET[face].family}", ui-monospace, monospace` : `"${FACE_SET[face].family}", system-ui, sans-serif`);

/** The OpenType setting every film line takes: kerning on, standard and contextual ligatures, no synthetic styles. */
export const TYPE_FEATURES = { fontKerning: 'normal', fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1', fontSynthesis: 'none', fontOpticalSizing: 'auto', textRendering: 'geometricPrecision' } as const;

/** A role of a pairing as CSS (a plain object: spread it into a style). */
export const pairStyle = (pairId: PairId, role: RoleName, px: number, family: TypeFamilyName = 'calm') => {
  const s = roleSetting(pairId, role, px, family);
  return { fontFamily: stackOf(s.face), fontSize: px, fontWeight: s.weight, letterSpacing: `${s.track}em`, lineHeight: s.lead, whiteSpace: 'pre' as const, ...TYPE_FEATURES };
};

/**
 * Figures. `count`: anything that counts, changes or aligns: tabular lining figures (no jitter in width), the voice's
 * own tracking at that size; a static hero number (`count` false) takes proportional lining figures and 0.01 em
 * tighter, so a 1 never leaves a gap. `zero`: slashed zero (codes, IDs).
 */
export const numeralStyle = (pairId: PairId, px: number, o: { count?: boolean; zero?: boolean; family?: TypeFamilyName; weight?: number } = {}) => {
  const fam = o.family ?? 'calm';
  const s = roleSetting(pairId, px >= 140 ? 'display' : 'line', px, fam);
  const count = o.count ?? true;
  const tab = count && !FACE_SET[s.face].tabPunct; // a face whose tabular set spaces the comma like a figure counts in fx/Roll's per-digit slots instead
  return {
    fontFamily: stackOf(s.face),
    fontSize: px,
    fontWeight: o.weight ?? s.weight,
    letterSpacing: `${Math.round((s.track - (count ? 0 : 0.01)) * 10000) / 10000}em`,
    lineHeight: 1,
    whiteSpace: 'pre' as const,
    fontVariantNumeric: `${tab ? 'tabular-nums' : 'proportional-nums'} lining-nums${o.zero ? ' slashed-zero' : ''}`,
    ...TYPE_FEATURES,
  };
};

/** The wordmark (the end card's name, a product name set as a mark): the voice at the wordmark weight, tracked for its size. */
export const wordmarkStyle = (pairId: PairId, px: number, family: TypeFamilyName = 'calm') => {
  const p = PAIRS[pairId];
  const f = FACE_SET[p.voice];
  const weight = Math.min(f.weight[1], Math.max(f.weight[0], p.wordmark));
  // a heavier cut sets denser: a wordmark tracks 0.004 em looser than a statement at the same size
  const track = Math.round((trackAt(p.track[family], px) + 0.004) * 10000) / 10000;
  return { fontFamily: stackOf(p.voice), fontSize: px, fontWeight: weight, letterSpacing: `${track}em`, lineHeight: 1, whiteSpace: 'pre' as const, ...TYPE_FEATURES };
};

// ------------------------------------------------------------------------------------------------ no touching letters

/** Pairs whose boxes overlap by design (overhangs that kerning tucks in): left out of the touch test. */
const OVERHANG = /[TVWYFPLAfrjyvwk7'"’‘“”.,]/;
/** The smallest clear gap (em) between the ink of two neighbouring letters in a wordmark or a figure run. */
export const MIN_INK_GAP = 0.012;
/**
 * An r before a letter that starts on a stem (n, m, r, u, i, l, h, b, k, p): the arm of the r reaching for the stem reads
 * as one letter ("rn" as "m": "Cairnly" seen as "Caimly"), so that pair keeps a wider clear gap (em). The r's overhang
 * is tucked in by kerning before round letters (ro, re, ra) and stays out of the touch test there.
 */
export const RN_GAP = 0.04;
const rStem = (pair: string) => /^r[nmruilhbkp]$/.test(pair);

/**
 * The ink gaps (em) between neighbouring letters of `text` set at `px` in `font` (a CSS font shorthand without the
 * size: '700 "Mona Sans Wide Variable"') with `trackEm`, measured on a canvas from each glyph's ink box and the
 * kerned advance. Pairs with an overhang letter (T, V, W, Y, f, r, 7, quotes...) are skipped (their boxes overlap by
 * design). Browser only: null without a canvas.
 */
export const inkGaps = (text: string, font: string, px: number, trackEm = 0): { pair: string; gap: number }[] | null => {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const m = /^(\d+)\s+(.+)$/.exec(font.trim());
  ctx.font = m ? `${m[1]} ${px}px ${m[2]}` : `${px}px ${font}`;
  const out: { pair: string; gap: number }[] = [];
  const chars = [...text];
  for (let i = 0; i < chars.length - 1; i++) {
    const a = chars[i];
    const b = chars[i + 1];
    if (/\s/.test(a) || /\s/.test(b) || ((OVERHANG.test(a) || OVERHANG.test(b)) && !rStem(a + b))) continue;
    const adv = ctx.measureText(a + b).width - ctx.measureText(b).width; // a's kerned advance
    const gap = adv + trackEm * px - ctx.measureText(a).actualBoundingBoxRight - ctx.measureText(b).actualBoundingBoxLeft;
    out.push({ pair: a + b, gap: Math.round((gap / px) * 10000) / 10000 });
  }
  return out;
};

/**
 * The tracking (em) at which no two letters of `text` touch: `trackEm` when every measured gap is MIN_INK_GAP or
 * more, else loosened just enough. A wordmark and a figure run at display sizes, tracked tight, are where letters
 * collide ("Morrow3.2", "11" closing up): set them through this. Returns `trackEm` without a canvas.
 */
export const safeTrack = (text: string, font: string, px: number, trackEm: number, minGap = MIN_INK_GAP) => {
  const g = inkGaps(text, font, px, trackEm);
  if (!g || !g.length) return trackEm;
  // the most any pair falls short of its clear gap (an r before a stem needs RN_GAP)
  const short = Math.max(...g.map((x) => (rStem(x.pair) ? Math.max(minGap, RN_GAP) : minGap) - x.gap));
  return short <= 0 ? trackEm : Math.round((trackEm + short) * 10000) / 10000;
};
