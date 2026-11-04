// The sound events of the film, computed from the picture code. scripts/export-cues.ts calls the
// default export and writes out/cues.json; scripts/audio/score.py voices each event with the
// film's sound kit (audio/kit.json: the recorded take scripts/audio/sfx.mjs placed for its kind, the earshot take as the fallback) on its exact frame, levelled over
// the film's licensed music track (audio/score.json "music"; schema, roles and levels: references/sound.md).
//
// The rules this file follows:
// - Every sound has a visible cause, but not every picture event gets a sound: sound discrete
//   state changes (a press, an insert, a lock, a landing, the logo assembling), leave continuous
//   motion silent, and let the music carry most cuts. A class of action, once sounded, is
//   sounded every time.
// - Impacts go on the contact frame, pops on the 50% frame, settles on the 97% frame, and a
//   whoosh's apex on the velocity peak of the move it belongs to (a launch peaks on its cut).
// - Import the constants the acts animate with (they export them for this file) and compute the
//   frame; a frame typed by hand drifts the first time an act is retimed.
// - Text gets one soft `text` sound per fragment, on the frame its last word visibly comes to rest
//   (chainResolves(), at the size and role the act sets it at), never one per word;
//   what was just said is read in near-silence. The lockup is a stop-down and ONE clean element:
//   score.py's stack guard warns when anything else lands within 3 f of it or leads into it.
import { STATEMENT_SIZE, STATEMENT_SPEC } from './acts/Act1';
import { MORPH } from './acts/Act3';
import { KEY_PLAN } from './acts/Act4';
import { chainResolves, declares as chainDeclares } from './fx/Chain';
import { declares as gapDeclares } from './fx/InlineGap';
import { declares as keyDeclares } from './fx/KeyLight';
import { PACE } from './lib/pace';
import { settleOf } from './lib/sync';
import { ACT, copy, CUE, type Declares, FPS, PACE_NAME, type Salience, TOTAL } from './timeline';

export type Kind =
  | 'tick' | 'tock' | 'hit' | 'land' | 'pop' | 'whoosh' | 'riser'
  | 'drop' | 'key' | 'click' | 'snap' | 'swell' | 'bell' | 'suck' | 'text';

export type SoundEvent = {
  f: number; // absolute frame the sound belongs on (fractional is fine)
  kind: Kind;
  weight?: number; // 0..2, 1 = normal; scales level (and size for whoosh and land)
  pan?: number; // -1 left .. +1 right from screen x; score.py keeps effects within +-0.15, a whoosh travels the full amount
  pitch?: number | string; // MIDI number or "Eb6"; omit and score.py picks a tone in key
  apexFrac?: number; // whoosh / suck: where in its length the loudest point sits (lands on f)
  dur?: number; // frames: whoosh, riser, swell and suck length
  variant?: string; // key: 'word' | 'space' | 'return' | 'back'; tick: 'crisp'; click: 'confirm'; land: 'light'; bell: 'motif'; pop: 'down'
  action?: string; // what the picture does (scripts/audio/actions.py: 'card-land', 'click', 'toggle' ...): kit.py cast voices each action with its own sound
  id?: string; // a name for QA reports
  structural?: true; // an act or section change, the reveal or the ending: it must land on a music event (av-audit music_sync, grid-check)
  force?: true; // sound it even when a track accent already carries the moment
  offset_ms?: number; // -500..500: overrides the kit role's offset for this event only (rare)
  salience?: Salience; // what the moment asks of the eye: copy | hit | cut | move | life (see timeline.ts Salience)
};

/** Seconds to frames, for sound lengths. */
const sec = (s: number) => Math.round(s * FPS);
/** The act a frame belongs to, so QA reports read "mark:dome" rather than a bare frame. */
const actOf = (f: number) => Object.entries(ACT).find(([, a]) => f >= a.from && f < a.from + a.dur)?.[0] ?? 'tail';
const pace = PACE[PACE_NAME];

