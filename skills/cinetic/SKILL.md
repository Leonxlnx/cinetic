---
name: cinetic
description: Direct, build and render premium motion films from code - launch films, update films ("vX is out"), product and feature videos, looping feature animations, logo stings, UI walkthroughs, teasers and promo clips. Use this whenever the user wants any video, animation, motion graphic or animated demo made with Remotion, HyperFrames, HTML/GSAP or React, or asks to storyboard, time, score, render, polish or critique one - even if they only say "make a video about X", "animate this feature" or "we need a launch clip". It supplies a simple default path one agent finishes in one to two hours, the whole film first, plain-word copy checked by script, one text voice, seams that flow, devices that differ from the last films, real product UI, current official logos, a licensed track cut to the picture and film-grade finishing.
license: MIT
compatibility: Needs Node 22+, ffmpeg 6+ with libx264, Python 3.11+ with numpy, scipy, soundfile, pyloudnorm, opencv-python and librosa (fonttools, brotli and uharfbuzz for outlined logos; pillow for plates), and Chromium or Chrome Headless Shell for rendering; earshot 0.4+ (in its own virtualenv) renders the effects kit and listens to the soundtrack. Works with Remotion 4 (React) or HyperFrames (HTML and GSAP).
---

# cinetic

You are directing a short film, not animating a web page. Picture, words and sound are one system driven by one
timeline file, and nothing is finished until it is rendered, measured and reviewed once against the standard below.

- **Engines.** Remotion 4.0.529 (React, frame-driven) is the default and carries every rich primitive. HyperFrames
  0.8.79 (HTML plus a paused GSAP timeline) mirrors the tokens and the timeline contract for HTML projects
  ([hyperframes-engine.md](references/hyperframes-engine.md)).
- **Paths.** Scripts work from the skill root and in a film project (`new-film.sh` copies them in); each prints `--help` but the helpers `brand-svg.ts` and `hf-preflight.cjs`.
- **Brand.** A supplied brand (logo, colours, fonts, screenshots, tone) wins over the house taste
  ([brand-kits.md](references/brand-kits.md)); record any banned look it brings in `BRIEF.md`.
- **Python.** Commands say `python3`: `node scripts/frames.mjs python` names the interpreter that has
  `scripts/requirements.txt`; set `PYTHON` to it once.

## The standard

These are the rules every film is held to, with their numbers. The gates named in brackets measure them.

1. **Words in the middle.** A statement is centred and sits in the middle band of the frame (its centre at 35-65 % of
   the height): centred for 80 % of the statement time or more, in the middle band for 85 % or more. Centred top or
   bottom only over a full-bleed picture. Never flush left at the top or the bottom. "Text on top, big picture below"
   at most once a film; a line beside, above or below a picture at most once per 30 s. (`layout-audit.sh` placement.)
2. **Text and picture, mixed.** A line alone on a clean ground (0.5-2.3 s), the product acting (1-3.5 s)
   and a line arriving with the picture it names, mixed, never a line-card-line-card loop; no empty frame between
   scenes. Type-only beats two or more; a line over a picture on at most 40 % of beats; first line by 1 s.
   (`grid-check.ts` beats.)
3. **The picture tells what the product does.** Each picture proves its line without repeating its words (input ->
   output, a count rising; "every" drawn as many at once); a line its picture already says is cut (`copy-check`
   repeats, quantity). The first picture beat shows
   the core action literally, with a real person giving the input where the input is human (real footage or a photo).
   With the words covered, every picture beat still reads at least partly. ([imagery.md](references/imagery.md) "Show
   the core action".)
4. **Less text, every word chosen.** 1-5 words a line typically, 2-7 at most, one claim, plain words a customer would
   use; 0.3-1.5 headline words a second; what the product is by 3 s. No text in 15 % of the frames or more; at most two
   text blocks at once outside a product beat; no floating chips, counters or captions beside a statement.
   (`copy-check.py`, `copy-check.py --ui src`.)
5. **Text with love: one voice.** Every line arrives in the film's one text voice (a word build, a blur-in or an
   ink-in, [copy-and-type.md](references/copy-and-type.md)); at most one contrasting entry per 30 s, for the hero line.
   Statements at a cap height of 6-9 % of the frame height (bigger for the claim); one-line statements 80 % or more; a
   small lead line over big key words at most once a film. Emphasis is quiet and of one kind: the key word in the
   accent colour on at most two lines; a box, marker bar, pill, underline or knockout only as the film's one
   signature, on one line. (`lint-film.mjs` `emphasis-share`, `emphasis-signature`.)
