# Content and pacing

What a launch film shows and when: the one case followed from request to result, the motion floor, the typed request,
the status ladder, the output itself, the problem as accumulation, the word-picture sentence, cut rhythm, specifics,
proof by numbers, the arc of a whole film, verb ladders, the cursor as an actor, brand placement, the hook, the text
budget, accelerating swaps, people as content, the integration constellation, the metaphor object, before / after, the
human beat, the world arc, sound-synced events, camera pacing, and four formats (the 2 x 2 grid, the one-beat sizzle,
the one-take world, the voice-over explainer) plus ending inside the action. Each entry gives the job, the numbers, a
build recipe, what makes it rich or cheap, the sound, and a small Remotion 4 helper.

**Units.** Seconds, frames at 30 fps, and shares of the film's length. A "case" is one user, one input and one result.

---

## Pacing in numbers

| measure | aim | house range |
|---|---|---|
| film length | about 25 s | a launch 15-45 s; a sting or a teaser 5-13 s |
| shot length (seam to seam) | about 1.0 s | 0.17-3 s, short and long mixed (about a quarter under 0.5 s, none over 3 s) |
| cuts per 10 s | about 8 | 5-12 (launch 4-9, montage 11-15, grid or sizzle 14-18) |
| a film's median shot | about 1.2 s | 0.55-1.6 s |
| longest shot | 3 s | 2.3-3 s; it is the product demo (the lockup 2.5 s at most) |
| shot-length variation (coefficient) | about 0.7 | 0.54-0.79: long and short alternate |
| neighbouring shots differing by over 1.6x | about 60 % | 50-70 % |
| share of a frame grid changing per second | about 0.26 | 0.12-0.5; the first 10 % of the film about 0.36, the middle 0.41, the last 10 % low (about 0.04) |
| near-still frames | about 23 % | 12-39 % (all creeping holds, not freezes) |
| mid-film holds of 0.8 s or more | 0-1 per 25 s | each about 1.1 s, 1.6 s at most |
| end hold | 2 s at most after the mark is whole | the lockup 2.5 s at most |
| camera moving | about 30 % of frames | 22-41 % |
| camera moves per 10 s | about 4.8 | 3.7-6.8; each about 0.44 s |
| visible elements changing per second | about 9 | 8-15 |
| sound onsets per second | about 6 | 5.3-6.7 |
| music tempo | about 120 BPM | 111-136 |
| loudness | about -15 LUFS integrated | -19 to -14 |
| scene changes with a sound within 1.5 f | 60 % or more | |
| cuts on a beat | not a target | cut on the action, not the metronome |

## Shared kit (`pace.ts`)

Every helper imports this file: seconds and frames, a seeded random, eases (`E.arrive`, `E.front`, `E.glide`, `E.exit`),
a ramp, and per-frame table helpers.

```ts
// pace.ts: shared helpers for every content-pacing entry. Remotion 4, CPU only (no WebGL needed).
import {interpolate, Easing, random} from 'remotion';

export const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// House easing tokens (the common families:
// spring, circOut/expoOut arrivals, cubicIn/expoIn exits into cuts, cubicInOut camera glides).
export const E = {
  arrive: Easing.bezier(0.16, 1, 0.3, 1),   // fast start, long settle (expo-out)
  exit: Easing.bezier(0.7, 0, 0.84, 0),     // accelerating exit that hands speed to the cut
  glide: Easing.bezier(0.65, 0, 0.35, 1),   // a camera move that starts, travels and lands
  front: Easing.bezier(0.08, 0.83, 0.2, 1), // front-loaded travel
  linear: Easing.linear,
};

export const ramp = (f: number, a: number, b: number, from = 0, to = 1, easing = E.arrive) =>
  interpolate(f, [a, b], [from, to], {...CLAMP, easing});

/** Hold keeper (`motion-floor`): lockups grow 3-7 % over 1.5-2 s; drifts 0.3-2 px per frame. */
export const creep = (f: number, a: number, b: number, scaleAmt = 0.04, driftPxPerFrame = 0) => {
  const t = Math.max(0, Math.min(f, b) - a);
  return {scale: 1 + (scaleAmt * t) / Math.max(1, b - a), dx: driftPxPerFrame * t};
};

/** Typing (`typed-request`): characters visible at frame f; cpf = characters per frame; pauses[i] = extra frames
 * before character i (line ends 2-4 f). */
export const typedCount = (text: string, f: number, start: number, cpf = 1.4,
                           pauses: Record<number, number> = {}) => {
  if (f < start) return 0;
  const t = f - start;
  let acc = 0;
  for (let n = 0; n < text.length; n++) {
    acc += 1 / cpf + (pauses[n] ?? 0);
    if (acc > t + 1e-6) return n;
  }
  return text.length;
};

/** The house shot-length mix (share of shots per length band): short and long mixed, none over 3 s. */
export const SHOT_BINS = [
  {lo: 0.2, hi: 0.5, p: 0.25}, {lo: 0.5, hi: 1.0, p: 0.25}, {lo: 1.0, hi: 2.0, p: 0.35},
  {lo: 2.0, hi: 3.0, p: 0.15},
];

/** Deterministic shot plan (`cut-rhythm`): durations in seconds that sum to totalS, the last one the lockup.
 *  House rule: 60 % of neighbouring shots differ by more than 1.6x. */
export function planShots(totalS: number, seed: string, endHoldS = 2.4, bins = SHOT_BINS) {
  const draw = (k: string) => {
    let r = random(k), i = 0;
    while (i < bins.length - 1 && r > bins[i].p) { r -= bins[i].p; i++; }
    const b = bins[i];
    return b.lo + (b.hi - b.lo) * random(k + 'x');
  };
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; sum < totalS - endHoldS - 0.4; i++) {
    let d = draw(`${seed}-${i}`);
    const prev = out[out.length - 1];
    if (prev && Math.max(d, prev) / Math.min(d, prev) < 1.6 && random(`${seed}-c${i}`) < 0.6) {
      d = draw(`${seed}-${i}-again`); // push towards long/short contrast
    }
    out.push(d); sum += d;
  }
  const k = (totalS - endHoldS) / sum;          // fit exactly
  return [...out.map((d) => d * k), endHoldS];
}

export const sec = (s: number, fps: number) => Math.round(s * fps);
```

## Index

| # | slug | entry | family |
|---|---|---|---|
| 1 | `one-case` | one case, followed from the request to the result | story |
| 2 | `motion-floor` | every second moves; what keeps a hold alive | pacing |
| 3 | `typed-request` | a specific sentence in the product's own field | content |
| 4 | `status-ladder` | request -> working -> done | content |
| 5 | `show-output` | the output itself, full frame, travelled | content |
| 6 | `problem-pile` | the problem as accumulation, then the collapse into one | story |
| 7 | `word-picture` | a picture chip inside the line | content |
| 8 | `cut-rhythm` | about one shot per second, long and short alternating | pacing |
| 9 | `specifics` | real names, prices, counts and places | content |
| 10 | `proof-numbers` | counters, toasts, grids and charts | content |
| 11 | `film-arc` | where energy rises and where it rests | pacing |
| 12 | `verb-ladder` | two to four parallel lines with one build | story |
| 13 | `cursor-actor` | the cursor as an actor | content |
| 14 | `brand-placement` | where the name appears; the end lockup | story |
| 15 | `hook` | a first line in the first second | story |
| 16 | `text-budget` | line placement and the text-to-picture budget | story |
| 17 | `accelerating-swap` | a run of pictures that speeds up into a landing | pacing |
| 18 | `people-content` | users, personas and problem bearers | content |
| 19 | `integrations` | official logos around the product | content |
| 20 | `metaphor-object` | one object carries the abstract claim | content |
| 21 | `before-after` | before and after on the same layout | story |
| 22 | `human-beat` | a joke, a pause or a surprise | story |
| 23 | `world-arc` | one ground family, changing at the act boundaries | story |
| 24 | `sound-synced` | every event has its own sound | pacing |
| 25 | `camera-pacing` | short purposeful camera moves | pacing |
| 26 | `grid-format` | the 2 x 2 grid of simultaneous mini-films | format |
| 27 | `sizzle-format` | the one-beat sizzle | format |
| 28 | `one-take-format` | the continuous one-take world | format |
| 29 | `vo-explainer` | the voice-over explainer with kinetic captions | format |
| 30 | `end-in-action` | ending inside the action, no end card | story |

---

## Entries

### 1. One case, followed from the request to the result · `one-case`

Family: story. See `concept-and-story.md` and `imagery.md`.

**What.** One person, one input with real names and numbers, entered in the product's own UI; the product works on it; the
output appears as a real artifact; the consequence lands (money, time, the right person found); the claim and the lockup grow
out of that last element. The same nouns and numbers come back in 2-4 acts, so the viewer understands what the product does
with the sound off and the text covered.

**Job.** A list of claims becomes a little drama with a protagonist and a result: the viewer watches the product work instead
of reading what it does. It also solves transitions for free: when every scene shows the same case, every cut can carry an
element of it.

**Numbers.**
- 4 acts (5 in a film of 45-50 s); the first act 15-30 % of the film (aim 25 %), the last act 12-30 % (aim 18 %).
- The case fills 45-90 % of the film (up to 100 % in a teaser).
- 1-8 scenes per act (about 3).
- The same noun or number on screen 3 times or more, across 2 acts or more.
- An input of 25-60 characters with one proper noun or number.

**Build.**
1. Write the case first, as data: the user (a first name or a role), the input (a sentence with one proper noun or number), 1-4
   work steps, the output artifact, the consequence.
2. Act 1: the promise or the problem in 1-3 scenes (`hook`, `problem-pile`); the case may already appear.
3. Entry: the input is typed, dragged or spoken into the product (`typed-request`).
4. Work: 1-4 status steps of 0.4-1.0 s each, each showing the case's own data (`status-ladder`).
5. Output: the artifact itself, full frame, travelled by the camera (`show-output`); then the consequence (payments arriving,
   a slot booked); the claim and the lockup grow out of the last element.

**Rich.** The same names and numbers recur (a program name, a store address, a count); the output looks like a real document with
real fields; the consequence is shown, not claimed; small surprises inside the case (the agent offers one more useful thing).

**Cheap.** Three features with three unrelated demo texts; "Your project" or filler text in every field; a generic success tick
instead of the artifact; each scene starting from an empty screen with a new subject.

**Sound.** The case carries the cue sheet: every keystroke run, send, status tick and result has its own small UI sound; a bright
ding on every payment toast.

```ts
// case.ts: the case is data; every scene reads from it, so names and numbers cannot drift.
export const CASE = {
  user: 'Nora',
  input: 'Turn these notes into a plan for Friday',
  steps: ['Reading 14 notes', 'Outlining 6 sections', 'Writing the plan'],
  output: {title: 'Friday plan', sections: 6, fields: ['Goals', 'Owners', 'Dates']},
  outcome: {label: 'All set', value: '6 sections'},
};

// timeline.ts: allocate acts by the act shares, then scenes inside each act.
import {sec} from './pace';
type Act = {id: string; share: number; scenes: string[]};
export const ACTS: Act[] = [
  {id: 'promise', share: 0.22, scenes: ['hook', 'problem']},          // `hook` + `problem-pile`
  {id: 'entry',   share: 0.24, scenes: ['field', 'typing', 'send']},  // `typed-request` + `cursor-actor`
  {id: 'work',    share: 0.36, scenes: ['status', 'artifact', 'consequence']}, // `status-ladder` + `show-output` + `proof-numbers`
  {id: 'claim',   share: 0.18, scenes: ['claim', 'lockup']},          // `brand-placement`
];
export function buildTimeline(totalS: number, fps: number) {
  let f = 0;
  return ACTS.flatMap((act) => {
    const actF = sec(totalS * act.share, fps);
    const per = Math.floor(actF / act.scenes.length);
    return act.scenes.map((s, i) => {
      const from = f; const dur = i === act.scenes.length - 1 ? actF - per * i : per;
      f += dur; return {act: act.id, scene: s, from, dur};
    });
  });
}
// Main.tsx
// {buildTimeline(26, 30).map((s) => (
//   <Sequence key={s.scene} from={s.from} durationInFrames={s.dur + 6 /* 6 f overlap for carried elements */}>
//     <Scene name={s.scene} data={CASE} />
//   </Sequence>))}
```

