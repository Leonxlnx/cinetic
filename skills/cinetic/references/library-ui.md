# Library: product UI

Finished animations for product interface in a film: notices that pile up, a card that fans out its siblings, a banner
that grows out of its icon, an inbox row that opens into its message, a palette whose list travels to one row, a card
dragged across a board, a stepped list, a task run, a button that becomes its own progress bar, a prompt sent and
answered, a chat exchange, a settings card driven by a pointer, a week that fills in a wave, and a phone that drops in.
Import them from the kit (`import { RowExpand, Pointer, lookLight } from '../../kit';`). The reel `library-ui` shows
every piece with its name: render it to see them move.

## The design bar

Product UI in a film reads as real only when it is detailed: a generic white card with two grey lines reads as cheap.
Every piece here is built that way, and anything you add beside them should be too.

- Context: the focal component sits in its app (a window with a title bar and sidebar, a palette, a phone, a panel with
  a header and a composer), not alone on the ground.
- Density inside the focal component: avatars, names, timestamps, states and counts, small icons, hairline dividers,
  keyboard hints, hover and focus states. Believable data (real names, amounts, file names, times), different in
  every row.
- Type hierarchy: one title weight (600-660), body 400-560, muted secondary lines; primary UI text 30 px or more at
  1080p, secondary lines 24 px or more.
- Surfaces: one family (`surfaceStyle(L, level, radius)`: a hairline, a lit top edge, a layered shadow tinted to the
  ground, one light from above); radii in one scale per piece; even padding all round; pills padded (a quarter of the
  text size top and bottom, 0.7 at the sides: use `Pill`).
- Nothing cut: rows and labels are sized for their text, scrolling lists soften only at the card's edges.
- Logos: every piece that shows an app takes `mark` (a React node, for example a `<Brand>`); without one it draws a
  neutral glyph tile. Never draw a look-alike of a real product's mark.

Never: a screen shake or a flash on a press, a card that leaves by fading while it rises, a thing that suddenly turns
the accent colour, a colour or light-dark switch with no reason, a faint gradient ground or wallpaper, a button only
partly highlighted, a line that lands the rest of its words at once while typing.

Every piece takes a look `L` (`lookLight(accent, ground)` or `lookDark(accent, ground)`), `at` (its first frame), its
content and `speed` (1 is the measured timing; it reaches the pointer, caret and checks inside). Times inside a piece
are relative to `at`. All are deterministic from the frame.

## Shared parts

