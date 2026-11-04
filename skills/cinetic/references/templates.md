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
- Layout and the last films: the direction retells every act in its world. Every template that deals ships its floor
  as `floor.json` (the unnamed scaffold's deal, measured once), and `node scripts/film-diff.mjs` holds the film to at
  least half its slots off that floor and apart from the last three films (ground, voice, signature, end card, and a
  move set shared at most 25 %): no scaffold render in the film's hour.
- The place: a world is its kind and its hue (the accent's, through fx/world's window per world; launch-simple's own
  looks take the accent's hue as it is). Two films in one world at hues under 40 degrees apart stand in the same place
  even under two ground families: `deck.py` deals away from the last three films' worlds at this film's hue (a deep
  field at a blue accent after one at a green accent is free) and writes the world and its hue into its deal history;
  `film-diff.mjs` fails the repeat and `--record` keeps both in the film history.

## Which one

| Template | Length | Use it when | Shape |
|---|---|---|---|
| `launch-simple` (the default launch) | 15-30 s | most launch films: a product shown doing its thing to one case, point by point | 8-12 house scenes dealt at random from the scene bank (`src/scenes`, 1.5-3 s each, the lockup 2.5 s; two big at least; 75 % or more from the bank, one scene of your own at most, a redraw only with its reason) into the acts of `src/spine.ts` (one sentence as 3-5 acts, one case, one element handed on at every scene change), varied film to film; big lines alone on clean ground (a 9 % cap, read in 1.2 s) for the promise and one point; handovers varied (no kind over 40 %); presses with a real pointer; a designed palette (one accent, white, near-black, the accent field), one ground a film (one flood at most); the lockup a house scene; the direction you pick from the deck's three seeds the deal and the type pairing (`deck.py --direction <id> --why` writes `src/dealt.ts`) |
| none (the starter, `--template none`) | 15-45 s | a launch film whose idea is its own device | the dealt direction's skeleton |
| `update` | 8-20 s (two changes run 9-12 s) | "vX is out": 2-3 changes, each understood at a glance | the hook (the name and the version on a clean ground, moving from the first frame), then each change as its line alone on the film's one ground (big, whole or in 2-3 chunks, read in 1.2 s) and one house scene dealt from the scene bank that proves it (never one twice, two of the last film's at most), 2-4 s a change (a typed one 3 s, no scene over 3 s) (a pointer pressing send into a porthole holding the change's picture as its line parts round it, a request typed at macro scale, notifications stacking in depth on the accent field, a page flown, pictures pumped into a row in depth ...), at least one big scene, two scenes joined on one element where they can; the mark pulls back into the lockup (one snap, the lockup whole to the last frame) and the version lands on the bar line; every length in `src/deal.ts` LIMITS, a plan outside them fails; colours from the brand or a dealt palette |
| `ui-walkthrough` | 25-40 s | the product's flow is the story: an input goes in, the product does visible work, an output comes out | promise, the input becoming the output (the signature), proof, a claim, the flow in steps, the output live, the end card |
| `capability-reel` | 15-25 s | only when the brief asks for a wall of the product's breadth (sources, formats, integrations); never the default | a ring of sources, one real record, a statement, a capability ticker, the big claim on the accent, a transition out of its full stop, the end card |
| `camera-teaser` | 20-25 s | a dark, fast teaser of a product's screens where the motion is the camera's: whips, pushes, one 3D turn over one layout per shot | the request box arriving tilted in the light, a whip into its close-up and the send button, the window streaming code under the one 3D turn, the proof in depth with the real marks of what it works with, the page with a modal toast, the stages, the mark; each act deals one of two or three devices |
| `prompt-run` | 18-20 s | the product does work from a request (an agent, an assistant, a generator): what goes in is a sentence, what comes out is done work | a pill among the real marks of the tools it connects, the label swapping on the kick, the request box out of the pill, the request typed, a punch-in and the send, the steps it runs under one 3D turn, the result, the lockup; each act deals one of two or three devices |
| `social-ad` | 17-22 s | a short ad for a feed: everything the product holds, fast (things people save, make, buy, plan), shown as the product's own content built in code, or as real photographs where that content is pictures (never drawn), the motion is the energy | the opener in one confident move spreading onto a stack of what it holds, the mark, the claim inside a field of that content on its accent pill, a label that rolls its last word over moving content, two imperatives, the lockup; each act deals one of two or three devices |
| `type-explainer` | 20-30 s | the idea is simple to say and the words carry it: an explainer on a clean lit page, quiet in its small, airy type and crisp in its word pace, the product's own screen built in code as its one picture | the name with its mark as the next word, what it is in a confident line move, the problem, the promise with the product standing in it and becoming the shot, one wipe, the mark between the words becoming the hub of the product's parts, the close; each act deals one of two or three devices |

The test: say the film in one sentence. "You give it X and get Y" is a walkthrough; "It works with everything and
returns anything" is a reel; "Here is what changed" is an update; "It is X, it fixes Y, and these are its parts" told
in words is an explainer; "Here is everything it is for, fast" over the product's own content is an ad; "Ask it, it does the steps, here is the result" is a prompt run (a
walkthrough when the user does the steps); the same story as a dark, fast tease where the camera does the moving is a
camera teaser. When none fits, use `launch-simple` (the default launch), or `--template none` for the starter's own acts. A launch
film may end on the reel's close (rebuild its acts after your own) or open on the walkthrough's first three acts.

## launch-simple

The default launch, assembled from the scene bank (`src/scenes`: house scenes of 1.5-3 s, each one moment that shows
a point and is understood) and played as a spine (references/spine.md). You write `src/spine.ts` FIRST: the sentence,
the case from the brief, one element, 3-5 acts of 1-3 scenes, 8-12 scenes in all; each scene its form and its content
(`props`: the case's own words, the brief's own pictures; its house scene is dealt), the lines
and the one fact under the lockup. Then `src/content.ts` fills whatever a scene's props leave out. The template's
`README.md` walks through it. What it carries for you:
- **Scenes dealt, varied.** Every picture scene is dealt at random (`src/bank.ts` `dealScene`: a weighted draw seeded
  by the deck's direction or the name and the last films' scenes), pulled toward its act's verb (asks -> macro-type,
  glass-prompt; writes -> page-fly; sends, presses -> decode-title, porthole-line; fills, pays -> toast-stack,
  key-glow; sells -> word-cards; shows -> photo-river, ring-dive; connects -> orbit-chips; the lockup from
  blobs-to-mark, line-to-wordmark, word-build-badge, bar-flood) and toward big scenes, away from the last films'
  scenes; only one whose needs the film has (pictures, partner marks, a price table), never one the film already plays,
  two of the last film's at most. 75 % of the picture scenes or more come from the bank: one scene of your own at most
  (`own: true`, `seconds` 1.5-3, drawn in `src/product.tsx` `OWN`); a dealt slot is redrawn (`bank`) only with its
  reason (`why`), printed in the plan. grid-check's `deal-*` rules fail the rest. Two big scenes at least (the plan
  print stars them).
