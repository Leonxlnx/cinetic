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
2. [The data module](#2-the-data-module) (2.1 [Material realism](#21-material-realism-what-a-paused-frame-is-checked-against))
3. [Layout from data](#3-layout-from-data) (3.1 [Simple and aligned](#31-simple-and-aligned))
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
15. [Macro screens: rich content a camera can push into](#15-macro-screens-rich-content-a-camera-can-push-into)

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
- **Real content, film sizes.** A believable product with its own name, data that adds up, drawn icons, people as
  real portraits (or the product's own initials), real states (hover, pressed, typing, approved). Every web size ×1.9 (`uiFilm()`), nothing under
  36 px in focus; product numbers and labels at `caption` and up (`references/copy-and-type.md` §7).
- **A screen is dense; one line reads.** A product screen shows the product in use: 25 or more real strings (names,
  ids, amounts, dates, statuses that agree), most of them at 12-16 px (6-8 px on a half-size still) as texture, and
  exactly one line at 4 % of the frame height or more, lifted and readable while the rest is dimmed and softened
  (`kit/dense.tsx`, §5). A card of five rows and grey bars reads as a mock; a wall of small true strings with one
  lifted line reads as software, and the viewer still reads only what the film says.
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
- **The UI is an object on a stage, not the screen.** A window, card, phone or notification sits at about 50-80 % of
  the frame width (a phone 70-90 % of the height) with the stage visible round it, and the part doing the work is
  isolated at a readable size. A page filling the frame edge to edge reads as a screen recording: a 1-2 s macro
  push only, then back to the object. A new picture every 1-2 s (subject, scale or stage), never the same view of the
  same UI past about 3 s; and no canvas jumping: the camera never flies between spots on one big page or canvas, it
  hands over from object to object, or pushes into one and pulls back out.
- **The real product when it exists, a designed one when it doesn't.** Ask once for screenshots, a link or a Figma
  file and rebuild those screens (§10). With none, design a fictional UI that explains the function the way a real
  team would ship it: real platform conventions (an iOS grouped list and large title, real macOS window chrome), the
  product's own look (its colour, radius and one signature component), and the third-party apps it acts in as
  believable brands with their own colours, which are content, not the film's palette.
- **Simple and aligned.** No accent bar on a card, one left edge per card, text never across a picture or a mark (§3.1).

## 2. The data module

All content lives in `src/app/data.ts`. Labels, counts and positions are derived from it, and asserts at module load make wrong data fail the render (and `export-cues.ts`) instead of shipping. Two kinds of assert belong here: the data is internally true (dates, weekdays, ids, plurals), and the data agrees with the story the film tells (who paid, what the headline number is, what a ratio claims).

```ts
// src/app/data.ts: every label, count and position on screen derives from this file
export type YMD = [number, number, number];
export type Invoice = { id: string; client: string; cents: number; due: YMD; paid: boolean };
export type Reminder = { invoice: string; status: 'queued' | 'sent' };

export const TODAY: YMD = [2026, 9, 14]; // the film's own day (kit/real.ts FILM_DATE): every date below sits round it
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

### 2.1 Material realism: what a paused frame is checked against

A viewer reads a paused frame like a screenshot, and four details give a made-up product away in a second. `src/kit/real.ts`
computes each of them right; `scripts/data-check.mjs` fails the hand-typed ones in the source and the pictures.

- **Dates come from the film's own day.** `FILM_DATE` (in `kit/real.ts`) is the release day; set it when the film starts.
  Every date on screen is computed from it, never typed: `day(FILM_DATE, -1)` is yesterday, `fmtDay(d, 'dmy')` prints
  "Thu 29 Oct" with the calendar's weekday, `weekOf()` gives this week Monday to Sunday ("Oct 26 – Nov 1"), `relDay()`
  says Today / Yesterday / the weekday. A typed "Tue 28 Oct" in a year where the 28th is a Wednesday, "Oct 20 – 26" as
  "this week" when it ran Tuesday to Monday last week, or a September date in a film released in October are the tells.
  `sampleWorld()` is seen on `FILM_DATE` too.
- **A count is its list.** "14 today" sits over 14 entries, and a dense screen shows at least 8 of them (`LIST.minRows`);
  the rest run past the fold or sit behind a quiet "+6 earlier" row. Build the log with `dayLog(seed, { count, total,
  labels })` (irregular times through the day so far, amounts that sum to the total to the unit), show it with
  `listView(log)` (the newest 8, the count and the sum are the whole log's) and print the header with `countLabel()`.
  A count over two rows, or a count smaller than the rows under it, fails `data-check` (`count-list`).
- **A waveform is the track's.** `node scripts/data-check.mjs peaks public/audio/<track> --bars 160 --out src/kit/peaks.json`
  writes the music's own loudness; draw `waveBars(n, { peaks })`. Without the track yet, `waveBars(n, { seed })` is
  noise that never repeats (phrase swells, a mid layer and a per-bar grain at unrelated rates, `accents` where the
  cut lands). A height built from the bar index (`i % 8` for a tall bar every eighth, sines of `i`) is a pattern the
  eye finds at once and fails (`wave-periodic`).
- **Thumbnails are distinct moments.** A filmstrip, a contact row or a reel's frames come from different moments and
  clips of the film's own footage: `thumbsFrom(clips, n)` deals them round the clips (two neighbours never from one
  clip) and `stripMoments(dur, n, { cuts })` spreads one clip's frames across its shots. Six frames of a locked-off
  shot are one still repeated at thumbnail size; `data-check` measures numbered frame sets (`name-0.jpg` ...) at 8x5 px
  and fails a run of three that are the same picture (`thumb-repeat`).
- **The cast varies across beats** (`references/imagery.md` §6): `castPlan(beats, pictures)` gives each beat its own
  shoot and people.

## 3. Layout from data

- **Positions and labels are functions of the data** (a row's y from its index, a block's rect from its start and end). A moved item carries its own label, and a label can never go stale.
- **Readable at shot scale:** text the viewer must read is ≥ 36 px on screen after the camera scale (`TEXT_MIN`). Smaller text is texture and must not carry the story. Under 3D, lay out at shot scale with CSS `zoom` (see `references/camera.md` §9).
- **Tabular figures for every number** (`fontVariantNumeric: 'tabular-nums'`), so counters, times and amounts never jitter in width.
- **Paint in z order.** Sort items by z before rendering (lifted items above grounded ones); stacks overlap left over right; badges on avatars get a 2 px ring in the background colour, so an overlap reads as layering, not as a bite.
- **Collapse empty regions** until their content arrives. A section header over 120 px of nothing reads as a broken app.
- **Decide layout thresholds per whole frame.** If a card switches layout at 40 px tall, decide it from `fd(f)` so every motion-blur sub-sample agrees.

### 3.1 Simple and aligned

Simple UI reads as a real product; decoration and near misses read as a template. Three rules, each one checked:

- **No accent bar on a card.** A card reads by its fill, its type and its real content (an icon, the real mark, a photo,
  the product's own status dot or chip). Never a coloured stripe down its side, a narrow pill before its title, a
  coloured left border on the selected row, or an inset shadow painting one edge. Selection is a fill, a ring all round
  (`inset 0 0 0 2px`), a check or the row lifting; a state is the product's own dot or chip where the product puts it. A
  hairline divider in the line colour between a sidebar and its content is structure, not an accent.
  Checked: `lint-film.mjs` `ui-accent-bar` (side borders, one-side inset shadows, thin bar elements) and `look-audit.py`
  `ui-accent-bar` (a thin saturated vertical bar along a card's edge with the card's rows beside it, in the render at
  full resolution two samples a second; it fails on two samples, and leaves out a chart's bars, a frame round a picture
  and a coloured word's letters).
- **One left edge per card.** Rows stacked in one card or panel share their left edge within 2 px at 1080. An indent is
  a deliberate step of 16 px or more (the icon column, a second level), never a near miss of 3-12 px. Lay a card out
  from one `pad`: the title, the meta line and the body all start at `pad`; an icon-led card puts every icon at `pad`
  and every text at `pad + icon + gap`, the title included, or none. Centred rows centre on one axis; numbers set flush
  right share a right edge. Checked: `layout-audit.sh` `ui-align` (`scripts/ui-layout.cjs` on the audit boxes) fails a
  near miss that rests on 2 audited frames.
- **Text never cuts into a picture or a mark.** A label sits beside a mark or a photo with clear space (half its cap
  height or more), or wholly on the photo as its caption (over a scrim when the photo is busy); a mark inside a sentence
  is set in the line (kit `InlineLogo`). Never a line running across a photo's edge, a title over an app icon, a name tag
  half off its tile. Checked: `layout-audit.sh` lists every text box crossing a `data-logo` or `data-imagery` box (a ui
  warning), and `look-audit.py --layout` fails the crossings where the asset is in view on 2 audited frames (a mark
  hidden behind a plate reads as the ground there and is left out).

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
  surfaces are neutral; portraits take the accent's hue at the theme's lightnesses in the backdrop and the garment, faces
  near neutral, never a rainbow).
- Parts: `Surface` (a lit face with a contact shadow and a cast shadow away from the key), `Avatar` (a person: a real
  portrait with `src`; without one, a monogram tile with their initials, the way a product shows a person with no
  photo, or a small drawn portrait inside dense UI, 72 px and under, which the kit marks `data-drawn` and the layout
  audit fails any larger; never a grey silhouette), `AvatarStack` (faces rimmed in the surface they
  overlap, the first on top, `more` adds a +N tile), `Badge`, `Check`, `Pending`, `Glyph` / `GlyphTile` (generic
  glyphs from Phosphor Icons, MIT, shipped in `kit/icons.ts`: a regular or bold line by `weight`, `variant` fill or
  duotone; a tile is duotone on its soft face and filled on the solid one), `Meter`, `Button` (press amount from `fx/Cards press().q`), `Toast`, `Sparkline`,
  `BarChart` (bars rise out of the baseline in turn), `Ring`, `Photo` (a real photograph, `src`; without one the
  kit's stand-in, marked `data-drawn="product"`, which lint and the layout audit fail), `FileThumb` (a picture slot with
  no picture yet shown as the file it is: an image glyph, the file's name and size).
- Flow parts (`kit/flow.tsx`), the pieces of a product flow: `Field` (a well, a glyph, the value as children, an action
  button with press and flash), `Tile` (a result: picture, two-line title, meta, a corner badge), `Row` (a choice whose
  `selected` rings it in the accent with a dark halo), `Pill` (a spinner or a check, a label, a live value), `Chip`,
  `DataRow` (a record's label and value), `Notice` (a system notification for a proof stack), `Composer` (a prompt box:
  the request at the top, an add button, the model chip and the round send button along the bottom; `focus` lights the
  rim, `send` takes `swellState()` for the click), `CodePanel` (a numbered gutter that is always full and rows of tokens
  streaming by line cadence, keywords in the accent and the rest in its tints), `Bubble` (the user's message). The glyph set covers a
  capability ticker too (link, list, search, star, monitor, speaker, camera, braces, table, globe, lock, play, chat,
  cart, heart, mail, calendar, chart, database, folder, user, bell, gear, cloud, cpu, terminal, video). Glyphs are for
  generic actions only: a product, source or model the film names is shown by its real mark (`kit/logos.tsx`). Every string comes from the caller.
- Real marks (`kit/logos.tsx`), for the products the film's product works with, imports from, runs on or names: fetch
  them with `node scripts/logos.mjs get <name>` (official colour files, the record in `public/logos/logos.json`, the
  index in `src/logos.ts`), then `BrandLogo` (a mark or wordmark as SVG at any size, the version for its ground),
  `AppIcon` (a squircle tile with a top light, an inner rim and a soft contact shadow, the mark at its optical size;
  a brand whose mark is its own tile fills it), `LogoChip` (mark and name on a pill), `InlineLogo` (a mark at 1.0 cap
  height inside a line, the next one rolling in over 6 f), `LogoWall` and `LogoRing` (12-30 tiles that arrive tumbling
  20-60 degrees, settle on depth bands, drift with parallax and soften only behind the near half). A name the film has
  not fetched falls back to the text pill or a glyph tile. `npx remotion still KitLogos` and `KitLogoWall` show them
  on paper and ink; look at them at half size before the marks go into a shot.
- Panels with live states: `ProjectPanel` (status, team, selects with approvals, count, bar, the primary action;
  `doneAt` switches badge, count, tick and button in one frame), `ChatCard` (`fx/Bubbles`, the composer types the next
  line at 30 a second), `FeedCard` (`flick` lands a hand-thrown scroll on the highlight), `StatCard` (a figure
  counting on linearly), `ApprovalsCard`, `BudgetCard`, `CategoryRows`, `ChartCard`, `RingCard`, `AmountToast`,
  `ReportCover`, and `KitFallback` (the panel that fits a box's shape).
- Sample data (`REVIEW`, `BUDGETS`): two believable products whose numbers add up and whose copy states a product
  fact. They are the shape to copy, never the content to ship.
- Dense screens (`kit/dense.tsx`): `DenseScreen` puts the app's chrome (title bar, workspace, nav with counts, team,
  the viewer) around a records `table` (tabs with the rows' counts, four figures, the table, activity, a chart) or a
  `board` (the records as cards in their status columns). `focus` is the readable row, or a schedule `[{ at, row }]` the
  lens glides along (16 f at 60 fps on `E.snapOut`); `view` is the scale the screen is seen at (a camera push, a fit),
  so the line keeps 4 % of the frame. `FocusLens` is the focus helper over any dense layer (a veil, two fixed blur
  levels, the one line on a raised strip); `Micro` is texture type, tagged `data-texture` (not copy: the layout audit
  leaves it out); `StatusPill` draws a status by its dot's shape, the accent only on the story's state; `focusPx`,
  `focusState`, `AppWindow`. Set the screen lit in its place, facing the camera (`references/lighting.md` §7), with
  depth from its light, glass and shadow; a camera move is declared only where it shows the change. A card tilted
  diagonally at rest reads as cheap.
- Sample worlds (`kit/data.ts`): `sampleWorld('<film>')` deals a workspace from the film's name, so two films never
  share data: six kinds (billing, deploys, support, orders, pipeline, hiring), people, fourteen records, statuses that
  agree with the dates, tab counts and totals that are the rows' own, a chart whose points sum to the total, every
  status with rows, and the story's record (`focus`), seen on the film's own day (`FILM_DATE`, or `today`). `checkWorld()`
  asserts it. Replace it with the product's real data in the same shape before the film ships.
- Material realism (`kit/real.ts`, §2.1): `FILM_DATE`, `day`, `fmtDay`, `weekOf`, `relDay`, `clockOf` (dates and times
  from the calendar), `dayLog`, `listView`, `countLabel`, `checkList` (a log whose count is its rows, 8+ shown),
  `waveBars`, `peaksBars` (the track's peaks or noise that never repeats), `stripMoments`, `thumbsFrom` (thumbnails from
  distinct moments), `castPlan`, `checkCast` (a cast that varies across beats). `scripts/data-check.mjs` fails what they
  prevent.
- Content tiles (`kit/tiles.tsx`): `ContentTile` (the real mark or a glyph, a label, a sub line and a tiny preview: a
  document with a marked line, a chart, bars, a checklist, a person, a table, code), placed by `ContentWall`,
  `ContentRing` and `ContentTicker`: they arrive tumbling 20-60 degrees, settle on depth bands (smaller and softer
  further back) and drift with parallax; the film's own nodes take the near slots and every other slot is filled from
  the world (`worldNodes()`). Ring, wall and ticker nodes always carry content: the real marks where the product
  touches other products (`scripts/logos.mjs`), otherwise icon, label and preview; never a bare pill or a bare accent
  square.
- Every kit part is a pure function of its props and `frame`, text tagged `data-text` under a `data-ui` root (the
  layout audit counts product strings apart from copy); texture strings carry `data-texture` instead.
- **Cards require content.** `<Card>` and `<Bento>` tiles show built UI (`children` / `content`), a supplied picture
  (`image`), or nothing on purpose (`blank`). A card given none renders kit UI in its box instead of an empty slab,
  and lint errors (`card-content`). Never draw grey placeholder bars: a frame without words, numbers or pictures that
  mean something reads as a demo, and the picture floor counts skeleton bars.
- Real pictures lead where the product has them: `Photo src=` and `ProjectPanel photos=[...]` take supplied or
  licensed photographs (`references/imagery.md`); rewrite the sample's copy for the pictures you show, so every string
  states a fact about what is on screen.
- **A person, a place or a product inside the UI is a real photo.** A channel's owner, a creator's thumbnails, a
  listing's product shot, a team that matters in the shot: `Avatar src=` / `AvatarStack people=[{ src }]` and
  `Photo src=` take photographs found with `scripts/assets.mjs search ... --people` (or the user's), cropped on their
  focus; `sampleWorld(seed, { photos })` gives a world's people real portraits, which the dense screens and the
  person tiles show (`ContentTile` `photo`, preview `'person'` or `'photo'`; without photos `worldNodes` deals no
  person tiles). The drawn portraits (`PortraitMark`, `HalftonePortrait`) are only for small faces inside dense UI
  (72 px and under); a larger one fails the layout audit (`drawn-figure`), and nothing drawn in SVG stands in for a
  photo the shot is about.
- **Every string is a real word.** Labels, names, counts and file names are the product's own; grey bars or blocks
  standing in for lines of text, "Placeholder", "Label text", lorem or "Item 1" fail `lint-film` (`placeholder-copy`,
  `bar-text`), the layout audit and `copy-check.py --ui src`. Outside the UI, photos and footage get the studio finish of
  `fx/Pictures` (`PhotoCard`, `ArcRiver`, `PhotoWall`, `InlinePhoto`, `FootageWindow`; `references/imagery.md` §4).

## 6. Cards, bento and the one spring

`fx/Cards.tsx`:

- **`enterState(f, { start, dur, ease, from, lean, defocus }, film)`**: a panel arrives front-loaded. House 34 f on
  `E.snapOut` (about half the travel by 10 % of the time), from 240 px below, opacity 1 from the first frame (normal
  16-122 f; the first frame carries 22-50 % of the travel). `lean`: the plane the panel rides on, house 10° flattening
  to 0 on `E.glideOut`, starting 6 f after the position (the lean lags, never leads). `defocus`: optional, 4 px on the
  first frame clearing over 6 f, at fixed ladder levels.
- **`cardArrive(f, { start, dur, ease, from: { x, y, rot, scale }, creep }, film)`**: position, rotation and scale ride
  one curve, so a tilted card squares up exactly as it lands (house 50 f on `E.snapOut`, a tilt of 8-35° at the
  start), then it rests (a `creep` only under 12 px/s, one way).
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
- **Pile and fan** (`fx/Stack.tsx`): `pileState()` deals photo cards one on top of the last (each drops in from
  up-right, 34, -30 px a card, on an alternating tilt, about every 6 f at 60 fps, smeared along its drop) while the
  pile's origin walks down-left so it stays framed; `fanState()` spreads two cards out from behind the front one in
  3D (offsets, rotateZ lagging the spread, rotateY -9, rotateX 6) on `E.in` into a blur peak and collapses back.
- **Masonry** (`fx/Scroll.tsx` `masonryState()`): a wall scrolling up into place, every tile on its own settle (its
  depth x the travel, a lag of up to 6 f), text in a gap riding its tile; one shared ease-in exit.
- **Pointer, swell and steps**: `Cursor shape="pointer"` is the filled, rounded product cursor in the brand colour with
  a pale rim; it clicks with `pressDepth` 0.2 while the button swells (`fx/MicroUI` `swellState()`: x1.38 in 6 f,
  walking its fill through the brand's colours to a held one, back in 6 f), then leaves spinning (`cursorExit()`).
  `StepList rise` lifts each new row inside the stack as it steps in; a `pending` row never checks and pales.
  `TypeOn kind="stream"` takes `rates` (a fast run slowing from a given character) and `skip` (a burst on one frame).
- **A rim that turns**: a container whose border runs its colours round (after its label swaps) paints
  `fx/BorderBleed` `spinRim()` (a conic, 3 deg a 60 fps frame) on the outer box with the fill inset over it.
- **Launch and pop**: a send button that takes off leaves on a J (`fx/Flight` `jLaunch()`: x on a cubic-out, y on a
  cubic-in, growing x1.74 over 36 f); an accent pill landing on a cut pops from 62 % to full in 2 f with no spring
  (`fx/MicroUI` `popScale()`): an overshoot there reads as a toy.
- **Scatter** (`fx/Gather.tsx` `scatterState()`): satellites clearing along their own vectors (quad-in, growing x1.45)
  on the frame their container swaps its label.
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

### 5.1 Devices are lit objects

A phone, a laptop or a screen in frame is an object in the film's light, never a drawing of one (an outline bezel on a
flat field reads as a mock at once). A bare product screen stands as `fx/Lit`: a plane facing the camera with a glass
layer (a 1 px edge highlight along its top and key-side edges, a soft glare band that slides with a declared camera
move and the panel's turn) over the face and a body 12 px deep behind it, with its rim, cast and contact shadow. A device is kit
`Phone` or `Laptop` (`kit/device.tsx`): a graphite or silver body lit from the key with its rim and thickness, the black
glass border, the island, the screen (children, at (0, 0) in `screenBox()`) under the same glass, a contact shadow
where it meets the ground and a faint reflection of the body below. Pass the product's own screen as children, or a
real capture through `Photo`.

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
| Develop | a `light` seam mid-develop (its cross-fade, which forensics then accepts), and a `stepped` range when `steps` is set |
| HardStep | one `stepped` frame per jump |
| Roll | a `stepped` range for a hard counter on a 12/16/20/30 fps cadence |
| TypeOn | a `stepped` range for a 1.2 typing run and/or for its `erase` |
| Reels | one `stepped` frame per MaskList step (and per GhostReel jump in step mode) |
| Stack, Defocus, DirBlur, Resize carry | nothing (continuous) |

List the instances the acts use in `src/sync.ts` `declares()`; grid-check fails when the timeline does not cover them.

## 12. A product moment in one camera

One continuous camera over one desk, five beats, about 9 s, plus an end card. Each beat adds one device; the copy is
one line of the script per beat (2-7 words) in a fixed cell, and every framing keeps the product out of that cell.

| Beat | Picture | Primitives | Copy |
|---|---|---|---|
| 1 | the project panel enters front-loaded on a tilted plane (lean 20-25° flattening 6 f behind, a short entry defocus); the cursor swings upright as it lands on the button | `enterState`, `cursorState` | what it is, by 3 s |
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
- **The chapter's line** sits on the eye line, large and frontal like every line of the script (never a lower-third subtitle), never over the action, and follows the reading-hold rule (max(52, 36 + 7 f per word); crisp max(36, 28 + 6 f per word)). Burn them in for sound-off viewing and ship an SRT (`references/finishing.md`).
- **A persistent anchor** (the story device, or the product's own "now" or selection marker) carries across chapters, so the walkthrough reads as one continuous product, not a slideshow.
- Screen recordings of the real app are useful as texture and as a guide to its real behaviour; rebuild the hero moments as components so they can be timed to the grid.

## 14. The pause test

Pause on any frame and check it as a screenshot. Run this on the act contact sheets and at every cue (`scripts/sheet.py`, `npx remotion still`).

- Dates and weekdays agree (asserted in `data.ts`); times sit where their labels say; every date sits round the film's
  own day (`FILM_DATE`): today, this week, the weeks ahead, never last month.
- Every count matches what is visible, and counts change while the events happen; a dense screen shows 8+ rows.
- A filmstrip or contact row shows distinct moments; a waveform is the track's, never a pattern; the same photo or
  person does not return in beat after beat (§2.1). `node scripts/data-check.mjs src` passes.
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
- Times run the right way: in a stack the newest card is in front and says "now", each older one an older time (the
  hero shots set a card's time by its slot, so a content list in any order still pauses right); a summary ("12 sign-ups
  this hour") arrives after the events it sums and agrees with every counter in the film: one figure a film, read from
  one place in `src/content.ts`, never a toast saying 12 and a counter running 96 to 128 seconds later.
- The product's own notification wears the product's mark (`NoticeItem.own`, drawn through the stack's `ownMark`;
  content.mjs marks a notice the product itself sent), never a stock glyph in an accent square where the brand belongs.
- A face is a person: one photo, one name through the film, the name content.ts cast with it (a man's photo under a
  woman's name, or one face as a member and as the author of a report, fails update.ts and precheck `cast`).


---

## 15. Macro screens: rich content a camera can push into

A product shot has to hold up twice: paused (every name, number and date believable, nothing grey or lorem) and pushed
in 3-4x (the type still crisp, the picture still sharp). `src/kit/screens` is fifteen dense screens built for both: one
component each, few props, the film's own content written from the brief by one script, vector type at real UI sizes,
pictures fetched at 3x their drawn size, and every element exposed as a focus box a camera can frame on any frame.

### 15.1 The content, written from the brief

```
node scripts/content.mjs --brief BRIEF.md --fetch     # writes src/content.ts; faces into public/people, pictures into public/thumbs
node scripts/content.mjs --check                      # the content still adds up after you edit it
node scripts/logos.mjs get youtube                    # the real marks it names (url.logo, a notice's app)
```

A fenced block in the brief (or `--name --does --topic --item --price --photos` flags):

````
```content
name: Larder
does: turns a cooking channel into a paid cookbook
topic: recipes
thing: cookbook
items: The Weeknight Pasta Book; 20-Minute Dinners Course; Sunday Baking Guide
price: 29
photos: pasta dish, home cooking, fresh bread
```
````

The world (creator, assistant, commerce, devtool, finance, team) is guessed from the words when left out. Out comes one
object, `CONTENT`, whose parts spread straight into the screens, so a film never hand-writes a list, a name, a price or
a date:

- **People:** a cast of 14 with real faces (open-licence portraits, cropped to the face at 512 px, the licence record
  in `assets/licences.json`), varied first names, family names from everywhere, handles in the styles people use.
- **Numbers that add up across screens:** payment rows sum to their header; each of the product's items has one price
  everywhere it shows; the assistant's answer reads "your last 85 videos and 344 comments" while the profile says 85
  videos and the comment header counts to 344; one meeting has one time in the notice, the agenda and the answer.
- **Dates round the film's day** (`--date`, else the brief's, else today; written into `FILM_DATE`) with the right
  weekdays; ages as feeds print them ("6 hours ago", "34m"); future times after the film's clock.
- **Pictures:** a grid of real photos for the brief's words (landscape first, keyless sources, no credit needed).
- **The product's own site, the request, the covers:** a headline written from `does` ("turns a cooking channel into a
  paid cookbook" -> "Turn a cooking channel into a paid cookbook", its accent "paid cookbook"; `headline:` and `accent:`
  in the brief override both), a lead, nav and cards whose figures are the other screens' own (the sales card is the
  payments header); the one thing many asked for, with the count the assistant's answer gives; the product's items as
  covers, a figure in a title ("8-Week", "20-Minute") set as its accent.

Read the file, keep what is true of the product, change the rest, run `--check`. Offline (no `--fetch`) a person is
the product's own coloured initial disc and a picture a lit poster, never grey.

### 15.2 The screens

Common props: `tone` (`light` a white card, `dark` a near-black card, `glass` frost), `ground` (the colour behind it:
its lightness picks the inks; a dark card on a bright ground stays near-black), `accent`, `frame` (the part's own
clock, default the composition's), `pt` (film px per UI point, default 2 at 1080p), `view` (the camera scale it is
seen at, for the readable/texture tags), `backdrop` (glass over a photographic plate, §15.4).

| part | what it shows | the props that matter | focus boxes |
|---|---|---|---|
| `PromptBar` | the big input pill: plus, the request typed on a human cadence (the newest word in the accent, settling to ink), caret, attachment chip, model chip, mic, send | `text at send attach model size` | bar, text, caret, word, send, plus, mic, model, attach |
| `UrlScan` | a link typed into a pill with the platform's mark; the button pressed, busy (stepping dots, a light sweep), done | `url logo action busy done at press doneAt` | pill, logo, url, caret, button |
| `ThumbGrid` | 16:9 thumbnails of real photos with title cards, duration, two-line title, views and age; cells land, are read one by one, one is picked | `items cols reveal scan pick card` | grid, cell{i}, thumb{i}, title{i} |
| `CommentFeed` | real faces, handle and age, the comment, the action row; a header counting what is read; the feed moving up; a wash on the row that matters | `comments header max scroll highlight` | feed, header, view, row{i}, text{i}, face{i} |
| `NoticeStack` | notifications with real marks or faces arriving on a stack (or a list), the older ones stepping back | `items at every mode depth` | stack, front, frontText, card{i}, icon{i}, text{i} |
| `StepCard`, `ProgressPill` | the thing being made and its steps: pending, active (a spinner, its label typing), done (a tick drawn on); a pill counting a percentage | `title sub thumb steps start every` / `label to at dur` | card, thumb, title, step{i}, active |
| `PriceCards` | plans side by side, the featured one rimmed, features with checks, calls to action | `plans currency reveal pick` | row, card{i}, price{i}, cta{i}, feature{i}_{j} |
| `ItemList` | rows of products, payments or tasks: picture, face or mark, title, sub, value, tag; a header total counting | `items mode header countAt pick` | list, header, row{i}, value{i} |
| `DocPage` | a document page: number, title with an accent word, lead, section, paragraphs written on, a table, a figure | `title accentWord lead body table figure write` | page, title, lead, para{i}, table, row{i}, figure |
| `CodePage` | an editor tab with syntax in two hues of the accent, typed or streamed, a line held in a wash; as wide as its longest line | `code lang file type stream highlight` | editor, file, caret, line{i} |
| `ChatReply` | the person's ask, the product's mark and name, thinking dots, the answer streaming word by word with items | `ask who text items close at` | thread, ask, who, card, item{i}, close |
| `ProfileCard` | a channel or account: face, name, seal, handle, counts, the main button pressed, thumbnails with title cards | `name handle photo verified stats action press thumbs` | card, face, name, stats, action, thumb{i} |
| `BrowserWindow` | the product's own site (or the app it built) in a browser: lights, the address with a lock (typed, then a load line), nav with the mark and a call to action, a headline of up to two lines with its accent words, a lead, two buttons, a real picture with a notice on its edge, three cards (faces and a count, a figure with its trend or a ring, a picture with its title) | `...CONTENT.site type build frost w chrome` | window, chrome, address, url, nav, brand, cta, headline, lead, buttons, picture, notice, cards, card{i} |
| `RequestPill` | what many asked for: a small label, a pill on the accent opening from the faces of a few who asked, their words, a badge counting how many | `text label people count countLabel at dur` | pill, label, faces, text, badge |
| `CoverStack` | the thing being made as covers: kicker, the title in heavy condensed capitals with its accent word on a line of its own, a real photo, a strip of facts; the other items stepping back behind it (higher, smaller, darker), landing one after the other | `items kicker at cover size` | stack, cover, title, photo, cover{i} |

```tsx
import { CONTENT } from './content';
import { BrowserWindow, CommentFeed, CoverStack, PromptBar, RequestPill } from './kit/screens';

<PromptBar {...CONTENT.prompt} at={12} send={90} tone="light" ground={C.paper} />
<CommentFeed {...CONTENT.comments} header={{ ...CONTENT.comments.header, at: 0, dur: 70 }} scroll={{ at: 20 }} highlight={[{ at: 30, index: 2 }]} />
<RequestPill {...CONTENT.request!} at={8} tone="dark" ground={C.ink} />
<BrowserWindow {...CONTENT.site!} type={{ at: 0 }} tone="glass" ground={C.ink} />   // the address types, the page loads and builds
<CoverStack {...CONTENT.cover!} at={6} tone="dark" ground={C.ink} />
```

### 15.3 Macro: a camera frames a focus box

Each screen exports its layout, `promptBarLayout(props, frame, { pt, fps })` and so on, returning `{ w, h, focus }`:
boxes `{ x, y, w, h, px, r }` in the screen's own px, `px` the type size inside. The component draws from the same
function, so a box is where its element is on that frame: the caret while it types, the newest notification, a feed
row while the feed moves. `placeFocus(focus, x, y, k)` puts them in the scene; `readScale(box)` is the camera scale at
which the type inside reaches `TEXT_MIN` (36 px); `fillScale(box, W, H, share)` the scale at which the box fills a
share of the frame. At the default `pt` a 15 pt body is 30 px in a wide shot (texture) and 90 px at 3x (a macro read).
Text below the readable size at the scale it is seen at is tagged `data-texture`; pass `view` with the camera scale.
A screen drawn at its film size (k = 1) is a wide shot that leaves most of the frame to the world; when the screen is
the shot's subject, frame it: a card or a list fills 55-70 % of the frame (`fillScale(focus.card, W, H, 0.66)`), a pill
about half its width, a site window 84 %, and a close-up reads one box at `readScale` or 3x. Content drawn small and
left small reads thin, however good it is.

The macro move along the input as it types (one move that starts, travels with its subject and lands):

```tsx
const L = promptBarLayout(p, f, { pt, fps });
// the caret, smoothed over the last 8 frames: an operator's lag, the same on every render
let sx = 0, sw = 0;
for (let i = 0; i < 8; i++) { const w = 0.72 ** i; sx += promptBarLayout(p, Math.max(0, f - i), { pt, fps }).focus.caret.x * w; sw += w; }
const ride = { x: sx / sw - 47, y: L.focus.bar.y + L.focus.bar.h / 2 };   // the caret a little right of centre
const go = prog(f, send - 12, send + 6, E.strongInOut);                   // then travel to the send button, land on the press
const s = centreOf(L.focus.send);
const cam = { x: mix(ride.x, s.x - 220, go), y: mix(ride.y, s.y, go), k: mix(3, 2.5, go) };
// draw: translate(W/2 - k*cam.x, H/2 - k*cam.y) scale(k), transform-origin 0 0, around <PromptBar {...p} />
```

Send the press 10 frames after the last key: `promptBarLayout(p, 1e9).typed.keys` gives every key's frame.

### 15.4 Skins and material

`light` is the kit's white Card; `dark` the Card at a deep ground of the ground's own hue (black notification cards on
an electric blue read near-black, never mid-grey); `glass` over a gradient is a tint with a bright rim (a gradient
behind needs no blur). Glass over a photograph takes `backdrop`: the plate at the screen's own place, preferably its
soft copy (`node scripts/assets.mjs plate clouds` writes one), so the blur inside the shape stays short; `Frost` blurs
it inside the pill, lays a thin veil (clear over a mid or dark plate, milky over a bright one), a top sheen and a
bright rim, and the words take white over a mid plate with the newest word in a light tint of the accent. `skin.solid`
is the accent as a fill that carries white words (send, busy, call to action); the lighter lift is for accent words on
dark.

### 15.5 Screen moments

| id | recipe |
|---|---|
| `macro-type` | `PromptBar` at 3x, the camera riding the caret (smoothed 8 f), the newest word in the accent settling to ink; travels to the send button and lands on the press, 10 f after the last key (§15.3) |
| `scan-and-read` | `UrlScan` typed and pressed (busy word, stepping dots, a light sweep across the button), then `ThumbGrid` under it: cells land 3 f@60 apart and are read one by one, a ring passing and a tick staying |
| `feed-read` | `CommentFeed` header counting from 0 to the total while the feed moves up one comment every 0.7-0.9 s; the wash glides to the request that matters; a close-up on `text{i}` |
| `notice-stack` | `NoticeStack` cards arriving from above 0.4-0.6 s apart, opaque within the first third of the entrance, the older ones stepping back; a close-up frames `frontText` |
| `step-build` | `StepCard` steps 0.6-0.8 s apart, each a spinner with its label typing, then a tick; `ProgressPill` counting under the product being made |
| `ledger` | `ItemList` plain with real faces and products, the header total counting while the rows arrive |
| `price-pick` | `PriceCards` revealed side by side, the featured plan picked: it lifts with an accent rim, the others step back with their words fading, never into a grey veil |
| `doc-travel` | `DocPage` written on, the camera travelling down from the title to the table (`title`, `lead`, `table`, `row{i}`) |
| `answer` | `ChatReply`: the ask bubble, thinking dots, the answer streaming word by word, items with real marks, the closing question |
| `site-build` | `BrowserWindow` with `type`: the camera starts on `address` at 1.5x while the domain types, the load line runs, then one move pulls back to `window` (fillScale 0.84) as the page builds section by section (nav, headline, lead, buttons, picture, notice, cards, 5 f@60 apart) and lands on the whole page; a close-up can then read `headline` or `cards` |
| `crowd-to-one` | after `feed-read`: `RequestPill` with the same people and the answer's count; the pill pops where the faces will be, opens to its width as the words arrive, the badge counts on over a second; the camera can sit on `text` at 3x |
| `making` | `CoverStack` with a `ProgressPill` under it: the covers land back to front (5 f@60 apart, each opaque within the first third of its rise), the pill counts linearly and is still counting at the cut; a push to `title` reads the product's name |

### 15.6 Rules

- People are real faces (`--fetch`); without photos the product's own coloured initial disc, never grey; the product
  speaking is its own mark, never a person's initial.
- Numbers add up: `checkContent()` (or `--check`) after any edit: payments sum to their header, a weekday matches its
  date, one face is one person, no thumbnail repeats, a table row has its columns.
- Text is never cut by an edge: a code line longer than its editor fades out; feed rows leave and arrive through soft
  edges; a stack's new card is opaque before the words behind it could show through.
- Discrete state (letters typed, counts, a step's state, streamed lines, busy dots) is decided on the whole frame
  (`fd`), so every motion-blur sub-sample of one output frame agrees.
- A thumbnail's title card is the creator's own type (heavy condensed capitals, `THUMB_FACE`, Mona Sans from
  `public/fonts`), never the film's voice; the screens wait for it (`useFace`).
- One screen, one job in a shot; dense, never crowded; nothing idles up and down; a camera move on a screen starts,
  travels with its subject and lands; cards face the camera unless a designed 3D move turns them.
- Cost: a screen is DOM and SVG: about 0.75 s a frame on average at 1080p on software GL (no GPU, one tab), measured
  over sixteen wide and macro shots, up to 1-2 s for the picture-heavy ones (a thumbnail grid, a stack's shadows at
  3x, frost over a plate); the site window, the request and the covers about 0.9 s; on a GPU a fraction of that. Blur
  only inside a small shape (the plate's soft copy behind a pill), never a full frame: glass with no `backdrop` is a
  tint and a rim (never a live backdrop blur: a hard ban), and a photograph behind it goes in as `backdrop`.