### 2. Every second moves: the motion floor and what keeps a hold alive · `motion-floor`

Family: pacing. See also `animations.md` `drift-tail` and `camera-type.md` `drift-tail`.

**What.** A floor of motion density for every second of the film, and a set of quiet keepers for the few moments that must read
as a hold (the answer, the claim, the lockup). A hold is a reading pause, not a freeze.

**Job.** Motion is the film's heartbeat: a still frame reads as "the video froze" or as a slide deck. The creep keeps attention
while the eye reads, and its acceleration hands energy to the next cut, so the film feels like one breath.

**Numbers.**
- Share of an 80 x 45 cell grid that changes in each second: 0.12 or more in every mid-film second; a film median of 0.18-0.5;
  aim about 0.36 in the first 10 %, 0.41 in the middle, low in the last 10 % (the lockup, about 0.04). Motion is high from frame 0.
- Mean absolute frame difference (0-1 scale) for the film: 0.0025 or more (aim about 0.0047).
- Mid-film holds of 0.8 s or more: at most one per 25 s, each 1.6 s or less unless it is the climax line.
- End hold: the film is over 2 s at most after the mark is whole (the lockup 2.5 s at most).
- A creep during a hold: a scale change of 2-7 % over 1.5-2 s, a drift of 0.3-2 px per frame, or a light or shimmer band
  moving through.

**Build.** Measure the film's motion per second on a render (the change share of a downscaled frame grid); where a mid-film second
falls under the floor, add a keeper: a scale creep (1.021 -> 1.024 over a second, then an accelerating push 1.028, 1.039, 1.076
into the cut), a shimmer across a status line, a glow travelling slowly through a held field, a lockup that closes up and grows
about 5 % to the last frame.

**Rich.** The hold is a slow push or scale creep you feel more than see; a light band, shimmer or particle film moving through a
held composition; the hold accelerating into the cut.

**Cheap.** A perfect freeze with only grain; idle bobbing or floating cards (a creep is one-directional, never up and down); an
aimless pan that goes and comes back.

**Sound.** Holds carry the bed and a tail (a reverb tail, a riser) rather than silence; the accelerating exit rides a whoosh or a
riser that peaks on the cut.

```ts
// Keep.tsx: wraps any held composition; one-directional creep + optional sheen + accelerating exit.
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {creep, ramp, E, CLAMP} from './pace';

export const Keep: React.FC<{from: number; to: number; amt?: number; drift?: number;
  sheenAt?: number; exitFrames?: number; children: React.ReactNode}> =
({from, to, amt = 0.035, drift = 0, sheenAt, exitFrames = 8, children}) => {
  const f = useCurrentFrame();
  const c = creep(f, from, to - exitFrames, amt, drift);
  // accelerating push over the last exitFrames: +6 %
  const push = ramp(f, to - exitFrames, to, 0, 0.06, E.exit);
  const sheenX = sheenAt === undefined ? -999 : interpolate(f, [sheenAt, sheenAt + 6], [-0.2, 1.2], CLAMP);
  return (
    <AbsoluteFill style={{transform: `translateX(${c.dx}px) scale(${c.scale + push})`}}>
      {children}
      {sheenAt !== undefined && (
        <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen',
          background: `linear-gradient(100deg, transparent ${sheenX * 100 - 6}%, rgba(255,255,255,0.12) ${sheenX * 100}%, transparent ${sheenX * 100 + 6}%)`}} />
      )}
    </AbsoluteFill>
  );
};

/* pace_gate.py (run through heavy.mjs --cpu) measures a render against the motion floor:
import cv2, numpy as np, sys, json
cap = cv2.VideoCapture(sys.argv[1]); fps = cap.get(5); prev = None; cells = []; mad = []
while True:
    ok, fr = cap.read()
    if not ok: break
    g = cv2.resize(cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY), (320, 180)).astype(np.int16)
    if prev is not None:
        d = np.abs(g - prev); mad.append(d.mean() / 255)
        cells.append(cv2.resize((d > 10).astype(np.float32), (80, 45), interpolation=cv2.INTER_AREA) > 0)
    prev = g
n = int(round(fps)); per_s = [np.logical_or.reduce(cells[i:i + n]).mean() for i in range(0, len(cells) - n + 1, n)]
still = [m < 0.0006 for m in mad]; runs, r = [], 0
for s in still + [False]:
    if s: r += 1
    else:
        if r >= 0.8 * fps: runs.append(r / fps)
        r = 0
print(json.dumps({'median_mad01': float(np.median(mad)), 'union_per_s_median': float(np.median(per_s)),
  'seconds_below_0.12': int(sum(u < 0.12 for u in per_s[:-2])), 'holds_over_0.8s': runs}))
# gate: median_mad01 >= 0.0025, union median >= 0.12, holds_over_0.8s mid-film <= duration/25
*/
```

### 3. The typed request: a specific sentence in the product's own field · `typed-request`

Family: content. See also `items.md` `prompt-input` and `animations.md` `typewriter-head`.

**What.** A prompt box, search pill or composer receives one concrete sentence, character by character: the placeholder goes
first, new characters arrive tinted and cool to ink, the camera follows the caret, and the line ends on the send button.

**Job.** The viewer reads what a real user would ask; that one sentence is the product's promise in its own voice, and it sets up
the result the film will deliver.

**Numbers.**
- 13-60 characters (about 38).
- 1-2 characters per frame for a request at 24-30 fps; 0.7 in a macro; 3-14 for streamed output.
- Typing takes 0.8-2.6 s.
- New characters cool from the accent to ink in 3-12 f.
- Caret 2-4 px wide, 0.9-1.1x the cap height, solid while typing; it blinks only in the pause after the line.
- Camera: a macro x1.5-x8 on the caret, a follow pan, a pull back before the send.

**Build.** The empty field arrives with its real placeholder; the placeholder clears; the request types at 1-2 characters per
frame, the newest characters in the accent (for example a blue `#4A86E0` settling to `#2E2F31`); a 4 x 60 px caret leads;
the camera pans with the caret in a macro; then it pulls back to show the send button and the cursor presses it (`cursor-actor`).

**Rich.** A sentence a real customer would type, with a proper noun; the camera choreographed with the caret; tinted characters
cooling to ink; the field's real chrome (icons, chips, send button) at true scale.

**Cheap.** "Type your prompt here"-style generic text; characters at a constant robot rate with no camera; a caret blinking while
typing; a field floating with no product around it.

**Sound.** Soft key ticks per character (5-8 per second, in dense runs), a slightly brighter tick on the send; a single pop on the
first character.

```ts
// TypedField.tsx
import {useCurrentFrame, interpolateColors} from 'remotion';
import {typedCount} from './pace';

export const TypedField: React.FC<{text: string; start: number; cpf?: number; accent: string; ink: string;
  placeholder?: string; size?: number}> = ({text, start, cpf = 1.4, accent, ink, placeholder, size = 44}) => {
  const f = useCurrentFrame();
  const n = typedCount(text, f, start, cpf);
  const doneAt = start + Math.ceil(text.length / cpf);
  const caretOn = f < doneAt || Math.floor((f - doneAt) / 15) % 2 === 0;  // solid while typing, 0.5 s blink after
  return (
    <div style={{fontSize: size, fontFamily: 'Inter', letterSpacing: '-0.01em', whiteSpace: 'pre'}}>
      {n === 0 && f < start - 3 && placeholder && <span style={{color: '#8E9096'}}>{placeholder}</span>}
      {text.slice(0, n).split('').map((ch, i) => {
        const born = start + i / cpf;                      // frame this character appeared
        const color = interpolateColors(f - born, [0, 10], [accent, ink]); // cools in 10 f
        return <span key={i} style={{color}}>{ch}</span>;
      })}
      <span style={{display: 'inline-block', width: 3, height: size * 1.05, marginLeft: 2,
        verticalAlign: 'text-bottom', background: accent, opacity: caretOn ? 1 : 0}} />
    </div>
  );
};
// Camera that follows the caret: x = -(caretX - 960) * 0.85 while typing, then glide back with E.glide over 12 f.
```

### 4. Request -> working -> done: the status ladder · `status-ladder`

Family: content. See also `items.md` `chat-thread`, `checklist-row` and `skeleton`.

**What.** After the send, the request becomes a user bubble, a short ladder of status lines in the product's voice appears
(shimmering, ticking, counting), and it resolves into a done state that hands over to the result artifact.

**Job.** The product's inner life: proof of work, a moment of anticipation, and the beat that makes the result feel earned.

**Numbers.**
- 1-4 steps of 12-30 f (0.4-1.0 s) each; the ladder 1.5-4.8 s in all.
- Dots cycle ".", "..", "..." every 4-8 f.
- The verb cools from the accent to neutral in about 24 f.
- A shimmer band 15-25 % lighter crosses the line every 30-45 f.

**Build.**
1. The sent text unfolds into the user bubble; its text washes in from one side in a pale accent, then ink.
2. A bold status line in the product's voice plus one grey status line (`#A3A3A0`) with a moving lighter highlight (`#D5D5D2`).
3. Each status names the case's data while the matching picture develops (a grid of thumbnails going from blueprint to colour).
4. The done state, one beat (0.4-1.0 s): a short done line plus the result card, which hands over to `show-output`.
5. Optionally the ladder collapses into a one-line summary ("thought for N seconds").

**Rich.** Status text that names the case's own data; skeletons that develop into the real result; a collapse into a summary.

**Cheap.** A spinner; a generic progress bar to 100 %; a loading label with nothing behind it.

**Sound.** A soft tick per step; a high shimmering texture under the shimmer; a two-note "done" chime.

