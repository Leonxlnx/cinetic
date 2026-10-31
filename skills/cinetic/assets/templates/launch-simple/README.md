# launch-simple: the default launch film

Lines and pictures that meet, never a slideshow: the first line alone in the middle of a lit ground, then the product
doing what it said; the next lines arrive with their pictures (the picture rising in under the line, then racking into
focus as the line leaves); the claim alone on its colour field, the film's hero line; then a centred lockup built from
the last picture with the one fact under it. Every change of picture carries something (a camera move across the cut,
the picture falling back while the next line builds over it, one object flying from one scene into the next), so the
frame is never empty between two scenes. 15-30 s, one text voice, one ground family, three or four seam kinds.
`new-film.sh` lays it over the Remotion starter for every launch (`--template none` keeps the starter's own acts).

## What you write

1. **The script, `src/launch.ts`.** Three to six pairs; each pair is a picture and, mostly, the line it proves.
   - `line`: one short sentence, 2-7 words (1-5 typical), plain words. Line 1 says what the product does, by name.
     A line says what its picture cannot (who it is for, why it matters), never what it shows (copy-check `repeats`):
     leave `line` out of a pair between the first and the claim when its picture says it, and the pair plays its
     picture alone, carried on from the last one. At most four lines a film; the pictures carry the rest.
     Mark one key word with `*stars*` on at most two lines (one in a film of two or three): it takes the accent ink.
   - `scene`: the id of the picture beat in `src/product.tsx`; `seconds` (1-3.5; vary them, a long one beside a short one; unset they run 2.6, 1.6, 2.2, 3.0 in turn); `hits` (where its own
     moments land, as shares of the beat); `ui` (every string the picture shows: real words, no sample names).
   - `beat`: how the line meets its picture. `alone` (T then A: the line alone, building over the last picture as it
     falls back), `with` (T+A then A: the line arrives with its picture's first motion, the picture standing far behind
     it, centred, smaller, soft and dim, never below it or cut by the frame, then coming up to the camera and racking
     into focus as the line lifts away; its `hits` land after the line), `over` (T+A: the line held over its whole
     picture, which the scene composes round the line's `band`: footage under it, other products' marks beside it with
     `MarksRound` from `src/acts/ui.tsx`, bare marks at the line's height, never a row of app tiles above it).
     Unset: the first line and the claim `alone`, the lines between `with`. Aim for about T 25 % / T+A 30 % / A 37 % of
     the beats (`BEAT_MIX`): one `over` in a film of four or five lines gets there.
   - `close`: the one fact under the lockup (where, when, the price), 2-6 words.
   - `input`: the core action in plain words ("a hiker walking a mountain trail"), for the input shot.
   - The name goes in `src/brand/identity.ts`.
2. **The input shot, the first step after the scaffold: `node tools/input.mjs`.** The core action as real footage: a
   person giving the input (speaking into the phone, paying, cooking). An input that happens on a screen (typing code, a
   pull request, a click) is not filmed: the product's own screen taking it is the shot, and the tool says so (`--force`
   fetches all the same); a clip in the banned hues warns with its share. It reads launch.ts `input`, takes the matching
   footage recipe's first fitting clip (a search of the free footage sources in the same words when no recipe has
   one), downloads 3 s of it with its licence record into `public/assets/input.mp4` and writes `src/input.ts` (its size,
   rate and source), which `INPUT` in `src/product.tsx` reads; `--pick <n>` after a look at the results' sheet
   (`assets.mjs sheet out/assets/input-*.json`). Until it has run, precheck warns and the ship gate fails; when no
   footage fits the product, `--none "<why>"` says so and the fallback plays. The first scene plays it in a lit window graded into the film (a tint at the ground's hue: a soft stock clip shown
   smaller reads sharp and belongs to the film), the product's listening pill (light, the accent's live dot and
   waveform) on the window's lower edge; on the cut the window rises away, the lit phone rises in and the pill flies
   into the top of its screen: one element carried across, the words of the input arriving under it as they are said,
   the task rising out of them. No clip fits: delete the file and the scene plays its code-built fallback (the phone
   alone, the pill already in its screen). Declare the clip's span to `look-audit.py` with `--imagery`.
