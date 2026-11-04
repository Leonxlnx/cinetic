# UI choreography

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

How product surfaces arrive, stack, unfold, scroll and step aside, so the product reads as a working thing doing its job.

[List scrolls through a focus band](#list-scrolls-through-a-focus-band) · [Resize: small creep, one big jump, long settle](#resize-small-creep-one-big-jump-long-settle) · [Exploded view: panels push out, spin, collapse](#exploded-view-panels-push-out-spin-collapse) · [Bento layout unfolds on one shared curve](#bento-layout-unfolds-on-one-shared-curve) · [Cards fly in radially on one ease](#cards-fly-in-radially-on-one-ease) · [Avatar bubbles swoop, orbit and split](#avatar-bubbles-swoop-orbit-and-split) · [Panels shrink away and seeds build the logo](#panels-shrink-away-and-seeds-build-the-logo) · [New item pushes in, older items step back](#new-item-pushes-in-older-items-step-back) · [Panel arrives front-loaded, focus lagging](#panel-arrives-front-loaded-focus-lagging) · [Card lands by shrinking to size](#card-lands-by-shrinking-to-size) · [Cards fan out from behind into a stack](#cards-fan-out-from-behind-into-a-stack) · [Grid assembles cell by cell](#grid-assembles-cell-by-cell) · [Chat bubbles cut on and slide up](#chat-bubbles-cut-on-and-slide-up) · [Chosen item enlarges while the rest dissolve](#chosen-item-enlarges-while-the-rest-dissolve) · [Flick scroll: ramp, peak, friction](#flick-scroll-ramp-peak-friction) · [Inner UI pops in, left to right or top to bottom](#inner-ui-pops-in-left-to-right-or-top-to-bottom) · [Phone demo: pull back, tilt while scrolling, press, popup](#phone-demo-pull-back-tilt-while-scrolling-press-popup) · [Carousel: fast in, near stop, fast out](#carousel-fast-in-near-stop-fast-out) · [Thumbnails stay alive inside the cards](#thumbnails-stay-alive-inside-the-cards) · [Tile slides out to clear a slot for the next actor](#tile-slides-out-to-clear-a-slot-for-the-next-actor) · [UI rises in, holds, launches out](#ui-rises-in-holds-launches-out) · [Card scales in, creeps, then pushes into the cut](#card-scales-in-creeps-then-pushes-into-the-cut) · [Code types in plain ink; syntax colours arrive a few frames later](#code-types-in-plain-ink-syntax-colours-arrive-a-few-frames-later) · [Bubbles spring-pop from their tail corner](#bubbles-spring-pop-from-their-tail-corner) · [Card or model turns 180 deg with the edge-on frame on the beat](#card-or-model-turns-180-deg-with-the-edge-on-frame-on-the-beat) · [Chips fall like objects and float back](#chips-fall-like-objects-and-float-back) · [Code streams in line by line](#code-streams-in-line-by-line) · [Button flies in carrying the pointer](#button-flies-in-carrying-the-pointer) · [Context menu springs up over a blurred page](#context-menu-springs-up-over-a-blurred-page) · [Tilted page sweeps up, develops colour, is scrolled](#tilted-page-sweeps-up-develops-colour-is-scrolled) · [Calm hold marked only by small label pops](#calm-hold-marked-only-by-small-label-pops) · [Device hinges open and its world pops around it](#device-hinges-open-and-its-world-pops-around-it) · [Twin controls split apart from the centre](#twin-controls-split-apart-from-the-centre)

### List scrolls through a focus band

`dv-focus-band-list` · signature · energy medium · launch, feature · primitive: FocusBand

A tall list of names scrolls up with an in-out speed profile; the 2-3 items inside a fixed central band are in the accent, the rest grey, and each item switches as it crosses the band. **When:** Currencies, languages, integrations: "all of these". **Avoid:** Lists with long items.

- **Anatomy:** Static band at the frame centre; items coloured by their position; bold display type about 70 px cap.
- **Timing:** 100 f in-out.
- **Sound:** None, or ticks as items cross.
- **Build:** `<FocusBand n rowH start from to band={{ y, h }} render={(i, accent) => row}>` (fx/Reels): the list scrolls on E.stdInOut (100 f); the rows inside the band are drawn from an accent copy clipped to the band, so each switches exactly as it crosses.

### Resize: small creep, one big jump, long settle

`dv-resize-creep-jump` · signature · energy high · launch, feature · primitive: ResizeBox

A card or field is resized the way a tool resizes it: a short anticipation creep, one big jump frame (50-70 % of the change) with stretched echo handles, then a long settle; an emptied field stretches with a slow-in, a 3-frame lunge and a long tail while the caret glides. **When:** Editing, resizing, aspect changes, expanding a field. **Avoid:** Smooth tweens for a tool action.

- **Anatomy:** Creep under 20 % over 4-6 f; jump 1 f; settle 8-10 f; handles stretch toward the new edge on the jump frame and snap back.
- **Timing:** 43-90 f; field lunge peak 66 px/f.
- **Sound:** The jump on a snare (+5 ms); a kick on the lunge.
- **Build:** `<ResizeBox at from to handle line radius>{content}</ResizeBox>` (fx/Resize): creep 15 % over 12 f (E.softIn), ONE jump frame of 60 % with the corner handles stretched back as echo bars, then an exponential settle (24 f); `jumpFrames={3}` is the field version (a three-frame lunge).

### Exploded view: panels push out, spin, collapse

`dv-exploded-view` · signature · energy medium · launch, sting · primitive: no primitive yet (recipe below)

A face panel lifts off a 3D object and floats, the inner panels push outward into an exploded cube inside a larger box, the camera spins slowly in isometric, then everything collapses back. **When:** Explaining an architecture, layers or what is inside. **Avoid:** Flat 2D products.

- **Anatomy:** Panels offset along their normals; isometric camera spin on a sine-out; collapse on an ease-in.
- **Timing:** Explode 78 f, spin 98 f, collapse 35 f.
- **Sound:** None needed.
- **Build:** Recipe: CSS 3D faces (preserve-3d) offset along normals by one progress value; spin as the container's rotateY.

### Bento layout unfolds on one shared curve

`dv-bento-unfold` · signature · energy medium · launch, feature · primitive: Cards

On a cut, compact tiles fly to their grid slots together and morph (a circle stretching into a wide photo tile) on one shared expo-out; a folder tile can widen into a full panel while thumbnails shoot up and spread; a strip of tiles bursts open to 84 % of the frame. **When:** The overview of a product; many features at once. **Avoid:** Each tile on its own curve (it reads as chaos).

- **Anatomy:** One curve with small per-tile delays; 80 % of the remaining distance kept each frame (90 % in 11 f); gaps open with the tiles; content holds its place while the boxes reveal it.
- **Timing:** 40-64 f; delays 0-18 f; a slow 14 f pre-widen before the burst.
- **Sound:** A camera-shutter click; swells on the bursts.
- **Build:** `<Bento>` / bento(f, A, B, { dur: 44, decay: 0.8, delays }).

### Cards fly in radially on one ease

`dv-radial-card-swarm` · signature · energy medium · launch, feature · primitive: Cards

Seven small tilted UI cards (lists, notes, charts, messages) fly in radially from off-screen on one shared exponential ease and settle around the centre, their rotation tails running long. **When:** Showing many parts of a product at once around a statement. **Avoid:** Cards with readable detail (they are too small to read).

- **Anatomy:** Shared curve, per-card direction and tilt; rotation settles last.
- **Timing:** Each visible 28-48 f; rotation tail 120 f.
- **Sound:** Voice.
- **Build:** Cards cardArrive per card on one curve with radial from vectors and rot 8-35 deg.

### Avatar bubbles swoop, orbit and split

`dv-avatar-bubble-choreo` · signature · energy medium · launch, feature · primitive: recipe (plain layers)

Round avatar bubbles behave like characters: one swoops in on an arc from an impact point and drifts; two orbit around their midpoint and swap sides while one splits into a group; a smaller bubble is ejected from a group bubble on an arc and grows. **When:** Collaboration and people features. **Avoid:** More than three bubbles.

- **Anatomy:** Arc paths (peak 137 px/f), orbit 154 deg (peak 13.4 deg/f), growth +30 % mid-swap, ejection r 87 -> 164 px in 8 f.
- **Timing:** Swoop 75-85 f; orbit 90 f; ejection 20 f.
- **Sound:** A UI pop on arrival; voice.
- **Build:** Recipe: polar paths in closed form (angle on an ease, radius on its own curve); the split is a MorphChain swap at mid-orbit.
- **Materials and numbers:** A bubble first appears as an empty glass ring (rim 4-6 px, a gradient from the tint to white, an inner radial gradient from a white centre to the tint at the edge, a specular dot low right), then its glyph rises from the lower edge into place clipped by the ring (8-10 f, expo-out); the next bubble repeats it 18 f later.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Panels shrink away and seeds build the logo

`dv-panels-to-logo` · signature · energy medium · launch · primitive: Wordmark

Large blank panels shrink into one corner while coloured seed squares scatter and fly to build the logo in the opposite corner, and the words land in the accent: "one place". **When:** Consolidation claims; the move from product to brand. **Avoid:** Logos without separable parts.

- **Anatomy:** Panels shrink to the corner; seeds fly on arcs; words 2 f apart.
- **Timing:** 34 f; glyphs 1-2 f.
- **Sound:** A ding.
- **Build:** Cards demote toward a corner + Wordmark assemble with parts starting from the panels' centres.

### New item pushes in, older items step back

`dv-stack-push-demote` · workhorse · energy medium · any · primitive: Cards

A new toast or card takes the top slot and the older ones step down, shrink and blur in depth; new rows push a list up with a snap scroll (75 % in the first frame); a queue keeps three and fades the oldest; new pills enter tilted and demote the older ones. **When:** Notifications, payments, steps of an agent, feature pills. **Avoid:** Older items that stay at full strength.

- **Anatomy:** Per entry 22 f; older items scale 0.82-0.9 and blur one level; stagger 8-16 f (shortening 18 -> 10 f in a run); the stack can accelerate up into the next shot.
- **Timing:** Entries 22 f; snap scroll 10-22 f; cards on kicks 26, 15, 18 f apart.
- **Sound:** A bell, then dings per toast; kicks within 40 ms.
- **Build:** Cards cardArrive + demote (at = the newcomer's first frame).

### Panel arrives front-loaded, focus lagging

`dv-panel-rise-front-loaded` · workhorse · energy calm · any · primitive: Cards

A panel, window, page or composer slides up (or in from a side, or on a diagonal) with its biggest step on the first frame (31-49 % of the travel in the first 10 % of the time) and a long exponential tail that never quite stops; its focus can resolve 17 f after its position, and a tilted 3D plane flattens as it lands. **When:** The product's first appearance; any panel, sheet or card entering. **Avoid:** S-curves into place, fades from nothing, scale from zero.

- **Anatomy:** Travel 168-757 px (up to 70 % of the frame height) with 81-176 px/f on frame one; optional lean that flattens behind the move, optional entry defocus (37 px clearing over 48 f), optional glowing leading edge with corner handles; a caption can shift one frame ahead of the panel; a supporting card rises 2 f after the first letter of the title.
- **Timing:** 14-94 f to 90 % (house 34 f E.snapOut); blur 48 f; lean 6 f behind; residual drift 15 f.
- **Sound:** A whoosh or swish on frame 1; a sub-bass under a big panel; a riser for a page.
- **Build:** Cards enterState({ dur: 34, from: 240, lean: 10, defocus }).

### Card lands by shrinking to size

`dv-oversize-card-settle` · workhorse · energy medium · any · primitive: Oversize

A notification, a widget or a hero card appears a little large (1.07-1.22x) and settles down to size while it sharpens; dashboard widgets can cut on every 4 f at 107 % and settle in 5 f; a full-frame photo can shrink 20 % into a card. **When:** Notifications, dashboards, cards that land on a beat. **Avoid:** Overshooting below size.

- **Anatomy:** Scale-down landing, defocus clearing; per-widget cut-ons on a fixed cadence.
- **Timing:** 10-38 f expo-out (47 % in 10 %); widgets 8 f apart, 10 f settle.
- **Sound:** A whoosh tail; cork-like pops on the photo shrink.
- **Build:** `<Oversize from={1.12} dur={16}>` or Words oversize on UI; widgets with starts every 8 f.
- **Materials and numbers:** The result card's paragraph fades out line by line toward its end, as if still streaming (a vertical mask from opaque at 45 % to transparent), and a thin two-hue gradient rule echoing the ground separates it from the footer chips.
- **Conditions:** gradients baked as dithered plates and moved by transform.

### Cards fan out from behind into a stack

`dv-card-fan-stack` · workhorse · energy medium · launch, feature · primitive: Cards

Copies of a card slide out from behind the front card 2 f apart into a tilted stack or a cover-flow fan; sibling cards enter from opposite sides with faint ghost trails; the stack collapses back behind the front card on exit. **When:** Plans, sources, payments, posters: several of one kind. **Avoid:** More than about five cards.

- **Anatomy:** Followers 2 f apart, spreading on an ease-in to 42 px/f then a settle push x1.08; hero card lifts x1.25 while the fan spreads; tilt 2-8 deg; collapse on an ease-in.
- **Timing:** Spread 20 f; settle 16 f; siblings 40 f apart; collapse 22 f.
- **Sound:** A pop on the spread; a whoosh series on the collapse.
- **Build:** Cards cardArrive per copy with delays 4 f and demote for the front card's lift.
- **Materials and numbers:** Before the back cards fan out, 1-3 hairline card edges appear one by one at the side of the single front card (one more every 4 f, a 1 px rim at 18 % white), so the viewer senses the stack before it opens.

### Grid assembles cell by cell

`dv-grid-assemble` · workhorse · energy medium · any · primitive: Cards

Outlined cards with logos slide into a grid with irregular stagger (one card snapping 880 px in a single frame); grid cells fill with blank tiles, then their text lines and progress bars fill in; rows of squares are born below and the block re-centres every frame. **When:** Integrations, sponsors, a dashboard filling up. **Avoid:** Perfectly even stagger.

- **Anatomy:** Stagger 1-8 f; slides 24 f; one-frame snap; blank card 3-4 f then content 4-8 f; squares grow 33 -> 82 px.
- **Timing:** 28-74 f; rows every 2 f.
- **Sound:** Bubble pops; a pop per row.
- **Build:** Cards enterState per cell with seeded delays; HardStep for the snapping card.

### Chat bubbles cut on and slide up

`dv-chat-bubble-slide` · workhorse · energy calm · any · primitive: Bubbles

Each bubble or posted message appears at full size and opacity 31-70 px below its slot and slides up on an exponential; earlier messages ride up; a thread cascades with a short vertical blur. **When:** Any chat, thread or comment UI. **Avoid:** Bubbles that scale or fade in.

- **Anatomy:** Cut-on, slide tau 10-16 f; replies 20-33 f apart; the view can settle up 67 px.
- **Timing:** Home in 28-50 f; bubbles 33 f apart.
- **Sound:** A pop on each bubble (+10 ms, +14 dB).
- **Build:** `<Bubbles>` (tau 12, travel 56, lift).

### Chosen item enlarges while the rest dissolve

`dv-choose-one-dissolve` · workhorse · energy medium · any · primitive: Cards

From a menu or a row of cards, the camera zooms into the chosen one (or it scales up 0.78 -> 1.0) while the others blur and fade into the background. **When:** Selecting a product, a plan, a result. **Avoid:** Keeping the others sharp.

- **Anatomy:** Chosen: expo-out scale or zoom; others: blur and fade over 14-16 f.
- **Timing:** Zoom 32-40 f; others 14-16 f.
- **Sound:** A kick or a beat on the choice.
- **Build:** SnapZoom or Cards enterState on the chosen item; RackFocus levels on the rest.

### Flick scroll: ramp, peak, friction

`dv-flick-scroll` · workhorse · energy high · any · primitive: Scroll

Content accelerates by a constant ratio a frame into a peak, brakes on friction and lands; an exit whip can hand straight into the scroll; a column of cards decays from 68 px/f to a 2 px/f drift; the input bar decelerates into place as the conversation stops. **When:** Feeds, lists, long conversations. **Avoid:** Even-speed scrolling.

- **Anatomy:** Ramp x1.05-1.1 a frame to 176 px/f, friction x0.955 a frame (or x0.77 -> 0.85), brake time constant 0.73 s.
- **Timing:** Exit 20 f; scroll 70-250 f.
- **Sound:** A sub-bass drop on the peak speed; a stab on the landing.
- **Build:** flickState({ ramp, peak, brake, distance }); declares the fast frames as a camera-blur range.

### Inner UI pops in, left to right or top to bottom

`dv-inner-ui-cascade` · workhorse · energy calm · any · primitive: Cards

Inside a panel that has landed, chips, cards, a stat ring and buttons pop in with a 2 f stagger; agent log rows fade in one by one while the list scrolls; or the card stays and its content changes (the title retypes, the subtitle soft-reveals, the footer blurs away). **When:** Filling a panel after it lands. **Avoid:** Filling before the panel has settled.

- **Anatomy:** Stagger 2-5 f, short fades; a retype at 5-6 chars/f.
- **Timing:** 24 f for a panel; rows 6-10 f apart.
- **Sound:** UI ticks.
- **Build:** Cards / kit parts with starts every 4 f; TypeOn for the retype; Wipe gradient for the soft reveal.
- **Materials and numbers:** Window chrome fills in item by item after the window lands: icon, then its label 6 f later (fade 4-6 f), header label 8 f after the landing, a chevron dropping 14 px in 6 f, a menu icon 10 f later; a footer row of icons pops in three stages over 8 f.

### Phone demo: pull back, tilt while scrolling, press, popup

`dv-phone-tilt-scroll-demo` · workhorse · energy medium · feature, walkthrough · primitive: Cards

Close on the app header, pull back; the phone tilts away in 3D while its content scrolls with in-out gestures; a cursor clicks, a floating button presses, a popup grows from its anchor. **When:** Mobile app walkthroughs. **Avoid:** Straight-on flat phones for the whole demo.

- **Anatomy:** Pull 26 f; scroll 70 f; press 6-8 f; popup 16 f from the anchor.
- **Timing:** About 190 f.
- **Sound:** UI clicks.
- **Build:** camera pull + Cards lean + Scroll + press + springBox from the anchor.

### Carousel: fast in, near stop, fast out

`dv-carousel-pass` · workhorse · energy medium · any · primitive: Scroll

A row of cards slides through: fast on entry, decaying almost to zero for the read, then accelerating before the cut, with soft faded edges; status chips can swap spinner to done left to right as it passes; or the row moves in discrete pushes as each new card lands. **When:** Examples, creators, thumbnails, results. **Avoid:** Constant speed.

- **Anatomy:** Entry 81 px/f decaying to a 7.3 px/f cruise, exit to 31 px/f; discrete variant: pushes of 40-200 px per frame every 2-4 f.
- **Timing:** 100-160 f; chip swaps 35 f apart.
- **Sound:** A whoosh on the exit.
- **Build:** A camera x with E.snapOut entry and E.launchIn exit; edgeMask for the faded edges; HardStep pushes for the discrete variant.

### Thumbnails stay alive inside the cards

`dv-live-thumbnails` · workhorse · energy calm · any · primitive: recipe (plain layers)

Cards contain playing motion pieces: logo marks swap colour, words morph, images move, so a board of cards is never a still screenshot. **When:** Boards, galleries, dashboards with media. **Avoid:** Every thumbnail moving at once at full speed.

- **Anatomy:** Per card a tiny loop with its own period.
- **Timing:** Continuous; letter swaps 14 f.
- **Sound:** None.
- **Build:** Recipe: each card renders a small composition in `<Loop>` with awkward periods.

### Tile slides out to clear a slot for the next actor

`dv-clear-the-slot` · workhorse · energy medium · any · primitive: Cards

A tile slides out on an in-out curve leaving a stub, and the next actor (a cursor, a tile) enters the vacated space 2 f before it settles; a secondary tile shift overlaps the previous move by 11 f. **When:** Making space inside a bento or layout for a demo action. **Avoid:** Moves that end before the next one starts (overlap them).

- **Anatomy:** Quart in-out, peak 91-117 px/f, no blur; overlap 11 f.
- **Timing:** 30-34 f.
- **Sound:** None.
- **Build:** Cards enterState out on E.strongInOut; the next actor starting 4 f before the end.

### UI rises in, holds, launches out

`dv-rise-hold-launch` · workhorse · energy medium · any · primitive: Cards

Each UI piece (input box, share sheet, composer, search field) rises 40-260 px into place, holds briefly, then accelerates up and out with a smear; a search field can whip in while the camera pulls back, type, and drift up. **When:** A rapid sequence of UI moments. **Avoid:** Fading out.

- **Anatomy:** Rise expo-out, hold, ease-in exit with vertical smear; pull-back x0.65 quint-out.
- **Timing:** Rise 22-32 f; exit 24-32 f; typing 38 f.
- **Sound:** Whooshes on the exits; keypress ticks.
- **Build:** Cards enterState + an exit on E.launchIn with a 2-frame vertical ghost.

### Card scales in, creeps, then pushes into the cut

`dv-card-scale-in-creep-push` · workhorse · energy medium · any · primitive: Cards

A card or dialog grows from 70-90 % (often blurred or smeared on its first frame) to full size with 90 % of the change in about 8 f, keeps a slow creep, then accelerates into the cut; a dock can expand out of a split line. **When:** Hero cards, export dialogs, posts, chat windows. **Avoid:** Growing from zero.

- **Anatomy:** Scale 0.7-0.89 -> 1 expo-out, a 0.05 %/f creep or 1.8 px/f growth, quad-in push into the cut; optional relax of 0.8 % after the overshoot-free landing; content swaps 1 f.
- **Timing:** In 12-65 f; creep for the hold; push 32 f.
- **Sound:** The cut on frame 1; none on the push.
- **Build:** Cards enterState with scale from 0.85 + creep + scaleBreath into the cut.

### Code types in plain ink; syntax colours arrive a few frames later

`dv-late-syntax-colour` · accent · energy calm · feature, update · primitive: TypeFx (CodeType)

A code snippet types line by line in plain dark monospace; a few frames after each token is complete its syntax colour switches on (placeholders and string values flip from ink to the accent), as if the editor were catching up. **When:** SDK, API and developer products; any code card. **Avoid:** Fast walls of code, where the delay cannot be read.

- **Anatomy:** Mono about 14 px at 1080p, line height 1.6; the colour about 10 f after the token completes; the accent only on placeholders and strings.
- **Timing:** About 55 f of typing for a short snippet; recolours staggered with the tokens.
- **Sound:** Key ticks under the VO.
- **Build:** `<CodeType tokens={[{ text, kind, br }]} at cps late60={10} palette>` (fx/TypeFx): code types in plain ink; each token whose kind is listed switches to its colour 10 f after its last character, so the editor seems to catch up; codeSchedule() gives every onset, completion and colour frame and declares() lists the typing as a stepped run.

### Bubbles spring-pop from their tail corner

`dv-tail-anchored-bubble-pop` · accent · energy medium · launch, feature · primitive: Cards

Speech bubbles pop around a subject in a photo, each scaling up from its tail corner with a small spring, on the voice's cadence. **When:** Questions or messages around a person in footage. **Avoid:** Spending the spring elsewhere in the same film.

- **Anatomy:** Scale from the tail anchor; spring zeta 0.62; irregular gaps from the voice.
- **Timing:** Rise 12-14 f, settle 40 f; gaps 6-26 f.
- **Sound:** Chat pops.
- **Build:** springBox per bubble with transformOrigin at the tail.
- **Materials and numbers:** Each bubble starts as a short white dash (20 x 3 px) exactly at its tail corner for 2 f, then a tiny squashed bubble springs out from the tail (spring about 8 f, damping 12) and settles in 6 f.

### Card or model turns 180 deg with the edge-on frame on the beat

`dv-object-flip-turn` · accent · energy medium · launch, feature · primitive: Flip3D

A card rotates about its axis in perspective (long ease-in, quicker ease-out) and goes edge-on exactly on the downbeat, swapping its face there; a 3D model inside a card turns from front to side to back. **When:** Revealing the other side; turning a product. **Avoid:** Flips with readable text on both sides at once.

- **Anatomy:** Peak 8.4 deg/f at 58 %; face swap on the edge-on frame.
- **Timing:** 65 f; model turn 28 f.
- **Sound:** The edge-on frame on the downbeat (-37 ms).
- **Build:** `<Flip3D at={flipAt(beat, {})} x y w h front back>` (fx/Flip): a 180 deg turn on E.whipBuild (65 f, peak speed near 58 %) whose edge-on frame lands on the beat and swaps the faces there (declared a morph seam).

### Chips fall like objects and float back

`dv-chip-physics` · accent · energy medium · launch, feature · primitive: Flight

When the line says "disconnected", the chips around it fall like objects (accelerating), land in a cluster at the bottom and straighten as they land, then drift back up; after popping, chips can float upward on a very long tail. **When:** Showing disorder or separation with UI chips. **Avoid:** Bounces (land, do not bounce).

- **Anatomy:** Fall 7 -> 67 px/f, rotation flattening on landing, drift back -5 px/f; float 220 px on a long expo-out still moving 3 px/f at the end.
- **Timing:** Fall 24 f; float 68 f (t90 1.13 s).
- **Sound:** Camera-shutter clicks and bubble pops.
- **Build:** gravityDrop(f, { at, fall, rot, drift }) (fx/Flight): the fall on E.buildIn (24 f), the rotation flattening over the last 30 %, then a slow drift back up (2.5 px/f at 60).

### Code streams in line by line

`dv-code-stream-lines` · accent · energy medium · launch, feature · primitive: TypeOn

Code lines appear in a panel about one line every 2 frames, stepped, carrying the only saturated colours in the frame (syntax colours), and keep streaming under a zoom-out. **When:** Developer products; "it writes the code". **Avoid:** Readable fake code (keep it plausible, real-looking).

- **Anatomy:** One line per 2 f; syntax colours as the only saturation.
- **Timing:** 46 f.
- **Sound:** None distinct.
- **Build:** TypeOn kind="stream" with a line-quantised count.

### Button flies in carrying the pointer

`dv-cta-flies-in-pointer` · accent · energy medium · launch, feature · primitive: Cursor

A call-to-action button enters bottom-right tilted and small, travels on a curved path carrying the pointer with it, and takes a word's slot in the line. **When:** Ending a demo on the action. **Avoid:** Pointer and button on separate paths.

- **Anatomy:** Start -7 deg at 80 % size; x peak 147 px/f before y peak 32 px/f (curved path).
- **Timing:** 36 f.
- **Sound:** A pop and whoosh.
- **Build:** cursorMove on a bowed path with the button attached to the cursor's transform.

### Context menu springs up over a blurred page

`dv-menu-over-blurred-page` · accent · energy medium · launch, feature · primitive: Cards

On a right-click the board blurs out completely in 6 f and dims about 11 %, and a dark rounded menu springs up softly; the hover moves down its rows. **When:** Right-click and long-press actions. **Avoid:** Menus without the background reacting.

- **Anatomy:** Background blur expo-out; menu soft spring; hover 12 f per row.
- **Timing:** Blur 12 f; menu 46 f; hover 12 f.
- **Sound:** A pop.
- **Build:** RackFocus levels on the page + springBox for the menu.

### Tilted page sweeps up, develops colour, is scrolled

`dv-develop-sweep-page` · accent · energy medium · launch, feature · primitive: Develop

A white product page tilted in perspective sweeps up from the bottom in a few frames, its illustration develops from ghost grey through a tint to full colour, and the camera scrolls it in three moves. **When:** A product page or a landing page shown as an object. **Avoid:** Flat, untilted pages (they read as screenshots).

- **Anatomy:** Sweep 12 f; develop grey -> tint -> colour; three scroll moves.
- **Timing:** 256 f in all.
- **Sound:** A spoken word, then a punchy hit.
- **Build:** Cards enterState (lean 20) + Develop + reframeChain.

### Calm hold marked only by small label pops

`dv-quiet-hold-label-pops` · accent · energy calm · any · primitive: Words

A grid holds almost still for several seconds and the only events are three small labels popping next to tiles about a second apart: rest that still has a pulse. **When:** After a busy run; to let a layout be read. **Avoid:** Holds longer than about 6 s.

- **Anatomy:** Camera creep only (0.98-1.0); label pops 1 s apart.
- **Timing:** 344 f hold; pops 50-70 f apart.
- **Sound:** A bubble pop and a click on the pops; a low hit.
- **Build:** living hold + Words pop for labels.

### Device hinges open and its world pops around it

`dv-device-hinge-open` · accent · energy medium · launch, feature · primitive: Flip3D hinge

A thin slab hinges open into a laptop (screen growing 44 -> 466 px with a slight yaw), then an envelope rises from behind the screen and a notification dot and a chat pill pop around it. **When:** Introducing a device or an app in context. **Avoid:** Too many satellites.

- **Anatomy:** Hinge rotateX quad-out; satellites pop 6, 4, 6 f in sequence.
- **Timing:** Hinge 22 f; satellites 10-15 f each.
- **Sound:** A bubble pop on the envelope.
- **Build:** `<Flip3D kind="hinge" at x y w h front>` (fx/Flip): the screen turns -90 -> 0 deg about its bottom edge on E.snapOut (22 f); the satellites pop with Cards or MicroUI after it.
- **Materials and numbers:** The dark screen picks up a soft diagonal reflection (white at about 45 % with a cool tint, band at about 60 deg) that grows and slides across as the device yaws toward the camera, strongest mid-turn, fading as the camera pushes in.

### Twin controls split apart from the centre

`dv-split-from-centre` · accent · energy calm · launch, feature · primitive: Cards

Two buttons that start overlapped at the centre slide apart to their places (one left, one right), then both drift outward slowly. **When:** A composer's buttons appearing. **Avoid:** Asymmetric timing.

- **Anatomy:** Symmetric in-out, peak 12.3 px/f at 43 %, then an outward ease-in drift.
- **Timing:** 48 f; drift 14 f.
- **Sound:** UI pops.
- **Build:** Two Cards with mirrored x on E.strongInOut.