```ts
// StatusLadder.tsx
import {useCurrentFrame, interpolate} from 'remotion';
import {ramp, CLAMP} from './pace';

export const StatusLadder: React.FC<{steps: string[]; start: number; stepF?: number; done: string;
  accent?: string}> = ({steps, start, stepF = 18, done, accent = '#698BC9'}) => {
  const f = useCurrentFrame();
  const doneAt = start + steps.length * stepF;
  if (f >= doneAt) {
    const s = ramp(f, doneAt, doneAt + 8, 0.9, 1);
    return <div style={{transform: `scale(${s})`, opacity: ramp(f, doneAt, doneAt + 5), fontWeight: 600}}>{done}</div>;
  }
  return (
    <div>{steps.map((t, i) => {
      const a = start + i * stepF;
      if (f < a) return null;
      const active = f < a + stepF;
      const dots = active ? '.'.repeat(1 + (Math.floor((f - a) / 6) % 3)) : '';
      const shimmer = interpolate((f - a) % 36, [0, 36], [-30, 130], CLAMP);
      return (
        <div key={i} style={{display: 'flex', gap: 12, alignItems: 'center', height: 40,
          transform: `translateY(${ramp(f, a, a + 6, 8, 0)}px)`, opacity: ramp(f, a, a + 6)}}>
          <span style={{width: 18}}>{active ? '' : '✓'}</span>
          <span style={{
            backgroundImage: active
              ? `linear-gradient(90deg, #A3A3A0 ${shimmer - 20}%, #D5D5D2 ${shimmer}%, #A3A3A0 ${shimmer + 20}%)`
              : 'none',
            WebkitBackgroundClip: active ? 'text' : undefined, color: active ? 'transparent' : '#2F2F2F',
          }}>{t}{dots}</span>
        </div>);
    })}</div>
  );
};
```

### 5. Show the output itself, full frame, and travel it · `show-output`

Family: content. See also `camera-type.md` `scroll-camera` and `plane3d-settle`.

**What.** The artifact the product made enters as a real object (a page on a plane, a window, a card) and the camera flies to its
headline and travels down or across it in one front-loaded move while its lower parts write themselves in as they come into view.

**Job.** It answers "and then what?": the viewer sees the thing they would get. The camera travel lets a long artifact read as
rich without holding still.

**Numbers.**
- On screen 1.3-4.3 s.
- One camera move of 0.8-2.5 s, front-loaded (`E.front`).
- Plane tilt rotateX 18-32 degrees, rotateZ -3 to -6 degrees.
- Rows write in one every 2-4 f as they enter the view.
- Photos inside develop from a duotone in the accent to full colour in 5-6 f.

**Build.**
- *Page on a plane.* A long white page lies on a 3D plane tilted back and rolled slightly counter-clockwise; it enters from the
  bottom, the camera flies to its headline and travels down it while sections write in; then the next state (the page live at
  its address).
- *Window rising.* A large app window (chat left, code right) rises from the bottom with an exponential tail while code streams.
- *Profile fly-in.* The found result's profile window flies in through a white glass fly-through, then the outcome line.
- *List to table.* A list gets check marks, becomes a priced table, then the quote is sent.

**Rich.** A long, real artifact (tables, illustration, prices); content that writes in as the camera reaches it; a perspective plane
with a front-loaded camera move.

**Cheap.** A small thumbnail of the result in the middle of a big empty ground; the whole artifact appearing at once and holding; a
screenshot with blurred unreadable content.

**Sound.** A whoosh on the fly-in, soft ticks for the rows, a tonal note when the artifact settles.

```ts
// ArtifactTravel.tsx: a long page on a plane, camera travelling down, rows writing in when reached.
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ramp, E} from './pace';

export const ArtifactTravel: React.FC<{start: number; dur: number; rows: React.ReactNode[]; header: React.ReactNode;
  pageH?: number}> = ({start, dur, rows, header, pageH = 2600}) => {
  const f = useCurrentFrame();
  const enter = ramp(f, start, start + 13, 900, 0, E.arrive);           // rises from the bottom
  const travel = ramp(f, start + 10, start + dur, 0, pageH - 900, E.front); // one front-loaded move down
  const viewBottom = travel + 1000;                                     // page y currently at the frame bottom
  return (
    <AbsoluteFill style={{perspective: 1400, perspectiveOrigin: '50% 30%'}}>
      <div style={{position: 'absolute', left: 360, width: 1200, height: pageH, background: '#fff', borderRadius: 18,
        transformOrigin: '50% 0%', boxShadow: '0 40px 120px rgba(0,0,0,0.18)',
        transform: `translateY(${120 + enter - travel}px) rotateX(24deg) rotateZ(-4deg)`}}>
        {header}
        {rows.map((r, i) => {
          const y = 700 + i * 90;                     // row position on the page
          const seen = start + 10 + (dur - 10) * Math.min(1, Math.max(0, (y - 1000) / (pageH - 900)));
          const shown = y < viewBottom;
          return <div key={i} style={{position: 'absolute', top: y, left: 80, right: 80,
            opacity: shown ? ramp(f, seen, seen + 4) : 0}}>{r}</div>;
        })}
      </div>
    </AbsoluteFill>
  );
};
```

### 6. The problem as accumulation, then the collapse into one · `problem-pile`

Family: story. See also `animations.md` `gravity-squash` and `split-assemble`.

**What.** Many small objects (logos, papers, notifications, cards, questions, distractions) arrive, stack, overflow or fall under
gravity around a short line; the turn collapses them into one thing (a chip, a ring, a square, a logo) that becomes the product.

**Job.** A problem the viewer can see and feel (overload, chaos, lost time) makes the product's gesture (gathering it into one) the
emotional turn of the film.

**Numbers.**
- 6-12 items, arriving 1-5 f apart (11 items in 9 f is fine); the build takes 1.5-4 s.
- A fall under gravity with one bounce, settling in about 20 f.
- The collapse takes 6-24 f, accelerating (`E.exit`), toward the frame centre or the product element.
- The problem act fills 12-33 % of the film.

**Build.**
- *Tools rise and fall.* A line builds with a colour front; nine tool logos in white pills rise around it, staggered; the next line
  lands and the pills fall under gravity into a heap; the turn gathers them.
- *Paperwork drop.* Paper documents (a quote, an invoice, a price list) drop into place piece by piece around a phone.
- *Questions on gradients.* Question pills type themselves on a liquid gradient; a duotone photo of the stressed person appears.
- *Signals in the dark.* Short problem lines separated by white flashes, glyphs and snippets swarming in depth.
- *A wall of folders.* A wall of folders, a fisheye close-up, scattered files across apps.

**Rich.** Real objects of the user's world; physics (gravity, a bounce, a heap); the pile becoming the product in one continuous move.

**Cheap.** A red cross over icons; a sad stock photo; a caption "Too many tools?" over nothing; objects that fade out instead of being
gathered.

**Sound.** A rising clutter of small pops (one per item, 2-5 f apart), a thud cluster on the heap, then a sucked-in whoosh on the
collapse and a clean tone for the one thing.

```ts
// PileUp.tsx: closed-form gravity with one bounce (deterministic, scrubbable), then a collapse to a point.
import {AbsoluteFill, useCurrentFrame, random} from 'remotion';
import {ramp, E} from './pace';

const fallY = (tRaw: number, y0: number, floor: number, g = 2.2) => {   // t in frames since the fall began
  const t = Math.max(0, tRaw);
  const tHit = Math.sqrt((2 * (floor - y0)) / g);
  if (t < tHit) return y0 + 0.5 * g * t * t;
  const v = g * tHit * 0.38, t2 = t - tHit;                             // one bounce, 38 % restitution
  return Math.min(floor, floor - (v * t2 - 0.5 * g * t2 * t2));
};

export const PileUp: React.FC<{items: string[]; start: number; fallAt: number; collapseAt: number;
  to: {x: number; y: number}}> = ({items, start, fallAt, collapseAt, to}) => {
  const f = useCurrentFrame();
  return (<AbsoluteFill>{items.map((src, i) => {
    const x0 = 260 + random(`x${i}`) * 1400, y0 = 220 + random(`y${i}`) * 420;
    const born = start + i * 3;                                          // 3 f stagger
    const rise = ramp(f, born, born + 10, 60, 0);
    const drift = Math.max(0, Math.min(f, fallAt) - born) * -0.6;          // drift up before the fall
    const y = f < fallAt ? y0 + rise + drift : fallY(f - fallAt - i * 0.7, y0 + drift, 930 - (i % 3) * 40);
    const rot = f < fallAt ? 0 : (random(`r${i}`) - 0.5) * 40 * Math.min(1, (f - fallAt) / 12);
    const c = ramp(f, collapseAt, collapseAt + 10, 0, 1, E.exit);         // gather into the product
    const X = x0 + (to.x - x0) * c, Y = y + (to.y - y) * c;
    return <img key={i} src={src} style={{position: 'absolute', left: X - 60, top: Y - 60, width: 120,
      transform: `rotate(${rot * (1 - c)}deg) scale(${1 - 0.8 * c})`, opacity: ramp(f, born, born + 5)}} />;
  })}</AbsoluteFill>);
};
```

### 7. The word-picture sentence: a picture chip inside the line · `word-picture`

Family: content. See also `items.md` `inline-object` and `animations.md` `grow-push`.

**What.** A centred one-line statement opens a gap and a small rounded chip with a picture, icon or logo grows inside it (for
example "Ready in [clock]"); the chip may cycle its content fast or slot-roll, and it often expands to become the next scene.

**Job.** The noun is shown, not written: the line reads as a sentence and a picture at once, so a 1-second beat carries the claim
and the evidence; when the chip expands, the sentence opens into the next scene.

**Numbers.**
- Chip height 0.9-1.3x the cap height; radius h / 2 (a pill) or 12-24 px.
- The gap opens in 4-8 f (`E.arrive`), the words sliding apart symmetrically so the line stays centred.
- Content cycles every 2-6 f (a photo flip) or slot-rolls 10-14 f per item.
- The chip expands into the next scene in 5-8 f, faster than the line.
- One line, centre-middle.

**Build.**
- *Clock chip.* A very large first word alone, entering blurred and sharpening; then a clock chip opens in the gap and the last
  word lands.
- *Photo chip.* A line builds and re-centres; a photo chip opens between two phrases; a slow zoom into the chip; the chip expands
  into a full-frame photo.
- *Flipping faces.* The chip's photo flips through twelve portraits every 2-6 frames.
- *Logo in a question.* A question types with a push-in and a pull-back to a calm line in which an official app logo sits as the
  chip.
- *Braces.* Braces and four corner markers frame a growing phrase; the braces spread as each word joins.

**Rich.** Real chip content (official logos, real photos) that cycles; the gap opening with the line re-centring; the chip becoming the
next scene.

**Cheap.** An emoji in the text; an icon after the line instead of inside it; a static chip that never changes or grows.

**Sound.** A soft pop when the chip opens; tiny ticks on each content flip; a whoosh when it expands.

```ts
// ChipSentence.tsx (word widths from @remotion/layout-utils so the line re-centres smoothly)
import {useCurrentFrame, Img} from 'remotion';
import {ramp, E} from './pace';

export const ChipSentence: React.FC<{before: string; after: string; images: string[]; open: number;
  flipEvery?: number; expandAt?: number; font?: string; size?: number}> =
