---
name: cinetic
description: Direct, build and render premium cinematic motion design from code — launch films, update films ("vX is out"), product and feature videos, looping feature animations for landing pages and social, logo stings and reveals, UI walkthroughs, app demos, kinetic type, teasers, trailers, intros and promo clips. Use this whenever the user wants any video, animation, motion graphic or animated demo made with Remotion, HyperFrames, HTML/GSAP or React, or asks to storyboard, time, score, render, polish or critique one — even if they only say "make a video about X", "animate this feature", "we need a launch clip" or "make it feel like this clip". It supplies a dealt art direction with one signature shot, a script in plain words that tells a stranger within 5 seconds what the product is and does (checked by copy-check.py), shown one clean line at a time with a different text animation for each line, graphic effects around them (dithered gradients, glass, spectral colour, morphs, grids, loaders, product UI built in code) and a deep device vocabulary, brand-kit intake that defers to a supplied brand, a beat-locked timeline that drives the picture and a soundtrack built from a licensed music track cut to the picture plus code-made effects, choreography and transition craft, real product UI in motion, film-grade finishing (declared motion blur, no banding, BT.709, sync-checked mux) and a measured self-critique loop on contact sheets and renders.
license: MIT
compatibility: Needs Node 22+, ffmpeg 6+ with libx264, Python 3.11+ with numpy, scipy, soundfile, pyloudnorm, opencv-python and librosa (librosa and ffmpeg analyse the licensed track; fonttools, brotli and uharfbuzz for outlined logos; pillow for gradient plates), and Chromium or Chrome Headless Shell for rendering; earshot 0.4+ (in its own virtualenv) renders the effects kit and listens to the soundtrack. Works with Remotion 4 (React) or HyperFrames (HTML and GSAP).
---

# cinetic

You are directing a short film, not animating a web page. Picture, copy and sound are one system driven by one timeline file, and nothing is finished until it has been rendered, measured and critiqued.

- **Engines.** Remotion 4.0.529 (React, frame-driven) is the default and carries every rich primitive. HyperFrames 0.8.79 (HTML plus a paused GSAP timeline) is the alternative for HTML projects; it mirrors the tokens, pace and timeline contract (§7).
- **Numbers.** Every number here is a house default with a normal range: a starting point you move away from with a stated reason.
- **Brand.** A supplied brand (logo, colours, fonts, screenshots, tone) wins; the house taste covers what you have to invent (`references/brand-kits.md`).
- **Paths.** Paths such as `scripts/render.sh` work from the skill root and inside a film project, because `scripts/new-film.sh` copies every script into the project. Every script except the internal helpers `brand-svg.ts` (which `brand-kit.sh` calls) and `hf-preflight.cjs` (which `hf-finish.sh` runs) prints `--help`.
- **Worked example.** `references/worked-example.md` walks through Tessel, a 33 s launch film, with its mistakes and fixes. Read it once before your first film.

## The bar

The target is a film people watch twice and ask "how was that made?": one idea the product owns, told in pictures, where every frame looks chosen.
- **Substance before polish.** Show the specific, clever thing this product does, the thing a simpler product wouldn't.
- **Clear copy, one clean line at a time.** A stranger knows within 5 seconds what the product is and does. Line 1 (or 2) says what it is in plain words ("[Name] is a [plain category] for [who]." or "[Name] turns [input] into [output]."), then 3–5 lines each say one concrete thing it does, with a verb, while the product's UI shows it; the close is the name and what to do. 2–7 words a line, no metaphors, slogans or fancy words. One line is on screen at a time, large and frontal on a clean ground.
- **Text animation is the main event.** Every line arrives its own way (a different text animation per line, from the type presets and the device book), and graphic effects surround it: dithered gradients, glass, spectral colour, morphs, grids, loaders, the product's UI built in code. The picture never rests: the camera is the main animator, speed carries through the cuts. Behind type the ground is a clean field.
- **Pictures are an accent.** Only the product's own screens, or a high-quality picture that carries the idea, and only when the film has them. Sloppy stock is worse than none.
- **One signature shot per film**, dealt with the direction: the one moment built to be remembered.
- **Its own look.** Every film gets a direction from the deck and a palette from its brand, never the starter's look or your last film's.
- **Ultra clean and smooth.** Every move eased by role, weighted, deterministic at 60 fps: no jitter, no pops, no effects standing in for ideas.
- **Written and shown.** The script tells the story line by line; the picture proves each line as it lands; the idea reads with the sound off.
- **Music in every film.** A licensed, human-made track cut to the picture, with effects caused by something visible.
- **No decoration; the picture is clean, not sparse.** Every element has a job; the picture is always alive.
- **Proof, not impression.** You only know once you have watched the render and measured it.

## Hard bans

When you invent the look, none of these appear. `lint-film.mjs` checks the code; `look-audit.py` and the critics check the frames.
- **Words:** a film that does not say what the product is by 3 s; vague, fancy or metaphor copy (unleash, reimagine, seamless, elevate, unlock, the future of, magic, journey, a second brain) and slogan shapes ("X, reimagined", "Less X. More Y."); keyword piles (lines that say nothing: "Speed." "Less noise."); two lines on screen at once (a deliberate swap excepted); a line over 7 words or with two claims; eyebrow or kicker labels; stacked taglines and "Introducing…"; text walls and filler text (decorative mono captions, fake metrics, labels nobody needs, lorem ipsum). Every word on screen earns its place.
- **Type:** serif typefaces, italic or oblique styles (or a skew that fakes one). One clean sans, plus a mono for code or numbers if the product needs it.
- **Colour:** orange, amber, beige, cream, tan or sand as an accent, a paper or a glow; neon; purple, violet or indigo; a monochrome accent wash over the whole film; glassmorphism as a UI style.
- **Decoration:** emoji and stock icons; sparkles for "AI", confetti, lens flares, code rain; bounce on anything that isn't landing; a springy overshoot on copy; letters that move one by one outside a line's own text animation.
- **Pictures:** stock as the base of a film (people at laptops, handshakes, generic city time-lapses), low-resolution or mixed-grade pictures. A picture appears only when it is the product's own or carries the idea.
- **Sound:** generated music (a synth bed, a tuned melody of effects, an AI track); a film with no music; ducking the music under effects; copyrighted audio in any repository (the track, the soundtrack, stems and decode caches stay git-ignored).
- **Credits on screen:** no music or imagery credit ever appears in the picture; licence records stay private with the project.

**Allowed as devices:** light and glow that come from something (a lit tile, a floor glow, a frame that blooms into light), rainbow, spectral and iridescent accents, multi-hue gradients (always baked and dithered), glass and refraction: each when it does a job inside a device, with one dominant accent per film over neutral grounds (`references/lighting.md` §5). What remains is plenty: type that moves in many ways, graphic effects, the product's own UI, ink and neutral grounds (light, mid, slate or a deep field), one accent with a meaning and one support hue beside it (10–30 % of the film, `references/brand-and-color.md` §9b), one sans, one key light, and motion that is clean and weighted.

A brand that supplies a banned look (their serif wordmark, their orange) wins: record it in `BRIEF.md` and mark the lines with `// cinetic:brand-supplied <what>`.

