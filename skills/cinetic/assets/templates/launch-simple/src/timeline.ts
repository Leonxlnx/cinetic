// The single source of truth for time, for a launch assembled from the scene bank and played as a spine: the script
// (src/spine.ts: one sentence, one case, one element, 3-5 acts of 1-3 scenes) cast with house scenes (src/bank.ts: the
// ones the script names, the rest dealt by each act's verb), each scene at its own length (1.5-3 s: a point shown and
// understood), every change on the track's 8th and handed over by the element (HANDOVER_PLAN), the lines placed (alone
// on clean ground for the promise and the claim; the scenes carry the statements between), the lockup a house scene
// that holds to the body's last bar line. Everything here is derived from src/spine.ts, src/bank.ts, src/deal.ts and
// the music, so a new script, track or tempo needs no edit here. Picture (src/acts), sound (src/sync.ts ->
// out/cues.json) and the checks (scripts/grid-check.ts --part spine reads SPINE_PLAN) import this file. Keep it free of
// React and CSS imports (src/bank.ts mirrors the scenes' numbers for that): Node scripts load it directly.
import { holdFor, PACE, readingWindows, type PaceName } from './lib/pace';
import { bar, MUSIC } from './music';
import { allows, COL_OF, type Form, handoverFrames, HANDOVERS, handoversFor, type HandoverKind, planSpine, type PlanAct, type PlanChange, type PlanScene, type Spine, spineDeclares, type SpinePlan, stemVerb } from './lib/spine';
import { CLOSE, type FilmScene, PICTURES, SPINE } from './spine';
import { BANK, DEAL_RULES, DEAL_SEED, dealScene, durOf, FLOOR_CAST, type Ground, HISTORY, type Need, onScreen, SCENE_SEED } from './bank';
import { IDENTITY } from './brand/identity';
import { DEAL, UNNAMED } from './deal';

export { PACE } from './lib/pace'; // grid-check checks COPY against the film's own pace numbers
/** The film-time music grid (src/music.ts): null until track.py grid writes the track's; then b() follows its bars. */
export { MUSIC } from './music';
export { DEAL } from './deal';

export const FPS = 60;
/**
 * This film's own grid tempo, used while src/music.ts carries no track. new-film.sh --bpm rewrites the
 * `const BPM = ...;` line inside, so keep that line as it is.
 */
const GRID_BPM = ((): number => {
const BPM = 120;
  return BPM;
})();
/** The tempo every helper and check uses: the track's when src/music.ts carries one, else GRID_BPM. */
export const BPM = MUSIC?.bpm ?? GRID_BPM;
export const W = 1920;
export const H = 1080;
/** The launch tempo: one line at a time, said and gone. */
export const PACE_NAME: PaceName = 'crisp';
const pace = PACE[PACE_NAME];

