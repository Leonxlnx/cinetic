# Checks: what each script measures and what it takes to pass

Every gate in the workflow is a script you run. This page lists them in the order a film meets them, with the rules
each one applies, the levels (error / warn / info) and the flags that matter. Thresholds are house defaults; where a
check reads a declaration from `timeline.ts` (`LOOK`, `SEAMS`, `STEPPED`, `FLASHES`, `CAMERA_BLUR`, `END`, `REVEAL`,
`SPRING_CLASS`, `STRUCTURAL`, `SALIENCE`), the declaration turns a designed artifact into craft instead of a fault.

Contents: 1. The order · 2. grid-check · 3. lint-film · 4. layout-audit · 5. forensics · 6. look-audit and the
floors · 7. grammar-score · 8. measure-speed and the render wrappers · 9. palette · 10. Sound checks ·
11. The test suites

## 1. The order

```
npx tsx scripts/grid-check.ts src/timeline.ts                 # Step 3, and after every timeline edit
node scripts/lint-film.mjs src [--strict]                     # Step 2 and every build step
npm run cues                                                  # out/cues.json (declarations, copy, events)
bash scripts/render.sh Film out/preview.mp4 --preview
bash scripts/layout-audit.sh Film --every 6 --json out/qa/layout-Film.json
python3 scripts/forensics.py out/preview.mp4 --cues out/cues.json --json out/qa/forensics.json
python3 scripts/look-audit.py out/preview.mp4 --cues out/cues.json --layout out/qa/layout-Film.json --json out/qa/look.json
node scripts/grammar-score.mjs --cues out/cues.json --layout out/qa/layout-Film.json --look out/qa/look.json --forensics out/qa/forensics.json
python3 scripts/av-audit.py out/preview.mp4 --cues out/cues.json --stems out/stems --json out/qa/av.json
```

After each round write the weakest grammar-score dimension and the weakest floor reading into the review note, and
fix that first. A ship needs, on the final render: lint `--strict` and grid-check clean; forensics passing;
look-audit passing with both floors; grammar-score mean ≥ 90, no dimension under 70; the sound gates
(`references/sound.md`); probe and check-sync (`references/finishing.md`); the rubric (`references/review-loop.md`).

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
| `shot-length` (warn) | median shot inside the format's band (`GRAMMAR.shot.band`: launch 1.3-2.2 s, update 0.8-1.6, explainer 2-3, reel and social 0.5-1); q75/q25 spread ≥ 1.4; the longest at least twice the shortest; under 0.25 s only as a declared punch; few shots over 4 s unless `LOOK.oneTake` |
| `seam-plan` | a fade only ends the film; UI dissolves ≤ 8 f@60 and never across an act line; any seam kind ≤ 3 times except the signature; ≥ 40 % of seams carried; a cut film has at least one velocity seam |
| `declares-cover` | every step, flash, camera-blur need and seam that a primitive declares is covered by the timeline's declarations |
| `event-gap`, `density-plan` | no stretch past 72 f without an event or a reading hold (48 f in crisp); starts per second and concurrency in band |
| `stagger-shape`, `accent-time`, `end-lock`, `exit-length` | irregular staggers in the house range; the accent transient on type; the end lock held; exits long enough to read as moves |
| text flow | `fragment`, `copy-lines`, `copy-concurrent`, `read-first`, `reveal-rate`, `chain-gap`, `chain-beat`, `word-rate`, `word-total`, `text-hold`, `text-share` (`references/copy-and-type.md`) |
| `read-quiet` (calm) | nothing that asks for the eye starts while a fragment is read. Only cues whose `SALIENCE` is `copy`, `hit` or `cut` are guarded (missing = `hit`); `life` (creep, light, drift, carried decay) and `move` (camera moves away from the text) run freely and count toward density |

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

**Look and bans:** `placeholder` (a `cinetic:placeholder` marker left), `off-token-color`, `gradient-low-span`,
`banned-color`, `serif`, `italic`, `glass` (`backdrop-filter`), `glow` (a light box-, text- or drop-shadow with blur,
or a coloured radial falloff in an act: build light with the device primitives, which declare it), `emoji`,
`stock-decoration`, `pure-ink` (error on a `#000` token; warn on a `#FFF` ground without `LOOK.whiteWorld`),
`accent-count` (error: a second saturated hue outside a 30° band; `imagery` and `ui-state` comments leave a token
out), `gradient-shape` (stops more than 7° of hue apart outside a declared device), `end-card-template` (a mark, a
wordmark and a tagline centred over a radial gradient). `cinetic:brand-supplied <what>` covers supplied colours and
looks; `accent-count` still applies.