### Surfaces and small parts
`surfaceStyle(L, level, radius)`; `<AppPane L w h title mark icon sidebar sideW right size>` a desktop window (three
neutral dots, the mark and name, a node at the right, an optional sidebar; children fill the content area, `paneBar(size)`
is the bar's height); `<PaneSidebar L items active heading more>`; `<SearchField L w placeholder hint>`; `<Pill L label
color icon size>` a padded tag; `<KeyHint L k size>` a key cap; `<Face name color size>` a neutral letter avatar and
`<Presence L color size>` its dot; `<MarkSlot mark icon colors size>` the passed logo or a glyph tile; `<Notice L n w
size>` a notification card (`n = { title, body, time, app, icon | letter, colors, mark }`).

### Pointer
A pointer that looks right: a macOS-proportioned arrow (straight left edge, notch, tail) in near-black with a lit top,
a white outline a tenth of its height, a two-layer shadow that drifts away while it travels and closes when it lands, a
lean into fast horizontal travel, a 2 px idle drift at rest, a squash press and a soft ring.
```tsx
<Pointer keys={[{ f: 8, x: 1500, y: 1000 }, { f: 30, x: 990, y: 560 }]} clicks={[32]} size={66} ring="#9DB6FF" exitAt={60} />
```
- `keys` are `{ f, x, y, curve, bow }` (x, y = the tip); between keys it arcs (`bow`, 0.14 of the distance, at most
  120 px; a key's own `bow: 0` makes the move into it straight, for a drag along a track) and decelerates long onto the
  target (`cubic-bezier(0.3, 0.05, 0.12, 1)`). `pointerAt(frame, keys)` gives its position, for a thing it carries.
- Numbers: press in 3 f to 0.84, springs back over 7 f with a small overshoot; the ring grows from 0.25 to 1.5 of its
  size in 20 f, fading, 1 to 5 px blur. `pressOf(frame, clicks)` gives the press (0-1) for the target to answer with.
- Caution: the target must answer the press (a hover fill before it, a dip, a state change); keep it 56-80 px tall.

### Caret, InkTyped, InkWords
`<Caret color height typing since />` a bar, solid while typing, blinking every 15 f when idle. `<InkTyped text times
color born />` typed characters on their key frames (`typingTimes(text, start, fps, cps, seed)`, never with a burst),
each born in the accent and cooling to the ink over 6 f. `<InkWords text start every color born />` words every 2 f,
born at 45 % in the accent with 3 px blur, settling in 5 f (streamed answers).

## Stacks

### NoticePile
One notice lands alone and is held, then a second, then faster and faster in a pile with depth; optionally the pile
folds back into one with two lips. For "it keeps coming" (orders, messages, sign-ups).
```tsx
<NoticePile L={lookDark('#FF7A3D', '#0E0F13')} items={orders} at={T.pile} hold={40} collapseAt={128} y={300} w={1080} size={40} />
```
- Numbers: the first lands by shrinking 1.30 to 1.0 over 12 f with blur 28 to 0; each later one rises 120 px into the
  front slot along 59, 76, 87, 93, 96, 98, 100 % (6 f) from scale 0.95 and 6 px blur; older ones step back a slot:
  scale 1, 0.943, 0.894, 0.849, 0.807, blur 0, 1.2, 2, 2.8, 5, dimmer, 0.8 of a notice lower so each title line stays
  whole. Gaps after the first: hold, 18, 11, 8, 6, 5, 4, 4, 3. Collapse: back to front, 2 f apart, 9 f ease-in each.
- Caution: hold the first one 30-45 f; keep every item's text real and different.

### CardFan
A card lands by shrinking and fans its siblings out from behind it, holds, folds them back and leaves upward. For "it
is connected to the rest".
```tsx
<CardFan at={T.fan} w={1000} h={204} lift={0.46} cards={[<Notice ... />, <Notice ... />, <Notice ... />]} fanAt={26} foldAt={72} exitAt={86} />
```
- Numbers: landing as NoticePile's first, gliding 340 px in from the left along `cubic-bezier(0, -0.21, 0.158, 1.007)`;
  each card behind slides out 8 f, 4 f apart, up `lift` of the card's height and left 0.07 of its width, the group
  turning 1.5 degrees; fold 9 f ease-in; exit up, each step 1.5x the last (12 f), with a vertical smear.
- Caution: short titles on the cards behind; their bodies stay hidden.

### BannerPop
A banner grows out of its icon: a blurred pill with only the glyph (or `n.mark`) widens to the right in 4 f as it
sharpens, a badge pops, the title and body arrive by word, the banner rises 56 px and a sheen crosses it once.
```tsx
<BannerPop L={lookDark('#5B86FF', '#111216')} at={T.banner} n={{ title: 'Assistant', body: 'Want me to test a lower price this week?', time: 'now', icon: 'Sparkles' }} w={1340} size={42} />
```
- Numbers: width 0.15, 0.3, 0.62, 0.9, 1 on frames 0-4, blur 8 to 0; badge at +3 f; words every 2 f from +4 f; rise
  56 px over 16 f expo-out; sheen at `sheenAt` (44 f), 10 f.
- Caution: one line of body; for more, open it (RowExpand).

## Lists and grids

### RowExpand
An inbox in its window (folders and labels in the sidebar, a list header with a count and search) whose row opens in
place into the message: a pointer arcs onto the row, the whole row takes the hover fill, the press dips it 1 %, and the
row's own box grows into the message card over the list; the avatar, sender, time and subject are the same objects and
travel to the header, the unread dot clears, then the body blocks and the action bar (Reply with its key hint) rise in.
The pointer moves on to Reply and hovers it. `closeAt` folds it back.
```tsx
<RowExpand L={lookLight('#2B5BFF', '#E9EBEF')} rows={mail} index={1} at={T.inbox} openAt={46} closeAt={124} toLine="to me · Tuesday 14 May" detail={[<Para />, <LineItems />, <Attachment />]} w={1680} h={900} size={31} mark={<Brand ... />} />
```
- Rows: `{ from, color, time, subject, preview, unread, tag: { label, color }, attach }`; 4 rows at size 31 in a 900 px
  pane.
- Numbers: hover fill 4 f from 12 f before the open; press 2 f before; open 20 f along `cubic-bezier(0.3, 0, 0.1, 1)`
  (position, size, radius 0.5 to 0.95 of the size, shadow level 1 to 6); subject grows 1.45x; detail blocks rise 18 px,
  3 f apart, from +10 f; pointer on Reply at +48 f; close 18 f.
- Caution: give the message real content (an amount, line items, an attachment); keep previews short enough for one line.

### PickList
A command palette: a query typed at a believable pace, and from the first key the list travels in one decelerating move
until the `target` row sits in the fixed highlight band (which spans the whole row); on landing the band rings, the row
shows its Enter hint, the palette pushes in 3 %, then the footer's Enter key presses and a check pops.
```tsx
<PickList L={lookLight('#2B5BFF', '#E9EBEF')} rows={people} target={11} query="lea" at={T.pick} dur={36} w={1320} size={30} />
```
- Rows: `{ name, role, color, presence, status: { label, color }, trail }`.
- Numbers: typing at 8 characters a second from +12 f; travel `dur` along `cubic-bezier(0.25, 0.6, 0.1, 1)` from the
  first key + 2 f, rows blurred at most 1.6 px while fast; ring 2 px over 8 f plus a second ring 14 px out fading; push
  1 to 1.03 over 24 f; Enter at `pickAt` (16 f) after landing.
- Caution: 12 rows or more so the travel reads as a search; the query should match the target's name.

### BoardDrag
A project board in its window; the pointer picks up one card and drops it in another column. The card lifts (scale
1.04, tilt 2.5 degrees, top shadow), its column closes the gap, it rides the pointer along an arc, the target column
opens a dashed placeholder and the cards below step down, and on release it settles into the slot while both column
counts change.
```tsx
<BoardDrag L={lookLight('#E8572A', '#ECEBE8')} columns={columns} from={[0, 0]} to={[1, 0]} at={T.board} pressAt={42} dur={30} w={1680} h={900} size={30} />
```
- Cards: `{ id, title, tag: { label, color }, who, whoColor, due, comments, checks }`; three per column at most (four
  after the drop) at size 30 in 900 px.
- Numbers: hover 4 f from 10 f before the press; lift 8 f; gap closes 10 f from +4 f; drag `dur` along
  `cubic-bezier(0.4, 0, 0.15, 1)`; placeholder opens 10 f from 45 % of the drag; settle 10 f.
- Caution: keep titles to one line at the column's width.

### StepList
A stepped list carousel: a tile with four accent star ticks shows the active item's icon; beside it the active label is
big in the ink and its neighbours fade by distance. Steps accelerate. For "every format, every kind".
```tsx
<StepList L={lookLight('#E8572A', '#F4F4F2')} items={[{ label: 'Video', icon: 'Video' }, ...]} at={T.formats} every={[10, 8, 7, 6, 5, 5, 4, 4, 4]} size={84} />
```
- Numbers: each step one pitch (1.25 of the size) in 2 f along `cubic-bezier(0.2, 0.9, 0.3, 1)`; the icon swaps by cut;
  neighbours at 55, 28, 10 % with up to 1.4 px blur.
- Caution: 8 items or more, short labels; under 4 f a step the labels stop being readable.

### TaskRun
Rows join a card one by one with a stepping spinner; when the next arrives the previous closes (spinner to a check that
pops, the label to the done word, the title to the ink); the cadence accelerates, the card scrolls once full, the header
(with `mark`) counts "n of N".
```tsx
<TaskRun L={lookDark('#4F7BFF', '#0B0C10')} at={T.build} title="Setting up your store" working="Setting up" done="Created" doneAt={78} tasks={tasks} w={1180} size={38} />
```
- Numbers: gaps 12, 11, 10, 8, 6, 5, 4, 3, 3; a row fades and rises 20 px in 4 f; the check springs 0.6 to 1, its tick
  draws in 5 f; scroll one row in 6 f.
- Caution: leave 10 f after `doneAt` before cutting.

### CalendarWave
A week fills in a wave: a calendar card (mark, month, Today, a Day / Week / Month switch, day heads, hour lines, a now
line across today); each event appears as a pale ghost of its colour in a wave crossing the week diagonally, then takes
its tint, colour bar, title and time.
```tsx
<CalendarWave L={lookLight('#2B5BFF', '#E9EBEF')} events={[{ day: 0, start: 9, len: 1, title: 'Stand-up', color: '#3D6BFF' }, ...]} at={T.week} wave={24} w={1680} h={900} size={33} />
```
- Numbers: event start `at + (distance ^ 0.85) * wave`; ghost scale 0.92 to 1 in 5 f, colour and text 6 f, 5 f later;
  the now line draws across today in 10 f after the wave.
- Caution: one-hour blocks hold a title and a time at size 33 in 900 px; no purple or green unless they are the
  product's own colours.

## Input and state

### PromptAnswer
A prompt typed in a two-row composer (tools pill, model pill, microphone, send), a pointer that arcs onto send while
the last words land, a press the send disc answers, the text travels out of the composer into its own neutral bubble,
and an answer card grows out of the composer: the assistant's mark with a shimmering status, the answer by word, a
result row (a file and two actions), and the status settling to the time it took.
```tsx
<PromptAnswer L={lookLight('#E8572A', '#EFEDEA')} at={T.prompt} prompt="Draft a launch note for Friday" answer="Field kit 2 ships Friday: ..." status="Writing" y={850} w={1360} size={34} mark={<Brand ... />} />
```
- Numbers: typing from +8 f at `cps` (17); press `pressDelay` (12) f after the last key; pointer from 24 f before the
  end of typing; text to bubble 16 f along `cubic-bezier(0.3, 0, 0.1, 1)`; card grows 16 f from +10 f; status 34 f;
  words every 2 f; the result row rises 12 f after the words.
- Caution: the prompt fits the composer on one line; two or three lines of answer.

### ChatThread
A chat in its window: a header (avatar with presence, name, "Active now", call icons, `mark`), a day divider, the thread
and a composer. A received message is announced by typing dots in a bubble that then widens into the message, its words
washing in; a sent message is typed into the composer, the send disc lights and presses, and the text travels out of
the field into its bubble at the right; "Read" settles under the last. Messages with a negative `f` are history.
```tsx
<ChatThread L={lookLight('#2B7BFF', '#E9EBEF')} at={T.chat} macro={1.9} msgs={[{ f: -60, text: 'Did the samples arrive?' }, { f: 26, text: 'Are you free tomorrow at ten?', typing: 22 }, { f: 92, text: 'Yes, works for me', me: true }]} />
```
- Numbers: dots bubble unfolds 7 f (blur 7 to 0), dots bounce on a 20 f cycle; widening into the message 9 f; ghost and
  ink washes 10 f each from +2 f and +6 f; composer typing at 15 characters a second, ending 10 f before the send; the
  sent text travels 14 f; the thread rises 10 f per message; macro pull-back 22 f in log-space.
- Caution: one line per message; three to six messages.

### ActionMorph
A button that becomes its own progress bar and closes into a check, always fully lit: the pointer's arrival darkens the
whole pill (`hoverAt`), the press dips it, it widens into a bar with a lighter sweep running inside and the live status
in white, then it contracts into a disc, a check draws and the done label slides out beside it.
```tsx
<ActionMorph L={lookLight('#2B5BFF', '#E9EBEF')} label="Publish" working="Publishing" doneLabel="Live on field.studio" at={T.publish} pressAt={64} hoverAt={55} dur={44} size={40} w={400} trackW={1100} />
```
- Numbers: hover 4 f, the pill 10 % darker; dip 4 % over 3 f; widen 14 f (`cubic-bezier(0.3, 0, 0.1, 1)`); progress
  `dur` frames with small holds; contract 12 f; check 7 f; done label 14 f.
- Caution: put it at the foot of a real card (what is being published) and drive it with a `Pointer` click on
  `at + pressAt`.

### SettingsCard, ToggleSwitch, ValueSlider, SelectFrame
`<SettingsCard L rows at title sub mark>` a settings card driven by a pointer: rows of icon tile, title, description and
a control (`{ kind: 'toggle', on, clickAt }`, `{ kind: 'segment', options, active, to, clickAt }`, `{ kind: 'slider',
keys, format }`); the pointer visits the controls in time order and presses each, and drags the slider's thumb along its
track (a straight move). `<ToggleSwitch L onAt offAt size />` the knob travels with a stretch (30 % wider mid-way, 9 f,
a small overshoot), the track takes the accent over 6 f (its state). `<ValueSlider L keys w size format pill />` the
thumb follows eased keys, swelling 10 % with a soft accent halo while dragged. `<SelectFrame L at left top w h tag />`
a 2 px accent frame dragged open from its top-left corner (12 f), handles popping on 2 f apart (not in the reel).
- Caution: one control changes at a time; everything else in the card stays still.

### PhoneDrop
A phone drops in with weight onto a lock screen (status icons, date, time, two older notices as lips, torch and camera,
home bar), a new notice slides in blurred and settles on top, the camera pushes into its reply field where a reply is
typed and sent, pulls back, and the phone leaves upward accelerating.
```tsx
<PhoneDrop L={lookLight('#2B5BFF', '#E6E8EC')} at={T.phone} n={{ title: 'Rosa Diaz', body: 'Can we move it to tomorrow?', time: 'now', letter: 'R' }} reply="Sure, see you at ten" w={480} />
```
- Numbers: drop 18 f along `cubic-bezier(0.15, 0.7, 0.1, 1)` from 12 degrees back; notice 8 f from +20 f, blur 10 to 0;
  push x2 over 22 f from +36 f (`cubic-bezier(0.6, 0, 0.1, 1)`); typing from +56 f; send 10 f after the last key; back
  at +100 f (16 f); leave at +122 f, each step 1.45x the last.
- Caution: `screen` is the wallpaper: a solid colour or a real picture, never a faint gradient.
