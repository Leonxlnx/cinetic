# Film templates

A template is a whole film's structure laid over the Remotion starter: its timeline (acts in beats, every state
change a CUE, the declarations), one act per shot type with the choreography between them, the sound plan and a
content file of slots. `bash scripts/new-film.sh <dir> --template <name>` scaffolds from it (`assets/templates/<name>`;
`template.json` lists the files it copies and the starter acts it removes, its pace and tempo become the defaults).
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
| `update` | 8-20 s | "vX is out": 2-4 changes to show | the version as the set, one product moment per change, the payoff, the end card with the version |
| `ui-walkthrough` | 25-40 s | the product's flow is the story: an input goes in, the product does visible work, an output comes out | promise, the input becoming the output (the signature), proof, a claim, the flow in steps, the output live, the end card |
| `capability-reel` | 15-25 s | the product's breadth is the story (sources, formats, integrations), or a launch film needs its close | a ring of sources, one real record, a statement, a capability ticker, the big claim on the accent, a transition out of its full stop, the end card |
| `type-explainer` | 20-30 s | the idea is simple to say and the words carry it: a calm explainer on a white page, little or no product UI | the name as a giant word, what it is said at the pace of speech, the problem, the promise with a picture inside it that becomes the shot, one soft wipe, the mark between the words becoming the hub of the product's parts, the close |

The test: say the film in one sentence. "You give it X and get Y" is a walkthrough; "It works with everything and
returns anything" is a reel; "Here is what changed" is an update; "It is X, it fixes Y, and these are its parts" told
in words is an explainer. When none fits, start from the starter. A launch
film may end on the reel's close (rebuild its acts after your own) or open on the walkthrough's first three acts.

## ui-walkthrough

The UI tells the story, so the viewer always knows what the product does; five short lines say what each step
means. Ten acts on whole bars at 120 BPM (37 s): `open` (the promise, its last word snapping the line x2.2 in one frame), `card`
(the user's input as one tilted card rising while the ground turns; ONE hidden-cut frame of scale, tilt and a tinted
swell makes the same card the output, which then builds its three steps), `proof` (notices piling up, `fx/Stack`),
`claim` (its first word giant, then a one-frame snap out to the line), `field` (a held backspace, the value typed in
bursts, the hand rising onto the button, results developing, a pull-back about the upper third), `feed` (a hard flick
smeared by `DirBlur` while a count accelerates into its total, landing on the item that matters), `insight` (the item
collapses into a pill), `pick` (a zoom onto the chosen row, which collapses into a progress pill while the output
builds), `page` (the output flies up and flattens), `end`. Slots: `src/walk.ts`.

## capability-reel

Breadth, then one real proof, then the claim and the name; state changes are hard steps, only the camera and the
containers ease. Seven acts on whole bars at 120 BPM (21 s): `sources` (one line inside a ring of sources; the page darkens as the
inner ring closes into a disc), `record` (the disc grows into one real record; a whip pan opens its fields; the page
grid is the card's own and two accent cells hop on the kicks), `statement` (a hard cut on a kick to a light card that
squashes round its line, `Resize` carry, and counter-creeps into a zoom-out), `ticker` (`MaskList` and an icon tile,
a hard step every 10 f), `claim` (the film's one colour event: two fragments, the first pushing up and dimming as the
second rises, the full stop its own square), `rings` (square rings born from that stop, `Radiate` with `bornAt`, then
the flood), `end` (the name pops, the rest types, the tagline takes its place). Slots: `src/reel.ts`.

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
role is small and airy (about 84 px, tracked out +0.05 em): 3-5 words a line. Slots: `src/explain.ts`.

## The grammar every template keeps

When you retime a template or move it into a direction's world, keep these; they are what makes the floor read as
designed rather than assembled:
- **Acts on bar lines.** `BEATS` are whole bars, so with the track in every act line lands on a downbeat
  (grid-check structural-on-music); the first act starts on frame 0 and its cues on the track's first downbeat; a
  cue placed in beats never shortens a read (`line()` keeps the hold at a faster track). Retime in whole bars.
- **Speed through every act line.** Exits ease in and cut on their fastest frame; the next shot opens moving the
  same way at a matched speed (`launch`, `carry`), or the container carries across (a morph, a carry squash).
- **Scale changes hide inside one frame** with a short defocus (`Defocus`), on a word or a kick.
- **Nothing holds still.** Every hold creeps or counter-creeps and accelerates into its exit (`creep`, `counterCreep`,
  `intoCut`).
- **Cadence accelerates into payoffs:** notices arriving faster, a count that grows then jumps (`growthSteps`), a
  backspace that repeats faster (`TypeOn erase`), a ticker on hard steps.
- **One object, many states.** Continuity comes from the container (the card that becomes the output, the disc that
  becomes the record, the row that becomes the pill, the full stop that becomes the first ring), never from a dissolve.
- **UI arrives front-loaded** (`E.snapOut`); one springy landing at most, never on type.
- **Slots stay slots until the product's own words and data replace them:** the content file's marker fails lint
  until then, and every string the picture shows comes from that one file.
