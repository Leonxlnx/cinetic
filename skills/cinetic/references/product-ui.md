# Product UI in motion

Covers showing a real product on screen: the smart part, one data module whose asserts hold the story's facts, legible framing, layout derived from data, state transitions (FLIP inserts, counters, rolling labels, chips), cursor physics, typing cadence, walkthrough chapters, and the pause test. Read it before building any act that shows the product, and before a UI-truth review.

The numbers are proven defaults from shipped films. The product's real behaviour wins over any of them: if the app animates a row in 150 ms, show that.

**Contents**
1. [Real UI, not screenshots](#1-real-ui-not-screenshots)
2. [The data module](#2-the-data-module)
3. [Layout from data](#3-layout-from-data)
4. [State transitions](#4-state-transitions)
5. [Cursor physics](#5-cursor-physics)
6. [Typing cadence](#6-typing-cadence)
7. [Walkthrough chapters](#7-walkthrough-chapters)
8. [The pause test](#8-the-pause-test)

---

## 1. Real UI, not screenshots

- **Build the product's own surfaces as React components** (`src/app/*.tsx`) fed by one data module. A screenshot can be texture in a background plate, never the hero: it cannot change state, and state changing is what the film is about.
- **Named, specific, consistent data.** Real-sounding names, amounts and times that agree with each other. No fake KPIs, up-and-to-the-right charts, lorem ipsum, stock icons or generic dashboards: those read as "any product".
- **Cause → action → result.** Every product action has a visible cause (a click, a typed request, an incoming event), the action itself, and a result that holds ≥ 36 f before the camera leaves. One element carries the action per shot.
- **The UI survives a pause.** Any frame could be a screenshot of the real app: correct dates, consistent counts, labels that match positions (§8).
- **Show the smart part.** The proof beat shows the feature's non-trivial behaviour, because that is the whole point of a feature video: per-item assignment rather than an even split, proportional allocation of shared costs, conflict resolution, ranking rather than listing, only the future replanned. Take it from the "unlike the obvious version, it…" line in `TREATMENT.md` (`references/concept-and-story.md` §2). Restraint applies to decoration, never to the product's intelligence: a film that shows a simpler behaviour than the product has undersells it, however well it moves.
- **Name the feature once, and show what it lives in.** A stranger should know which product and which feature this is: enough of the app's real chrome (its header, sidebar or window edge) to read as software, and the feature's name exactly once, where the product itself would show it (the tab, the menu item, the button that causes the action) or as the one line of copy or on the end card. A feature name as a headline is a copy tell; never naming it is the opposite failure, because a clever behaviour nobody can name can't be searched for or asked about. Put the name in `data.ts` with the rest of the strings.
- **Fill the frame.** The UI must be readable at 1080p and on a phone (the 480 px legibility sheet). Frame the product full-bleed, or push the camera in until the part doing the work fills most of the frame; a small card floating in empty space reads as a slide and its type is unreadable when the film is embedded. Text that carries the story is ≥ 22 px after camera scale (28 preferred, §3).

## 2. The data module

All content lives in `src/app/data.ts`. Labels, counts and positions are derived from it, and asserts at module load make wrong data fail the render (and `export-cues.ts`) instead of shipping. Two kinds of assert belong here: the data is internally true (dates, weekdays, ids, plurals), and the data agrees with the story the film tells (who paid, what the headline number is, what a ratio claims).

```ts
// src/app/data.ts: every label, count and position on screen derives from this file
export type YMD = [number, number, number];
export type Invoice = { id: string; client: string; cents: number; due: YMD; paid: boolean };
export type Reminder = { invoice: string; status: 'queued' | 'sent' };

export const TODAY: YMD = [2026, 9, 14];
export const INVOICES: Invoice[] = [
  { id: 'inv-0141', client: 'Marlow & Reyes', cents: 184_000, due: [2026, 9, 15], paid: false },
  { id: 'inv-0142', client: 'Alder Dental', cents: 42_500, due: [2026, 9, 16], paid: false },
  { id: 'inv-0138', client: 'Kestrel Studio', cents: 96_000, due: [2026, 9, 11], paid: true },
  { id: 'inv-0143', client: 'Okafor Legal', cents: 310_000, due: [2026, 9, 18], paid: false },
];
export const REMINDERS: Reminder[] = [
  { invoice: 'inv-0141', status: 'sent' },
  { invoice: 'inv-0142', status: 'sent' },
  { invoice: 'inv-0143', status: 'queued' }, // sends on the payoff beat
];
// The story's facts, in one place, so the copy and the pictures can be checked against them.
export const STORY = { reminders: 3, headline: '$5,365.00 open', daysBefore: 31, daysAfter: 6, sooner: 5 };

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Weekday from the calendar, never typed by hand (a fixed date is deterministic; Date.now is not). */
export const dow = ([y, m, d]: YMD) => DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
export const plural = (n: number, one: string, many: string) => (n === 0 ? `No ${many}` : `${n} ${n === 1 ? one : many}`);
export const money = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const byId = (id: string) => INVOICES.find((i) => i.id === id);

export const OPEN = INVOICES.filter((i) => !i.paid);
export const OPEN_TOTAL = OPEN.reduce((a, i) => a + i.cents, 0);

const assert = (ok: boolean, msg: string) => {
  if (!ok) throw new Error(`data.ts: ${msg}`);
};
// the data is internally true
assert(dow(TODAY) === 'Mon', 'TODAY must be a Monday (the film says "this week")');
assert(new Set(INVOICES.map((i) => i.id)).size === INVOICES.length, 'duplicate ids');
assert(plural(1, 'invoice', 'invoices') === '1 invoice', 'plural helper');
assert(OPEN.every((i) => dow(i.due) !== 'Sat' && dow(i.due) !== 'Sun'), 'an invoice falls due on a weekend');
// the data agrees with the story
assert(REMINDERS.length === STORY.reminders && OPEN.length === STORY.reminders, 'the copy says three open invoices, three reminders');
assert(REMINDERS.every((r) => byId(r.invoice)?.paid === false), 'a client who already paid never gets a reminder');
assert(STORY.headline.startsWith(money(OPEN_TOTAL)), 'the headline total is the sum of the open invoices');
assert(Math.round(STORY.daysBefore / STORY.daysAfter) === STORY.sooner, '"5x sooner" must match 31 days -> 6 days');
// no number twice in one frame: list what each shot shows, derived from the data
const shot = (name: string, shown: string[]) => assert(new Set(shown).size === shown.length, `${name}: a number appears twice in one frame`);
shot('proof', [money(OPEN_TOTAL), ...OPEN.map((i) => money(i.cents)), plural(REMINDERS.length, 'reminder', 'reminders')]);
```

What the story asserts catch, each a defect that is easy to ship and obvious to a viewer:
- **Roles and states.** The person or record that already acted doesn't appear as still owing, pending or unsent.
- **Sums and headlines.** A total in the copy is the sum of what is on screen, to the cent.
- **Ratios.** A stated multiple matches the numbers beside it: "40× faster" next to 12:30 → 0:15 is wrong (that is 50×). Compute the claim from the data, or assert it.
- **Before and after counts.** What the "before" shows and what the "after" promises (3 open → 0 open, 12 clashes → 0) come from the same lists.
- **One number, once per frame.** The same figure shown twice at once (a total in the header and again in a caption) reads as a mistake. List each shot's visible numbers and assert they are unique.
- **Order.** A list the copy calls sorted or ranked is sorted by the value shown.

- **Before and after share ids.** When the product changes things, write the states as lists (`BEFORE`, `AFTER`, `FINAL`) whose items share ids, so an item can travel between layouts and keep its label. Assert what the after state promises: no overlaps, everything inside the visible window, counts that match the copy.
- **The product only changes the future.** Assert that nothing before "now" moved: replanning the past was a real UI-truth defect in Tessel.
- **One meaning per colour.** If the accent means "now" or "new", it never also marks an error or a success. A red ring meaning both "clash" and "done" was flagged.

## 3. Layout from data

- **Positions and labels are functions of the data** (a row's y from its index, a block's rect from its start and end). A moved item carries its own label, and a label can never go stale.
- **Readable at shot scale:** text the viewer must read is ≥ 22 px on screen after the camera scale (28 px preferred). Smaller text is texture and must not carry the story. Under 3D, lay out at shot scale with CSS `zoom` (see `references/camera.md` §5).
- **Tabular figures for every number** (`fontVariantNumeric: 'tabular-nums'`), so counters, times and amounts never jitter in width.
- **Paint in z order.** Sort items by z before rendering (lifted items above grounded ones); stacks overlap left over right; badges on avatars get a 2 px ring in the background colour, so an overlap reads as layering, not as a bite.
- **Collapse empty regions** until their content arrives. A section header over 120 px of nothing reads as a broken app.
- **Decide layout thresholds per whole frame.** If a card switches layout at 40 px tall, decide it from `fd(f)` so every motion-blur sub-sample agrees (Tessel's `keepLayout`).

## 4. State transitions

### 4.1 Inserts and reorders (FLIP, computed)
In a frame-driven renderer you do not measure first and last positions in the DOM: compute both layouts from the data and interpolate between them. That is FLIP by construction, and it is exact on every frame.

```ts
import { E, prog } from '../lib/anim';

const ROW = 64;
type Row = { id: string; label: string };
/** Row positions while `insertId` grows in at frame `at`: siblings shift as it opens (18-24 f). */
export const listLayout = (rows: Row[], insertId: string, f: number, at: number) => {
  const grow = prog(f, at, at + 20, E.ui);
  let y = 0;
  return rows.map((r) => {
    const isNew = r.id === insertId;
    const h = isNew ? ROW * grow : ROW;
    const out = { ...r, y, h, opacity: isNew ? prog(f, at + 8, at + 20, E.smooth) : 1 };
    y += h;
    return out;
  });
};
```

- The new row's content fades in only once its slot is half open, so text never overlaps its neighbours.
- A **reorder** interpolates each item from its before-y to its after-y on one curve (`E.glide` for 150–350 px, `E.inOut` for longer), lifting the moving item in z (shadow per `references/motion-tokens.md` §7) while siblings shift on the same timing.
- **New things arrive in the accent and relax to neutral over 10–30 f**: a new row's marker, a changed value, a typed letter. Colour then means "just happened". Colour ramps and OKLab mixing are in `references/brand-and-color.md`.

### 4.2 Counters count during the action
A counter decrements (or increments) on each visible event, on whole frames, and rolls each changed digit over 6–8 f. Roll it (a masked vertical slide, as below) or cut it; never crossfade two numbers in place, because the half-and-half frames read as a ghosted double image, worse after motion blur. A counter frozen at "12" while everything resolves, then flipping to "0" in one frame, contradicts the picture.

**State follows its cause on the landing frame.** The event frame is the frame the cause lands: the contact frame of the tile that seats, the settle of the row that arrives, the press of the button. The counter starts rolling there, the check draws there, the total changes there, never a beat later, when it reads as a second, unexplained event. Export those frames from the act once (`LANDINGS`, the same constant `src/sync.ts` puts the sound on) and drive the counter, the check and the sound from it, so the three can't drift apart.

```tsx
import React from 'react';
import { E, fd, prog } from '../lib/anim';

const LINE = 1.1; // em per digit on the wheel
/** A counter that starts at `start` and steps down once per event frame (`events` sorted), each change rolling over 7 f. */
export const Counter: React.FC<{ f: number; start: number; events: number[]; digits?: number }> = ({
  f,
  start,
  events,
  digits = 2,
}) => {
  const n = events.filter((t) => fd(f) >= t).length; // discrete: whole frames only
  const roll = n > 0 ? prog(f, events[n - 1] - 1, events[n - 1] + 6, E.ui) : 1; // moving on the event frame
  const now = start - n;
  const before = n > 0 ? now + 1 : now;
  return (
    <span style={{ display: 'inline-flex', fontVariantNumeric: 'tabular-nums', height: `${LINE}em`, overflow: 'hidden' }}>
      {Array.from({ length: digits }, (_, i) => {
        const p = 10 ** (digits - 1 - i);
        const a = Math.floor(before / p) % 10;
        const b = Math.floor(now / p) % 10;
        const steps = (a - b + 10) % 10; // one step down the wheel per change
        const pos = 10 + a - steps * roll; // index into 0-9,0-9
        return (
          <span key={i} style={{ display: 'flex', flexDirection: 'column', transform: `translateY(${-pos * LINE}em)` }}>
            {Array.from({ length: 20 }, (_, k) => (
              <span key={k} style={{ height: `${LINE}em`, lineHeight: `${LINE}em` }}>{k % 10}</span>
            ))}
          </span>
        );
      })}
    </span>
  );
};
```

- Pair the number with its noun through `plural()`: "1 clash", "No clashes", never "1 clashes" or "0 clashes".
- Export the event frames (`CLEARED_AT`) from the act so the sound design ticks on them (`references/timing-grid.md` §4).

### 4.3 Labels roll with the move
A time or value label attached to a moving item updates in the product's real step size while it moves (Tessel rolled times in 5-minute steps), computed on whole frames:

```ts
import { fd } from '../lib/anim';
const r5 = (h: number) => Math.round(h * 12) / 12; // 5-minute steps
const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
/** Label for an item whose start time (hours) is animating: `startAt` is evaluated on the whole frame. */
export const label = (f: number, startAt: (frame: number) => number) => hhmm(r5(startAt(fd(f))));
```

### 4.4 Chips, pills and inline tokens
- A chip exists only once its first character is typed; an empty chip keeps its padding and pushes the caret 8–75 px away.
- **Padding grows with the reveal** (`padding: 4 * chipIn` px) while the font weight stays constant. Animating weight (400 → 560) reflows the rest of the line; animate background and colour only.
- A pill that changes state (pending → confirmed) swaps its text on a single element at the midpoint of a short move or colour change, never by cross-fading two pills.

### 4.5 Moving elements never cover text
A chip flying to its slot, a card sliding over a list, the device crossing the frame: whatever moves passes over text, and for the frames it covers a line the viewer is reading, the frame reads as broken (a split chip sliding across a card's labels, paused, is a UI bug). Plan it rather than hoping:
- **Route around the text.** Paths run through gutters, above or below the rows, or leave the text's column before it arrives. Lay out the text first, then the paths.
- **Or order the layers on purpose.** The text the viewer reads paints above the moving thing (later in paint order, or a higher z-index), or the covered text has already left or not yet arrived. A moving object may pass behind a line; it never slides over one that is still being read.
- **Check it from the data.** Positions are functions of the data (§3), so a path can be tested before anything renders:

```ts
// src/app/paths.ts: the first frame a moving rect covers any text rect (with a pad), or -1
export type Rect = { x: number; y: number; w: number; h: number };
const hits = (a: Rect, b: Rect, pad = 8) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
export const covers = (rectAt: (f: number) => Rect, texts: Rect[], from: number, to: number) => {
  for (let f = from; f <= to; f++) if (texts.some((t) => hits(rectAt(f), t))) return f;
  return -1;
};
// in data.ts or the act module, at load: assert(covers(chipAt, CARD_LABELS, FLY.from, FLY.to) < 0, 'the chip crosses the card labels');
```

- **Check it on the frames.** Tag the moving element `data-mover="<id>"` (and the text `data-text="<id>"` as always). `scripts/layout-audit.sh` then samples each text box with `elementsFromPoint`, which respects z-order and transforms as rendered, and fails `covered: <text> … under <mover>`. Audit the densest frames of every move with `--frames`, not only the cues.

## 5. Cursor physics

Use a cursor only while a human is acting. Once the product acts on its own, the cursor leaves (fade over 10 f after its last click, or exit the frame) and never returns: an autonomous product with a cursor parked in shot reads as a screen recording.

| Property | Default | Why |
|---|---|---|
| Shape | a plain system-style arrow, drawn at a readable size for the shot (1.4–2.2× native when the camera is pushed in) | a custom cursor distracts from the UI |
| Path | quadratic arc, control point offset 15–25% of the path length to one side | wrists move in arcs; straight lines read as robotic |
| Travel | 36–48 f on `E.out` (velocity decays about ×0.95/frame); 29 f for a short final approach | arrives decisively, settles on the target |
| Hover | the target shows its hover state about 6 f before the press | real apps respond before the click |
| Press | scale to 0.88 over 4 f, recoil over 8 f; the button reacts on the same frame | the click has a physical moment for the sound |
| Rate | ≤ 1 click per 30 f; irregular 7 / 12 / 18 f gaps between micro-actions | a person, not a macro |
| Placement | transform only (`src/fx/Cursor.tsx`), in screen space, target from `toScreen(shot, point)` (`references/camera.md` §2) | fractional left/top snaps to pixels; a cursor under the camera would balloon with the zoom |

`src/fx/Cursor.tsx` ships the arrow (`<Cursor x y scale press opacity />`, placed by transform only) and two helpers: `cursorArc(a, b, t, bow)` for the bowed path (negative `bow` flips the side) and `pressAt(frame, at)`, a 0..1 press that goes down over 4 f and recoils over 8 f (the arrow scales to 0.88 at full press).

```tsx
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { E, prog } from '../lib/anim';
import { Cursor, cursorArc, pressAt } from '../fx/Cursor';

const FROM = { x: 1480, y: 900 }; // screen space: enters from lower right
const SEND = { x: 1236, y: 612 }; // the button, projected from the product (toScreen)
const MOVE = [140, 182] as const; // 42 f of travel, act-local
const CLICK = 186; // 4 f after arrival, so the hover state shows first

export const ClickSend: React.FC = () => {
  const f = useCurrentFrame();
  const p = cursorArc(FROM, SEND, prog(f, MOVE[0], MOVE[1], E.out), 0.2); // bows up, over the chord
  const shown = prog(f, MOVE[0] - 8, MOVE[0], E.smooth) * (1 - prog(f, CLICK + 20, CLICK + 30, E.smooth));
  return <Cursor x={p.x} y={p.y} scale={1.6} press={pressAt(f, CLICK)} opacity={shown} />;
};
```

- Put the click sound on the press frame and pan it with the cursor's x (±0.3); see `references/sound.md`.
- Keep the arc inside the frame and clear of the text the viewer is reading.

## 6. Typing cadence

Typed input runs at about 30 characters per second with a human rhythm: per-character weights, quicker spaces, a breath after a sentence. The schedule is computed once and exported for the sound.

```ts
import { rand } from '../lib/anim';
import { ACT, CUE } from '../timeline';

const L = (abs: number) => abs - ACT.proof.from;
export const TYPE = { start: CUE.feat1 + 30, end: CUE.feat1 + 150 }; // absolute: 120 f for 60 characters
export const PROMPT = 'Protect my mornings. Gym Tue + Thu. Ship the deck by Friday.';
/** Act-local frame each character appears: ~30 chars/s between TYPE.start and TYPE.end. */
export const CHAR_AT: number[] = (() => {
  const w = [...PROMPT].map((ch, i) => {
    let x = 0.75 + rand(`k${i}`) * 0.6; // per-character variation
    if (ch === ' ') x *= 0.7; // spaces are quick
    if (PROMPT[i - 1] === '.') x += 2.2; // a breath after a sentence
    return x;
  });
  const total = w.reduce((a, b) => a + b, 0);
  const a = L(TYPE.start);
  const span = L(TYPE.end) - a;
  let acc = 0;
  return w.map((x) => a + ((acc += x) / total) * span);
})();
/** Absolute key frames for src/sync.ts, fractional on purpose: score.py thins and jitters them in time. */
export const KEY_FRAMES = CHAR_AT.map((c) => c + ACT.proof.from);
/** Characters visible at an act-local frame: pass fd(f), so every sub-sample of a frame agrees. */
export const typed = (wholeFrame: number) => CHAR_AT.filter((c) => c <= wholeFrame).length;
```

- Size the span from the text: `TYPE.end − TYPE.start ≈ PROMPT.length × 2 f` at 60 fps (Tessel typed 60 characters over 120 f).
- **Each new character arrives in the accent and relaxes to ink over 12 f** (quadratic ease-out on its age `fd(f) − CHAR_AT[i]`), so the eye tracks the caret.
- **The caret** is solid while typing and blinks 30 f on / 30 f off when idle, decided on `fd(f)`. `src/fx/TypeOn.tsx` does all of this (`typeFrames()` gives the key frames).
- Keep the typed field alive: a slow push on the bar and a parallax drift behind it (`references/camera.md` §4). Typing on a locked-off frame measured as a dead hold.
- The sound side (the `typing` style, thinning to about 12 keys/s, accented word starts, space and return keys) lives in `references/sound.md` §5.5c.

## 7. Walkthrough chapters

- **One chapter per 2–4 bars**, chapter changes on downbeats; 1–2 capabilities per 20 s, never a tour of every feature.
- **Each chapter** is: a camera move onto the feature's anchor (`references/camera.md`), one cause → action → result, a caption of ≤ 6 words, and the result held ≥ 36 f before the next move.
- **Captions** sit on the eye line or the lower third, never over the action, and follow the text-hold rule (36 f + 6 f per word). Burn them in for sound-off viewing and ship an SRT (`references/finishing.md`).
- **A persistent anchor** (the story device, or the product's own "now" or selection marker) carries across chapters, so the walkthrough reads as one continuous product, not a slideshow.
- Screen recordings of the real app are useful as texture and as a guide to its real behaviour; rebuild the hero moments as components so they can be timed to the grid.

## 8. The pause test

Pause on any frame and check it as a screenshot. Run this on the act contact sheets and at every cue (`scripts/sheet.py`, `npx remotion still`).

- Dates and weekdays agree (asserted in `data.ts`); times sit where their labels say.
- Every count matches what is visible, and counts change while the events happen.
- The frame agrees with the story: who acted, what is owed or done, totals and stated ratios; no number appears twice in one frame (§2).
- Plurals, casing and brand names are right; no placeholder strings.
- Every number uses tabular figures; nothing jitters in width.
- Labels travel with their items; nothing shows a stale value after a move.
- The accent keeps one meaning; success and error never share a colour.
- Nothing in the past changed; only the future was replanned.
- Text that carries meaning is ≥ 22 px on screen (32 px in 9:16); nothing important is cropped, or covered by a moving element or edge (§4.5).
- Counters, checks and totals have changed on the landing frame of their cause, not a beat later (§4.2).
- The feature is named once and the product reads as an app (§1).
- No cursor after the product became autonomous; at most one click per 30 f.
- Discrete state (typed text, caret, counters, layout switches) is computed from `fd(f)`, so motion-blur sub-samples never show a double caret or a half-typed letter.
