# Timing grid

Covers the beat grid: choosing BPM and fps, writing `src/timeline.ts`, putting cues on the grid, computing sync points from the picture code, and budgeting holds and density. Read it before Step 3 (Timeline), and again whenever a hit feels early, late or dead.

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
| 100 | 36 f | 18 | 9 | 144 f | 2.4 | walkthroughs, product videos |
| **120** | **30 f** | **15** | 7.5 | **120 f** | **2.0** | **default**: launch films, loops, stings |
| 144 | 25 f | 12.5 | 6.25 | 100 f | 1.67 | energetic teasers (8ths are fractional) |
| 150 | 24 f | 12 | 6 | 96 f | 1.6 | teasers with whole 16ths |
| 180 | 20 f | 10 | 5 | 80 f | 1.33 | stings and fast cut sections only |

- **120 at 60 fps is the default.** Beat 30 f, bar exactly 2 s, every 8th whole. The 16th is 7.5 f; `b()` rounds it (8, 15, 23), which is fine for landings. When a section needs whole 16ths (typing, ratchets, ripple waves), choose 90, 100 or 150.
- **Use 60 fps whenever UI, text or the camera moves.** At 30 fps slow drifts step and fast moves strobe. Never use 24 fps for UI.
- **Other frame rates** (same formula): at 30 fps, 120 → 15 f, 100 → 18, 90 → 20, 150 → 12. At 50 fps, 100 → 30, 120 → 25, 150 → 20. At 24 fps, 120 → 12, 90 → 16. A GIF is resampled from the 60 fps master at 25 fps (GIF delays are whole hundredths of a second, so 30 fps would play fast); its beats need not be whole frames, because the timing lives in the master.
- If the user supplies music, measure its BPM first and choose fps and grid from it. If it will not land on whole frames, keep 60 fps and snap cues to the nearest frame of the real beat times (store them in `CUE` with a trailing `// offgrid: <reason>` comment), rather than re-timing the track.

## 3. Durations by format, in bars

| Format | Tempo | Length | Bars at that tempo | Shape |
|---|---|---|---|---|
| Launch film | 120 | 20–45 s | 10–22 bars + tail | 8–10 story beats per 30 s; acts of 2–4 bars |
| Product / feature video | 100–120 | 8–30 s | 4–15 bars | one capability per 4–5 bars (8–10 s) |
| Feature loop | 120 (or 100) | 4–15 s | 2–7 **whole** bars, no tail | e.g. 8 s = 4 bars at 120; 9.6 s = 4 bars at 100 |
| Logo sting | 120 | 3–8 s | e.g. `b(3,2) + 60` = 6.0 s | 1 bar build, lockup hit on a downbeat, building hold, tail |
| UI walkthrough | 90–110 | 20–90 s | 60 s ≈ 25 bars at 100 | one chapter per 2–4 bars, chapter changes on downbeats |

- Every film except a loop ends with a **tail of at least 60 f** after the last event, so the audio decays to digital zero on the last frame (see `references/sound.md`).
- A loop's length is a whole number of bars and has no tail: frame `TOTAL − 1` must flow into frame 0 (see `references/formats.md`).

## 4. The `timeline.ts` pattern

`src/timeline.ts` is the only file with timing in it. The starter ships this shape with a short demo; keep the export names (`FPS`, `BPM`, `W`, `H`, `BEAT`, `BAR`, `b`, `TAIL`, `ACT`, `TOTAL`, `CUE`, `Copy`, `COPY`, `copy`), because `src/sync.ts`, `scripts/export-cues.ts` and `scripts/grid-check.ts` import them. Keep it free of React and CSS imports: Node scripts load it directly. A 31 s launch film looks like this:

```ts
// src/timeline.ts: the only place timing lives. Picture, cue export and grid-check import it.
export const FPS = 60;
export const BPM = 120;
export const W = 1920;
export const H = 1080;
export const BEAT = (60 / BPM) * FPS; // 30 f
export const BAR = BEAT * 4; // 120 f = 2 s

/** Frame of a bar (1-based), a beat inside it (0-3) and a 16th inside that beat (0-3, fractions allowed). */
export const b = (bar: number, beat = 0, sub = 0) => Math.round(((bar - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));

/** After the last bar the picture holds while the audio decays to digital silence. */
export const TAIL = FPS;

// Acts: contiguous, bar-aligned, absolute frames. One <Sequence> and one <Composition> each.
export const ACT = {
  hook: { from: b(1), dur: b(4) - b(1) }, // 0-6 s: inside the problem
  turn: { from: b(4), dur: b(6) - b(4) }, // 6-10 s: the device becomes the mark
  proof: { from: b(6), dur: b(12) - b(6) }, // 10-22 s: two capabilities, 3 bars each
  end: { from: b(12), dur: b(16) + TAIL - b(12) }, // 22-31 s: payoff, lockup, tail
};
export const TOTAL = b(16) + TAIL; // 1860 f = 31 s

// Named cues: absolute frames on the 16th grid. A cue that must sit off the grid carries a
// trailing `// offgrid: <reason>` comment, which grid-check accepts.
export const CUE = {
  deviceIn: b(1, 1), // the device lands on the first tick
  problem: b(2), // headline on the downbeat (stated by 2 s)
  implode: b(3, 3), // everything collapses into the device
  silence: b(3, 3, 2), // an 8th of true silence...
  drop: b(4), // ...then the drop: the mark assembles
  lockup: b(4, 2),
  feat1: b(6),
  feat2: b(9),
  payoff: b(13),
  lockupEnd: b(14, 2),
  url: b(15),
  final: b(16),
};