- **Each point, then its scene.** A line alone sits on clean ground (white, near-black or the accent field: never over
  a blurred picture) for the promise and, once in a middle act, a point its key word then becomes. It is big (a cap of
  9.2 % of the frame, the claim 11.2 %, never under 7 %: a long line takes two rows) and fast (whole up to four words,
  else in two or three chunks, never typed word by word; read in 1.2 s at most, then its scene). The scenes carry the
  other statements themselves (a decoding title, a two-line statement parting round a porthole, a type poster) and the
  product's own words. A press is a real pointer on a button that reads (decode-title's at 1.22 x its title's cap).
- **Fast, on the track.** Every scene runs 1.5-3 s, a scene of your own too (the lockup 2.5 s): the timeline refuses a
  longer one by name and length, and fits the body to the track as a whole (each house scene at most 5 % faster, up to 1.2 x slower, the
  changes on the 8th, the acts on their downbeats where the lengths allow, the body on whole bars). The plan print gives
  the scene count, the median and longest shot, each line's read and cap, and every seam's kind.
- **Every change carried, the seams varied.** `HANDOVER_PLAN` deals each change a handover the stage draws: the form
  table's recipe first, then a flight, a grow, an iris or a porthole (from an element in sight), a swell, a converge
  last; no kind on more than 40 % of the changes, pinned or not. The element is never left a speck on an empty ground
  (forensics speck): the surroundings overlap at the cut, a line's parting words stay until it.
  `acts/bank.tsx` carries the element as a patch of the scene itself, scaled like a picture, the scene cutting its own
  copy out while it flies; the surroundings fade under the leaving element and arrive round the landing one, and the
  ground holds through the change. `grid-check.ts --part spine` and `forensics.py --spine` hold it.