({before, after, images, open, flipEvery = 4, expandAt, font = 'Inter', size = 96}) => {
  const f = useCurrentFrame();
  const chipH = size * 1.1, chipW = chipH * 1.6;
  const w = ramp(f, open, open + 6, 0, chipW + size * 0.3, E.arrive);          // the gap opens
  const k = expandAt === undefined ? 0 : ramp(f, expandAt, expandAt + 6, 0, 1, E.exit);
  const img = images[Math.floor(Math.max(0, f - open) / flipEvery) % images.length];
  const style = {fontFamily: font, fontSize: size, fontWeight: 500, letterSpacing: '-0.02em'};
  const textOpacity = 1 - k;                                    // the words leave, the chip stays and grows
  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', ...style}}>
      <span style={{opacity: textOpacity}}>{before}</span>
      <span style={{display: 'inline-block', width: w, height: chipH, position: 'relative'}}>
        <Img src={img} style={{position: 'absolute', left: '50%', top: '50%', width: chipW, height: chipH,
          objectFit: 'cover', borderRadius: chipH / 2,
          transform: `translate(-50%,-50%) scale(${(w / (chipW + size * 0.3)) * (1 + k * 18)})`}} />
      </span>
      <span style={{opacity: textOpacity}}>{after}</span>
    </div>
  );
};
```

### 8. Cut rhythm: about one shot per second, long and short alternating · `cut-rhythm`

Family: pacing. See also `transitions.md` `hard-cut-right`.

**What.** Shot lengths and cut density by format, the long-short contrast rule, and where the long shot goes (the product demo or
the end card).

**Job.** Rhythm is how the film breathes: short shots carry energy and the problem, the one long shot gives the product room, the
end card lets the name land.

**Numbers.**
- A film's median shot 0.5-1.6 s (a launch 1.0-1.6 s).
- Cuts per 10 s: launch 4-9, montage 11-15, grid or sizzle 14-18.
- The longest shot 2.3-3 s: the demo, at 45-65 % of the film (no scene over 3 s, the lockup 2.5 s at most).
- Shot-length variation 0.54-0.79; 50-70 % of neighbouring shots differ by more than 1.6x.
- The shortest shots 0.17-0.5 s (flash frames, whip halves, beat swaps).

**Build.** Lay the beats on the timeline, then check the rhythm: alternate long and short, give the one demo shot 2.3-3 s around the
middle (a longer demo is two scenes), put a few 3-6 frame accents (a flash, a whip half) at the seams, and end on a lockup of
2.5 s at most. Cut where the motion still
has speed (the cut takes it), not where an animation finished.

**Rich.** An uneven rhythm with a long demo shot; shots that end on motion; a few 3-6 frame shots as accents.

**Cheap.** Every shot 2.5-3.5 s; cuts only where a scene finished its animation; fades between shots of equal length.

**Sound.** Cuts land on sound cues, not on the bar grid (`sound-synced`); a bar-grid edit only in a sizzle.

```ts
// usePlan.ts: draw a deterministic shot plan from the shot-length distribution, then pin the demo shot.
import {planShots, sec} from './pace';
export function shotPlan(totalS: number, fps: number, seed = 'film-1', demoShotS = 5.0) {
  const s = planShots(totalS - demoShotS, seed, 2.4);   // last entry = lockup (`brand-placement`)
  const at = Math.floor(s.length * 0.55);               // demo shot at ~45-65 % of the film
  s.splice(at, 0, demoShotS);
  let f = 0;
  return s.map((d) => { const r = {from: f, dur: sec(d, fps)}; f += r.dur; return r; });
}
// gate: median shot 0.5-1.6 s, CV 0.54-0.79, cuts/10 s 4-9 for a launch film
export const stats = (d: number[]) => {
  const m = [...d].sort((a, b) => a - b)[Math.floor(d.length / 2)];
  const mean = d.reduce((a, b) => a + b) / d.length;
  const cv = Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / d.length) / mean;
  return {median: m, cv, cutsPer10s: (10 * (d.length - 1)) / d.reduce((a, b) => a + b)};
};
```

### 9. Specifics: real names, prices, counts and places · `specifics`

Family: content. See also `copy-and-type.md` and `product-ui.md`.

**What.** Every field, card and line carries a precise, slightly irregular value that belongs to the case: a person with a title
and company, a product name with real casing, a price with cents, a count that is not round, a web address.

**Job.** Precision reads as truth: the viewer believes a product that knows a buyer's headcount or a plan's price; generic values
signal a mock.

**Numbers.** Non-round numbers (cents, odd thousands, decimals); people as first name + role + company; product names with real
casing; the product's market language; 3-6 real fields per card.

**Build.**
- *People.* "Maya Chen, Head of Ops at a 140-person logistics firm"; a question in the user's words with its small typo kept.
- *Products and places.* A program name with deliberate casing ("The Dumbbell-Free 6-Week Plan"), a store address
  ("northtrail.store"), "asked 863 times" (or "863×" with a real multiplication sign).
- *Prices and numbers.* "$11.99/mo", "$27.50/mo"; "$42 -> $1,276"; "61M -> 68M".
- *Native chrome.* The real platform's chrome around the product (a dock, a share sheet, a composer, a right-click menu), with
  official icons.
- *Language.* Copy in the product's market language when the film is for that market.

**Rich.** Odd exact values; names with roles and companies; the native chrome of real platforms.

**Cheap.** Filler text, "John Doe", "$99", "100 %"; placeholder grey bars in a hero card (bars are fine only as skeletons that
develop).

**Sound.** None of its own; exact values make counters and toasts worth a sound.

```ts
// case-data.ts: write the believable data once (it also feeds `one-case`, `status-ladder`, `proof-numbers`).
export const DATA = {
  persona: {name: 'Maya Chen', role: 'Head of Ops', company: 'Larkfield Freight', stage: 'Series A', size: '140 employees'},
  product: {title: 'The Dumbbell-Free 6-Week Plan', store: 'northtrail.store', asked: 863},
  plans: [{name: 'Starter', price: '$0/mo'}, {name: 'Pro', price: '$11.99/mo'}, {name: 'Team', price: '$27.50/mo'}],
  metric: {label: 'Onboarding cost', from: 42, to: 1276, prefix: '$'},
};
// rule for writers: no round numbers except prices ending in .99 / .00 shown with cents; every person has a role.
```

### 10. Proof by numbers: counters, toasts, grids and charts · `proof-numbers`

Family: content. See also `items.md` `counter`, `chart`, `toast-stack`.

**What.** A number counts, values swap, a grid fills, toasts stack or bars grow, in the product's UI and in the case's data,
usually under a slow push-in.

**Job.** A number is the shortest possible proof; when it belongs to the case (this store, this team) it reads as an outcome, not
a marketing claim.

**Numbers.**
- A count takes 10-50 f, on an expo-out (fast start, slow last digits) or with hard value cuts for drama.
- Tabular figures, 1.5-3x the line size.
- A grid fills 1-4 cells per frame, row-major or in a seeded order.
- Each new toast pushes the stack back 6-10 % in scale and 30-50 px in y.

**Build.**
- *Cost cards.* A duotone photo develops to colour while glass cost cards count up $37 -> $1,083 under a push-in.
- *User counter.* A dark green column of outlined rounded cards scrolls up while a user count goes 78M -> 85M in 10 frames.
- *Hard-cut rate.* In dark mode a line beside a rate tile with very large light digits (224 px); the value hard-cuts.
- *Grid of 100.* A 10 x 10 grid fills green until 98 green and 2 grey (the misses) while the headline lands.
- *Payment toasts.* Payment toasts stack up in depth on the brand colour; more arrive later on a dark stage.

**Rich.** The number belongs to the case; a visual of the quantity beside the digits (a grid of 100, stacked toasts); tabular figures
that never jitter.

**Cheap.** A big "10x" on a gradient; a count from 0 to a round number; proportional digits jumping left and right.

**Sound.** Fast ticks under the count that slow with it; one ding per toast; a low hit when the final value lands.

```ts
// CountUp.tsx + ToastStack.tsx
import {useCurrentFrame} from 'remotion';
import {ramp, E} from './pace';

export const CountUp: React.FC<{from: number; to: number; start: number; dur: number; prefix?: string;
  suffix?: string; decimals?: number}> = ({from, to, start, dur, prefix = '', suffix = '', decimals = 0}) => {
  const f = useCurrentFrame();
  const v = ramp(f, start, start + dur, from, to, E.arrive);
  const s = new Intl.NumberFormat('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals}).format(v);
  return <span style={{fontVariantNumeric: 'tabular-nums'}}>{prefix}{s}{suffix}</span>;
};

export const ToastStack: React.FC<{toasts: React.ReactNode[]; start: number; every?: number}> =
({toasts, start, every = 7}) => {
  const f = useCurrentFrame();
  const shown = Math.max(0, Math.min(toasts.length, Math.floor((f - start) / every) + 1));
  return (<div style={{position: 'relative', width: 760, height: 160}}>{toasts.slice(0, shown).map((t, i) => {
    const age = shown - 1 - i;                                   // 0 = newest, in front
    const a = start + i * every;
    return <div key={i} style={{position: 'absolute', inset: 0, zIndex: 100 - age,
      transform: `translateY(${-38 * age + ramp(f, a, a + 8, 60, 0)}px) scale(${1 - 0.07 * age})`,
      opacity: age > 4 ? 0 : ramp(f, a, a + 5) * (1 - 0.15 * age)}}>{t}</div>;
  })}</div>);
};
```

### 11. The pacing arc of a whole film · `film-arc`

Family: pacing. See `spine.md` and `timing-grid.md`.

**What.** Where the hook, the problem, the turn, the name, the case, the claim and the lockup sit in time, and how motion density and
shot length move along that arc.

**Job.** Energy curve = attention curve: the hook earns the first seconds, the turn gives a feeling (relief), the long demo gives
understanding, the calm end lets the name stick.

**Numbers.**
- The first line by 0-1 s.
- The turn at 22-35 % in a problem-first film, marked by a word, light or silence.
- The name early (0-17 %), after the problem (22-41 %), or late (68-92 %) (`brand-placement`).
- The demo shot at 45-65 %; the claim at 80-92 %; the lockup in the last 6-12 % (2.5 s at most).
- Density: the first 10 % at 0.3 or more, the middle at 0.3 or more, the last 10 % low.

**Build.** A worked timeline for a 50 s case film: hook 0-0.5 s; an outcome preview 0.5-6 s; a word-picture line 6-7 s; the case
7-43 s (request, ladder, output, consequence); a 3D mark 43-45 s; the claim and the lockup 45-50 s.

**Rich.** A turn marked by light or silence; speed building into each landing; a calm, creeping lockup.

**Cheap.** Every scene the same length and energy; the name shown first and again with nothing between; a fade-out ending.

**Sound.** The music's section change sits on the turn (a stop and return, a sub drop); the bed decays under the lockup.

```ts
// arc.ts: place story moments by the arc shares, then let scenes fill the gaps.
export type Moment = 'hook' | 'problem' | 'turn' | 'name' | 'case' | 'demo' | 'claim' | 'lockup';
export function arc(totalS: number, kind: 'problem-first' | 'promise-first' | 'outcome-first') {
  const at = (p: number) => +(p * totalS).toFixed(2);
  const lockup = Math.min(3.6, Math.max(1.0, totalS * 0.08));
  const base = {hook: 0, claim: at(0.84), lockup: +(totalS - lockup).toFixed(2), demo: at(0.52)};
  if (kind === 'problem-first') return {...base, problem: at(0.04), turn: at(0.25), name: at(0.28), case: at(0.33)};
  if (kind === 'outcome-first') return {...base, problem: null, turn: at(0.13), name: at(0.88), case: at(0.15)};
  return {...base, problem: null, turn: null, name: at(0.08), case: at(0.2)};
}
```

### 12. The verb ladder: two to four parallel lines with one build · `verb-ladder`

Family: story.

**What.** Two to four very short lines of the same grammar ("Find it. / Shape it. / Pitch it.", "No momentum. / No visibility. /
No growth.") arrive about one per second with the same entrance, centred; the last one is held longer or turns into the next
element.

**Job.** Rhythm makes a list memorable; parallel grammar lets the viewer predict the next item, and the payoff item lands harder for
being held.

**Numbers.** 2-4 items (3 by default); 0.7-1.1 s per item, the last 1.6-4.7 s; an identical build for every item (blur-in, rise,
slot roll or exit-then-enter); parallel grammar (verb + "it", "No" + noun, one word each); centre-middle, one line; under it the
picture changes per item, or one plate keeps moving.

**Build.**
- *Over a moving plate* (60 fps). Small white centred lines over a golden-hour plate, one per second.
- *Rising verbs.* Three bold verbs rise one after another over light bars, 1 s each.
- *Slot roll in brackets.* A scrambled word decodes into the first verb inside corner brackets and slot-rolls into the next.
- *Verb per picture.* Four verbs, each 1.6-3 s, each over a picture that shows the verb happening.
- *Problem ladder.* Three "No ..." lines at about 0.7 s each; the third holds 4.7 s and step-shrinks while the music drops.

**Rich.** One build repeated exactly; a picture or edit under each verb; the last item held with a creep or turned into the next
element.

**Cheap.** Three cards with icons and paragraphs; items with different lengths and builds; all three on screen at once as a bullet
list.

**Sound.** One identical hit per item (a pop, a vocal chop, a drum hit); the last item gets the bigger sound (a sub drop).

```ts
// VerbLadder.tsx
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ramp, creep, E} from './pace';