3. **The product's scenes, `src/product.tsx`.** One component per scene id, drawn full frame and centred in the
   ground family's inks (`SceneProps`: `f` frames since the picture began, behind its line for `with` and `over`;
   `dur`, `hits`, `inks`, `cut`, `band`, `carry`). Give each scene its `focus` box (x, y, w, h: the push closer frames it
   inside the safe area; a function when it is measured). The first scene
   shows the product's core change literally (input -> output); each picture proves the line before it ("lands on its
   day" shows the tasks dropping into their days: the steps' `ui` lists one item per hit, then the slots they land in).
   The scene before the claim names its `field` (the element the claim's colour field grows out of); the last one
   names its `hero` box: the element the end card is built from. Show the product as a lit object, whole in the frame:
   the kit's `Phone` or `Laptop` (`src/kit/device.tsx`: a silver rim, glass, thickness when tilted, a contact shadow)
   with a light screen, or a lit `Card` from `src/acts/ui.tsx` (a white card on a dark ground: the film's second value;
   `surfaceInks()` for what it holds), sized by what it holds (never an empty slab: `cardRows` gives its height from
   its rows with even padding above and below). UI type at film size: 44 px and up, titles 60 and up. `ui.tsx` also
   has a typed field, a row that checks itself, a count, a live waveform, a listening pill, a status `Pill` (dot and
   label laid out by the browser, even padding), `SwapLabel` (one control whose label changes in place: "Merge" to
   "Merged", never two controls cross-fading), a lit `Window` onto footage and `Plane` (a part nearer or farther than
   the stage, so the planes part as the camera travels). Never place a thing beside text by a width guessed from the
   letter count (lint-film `text-estimate`): lay it out with flex or measure it (`measureTracked`). Siblings share a
   line: two nodes of a diagram on one baseline, an icon centred on its label's centre line, a divider clear of both. Keep what a scene shows mounted for the whole
   beat (show and hide it with opacity), land its arrivals on its `hits`, ease its state changes, and give the picture
   colour where the product has it: a calm picture never pops, and the checks read it frame by frame.
4. **The visual idea and the signature.** Draw the product's mechanism as one object carried through the film, never
   a set of unrelated cards: a scene names where the object sits as it ends (`carry.out`) and the next scene where it
   lands (`carry.in`); between two pictures the stage flies it from one to the other over the seam (`IDEA` in
   `src/product.tsx` draws it in flight as it changes form; without one, a lit tile in its fill), and each scene hides
   its own copy while it flies (`carried(f, carry)`). A match cut between two pictures needs it: with nothing carried
   over it, it swaps one scene for another in a frame (precheck reports it; give both scenes `carry`, or pin seamAA
   velocityCut or blurThrough). A line that says "every" or "each" draws the many: three or more at once, each with its
   own result (every pull request its own database, side by side), or the whole lifecycle (made, used, gone on merge).
   The scaffold's: the task the phone writes lifts off the screen and
   lands as the first task on the board; the last task chip is pushed into until it is the frame (the claim's colour
   field); the result's progress ring closes into the mark that flies into the lockup (`SIGNATURE`, one move a film,
   picked from `references/catalogue.md` §2 for the payoff). Other ideas: a route that becomes the elevation line,
   then the mark; a caught error that becomes the patch's removed line, then the passing check.
5. **The mark.** `scripts/brand.py` with the brand's SVG writes `src/brand/logo.ts`. Until then the lockup shows the
   product's own element as a mark (`HERO_MARK` in `src/product.tsx`: the scaffold's is the result's ring closed into a
   disc with a check cut through it, one colour, its long stroke breaking the edge) or, without one, a letter mark, and
   lint fails on the marker: keep it on purpose for an invented brand by deleting the marker, never swap in a sparkle,
   star or AI glyph, never a letter that repeats the wordmark's first letter beside it.

