# Film templates

A template is a whole film's structure laid over the Remotion starter: its timeline (acts in beats, every state
change a CUE, the declarations), one act per shot type with the choreography between them, the sound plan and a
content file of slots. `bash scripts/new-film.sh <dir> --template <name>` scaffolds from it (`assets/templates/<name>`;
`template.json` lists the files it copies and the starter acts it removes; its pace, tempo and type family become the
defaults). `type_family` (`calm` or `bold`) picks the type roles: new-film.sh writes that family's numbers from
`lib/look.ts` `TYPE_LOOK` into the film's `src/brand/tokens.ts` (`scripts/type-family.mjs`; `--type` overrides it, and
the script switches a film later). The type-explainer, ui-walkthrough and prompt-run are calm; the update,
capability-reel, camera-teaser and social-ad are bold.
A scaffold passes `tsc`, `grid-check` and `lint-film` with only the `cinetic:placeholder` markers left: the brand's
and the content file's.

A template is the floor, never the film. It carries structure, shot types, timing, transitions and choreography;
the product, the words, the brand and the direction are yours. Fill the slots, rebuild the product's own screens
where the kit stands in, deal the direction and retell the floor in its world (its grounds, light, type and
signature replace the template's), then cut it to the track: `track.py grid` moves every `b()` onto the music.

## Which one

| Template | Length | Use it when | Shape |
|---|---|---|---|
| none (the starter) | 15-45 s | a launch film whose idea is its own device: most films | the dealt direction's skeleton |
| `update` | 15-23 s | "vX is out": 2-4 changes to show | the version as the set, one product moment per change, the payoff, the end card with the version |
| `ui-walkthrough` | 25-40 s | the product's flow is the story: an input goes in, the product does visible work, an output comes out | promise, the input becoming the output (the signature), proof, a claim, the flow in steps, the output live, the end card |
| `capability-reel` | 15-25 s | the product's breadth is the story (sources, formats, integrations), or a launch film needs its close | a ring of sources, one real record, a statement, a capability ticker, the big claim on the accent, a transition out of its full stop, the end card |
| `camera-teaser` | 20-25 s | a dark, fast teaser of a product's screens where the motion is the camera's: whips, pushes, one 3D turn over one layout per shot | the request box arriving tilted in the light, a whip into its close-up and the send button, the window streaming code under the one 3D turn, the proof in depth with the real marks of what it works with, the page with a modal toast, the stages, the mark; each act deals one of two or three devices |
| `prompt-run` | 18-20 s | the product does work from a request (an agent, an assistant, a generator): what goes in is a sentence, what comes out is done work | a pill among the tools it connects, the label swapping on the kick, an iris onto the request box, the request typed, a punch-in and the click, the steps it runs, the running row becoming the result, the lockup |
| `social-ad` | 15 s | a short ad for a feed: the product is pictures (things people save, make, buy, plan) and you have them (the product's own or the user's; the kit's still life stands in until then, never stock), the cut is the energy | the opener built word by word onto a pile of pictures, the mark spinning in on a picture, a wall round the claim, two rivers under a label that swaps its last word, two imperatives, the lockup |
| `type-explainer` | 20-30 s | the idea is simple to say and the words carry it: an explainer on a white page, quiet in its small, airy type and crisp in its word pace, little or no product UI | the name as a giant word, what it is said at the pace of speech, the problem, the promise with a picture inside it that becomes the shot, one soft wipe, the mark between the words becoming the hub of the product's parts, the close |

The test: say the film in one sentence. "You give it X and get Y" is a walkthrough; "It works with everything and
returns anything" is a reel; "Here is what changed" is an update; "It is X, it fixes Y, and these are its parts" told
in words is an explainer; "Here is everything it is for, fast" over the product's pictures is an ad; "Ask it, it does the steps, here is the result" is a prompt run (a
walkthrough when the user does the steps); the same story as a dark, fast tease where the camera does the moving is a
camera teaser. When none fits, start from the starter. A launch
film may end on the reel's close (rebuild its acts after your own) or open on the walkthrough's first three acts.

## ui-walkthrough

The UI tells the story, so the viewer always knows what the product does; six short lines say what each step
means. Ten acts on whole bars at 120 BPM (37 s): `open` (the promise, its last word snapping the line x2.2 in one frame), `card`
(the user's input as one tilted card rising while the ground turns; ONE hidden-cut frame of scale, tilt and a tinted
swell makes the same card the output, which then builds its three steps), `proof` (notices piling up, `fx/Stack`),
`claim` (its first word giant, then a one-frame snap out to the line), `field` (a held backspace, the value typed in
bursts, the hand rising onto the button, results developing, a pull-back about the upper third), `feed` (a hard flick
smeared by `DirBlur` while a count accelerates into its total, landing on the item that matters), `insight` (the item
collapses into a pill), `pick` (a zoom onto the chosen row, which collapses into a progress pill while the output
builds), `page` (the output flies up and flattens), `end`. Slots: `src/walk.ts`; `input.source` names the real mark of
the product the input lives on (the card's tile and the field's lead; `scripts/logos.mjs`).

## capability-reel

Breadth, then one real proof, then the claim and the name; state changes are hard steps, only the camera and the
containers ease. Seven acts on whole bars at 120 BPM (21 s): `sources` (one line inside a ring of sources; the page darkens as the
inner ring closes into a disc), `record` (the disc grows into one real record; a whip pan opens its fields; the page
grid is the card's own and two accent cells hop on the kicks), `statement` (a hard cut on a kick to a light card that
squashes round its line, `Resize` carry, and counter-creeps into a zoom-out), `ticker` (`MaskList` and an icon tile,
a hard step every 10 f), `claim` (the film's one colour event: two fragments, the first pushing up and dimming as the
second rises, the full stop its own square), `rings` (square rings born from that stop, `Radiate` with `bornAt`, then
the flood), `end` (the name pops, the rest types, the tagline takes its place). Slots: `src/reel.ts`; each source
names its real mark (`logo`, fetched with `scripts/logos.mjs`): with every mark in, the ring is app-icon tiles, and a
capability that is another product shows its mark on the ticker's tile.

## camera-teaser

The camera is the animator: one layout per shot under `camPath` (`World` in `acts/stage.tsx`) on a clean lit ground of
its own (`LitGround`, wash or flat, dealt so no ground holds more than two shots: no pools or haze behind the words), one
carrying move per shot with its secondaries riding it, holds drifting, moves landing before the cut, the smear only
inside fast moves; the script's lines land on the film's dealt voice (`TypeLine`: mask, land or fall). Seven acts on whole bars at 120 BPM
(22 s with a 1.9 s tail): `input` (the request box tilted in the film's light, `Lit`; the what line; the send button arming;
a whip right into the close-up), `launch` (the whip carried into the close-up, a slow push; the send button leaves still
accelerating at the cut, or the camera dives into it), `window` (the window arriving on the film's one 3D turn, `swing3d`; the code streaming in the
film's mono with a lens strip on the line being written; a whip out), `cards` (the whip carried down; the connect line
an `ObjectLine` whose slot rolls the integrations' real marks; three notifications carrying the marks; the stack leaves
up still crossing the frame), `page` (arriving moving up, the cards rising in a cascade; the modal: blur, dim and push
with a light toast at the midpoint; a pull-out to black), `stages` (the product's three stages on glides), `end` (the
mark, the name, the close; the lockup on the mark, the end lock from the close). Each act deals one of two or three
devices per film from a seed (`src/deal.ts`, template.json "deal": e.g. the proof as a depth stack, a wall or a ring of
tiles; the stages in brackets, pushed through, or as the claim on the accent), and the declarations follow the deal.
The act lines that cut on a blur peak are designed cuts: `timeline.ts` `CUTS` lists them for `forensics.py --cuts`.
Slots: `src/teaser.ts` (with `integrations`, the slugs of the real marks).

## prompt-run

One object through many states; the product's UI tells the story. Six acts on whole bars at 120 BPM (19 s): `pill`
(the label written by a front among the tools it connects; on the kick the tools leave along their own vectors,
`scatterState`, the label swaps, the rim turns; a cubic-in wind-up), `ask` (the reveal iris, `irisReveal`, out of the
pill onto a field in the accent's hue, the film's one colour event; the request box, kit `Composer`, pushes in while its
width unfolds on its own track; the line over it written by a front; the request typed fast with a burst, `TypeOn`
stream `rates` and `skip`), `click` (a punch-in with a blur bridge, `blurBridge`, the close-up breathing back; the
pointer, `Cursor` shape `pointer`, clicks, the send button swells, `swellState`, the pointer spins out, `cursorExit`; an
ease-in whip up), `run` (the request as a `Bubble`, a status with `ThinkingDots`, `StepList` rows rising in on an
accelerating cadence, the last pending), `done` (the running row grows into the result card), `end`. Slots:
`src/run.ts`.

## social-ad

Fifteen seconds, every seam inside a motion, pictures carrying the colour. Six acts on whole bars at 150 BPM (15.4 s):
`open` (the opener built word by word: the name cut in at x2.67 defocused, each new word landing in the accent at the
line's end while the line re-centres and relaxes; the line breathes apart through the cut and its two words carry on
either side of a hero card while a pile of pictures is dealt onto it, `pileState`), `brand` (a picture pulling back on a
circ-out, the mark spinning in from x2.06, `spinInState` and `SpinBlur`, the name sliding out; the lockup rises into the
cut), `wall` (a masonry wall settling tile by tile, `masonryState`, the claim riding the hero tile, its last word on an
accent pill popped in 2 f), `rivers` (two diagonal streams of pictures, `Conveyor` with a staircase and depth sizes,
smeared by `DirBlur` along their angle, a label receding and swapping its last word), `taglines` (the hero picture on a
long pull-back with a drift, two imperatives, a push into the cut), `end` (the spin-in again, the close). Slots:
`src/ad.ts`.

## type-explainer

One short sentence at a time on a white page; pictures and the mark stand in for words, and every seam is made of
content. Seven acts on whole bars at 90 BPM (25 s): `open` (the name as one giant word with a band of the accent running
through it; the mark arrives as the next word with the name re-set smaller in one frame; then what it is, said at the
pace of speech: uneven onsets, `Words` `arriveX`, the line drifting as it builds, leaving right with its words gone
last to first), `pain` (the whole line in one frame coming into focus as it drifts, a hold, an ease-in exit the same
way), `promise` (the picture opens as a pill after the first half; the second half is appended with a one-frame
re-centre and re-scale inside a running push; the pill grows into the cut), `picture` (the same picture full bleed,
the name over it), `system` (the film's one soft wipe, `Wipe` feather from the right; the mark stands between the
halves, a push centred on it, the words float off), `grid` (the product's parts born round the mark in one radial
wave, three labels one a second), `end` (the mark steps into the lockup, the close settles into focus). The sentence
role is the calm family's line: small and airy by size, weight and white space (84 px at the face's own letter fit,
never tracked wide): 3-5 words a line. Slots: `src/explain.ts`.

