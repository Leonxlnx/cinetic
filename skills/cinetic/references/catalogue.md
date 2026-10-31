# Catalogue: what a film is made of, one pick per slot

A film is two or three dealt creative elements (§0), one text voice, two or three moves, two or three seam kinds, one
ground family, one end-card design and one signature, picked from the menus below for what the line says and what the product does. Pick them in the plan step
(before any act is built), write the ids into `film.json` `devices`, and run `node scripts/film-diff.mjs`: the ground,
the voice, the signature and the end card differ from each of the last three films, and the move set (voice,
signature, logo design, moves, seam kinds) shares at most 25 % with each of them. `film.json` `recent` lists what the
last films used. Never take a whole shot order from anywhere: the menus are parts, the film is yours.

Numbers are at 60 fps and 1080p (f@60, px@1080); `fx/Seam` and the starter's primitives convert them to the film's
frame rate and size. The camera moves only with a purpose (a move that starts, travels and lands; a hold may be still),
nothing idles up and down, cards face the camera.

## 0. Creative elements (two or three a film, dealt)

A film is never "a line, then a card". Every film plays two or three creative elements: finished devices in the
starter's `src/fx/creative`, each a whole beat (a line or a picture) with the product's own scene inside it.
`deck.py` deals them at random from the whole library, seeded by the film's name and the film history: never the set
of a recent film, nothing shared with the last one while a draw can avoid it, at least one that draws a line and one
that draws a picture, never two of one family (`src/dealt.ts` `creative`; the sheet's last section; `deck.py
--creative` deals them alone). launch-simple maps them onto the beats where each says the most (`CREATIVE_PLAN`), at
least half the body's beats, drawing more from the deal's reserve for a long film, and plays them: the camera stays
at rest under them (each brings its own move that starts, travels and lands). Build what it needs, never swap the
deal away: one swap at most, for another device, with the reason (launch.ts `creative: { swap: { a: 'b' }, reason }`);
a pair's `creative` pins one. Outside launch-simple: `<CreativePicture id scene={(f) => ...} focus .../>` and
`<CreativeLine cid words .../>` from `fx/creative`. Each device's recipe and numbers: its `RECIPE` (f@60, px@1080).

| id | draws | what the viewer sees | the pair gives it |
|---|---|---|---|
| `word-swap` | line | the line builds with its key word's slot rolling (out upward through a mask, the next in from below) through two or three alternatives on settling beats, the row re-centring; it lands on the real word in the accent | `alts` |
| `scale-contrast` | line | the key word as large as the frame allows (cap up to 30 %, heavy, tight), its letters rising out of a mask; the rest of the line small above and under it, one centred composition | - |
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
| `photo-arc` | picture | upright cards (the film's photos, else the product at other moments) stream along a wide arc and slow; the top one opens to the frame | `photos` (optional) |
| `dot-button` | picture | a dot travels to where the product's button will be, grows into it, is pressed, and the product irises open from it | `label` (optional) |

Devices that end on the product at rest may play the last picture (the end card is built from it); a line device that
hands over (type-window, type-object, split-around) owns its picture's first frame, so no other device takes that
picture. `logos` and `count` are real: the products it really works with, the product's own figure.

## 1. Text voice (one a film)

One entry animation carries every line of the film, half of them at the very least; at most one contrasting entry
per 30 s, for the hero line only. Lines are centred, in the middle band, one line (85 % or more of them), cap height
6-9 % of the frame height (bigger for the claim), sentence case, one family. Emphasis: the key word in the accent
colour on at most 60 % of the lines (`fx/TypeEmphasis` `filmEmphasis`); no box, marker or underline unless it is the
film's one signature, on one line.

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
| `card-river` | a continuous stream of cards, speed in waves of 40-200 px/f (`fx/Pictures` `ArcRiver`): only where the line is about many |
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

**Signatures (one a film, the shot people remember):** a paper collage in stop motion; a zoom out from one tile to the
whole wall; an avatar that grows and pushes the words apart; letters swinging on an arc one by one; a dot that grows
into the button it was about to press. Or the deck's dealt signature shot (`out/DIRECTION.md`).

## 3. Seams (two or three kinds a film)

Every hard cut carries something (the ground kept, a blur at the seam, an anchor held within 10 px, or the motion
carried); at most 10 % of hard cuts carry nothing; the most-used kind stays under 45 % of the scene changes; at most
two light-dark ground flips, each a declared colour event. A film of four lines or more holds at least one
exit-then-enter, text-swap or match-cut. Full recipes in frames: [transitions.md §2](transitions.md#2-recipes-at-60-fps).

| id | where | in one line |
|---|---|---|
| `exitEnter` | line to line on a kept ground | exit 12-18 f accelerating away, 0-6 f of moving ground, enter 14-24 f |
| `textSwap` | inside a scene | the slot and cap height stay; a blur swap (out to 12 px in 8 f, in over 12-14 f), a push-up or an ink-in |
| `matchCut` | line to picture, picture to picture | one anchor (the word slot, a shape's centre) within 10 px across a one-frame cut |
| `blurThrough` | anywhere | out 12-16 f to 24-40 px of blur, the cut inside it, in 10-16 f |
| `velocityCut` | picture to picture | speed builds x1.15-1.35 a frame over the last 8-12 f, the next shot enters moving the same way and decays 12-24 f |
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

One field and its light for the whole film, never cut; one declared colour event at most. `fx/Grounds`
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

Centred, built from the film's last element, held 2-3 s on a creep, the name once, the one fact under it. The ten
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

One radius a film (house 23 px at 1080, range 16-34), a soft shadow or a 1 px border (not both on every card), inner
padding about 2.4 times the cap height of the text inside (never under 0.8), left edges of stacked rows within 4 px,
no accent bar down a card's side, no text touching an asset. A glass card: a 2 px rim and no shadow. A vertical line
beside text only as a step rail between steps.

## 8. A plain 20 s launch, timed

T = a line alone, centred, on the clean ground; A = the product acting, full frame, no statement over it.

| s | beat | what |
|---|---|---|
| 0.0-1.5 | T | "[Name] turns [input] into [output]." in the film's voice |
| 1.5-4.0 | A | the input becoming the output in the product (a real person giving the input where it is human) |
| 4.0-5.3 | T | line 2, the same voice, `exitEnter` on the kept ground |
| 5.3-8.0 | A | the product doing it (`step-list` or `typing`; a `matchCut` or `velocityCut` in) |
| 8.0-9.3 | T | line 3 |
| 9.3-12.5 | A | the proof (`counter`, a result appearing, `card-expand`) |
| 12.5-13.8 | T | line 4 |
| 13.8-16.5 | A | the payoff picture: the signature |
| 16.5-20.0 | end | the centred lockup built from the last element, held 2-3 s |

A 15 s launch is 3-4 lines and 3-4 picture beats; a 30 s one 5-7 lines. Lines run 0.5-2.3 s (about 1.3), picture
beats 1-3.5 s, the first line on screen by 1 s, 0.3-1.5 headline words a second. `assets/templates/launch-simple`
lays this down, deals the voice, the ground, the seams, the end card and the camera (still, or one push that lands),
and plays the film's creative elements (§0) on at least half its beats.
