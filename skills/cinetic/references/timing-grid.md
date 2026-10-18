# Timing grid

Covers the beat grid: choosing BPM and fps, writing `src/timeline.ts` (fragment chains included), putting cues on the grid, computing sync points from the picture code, and budgeting holds and density in the calm and crisp profiles. Read it before Step 3 (Timeline), and again whenever a hit feels early, late or dead.

The numbers are proven defaults from shipped films (Tessel among them). Start from them and change one only when a render shows you why.

**Contents**
1. [Why one grid](#1-why-one-grid)
2. [Choosing BPM and fps](#2-choosing-bpm-and-fps)
3. [Durations by format, in bars](#3-durations-by-format-in-bars)
4. [The `timeline.ts` pattern](#4-the-timelinets-pattern)
5. [Putting cues on the grid](#5-putting-cues-on-the-grid)
6. [Hit frames: where the picture changes](#6-hit-frames-where-the-picture-changes)
7. [Sync helpers](#7-sync-helpers)
8. [Schedules: rolls, cascades, ripples](#8-schedules-rolls-cascades-ripples)
9. [Holds, reading time and density](#9-holds-reading-time-and-density)
10. [The Tessel grid, worked](#10-the-tessel-grid-worked)
11. [Checks](#11-checks)

---

## 1. Why one grid

- Every cue is a **frame number computed from bars and beats**, never a typed timestamp. The picture, `src/sync.ts` (the cue export) and `scripts/grid-check.ts` all import the same `src/timeline.ts`. When you change the tempo or move a bar, picture and sound move together.
- The beat must be a **whole number of frames**. If it is not, beats alternate between ⌊x⌋ and ⌈x⌉ frames, so the kick and the picture drift up to a frame apart. That reads as loose sync even when every event is "right".
- One motion peak per bar, section changes on downbeats. The grid gives the film a pulse the viewer feels before they hear the score.

## 2. Choosing BPM and fps

Beat frames = `60 / BPM × fps`. These tempos give whole-frame beats at 60 fps:

| BPM | Beat | 8th | 16th | Bar | Bar (s) | Use it for |
|---|---|---|---|---|---|---|
| 75 | 48 f | 24 | 12 | 192 f | 3.2 | slow, spacious brand pieces |
| 90 | 40 f | 20 | 10 | 160 f | 2.67 | calm walkthroughs, long reads |
| **100** | **36 f** | **18** | **9** | **144 f** | **2.4** | **default**: text-led and calm films (launch films, product videos, updates, walkthroughs), a fragment per bar |
| 120 | 30 f | 15 | 7.5 | 120 f | 2.0 | crisp films: energetic launches and teasers, fast loops, stings |
| 144 | 25 f | 12.5 | 6.25 | 100 f | 1.67 | energetic teasers (8ths are fractional) |
| 150 | 24 f | 12 | 6 | 96 f | 1.6 | teasers with whole 16ths |
| 180 | 20 f | 10 | 5 | 80 f | 1.33 | stings and fast cut sections only |

- **100 at 60 fps is the default.** Beat 36 f, bar 2.4 s, every 16th whole (9 f). A fragment of 2–3 words takes 1–1.5 bars at an unhurried pace: it resolves in about 50 f, holds about 60–66 f, and then the picture takes its beat of 30–90 f. In eight measured professional films a fragment stayed readable for about 0.8 s; the house default holds it about 1.5× longer.
- **120 is the crisp tempo.** Beat 30 f, bar exactly 2 s, every 8th whole. The 16th is 7.5 f; `b()` rounds it (8, 15, 23), which is fine for landings. When a crisp section needs whole 16ths (typing, ratchets, ripple waves), choose 150.
- **Use 60 fps whenever UI, text or the camera moves.** At 30 fps slow drifts step and fast moves strobe. Never use 24 fps for UI.
- **Other frame rates** (same formula): at 30 fps, 120 → 15 f, 100 → 18, 90 → 20, 150 → 12. At 50 fps, 100 → 30, 120 → 25, 150 → 20. At 24 fps, 120 → 12, 90 → 16. A GIF is resampled from the 60 fps master at 25 fps (GIF delays are whole hundredths of a second, so 30 fps would play fast); its beats need not be whole frames, because the timing lives in the master.
- If the user supplies music, measure its BPM first and choose fps and grid from it. If it will not land on whole frames, keep 60 fps and snap cues to the nearest frame of the real beat times (store them in `CUE` with a trailing `// offgrid: <reason>` comment), rather than re-timing the track.

## 3. Durations by format, in bars

| Format | Tempo | Length | Bars at that tempo | Shape |
|---|---|---|---|---|
| Launch film | 100 (crisp 120) | 20–45 s | 8–18 bars + tail at 100 | 6–8 story beats per 30 s (crisp 8–10); acts of 2–4 bars |
| Product / feature video | 100 | 8–30 s | 4–12 bars | one capability per 3–4 bars (8–10 s) |
| Feature loop | 100 (or 120) | 4–15 s | 2–6 **whole** bars, no tail | e.g. 9.6 s = 4 bars at 100; 8 s = 4 bars at 120 |
| Logo sting | 100–120 | 3–8 s | e.g. `b(3) + 60` = 5.8 s at 100, `b(3,2) + 60` = 6.0 s at 120 | 1 bar build, lockup hit on a downbeat, building hold, tail |
| UI walkthrough | 90–100 | 20–90 s | 60 s ≈ 25 bars at 100 | one chapter per 2–4 bars, chapter changes on downbeats |

- Every film except a loop ends with a **tail of at least 60 f** after the last event, so the audio decays to digital zero on the last frame (see `references/sound.md`).
- A loop's length is a whole number of bars and has no tail: frame `TOTAL − 1` must flow into frame 0 (see `references/formats.md`).

## 4. The `timeline.ts` pattern

`src/timeline.ts` is the only file with timing in it. The starter ships this shape with a short demo; keep the export names (`FPS`, `BPM`, `PACE_NAME`, `PACE`, `W`, `H`, `BEAT`, `BAR`, `b`, `f60`, `TAIL`, `ACT`, `TOTAL`, `CUE`, `Copy`, `line`, `chain`, `COPY`, `READ`, `copy`, `chainOf`), because `src/sync.ts`, `scripts/export-cues.ts` and `scripts/grid-check.ts` import them. Keep it free of React and CSS imports: Node scripts load it directly. A 30 s launch film at the calm default looks like this:

```ts
// src/timeline.ts: the only place timing lives. Picture, cue export and grid-check import it.
import { holdFor, PACE, readingWindows, revealFor, wordCount, type PaceName } from './lib/pace'; // pure data, Node-safe; line(), chain() and READ use them
export { PACE } from './lib/pace';

export const FPS = 60;
export const BPM = 100;
export const PACE_NAME: PaceName = 'calm'; // 'crisp' for a brief that asks for energy (at 120 BPM)
export const W = 1920;
export const H = 1080;
export const BEAT = (60 / BPM) * FPS; // 36 f
export const BAR = BEAT * 4; // 144 f = 2.4 s

/** Frame of a bar (1-based), a beat inside it (0-3) and a 16th inside that beat (0-3, fractions allowed). */
export const b = (bar: number, beat = 0, sub = 0) => Math.round(((bar - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));

/** After the last bar the picture holds while the audio decays to digital silence. */
export const TAIL = FPS;

// Acts: contiguous, bar-aligned, absolute frames. One <Sequence> and one <Composition> each.
export const ACT = {
  hook: { from: b(1), dur: b(4) - b(1) }, // 0-7.2 s: inside the problem
  turn: { from: b(4), dur: b(5) - b(4) }, // 7.2-9.6 s: the device becomes the mark
  proof: { from: b(5), dur: b(10) - b(5) }, // 9.6-21.6 s: two capabilities, 2-3 bars each
  end: { from: b(10), dur: b(13) + TAIL - b(10) }, // 21.6-29.8 s: payoff, lockup, tail
};
export const TOTAL = b(13) + TAIL; // 1788 f = 29.8 s

// Named cues: absolute frames on the 16th grid. A cue that must sit off the grid carries a
// trailing `// offgrid: <reason>` comment, which grid-check accepts.
export const CUE = {
  deviceIn: b(1, 1), // the device lands on the first tick
  problem: b(1, 2), // the first fragment arrives (readable by 2 s)
  overflow: b(2, 1), // the picture beat: meetings pile into the week and overflow it
  implode: b(3, 3), // the line has cleared; everything collapses into the device
  silence: b(3, 3, 2), // an 8th of true silence...
  drop: b(4), // ...then the drop: the mark assembles
  lockup: b(4, 2),
  feat1: b(5),
  feat2: b(7, 2),
  payoff: b(10),
  lockupEnd: b(11, 2),
  url: b(12),
  final: b(13),
};

export type Copy = {
  id: string;
  text: string; // exactly what is on screen: one fragment
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
  kind?: 'copy' | 'ui'; // 'ui': a string the product shows (a typed command, a URL, an app label); counted apart
  chain?: string; // the thought this fragment belongs to
  mode?: 'build' | 'replace'; // build: appends to one held line; replace: takes the last fragment's place
};
// line() and chain() ship in the starter's timeline.ts (described after this block). Both time a fragment
// from PACE[PACE_NAME]: resolved = in + revealFor(words) = in + 11 * (words - 1) + 36 at the calm pace.
// Every on-screen word, one entry per fragment: the budget, the holds and the text-flow checks read this list.
export const COPY: Copy[] = [
  ...chain('problem', 'build', [
    ['Your week', CUE.problem - 1], // resolved at 118 f, read by 178 f
    ['doesn’t fit.', b(2, 3) - 1], // 73 f of picture beat after the first fragment was read
  ]), // the full line holds 74 f, then clears together into the implosion
  line('feat1', 'Meetings move over.', CUE.feat1 + 20, b(6, 1)),
  line('payoff', 'Everything fits.', CUE.payoff - 1, CUE.lockupEnd - 12),
  { ...line('url', 'tessel.app', CUE.url, TOTAL), kind: 'ui' },
];
// When each entry is being read: the reading windows every check uses (grid-check, layout-audit,
// measure-speed and forensics, through out/cues.json). Nothing new starts inside one.
export const READ = readingWindows(COPY, PACE[PACE_NAME], FPS, TOTAL);

/** One COPY entry by id: acts read their text and timing from here, so the budget stays true. */
export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};
```

**`line(id, text, in, out?)`** is one standalone fragment; `out` defaults to `resolved` plus its reading hold. **`chain(id, mode, [[text, inFrame], …], { out? })`** turns one thought into one `Copy` entry per fragment, with ids `<id>.1`, `<id>.2`, … and `chain: id` and `mode` on each; `chainOf(id)` returns them in order:
- `resolved` comes from the pace, `in + revealFor(words)` = `in + stagger · (words − 1) + wordDur` (calm 11 f and 36 f; crisp 6 f and 26 f), so it matches what `Words` and `Chain` render.
- `out` comes from the mode. **build:** every fragment stays until the whole line clears, at `out` (by default the last fragment's `resolved` plus the hold for the line's full word count), and they leave together over 24 f. **replace:** a fragment leaves whole over `exitDur` (24 f when calm) and has gone 6 f before the next one rises in its place (`out = next.in − exitDur − 6`), and the last one leaves at `out` (by default after its own reading hold). Pass `{ out }` to hold the line to a cue, as the starter does for its exit.
- You choose only where each fragment starts. Put every `in` on the grid at `b(n, beat) − 1` (the first visible change on the beat), and leave a picture beat of 30–90 f between the moment one fragment has been read (`resolved` + its hold) and the next fragment's `in`. In that gap the picture does what the words set up, and a cue marks it: `grid-check.ts` measures the gap as `chain-gap` and wants a cue inside it (`chain-beat`); nothing new starts during the read itself (`read-quiet`).
- Render the chain with `<Chain chain="problem" frame={f} from={ACT.hook.from} />` (`src/fx/Chain.tsx`), which reads the entries by chain id, so picture, sound and checks see the same frames. `export-cues.ts` writes every `COPY` entry into the `copy` block of `out/cues.json` as `{id, text, in, resolved, out, words, kind, chain?, mode?, read}` (`read`: its reading windows from `READ`), and `src/sync.ts` gives each fragment one soft `text` event on the frame it visibly lands (`chainResolves(id, { size })`, at the size the act sets the chain at), never one per word.

Rules the pattern encodes:
- The beat must be whole: `grid-check.ts` fails otherwise.
- `ACT` entries are contiguous (`from` = previous `from + dur`) and start on bar lines, so an act can be rendered, reviewed and spliced alone. The last act absorbs `TAIL`.
- Acts render their words from `copy('payoff').text` or `<Chain>`, never a second literal, so the word count and the text-flow checks always see what is on screen (`lint-film.mjs` flags a literal as `copy-literal`).
- Inside an act, convert once: `const L = (abs: number) => abs - ACT.proof.from;` then use `L(CUE.feat2)` everywhere. Never mix absolute and local frames in one expression.
- **Anything the sound needs is exported from the act module as a named constant** (`LANDINGS`, `SNAP`, `KEY_FRAMES`, `PEAKS`), computed by the same code that drives the picture. `src/sync.ts` imports those constants and turns them into events for `out/cues.json`; the schema and event kinds are in `references/sound.md`.

```ts
// src/acts/Act3.tsx: export sync points next to the motion that makes them
import { E, SPR } from '../lib/anim';
import { hit, peak } from '../lib/sync';
import { ACT, CUE } from '../timeline';

const L = (abs: number) => abs - ACT.proof.from;
export const WHIP = { from: L(CUE.feat2) - 16, to: L(CUE.feat2) + 12 }; // act-local
const CARDS_AT = [20, 28, 36]; // act-local spring starts
/** Absolute frames for src/sync.ts: whoosh apex and card landings. */
export const PEAKS = { whip: ACT.proof.from + peak(WHIP.from, WHIP.to, E.whip) };
export const LANDINGS = CARDS_AT.map((s) => ACT.proof.from + hit(s, SPR.snap, 1));
```

## 5. Putting cues on the grid

| Event | Where it lands | Why |
|---|---|---|
| Section (act) change | a downbeat: `b(n)`, with the music's own event (drop, stop, re-entry) | the ear expects change on the one |
| Cut or new shot inside a section | an 8th: `b(n, beat)` or `b(n, beat, 2)`, with no sound of its own (the music carries it) | on-grid but not every cut on the one |
| A major move's velocity peak | a beat or an 8th; a whoosh apex on it only for a camera-scale move or a logo zoom (about 2 a film) | the eye reads a move's event at its fastest frame, not its start |
| Batch of landings | 16ths, first item on the beat, 0–3 f spread inside each 16th | six objects on one frame read as a single blob |
| Wave or tile snaps | the 32nd grid (4.5 f at 100/60, 3.75 f at 120/60) | dense enough to read as one gesture, still on the pulse |
| Payoff and its consequence | payoff on the clap (`b(n, 2)`), its consequence on the next kick (`b(n, 2, 2)` in Tessel's pattern) | micro-rhythm inside a bar |
| Designed freeze | exactly on a silence, ≤ 15 f | stillness only reads as intent when the sound stops too |

Snap computed times to the grid instead of rounding by eye:

```ts
import { BEAT } from '../timeline';
import { rand } from '../lib/anim';

const S16 = BEAT / 4; // 9 f at 100/60, 7.5 f at 120/60
/** Nearest 16th, then a 0-3 f human spread (seeded) so a batch reads as a roll, not a blob. */
export const on16 = (f: number, seed: string) => Math.round(Math.round(f / S16) * S16) + Math.round(rand(seed) * 3);
```

**Cuts and big moves land on the grid; the music carries them.** Every hard cut or seam, and the velocity peak of every major move (a whip, a flood, a camera push between shots), sits on a grid beat. Solve a move's start from where its speed peaks (`peak()` in §7, the way the starter's dot flight does), so the peak is the beat rather than the start. A transition that peaks a quarter-second after its beat reads as loose even to viewers who can't say why. Most cuts get no dedicated sound (measured norms of top-tier launch films: about 85% of hard cuts, and under 5% get a whoosh): section changes and the hero reveal land with the music's own event (the drop, a stop, the re-entry), and a whoosh (onset 100–450 ms ahead, apex on the visual peak) goes only on a camera-scale move or a logo zoom. `av-audit.py` suggests a music event when one of the film's 3 biggest picture changes has no audio onset within ±3 f.

A cue that must sit off the grid (a whoosh apex on a computed velocity peak, a cursor click on a human gap) is fine. Give it a trailing `// offgrid: <reason>` comment on its `CUE` line, which `grid-check.ts` accepts; unexplained off-grid cues fail the check. Computed sync points exported from acts (`peak()`, `hit()`) are off-grid by nature and need no comment.

## 6. Hit frames: where the picture changes

- **Start a change at `cue − 1`.** `prog(f, a, b, ease)` returns 0 on frame `a`, so a tween that starts on the cue shows no change until the frame after the sound. Starting at `cue − 1` puts the first visible change on the hit frame.
- **Pulses peak 2 f after their sound.** `hitPulse(f − cue)` has a 2 f attack by default; that small lag reads as cause and effect. Details and amplitudes are in `references/motion-tokens.md`.
- **Springs: place the start so the visible moment lands on the beat.** A pop reads at 50% travel, an impact at 92–100%. Start the spring at `beat − delayTo(cfg, thr)`.
- **Tweens: put the sound on the 97% frame** (`settleOf`), not the last frame, which the eye cannot distinguish from the frames before it.

```ts
import { E, SPR, prog, spr } from '../lib/anim';
import { delayTo } from '../lib/sync';
import { ACT, CUE } from '../timeline';

const L = (abs: number) => abs - ACT.turn.from;
const LOCK = L(CUE.lockup);
const START = LOCK - delayTo(SPR.snap, 1); // the piece reaches its slot on the beat
// inside the component, with f = useCurrentFrame():
const pieceY = (f: number) => Math.min(0, (1 - spr(f, START, SPR.snap)) * -420); // clamped at its slot
const flash = (f: number) => prog(f, LOCK - 1, LOCK + 12, E.out); // first visible change on the hit
```

## 7. Sync helpers

`src/lib/sync.ts` computes sync points from the same easing and spring objects the picture uses. Never type a sync frame by hand: in Tessel, hand-placed whooshes landed 8–11 f off.

```ts
// src/lib/sync.ts (as shipped in the starter)
import { spring } from 'remotion';
import { FPS } from '../timeline';
import type { Ease, Spr } from './anim';

const STEPS = 400;

/** Frame of peak velocity of a tween from frame a to b with `ease` (where a whoosh's apex goes). */
export const peak = (a: number, b: number, ease: Ease): number => {
  let best = a;
  let bestV = -Infinity;
  for (let i = 0; i < STEPS; i++) {
    const t = i / STEPS;
    const v = Math.abs(ease(Math.min(1, t + 1 / STEPS)) - ease(t));
    if (v > bestV) {
      bestV = v;
      best = a + (t + 0.5 / STEPS) * (b - a);
    }
  }
  return Math.round(best);
};

/** Frames after its start until a spring first reaches `thr` of its travel (0.5 = pop, 1 = contact). */
export const delayTo = (cfg: Spr, thr = 1): number => {
  // 5e-4 tolerance: an overdamped spring approaches 1 without ever reaching it exactly.
  for (let f = 0; f < FPS * 4; f++) if (spring({ frame: f, fps: FPS, config: cfg }) >= thr - 5e-4) return f;
  throw new Error(`delayTo: spring never reached ${thr} within 4 s (${JSON.stringify(cfg)})`);
};

/** Absolute frame a spring started at `start` first reaches `thr` (1 = contact for impacts, 0.92 for soft snaps). */
export const hit = (start: number, cfg: Spr, thr = 1): number => start + delayTo(cfg, thr);

/** First frame an eased tween from a to b reaches `thr` of its travel (0.97 = where a settle sound goes). */
export const settleOf = (a: number, b: number, ease: Ease, thr = 0.97): number => {
  for (let f = Math.ceil(a); f < b; f++) if (ease((f - a) / (b - a)) >= thr) return f;
  return Math.ceil(b);
};
```

Which helper for which sound:

| Picture event | Helper | Threshold |
|---|---|---|
| Impact, landing, lock-in | `hit(start, cfg, 1)` | 1.0 (0.92 when the spring is nearly at rest before it arrives, e.g. tiles) |
| Pop-in (scale from 0, a badge) | `hit(start, cfg, 0.5)` | 0.5 |
| Tween that settles | `settleOf(a, b, ease)` | 0.97 |
| Whoosh, whip, camera move | `peak(a, b, ease)` | velocity maximum |
| Tween into contact (`E.contact`) | the tween's last frame | it arrives with velocity |

Measured with the starter's presets and helpers (Remotion 4.0.529, 60 fps):

| Spring | 50% | 92% | 97% | `delayTo(…, 1)` | Overshoot |
|---|---|---|---|---|---|
| `SPR.snap` 18/260/0.7 | 5 f | 9 f | 9 f | 10 f | 6% |
| `SPR.pop` 11/180/0.6 | 5 f | 8 f | 9 f | 9 f | 14% |
| `SPR.land` 14.5/200/1 | 6 f | 10 f | 10 f | 11 f | 15% |
| `SPR.micro` 30/500/0.6 | 4 f | 8 f | 9 f | 11 f | 0.4% |
| `SPR.firm` 24/140/1 | 9 f | 22 f | 28 f | 51 f (at rest) | 0% |
| `SPR.soft` 26/120/1 | 10 f | 23 f | 30 f | 55 f (at rest) | 0% |
| `SPR.heavy` 30/90/1.4 | 13 f | 32 f | 40 f | 75 f (at rest) | 0% |

A spring with no overshoot only approaches 1, so `delayTo(…, 1)` returns the frame it comes within 0.05% of rest: 55 f for `soft`, long after the eye saw it arrive. Cue those at 0.92–0.97, and use an overshooting spring (or a tween on `E.contact`) for anything that must land with an impact.

## 8. Schedules: rolls, cascades, ripples

- **A roll into a hit accelerates.** Gaps shrink toward the hit like a drum roll: `land_k = start + (k/(N−1))^0.8 · span`. A decelerating schedule (`1 − (1 − t)^0.55`) was the first Tessel attempt and read as the energy draining before the drop.

```ts
import { CUE } from '../timeline';
const N = 60; // Tessel's meeting rain: 60 landings, gaps shrinking toward the implosion
export const RAIN_AT = Array.from({ length: N }, (_, k) =>
  Math.round(CUE.deviceIn + Math.pow(k / (N - 1), 0.8) * (CUE.implode - 2 - CUE.deviceIn)),
);
```

- **Batches** land on the 16th grid with a 0–3 f seeded spread (`on16` above), first item exactly on the beat.
- **Ripples and waves** take their delay from distance (1 f per 60 px, from the centre or the cause outward), then snap the landing, not the start, to the grid. Tessel's quilt snapped each tile's spring hit to the 32nd grid: `Math.round((22 + dist·21 + TILE_HIT) / 3.75) · 3.75 − TILE_HIT`, with `TILE_HIT = delayTo(TILE_SPR, 0.92)`.
- **Typing** follows its own weighted cadence (about 20 characters/s when the line is read live at the calm pace, about 30 in crisp, then at least 72 f of read hold); the schedule and its exported `KEY_FRAMES` are in `references/product-ui.md`. Stagger constants for words, grids and lists are in `references/motion-tokens.md`.

## 9. Holds, reading time and density

**Holds.** The calm column is the default; a film that sets `PACE_NAME = 'crisp'` uses the right-hand one, and `grid-check.ts` follows it.

| Rule | Calm (default) | Crisp | Why |
|---|---|---|---|
| Fragment hold after it resolves | max(60, 42 + 8 f per word): 1–2 words 60 f, 3 → 66 f, 4 → 74 f | 36 f + 6 f per word | about 0.7 s to find the fragment, then a word every 8 f, read while watching motion |
| Build line hold, after its last fragment | 42 + 8 f per word of the whole line (90 f at 6 words, 106 f at 8) | 36 f + 6 f per word of the line | the finished line is read once more as a whole |
| Picture beat between fragments of a chain | 30–90 f, from the earlier fragment being read to the next one's `in`, with a cue in it | 18–90 f | the picture acts; past 90 f the viewer loses the start of the thought |
| Reading windows (`READ`) | from `resolved` for at most 150 f; an earlier fragment of a chain only for its own hold; a build line once more after its last fragment | at most 120 f | one rule for every check: a read counts as alive in the event-gap check, nothing new starts inside one, and the frame stays near still |
| Words per fragment | ≤ 4 | ≤ 5 | one glance |
| Words visible at once | ≤ 8 in a build chain, ≤ 5 in replace mode | ≤ 10 | one line per thought |
| Copy rate | ≤ 6 words resolving in any 5 s (1.2 words/s); ≤ 0.9 words/s over the film; ≤ 30 words | ≤ 2 words/s in any 5 s; ≤ 1.2 over the film; ≤ 35 words | the measured films ran 0.4–1.9 words/s; calm sits at the low end |
| Text share | film copy on ≤ about 65% of the body frames; a text-free run of ≥ 90 f in every 10 s | ≤ 80%; a text-free run of ≥ 60 f in every 10 s | the picture needs stretches of its own |
| Unresolved text | never exits | never exits | a line that leaves mid-reveal reads as a mistake |
| Life in a hold | a reading hold with a 0.3–1 px/f drift or a 1–3% creep is alive; anywhere else, ≤ 72 f without a visible event | ≤ 48 f without a visible event | past that, a muted feed reads a frozen frame as a stalled player; slow life is not a stall |
| Designed freeze | ≤ 15 f, exactly on a silence | the same | stillness is intent only when the sound agrees |
| End card | 1.5–2.5 s: assembly 60–80 f, then 36–80 f still or creeping ≤ 6% (a 10–20% push if the hold runs past ~1.3 s) | the same | a 2.75 s static lockup was flagged dead in every Tessel round |
| URL readable | ≥ 1.7 s | ≥ 1.7 s | long enough to read and remember |
| Product result before the camera leaves | ≥ 60 f | ≥ 36 f | cause → action → result needs the result to land |
| Tail after the last event | ≥ 60 f | ≥ 60 f | the audio decays to digital zero |

Check a hold while writing `COPY` (`grid-check.ts` runs the full set, build lines and chains included):

```ts
import { COPY } from '../timeline';
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const holdFor = (n: number) => Math.max(60, 42 + 8 * n); // calm; crisp: 36 + 6 * n
for (const l of COPY)
  if (l.out - l.resolved < holdFor(words(l.text)))
    throw new Error(`${l.id}: hold ${l.out - l.resolved} f < ${holdFor(words(l.text))} f`);
```

**Density**

| Measure | Calm (default) | Crisp |
|---|---|---|
| Discrete animation events | 24–36 per 30 s | 45–60 per 30 s |
| Motion peaks | one hero move per bar (2.4 s), with slow life cruising between | one per bar, with 30–70 f of calm between peaks |
| Visible change | about every 1 s, with continuous slow life between | about every 0.5 s (every beat at 120 BPM) |
| First 6 s | frame 0 moving; when the film opens on words, the first fragment readable by about 1 s | about 2× as dense as the middle |
| Shot length | median 100–160 f, maximum 240 f in a cut-driven film | median 60–90 f, maximum 180 f |
| Shortest shot; continuous takes | 24 f, only without text; a take of 300–560 f with an in-shot beat at least every 72 f | the same |
| Fast moves | ordinary moves ≤ 25 px/f; at most 2 fast moves per film, at most 1 of them a whip; none while text is being read | whips of 60–70 px/f beside real stillness |
| Story beats | 6–8 per 30 s; 1–2 product capabilities | 8–10 per 30 s; 1–2 capabilities |

**Calm is not sparse.** Blind reviews of earlier versions marked films down for quiet stretches and static end cards (`docs/evaluation.md`, rounds 4–5). The calm profile keeps every lesson from them: frame 0 moving, slow drift or creep in every hold, the device and the product's state alive, the energy arc (an early peak, a designed lull of 1–4 s, the biggest peak at 75–90%), a last third that keeps moving and an end card that builds. Slower and fewer is different from frozen, and peaks come from one hero move per section, never from more text.

**Hook (first 2 s)**
- Frame 0 is already composed and moving. No fade from black, no blank frame.
- Something visibly changes about every 1 s (calm) or 0.5 s (crisp), and the picture never freezes between.
- The problem is felt by 1 s and stated by 2 s.

## 10. The Tessel grid, worked

Tessel ran at 120 BPM, 60 fps: beat 30 f, bar 120 f, 8th 15 f, 16th 7.5 f. The full story is in `references/worked-example.md`.

| Act | Bars | Start | Length | What lands on the grid |
|---|---|---|---|---|
| fit | 1–3 | 0 s | 6 s | iris lands on the first tick `b(1,1)`; headline `b(3)`; implosion `b(3,3)`, silence `b(3,3,2)` |
| mark | 4–5 | 6 s | 4 s | drop `b(4)`: the mark assembles; lockup `b(4,1,2)`; fly-in `b(5,2)` |
| prompt | 6–7 | 10 s | 4 s | typing `b(6,2)`–`b(7,2)`; click `b(7,3)` |
| plan | 8–9 | 14 s | 4 s | drop `b(8)`; 34 landings on 16ths `b(8,1)`–`b(9,1)` |
| feat | 10–12 | 18 s | 6 s | one feature per bar; payoff on the clap (+60 f), consequence on the kick (+75 f) |
| end | 13–16 + tail | 24 s | 9 s | "fits." `b(15)`; URL `b(16)`; final tick `b(16,3)`; 60 f tail |

Hold lessons from five critique rounds:
- The 0.6 s static dot after the opening iris read as a stalled player. Fix: the line draws 0.25 s after the iris lands, the grid at 1.0 s, the rain from 1.5 s.
- The headline hold of 1.5 s (`b(3)` to `b(3,3)`) then implosion was right.
- One 2-word, 2-line statement per bar (2 s) at 120 px read well: Tessel is the crisp profile. A calm film carries one 2–3 word fragment per 1–1.5 bars of 2.4 s at 100 BPM.
- The 2.75 s logo hold was flagged as dead air in every round, even with a 1.0 → 1.1 dolly and beat pulses. Keep a lockup hold ≤ 1.5 s, or make it build visibly (≥ 20% dolly).

## 11. Checks

- `npx tsx scripts/grid-check.ts src/timeline.ts` (against the film's `PACE_NAME`; `--pace calm|crisp` overrides it, and a timeline written before `PACE_NAME` existed is checked as crisp): whole-frame beat, contiguous bar-aligned acts, cues on the 16th grid (or explained), reading holds, no gap without an event or a reading hold over 72 f (48 f crisp), word total within budget, and the text flow: `fragment`, `copy-concurrent`, `read-first`, `reveal-rate`, `chain-gap`, `chain-beat`, `read-quiet`, `word-rate`, `text-share` (in a calm film a picture beat that is missing or under 30 f, two lines arriving together and copy on more than 75% of the body fail). A HyperFrames project: `node scripts/grid-check.ts timeline.js`.
- `npx tsx scripts/export-cues.ts`: writes `out/cues.json`; open it and confirm every visible event has an event and vice versa.
- Stills at every cue −2, 0 and +2 frames (`npx remotion still Film out/qa/f<n>.png --frame=<n>`): the change must be visible on the cue frame, not the one after.