/** Frames per beat (a whole number without a track: 60 fps -> 90, 100, 120, 144, 150 BPM). */
export const BEAT = (60 / BPM) * FPS;
export const BAR = BEAT * 4;
/** Absolute frame of a grid position: bar is 1-based, beat 0-3, sub = 16ths within the beat. */
export const b = (n: number, beat = 0, sub = 0) =>
  MUSIC ? Math.round(bar(n, beat, sub)) : Math.round(((n - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));
/** A choreography length written in 60 fps frames, converted to this film's fps (rounded). */
export const f60 = (frames: number, fps: number = FPS) => Math.round((frames * fps) / 60);
/** The fractional twin of f60, for durations inside a move. */
export const f60x = (frames: number, fps: number = FPS) => (frames * fps) / 60;

/**
 * After the last bar the picture holds while the music ends, never on a cut: at least 1 s, or the ending's own hold
 * (track.py grid writes it).
 */
/** The nearest 16th of the music's grid to frame f (cues that sound land on the track's own subdivision). */
export const q16 = (f: number): number => {
  const k = Math.max(1, Math.floor((f - b(1)) / BAR) + 1);
  let best = f;
  let d = Infinity;
  for (let n = Math.max(1, k - 1); n <= k + 1; n++)
    for (let beat = 0; beat < 4; beat++)
      for (let sub = 0; sub < 4; sub++) {
        const g = b(n, beat, sub);
        if (Math.abs(g - f) < d) [d, best] = [Math.abs(g - f), g];
      }
  return best;
};
export const TAIL = Math.max(FPS, MUSIC ? Math.ceil(MUSIC.end.hold ?? 0) : 0, MUSIC && MUSIC.end.hold === undefined ? Math.ceil(MUSIC.end.f) - b(MUSIC.bars + 1) + FPS : 0);

// ---------------------------------------------------------------------------------------------------- the spine

/** The words of a line with their key (a *starred* word). */
export const plain = (s: string) => s.replace(/\*/g, '');
export const keyWords = (s: string): { word: string; key: boolean }[] => {
  const out: { word: string; key: boolean }[] = [];
  let inKey = false;
  for (const raw of s.split(/\s+/).filter(Boolean)) {
    const opens = raw.startsWith('*');
    const closes = raw.replace(/[.,!?;:]+$/, '').endsWith('*');
    const key = inKey || opens;
    out.push({ word: raw.replace(/\*/g, ''), key });
    inKey = (inKey || opens) && !closes;
  }
  return out;
};

/** The text voice (deal.ts voice): each chunk rises `rise` of its size into place over `fade` f@60; a new chunk is born
 * in the accent and drains to ink over `drain`. A line is set in place, centred: it never types on word by word. */
export const VOICE = { fade: 14, rise: 0.3, drain: 7 } as const;
/**
 * A line alone reads fast: it arrives whole or in at most three chunks (`stagger` f@60 apart) and is read in `read`
 * f@60 at most from its first chunk to its parting (1.2 s), then its scene. Up to four words arrive whole, five or six
 * in two chunks, seven in three.
 */
export const CHUNK = { stagger: 9, read: 72, max: 3 } as const;
export const chunksOf = (n: number) => (n <= 4 ? 1 : n <= 6 ? 2 : 3);
/** The words of each chunk of a line of n words (word indices, balanced, in order). */
export const chunkWords = (n: number): number[][] => {
  const k = chunksOf(n);
  const out: number[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < n; i++) out[Math.min(k - 1, Math.floor((i * k) / Math.max(1, n)))].push(i);
  return out;
};
/** A line alone that becomes the element: once read, its key word becomes a chip and takes the centre as the other words
 * part, starting `lead` f@60 before the handover's lead (the chip whole by then) and gliding on into it (one continuous
 * move with the element's flight). */
export const GATHER = { lead: 8, dur: 14 } as const;
/** When a line of n words is whole, f@60 from its first chunk. */
export const buildOf = (n: number) => (chunksOf(n) - 1) * CHUNK.stagger + VOICE.fade;
/** How long a line alone of n words is read, f@60 from its first chunk to its parting: its words' hold, at most CHUNK.read. */
export const readOf = (n: number) => Math.min(CHUNK.read, Math.max(buildOf(n) + 24, holdFor(n, pace)));

/**
 * Statement type, as shares of the frame height (cap height): a line alone 9.2 %, the claim 11.2 % (the hero), a line
 * round the element 8 %. A line alone never sets under `floor` (7 %, the checks fail one under 6 %): too long for one
 * row there, it takes two rows (split between words, never inside its key). `em`: the deterministic width estimate a
 * character (a wide face's advance), so the size and the element's box are the same in the browser and in Node.
 */
export const LINE_CAP = { alone: 0.092, around: 0.08, claim: 0.112, floor: 0.07, maxW: 0.86, em: 0.6, capEm: 0.727, gap: 0.27, lead: 1.06 } as const;
export type LineFit = { cap: number; size: number; rows: number[] };
/** A line's size and rows at a cap share (each word's row index): one row while it sets near its cap (at least 4/5 of
 * it, never under the floor), else two balanced rows when they set it bigger. */
export const fitLine = (raw: string, cap: number): LineFit => {
  const kw = keyWords(raw);
  const sizeAt = (c: number) => (c * H) / LINE_CAP.capEm;
  const est = (from: number, to: number, size: number) => kw.slice(from, to).reduce((t, k, i) => t + k.word.length * LINE_CAP.em * size + (i ? size * LINE_CAP.gap : 0), 0);
  const room = W * LINE_CAP.maxW;
  const s0 = sizeAt(cap);
  const one = Math.min(s0, (s0 * room) / Math.max(1, est(0, kw.length, s0)));
  const oneRow: LineFit = { cap: (one * LINE_CAP.capEm) / H, size: one, rows: kw.map(() => 0) };
  if (kw.length < 2 || (one >= 0.8 * s0 && one >= sizeAt(LINE_CAP.floor))) return oneRow;
  // two rows: the split that balances the rows best, never inside the key phrase
  let best = { at: 1, w: Infinity };
  for (let at = 1; at < kw.length; at++) {
    if (kw[at].key && kw[at - 1].key) continue;
    const w = Math.max(est(0, at, s0), est(at, kw.length, s0));
    if (w < best.w) best = { at, w };
  }
  const size = Math.min(s0, (s0 * room) / Math.max(1, best.w));
  if (size < one * 1.15 && one >= sizeAt(LINE_CAP.floor)) return oneRow;
  return { cap: (size * LINE_CAP.capEm) / H, size, rows: kw.map((_, i) => (i < best.at ? 0 : 1)) };
};
/** The cap share a line is set at by its place (a claim alone is the hero). */
export const capFor = (place: string, claim: boolean) => (place === 'alone' ? (claim ? LINE_CAP.claim : LINE_CAP.alone) : LINE_CAP.around);


// ---------------------------------------------------------------------------------------------------- the cast

/** What the film can show (a scene that needs more is never dealt): its pictures, and what the spine's props give. */
const HAVE: Need[] = (() => {
  const h = new Set<Need>();
  if (PICTURES.length >= 1) h.add('picture');
  if (PICTURES.length >= 4) h.add('pictures');
  for (const a of SPINE.acts)
    for (const s of a.scenes) {
      const p = s.props ?? {};
      if (p.chips) h.add('logos');
      if (p.plans) h.add('plans');
      if (p.product) h.add('product');
      if (p.hero) h.add('hero');
    }
  return [...h];
})();

/** The scenes in film order (as lib/spine flattens them: the lockup added when the spine ends on another form). */
type Flat = { act: number; k: number; def?: FilmScene; form: Form; name: string };
const FLAT: Flat[] = (() => {
  const out: Flat[] = [];
  SPINE.acts.forEach((a, i) => a.scenes.forEach((s, k) => out.push({ act: i, k, def: s, form: s.form, name: s.name })));
  const last = out[out.length - 1];
  if (last && last.form !== 'mark') out.push({ act: SPINE.acts.length - 1, k: SPINE.acts[SPINE.acts.length - 1].scenes.length, form: 'mark', name: 'lockup' });
  return out;
})();

/**
 * Each scene's house scene, dealt (src/bank.ts dealScene: a seeded weighted draw by its act's verb, its form, its size
 * and the films before this one; the lockup from the end scenes; never one scene twice, two of the last film's at most):
 * a scene that names a `bank` redraws its slot by hand and says why (`why`), a scene marked `own` is the film's one
 * scene of its own (src/product.tsx OWN, `seconds` 1.5-3), and a line (a word scene) is drawn by the template's own line
 * (acts/scenes.tsx wordScene). `design` is the value the scene was designed on; `ground` the one it
 * is painted on: the film keeps ONE ground (FILM_GROUND: the value most of its scenes were designed on, the deal's on a
 * tie) and every scene stands on it (src/palette.ts paletteOn keeps its contrast), with at most one deliberate change: the
 * film's first colour field (a flood, toast-stack's accent) keeps its field, and the film returns to its ground after it;
 * a later field is painted on the ground. `ff`: the scene opens on its own picture (the element arrives as its whole frame).
 */
export type CastEntry = { bank: string | null; own: boolean; props: Record<string, unknown>; ground: Ground; design: Ground; big: boolean; ff: boolean; subject: string };
const CAST0 = (() => {
  const named = FLAT.map((x) => x.def?.bank ?? '').filter(Boolean);
  const used: string[] = [];
  let slot = 0;
  return FLAT.map((s, i) => {
    if (s.def?.bank) return s.def.bank;
    if (s.def?.own) {
      const sec = s.def.seconds;
      if (s.form === 'word' || !(typeof sec === 'number' && sec >= DEAL_RULES.ownSeconds[0] && sec <= DEAL_RULES.ownSeconds[1]))
        throw new Error(`timeline: scene "${s.name}" is your own: give it a picture form and its seconds (${DEAL_RULES.ownSeconds.join('-')}), and draw it in src/product.tsx OWN`);
      return null;
    }
    if (s.form === 'word' && s.def) return null;
    const id = dealScene({ act: s.act, k: s.k, verb: SPINE.acts[s.act]?.verb ?? '', form: s.form, last: i === FLAT.length - 1, have: HAVE, used: [...named, ...used], floor: UNNAMED ? FLOOR_CAST[slot] : undefined });
    slot++;
    used.push(id);
    return id;
  });
})();
const dealtWorld: Ground = /^(paleSky|nearWhite|studio|clouds|sky)$/.test(String(DEAL.ground)) ? 'light' : 'dark';
/** The film's one ground: the value most of its house scenes were designed on (a colour field counts as neither), the deal's on a tie. */
export const FILM_GROUND: Ground = (() => {
  const own = CAST0.map((id) => (id ? BANK[id]?.ground : undefined)).filter((g): g is Ground => g === 'light' || g === 'dark');
  const light = own.filter((g) => g === 'light').length;
  const dark = own.length - light;
  return light === dark ? dealtWorld : light > dark ? 'light' : 'dark';
})();
export const CAST: CastEntry[] = (() => {
  let flooded = false;
  return CAST0.map((id, i): CastEntry => {
    const subject = FLAT[i].def?.subject ?? FLAT[i].name;
    if (id) {
      const e = BANK[id];
      if (!e) throw new Error(`timeline: scene "${FLAT[i].name}" names bank "${id}", which src/bank.ts BANK does not hold (${Object.keys(BANK).join(', ')})`);
      const flood = e.ground === 'field' && !flooded;
      if (flood) flooded = true;
      return { bank: id, own: false, props: FLAT[i].def?.props ?? {}, ground: flood ? 'field' : FILM_GROUND, design: e.ground, big: e.big, ff: !onScreen(e.handIn), subject };
    }
    return { bank: null, own: !!FLAT[i].def?.own, props: FLAT[i].def?.props ?? {}, ground: FILM_GROUND, design: FILM_GROUND, big: false, ff: false, subject };
  });
})();

/**
 * The deal as the checks read it (scripts/grid-check.ts deal-*): each scene's house scene (null: a line, or the film's
 * own), whether the deal gave it or the script redrew it (and why), and the last film's scenes. Lines are the
 * template's own type and are not counted; of the picture scenes 75 % or more come from the bank, one is the film's
 * own at most, none plays twice, and two at most are the last film's.
 */
export const DEAL_PLAN = {
  template: 'launch-simple',
  seed: DEAL_SEED,
  scenes: FLAT.map((s, i) => ({ name: s.name, bank: CAST[i].bank, own: CAST[i].own, line: !CAST[i].bank && !CAST[i].own, dealt: !!CAST[i].bank && !s.def?.bank, ...(s.def?.bank ? { why: s.def.why ?? '' } : {}) })),
  last: HISTORY[0] ?? [],
};
/** The house scenes the film plays (film-diff.mjs --record keeps them, so the next films are dealt others). */
export const PLAYED: string[] = [...new Set(CAST.map((c) => c.bank).filter((x): x is string => !!x))];

/** No handover kind on more than this share of the film's changes (one move every time reads as a template). */
export const SEAM_SHARE = 0.4;
/**
 * The handovers a change may take here (the stage draws each with fx/Handover): the form table's drawn recipes of the
 * pair, a converge through a point (always), a shrink into a chip (a pill, a line's key word); into a scene that opens on its own picture the
 * element also grows into that whole screen or opens onto it as an iris (a pressed button as a porthole); into a scene
 * whose first element is on screen it may fly there. Never 'word' into a scene that opens on its own picture (its kept
 * content would hide that picture). The scene-internal kinds (stay, part, same-surface, zoom-into, pull-out, momentum)
 * are a scene's own: two house scenes never share one surface.
 */
export const viaOptions = (A: Form, B: Form, ff: boolean, inForm?: Form, outInSight = true): HandoverKind[] => {
  // a kept word ('word') lands only where the next scene takes a word: never into a house scene's own element (it would
  // stand in that element's box with the element hidden)
  const table = handoversFor(A, B).filter((k) => HANDOVERS[k].draws === 'handover' && !(k === 'word' && (ff || (inForm !== undefined && inForm !== 'word'))));
  // a shrink into a chip: a pill, or the key word of a line (it arrives as a chip and fades into its word)
  const extra: HandoverKind[] = ['converge', ...(COL_OF[B] === 'pill' || B === 'word' ? (['shrink'] as HandoverKind[]) : []), ...(ff ? (['grow', 'iris', ...(COL_OF[A] === 'button' ? ['press-open'] : [])] as HandoverKind[]) : (['fly'] as HandoverKind[]))];
  // an iris or a porthole opens from the element: only from one wholly in sight (never a page leaving through the top)
  return [...new Set([...table, ...extra])].filter((k) => outInSight || (k !== 'iris' && k !== 'press-open'));
};
/** True when this template may join A to B by `kind` (the grammar's recipes and viaOptions). */
export const viaAllows = (A: Form, B: Form, kind: HandoverKind | 'cut' | 'entry', ff: boolean) => kind === 'cut' || kind === 'entry' || allows(A, B, kind) || viaOptions(A, B, ff).includes(kind);
const vhash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
/** What the deal changed in the script's own handovers (a pinned kind past SEAM_SHARE is dealt again), for the print. */
const VIA_NOTES: string[] = [];
/**
 * Each change pinned to a handover the stage draws: the script's `via` while its kind stays under SEAM_SHARE of the
 * changes; else from viaOptions the form table's own recipe first, then the one-move kinds (the least used first, in
 * an order dealt by the film's seed), a converge last, never a kind past its share while another fits. So the seams vary: a converge, a flight, a
 * porthole, an iris and a grow join, and no film is one handover played ten times.
 */
const VIA: (HandoverKind | 'cut' | undefined)[] = (() => {
  const used: Partial<Record<string, number>> = {};
  const cap = Math.max(1, Math.floor(SEAM_SHARE * Math.max(1, FLAT.length - 1) + 1e-9));
  return FLAT.map((s, i) => {
    if (i === 0) return s.def?.via;
    const A = FLAT[i - 1].form;
    const B = s.form;
    const ff = CAST[i].ff;
    const pinned = s.def?.via;
    if (pinned === 'cut') return 'cut';
    if (pinned && (used[pinned] ?? 0) < cap) {
      used[pinned] = (used[pinned] ?? 0) + 1;
      return pinned;
    }
    const table = handoversFor(A, B);
    const inForm = CAST[i].bank ? (BANK[CAST[i].bank as string].handIn?.form ?? undefined) : CAST[i].own ? B : 'word';
    const ob = CAST[i - 1].bank ? BANK[CAST[i - 1].bank as string].handOut : null;
    const outInSight = !ob || (ob.x >= -2 && ob.y >= -2 && ob.x + ob.w <= W + 2 && ob.y + ob.h <= H + 2);
    // the form table's own recipe first; a converge (two moves: a collapse, then a growth) after the one-move kinds
    const rank = (k: HandoverKind) => (table.includes(k) ? 0 : k === 'converge' ? 2 : 1);
    const opts = viaOptions(A, B, ff, inForm, outInSight).sort((x, y) => rank(x) - rank(y) || vhash(`${SCENE_SEED}:via:${i}:${x}`) - vhash(`${SCENE_SEED}:via:${i}:${y}`));
    const free = opts.filter((k) => (used[k] ?? 0) < cap);
    const pool = free.length ? free : opts;
    const pick = pool.slice().sort((x, y) => rank(x) - rank(y) || (used[x] ?? 0) - (used[y] ?? 0) || pool.indexOf(x) - pool.indexOf(y))[0];
    if (pinned) VIA_NOTES.push(`scene "${s.name}": via ${pinned} dealt again as ${pick} (one kind on ${Math.round(SEAM_SHARE * 100)} % of the changes at most)`);
    used[pick] = (used[pick] ?? 0) + 1;
    return pick;
  });
})();

/** The words of the line a word scene draws (its act's line; the last word scene of the last act, the claim). */
const lineWords = (i: number) => {
  const a = SPINE.acts[FLAT[i].act];
  const own = FLAT.filter((x, j) => x.act === FLAT[i].act && x.form === 'word' && !CAST[j].bank);
  const claim = own.length > 1 && own[own.length - 1] === FLAT[i] && SPINE.claim?.text;
  return keyWords(String(claim ? SPINE.claim?.text : a?.line?.text ?? SPINE.claim?.text ?? 'A line')).length;
};
const leadOf = (kind: HandoverKind | 'cut' | 'entry' | undefined) => (!kind || kind === 'cut' || kind === 'entry' ? 0 : handoverFrames(kind, FPS)[0]);
/** Each house scene's own length at the film's rate (frames), for the props it plays (0 for a line). */
export const BANK_DUR: number[] = CAST.map((c) => (c.bank ? Math.round((durOf(c.bank, c.props) * FPS) / 30) : 0));

/**
 * The house lengths, frames at the film's rate: a scene runs 1.5-3 s (one point, shown and understood), the lockup at
 * most 2.5 s; a house scene may play 1.2 x faster or slower than its own clock to land on the music (slower than that it
 * holds its last frame, creeping). A scene of its own runs no longer: the timeline refuses one over SCENE_MAX.
 */
export const SCENE_MAX = 3 * FPS;
export const LOCKUP_MAX = Math.round(2.5 * FPS);
export const EASE = [1 / 1.2, 1.2] as const;
/** The first frame a line alone shows its first chunk, from its scene's start (the first scene: at once, the film opens on motion). */
const lineLead = (i: number) => (i === 0 ? -b(1) : 0);
// a scene longer than the house allows is refused here, by name and length, before anything is built on it
FLAT.forEach((s, i) => {
  if (!CAST[i].bank) return;
  const last = i === FLAT.length - 1;
  const max = last ? Math.round(LOCKUP_MAX * EASE[1]) : SCENE_MAX;
  if (BANK_DUR[i] > max)
    throw new Error(
      `timeline: scene "${s.name}" (${CAST[i].bank}) runs ${(BANK_DUR[i] / FPS).toFixed(2)} s; a scene runs 1.5-3 s${last ? ' and the lockup at most 2.5 s' : ''}, a scene of your own too: ` +
        `split it into scenes of 1.5-3 s (each one point, its element handed on) or show less (a shorter request, fewer items)`,
    );
});
/**
 * Each scene's length as it plays (`nat`) and the band it may take to land on the music (`min`-`max`): a house scene
 * whole, then the lead of the handover that takes its element (eased within EASE, never over SCENE_MAX); a line alone
 * arriving, read (readOf: 1.2 s at most from its first chunk) and gathered into its key word; the lockup at its own
 * speed with a short hold, never over LOCKUP_MAX.
 */
type Span = { nat: number; min: number; max: number; w: number };
// every band is at least an 8th of the music and a frame wide, so the changes always find their 8ths: a scene near its
// cap plays a little faster, a line whose read is near 1.2 s holds its chip (its words parting) a little longer
const EIGHTH = Math.ceil(BAR / 8) + 1;
const SPANS: Span[] = FLAT.map((_, i): Span => {
  const out = i + 1 < FLAT.length ? leadOf(VIA[i + 1]) : 0;
  const last = i === FLAT.length - 1;
  if (CAST[i].bank && last) {
    const own = BANK_DUR[i];
    return { nat: Math.min(LOCKUP_MAX, own + f60(36)), min: Math.min(LOCKUP_MAX - EIGHTH, Math.round(own * EASE[0]) + f60(12)), max: LOCKUP_MAX, w: 1 };
  }
  if (CAST[i].own) {
    // the film's own scene at its declared length (1.5-3 s), eased a little to land on the music
    const own = Math.round(Number(FLAT[i].def?.seconds) * FPS);
    return { nat: Math.min(SCENE_MAX, own + out), min: Math.max(Math.round(DEAL_RULES.ownSeconds[0] * FPS), Math.round(own * 0.9)), max: SCENE_MAX, w: 1 };
  }
  if (CAST[i].bank) {
    const own = BANK_DUR[i];
    // a house scene's moves are tuned to its own clock: it plays at most 5 % faster (slower, it holds and creeps), unless
    // its length near the 3 s cap asks for more
    return { nat: Math.min(SCENE_MAX, own + out), min: Math.min(SCENE_MAX - EIGHTH, Math.round(own * 0.95) + out), max: SCENE_MAX, w: 1 };
  }
  const n = lineWords(i);
  const base = lineLead(i) + f60(GATHER.lead) + out;
  // read at least the house hold for its words, at most 1.2 s; the slot may run an 8th longer (the chip holds, the words part)
  return { nat: base + f60(readOf(n)), min: base + f60(Math.min(readOf(n), holdFor(n, pace))), max: base + f60(CHUNK.read) + EIGHTH, w: 4 };
});
const NATURAL: number[] = SPANS.map((s) => s.nat);

/** The nearest 8th of the music's grid to frame f (a scene change lands on the track's own subdivision). */
export const q8 = (f: number): number => {
  const k = Math.max(1, Math.floor((f - b(1)) / BAR) + 1);
  let best = f;
  let d = Infinity;
  for (let n = Math.max(1, k - 1); n <= k + 1; n++)
    for (let beat = 0; beat < 4; beat++)
      for (const sub of [0, 2]) {
        const g = b(n, beat, sub);
        if (Math.abs(g - f) < d) [d, best] = [Math.abs(g - f), g];
      }
  return best;
};

/**
 * The body on the track, fitted as a whole: every scene change on the music's 8th, each scene inside its band (SPANS:
 * a house scene 1.5-3 s, eased at most 1.2 x; a line alone read in 1.2 s at most; the lockup at most 2.5 s), as near its
 * own length as the music allows, and the body ending on a bar line (the lockup's hold, creeping, takes up the rest).
 * Each act starts on a downbeat wherever the bands allow it (the structure lands on the music); where they do not, its
 * change lands on the 8th, carried by its handover like any other. A dynamic programme over the 8ths finds the fit.
 */
const ACT_OFF_BEAT = 0.12; // the cost of an act that starts off its downbeat (about a 40 % stretch of one scene)
const FIT = (() => {
  const n = FLAT.length;
  const total = SPANS.reduce((t, s) => t + s.max, 0);
  const lastBar = 2 + Math.ceil(total / BAR);
  // the 8ths of the music from the first downbeat to past the longest body
  const grid: number[] = [];
  const down = new Set<number>();
  for (let bar = 1; bar <= lastBar + 1; bar++)
    for (let k = 0; k < 8; k++) {
      const g = b(bar, Math.floor(k / 2), (k % 2) * 2);
      if (!grid.length || g > grid[grid.length - 1]) grid.push(g);
      if (k === 0) down.add(g);
    }
  const actStart = FLAT.map((x, i) => i > 0 && x.act !== FLAT[i - 1].act);
  const cost = (i: number, len: number) => {
    const s = SPANS[i];
    const miss = len < s.min ? s.min - len : len > s.max ? len - s.max : 0;
    // slower than its own clock costs twice what faster does: a launch reads quick (the median shot 1.5-2.5 s)
    return s.w * Math.log(len / Math.max(1, s.nat)) ** 2 * (len > s.nat ? 2 : 1) + (miss ? 1000 + miss : 0);
  };
  const G = grid.length;
  let dp: number[] = new Array(G).fill(Infinity);
  const from: Int32Array[] = [];
  dp[0] = 0;
  for (let i = 0; i < n; i++) {
    const next: number[] = new Array(G).fill(Infinity);
    const back = new Int32Array(G).fill(-1);
    const s = SPANS[i];
    for (let g = 0; g < G; g++) {
      if (!Number.isFinite(dp[g])) continue;
      for (let h = g + 1; h < G; h++) {
        const len = grid[h] - grid[g];
        if (len < s.min * 0.5) continue;
        if (len > s.max * 1.6 + BAR) break;
        const c = dp[g] + cost(i, len) + (i + 1 < n && actStart[i + 1] && !down.has(grid[h]) ? ACT_OFF_BEAT : 0);
        if (c < next[h]) [next[h], back[h]] = [c, g];
      }
    }
    from.push(back);
    dp = next;
  }
  // the body ends on a bar line; each bar costs a little (a launch is as short as its scenes allow)
  const barCost = (h: number) => 0.1 * ((grid[h] - b(1)) / BAR);
  let end = -1;
  for (let h = 0; h < G; h++) if (down.has(grid[h]) && Number.isFinite(dp[h]) && (end < 0 || dp[h] + barCost(h) < dp[end] + barCost(end) - 1e-9)) end = h;
  if (end < 0) throw new Error('timeline: the scenes found no fit on the music (no bar line ends the body)');
  const idx: number[] = new Array(n + 1);
  idx[n] = end;
  for (let i = n - 1; i >= 0; i--) idx[i] = from[i][idx[i + 1]];
  const bounds = idx.map((g) => grid[g]);
  const eases = FLAT.map((_, i) => (bounds[i + 1] - bounds[i]) / Math.max(1, NATURAL[i])).filter((_, i) => !!CAST[i].bank);
  return { bars: Math.round((bounds[n] - b(1)) / BAR), k: eases.reduce((t, v) => t + v, 0) / Math.max(1, eases.length), bounds };
})();
// the house lengths hold on the fitted body: a scene over 3 s (the lockup over 2.5 s) or a line read past 1.2 s is refused
FLAT.forEach((s, i) => {
  const len = FIT.bounds[i + 1] - FIT.bounds[i];
  const last = i === FLAT.length - 1;
  const max = SPANS[i].max;
  if (len > max + 1)
    throw new Error(
      `timeline: scene "${s.name}" (${CAST[i].bank ?? 'a line'}) would run ${(len / FPS).toFixed(2)} s on this track at ${BPM.toFixed(0)} BPM; ` +
        `${CAST[i].bank ? (last ? 'the lockup runs at most 2.5 s' : 'a scene runs 1.5-3 s') : 'a line alone is read in 1.2 s at most'}: add a scene to its act or take a line out, or fit another track`,
    );
});
/** The body's length in bars of the track (the lockup's hold included). */
export const BARS = FIT.bars;
/** How much the house scenes were eased, on average, to land their acts on the bars (1: as they are). */
export const FIT_K = FIT.k;

const SP: Spine = { ...SPINE, acts: SPINE.acts.map((a) => ({ ...a, scenes: a.scenes.map((s) => ({ ...s, via: VIA[FLAT.findIndex((x) => x.def === s)] })) })) } as Spine;
const PLAN0: SpinePlan = planSpine(SP, { fps: FPS, b, bars: Math.max(BARS, SPINE.acts.length) });
/** Each scene's script entry, in plan order (a lockup the plan adds at the end has none). */
export const SCENE_DEF: (FilmScene | undefined)[] = PLAN0.scenes.map((s) => SPINE.acts[s.act]?.scenes[s.k]);

/**
 * The plan on the scenes' own lengths: each scene from its bound to the next (FIT), each act from its first scene to
 * the next act's (its bars the nearest whole number), every change on the incoming scene's first frame with its lead
 * before it (the out scene holds its last frame while the element leaves it) and its landing after it.
 */
const retime = (p: SpinePlan): SpinePlan => {
  const scenes: PlanScene[] = p.scenes.map((s, i) => ({ ...s, from: FIT.bounds[i], to: FIT.bounds[i + 1] }));
  const bodyFrom = FIT.bounds[0];
  const bodyTo = FIT.bounds[FIT.bounds.length - 1];
  const acts: PlanAct[] = p.acts.map((a, i) => {
    const from = scenes[a.scenes[0]].from;
    const to = i + 1 < p.acts.length ? scenes[p.acts[i + 1].scenes[0]].from : bodyTo;
    return { ...a, from, to, bars: Math.max(1, Math.round((to - from) / BAR)), share: (to - from) / Math.max(1, bodyTo - bodyFrom) };
  });
  const downbeats = new Set(Array.from({ length: BARS + 1 }, (_, k) => b(1 + k)));
  const changes: PlanChange[] = p.changes.map((c) => {
    const at = scenes[c.to.scene].from;
    const [lead, land] = c.kind === 'cut' || c.kind === 'entry' ? [0, 1] : handoverFrames(c.kind, FPS);
    return { ...c, at, span: [at - lead, at + land], downbeat: downbeats.has(at) };
  });
  const last = changes[changes.length - 1];
  const end = p.end.kind === 'entry' ? { ...p.end, at: scenes[p.end.scene].from } : { ...p.end, at: last ? last.at : p.end.at };
  const world = p.world.map((w) => ({ ...w, at: acts[w.act].from }));
  return { ...p, from: bodyFrom, to: bodyTo, acts, scenes, changes, end, world };
};

/**
 * THE CONTRACT the checks read (grid-check --part spine, forensics --spine through out/cues.json, precheck): the acts,
 * the scenes, every change with its handover, the lines and where they live, the world's steps, the devices, the end.
 */
export const SPINE_PLAN: SpinePlan = retime(PLAN0);
export const SCENES = SPINE_PLAN.scenes;
export const CHANGES = SPINE_PLAN.changes;

/** One handover a scene change plays: its kind, cut, frames, the two scenes and forms it joins (stage.tsx draws it). */
export type HandoverPlan = { i: number; kind: HandoverKind | 'cut' | 'entry'; at: number; span: [number, number]; from: number; to: number; forms: [Form, Form]; boundary: boolean; draws: 'handover' | 'scene' | 'none'; dir?: 'left' | 'right' | 'up' | 'down' };
/** Every scene change, carried: the handover the element plays across it. */
export const HANDOVER_PLAN: HandoverPlan[] = CHANGES.map((c) => ({
  i: c.i,
  kind: c.kind,
  at: c.at,
  span: c.span,
  from: c.from.scene,
  to: c.to.scene,
  forms: [c.from.form, c.to.form],
  boundary: c.boundary,
  draws: c.kind === 'cut' || c.kind === 'entry' ? 'none' : HANDOVERS[c.kind].draws,
  ...(c.dir ? { dir: c.dir } : {}),
}));
/** The handover that brings scene i in / takes it out (undefined for the first / the last). */
export const handIn = (i: number) => HANDOVER_PLAN.find((h) => h.to === i);
export const handOut = (i: number) => HANDOVER_PLAN.find((h) => h.from === i);
/** The scene on screen at film frame F (the last one past the body). */
export const sceneAt = (F: number): PlanScene => SCENES.find((s) => F >= s.from && F < s.to) ?? (F < SCENES[0].from ? SCENES[0] : SCENES[SCENES.length - 1]);
/** The act's verb stem for a scene ('asks' -> 'ask'): the house scenes pick their device by it. */
export const verbOf = (scene: number) => stemVerb(SPINE_PLAN.acts[SCENES[scene].act]?.verb ?? '');

export const LOCKUP_SCENE = SPINE_PLAN.end.scene;
export const BODY_END = b(1 + BARS);
export const TOTAL = BODY_END + TAIL;

/**
 * The grounds as runs (grid-check grounds): the film's one ground, and at most one deliberate change (the flood, then
 * back): each scene's painted ground from CAST, merged where it holds.
 */
export const GROUND_PLAN: { from: number; to: number; ground: Ground }[] = SCENES.reduce<{ from: number; to: number; ground: Ground }[]>((runs, s, i) => {
  const g = CAST[i].ground;
  const last = runs[runs.length - 1];
  if (last && last.ground === g) last.to = i === SCENES.length - 1 ? TOTAL : s.to;
  else runs.push({ from: i === 0 ? 0 : s.from, to: i === SCENES.length - 1 ? TOTAL : s.to, ground: g });
  return runs;
}, []);

/**
 * One subject at most SUBJECT_MAX in a row (grid-check subject-run): consecutive scenes about the same picture (the same
 * calendar, the same card: a scene's `subject` in src/spine.ts, else its own name) are one beat. The timeline refuses a
 * longer run by name.
 */
export const SUBJECT_MAX = Math.round(4.5 * FPS);
export const SUBJECTS: { subject: string; from: number; to: number; scenes: number[] }[] = SCENES.reduce<{ subject: string; from: number; to: number; scenes: number[] }[]>((runs, s, i) => {
  const subject = CAST[i].subject;
  const last = runs[runs.length - 1];
  if (last && last.subject === subject) {
    last.to = s.to;
    last.scenes.push(i);
  } else runs.push({ subject, from: s.from, to: s.to, scenes: [i] });
  return runs;
}, []);
for (const r of SUBJECTS)
  if (r.to - r.from > SUBJECT_MAX && r.scenes.length > 1)
    throw new Error(`timeline: ${((r.to - r.from) / FPS).toFixed(2)} s on one subject ("${r.subject}": scenes ${r.scenes.map((i) => SCENES[i].name ?? i).join(', ')}), over 4.5 s: cut a scene, or give the next scene another subject`);

// ---------------------------------------------------------------------------------------------------- the acts

/** The acts as film windows (Film.tsx draws one Sequence each on the one stage); the last one holds through the tail. */
export const ACT: Record<string, { from: number; dur: number }> = Object.fromEntries(
  SPINE_PLAN.acts.map((a, i) => [a.id, { from: i === 0 ? 0 : a.from, dur: (i === SPINE_PLAN.acts.length - 1 ? TOTAL : a.to) - (i === 0 ? 0 : a.from) }]),
);
export type ActName = string;

// ---------------------------------------------------------------------------------------------------- the lines

/** A line on screen: in (its first chunk), resolved (whole), out (its parting); `fit` its size and rows; `chunks` how many parts it arrives in. */
export type LineTime = { id: string; text: string; raw: string; act: number; place: 'alone' | 'over' | 'around' | 'inside'; scene: number; in: number; resolved: number; out: number; claim: boolean; fit: LineFit; chunks: number };
/** The scene that draws a line: a 'word' scene in its act for a line alone, else the act's scene of its form (around:
 * the scene the element stands in; inside: the scene whose words carry it). */
const lineScene = (act: number, place: string, claim: boolean): number => {
  const own = SPINE_PLAN.acts[act].scenes.map((i) => SCENES[i]);
  if (place === 'alone') {
    const word = own.filter((s) => s.form === 'word');
    return (claim ? word[word.length - 1] : word[0])?.i ?? own[0].i;
  }
  return (own.find((s) => s.form !== 'word' && s.form !== 'mark') ?? own[0]).i;
};
const LINE_RAW = new Map<string, string>([...SPINE.acts.map((a, i) => [`act${i}`, a.line?.text ?? ''] as [string, string]), ['claim', SPINE.claim?.text ?? '']]);
/** Every line with the scene that draws it and its frames: in (first word), resolved (whole), out (gone). */
export const LINES: LineTime[] = SPINE_PLAN.lines.map((l) => {
  const claim = l.id === 'claim';
  const raw = (claim ? LINE_RAW.get('claim') : LINE_RAW.get(`act${l.act}`)) || l.text;
  const sc = lineScene(l.act, l.place, claim);
  const s = SCENES[sc];
  const n = keyWords(raw).length;
  const fit = fitLine(raw, capFor(l.place, claim));
  const ho = handOut(sc);
  if (l.place === 'alone') {
    // a line alone: its first chunk on its scene's first frame, while the element lands in it (the film's first line on
    // frame 0: the film opens on motion), whole on the music's 16th, read until its key word becomes the element (1.2 s
    // at most: SPANS)
    const inF = sc === 0 ? 0 : s.from;
    const build = f60(buildOf(n));
    let resolved = q16(inF + build);
    if (resolved < inF + Math.round(build * 0.7)) resolved = q16(resolved + BEAT / 4);
    // read 1.2 s at most: a slot longer than that holds the chip (the words parting) until the handover
    const out = Math.max(resolved + f60(12), Math.min(inF + f60(CHUNK.read), ho ? ho.span[0] - f60(GATHER.lead) : s.to));
    return { id: l.id, text: plain(raw), raw, act: l.act, place: l.place, scene: sc, in: inF, resolved, out, claim, fit, chunks: chunksOf(n) };
  }
  const lead = l.place === 'inside' ? f60(handIn(sc) ? HANDOVERS_LAND(sc) : 0) : f60(4);
  const build = l.place === 'inside' ? f60(14) : f60(buildOf(n));
  // the line is whole on the music's 16th (its sound lands there): its first chunk moves by at most half a 16th
  const resolved = Math.max(s.from + lead + build - Math.round(BEAT / 8), q16(s.from + lead + build));
  const inF = resolved - build;
  // a line around the element leaves once it is read (the element takes the frame back before it is handed on); a
  // line inside lives as long as its scene
  const read = f60(holdFor(n, pace));
  const out = l.place === 'around' ? Math.min(resolved + read, (ho ? ho.span[0] : s.to) - f60(12)) : ho ? Math.max(resolved + f60(20), ho.span[0]) : s.to;
  return { id: l.id, text: plain(raw), raw, act: l.act, place: l.place, scene: sc, in: inF, resolved, out: Math.min(out, s.to + f60(18)), claim, fit, chunks: l.place === 'inside' ? 1 : chunksOf(n) };
});
function HANDOVERS_LAND(sc: number): number {
  const h = handIn(sc);
  if (!h || h.kind === 'cut' || h.kind === 'entry') return 0;
  return HANDOVERS[h.kind].land;
}
/** The line a scene draws (alone in a word scene, inside its words, around its element), if any. */
export const lineOf = (scene: number) => LINES.find((l) => l.scene === scene);
export const lineById = (id: string) => LINES.find((l) => l.id === id);

// ---------------------------------------------------------------------------------------------------- the end

/** The lockup is a house scene (src/bank.ts: a mark born from blobs, a line splitting round the wordmark, a bar that
 * floods ...): it lands the mark and the name at its own beats (BANK `lock` and `name`, shares of its length); the one
 * fact arrives under it once its move is done, and the whole keeps creeping in to the last frame while the music rings
 * out (creep: a front-loaded start, its time constant in 30 fps frames, then the house hold rate in % a 30 fps frame).
 * `mark`, `slide`, `fact` and `solo` (f@60) are the house lockup's own (acts/scenes.tsx lockupScene). */
export const LOCK = { mark: 0, name: 26, slide: 30, fact: 64, creep: { start: 0.04, tau30: 14, pct: 0.1 }, solo: 1.9 } as const;
const LS = SCENES[LOCKUP_SCENE];
const LE = CAST[LOCKUP_SCENE]?.bank ? BANK[CAST[LOCKUP_SCENE].bank as string] : undefined;
const LD0 = BANK_DUR[LOCKUP_SCENE] || f60(90);
/** The lockup's clock: its own speed, a little faster (at most 1.4 x) when its slot (2.5 s at most) leaves it no short hold. */
export const LOCK_RATE = Math.min(1.4, Math.max(1, LD0 / Math.max(1, LS.to - LS.from - f60(12))));
const LD = LD0 / LOCK_RATE;
export const LOCKUP_AT = q16(LS.from + LD * (LE?.lock ?? 0.5));
export const NAME_AT = Math.max(LOCKUP_AT + 2, q16(LS.from + LD * (LE?.name ?? 0.62)));
/** The one fact under the lockup arrives as the name is read, 0.9 s before the body ends at the latest (its cap CLOSE_CAP of the frame: legible, never a footnote). */
export const FACT_AT = (() => {
  // whole (18 f@60 after it starts) on the music's 16th, after the name
  let whole = q16(Math.max(NAME_AT + 2, Math.min(NAME_AT + f60(24), LS.to - f60(54))) + f60(18));
  if (whole - f60(18) < NAME_AT + 2) whole = q16(whole + BEAT / 4);
  return whole - f60(18);
})();
export const CLOSE_CAP = 0.036;
/** The end: the lockup stays whole and alive to the last frame (it keeps creeping while the music rings out): never a
 * fade, never an empty last frame (grid-check lockup-end, forensics end-blank). */
export const LOCKUP_HOLD = { min: 1.5, max: 2.2 } as const;

// ---------------------------------------------------------------------------------------------------- COPY

export type Copy = {
  id: string;
  text: string; // exactly what is on screen
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
  kind?: 'copy' | 'ui' | 'name';
  chain?: string;
  mode?: 'build' | 'replace';
  reveal?: 'focus';
  swap?: string | boolean;
  place?: 'alone' | 'over' | 'around' | 'inside'; // a line alone on its ground (grid-check lone-line: its cap, chunks and read)
  cap?: number; // its cap height as a share of the frame height
  chunks?: number; // how many parts it arrives in (a line alone: whole or 2-3 chunks, never word by word)
};
/** Every string on screen with its frames: the lines (copy), the product's words (ui), the name and the fact. */
export const COPY: Copy[] = [
  ...LINES.map((l): Copy => ({ id: l.id, text: l.text, in: l.in, resolved: l.resolved, out: l.out, kind: l.place === 'inside' ? 'ui' : 'copy', place: l.place, cap: +l.fit.cap.toFixed(4), chunks: l.chunks })),
  ...SCENES.flatMap((s) => (SCENE_DEF[s.i]?.ui ?? []).map((t, k): Copy => ({ id: `s${s.i + 1}ui${k + 1}`, text: t, in: s.from, resolved: s.from + f60(12), out: s.to, kind: 'ui' }))),
  { id: 'name', text: IDENTITY.name, in: NAME_AT, resolved: NAME_AT + f60(LOCK.slide), out: TOTAL, kind: 'name' } as Copy,
  ...(CLOSE.trim() ? [{ id: 'close', text: CLOSE, in: FACT_AT, resolved: FACT_AT + f60(18), out: TOTAL, kind: 'copy', cap: CLOSE_CAP } as Copy] : []),
].sort((x, y) => x.in - y.in);
/** When each COPY entry is being read: [from, to) frame ranges by id (src/lib/pace.ts readingWindows()). */
export const READ = readingWindows(COPY, pace, FPS, TOTAL);
export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};
/** The fragments of one chain, in order of arrival (none in this template: every line is whole). */
export const chainOf = (id: string): Copy[] => COPY.filter((x) => x.chain === id).sort((p, q) => p.in - q.in);