export type Copy = {
  id: string;
  text: string; // exactly what is on screen (\n separates lines)
  in: number; // first frame any of it is visible
  resolved: number; // first frame it is fully readable
  out: number; // first frame it starts to leave (TOTAL if it stays)
};
/** A line revealed word by word, `stagger` frames apart, each word taking `dur` frames (match the act's <Words>). */
const line = (id: string, text: string, inF: number, out: number, stagger = 6, dur = 26): Copy => ({
  id,
  text,
  in: inF,
  resolved: inF + (text.split(' ').length - 1) * stagger + dur,
  out,
});
// Every on-screen word: the word budget and the hold check read this list.
export const COPY: Copy[] = [
  line('problem', 'Your week doesn’t fit.', CUE.problem - 1, CUE.implode),
  line('feat1', 'Meetings move over.', CUE.feat1 + 20, b(8, 2)),
  line('payoff', 'Everything fits.', CUE.payoff - 1, CUE.lockupEnd - 12),
  line('url', 'tessel.app', CUE.url, TOTAL),
];

/** One COPY entry by id: acts read their text and timing from here, so the budget stays true. */
export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};
```

Rules the pattern encodes:
- The beat must be whole: `grid-check.ts` fails otherwise.
- `ACT` entries are contiguous (`from` = previous `from + dur`) and start on bar lines, so an act can be rendered, reviewed and spliced alone. The last act absorbs `TAIL`.
- Acts render their words from `copy('payoff').text`, never a second literal, so the word count and the hold check always see what is on screen.
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
| Section (act) change | a downbeat: `b(n)` | the ear expects change on the one |
| Cut or new shot inside a section | an 8th: `b(n, beat)` or `b(n, beat, 2)` | on-grid but not every cut on the one |
| Batch of landings | 16ths, first item on the beat, 0–3 f spread inside each 16th | six objects on one frame read as a single blob |
| Wave or tile snaps | the 32nd grid (3.75 f at 120/60) | dense enough to read as one gesture, still on the pulse |
| Payoff and its consequence | payoff on the clap (`b(n, 2)`), its consequence on the next kick (`b(n, 2, 2)` in Tessel's pattern) | micro-rhythm inside a bar |
| Designed freeze | exactly on a silence, ≤ 15 f | stillness only reads as intent when the sound stops too |

Snap computed times to the grid instead of rounding by eye:

```ts
import { BEAT } from '../timeline';
import { rand } from '../lib/anim';

const S16 = BEAT / 4; // 7.5 f at 120/60
/** Nearest 16th, then a 0-3 f human spread (seeded) so a batch reads as a roll, not a blob. */
export const on16 = (f: number, seed: string) => Math.round(Math.round(f / S16) * S16) + Math.round(rand(seed) * 3);
```

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
- **Typing** follows its own weighted cadence (about 30 characters/s); the schedule and its exported `KEY_FRAMES` are in `references/product-ui.md`. Stagger constants for words, grids and lists are in `references/motion-tokens.md`.

## 9. Holds, reading time and density

**Holds**

| Rule | Number | Why |
|---|---|---|
| Text hold after it resolves | ≥ 36 f + 6 f per word | about 0.6 s to find the line plus 3 words/s to read it |
| Unresolved text | never exits | a line that leaves mid-reveal reads as a mistake |
| Anything static | ≤ 48 f | past 0.8 s of no change, a muted feed reads as a stalled player |
| Designed freeze | ≤ 15 f, exactly on a silence | stillness is intent only when the sound agrees |
| Lockup, fully resolved | 1.5–2.0 s, visibly building (≥ 10–20% push) | a 2.75 s static lockup was flagged dead in every Tessel round |
| URL readable | ≥ 1.7 s | long enough to read and remember |
| Product result before the camera leaves | ≥ 36 f | cause → action → result needs the result to land |
| Tail after the last event | ≥ 60 f | the audio decays to digital zero |

Check a hold while writing `COPY`:

```ts
import { COPY } from '../timeline';
const holdFor = (text: string) => 36 + 6 * text.split(' ').length;
for (const l of COPY)
  if (l.out - l.resolved < holdFor(l.text)) throw new Error(`${l.id}: hold ${l.out - l.resolved} f < ${holdFor(l.text)} f`);
```

**Density**

| Measure | Target |
|---|---|
| Discrete animation events | 45–60 per 30 s |
| Motion peaks | one per bar, with 30–70 f of calm between peaks |
| First 6 s | about 2× as dense as the middle |
| Shot length | median 60–90 f; minimum 24 f (only without text); maximum 180 f (only with continuous action) |
| Story beats | 8–10 per 30 s; 1–2 product capabilities |

**Hook (first 2 s)**
- Frame 0 is already composed and moving. No fade from black, no blank frame.
- Something visibly changes about every 0.5 s (every beat at 120 BPM).
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
- One 2-word, 2-line statement per bar (2 s) at 120 px read well.
- The 2.75 s logo hold was flagged as dead air in every round, even with a 1.0 → 1.1 dolly and beat pulses. Keep a lockup hold ≤ 1.5 s, or make it build visibly (≥ 20% dolly).

## 11. Checks

- `npx tsx scripts/grid-check.ts src/timeline.ts`: whole-frame beat, contiguous bar-aligned acts, cues on the 16th grid (or explained), text holds, no event-free gap over 48 f, word total within budget.
- `npx tsx scripts/export-cues.ts`: writes `out/cues.json`; open it and confirm every visible event has an event and vice versa.
- Stills at every cue −2, 0 and +2 frames (`npx remotion still Film out/qa/f<n>.png --frame=<n>`): the change must be visible on the cue frame, not the one after.
