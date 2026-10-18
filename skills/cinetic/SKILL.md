---
name: cinetic
description: Direct, build and render premium cinematic motion design from code — launch films, product and feature videos, looping feature animations for landing pages and social, logo stings and reveals, UI walkthroughs, app demos, kinetic type, teasers, trailers, intros and promo clips. Use this whenever the user wants any video, animation, motion graphic or animated demo made with Remotion, HyperFrames, HTML/GSAP or React, or asks to storyboard, time, score, render, polish or critique one — even if they only say "make a video about X", "animate this feature" or "we need a launch clip". It supplies concept and copy discipline, type and colour taste that defers to a supplied brand, a beat-locked timeline that drives both picture and a code-made soundtrack, choreography and transition craft, real product UI in motion, film-grade finishing (true motion blur, no banding, BT.709, sync-checked mux) and a measured self-critique loop on contact sheets and renders.
license: MIT
compatibility: Needs Node 22+, ffmpeg 6+ with libx264, Python 3.11+ with numpy, scipy, soundfile, pyloudnorm, opencv-python and librosa (fonttools, brotli and uharfbuzz for outlined logos; pillow for gradient PNGs), and Chromium or Chrome Headless Shell for rendering; earshot 0.3+ (optional, in its own virtualenv) renders the sound kit and listens to the soundtrack. Works with Remotion 4 (React) or HyperFrames (HTML and GSAP).
---

# cinetic

You are directing a short film, not animating a web page. Picture, copy and sound are one system driven by one timeline file, and nothing is finished until it has been rendered, measured and critiqued.

- **Engines.** Remotion 4.0.529 (React, frame-driven) is the default. HyperFrames 0.8.79 (HTML plus a paused GSAP timeline) is the alternative. The craft is engine-independent; §7 lists the rules that differ per engine.
- **Numbers.** Every number here is a proven default from shipped work: a starting point that you can move away from when you have a stated reason. It is not a law of nature.
- **Brand.** When the user supplies a brand (colours, fonts, logo, footage, tone), the brand wins. The taste defaults cover the parts you have to invent.
- **Paths.** Paths such as `scripts/render.sh` work from the skill root and also inside a film project, because `scripts/new-film.sh` copies every script into the project. Every script except the internal helpers `brand-svg.ts` (which `brand-kit.sh` calls) and `hf-preflight.cjs` (which `hf-finish.sh` runs) prints `--help`.
- **Worked example.** `references/worked-example.md` walks through Tessel, a 33 s launch film at 1920×1080 and 60 fps, and shows each rule below in use, including the mistakes. Read it once before your first film.

## The bar

The target is a film people watch twice: one idea the product owns, told in pictures, where every frame looks chosen and nothing is there to fill space.
- **Substance before polish.** Show the specific, clever thing this product does, the thing a simpler product wouldn't. Flawless motion around a generic claim still loses to a rough film that makes the viewer think "oh, that's smart".
- **Its own look.** Every brand gets a visual language derived from its name, its product and its personality, inside the Hard bans below. Restraint means no decoration; it does not mean one minimal house style for everything.
- **Ultra clean and smooth.** Clean, modern frames, with creative ideas and choreography. Every move is eased, weighted and smooth at 60 fps: no jitter, no pops and no effects standing in for ideas.
- **Visual, not narrated.** The idea reads with the sound off; the words confirm what the picture already said.
- **Weight and stillness.** Motion has mass, arrives on the beat and then rests, so the fast moments land.
- **Sound that makes the picture feel better:** every hit is caused by something you can see.
- **Restraint over decoration.** When in doubt, remove.
- **Proof, not impression.** The process below exists because none of this can be judged in the editor or the Studio: you only know once you have watched the actual render and measured it.

## Hard bans

When you invent the look, none of these appear, ever. They are the fastest tells of generated work, and this skill exists to make films that don't look generated. `lint-film.mjs` checks the tokens and styles for them, and the critics check the frames.
- **Words:**
  - eyebrow or kicker labels above a headline;
  - stacked taglines, and "Introducing…";
  - full sentences dumped at once: copy arrives as short fragments, one after another, with picture between them (§4, "Text flow");
  - text walls, and random filler text: decorative mono captions, fake metrics, labels nobody needs, lorem ipsum.

  Every word on screen earns its place.
- **Type:** serif typefaces, and italic or oblique styles, including a skew that fakes one. Use one clean, modern sans, plus a mono for code or numbers if the product needs one.
- **Colour:**
  - orange, amber, beige, cream, tan or sand, as an accent, a paper or a glow;
  - neon: very bright, saturated accents, glows, bloom and halos;
  - purple, violet or indigo, and purple-to-blue or any multi-hue gradient;
  - glassmorphism.
- **Decoration:**
  - emoji and stock icons;
  - sparkles standing for "AI", particles, confetti, lens flares and code rain;
  - bouncy overshoot on anything that isn't landing, and any overshoot or per-letter trick on copy (only the one hero word may move letter by letter).

What remains is plenty: ink and paper (light or dark, neutral or cool), one accent with a meaning from any hue family outside the banned ones (red, green, teal, blue, yellow), one sans, and motion that is ultra clean and smooth, eased, weighted, motion-blurred and free of jitter. The creativity goes into the idea, the device and the choreography, not into effects.

If the user supplies a brand that includes one of these (their serif wordmark, their orange), the brand wins, because it is their identity rather than a default. Record it in `BRIEF.md` so the critics don't flag it, and mark the lines that set it with `// cinetic:brand-supplied <what>` so the lint accepts them.

## 1. Formats and defaults

Choose a row first. It sets the length, the density and the list of files to deliver. The recipe for each format is in `references/formats.md`. The numbers are the calm pace, the default; a brief that asks for energy (a teaser, a drop, a hype cut) opts into the crisp profile (§5), which is faster and allows a little more text (fragments up to 5 words, up to 10 visible) but still never a sentence dumped at once.

| Format | Length | fps | Grid (BPM) | Story beats | Words: total · new per fragment · visible at once | Sound | Deliverables |
|---|---|---|---|---|---|---|---|
| Launch film / teaser | 20–45 s | 60 | 100 (crisp 120) | 6–8 per 30 s (crisp 8–10) | 15–25, cap 30 · ≤ 4 · ≤ 8 (≤ 5 in replace mode) | full score + SFX | 16:9 master, 9:16 and 1:1 re-layouts, poster, brand kit if invented |
| Product / feature video, update film | 8–30 s | 60 | 100 | 1 capability per 8–10 s | ≤ 12 · ≤ 4 · ≤ 8 | UI SFX; calm: effects only at −18 LUFS (a light bed only when the brief wants a groove) | master, poster |
| Feature loop | 4–15 s, whole bars | 60 (GIF 25) | any; whole bars | 3–5 | ≤ 6, reads muted · ≤ 4 · ≤ 4 | optional | MP4, WebM, GIF, seamless seam |
| Logo sting | 3–8 s | 60 | 100–120 | 2–4 | name + ≤ 3 · ≤ 3 · name + 3 | one tuned hit + tail | MP4, ProRes 4444 alphas (held and cleared), poster, brand kit if invented |
| UI walkthrough | 20–90 s | 60 | 90–100 | 1 chapter per 2–4 bars | ≤ 5 per caption · ≤ 4 · one caption | bed + UI SFX | master, SRT captions |

Use 60 fps whenever UI, text or the camera moves. At 30 fps slow drifts visibly step and fast moves strobe, and 24 fps is never right for UI. A GIF is the one exception: export it at 25 fps (or 50) from the 60 fps master, because GIF frame delays are whole hundredths of a second and 30 fps plays 11% fast.

## 2. The five laws