**Copy and type:** `copy-literal`, `text-spring`, `text-pace` (calm: stagger < 10, word < 29 or exit < 16 f@60),
`typing-rate` (human typing over 45 chars/s or under 15; `kind="stream"` up to 150), `per-letter`, `type-role` (a
`fontSize` that is not a `TYPE` role; more than 2 non-UI roles), `small-text` (under 36 px at 1080p),
`giant-watermark` (a giant word at opacity ≤ 0.29), `giant-once` (giant words in more than one act),
`card-content` (error: a `<Card>` or bento tile with no content, image or `blank`).

**Motion grammar:** `ease-family` (error: `enter()`/`leave()`/`move()`, a word's `ease` or an `exitEase` given a curve
of another role; warn: a move under 1 s starting and stopping on `E.linear`), `token-drift` (a house token retuned out
of its band: give a retuned curve a new name), `whip-shape` (error: a whip that peaks before t = .5),
`spring-budget` (underdamped springs on 2 element classes warn, 3 or more error; tag a use `// spring: <class>`),
`spring-range`, `scale-from-zero` (start oversized at 1.28-1.9× with `fx/Oversize`), `fade-exit` (a statement fading
over more than 12 f@60 with nothing moving), `linear-opacity`, `crossfade` (error: two full-frame layers dissolving
over more than 8 f@60; a UI dissolve carries `data-ui`), `shutter` (outside 120-180°), `blur-on-crisp`,
`deprecated-token` (a 1.1 easing, spring or type name: the 1.2 name to use).

## 4. layout-audit (`scripts/layout-audit.sh`, `lib/Audit.tsx`)

Renders audit frames and reads every text box: safe area, overlaps, words on screen (product strings carry `data-ui`
and count apart), readable text speed. `--every N` audits every Nth frame and collects the tweens those frames
evaluate (what `grammar-score.mjs` reads for curve roles, durations, staggers and overlap).

- Readable text moves at most about 3 px/f while it is read; a re-centre jump is a decisive move, held to the travel
  limit (20 px/f), not the reading limit, and listed as a jump.
- Type roles (warnings; `--strict` fails): cap height between role bands (caption 2.3-4 %, statement 5-14 %, hero
  14-26 %, giant 26-90 % of the frame height), readable text under 36 px, more than 2 non-UI sizes at once, a
  statement wider than 61 % of the frame, a payoff wider than 84 %.
- `--cues` adds the cue frames; `--safe feed9x16` the feed presets.

## 5. forensics (`scripts/forensics.py`)

Pixel QA on a render: pops, stalls, dead holds, ghost frames, border slivers, judder, sharpness steps, banding and
compression smear on flat fields; `--loop` checks the seam; `--cuts` and `--freeze-ok` declare designed cuts and
freezes for a film without cues. With a cues file that carries the declarations:

| Check | Rule | Level |
|---|---|---|
| declared | a spike or stall on a declared step, flash or hard seam | info |
| hold-drift | a run over 0.8 s outside `END` where nothing drifts 6 px/s or creeps 1 %/s and the ground does not change | fail |
| | while text is read: faster than 90 px/s or 15 %/s | warn |
| static-share | more than 15 % of the body stands still | warn |
| still-cut | more than 30 % of the cuts go from a still frame to a still frame | warn |
| hold-into-exit | fewer than half of the continuity cuts accelerate into the cut | warn |
| carried-cut | a declared velocity seam: direction cosine ≥ 0.7, incoming speed 0.4-1.4× the outgoing, then decaying | fail |
| dissolve-detect | ≥ 4 f@60 that are a rising mix of two different images, or a fade to black before the last 2 s, unless declared (`dissolveUi`, `light`, `fadeEnd`) | fail |
| end-card | with `END` declared: nothing assembles in the 1.5 s before the lock, or the card fades in | warn |

Without the declarations these report as info; `--no-grammar` skips them.

`carried-cut` measures the outgoing vector with optical flow, which cannot see motion along a texture of parallel bands
(water ripples, stripes, scan lines: the aperture problem): there it reads only the motion across the bands, and a
carry declared in the other direction fails on its cosine. Carry the direction the flow sees there (the crop's measured
drift), or measure the seam on a textured region.

## 6. look-audit and the floors (`scripts/look-audit.py`)

