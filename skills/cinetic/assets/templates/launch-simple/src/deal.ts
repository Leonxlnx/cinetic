// The choices this film is dealt (its house scenes are dealt by each act's verb in src/bank.ts, from the same seed).
// The structure never changes (the spine: one case, one element handed on at every
// scene change, lines alone only for the promise and the claim, one world step per act, the lockup out of the last
// form); how it looks does: the text voice and the world. ONE source: when scripts/deck.py has dealt a direction in this
// project it writes src/dealt.ts and the film plays that deal (out/DIRECTION.md says why); with none dealt, the seed is
// the product's name (the same name, the same deal, on any machine) and spine.ts `seed` re-deals. Keep this file free of
// React and CSS imports: the timeline and the sound import it.
//
//   slot     choices        what each does
//   voice    build          the promise built word by word (each word born in the accent, rising 0.55 x-height and
//                           draining to ink in 7 f; the line re-centres front-loaded)
//            blur           the line arrives whole out of a defocus ladder, settling from 104 %
//            ink            each word arrives pale and inks to its colour in 10 f, 6 f apart
//   ground   the film's world (src/world.tsx): a DESIGNED place lit in the brand's hue, never a random photograph.
//            Built: paleSky (a pale stage with a floor glow in the accent), nearWhite (a white stage lit from one side),
//            electric (a field in the brand's colour from the first frame), blackField (a dark stage with a lit floor),
//            deepField (a deep night with light rising from the floor). A photograph only of the brief's own subject
//            (studio, clouds, sky, aerial, sea, nightCity, macro: `node scripts/assets.mjs plate <kind>`), graded and
//            soft behind the element. The world takes one step per act (src/spine.ts world: enter, closer, turn,
//            pull-back); the turn floods out of the element into the opposite value (a light stage turns to the brand's
//            colour field, a dark one to light)
import { DEALT } from './dealt';
import { RECENT } from './recent';
import { IDENTITY } from './brand/identity';

export const DEVICES = {
  voice: ['build', 'blur', 'ink'],
  ground: ['paleSky', 'nearWhite', 'electric', 'blackField', 'deepField', 'clouds', 'sky', 'aerial', 'sea', 'nightCity', 'studio', 'macro'],
} as const;

export type Slot = keyof typeof DEVICES;
export type Deal = { [S in Slot]: (typeof DEVICES)[S][number] };

/** What the template plays when nothing is dealt (the unnamed scaffold): a product's deal never replays it. */
export const FLOOR: Deal = { voice: 'build', ground: 'paleSky' };
/** The built worlds a deal from the name picks among (a photograph is dealt only by deck.py, for the brief's own subject). */
const BUILT: readonly Deal['ground'][] = ['paleSky', 'nearWhite', 'electric', 'blackField', 'deepField'];

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  // mixed (the murmur3 finaliser): FNV's low bits follow the letters' low bits alone, so the voice and the world picked
  // from pools of 2 and 4 would move together and a name could reach only half the pairings
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};
const pick = <T extends string>(seed: string, slot: string, from: readonly T[], avoid: readonly string[] = []): T => {
  const free = from.filter((x) => !avoid.includes(x));
  const pool = free.length ? free : from;
  return pool[hash(`${seed}:${slot}`) % pool.length];
};

/** Where the deal came from: the deck's direction, or the product's name. */
export const DEAL_SOURCE = DEALT ? `deck.py direction ${DEALT.direction}` : `the name "${IDENTITY.name}"`;
const seed = IDENTITY.name;
/** The unnamed scaffold (no direction dealt, the name still a [slot]): it plays the floor, its scenes too (src/bank.ts FLOOR_CAST). */
export const UNNAMED = !DEALT && /^\[/.test(seed);
const dealt = (DEALT?.deal ?? {}) as Partial<Record<Slot, string>>;
const valid = <S extends Slot>(s: S, v: string | undefined): v is Deal[S] => !!v && (DEVICES[s] as readonly string[]).includes(v);
// a deck deal naming a device this template lacks is a mistake to say, never a silent fallback
for (const [slot, v] of Object.entries(dealt))
  if (slot in DEVICES && !valid(slot as Slot, v))
    throw new Error(`deal: ${slot} "${v}" (src/dealt.ts) is not one of this template's ${slot}s (${(DEVICES[slot as Slot] as readonly string[]).join(', ')}): re-deal with deck.py`);
/**
 * The deal a name gets (never the last films' voice or ground while another is free, never the floor's pair): the film's
 * own when nothing is dealt.
 */
export const dealOf = (name: string): Deal => {
  const voice = pick(name, 'voice', DEVICES.voice, RECENT.voice ?? []);
  return { voice, ground: pick(name, 'ground', BUILT, [...(RECENT.ground ?? []), ...(voice === FLOOR.voice ? [FLOOR.ground] : [])]) };
};
/** The film's deal: the deck's, else from the name (never the last films' voice or ground while another is free). */
export const DEAL: Deal = {
  voice: valid('voice', dealt.voice) ? dealt.voice : /^\[/.test(seed) ? FLOOR.voice : dealOf(seed).voice,
  ground: valid('ground', dealt.ground) ? dealt.ground : /^\[/.test(seed) ? FLOOR.ground : dealOf(seed).ground,
};