export const VerbLadder: React.FC<{items: string[]; start: number; every: number; lastHold: number;
  size?: number; color?: string}> = ({items, start, every, lastHold, size = 120, color = '#111'}) => {
  const f = useCurrentFrame();
  const i = Math.min(items.length - 1, Math.floor((f - start) / every));
  if (f < start || i < 0) return null;
  const a = start + i * every;
  const isLast = i === items.length - 1;
  const end = isLast ? a + lastHold : a + every;
  const c = isLast ? creep(f, a + 8, end, -0.06) : {scale: 1, dx: 0};   // last item: slow step-shrink
  const gone = f >= end - 1 && !isLast;                                   // one empty frame between items
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      {!gone && <div style={{fontSize: size, fontWeight: 600, color, letterSpacing: '-0.03em',
        filter: `blur(${ramp(f, a, a + 5, 12, 0)}px)`, opacity: ramp(f, a, a + 4),
        transform: `translateY(${ramp(f, a, a + 8, 30, 0, E.arrive)}px) scale(${c.scale})`}}>{items[i]}</div>}
    </AbsoluteFill>
  );
};
// <VerbLadder items={['Discover it.', 'Save it.', 'Create it.']} start={0} every={30} lastHold={45} />
```

### 13. The cursor as an actor · `cursor-actor`

Family: content. See also `items.md` `cursor` and `animations.md` `press-click`, `pendulum`.

**What.** An oversized, characterful cursor (an arrow, an I-beam, a hand, a pixel hand, a 3D cursor) enters on an arc, interacts with
the product (drags a file, clicks send, chooses a card), and its click triggers the next beat.

**Job.** The cursor is the user's hand: the product gets a protagonist without showing a person, and every click is a cause that
motivates the next scene change.

**Numbers.** 1.5-3x the OS size in close-ups; an approach of 10-25 f on an arc, easing out, rotated toward its travel by up to 20-30
degrees; a press at scale 0.85-0.9 for 3-5 f with the target reacting on the same frame (button 0.96 -> 1.04 -> 1, a glow or a ring
burst); the next beat starting within 0-4 f of the click.

**Build.**
- *Pendulum drag.* A document icon dragged in from the bottom right swings like a pendulum and drops into the input box.
- *Giant cartoon cursor.* It flies in, turns into an I-beam, descends and clicks the field; a glow blooms under the click.
- *Glossy click.* A big glossy cursor rises; in close-up it clicks the microphone; the screen dims and a halftone ring bursts.
- *Placeholder fades.* A cursor drifts in, the placeholder fades, the request types, the cursor glides onto Send and turns into a
  hand.
- *Pixel hand.* A pixel-art hand clicks through a plan, a card and a copy button.

**Rich.** An arc with rotation toward travel; a press squash and an instant UI reaction; a character (a pendulum file, a playful spin).

**Cheap.** A cursor sliding in a straight line at constant speed; clicks with no reaction; an OS-size cursor lost in a wide frame.

**Sound.** A soft whoosh on the arc, a crisp click exactly on the press frame, the UI's reaction sound 1-3 f later.

```ts
// Cursor.tsx: quadratic arc, rotation by tangent, press squash.
import {useCurrentFrame} from 'remotion';
import {ramp, E} from './pace';

type P = {x: number; y: number};
export const Cursor: React.FC<{from: P; ctrl: P; to: P; start: number; travel: number; pressAt?: number;
  size?: number}> = ({from, ctrl, to, start, travel, pressAt, size = 72}) => {
  const f = useCurrentFrame();
  const t = ramp(f, start, start + travel, 0, 1, E.arrive);
  const bez = (a: number, b: number, c: number) => (1 - t) ** 2 * a + 2 * (1 - t) * t * b + t * t * c;
  const x = bez(from.x, ctrl.x, to.x), y = bez(from.y, ctrl.y, to.y);
  const dx = 2 * (1 - t) * (ctrl.x - from.x) + 2 * t * (to.x - ctrl.x);
  const dy = 2 * (1 - t) * (ctrl.y - from.y) + 2 * t * (to.y - ctrl.y);
  const face = Math.max(-25, Math.min(25, (Math.atan2(dy, dx) * 180) / Math.PI - 60)) * (1 - t); // faces travel, rights itself
  const press = pressAt === undefined ? 1 : f >= pressAt && f < pressAt + 4 ? 0.86 : 1;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{position: 'absolute', left: x, top: y,
      transform: `rotate(${face}deg) scale(${press})`, transformOrigin: '2px 2px',
      filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.25))'}}>
      <path d="M2 2 L2 19 L7 14.5 L10.5 22 L13.5 20.6 L10 13.2 L16.5 13.2 Z" fill="#fff" stroke="#111" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
};
// Target reaction on pressAt: scale = pressAt <= f < pressAt+4 ? 0.96 : ramp(f, pressAt+4, pressAt+12, 1.04, 1)
```

### 14. Brand reveal placement and the end lockup · `brand-placement`

Family: story. See also `items.md` `logo-lockup` and `transitions.md` `end-handover`.

**What.** Three placements for the first legible brand name, plus how the end lockup is built and held.

**Job.** Early = "this is X, watch what it does"; at the turn = "here is the answer to that pain"; late = "and that was X". A lockup
that grows out of the last element closes the case instead of pasting a logo.

**Numbers.**
- Early: the first 0-17 % (the name is the premise; a logo build in the first frames).
- At the turn: 22-41 % (the name is the answer; a letter swap into the name, a wordmark that slams in).
- Late: 68-92 % (the name is the payoff; an "introducing" line, a 3D mark).
- The name may show twice (early or at the turn, then in the end lockup).
- Lockup build 0.5-1.5 s; the film over 2 s at most after the lockup is whole, with a 2-6 % scale creep or a drifting light; centred.

**Build.** Decide the placement from the story (premise, answer or payoff). Build the lockup from the film's own element or animation
(a badge spin reused from earlier, a mosaic, comets, the last UI element), with the official logo file; hold it with a slow creep.

**Rich.** The lockup built from the film's own element or animation; a slow creep during the hold; the official logo file.

**Cheap.** A logo fading in on a gradient and freezing; a lockup unrelated to anything seen before; a drawn look-alike of a real brand.

**Sound.** A logo sting: a sub hit or a low pop on the build, melodic notes as the parts settle, then the bed decays.

```ts
// Lockup.tsx: mark scales in with a spring, wordmark slides out from behind it, the pair creeps to the end.
import {AbsoluteFill, useCurrentFrame, useVideoConfig, spring, Img, staticFile} from 'remotion';
import {ramp, creep, E} from './pace';

export const Lockup: React.FC<{mark: string; word: string; start: number; end: number}> = ({mark, word, start, end}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const s = spring({frame: f - start, fps, config: {damping: 13, stiffness: 170, mass: 0.9}});
  const rot = (1 - s) * -90;                                    // badge spin-in
  const slide = ramp(f, start + 10, start + 26, -140, 0, E.arrive); // wordmark out from behind the mark
  const c = creep(f, start + 26, end, 0.05);                     // +5 % to the last frame
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 28, transform: `scale(${c.scale})`}}>
        <Img src={staticFile(mark)} style={{width: 150, transform: `scale(${s}) rotate(${rot}deg)`}} />
        <div style={{overflow: 'hidden'}}>
          <div style={{fontSize: 110, fontWeight: 600, transform: `translateX(${slide}px)`,
            opacity: ramp(f, start + 10, start + 22)}}>{word}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

### 15. The hook: a first line in the first second · `hook`

Family: story. See `copy-and-type.md`.