// ---------------------------------------------------------------------------------------------------- CUE

/** Named frames: act and scene starts, every handover's cut, each line whole, the lockup, the name and the fact. */
export const CUE: Record<string, number> = {};
SPINE_PLAN.acts.forEach((a, i) => (CUE[`act${i + 1}`] = a.from));
SCENES.forEach((s) => (CUE[`s${s.i + 1}`] = s.from));
HANDOVER_PLAN.forEach((h) => (CUE[`h${h.i + 1}`] = h.at));
LINES.forEach((l) => (CUE[l.id] = l.resolved));
CUE.lockup = LOCKUP_AT;
CUE.name = NAME_AT;
if (CLOSE.trim()) CUE.close = FACT_AT + f60(18);
/** No cue is off the grid on purpose. */
export const OFFGRID: Record<string, string> = {};

// ---------------------------------------------------------------------------------------------------- declarations

export type BlurPolicy = 'crisp' | 'camera';
export type FilmType = 'launch' | 'update' | 'explainer' | 'reel' | 'social';
export type Texture = 'clean' | 'paper' | 'grid' | 'halftone' | 'dither';
export type Look = { blur: BlurPolicy; texture: Texture; filmType: FilmType; oneTake: boolean; whiteWorld: boolean };
export type SeamKind =
  | 'velocity' | 'morph' | 'hard' | 'mask' | 'whip' | 'defocus' | 'light' | 'snapZoom' | 'breath'
  | 'zoomThrough' | 'stepped' | 'colour' | 'dissolveUi' | 'fadeEnd' | 'wipe';