1. **One idea, specific to this product.** You can say the film in one sentence, and the proof shows what this product does that the obvious or simpler version wouldn't. Restraint applies to decoration and copy, never to the product's intelligence: if the feature is smart, the film shows the smart part. *Why:* a viewer carries away one thing, and a film that would be equally true of a competitor, or of a dumber feature, gives them nothing to carry.
2. **One story device.** An object, shape or colour travels through every shot and never blinks out at a cut. In a launch film it ideally resolves into the mark at the end; in a feature loop or product video it is the unit the product acts on (the card, the row, the file). Find the object this product owns. A bare dot, line or block is the lazy default, and it is also the look of this skill's own examples. *Why:* it makes the film continuous, it lets the film read with the sound off, and an owned object is what makes the film unmistakably this brand's.
3. **One accent with one meaning.** The accent is a single token that means one thing, such as "now", "new" or "yours". Use it sparingly (about ≤ 8% of pixels) and let it flood the frame at most once. *Why:* a colour that means something is read without words, and a colour used everywhere means nothing.
4. **One house motion system.** Use a few named curves and springs, each for a stated reason, and take every frame number from `timeline.ts`. *Why:* consistent motion *is* brand motion, and ad-hoc eases read as generated.
5. **Verify by measurement.** A film is done only when the rendered pixels and the decoded audio pass the scripts and one round of critique. *Why:* Studio playback hides pops, ghost frames, sync slips and colour shifts that the encoded file will show.

## 3. Workflow

Every step writes a file, and every gate is a check you actually run. Work inline. Subagents are for critique only (§8), because building frames in parallel costs more time than it saves.

### Step 0: Intake → `BRIEF.md`
- If the brief already states the product, the message and the length, infer everything else and write your assumptions down.
- If it doesn't, ask at most 3 questions: the product in one line, the format and length, and where the film will be shown. Take everything else from §1.
- Choose the engine: Remotion by default; HyperFrames if the user already has a HyperFrames project, wants HTML/GSAP, or needs `--batch` renders driven by variables.
- Copy the hard bans (above) into `BRIEF.md`, plus any brand-supplied exceptions. Critics are later prompted with this file word for word, so it doubles as the QA contract.
- Choose the pace: calm (the default) unless the brief asks for energy; write it into the spec line. Crisp is an explicit opt-in (§5).
- Scaffold the project: `bash <skill>/scripts/new-film.sh films/<name> --fps 60 --size 1920x1080 [--engine hyperframes]`. It keeps the starter's own tempo (Remotion 100 BPM, HyperFrames 120) and the calm pace; add `--pace crisp` for a crisp film (120 BPM and the crisp pace), or `--bpm N` for another tempo. Pass `--link-modules <dir>/node_modules` to reuse an existing install instead of running `npm install` (a junction on Windows).
- **Gate:** `BRIEF.md` has a spec line, for example `1920x1080@60, 30s, 100BPM, pace: calm, audio: earshot kit (calm), no music`.

### Step 1: Concept → `TREATMENT.md`
Read `references/concept-and-story.md` now.
- Start from specifics, not from style. Write down:
  - what the name means or evokes (it often hands you the mark and the device);
  - the feature's non-obvious behaviour, finishing the sentence "unlike the obvious version, it…";
  - the product's own objects (its rows, cards, readings and states).
- Write 3 concepts, each through a different lens:
  - (a) the product's own verb or metaphor made literal;
  - (b) the viewer's pain made visible;
  - (c) a formal device: a relay object, a bookend, one unbroken camera move, or a container that becomes the product.