## 1. Formats and defaults

Choose a row first. Launch films and update films are the two first-class formats; recipes for all are in `references/formats.md`. Calm pace is the default; crisp is an explicit opt-in for energy (teasers, drops).

| Format | Length | Shot band (median) | Script: lines · words a line (one line on screen) | Sound | Deliverables |
|---|---|---|---|---|---|
| Launch film / teaser | 15–45 s | 1.3–2.2 s | 5–8 (what it is, 3–5 it does, the close) · 2–7 | licensed track + launch kit, −14 LUFS | 16:9 master, 9:16 and 1:1 re-layouts, poster, brand kit if invented |
| Update film ("vX is out") | 8–20 s | 0.8–1.6 s | 4–6 (name and version, one per change, the close) · 2–6 | licensed track + launch kit | master, poster, 9:16 |
| Product / feature video | 8–30 s | 1.3–2.2 s | 3–6 · 2–7 | licensed track + launch kit | master, poster |
| Feature loop | 4–15 s, whole bars | 0.5–1.0 s | 1–2, reads muted · 2–6 | muted, or a track folded at the seam | MP4, WebM, GIF, seamless seam |
| Logo sting | 3–8 s | one take | the name + at most 1 · 2–5 | a short licensed cue + one kit element, −16 LUFS | MP4, ProRes 4444 alphas, poster |
| UI walkthrough | 20–90 s | 2–3 s | what it is, one per step · 2–7 | licensed calm track + UI effects | master, SRT captions |

Use 60 fps whenever UI, text or the camera moves (a GIF exports at 25 fps from the 60 fps master).

## 2. The five laws

1. **One idea, specific to this product,** written as the idea sentence: "In this film, [something only this product has] becomes [the device this direction calls for]", and it fails if a competitor's name fits. *Why:* a viewer carries away one thing.
2. **One story device and one signature shot.** An object, shape or colour travels through every shot and resolves into the mark; one shot is built to be remembered. *Why:* continuity reads muted, and an owned object makes the film unmistakably this brand's.
3. **One dominant accent with one meaning,** over neutral grounds, at its share of the picture, flooding the frame at most once. *Why:* a colour that means something is read without words.
4. **One house motion system:** curves by role, one spring class, every frame from `timeline.ts`. *Why:* consistent motion is brand motion.
5. **Verify by measurement.** Done means the rendered pixels and decoded audio pass the scripts, the floors and a round of critique. *Why:* Studio playback hides pops, slips and flat stretches.

## 3. Workflow

Every step writes a file, and every gate is a check you run. Work inline; subagents are for critique (§8).

### Step 0: Brief → `BRIEF.md`
- If the brief states the product, the message, the format and the length, infer the rest and write the assumptions down; otherwise ask at most 3 questions (the product in one line, the format and length, where it will be shown).
- **Inventory what is supplied:** a brand kit (logo, colours, fonts, screenshots, product photos), a clip to feel like, real footage or pictures worth building on, a sonic logo, a voice. Each has a route: `brand.py` (Step 2), `like.py` (Step 2), pictures (Step 4, optional), the kit (Step 8).
- Choose the engine (Remotion by default; HyperFrames for an HTML project or `--batch` renders) and the pace (calm unless the brief asks for energy).
- Copy the hard bans into `BRIEF.md`, plus brand-supplied exceptions: critics are prompted with it word for word.
- Scaffold: `bash <skill>/scripts/new-film.sh films/<name> --fps 60 --size 1920x1080 [--format update | --template ui-walkthrough|capability-reel|prompt-run|social-ad|type-explainer] [--brand <kit>] [--like <clip>] [--music <file> + licence flags] [--pace crisp] [--engine hyperframes] [--link-modules <dir>/node_modules]`. A template lays a whole film's structure over the starter (timeline, acts, choreography, sound plan, a content file of slots): a product's flow in steps, a launch close from breadth to the name, a request worked through in steps, a 15 s ad cut on pictures, or an explainer told in type one sentence at a time; `references/templates.md` says which fits.
- Python: the commands below say `python3`; on Windows that name is often the Microsoft Store alias. Set `PYTHON` to the interpreter of an environment with the packages (`node scripts/py.mjs --which` prints the one the npm scripts and `render.sh` use) and run the scripts with it.
- **Gate:** a spec line, e.g. `1920x1080@60, 30s, pace: calm, format: launch, audio: licensed track + launch kit, stop ending`.

### Step 1: Direction → `out/direction.json`, `TREATMENT.md`
Read `references/concept-and-story.md` now.
- **Inventory first:** what the name means, the non-obvious behaviour ("unlike the obvious version, it…"), the product's own objects, its one honest number, the pain scene, the category's clichés.
- **Deal the direction; don't invent the look.** `python3 scripts/deck.py --brief "<one line>" --format <launch|update|…> --pace <calm|crisp> [--have ui,input,photos,footage,audio,number,name] [--seconds N] [--changes N] [--brand brand/brand.json] --options 3` deals three complete art directions (world and light, palette recipes, camera, cuts, type, story shape, one signature shot, the lockup, beat and update skeletons). The deal favours type-led directions (the line is the shot) and graphic ones; imagery-led directions are dealt only with `--have photos` (the product's own pictures, or a set worth building on) or `footage`.
- **Choose by the idea**, write the idea sentence and run the competitor test; then deal the sheet: `deck.py … --direction <id>` (writes `out/direction.json`, `out/DIRECTION.md`, and prints the matching `pick.py` line). Adopt it; redraw a slot (`--redraw palette|type|signature|direction --reason "…"`) only when it contradicts the brand, needs an asset that does not exist, or cannot carry the idea.
- Run the three concept lenses inside the direction (the verb made literal, the pain made visible, a formal device); the direction supplies the grammar.
- **Gate:** the Direction block in `TREATMENT.md` (seed, id, idea sentence, competitor test, story shape, signature shot and its beat, lockup kind, redraws); the logline ≤ 15 words; the specificity test answered.