export type Seam = { at: number; kind: SeamKind; carry?: 'x' | 'y' | 'scale' | 'rot' | 'shape' | 'colour'; dir?: 1 | -1; signature?: boolean; id?: string };
export type SteppedRange = { from: number; to: number; fps?: 12 | 16 | 20 | 30; on?: 2 | 3; id: string };
export type Flash = { f: number; frames: 1 | 2; id: string };
export type CameraBlurRange = { from: number; to: number; id: string };
export type EndLock = { from: number; to: number };
export type ColourRange = { from: number; to: number; id: string };
export type Declares = { stepped?: SteppedRange[]; flashes?: Flash[]; cameraBlur?: CameraBlurRange[]; seams?: Seam[]; colour?: ColourRange[] };
export type Salience = 'copy' | 'hit' | 'cut' | 'move' | 'life';

export const LOOK: Look = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
/** One seam per scene change (lib/spine spineDeclares: the handover in its id, its element and forms); no settle-out: the lockup holds to the last frame. */
export const SEAMS: Seam[] = [...spineDeclares(SPINE_PLAN).seams].sort((x, y) => x.at - y.at);
export const STEPPED: SteppedRange[] = [];
export const FLASHES: Flash[] = [];
export const CAMERA_BLUR: CameraBlurRange[] = [];
/** The film's one colour event: the world's turn (src/world.tsx), from its cut until the flood has covered the frame. */
const TURN = SPINE_PLAN.world.find((w) => w.step === 'turn');
export const COLOUR: ColourRange[] = TURN ? [{ from: TURN.at, to: TURN.at + f60(36), id: 'world-turn' }] : [];
/** The one lock: from the frame the fact is whole, the lockup holds (creeping) to the end. */
export const END: EndLock = { from: CLOSE.trim() ? copy('close').resolved : NAME_AT + f60(LOCK.slide), to: TOTAL };
export const REVEAL = CUE.lockup;
export const SPRING_CLASS = '';
/** CUE names that must land on a music event: the act turns. */
export const STRUCTURAL: string[] = [];
export const SALIENCE: Record<string, Salience> = Object.fromEntries(
  Object.keys(CUE).map((k) => [k, /^line|^claim|^name$|^close$/.test(k) ? 'copy' : /^act/.test(k) ? 'cut' : /^h\d/.test(k) ? 'move' : /^s\d/.test(k) ? 'move' : k === 'end' ? 'cut' : 'hit'] as const),
);