**What.** The opening line (1-6 words) arrives at frame 0-30, built word by word with a re-centre, in the second person ("Your work
is split"), as a question, or as an "Imagine"; it states the pain, the promise or the name.

**Job.** "You" puts the viewer in the case at once; a question opens a gap the film then closes; both make the next seconds feel
necessary.

**Numbers.** On screen by frame 0-30; 1-6 words; read in 1.2 s at most; a word every 2-8 f; cap height 7-15 % of the frame height
(house 9.2 %; it may start huge); it leaves by motion (a split, a rise, a drift, a defocus).

**Build.**
- *Second person.* "You can send it now", "Your week is in pieces", "You have a stack of drafts": built word by word, leaving by moving.
- *Question.* "What if every draft knew your voice", "Still hunting through five tabs?"
- *Fast build.* One word every 2 f with the words rising in; or each word arriving tinted and re-centring the line.

**Rich.** Frame 0 already in motion; a re-centring build with colour cooling; the line leaving through the next scene's motion.

**Cheap.** A black frame and a fade-in title; the company name as the first line in a plain fade; a long sentence.

**Sound.** The first sound by frame 3-5, often a breath chop, a riser or a soft hit per word.

```ts
// WordBuild.tsx: words appear one by one, the line re-centres smoothly (widths via measureText).
import {useCurrentFrame} from 'remotion';
import {measureText} from '@remotion/layout-utils';
import {ramp, E} from './pace';

export const WordBuild: React.FC<{text: string; start: number; every?: number; size?: number; font?: string;
  tint?: string; ink?: string}> = ({text, start, every = 4, size = 110, font = 'Inter', tint = '#3477E8', ink = '#111'}) => {
  const f = useCurrentFrame();
  const words = text.split(' ');
  const gap = size * 0.28;
  return (
    <div style={{display: 'flex', justifyContent: 'center', fontFamily: font, fontSize: size, fontWeight: 600}}>
      {words.map((w, i) => {
        const a = start + i * every;
        const W = measureText({text: w, fontFamily: font, fontSize: size, fontWeight: '600'}).width;
        const k = ramp(f, a, a + 8, 0, 1, E.arrive);              // width grows -> the line glides to centre
        const cool = ramp(f, a + 2, a + 14, 0, 1);
        return (
          <span key={i} style={{display: 'inline-block', width: (W + gap) * k, whiteSpace: 'pre', overflow: 'visible',
            opacity: k, transform: `translateY(${(1 - k) * 24}px)`,
            color: cool < 1 ? `color-mix(in srgb, ${tint} ${(1 - cool) * 100}%, ${ink})` : ink}}>{w}</span>
        );
      })}
    </div>
  );
};
```

### 16. Line placement and the text-to-picture budget · `text-budget`

Family: story. See the standard in `SKILL.md` and `copy-and-type.md`.

**What.** How much of a film is text, where statements sit in the frame and in which act, and how they relate to the picture.

**Job.** Text frames the story (the promise, the claim); the picture carries the middle; when words appear mid-film they are the
product talking, so they show rather than tell.

**Numbers.**
- Beats: about a quarter type alone, a third or more picture alone, a line over a picture on 40 % of the beats at most; type-only
  shots 15 % of the shots or more.
- Statements centred 80 % of their time or more, in the middle band 85 % or more, on one line 85 % or more; never left-aligned at
  the top or the bottom.
- Lines on screen 20-65 % of the film's time (aim about half); lines alone about 15 %.
- By act: lines alone in the first and last acts; middle-act lines are the product's own words or sit around the element.
- About one headline word per second (0.4-1.5).

**Build.** Put the alone-lines in the first act (the hook, the problem) and the last act (the claim); in the middle let the product's
own UI words carry the explanation, and when a statement appears, build it around the element ("around" = one composition: the
element parts the line, as in `word-picture` and `animations.md` `grow-push`).

**Rich.** Lines that interact with the element; centred one-liners; the product's own words carrying the explanation.

**Cheap.** Captions over unrelated pictures; a headline on top and a screenshot below; two-voice stacks (lead + keyword) on every
beat; an emphasised word in every line (keep emphasis to well under two thirds of lines).

**Sound.** Lines alone get the cleanest sound moments (a hit per word, or none); UI words get UI ticks.

```ts
// lint-lines.ts: run over the scene plan before rendering.
type Line = {text: string; act: 'first' | 'middle' | 'last'; placement: 'alone' | 'over' | 'around' | 'inside';
  align: 'center' | 'left' | 'right'; v: 'top' | 'middle' | 'bottom'};
export function lintLines(lines: Line[], filmS: number) {
  const out: string[] = [];
  const mid = lines.filter((l) => l.act === 'middle');
  const bad = mid.filter((l) => l.placement === 'over' || l.placement === 'alone');
  if (bad.length > Math.ceil(mid.length * 0.25)) out.push(`middle acts: ${bad.length}/${mid.length} lines are alone/over`);
  lines.filter((l) => l.align !== 'center' && l.v !== 'middle').forEach((l) => out.push(`off-centre at ${l.v}: "${l.text}"`));
  const words = lines.reduce((n, l) => n + l.text.split(/\s+/).length, 0);
  if (words / filmS > 1.6) out.push(`${(words / filmS).toFixed(2)} headline words/s (aim ~1.06)`);
  return out;
}
```

### 17. The accelerating swap: a run of pictures that speeds up into a landing · `accelerating-swap`

Family: pacing. See also `animations.md` `punch-in` (re-punch montage).

**What.** Inside one frame or slot, pictures or values hard-swap at a decreasing interval (from about 8-10 f down to 2 f) while one
continuous camera move runs across all of them; it ends on a hold, a whip or the payoff.

**Job.** Quantity becomes a feeling: the acceleration says "and more, and more" without a word, and the next landing feels inevitable.

**Numbers.** 7-20 items; the interval starts at 8-11 f and ends at 2-4 f (a geometric ratio of about 0.85 per swap); one continuous
push or pull across the run (the glue); it ends on a hold, a whip or the payoff element; new items may arrive tinted and cool.

**Build.**
- *Card run* (25 fps). The generated card shrinks, then 20 hard swaps accelerate while a 3D stack of earlier cards builds behind it.
- *Format carousel* (24 fps). A carousel of 14 items (an icon tile and a list card) steps one item at a time, faster and faster.
- *Phone backgrounds.* A phone in a hand holds while its background hard-swaps every 5 frames under one accelerating push.
- *Placeholder run.* Placeholder questions in a search pill swap faster and faster while the group pushes in.
- *Portrait flips.* A chip flips through twelve portraits every 2-6 frames; seven genre words over pictures, about 11 f each.

**Rich.** A continuous camera move gluing the swaps; real, varied content; a clear landing after the fastest swap.

**Cheap.** A slideshow at a constant 1 s per picture; cross-fades between pictures; the run ending in a fade.

**Sound.** A tick per swap following the acceleration (a rolling texture), cut dead on the landing with a hit.

```ts
// accel.ts + SwapRun.tsx
import {AbsoluteFill, useCurrentFrame, Img} from 'remotion';
import {ramp, E} from './pace';

export const accelSchedule = (n: number, first = 10, last = 2) => {
  const r = Math.pow(last / first, 1 / Math.max(1, n - 2));
  const starts = [0]; let iv = first;
  for (let i = 1; i < n; i++) { starts.push(starts[i - 1] + Math.max(last, Math.round(iv))); iv *= r; }
  return starts;                                       // frame offsets of each swap
};

export const SwapRun: React.FC<{images: string[]; start: number; push?: number}> = ({images, start, push = 0.12}) => {
  const f = useCurrentFrame();
  const sch = accelSchedule(images.length);
  const end = start + sch[sch.length - 1] + 6;
  let i = 0; while (i < sch.length - 1 && f - start >= sch[i + 1]) i++;
  const s = 1 + ramp(f, start, end, 0, push, E.exit);  // one accelerating push across the run
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <Img src={images[i]} style={{width: 720, height: 900, objectFit: 'cover', borderRadius: 28, transform: `scale(${s})`}} />
    </AbsoluteFill>
  );
};
```

### 18. People as content: users, personas and problem bearers · `people-content`

Family: content. See `imagery.md` and `backgrounds.md` `plate-grade`.

**What.** Photos or footage of people who are the story (staff with questions, a stressed manager, a buyer persona, the expert found,
creators using the product), graded into the film's palette and usually developing from a tint into full colour.

**Job.** People carry emotion (stress, relief) and scale (many staff, many creators) that UI cannot; tied to the case they are
evidence, not decoration.

**Numbers.** A develop from a tint, duotone or flat colour to full colour in 4-8 f (2 f through a mosaic); one look for all photos,
tied to the palette; framed as rounded cards, chips, posters or collage tiles, rarely full frame; one hero person, or 6-12 in a
collage.

**Build.**
- *Staff fly in.* Staff photos fly in from the left as tinted thumbnails, turn full colour in 4-6 f and line up into a row.
- *Photo streams.* Two diagonal streams of rounded photos flow from the corners toward a central icon, gradient-mapped first.
- *Skeletons to experts.* Three skeleton cards pulse a sheen; the photos develop over 9 f; the middle card grows.
- *Collage tiles.* A collage builds tile by tile, each tile flashing as a flat colour block first, then cutting to its photo.
- *Poster cards.* Poster cards of people slide in over each other, each in its own accent colour.

**Rich.** One grade turning any found photo into the film's world; photos that develop as they arrive; people who belong to the case.

**Cheap.** Generic smiling stock in a corner; photos with mismatched colour; a person unrelated to the product.

**Sound.** A soft whoosh per card; a tonal swell when a face develops into colour.

```ts
// DevelopPhoto.tsx: duotone -> full colour (SVG filter, CPU-friendly) and a portrait flip chip.
import {useCurrentFrame, Img} from 'remotion';
import {ramp} from './pace';

export const DevelopPhoto: React.FC<{src: string; start: number; dur?: number; shadow?: string; light?: string;
  w: number; h: number; id: string}> = ({src, start, dur = 6, shadow = '#0E5E63', light = '#BFF2EE', w, h, id}) => {
  const f = useCurrentFrame();
  const k = ramp(f, start, start + dur, 0, 1);                   // 0 = duotone, 1 = full colour
  const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const [s, l] = [hex(shadow), hex(light)];
  const row = (j: number) => `${0.3 * (l[j] - s[j])} ${0.59 * (l[j] - s[j])} ${0.11 * (l[j] - s[j])} 0 ${s[j]}`;
  return (
    <svg width={w} height={h}>
      <defs><filter id={id}><feColorMatrix type="matrix" values={`${row(0)} ${row(1)} ${row(2)} 0 0 0 1 0`} result="duo" />
        <feComposite in="SourceGraphic" in2="duo" operator="arithmetic" k2={k} k3={1 - k} /></filter></defs>
      <foreignObject width={w} height={h}><Img src={src} style={{width: w, height: h, objectFit: 'cover', filter: `url(#${id})`}} /></foreignObject>
    </svg>
  );
};
```

### 19. The integration constellation: official logos around the product · `integrations`

Family: content. See `brand-kits.md` (official logo files) and `items.md` `orbit-rings`.

**What.** Official logos of the tools the product works with arrive around it (in an orbit, a fan, wired tiles, a cycling pill), are
connected to it by lines or dots, and then fly into it or out past the camera.

**Job.** It answers "does it work with what I use?" visually, and real marks borrow trust.

**Numbers.** 3-22 logos (about 5 legible at once); 2-4 f apart; a wire or dot linking each logo to the product (never floating); the
exit flies into the product or out past the lens (scale x3-6 with motion blur); official, current SVG files.

**Build.**
- *Icon to pill.* The app icon springs into an outlined pill; a line builds word by word while five integration tiles appear, each
  wired to the pill.
- *Spiral galaxy.* A square fans out like a deck into a spiral of about 22 rotating cards (logos, file icons, photos) around a line.
- *Notification fan.* Out of a blur a glass notification card lands by shrinking, then fans into a row of tool cards.
- *Problem version.* Tool logos in white pills rise around a line, then fall (`problem-pile`).

**Rich.** Official, current logo files; each logo connected to the product; a choreographed arrival and exit.

**Cheap.** A static grid of logos; drawn look-alike marks; logos recoloured into the palette when the brand forbids it.

**Sound.** A pop per logo, a connection tick per wire, a whoosh as they fly past.

```ts
// LogoWires.tsx: logos slide in around a pill and are wired to dots on it (SVG lines, CPU only).
import {AbsoluteFill, useCurrentFrame, Img, staticFile} from 'remotion';
import {ramp, E} from './pace';

export const LogoWires: React.FC<{logos: string[]; start: number; pill: {x: number; y: number; w: number}}> = ({logos, start, pill}) => {
  const f = useCurrentFrame();
  const n = logos.length;
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {logos.map((_, i) => {
          const a = start + i * 3; const ang = Math.PI * (0.15 + (0.7 * i) / Math.max(1, n - 1));
          const tx = pill.x + Math.cos(ang) * 520 * (i % 2 ? 1 : -1), ty = pill.y + (i % 2 ? -1 : 1) * Math.sin(ang) * 300;
          const dot = {x: pill.x - pill.w / 2 + ((i + 0.5) * pill.w) / n, y: pill.y + 34};
          const k = ramp(f, a + 6, a + 16, 0, 1, E.arrive);
          return <line key={i} x1={dot.x} y1={dot.y} x2={dot.x + (tx - dot.x) * k} y2={dot.y + (ty - dot.y) * k}
            stroke="#C9CCD3" strokeWidth={2} />;
        })}
      </svg>
      {logos.map((src, i) => {
        const a = start + i * 3; const ang = Math.PI * (0.15 + (0.7 * i) / Math.max(1, n - 1));
        const tx = pill.x + Math.cos(ang) * 520 * (i % 2 ? 1 : -1), ty = pill.y + (i % 2 ? -1 : 1) * Math.sin(ang) * 300;
        const k = ramp(f, a, a + 12, 0, 1, E.arrive);
        return <div key={src} style={{position: 'absolute', left: tx - 56, top: ty - 56, width: 112, height: 112,
          borderRadius: 26, background: '#fff', boxShadow: '0 12px 30px rgba(0,0,0,0.12)', display: 'grid', placeItems: 'center',
          opacity: k, transform: `translate(${(1 - k) * (pill.x - tx) * 0.4}px, ${(1 - k) * (pill.y - ty) * 0.4}px) scale(${0.6 + 0.4 * k})`}}>
          <Img src={staticFile(src)} style={{width: 60, height: 60}} /></div>;
      })}
    </AbsoluteFill>
  );
};
```

### 20. The metaphor object: one object carries the abstract claim · `metaphor-object`

Family: content. See also `items.md` `hero-3d-object`.

**What.** A single built object (a brain, a pyramid, a sphere, a toggle, an hourglass, a ring, a dock) appears for 1-3 s, made from the
film's own primitives so it can grow out of the previous element and turn into the next.

**Job.** An invisible benefit becomes visible and memorable, and the film gets a signature image that is not a screenshot.

**Numbers.** On screen 1-3 s; built from the film's primitives (a dot, a line, a ring, a square, glass); one object per idea, reused
at most twice; it grows out of the previous element and turns into the next (never pops in).

**Build.**
- *Brain between arrows.* A brain outline icon between two pale arrows, the words of the line placed around it, while photo
  streams flow in.
- *Point to pyramid.* A ring becomes a point, a disc, a line pulled out of the disc, two dots, a third dot, a wire triangle, then a
  glass pyramid.
- *Rolling sphere.* A glossy blue sphere rolls in and the camera tracks it while the line plays.
- *Hourglass.* A glossy hourglass (time saved) sits between the export dialog and the result.
- *Signal fan.* A glowing node draws a sine-wave signal that splits into a fan of curves (the distraction map).

**Rich.** An object built from simple primitives step by step; it carries a word of the line; it hands over to the product.

**Cheap.** A stock 3D icon (a lightbulb, a rocket, a gear); an object that appears and disappears with no link; several unrelated
metaphors in one film.

**Sound.** A tonal note that rises as the object builds; a glassy hit on completion.

```ts
// ToggleMetaphor.tsx: OFF grey -> ON brand colour; pills swap from problems to benefits.
import {useCurrentFrame, interpolateColors} from 'remotion';
import {ramp, E} from './pace';

