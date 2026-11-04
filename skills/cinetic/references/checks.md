# Checks: what each script measures and what it takes to pass

Every gate in the workflow is a script you run. This page lists them in the order a film meets them, with the rules
each one applies, the levels (error / warn / info) and the flags that matter. Thresholds are house defaults; where a
check reads a declaration from `timeline.ts` (`LOOK`, `SEAMS`, `STEPPED`, `FLASHES`, `CAMERA_BLUR`, `END`, `REVEAL`,
`SPRING_CLASS`, `STRUCTURAL`, `SALIENCE`), the declaration turns a designed artifact into craft instead of a fault.

Contents: 1. The order · 1b. copy-check · 2. grid-check · 3. lint-film · 4. layout-audit · 4b. detail-pair ·
5. forensics · 6. look-audit and the floors · 7. grammar-score · 8. measure-speed and the render wrappers · 9. palette ·
10. Sound checks · 11. The test suites

## 1. The order

The default path runs the fast gates; each takes seconds to a minute on a 30 s film. A gate that costs more than
5 minutes on a 30 s film is advisory by default.

```
python3 scripts/copy-check.py TREATMENT.md                    # the script, before any picture work
node scripts/film-diff.mjs                                    # film.json: the picks differ from the last three films
npx tsx scripts/grid-check.ts src/timeline.ts                 # after every timeline edit (beats, seams, the grid, the spine's SPINE_PLAN)
node scripts/lint-film.mjs src [--strict]                     # every build step
node scripts/precheck.mjs [--ship]                            # before every still or render: imports, frames, timing, kit, the cast, the case, fit
python3 scripts/copy-check.py --ui src                        # the product's UI strings: real words, no slot, no sample
npm run cues                                                  # out/cues.json (declarations, copy, events)
node scripts/frames.mjs end                                   # the ending as stills, early: the lockup must read
bash scripts/render.sh Film out/draft.mp4 --draft --max-min 9   # the whole film, half size, the track under it; rerun until exit 0
npm run gates                                                 # forensics --grammar-only on the draft, the UI strings, the marks
bash scripts/layout-audit.sh Film --cues --scale 0.5          # placement, overlaps, text cut by the frame in the product beats
python3 scripts/forensics.py out/draft.mp4 --cues out/cues.json --grammar-only     # motion, seam, film and sound gates, small decode
python3 scripts/forensics.py out/draft.mp4 --cues out/cues.json --seams            # the seam checks alone, seconds
python3 scripts/forensics.py out/draft.mp4 --cues out/cues.json --spine            # the element in its box across every handover, swaps, the loop
python3 scripts/look-audit.py out/draft.mp4 --look                                 # the default look: no flat void, no plain card slab
node scripts/logos.mjs check                                  # a film that shows other products' marks
node scripts/frames.mjs sheet --from out/draft.mp4            # the contact sheet for the director pass (16 tiles, seconds)
bash scripts/render.sh Film out/film.mp4 --max-min 9          # the master by 70 % of the budget; rerun until exit 0
python3 scripts/forensics.py out/film.mp4 --cues out/cues.json --json out/qa/forensics.json   # full, on the master only
node scripts/film-diff.mjs --record                           # after the ship gate: the film joins the history
```