/** The median scene length in frames (a launch reads at 1.5-2.5 s a point). */
export const MEDIAN_SHOT = ((): number => {
  const d = SCENES.map((s) => s.to - s.from).sort((x, y) => x - y);
  return d.length % 2 ? d[(d.length - 1) / 2] : (d[d.length / 2 - 1] + d[d.length / 2]) / 2;
})();

/** The longest scene in frames (a scene runs 3 s at most, the lockup 2.5 s). */
export const LONGEST_SHOT = Math.max(...SCENES.map((s) => s.to - s.from));

/** What the deal and the spine chose, for a print: `npx tsx -e "import { PLAN_PRINT } from './src/timeline'; console.log(PLAN_PRINT)"`. */
export const PLAN_PRINT = [
  `${SPINE_PLAN.sentence}  [${DEAL.ground}, ${DEAL.voice}; ${SCENES.length} scenes, median ${(MEDIAN_SHOT / FPS).toFixed(2)} s, longest ${(LONGEST_SHOT / FPS).toFixed(2)} s, ${CAST.filter((c) => c.big).length} big (*), eased x${FIT_K.toFixed(3)}]`,
  ...SPINE_PLAN.acts.map((a) => `act ${a.i + 1} ${a.verb} (${a.bars} bars, ${Math.round(a.share * 100)} %, world ${a.world}): ${a.scenes.map((i) => `${SCENES[i].name}:${SCENES[i].form}=${CAST[i]?.bank ?? 'line'}${CAST[i]?.big ? '*' : ''} ${((SCENES[i].to - SCENES[i].from) / FPS).toFixed(2)} s`).join(' | ')}`),
  ...HANDOVER_PLAN.map((h) => `  ${h.forms[0]} -> ${h.forms[1]}: ${h.kind} at ${(h.at / FPS).toFixed(2)} s`),
  ...LINES.map((l) => `  line ${l.id} (${l.place}) "${l.text}" ${(l.in / FPS).toFixed(2)}-${(l.out / FPS).toFixed(2)} s, read ${((l.out - l.in) / FPS).toFixed(2)} s in ${l.chunks} chunk(s), cap ${(l.fit.cap * 100).toFixed(1)} % of the frame${l.fit.rows.some((r) => r > 0) ? ' on two rows' : ''}`),
  `  deal: ${(() => {
    const pic = DEAL_PLAN.scenes.filter((x) => !x.line);
    const bank = pic.filter((x) => x.bank).length;
    const shared = PLAYED.filter((x) => DEAL_PLAN.last.includes(x)).length;
    const redrawn = DEAL_PLAN.scenes.filter((x) => 'why' in x).map((x) => `${x.name} -> ${x.bank} (${x.why || 'NO REASON'})`);
    return `${bank} of ${pic.length} picture scenes from the bank (${Math.round((100 * bank) / Math.max(1, pic.length))} %), ${pic.length - bank} of the film's own, ${shared} shared with the last film${redrawn.length ? `; redrawn: ${redrawn.join(', ')}` : ''}`;
  })()}`,
  `  seams: ${Object.entries(HANDOVER_PLAN.reduce((m: Record<string, number>, h) => ({ ...m, [h.kind]: (m[h.kind] ?? 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join(', ')} (no kind over ${Math.round(SEAM_SHARE * 100)} %)`,
  `  issues: ${[...SPINE_PLAN.issues.errors.map((e) => `ERROR ${e}`), ...SPINE_PLAN.issues.warnings, ...VIA_NOTES].join(' | ') || 'none'}`,
].join('\n');