## The grammar every template keeps

When you retime a template or move it into a direction's world, keep these; they are what makes the floor read as
designed rather than assembled:
- **Acts on bar lines.** `BEATS` are whole bars, so with the track in every act line lands on a downbeat
  (grid-check structural-on-music); the first act starts on frame 0 and its cues on the track's first downbeat; a
  cue placed in beats never shortens a read (`line()` keeps the hold at a faster track). Retime in whole bars.
- **Speed through every act line.** Exits ease in and cut on their fastest frame; the next shot opens moving the
  same way at a matched speed (`launch`, `carry`), or the container carries across (a morph, a carry squash).
- **Type changes size through the camera:** a push through the line (`fx/TypePush`, 1.0-2.2× on `E.cam` over
  45-60 f, following the reading point, crossing the frame's edges), never a one-frame snap; other scale changes hide
  inside one frame with a short defocus (`Defocus`), on a word or a kick.
- **Hero lines enter crisp, body lines calm** (`TypeLine` presets `crisp` and `calm`, `crispWords()` / `calmWords()`
  for `Words`): words rise and sharpen while they resolve, never appear in place; an end card never fades in letter
  by letter.
- **The promise line holds its object** (`kit/inline.tsx` `ObjectLine`): the product's mark, a glyph, a chip or a small
  UI piece at cap height inside the sentence, swapping in 6 f; **the claim sits on the accent** (`fx/TypeClaim`): cap
  16 % of the frame or more, flush left at 3 %, −0.04 em, semibold.
- **Nothing holds still.** Every hold creeps or counter-creeps and accelerates into its exit (`creep`, `counterCreep`,
  `intoCut`).
- **Cadence accelerates into payoffs:** notices arriving faster, a count that grows then jumps (`growthSteps`), a
  backspace that repeats faster (`TypeOn erase`), a ticker on hard steps.
- **One object, many states.** Continuity comes from the container (the card that becomes the output, the disc that
  becomes the record, the row that becomes the pill, the full stop that becomes the first ring), never from a dissolve.
- **UI arrives front-loaded** (`E.snapOut`); one springy landing at most, never on type.
- **Real marks by default.** When the film declares integrations, sources or models, the rings, walls, tickers and
  chips show their real marks (`kit/logos.tsx`, `scripts/logos.mjs`, `references/brand-and-color.md` §1b); the text
  pill is the fallback until a mark is fetched; generic glyphs only for generic actions.
- **Slots stay slots until the product's own words and data replace them:** the content file's marker fails lint
  until then, and every string the picture shows comes from that one file.