**What a ship needs (the default review, `references/review-loop.md` §1):** copy-check (the script and `--ui src`,
`--final` on the master, `--ocr` on full-size held stills: half-size stills hide a screen's small strings), lint `--strict` and grid-check clean (its `beats` rules: type-only beats at least 15 % of the
shots and two a film, a line over a picture on at most 40 % of the beats, the first line by 1 s, in a film that
declares its beat plan; its spine rules in a film that plays the spine: one action in 3-5 acts, the element carrying
most scene changes, one case, lines alone only at the ends, the lockup grown from the last form; in a film that declares
its look: a line alone read in 1.2 s at most at a cap of 6 % or more (the templates set 9.2 %), every scene 1.5-3 s, the lockup 2.5 s at most and
held 2 s at most after its mark, no seam kind over 40 % of five or more changes); forensics `--spine`
on the draft (`--grammar-only` runs it when the cues declare handovers) and `look-audit.py --look` on it (no flat
void, no plain card slab); precheck `--ship`; layout-audit passing with its placeholder floor and its placement gate
(statements centred 80 % of their time, in the middle band 85 %, none flush left at the top or bottom, one text-top
split at most (a line above a picture filling the rest of the frame), one split layout per 30 s); forensics passing on
the master (its seam checks: every hard cut carries a device, at most two ground flips, the most-used seam kind capped,
a spine handover counted by its own kind); `logos.mjs check` (current marks, every brand verified on its own page within 12 months, no drawn or inline stand-in for a real company's mark: its official file through `logos.mjs get`);
`film-diff.mjs` (ground, voice, signature and end card apart from the last three films, the move set at most 25 %
shared, a template film half its slots off the floor); the end card centred, built from the last element, 2.5 s at
most, held 2 s at most after its mark and whole to the last frame (grid-check's `scene-length`, `lockup-end`; forensics `end-blank`), one ground a film changed once at most (`grounds`), one subject 4.5 s at most (`subject-run`); the ground family's tokens from `palette.py --family`; the sound gates
(`references/sound.md`); probe and check-sync (`references/finishing.md`); and the director pass with no open P0.

**Advisory (read them, never a ship gate by default):** `look-audit.py` (the floors against a flat film),
`grammar-score.mjs` (closeness to the house grammar; it rewards the template, not this film), `measure-speed.py`,
`av-audit.py` on a preview, `data-check.mjs` (fast: wrong weekdays, counts that contradict their list, counters that
should move together (a distance counting while its moving time stays frozen: `co-moving`), one photo in more than half
the beats, the case's figure changing beside its name (`case-number`) or its name misspelled (`case-name`); films declare
shoots and people in `public/cast.json`). The long review
(`references/review-loop.md` §2-§10) adds them back with the detail pass (`detail-pair.py`), the four lenses and the rubric:

```
python3 scripts/look-audit.py out/preview.mp4 --cues out/cues.json --layout out/qa/layout-Film.json --json out/qa/look.json
node scripts/grammar-score.mjs --cues out/cues.json --layout out/qa/layout-Film.json --look out/qa/look.json --forensics out/qa/forensics.json
python3 scripts/av-audit.py out/preview.mp4 --cues out/cues.json --stems out/stems --json out/qa/av.json
python3 scripts/detail-pair.py --film out/preview.mp4 --ref <frames> --pairs F:R,...
node scripts/data-check.mjs
```

A film made from a template is held apart from its template by `film-diff.mjs` against the template's shipped
`floor.json` (its unnamed scaffold's deal): no scaffold render. With a clip to match, `like.py guard --film
out/film.mp4 --clip <clip>` still renders nothing new and passes before delivery.

## 1b. copy-check (`scripts/copy-check.py`): is the script clear

Run it on `TREATMENT.md` at Step 1b, before any picture work, and again on `out/cues.json` once the timeline exists
(`grid-check.ts` runs it on `COPY` inside its `script` rule). It reads the script the way a stranger does.

| Rule | Fails when | Level |
|---|---|---|
| `what-it-is` | no line says what the product is by 3 s ("[Name] is a [plain category] for [who]." or "[Name] turns [input] into [output]."); an update film: no "[Name] [version]" by 3 s | error |
| `name` | the product's name never appears on screen | error |
| `repeats` | (COPY with ids) a line, not the first, whose words are its own picture's strings: two of them, or half its words (line<k> against ui<k>.*); the picture tells it, the line says what the picture cannot, or the pair keeps no line | warn |
| `quantity` | "every", "each", "all", "always", "automatically" in a line: a claim about many that one example on screen never proves; the picture shows three or more at once or the whole lifecycle | warn |
| `long`, `keyword` | a line over 7 words; a one-word line (a name, a version or the close excepted) | error |
| `vague` | fancy or vague words a customer would not say (unleash, reimagine, seamless, effortless, elevate, supercharge, next-level, the future of, magic, journey, unlock, empower, revolutionize, beyond, redefine, game-changing, built different, ...) | error |
| `metaphor` | a figure of speech instead of the thing (a superpower, a second brain, rocket fuel, on autopilot, a copilot) | error |
| `slogan` | "Meet X", "X, reimagined", "Less X. More Y.", "X meets Y", "made simple", "your way", a question, an exclamation | error |
| `slogan` (rhyme) | two words of a short line rhyme ("Launch by lunch."), common suffixes left out | warning |
| `brief-claim` | a line states a fact `BRIEF.md` never gives: a price or "free", a figure, a superlative or a promise ("fastest", "only", "unlimited"); only with a brief (`--brief`, else beside the script, the project root of `out/cues.json`, the working folder) | error |
| `claims` | two sentences, a list, or two clauses joined by and/but in one line; a short list (2-4) of the real marks the film shows is one claim ("Ask ChatGPT, Claude and Gemini.": the names in `public/logos/logos.json`, `marks` in the cues, a `**Marks:**` line in `TREATMENT.md` or `--marks`), when the rest of the line has a verb | error |
| `verb` | no verb (an abstract noun alone: "Total control.") | error |
| `together` | two lines on screen at once outside a declared swap | error |
| `close` | the end lacks the name or what to do (a URL, "Out now") | warning |
| `placeholder` | a line, a COPY `ui` string or (with `--ui`) a UI string that marks itself unfinished: lorem ipsum, "Placeholder", "Label text", "Your text here", a generic label alone ("Button", "Caption"), a generic noun and a number ("Item 1"); the words are `scripts/placeholders.json`, which `lint-film.mjs` reads too | error |
| `slot` | (`--ui`) a UI string still holding a template's bracketed slot ("[Product]", "[N] items") | error |
| `case` | (`out/cues.json`) one case runs from the request to the result: with the spine in the cues, its request, names or numbers (or two of the request's nouns) on screen in fewer than two acts; without it, the brief's typed request (`prompt:`) against the strings COPY shows in each act | error; warning without the spine |

It prints every line with its second, the findings, and "a stranger reads": what it is, what it does, what to do,
and a verdict. `--allow <word>` keeps a word the brand's own voice owns (record it in `BRIEF.md`); `--json` for tools.
`--ui src` reads every string the product's UI shows in the film's source (JSX text; `text`, `label`, `title`,
`caption`, `meta`, `value` and the other on-screen props and keys; lists of rows, steps and options; `fx/` and `lib/`
are house code and skipped), `--ui out/qa/layout-Film.json` the UI boxes the layout audit measured in the render; given
alone it checks only those strings.

## 2. grid-check (`scripts/grid-check.ts`)

Reads `timeline.ts` (a HyperFrames project: `timeline.js`) and checks it against the film's pace (`PACE_NAME`,
`--pace` overrides) and declarations, before anything renders.

| Rule | What it asks |
|---|---|
| `cue-grid`, `beat-whole`, `acts-on-bar`, `whole-bars` | cues on the 16th grid or carrying an `offgrid:` reason; whole-frame beats; acts on bars (in music mode: on the track's events) |
| `music-grid`, `structural-on-music` | `src/music.ts` written by `track.py grid` at this fps; `b()` follows the music; acts, the reveal and the ending within 1 f of a music event |
| `anti-metronome` (warn) | outside reel and social films: at most 60 % of ordinary cuts on downbeats, cut intervals varying (coefficient of variation ≥ 0.25) |
| `cut-on-sound` | at least 30 % of cuts within 100 ms of a sound (error); want ≥ 50 % on a sound (picture up to 3 f ahead) and ≥ 80 % within 100 ms |
| `reveal-dip` (warn) | a stop or dip of 0.2-0.5 s ends within 2 f of `REVEAL` |
| `shot-length` (warn) | median shot inside the format's band (`GRAMMAR.shot.band`: launch 1.15-2.05 s, update 0.7-1.4, explainer 1.75-2.65, reel and social 0.45-0.9); q75/q25 spread ≥ 1.6 (under it the cuts read as a metronome; aim for 1.9-3.1); the longest at least twice the shortest; under 0.25 s only as a declared punch; few shots over 4 s unless `LOOK.oneTake` |
| `long-take`, `cut-mix` (warn) | a take over 15 s (or a one-take film's body) changes its layout or type at least twice every 10 s; with 5+ changes, at least one in seven happens without a hard cut (a morph, mask, wipe, zoom-through, breath, defocus or UI dissolve) |
| `picture-change`, `opener` (warn) | a layout or type change at least every 2.5 s outside the end lock and the tail (a cut or seam, a COPY entry arriving or leaving, a CUE whose salience is `hit`, `cut`, `copy` or `move`; `life` is not a change); at least two in the first 2.5 s |
| `lockup-end` | the lockup whole and alive to the last frame: a `fadeEnd` seam or an `END` that stops before `TOTAL` fails; in a scene-bank film the lockup whole under 1.5 s from `CUE.lockup` (or `REVEAL`) to the last frame fails, over 2.2 s warns |
| `grounds` | with a `GROUND_PLAN`: more than two ground changes fail (a flood and its return count as one); the templates keep one ground and change it once at most |
| `subject-run` | with `SUBJECTS`: consecutive scenes about the same picture are one beat; one over 4.5 s fails |
| `seam-plan` | a fade only ends the film; UI dissolves ≤ 8 f@60 and never across an act line; any seam kind ≤ 3 times except the signature (a spine handover counts by its own kind: grow, swell, fly, converge ...); ≥ 40 % of seams carried; a cut film has at least one velocity seam |
| `declares-cover` | every step, flash, camera-blur need and seam that a primitive declares is covered by the timeline's declarations |
| `event-gap`, `density-plan` | a stretch past 72 f without an event or a reading hold (48 f in crisp) is a warning (a hold may rest, still); past 150 f@60 (2.5 s, `--max-rest`) it fails; starts per second and concurrency in band |
| `stagger-shape`, `accent-time`, `end-lock`, `exit-length` | irregular staggers in the house range; the accent transient on type; the end lock held; exits long enough to read as moves |
| `beats` (loop) | a line alone then its picture (T then A) three times or more with no line beat that meets its picture (TA): the text-then-cards loop; an error with `src/launch.ts` (a pair's beat `with` or `over` fixes it), else a warning |
| `spec` | the film's length against the spec line of `BRIEF.md` (over 10 % longer: an error; 15 % shorter: a warning); with a brief, the format's band (launch 15-45 s, update 8-20 s) and the lockup's hold from `CUE.lockup` (over 3.5 s) warn |
| `type-devices` (warn) | with `src/launch.ts`: three lines or more all landing a starred accent on their last word (one device on every line) |
| `script` | the film's words are a script: every line (an entry, a build chain joined, a replace fragment; not ui strings, `kind: 'name'` or the end card) holds 2–7 words (over 7 an error, a single word a warning, called a keyword); more than half the lines a single word warns as a keyword pile; then `copy-check.py` reads every entry as a stranger would and its errors are script errors (vague or fancy words, metaphors, slogan shapes, no verb, two claims in a line, no name, nothing that says what the product is by 3 s; an update film: the name and the version by 3 s, from `LOOK.filmType`; `--no-copy` skips it); two lines on screen together after the first one's read is an error unless the later one declares `swap: '<id>'`; a sentence set on two lines warns. A film whose lines are mostly sentences reads at the script's budget: 50 words, 2.4 words a second in any 5 s, 1.6 over the body, text on up to 85 % (`references/copy-and-type.md` §1–2b) |
| text flow | `fragment` (chain parts), `copy-lines`, `copy-concurrent`, `read-first`, `reveal-rate`, `chain-gap`, `chain-beat`, `word-rate`, `word-total`, `text-hold`, `text-share` (`references/copy-and-type.md`) |
| `read-quiet` (calm) | nothing that asks for the eye starts while a line is read. Only cues whose `SALIENCE` is `copy`, `hit` or `cut` are guarded (missing = `hit`); `life` (creep, light, drift, carried decay) and `move` (camera moves away from the text) run freely and count toward density |

**The spine** (`SPINE_PLAN`, the plan `lib/spine.ts` `planSpine()` exports from the timeline; read in the default run,
alone with `--part spine`). A film is one action played as 3-5 acts, one case followed from the request to the result,
and one element whose form changes act to act and carries the scene changes. A beat film (a line, a card, a cut,
again) can pass every rule above and fails here. Shares are of all the declared scene changes; past 35 s the carry
family (carry, bare, momentum and the element share of text-then-cards) warns instead of failing.

| Rule | Fails (error) | Warns |
|---|---|---|
| `spine-declared` | no `SPINE_PLAN` with `--part spine`, or in a film that plays the spine (`src/spine.ts`, or a timeline that reads it); acts outside 3-5 (an update 3-4); no element named; an unknown handover kind or line place; the plan's own grammar errors (the sentence, the world's steps, a form pair no handover joins) | a film from launch-simple or update with no plan; the first act outside 20-32 % of the film (an update's hook 10-32 %), the last outside 12-31 % |
| `spine-carry` | the element carries under half the scene changes, or under 60 % of those inside acts | under 65 % / 75 % |
| `spine-bare` | a bare change inside an act (nothing carried, or a `cut`); more than one bare act boundary | a bare boundary off the downbeat |
| `spine-momentum` | speed alone joins over 30 % of the changes | over 20 % |
| `spine-boundary` | | an act boundary held only by the ground or optics: no element, anchor, speed or world step |
| `spine-lines` | more than one group of alone lines in the middle acts | under half the lines inside the product or around the element; more than one line over a picture |
| `spine-case` | no case, or its request, names, numbers (or two of its nouns) in the strings of fewer than two acts | a name or number of the case never on screen |
| `spine-end` | the lockup after a bare cut or empty frames | a lockup neither grown from the last form nor entering on the claim's kept ground |
| `checklist` | a device no verb asks for or not drawing its act's form; more devices than acts + 1; two signatures; devices in adjacent acts with no element handover between them | fewer than 3 handover kinds; one kind over 60 % |
| `text-then-cards` | an alone line in a middle act that is an island (no element, anchor or speed carries it in or out); three alone lines or more while the element carries under half the changes | an island in the first or last act |

The handover kinds: grow, shrink, swell (and swap), press-open, iris, zoom-into, pull-out, fly, stay, word, part,
converge, same-surface (the element carries) and momentum (speed only), or H1-H14; `entry` is the mark's own entry on
the kept ground. A change that is not the element names what else carries it (anchor, ground, optics) or is a `cut`.

In a calm film a missing or short picture beat, two lines arriving together and copy on more than 75 % of the body are
errors. `LOOK.filmType` takes `launch`, `update`, `explainer`, `reel` or `social`; an update film sets `update`, so
grid-check and `grammar-score.mjs` read the update band (`--format update` overrides the format for a film that does not).

## 3. lint-film (`scripts/lint-film.mjs`)

Static checks on the source. Acts and other film files get every rule; the primitives in `fx/` and `lib/` are gated
by their own curve tests and may declare light (`cinetic:light <what>`). `--strict` fails warnings.

**Determinism and rendering:** `css-animation`, `will-change-blur`, `frame-left-top`, `raw-easing`, `spring-config`,
`interpolate-clamp`, `inbrowser-blur`, `remote-font`, `timeline-constant` (error: `FPS`, `W`, `H` or `COPY` imported
from the timeline in `fx/` or `lib/`; read them from `useFilm()`), `gpu-cost` (blur over 40 px, more than 2 blurred
layers in a file, an SVG filter animated by the frame, `backdrop-filter`, a chain holding more than 24 sharp word
layers: bake a plate instead).

**Look and bans:** `placeholder` (a `cinetic:placeholder` marker left), `off-token-color` (an all-digit `#482` in copy, in a `ui`/`text`/`label` slot or an array of words, is a number label, not a colour), `gradient-low-span`,
`banned-color`, `serif`, `italic`, `glass` (`backdrop-filter`), `glow` (a light box-, text- or drop-shadow with blur,
or a coloured radial falloff in an act: build light with the device primitives, which declare it), `emoji`,
`stock-decoration`, `star-mark` (the film's own mark in `src/brand/logo*` or `Mark.tsx` drawn as a star or a sparkle: 4-8
even tips over inward dips; the brand's own SVG passes), `pure-ink` (error on a `#000` token; warn on a `#FFF` ground without `LOOK.whiteWorld`),
`accent-count` (error: a second saturated hue outside a 30° band; `imagery` and `ui-state` comments leave a token
out), `gradient-shape` (stops more than 7° of hue apart outside a declared device), `end-card-template` (a mark, a
wordmark and a tagline centred over a radial gradient), `stock-plate` (warn, film-wide: a photo world in
`public/plates/` whose subject, read from its licence record's title and tags, its plate kind or its name, shares no
word with `BRIEF.md`: a mood plate under a film about something else reads as random stock; a photo is a world only
when it is the story's place, input or people, else a built lit ground in the brand hue). `cinetic:brand-supplied <what>`
covers supplied colours and looks; `accent-count` still applies.

**Copy and type:** `copy-literal`, `text-spring`, `text-pace` (calm: stagger < 10, word < 29 or exit < 16 f@60),
`typing-rate` (human typing over 45 chars/s or under 15; `kind="stream"` up to 150), `per-letter`, `type-role` (a
`fontSize` that is not a role size of either type family in `lib/look.ts` `TYPE_LOOK`, calm or bold; more than 2
non-UI roles), `small-text` (under 36 px at 1080p),
`giant-watermark` (a giant word at opacity ≤ 0.29), `giant-once` (giant words in more than one act),
`card-content` (error: a `<Card>` or bento tile with no content, image or `blank`), `text-estimate` (error: a text
width guessed from its letter count, `label.length * size * 0.55`, outside kit/, lib/ and fx/: what stands beside the
text lands on an edge or under a neighbour; flex with a gap or `measureTracked`), `ui-accent-bar` (error: a vertical
accent line or bar on a card's edge: a side border 2 px or wider or in a saturated colour, an inset shadow painting one
side, a 1.5-16 px wide bar element 2.5 times as tall filled with the accent; warns on a colour set by a variable and a
neutral stripe down a card's edge; corners, hairline dividers, a chart's bars and carets are left out).

**Placeholders** (errors: a final film shows the product's own words and real pictures, never stand-ins):
`placeholder-copy` (an on-screen string that marks itself unfinished, from `scripts/placeholders.json`: JSX text, a
string child, a `text`/`label`/`title`/`caption`/`line`/`headline`/`sub`/`body`/`meta`/`value`/`name` prop or key, a
`line()` or `chain()` string), `bar-text` (a `Skeleton`, `TextBars`, `GhostLines`, `FakeText`, `PlaceholderLines` or
`Bars` component, or a map / `Array.from` callback that draws only rounded filled boxes under 30 px tall at varying
widths with no text: a product's own loading skeleton shown on purpose takes `// lint-ok: loading state`),
`drawn-figure` (outside `fx/`, `lib/` and `kit/`: the kit's drawn portraits, `PortraitMark`, `HalftonePortrait`, an
`Avatar` or `AvatarStack` with kind portrait or halftone and no `src`, above 72 px; the kit's drawn still life, a kit
`<Photo theme>` with no `src`; a component named for a figure, a person, face, landscape, mountain, tree, building,
bottle, plant, food, that draws SVG shapes; a size lint cannot read warns), `logo-chip` (a `Chip`, `Pill`, `Badge` or
`Tag` whose label is a well-known product's name in text alone, "ChatGPT", "Slack", "GitHub": its real mark belongs
there, `scripts/logos.mjs` and kit `LogoChip` / `InlineLogo` / `AppIcon`).

**Motion grammar:** `ease-family` (error: `enter()`/`leave()`/`move()`, a word's `ease` or an `exitEase` given a curve
of another role; warn: a move under 1 s starting and stopping on `E.linear`), `token-drift` (a house token retuned out
of its band: give a retuned curve a new name), `whip-shape` (error: a whip that peaks before t = .5),
`spring-budget` (underdamped springs on 2 element classes warn, 3 or more error; tag a use `// spring: <class>`),
`spring-range`, `scale-from-zero` (start oversized at 1.28-1.9× with `fx/Oversize`), `fade-exit` (a statement fading
over more than 12 f@60 with nothing moving), `linear-opacity`, `crossfade` (error: two full-frame layers dissolving
over more than 8 f@60; a UI dissolve carries `data-ui`), `shutter` (outside 120-180°), `blur-on-crisp`,
`deprecated-token` (a 1.1 easing, spring or type name: the 1.2 name to use).

**Continuous motion** (warnings, outside `fx/` and `lib/`; `references/motion-tokens.md` §6): `snap-step` (a one-frame
snap primitive, `HardStep`, `stepValue`, `snapBox`, `SnapZoom`, `LineSnap`, `Chain` `snapLast` or `recentre: 'room'`,
that `src/sync.ts` does not declare through its `declares()`; and a second snap device in the film: glide it with
`fx/GlideStep`, `glideValue` or `glideBox`), `camera-float` (errors: the removed float's options, `withLocks`, `lockOn`,
`dipAmp`, `settleAmp`, a `FloatOpts` with seed / amp / omega / push / locks, or a creep over 0.2 px/f@60), `idle-bob`
(errors: a sine or cosine of the frame, or `breathe`, driving a translate, rotate or scale; a lit panel's sway object),
`card-tilt` (errors: a constant `tilt={{ x, y }}` or `tilt: { x, y }` outside an entry's `from`, a constant
`rotateX(..deg)` / `rotateY(..deg)`, a depth item's constant `rot`), `unmount-moving` (a layer unmounted by
`F < X &&` or a `<Sequence>` end while a tween inside it, timed off the same frame, still runs above 10 % of its peak
speed: `landBeforeCut`), `move-queue` (three moves timed off the same frame queued one after another inside 3 s).

**Timing phrasing** (warnings, outside `fx/` and `lib/`): `even-stagger` (a reveal timed `start + i * gap` in an act:
items or words on a metronome; phrase them with `lib/cadence` `phraseOnsets(start, n, gap, { shape })`: grouped,
settling into the accent or a lead and a rush, the same span) and `linear-count` (a count to a value on `E.linear`, a
`countLinear` capped at a value, a hand-rolled `Math.round(mix(a, b, prog(f, s, e)))` with no ease: a count eases out
and settles, `fx/Roll` `countTo`; `countLinear` stays for a live rate).

## 4. layout-audit (`scripts/layout-audit.sh`, `lib/Audit.tsx`)

Renders audit frames and reads every text box: safe area, overlaps, words on screen (product strings carry `data-ui`
and count apart), readable text speed. `--every N` audits every Nth frame and collects the tweens those frames
evaluate (what `grammar-score.mjs` reads for curve roles, durations, staggers and overlap).

- Readable text moves at most about 3 px/f while it is read; a re-centre jump is a decisive move, held to the travel
  limit (20 px/f), not the reading limit, and listed as a jump.
- **Placement** (on whenever `src/timeline.ts` gives the COPY; `placement` in the JSON): every statement (a COPY entry
  that is not `ui` or `name`; boxes merged by id, a build chain's fragments as one line) is centred when its centre is
  within 10 % of the width of the middle, in the middle band when its centre sits at 35-65 % of the height. Over the
  statement time: centred >= 80 % and in the middle band >= 85 %, or fail; a statement or a name flush left at the top
  or the bottom fails; against the pictures `lib/Audit.tsx` logs (the outermost `[data-ui]`, `[data-imagery]` and
  `[data-picture]` elements of 2 % of the frame or more): one statement in the top band over a picture below it warns,
  two fail; split layouts (a line beside, above or below a picture) past one per 30 s warn (`--strict` fails). When the
  product shares the frame with a line, it plays before or after the line or steps back behind it (`fx/ReadBack`).
  `--scale 0.5` audits at half size; `--log` re-reads an earlier run's console lines without rendering.
- Product UI is simple and aligned (`scripts/ui-layout.cjs` on the same boxes; `references/product-ui.md` §3.1):
  `ui-align` fails two rows stacked in one card whose left edges miss by more than 2 px and at most 12 px at 1080 on 2
  audited frames (one frame warns; centred rows, rows flush right together, indents of 16 px or more, a headline over a
  card are fine); `text-on-asset` lists a text box crossing a mark's or a picture's edge (not a caption wholly on a photo,
  not an asset set in the line) as a ui warning for `look-audit.py --layout` to confirm on the pixels; `text-edge` fails
  text cut by the frame or within 4 % of its edge where it shows, outside a declared crop, on 2 audited frames: product
  text sliced by a closer frame or a punch-in (a declared bleed lets a pushed statement cross the edge, never a card's
  label), or carried to the edge by a camera move. A crop that cuts text on purpose says so with `data-audit-crop`.
  Run alone on a report: `node scripts/ui-layout.cjs out/qa/layout-Film.json`.
- `--bundle out/render/film/bundle` audits from a bundle render.sh (or `npx remotion bundle`) already built: seconds
  instead of minutes for the frames of a few closer shots (rebuild it after an edit).
- Type roles (warnings; `--strict` fails): cap height against bands that hold both type families (caption 2.3-4 %,
  line 4-9 %, display 9-14 %, hero 14-26 %, giant 26-90 % of the frame height; over 90 % warns), readable text under
  the ui size, more than 2 non-UI sizes at once, a line wider than 61 % of the frame (a calm sentence under a 6.5 % cap
  75 %), a display or hero line wider than 84 %. `grammar-score.mjs` re-measures the boxes on the same bands and counts
  faults per text, not per audited frame.
- The safe zone holds resting states: a line inside a type push in flight (`data-audit-push="moving"`, `fx/TypePush`)
  is a camera move (no safe-area, speed or role check); a push landed as a declared bleed must cross the frame's edge,
  never rest half in the margin; a claim on the accent (`data-audit-claim`, `fx/TypeClaim`) keeps a 2.5 % margin at its sides;
  with `--speed`, a box past the zone while moving faster than the read limit outside its read is listed apart
  (`moving`), not failed.
- `--cues` adds the cue frames; `--safe feed9x16` the feed presets.
- **The placeholder floor** (fails, on every visible element, tagged or not; `lib/placeholder.ts` carries the lists of
  `scripts/placeholders.json`): `placeholder` (text that marks itself unfinished, or a template slot left in
  brackets), `bar-text` (two or more grey bars, 4-40 px tall, at least 2.5 times as wide as tall, rounded, near-neutral,
  in a container with no text of its own; a product's own loading skeleton shown on purpose sits in
  `[data-audit-skeleton]`, a chart or a meter in `[data-chart]` / `[data-meter]`), `drawn-figure` (a figure the kit draws,
  `data-drawn`, larger than a small UI avatar: a portrait over 72 px, the still life over 48 px at 1080p).

## 4b. detail-pair (`scripts/detail-pair.py`): the detail pass

Matching frames of the film and of the frames it answers to (the clip named as the bar, a template's render, the
brand's frames, the last round), side by side, whole and at `--zoom` 2 on `--crops` regions and the `--auto` grid cells
where they differ most. It measures, per region: `sharpness` (film over reference under 0.6 or over 1.67), `smear`
(the gradient energy across x and y, one ratio 1.6 times the other's on the softer side), `tilt` (the dominant angle of
long edges, 4 degrees apart), `ground` (the outer band's lightness span, one over 0.06 and the other under half; or
hues 25 degrees apart), `glow` (a soft bright ring round near-white areas on one side only), `edges` (density outside
0.6-1.67) and `colour` (OKLab mean over 0.06 or the 8 x 6 grid over 0.10). Findings are things to look at, not
failures (exit 0); the detail lens (`assets/critics/detail.md`) lists every difference it sees on the sheets, and the
ship gate wants none a viewer could see left open (`references/review-loop.md` §2).

## 5. forensics (`scripts/forensics.py`)

Pixel QA on a render: pops, stalls, dead holds, ghost frames, border slivers (a flat band at the frame's edge that holds
still while the picture beside it moves; content crossing the edge moves with it and passes, a band on a held picture
warns), judder, sharpness steps, banding and compression smear on flat fields; `--loop` checks the seam; `--cuts` and `--freeze-ok` declare designed cuts and
freezes for a film without cues. A film with cues declares its own: act boundaries and seams are its cuts, and a
declared step, flash or hard seam (the timeline's or a primitive's `declares()`) is never a pop or a ghost. With a
cues file that carries the declarations:

| Check | Rule | Level |
|---|---|---|
| declared | a spike or stall on a declared step, flash or hard seam | info |
| dead-stretch | a run over 2.5 s outside `END` where nothing changes at all (the camera, the layers, the ground and the content all still); a still hold shorter than that passes | fail |
| motion-floor | (every film of 8 s or more, declared or not; `forensics.py <film> --motion-floor` runs it alone in seconds, and `--spine` runs it with the spine) near-still runs of 0.3 s or more (at 320 x 180: under 0.2 % of the pixels change by 10+ levels and the structure moves under 0.03 px a frame, about 0.2 px at 1080p, read on its edges and over two frames so a slow creep counts; or the only change is grain) take more than 10 % of the body outside `END`, freezes and ignored ranges. A film that never stops reads under 8 %; one built on still holds reads 14 % or more. One single near-still run up to 2.5 s (a short film's one held breath) warns at most; a body over a minute warns at most. The fix is purposeful motion in every second: the decaying tail of the last move (`lib/moves` `holdTail`, 0.3-2 px/f@30 in the same direction), a scale creep of 0.1-0.4 %/f (`scaleCreep`), the product working in frame, or a sooner cut. An idle bob or an aimless pan keeps frames changing but fails `idle-bob` / `camera-wander` | fail; over 8 % warn |
| still-run | (with the floor, a film of 8 s or more) one near-still run over 0.8 s before the end lock: the film holds still only on its end card; keep every hold moving between its moves (a creep, a light, a rack) | fail |
| end-blank | (with the floor) a frame in the last 0.3 s is empty (under 0.3 % of its pixels 12+ levels off its median): a fade to blank or an empty last frame | fail |
| end-hold | (with the floor) the end card stands near-still for over 2.5 s, counted from the start of the still run that reaches into `END`: the lockup keeps living to the last frame (a slow push that lands, a light pass over the mark, the line settling) or holds shorter | warn |
| edge-cover | (with the floor) a strip at the frame's edge that is not the picture: the outer 1-3 px of a side (at 1080p) 25+ levels off the flat picture just inside it along 85 % of the side, the strip itself flat, on 0.25 s or more or on the last frame. A world, plate or plane that does not cover the frame: a pull-back below scale 1 (`fx/world` lands it at 1), a parallax plane moved off its edge, a stage with no ground of the world's colour under it | fail |
| end-cut | (with the floor) the film stops mid-fade: the last frames still change by a global gain at a third or more of the fade's fastest step and the last frame is neither black nor white. Let the fade land on an ease-out a few frames before the last frame, or end on the held lockup with the music's ring-out | fail |
| read-move | the camera moves faster than 90 px/s or 15 %/s while text is read | warn |
| camera-wander | inside one shot most of the picture pans (or pushes) one way and then back, both runs slow (under 60 px/s or 4 %/s at their peak, each 0.4 s or longer, 1 s or less apart): the old camera float | warn; in two shots or more, fail |
| | there and back at any speed: two opposite runs 1 s or less apart inside one scene (scenes split by the act lines, declared seams and cuts, never inside a drawn handover's span), each travelling 80 px at 1080p or more (a zoom: 3 %), the second returning 40 % of the first: a pan across a page and back, a push in, a pull out and a push in again. One move that starts, travels and lands on what matters; hand over or cut to show a second place | fail |
| | two declared camera shots in a row whose picture travels opposite ways within 1.5 s with no declared seam between them | fail |
| | a camera faster than a sub-pixel creep (15 px/s, 1.5 %/s) on more than 90 % of the body: it never rests | warn |
| static-share, motion-energy, still-cut | the share of the body standing still, of the structure moving 15 px/s or more, of cuts from still to still | info |
| hold-into-exit | fewer than half of the continuity cuts accelerate into the cut | warn |
| carried-cut | a declared velocity seam: direction cosine ≥ 0.7, incoming speed 0.4-1.4× the outgoing (widened by the read's own spread), then decaying | fail |
| carried-cut | the same, but the picture repeats along the move (stripes, tiles, a list) or its moving pixels disagree on the direction: the read is not trusted | warn |
| dissolve-detect | ≥ 4 f@60 that are a rising mix of two different images, or a fade to black before the last 2 s, unless declared (`dissolveUi`, `light`, `fadeEnd`) | fail |
| end-card | with `END` declared: nothing assembles in the 1.5 s before the lock, or the card fades in | warn |
| carried-cut (hide) | a hard cut that nothing hides: no blur that makes both sides unreadable (dip > 0.9 against the settled shots), no anchor (under 25 % of the frame changing, a shape within 10 px, the centre slot), no whip carrying the picture a fifth of the frame in its last 0.2 s (`slow` when the direction carries but the speed does not); the kept ground alone hides nothing; over 10 % of the cuts, or a declared scene seam the pixels show bare | fail |
| ghost-cut | a 2-3 frame cut run whose inner frame mixes both pictures (a collapsed dissolve, a grey double exposure) or is torn (part of the frame already cut) | fail |
| empty-frame | 0.1 s or more mid-film with nothing crisp on screen (luma edges over 200 on under 0.05 % of the frame); 0.5 s or more is a stall | warn; fail |
| frozen-hold | nothing changes for over 1 s mid-film (1.5 s while a line is read), or over 55 % of the body frozen | warn |
| end-drift, end-centre | the last 2 s slide at a flat speed to the last frame and never land; the last frame's lockup over 1 % of the width off centre | warn |
| world-still, world-murk | the world's textured corners stay one picture all film; its outer ring has no highlight (p99.5 under 120) on 70 % of it | warn |
| legibility | a line of the cues copy (and the first name) under 3:1 against what stands behind it (the frame before it arrives, or the flat backing it arrived on) | warn; under 2:1, fail |
| audio, audio-end | no audio stream or a silent mix (any mode; `--no-audio` for a silent loop); the last 0.25 s under 12 dB below the loudest 2 s: the music is cut | fail; warn |
| motion-snap | more than 0.6 one-frame changes per 3 s outside a declared snap (a change of 2+ values with both neighbours under 35 % of it, not a declared cut), or more than one declared snap device | fail |
| motion-frozen | 75 f@30 (2.5 s) in a row where the mean change is under 0.05 and fewer than 8 px change by 4+ values (a dead stretch), after the first 0.5 s and outside the end lock and declared freezes; a still hold shorter than that passes | fail |
| motion-decay | moves fall from their peak to 20 % of their speed in a median under 3.5 f@30 (3+ moves) | fail |
| motion-density | more than 2 primary moves (peaks at 25 % of the film's 90th-percentile move or more) per 3 s | fail |
| motion-stop | a move goes still in one frame from above 15 % of its peak speed | fail |
| motion-cut | a visible cut while a braking move is above 10 % of its peak, unless a whip, velocity or zoomThrough seam or a camera-blur range carries it (fail over 0.25 per 3 s) | warn |
| spine-track | (`--spine`; inside `--grammar-only` when the cues declare a spine) along each declared handover's box track (a seam with `track`, `fx/Handover`'s declares), a crisp object stands in the box on every frame: the luma step across the box's edge at least 6 levels and twice the film's floor; gone for more than 2 frames at 30 fps, or the declared box jumping over 8 % of the width in one frame (a speed handover and a swell's or shrink's swap frame excepted) | fail |
| | a spine declared in the cues with no handover carrying a track | warn |
| swap | (`--spine`) a hard cut changing more than 65 % of the frame with no handover, seam, spine change or `--cuts` declared within 2 frames: the picture swapped, not handed on | fail |
| text-then-cards | (`--spine`) a line alone (a statement, no declared element drawn, at most a quarter of the frame's blocks with detail, a soft plate passing) then, over the next 2 s, a picture whose detail rises 8 points and 1.5 times over the line's level, with no declared element drawn across the turn: twice | fail; once warn |

The camera checks read the same 0.4 s windows (optical flow at 480 wide, speeds at 1080p, the camera as the similarity fit of the structure). A still hold passes: the camera is still unless a shot declares a move (`lib/drift` `stageMove`, `lib/camera` `camPath`), and what changes in a hold is the product. The fix for `dead-stretch` is a product change in the hold or a sooner cut, never a float; the fix for `camera-wander` is a still camera or one declared move that starts, travels and lands. Motion energy is still printed under the verdict (the film's median, its low share, its longest low stretch) for reading, not as a gate.

The motion gates read mean luma change at 160x90, one sample per 1/30 s (landings also at the film's own rate), so a
60 fps film and a 24 fps one are judged alike. In a declared film every jump that is not a declared cut counts as a
snap. The report lists every snap, frozen run, move with its settle length, stop and braking cut under
`checks.grammar.motion`. Without the declarations these report as info; `--no-grammar` skips them.

`carried-cut` measures the outgoing vector with optical flow, which cannot see motion along a texture of parallel bands
(water ripples, stripes, scan lines: the aperture problem): there it reads only the motion across the bands, and a
carry declared in the other direction fails on its cosine. Carry the direction the flow sees there (the crop's measured
drift), or measure the seam on a textured region. The read around each velocity seam masks confident text lines out of
the flow (type sliding over the shot is not the shot), records how far the moving pixels agree (`coherence`, `spread`:
the ratio band widens by the spread) and the picture's period along the move (a repeating picture's step is known only
modulo it: then a failing read is a warning, to check by eye). Declare `v` on the seam (the cut frame's speed in px per
frame at 1080p, carriedCut's `vCut`) and `ratio` (the incoming first step over it, house 0.7), and the flag prints
"code 30 px/f out, 21 in; pixels 28.4 out, 19.6 in".

## 6. look-audit and the floors (`scripts/look-audit.py`)

Rendered look checks: `hue-count` (2 hue groups warn, 3 fail, outside declared devices and imagery; the hues of the
brand-supplied colours count as one family), `banned-hue`
(supplied colours pass, lit, shaded or blended over a grey too; both leave out the official marks: the pixels of a mark with a record in
`public/logos/logos.json`, where the layout JSON's mark boxes or `--mark-track` say it is drawn on that frame), `accent-share`, the wash ceiling (a film is not one colour wash), `tinted-ink`,
`negative-space`, `living-ground`, `camera-lock` (the camera never stops, or never on a read: lock 0.5-1 s on each read), `clean-finish`, `type-size` (with the layout JSON), `luminance-flip`,
`blur-policy`, `word-first-frame`, `fade-detect`, `arrival-front-load`, `image-develop` (a hint), `ui-accent-bar`
(fails a thin saturated vertical bar along a card's edge, with the card's rows beside it, on 2 samples read at full
resolution two a second; a chart's bars, a frame round a picture and a coloured word's letters are left out),
`text-on-asset` (with the layout JSON: fails a text box cutting into a mark or a picture that is in view beside the
crossing on 2 audited frames; `--ui-only` runs both reads alone), and with the
layout JSON and the cues the type gate: `type-read` (fails when the largest copy line is under 6.7 % of the frame
height, 72 px at 1080p, or a line of 48 px or more reads under 3:1 against its local ground; under 4.5:1 warns, and
fails on a busy ground) and `type-beat` (warns when no line of 6.7 % or more, at 4.5:1, sits on a clean field for a
second or more). Flags:
`--imagery x,y,w,h` (boxes holding photographs or screenshots: natural colour there is not designed colour, and their
bands are not skeleton bars; `x,y,w,h@from-to` for those video frames only), `--imagery-track` (JSON `[{from, to, box,
toBox?}]` in composition frames and px: imagery on a moving camera), `--colour-event
FROM,TO` (a declared colour event pauses the wash and accent ceilings; the timeline's `COLOUR` ranges are read from the cues), `--second '#…'` (a declared support hue),
`--logos` (the record, default `public/logos/logos.json`), `--mark-track` (JSON `[{name, from, to, box, toBox?}]`),
`--tokens`, `--brand`, `--picture-only` (the picture floor alone, fast), `--no-picture`, `--no-floor`.

**The floor against a flat film (motion)** fails the film when any of these is missed:
- the camera or the ground moves on at least 70 % of the body (everything outside the end lock); inside each copy read
  window up to 1 s of a locked camera counts as alive (the read lock);
- at least half of the shots show two depth planes moving at different rates;
- at least 40 % of the seams carry something across (velocity, morph, breath, zoom-through, whip, snap zoom, mask,
  wipe, defocus; an undeclared cut counts when motion keeps its direction across it at 30 px/s or more, or the scale
  keeps moving at 1 %/s or more, on both sides);
- something designed happens at least every 3 s (a seam, a step, a flash, a camera-blur moment, a fast move, a light
  event, a snap of scale);
- every act has a light event (`references/lighting.md`);
- the scale of the content changes (×1.5 element height, or ×2 coverage) on at least 30 % of the cuts.
A one-take film is judged on 2 s segments and has no seam or cut items.

**The picture floor and target** (what the frames hold; `lib/look.ts PICTURE`):

| Reading | Floor (fails the film) | Target (`picture-target` warning) |
|---|---|---|
| flat ground: blocks with almost no variation | mean ≥ 25 % and ≥ 5 % of frames over 60 % flat (a clean field somewhere); mean ≤ 90 % (an empty film) | mean 43-85 %, ≥ 18 % of frames over 60 % flat |
| edges: busy-ness (texture, footage, small type) | ≤ 12 % of the frame; ≥ 0.6 % (an empty film) | ≤ 5.9 % |
| saturated pixels (OKLCH C ≥ 0.06): colour mass | ≥ 2.2 % of the frame (a mono film, `--palette mono` or `LOOK.palette: 'mono'`: a monochrome or night film, a neutral brand: the accent on ≥ 0.2 % of the frame in ≥ 20 % of the samples instead); the wash ceiling ≤ 60 % and ≤ 65 % of frames over half | 4.5-32 %, ≤ 25 % of frames over half |
| a support hue (40° or more from the accent) | (target only) | in ≥ 9 % of the samples (house 10-30 %) |
| bleed: the subject framed past two edges at 1.2× the frame or more | in at least a quarter of the acts | in every act |
| skeleton bars: glyphless grey bars in focus on a flat card or ground (not inside declared imagery or a mark) | no more than 3 in a frame (2 samples or more fail) | none |
| `filler-shape`: faint shapes on the ground (0.015-0.07 L off it, ≥ 1.2 % of the frame, floating, flat, edged) that carry no text, icon or mark | on fewer than 3 samples or under 10 % of them (2 samples warn) | none |
| `ground-haze`: the ground's light rising to a dome inside the frame over its brightest edge (a pool, a white haze, a fog vignette) | over 0.025 L on fewer than 3 samples or under 20 % of the measured ones (2 samples warn) | none; a key gradient from one side reads 0 |
| `ground-plate`: a flat field (≥ 25 % of the frame, outside imagery) at L* 12-88, chroma under 0.12 and an L* range under 12: a flat grey or charcoal ground | on fewer than 3 body samples or under 10 % of them (2 samples and 3 % warn) | none: every product shot on the key's lit gradient or a blurred plate of the film's own picture; a flat neutral field is a clean page (L* 88+) or a black void (under 12) |
| `card-separation`: on a dark ground (L* < 50), a flat panel floating inside the frame 1.5-8 L* off the ground | on fewer than 3 samples or under 20 % of the dark-ground samples (10 % warns) | none: dark cards 8 L* or more over the ground, a key-side rim and an inner top highlight (kit `Surface`) |
| `flat-void`: the ground (the largest flat field touching two frame edges, 15 % of the frame or more) an unlit near-white (L* 88+) or near-black (12 or less) field, neutral, its L* range under 12, with no plate (no textured region bleeding off two edges over 15 % of the frame) | on under 80 % of the body samples, or with the void's lightness spreading 8 L* or more across them (a world step); 60 % warns. A white or black stage is a look when the film never stops and has depth: 80 % on one void then only warns if the film passes the motion floor (forensics `motion-floor`) and 25 % or more of its samples show a sharp and a soft plane | none on a void that is static or flat: every shot on the film's world (a graded plate of its place, a lit field, one step an act), or the white stage made alive (motion in every second, a sharp plane over defocused ones) |
| focus falloff: a crisp plane and a defocused one in the same frame | (target only) | ≥ 35 % of frames |

**The default look** (`look-audit.py out/draft.mp4 --look`, two samples a second read at 960 wide, about a minute on a
draft; `--surfaces` adds banding, a read for the master; both also inside the full run): `flat-void` fails as in the
table above (a void that never stops and has depth warns), `small-subject` fails, `cheap-card` warns; `card-slab` fails a film
that stands on a world (under half its samples a void) when 3 samples or more and 15 % of them hold a plain card
slab (two warn): a flat white or grey card face floating in the frame whose own light spans under 3 L* (no key across
it, no sweep), with no rim catching the light on its top edge and no glass over its backdrop; its drop shadow is
reported, not required (on a dark ground it hides). A quiet 1-2 L* sheen alone stays a slab: give the card the key's
gradient across its face, a rim on the key side, or glass over the film's own picture (`kit/card` Card, `fx/light`).

Type reads large and frontal on clean grounds, so a film with every frame on relief, footage or grain fails
`picture-flat` and usually `picture-edges` too. Give each type beat a clean field, or dim and defocus the plate behind the type.
Graded real photos and footage are welcome on the floor: they count toward edges and colour mass, and declared as
imagery their natural colour (skin, wood, sky) is not designed colour, their soft and defocused edges are not
`filler-shape` or `ground-haze`, and their bands are not skeleton bars. Moving pictures (an `ArcRiver`, a `PhotoWall`,
a card that travels) are declared with `--imagery-track`, written from the film's own state by `fx/Pictures`
`pictureTrack()` (`references/imagery.md` §10). A drawing standing in for a photo is a review failure
(`references/taste-and-slop.md` D18).
A white world is judged without the flat and colour readings; a grid film without bleed. Framing warnings:
`framing-centred` (the picture subject dead centre and inside the frame in more than half of the framed samples; a
region shaped like lines of type is never the subject: statements stay centred),
`framing-hold` (one framing over 0.8 s with no depth plane moving; 1 s inside a read), `small-text`.

**The one-hue gate:** `look-audit.py clip.mp4 --trajectory --roi x,y,w,h --accent '#RRGGBB' [--target t.json]` reads
the colour of a region over time: it keeps the accent's hue (within 6° wherever C ≥ 0.03) and, with a target, follows
its lightness and chroma (MAE ≤ 0.01). This is how a light field, a hue sweep, a cooling glyph or a developing image
is checked.

## 7. grammar-score (`scripts/grammar-score.mjs`)

How close the film's grammar sits to the house grammar (or a clip's: `--target out/like.json`), one score per
dimension, appended to `out/grammar-score.json` so a loop shows its progress. Measured values win over values read
from the timeline. `--format update` reads the update band; `--print-target` prints the house target.

| Dimension | Statistic | 100 at | 70 at (the floor) |
|---|---|---|---|
| role-mix | distance of the arrive / reposition / leave / linear / spring shares from 55 / 16 / 19 / 8 / 2 % (drifts and creeps left out) | ≤ 0.25 | 0.6 |
| front-loaded | an element's entrances on arrive curves (exits, linear values and the camera's moves are not entrances) | ≥ 71 % | 40 % |
| into-cuts | moves ending at a hard cut on leave or linear curves (a carried seam is crossed, not cut into; from 3 moves) | ≥ 71 % | 40 % |
| durations | per role, the median against the house range, by ratio; the mean of the roles | inside | 2× past an edge |
| staggers | runs of 3+ starts with gaps in the house range; a run of 6+ irregular (CV ≥ 0.15); starts within 1.5 f@60 are one start, a run on the beat grid is the track's | 80 % of runs | 50 % |
| shots | median in the format's band; q75/q25 spread 1.9-3.1 | inside | 2× / 2.6× past an edge |
| density | starts per second; regions moving at once; idle frames | 1.9-2.8; 1.6-2.5; ≤ 15 % | 1.3-3.2; 1.05-4.4; 45 % |
| holds | dead stretches (forensics `dead-stretch`: over 2.5 s where nothing changes); a still hold is fine | 0 | 1 (60) |
| seams | carried share; no kind more than 3 times (the signature excepted; a refrain scores 50); the mix distance is reported | ≥ 40 % | 30 % |
| cut-sync | hard cuts within 1 f of a sound (the picture may lead by up to 3 f) / within 100 ms; from 3 hard cuts | ≥ 50 % / ≥ 80 % | 14 % / 28 % |
| velocity-seams | declared velocity seams that carry speed and direction | 100 % | 50 % |
| colour | hue groups; accent p95 of a frame; ground and ink in the house bands (off them: 85); ground chroma; neutral, saturated and wash-frame shares; the accent's share; a second accent (80) | ≤ 2; ≤ 25 %; in; ≤ 0.025; ≥ 40 %, ≤ 30 %, ≤ 33 %; 2-17 % | 8; 60 %; -; 0.035; 15 %, 55 %, 60 %; 0-42 % |
| type | texts off the type bands both families share (the layout audit's boxes re-measured: under the ui size, over the giant band, past their width, 3+ sizes in one scene), one fault per text, counted when it misses on 2 audited frames or more (5 % under the ui size and 2 % past a width are rounding); an older audit is re-scored on today's bands | none | 3 texts (−10 each) |
| overlap | hand-overs: the next element enters between 3 f@60 after and 6 f@60 before the previous one has left (scored); secondaries before the primary's 90 % and the foreground leading the background (reported) | ≥ 70 % | 35 % |
| picture | the picture readings (flat ground, structure, colour mass, bleed, falloff, skeleton bars) | the target | the floor (0 % saturated for a mono film; 4 skeleton samples) |

Each dimension scores 100 at its target and 70 at its floor, linear between, and falls to 0 at twice the
target-floor gap past the floor. The floors of the render dimensions are the edges of the house ranges, the
range of the films the house holds up as its bar (each of them scores 70 or more on every render dimension); the
declared dimensions read elements, not the camera or the creeps: a drift or creep (linear, 1.5 s or longer) is
the holds' measure, a reposition of 2 s or more is the camera's move, and a carried seam is crossed, not cut into.
A one-take film scores neither shots nor cut sync. **Ship: mean ≥ 80, no dimension under 70, both floors passing**
(`target.ship`; 80 is the lowest mean those films reach). Films made from the templates that look right score
81-94 on it; the ones under the bar fail on a dimension a director sees (moves that settle on the hard cut, a
sentence 87 % of the frame wide, velocity seams that carry nothing, the accent filling the frame past one flood). Read `density` (and look-audit's concurrency and moving share) on a
full-size render at the master's quality: on a half-size dev render, x264 noise on a grain or a textured ground reads
as optical flow (one film measured concurrency 3.97 there and 1.50 on its 1920x1080 master).

## 8. measure-speed and the render wrappers

- **Blur is a declared policy.** `LOOK.blur = 'crisp'` (default: no shutter blur on flat graphics) or `'camera'`
  (180° shutter on fast frames). `measure-speed.py --policy auto` reads it from `out/cues.json`: a crisp film renders
  one sample per frame outside its `CAMERA_BLUR` ranges; a camera film samples every fast frame. Declared steps,
  flashes, hard seams and act starts always render from one sample. `too_fast` (the redesign list) applies only where
  the camera policy holds.
- **speed-ceiling** (crisp): the frame moving faster than 3000 px/s at 1080p for more than 14 f@60 warns; a flat fast
  plateau is listed (`speed_plateau`) for review.
- `render.sh --blur` follows the policy (with no frame needing samples it renders the sharp master directly) and caps
  samples at 8 per frame in a declared film; `--policy crisp|camera` overrides. `render.sh --build-audio` (and
  `render-chunks.sh`, `hf-finish.sh`) rebuild the soundtrack through the npm scripts: `music`, `cues`, `kit`, `audio`
  and `credits`. `render-chunks.sh` renders sharp only. `hf-finish.sh --policy`: per-range camera blur is a Remotion
  feature.

## 9. palette (`scripts/palette.py`)

- `--recipe <name> --accent '#…'` writes the tokens from the house colour system at the accent's hue;
  `--list-recipes` prints them (recipes and bands: `references/brand-and-color.md`).
- `--check-tokens src/brand/tokens.ts` checks the film's own tokens: bans and bands on what the brand did not
  supply, contrast (statements 7:1, mute 4.5:1, accent 3:1) and the one-accent rule on everything.
- `--ramp 'c1,c2,...'` checks the stops of a light field or a sweep against the accent's hue (within 7°; a light field
  stays under C 0.13 and swings 0.05-0.20 in lightness).
- `--cover <png>` measures the accent's share of the pixels on a still.

## 10. Sound checks

`track.py check` (the licence record, the joins, nothing from the track in git), `kit.py check`, `plan.py`
(`out/qa/sfx_plan.json`), `score.py`'s report (over-bed levels, stop-downs, density, stacks, loudness), `listen.py`
(earshot's ears), `av-audit.py` (onsets against cues per stem, `music_sync`, loudness, true peak, clicks, the tail),
`check-sync.py` (A/V lag) and `credits.py` (the delivery gate). The gate list is in `references/sound.md`.

The mix's colour is gated too: a bed whose own 2-8 kHz band sits under -35 dB of its whole fails `score.py` (a low-passed
pad, or a short film's edit played on a track's filtered intro, masks every click and reads as a murk; the failure names
the bars where the track opens up, so `track.py edit --start-bar` or `--entry` moves the edit there, or pick a brighter
track); a mix under -22 dB at 2-8 kHz or -32 dB at 8-16 kHz warns. `track.py edit` already avoids muffled bars (centroid
under 700 Hz and under 0.4 of the track's 75th percentile bar) where the arc allows, and lists the ones it kept
(`muffled_bars`); `music.mjs sheet --measure` ranks a muffled candidate down and `get` warns on one. A dull bed with
some air left (8-16 kHz under -28 dB) gets a parallel air shelf of half the deficit (at most 4.5 dB) and 1.5 dB of
presence; effects that sit under 3 dB over the bed on the median (keys left out) are lifted until they read 4.5 dB over
it (at most 6 dB). Both are said in the report (`lift`).

## 11. The test suites

`scripts/test/` holds the tests of the scripts themselves (not of a film): `lint-film.test.mjs` (every lint fixture,
both starters, the palette cases, and the self-tests of forensics, look-audit, measure-speed and grammar-score on
synthetic clips; `--part` splits it for a machine that limits job length), `continuity.test.mjs` (the glides, hold
drift and land-before-cut helpers against the motion gates), `grid-check.test.mjs`, `tokens.test.mjs`,
`mirror.test.mjs` (the HyperFrames mirror equals the Remotion tokens), `scripts-docs.test.mjs` (every script answers
`--help`; the docs name the internal helpers), `provenance.test.mjs` (public text speaks as house craft; no audio,
stray images or videos with sound in git), and the Python tests (`pick`, `deck`, `brand`, `like`, `track`, `score`,
`encode-tags`, `bash32`, `detail-pair`), `assets.test.mjs`, `details.test.mjs` (the detail primitives against their
house numbers) and `placeholder.test.mjs` (the audit's placeholder lists equal `scripts/placeholders.json`; the kit
marks what it draws). `new-film.sh` copies scripts into a project without `scripts/test/`.