- Throw out any concept whose props could appear in another product's film. It isn't yours.
- **Draw the techniques; don't choose them.** Run `python3 scripts/pick.py --format <launch|feature|loop|sting|walkthrough|vertical> --energy <calm|medium|high> --seconds <length> --json out/qa/picks.json`, with `--energy calm` unless the brief asks for energy. It draws about one technique per 3.5 s of film when calm and per 2.5 s otherwise (9 or 12 for a 30 s launch, at least 4 for a short piece) from the measured library in `assets/library/techniques.json`, in the order the format needs them, weighted toward proven moves and the film's energy, and prints each recipe with default timing. Choosing by hand converges on the same fade-up, push-in and end card in every film; the draw is how two films stop looking alike. Build the picks the concept can carry, retold in its objects and device; the story, product truth and one consistent UI language come first, and a film that crams in every move reads as a showreel. Reroll a pick that fights the concept at most twice (`--category <cat> --exclude <id>`), or drop it, with a written reason; never add a technique the draw did not give you (draw one with `--category`), and pass `--brand-supplied <look>` when the brand owns a banned look. Read a drawn entry in full with `pick.py --show <id>`; `references/technique-library.md` lists every entry (search it, don't read it whole). Measured pacing, easing and text-timing norms are in `references/craft-rules.md`.
- Fill in `assets/TREATMENT.md` for the concept you chose:
  - a logline;
  - the arc: hook (inside the problem, felt by 1 s) → turn → proof (1–2 capabilities) → promise → lockup;
  - the drawn techniques with the seed line, each placed in a beat (§3b of the template);
  - the device path, shot by shot;
  - a beat sheet with the columns bar | time | picture | copy (fragment, mode) | picture beat | sound: every thought of more than 4 words written as a chain of fragments, each with the picture beat it hands over to;
  - the full copy with its word count;
  - the final frame.
- Run the deletion test. Remove the demo beats, and the value should still read. Remove the value beats; if the film still "works", it was a feature tour.
- Run the specificity test. Would the film be just as true of a simpler product, for example an even split instead of an itemised one, or a plain list instead of a ranked one? If yes, the proof undersells the product; show the part that is hard.
- Run the feature-word test. Watching muted, would a stranger use the brief's word for the feature ("streak", "split")? If a clever device makes it read as something else, keep the feature's familiar form and let the device dress it.
- **Gate:**
  - the logline is ≤ 15 words;
  - the specificity test passes, with its answer written down;
  - the word count is inside the §1 budget;
  - every fragment is 1–4 words; no beat shows more than 8 words of copy (5 in replace mode); every thought of more than 4 words is a chain with a picture beat of 30–90 f between its fragments, and none arrives as one block (a crisp film allows 5 words per fragment and 10 on screen);
  - copy is planned on at most about 65% of the runtime (80% in crisp), with a text-free picture stretch of at least 1.5 s in every 10 s;
  - the device appears in every beat row, and every drawn technique is placed in a beat or dropped with a reason.

### Step 2: Brand and style frames → `src/brand/`
Read `references/brand-and-color.md` and the type section of `references/copy-and-type.md`.
- The starter's palette, fonts, mark and demo name are stand-ins marked `// cinetic:placeholder`, and `lint-film.mjs` reports an error until every marker is gone. Apply the user's brand, or invent one for this film, then delete the markers. A film that keeps the starter's look looks like every other film made from it.
- **Personality first.** Write three adjectives for the brand, then derive the choices from them. This mapping is in `references/brand-and-color.md` §2:
  - the typeface: pick the sans for this brand from `@fontsource-variable/*` and vendor it with `node scripts/add-font.mjs <name>` (safe with a shared `node_modules`); Geist is only the starter's stand-in;
  - weight and case;
  - the stage (light or dark: a dev tool or a fire-named brand often wants dark), neutral or cool, and the accent's hue from the allowed families;
  - the motion character, from crisp to unhurried.

  A calm notes app and a fast CI tool should not share a look.
- Write `src/brand/tokens.ts` (`python3 scripts/palette.py --accent '#…' --stage dark` builds the neutrals, checks contrast and refuses a banned hue):
  - colours: an ink, a paper, 2–4 neutrals, and one accent with its meaning in a comment;
  - type: one family at 2 weights, plus a mono if you need one;
  - a type scale;
  - one tracking value per role.
- **Explore the mark before you commit to one.**
  - Sketch 6–10 directions, each from a different source: the name's meaning, a letterform, the product's own object, the idea's metaphor, and a pure geometric construction.
  - Render them together on one sheet and look at it (the `MarkSheet` still in `references/brand-and-color.md` §4).
  - Reject any direction that could belong to ten other startups, including the "geometric block + accent dot" family, which is this skill's own example vocabulary.
  - Run the misread test. Show the mark at 64 px for half a second. If it reads first as a common symbol (a minus, an emoticon, a menu or hamburger icon, a padlock, a play button, a plus), reject it or change it until it doesn't.
  - Build the winner in `src/brand/Mark.tsx` on a 100-unit grid, with gaps of at least 8 units so it survives being scaled down.
- **A palette with character, inside the bans.** Derive it from the world of the name and the product (a hillside gives pine, moss and slate; a foundry gives charcoal, soot and a glowing red), not from framework defaults. When the name's world is heat or fire, orange is banned, so go red-hot (a deep red glowing on a true charcoal) or white-hot, never generic dev-tool blue: the colour must carry the name. A blue-grey near-black stage is the stock dev-tool dark theme (`palette.py` notes it), and in a dev tool red UI tags read as errors; spend the red on the brand's own thing.
  - Framework blues (the `#3B82F6` / `#2563EB` family) and flat pure greys read as "default".
  - Tint the neutrals toward the world, with a cool green-grey or a blue slate; a dark stage can be pine-black or ink-navy rather than `#000`.
  - `references/brand-and-color.md` §8–10 has worked palettes.
- **Set the lockup like a typographer.** Render three settings side by side (mark-to-cap ratio, gap, weight, tracking) and pick the one where the mark and the word read as one object. A carelessly set wordmark costs more than any animation gains.
- Render 2–4 one-frame style stills from the `Stills` folder and look at them: the mark at 16 px and at full size, one statement frame, and one product frame. `npm run stills` renders the mark stills; add your own with `npx remotion still <StillId> out/stills/<name>.png`.
- **Gate:**
  - the stills pass §4;
  - the mark sheet and the chosen direction's reason are in `TREATMENT.md`;
  - `node scripts/lint-film.mjs src` reports no placeholder and no colour or font that is not a token.

### Step 3: Timeline → `src/timeline.ts`
Read `references/timing-grid.md` now.
- Choose BPM and fps so that a beat is a whole number of frames (see §5).
- Map the beat sheet onto bars:
  - `ACT` holds contiguous, bar-aligned acts;
  - `CUE` holds named frames that sit on the grid;
  - `COPY` holds one `{id, text, in, resolved, out}` entry per fragment: `line(id, text, in)` for a single fragment, `chain(id, 'build' | 'replace', [[text, inFrame], …])` for a thought in several (it adds `chain` and `mode` and times each fragment from the pace);
  - `TOTAL` includes a tail of at least 60 f.
- Give each bar one motion peak, and let text and the hero action take turns on the grid.
- **Gate:** `npx tsx scripts/grid-check.ts src/timeline.ts` passes (`npm run check` runs it together with `tsc` and the lint). It checks the grid (every cue on the 16th grid or carrying an `offgrid:` reason), the reading holds, the event gap (no stretch past 72 f without an event or a reading hold; 48 f in crisp), the word budget, and the text flow, all against the film's `PACE_NAME` (`--pace` overrides it): `fragment` (words per entry), `copy-concurrent` (words visible on any frame, a leaving fragment counted until its exit is over), `read-first` (two separate lines never arrive together), `reveal-rate`, `chain-gap` (each fragment read before the next, with 30–90 f of picture between), `chain-beat` (a cue really happens in that picture beat), `read-quiet` (no cue starts inside a read), `word-rate` and `text-share`. In a calm film a missing or short picture beat, two lines arriving together and copy on more than 75% of the body are errors, not warnings. A HyperFrames project runs it on its `timeline.js`: `node scripts/grid-check.ts timeline.js`.

### Step 4: Build, act by act → `src/acts/`
Before you write motion, read `references/motion-tokens.md`, `references/camera.md`, `references/transitions.md`, and `references/product-ui.md` if the product appears. Keep `references/chromium-rendering.md` open while you debug.
- Make each act a pure function of `useCurrentFrame()`. Mount one `<Sequence>` per act in `Film.tsx`, and register each act as its own composition in the `Acts` folder so you can iterate on it alone.
- Take all motion from the tokens in `src/lib/anim.ts` (§6). A raw bezier inside an act is a lint error, because that is how a house style decays.
- Build the product UI from real components fed by one `data.ts` module with asserts on dates, weekdays, counts, plurals and sums. The data must agree with the story too: the person who paid doesn't owe, a "sorted" list is actually sorted, a stated ratio matches its numbers, and no number appears twice in one frame. That holds in every frame, in-between states included: a copy headed "owes Maya" over the whole bill's total is a wrong number on screen for as long as it shows. Frame the UI large enough to read on a phone: push in 2–5× on every interaction that carries the story, and hold a wide shot of readable UI for at most about 1.7 s. Every bar, segment, chart or bare number that carries meaning shows its value, label or unit: a row of "18 24 12 31" under M–S reads as dates, not pages. A screenshot never carries the hero shot.
- Make the product and the feature identifiable. Name the feature once, as a UI label, the one line of copy or the end card, and show enough real app chrome that a stranger knows this is software. "No feature name as a headline" never means "never name it". A feature label is not a payoff: land the value with one short line that makes it human ("Sam had the salad."), even in a muted loop.
- Frame only the meaningful part of the product. No half-empty grids, no tables cropped at the frame edge, no rows of blank cells: they read as a spreadsheet, not a product.
- Text that must be read stays readable in motion. Text being read (between its `resolved` and `out` frames) moves at most about 3 px/f, and at least 0.3 px/f of drift or a slow creep keeps it alive; a camera cruise under it runs 1.5–3 px/f. Keep labelled chips and numbers under about 20 px/f while they travel, or fly them with the text faded and let it resolve on landing, because motion blur on small text reads as a double image.
- Words reach the screen through `COPY` only: render statements with `src/fx/Chain.tsx` or `Words` from `copy(id)`, never a string literal in an act (`lint-film.mjs` flags `copy-literal`, `text-spring`, `text-pace`, `typing-rate` and `per-letter`).
- Moving elements never cover text they pass over: plan the paths and the z-order, and check the densest frames at full size.
- A progressive text reveal (letter by letter or with a sweep) must never spell a different word partway through ("tarn" briefly reading "tar"), and never shows part of a glyph: a soft wipe through an "n" reads as an "r" ("halder"). Step the mask from glyph edge to glyph edge on whole frames, or reveal whole words, and check the intermediate frames.
- Export from its act every frame the sound needs, as a named constant (for example `LANDINGS` or `SNAP`), so the cue export can import it.
- Wrap everything in `<FontGate>`.
- Iterate each act in this loop:
  1. Render stills at each cue −2, 0 and +2.
  2. Make an act contact sheet: `python3 scripts/sheet.py --comp Act2 --every 2 --out out/qa/act2.png` renders the act and tiles it with frame and time labels. Use `--every 2` for fast sections.
  3. Run `bash scripts/layout-audit.sh Act2 --cues`.
- **Gate:**
  - `lint-film.mjs` is clean;
  - `layout-audit` reports 0 safe-area, overlap or `words` violations (no frame with more readable film words than the pace allows; product strings carry `data-ui` and count apart) and no readable text faster than 20 px/f; on the act sheets, text being read moves at most about 3 px/f;
  - every act sheet has written review notes.

### Step 5: Sound → `public/audio/soundtrack.wav`
Read `references/sound.md` now.
- Run `npx tsx scripts/export-cues.ts`, which writes `out/cues.json`. Sync points are computed from the picture code (spring contact frames, 50% pop frames, velocity peaks, 97% settles, a fragment's resolve frame) and never typed by hand. Typed sync points landed 8–11 f off in practice.
- Pick the sound's personality row in `references/sound.md` §5.5a first, and with it the kit preset: `calm` (the starters' default) for calm brands and text-led films, `crisp` for fast and raw ones, `minimal` for precise, expensive ones (`python3 scripts/audio/kit.py init --preset crisp --force`). Drops onto silence and sub booms are for energetic launch films only.
- **The effects come from the earshot kit** (`audio/kit.json`, §1 of `sound.md`): one bank sound per role, rendered into `audio/kit/` with measured sync points. Run `python3 scripts/audio/kit.py render` (`npm run kit`, cached) and `kit.py check`; `kit.py tune` moves the tonal roles to `score.json`'s key after the key changes. Without earshot, `score.py` plays the takes already rendered in `audio/kit/`, and with none it falls back to its synth voices with a loud warning: install earshot (`docs/setup.md`) rather than ship on them.
- **Text gets one soft sound per fragment** (a `text` cue on the frame it resolves), never one per word, and what was just said is read in near-silence (§5.7). **The lockup is a stop-down and ONE clean element:** nothing in the 0.2–0.7 s before it, one `hit` on the frame the wordmark becomes readable (its `settleOf`), no whoosh into it and no snap, bell or motif on top. `score.py`'s stack guard warns on anything else within ±3 f.
- **Music only when the film wants a groove.** A calm, text-led film keeps `"music": "none"` (effects only, mastered at −18 LUFS); otherwise make the music drive the picture, whatever the personality:
  - A motif that follows the story's progress, for example one tuned note per step climbing the scale (`progress` in `score.json`; under the calm kit give the steps `"kind": "bell"`, its tuned voice: the calm pop, tick, click and light landing are untuned taps and cannot climb).
  - Section changes and the hero reveal land with the music's own event (drop, stop, re-entry). Designed effects go on discrete state changes only, about 5 per 10 s, clustered where the music is sparse; continuous motion and most cuts get none.
  - The drop on the hero reveal, 30–60% in, is the loudest moment, and `payoff` points there. The lockup is the most resolved moment, not the loudest: the music stops on a bar line or filters down as the logo forms, then the one element and a 0.5–2.5 s tail. A sting is all lockup: its hit is its loudest moment.
  - The sound enters with intent on frame 0 (a drone or a 150–450 ms entry at most), without a click, and runs 5–12 LU under the body for the first 2–3 s. That assumes frame 0 moves: a drone at full level over a still frame (an empty page, a blinking caret) reads as a mistake, so move the picture, not the sound.
- Fill in `audio/score.json`: key, `music`, and with music one chord per bar, sections (with a breakdown or stop about 5 LU down at 40–80% of the runtime), drops and silences (or a `bed`: a real track). Keep `"typing": "auto"` unless the brand asks otherwise.
- Run `python3 scripts/audio/score.py --cues out/cues.json --score audio/score.json --out public/audio/soundtrack.wav --stems out/stems --json out/qa/score.json` (`npm run audio`). The stems let `av-audit.py` check each sound against its cue; the master chain lives in `scripts/audio/master.py`.
- With earshot, run `python3 scripts/audio/listen.py` (`npm run listen`): earshot's timeline, sound sheet and critique in one process, into `out/qa/listen.json` and `out/qa/sound_sheet.png` (§9.1). Read the cue sync first and open the sheet.
- **Gate:**
  - the WAV measures its target ±0.5 LUFS integrated (`master.lufs` in `audio/score.json`; without it −14 with music and −18 for an effects-only film; −16 only for a sting with music that plays at the head of other videos), with true peak ≤ −1.5 dBTP before encoding and the limiter under 1.5 dB at the payoff;
  - the report's `sfx` line names the earshot kit (not `synth (fallback)`), `kit.py check` is clean, and no `stacked`, `rising` or `has no take on` warning is left;
  - a film with music of 20 s or more has contrast: LRA 5–8 LU, and the payoff 2–3 LU above the median momentary loudness (`score.py` warns);
  - every sound has something visible that causes it, at a loudness that matches that cause (a caret blink whispers; the hero reveal drops); not every picture event gets a sound, but once a class of action is sounded every instance is, at one level.

### Step 6: Render and finish → `out/film.mp4`
Read `references/finishing.md` now.
- **Preview:** `bash scripts/render.sh Film out/preview.mp4 --preview --audio public/audio/soundtrack.wav`. Remotion renders the picture muted and BT.709-tagged, and ffmpeg muxes the audio. Iterate and critique on previews only.
- **Master:** if anything moves faster than 12 px/f (true of almost every launch film), `bash scripts/render.sh Film out/film.mp4 --blur`: sharp render → speed measurement → `FilmSub` sub-frame render → float accumulation → mux → sync check. Otherwise, with no flag, `render.sh` renders a sharp master at CRF 14. Loops take `--loop` (lossless PNG intermediates, so the seam survives the encode) and, when silent, `--no-audio`.
- **Blur costs render time, so spend it once.**
  - Render the blurred master once, at the end, after the last critique round. It prints the sub-frame multiple and an estimate before it starts; on 4 CPUs a 10 s film at 60 fps and 6× takes about 7 minutes on simple frames and 10–15 on dense UI. `--budget 6` caps it.
  - A late fix re-renders only the changed act's range (`--frames A-B`) and splices it, rather than re-blurring the film.
  - A 9:16 or 1:1 variant with identical timing reuses the master's samples (`--samples-from`); one whose fastest motion is ≤ 12 px/f renders sharp.
  - Don't edit `src/` while a render runs: `render.sh` renders from a bundle frozen at its start and warns if the source changed meanwhile.
  - Stop a render by its own PID, never with a `pkill -f` pattern: on a shared machine the pattern also kills other people's renders.
- **Speed ceiling.** Moves over about 80 px/f are listed as too fast for clean blur, and `render.sh --blur` stops before the sub-frame pass while any are left: redesign them rather than adding samples (§6), or waive a frame-filling edge you checked at full size with `--accept-fast A-B`. Every hard cut is an act boundary: a cut inside an act blends its two shots into one double-exposed frame, so the render also stops on one (`--accept-cut A-B` for a flood or flash you checked).
- **Gate.** `render.sh` runs both checks below and exits 1 if either fails. Run them again on any file you deliver:
  - `python3 scripts/probe.py out/film.mp4 --spec 1920x1080@60 --dur <s>` passes: size, fps, duration ±1 f, yuv420p, BT.709 tags, AAC at 48 kHz;
  - `python3 scripts/check-sync.py out/film.mp4 public/audio/soundtrack.wav` reports a lag of ≤ 48 samples and true peak ≤ −1 dBTP after decoding.

### Step 7: Review loop
Run §8 on previews. Launch films and walkthroughs get at least 2 rounds. For stings and loops whose scripts all pass, 1 round is enough. The blurred master then gets a check, not a round: forensics, av-audit, its fastest frames at full size (every act's, including the lockup's entrance and exit, where a sliding wordmark most often shows stepped copies; fix with `measure-speed.py --floor a-b:n`), and a director's glance.

### Step 8: Deliver
- Run `bash scripts/deliver.sh out/film.mp4` with the flags your format needs: `--loop --gif --webm` for loops, `--alpha StingAlpha,StingAlphaClear` for ProRes 4444, and `--variants Film9x16,Film1x1` for social versions. It writes the poster (the final frame) and, in `qa/`, a manifest. For a brand you invented, `bash scripts/brand-kit.sh` exports the mark, lockups, favicon sizes and avatar. Re-lay the social versions out from the same timeline; never crop the master (see `references/formats.md`).
- Write a short `README.md`: the idea, the device, the grid, how to render, and the file list.
- Keep the delivery folder clean. Put the deliverables at its top level (the film, alpha versions, poster, logo files) and QA material (sheets, crops, reports) in a `qa/` subfolder. A client opens the folder before they open the film.
- **Gate:** every deliverable in the §1 row exists and passes `probe.py` at its own spec.

### Scaled-down path (stings, loops, short feature clips)
Small jobs should stay fast. The laws, the grid, the lint and one review round still apply. The rest shrinks:
1. Write a one-page treatment in `TREATMENT.md`: logline, device, the `pick.py` draw for the format, a bar table of 2–8 rows, and the copy. It replaces Steps 1–3 as separate passes. Still write `timeline.ts` and run `grid-check.ts`.
2. For style frames, the mark at 16 px and one hero still are enough.
3. Build the whole piece as one act, or two.
4. Sound is optional for a loop. A sting needs one hit tuned to the key, plus a tail that decays to digital zero.
5. Render a sharp master unless something passes 12 px/f. Then run one round with the director and forensics lenses.
6. For a loop, the last frame must flow into frame 0: the seam's frame difference must be at most max(0.4, 1.5× the median step at the ends) (`forensics.py --loop` checks it, and so does `deliver.sh --loop`); render it with `render.sh --loop`. Build the loop as a cycle rather than as enter, hold and exit. Frame 0 is also the poster and the first frame a visitor sees, so compose it with the product's name or chrome on screen.

## 4. Taste rules that matter most

The full catalogue of cheap-looking tells, each with its fix, is in `references/taste-and-slop.md`. Search it during review.

These rules ban the tells of generated work, not personality. Two films made with this skill for different brands should not look alike. If yours looks like the starter, the Tessel example or your last film, it is not finished.

**Copy** (`references/copy-and-type.md`)
- Open inside the problem, never on "Introducing…", a rhetorical question or the logo. A muted feed decides in the first second. An update film opens on the news itself: the product already moving, with a setup fragment that hands over to it.
- Pay off the film's own words: a setup phrase, then a refrain, then the resolution.
- Avoid stock phrasing (seamless, unlock, AI-powered, streamline) and never use a feature name as a headline. They mark the film as a template.
- Show one fragment at a time, and let text and the hero action take turns. No eyebrow or kicker labels and no stacked taglines, because that is landing-page grammar.

**Text flow: fragments, one at a time** (`references/copy-and-type.md` §2b)

In eight frame-measured professional films a beat showed about 2 new words, a fragment stayed readable about 0.8 s, and half the beats continued a sentence begun on an earlier one. The house default keeps that grammar and slows it down.
- **Fragments.** 1–4 words (2–3 is best, about 22 characters at most; crisp allows 5), cut at grammar: after the subject, before the object, before the payoff noun or the name. Never split a name or a number from its unit. Punctuation comes only with a sentence's last fragment. A thought of more than 4 words is a chain of 2–4 fragments and never lands as one block.
- **Build or replace.** In a build chain the fragments append to one held line that re-centres, the newest arriving in the accent and relaxing to ink; up to 8 words show, and the line clears as a whole. In a replace chain each fragment leaves whole over 24 f, then the next rises in its place (`chain()` ends the exit 6 f before the next fragment starts, so two never share the spot); up to 5 words show.
- **The animation is the verb.** Put 2–4 words before the demo and 1–3 after it; the words never describe what the picture shows. The cliffhanger cut ends a fragment one step short of its payoff and lets the picture deliver it within 90 f: "here is the newest" → the product arrives → "earshot."
- **Text and picture take turns.** Between two fragments of a chain the picture gets 30–90 f to act. The hero move never starts in the same 12 f as a fragment, nothing fast moves while words are being read, and nothing new starts during a reading hold: the camera drifts, the device breathes and the mix thins, so the line is read in quiet. Between runs of text the picture has stretches with no copy: copy on at most about 65% of the frames, and at least 1.5 s without text in every 10 s.
- **More grammar.** A list becomes a stem with a rotating slot ("syncs to" | "your phone" → "your laptop" → "the whole team."). The product can stand in for a word inside the line. One giant keyword with a small continuation beside it, once per film. Edit the tail and keep the anchor instead of replacing a line. A persistent container (a pill, brackets) holds changing words together.
- **Emphasis by colour, never bounce.** One accent sweep on the keyword, or the last word keeps the accent. No overshoot, slam per line or per-letter trick on copy; only the one hero word may move letter by letter.
- **Holds are alive, not frozen.** A fragment holds max(60, 42 + 8 f per word) after it resolves (1.0–1.25 s for 1–4 words; a build line counts all its words: about 106 f at 8 words) while it drifts 0.3–1 px/f or creeps 1–3%. That is life, not a stall: no tick needs planting in the read.

**Type**
- Choose one clean, modern sans for the brand's personality, at 2 weights, plus an optional mono, shipped as local variable fonts (`@fontsource-variable/*`). No serif and no italic (see Hard bans).
  - Personality comes from the sans you pick, its weight, case and spacing: a humanist sans at a light weight for calm, a tight grotesk for fast, a rounded sans for friendly.
  - Condensed display faces are a generated-look tell.
  - The ubiquitous UI default families, the starter's stand-in included, read as "template" unless you chose them on purpose.
  - Weight carries tone: a calm brand rarely wants a heavy grotesk wordmark.
- Get emphasis from size or motion.
  - Statements are 88–128 px with leading 0.95–1.05; a build line that will reach 6–8 words takes the quieter line role, 48–72 px, with generous space around it.
  - Emphasis inside a line is 1.5–1.7× the statement size; a standalone hero word may run 2–5× (14–48% of the frame height); secondary lines are 44–56 px.
  - UI must be at least 22 px on screen after camera scale.
  - Every number uses tabular figures.
- Keep one tracking token per role, for example a display setting of 600 / −0.05 em. Near-miss values across scenes read as "almost matched".
- No entry blur on text by default; ≤ 4 px when the brand is soft, and 6–8 px on statements only in the crisp profile, always through `blurIn` (clear by 60% of the eased move, because Chromium steps blur radii and renders anything under ~0.75 px fully sharp). Text lands sharp and is never left readable-but-blurred for more than 6 f.

**Colour** (`references/brand-and-color.md`)
- Pick one accent from an allowed hue family (red, green, teal, blue, yellow) for a stated reason. Everything in the Hard bans is out: orange, amber, beige and cream, neon, purple, violet or indigo, multi-hue gradients and glassmorphism.
- Restraint is not the same as colourless. The accent visibly carries the key beats (the product's action and the payoff), and the stage and neutrals have a tone from the brand's world. Check a mid-film frame at thumbnail size: if no brand colour shows, the film has no identity.
- Tint the neutrals cool or keep them neutral, never warm or beige, and keep ink as ink. New things arrive in the accent and relax to neutral over 10–30 f, which is how colour says "just happened".
- No glow, halo or bloom. Shadows are `0 20–40px 60–120px rgba(0,0,0,.12–.22)`, dark surfaces get a 1 px top hairline at 8–12% white, and gradients ship as dithered PNGs (`scripts/dither-gradient.py`), because CSS gradients band at 8 bits.

**Layout**
- Avoid "text left, UI card right" and small centred floating cards (under about 40% of the frame width) on an empty field; a centred product window at 70–92% of the frame width, ideally overflowing an edge, is the norm. Show the product full-bleed, anchor the type to an eye line or the lower third, and give each shot one focal action.
- Keep safe margins of at least 96 px at the sides and 64 px top and bottom, and at least 24 px of headroom at maximum punch. Overscan moving layers by 5–8%.
- **Fill the frame with purpose.**
  - In product shots the hero (the UI, the object, the number) covers about 40–70% of the frame.
  - Outside designed negative space around a single hero, such as a logo, no region of more than about a quarter of the frame stays empty.
  - In vertical feeds, the platform's caption and button zones get background or continuation (the product's surface, the stage, a bleed), not an empty band. Viewers read emptiness as unfinished, whatever the reason.

**Decoration**
- Every element must name its job (reveal, route, validate, emphasise) or be cut. That rules out particles, bokeh, starfields and ghost text.
- Grain is either absent or global at 1.5–2%, keyed to the output frame.

**Product truth** (`references/product-ui.md`): named, specific, consistent data; counters count on each visible event; the product only replans the future; no cursor once the product acts on its own; any paused frame still makes sense.

**Transitions** (`references/transitions.md`)
- Use 6–8 types per film, each at most twice, plus one signature move taken from the mark and used 3 times (open, middle, close).
- A crossfade is never the default, and never goes through black (it dips about 25% in luminance).
- No preset gimmicks: glitch, light leak, film burn, swirl, ripple, dreamy zoom, flash through white.

## 5. Timing system essentials

`src/timeline.ts` is the only source of timing. Picture, cue export and grid check all import it. Details and the full pattern are in `references/timing-grid.md`.

```ts
export const BEAT = (60 / BPM) * FPS;               // 36 f at 100 BPM / 60 fps
export const BAR = BEAT * 4;
export const b = (bar: number, beat = 0, sub = 0) =>   // sub = 16ths
  Math.round(((bar - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));
const L = (abs: number) => abs - ACT.plan.from;         // act-local frames, one per act
```

- **Whole-frame beats at 60 fps:** 90 BPM gives 40 f, 100 → 36, 120 → 30, 144 → 25, 150 → 24. 100 BPM is the default for text-led and calm films: a fragment, its read and the picture beat after it take 1–1.5 of its 2.4 s bars. 120 BPM (a 2 s bar) is for crisp films.
- **Pace: calm by default, crisp on request.** The profiles are `PACE.calm` and `PACE.crisp` (`src/lib/pace.ts`; `motion.js` in HyperFrames). A film picks one with `PACE_NAME` in `timeline.ts`; `anim.ts` exports it as `pace`, `line()`, `chain()`, `Words` and `Chain` take their numbers from it, and `grid-check.ts` checks against it. Both profiles cut copy into fragments; crisp is faster and allows a little more text.

  | Knob (60 fps) | calm (default) | crisp |
  |---|---|---|
  | Word entry, stagger | 36 f on `outSoft`, 11 f | 26 f on `out`, 6 f |
  | Rise, entry blur | 0.2 em, none | 0.32 em, 8 px |
  | Exit | the whole fragment together, 24 f | per word, 16 f |
  | Reading hold | max(60, 42 + 8 f per word) | 36 f + 6 f per word |
  | Events per 30 s, visible change | 24–36, about every 1 s | 45–60, about every 0.5 s |
  | Shot median, maximum | 100–160 f, 240 f | 60–90 f, 180 f |
  | Words per fragment, visible at once | ≤ 4, ≤ 8 (≤ 5 in replace mode) | ≤ 5, ≤ 10 |
  | Copy rate, text share | ≤ 1.2 words/s in any 5 s, copy on ≤ 65% of frames | ≤ 2 words/s, ≤ 80% |
  | Tempo | 100 BPM | 120 BPM |
- **Grid placement**
  - Section changes land on downbeats; cuts inside a section land on 8ths.
  - A batch of landings snaps to 16ths with a 0–3 f spread, and the first item lands on the beat.
  - Micro-rhythm is welcome: the payoff on the clap, its consequence on the next kick.
  - Cuts land on the grid, but most carry no sound of their own: the music carries them. Section changes and the hero reveal land with the music's own event (drop, stop, re-entry); `av-audit.py` suggests one when a top-3 picture change has no audio onset.
- **Hit frames**
  - Start a picture change at `cue − 1`, because `prog()` is 0 on its start frame.
  - Pulses peak 2 f after their sound (`hitPulse`).
  - Start a spring at `beat − delayTo(cfg, 0.5)` so its pop lands on the beat.
- **Holds**
  - Once a fragment resolves, it holds at least max(60, 42 + 8 f per word) (crisp: 36 f + 6 f per word); a build line holds for its full word count (about 106 f at 8 words). Text that hasn't resolved never exits.
  - Nothing freezes. A reading hold with a 0.3–1 px/f drift or a 1–3% creep is alive, not a stall, and needs no tick planted inside it. Outside reading holds, no stretch runs past 72 f (crisp: 48 f) without a visible event, except a designed freeze of ≤ 15 f that sits exactly on a silence, and one designed near-still hold of 60–96 f per film on the key claim or success state, under a music dropout and followed by a big move (declare it as `export const HOLD = {from, to}` in `timeline.ts`). When a gate flags a quiet stretch, give it life; loosening the threshold to pass is not a fix.
  - The end card runs 1.5–2.5 s: the lockup assembles over 60–80 f, then holds still for 36–80 f or keeps building (a creep of ≤ 6%, or a 10–20% push when the hold runs past about 1.3 s), then the tail. Never cut to a complete card that sits static, and never more than about 2.5 s on a still end card: a longer one reads as a drag. A URL is readable for at least 1.7 s.
  - In a launch film or product video the lockup appears once, at the end (a sting is the exception: it is all lockup). A mid-film logo reveal followed by the same lockup again reads as a repeat and spends seconds on a still; the one exception is the product's name or mark revealed at about 20–26% of the runtime after a problem act of 10 s or more, when the end card is a different construction or mirrors the opening. Mid-film, the brand is present through the device and the accent. Brand logo time across the whole film stays ≤ about 12% of the runtime.
- **Density**
  - Calm: 24–36 discrete events per 30 s, one hero move per bar, and slow life cruising between them. Crisp: 45–60 events per 30 s, one motion peak per bar with 30–70 f of calm between peaks, and the first 6 s about twice as dense as the middle.
  - Calm is not sparse. The energy arc, the moving frame 0 and the moving last third stay; peaks come from one hero move per section, never from more text.
  - Energy builds toward the payoff. No stretch after the turn is slower or greyer than the one before it, except one designed lull of 1–4 s inside a music breakdown at about 55–85% of the runtime; the last and biggest visual peak lands at 75–90%, on the music's re-entry. A second half that drags loses films whose first half is strong. Check the energy by eye on a contact sheet of the second half.
  - The last third keeps moving: a camera push, secondary motion or the device still acting. A film that settles 4 s before the end has ended early.
  - Shot length: median 100–160 f and maximum 240 f in a calm cut-driven film (crisp: 60–90 f and 180 f); minimum 24 f, and only with no text; a continuous take may run 300–560 f if an in-shot beat lands at least every 72 f.
- **Hook:**
  - frame 0 is already composed and moving;
  - the sound enters with intent on frame 0, with no fade over the first bar;
  - something visibly changes about every 1 s (crisp: 0.5 s), with slow life in between; when the film opens on words, the first fragment is readable by about 1 s;
  - the problem is felt by 1 s and stated by 2 s;
  - the product is named on screen by about a quarter of the runtime (its chrome, the name in a status line, the mark), not saved for the end card.

  A soft first second loses a muted feed.
- **End card:** carry the brief's one practical fact when it gives one (a date such as "next week", a URL, "out now"), set at the secondary size under the lockup. When the brief gives none, a launch film or product video still says what the product is in one short line under the name ("The build cache for CI."); a bare name is for stings. That is the only line besides the name, and it arrives as its own fragment once the name has resolved, never stacked in together with it.
- **State follows the event:** counters, checks and totals change on the landing frame of the thing that caused them, not a beat later.

**Where a sound goes** (computed by `src/lib/sync.ts`: `peak`, `hit`, `delayTo`, `settleOf`):

| Picture event | The sound sits on |
|---|---|
| Landing / impact | the contact frame, so the motion must arrive with velocity (spring threshold 0.92–1.0, or the `contact` ease) |
| Pop-in | the frame at 50% of travel |
| Tween settle | the 97% frame |
| Whoosh (camera-scale moves and logo zooms, about 2 a film) | onset 100–450 ms ahead, apex on the visual peak |
| Typing | per key up to 25 chars/s, one blip per word above (`"typing": "auto"`) |
| A text fragment landing | one soft `text` sound on the frame its last word visibly comes to rest (97% of its drawn rise: `chainResolves()` in `Chain.tsx`, given the size the act sets the chain at), or none; never one per word |
| Exit roll | one tick, with no detent |
| Cut, scroll, stream, progress bar, rolling counter | nothing: the music carries it; a counter's final lock gets a crisp tick |

Audio that leads the picture by more than about 45 ms reads as "sound first". Move the picture, not the sound.

## 6. Motion system essentials

The tokens live in `src/lib/anim.ts` (`E`, `SPR`, `PACE`, `pace`, `durFor`, `tw`, `prog`, `mix`, `lmix`, `hitPulse`, `blurIn`, `arrive`, `arriveK`, `stagger`, `inertia`, `rand`, `fd`), and tested primitives for the commonest moves in `src/fx/` (`Chain`, `Words`, `TypeOn`, `Scramble`, `Roll`, `Morph`, `Iris`, `MaskRise`, `Cursor`, `RackFocus`): use them before writing your own. Curves, measured values and choreography constants are in `references/motion-tokens.md`; camera work is in `references/camera.md`.

| Token | Bezier | Use |
|---|---|---|
| `out` | .16,1,.3,1 | arrivals, reveals |
| `outSoft` | .22,1,.36,1 | gentle settles |
| `in` | .7,0,.84,0 | implosions, a hard snap out |
| `exit` | .55,.055,.675,.19 | exits into a cut: about ×1.14 per frame over the last 10–24 f |
| `inOut` | .87,0,.13,1 | whips, lockup slides |
| `smooth` | .65,0,.35,1 | drifts, fades (10–14 f) |
| `ui` | .4,0,.2,1 | small UI changes |
| `cam` | .48,.1,0,.9 | camera: slow start, peak at about 27%, long settle |
| `glide` | .47,.2,.15,1 | 150–350 px moves |
| `rest` | .45,0,.1,1 | moves that end at rest; chaining after another move |
| `contact` | .55,0,.9,.55 | accelerating into an impact |
| `whip` | .6,0,.15,1 | feature-to-feature whips |
| `dolly` | .35,0,.65,1 | slow push through a hold |

A film uses about 3 easing characters. Linear is only for drift.

Springs (`SPR`, as damping/stiffness/mass): `snap` 18/260/0.7 (small overshoot), `pop` 11/180/0.6 (a landing only), `soft` 26/120/1 (no overshoot), `heavy` 30/90/1.4 (weighty), `calm` 16/64/1 (critically damped, 97% at 41 f: the only spring for type).
- **Damping.** Everything is eased or critically damped: damping ≥ 2√(stiffness·mass). Overshoot (1–7%) belongs only to a true landing, an object arriving at a surface or a lock, at most 2 per film, because a bounce anywhere else reads as a toy. Never put an overshooting spring on type: words settle on an ease or `SPR.calm`.
- **Smoothness is a ship gate.** Jitter, pixel-snap stairs, single-frame pops and stall-then-lurch block the ship however good the idea is: zero `forensics.py` fails and Finish at 5 (§8).
- **Clamp.** Clamp overshoot wherever it could collide with other geometry or drive a value negative. Snap to rest when `|1 − s| < 0.01`.
- **`Easing.spring({damping:200})`** starts at zero velocity, so it is not a replacement for expo-out.

Laws of weight:
- **Direction.** Entrances decay and exits accelerate; only the camera eases both ways. A fade-out never uses expo-out, because it pops half the change in one frame.
- **Log space.** Interpolate scale and zoom in log space: `exp(mix(log a, log b, t))`, which is `lmix`.
- **Duration.** Duration grows with distance: calm 0.5 s + 1.6 ms per px, camera moves clamped to 0.9–3.0 s (crisp: 0.35 s + 1.35 ms per px, 0.6–2.4 s). The slowest move is at least 3× the fastest.
- **Shape and contact.** Shape settles 6 f before position. Contacts squash (scaleX 1.08 → 1, scaleY 0.9 → 1 over 8 f, anchored at the contact edge).
- **Overlap.** A secondary move starts at 55–75% of the leading move (about 20 f into a 60 f move), so both settle within 2 f, or it starts on a zero-slope curve. This prevents stall-then-lurch.
- **Budget.** Run one hero motion plus at most 2 supporting ones. Ordinary moves stay at or under 25 px/f; fast moves are rare (in calm at most 2 per film, at most 1 of them a 60–70 px/f whip, crisp films spend more), sit next to real stillness (0.3–0.6 px/f), and never happen while text is being read. Anything faster than 12 px/f gets true motion blur in Step 6.
- **Ceiling.** No element moves faster than about 60–80 px/f. Past that, blur smears it into a streak with stepped copies; redesign the move as a cut on the beat, a match cut, a mask wipe or a shorter distance. Frame-filling edges (wipes, floods, irises, zoom-throughs, a container growing to full frame) may peak at 150–300 px/f for a few frames.
- **Envelope.** Every punch and tick uses `hitPulse(t, attack = 2, tau = 5)`. A half-sine on a hard window leaves velocity clunks and peaks 6–8 f late.
- **Seams**
  - Either both sides of a cut are at rest, or the incoming shot starts at the outgoing velocity.
  - Match every property across a cut, and show the rest pose once.
  - Never cross-fade two copies of one object; morph one object instead.

## 7. Engine non-negotiables

These come from real failures. Each costs minutes to respect and hours to debug.

**Both engines**
- **Everything is a function of frame or time.**
  - No CSS `transition`, `animation` or `@keyframes`, because they don't render deterministically.
  - No `Math.random`, `Date.now` or `performance.now`; use a seeded `rand(seed)`.
- **Transforms**
  - Put all translation inside one `transform` (`left:0; top:0; transform-origin:0 0; transform: translate() scale()`). A fractional left/top combined with a transform snaps to whole pixels.
  - Place dots and cursors by transform only.
  - Vertical text positions snap to whole pixels in the headless shell, so end a text rise on `arrive(p)` (and start an exit on `depart(q)`) instead of letting an ease-out creep its last pixels (`references/chromium-rendering.md` §15).
- **Blur**
  - Never put `will-change` on a layer where `filter: blur()` animates. It causes nondeterministic ghost frames.
  - Never animate blur on large layers; use `src/fx/RackFocus.tsx`.
- **Discrete state**
  - Clamp every value that feeds geometry, so radius, width, blur and scale stay ≥ 0.
  - Compute discrete state (typed count, caret, counters, labels) from `fd(frame)` (`Math.round`), because motion-blur sub-frames are fractional.
- **Fonts.** Load fonts before any render or text measurement (`FontGate`). A measurement taken earlier is cached with the fallback width.

**Remotion** (`references/remotion-engine.md`)
- **Clamping.** `interpolate` extrapolates by default, so always clamp; `tw()` and `prog()` do it for you.
- **`premountFor`** only affects Studio preview and does nothing in a render. With `layout="none"` it is silently ignored in 4.0.529 (no error). Don't build on it.
- **Studio `Interactive.*` markup** is an optional leaf layer, never the structure.
- **Config.** Render with `--muted` and let ffmpeg mux the audio (Remotion's AAC leaves about 2.5 f of priming). Use the ANGLE GL renderer, JPEG q95 intermediates and a 120 s `delayRender` timeout; the starter's `remotion.config.ts` sets all of these.
- **Browser.** In a sandbox, set `REMOTION_BROWSER` to the local headless Chromium if auto-detection misses it.

**HyperFrames** (`references/hyperframes-engine.md`)
- **Timeline.** Each composition has one paused timeline, registered last, with a key equal to its `data-composition-id`.
- **Tweens**
  - Use `fromTo`, never `from`.
  - Never combine a CSS transform with a GSAP transform on one node.
- **Markup**
  - No `repeat:-1`. No `<br>`.
  - Every `<audio>` has an `id`; one without is silently dropped from the mix.
  - A sub-composition's `<style>` and `<script>` go inside its `<template>`.
- **Fonts** are local woff2 files declared with `@font-face`.
- **Lint.** Lint must show zero errors before `check` means anything, because otherwise it reports a misleadingly clean "0 samples".
- **Finish.** Finish with `bash scripts/hf-finish.sh`. Films faster than about 18 px/f belong in Remotion.

## 8. Review loop and ship gate

The full procedure, the critic prompts, the rubric anchors and the table of thresholds are in `references/review-loop.md`. A round goes like this:

1. **Render.** Render the preview (or the affected acts).
2. **Measure.** Run the scripts. Each writes JSON to `out/qa/`:
   - `python3 scripts/probe.py out/preview.mp4 --spec 1920x1080@60 --dur <s>`
   - `python3 scripts/forensics.py out/preview.mp4 --cues out/cues.json --json out/qa/forensics.json`. It checks pops, stalls, dead holds, ghost frames, border slivers, judder, sharpness steps, banding and compression smear on flat fields. Declare designed cuts and freezes with `--cuts` and `--freeze-ok` so they are not flagged, and add `--loop` for loops to check the seam.
   - `python3 scripts/av-audit.py out/preview.mp4 --cues out/cues.json --stems out/stems --json out/qa/av.json`. It checks onsets against cues (per stem, so the bed cannot hide a late effect), loudness, true peak, clicks and the tail.
3. **Sheets.** Make contact sheets with `python3 scripts/sheet.py out/preview.mp4 --chunks 4 --rate 12 --out out/qa/sheet.png`, plus a legibility sheet at `--width 480`. Grab exact frames with `bash scripts/grab.sh out/preview.mp4 <frame>…`.
4. **Lenses.** Run the critic lenses from `assets/critics/`. Launch them as parallel subagents if the harness allows it; otherwise run them one after another, and look at the sheet *before* you open the code. On a tight usage budget, run the director and art lenses only, yourself, on the sheets, and let the scripts cover forensics and sync; never skip the lenses entirely, because they catch most of what the scripts can't.
   - **Director** (`director.md`): the weakest 3 s; anything cheap, templated or dead; whether each act lands in under 1 s; whether the story reads muted; the 2 s hook; the text flow (words per frame, one fragment at a time, text and picture taking turns); the end. At most 12 changes.
   - **Forensics** (`forensics.md`): reads the script JSON and inspects the flagged frames at full size.
   - **Sound/sync** (`sound-sync.md`): onsets against cues, masking, key, the ending.
   - **Round 1 only, art/copy/UI** (`art-copy-ui.md`): type, colour discipline, strings, data truth.
5. **Output format.** Each lens returns `{issues:[{id, priority, frame, problem, fix:{file, change}}], overall, score}`.
6. **Verify** (`verifier.md`). Try to refute each P0 and P1 from frames and code. Drop an issue if it is wrong, invisible at normal speed, or if its fix would make things worse.
7. **Fix and re-render.** Fix in order of impact per minute. Re-render only the affected acts (per-act compositions) and splice at a static seam frame.

**Critic prompts** say what changed, so it gets checked hardest. They also say "Do not re-report fixed issues", "Don't propose adding text" and "Do propose splitting a sentence into a chain", and they batch images into sheets, because images are expensive in context. When one act stays weak after two rounds, run the design-off in `review-loop.md`.

**Severity:** P0 is visible on a key beat (hook, payoff, logo) or breaks the story; P1 is noticeable on a normal viewing; P2 is visible only when paused.

**Ship gate**
- The 11-dimension rubric: every dimension ≥ 3, Finish and Sync = 5, mean ≥ 4.2.
- No open P0.
- Every script passes.
- Stop after 5 rounds, or sooner once the gate is met. Then say plainly what you would still change.

## 9. File index

Read each file when its step comes up. Don't read them all at once.

| When | File | What it gives you |
|---|---|---|
| Step 0, choosing a format | `references/formats.md` | a recipe per format: act templates, loops, stings, walkthroughs, social re-layouts |
| Before the first film | `references/worked-example.md` | Tessel from idea to master, with 15 mistakes and their fixes |
| Step 1 | `references/concept-and-story.md` | concept lenses, ownership and deletion tests, device design, arcs, end cards |
| Step 1 | `assets/TREATMENT.md` | the treatment template |
| Step 1, after the draw | `references/technique-library.md` | every technique in the library: recipe, timing at 60 fps, when to use and avoid it |
| Steps 1, 3–4 and review | `references/craft-rules.md` | measured norms for pacing, smoothness, text timing, transitions, camera, UI and colour over time |
| Steps 1–2 | `references/copy-and-type.md` | copy budget, fragment chains with timing and before/after examples, callback copy, loading a family, type scale, kinetic type, safe reveals |
| Step 2 | `references/brand-and-color.md` | personality → choices, naming, the mark sheet, lockup proportions, tokens, accent, stages |
| Step 2 and review | `references/taste-and-slop.md` | every cheap-looking tell, with its fix |
| Step 3 | `references/timing-grid.md` | BPM/fps table, the `timeline.ts` pattern with `chain()`, sync helpers, schedules, holds and the two density profiles |
| Step 4 | `references/motion-tokens.md` | easing and spring tables, the `PACE` knob, `hitPulse`, anticipation, landings, staggers |
| Step 4 | `references/camera.md` | anchor camera, log-space zoom, breath/dip modifiers, rack focus, 3D limits |
| Step 4 | `references/transitions.md` | energy table and the seam catalogue, each with frames, curves and failure modes |
| Step 4 | `references/product-ui.md` | the smart part, data and story asserts, FLIP inserts, counters, cursor physics, typing |
| Step 4, Remotion | `references/remotion-engine.md` | verified API facts, config, CLI recipes, pitfalls |
| Step 4, HyperFrames | `references/hyperframes-engine.md` | render model, composition rules, CLI, translating cinetic to GSAP |
| Any render artifact | `references/chromium-rendering.md` | symptom → cause → fix → detection for rasterisation traps |
| Step 5 | `references/sound.md` | where the sounds come from (the earshot kit, its roles, the fallback), `score.json` schema, placement, scoring text, mix, master and listening |
| Step 6 | `references/finishing.md` | motion-blur pipeline and its cost, banding, BT.709, encoding, mux, deliverables |
| Step 7 | `references/review-loop.md` | round procedure, rubric, severity, thresholds, design-off |

**Tools you already have.** Reach for these before writing a helper of your own.

| Need | Tool |
|---|---|
| a project from the starter | `scripts/new-film.sh` |
| a random, weighted draw of techniques for the film; one entry in full | `scripts/pick.py` (`--show <id>`, `--list`) |
| static bans and hard bans, a leftover placeholder brand | `scripts/lint-film.mjs` |
| grid, holds, gaps, word budget, text flow (fragments, words per frame, lines arriving together, reveal and word rate, picture beats and their cues, quiet reads, text share); text in the safe zone (feed presets: `--safe feed9x16`), text covered by movers, readable text too fast (`--cues`) | `scripts/grid-check.ts`; `scripts/layout-audit.sh` |
| a font family, vendored into the project without `npm install` | `scripts/add-font.mjs` (or `new-film.sh --font`) |
| a palette from one accent, contrast, accent coverage on a still | `scripts/palette.py` |
| gradients that don't band | `scripts/dither-gradient.py` |
| cues for the sound; score, SFX, mix, master and tail fade | `scripts/export-cues.ts`; `scripts/audio/score.py`, `synth.py`, `master.py` |
| the sound kit: init from a preset, tune to the key, render (cached), vendor, check, audition | `scripts/audio/kit.py` (earshot) |
| earshot's ears on the soundtrack: cue sync, sound sheet, critique (or on each kit role, `--kit`) | `scripts/audio/listen.py` |
| previews, masters, motion blur, splices, chunked renders | `scripts/render.sh` (`--preview`, `--blur`, `--frames`, `--budget`), `scripts/render-chunks.sh` |
| on-screen speed, too-fast moves; float accumulation | `scripts/measure-speed.py`; `scripts/accumulate.py` |
| spec, A/V lag and true-peak gates | `scripts/probe.py`, `scripts/check-sync.py` |
| contact sheets, exact frame grabs | `scripts/sheet.py`, `scripts/grab.sh` |
| pixel QA, loop seam; audio and sync QA | `scripts/forensics.py` (`--loop`); `scripts/av-audit.py` |
| poster, GIF, WebM, loop seam, alpha, variants | `scripts/deliver.sh` |
| brand kit: SVG and PNG mark and lockups, favicons, avatar, X header; outlined lettering | `scripts/brand-kit.sh`; `scripts/outline-text.py` |
| the HyperFrames finish | `scripts/hf-finish.sh` |