- **A designed palette.** `src/palette.ts`: one accent (the deck's, else the brand's, else a house accent dealt by the
  seed when the tokens still hold the starter's stand-in), a white ground, a near-black in the accent's hue and the
  accent as the one solid field. The film keeps one ground (`FILM_GROUND`, the value most of its scenes were designed
  on) and paints every scene on it (`paletteOn` keeps its contrast), changing it once at most on purpose (the first
  colour field, then back; grid-check `grounds`). Never a tinted wash, never a scene's demo colours.
- **One subject at a time.** Consecutive scenes about the same picture (a scene's `subject`) are one beat: the timeline
  refuses one over 4.5 s (grid-check `subject-run`).
- **The end.** The lockup is a house scene (the mark born from two blobs, a line splitting round the wordmark, a bar
  flooding the frame) with the brand's mark (`scripts/brand.py`; an invented brand gets its own); the one fact arrives
  under it as its name is read (a cap of 3.6 %: legible, or left out), and the whole creeps and is lit to the last frame
  (1.5-2.2 s from its mark): never a fade to blank (grid-check `lockup-end`, forensics `end-blank`).
- **Sound cut to the picture.** `src/sync.ts`: every handover by its kind, each scene's own sounds (the keys, the
  click, the toasts, the snaps) on its fitted clock, one hit on the lockup; `npm run sound` mixes it over the fitted
  track.

## update

"vX is out", told by the product itself (`references/update-films.md`), assembled from the scene bank (`src/scenes`):
the hook (`hook`: the version's pill lands beside the name, `roll`s from the old numerals, or cuts on as a `tag`),
then each change in the order the session meets it as its line alone on the film's one ground (big: a cap of 8 % of
the frame; whole or in 2-3 chunks, `voice` whole / chunks / track; in and read in 1.2 s) and the house scene that proves
it, 2-4 s a change, a typed change 3 s, no scene over 3 s (`src/deal.ts` HERO_META and `sceneFit`: porthole-line for a press that opens a picture,
decode-title for a short press, macro-type or glass-prompt for a typed request, toast-stack for a list, page-fly for a
page, photo-river for 8+ pictures, photo-counters for a figure on a picture, orbit-chips for 3+ partners), at least one
big scene a film; where a scene hands on the very element the next takes over (macro-type's send button, pressed by
porthole-line's pointer) the two join on a match cut and the second sets its own line. Every press is a real pointer;
text stands only on a clean ground; the other changes come in through a defocus (the cut inside the blur) and a card's
line dissolves off over its scene. The end is always the mark-pullback (one snap to the lockup), the version landing
under the lockup as a pill on the bar line that ends the body (STRUCTURAL), the lockup whole and alive 1.5-2 s after it;
the hook, the scenes with a rest and the pull-back's rest take the time that bar line leaves, never the cards. Every
length is `src/deal.ts` LIMITS: `src/timeline.ts` throws on a plan outside them (grid-check, the Studio and the render
stop and name what to shorten). Colours: the brand's (`src/brand/tokens.ts`) or a palette dealt per film
(`palette`: a near-black or a white ground and one accent; never a tinted wash, never the starter's green, never a
scene's demo colours), every scene on the film's base, the accent field (toast-stack's flood) its one change. The deal (`src/deal.ts`, template.json "slots"):
palette, hook, voice (the lines' move), set (their size) and the scenes (the deck's `src/dealt.ts`, else the name's).
Slots: `src/content.ts` (`scripts/content.mjs --brief BRIEF.md --fetch --force`) and `src/update.ts` (the version, the
one before it, the session and its case, the changes: `words`, `key`, `verb`, the screen and its moment `tap` /
`type` / `fill` / `count` / `page`, and `picture`, `photos`, `logos`, `scene` when the change has them). Print the
plan: `npx tsx -e "import { PLAN_LINE } from './src/timeline'; console.log(PLAN_LINE)"`.

## ui-walkthrough

The UI tells the story, so the viewer always knows what the product does; six short lines say what each step
means. Ten acts on whole bars at 120 BPM (37 s): `open` (the promise, its last word snapping the line x2.2 in one frame), `card`
(the user's input as one tilted card rising; ONE hidden-cut frame of scale, tilt and a tinted
swell makes the same card the output, which then builds its three steps), `proof` (notices piling up, `fx/Stack`),
`claim` (its first word giant, then a one-frame snap out to the line), `field` (a held backspace, the value typed in
bursts, the hand rising onto the button, results developing, a pull-back about the upper third), `feed` (a hard flick
smeared by `DirBlur` while a count accelerates into its total, landing on the item that matters), `insight` (the item
collapses into a pill), `pick` (a zoom onto the chosen row, which collapses into a progress pill while the output
builds), `page` (the output flies up and flattens), `end`. Slots: `src/walk.ts`; `input.source` names the real mark of
the product the input lives on (the card's tile and the field's lead; `scripts/logos.mjs`); `photos.people` are real
portraits of the feed's people (the rows, the pill, the quotes, the two beside the card), `photos.results` the found
items' pictures, `photos.input` the input's own picture when its source has no mark: empty, people show as initials.
The first of proof, pick or field stands on the tilted tint (`fx/Grounds` `tint`). The stage flips paper <-> slate at
most twice, both at the claim (`mixed`: paper until the claim, the slate from it on).

## capability-reel

Breadth, then one real proof, then the claim and the name; state changes are hard steps, only the camera and the
containers ease. Seven acts on whole bars at 120 BPM (21 s): `sources` (one line inside a ring of sources; the ring tightens on
the paper as the inner ring closes into a disc), `record` (the disc grows into one real record, a lit card on the same paper; a whip pan opens its fields; the page
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
`picture` (the product's own `DenseScreen` as a `Lit` panel on the mid stone, a deeper place in the page's light, on the film's one 3D turn or in a depth stack; it recedes
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
