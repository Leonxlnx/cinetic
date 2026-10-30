// The choices this film is dealt. The structure never changes (a line alone, the product acting, the next line, the
// product again, the lockup); how each part looks does: the text voice, the ground family, the seams, the end card and
// the camera on the picture beats. The seed is the product's name (the same name, the same deal, on any machine);
// launch.ts `seed` re-deals and `pin` fixes a slot by hand. Keep this file free of React and CSS imports: the timeline
// and the sound import it.
//
//   slot     choices        what each does
//   voice    build          every line built word by word (20 f fades, 6 f apart), re-centring as it grows (15 f expo)
//            blur           every line arrives whole out of a 12 px blur, settling from 104 % on a glide (34 f)
//            ink            every word arrives pale a touch below its place, rises into it and inks to its colour in
//                           10 f, 6 f apart
//   ground   (fx/Grounds GROUND_FAMILIES) nearWhite, blackField, whiteBand, deepPool, softSky, lightDark, gradientField:
//            one family for the whole film, never cut; its one colour event (a band flood, the turn to dark) is declared
//   seamTA   matchCut       line -> picture: the word slot holds the centre across a one-frame cut, the picture grows on
//            blurThrough    the line blurs away to 32 px, the picture resolves out of the same blur
//            velocityCut    the line leaves at speed, the picture arrives on the same speed and settles
//   seamAT   blurThrough    picture -> line: the picture blurs out, shrinking away; the line resolves on the kept ground
//            zoomThrough    the camera pushes through the picture (x1.07 a frame) and the line settles out of the push
//                           (a line builds from nothing, so no speed carries into it, and a whole picture never
//                           fades in or out on its own: that reads as a dissolve)
//   end      element        the last picture's hero element becomes the mark; the name slides out beside it, centred
//            badge          the last picture's hero element turns a little over a full turn as it shrinks into the mark
//                           (a spin blur on the fast frames); the name slides out from behind it, centred
//   camera   drift          every picture beat drifting sideways (1.5 % of the width a second, turn about)
//            rise           every picture beat rising (1.5 % of the height a second)
//                           (the camera only travels; the closer frame is a cut)
// The seams alternate between the two dealt kinds and their next choice, so no kind passes 45 % of the scene changes.
import { LAUNCH } from './launch';
import { RECENT } from './recent';

export const DEVICES = {
  voice: ['build', 'blur', 'ink'],
  ground: ['nearWhite', 'blackField', 'whiteBand', 'deepPool', 'softSky', 'lightDark', 'gradientField'],
  seamTA: ['matchCut', 'blurThrough', 'velocityCut'],
  seamAT: ['blurThrough', 'zoomThrough'],
  end: ['element', 'badge'],
  camera: ['drift', 'rise'],
} as const;

export type Slot = keyof typeof DEVICES;
export type Deal = { [S in Slot]: (typeof DEVICES)[S][number] };

/** What the template plays when nothing is dealt (the unnamed scaffold): a product's deal never replays it. */
export const FLOOR: Deal = { voice: 'build', ground: 'nearWhite', seamTA: 'matchCut', seamAT: 'blurThrough', end: 'element', camera: 'drift' };

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const rng = (seed: number) => {
  let a = seed || 1;
  return () => {
    a = (Math.imul(a ^ (a >>> 15), 2246822507) + 0x6d2b79f5) >>> 0;
    a ^= a + Math.imul(a ^ (a >>> 7), 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * A slot's choices without the last three films' (src/recent.ts, written by new-film.sh from the film history): never
 * a repeat while another choice is free; when the last films used every choice, the least recent one.
 */
const fresh = (s: Slot): readonly string[] => {
  const all = DEVICES[s] as readonly string[];
  const used = ((RECENT as Partial<Record<string, readonly string[]>>)[s] ?? []).filter((c) => all.includes(c)); // newest first
  const left = all.filter((c) => !used.includes(c));
  return left.length ? left : [used[used.length - 1]];
};

/** The deal for a name: one choice per slot from the seed, re-drawn (deterministically) until at least half the slots differ from the floor. */
export const dealOf = (name: string): Deal => {
  const slots = Object.keys(DEVICES) as Slot[];
  for (let salt = 0; salt < 64; salt++) {
    const r = rng(hash(`${name.trim().toLowerCase()}#${salt}`));
    const d = Object.fromEntries(slots.map((s) => {
      const opts = fresh(s);
      return [s, opts[Math.floor(r() * opts.length)]];
    })) as Deal;
    if (2 * slots.filter((s) => d[s] !== FLOOR[s]).length >= slots.length) return d;
  }
  return { ...FLOOR, voice: 'blur', ground: 'deepPool', seamTA: 'velocityCut' };
};

const NAME = LAUNCH.seed ?? LAUNCH.name;
/** The unnamed scaffold keeps the floor; a named film is dealt; launch.ts `pin` fixes slots by hand. */
export const DEAL: Deal = { ...(/^\[.*\]$/.test(NAME.trim()) ? FLOOR : dealOf(NAME)), ...(LAUNCH.pin ?? {}) } as Deal;
/** The film's seed as a number (floats, grounds and the small variations inside the acts). */
export const SEED = hash(NAME) % 100000;
