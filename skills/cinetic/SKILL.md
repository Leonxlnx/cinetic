---
name: cinetic
description: Direct, build and render premium motion films from code - launch films, update films ("vX is out"), product and feature videos, looping feature animations, logo stings, UI walkthroughs, teasers and promo clips. Use this whenever the user wants any video, animation, motion graphic or animated demo made with Remotion, HyperFrames, HTML/GSAP or React, or asks to storyboard, time, score, render, polish or critique one - even if they only say "make a video about X", "animate this feature" or "we need a launch clip". It supplies a simple default path one agent finishes in one to two hours (a centred line alone, then the product doing what it said, in turn, then a centred lockup built from the last picture), plain-word copy checked by script, one text voice, seams that flow, devices that differ from the last films, real product UI and footage of the core action, current official logos, a licensed track cut to the picture, film-grade finishing and one measured review round.
license: MIT
compatibility: Needs Node 22+, ffmpeg 6+ with libx264, Python 3.11+ with numpy, scipy, soundfile, pyloudnorm, opencv-python and librosa (librosa and ffmpeg analyse the licensed track; fonttools, brotli and uharfbuzz for outlined logos; pillow for gradient plates), and Chromium or Chrome Headless Shell for rendering; earshot 0.4+ (in its own virtualenv) renders the effects kit and listens to the soundtrack. Works with Remotion 4 (React) or HyperFrames (HTML and GSAP).
---

# cinetic

You are directing a short film, not animating a web page. Picture, words and sound are one system driven by one
timeline file, and nothing is finished until it is rendered, measured and reviewed once against the standard below.

- **Engines.** Remotion 4.0.529 (React, frame-driven) is the default and carries every rich primitive. HyperFrames
  0.8.79 (HTML plus a paused GSAP timeline) mirrors the tokens and the timeline contract for HTML projects
  ([hyperframes-engine.md](references/hyperframes-engine.md)).
- **Paths.** `scripts/render.sh` and the rest work from the skill root and inside a film project (`new-film.sh` copies them in).
  Every script prints `--help` except the internal helpers `brand-svg.ts` (which `brand-kit.sh` calls) and `hf-preflight.cjs` (which `hf-finish.sh` runs).
- **Brand.** A supplied brand (logo, colours, fonts, screenshots, tone) wins over the house taste
  ([brand-kits.md](references/brand-kits.md)); record any banned look it brings in `BRIEF.md`.
- **Python.** Commands say `python3`; set `PYTHON` to an interpreter with `scripts/requirements.txt` installed
  (`node scripts/py.mjs --which` names it).

## The standard

These are the rules every film is held to, with their numbers. The gates named in brackets measure them.

1. **Words in the middle.** A statement is centred and sits in the middle band of the frame (its centre at 35-65 % of
   the height): centred for 80 % of the statement time or more, in the middle band for 85 % or more. Centred top or
   bottom only over a full-bleed picture. Never flush left at the top or the bottom. "Text on top, big picture below"
   at most once a film; a line beside, above or below a picture at most once per 30 s. (`layout-audit.sh` placement.)
2. **Line, then picture.** A line alone on a clean ground (0.5-2.3 s, about 1.3), then the product or the picture
   acting, full frame, with no statement over it (1-3.5 s), in turn, then the centred lockup. Type-only beats are 15 %
   of the shots or more and at least two a film; a line over a picture on at most 40 % of the beats, only where it
   names what the picture is doing; the first line on screen by 1 s. (`grid-check.ts` beats.)
3. **The picture tells what the product does.** Each picture beat shows the visible change that proves the line before
   it (input -> output, before -> after, a count rising); a line no picture proves is cut. The first picture beat shows
   the core action literally, with a real person giving the input where the input is human (real footage or a photo:
   `node scripts/assets.mjs recipe "<the product in your words>"`). With the words covered, every picture beat still
   reads at least partly. ([imagery.md](references/imagery.md) "Show the core action".)