/**
 * What the primitives the acts use do on purpose (each fx's declares(props, film), called with the
 * props the acts pass): the statement's launch exit (a velocity seam on its cut), the picture in the
 * line's gap cutting through its frames (one-frame steps) and the key light carrying the cut to the
 * lockup (a light seam). export-cues writes them under declared.fx in out/cues.json; grid-check fails
 * when the timeline's own declarations (SEAMS, STEPPED, FLASHES, CAMERA_BLUR) do not cover them.
 */
export const declares = (): (Declares & { id?: string })[] => [
  { id: 'statement', ...chainDeclares({ ...STATEMENT_SPEC, id: 'statement' }, { pace }) },
  { id: 'gap', ...gapDeclares({ swaps: [CUE.swapA, CUE.swapB], id: 'gap' }) },
  { id: 'noon-lift', ...keyDeclares(KEY_PLAN) },
];

/** A launch into a cut: the whoosh's loudest point on the cut frame (its fastest), the tail running into the next shot. */
const launchWhoosh = (cut: number, pan: number, id: string): SoundEvent => {
  const dur = sec(0.45);
  return { f: cut, kind: 'whoosh', weight: 0.9, pan, dur, apexFrac: 0.75, id };
};

export default function cues(): SoundEvent[] {
  const ev: SoundEvent[] = [];

  // Act 1: one soft text sound as each fragment of the statement lands (at the statement's size and
  // role), never one per word. Between them, the dot's landing is the picture beat's one sound, on its
  // contact frame (the punch-in rides on it). The launch out of the line peaks on its cut.
  chainResolves('statement', { size: STATEMENT_SIZE, role: 'display' }).forEach((f, i) => ev.push({ f, kind: 'text', weight: 0.8, pan: -0.1 + 0.2 * i, id: `fragment${i + 1}` }));
  ev.push({ f: CUE.land, kind: 'land', variant: 'light', weight: 0.9, pan: 0.4, id: 'dot-lands' });
  ev.push(launchWhoosh(STATEMENT_SPEC.exitAt, -0.5, 'line-launch'));

  // Act 2 is mostly the music's: the plate and its light pass in silence; its one cut gets a dry tick.
  ev.push({ f: CUE.plateCut, kind: 'tick', variant: 'crisp', weight: 0.6, pan: 0, id: 'plate-closer' });
  // Act 3: the plate settles into the line's gap (97 % home), the words land, the gap cuts through its frames.
  ev.push({ f: settleOf(MORPH.from, MORPH.from + MORPH.dur, MORPH.ease), kind: 'tock', weight: 0.6, pan: 0, id: 'plate-seats' });
  chainResolves([copy('frame')], { size: STATEMENT_SIZE, role: 'display' }).forEach((f) => ev.push({ f, kind: 'text', weight: 0.8, pan: 0, id: 'every-frame' }));
  ev.push({ f: CUE.swapA, kind: 'tick', variant: 'crisp', weight: 0.6, pan: 0, id: 'gap-frame-2' });
  ev.push({ f: CUE.swapB, kind: 'tick', variant: 'crisp', weight: 0.6, pan: 0, id: 'gap-frame-3' });
  ev.push(launchWhoosh(ACT.mark.from - 1, 0, 'line-drops'));

  // Act 4: the dome and the block land on their contact frames (springs started early by delayTo); the cut
  // to the lockup is a soft knock as the key climbs; the name locking is the payoff, one short hit in the
  // launch kit after a stop-down. Its slide stays silent (a whoosh into the hit would stack onto it), and no
  // ticks run through the hold: the name reads in near-silence over the music.
  ev.push({ f: CUE.pieceA, kind: 'land', weight: 1, pan: -0.15, id: 'dome' });
  ev.push({ f: CUE.pieceB, kind: 'land', weight: 1, pan: -0.25, id: 'block' });
  ev.push({ f: CUE.lockCut, kind: 'tock', weight: 0.55, pan: 0, id: 'lockup-cut' });
  ev.push({ f: CUE.lockup, kind: 'hit', weight: 1, pan: 0.1, id: 'lockup' });

  for (const e of ev) {
    if (!(e.f >= 0 && e.f < TOTAL)) throw new Error(`sync: ${e.id} at f=${e.f} is outside the film (0..${TOTAL - 1})`);
    e.id = `${actOf(e.f)}:${e.id}`;
  }
  return ev;
}
