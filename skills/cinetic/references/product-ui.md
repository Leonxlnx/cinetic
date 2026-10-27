# Product UI in motion

How a product moves on screen. The product is the hero of a launch film and of an update film: it should look like a
working app doing its job, at film size, in one continuous camera, with the house's few rules of behaviour. Copy
stays calm fragments; the product does the talking. Read this before building any act that shows the product, and
before a UI-truth review. The product's real behaviour wins over any number here: if the app animates a row in
150 ms, show that.

Everything is a pure state function of the frame (any frame, any order, sub-frames included) plus one component that
draws it with transforms and opacity. Numbers are 60 fps frames (`f@60`) unless they say otherwise; every function
takes the film context or reads it inside a component.

**Contents**
1. [The grammar in one screen](#1-the-grammar-in-one-screen)
2. [The data module](#2-the-data-module)
3. [Layout from data](#3-layout-from-data)
4. [State transitions](#4-state-transitions)
5. [The product kit](#5-the-product-kit)
6. [Cards, bento and the one spring](#6-cards-bento-and-the-one-spring)
7. [Bubbles, scroll, develop, hard steps, counters](#7-bubbles-scroll-develop-hard-steps-counters)
8. [Cursor](#8-cursor)
9. [Typing](#9-typing)
10. [Supplied screenshots and product shots](#10-supplied-screenshots-and-product-shots)
11. [Declarations](#11-declarations)
12. [A product moment in one camera](#12-a-product-moment-in-one-camera)
13. [Walkthrough chapters](#13-walkthrough-chapters)
14. [The pause test](#14-the-pause-test)

---

## 1. The grammar in one screen

- **Real UI, not screenshots as the hero.** Build the product's own surfaces as components fed by one data module.
  A supplied screenshot moves under the camera, with the one element the film acts on rebuilt live over it (§10).
- **Arrivals are front-loaded.** A panel, a card, a bubble, a tile: the biggest step is on its first frame, then a
  long settle. Never an S-curve into place, never a fade-up from nothing, never a scale from zero.
- **One spring per film.** One kind of element (`SPRING_CLASS`) may overshoot, every time it appears: usually the
  container that pops open on the click. Everything else settles critically or on an arrive curve.
- **Hard UI against eased type.** The product changes state the way software does: a list jumps a whole row, a
  counter ticks linear values and is still counting when the shot cuts, a selection snaps in one frame. The copy
  around it eases. The contrast is what makes the UI read as the product and the type as the film.
- **Clicks have a grammar.** Squeeze, a short hold, release that snaps home at speed; nothing above rest afterwards.
- **The cursor is a hand.** It travels a bowed path, swings upright as it lands, changes glyph with what it is over,
  presses, and leaves once the product acts on its own.
- **A flick is a U turned over.** Speed builds by a constant ratio a frame, peaks, brakes on friction, lands on the
  target. It is the one UI move fast enough to want camera blur: it declares its own blur range.
- **Imagery develops.** Pictures arrive as a tint in the film's own colours and come into full colour column by
  column, on a static filter plus an opacity fade.
- **Real content, film sizes.** A believable product with its own name, data that adds up, drawn icons, avatars as
  shapes, real states (hover, pressed, typing, approved). Every web size ×1.9 (`uiFilm()`), nothing under 36 px in
  focus; product numbers and labels at `caption` and up (`references/copy-and-type.md` §7).
- **Cause → action → result.** Every product action has a visible cause (a click, a typed request, an incoming
  event), the action itself, and a result that holds ≥ 36 f before the camera leaves. One element carries the action
  per shot.
- **Show the smart part.** The proof beat shows the feature's non-trivial behaviour (per-item assignment rather than
  an even split, ranking rather than listing, only the future replanned), from the "unlike the obvious version, it…"
  line in `TREATMENT.md`. A film that shows a simpler behaviour than the product has undersells it.
- **Name the feature once, and show what it lives in.** Enough of the app's real chrome to read as software, and the
  feature's name exactly once, where the product itself would show it, or as the one line of copy or on the end card.
- **Fill the frame.** Push in until the part doing the work fills most of the frame; frame UI as macro crops and hero
  planes, bleeding past an edge. A small card floating in empty space reads as a slide.

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
- **The product only changes the future.** Assert that nothing before "now" moved: replanning the past is a UI-truth defect.
- **One meaning per colour.** If the accent means "now" or "new", it never also marks an error or a success. A red ring meaning both "clash" and "done" was flagged.

## 3. Layout from data

- **Positions and labels are functions of the data** (a row's y from its index, a block's rect from its start and end). A moved item carries its own label, and a label can never go stale.
- **Readable at shot scale:** text the viewer must read is ≥ 36 px on screen after the camera scale (`TEXT_MIN`). Smaller text is texture and must not carry the story. Under 3D, lay out at shot scale with CSS `zoom` (see `references/camera.md` §9).
- **Tabular figures for every number** (`fontVariantNumeric: 'tabular-nums'`), so counters, times and amounts never jitter in width.
- **Paint in z order.** Sort items by z before rendering (lifted items above grounded ones); stacks overlap left over right; badges on avatars get a 2 px ring in the background colour, so an overlap reads as layering, not as a bite.
- **Collapse empty regions** until their content arrives. A section header over 120 px of nothing reads as a broken app.
- **Decide layout thresholds per whole frame.** If a card switches layout at 40 px tall, decide it from `fd(f)` so every motion-blur sub-sample agrees.

## 4. State transitions

### 4.1 Inserts and reorders (FLIP, computed)
In a frame-driven renderer you do not measure first and last positions in the DOM: compute both layouts from the data and interpolate between them. That is FLIP by construction, and it is exact on every frame.

```ts
import { E, prog } from '../lib/anim';

const ROW = 64;
type Row = { id: string; label: string };
/** Row positions while `insertId` grows in at frame `at`: siblings shift as it opens (18-24 f). */
export const listLayout = (rows: Row[], insertId: string, f: number, at: number) => {
  const grow = prog(f, at, at + 20, E.stdInOut);
  let y = 0;
  return rows.map((r) => {
    const isNew = r.id === insertId;
    const h = isNew ? ROW * grow : ROW;
    const out = { ...r, y, h, opacity: isNew ? prog(f, at + 8, at + 20, E.softOut) : 1 };
    y += h;
    return out;
  });
};
```

- The new row's content fades in only once its slot is half open, so text never overlaps its neighbours.
- A **reorder** interpolates each item from its before-y to its after-y on one curve (`E.stdInOut` for short moves, `E.strongInOut` for longer), lifting the moving item in z (a cast shadow from the key, `references/lighting.md`) while siblings shift on the same timing.
- **New things arrive in the accent and relax to neutral over 10–30 f**: a new row's marker, a changed value, a typed letter. Colour then means "just happened". Colour ramps and OKLab mixing are in `references/brand-and-color.md`.

### 4.2 Counters count during the action
A counter decrements (or increments) on each visible event, on whole frames, and rolls each changed digit over 6–8 f (or runs linear and is cut mid-count: `countLinear`, §7). Roll it (a masked vertical slide, as below) or cut it; never crossfade two numbers in place, because the half-and-half frames read as a ghosted double image, worse after motion blur. A counter frozen at "12" while everything resolves, then flipping to "0" in one frame, contradicts the picture.

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
  const roll = n > 0 ? prog(f, events[n - 1] - 1, events[n - 1] + 6, E.stdInOut) : 1; // moving on the event frame
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
A time or value label attached to a moving item updates in the product's real step size while it moves (times roll in 5-minute steps, for example), computed on whole frames:

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

## 5. The product kit

`src/kit/` is a set of real product parts at film size, lit by the house key. It is the floor for every product
moment: replace its strings and numbers with the brand's own, and pass `data=` to each panel rather than editing the
sample.

- `kitTheme(recipe, accent)`: every colour of the kit computed from one recipe at the accent's hue (no hex in the kit;
  surfaces are neutral, avatars one hue at several lightnesses, never a rainbow).
- Parts: `Surface` (a lit face with a contact shadow and a cast shadow away from the key), `Avatar` (initials at 36 px
  and up, a drawn person below that), `AvatarStack`, `Badge`, `Check`, `Pending`, `Glyph` / `GlyphTile` (line glyphs
  drawn in code: no icon library), `Meter`, `Button` (press amount from `fx/Cards press().q`), `Toast`, `Sparkline`,
  `BarChart` (bars rise out of the baseline in turn), `Ring`, `Photo` (a product photograph made in code, or a
  supplied `src`).
- Flow parts (`kit/flow.tsx`), the pieces of a product flow: `Field` (a well, a glyph, the value as children, an action
  button with press and flash), `Tile` (a result: picture, two-line title, meta, a corner badge), `Row` (a choice whose
  `selected` rings it in the accent with a dark halo), `Pill` (a spinner or a check, a label, a live value), `Chip`,
  `DataRow` (a record's label and value), `Notice` (a system notification for a proof stack). The glyph set covers a
  capability ticker too (link, list, search, star, monitor, speaker, camera, braces, table, globe, lock, play, chat,
  cart, heart). Every string comes from the caller.
- Panels with live states: `ProjectPanel` (status, team, selects with approvals, count, bar, the primary action;
  `doneAt` switches badge, count, tick and button in one frame), `ChatCard` (`fx/Bubbles`, the composer types the next
  line at 30 a second), `FeedCard` (`flick` lands a hand-thrown scroll on the highlight), `StatCard` (a figure
  counting on linearly), `ApprovalsCard`, `BudgetCard`, `CategoryRows`, `ChartCard`, `RingCard`, `AmountToast`,
  `ReportCover`, and `KitFallback` (the panel that fits a box's shape).
- Sample data (`REVIEW`, `BUDGETS`): two believable products whose numbers add up and whose copy states a product
  fact. They are the shape to copy, never the content to ship.
- Every kit part is a pure function of its props and `frame`, text tagged `data-text` under a `data-ui` root (the
  layout audit counts product strings apart from copy).
- **Cards require content.** `<Card>` and `<Bento>` tiles show built UI (`children` / `content`), a supplied picture
  (`image`), or nothing on purpose (`blank`). A card given none renders kit UI in its box instead of an empty slab,
  and lint errors (`card-content`). Never draw grey placeholder bars: a frame without words, numbers or pictures that
  mean something reads as a demo, and the picture floor counts skeleton bars.
- Real pictures lead where the product has them: `Photo src=` and `ProjectPanel photos=[...]` take supplied or
  licensed photographs (`references/imagery.md`); rewrite the sample's copy for the pictures you show, so every string
  states a fact about what is on screen.

## 6. Cards, bento and the one spring

`fx/Cards.tsx`:

- **`enterState(f, { start, dur, ease, from, lean, defocus }, film)`**: a panel arrives front-loaded. House 34 f on
  `E.snapOut` (about half the travel by 10 % of the time), from 240 px below, opacity 1 from the first frame (normal
  16-122 f; the first frame carries 22-50 % of the travel). `lean`: the plane the panel rides on, house 10° flattening
  to 0 on `E.glideOut`, starting 6 f after the position (the lean lags, never leads). `defocus`: optional, 4 px on the
  first frame clearing over 6 f, at fixed ladder levels.
- **`cardArrive(f, { start, dur, ease, from: { x, y, rot, scale }, creep }, film)`**: position, rotation and scale ride
  one curve, so a tilted card squares up exactly as it lands (house 50 f on `E.snapOut`, a tilt of 8-35° at the
  start), then `creep` keeps it alive in the hold (6-90 px/s).
- **`demote(f, { at, dur, ease, to }, film)`**: the card already there scales to 0.82 and moves 87 px up over 20 f on
  `E.whipBuild`, `at` = the frame it is half done. Put `at` on the newcomer's first frame: two moves read as one push.
- **`press(f, at, { depth, down, hold, up }, film)`** → `{ scale, q, phase }`: house ×0.87 (normal 0.86-0.90; a big
  tile 0.81), 9 f down on `M.press`, 3 f held, 10 f release on `E.buildIn` (it snaps home at speed and never passes 1).
  Click sound on `at`; drive a colour snap or a shadow from `q`.
- **`bento(f, A, B, { start, dur, ease, decay, delays, durs, eases }, film)`**: one layout unfolds into the next
  (position, size, radius, fill and shadow per tile together). House 44 f on `E.snapOut`; delays 0-18 f (main tiles
  together, edges after); `decay: 0.8` keeps 80 % of the remaining distance a frame. `<Bento tiles={[{ A, B, image?,
  content?, contentAnchor? }]} />`: built content keeps its size (text never scales) and is revealed by the moving box;
  `contentAnchor: 'box'` makes it ride the box's corner.
- **`springBox(f, start, { A, B, preset }, film)`**: the film's one spring: a container pops from A to B on
  `SPR.landing` (ζ 0.59, about 10 % over, home in 23 f); overshoot is clamped where a radius would turn negative.
- `<Card frame box enter arrive demote press spring image perspective origin>` composes any of these into one
  transform.

## 7. Bubbles, scroll, develop, hard steps, counters

- **Bubbles** (`fx/Bubbles.tsx`): a bubble cuts on at full opacity and full size (on its sound) below its slot and
  slides up on an exponential (`bubbleY`: tau 12 f, home at 50 f, travel 56 px, normal 38-70). `lift: { share, tau }`:
  the whole conversation takes a share of each new bubble's travel on a quicker time constant (0.25 with tau 4 f reads
  as a live chat). Replies 20-32 f after the message before; a `typing` bubble's dots pulse until the next message from
  that side replaces it. `<Bubbles messages x y width role header anchor />`, text at `caption` by default.
- **Scroll** (`fx/Scroll.tsx`): `flickState(f, { start, crawl, lead, ramp, peak, hold, brake, distance, dir }, film)`:
  speed builds ×1.05 a frame for 66 f to the peak (house 2600 px/s), holds 6 f, brakes in two stages (a quick drop
  ×0.82 a frame for 40 % of the speed, a long coast ×0.977); `distance` lands it on the target row. Its frames above
  900 px/s are declared as a `CAMERA_BLUR` range: copy it into the timeline and the blur pass renders them with the
  shutter inside a crisp film. `<Scroll edgeMask>` fades lines in out of nothing at the edge. `flickFeed(start, film)`
  is the hard thumb flick of a feed (`FLICK_FEED`: a carried speed decaying into a crawl, ×1.054 a frame for 86 f to
  5280 px/s, a 4 f hold, a fast brake for 60 % of the speed, then the coast); `<DirBlur v>` (`fx/Defocus`) smears its
  fast frames along the scroll when the film keeps no shutter pass.
- **Develop** (`fx/Develop.tsx`): `developState()` 0 = the tint, 1 = full colour; house 24 f per picture on
  `M.develop`, columns 4 f apart; `steps: { animFps: 16 }` puts it on stepped holds. The tint is a static duotone filter
  on one copy; the colour copy fades in above it. Built UI develops too.
- **HardStep** (`fx/HardStep.tsx`): `hardStepState()`, `snapBox()`, `stepValue()`: whole-frame state changes with
  nothing in between (a list that moves only in row jumps). Every jump frame is declared.
- **Counters** (`fx/Roll.tsx`): `countLinear(f, { from, perSec, start, round, animFps, phase, to }, film)`: counters run
  linear and are cut mid-count; several in one frame at different rates (14 : 5 : 1 reads as live data).
  `steppedTail(to, end)` lands a final value in decelerating steps; `<Roll hard>` swaps digits in one frame; a rolling
  digit slides 18 f. `growthSteps(start, total)` is the count that grows as the product reads (a step every 6 f,
  ×2.1 a step) and jumps to the total once it passes 55 % of it: cadence that accelerates into the payoff; `within`
  fits the whole count inside a window (a one-bar feed) by raising the growth.
- **Stack** (`fx/Stack.tsx`): notifications piling up as proof. The newest rises 144 px from behind into the front
  slot (scale 0.92 → 1 on `E.snapOut`, 16 f); every older one steps back a slot on the same curve: 4.5 % smaller,
  2.4 px softer, closer to the one in front (199, 175, 150, 135 px); the pile re-centres 92 px an item. Arrivals speed
  up into the payoff. `stackState()` and `stackFrames()` (a soft pop on each arrival's 50 % frame).
- **MaskList** (`fx/Reels.tsx`): a capability ticker. One row every 10 f, hard, unblurred, an icon swapping on the same
  frame; a fixed alpha mask keeps the neighbours faint (0.62 at the selected row's edge, 0.10 a row out, a 0.05 floor
  to 2.5 rows). Every step is declared stepped.
- **Resize carry** (`fx/Resize.tsx` `mode: 'carry'`): a card that opens on a cut at the outgoing card's size and squashes
  to its own, front-loaded from the cut frame (20 f): a statement card arriving at the last card's height.
- The device book's [data and numbers](devices/data-and-numbers.md), [micro-interactions](devices/micro-interactions.md),
  [loaders and progress](devices/loaders-and-progress.md) and [UI choreography](devices/ui-choreography.md) families hold
  the rest (charts from cells, loaders, check pops, toggles, the agent's step list).

## 8. Cursor

Use a cursor only while a human is acting. Once the product acts on its own, the cursor leaves in flight (it
accelerates off the frame, banking) and never returns: an autonomous product with a cursor parked in shot reads as a
screen recording.

- `cursorMove(f, from, moves, film)`: successive bowed moves, house 44 f on `E.glideOut`, bow 0.18 (wrists move in
  arcs). `cursorTilt()`: it swings in (up to 60° over a few frames), then settles upright from 16-24° over 36 f on
  `E.settleOut`. `cursorRing(f, at)`: a thin ring that expands 10 → 34 px and fades on the click (a ring, never a glow).
  `cursorState(f, { from, moves, tilt, shape, switches, click }, film)` returns everything for `<Cursor>`.
- `<Cursor x y angle shape shadow ring press scale />`: `shape` arrow (hotspot at the tip), ibeam (hotspot at its
  visual centre, so a swap never moves the point that acts) or hand (over a link or a button, hotspot at the
  fingertip); `shadow` drop, cast (floating above the UI) or none. `cursorRise(f, at, target)`: the hand rising
  straight up from below the frame onto a button, 75 % of its 400 px in the first 8 f, then into `cursorMove`.
- Dwell 10-16 f on the target before the press; the target shows its hover state about 6 f before; at most one click
  per 30 f, on irregular gaps. Place it by transform in screen space, at `toScreen(shot, point)`.
- Put the click sound on the press frame. Keep the arc inside the frame and clear of the text being read.

## 9. Typing

Typing is for what the product types: `TypeOn` with `kind="human"` (30 characters a second in runs, pauses around
punctuation), `"field"` (word by word every 5 frames), `"prompt"` (5 → 19 characters a second, slower on the last word)
or `"stream"` (machine output, 50-150 a second) (`references/copy-and-type.md` §9). The schedule is computed once
(`typeSchedule()`) and exported for the sound and a caret-following camera (`typeOn()`); discrete state is decided on
`fd(f)`. The newest characters can carry an accent trail that ages to ink; the caret is solid while typing and blinks
30 f on / 30 f off when idle. `erase` clears a field first with a held backspace (`ERASE_HOUSE`: the first key, a
repeat delay, then a character a frame), last character first, the caret solid while it runs; a second `TypeOn` types
the new value in bursts. Keep the typed field alive: a slow push on the bar and a parallax drift behind it. A
headline is never typed.

## 10. Supplied screenshots and product shots

A launch or update film often has the real product: screenshots, stills of recordings, product photos. They move with
the same grammar as built UI.

- `<Card image={{ src: staticFile('shot.png'), fit, focus, zoom, zoomTo, zoomStart, zoomDur }}>`: `fit: 'cover'` fills
  the card and crops; `focus` is the point kept in view and the centre of `zoom`; `zoomTo` pushes in slowly inside the
  card (a camera move over a still).
- `<Bento tiles={[{ A, B, image: {...} }]}>`: a screenshot tile re-crops around its focus as its box opens.
- `<Develop image={{...}}>`: a screenshot arrives as a duotone and develops.
- Supply images at least 2× their largest on-screen size, PNG for UI, and crop the focus onto the feature the shot is
  about. **Rebuild the one element the film acts on** (the button that is pressed, the number that counts) as live UI
  over the screenshot, at the same place and size, so it can press, spring and count; the rest stays the picture.
- A supplied brand's screenshots come in through `brand.py` (`references/brand-kits.md`).

## 11. Declarations

| Primitive | `declares()` |
|---|---|
| Cards | nothing (no step, flash, blur or seam) |
| Bubbles | one `stepped` frame per bubble cutting on |
| Cursor | one `stepped` frame per shape switch |
| Scroll | its fast frames as one `cameraBlur` range |
| Develop | a `stepped` range when `steps` is set |
| HardStep | one `stepped` frame per jump |
| Roll | a `stepped` range for a hard counter on a 12/16/20/30 fps cadence |
| TypeOn | a `stepped` range for a 1.2 typing run, or for its `erase` |
| Reels | one `stepped` frame per MaskList step (and per GhostReel jump in step mode) |
| Stack, Defocus, DirBlur, Resize carry | nothing (continuous) |

List the instances the acts use in `src/sync.ts` `declares()`; grid-check fails when the timeline does not cover them.

## 12. A product moment in one camera

One continuous camera over one desk, five beats, about 9 s, plus an end card. Each beat adds one device; the copy is
one calm fragment per beat in a fixed cell, and every framing keeps the product out of that cell.

| Beat | Picture | Primitives | Copy |
|---|---|---|---|
| 1 | the project panel enters front-loaded on a tilted plane (lean 20-25° flattening 6 f behind, a short entry defocus); the cursor swings upright as it lands on the button | `enterState`, `cursorState` | the hook, 1-2 words |
| 2 | push in on the press; the button squeezes, the ring expands, and the film's one spring pops it open into its confirmation; the last pending badge switches in one frame | `press`, `cursorRing`, `springBox`, `stepValue` | none (the animation is the line) |
| 3 | the next card lands (position and tilt on one curve) while the panel steps back; bubbles cut on and slide home, the composer types at the house rate | `cardArrive`, `demote`, `Bubbles` | the claim |
| 4 | pull back: every card unfolds into the dashboard on one shared curve, the pictures develop from a duotone, the light pool brightens once as the board opens | `bento`, `Develop`, `LightField` | the second claim |
| 5 | push onto the feed, which flicks and lands on the item that matters (its fast frames the declared blur range), while a live counter runs linear; a hard cut takes it mid-count | `flickState`, `countLinear` | the payoff |

- Design the overview layout first in screen pixels at the pull-back framing, with the copy cell left empty, then map
  it into the desk's coordinates. Every other framing is a scale and an anchor of that one layout, so the copy never
  lands on UI.
- Content is specific and adds up: one named project, one number every tile agrees with (48 shots: 44 then 48
  approved, 48 / 48 on the board), avatars as initials, drawn icons, real states.
- A close framing that crops a title crops it out completely, not halfway.
- Depth: the desk casts shadows from the key; two or three pictures far behind it move at about 0.4 of the camera and
  sit defocused; one shape passes close to the lens during the biggest camera move.
- The cards' own faces fade out quickly (10-12 f) under the opening tiles, and the tiles' contents fade up as their
  boxes open, so no frame shows two half-transparent layouts.

## 13. Walkthrough chapters

UI arrivals in a walkthrough are front-loaded: 43–51 % of the travel in the first 10 % of the time, so cards, menus and
toasts arrive on `E.snapOut` [.50], not the gentler `glideOut`. A walkthrough whose story is the product's flow (input,
visible work, output) starts from `--template ui-walkthrough` (`references/templates.md`).

- **One chapter per 2–4 bars**, chapter changes on downbeats; 1–2 capabilities per 20 s, never a tour of every feature.
- **Each chapter** is: a camera move onto the feature's anchor (`references/camera.md`), one cause → action → result, one line of the script, and the result held ≥ 36 f before the next move.
- **The chapter's line** sits on the eye line, large and frontal like every line of the script (never a lower-third subtitle), never over the action, and follows the reading-hold rule (max(60, 42 + 8 f per word); crisp 36 f + 6 f per word). Burn them in for sound-off viewing and ship an SRT (`references/finishing.md`).
- **A persistent anchor** (the story device, or the product's own "now" or selection marker) carries across chapters, so the walkthrough reads as one continuous product, not a slideshow.
- Screen recordings of the real app are useful as texture and as a guide to its real behaviour; rebuild the hero moments as components so they can be timed to the grid.

## 14. The pause test

Pause on any frame and check it as a screenshot. Run this on the act contact sheets and at every cue (`scripts/sheet.py`, `npx remotion still`).

- Dates and weekdays agree (asserted in `data.ts`); times sit where their labels say.
- Every count matches what is visible, and counts change while the events happen.
- The frame agrees with the story: who acted, what is owed or done, totals and stated ratios; no number appears twice in one frame (§2).
- Plurals, casing and brand names are right; no placeholder strings.
- Every number uses tabular figures; nothing jitters in width.
- Labels travel with their items; nothing shows a stale value after a move.
- The accent keeps one meaning; success and error never share a colour.
- Nothing in the past changed; only the future was replanned.
- Text that carries meaning is ≥ 36 px on screen whenever it is held in focus; nothing important is cropped, or covered by a moving element or edge (§4.5).
- Counters, checks and totals have changed on the landing frame of their cause, not a beat later (§4.2).
- The feature is named once and the product reads as an app (§1).
- No cursor after the product became autonomous; at most one click per 30 f.
- No card or tile is empty or filled with grey bars (§5).
- Discrete state (typed text, caret, counters, layout switches) is computed from `fd(f)`, so motion-blur sub-samples never show a double caret or a half-typed letter.
