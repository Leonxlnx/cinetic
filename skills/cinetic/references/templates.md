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

A template is the floor, never the film. It carries structure, shot types, timing, transitions, choreography, grammar
and the level of craft and detail; the product, the words, the brand, the direction, the devices and the layouts are
the film's own. Fill the slots, rebuild the product's own screens where the kit stands in, deal the direction and
retell the floor in its world (its grounds, light, type and signature replace the template's), then cut it to the
track: `track.py grid` moves every `b()` onto the music. Every template's end card is whole about 1.2-1.8 s before the
last frame and creeps while it holds; its `TAIL` reads the track's ending, so a stop ending (`track.py edit --end
stop`) adds the gap to its one element and 1 s rings out after it.

**A film made from a template differs from it in devices, layout and content; it never copies its shots.**
- Devices: `src/deal.ts` deals each act's device from the product's name and never replays the template's own deal: at
  least half the slots it deals differ from `FLOOR`, what the unnamed scaffold plays (pins aside). The capability reel
  plays one sequence, so its direction alone sets its acts apart.
- Content: every word and number comes from the product through the content file's slots; lint and `copy-check.py --ui
  src` fail a slot left as it came.
- Layout: the direction retells every act in its world, and before delivery the film passes `like.py guard` against
  the floor as it would against a clip: scaffold the template again as it comes beside the film (`bash
  scripts/new-film.sh ../floor --template <name> --link-modules "$PWD/node_modules"`), render it there (`npx remotion
  render Film out/floor.mp4 --muted --scale 0.5`), then `python3 scripts/like.py guard --film out/film.mp4 --clip
  ../floor/out/floor.mp4` (`references/clip-match.md` §5). A frame that keeps the floor's layout fails it.

## Which one

| Template | Length | Use it when | Shape |
|---|---|---|---|
| none (the starter) | 15-45 s | a launch film whose idea is its own device: most films | the dealt direction's skeleton |
| `update` | 15-23 s | "vX is out": 2-4 changes to show | the version as the set, one lit product moment per change on one camera strip with the film's one 3D turn, the version whole at the payoff, the end card with the version; each slot deals one of two devices |
| `ui-walkthrough` | 25-40 s | the product's flow is the story: an input goes in, the product does visible work, an output comes out | promise, the input becoming the output (the signature), proof, a claim, the flow in steps, the output live, the end card |
| `capability-reel` | 15-25 s | the product's breadth is the story (sources, formats, integrations), or a launch film needs its close | a ring of sources, one real record, a statement, a capability ticker, the big claim on the accent, a transition out of its full stop, the end card |
| `camera-teaser` | 20-25 s | a dark, fast teaser of a product's screens where the motion is the camera's: whips, pushes, one 3D turn over one layout per shot | the request box arriving tilted in the light, a whip into its close-up and the send button, the window streaming code under the one 3D turn, the proof in depth with the real marks of what it works with, the page with a modal toast, the stages, the mark; each act deals one of two or three devices |
| `prompt-run` | 18-20 s | the product does work from a request (an agent, an assistant, a generator): what goes in is a sentence, what comes out is done work | a pill among the real marks of the tools it connects, the label swapping on the kick, the request box out of the pill, the request typed, a punch-in and the send, the steps it runs under one 3D turn, the result, the lockup; each act deals one of two or three devices |
| `social-ad` | 17-22 s | a short ad for a feed: everything the product holds, fast (things people save, make, buy, plan), shown as the product's own content built in code, or as real photographs where that content is pictures (never drawn), the motion is the energy | the opener in one confident move spreading onto a stack of what it holds, the mark, the claim inside a field of that content on its accent pill, a label that rolls its last word over moving content, two imperatives, the lockup; each act deals one of two or three devices |
| `type-explainer` | 20-30 s | the idea is simple to say and the words carry it: an explainer on a clean lit page, quiet in its small, airy type and crisp in its word pace, the product's own screen built in code as its one picture | the name with its mark as the next word, what it is in a confident line move, the problem, the promise with the product standing in it and becoming the shot, one wipe, the mark between the words becoming the hub of the product's parts, the close; each act deals one of two or three devices |

The test: say the film in one sentence. "You give it X and get Y" is a walkthrough; "It works with everything and
returns anything" is a reel; "Here is what changed" is an update; "It is X, it fixes Y, and these are its parts" told
in words is an explainer; "Here is everything it is for, fast" over the product's own content is an ad; "Ask it, it does the steps, here is the result" is a prompt run (a
walkthrough when the user does the steps); the same story as a dark, fast tease where the camera does the moving is a
camera teaser. When none fits, start from the starter. A launch
film may end on the reel's close (rebuild its acts after your own) or open on the walkthrough's first three acts.

## update

"vX is out", told by the product itself. One camera carries the whole film along one strip, so every act line is a
velocity seam. Acts on whole bars at 120 BPM (2-4 changes: 14-22 s plus a 1.5 s tail; the name lands on the last bar line and the tail holds it): `hook` (the name over the version
as giant numerals cropped by the frame: the last numeral rolls from the old value, or the new version rises out of a
mask once the name is read), one `change` per change (the camera whips onto the product's surface, lit and tilted in
the film's light, `Lit`; the product does the new thing on its contact frame; one plain sentence of 2-6 words on its
dealt move and exit, `acts/type.tsx`, with the real mark inside it where the change names another product: `"[]"`,
`logo`, `logoName`), `payoff` (the camera pulls back over every change as the version swings in, or the last change
recedes out of focus as the version rises in front of it; the version fitted and centred so it reads whole), `end`
(the version steps back to the upper right over the mark and the name, or settles after the name as one lockup). The
film makes one 3D camera move (a yaw into the second change or a pitch over the payoff); the ground is the key wash
alone. Each slot deals one of two devices per film from the name (`src/deal.ts`, template.json "slots"). Slots:
`src/update.ts` (the version, the one before it, the changes and their moments: approve, chat, count, budget or a
dense table; an approve change's `photos`, the real pictures its review approves, else they show as files).

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
the product the input lives on (the card's tile and the field's lead; `scripts/logos.mjs`); `photos.people` are real
portraits of the feed's people (the rows, the pill, the quotes, the two beside the card), `photos.results` the found
items' pictures, `photos.input` the input's own picture when its source has no mark: empty, people show as initials.
The first of proof, pick or field stands on the tilted tint (`fx/Grounds` `tint`).

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
capability that is another product shows its mark on the ticker's tile; `record.photo` is the record's real picture
(else the file it is). The statement's page carries the tilted wash.

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

One object through many states; the product's UI tells the story. Six acts on whole bars at 120 BPM (19.6 s with a 1.6 s
tail): `pill` (the label landing inside a pill among app-icon tiles of the tools it really connects, their real marks;
it drops out before the kick, the second label lands on it, the pill re-fits on a glide and its rim turns; a cubic-in
wind-up), `ask` (the request box, kit `Composer`, out of the pill; the line over it; the request typed fast with a
burst, `TypeOn` stream `rates` and `skip`; the send button arming), `click` (a punch-in blurred on both sides on
continuous ramps, the film's one declared snap; the close-up breathing back; the send swells, `swellState`; an ease-in
whip up), `run` (under the film's one 3D turn: the request as a `Bubble` with the people it is for, `AvatarStack`, a
status with `ThinkingDots`, the steps gliding in solid on an accelerating cadence, spinners turning to checks, the last
still running), `done` (the result), `end` (the lockup, about 1.6 s). Every script line lands on the film's dealt voice
(`TypeLine`: mask, land or fall); the grounds are clean lit pages. Each act deals one of two or three devices per film
from a seed (`src/deal.ts`, template.json "deal": e.g. the tools ringing, docking inside the pill or on a far wall; the
iris onto the accent or the pill stretching into the box; the run in a lit panel, a depth stack or beside the product's
dense screen; the result as a morph or the claim on the accent), one colour event per film. Slots: `src/run.ts` (with
`tools`, the slugs of the real marks; `photos.people`, real portraits of the people the work is for, else their
initials; `photos.result`, the result's picture when it is one). The request box stands on the tilted tint.

## social-ad

A short ad, every seam inside a motion, the product's own content built in code carrying the colour: its items as
content tiles, its dense screen, the real marks of what it works with; where what people keep in it is pictures (a
recipe, an outfit, a room, a trip), the cards are real photographs (`ad.ts` `pictures`: the product's own, the user's,
or free ones that need no credit, `scripts/assets.mjs`), never drawn. Six acts on whole bars at 150 BPM,
9 in the house plan; every exit cue waits for its line's read and an act grows a bar only where a read needs it
(`ACT_BARS`; 17-22 s at 104-150 BPM): `open` (the opener as one confident `TypeLine` move, land or build, spreading
apart into the cut; "Save" and its last word carry on outward either side of a hero tile while the items are dealt
onto it, `pileState`, or fan out behind it, `fanState`; the words leave once read and the stack takes a second beat),
`brand` (the mark spinning in over the stack receding into the far plane, `spinInState` and `SpinBlur`, or the hero
tile growing into the app's own tile; the name sliding out; the lockup rising into the cut), `field` (the claim rising
out of a mask inside kit `ContentWall`, `ContentRing` or a `DepthStack` of a few large tiles, its last word on the
accent pill growing round it in 10 f; a type push into the pill; the field leaving up), `label` (a chip whose last word
rolls once over two `Conveyor` streams, a `ContentTicker` or the product's `DenseScreen` with a gliding lens; the rush
out to the right), `taglines` (beside the product's screen as a `Lit` panel on the film's one 3D turn, `fall` with a
`drop` exit, or as the claim on the accent, `AccentClaim`; a push into the cut), `end` (the spin when the brand did not
spin, or the mark and the name rising out of a mask; the close on `glide`). Each act deals one of two or three devices
per film from the name (`src/deal.ts`, template.json "deal"), so no two ads run one fixed sequence. Slots: `src/ad.ts`
(with `items`, `world` and `integrations`, the slugs of the real marks).

## type-explainer

One short sentence at a time on a clean lit page; the product and the mark stand in for words, and every seam is made
of content. Seven acts on whole bars at 90 BPM, 9 in the house plan, an act growing a bar where a read needs it
(`ACT_BARS`, `GROWN` says why): `open` (the name: one giant word with an accent band and a pull-back as the mark
arrives as its next word, the name and mark as one line pushed through onto the mark, or the name landing from x1.35,
crisp in 8 f; then what it is in the dealt voice: said at the pace of speech on the crisp entry, risen out of a mask,
or built word by word; it leaves right at full ink into a cut at speed), `pain` (landing oversized in the accent, a type
push through it, `fx/TypePush`, or in front of the real marks of the tools it names in a `DepthStack`), `promise` (the
product opening in the line as a pill that looks into its screen, after a roll through the real marks of what it works
with, or with the camera pushing through the line into it; the second half appended; the pill grows into the cut),
`picture` (the product's own `DenseScreen` as a `Lit` panel on the film's one 3D turn or in a depth stack; it recedes
out of focus as the mark and the name arrive), `system` (the one wipe: the feathered `Wipe`, the push-wipe parked by
the mark until the second half, or a lit sheet; the mark between the halves, a push in on it, the words folding into
it on the cut), `grid` (the product's parts as content tiles round the mark: a radial wave, a ring or three planes;
three read one a second, nearest the hub), `end` (the lockup with the close on `mask`, or the claim on the accent,
`AccentClaim`; about 1.5 s of hold with a creep and a drift). The sentence role is the calm family's line: small and
airy by size, weight and white space at the face's own letter fit, never tracked wide: 3-5 words a line. Each act deals
one of two or three devices per film from the name (`src/deal.ts`, template.json "deal"). Slots: `src/explain.ts` (with
`integrations`, the slugs of the real marks). The grid of parts stands on the tilted tint.

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
  UI piece at cap height inside the sentence; with several, they roll one slot up as one strip over 16 f on
  `E.glideOut`, every 48 f (60 fps frames); **the claim sits on the accent** (`fx/TypeClaim`): cap 16 % of the frame or
  more, flush left at 3 %, −0.04 em, semibold.
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
  until then, and every string the picture shows comes from that one file (`copy-check.py --ui src` fails a slot left
  in brackets or a placeholder word).
- **Real pictures, never drawn.** Where the structure shows people, places or things, the content file has a picture
  slot; real photos fill it with the studio finish (`fx/Pictures`), and an empty slot falls back to the product's own
  UI (initials, files, its tiles), never a drawn face or object (`lint-film` and the layout audit fail one).
- **One colour ground.** Where the structure is a lit page of parts, one act stands on the tilted tint (`fx/Grounds`
  `tint`, `fx/Washes` `tilted`): the accent's colour gathering along one edge; the other grounds stay clean.