export const ToggleMetaphor: React.FC<{flipAt: number; word: string; problems: string[]; benefits: string[];
  brand?: string}> = ({flipAt, word, problems, benefits, brand = '#2B5BFF'}) => {
  const f = useCurrentFrame();
  const k = ramp(f, flipAt, flipAt + 8, 0, 1, E.arrive);
  const col = interpolateColors(k, [0, 1], ['#B9BDC6', brand]);
  const pills = k < 0.5 ? problems : benefits;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
        <span style={{fontSize: 120, fontWeight: 700, color: col}}>{word}</span>
        <div style={{width: 150, height: 80, borderRadius: 40, background: col, position: 'relative'}}>
          <div style={{position: 'absolute', top: 8, left: 8 + 70 * k, width: 64, height: 64, borderRadius: 32, background: '#fff'}} />
        </div>
      </div>
      <div style={{display: 'flex', gap: 18}}>{pills.map((p, i) => {
        const a = (k < 0.5 ? 0 : flipAt + 6) + i * 3;
        return <span key={p} style={{padding: '14px 26px', borderRadius: 40, fontSize: 34,
          background: k < 0.5 ? '#EEF0F3' : brand, color: k < 0.5 ? '#8A8F99' : '#fff',
          transform: `translateY(${k < 0.5 ? 0 : ramp(f, a, a + 10, 40, 0)}px)`, opacity: k < 0.5 ? 1 - k * 2 : ramp(f, a, a + 6)}}>{p}</span>;
      })}</div>
    </div>
  );
};
```

### 21. Before / after on the same layout · `before-after`

Family: story. See also `backgrounds.md` `ground-flip`.

**What.** One layout is shown in its before state and then in its after state (a takeover, a mode switch, a colour reveal) with the
camera and the composition held, so the difference is the whole message.

**Job.** The eye compares automatically; holding the layout turns a cut into an argument.

**Numbers.** Held: the layout, the framing, the type size. Changed: one variable (content, mode, colour, state). The switch: a cut, a
push-out by new items, or a 6-24 f material-by-material resolve. Each state 0.8-2.5 s.

**Build.**
- *Takeover.* A day view fills with personal events, then work tasks slide in from the side and push the events out.
- *Mode flip.* A light grid with a problem line and tiles collapses and the same layout returns in dark mode with the real problem.
- *Off to on.* A grey wordmark, an off toggle and three grey problem pills become a blue wordmark and three blue benefit pills
  (`items.md` `toggle`).
- *False colour to real.* A white-out reveals a room in animated false colour, resolving material by material to the photograph.
- *Pastel to true.* Photos and tiles arrive gradient-mapped in pastels and turn true colour.

**Rich.** An exact layout match; the change performed by objects; a material-by-material resolve.

**Cheap.** A split screen labelled "Before / After"; two unrelated screenshots.

**Sound.** The after state gets a different texture (a filter opening, a brighter chord), on the switch frame.

```ts
// SameLayout.tsx: render one layout twice and switch with a sweeping mask (or a hard cut).
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ramp, E} from './pace';
export const SameLayout: React.FC<{at: number; dur?: number; before: React.ReactNode; after: React.ReactNode}> =
({at, dur = 10, before, after}) => {
  const f = useCurrentFrame();
  const p = ramp(f, at, at + dur, 0, 100, E.glide);              // dur = 0 -> hard cut
  return (<AbsoluteFill>
    <AbsoluteFill>{before}</AbsoluteFill>
    <AbsoluteFill style={{clipPath: `inset(0 ${100 - p}% 0 0)`}}>{after}</AbsoluteFill>
  </AbsoluteFill>);
};
```

### 22. The human beat: a joke, a pause or a surprise · `human-beat`

Family: story.

**What.** One beat that breaks the pattern: the agent makes an unexpected, helpful offer; the music stops dead; a hyperbole goes wrong;
a line teases the viewer.

**Job.** Surprise resets attention and makes the product a character; viewers remember the joke and the name next to it.

**Numbers.** One per film (two at most); 0.5-4 s; right after the payoff, on the problem, or as the last argument; in the product's
voice, never a meme.

**Build.**
- *The extra offer.* After the done state the agent adds one more, slightly personal, useful suggestion.
- *The music stops.* A line replaces the previous one and the music decays into near-silence for half a second.
- *Escalation that breaks.* "Big", "Bigger" (a card outpainted sideways twice), then a short "Oops" as it goes too far.
- *The dry ending.* A last line that admits the alternative failed, in a frosted pill, after a parade of competitor windows.

**Rich.** A joke that comes from the case; timing: a held beat, a silence.

**Cheap.** A meme or a sticker; a pun in every line.

**Sound.** Silence is the strongest tool (near-silence for 0.5 s); otherwise a small comic sound on the punchline.

```ts
// silence.ts: carve a dead-silence window into the music for the punchline (Remotion <Audio volume={fn}>).
export const musicVolume = (f: number, fps: number, dropAt: number, dropS = 0.5, base = 0.8) => {
  const a = dropAt - Math.round(0.45 * fps), b = dropAt, c = dropAt + Math.round(dropS * fps);
  if (f < a) return base;
  if (f < b) return base * (1 - (f - a) / (b - a));     // decay into the joke
  if (f < c) return 0;                                  // near-silence (16 f)
  return base;                                          // return on the cut
};
// <Audio src={staticFile('bed.mp3')} volume={(f) => musicVolume(f, 30, 89)} />
```

### 23. The world arc: one ground family, changing at the act boundaries · `world-arc`

Family: story. See `backgrounds.md` (world systems, `ground-flip`).

**What.** Each film keeps one ground family (one hue, a dark and a light value) and changes the world at about half of its act
boundaries, usually dark -> light at the turn, often with a flash.

**Job.** Light is mood: darkness for the problem, light for the answer; changing the world at an act boundary says a new chapter
began without a title.

**Numbers.** One hue and 2-3 values per film; the world changes on about half of the act boundaries; the turn goes dark -> light, with
a 1-3 frame white flash or a light rise of 12-20 f; never the same pale paper and slate for every film.

**Build.**
- *Dark to light at the turn.* A near-black overload, the screen flashes to light, a white field with construction lines, then daylight.
- *Alternating stages.* A white stage, a dark stage with a glowing planet horizon, a saturated brand field, back to white for the end.
- *One family held.* One ground value for most of the film, the act changes carried by the content instead of the ground.

**Rich.** One hue with value changes; a light rise or a flash at the turn; the same place seen in a new light.

**Cheap.** A different random gradient every scene; the same grey ground everywhere.

**Sound.** The turn carries a section change in the music (a drop, a new layer).

```ts
// world.ts: one family, values per act; a white flash helper for the turn.
import {interpolate} from 'remotion';
export const WORLD = {dark: '#0B0E1A', glow: '#1B2A9A', light: '#FDFDFF', field: '#DDE2FD'}; // one hue
export const groundFor = (act: 'promise' | 'entry' | 'work' | 'claim') =>
  ({promise: WORLD.dark, entry: WORLD.light, work: WORLD.light, claim: WORLD.field})[act];