## Premium by default (simple is not flat)

One dominant thing a frame, and every frame lit and alive:
- **Ground.** The dealt family's lit field (`fx/Grounds` `FamilyGround`, one of all eleven families, dealt by
  `scripts/deck.py` with the film's palette): its own key, its fall and its far tone baked dithered, still, never cut,
  no second plate over it (a linear wash on a lit field reads as a cheap two-stop gradient), at one level all film.
- **A world and scale.** The product is a lit object in a lit place: the stage frames each picture on its scene's
  `focus` box from its first frame (`FRAME`: the box scaled up until it stands 62 % of the frame's height, centred; a
  framing, never a move) and stands it on a soft contact shadow under that box (`FLOOR`; `floor: false` for a scene
  that draws its own). The subject fills the frame: never a small card in an empty field (look-audit `small-subject`
  fails one); a wide, short row is stacked, made taller or cropped to the moment that matters (a `focus` box round the
  moment is a macro crop: the stage scales the product up round it). The creative elements take the framed scene.
- **Colour.** Three values, one accent: the dark ground, light surfaces (white cards, a light phone screen) and the
  claim on a colour field in the accent (`FIELD_ON`, `EVENT_FROM`): the seam into the claim pushes into the scene's
  `field` element (unnamed: a disc of the accent at the scene's focus) until it is the frame, the claim resolves on it in white, the field leaves with it on the next seam
  (one run under 2 s; the band's flood and the turn to dark are their families' own events).
- **Type.** The film's dealt pairing (`fx/TypePairs`, set in the tokens by `type-deal.ts`; `acts/line.tsx` `PAIR`
  reads it back): its weights and its optical tracking. Every line sets one key word apart in the pairing's emphasis
  weight (the starred word in the accent ink; a line without a star its last content word, in its own ink: `KEY_AUTO`),
  never every line one size, one weight, plain white. Three sizes, one hierarchy: a line alone at a 7.4 % cap height in
  the pairing's line weight, a line over its picture a step smaller (6.6 %), the claim (the last line, the hero) at 11.2 % in its hero weight, its
  last word taking the film's one contrasting entry (the words before it centred on their own, gliding over to open
  its slot, then it snaps in from its left edge, one frame at x1.6, settling in 7 f: never a ragged block, never a
  word over its neighbour); the wordmark in the pairing's wordmark style (`wordmarkStyle`), its tracking loosened
  just enough that no two letters touch (`safeTrack`); a long line keeps one row at a sentence cap (6-6.4 %) or breaks into two balanced rows that part as they are
  read; never under 6 %.
- **Cards.** Every card is the kit's one material (`kit/card.tsx`, through `acts/ui.tsx` `Card` and `litFace`): an
  opaque face with a quiet vertical sheen lit from above, a hairline and an inner top highlight over its content, a
  tight contact shadow and a broad soft one; cards face the camera and hold still (no creep, no bob, no resting tilt),
  a designed turn only as a creative element (object-turn) that lands facing.
- **Life with a purpose.** The camera moves only to say something: a move that starts, travels and lands, then a hold
  that may be still. No float, no drift, no re-frame back and forth. A picture over 2.2 s takes one eased push closer
  (`PUSH`: 24 f@60 on a strong in-out, framing its `focus` box inside the safe area; never on a picture behind its line,
  never two pictures in a row, never under a creative picture); the dealt camera `land` gives each product picture one
  slow push that lands (`LAND`). The creative elements carry the motion (below); a finished line is never padded past
  its read and holds its place (no drift); the last picture falls back behind the lockup for a second while its element flies in (the
  product stays on screen into the end, its words gone before the element crosses them), and the lockup drifts from
  rest once it is whole, the fact on the name's axis, passing the frame's centre late in the hold and standing at most
  28 px off it (`END_OFF_MAX`).