6. **Scene changes that flow.** Every hard cut carries something: the ground kept, the cut inside a blur, an anchor
   held within 10 px or the motion carried (smeared); a picture-to-picture match cut only under a carried object; at
   most 10 % of hard cuts carry nothing.
   The ground flips light-dark at most twice a film, each a declared colour event. Two or three seam kinds a film, none
   over 45 % of the scene changes, and one exit-then-enter, text-swap or match-cut in a film of four lines or more.
   Build them with `fx/Seam` ([transitions.md §2](references/transitions.md#2-recipes-at-60-fps)). (`forensics.py --seams`.)
7. **Clean UI.** The product's real screens built in code at film size, every string the product's own: no bracket
   slot, no stand-in number, no kit sample, no title cut with "...". Left edges of stacked rows within 4 px, inner
   padding about 2.4 cap heights and even (never under 0.8), no text touching an asset, no accent bar beside a card;
   widths measured, never guessed from a letter count (`lint-film.mjs`, `layout-audit.sh`).
8. **Logos current, presented well.** Other products' marks come from `scripts/logos.mjs` in their newest official
   form, verified on the brand's own page within 12 months, in one presentation a film (a chip in the line, pills round
   a centred line, or a wall), never a pill on every line (`logos.mjs check`). The end card is centred, built from the
   film's last element (the last picture's element becomes the mark, the last word the wordmark, the badge spins in),
   held 2-3 s on a creep, the name once and the one fact under it. The logo is the brand's own or built from the film's
   last element, never a sparkle, a star or a generic glyph.
