# Cards and UI

The product's interface is the hero of most launch films, so it has to be **real**: built in code at film size,
legible, with specific copy and plausible data, and shown changing state. A blurry dashboard in a tilted laptop is
decoration; a card that rewrites itself into the product is a story. All numbers at 30 fps, 1920x1080.

**Start from the library.** The motion library's UI pieces ([library-ui.md](../library-ui.md): `NoticePile`, `CardFan`,
`BannerPop`, `RowExpand`, `PickList`, `BoardDrag`, `StepList`, `TaskRun`, `CalendarWave`, `PromptAnswer`, `ChatThread`,
`ActionMorph`, `SettingsCard`, `PhoneDrop`, and the crafted `Pointer`) are built to the design bar in that file: take one,
give it this product's names, data and colours, and adapt its timing. The recipes below are for what the library lacks,
and whatever you build beside them meets the same bar.

Kit (`ui.tsx`): `Theme` (`lightUI`, `darkUI`), `useArrive`, `Card`, `Window`, `Bubble`, `Thinking`, `InputBar`, `Cursor`
(+ `cursorAt`), `Button`, `Row`, `Chip`, `Toast`, `Terminal`, `Progress`, `Avatar`. Icons: `Icon` (Lucide), `Brand`,
`BrandTile` (real marks). Type: `Typing`, `useTyped`, `Odometer`.

## House rules

1. **Real strings.** File names, version numbers, prices, counts with irregular digits (3,412 not 3,000), real
   integrations shown with their real logos (`BrandTile`). Never lorem, never "Feature 1".
2. **Native fonts for borrowed surfaces.** The product's UI in its own face; a third-party surface (a store, a calendar,
   a payment sheet) in its native face so it reads as real. Kit fonts: Inter for UI, Geist for technical products, a mono
   for code and data only (labels are sentence case in the UI face).
3. **One focal component at a time, large, built in steps**, flat or at one gentle tilt (12° or less), or **one canvas
   under one camera** (see `camera.md` 6.1). The component is large enough to read on a phone (UI text 30 px or more on
   a 1920 frame, 40 px or more on a 1080-wide one, after the camera's zoom) and arrives in steps (its frame, the row that
   matters, its state), never a whole dense screen of small text at once. Its app context (a title bar, a status bar)
   may show, quiet and partly off frame; the focal component carries the detail. Never two windows overlapping at an
   angle, never a chip pasted on a mock at another scale or light, not a dozen panels flying separately.
4. **Designed like a shipped product.** Inside the focal component: avatars, names, timestamps, states and counts, small
   icons (`Icon`), hairline dividers, hover and focus states, one title weight and muted secondary lines, even padding on
   every pill and row, nothing cut inside its container (fit it with `useTextWidth` or shorten it). A generic white card
   with two grey lines reads as cheap. A floating phone or laptop mock as a wrapper is not context: use a device only
   when the device is the point.
5. **Interaction is state change.** Check marks land, a pill flips from Add to Added, digits settle, a field becomes a
   button. A cursor is optional; when it appears it is a character, not a pointer (section 6).
6. **One radius family, soft shadows from one light.** Radii from one scale (e.g. 14 / 22 / 34 / pill); shadows layered
   and soft (`softShadow`), all falling the same way, or none on flat worlds; glass only when there is something behind
   it to blur, once a shot (`effects.md`). A card is real interface (rule 13), never decoration.