Everything else is derived: `src/timeline.ts` fits each line beat (its build, its read, its exit) and each picture beat
to the track's 8ths and each pair to whole bars at any tempo from 90 to 140 BPM, and puts the end on a downbeat with the
lockup held 2-3 s; `src/deal.ts` deals the text voice, the ground family, the seams, the end card, the camera and the
creative elements (`launch.ts` `pin` fixes a slot, `seed` re-deals); `src/sync.ts` sounds each line once whole, each
picture's hits, the seams that move, a creative line turning into its picture and one hit on the lockup.

## The creative elements

The film is never "a line, then a card". It plays two or three creative elements, dealt at random from the starter's
`src/fx/creative` (eighteen finished devices: `references/catalogue.md` §0), by `scripts/deck.py` into `src/dealt.ts`
(`creative`, `reserve`), leaning toward the devices that tell the picked direction's story and the brief's words, or,
with no deck, from the product's name (`src/deal.ts` `CREATIVE`, the same recency-weighted shuffle): never a recent
film's set, at least one device no recent film played, at least one that draws a line and one that draws a picture,
and only devices the script can feed (`scriptFeeds`: logos, a figure, the old way, alternatives, five photos or more). `src/timeline.ts` maps them onto the beats
(`CREATIVE_PLAN`): a line device draws a line's beat (never the claim's), a picture device draws a picture's beat with
the product's scene inside it (`SceneDef.draw` at any frame the device asks for: a wall of it at other moments, held
on its first frame behind the letters), where each says the most (`prefer`), at least half the body's beats (a long
film draws more from the reserve). A pair a device takes plays `alone` (line, then picture). A line device that hands
over (type-window, type-object, split-around) owns its picture's first frame: the seam between them is `handover`
(nothing drawn) and no picture device takes that picture. colour-flood is the film's colour event (the claim's field
stays off). The stage camera rests under every creative picture; a picture-to-picture match cut beside one plays as
the blur.