### Step 1b: Script → `TREATMENT.md` (Script), then `copy-check.py`
Read `references/copy-and-type.md` §1–2b now. The script is written before any build, and everything after it serves it. A stranger must know within 5 seconds what the product is and does: be clear, never fancy.
- **The launch formula:** line 1 (or 2, after one short hook) says what the product is in plain words, on screen by 3 s: "[Name] is a [plain category] for [who]." or "[Name] turns [input] into [output]."; then 3–5 lines, each one concrete thing it does, said with a verb and shown by the product's UI at the same moment; then the name and what to do (a URL, "Out now"). **Update films:** "[Name] [version]" first, then one line per change, each a result the user sees.
- **Plain words:** short real sentences of 2–7 words, one claim each, the words a customer would use; no metaphors, no slogans, no fancy words (unleash, seamless, elevate, unlock, the future of), no abstract noun without a verb.
- **One clean line on screen at a time.** A line leaves (or turns into the next by a declared swap) before the next arrives. Set it on one line, sized to fit; nothing else to read beside it except the product's own UI.
- **Each line gets its own text animation**, all different: the build, a colour develop, a decode, a wheel, an erode, a slice, an echo, a typed focus pull (the type presets and the device book's type families; `pick.py` draws one per line at Step 5). The animation fits what the line says.
- **Never vague.** "Unleash your team's potential." and "Speed. Less noise." say nothing; "Tessel moves meetings when plans change." says what it does.
- **Gate:** `python3 scripts/copy-check.py TREATMENT.md` passes before any picture work (vague and fancy words, metaphors, slogans, no verb, two claims, lines over 7 words, no name, nothing that says what the product is by 3 s), and the "a stranger reads" summary it prints says what the product is, what it does and what to do.

### Step 2: Brand, clip and look → `src/brand/`
Read `references/brand-and-color.md` (and `references/brand-kits.md` with a kit, `references/clip-match.md` with a clip).
- **A supplied kit:** `python3 scripts/brand.py <kit> --name "Product"` writes `brand/brand.json`, the tokens (the kit's own greys as grounds, the brand accent), the logo's parts (`src/brand/logo.ts`), fonts and screenshots. `brand.py --check` after edits.
- **A clip to feel like:** `python3 scripts/like.py measure <clip>` writes `out/like.json` and `out/LIKE.md`. Borrow its grammar (pace, rhythm, curve families, density, camera habits, proportions), never its content (no layout, text, logo, colours, footage or music). The film keeps its own idea and direction.
- **Inventing a brand:** three adjectives → typeface (`node scripts/add-font.mjs <name>`), stage, accent; `python3 scripts/palette.py --recipe <dealt recipe> --accent '#…'` writes the tokens from the house colour system; a mark sheet of 6–10 directions with the misread test; a lockup set like a typographer. The starter's `// cinetic:placeholder` markers fail lint until replaced.
- Render 2–4 style stills (the mark at 16 px and full size, one line of the script in its text animation, one product frame) and look at them.
- **Gate:** stills pass §4; `node scripts/lint-film.mjs src` reports no placeholder and no off-token colour or font; a kit passes `brand.py --check`.

### Step 3: Music first → `audio/music/`, `src/music.ts`
Read `references/music.md` now. The track is chosen before the timeline; the picture is cut to it.
- **Find it for this film:** a licensed, human-made, instrumental track chosen by the film's mood and pace, under a licence that needs no credit. The personality row (`references/sound.md` §5.5a) gives the brief (mood words, a tempo range, an entry for the reveal, a break, an ending); `node scripts/music.mjs search --mood "<the brief's words>" --bpm <range> --length <s>` searches the free catalogs and ranks by mood, tempo, length and energy curve.
- **Audition three, keep one:** `node scripts/music.mjs sheet --measure` lists the first three with mood, tempo, length and energy curve (intro, break and entry, ending); listen to them, choose by the brief, name the runner-up in the delivery note. Never the last film's track: the finder holds it back and never offers the same track first twice in a row (`~/.cinetic/music-history.json`).
- **Download it with its record:** `node scripts/music.mjs get #n --to audio/music` writes `<name>.licence.json` (the licence page read again now); a track found elsewhere is recorded as you download it with `python3 scripts/audio/track.py add <file> --title … --artist … --source … --page … --licence … --seen-quote "<as read on the item's page now>" --seen-url …` (`new-film.sh --music` does this and sets up the launch kit).
- **Analyse, edit, grid:** `track.py analyze <file>`, `track.py edit --bars N --reveal-bar K --end stop|button|ring`, `track.py grid` (writes `src/music.ts`; `npm run music` repeats them).
- **Gate:** `track.py check` passes (licence record, joins, nothing from the track in git); the downbeat is confident or its phase set by hand; the reveal bar holds an entry.

### Step 4 (optional): Pictures → `public/assets/graded/`
Read `references/imagery.md` only when the film has pictures worth showing: the product's own screens or photography, or a high-quality picture that carries the idea. Pictures are an accent, never the base of the film; sloppy stock is worse than none, so most films skip this step.
- From the product or the brand kit first; found pictures only when one carries the idea: `node scripts/assets.mjs search "<noun + viewpoint>" --kind photo|video|texture|art`, `sheet` (look before choosing), `get #n --to public/assets`, `grade public/assets --accent '#…' --out public/assets/graded` (one look; `natural` by default), `check`.
- Only no-credit licences (CC0, public domain, Pexels, Unsplash, Pixabay, Mixkit); the private record `assets/licences.json` is never shown or published.
- **Gate:** each picture earns its beat (it says something a graphic could not), real resolution, one grade, `assets.mjs check` passes; refuse anything that reads as stock.

### Step 5: Beat sheet and timeline → `TREATMENT.md`, `src/timeline.ts`
Read `references/copy-and-type.md` and `references/timing-grid.md` now.
- **Beat sheet on the dealt skeleton:** columns bar | time | picture | device | line (the sentence, its text animation) | sound. Each sentence of the script on its own beat, one line on screen at a time (a line may build in beats as a `chain()`; it is still one line); the signature shot on its beat.
- **Draw the devices:** run the `pick.py` line the deck printed (`python3 scripts/pick.py --format <fmt> --energy <calm|medium|high> --seconds <s> --lines <sentences> --json out/qa/picks.json`): the picture plan (one device per beat, about 1.5–2.5 s, from many families: VFX, camera, seams, the product, the end card) and the line track (one text animation per sentence, all different, plus exits). Read each drawn device in full (`pick.py --show <id>`, the device book `references/devices/`); reroll with `--family`/`--category` and `--exclude`, at most twice, with a reason. A device mentioned in the brief is one beat's device, not the whole film's, unless it is the film's identity.
- **Write the timeline on the music's bars:** `ACT`, `CUE`, `COPY` (`line()`, `chain()`), the declarations (`LOOK`, `SEAMS`, `STEPPED`, `FLASHES`, `CAMERA_BLUR`, `END`, `REVEAL`, `SPRING_CLASS`, `STRUCTURAL`, `SALIENCE`); structure on the track's events, graphic cuts on its accents (`timing-grid.md` §4b).
- **Gate:** `npx tsx scripts/grid-check.ts src/timeline.ts` clean in music mode (grid, holds, event gap, the script: every line 2–7 words, one line at a time, and copy-check on `COPY`, word budget, text flow, read-quiet by salience, shot bands, seam plan, cut on sound, reveal dip, anti-metronome, declarations); every beat names its device and every line its text animation, no two neighbours share a family; a line on screen ≤ 85 % of the body, with a text-free 1.5 s in every 10 s.

### Step 6: Build, act by act → `src/acts/`
Before you write motion, read `references/motion-tokens.md`, `references/camera.md`, `references/transitions.md`, `references/lighting.md`, and `references/product-ui.md` if the product appears. Keep `references/chromium-rendering.md` open while you debug.
- Each act is a pure function of `useCurrentFrame()`, one `<Sequence>` per act in `Film.tsx`, each registered as its own composition.
- **Build with the primitives** (pure state functions with thin components, reading the film context): pick by job below; read the device book for anything else. Never a raw bezier or an inline spring in an act.
- **One camera for the film.** The ground breathes; the camera may stop: it moves on about 83–95 % of the body and locks for 0.5–1 s on each type read (life continues in the type build, the light, a counter), creeps or drifts through the other holds, cuts on the fastest frame with speed carried across (`launch`, `carry`, `handoffShot`), three depth planes, the soft foreground.
- **Light:** one key light (`KeyLight`, `ReliefScene`) and living light (`LightField`), one light event per act.
- **The product** as real components at film size (`src/kit`, every web size ×1.9, nothing under 36 px in focus), data from one `data.ts` with asserts that hold on every frame.
- Words reach the screen through `COPY` only (`TypeLine`, `Chain`, `Words`); never a string literal in an act. One line at a time; a deliberate swap declares `swap: '<id>'` on the incoming line. A progressive reveal never spells another word partway.
- List each primitive instance's `declares()` in `src/sync.ts`; export every frame the sound needs.
- Iterate each act: stills at cue −2, 0, +2; `python3 scripts/sheet.py --comp Act2 --every 2 --out out/qa/act2.png`; `bash scripts/layout-audit.sh Act2 --cues`.
- **Gate:** `lint-film.mjs` clean; `layout-audit` reports no safe-area, overlap, covered-text or `words` violations; every act sheet has written notes.

| Job | First primitives | More in the device book |
|---|---|---|
| Lines of the script (the main event) | `TypeLine` (`fx/TypePresets`: sixteen presets, one per line: develop, build, typeFocus, arc, assemble, decode, wheel, erode, cycle, punch, echo, open, highlight, slice, redact, swarm; exits cut, blur, drop, drift, push, split, swarm, dive), `Chain`, `Words`, `Oversize` | [type arrivals](references/devices/type-arrivals.md), [lines, layout and swaps](references/devices/lines-layout-and-swaps.md), [type exits](references/devices/type-exits.md) |
| Emphasis on a word | `LineSnap`, `FocusWord`, `HueSweep`, `Letters`, `MaskRise`, `Scramble`, `Corners`, `Brackets` | [marks, markers and annotations](references/devices/marks-markers-and-annotations.md) |
| Camera | `lib/camera-moves` (`scaleBreath`, `whip`, `zoomThrough`, `reframeChain`, `reversal`, `punchOut`, `parallax`), `SnapZoom`, `RackFocus` | [camera](references/devices/camera.md), [camera transitions](references/devices/camera-transitions.md) |
| Seams | `MorphChain`, `Iris`, `Exposure`, `Window`, `Dive`, `BlobRing`, `Wipe`, `CutFx`, `BlockStep`, `Pixel` | [cuts and seams](references/devices/cuts-and-seams.md), [morphs](references/devices/morphs-and-object-handoffs.md), [wipes, masks and irises](references/devices/wipes-masks-and-irises.md), [speed and rush](references/devices/speed-and-rush.md) |
| Product moment | `Cards`, `Bubbles`, `Scroll`, `Develop`, `HardStep`, `Cursor`, `Roll`, `TypeOn`, `src/kit` | [UI choreography](references/devices/ui-choreography.md), [micro-interactions](references/devices/micro-interactions.md), [cursor](references/devices/cursor.md), [loaders](references/devices/loaders-and-progress.md), [data and numbers](references/devices/data-and-numbers.md) |
| Pictures (an accent, only with pictures worth showing) | `Photo`, `Footage`, `FootageRamp`, `Montage`, `TypeMask`, `Cutout`, `Lens`, `GradientMap` | [photos and footage](references/devices/photos-and-footage.md), [collage and composition](references/devices/collage-and-composition.md) |
| Light, colour, materials | `KeyLight`, `ReliefScene`, `LightField`, `Glow`, `Spectral`, `Glass`, `Gradients`, `Grades`, `TypeFill`, `Textures` | [colour and light](references/devices/colour-and-light.md), [glass, glow and spectral](references/devices/glass-glow-and-spectral.md), [texture, grids and finish](references/devices/texture-grids-and-finish.md) |
| Depth, cadence, timing | `parallax`, `Stepped`, `Markers`, `Flip`, `Orbit`, `Rush` | [depth and 3D](references/devices/depth-and-3d.md), [cadence and grammar](references/devices/cadence-and-grammar.md), [sound and timing](references/devices/sound-and-timing.md) |
| Logo and end card | `Wordmark` (`AssembledMark`, `Lockup`, `HotGlyphs`), `brand/Mark` (`LogoMark`, `logoParts`) | [logo and end card](references/devices/logo-and-end-card.md), [icons and glyphs](references/devices/icons-and-glyphs.md) |

The full pick-by-job table, the materials and VFX notes (gradients and dither, type built from gradients, spectral and iridescent, glass, glow anatomy, glyph textures, grades as transitions, coloured shadows) and one line per device are in [`references/devices/INDEX.md`](references/devices/INDEX.md).

### Step 7: Checks → `out/qa/`
Read `references/checks.md`. After each build step, on a preview (`--no-audio` until Step 8 has written the soundtrack):
```
npm run cues && bash scripts/render.sh Film out/preview.mp4 --preview --audio public/audio/soundtrack.wav
bash scripts/layout-audit.sh Film --every 6 --json out/qa/layout-Film.json
python3 scripts/forensics.py out/preview.mp4 --cues out/cues.json --json out/qa/forensics.json
python3 scripts/look-audit.py out/preview.mp4 --cues out/cues.json --layout out/qa/layout-Film.json --json out/qa/look.json
node scripts/grammar-score.mjs --cues out/cues.json --layout out/qa/layout-Film.json --look out/qa/look.json --forensics out/qa/forensics.json
```
- **The floor against a flat film** (look-audit, fails the film): the camera or ground moves on ≥ 70 % of the body (a read lock of up to 1 s counts as alive); two depth planes at different rates in ≥ 50 % of shots; ≥ 40 % of seams carried; a designed moment at least every 3 s; a light event in every act; a clear scale change on ≥ 30 % of cuts. **The picture floor:** some clean flat ground (not everything on texture), edges under a ceiling (not busy everywhere), colour mass, bleed and skeleton bars (target: 43-85 % flat ground with type beats on clean fields, edges ≤ 5.9 %, real colour mass, bleed in every act, focus falloff).
- **grammar-score:** mean ≥ 90, no dimension under 70 (or against `out/like.json` with a clip). Write the weakest dimension into the notes and fix it first.

### Step 8: Sound → `public/audio/soundtrack.wav`
Read `references/sound.md` now.
- `npx tsx scripts/export-cues.ts` (`npm run cues`) writes `out/cues.json`: sync points come from the picture code (contact frames, 50 % pops, velocity peaks, settles, a line's resolve), never typed by hand.
- **The kit:** `python3 scripts/audio/kit.py init --preset launch` (with the personality row's swaps), then, with the cues written, `python3 scripts/audio/kit.py cast`: every sound is chosen for its action (a card landing, a toggle, typing, a swipe, a logo lock, a transition through a shape; `scripts/audio/actions.py`), each action of the film its own bank sound, the previous film's signature sounds avoided. `npm run kit` (earshot 0.4+ renders the takes, cached), `kit.py check`, `kit.py tune` to the track's key, `kit.py listen` (each role judged against its action). Where the bank sounds an action weakly, a free no-credit effect (`music.mjs search --kind sfx`, `get`, `kit.py real`) through the same licence record.
- `src/sync.ts`: one event per discrete state change, named by what it does (`id: 'c2:card-3-lands'`, or `action: 'card-land'`), `structural: true` on acts, the reveal and the ending. Text gets one soft sound per line (or per fragment of a line built in beats); the lockup is a stop and ONE element. Fewer, better sounds: the music carries most moments.
- `npm run plan` (`out/qa/sfx_plan.json`: placed, carried by the track, thinned, off; each action's sound; restraint; gains over the bed; stop-downs; density), then `npm run audio` (score: soundtrack, stems, report), then `npm run listen` (earshot's ears).
- **Gate:** no generated music and every effect from the kit (a `--draft` build never passes); over-bed within ±2 dB per role; a stop-down before every hit, drop and swell (≤ 3 per 10 s); no ducking; clean joins; density 3–13 per 10 s (no floor for a sting of 8 s or less) and restraint (at most 10 in any 10 s: the lightest actions go quiet first); the kit cast for the film; no take heard twice within 3 s; one gesture at a time; one element at the lockup; −14 LUFS (−16 for a sting of 8 s or less) ±0.5, −1.5 dBTP on the WAV; every sound has a visible cause.

### Step 9: Render and finish → `out/film.mp4`
Read `references/finishing.md` now.
- Previews: `bash scripts/render.sh Film out/preview.mp4 --preview --audio public/audio/soundtrack.wav` (muted render, ffmpeg mux, BT.709). Iterate on previews only.
- **Blur is a declared policy** (`LOOK.blur`): crisp films render sharp with shutter samples only in `CAMERA_BLUR` ranges; camera films sample fast frames at 180°. `bash scripts/render.sh Film out/film.mp4 --blur` follows it; render it once, after the last round; splice late fixes with `--frames A-B`.
- Don't edit `src/` during a render; stop a render by its PID, never with a `pkill -f` pattern.
- **Gate:** `python3 scripts/probe.py out/film.mp4 --spec 1920x1080@60 --dur <s>` and `python3 scripts/check-sync.py out/film.mp4 public/audio/soundtrack.wav` pass (`render.sh` runs both).

### Step 10: Review loop and ship gate
Run §8 on previews: launch and update films get at least 2 rounds; a sting or loop whose scripts pass needs 1. The blurred master then gets a check, not a round.

### Step 11: Deliver → `out/deliver/`
- `bash scripts/deliver.sh out/film.mp4` with the format's flags (`--loop --gif --webm`, `--alpha StingAlpha,StingAlphaClear`, `--variants Film9x16,Film1x1`). It runs `credits.py` (the licence gate; credits go into `CREDITS.md` and the post text, never the picture), writes the poster and a manifest in `qa/`, and never delivers a stem or the decoded track. `bash scripts/brand-kit.sh` exports an invented brand's mark and lockups.
- With a clip to match: `python3 scripts/like.py guard --film out/film.mp4 --clip <clip> --sheet out/qa/like-guard.png` must pass.
- Write a short `README.md` (the idea, the direction, the device, the grid, how to render, the file list).
- **Gate:** every deliverable in the §1 row exists and passes `probe.py` at its own spec.

### Update films
Read `references/update-films.md`. The name and the version first ("[Name] [version]", frame 0, already moving), 2–4 changes each shown as a product moment (the real state change on its hit frame, never a changelog row) and said in one plain sentence (2–6 words, a result the user sees), one payoff, the end card with the version; one line at a time; a licensed track; one device per change from different families. `deck.py --format update --changes N`, `pick.py --format update`, `new-film.sh --format update`.

### Scaled-down path (stings, loops, short clips)
The laws, the grid, the lint, the music and one review round still apply. A one-page treatment (the dealt direction, its idea sentence and signature shot, the script's one or two lines, the `pick.py` draw, a bar table of 2–8 rows) replaces Steps 1, 1b and 5 as separate passes; style frames are the mark at 16 px and one hero still; build as one act or two. A loop's last frame flows into frame 0 (`forensics.py --loop`, `render.sh --loop`); frame 0 is the poster.

## 4. Taste rules that matter most

The full catalogue of tells, each with its fix, is `references/taste-and-slop.md`; the twenty mistakes of code films with their checks are `references/craft-rules.md`. Two films for different brands must not look alike; if yours looks like the starter, Tessel or your last film, it is not finished.

**Copy** (`references/copy-and-type.md`)
- Clear before clever: what the product is by 3 s ("[Name] is a [plain category] for [who]."), then one concrete thing it does a line, then the name and what to do; 2–7 words a line, one claim, never a keyword, never "Introducing…"; an update film opens on "[Name] [version]", the product already moving.
- One clean line on screen at a time, each with its own text animation; the line says what the picture is doing, the picture proves it; a text-free 1.5 s in every 10 s for the product to act.
- While a line is read nothing that asks for the eye starts (no new copy, hit or cut); life continues: the type's own build, creep, light, drift, a camera move away from the text.
- The words a customer would use: no metaphor, slogan or stock phrasing (seamless, unlock, elevate, the future of, AI-powered); never a feature name as a headline; `copy-check.py` reads it as a stranger would.

**Type**
- One clean sans chosen for the personality, two weights, tabular figures. Roles at film size: `line` 120, `display` 200, `hero` 240, `giant` 900 (the set of one moment, once per film, never a watermark), `caption` 46, `ui` 40; nothing under 36 px held in focus. Statements and the lockup name at 72 px or more, 4.5:1 against the ground under them, frontal for the read; one beat per film where the type is the design (large, on a flat field, built word by word); never a lower-left subtitle as the default caption (`look-audit.py type-read`, `type-beat`).
- **Text animation is the main event:** every line of the script arrives its own way, from `fx/TypePresets` (`<TypeLine spec={{ preset, text, at, out, exit }}>`, sixteen presets tuned frame by frame, one renderer from the real font's widths) and the device book's type families; never the same animation on two lines. Graphic effects frame the line: a dithered gradient field, glass, a spectral edge, a morph from the last shot, a grid, a loader, the product's UI.
- The canonical word reveal: a third visible on its first frame, 90 % by 0.25 s; a build line re-centres with a jump; exits accelerate and leave at speed, never a standalone fade on a statement; colour on type is transient (accent 18 f, a 13 f linear cool).

**Colour** (`references/brand-and-color.md`)
- Neutral grounds (C ≤ 0.025: tinted paper, mid stone, the mid slate as the dark default), a deep field only as a declared colour event, ink as ink, one dominant accent with a meaning on what matters (about 6–15 % of the frame); colour mass from real imagery and the accent's lightness steps, never from washing everything in the accent's hue.
- Light, glow, spectral accents and gradients only as devices, baked and dithered; shadows from one key in the ground's hue.

**Picture**
- Graphic effects and the product's own UI as the material (dithered gradients, glass, spectral colour, morphs, grids, loaders), or a lit world when the direction deals one; real pictures only as an accent; three depth planes; the subject off-centre and bleeding past an edge; one light event per act; a device per beat; one signature shot.
- The product full-bleed or pushed in until the working part fills the frame; no small card in a void, no grey placeholder bars.

**Motion and transitions**
- Curves by role; one spring class; holds creep and turn into their exit; speed carried through cuts; overlap (the secondary before the primary is 90 % home, the foreground 20 f ahead).
- Seams built from what is on screen; ≥ 40 % carried; no dissolves between scenes; no fade to black except at the end; any kind ≤ 3 times except the signature.

**Product truth** (`references/product-ui.md`): named, specific, consistent data; counters count on each event; the product only replans the future; no cursor once the product acts on its own; any paused frame still makes sense.

## 5. Timing system essentials

`src/timeline.ts` is the only source of timing; picture, cue export and grid check import it (`references/timing-grid.md`).

```ts
import { bar, MUSIC } from './music';                 // written by track.py grid
export const BPM = MUSIC?.bpm ?? GRID_BPM;             // the track's tempo once it is in
export const BEAT = (60 / BPM) * FPS;                  // fractional with a track; b() rounds
export const b = (n: number, beat = 0, sub = 0) =>     // whole frames within 0.5 f of the music
  MUSIC ? Math.round(bar(n, beat, sub)) : Math.round(((n - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));
```

- **The music grid.** Acts, the reveal and the ending land on the track's events within 1 f (`STRUCTURAL`); graphic cuts on its accents (`MUSIC.accentNear`, `snapToAccent`), the picture leading by up to 3 f; at most 60 % of ordinary cuts on downbeats; a 0.2–0.5 s stop or dip before the biggest reveal.
- **Pace** (`PACE` in `lib/pace.ts`; `PACE_NAME` picks it):

  | Knob (60 fps) | calm (default) | crisp |
  |---|---|---|
  | Word fade, rise | 32 f on `snapOut`; a third of the line box over 25 f on `M.rise` | 26 f; 22 f |
  | Word gap | 12 f on the reading cadence | 8 f |
  | Re-centre | jump, 22 f on `E.jump` | jump, 16 f |
  | Exit | 17 f at speed (launch into a cut, launchFade otherwise) | 14 f |
  | Accent | hold 18 f, cool 13 f | hold 7 f, cool 13 f |
  | Reading hold | max(60, 42 + 8 f per word) | 36 + 6 f per word |
  | A line | 2–7 words, one line on screen (a chain fragment ≤ 4) | 2–7 words, one line (a fragment ≤ 5) |
  | Copy rate, text share | a script: ≤ 2.4 words/s in any 5 s, ≤ 85 % (fragments: 1.2, 65 %) | a script: 2.4, 85 % (fragments: 2, 80 %) |

- **Density.** About 1.9–2.8 starts per second, 1.6–2.5 things moving at once (two independent movers per shot: chips, labels, counters in staggers), idle frames ≤ 15 %; a layout or type change at least every 2.5 s outside the end lock (a creep alone reads as a held frame); shot bands per format (§1), shot lengths varying (q75/q25 1.9–3.1), a take over 15 s changing at least twice every 10 s, one change in seven without a hard cut; no stretch past 72 f without an event (48 f crisp); nothing frozen for more than 0.8 s outside the end lock (1 s for a camera lock on a read).
- **Energy.** An early peak, a designed lull of 1–4 s at 55–85 % inside the track's break, the biggest peak at 75–90 % on its entry; the last third keeps moving.
- **Hook.** Frame 0 composed and moving; at least two picture changes in the first 2.5 s, the subject readable on a 240 px strip from frame 0; the sound enters with intent; the product named and said in plain words by 3 s (what it is, or "[Name] [version]"), read by 5 s.
- **End card.** The lockup is the film's own device (the deck's lockup kind), built from the real logo's parts, lit by the key, off-centre or as a crop of the last plane; it assembles over 60–80 f, then the one held run of the film (1–5 s declared in `END`), still or creeping ≤ 6 %; the brief's one fact under it, readable ≥ 1.7 s. Never a mark, wordmark and tagline centred over a radial glow.
- **Hit frames.** A change meant for a cue starts at `cue − 1`; pulses peak 2 f after their sound (`hitPulse`); a spring starts at `beat − delayTo(cfg, 0.5)`.

**Where a sound goes** (computed by `src/lib/sync.ts`; `plan.py` applies each role's offset, the cue frame stays the picture's):

| Picture event | The sound sits on | Offset |
|---|---|---|
| Landing / impact | the contact frame (the move arrives with velocity) | landings +30 ms |
| Pop-in | the 50 % frame | pops +4 ms |
| Tween settle | the 97 % frame | |
| Whoosh (camera-scale moves, logo zooms; about 2 a film) | the apex on the visual peak | peaks +3 to +37 ms |
| Typing | per key up to 25 chars/s, one blip per word above | keys +8 ms |
| A line (or a fragment of one) landing | one soft `text` sound on its resolve (`chainResolves()`) | taps −60 ms |
| Clicks, knocks, bells | the press, the contact, the lock | −11, −40, −20 ms |
| Cut, scroll, stream, rolling counter | nothing: the track carries it; a counter's lock gets one tick | |

## 6. Motion system essentials

Tokens live in `src/lib/anim.ts` (`E`, `M`, `SPR`, `DUR`, `TAU`, `STAG`, `ACCEL`, `CPS`, `SPEED`, `CARRY`, `BREATH`, `OVERSIZE`, `enter`, `leave`, `move`, `prog`, `lmix`, `hitPulse`, `arrive`, `fd`), with `lib/handoff.ts` (`launch`, `carry`, `carriedCut`, `carryChain`, `creep`, `drift`, `intoCut`, `overlapAt`, `leadBy`, `handoffShot`), `lib/cadence.ts`, `lib/defocus.ts` and `lib/film.ts`. Details: `references/motion-tokens.md`.

| Role | Tokens (house duration at 60 fps) | Use |
|---|---|---|
| arrive | `snapOut` 32, `glideOut` 34 (the default), `settleOut` 34, `softOut` 34, `liftOut` 31, `jump` 22 | entrances, inserts, landings: peak speed on the first frame |
| reposition | `stdInOut` 30, `strongInOut` 36, `whipBuild` 28, `anticipate` | moves inside a shot, camera reframes, whips |
| leave | `softIn` 28, `buildIn` 26 (the exit), `launchIn` 29 (into a cut) | exits that end at speed, cut on their last frame |
| linear | `linear` | colour lerps, flash decays, drifts, counters, log-scale zooms |

- `enter()`, `leave()`, `move()` refuse a curve of the wrong role. Most arrivals are front-loaded, most moves into cuts end at speed (grammar-score wants ≥ 71 % of each). 1.1 names keep their shapes and warn with their replacements.
- **Springs:** `critical` (default), `criticalFast`, `criticalSlow`; one underdamped class per film (`SPRING_CLASS`, usually `landing`: ζ 0.59, about 10 %, 23 f); never overshoot on type.
- **Never scale from zero:** start oversized at 1.28–1.9× and settle (`Oversize`).
- **Speed through cuts:** launch into the cut (its last frame the fastest), carry out at 0.4–1.4× (house 0.7) decaying ×0.78–0.93 a frame to a living residual; declare velocity seams.
- **Holds live:** creep 2–15 %/s (house 6) or drift 6–90 px/s (house 30), turning into the exit over the last 12–20 f (`intoCut`); while text is read the camera locks for 0.5–1 s or stays under 90 px/s.
- **Duration grows with distance:** calm 0.5 s + 1.6 ms/px, camera 0.9–3.0 s; the slowest move ≥ 3× the fastest; durations by class (`DUR`, `TAU` 3 / 8 / 17 / 30 f for markers / elements / hero / world).
- **Blur and defocus:** blur is the declared policy (§3 Step 9); defocus is a timing tool drawn at fixed levels, two copies at most (`defocusMix`), never an animated blur radius.
- **Envelope:** every punch and tick uses `hitPulse(t, 2, 5)`. **Log space** for scale and zoom (`lmix`). **Shape** settles 6 f before position; contacts squash.
- **Smoothness is a ship gate:** zero `forensics.py` fails; designed steps, flashes and seams are declared, everything else that pops is a bug.

## 7. Engine non-negotiables

**Both engines**
- Everything is a function of frame or time: no CSS `transition`/`animation`/`@keyframes`, no `Math.random`/`Date.now`/`performance.now` (seeded `rand(seed)`).
- All translation inside one `transform`; dots and cursors by transform only; vertical text ends its rise on `arrive(p)` because the headless shell snaps vertical text to whole pixels.
- No `will-change` where `filter: blur()` animates; defocus at fixed levels; no animated SVG filters or `backdrop-filter`; bake large soft shapes into dithered plates (`scripts/dither-gradient.py`); `gpu-cost` warns on heavy layers.
- Clamp every value that feeds geometry; discrete state from `fd(frame)`; fonts loaded before any measurement (`FontGate`).

**Remotion** (`references/remotion-engine.md`)
- Primitives read fps, size, pace and copy from the film context (`useFilm()`), never from timeline constants (`timeline-constant`); every primitive is `xxxState()` + a thin component + `declares()`.
- `interpolate` extrapolates by default: clamp (`prog`, `enter`, `leave`, `move` do). Footage is `<Freeze>` around `<OffthreadVideo>` from a closed-form source frame; stepped layers shift a `<Sequence>` (`fx/Stepped`).
- Render `--muted` and mux with ffmpeg; ANGLE, JPEG q95, a 120 s `delayRender` timeout (the starter's config sets them). `premountFor` does nothing in a render.

**HyperFrames** (`references/hyperframes-engine.md`)
- One paused timeline per composition, registered last, keyed by its `data-composition-id`; `fromTo`, never `from`; no CSS and GSAP transform on one node; no `repeat:-1`, no `<br>`; every `<audio>` has an `id`; local woff2 fonts; lint at zero errors before `check`.
- `motion.js` and `timeline.js` mirror the tokens, pace and declarations; the rich primitives are Remotion-first. Finish with `bash scripts/hf-finish.sh`.

## 8. Review loop and ship gate

The procedure, critic prompts, rubric anchors and thresholds are in `references/review-loop.md`. A round:

1. **Render** the preview (or the affected acts).
2. **Measure** (each writes JSON to `out/qa/round-N/`): `probe.py`, `forensics.py --cues`, `av-audit.py --cues --stems`, `listen.py`, `layout-audit.sh --every 6`, `look-audit.py`, `grammar-score.mjs`.
3. **Sheets:** `python3 scripts/sheet.py out/preview.mp4 --chunks 4 --rate 12 --out out/qa/round-N/watch.png` plus a legibility sheet at `--width 480`; exact frames with `bash scripts/grab.sh`. **Feed-size strips:** six frames over 2.5 s at 240 px (`--from F --to F+149 --every 25 --width 240 --cols 6`) for the opener, each signature and type beat and the lockup: four alike is a held frame, an unreadable word or a signature under 15 % of the frame height is too small. From round 2, **the blind pair test**: ten such strips of the film paired by role with ten from the clips the user named as the bar, shuffled and unnamed, judged by a subagent with no brief; picked in more than 7 of 10, its giveaways are the next round's brief (`references/review-loop.md` §2).
4. **Lenses** from `assets/critics/`, as parallel subagents if the harness allows (else one after another, sheets before code): **Director** (`director.md`: reads `out/direction.json`; the weakest 3 s, anything templated, flat or sampler-like, the signature shot, the hook, the text flow, the end, and the question: is the picture doing something a template would not?), **Forensics** (`forensics.md`), **Sound/sync** (`sound-sync.md`), round 1 **Art/copy/UI** (`art-copy-ui.md`).
5. Each lens returns `{issues:[{id, priority, frame, problem, fix:{file, change}}], overall, score}`; **Verify** (`verifier.md`) tries to refute each P0/P1; fix in order of impact per minute; re-render only the affected acts.

Critic prompts say what changed, "Do not re-report fixed issues", "Don't propose adding text", "Do propose rewriting a vague line in plain words, and cutting a line to 2–7 words". **Severity:** P0 on a key beat (hook, payoff, logo) or breaking the story or a hard ban; P1 noticeable on a normal viewing; P2 only on pause.

**Ship gate**
- The 12-dimension rubric: every dimension ≥ 3, Picture ≥ 4, Finish and Sound and sync = 5, mean ≥ 4.2; no open P0.
- Every script passes (`copy-check`, `probe`, `check-sync`, `forensics`, `av-audit --stems`, `lint-film --strict`, `grid-check`, `layout-audit`); `look-audit` passes both floors; `grammar-score` mean ≥ 90 with no dimension under 70; the sound gates and `credits.py`; with a clip, `like.py guard`.
- Stop after 5 rounds, or sooner once the gate is met; then say plainly what you would still change.

## 9. File index

Read each file when its step comes up; never all at once.

| When | File | What it gives you |
|---|---|---|
| Step 0, a format | `references/formats.md` | a recipe per format, shot bands and sound per format, social re-layouts |
| Step 0, a template | `references/templates.md` | which film template fits (update, ui-walkthrough, capability-reel, prompt-run, social-ad, type-explainer), what each lays down, the grammar to keep |
| Before the first film | `references/worked-example.md` | Tessel from idea to master, with its mistakes and fixes |
| Step 1 | `references/concept-and-story.md` | inventory, lenses, the direction deck, the idea sentence, the signature shot, arcs, end cards |
| Step 1 | `assets/TREATMENT.md` | the treatment template with the Direction and Script blocks |
| Step 1 | `assets/directions/directions.json`, `imagery.json` | the deck (read through `deck.py`); imagery-led directions, dealt only with `--have photos` or `footage` |
| Step 2 | `references/brand-and-color.md` | personality → choices, the colour system and recipes, accents, devices of colour, marks and lockups |
| Step 2, a kit | `references/brand-kits.md` | `brand.py` intake, the kit's greys as grounds, logo parts and devices, the deck on a brand |
| Step 2, a clip | `references/clip-match.md` | borrow a clip's grammar, never its content; measure, score, guard |
| Step 3 | `references/music.md` | licences, the record, analysis, the edit, cutting picture to the music, credits |
| Step 1b and 5 | `references/copy-and-type.md` | the script (the launch and update formulas, plain words, good and bad scripts), one line at a time, sizes, the text animations, type roles at film size |
| Step 4 (optional) | `references/imagery.md` | pictures as an accent: when they earn a beat, no-credit sources, search, sheet, grade, premium or stock |
| Step 5 | `references/timing-grid.md` | the music grid, `timeline.ts`, declarations, sync helpers, holds and density |
| Step 5, after the draw | `references/technique-library.md` | every drawable entry in the library (generated by `pick.py`; search it, don't read it whole) |
| Steps 5–6 | `references/devices/INDEX.md` and its families | the device book: pick by job, materials and VFX, every device with timing, sound and build |
| Step 6 | `references/motion-tokens.md` | curves by role, special curves, springs, tables, carry, creep, overlap, stepped time, pace |
| Step 6 | `references/camera.md` | the anchor camera, camera moves, snap zoom, defocus levels, holds, depth, framing, blur policy |
| Step 6 | `references/transitions.md` | the seam plan and mix, seam laws, transitions built from content, sound-led cuts |
| Step 6 | `references/lighting.md` | the key light, lit worlds, living light, light events, glow and spectral as devices, plates |
| Step 6 | `references/product-ui.md` | the UI grammar, data module, the product kit, cards, bubbles, scroll, cursor, screenshots |
| Step 6, update films | `references/update-films.md` | the update shape, the tools, writing changes as product moments |
| Step 6, Remotion | `references/remotion-engine.md` | starter files, verified APIs, the film context, config, CLI, traps |
| Step 6, HyperFrames | `references/hyperframes-engine.md` | render model, composition rules, CLI, translating cinetic, the mirror |
| Any render artifact | `references/chromium-rendering.md` | symptom → cause → fix → detection, defocus levels, GPU cost |
| Step 7 | `references/checks.md` | every gate script, its rules, the floors, grammar-score dimensions |
| Steps 1–7 and review | `references/craft-rules.md` | the twenty mistakes of code films with fixes and checks; house pacing, camera, colour, layout |
| Step 2 and review | `references/taste-and-slop.md` | every cheap-looking tell, with its fix |
| Step 8 | `references/sound.md` | the kit, cues, `sync.ts`, `score.json`, placement, levels over the bed, stop-downs, master, listening |
| Step 9 | `references/finishing.md` | blur policy and pass, banding, BT.709, encoding, mux, deliverables, credits |
| Step 10 | `references/review-loop.md` | rounds, lenses, verify, rubric, severity, ship gate, thresholds |

**Tools you already have.** Reach for these before writing a helper.

| Need | Tool |
|---|---|
| a project from the starter (launch, update or a film template; a brand kit, a clip, a track) | `scripts/new-film.sh` (`--format update`, `--template <name>`, `--brand`, `--like`, `--music`, `--font`, `--link-modules`) |
| three dealt art directions; the sheet; a redraw | `scripts/deck.py` (`--options 3`, `--direction <id>`, `--have`, `--show`, `--redraw`, `--brand`, `--changes`, `--validate`) |
| a weighted draw of devices and techniques, and one text animation per line; one entry in full; a family | `scripts/pick.py` (`--format`, `--energy`, `--lines`, `--have`, `--family`, `--category`, `--show <id>`, `--list`, `--markdown`) |
| a supplied brand kit: tokens, logo parts, fonts, screenshots | `scripts/brand.py` (`--check`) |
| a clip's grammar; the recreation guard | `scripts/like.py measure <clip>`, `like.py guard` |
| photos, footage, textures and art with no-credit licences: search, sheet, get, grade, check | `scripts/assets.mjs` |
| a font family vendored without `npm install` | `scripts/add-font.mjs` (or `new-film.sh --font`) |
| a palette from a recipe and one accent; token, ramp and coverage checks | `scripts/palette.py` (`--recipe`, `--check-tokens`, `--ramp`, `--cover`) |
| baked, dithered plates for gradients, light fields, pools and shadows | `scripts/dither-gradient.py` (`--check`) |
| the pace copied into the checks and the HyperFrames mirror | `scripts/gen-pace.mjs` |
| static bans, tokens, motion grammar, placeholders | `scripts/lint-film.mjs` |
| is the script clear: what it is by 3 s, plain words, one claim a line, no vague words, metaphors or slogans; what a stranger reads | `scripts/copy-check.py` (`TREATMENT.md`, `out/cues.json`, `--format update`, `--json`) |
| grid, music mode, holds, the script (2–7 words a line, one line at a time, copy-check on `COPY`), text flow, shot bands, seams, declarations | `scripts/grid-check.ts` |
| text in the safe zone, overlaps, covered text, type roles, readable speed, the tween registry | `scripts/layout-audit.sh` |
| cues and declarations for the sound and the checks | `scripts/export-cues.ts` |
| pixel QA, holds, carried cuts, dissolves, the end card, loop seam | `scripts/forensics.py` (`--loop`) |
| the rendered look, the motion and picture floors, the one-hue gate | `scripts/look-audit.py` (`--trajectory`, `--imagery`, `--picture-only`) |
| closeness to the house grammar (or a clip's) | `scripts/grammar-score.mjs` (`--target`, `--format`) |
| the film's track from free no-credit catalogs: search by mood, tempo and length, the sheet, download with its licence record, the history; a real effect where the bank is weak | `scripts/music.mjs` (`search`, `sheet --measure`, `get`, `history`, `licences`; `--kind sfx`) |
| the track: licence record, analysis, edit, grid, check | `scripts/audio/track.py` (`add`, `analyze`, `edit`, `grid`, `check`, `music`) |
| the effects kit: init, cast (each action its own sound), real effects, tune, render, vendor, check, audition, listen | `scripts/audio/kit.py` (earshot); the actions and their sounds: `scripts/audio/actions.py` |
| the effects plan; score, mix and master; credits | `scripts/audio/plan.py`; `scripts/audio/score.py`, `master.py`, `dsp.py`, `mixkeys.py` (and `draft.py`, placeholder voices for a `--draft` timing check only); `scripts/audio/credits.py` |
| earshot's ears on the soundtrack, the track or the kit | `scripts/audio/listen.py` |
| previews, masters, the blur pass, splices, chunked renders | `scripts/render.sh` (`--preview`, `--blur`, `--policy`, `--frames`, `--budget`, `--build-audio`), `scripts/render-chunks.sh` |
| on-screen speed and blur samples; float accumulation | `scripts/measure-speed.py`; `scripts/accumulate.py` |
| spec, A/V lag and true-peak gates; audio and sync QA | `scripts/probe.py`, `scripts/check-sync.py`; `scripts/av-audit.py` |
| contact sheets, exact frame grabs | `scripts/sheet.py`, `scripts/grab.sh` |
| poster, GIF, WebM, loop seam, alpha, variants, credits | `scripts/deliver.sh` |
| brand kit export; outlined lettering | `scripts/brand-kit.sh`; `scripts/outline-text.py` |
| the HyperFrames finish | `scripts/hf-finish.sh` |
| the Python the npm scripts run (`$PYTHON`, else `python3`, `python` or `py -3`) | `scripts/py.mjs` (`--which`) |
| the scripts' own tests (not a film's) | `scripts/test/` (`copy-check`, `lint-film`, `grid-check`, `tokens`, `mirror`, `scripts-docs`, `provenance`, `pick`, `deck`, `brand`, `like`, `track`, `score`, `cast`, `assets`, `music`) |
