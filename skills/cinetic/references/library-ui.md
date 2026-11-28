# Library: product UI

**What it is for:** the product at work, designed like a shipped product: typing, sending, a list, a card opening, a
state change, a pointer action, many things at once, integrations. Reach first for `Pointer` (any press or drag),
`PromptAnswer` (an assistant asked and answering), `RowExpand` (an item opening into its detail), `ActionMorph` (the one
action of a scene) and `NoticePile` (it keeps coming). Not here: other companies' real screens
([hosts](library-hosts.md)), joins out of a press other than `SendLaunch` (`WindowOpen`, `GrowIris` in
[turns](library-turns.md)), the product's mark ([objects](library-objects.md)). Near neighbours elsewhere: `ActionMorph`
beside `MorphBox` (fx) and `CollapsePill` (turn), `SelectFrame` and `HandleGather` beside `CornerHunt` (fx) and
`CornerLine` (type); inside the category, `TaskRun` beside `RowCool`; see
[library.md](library.md#near-neighbours-across-categories) and [the product at
work](library.md#showing-the-product-at-work).

Finished animations for product interface in a film: notices that pile up, a card that fans out its siblings, a banner
that grows out of its icon, an inbox row that opens into its message, a palette whose list travels to one row, a card
dragged across a board, a stepped list, a task run, a button that becomes its own progress bar, a prompt sent and
answered, a chat exchange, a settings card driven by a pointer, a week that fills in a wave, a phone that drops in; a
feed that rushes to one row, ghost slots that take their colours, connectors with pulses into a panel, stat cards that
count, a hub pill with tool tiles, a chip that rolls like a slot, a sticky label, handles that gather, a dot that becomes
the caret, a file carried on a swinging pendulum, an extruded cursor, a progress log that cools, skeleton bars swept
into text, tiles flying into a bento grid, a send that launches the next window, a phone before swapping backdrops, and
cards that flood and blow away.
Import them from the kit (`import { RowExpand, Pointer, lookLight } from '../../kit';`). The reel `library-ui` shows
every piece with its name: render it to see them move.

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Does | About | Looks like | Reach for it for |
|---|---|---|---|---|
| [NoticePile](#noticepile) | build | 90 f | one notice lands alone and is held, then more, faster and faster, in a pile with depth; it can fold back | the "it keeps coming" beat: orders, messages or sign-ups arriving faster and faster |
| [CardFan](#cardfan) | enter, exit | 80 f | a card lands by shrinking and fans its siblings out from behind it, holds, folds them back and leaves upward | the "it is connected to the rest" beat: one card shown among its siblings |
| [BannerPop](#bannerpop) | enter | 54 f | a banner grows out of its icon, a badge pops, title and body arrive by word, a sheen crosses it once | one notification that matters |
| [RowExpand](#rowexpand) | emphasis, build | 80 f | an inbox row opens in place into its message: the same avatar, sender and subject travel to the header | one item in a list that opens into its detail |
| [PickList](#picklist) | emphasis | 70 f | a command palette: a query typed, the list travels in one move until the target row sits in the band, Enter | finding one thing among many |
| [BoardDrag](#boarddrag) | build | 80 f | a project board; the pointer lifts one card, carries it along an arc and drops it into another column | work moving forward on a board |
| [StepList](#steplist) | build, emphasis | 70 f | a stepped list carousel: the active label big beside an icon tile, neighbours fading by distance, steps accelerating | the "every format, every kind" beat: a long list of kinds said one after another |
| [TaskRun](#taskrun) | build | 80 f | rows join a card one by one with a spinner that closes to a check as the next arrives, the cadence accelerating | an agent or a setup working through its steps |
| [ActionMorph](#actionmorph) | emphasis, build | 100 f | a button becomes its own progress bar and closes into a check, the done label sliding out beside it | the one action of a scene: publish, send, deploy |
| [Pointer](#pointer) | emphasis | 40 f | a pointer that looks right: arcing, decelerating travel, a lifting shadow, a squash press and a soft ring | any press, drag or hover in a product scene |
| [PromptAnswer](#promptanswer) | build | 150 f | a prompt typed and sent, the text travels to its bubble, an answer card grows out of the composer word by word | an assistant asked and answering |
| [ChatThread](#chatthread) | build | 180 f | a chat in its window: typing dots widen into messages, a reply typed and sent from the composer, Read settles | a conversation between two people |
| [SettingsCard](#settingscard-toggleswitch-valueslider-selectframe) | build | 130 f | a settings card driven by a pointer: a toggle, a segment and a slider changed one after another | configuring the product, one control at a time |
| [ToggleSwitch](#settingscard-toggleswitch-valueslider-selectframe) | emphasis | 9 f | a switch whose knob travels with a stretch and a small overshoot while the track takes the accent | a setting turned on or off |
| [ValueSlider](#settingscard-toggleswitch-valueslider-selectframe) | emphasis | 24 f | a slider thumb follows eased keys, swelling with a soft accent halo while dragged, its value in a pill | a value dragged to a new setting |
| [CalendarWave](#calendarwave) | build | 60 f | a week fills in a wave: events appear as pale ghosts crossing the week diagonally, then take their colour | a schedule that fills itself |
| [PhoneDrop](#phonedrop) | enter, build, exit | 140 f | a phone drops in with weight, a notice settles, the camera pushes into its reply field, a reply is sent, it leaves | a message received and answered on a phone |
| [SelectFrame](#settingscard-toggleswitch-valueslider-selectframe) | emphasis | 18 f | a 2 px accent selection frame dragged open from its top-left corner, handles popping on one after another | a thing on a canvas being selected |
| [HubPill](#hubpill) | build | 75 f | words append into a hub pill that widens to fit and inks in from colour; each word brings a tool tile with a connector dot; the tiles fly out past the camera | integrations said as a line ("it connects to the tools you use"), one tool tile a word |
| [GhostFill](#ghostfill) | build | 60 f | ghost slots round a mark take their colours one app tile at a time, scattered, faster and faster, label pills popping beside a few | the "a whole set of tools in one place" beat: a registry, a suite, templates |
| [FeedRush](#feedrush) | emphasis | 80 f | a comment feed fills row by row, rushes into a vertical smear while a reading counter races, then brakes and lands on one highlighted row | the "it read all of it and found the one that matters" beat |
| [StatCount](#statcount) | enter, emphasis | 60 f | glass stat cards cut on blank over a picture, their figures appear and count up in whole numbers, each at its own rate | the cost or the scale of a problem, told in figures |
| [HandleGather](#handlegather) | emphasis | 26 f | a word types in fresh ink while small squares hop in from round the frame and lock as the handles of its selection box | a name or a title being picked out on a canvas: the opening of a design or agent tool |
| [DotCaret](#dotcaret) | enter | 40 f | a dot drops into a browser address field and stretches into the caret; the placeholder goes, the field widens, the view pushes in | a search or a request starting: the moment before typing |
| [ChipRoll](#chiproll) | emphasis | 45 f | an app chip inside a sentence rolls like a slot reel to the next tool, its neighbours faint above and below, the line closing up | the "it works with all of these" beat, said inside one line |
| [LinkPanel](#linkpanel) | build | 70 f | a column of sources joined to the rows of a panel by bracket connectors, light pulses run along them, each row lights as its pulse arrives and settles, the totals count up | the "everything flows into one place" beat: tracking, syncing, sources feeding one result |
| [BentoFly](#bentofly) | enter | 20 f | on a cut, photo tiles, solid tiles, discs and a pill arrive from every side already moving and brake into a bento grid | a world or a set of stories assembling at once: the open of a section |
| [SendLaunch](#sendlaunch) | join | 24 f | the send button lifts away and the composer falls out of frame; on the cut a small spark of pixels on a dark ground leads the app window in with a smear | a prompt sent and the product starting to work: from the request to the result |
| [FileDrop](#filedrop) | build | 40 f | the pointer carries a file in on an arc, the file swinging from its tip like a pendulum, drops it into the composer, the send button appears | a document handed to the product: a contract, a brief, a spreadsheet |
| [Cursor3D](#cursor3d) | emphasis | 20 f | a chunky extruded arrowhead cursor with a satin top, a side wall and a soft shadow glides onto a button, presses and rests with a slow tilt | a press in a soft, three-dimensional product world |
| [BackdropSwap](#backdropswap) | emphasis | 35 f | a phone holds its place at the centre while the pictures behind it hard-cut every five frames, the phone shifting a few pixels with each | the "wherever you are" beat: one product in many places |
| [FloodAway](#floodaway) | exit | 30 f | the cards round a line flood one by one with a saturated colour, keeping their shape and corners, then blow away outward, the outer ones first, turning edge-on | clearing a frame of clutter to leave one line: "too much of this", then the answer |
| [StickyType](#stickytype) | emphasis | 16 f | a sticky label appears as a square, stretches while its words type into it and draws a connector to what it annotates | a comment or a note pinned on a design, a page, a plan |
| [RowCool](#rowcool) | build | 60 f | a progress log under a shimmering header: each row lands with its verb in its icon's colour, cools to the ink as the next arrives, the block nudging up | an agent working through its steps, with each step's kind visible |
| [SkeletonSweep](#skeletonsweep) | build | 34 f | tinted skeleton bars cascade in a row a frame, then a warm band sweeps across and turns them into the real text behind it | an answer or a document being written in one go |

<!-- /library:pieces -->

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
- Real third-party screens (GitHub, VS Code, Figma, Slack, a mail app): show either the product's mark alone (`<Brand>`,
  `<BrandTile>`) or a faithful, detailed rebuild of its real screen, its own layout, colours, icons and wording, with
  the film's content in it. Start from the [host screens](library-hosts.md) (`GitHubPullRequest`, `GitHubIssueColumn`,
  `VSCodeWindow`); for a host they lack, rebuild it from a current screenshot of the real product, element by element.
  Never a rough mock (a grey box with the host's name, a title bar and two lines).

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
- Exit: from `exitAt` it slides down-right (520, 380 px) on an ease-in and fades, gone after `exitDur` frames (14). It
  is still on screen for most of that: set `exitAt` `exitDur` frames before the next scene arrives, or shorten
  `exitDur` (`exitAt={T.tap} exitDur={8}`).
- `touch`: a finger on a touch screen instead of the arrow: a soft round contact dot `size` across, translucent so the
  label under it still reads, centred on the point (`keys` give its centre). It shows faintly while it travels (the
  finger above the glass), settles as it lands, deepens and shrinks 14 % as it presses, the ring blooms from it, and on
  `exitAt` it lifts (grows a little and fades where it is). `<Pointer touch keys={...} clicks={[T.tap]} size={84} />`
- Which form: the arrow for a desktop app or a web page under a mouse; `hand` only for a link under a mouse; `touch` on
  any phone or tablet screen (an arrow or a hand on a phone reads as fake and covers the label it taps).
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
  scale 1, 0.943, 0.894, 0.849, 0.807, blur 0, 1.2, 2, 2.8, 5, dimmer, and lower by a step that shows each one's whole
  text (title and body) below the one in front, only its top padding under it. Gaps after the first: hold, 18, 11, 8,
  6, 5, 4, 4, 3. Collapse: back to front, 2 f apart, 9 f ease-in each.
- `stack="lips"`: a tight pile instead, each one behind showing only a rim of its card, no text. `pitch` sets the step
  in px (never so that a text line is half hidden).
- Caution: hold the first one 30-45 f; keep every item's text real and different.

### CardFan
A card lands by shrinking and fans its siblings out from behind it, holds, folds them back and leaves upward. For "it
is connected to the rest".
```tsx
<CardFan at={T.fan} w={1000} h={204} lift={0.46} cards={[<Notice ... />, <Notice ... />, <Notice ... />]} fanAt={26} foldAt={72} exitAt={86} />
```
- Numbers: landing as NoticePile's first, gliding 340 px in from the left on an exponential tail (half-life 3.5 f), out
  of a focus blur of `blur` px (12) that halves every 2.5 f (sharp in about 8 f, never a smear); each card behind slides
  out 8 f, 4 f apart, up `lift` of the card's height and left 0.07 of its width, the group turning `turn` degrees (1.5;
  0 keeps it square to the frame); fold 9 f ease-in; exit up, each step 1.5x the last (12 f), with a vertical smear.
- Caution: short titles on the cards behind; their bodies stay hidden.

### BannerPop
A banner grows out of its icon: a blurred pill with only the glyph (or `n.mark`) widens to the right in 4 f as it
sharpens, a badge pops, the title and body arrive by word (each word rises 0.3 em into place in its own ink: no blur
and no colour smear; `born="#hex"` brings back words born in a colour that de-blur), the banner rises 56 px and a
sheen crosses it once. Placed by transform.
```tsx
<BannerPop L={lookDark('#5B86FF', '#111216')} at={T.banner} n={{ title: 'Assistant', body: 'Want me to test a lower price this week?', time: 'now', icon: 'Tag' }} w={1340} size={42} />
```
- Numbers: width 0.15, 0.3, 0.62, 0.9, 1 on frames 0-4, blur 8 to 0; badge at +3 f; words every 2 f from +4 f; rise
  56 px on an exponential tail (half-life 4 f); sheen at `sheenAt` (44 f), 10 f.
- `leaveAt` and `leaveTo` (`'right'`, `'left'`, `'up'`): it leaves whole, accelerating over 14 f (each step 1.3x the
  last), fully clear of the frame on its last drawn frame, never fading and never removed mid-flight. Sideways when a line sits above it: `<BannerPop ... leaveAt={T.cue + 50} leaveTo="left" />`.
- `badge` defaults to notification red: set it in an invented palette.
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
- Rows: `{ from, color, time, subject, preview, unread, tag: { label, color }, attach, mark }`; 4 rows at size 31 in a 900 px
  pane. `mark` draws a logo or icon in the avatar's place (a company's mark, an app tile), in the row and in the opened
  header.
- `rowExpandGeometry({ index, x, y, w, h, size }, frameW, frameH)` returns the closed `row` box, the opened `card` box
  and the `reply` button's centre in frame px, for a pointer or a turn of your own (`pointer={false}` hides the built-in
  one): `const g = rowExpandGeometry({ index: 1, w: 1680, h: 900, size: 31 }, 1920, 1080);`
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
- Numbers: each step one pitch (1.25 of the size) on an exponential arrival (half-life 1.1 f: 70 % in 2 f, the tail
  running on through the hold); the icon swaps by cut; neighbours at 55, 28, 10 %, blended by distance, with up to
  1.4 px blur.
- Caution: 8 items or more, short labels; under 4 f a step the labels stop being readable.

### TaskRun
Rows join a card one by one with a stepping spinner; when the next arrives the previous closes (spinner to a check that
pops, the label to the done word, the title to the ink); the cadence accelerates, the card scrolls once full, the header
(with `mark`, or a glyph tile in the accent with `icon`; with neither the title stands alone) counts "n of N". The card
grows with its rows from its top edge (`grow`, default true), so it never opens as a half-empty slab.
```tsx
<TaskRun L={lookDark('#4F7BFF', '#0B0C10')} at={T.build} title="Setting up your store" working="Setting up" done="Created" doneAt={78} tasks={tasks} w={1180} size={38} />
```
- Numbers: gaps 12, 11, 10, 8, 6, 5, 4, 3, 3; a row fades and rises 20 px in 4 f while the card grows a row height on a
  settle (half-life 3 f); a closing row shows its check already drawing on its first frame (no bare dot), then the done
  word and the ink cross in over 4 f; scroll one row in 6 f.
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
- `push={{ at, to, dur, back }}` pushes in on the composer while someone types: from `at` (relative to the piece's
  `at`) the view scales 1 to `to` over `dur` (24) frames, ease in-out in log-space, and eases back from `back`.
  `<ChatThread ... push={{ at: 60, to: 1.3, back: 96 }} />`
- `fit` (default true): the window is never taller than the whole thread needs (header, day line, every message,
  "Read", composer), so `h` is a most and three or four messages get a short window, not an empty third over them;
  `fit={false}` keeps exactly `h`.
- Caution: one line per message; three to six messages.

### ActionMorph
A button that becomes its own progress bar and closes into a check: the pointer's arrival darkens the whole pill
(`hoverAt`), the press dips it, it widens into a bar whose colour eases to a pale track of the same hue (a deep one on a
dark look) while the fill, the accent at full strength, grows from the left, the live status in two inks cut at the
fill's edge; then it contracts into a disc, a check draws and the done label slides out beside it. The progress reads
on any accent, a light yellow too.
```tsx
<ActionMorph L={lookLight('#2B5BFF', '#E9EBEF')} label="Publish" working="Publishing" doneLabel="Live on field.studio" at={T.publish} pressAt={64} hoverAt={55} dur={44} size={40} w={400} trackW={1100} />
```
- Numbers: hover 4 f, the pill 10 % darker; dip 4 % over 3 f; widen 14 f (`cubic-bezier(0.3, 0, 0.1, 1)`); progress
  `dur` frames with small holds; contract 12 f; check 7 f; done label 14 f.
- The working label stands alone ("Creating link"); `percent` adds the running figure ("Creating link 76%"), only when the number is the point.
- Caution: put it at the foot of a real card (what is being published) and drive it with a `Pointer` click on
  `at + pressAt`.

### SettingsCard, ToggleSwitch, ValueSlider, SelectFrame
`<SettingsCard L rows at title sub mark>` a settings card driven by a pointer: rows of icon tile, title, description and
a control (`{ kind: 'toggle', on, clickAt }`, `{ kind: 'segment', options, active, to, clickAt }`, `{ kind: 'slider',
keys, format }`); the pointer visits the controls in time order and presses each, and drags the slider's thumb along its
track (a straight move). `<ToggleSwitch L onAt offAt size />` the knob travels with a stretch (30 % wider mid-way, 9 f,
a small overshoot), the track takes the accent over 6 f (its state). `<ValueSlider L keys w size format pill />` the
thumb follows eased keys, swelling 10 % with a soft accent halo while dragged. `<SelectFrame L at left top w h tag />`
a 2 px accent frame dragged open from its top-left corner (12 f), handles popping on 2 f apart.
- Caution: one control changes at a time; everything else in the card holds its state (the card keeps a slow idle).

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

## Feeds, fills and links

### FeedRush
A comment feed in its panel (title, a "reading" counter with a spinner) fills one row at a time, then scrolls faster and
faster into a vertical smear while the counter races, brakes hard and lands with one row highlighted in the middle.
For "it read all of it and found the one that matters".
```tsx
<FeedRush L={lookLight('#2B5BFF', '#E9EBEF')} rows={feed} target={9} at={T.feed} intro={3} every={8} dur={54} pass={24} total={3412} />
```
- Rows: `{ name, color, time, text }`; 12 or more, all different; `target` is the one it lands on.
- Numbers: intro rows every 8 f (fade-up 6 f, 6 px blur to 0); the rush (54 f, 24 rows) accelerates over its first
  quarter, cruises a fifth at about a row a frame, brakes over the rest; vertical smear 0.11 of the speed in px (at
  most 34 px); the counter is geometric with the travel; the highlight fills over the last 8 f; a 2 % push after
  landing.
- Caution: the landed row's text must be short enough to read whole; the counter is a whole number on every frame.

### GhostFill
Ghost slots round a mark (a shade darker than the ground, fading towards the field's edge) take their colours one app
tile at a time, scattered, the interval shrinking; label pills pop beside a few. For "a whole set of tools in one
place".
```tsx
<GhostFill L={lookLight('#2B5BFF', '#F7F5F0')} at={T.suite} items={[{ c: 0, r: -2, icon: 'Music', colors: [...] }, ...]} cols={5} rows={3} center={<Mark />} labels={[{ item: 2, text: 'Beat sync', f: 52 }]} />
```
- Numbers: a tile from a pale tint to full colour, critically damped (half-way in 2.5 f, settled by about 10 f; scale
  0.94 to 1); the field keeps a slow push and drift from `at` (`idle`, 0.8 % a second); intervals 6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 1 f;
  ghosts 4 % darker than the ground, radius 28 %; tiles 6.2 % of the frame height, pitch 1.42 of a tile.
- Caution: 12-20 filled of 50-70 slots; real tools (`mark`) or distinct glyphs with one colour pair each.

### LinkPanel
Sources stand in a column and the panel rises with its rows waiting (names, blank figures); a bracket connector joins
each source to its row, light pulses run along them, each row lights in the accent as its first pulse arrives, its
figures land and it settles to the surface, and the totals count up in steps.
For "everything flows into one place".
```tsx
<LinkPanel L={lookDark('#3D8BFF', '#08090C')} at={T.links} sources={[{ title, thumb, chip: '1,204 clicks', row: { label, meta, value } }, ...]} totals={[{ label: 'Revenue', from: 3330, step: 37, steps: 9, prefix: '$' }, ...]} />
```
- Numbers: sources drop in with blur on an exponential arrival (half-life 2 f); each connector comes in whole, node to row with a port at each end, over
  6 f, 2 f apart, from +8 f, following the panel as it settles (no end ever in mid-air); pulses 12 f source to row,
  3 f apart, every 24 f, from +10 f; rows light at +22 f, 3 f apart, lit 6 f then settle over 10 f; totals step every
  3 f.
- Caution: three to five sources; the totals must agree with the rows.

### StatCount
Glass stat cards cut on blank over a picture; the figure appears three frames later and counts up in whole numbers at
a steady rate; smaller cards join round it, each at its own rate. For the cost or the scale of a problem.
```tsx
<StatCount L={lookLight('#1F8A8A', '#E9EBEF')} at={T.cost} cards={[{ label: 'Onboarding cost', sub: 'Last month', from: 10, to: 1240, rate: 27, prefix: '$', pill: { label: 'Paid' }, f: 0, cx: 0.24, cy: 0.66, w: 0.21 }, ...]} />
```
- Numbers: a card arrives in 3 f (blur 10 to 0, scale 1.05 to 1); figure at +3 f, `rate` units a frame to `to`; pill at
  +12 f; later cards 11 f and 7 f after; glass: white at 74 % with a 22 px backdrop blur, a 1 px white rim, an accent
  bloom in the lower left; radius 9 % of the card's height.
- Caution: over a picture or a scene; different rates per card.

## Pieces of a sentence

### HubPill
Words append into a hub pill that widens to fit them, each word inking in through a short colour walk; with each word a
tool tile pops in round the pill with a coloured dot under it, and the same dot lands on the pill's edge; at `flyAt` the
tiles fly out past the camera. For integrations said as a line.
```tsx
<HubPill L={lookLight('#1D1F24', '#F6F4EF')} at={T.hub} words={['Works', 'inside', 'your', 'stack']} tiles={[{ mark: <Brand name="figma" size={62} />, dot: '#F2B33D', dx: -0.31, dy: -0.21, word: 0 }, ...]} flyAt={62} />
```
- Numbers: words every 12, 14, 9 f; the pill steps to its new width in 3 f; the walk gold, rose, coral, sage, blue, navy,
  ink at 2 f a step; tiles pop 0.6 to 1 in 3 f, 0.11 of the frame height, radius 22 %; fly-out 12 f ease-in to 1.35.
- Caution: three to five words; the tiles are the tools' real marks.

### ChipRoll
An app chip (mark and name) inside a sentence rolls vertically like a slot reel; the next chip peeks below at 30 %, the
reel creeps, then steps, faster each time; the chip's width follows its name and the line closes up.
```tsx
<ChipRoll L={lookLight('#2B5BFF', '#F0F0F0')} at={T.roll} before="find every" after="file you made" chips={[{ name: 'Figma', mark: <Brand name="figma" size={40} /> }, ...]} steps={[22, 34]} stepDur={[6, 4]} size={64} />
```
- Numbers: pitch 1.1 em; neighbours 30 % with 2 px blur; a creep of 0.15 pitch before the first step; steps 6 then 4 f
  ease-in-out.
- Caution: one-word names, three or four chips.

### StickyType
A sticky label appears as a small square and stretches as its words type into it, while a connector draws to what it
annotates.
```tsx
<StickyType L={L} text="Make the title shorter" at={T.note} x={1160} y={150} to={{ x: 1200, y: 335 }} color="#FFD8BC" ink="#4A2A14" />
```
- Numbers: the square pops in 2 f; letters from +3 f at 1.3 a frame, the label's edge two frames behind the text;
  connector 5 f from +2 f, straight unless `bow`; label 1.9 times the text size tall, radius 18 %.
- Caution: three or four words; a colour that means a note in the product, never a random yellow.

### HandleGather
A word types in fresh ink while four small squares appear scattered round the frame, hop every two frames, close in late and
lock as the handles of a selection box round it; the box takes a pale fill.
```tsx
<HandleGather L={lookLight('#2B5BFF', '#FFFFFF')} text="Your release notes" at={T.select} size={56} />
```
- Numbers: letters 1 a frame from +2 f, cooling from the accent over 4 f; squares appear at +0, +2, +4, +5 f and lock at
  +14 to +20 f; fill at +23 f; squares 0.9 % of the frame height; box padding 0.35 by 0.25 em.
- Caution: one short word or name.

## Inputs and pointers

### DotCaret
A dot hovering over a browser toolbar drops into the address field and stretches into the caret; the placeholder and tab
icon go, the field widens and the view pushes in; then a query types in fresh ink.
```tsx
<DotCaret L={lookLight('#2B5BFF', '#F0F0F0')} at={T.search} dropAt={10} text="brand assets from the spring shoot" typeAt={30} />
```
- Numbers: the drop 3 f ease-in, stretching 2.2 times tall; the caret thins to 2.5 px in 3 f; the field widens 1.7
  times over 6 f from +3 f; the bar pushes 1 to 1.15 over 8 f.
- Caution: the dot should come from the shot before (a full stop, a ball, a cursor).

### FileDrop
The pointer brings a file in from the lower right on a decelerating arc; the file hangs from its tip and swings as a
damped pendulum, then drops into the composer's attachment slot; the send button cuts on and the box grows taller.
```tsx
<FileDrop L={lookLight('#C4623E', '#F3F1EC')} at={T.attach} file={{ name: 'Lease agreement.pdf', size: '2.4 MB · 18 pages' }} greeting="What should we look at?" />
```
- Numbers: travel 9 f on the pointer's arc, settle 6 f; the swing's period 12 f, about 30 degrees in flight, settled in
  20 f; drop 5 f (scale 1 to 0.9); send button and growth 8 f later (22 % upward in 4 f).
- Caution: one file with a real name.

### Cursor3D
A chunky extruded arrowhead (satin top, a darker side wall, a contact shadow tinted to the ground) that glides onto its
target, presses into its wall and rests with a slow tilt. Takes the same `keys` and `clicks` as `Pointer`.
```tsx
<Cursor3D keys={[{ f: 10, x: 1300, y: 1070 }, { f: 30, x: 1080, y: 730 }]} clicks={[34]} color="#9FB0F7" ground="#33407A" />
```
- Numbers: press 3 f in, 6 f back: scale 0.9, the wall to 0.55 of its depth, the shadow's offset halved; wall 13 % of
  its size; shadow (+0.11, +0.2) of its size; idle tilt 4 degrees; size 5.5 % of the frame height.
- Caution: one per film, for a soft three-dimensional look; the target changes state on the press.

### RowCool
A progress log under a shimmering header: rows step on one at a time (an outline icon on a thin rule, a verb, a grey
line of detail); each verb lands in its icon's colour and cools to the ink, and each arrival nudges the block up.
```tsx
<RowCool L={lookLight('#2B5BFF', '#EEF0F3')} at={T.work} card rows={[{ icon: 'Search', color: '#2B6BE8', verb: 'Searching', detail: '42 shots across three shoot days' }, ...]} />
```
- Numbers: arrivals every 10, 8, 12, 10, 9, 8 f; a row fades in over 8 f (exponential out); the verb holds its colour
  3 f and cools over 9 f; the block stays centred, so it glides up half a row per arrival (critically damped from rest,
  half-way in 3 f); on its `card` the new row is revealed by the card's growing edge; the shimmer crosses in 24 f.
- Caution: one colour per kind of step, four to seven rows. Put it on its own `card` (it grows with the log): a fixed
  card drawn round it sits empty while the first rows arrive.

### SkeletonSweep
Tinted skeleton bars, measured to the text that will replace them, cascade in one row a frame; a warm band then sweeps
across, warming the bars ahead of it and turning them into the text behind it.
```tsx
<SkeletonSweep L={lookLight('#E07A2E', '#FFFFFF')} at={T.answer} lines={[{ text: 'Brief: spring campaign', scale: 1.3, weight: 640 }, { text: '...', bullet: true }]} />
```
- Numbers: a row a frame, each widening 0.2 to 1 in 3 f; the sweep at rows + 8 f (rows + 1 f for one or two lines, so
  a lone bar never holds), 14 f ease-in-out; bars warm within 0.3 of the block ahead of the band.
- `plate` (true: the look's surface; or a colour): a card behind the block, padded one text size, that opens with the
  first bar and grows down with the rows, never standing empty. With a plate of your own (a notice's box), start `at`
  on its first frame, not when it has finished growing.
- Caution: never leave the bars standing as content. It is a loading state for a drafted answer, not a way to set a
  claim: a single bar on a plate reads as an empty slab with a loading bar; set a claim with a type piece.

## Scenes and joins

### BentoFly
On a cut, photo tiles, solid tiles, discs and a pill arrive from every side already moving and brake into a bento grid.
```tsx
<BentoFly L={lookLight('#1E3A5F', '#F4F1EA')} at={T.world} cols={4} rows={3} tiles={[{ c: 0, r: 0, cw: 2, kind: 'photo', src: 'img/...', from: 'left' }, ...]} />
```
- Numbers: 70 % of the travel done on the first frame (less for late tiles), the rest in 12 f expo-out; delays 0-7 f;
  radius 20 % of a tile's height; gutter 1.4 % of the frame width.
- Caution: put the cut on its first frame; real pictures; one or two solid tiles.

### SendLaunch
The send button is pressed and lifts away up and to the right while the composer falls out of the bottom of the frame;
on the cut a small spark of square pixels glows low on a dark ground and leads the next window in from the lower right.
```tsx
<SendLaunch L={lookDark('#E8E8EA', '#0F0F10')} at={T.send} prompt="Build a booking app for a climbing gym" window={<AppPane ... />} winW={1190} winH={756} />
```
- Numbers: press 3 f; the button rises 0.27 of the frame over 8 f (ease-in); the composer falls from +2 f over 6 f with
  a 20 px smear; the cut at +8 f; the spark's light fades in 9 f, its squares fall out by +20 f; the window enters at
  +11 f, 70 % in by +17 f, settled at +24 f, a 30 px horizontal smear clearing.
- Caution: the window is the answer to the prompt, in the same product chrome.

### BackdropSwap
A phone holds its place at the centre while the pictures behind it hard-cut every five frames; the phone shifts a few
pixels and a degree with each (so both sides of every cut move), and its shadow falls on every one.
```tsx
<BackdropSwap at={T.world} every={5} backdrops={[{ src: 'img/...' }, { color: '#1E4E8C' }, ...]}><Wallet /></BackdropSwap>
```
- Numbers: exactly `every` frames each; at most 0.4 % of the frame, 1.5 degrees and 2 % of scale per backdrop.
- Caution: backdrops that share a colour with the screen; at most eight.

### FloodAway
The cards round a line flood one by one with a saturated colour, keeping their shape and corners, then blow away
outward at once, the outer ones first, turning edge-on as they go. It clears the frame and leaves the line.
```tsx
<FloodAway cards={[{ node: <Notice ... style={{ width: '100%', height: '100%' }} />, x: 0.17, y: 0.2, w: 0.29, h: 0.13, rot: -3 }, ...]} at={T.clear} color="#2F45D0" radius={31.5 / 140} />
```
- Numbers: a card floods in 3 f (its own corners, a lit top edge, no defocus), 1-3 f apart; from `blowAt` (6 f) outer
  cards first, 1 f apart, never before a card has flooded, 12 f quadratic ease-in (moving from the first frame), 0.28
  of the frame width outward, turning 80 degrees, a motion blur of at most 4 px; no card holds flooded more than 8 f.
- Caution: the cards must already be there; the line stays sharp; each node fills its w x h box and `radius` matches
  its corner, or the flood will not cover the card exactly.

## In the reel

Every piece's frames in the reel (`--film library-ui`), and the one command that shows just that piece: its frames in
one still (run it in a film project; `render --film library-ui --range a-b` for the piece in motion).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Reel | Frames | Strip of just this piece |
|---|---|---|---|
| NoticePile | `library-ui` | 0-169 | `node scripts/frames.mjs library --strip NoticePile` |
| CardFan | `library-ui` | 170-281 | `node scripts/frames.mjs library --strip CardFan` |
| BannerPop | `library-ui` | 282-365 | `node scripts/frames.mjs library --strip BannerPop` |
| RowExpand | `library-ui` | 366-521 | `node scripts/frames.mjs library --strip RowExpand` |
| PickList | `library-ui` | 522-633 | `node scripts/frames.mjs library --strip PickList` |
| BoardDrag | `library-ui` | 634-765 | `node scripts/frames.mjs library --strip BoardDrag` |
| StepList | `library-ui` | 766-855 | `node scripts/frames.mjs library --strip StepList` |
| TaskRun | `library-ui` | 856-955 | `node scripts/frames.mjs library --strip TaskRun` |
| ActionMorph | `library-ui` | 956-1105 | `node scripts/frames.mjs library --strip ActionMorph` |
| Pointer (in ActionMorph) | `library-ui` | 994-1062 | `node scripts/frames.mjs library --strip Pointer` |
| PromptAnswer | `library-ui` | 1106-1295 | `node scripts/frames.mjs library --strip PromptAnswer` |
| ChatThread | `library-ui` | 1296-1495 | `node scripts/frames.mjs library --strip ChatThread` |
| SettingsCard | `library-ui` | 1496-1645 | `node scripts/frames.mjs library --strip SettingsCard` |
| ToggleSwitch (in SettingsCard) | `library-ui` | 1530-1560 | `node scripts/frames.mjs library --strip ToggleSwitch` |
| ValueSlider (in SettingsCard) | `library-ui` | 1590-1630 | `node scripts/frames.mjs library --strip ValueSlider` |
| CalendarWave | `library-ui` | 1646-1745 | `node scripts/frames.mjs library --strip CalendarWave` |
| PhoneDrop | `library-ui` | 1746-1895 | `node scripts/frames.mjs library --strip PhoneDrop` |
| SelectFrame | `library-ui` | 1896-1955 | `node scripts/frames.mjs library --strip SelectFrame` |
| HubPill | `library-ui` | 1956-2045 | `node scripts/frames.mjs library --strip HubPill` |
| GhostFill | `library-ui` | 2046-2135 | `node scripts/frames.mjs library --strip GhostFill` |
| FeedRush | `library-ui` | 2136-2265 | `node scripts/frames.mjs library --strip FeedRush` |
| StatCount | `library-ui` | 2266-2345 | `node scripts/frames.mjs library --strip StatCount` |
| HandleGather | `library-ui` | 2346-2395 | `node scripts/frames.mjs library --strip HandleGather` |
| DotCaret | `library-ui` | 2396-2485 | `node scripts/frames.mjs library --strip DotCaret` |
| ChipRoll | `library-ui` | 2486-2555 | `node scripts/frames.mjs library --strip ChipRoll` |
| LinkPanel | `library-ui` | 2556-2655 | `node scripts/frames.mjs library --strip LinkPanel` |
| BentoFly | `library-ui` | 2656-2695 | `node scripts/frames.mjs library --strip BentoFly` |
| SendLaunch | `library-ui` | 2696-2755 | `node scripts/frames.mjs library --strip SendLaunch` |
| FileDrop | `library-ui` | 2756-2825 | `node scripts/frames.mjs library --strip FileDrop` |
| Cursor3D | `library-ui` | 2826-2895 | `node scripts/frames.mjs library --strip Cursor3D` |
| BackdropSwap | `library-ui` | 2896-2945 | `node scripts/frames.mjs library --strip BackdropSwap` |
| FloodAway | `library-ui` | 2946-3005 | `node scripts/frames.mjs library --strip FloodAway` |
| StickyType | `library-ui` | 3006-3050 | `node scripts/frames.mjs library --strip StickyType` |
| RowCool | `library-ui` | 3051-3135 | `node scripts/frames.mjs library --strip RowCool` |
| SkeletonSweep | `library-ui` | 3136-3185 | `node scripts/frames.mjs library --strip SkeletonSweep` |

<!-- /library:reel -->