4. **Less text, every word chosen.** 1-5 words a line typically, 2-7 at most, one claim, plain words a customer would
   use; 0.3-1.5 headline words a second; what the product is by 3 s. No text in 15 % of the frames or more; at most two
   text blocks at once outside a product beat; no floating chips, counters or captions beside a statement.
   (`copy-check.py`, `copy-check.py --ui src`.)
5. **Text with love: one voice.** Every line arrives in the film's one text voice (word build: each word fades in over
   20 f@60, 6 f apart, the line re-centring on an expo settle over about 15 f; or a blur-in, or an ink-in); at most one
   contrasting entry per 30 s, for the hero line only (a snap on the last word: one frame at x2.2, settling in 7 f).
   Statements at a cap height of 6-9 % of the frame height (bigger for the claim); one-line statements 80 % or more; a
   small lead line over big key words at most once a film. Emphasis is quiet and of one kind: the key word in the
   accent colour on at most 60 % of the lines; a box, marker bar, pill, underline or knockout only as the film's one
   signature, on one line. (`lint-film.mjs` `emphasis-share`, `emphasis-signature`.)
6. **Scene changes that flow.** Every hard cut carries something: the ground kept, the cut inside a blur, an anchor
   held within 10 px (the word slot, a shape's centre) or the motion carried; at most 10 % of hard cuts carry nothing.
   The ground flips light-dark at most twice a film, each a declared colour event. Two or three seam kinds a film, none
   over 45 % of the scene changes, and one exit-then-enter, text-swap or match-cut in a film of four lines or more.
   Build them with `fx/Seam` ([transitions.md §2](references/transitions.md#2-recipes-at-60-fps)). (`forensics.py --seams`.)
7. **Clean UI.** The product's real screens built in code at film size, every string the product's own: no bracket
   slot, no stand-in number, no kit sample, no title cut with "...". Left edges of stacked rows within 4 px, inner
   padding about 2.4 cap heights (never under 0.8), no text touching an asset, no accent bar beside a card.
   (`precheck.mjs`, `layout-audit.sh`, `copy-check.py --ui src`.)
8. **Logos current, presented well.** Other products' marks come from `scripts/logos.mjs` in their newest official
   form, verified on the brand's own page within 12 months, in one presentation a film (a chip in the line, pills round
   a centred line, or a wall), never a pill on every line (`logos.mjs check`). The end card is centred, built from the
   film's last element (the last picture's element becomes the mark, the last word the wordmark, the badge spins in),
   held 2-3 s on a creep, the name once and the one fact under it. The logo is the brand's own or built from the film's
   last element, never a sparkle, a star or a generic glyph.
9. **Its own film, never a template.** One ground family for the whole film (near-white with pictures, a black field
   under a key light, white with one brand band, a deep field with a pool of light, a soft sky world, a light act
   turning dark, a gradient field), one text voice, two or three moves, two or three seam kinds, one signature and one
   end-card design, picked from [catalogue.md](references/catalogue.md) and declared in `film.json`. The ground, the
   voice, the signature and the end card differ from each of the last three films, and the move set shares at most
   25 % with each of them; a film made from a template plays another device than its floor in half its slots or more.
   (`film-diff.mjs`; `deck.py` and the template deals leave the last films' choices out.)
10. **Premium, not just clean.** Depth and motivated light on the ground and the product (one key light, a rim, a
    contact shadow, two planes moving at different rates), the hero type large, the one signature move landing, and
    nothing static for more than about 0.8 s outside the end hold (holds creep or drift 0.3-1 px/f). A flat field with
    small type and a still card fails even when every gate passes.
11. **Simple.** The path below, one review round, about 90 minutes from the scaffold to the master and 120 at most;
    a gate that costs more than 5 minutes on a 30 s film is advisory.

## Hard bans

When you invent the look, none of these appear (`lint-film.mjs` checks the code, the director pass the frames).
- **Words:** grey bars or "Placeholder" where words belong; a film that does not say what the product is by 3 s;
  vague, fancy or metaphor copy (unleash, reimagine, seamless, elevate, unlock, the future of, magic) and slogan shapes
  ("X, reimagined", "Less X. More Y."); keyword piles; two lines readable at once (a declared swap excepted); a line over
  7 words or with two claims; eyebrow labels, stacked taglines, "Introducing…"; filler text, fake metrics.
- **Type:** serif faces, italic or oblique (or a skew faking one). One clean sans, plus a mono for code or numbers.
- **Colour:** orange, amber, beige, cream, tan or sand as an accent, a paper or a glow; neon; purple, violet or
  indigo; a monochrome accent wash; glassmorphism as a UI style.
- **Decoration:** emoji and stock icons; an accent bar down a card's side; sparkles for "AI", confetti, lens flares,
  code rain; bounce on anything that is not landing; a springy overshoot on copy.
- **Pictures:** a person, place or product drawn in SVG where a photo belongs; grey cards standing in for pictures;
  stock gestures (handshakes, pointing at screens); low-resolution or mixed-grade pictures.
- **Sound:** generated music; a film with no music; ducking the music under effects; copyrighted audio in any repository.
- **Credits:** no music or imagery credit in the picture; licence records stay private with the project.

Light and glow from a source, spectral accents, dithered gradients and glass are allowed inside a device that does a
job, with one dominant accent over the film's ground family ([lighting.md](references/lighting.md)).

## The simple path

Eight steps, each with its time in the budget. Read a reference only when its step needs it.

**1. Brief and scaffold (5 min).** Write `BRIEF.md`: the spec line (`1920x1080@60, 25s, format: launch, audio:
licensed track + launch kit`), what is supplied (a brand kit, a clip to feel like, footage, the products it works
with), the hard bans. Ask at most three questions, and only when the product, the format or the length is missing.
Then scaffold:
```
bash scripts/new-film.sh films/<name> --name "<Product>" [--brand <kit>] [--like <clip>] [--music <file> + licence flags] [--link-modules <node_modules>]
```
A launch gets `launch-simple` (the line, picture, line, picture, lockup film); `--format update` the update film; other
shapes are in [templates.md](references/templates.md) (`--template none` keeps the starter's own acts). It writes
`film.json`: the start time and the last three films' devices, to stay away from.

**2. Direction and script (10 min).** `python3 scripts/deck.py --brief "<one line>" --format launch [--have ui,photos]
[--brand brand/brand.json]` deals one direction from the brief and the history and writes `out/DIRECTION.md`
(`--options 3` deals three to choose from). Copy [assets/TREATMENT.md](assets/TREATMENT.md) to the project and write
the idea sentence (it fails with a competitor's name in it) and the script: line 1 says what the product is ("[Name]
turns [input] into [output]."), then one concrete thing it does a line, then the name and what to do. A 15 s launch is
3-4 lines, a 30 s one 5-7. `python3 scripts/copy-check.py TREATMENT.md` passes before any picture work
([copy-and-type.md](references/copy-and-type.md)).

**3. Picks and beat plan (5 min).** From [catalogue.md](references/catalogue.md) pick one text voice, two or three moves,
the signature, two or three seam kinds, the ground family, the end-card design and, when the film shows other products,
one presentation of their marks; write them into `film.json` `devices` and run `node scripts/film-diff.mjs`. In
launch-simple the product's name deals the voice, the ground, the seams, the end card and the camera
(`src/deal.ts`, never the last films' choices); pin a slot in `src/launch.ts` only for a reason. Then the beat plan in
`TREATMENT.md`: each picture beat names the visible change that proves the line before it.

**4. Music (10 min).** The track is chosen before the timeline and the picture is cut to it
([music.md](references/music.md)): `node scripts/music.mjs pick --mood "<words>" --length <s>` (the curated library;
`music.mjs search` without one), `get '#n' --to audio/music` (its licence record beside it; never the last film's
track), then `python3 scripts/audio/track.py analyze`, `edit --bars <BARS> --end auto` (the track's own ending, else a
fade: never a cut), `grid`, `check`. The track plays only through `score.py` (`--bed-only` before the kit exists);
never cut it by hand.

**5. The product and the pictures (35 min).** In launch-simple you write two files: `src/launch.ts` (each line, its
picture, the strings that picture shows, the one fact for the end card) and `src/product.tsx` (each picture as the
product's real screen built in code with the kit, the first one showing the core action, the last one with its hero
element). The kit shows only the film's own content: a `DenseScreen` takes `world={filmWorld({...})}`, a panel its
`data`, a tile its own lines; a part given nothing draws a dashed empty box and fails precheck and the ship gate
([product-ui.md](references/product-ui.md)). Real people, places and objects are real photos or clips with a studio
finish, never drawn (`node scripts/assets.mjs recipe "<product>"`, then `search`, `sheet`, `get`, `grade`;
[imagery.md](references/imagery.md)). Other products' marks: `node scripts/logos.mjs get <name> --film .`. Before every
still: `node scripts/precheck.mjs` (seconds: every act imports, timing asserts, empty kit parts, text that does not
fit). Look with `node scripts/frames.mjs still <frame>` (half size, several frames in one call).

**6. Assemble, sound and check (15 min).** `npm run check` (tsc, `lint-film.mjs`, `grid-check.ts`) clean; `npm run cues`;
the effects kit cast for this film's actions (`kit.py init --preset launch` unless `--music` did it, then `python3
scripts/audio/kit.py cast`, `npm run kit`, `kit.py check`), then `npm run audio`. Render the preview: `bash scripts/render.sh Film out/preview.mp4 --preview --audio
public/audio/soundtrack.wav` (it runs `probe.py` and `check-sync.py`). Then the fast gates: `python3
scripts/copy-check.py --ui src`, `bash scripts/layout-audit.sh Film --copy --scale 0.5`, `python3 scripts/forensics.py
out/preview.mp4 --cues out/cues.json --grammar-only` (and `--seams`), `node scripts/logos.mjs check`
([checks.md](references/checks.md) §1).

**7. One review round (15 min).** `node scripts/frames.mjs sheet` (about 30 labelled tiles), then the director pass
([assets/critics/director.md](assets/critics/director.md)): read the picture beats with the words ignored first (what
does the product do in each?), then the checklist of the standard above, item by item, with frames. Fix every P0 and
the P1s the time allows, re-render only what changed. A second round only when a gate fails
([review-loop.md](references/review-loop.md) §1).

**8. Master and delivery (10 min).** `bash scripts/render.sh Film out/film.mp4` (`--blur` when the film's blur policy
asks; parts that resume after a stop), full `forensics.py` on the master, then `bash scripts/deliver.sh out/film.mp4`
with the format's variants (it runs `credits.py`: credits go into `CREDITS.md`, never the picture), a short
`README.md`, and `node scripts/film-diff.mjs --record` (the film joins the history and the run's minutes print).

## Formats

| Format | Length | Template | Script | Deliverables |
|---|---|---|---|---|
| Launch film | 15-30 s (to 45) | `launch-simple` | what it is, 2-5 things it does, the close | 16:9 master, 9:16 and 1:1 variants, poster |
| Update film ("vX is out") | 8-20 s | `update` | "[Name] [version]", one line per change, the close | master, poster, 9:16 |
| Product or feature video | 8-30 s | `launch-simple` or `ui-walkthrough` | 3-6 lines | master, poster |
| UI walkthrough | 20-90 s | `ui-walkthrough` | what it is, one line per step | master, SRT captions |
| Feature loop | 4-15 s, whole bars | `--template none` | 1-2 lines, reads muted | MP4, WebM, GIF, seamless seam |
| Logo sting | 3-8 s | `--template none` | the name and at most one line | MP4, ProRes 4444 alphas, poster |

Recipes per format in [formats.md](references/formats.md); update films in [update-films.md](references/update-films.md).
Films render at 60 fps by default (`--fps 30` halves the render: keep sharp moves under about 25 px a frame at 1080p);
a loop's last frame flows into frame 0 (`forensics.py --loop`, `render.sh --loop`). A sting or loop runs steps 1-3 as
one page and builds as one act.

## Craft essentials

**Timing.** `src/timeline.ts` is the only source of timing; picture, cues and checks import it. Acts, the reveal and
the ending land on the track's events within 1 frame (`b(bar, beat, sub)` on `MUSIC`); graphic cuts on its accents,
the picture leading by up to 3 f; a 0.2-0.5 s stop or dip before the biggest reveal; a change meant for a cue starts at
`cue - 1` ([timing-grid.md](references/timing-grid.md)).

**Motion.** Curves by role from `lib/anim.ts` (`E.glideOut` to arrive, `stdInOut` to reposition, `buildIn` to leave,
`linear` for colour and drifts); one spring class a film, never an overshoot on type; never scale from zero (start at
1.28-1.9x and settle); speed carried through cuts (launch into the cut, carry out at about 0.7, decaying); nothing
changes state in one frame (a 16 f@60 glide, `glideValue`), every move lands under 10 % of its peak speed before its
cut (`landBeforeCut`), every hold drifts (`holdDrift`) ([motion-tokens.md](references/motion-tokens.md),
[camera.md](references/camera.md)).

**Engine.** Everything is a pure function of the frame: no CSS transitions or keyframes, no `Math.random`, `Date.now`
or `performance.now` (seeded `rand(seed)`); all translation in one `transform`; clamp every value that feeds geometry;
no `will-change` where a blur animates, defocus at fixed levels, large soft shapes baked into dithered plates; fonts
loaded before any measurement. Remotion renders muted and ffmpeg muxes; never run `npx remotion still` or `render` in a
loop (each call bundles again: `frames.mjs` and `render.sh` share one bundle)
([remotion-engine.md](references/remotion-engine.md), [chromium-rendering.md](references/chromium-rendering.md)).

**Sound.** A licensed, human-made instrumental track cut to the picture carries the film; earshot's kit gives each
visible action its own effect (a line landing, a click, a result, the seams that move, one hit on the lockup), placed
by `plan.py` from the cues the picture exports, at -14 LUFS (-16 for a sting) and -1.5 dBTP, no ducking, a stop-down
before each hit; `check-sync.py` holds every effect and the music within 1 frame of its picture
([sound.md](references/sound.md)).

**Finishing.** BT.709 tags, no banding (dithered gradients), blur as a declared policy (`LOOK.blur`: crisp films sharp,
camera films with shutter samples on fast frames); never upscale a final ([finishing.md](references/finishing.md)).

## When you need more

| When | File |
|---|---|
| picking the voice, moves, seams, ground, end card, marks | [references/catalogue.md](references/catalogue.md) |
| the script, one line at a time, type roles and sizes | [references/copy-and-type.md](references/copy-and-type.md) |
| the idea, the inventory, the direction deck, story shapes | [references/concept-and-story.md](references/concept-and-story.md) |
| the beat grammar and timings per format, social variants | [references/formats.md](references/formats.md) |
| a template other than launch-simple, and how a film differs from it | [references/templates.md](references/templates.md) |
| colour, ground families, marks and lockups | [references/brand-and-color.md](references/brand-and-color.md) |
| a supplied brand kit; a clip to feel like | [references/brand-kits.md](references/brand-kits.md), [references/clip-match.md](references/clip-match.md) |
| the track: licences, analysis, the edit, cutting to music | [references/music.md](references/music.md) |
| real photos and footage, the core action, the studio finish | [references/imagery.md](references/imagery.md) |
| the product's UI, the kit, cards, cursor, data | [references/product-ui.md](references/product-ui.md) |
| the timeline, declarations, density, holds | [references/timing-grid.md](references/timing-grid.md) |
| curves, springs, carry, creep; the camera; the seams | [references/motion-tokens.md](references/motion-tokens.md), [references/camera.md](references/camera.md), [references/transitions.md](references/transitions.md) |
| the key light, living light, glow and plates | [references/lighting.md](references/lighting.md) |
| every device with timing and build (search it, never read it whole) | [references/devices/INDEX.md](references/devices/INDEX.md) |
| the effects kit, cues, placement, levels, mastering | [references/sound.md](references/sound.md) |
| render paths, blur, banding, encoding, deliverables | [references/finishing.md](references/finishing.md) |
| every gate script and its rules | [references/checks.md](references/checks.md) |
| the review round, and the long review when asked | [references/review-loop.md](references/review-loop.md), [assets/critics/](assets/critics/) |
| cheap-looking tells and the mistakes of code films | [references/taste-and-slop.md](references/taste-and-slop.md), [references/craft-rules.md](references/craft-rules.md) |
| a whole film from idea to master, with its mistakes | [references/worked-example.md](references/worked-example.md) |
| update films; Remotion; HyperFrames; render artifacts | [references/update-films.md](references/update-films.md), [references/remotion-engine.md](references/remotion-engine.md), [references/hyperframes-engine.md](references/hyperframes-engine.md), [references/chromium-rendering.md](references/chromium-rendering.md) |
| the drawable technique library (search it with `pick.py`) | [references/technique-library.md](references/technique-library.md) |

## Tools

| Need | Tool |
|---|---|
| a project from the starter and a template; a brand kit, a clip, a track | `scripts/new-film.sh` |
| one dealt art direction (or three to choose from); the sheet; a redraw | `scripts/deck.py` |
| the film's devices against the last three films and its template; the history | `scripts/film-diff.mjs` (`--record`, `--history`) |
| is the script clear; are the UI strings real words; OCR of held stills | `scripts/copy-check.py` (`--ui src`, `--final`, `--ocr`) |
| the grid, the beats, the script, the seams, the declarations | `scripts/grid-check.ts` |
| static bans, tokens, placeholders, emphasis | `scripts/lint-film.mjs` |
| imports, timing asserts, empty kit parts, text fit, in seconds | `scripts/precheck.mjs` |
| stills and contact sheets from one cached bundle | `scripts/frames.mjs` (`still`, `sheet`) |
| placement, safe area, overlaps, covered text, kit icons, stand-ins | `scripts/layout-audit.sh` |
| pixel QA: pops, holds, seams, ground flips, motion gates | `scripts/forensics.py` (`--grammar-only`, `--seams`, `--loop`) |
| previews, masters, the blur pass, splices | `scripts/render.sh` |
| spec, A/V lag, frame sync and true-peak gates | `scripts/probe.py`, `scripts/check-sync.py` |
| poster, GIF, WebM, alpha, variants, credits | `scripts/deliver.sh` |
| footage of the core action, photos, grading | `scripts/assets.mjs` (`recipe`, `search`, `sheet`, `get`, `grade`, `check`) |
| other products' official marks, current and verified | `scripts/logos.mjs` (`get`, `check`) |
| the track: find, download with its licence; analyse, edit, grid | `scripts/music.mjs`; `scripts/audio/track.py` |
| the effects kit, its plan, the mix, the listening pass, credits | `scripts/audio/kit.py`, `plan.py`, `score.py`, `listen.py`, `credits.py` |
| a supplied kit; a palette or a ground family's tokens; a font | `scripts/brand.py`; `scripts/palette.py` (`--family`, `--recipe`); `scripts/add-font.mjs`, `scripts/font-match.mjs` |
| advisory reads: the floors against a flat film, the house grammar, on-screen speed, data realism | `scripts/look-audit.py`, `scripts/grammar-score.mjs`, `scripts/measure-speed.py`, `scripts/data-check.mjs` |
| a clip's grammar and the guard against copying it; the detail pass; device draws | `scripts/like.py`; `scripts/detail-pair.py`; `scripts/pick.py` |
| the scripts' own tests | `scripts/test/` |