export const flash = (f: number, at: number) =>                       // 1 frame up, 3 frames down
  interpolate(f, [at - 1, at, at + 3], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
```

### 24. Sound-synced events: cues, not the bar grid · `sound-synced`

Family: pacing. See `sound.md` in this folder.

**What.** Every visible event (a word, a click, a cut, a toast) has its own short sound within about 1.5 frames; cuts are not locked to
the music's beat grid; the music carries the sections.

**Job.** Sound tells the viewer that something happened; synced cues make motion feel physical, while the music's own sections give the
film its large shape.

**Numbers.** An event-to-sound offset of 0-1.5 f; 5-7 sound onsets per second; cuts on the beat not required (except in sizzles); one
silence of 0.3-0.6 s as a punchline; -14 to -19 LUFS integrated; a tempo around 110-136 BPM.

**Build.** Make the cue sheet from the picture: list every event frame (word, click, toast, cut, settle), assign each a sound kind (tap,
tick, pop, tonal note, hit, whoosh, riser), place the sound's onset on the event frame (a whoosh's peak 0-3 frames after a cut), and let
the music carry the sections, with its change on the turn.

**Rich.** A distinct small sound per event type; sound on the frame of contact; a section change on the turn.

**Cheap.** One whoosh on every cut; music only; cuts forced onto bar lines while events float.

**Sound.** This entry is the sound rule.

```ts
// cues.ts: derive the cue sheet from the same timeline the picture uses (one source of truth).
type Ev = {f: number; kind: 'type' | 'click' | 'toast' | 'cut' | 'land' | 'word'};
const SFX: Record<Ev['kind'], string> = {type: 'tick.wav', click: 'click.wav', toast: 'ding.wav', cut: 'whoosh.wav', land: 'pop.wav', word: 'pop.wav'};
export const cueSheet = (events: Ev[]) => events.map((e) => ({from: e.f, src: SFX[e.kind]}));
// <>{cueSheet(EVENTS).map((c, i) => <Sequence key={i} from={c.from}><Audio src={staticFile(c.src)} /></Sequence>)}</>
```

### 25. Camera move pacing: short purposeful moves · `camera-pacing`

Family: pacing. See `camera-type.md`.

**What.** How often the camera moves, how long a move lasts, and what kind it is.

**Job.** A moving camera points: it tells the viewer where to look next; short moves keep energy without wandering.

**Numbers.** A move lasts 0.23-0.8 s (aim 0.44); 3.7-6.8 moves per 10 s; the camera moving on 22-41 % of frames; pans and zooms in
about equal share, rotations rare; the shape is start -> travel -> land (`E.glide`, `E.front`), or an acceleration into a cut (`E.exit`); drift
is one-directional and slow (0.3-2 px per frame), never back and forth.

**Build.** Give every move a target and a landing (or a cut at speed); front-load travel moves; push in on a hold that accelerates into
the cut; hand the speed across cuts.

**Rich.** Every move with a target; short, eased moves; speed handed across cuts.

**Cheap.** A constant slow float; a pan that comes back; a slow zoom on everything.

**Sound.** Fast moves get a whoosh shaped like the speed curve; snaps get a click.

```ts
// camTrack.ts: keyframed camera (x, y, scale) with per-segment easing; one target per move.
import {interpolate} from 'remotion';
import {E} from './pace';
type K = {f: number; x: number; y: number; s: number; ease?: (t: number) => number};
export const camAt = (f: number, keys: K[]) => {
  let i = 0; while (i < keys.length - 2 && f >= keys[i + 1].f) i++;
  const a = keys[i], b = keys[i + 1];
  const o = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const, easing: b.ease ?? E.glide};
  return {x: interpolate(f, [a.f, b.f], [a.x, b.x], o), y: interpolate(f, [a.f, b.f], [a.y, b.y], o), s: interpolate(f, [a.f, b.f], [a.s, b.s], o)};
};
// style: transform: `scale(${c.s}) translate(${-c.x}px, ${-c.y}px)` on the world layer; moves of 7-24 f at 30 fps
```

### 26. Format: the 2 x 2 grid of simultaneous mini-films · `grid-format`

Family: format. See also `backgrounds.md` `panel-grid` and `camera-type.md` `panel-cameras`.

**What.** Four panels (with or without gutters) each run their own loop or mini-film, cut on their own frames, and hand over to each
other; at every frame at least two panels move.

**Job.** Breadth at a glance (four features or four products at once) while each panel still tells a small story.

**Numbers.** 4 panels; loop lengths that rarely line up (52 / 104 / 148 frames, or 151 / 195 / 223 / 225 frames); the grid changes about
2.4 times a second; each pane holds 1-3 s; 1-3 sync points per film where panels cut together; at least 2 panels moving at every frame.

**Build.**
- *Short loop grid* (5 s). Four panels, no gutters or borders; one long take, a 104-frame loop, a 52-frame loop, one more; they line up
  only at the end.
- *Four products.* Four unrelated product films cut independently, so the grid changes about 2.4 times a second.
- *Cell loops* (60 fps). Loops of 151, 223, 225 and 195 frames; one cell ends by zooming out to its whole board.
- *Restarting pane.* One pane restarts its own loop while the others continue; later two panes hand a motion across.
- *Rounded panels.* 2 x 2 rounded panels on near-black; one on a 15 fps stepped clock; one where every frame moves.

**Rich.** Independent cut timing per panel; handovers between panels; loops that line up only at designed moments.

**Cheap.** Four panels cutting together; one panel static; four copies of the same animation.

**Sound.** One bed for the grid; each panel's events get quieter cues than a single-film mix.

```ts
// Grid2x2.tsx: four looping panels with their own loop lengths (frame % P), CPU only.
import {AbsoluteFill, useCurrentFrame, Freeze} from 'remotion';
export const Grid2x2: React.FC<{panels: {P: number; offset?: number; node: React.ReactNode}[]; gutter?: number}> = ({panels, gutter = 0}) => {
  const f = useCurrentFrame();
  const pos = [[0, 0], [1, 0], [0, 1], [1, 1]];
  return (<AbsoluteFill style={{background: '#0A0A0A'}}>{panels.map((p, i) => (
    <div key={i} style={{position: 'absolute', overflow: 'hidden', left: pos[i][0] * (960 + gutter / 2), top: pos[i][1] * (540 + gutter / 2),
      width: 960 - gutter / 2, height: 540 - gutter / 2}}>
      <Freeze frame={(f + (p.offset ?? 0)) % p.P}>{p.node}</Freeze>
    </div>))}
  </AbsoluteFill>);
};
// loops: [{P:148},{P:104},{P:52},{P:104}]; check: at every frame >= 2 panels moving
```

### 27. Format: the one-beat sizzle · `sizzle-format`

Family: format.

**What.** Every scene is exactly one beat long (two for anchors), hard cuts on the beat, alternating flat UI cards with rich 3D or photo
scenes, ending on a logo build.

**Job.** Breadth and energy: each scene is a promise, the logo is the sum.

**Numbers.** A scene lasts one beat (about 0.5 s at 114-120 BPM), anchors two beats; 12-20 scenes in 10 s; flat UI cards alternate with
rich 3D or photo scenes; hard cuts on the beat (here, and only here, the cut follows the bar grid); one strong motion with motion blur
inside each scene.

**Build.** At 114.3 BPM one beat is 31.5 frames at 60 fps: build 19 micro-scenes of one beat each (two for the opening and for one
anchor), each with one clear action; alternate textures; end on a logo build. An opening sizzle of seven words over pictures in about
3 s (11 f each) before an "introducing" line is a shorter use.

**Rich.** Each micro-scene with one clear action; texture alternation; real 3D (found models, pre-rendered).

**Cheap.** The same template card 19 times; cuts off the beat.

**Sound.** A loud, dense bed; cuts on beats; a hit per scene.

```ts
// beatScenes.ts
export const beatPlan = (bpm: number, fps: number, beats: number[]) => {   // beats per scene, e.g. [2,1,1,...,2,...]
  const bf = (60 / bpm) * fps; let acc = 0;
  return beats.map((b) => { const from = Math.round(acc); acc += b * bf; return {from, dur: Math.round(acc) - from}; });
};
// beatPlan(114.3, 60, [2, ...Array(10).fill(1), 2, ...Array(7).fill(1)]) -> 19 scenes, 31.5 f per beat
```

### 28. Format: the continuous one-take world · `one-take-format`

Family: format. See also `transitions.md` `continuous-camera` and `backgrounds.md` `world-3d`.

**What.** One camera travels through one world (a 3D space, a white canvas, one object) and every scene change is a morph, a fly-through
or a pan to another area of the same world.

**Job.** Continuity reads as one idea; the viewer never re-orients, so the film feels effortless and premium.

**Numbers.** 0-2 hard cuts per film; seams are morphs, fly-throughs, pans to a new area, mosaic or light wipes; 2-6 changes per 10 s inside
the take; one coherent space with consistent light.

**Build.**
- *Glass-and-light world* (45 s). A runway, a hall, an altar, glass planets, a cube, a sphere, a pipeline, a neon horizon, the lockup:
  one continuous camera.
- *White canvas* (37 s). One continuous white canvas; the camera pans, scales and cuts between its areas; a few mosaic wipes.
- *One object.* One continuous camera on one object for about 4 s (a dot becoming a pyramid), then a zoom-through into the product.

**Rich.** A planned world layout the camera can travel; morphs where one element becomes the next.

**Cheap.** A long take that only zooms; cross-dissolves pretending to be continuous.

**Sound.** A continuous bed with swells at each new area; whooshes shaped by the camera speed.

```ts
// Canvas world: lay out all scenes on one big canvas and move a camera across it.
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {camAt} from './camTrack';
export const OneTake: React.FC<{areas: {x: number; y: number; node: React.ReactNode}[];
  keys: {f: number; x: number; y: number; s: number}[]}> = ({areas, keys}) => {
  const f = useCurrentFrame(); const c = camAt(f, keys);
  return (<AbsoluteFill style={{background: '#fff', overflow: 'hidden'}}>
    <div style={{position: 'absolute', left: 960, top: 540, transform: `scale(${c.s}) translate(${-c.x}px, ${-c.y}px)`}}>
      {areas.map((a, i) => <div key={i} style={{position: 'absolute', left: a.x - 960, top: a.y - 540, width: 1920, height: 1080}}>{a.node}</div>)}
    </div>
  </AbsoluteFill>);
};
```

### 29. Format: the voice-over explainer with kinetic captions · `vo-explainer`

Family: format. See `sound.md` (voice and ducking) and `camera-type.md` `word-build-centred`.

**What.** A narrator speaks the story; every phrase appears on screen as kinetic type (word by word, one keyword in the brand colour),
alternating with product scenes that show what is said.

**Job.** The voice carries the argument so the picture is free to show; kinetic captions make the voice watchable with the sound off.

**Numbers.** 1.0-1.5 words per second on screen (2.5 for a very short piece); one keyword per line in the brand colour; each word built on
its spoken word, 0-2 f ahead of the voice; caption scenes alternate with product scenes every 1.5-4 s; the music ducks 6-10 dB under the
voice.

**Build.**
- *Long explainer* (2 min, female voice). Every spoken phrase appears as kinetic type in a rounded geometric sans (black plus one
  brand-blue keyword), word by word on the voice, alternating with dashboard scenes.
- *Captions with a style cycle.* Each new word arrives in a pixel face, turns into an italic serif, then the grotesk.
- *Destroyed subtitles.* The voice line appears as subtitles that break into light and are reborn (2-frame glitch states, a light streak,
  one white frame).

**Rich.** Word timing from the actual voice; a per-word style transformation; pictures that show the spoken claim.

**Cheap.** Static subtitles at the bottom; every word in the same style; a voice over unrelated stock.

**Sound.** The voice leads; the music ducks 6-10 dB under it; small pops on keyword arrivals.

```ts
// VoCaption.tsx: words timed from a VO alignment (e.g. whisper word timestamps), each word restyled over 6 f.
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {ramp} from './pace';
export const VoCaption: React.FC<{words: {w: string; t: number}[]; keyword?: string; brand?: string}> = ({words, keyword, brand = '#2B5BFF'}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  return (<div style={{display: 'flex', gap: 22, justifyContent: 'center', fontSize: 84, fontWeight: 600}}>
    {words.map(({w, t}, i) => {
      const a = Math.round(t * fps) - 1;                         // 1 f ahead of the voice
      if (f < a) return null;
      const k = ramp(f, a, a + 6);
      const isKey = w.replace(/[.,]/g, '') === keyword;
      return <span key={i} style={{filter: `blur(${(1 - k) * 8}px)`, color: isKey ? brand : k < 1 ? brand : '#111',
        fontStyle: k < 0.5 ? 'italic' : 'normal'}}>{w}</span>;
    })}
  </div>);
};
```

### 30. Ending inside the action (no end card) · `end-in-action`

Family: story. See also `transitions.md` `end-handover`.

**What.** The film stops on a moving frame inside the product or on the call to action, without a separate end card or fade.

**Job.** It ends on the action the viewer should take (send, book) or on the product working; it leaves momentum instead of a full stop.

**Numbers.** A teaser or sting of 6.5-13 s, or a film up to 30 s; the last frame mid-move (velocity above 0); the brand shown earlier
(in the first 10 %) or inside the product UI.

**Build.**
- *Send.* The cursor glides onto the Send button and turns into a hand; the film ends there, mid-move.
- *Burst.* The call-to-action button is grabbed and clicked, white blocks burst out of it; the film ends mid-burst.
- *Settling result.* The result card settles with accent dots; the film ends mid-move; or the window recedes in a zoom-out and the film
  cuts.

**Rich.** The last frame is the most product-specific frame; the brand already established earlier.

**Cheap.** An abrupt end with no brand anywhere; a fade to black on a static UI.

**Sound.** The music ends on a hit or is cut with the picture; no long tail.

```ts
// The ending is simply the last Sequence ending while its element still moves:
// <Sequence from={150} durationInFrames={46}><Cursor from={{x:1500,y:900}} ctrl={{x:1300,y:500}} to={{x:1180,y:640}}
//   start={0} travel={40} /></Sequence>  // composition durationInFrames = 196: the cursor is still moving at the last frame
export const endsMoving = (lastFrameVelocityPx: number) => lastFrameVelocityPx > 0.5; // gate for this ending
```