Rendered look checks: `hue-count` (2 hue groups warn, 3 fail, outside declared devices and imagery; the hues of the
brand-supplied colours count as one family), `banned-hue`
(supplied colours pass), `accent-share`, the wash ceiling (a film is not one colour wash), `tinted-ink`,
`negative-space`, `living-ground`, `clean-finish`, `type-size` (with the layout JSON), `luminance-flip`,
`blur-policy`, `word-first-frame`, `fade-detect`, `arrival-front-load`, `image-develop` (a hint). Flags:
`--imagery x,y,w,h` (boxes holding photographs: natural colour there is not designed colour), `--colour-event
FROM,TO` (a declared colour event pauses the wash and accent ceilings; the timeline's `COLOUR` ranges are read from the cues), `--second '#…'` (a declared second hue),
`--tokens`, `--brand`, `--picture-only` (the picture floor alone, fast), `--no-picture`, `--no-floor`.

**The floor against a flat film (motion)** fails the film when any of these is missed:
- the camera or the ground moves on at least 90 % of the body (everything outside the end lock);
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
| saturated pixels (OKLCH C ≥ 0.06): colour mass | ≥ 2.2 % of the frame | ≥ 6 % |
| bleed: the subject framed past two edges at 1.2× the frame or more | in at least a quarter of the acts | in every act |
| skeleton bars: glyphless grey bars in focus | no more than 3 in a frame (2 samples or more fail) | none |
| focus falloff: a crisp plane and a defocused one in the same frame | (target only) | ≥ 35 % of frames |

Type reads large and frontal on clean grounds, so a film with every frame on relief, footage or grain fails
`picture-flat` and usually `picture-edges` too. Give each type beat a clean field, or dim and defocus the plate behind the type.
A white world is judged without the flat and colour readings; a grid film without bleed. Framing warnings:
`framing-centred` (the subject dead centre and inside the frame in more than half of the framed samples),
`framing-hold` (one framing over 0.8 s with no depth plane moving), `small-text`.

**The one-hue gate:** `look-audit.py clip.mp4 --trajectory --roi x,y,w,h --accent '#RRGGBB' [--target t.json]` reads
the colour of a region over time: it keeps the accent's hue (within 6° wherever C ≥ 0.03) and, with a target, follows
its lightness and chroma (MAE ≤ 0.01). This is how a light field, a hue sweep, a cooling glyph or a developing image
is checked.

## 7. grammar-score (`scripts/grammar-score.mjs`)

How close the film's grammar sits to the house grammar (or a clip's: `--target out/like.json`), one score per
dimension, appended to `out/grammar-score.json` so a loop shows its progress. Measured values win over values read
from the timeline. `--format update` reads the update band; `--print-target` prints the house target.

| Dimension | Statistic | Pass band |
|---|---|---|
| role-mix | distance of the arrive / reposition / leave / linear / spring shares from 55 / 16 / 19 / 8 / 2 % | ≤ 0.17 |
| front-loaded | entrances on arrive curves | ≥ 71 % |
| into-cuts | moves ending at a cut on leave curves | ≥ 71 % |
| durations | per role, the median inside the house range | ≥ 80 % of roles |
| staggers | staggered groups irregular (gap variation ≥ 0.15) with gaps in the house range | all |
| shots | median in the format's band, q75/q25 spread 1.5-2.7 | both |
| density | starts per second 1.6-2.8, concurrency 1.4-2.5, idle frames ≤ 15 % | all |
| holds | hold frames that live (drift ≥ 6 px/s, creep ≥ 1 %/s, or light on the ground) | ≥ 95 % |
| seams | carried share ≥ 40 %, no kind more than 3 times (the signature excepted), mix distance ≤ 0.35 | all |
| cut-sync | hard cuts within 1 f of a sound (the picture may lead by up to 3 f) / within 100 ms | ≥ 50 % / ≥ 80 % |
| velocity-seams | declared velocity seams that carry speed and direction | 100 % |
| colour | one accent hue group, accent share in band, neutral grounds, ink and ground in band | all |
| type | type-role warnings from the layout audit | none |
| overlap | secondaries start before the primary reaches 90 %; the foreground lands 10-30 f@60 before the background; the next element enters 0-1 f before the previous leaves | ≥ 70 % / 50 % / 70 % |
| picture | the picture readings | 100 at the target, 70 at the floor |

A dimension scores 100 inside its band and falls to 0 at twice the band's width outside it; shot lengths and their
spread score 70 at 1.75× beyond the band's edge. A one-take film scores neither shots nor cut sync. **Ship: mean ≥ 90,
no dimension under 70, both floors passing.** Read `density` (and look-audit's concurrency and moving share) on a
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

## 11. The test suites

`scripts/test/` holds the tests of the scripts themselves (not of a film): `lint-film.test.mjs` (every lint fixture,
both starters, the palette cases, and the self-tests of forensics, look-audit, measure-speed and grammar-score on
synthetic clips; `--part` splits it for a machine that limits job length), `grid-check.test.mjs`, `tokens.test.mjs`,
`mirror.test.mjs` (the HyperFrames mirror equals the Remotion tokens), `scripts-docs.test.mjs` (every script answers
`--help`; the docs name the internal helpers), `provenance.test.mjs` (public text speaks as house craft; no audio,
stray images or videos with sound in git), and the Python tests (`pick`, `deck`, `brand`, `like`, `track`, `score`,
`encode-tags`, `bash32`) and `assets.test.mjs`. `new-film.sh` copies scripts into a project without `scripts/test/`.
