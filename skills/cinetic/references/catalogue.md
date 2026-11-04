# Catalogue: what a film is made of, one pick per slot

A film is one world, three or more dealt hero shots (§0b), two or three dealt creative elements (§0), one text voice,
two or three moves, two or three seam kinds, one end-card design and one signature, picked from the menus below for what
the line says and what the product does. Pick them in the plan step
(before any act is built), write the ids into `film.json` `devices`, and run `node scripts/film-diff.mjs`: the ground,
the voice, the signature and the end card differ from each of the last three films, and the move set (voice,
signature, logo design, moves, seam kinds) shares at most 25 % with each of them. `film.json` `recent` lists what the
last films used. Never take a whole shot order from anywhere: the menus are parts, the film is yours.

Numbers are at 60 fps and 1080p (f@60, px@1080); `fx/Seam` and the starter's primitives convert them to the film's
frame rate and size.

**The motion library** ([motion-library/README.md](motion-library/README.md)) is the long list behind these menus: 269
techniques in eight files (effects, animations, items, transitions, backgrounds, camera and type, content and pacing, sound),
each with its job, its numbers, named presets, what reads rich and what reads cheap, and Remotion code that compiles as
written. Reach for it when a beat needs a device these menus do not name, when you vary a dealt device (pick another preset
of its entry), and for the numbers of any move you build by hand. Its README's "Finding an entry by need" table is the way
in. The signature moves are starter parts at the library's numbers: `lib/moves.ts` and `fx/Moves.tsx` (a centred word build
with a snap re-centre and accent drain, the doubling whip with a matched entry, a landing in motion, a fly-in from the lens,
the press, the hold tail that keeps every hold moving one way, and light that marks an event); `src/gallery` shows them. The camera moves only with a purpose (a move that starts, travels and lands; a hold may be still),
nothing idles up and down, cards face the camera.

## 0. Creative elements (two or three a film, dealt)