What you write for them, on the pair they take: `alts` (word-swap: 2-3 alternatives the key word rolls through),
`logos` (logo-orbit: the products it works with, `scripts/logos.mjs get`), `before` (split-compare: 2-4 steps of
the old way; bubble-swarm: 4-7 pings), `count` (data-sculpture: a real figure), `word` (colour-flood), `label`
(dot-button), `photos` (photo-arc: five pictures or more). dot-button and cursor-follow press the scene's `button` (a
box in scene px on its `SceneDef`). A device hands over by what it carries (its last frame is the product's scene at
rest, or the picture's first), never a card-to-card cross-fade. precheck names what a device misses (`CREATIVE_MISSING`; the ship gate fails it). A pair's `creative`
pins a device; `creative: { swap: { 'data-sculpture': 'zoom-wall' }, reason: '...' }` trades one, never more, never
for nothing. Give each scene a `focus` box: the devices frame the product by it. Print the plan:
`npx tsx -e "import { CREATIVE } from './src/deal'; import { CREATIVE_PLAN, CREATIVE_MISSING } from './src/timeline'; console.log(CREATIVE, CREATIVE_PLAN, CREATIVE_MISSING)"`.

## The beats

| Beat | On screen | Length |
|---|---|---|
| T | one line, centred in the middle band, alone on the ground (`alone`; the last picture falls back under its build) | 0.5-2.4 s |
| A | the product acting, full frame, centred, no statement over it | 1-3.5 s |
| T+A | a line with its picture: the picture rising in under it, soft (`with`), or held round it (`over`) | as T; `over` as its picture |
| end | the centred lockup built from the last picture's element, the one fact under it | held 2-3 s |

`grid-check.ts` checks the plan (`BEAT_PLAN`): type-only beats >= 15 % of the shots and >= 2, T+A <= 40 %, the first line
on screen by 1 s, every line beat holding its line, no statement over a picture beat. `BEAT_MIX` prints the mix.

## The seams

Every change of picture carries something (`SEAM_PLAN`, drawn by `acts/stage.tsx`), and no kind passes 45 % of them:

| Change | Recipes | What carries it |
|---|---|---|
| line -> picture | velocityCut, blurThrough (a dealt matchCut plays as blurThrough) | the line's speed into the picture's, smeared along its travel; the cut inside a blur |
| picture -> line | recede, zoomThrough | the picture falls back while the line builds over it; or the push into it, the line building over the push |
| picture -> picture | velocityCut, blurThrough, matchCut (only where dealt, and only under the carried object) | one camera move across the cut, smeared; the cut inside a blur; the film's carried object (`carry`) flying between the two scenes |
| line over picture -> picture | (no cut) | the line lifts away, the picture rises into its place and racks into focus (a declared focus pull, `rack:`) |
| out of the claim | velocityCut | its colour field sweeps off at speed |
| into the end | sharedElement | the last picture's element flies into the mark |

## The deal

`scripts/deck.py` never picks for you here: run without `--direction` it deals three directions into `out/OPTIONS.md`,
each with what this template would play (the ground family, the type pairing, the creative elements, the end card).
Pick the one whose picture tells what the product does, with the reason in one line, and deal it:
`python3 scripts/deck.py ... --direction <id> --why "<why it fits the product>"` (the reason heads `out/DIRECTION.md`;
the sheet writes `src/dealt.ts` and sets the type pairing). A direction that does not fit the product is never played
because it came first.

| Slot | Choices |
|---|---|
| voice | build (word by word, re-centring), blur (the whole line out of a blur), ink (each word pale, inking in) |
| ground | all eleven families: nearWhite, lightStudio, softSky, gradientField, whiteBand, blackField, studio, deepPool, duskMesh, floorGlow, lightDark (`references/brand-and-color.md` §9b) |
| seamTA | matchCut (plays as blurThrough), velocityCut, blurThrough (line -> picture) |
| seamAT | recede, zoomThrough (picture -> line: the line builds over the leaving picture, never on an empty ground) |
| seamAA | velocityCut, matchCut, blurThrough (picture -> picture, into a line that arrives with its picture) |
| end | element (the last picture's element flies into the lockup and becomes the mark), badge (the element turns into the mark, a spin blur on the fast frames); the name slides out beside it |
| camera | still (the picture beats hold; a long picture pushes closer once), land (each product picture takes one slow push that lands, then holds) |
| creative | two or three of the eighteen creative elements (above), at random, never a recent film's set |
| type | the pairing (scripts/faces.json `pairs`), at random, never the last two films' (deck.py sets it with `type-deal.ts --pair`) |

Print it: `npx tsx -e "import { DEAL, DEAL_SOURCE } from './src/deal'; import { SEAM_PLAN, BEAT_PLAN, BEAT_MIX } from './src/timeline'; console.log(DEAL_SOURCE, DEAL, SEAM_PLAN.map((s) => s.recipe), BEAT_PLAN.map((b) => b.kind), BEAT_MIX)"`.

## Then

Look before the soundtrack: the whole film, its end card and lockup included, sampled in one render (about a minute
at half size): `npx remotion render src/index.ts FilmEvery out/look --sequence --image-format=jpeg --scale=0.5
--props='{"step":24}'`, tiled into a sheet. Then the music (`template.json` `music`: `music.mjs pick`, `track.py edit
--bars <BARS> --end auto`, `track.py grid`), `npm run check`, a preview render, and one review round on a 30-cell contact sheet against the checklist in
`references/checks.md`: every line centred, the beats mixed (no line-picture-line-picture loop), every picture showing
what the product does, half the beats or more creative scenes with the product inside them, every seam carrying
something and no empty frame between scenes, the carried object readable as one idea with the words covered, the end
card centred and built from the last element.