9. **Its own film, never a template.** One world for the whole film, one text voice, two
   or three moves, two or three seam kinds, one signature and one end-card design, picked from
   [catalogue.md](references/catalogue.md) and declared in `film.json`. The world, the voice, the signature and the
   end card differ from each of the last three films, and the move set shares at most 25 % with each of them; a film
   made from a template plays another device than its floor in half its slots or more. (`film-diff.mjs`; the deals
   leave the last films' choices out.)
10. **Premium, not just clean: every shot keeps the habits.** One sharp plane and a graded blur ladder behind it; one
    camera move with a job, front-loaded, landing (else still: no float, drift, bob or panning back); a world in one
    colour family with its key light; glass as a lens on it; light sized to its source and timed (a band as the pane
    lands, a glow the size of the button); a hero object in a real material; the product's real content in quantity; a
    scale jump (macro to wide, a giant word); smear only on fast moves; transitions made of focus and light. Cards face
    the camera (a 3D turn is a designed move). A flat field with small type and a still card fails.
11. **Simple and finished.** The path below, one review round, on the time plan; a gate that costs more than 5 minutes
    on a 30 s film is advisory. A film is delivered whole, with its ending: never a cut film.

## Hard bans

When you invent the look, none of these appear (`lint-film.mjs` checks the code, the director pass the frames).
- **Words:** grey bars or "Placeholder" where words belong; vague, fancy or metaphor copy (unleash, reimagine,
  seamless, elevate, unlock, the future of, magic) and slogan shapes ("X, reimagined", "Less X. More Y."); keyword
  piles; two lines readable at once (a declared swap excepted); eyebrow labels, stacked taglines, "Introducing…";
  filler text, fake metrics.
- **Type:** serif faces, italic or oblique (or a skew faking one). One clean sans, plus a mono for code or numbers.
- **Colour:** orange, amber, beige, cream, tan or sand as an accent, a paper or a glow; neon; purple, violet or
  indigo; a monochrome accent wash; glassmorphism as a UI style.
- **Decoration:** emoji and stock icons; an accent bar down a card's side; sparkles for "AI", confetti, lens flares,
  code rain; bounce on anything that is not landing; a springy overshoot on copy.
- **Pictures:** a person, place or product drawn in SVG where a photo belongs; grey cards standing in for pictures;
  stock gestures (handshakes, pointing at screens); low-resolution or mixed-grade pictures.
- **Sound:** generated music; a film with no music; ducking the music under effects; copyrighted audio in any repository.
- **Credits:** none in the picture; licence records stay private with the project.

Light from a source, spectral accents, dithered gradients and glass are allowed where they do a job, with one dominant
accent over the film's world ([lighting.md](references/lighting.md)).

## The time plan

A run has a budget (1-2 h; take 90 min when none is given). Renders are slow on a shared laptop: the whole
film exists early, and every later look is cut from it:
- **15 %:** brief, scaffold (seconds), direction, a script that passes `copy-check`, the track picked.
- **25 %:** the ending as stills: `node scripts/frames.mjs end` (the lockup, the name and the mark read).
- **45 %:** a complete draft with its ending: `render.sh Film out/draft.mp4 --draft --max-min 9` (the whole film at
  half size, fast encode, the current sound) and its sheet `out/qa/draft-sheet.png`.
- **45-70 %:** the soundtrack, the review round on the draft (`frames.mjs sheet --from out/draft.mp4`, `grab`), fixes,
  the draft again.
- **70 %:** the final starts: `bash scripts/render.sh Film out/film.mp4 --max-min 9` (parts that resume: rerun until
  exit 0). If it cannot finish in the time left, deliver the draft scaled up (`--from-draft out/draft.mp4`).

Never per-frame still loops: a cut from the draft costs seconds.

## The simple path

Eight steps. Read a reference only when its step needs it.

**1. Brief and scaffold.** Write `BRIEF.md`: the spec line (`1920x1080@30, 25s, format: launch, audio:
licensed track + launch kit`), what is supplied (a brand kit, a clip to feel like, footage, the products it works
with), the hard bans. Ask at most three questions, and only when the product, the format or the length is missing.
Then scaffold:
```
bash scripts/new-film.sh films/<name> --name "<Product>" [--brand <kit>] [--like <clip>] [--music <file> + licence flags] [--link-modules <node_modules>]
```
A launch gets `launch-simple`; `--format update` the update film; other shapes are in
[templates.md](references/templates.md). It writes `film.json` (the start time, the last three films' devices) and
deals the type pairing from the name (`type-deal.ts`); cards are the kit's `Card`, logo rows `LogoRow`.

**2. Direction and script.** `python3 scripts/deck.py --brief "<one line>" --format launch [--have ui,photos]
[--brand brand/brand.json]` deals three directions into `out/OPTIONS.md`; pick the one that fits the product with
`--direction <id> --why "<one line>"`. Copy [TREATMENT.md](assets/TREATMENT.md) to the project and write
the idea sentence (it fails with a competitor's name in it) and the script: line 1 says what the product is ("[Name]
turns [input] into [output]."), then one concrete thing it does a line, then the claim: 3-4 lines at any length, the
pictures between carry the rest. `python3 scripts/copy-check.py TREATMENT.md` passes before any picture work
([copy-and-type.md](references/copy-and-type.md)).

**3. World, hero shots, creative elements.** The deal (`src/dealt.ts`) holds the film's **world** (one place with its
key light, never cut; a photograph needs `node scripts/assets.mjs plate <kind>`, then `--pick <n> --to public/plates
--accent '<accent>'`), three or more **hero shots** (designed 3D and light shots: a glass input over the world, the input
at macro scale, a page travelled, a notification stack, a porthole parting the line, the 3D mark into the lockup ...;
[catalogue.md](references/catalogue.md) §0b) and two or three **creative elements** (`src/fx/creative`). The shots fill
themselves from `src/content.ts`: `node scripts/content.mjs --brief BRIEF.md --fetch --force`, then keep what is true.
launch-simple places the shots first (`HERO_PLAN`; a pair's `hero` pins one), the elements take the beats left; swap
one of each at most, with a reason. Other templates pick from the catalogue into `film.json` `devices`, then `node
scripts/film-diff.mjs`.

**4. Music.** The track is chosen before the timeline and the picture is cut to it
([music.md](references/music.md)): `node scripts/music.mjs pick --mood "<words>" --length <s>` (the curated library;
`music.mjs search` without one), `get '#n' --to audio/music` (never the last film's track), then `python3
scripts/audio/track.py analyze` and, once the script is written, `fit` (the timeline's bars, the entry on the lockup,
the track's own ending: never a cut), `check`. The track plays only through `score.py` (`--bed-only` before the kit
exists); never cut it by hand.

**5. The product and the pictures.** In launch-simple you write two files: `src/launch.ts` (each line, its
picture, the strings that picture shows, the one fact for the end card) and `src/product.tsx` (each picture as the
product's real screen built in code with the kit, the first one showing the core action, the last one with its hero
element). The kit shows only the film's own content (a part given nothing draws a dashed box and fails precheck;
[product-ui.md](references/product-ui.md)). Real people, places and objects are real photos or clips with a studio
finish, never drawn (`node scripts/assets.mjs recipe "<product>"`; [imagery.md](references/imagery.md)). Other products' marks: `node scripts/logos.mjs get <name> --film .`. Before a look:
`node scripts/precheck.mjs` (seconds: imports, every act at three frames, timing, empty kit parts, text fit). Look
with `node scripts/frames.mjs end` (the ending, first) and `still <frames>` (several in one call); then the draft.

**6. Draft, sound and check.** `npm run check` (tsc, `lint-film.mjs`, `grid-check.ts`) clean, then the whole draft:
`bash scripts/render.sh Film out/draft.mp4 --draft --max-min 9` (rerun until exit 0; silent until the soundtrack
exists). `npm run sound` (cues, the kit cast and rendered for this film's actions, plan and mix in one command; no
setting; its last line says PASS, FAIL or PARTIAL), the draft again.
The fast gates: `python3 scripts/copy-check.py --ui src`, `bash scripts/layout-audit.sh Film --copy --scale 0.5`,
`python3 scripts/forensics.py out/draft.mp4 --cues out/cues.json --grammar-only` (and `--seams`), `node
scripts/logos.mjs check` ([checks.md](references/checks.md) §1).

**7. One review round.** `node scripts/frames.mjs sheet --from out/draft.mp4` (16 tiles; `--frames A-B --every N` for
an act, `grab --from` for full frames), then the director pass
([director.md](assets/critics/director.md)): read the picture beats with the words ignored first (what
does the product do in each?), then the checklist of the standard above, item by item, with frames. Fix every P0 and
the P1s the time allows, then the draft again. A second round only when a gate fails
([review-loop.md](references/review-loop.md) §1).

**8. Master and delivery.** By 70 % of the budget: `bash scripts/render.sh Film out/film.mp4 --max-min 9` (PNG frames,
parts that resume: rerun until exit 0; `--blur` when the blur policy asks); out of time, `--from-draft out/draft.mp4`
is the delivery. Full `forensics.py` on the master, then `bash scripts/deliver.sh out/film.mp4`
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
Films render at 30 fps (a move over 25 px a frame is smeared; `--fps 60` for fast camera travel);
a loop's last frame flows into frame 0 (`forensics.py --loop`, `render.sh --loop`).

## Craft essentials

**Timing.** `src/timeline.ts` is the only source of timing; picture, cues and checks import it. Acts, the reveal and
the ending land on the track's events within 1 frame (`b(bar, beat, sub)`); graphic cuts on its accents,
the picture leading by up to 3 f; a 0.2-0.5 s stop or dip before the biggest reveal
([timing-grid.md](references/timing-grid.md)).

**Motion.** Curves by role from `lib/anim.ts` (`E.glideOut` to arrive, `stdInOut` to reposition, `buildIn` to leave);
one spring class a film, never an overshoot on type; never scale from zero; speed carried through cuts; nothing
changes state in one frame (`glideValue`), every move lands before its cut (`landBeforeCut`), the camera moves only
with a purpose and holds may rest (`stageMove`; no float, no bob, no resting tilt)
([motion-tokens.md](references/motion-tokens.md), [camera.md](references/camera.md)).

**Engine.** Everything is a pure function of the frame: no CSS transitions or keyframes, no `Math.random`, `Date.now`
or `performance.now` (seeded `rand(seed)`); all translation in one `transform`; clamp every value that feeds geometry;
no `will-change` where a blur animates, defocus at fixed levels, large soft shapes baked into dithered plates; fonts
loaded before any measurement. Never run `npx remotion still` or `render` in a loop (each call bundles again;
`frames.mjs` and `render.sh` share one Rspack bundle)
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
| picking the voice, moves, seams, ground, end card, marks | [catalogue.md](references/catalogue.md) |
| the script, one line at a time, type roles and sizes | [copy-and-type.md](references/copy-and-type.md) |
| the idea, the inventory, the direction deck, story shapes | [concept-and-story.md](references/concept-and-story.md) |
| beat grammar and timings per format | [formats.md](references/formats.md) |
| a template other than launch-simple, and how a film differs from it | [templates.md](references/templates.md) |
| colour, ground families, marks and lockups | [brand-and-color.md](references/brand-and-color.md) |
| a supplied brand kit; a clip to feel like | [brand-kits.md](references/brand-kits.md), [clip-match.md](references/clip-match.md) |
| the track: licences, analysis, the edit, cutting to music | [music.md](references/music.md) |
| real photos and footage, the core action, the studio finish | [imagery.md](references/imagery.md) |
| the product's UI, the kit, the macro screens, data | [product-ui.md](references/product-ui.md) |
| the timeline, declarations, density, holds | [timing-grid.md](references/timing-grid.md) |
| curves, springs, carry, creep; the camera; the seams | [motion-tokens.md](references/motion-tokens.md), [camera.md](references/camera.md), [transitions.md](references/transitions.md) |
| the world, the key light, glass, glow and plates; 3D hero objects | [lighting.md](references/lighting.md), [three.md](references/three.md) |
| every device with timing and build (search it) | [devices/INDEX.md](references/devices/INDEX.md) |
| the effects kit, cues, placement, levels, mastering | [sound.md](references/sound.md) |
| render paths, blur, banding, encoding, deliverables | [finishing.md](references/finishing.md) |
| every gate script and its rules | [checks.md](references/checks.md) |
| the review round, and the long review when asked | [review-loop.md](references/review-loop.md), [assets/critics/](assets/critics/) |
| cheap-looking tells, mistakes of code films | [taste-and-slop.md](references/taste-and-slop.md), [craft-rules.md](references/craft-rules.md) |
| a whole film from idea to master, with its mistakes | [worked-example.md](references/worked-example.md) |
| update films; Remotion; HyperFrames; render artifacts | [update-films.md](references/update-films.md), [remotion-engine.md](references/remotion-engine.md), [hyperframes-engine.md](references/hyperframes-engine.md), [chromium-rendering.md](references/chromium-rendering.md) |

## Tools

| Need | Tool |
|---|---|
| a project from the starter and a template; a brand kit, a clip, a track | `scripts/new-film.sh` |
| three dealt directions (world, hero shots, elements); the sheet | `scripts/deck.py` |
| the film's devices against the last three films and its template; the history | `scripts/film-diff.mjs` (`--record`, `--history`) |
| is the script clear; are the UI strings real words; OCR of held stills | `scripts/copy-check.py` (`--ui src`, `--final`, `--ocr`) |
| the grid, the beats, the script, the seams, the declarations | `scripts/grid-check.ts` |
| static bans, tokens, placeholders, emphasis | `scripts/lint-film.mjs` |
| imports, three frames an act, timing, empty kit parts, text fit, in seconds | `scripts/precheck.mjs` |
| stills, the ending, sheets from the bundle or the draft; which Python | `scripts/frames.mjs` (`still`, `end`, `sheet`, `grab`, `python`) |
| placement, safe area, overlaps, covered text, kit icons, stand-ins | `scripts/layout-audit.sh` |
| pixel QA: pops, holds, seams, ground flips, motion gates | `scripts/forensics.py` (`--grammar-only`, `--seams`, `--loop`) |
| the draft, masters in parts, the blur pass, the draft as delivery | `scripts/render.sh` (`--draft`, `--from-draft`) |
| spec, A/V lag, frame sync and true-peak gates | `scripts/probe.py`, `scripts/check-sync.py` |
| poster, GIF, WebM, alpha, variants, credits | `scripts/deliver.sh` |
| footage, photos, the world's plates | `scripts/assets.mjs` (`recipe`, `plate`, `search`, `get`, `grade`) |
| the film's screen content from the brief | `scripts/content.mjs` |
| other products' official marks, current and verified | `scripts/logos.mjs` (`get`, `check`) |
| the track: find, download with its licence; analyse, edit, grid | `scripts/music.mjs`; `scripts/audio/track.py` |
| the effects kit, its plan, the mix, the listening pass, credits | `scripts/audio/kit.py`, `plan.py`, `score.py`, `listen.py`, `credits.py` |
| a supplied kit; a palette or a ground family's tokens; a font | `scripts/brand.py`; `scripts/palette.py` (`--family`, `--recipe`); `scripts/add-font.mjs`, `scripts/font-match.mjs` |
| advisory reads: flat-film floors, grammar, speed, data | `scripts/look-audit.py`, `scripts/grammar-score.mjs`, `scripts/measure-speed.py`, `scripts/data-check.mjs` |
| a clip's grammar and the guard against copying it; the detail pass; device draws | `scripts/like.py`; `scripts/detail-pair.py`; `scripts/pick.py` |