7. **Show the work.** Processing is a working state that says what it is doing ("Reading 3,412 comments", plan lines,
   skeletons resolved by a band; a percentage only when the number is the point, such as an upload the story waits on:
   set `ActionMorph`'s `percent` to match) and resolves in one decisive pass; typing runs at a believable speed to the
   end (`text.md` 4.1), with a prefix already typed when time is short.
8. **Pixel-real where it matters.** The region the beat is about is at full detail, filled with plausible named data
   (real-sounding people, companies and prices, different in every row, never "John Doe"). Dense UI and code are shown
   at a readable crop, the camera going to the part that matters, for as long as an action is happening in it.
9. **Data lands exactly.** Values, prices, progress bars and the pointer's target never overshoot; UI states change at
   product speed (150-250 ms) while the camera and the type carry the film's pace.
10. **Before, during, after** ([action and escalation](../film-grammar.md#action-and-escalation)). Before (8-15 f): the
    actor (pointer, finger, caret) and the target in one frame, the actor travelling to it on an arc. During: one contact
    frame where the target visibly flips state (the whole button, not part of it), then 10-30 f of a working state with a
    reason. After (20-45 f): the result where the action happened, UI text 30 px or more, held until read, then it becomes
    the next object.
11. **Scrolls have a reader and a stop.** A counter or a fixed marker says what the scroll is ("Reading 3,412 comments", a
    highlight bar); the scroll stops because it found the one item that matters, which lights up. No scroll without both.
12. **A real third-party product** appears as its real full-colour mark (`<Brand>`) or as a faithful, detailed rebuild of
    its real screen ([entrances.md 5.7](entrances.md#57-real-third-party-logos)); never a rough mock of a product people know.
13. **No card that is not needed.** Type sits on the ground itself. A card, plate, pill or window appears only when it is
    a real piece of the product's interface or does a real job in the story (a notification that arrives, a sheet the
    user acts on); never as a box round a statement, never a white plate to make text readable over a picture
    ([imagery](imagery.md#house-rules) 8), never the lockup on a plate over a photograph: the lockup stands on a
    designed ground. A needless card reads as sloppy, and over a photograph it reads as a template.

---

## 1. Depth, stacks and fans

### 1.1 Depth ladder (notification stack)
**What:** a stack of toasts in fixed **slots**; each further slot is smaller, higher-cropped, blurrier and darker. Toasts move
between slots; the slots never move. Reads as "it keeps happening".
**Numbers:** 5 slots, scale 1.000 / 0.943 / 0.894 / 0.849 / 0.807; visible strip of each card below the one in front 195 /
170 / 145 / 120 px; blur 0 / 2.5 / 3 / 3.5 / 9 px; brightness 100 / 92 / 85 / 78 / 70 %. A new toast every 4 f (later 9 f):
it starts 120 px below slot 0 at scale 0.95, opacity 0.6, blur 6 px and reaches the slot in 6 f on 0.59, 0.76, 0.87, 0.93,
0.96, 0.98, 1.0; every older toast moves to slot + 1 on the same curve. The stack anchor climbs while arrivals happen, then
drifts up 1.5 px/f with a +3 % push.

```tsx
const SLOT = [{ s: 1, y: 0, b: 0, l: 1 }, { s: 0.943, y: -195, b: 2.5, l: 0.92 }, { s: 0.894, y: -365, b: 3, l: 0.85 },
  { s: 0.849, y: -510, b: 3.5, l: 0.78 }, { s: 0.807, y: -630, b: 9, l: 0.7 }];
const C = [0, 0.59, 0.76, 0.87, 0.93, 0.96, 0.98, 1];
toasts.map((t, i) => {
  const arrivedAfter = arrivals.filter((a) => a > t.at && frame >= a);        // newer toasts already in
  const k = arrivedAfter.length, since = frame - (arrivedAfter.at(-1) ?? t.at);
  const p = C[Math.min(7, since)], from = k === 0 ? { s: 0.95, y: 120, b: 6, l: 0.6 } : SLOT[k - 1], to = SLOT[Math.min(4, k)];
  return <div style={{ transform: `translateY(${mix(p, from.y, to.y)}px) scale(${mix(p, from.s, to.s)})`,
    filter: `blur(${mix(p, from.b, to.b)}px) brightness(${mix(p, from.l, to.l)})`, zIndex: 10 - k }}>
    <Toast t={darkUI} start={t.at} icon={<BrandTile name="stripe" size={52} />} title={`Order #${t.id}`} body={t.body} /></div>;
});
```
**Avoid:** fading toasts in; equal spacing; every toast sharp; per-toast blur (blur belongs to the slot); a statement set
over the pile (set it beside the pile, or carry the top toast into the line's beat).

### 1.2 Deck spread (fan from behind)
**What:** three identical cards; the back two slide out from **exactly behind** the front one into a tilted fan, with lag,
then collapse back, and the front card flies off.
**Numbers:** back offsets at full spread (-284, -68) and (-517, -125) px; the second lags the first by 2 f; spread curve
circ-in over 13 f into a peak with 24 px motion blur; stack tilt 0 -> -6.6 deg with a 0.6 deg settle back; per-card
`rotateY` +4 deg (perspective 1600); back cards x0.85 brightness; camera +7.8 % quart-out over 9 f after the peak. Hold 8 f,
collapse with the reverse ease-in over 11 f, then the front card accelerates up (x1.5 per frame) and leaves the frame at
full speed, no fade, as the next title arrives under it.
**Avoid:** cards from the frame edges; uniform timing for all cards.

### 1.3 Self-dealing deck
Picture or content cards that grow in both directions (front cards out of the top card, back cards from under the deck),
alternating every 7-8 f. Recipe in `entrances.md` 2.7.

### 1.4 Dealt deck
**What:** cards are dealt onto a pile, one every 4 f, each landing a little off the one below and revealed by a block
dissolve, while the pile grows toward the lens.
**Numbers:** each card offset (-0.3 %, -0.9 %) of the frame and +3 deg from the one below; it lands in one frame, and its face
appears in a 2 f block dissolve (a 6 x 4 grid of blocks, half on the first frame, all on the second, seeded order); the
stack scales 1.0 -> 1.3 over the deal on `ease.in`, accelerating into the cut; 6-12 cards; a soft paper tick per card.
**Sells it:** the rhythm (every 4 f, locked to the beat) and the stack swelling.
**Avoid:** cards flying in from the frame edges; easing each card into place.

---

## 2. One container, many identities

**What:** one card changes what it is, in place: the user's starting thing (a profile, a document, a repo) becomes the
product, and the product becomes a task list.
The container never moves while its content rewrites; the viewer sees it is *the same thing* becoming something new.
**When:** the reveal beat of any "turns X into Y" product. The best single device for an AI product.
**Numbers:**
- Media swap: crossfade 2 f while `border-radius` goes 50 % -> 22 % (avatar circle becomes a product tile).
- Title swap: remove old words **one per frame** (cut, no fade), then add new words: first word 40 % + 3 px blur -> sharp the
  next frame, then the rest of the line 70 % -> 100 % over 2 f. A meta line swaps word groups with 2 f fades.
- An action pill collapses from both ends to its centre (width x1.0, 0.85, 0.66) while fading (1, 0.75, 0.45) over 3 f.
- A media row fades 0.6 -> 0.25 -> 0, sinks 12 px, blurs 6 px over 3 f.
- Then the empty lower half fills with checklist rows (3.2), ~20 f apart.

```tsx
const shape = mix(at(frame, 58, 2, ease.linear), 50, 22);
<Card t={glassBlue} w={980} pad={36}>
  <div style={{ width: 120, height: 120, borderRadius: `${shape}%`, overflow: 'hidden' }}>
    {frame < 59 ? <Avatar name="Rae Lin" color="#E0765A" size={120} /> : <ProductCover />}</div>
  <Title words={frame < 58 ? oldWords.slice(Math.max(0, frame - 58)) : newWords} />
</Card>
```
**Avoid:** rebuilding the card from scratch, or cutting to a new card.

---

## 3. Process, status and lists

### 3.1 Status rows push
**What:** a block of status rows ("Reading 41 files", "Drafting outline") grows from the bottom; each new row **pushes the
block up from rest over 6-8 f** (`settle`, half-life 2-3 f): smooth, never a one-frame jump. The newest word of a typing status is tinted for 1-2 f.
Rows every 20 f for a calm process; after completion, the header takes the accent and the rows vanish top-down, one every 2 f.

### 3.2 Spinner to check
**What:** a 300 deg arc (stroke 2.5 px) rotates in **45 deg steps per frame** (stepped, not smooth) for ~10 f, closes to a full
circle over 2-3 f, then becomes a check-circle; on that same frame the row's text goes full white and one weight heavier.
A tick sound per check, a low thump when the last one completes.

```tsx
const turns = Math.floor((frame - s) ) * 45;            // stepped rotation
const close = at(frame, s + 10, 3, ease.out);
<svg width={36} height={36} viewBox="0 0 36 36" style={{ transform: `rotate(${turns}deg)` }}>
  <circle cx={18} cy={18} r={15} fill="none" stroke={t.accent} strokeWidth={2.5}
    strokeDasharray={`${mix(close, 0.83, 1) * 94.2} 94.2`} strokeLinecap="round" />
</svg>
{frame >= s + 13 && <Icon name="CircleCheck" size={36} color={t.accent} />}
```

### 3.3 Build list with an accelerating cadence
**What:** rows "Installing ..." (accent spinner) flip to "Done" (grey check) with a 2 f crossfade; new rows fade in over 3 f
sliding up 20 px; the list scrolls ~62 px per row on an ease-out. Row intervals **9, 9, 9, 7, 5, 4, 3, 3 f**: the montage
accelerates into its result.

### 3.4 Skeleton cascade, resolved by a band
**What:** the result's real layout first appears as skeleton bars (12 px tall, radius 6, in a light tint of the accent), one row
per frame, each widening 30 % -> 100 % over 3-4 f (ease-in). Then a colour band sweeps left to right at ~90-110 px/f: ahead of
it the bars, inside it (~60 px) the bars turn a warmer tint for 2 f, behind it the real text. Then zoom 1.0 -> 1.2 and scroll
over the result. One decisive pass shows layout before content.
**Avoid:** grey skeletons with an endless shimmer loop.

### 3.5 Skeleton cards with sheen, then develop
Three glass cards show grey bars and a pill; a 135-deg pale sheen pulses across all three in sync twice (~25 f per pulse,
30 f apart); then real content develops in layers over 12 f (icon, text crossfading from the bars, photo fading up from white,
a badge last). The winner then grows 1.24x over 11 f while the losers blur 12 px and fade over 7 f.

### 3.6 Placeholder-first rows and connectors
Dashboard rows first appear as solid accent bars and crossfade into real rows 4 f later. Connectors draw on (line head
~70 px/f) in the accent with a 10 px glow, stay lit ~10 f, then fade to idle grey, except the winning one. Data in motion:
small filled dots travelling along lines or rails.

### 3.7 Event list
Rows arrive first as a darker slab with two more slabs stacked beneath (a deck), then the top turns white and its status tag
colours in (one colour per status); the stack below shortens by one per row. ~15 f per row.

### 3.8 Flow diagram that grows
Each step is a rectangle growing out of the previous one along one axis (a tab extends right, a connector steps, a card grows
down from its top edge in ~6 f), with small square nodes at every joint and percentages ticking in mono a few % per frame. The
camera pans with the growth.

---

## 4. Chat and generation

### 4.1 Bottom-anchored chat on the ground
**What:** no device frame: avatar and name pill at the top, items stack from the bottom. Every new item **cuts on at full
opacity 40-70 px below its slot and slides up** with an ease-out over 11-18 f; the stack auto-scrolls one line pitch in 3-5 f
when content grows; when crowded, items rising past a threshold blur 0 -> 3-6 px and fade to 0.38 or 0 (recency blur); the
avatar stays sharp. A slow pull-back underneath (1.00 -> 0.95 over ~100 f).
**Numbers:** user bubble a light tint of the accent, ink dark; assistant bubble near-white; shadows 6-10 % at 18-50 px blur.

```tsx
const rise = (s: number) => ({ transform: `translateY(${mix(at(frame, s, 14, ease.out), 56, 0)}px)`,
  opacity: frame >= s ? 1 : 0 });
<div style={{ position: 'absolute', bottom: 160, width: 900, left: 510, display: 'flex', flexDirection: 'column', gap: 18 }}>
  <div style={rise(20)}><Bubble t={t} from="me" start={-99}>Plan my Thursday around the 3 pm review</Bubble></div>
  <div style={rise(60)}><Bubble t={t} start={-99}><Thinking /></Bubble></div>
</div>
```
The kit `Bubble` springs in from its corner (scale 0.6 -> 1); for the cut-on rise, pass `start` in the past and animate the
wrapper as above.

### 4.2 Thinking becomes the answer
**What:** the typing indicator *is* the answer being born. (1) The dots pill tints toward the accent and its right edge starts
creeping (+5 px/f, f0-5). (2) The dots vanish; the pill stretches right to the card width on a decelerating curve and a little
down, becoming a soft horizontal gradient of the accent (f4-14). (3) A near-white front sweeps left to right across it with a
~300 px gradient band ahead (f11-25) while the card grows **upward** (bottom anchored). (4) Text streams in behind the front:
first lines by a soft wipe with an 80 px blurred leading edge; list rows icon first, then ~4 chars/f; the closing question
slower, 1-2 chars/f with 2 f stalls.
**Avoid:** dots fading out and a card fading in; an answer typed at a person's speed (a machine's answer streams).

### 4.3 Send glow
The input blurs 0 -> 16 px over 5 f and becomes a blurred pill of moving warm colour blobs (in the brand's light tints) that
travels up to the sent bubble's place; the bubble re-sharpens over 5 f, still tinted, cooling to its normal colours by +6 f.
The status header starts typing under it 1 f later. The send made visible.

### 4.4 Streaming answers
One block per frame top-down (header, sentence, row, row, feedback icons), each block 0.5 -> 1 opacity over 2 f; thumbnails
inside answers arrive in the "processing" tint and turn true colour over ~5 f. A 6 % breath zoom of the camera while it streams.

---

## 5. Inputs and presses

### 5.1 Input field
Use `InputBar` for prompts: typed text with a human cadence, a caret, a send button that lights up when text exists and dips
when pressed (`sendAt`).

```tsx
<InputBar t={darkUI} text="Summarise last week's churn by plan" start={20} cps={15} sendAt={96} w={1140} size={34} />
```
Delete-and-retype for a URL or handle field (one char per frame deleted, a 1 f beat, then the real value typed unevenly).
In macro, put the camera on the caret (`camera.md` 6.2).

### 5.2 Press
- **Button:** dips 6 % with a brief brightening (`Button pressAt`), or 2-4 % and slightly darker for 2-3 f; release; often a
  one-frame glow on release (fill toward white + 40-60 px glow in the accent).
- **Send button without a cursor:** it turns the accent (or darkens) for 2 f; the input drifts up (2, 3, 5, 12 px/f) and a
  hidden cut lands in the conversation.
- **Drain:** the pressed control shrinks (r x0.77 over 6 f), its fill drains from the bottom up over 4 f, and the remaining
  shape becomes the next window (`turns.md` 5.2).
- **Copy pill:** the pill runs through the brand's colour ramp over ~9 f and lands dark with a check.

```tsx
<Button t={t} label="Deploy" pressAt={951} size={30} />
```

### 5.3 Click feedback
Pick one in a film and keep it:
- **Glow bloom:** a light radial bloom (core in the light accent, half-intensity radius ~150 px, gone by ~290 px) under the
  text and over the field's fill, appearing 2 f after the click, growing for 4 f, fading over 6 f. No sound needed.
- **Dot + ring + wash:** a dot blooms to ~18 px with a soft halo over 3 f, a thin ring expands to ~40 px and fades over 6 f, a
  pale ~200 px wash tints the area; **the dot persists** and is seen again in later shots (state continuity).
**Avoid:** generic ripple rings on every click.

### 5.4 Field becomes button
An input finishes (an odometer value settles); the box widens ~10 % and fills with the accent in 4 f; its label becomes the verb
("Save limit"). One element, two roles.

---

## 6. The cursor as a character

A cursor is optional (many great films have none: the UI acts on its own, which suits agent products). When present it has
mass, intention and a personality.

**Rules:**
- **Never teleport, never glide in a straight line at constant speed.** The kit's `cursorAt` arcs every segment (bow up to
  80 px, 12 % of the length) and eases in-out.
- **Approach on expo-out** (peak 40-130 px/f), **dwell** 5-16 f on the target before pressing, **press** with a 2 f dip
  (scale 0.92, plus a 4 px push toward the target), then **keep drifting** ~1-3 px/f (and ±4 deg tilt over ~1.5 s); it never
  freezes.
- **Enter from a frame edge** (usually the bottom) in 3-4 f with heavy blur clearing (80 -> 0 px), never pop in mid-frame.
- **Hover the alternatives first.** Hovering two options (each lighting its hover state in 2 f) before clicking the third tells
  the viewer there were choices.
- **The tip leads travel**: on fast diagonals tilt it a few degrees into the direction of travel.
- **Size is a decision:** realistic (30-46 px, 1 px outline, small shadow) for tool demos; **oversized** (cap ~1/4 of the
  frame, white with an 8 px rounded black outline) as a playful character that hovers *above* the UI, with a same-shape grey
  shadow far below-right (+160, +165 px) that **converges** toward it as it lands (+90/+110, +25/+50, +16/+40): the landing is
  sold by the shadow. Over a text field it may switch to an I-beam (tilted +15 deg on its first frame, upright 3 f later).
- It can pass *behind* a giant word for a few frames: it lives in the same space as the type.
- **On a phone it is a touch, never a desktop cursor:** a soft fingertip disc (or a ripple) that presses and lifts, set
  beside or below the label it taps so the label stays readable; never an arrow or a mouse hand on a phone screen.

```tsx
<Cursor start={226} size={44} clicks={[262]} keys={[
  { f: 226, x: 980, y: 1140 },                       // enters from the bottom edge
  { f: 232, x: 1210, y: 640, curve: ease.out },      // fast approach
  { f: 244, x: 1060, y: 610 },                       // hovers an alternative
  { f: 256, x: 1335, y: 612, curve: ease.inOut },    // the real target, dwell 6 f
  { f: 290, x: 1352, y: 626 },                       // keeps drifting after the click
]} />
```
**Avoid:** a cursor in every scene; system-cursor realism in a stylised world; clicks without a visible state change.

---

## 7. Selection and focus

- **Focus by isolation:** others blur 4 -> 10 px and drop to 25 % brightness over 4 f; the chosen item's title and value turn
  the accent over 3 f; a focus ring 24 px outside (2 px + 14 px glow) and a second faint ring 60 px further out for 5 f; the
  camera pushes x1.05 -> 1.46 with one peak-speed frame and centres the chosen item.
- **Focus by growth:** the chosen card grows 1.24x over 11 f (`cubic-bezier(0.33,0.23,0.05,0.87)`) while the others blur 12 px and
  fade over 7 f. No checkmark, no highlight colour.
- **Hover states** change in 2 f: ghost button -> filled; a row gains a 2 px accent outline and a 6 % accent tint.
- **Design-tool grammar** (only when the product is an editor or builder): a 1 px selection box with square handles that snaps
  to its content's width in one frame; handles that cut on one at a time (TL, TR, BL, BR over 6 f) and a "blink" that travels
  around them (2 f per state); handles that stretch into bars while the box resizes, then contract; a marquee drag (translucent
  white rectangle from a fixed corner) whose release lights a 2-3 px white outline round the selected subject for 3 f ("mask
  applied").

---

## 8. Toasts, terminals and code

### 8.1 Toasts
`Toast` drops in from above with a spring. Use real app icons (`BrandTile`) and plausible copy. Sound, if any, is one soft dry
tick, quieter for each later toast; never a ding, chime or bell (`sound-design.md`). For many, use the depth ladder (1.1).
For a pill that expands from its icon, see `entrances.md` 2.8.

### 8.2 Terminal
`Terminal` prints lines on their frames: `cmd` lines type with a block caret, `out` / `ok` / `dim` lines rise 6 px and fade in
over 6 f.

```tsx
<Terminal t={darkUI} w={1100} h={560} title="zsh" size={24} lines={[
  { f: 10, text: 'acme deploy --prod', kind: 'cmd', cps: 18 },
  { f: 46, text: '✓ built in 4.1s', kind: 'ok' },
  { f: 52, text: '✓ 38 routes, 2 edge functions', kind: 'ok' },
  { f: 60, text: '→ https://acme.dev', kind: 'out' },
]} />
```
Upgrades for a CLI flow: a multi-select whose bullets become check marks one per ~5 f, a `>` marker stepping down the options,
a Yes/No where Yes turns the accent, then the machine's output streams line by line. Push the camera in ~1.8x so the text is
legible, pull back after. Keep the type real (real commands, real flags, real versions).

### 8.3 Code card
Code streams as a machine writes it (1-2 lines a frame), while the camera holds the one line that matters at a readable size
(26 px or more on screen) and lights it; a pull-out afterwards may show the volume. Syntax colours from a familiar dark theme;
one "Copy" pill pressed at the end. A code card can **peek** 30 px at the bottom before rising (`entrances.md` 2.3).

---

## 9. Worlds for UI

- **Light UI on a clean ground:** white cards and pills (`lightUI`), real interface only, on a flat white or a designed ground, soft blue-grey shadows,
  a light-tint user bubble, one accent that is born light and deepens. Depth of field as recency.
- **Dark glass:** `darkUI` cards with `glass` over a picture or a scene that is really behind them, a lit top rim, a moving
  specular streak (see `effects.md`). A flat deep tone of the accent's hue, never pure black, never a soft bloom as the ground.
- **Product-colour stage:** flat glass cards (diagonal gradient sheen + 1 px rim at ~16 % white, no backdrop blur) on a
  flat saturated brand ground; the ground changes only when the story changes place or state.
- **Grid world:** UI shown flat, big and one component at a time on the same grid as the abstract shapes; sentence-case labels in the
  UI face on chips with a coloured square bullet (20-28 px as texture, 40 px or more when read); corner handles as a recurring motif.

---

## Integrations

"It works with everything" is never a row of logo tiles or a stack of same-layout cards. Pick one form, by how much the
brief hinges on it; skip the beat entirely when it does not. In every form the artefact (a line of text, a task, a chart,
an endpoint) is the thing to read: 55 % of the frame's width or more, the largest text on screen (60 px or more), set on
the accent or made tall rather than left as a thin strip on a white plate.

| Form | When | What it is |
|---|---|---|
| relay | two partner products matter, and how the artefact looks in each | the artefact pinned, two hosts cut round it (below) |
| object-lock swap | "works everywhere": the number of places is the point | the artefact fixed while 5-7 host worlds swap behind it, 4-6 f each (below) |
| sentence slot | the integrations are a list, not a demo | "Posts to [slot].": the slot swaps partner marks on the beat (below) |
| one host, deep | one integration carries the brief | that host used for real in macro, the others in a passing line (below) |

### Relay

**What:** one artefact travelling through the host products. It stays at one place on screen; around it, the host changes
on the beat, each in a different composition.

**Recipe (30 fps, 2 hosts in 1.1-1.4 s):**
1. Host A, `full-ui`: the artefact lands in a full-bleed chat (`PartnerSurface kind="chat"` at w 2200, cropped by the frame,
   camera 1.3x on the landed item, `landAt` lights it). 18-24 f.
2. Cut on the beat to host B, `macro`: the same artefact as a row in a tracker, the camera at 2.5-3x so only the row, its
   check and the tracker's mark read; the artefact's screen position is unchanged (a match cut on it). 14-18 f.
3. A third host only when the brief names three partners and the film has the time; give it a composition neither of the
   first two used (a split, type on a surface), on another of the world's grounds. 18-24 f.
4. Leave on the artefact: a velocity cut, a dive into it, or a morph into the next beat's object.

```tsx
// the artefact sits at the same screen point in every host; only the host around it changes
const AT = { x: 960, y: 560 };
<Relay anchor={AT} artefact={<EndpointChip />} hosts={[
  { f: T.hostA, node: <HostChat anchor={AT} /> },                 // full-bleed, on the base ground
  { f: T.hostB, node: <HostTracker anchor={AT} zoom={2.8} /> },   // macro, on the inverse ground
]} />
```

**Into the relay (the artefact is born in the beat before):** the thing the product just made (the rewritten sentence, the
generated chart) arrives at the anchor by one of: a flight from where it was made (it lifts off its page as a plate and
flies in 12-16 f, `ease.inOut`, a small arc, scaling to its relay size; `<Relay enter={{ f, from: { x, y, scale } }}>`), a
match cut on its box, a morph from the UI element that made it (`turns.md` 5.8), or a hard cut on the beat. The first host
cuts in the frame it lands. A flood out of the plate's box (`<Flood from={box} to={<FirstHost />} reveal>`) is allowed only if the film has not spent its one flood elsewhere.

**Following one artefact through real places.** When the story is a journey (a sketch that becomes a frame, then code, then a
merged pull request), give each place its own act: the artefact arrives, a real state change happens there (converted,
streamed, checks pass, merged), the result is held until read, and the camera travels on to the next place carrying the
artefact. That is one demo told through several places; two unrelated demos in one film are not.

**Avoid:** three cards of one component on one ground (a carousel); logos as decoration; a host that only shows a mark and
moves on with nothing happening in it; the same three compositions (full-bleed, macro, tilted plane) every time.

### Object-lock swap

**What:** the artefact sits fixed at frame centre, large, while the world behind it hard-cuts through 5-7 hosts (a chat, a
tracker, a phone's lock screen, a doc, a terminal), each its own full-frame composition and ground. The swap rate says
"everywhere". It also serves as the spectacle for a "works everywhere" claim.
**Numbers:** 4-6 f per host, hard cuts on the beat or on its eighths, accelerating slightly (6, 6, 5, 5, 4, 4 f); each host
pushes 1.00 -> 1.02 over its own frames; the artefact (outside the camera, `camera.md` 6.5) re-tints its plate for each
ground in the cut frame and creeps 0.5 % across the whole run; the last host holds 12-18 f so it reads. A tick per cut.
**Sells it:** the artefact holding its place (its slow creep, never a jump) while everything behind it changes, every
host already pushing when it cuts in, so both sides of each cut move; each host recognisable at a glance by
its real mark and its layout, not by reading.
**Avoid:** hosts that share a layout; text in the hosts that must be read; moving the artefact between hosts.

The kit's `<LockSwap anchor artefact={(i) => <Plate tint={PLATES[i]} />} hosts={[{ f, node }]} end>` does this; by hand:

```tsx
const hosts = [<HostChat />, <HostTracker />, <HostPhone />, <HostDoc />, <HostTerminal />], durs = [6, 6, 5, 5, 4];
let t = frame - s, i = 0;
while (i < durs.length - 1 && t >= durs[i]) t -= durs[i++];
<AbsoluteFill style={{ transform: `scale(${1 + 0.02 * Math.min(1, t / durs[i])})` }}>{hosts[i]}</AbsoluteFill>
<At x={960} y={540}><Artefact plate={PLATES[i]} /></At>   {/* locked: outside the camera */}
```

### Sentence slot

**What:** one line, "Posts to [slot]." or "Works with [slot].", whose slot swaps partner marks (each mark plus its name) on the
beat, 3-5 of them, the last held. The integrations become one claim instead of a beat.
**Numbers:** `<SlotLine before="Posts to" items={[{ mark, name }, ...]} times after="." />` (kit.md): the mark and the name
roll to the next item on each frame and the centred line re-centres with a jump, so give each item 12 f or more. For a
faster run (8-14 f a mark) the line does not re-centre: left-align it on its prefix and roll the slot with
`<Swap items={[node, node, ...]} times>` (items may be a mark and a name; `text.md` 3.5).

### One host, deep

**What:** the one integration the brief hinges on, used for real: the artefact arrives in that product in macro, a real
state change happens there (it is posted, assigned, merged), and the other partners pass as one line of real marks on a
moving band under it, never as tiles.

## Wall

**What:** the same thing in quantity, pulled back from: the right spectacle only when the product's claim is literally a
quantity ("every PR", "all your documents"). Otherwise pick another from the spectacle menu (`film-grammar.md` spectacle).
**Numbers:** start on one real item, large (often the artefact the film has carried); pull back in log space and tilt while
the other items resolve in a wave from the centre (delay = distance from the centre x 1.5-2 f, `Wall wave`); then one event
crosses them all (`Wall event`: every item flips, lights up or takes the artefact), which is what makes the quantity mean
something. Keep the widest frame graphic: about 40 items or fewer in view, every third or fourth on the inverse ground,
the accent on about a quarter at the peak, the smallest label 28 px or more, a count set large on it if there is one.
Every item is real content, never grey bars; never hundreds of tiny pale cells. The same holds for any spectacle at its
widest frame (`film-grammar.md` spectacle).
**Out of a relay into a wall:** start the wall on its centre item at the artefact's exact screen size (wall zoom = 1 / the
item's scale, pivot on the item) so the cut matches on the artefact, then pull back as above. Never in a film that also floods into the relay, and never followed by the wall draining into the mark: end
some other way (`film-grammar.md` lockups).
**Avoid:** a wall as the default spectacle; a wall and a relay and a flood in one film; a wall whose items are all alike.

## Not in the kit yet (build these by hand from the recipes above)

- **`Fan`:** cards from behind with lag, tilt, rotateY, darkening, collapse and fly-off.
- **`Bubble` arrival option:** `arrive="rise"` (cut on at full opacity, 40-70 px below, ease-out) besides the corner spring.
- **`ThinkingMorph`:** dots pill -> tinted stretch -> sweeping white front -> card growing upward -> streamed text.
- **`SendGlow`:** input -> blurred colour pill -> sent bubble.
- **`StatusRows`:** 3-frame push, tinted newest word, top-down collapse.
- **`Skeleton`** with a band resolve and synced sheen pulses; **`Develop`** layers for cards.
- **`Cursor` upgrades:** idle drift and tilt wobble, dwell before clicks, a push toward the target on press, tilt into travel,
  enter-from-edge blur, a landing shadow that converges, variants (`arrow` | `hand` | `ibeam` | `character`), and an `end` frame.
- **`ClickBloom`** and **`ClickDot`** (dot + ring + wash, persistent).
- **`Handles`** (blink, stretch, converge) and **`Marquee`** (the kit has `Selection`, a box with corner handles).
- **`FieldToButton`** (the kit has `StatePill` for Add -> Added swaps).
- **`Connector`:** line draw-on with glow, idle fade, travelling dots.
- **`Terminal` additions:** a multi-select / confirm prompt line type, and a `cursorStep` marker.
- **`CodeCard`:** syntax-coloured code that can stream N chars or N lines per frame.
- **`Window`:** the traffic-light chrome is hard-coded; needs `chrome="mac" | "none" | "browser"` (URL bar) and a `radius`.
- **Theme accent default:** `lightUI.accent` is a generic blue; films should always pass the brand's accent (a lint warning
  when the default accent is used would help).