A film is never "a line, then a card". Every film plays two or three creative elements: finished devices in the
starter's `src/fx/creative`, each a whole beat (a line or a picture) with the product's own scene inside it.
`deck.py` deals them at random from the whole library, seeded by the film's name, the direction you picked and the
film history, leaning toward the devices that tell that direction's story (a problem-turn: split-compare, bubble-swarm;
one-to-many: zoom-wall, logo-orbit) and the brief's own words (a tap: cursor-follow, dot-button), and weighted away
from what the last films played (a run of films walks the whole library instead of circling a favourite few); a device
gets only what the film can feed it (photo-arc five photos or more, logo-orbit the real marks, data-sculpture a figure):
never the set of a recent film, at least one device no recent film played, nothing shared with the last one while a
draw can avoid it, at least one that draws a line and one that draws a picture, never two of one family (`src/dealt.ts` `creative`; the sheet's last section; `deck.py
--creative` deals them alone). launch-simple maps them onto the beats where each says the most (`CREATIVE_PLAN`), at
least half the body's beats, drawing more from the deal's reserve for a long film, and plays them: the camera stays
at rest under them (each brings its own move that starts, travels and lands). Build what it needs, never swap the
deal away: one swap at most, for another device, with the reason (launch.ts `creative: { swap: { a: 'b' }, reason }`);
a pair's `creative` pins one. Outside launch-simple: `<CreativePicture id scene={(f) => ...} focus .../>` and
`<CreativeLine cid words .../>` from `fx/creative` (`data.button`: the product's button box; `data.params`: any of the
device's house numbers). Each device's recipe and numbers: its `RECIPE` (f@60, px@1080). The film's seed varies a
device within its recipe (the direction a row travels, how a giant word enters, where a pointer starts, which way
letters swing), so two films dealt the same device still differ. Every device keeps the house rules: its camera move
starts, travels and lands (never a pan that wanders back), nothing rises and sinks at rest, cards face the camera in the
film's one card material, a card that opens into the product stays opaque (no ghost card through the product).

| id | draws | what the viewer sees | the pair gives it |
|---|---|---|---|
| `word-swap` | line | the line builds with its key word's slot rolling (out upward through a mask, the next in from below) through two or three alternatives on settling beats, the row re-centring; it lands on the real word in the accent | `alts` |
| `scale-contrast` | line | the key word as large as the frame allows (cap up to 30 %, heavy, tight), in the accent where it reads, centred on its ink; it enters by the seed: letters rising out of a mask from wholly hidden, or tightening from wide tracking as they ink in; the rest of the line small in ink above and under it, one centred composition | - |
| `letter-swing` | line | the line builds word by word, then its key word's letters swing up into place one after another on an arc (each about a pivot under its baseline, one small overshoot), landing upright in the accent at exactly zero degrees | - |
| `type-window` | line | the other words step away, the key word grows to 88 % of the width and its letters become windows onto the product; the camera dives into the thickest stroke of the middle letter while the picture inside settles to rest: word and picture in one shot | - |
| `type-object` | line | the key word slides to the centre and a lit accent pill grows round it; the pill becomes the product's own frame (size, corner, colour together) and opens into the picture | - |
| `split-around` | line | once read, the line parts at its key word and a lit window of the product grows in the gap; the words leave outward at speed as the window opens to the frame | - |
| `pixel-assemble` | picture | a grid of square tiles assembles the product from its focus point outward, each flashing in two tones of the accent and clearing to its piece, the gaps closing into one screen | - |
| `shape-morph` | picture | an accent dot morphs on phrased beats into a pill, a lit square, then the product's frame, which opens | - |
| `object-turn` | picture | the product enters edge-on and turns to face the camera on one strong in-out, a band of light crossing it; it lands at zero and holds (the only designed tilt) | - |
| `logo-orbit` | picture | the products it works with as official marks in the film's one ink on flat lit tiles round a ring, the turn decaying to a cruise; they collapse into the centre and the product grows out of it | `logos` |
| `split-compare` | picture | the old way (a muted card of hand steps, each on its spinner) beside the product, a divider with a lit knob travelling to the centre; then the product takes the frame | `before` |
| `data-sculpture` | picture | lit columns rise toward the last, tallest one in the accent while the figure above counts up and lands | `count` |
| `colour-flood` | picture | the accent floods out of the element just pressed until it covers the frame, a check draws on the colour with the result's word, then it drains back (the film's colour event) | `word` (optional) |
| `zoom-wall` | picture | the product fills the frame, then the camera pulls back and it is one tile of a wall of it at other moments | - |
| `photo-arc` | picture | the film's photos stream through in one level row, one way, fast then slowing until the chosen one lands at the centre; it opens to the frame about its own centre (the photo cross-fading to the product) while the others slide out; nothing rises, sinks or pans back | `photos` (5 or more) |
| `cursor-follow` | picture | close on the product with a pointer resting on it; the pointer glides to the button and the camera follows a few frames behind; it clicks on the hit (a press, a ring) and the camera pulls back to the whole product reacting: one travel, one pull | `button` (optional) |
| `bubble-swarm` | picture | the old way's pings and questions pop up as message bubbles round an empty centre, faster and faster; the product arrives in the centre and draws them in one after another until it is alone, at rest | `before` (4-7 short ones) |
| `dot-button` | picture | a dot travels to where the product's button will be, grows into it, is pressed, and the product irises open from it | `label` (optional) |

Devices that end on the product at rest may play the last picture (the end card is built from it); a line device that
hands over (type-window, type-object, split-around) owns its picture's first frame, so no other device takes that
picture. `logos` and `count` are real: the products it really works with, the product's own figure; `before` items
are the product's real old way (the steps it removes, the questions it ends), never filler.

## 0b. Hero shots (three or more a film, dealt)

The shots that carry a film's production value: each a designed 3D or light shot of the product's own content
(`src/content.ts`, written by `node scripts/content.mjs --brief BRIEF.md --fetch --force`) standing in the film's world.
`deck.py` deals at least three at random with fit (the brief's words, the world's tone, the photos, the brand's mark),
never the last film's set, into `src/dealt.ts` `hero`; launch-simple's `HERO_PLAN` puts each on the beat its role says
before the creative elements take the beats left (a pair's `hero` pins one; `heroes.swap` trades one with a reason).
Every shot keeps the habits: one sharp plane with a graded blur ladder behind it, one camera move with a job
(front-loaded, landing, through declared fx/depth shots), light sized to its source and timed, real content in quantity,
a scale jump, smear only on fast frames, cards facing the camera. Numbers f@60, px@1080 (`src/hero/time.ts` times them).

| id | role | recipe | content |
|---|---|---|---|
| `glass-input` | over | the line centred over the world and 64 px under it the input as frosted glass (136 tall, 1120-1400 wide, fx/light `Glass`): it rises 26 px into place as the line builds (from 12), a band of light crosses it as it lands (42) and again as it sends; the request types once the line is read (12-30 characters a second, the newest word in the accent settling to ink); one push in on `E.glideOut` over the shot (the type and the glass x1.075, the world x1.035: the near things grow more); a glow 2.4x the send button's radius blooms on send | `prompt` |
| `macro-type` | picture | the bar sized to its request (fx/depth): opens on the whole bar, a push to x2.2 lands on the caret as the first keys land (44), a follow of the caret (lag 24) while it types, then a pull back to the whole bar (34) so the request is read whole and sharp for 20 f or more before send (never only seen cut by the frame); a pointer glides in (20) and presses send, a glow 1.35x the button on the button | `prompt` |
| `black-glass` | picture | the composer as a frosted pane (1180 x 272, radius 40): its defocus clears 7.5 -> 0 px in 10 f (half in the first 3), a light runs along its rim (from 16), one push x0.94 -> 1.06 that lands by 72 % of the beat, the request typing once sharp, a band on send; a label above it in the mute | `prompt` |
| `page-fly` | picture | the page flies in from 1500 px deep and 420 low (30 f, `E.glideOut`), lying back (pitch -44, yaw 15 by the seed's side), and the camera travels it from the headline to the table (x1.18 -> 1.5, the roll unwinding -8 -> -3), the far edge soft (a defocus that varies across the page), a lit edge toward the key | `doc` |
| `toast-stack` | picture | five notifications arriving front-loaded over 62 % of the beat: each drops into the front slot (16 f, `E.snapOut`) and pushes the others one slot up (0.34 card) and 260 back (18 f): the lens makes the ladder (front sharp, each further back softer); the stack square and centred, the camera square in front of it on an 85 mm lens (a card off the axis of a wide lens keystones into a card that reads tilted at rest), one straight push x1.16 that lands; each card's time by its slot, newest first ("now" in front), so the times hold when paused; the product's own notice (`own`) wears the product's mark | `notices` |
| `fan-focus` | picture | five cards fanned back in depth (fx/depth `FanFocus`), already entering on the cut, the camera to one side (the seed's) closing on the third as the focus racks to it (from 24 % of the beat) | `comments` |
| `rise-behind` | over | the line's key word giant (cap up to 22 % of the frame) in front, the rest of the line small above it, three cards (500 x 600) rising 460 px behind it from the middle out (40 f each, 8 apart) while the camera pulls back x1.3 -> 1; the focus racks from the word to the cards as the reveal lands | `plans` |
| `porthole` | line | the line built in the film's voice; 8 f after it is read its words part (one row before its key word, two rows apart) and a porthole opens in the gap over 26 f (diameter 2.9x the type size, a real face inside), a shadow ring and the key's light on its rim; the words re-centre round it; it goes soft into the next shot (a blur seam) | `people` |
| `carousel` | picture | 8-16 of the film's real pictures (380 x 500) on a ring turning to a stop (300 deg, `E.settleOut`, the seed's way) while the camera cranes from 58 deg above to eye level (x2.05 closer) and lands the chosen one facing the camera; the far side turns away, a smear only while it turns fast (needs three pictures or more) | `thumbs` |
| `push-press` | picture | the product's screen read whole for 30 % of the beat, then one push (38 %, x2.1) into the scene's `button` as a pointer arrives and presses; a glow 0.8x the button blooms on the button (an accent halo in normal blend with a small core of added light: added light alone vanishes on a white card and glows on the world past its edge) and the screen answers on its hit | the scene |
| `logo-3d` | end | the brand's mark extruded and bevelled (fx/three `Logo3D`): the end opens on its close-up through a blur seam (48 px, both shots dimmed to 0.55 at the cut) and one pull-back turns it to face the camera and lands it on the flat mark 8 f before the name slides out (never a small mark waiting alone), the mark in its own colours; on software GL the same move as a CSS-3D solid (`SolidMark`: the face over slices of its silhouette receding in depth, darker toward the back, a light gradient from the key, a soft shadow), an object either way, never a flat logo shrinking | `brand/logo.ts` |

The world (one a film, launch-simple's `ground` slot, `src/world.tsx`): `nearWhite`, `paleSky`, `blackField`, `deepField`,
`electric` (built); `clouds`, `sky`, `aerial`, `sea`, `nightCity`, `studio`, `macro` (photographs: `node scripts/assets.mjs
plate <kind>`, then `--pick <n> --to public/plates --accent '<accent>'`). A photograph is a place that belongs to the
subject (deck.py ranks a plate first only when the brief names what it shows, `WORLD_SUBJECTS`, else below the built
worlds: never a stock city under a ceramics class). It is sharp for the opening frames, then racks soft behind the type
(the first line waits for the rack: never white words over a sharp bright picture), under a light veil (0.16); every line
on it stands on a soft pool of its deep tone (`TYPE_POOL`), never a text-shadow halo. The film travels through it
(fx/world `worldPath`): the camera enters the place on the opening (a push x1.07 that lands) and moves on with every
change of picture (x1.035 and a 14 px rise, starting 10 f before the cut, landing 30 f after it), always the same way,
still between: the place carries the cut and is never one still photograph under every scene. The shots stand in it
and draw no copy of it of their own (one slid off with a whip and jumped at each change).
Recipes for a shot of your own in a world: [lighting.md §8](lighting.md#8-a-world-and-light-that-reads-it-fxworld-fxlight)
(`glass-input-over-plate`, `black-glass`, `electric-card`, `glowing-line`, `iris-into-world`, `iris-into-input`,
`button-opens-world`, `through-the-mark`); 3D hero objects: [three.md](three.md) (`logo-3d`, `glass-tiles`,
`glass-dome`, `hero-object`); depth scenes: [camera.md §13](camera.md#13-the-depth-stage-a-real-camera-over-ui-planes-fxdepth);
the product's own screen moments, what a dense screen does while a camera frames it (src/kit/screens):
[product-ui.md §15.5](product-ui.md#155-screen-moments) (`macro-type` a request typed at macro scale, `scan-and-read`
a link scanned and its results read, `feed-read` a feed read down to the one request, `crowd-to-one` that request in
the many's words, `notice-stack` notifications stacking, `step-build` a job done in steps, `making` the thing being made
as covers, `ledger` a list that adds up, `price-pick` a plan picked, `doc-travel` a page written and travelled,
`answer` an assistant answering, `site-build` the product's site typed and built).

## 1. Text voice (rotating)

Headline systems rotate: the dealt voice opens the film and each line after it takes the next voice in turn (build ->
blur -> ink), so no two lines in a row arrive the same way, in the film's one face; at most one contrasting entry per
30 s, for the hero line only. Three sizes, never every line one size: a line alone is big (a 9.2 % cap, never under
7 %; a long line takes two rows) and read in 1.2 s at most, the lines set in the product's own words a size down (5 %),
the claim 11.2 %; the update film's change lines at 1.3 / 1 / 1.55 / 1.15 x the line size. Lines are centred, in the middle band, one line (85 % or more of them), sentence case.
Emphasis: the key word in the accent on about one line in three (`fx/TypeEmphasis` `filmEmphasis`, share 0.34; no
automatic heavier last word on the other lines: one highlighted last word on every line is the template look); no box,
marker or underline unless it is the film's one signature, on one line. On a photograph every line stands on a soft
pool of the place's deep tone.

| id | recipe | build |
|---|---|---|
| `build` | words arrive one by one (20 f fades, 6 f apart) and the line re-centres as it grows (an expo settle over about 15 f) | `fx/TypePresets` `build`; launch-simple voice `build` |
| `blur` | the whole line arrives out of a 12 px blur, settling from 104 % on a glide (34 f) | launch-simple voice `blur` |
| `ink` | each word arrives pale a touch below its place, rises into it and inks to its colour in 10 f, 6 f apart | launch-simple voice `ink`; grey to ink in 4 f is the quick form |
| `accent-newest` | the arriving word wears the accent and settles to ink as the next one arrives | `fx/TypePresets` with the pace's transient accent (16 f hold, 12 f cool) |
| `decode` | glyphs scramble on threes (10 Hz) and lock left to right, one glyph in the accent, the halo off at the lock | `fx/TypePresets` `decode` |
| `streak` | a horizontal smear resolves into the word through a doubled blur | `fx/Defocus` `DirBlur` + `fx/TypePresets` `typeFocus` |

**Hero-line accents (at most one per 30 s):**

| id | recipe |
|---|---|
| `snap` | the line builds in place, then a one-frame x2.2 jump as its last word lands, settling in 7 f, a 3 px defocus clearing in 5 f (`fx/TypePresets` `snap`) |
| `split-around` | the line parts (about 180 px, expo-out), a picture grows in the gap, the words close back on it (expo-in) |
| `slot-roll` | the last word rolls in a masked slot to the next word in 5 f |
| `letter-swap` | one word turns into another letter by letter in place (outgoing letters drop, new ones rise, 2 f apart) |
| `object-in-line` | the thing the line names sits in it at cap height: a dock, a mark chip, a photo in a split word (`InlinePhoto`, `InlineLogo`) |

## 2. Moves (two or three a film, plus the signature)

| id | recipe |
|---|---|
| `push` | a slow push with the subject sinking, or a decelerating push x1.4 on expo-out, landing; the hold after it may rest |
| `whip` | 12 f in, 7 f out, the content swapping at the peak (110-220 px/f) |
| `punch-in` | a one-frame x1.1-1.3 punch on a landing word or a click, a long settle (declare it: one snap device a film) |
| `morph` | the outgoing hero's size, radius and colour interpolate into the incoming hero (18-30 f) |
| `shrink-to-mark` | a big element shrinks on expo-in into the cut and becomes the next shot's mark |
| `card-river` | a level row of cards (one y, one size) that arrives one way and slows until it lands (`fx/Pictures` `ArcRiver`, its default): only where the line is about many; never cards rising and sinking on a curve |
| `fan` | cards spread side by side into a three-card row facing the camera, then a settle push x1.08 that lands |
| `match-hold` | the subject or the line holds while the plate behind it swaps, accelerating (8, 9, 4 ... 2 f apart) |
| `mask-grow` | a pill or letterbox mask stretches open on expo-out onto the next picture |
| `carousel` | elements orbit and swap on a ring; the field turns fast (11 deg/f) and decays to a cruise |
| `card-expand` | a card widens on expo-in into the next screen; a notification pill grows into a card |
| `focus-isolate` | the chosen row zooms through while the others vanish or blur 70 % |
| `step-list` | rows step on 0.5-0.7 s apart, a spinner turning into a check, the list pushed up |
| `typing` | the newest characters smeared under a quick travel (`fx/TypeOn`, `kit` composer) |
| `connectors` | dashed lines draw between nodes while the others dim (`fx/DrawPath`) |
| `counter` | a number counts on each event, 0.25 s steps (`fx/Roll`) |
| `tint-flip` | an element or the ground switches colour on a beat (a declared colour event) |
| `light-sweep` | a 70 px specular streak glides along an edge (`fx/Rim` `KeyRim`, `fx/Exposure` `LightSweep`) |
| `macro-type` | the camera pushes onto an input at 2.5-4x as the first keys land and follows the caret as the line types (fx/depth `MacroType`) |
| `page-travel` | a travel over a page lying back in perspective, headline to table, the roll unwinding, the far edge soft (`PageTravel`) |
| `fan-focus` | cards in a fan in depth, the camera to one side closing on one card while the focus racks to it (`FanFocus`) |
| `push-press` | a push into the button at macro scale as the pointer reaches it and presses (`PushIn`) |
| `rise-behind` | cards rise behind a giant word while the camera pulls back; the focus racks from the word to the row (`RiseScene`) |
| `crane-down` | the camera swings down from above onto a board and lands face-on for the read (`CraneDown`) |

**Signatures (one a film, the shot people remember):** a paper collage in stop motion; a zoom out from one tile to the
whole wall; an avatar that grows and pushes the words apart; letters swinging on an arc one by one; a dot that grows
into the button it was about to press. Or the deck's dealt signature shot (`out/DIRECTION.md`).

## 3. Seams (two or three kinds a film)

Every hard cut carries something (the ground kept, a blur at the seam, an anchor held within 10 px, or the motion
carried); at most 10 % of hard cuts carry nothing; no kind takes more than 40 % of the scene changes; at most
two light-dark ground flips, each a declared colour event. A film of four lines or more holds at least one
exit-then-enter, text-swap or match-cut. Full recipes in frames: [transitions.md §2](transitions.md#2-recipes-at-60-fps).

| id | where | in one line |
|---|---|---|
| `exitEnter` | line to line on a kept ground | exit 12-18 f accelerating away, 0-6 f of moving ground, enter 14-24 f |
| `textSwap` | inside a scene | the slot and cap height stay; a blur swap (out to 12 px in 8 f, in over 12-14 f), a push-up or an ink-in |
| `matchCut` | line to picture, picture to picture | one anchor (the word slot, a shape's centre) within 10 px across a one-frame cut |
| `blurThrough` | anywhere | out 12-16 f to 24-40 px of blur, the cut inside it, in 10-16 f; between two pictures that differ (a white card into a dark mark) 48 px with both shots dimmed to 0.55 on the cut frame (`peak`, `dim`) |
| `velocityCut` | picture to picture | speed builds x1.15-1.35 a frame over the last 8-12 f, the next shot enters moving the same way and decays 12-24 f; between two full-frame pictures a whip (`travel`: the outgoing travels 0.75 of the frame over its last 24 f on t^2.2, mostly gone and smeared at about 260 px a frame on the cut frame at 30 fps), every whip of a film the same way |
| `recede` | picture to line | the picture falls back (x0.86, 36 px soft) as the line builds; on a dark world it darkens into the world first (brightness 0.14 by a third of the recede) and goes only once dark, never a translucent card with the world through it |
| `sharedElement` | into the end card, into the product | one element belongs to both shots and is never cut; the surroundings out 10-14 f, in 8-16 f |
| `zoomThrough` | picture to line, into the end | an exponential push x1.04-1.10 a frame into the element that becomes the next frame |
| `card-expand` | into a product screen | the card's rectangle animates to the frame over 24-36 f, its content cross-blurring at 40-60 % |
| `mask-reveal` | into a new world | an iris from a meaningful point (the gap between two words, the button just pressed) |
| `push-slide` | between two screens | a hard edge travels; the old shot moves 3-4 f before the edge enters |
| `whip` | energy | speed x1.12-1.2 a frame to 110-220 px/f at 0.55 of the move, the cut hidden in the smear |
| `colour-flip` | the one colour event | the word holds at the centre while the ground colour cuts (once, or three flips 10 f apart) |
| `light-wipe` | a soft change of scene | a soft band of light crosses in 10-20 f, the frame blurs under it and resolves |

`fx/Seam` builds the first seven by these names and declares them (`seamDeclares`); `forensics.py --seams` checks the
mix in seconds.

## 4. Ground family (one a film)

launch-simple stands its films in a world instead (§0b). One field and its light for the whole film, never cut; one
declared colour event at most. `fx/Grounds`
`<FamilyGround family>` draws it, `palette.py --family <id>` writes its tokens ([brand-and-color.md §9b](brand-and-color.md)).
With a colour field, at least one line sits on it (white or ink-black type, 4.5:1 once settled).

| id | what it is |
|---|---|
| `nearWhite` | 98 % light, real pictures and product UI on it; the pictures carry the colour |
| `blackField` | near-black (never `#000`) under one soft key light from a top corner; white type; light sweeps along rims |
| `whiteBand` | white with one brand-colour band (a top gradient); a flood of that colour is the colour event |
| `deepPool` | a deep coloured field with a pool of light drifting across it |
| `softSky` | a pale sky-blue world, glass tiles and soft shadows |
| `lightDark` | the problem on a light grey act, the product on a dark act with its glow: the turn is the colour event |
| `gradientField` | a pale tinted gradient field, baked and dithered, for the whole film |

The bans stay: no orange, amber, cream or sand, no purple or violet, no neon, unless the brand supplies them.

## 5. End card (one design a film)

Centred, built from the film's last element, 2.5 s at most: it lands with one snap and keeps living (a creep that
lands, a light; never a frozen hold, never an aimless slide), the name once, the one fact under it, then the whole frame
settles out into the world's deep tone over the last 0.6 s with the music's ring-out, the film over 2 s at most after
the mark is whole. A drawn mark is laid out by its ink: its ink 1.3x the
name's cap height, 0.44 cap from the name, in its own colours (only its near-black parts take the world's ink). The ten
designs with their builds are in [devices/logo-and-end-card.md](devices/logo-and-end-card.md#ten-end-card-designs-recipes);
their ids for `film.json` `end` and `logo`:

`element` (the last picture's element becomes the mark) · `badge` (the badge spins in, the name slides out from behind) ·
`word` (the last word becomes the wordmark) · `gather` (the line gathers into the name) · `beat-letters` (letters on the
beat) · `pull-back` (from inside the mark) · `travelling` (the film's travelling element becomes the mark) ·
`write-in` (from blur) · `iris` (from a meaningful point) · `card-expand` (the last card becomes the end's ground).

The logo itself is the brand's own SVG, or a mark built from the film's last element: never a sparkle, a star or a
generic glyph.

## 6. Other products' marks (one presentation a film)

Official marks from `scripts/logos.mjs` (`logos.mjs check` in the ship gate), one presentation a film:

| id | recipe |
|---|---|
| `chip-in-line` | the official icon and the name in the film's face as one chip appended to the line, then swapped in the same slot |
| `pills-around` | white pills with a soft shadow burst out round a centred line and settle, or drift on an orbit |
| `wall` | the marks in a thin-line grid (monochrome), or the official icons as frosted tiles |

Never a mark pill on every line, never a known product named in text alone where its mark belongs.

## 7. Cards

A card is a lit object: a vertical sheen (4-5 L* top to bottom), the key falling off across its face from the upper
left (a shade toward the far corner on a light card, a lift at the key on a dark one: kit/card `CARD.key`), an inner top
highlight and, on a dark world, its top edge catching the key (a hairline of light just outside it; kit/card
`CARD.edge`), never a white slab with a drop shadow and never a halo of haze round it. A container carried by a
handover keeps the same light in flight (lib/handover `faceKey`). One radius a film (house 23 px at 1080, range 16-34), a soft shadow or a 1 px border (not both on every card), inner
padding about 2.4 times the cap height of the text inside (never under 0.8), left edges of stacked rows within 4 px,
no accent bar down a card's side, no text touching an asset. A glass card: a 2 px rim and no shadow. A vertical line
beside text only as a step rail between steps.

## 8. A plain 20 s launch, timed

T = a line alone, centred, on the clean ground; A = the product acting, full frame, no statement over it.

| s | beat | what |
|---|---|---|
| 0.0-1.2 | T | "[Name] turns [input] into [output]." in the film's voice |
| 1.2-4.0 | A | the input becoming the output in the product (a real person giving the input where it is human) |
| 4.0-5.2 | T | line 2, the same voice, `exitEnter` on the kept ground |
| 5.2-7.8 | A | the product doing it (`step-list` or `typing`; a `matchCut` or `velocityCut` in) |
| 7.8-9.0 | T | line 3 |
| 9.0-11.4 | A | the proof (`counter`, a result appearing) |
| 11.4-14.0 | A | the proof opening on (`card-expand`, the element handed on) |
| 14.0-15.2 | T | line 4 |
| 15.2-17.5 | A | the payoff picture: the signature |
| 17.5-20.0 | end | the centred lockup built from the last element: one snap, living, the film over 2 s after the mark |

A 15 s launch is 3-4 lines and 3-4 picture beats; a 30 s one 5-7 lines. A line alone is read in 1.2 s at most, every
picture beat runs 1.5-3 s (a longer point takes two), the lockup 2.5 s at most, the first line on screen by 1 s, 0.3-1.5
headline words a second. `assets/templates/launch-simple`
lays this down, deals the voice, the ground, the seams, the end card and the camera (still, or one push that lands),
and plays the film's creative elements (§0) on at least half its beats.
