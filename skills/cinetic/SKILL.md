---
name: cinetic
description: Direct, build and render premium motion films from code - launch films, update films ("vX is out"), product and feature videos, looping feature animations, logo stings, UI walkthroughs, teasers and promo clips. Use this whenever the user wants any video, animation, motion graphic or animated demo made with Remotion, HyperFrames, HTML/GSAP or React, or asks to storyboard, time, score, render, polish or critique one - even if they only say "make a video about X", "animate this feature" or "we need a launch clip". It supplies a default path one agent finishes in one to two hours, scenes dealt from a house bank, plain-word copy checked by script, one face with rotating voices, flowing seams, real product UI, current official logos, a licensed track with recorded effects and film-grade finishing.
license: MIT
compatibility: Needs Node 22+, ffmpeg 6+ with libx264, Python 3.11+ with numpy, scipy, soundfile, pyloudnorm, opencv-python and librosa (fonttools, brotli and uharfbuzz for outlined logos; pillow for plates), and Chromium or Chrome Headless Shell for rendering; earshot 0.4+ (in its own virtualenv) listens to the effects and the soundtrack. Works with Remotion 4 (React) or HyperFrames (HTML and GSAP).
---

# cinetic

You are directing a short film, not animating a web page. Picture, words and sound are one system driven by one
timeline file; nothing is finished until rendered, measured and reviewed once against the standard below.

- **Engines.** Remotion 4.0.529 (React, frame-driven) is the default. HyperFrames 0.8.79 (HTML, a paused GSAP timeline) mirrors the tokens and timeline contract for HTML projects ([hyperframes-engine.md](references/hyperframes-engine.md)).
- **Paths.** Scripts work from the skill root and in a film project (`new-film.sh` copies them in); each prints `--help` (not the helpers `brand-svg.ts`, `hf-preflight.cjs`).
- **Brand.** A supplied brand (logo, colours, fonts, screenshots, tone) wins over the house taste ([brand-kits.md](references/brand-kits.md)); record any banned look it brings in `BRIEF.md`.
- **Python.** Commands say `python3`: `node scripts/frames.mjs python` names the interpreter with `scripts/requirements.txt`; set `PYTHON` to it once.

## The standard

Every film is held to these rules and numbers; the gates in brackets measure them.

1. **Words in the middle.** A statement is centred and sits in the middle band of the frame (its centre at 35-65 % of
   the height): centred for 80 % of the statement time or more, in the middle band for 85 % or more. Centred top or
   bottom only over a full-bleed picture. Never flush left at the top or the bottom. "Text on top, big picture below"
   at most once a film; a line beside, above or below a picture at most once per 30 s. (`layout-audit.sh` placement.)
2. **One element carried, the text mixed in.** Every scene change hands one element on (it grows, swells, flies,
   converges): never a cut from a line to a card, never the line-card-line-card loop, never an empty frame between
   scenes. Lines alone only for the promise and the claim (read in 1.2 s); between them inside the product's own words or
   around the element; first line by 1 s. (`grid-check.ts --part spine`, `forensics.py --spine`, empty-frame.)
3. **The picture tells what the product does.** Each picture proves its line without repeating its words (input ->
   output, a count rising; "every" drawn as many at once); a line its picture already says is cut (`copy-check`
   repeats, quantity). The first picture beat shows the core action literally, with a real person giving the input where the input is human (real footage or a photo),
   and the product's main act plays on screen (the input becoming the output in steps, never a cut from the request to
   the finished result); what it makes is rich and holds the brief's own subjects. With the words covered, every
   picture beat still reads. Data agrees when paused: newest first in a stack, counts and times that agree, a
   face with its own name (`precheck.mjs` cast).
4. **Less text, every word chosen.** 1-5 words a line typically, 2-7 at most, one claim, plain words a customer would
   use; 0.3-1.5 headline words a second; what the product is by 3 s. No text in 15 % of the frames or more; at most two
   text blocks at once outside a product beat; no floating chips, counters or captions beside a statement.
   (`copy-check.py`, `--ui src`.)
5. **Text with love: one face, voices that rotate, events.** Lines arrive in the film's one face, the voice turning
   line by line (build, blur-in, ink-in: never two lines in a row alike, [catalogue.md](references/catalogue.md) §1),
   big (a line alone at a 9.2 % cap, never under 6.5 %; the claim bigger), whole or in 2-3 chunks, never word by word.
   One type event a film (a giant word with the product rising behind it, a line an object pushes apart, a
   decode, a build that re-centres). Emphasis is quiet: the key word in the accent on at most two lines, not always the
   last word; a box, marker, pill, underline or knockout only as the one signature. Every line reads at 3:1 against
   what is behind it, never held up by a grey halo. (`lint-film.mjs` emphasis, `forensics.py` legibility.)
6. **Scene changes that flow.** Every hard cut hides itself: inside a blur making both sides unreadable, an anchor
   held within 10 px, or a whip carrying the picture a fifth of the frame in its last 0.2 s, smeared; the kept
   ground alone hides nothing; never a cross-fade of two scenes or a cut torn across two frames; at most 10 % of hard
   cuts bare (`forensics.py` carried-cut, ghost-cut). One ground a film, changed once on purpose at most (a colour flood; grid-check `grounds`). Two or three seam kinds a film, none
   over 40 % of the scene changes, and one exit-then-enter, text-swap or match-cut in a film of four lines or more.
   Build them with `fx/Seam` ([transitions.md §2](references/transitions.md#2-recipes-at-60-fps)). (`forensics.py --seams`.)
7. **Clean UI.** The product's real screens built in code at film size, every string the product's own: no bracket
   slot, no stand-in number, no kit sample, no title cut with "...". Left edges of stacked rows within 4 px, inner
   padding about 2.4 cap heights and even (never under 0.8), no text touching an asset, no accent bar beside a card;
   widths measured, never guessed from a letter count (`lint-film.mjs`, `layout-audit.sh`).
8. **Logos current, presented well.** Other products' marks come from `scripts/logos.mjs` in their newest official
   form, verified on the brand's own page within 12 months, in one presentation a film (a chip in the line, pills round
   a centred line, or a wall), never a pill on every line or a drawn stand-in for a real mark (`logos.mjs check`). The end card is built from the
   film's last element (the last picture's element becomes the mark, the last word the wordmark, the badge spins in),
   lands centred and keeps creeping in about its centre (never a slide off it) while the music rings out and the frame
   settles out with it, the name once and the one fact under it. The logo is the brand's own, never a sparkle, a star or a
   generic glyph (`forensics.py` end-drift, end-centre, audio-end).
9. **Its own film, never a template.** One world for the whole film, one face and its voices, two
   or three moves, two or three seam kinds, one signature and one end-card design, picked from
   [catalogue.md](references/catalogue.md) and declared in `film.json`. The world (kind and hue), the voice, the signature
   and the end card differ from each of the last three films, and the move set shares at most 25 % with each of them; a film
   made from a template plays another device than its floor in half its slots or more. (`film-diff.mjs`; the deals
   leave the last films' choices out.)
10. **Premium, not just clean: every shot keeps the habits.** One sharp plane and a graded blur ladder behind it; one
    camera move with a job, front-loaded, landing (else still: no float, drift, bob or panning back); a world in one
    colour family with its key light, the product's own place, living (light or sky moving, changing between acts),
    never one still stock plate or murk; glass as a lens on it; light sized to its source and timed (a band as the pane
    lands, a glow the size of the button); a hero object in a real material; the product's real content in quantity; a
    scale jump (macro to wide, a giant word); smear only on fast moves; transitions made of focus and light. Cards face
    the camera (a 3D turn is a designed move). A flat field with small type and a still card fails.
11. **Simple and finished.** The path below, one review round, on the time plan; a gate costing over 5 minutes
    on a 30 s film is advisory. A film is delivered whole, never cut.

## Hard bans

In a look you invent, none of these appear (`lint-film.mjs` checks the code, the director pass the frames).
- **Words:** grey bars or "Placeholder" where words belong; vague, fancy or metaphor copy (unleash, reimagine,
  seamless, elevate, unlock, the future of, magic) and slogan shapes ("X, reimagined", "Less X. More Y."); keyword
  piles; two lines readable at once (a declared swap excepted); eyebrow labels, stacked taglines, "Introducing…";
  filler text, fake metrics.
- **Type:** serif faces, italic or oblique (or a skew faking one); a payoff word may take an italic accent face
  (`// cinetic:accent-face <family>`). One clean sans, plus a mono for code.
- **Colour:** orange, amber, beige, cream, tan or sand as an accent, a paper or a glow; neon; purple, violet or
  indigo; green in a brand you invent; a monochrome accent wash; glassmorphism as a UI style.
- **Decoration:** emoji and stock icons; an accent bar down a card's side; sparkles for "AI", confetti, lens flares,
  code rain; bounce on anything not landing; a springy overshoot on copy.
- **Pictures:** a person, place or product drawn in SVG where a photo belongs; grey cards standing in for pictures;
  stock gestures (handshakes, pointing at screens); low-resolution or mixed-grade pictures.
- **Sound:** generated music; a film with no music; ducking the music under effects; copyrighted audio in any repository.
- **Credits:** none in the picture; licence records stay private with the project.

Light from a source, spectral accents, dithered gradients and glass are allowed where they do a job, with one dominant
accent over the film's world ([lighting.md](references/lighting.md)).

## The time plan

A run has a budget (1-2 h; 90 min if none is given). Renders are slow: the whole film exists early, every later
look cut from it:
- **15 %:** brief, scaffold (seconds), direction, a script passing `copy-check`, the track picked and fitted: the
  picture is cut to it, never watched without its sound (a silent film fails `forensics.py` audio).
- **25 %:** the ending as stills: `node scripts/frames.mjs end` (the lockup, the name and the mark read).
- **45 %:** a complete draft with its ending: `render.sh Film out/draft.mp4 --draft --max-min 9` (the whole film at half size, fast encode, the current sound) and its sheet `out/qa/draft-sheet.png`.
- **45-70 %:** the soundtrack, the review round on the draft, fixes, the draft again.
- **Long mode.** Given hours (an ultra run), polish each dealt scene in its own pass against its recipe numbers, its
  stills beside the recipe's, before the next, instead of one pass over the film.
- **70 %:** the final starts: `bash scripts/render.sh Film out/film.mp4 --max-min 9` (parts resume: rerun until exit 0). If it cannot finish in time, deliver the draft scaled up (`--from-draft out/draft.mp4`).

## The simple path

Read a reference only when its step needs it.

**1. Brief and scaffold.** Write `BRIEF.md`: the spec line (`1920x1080@30, 25s, format: launch, audio:
licensed track + launch kit`), what is supplied (a brand kit, a clip to feel like, footage, the products it works
with), the hard bans. Ask at most 3 questions, only if the product, format or length is missing.
Then scaffold:
```
bash scripts/new-film.sh films/<name> --name "<Product>" [--brand <kit>] [--like <clip>] [--music <file> + licence flags] [--link-modules <node_modules>]
```
A launch gets `launch-simple`, `--format update` the update film, other shapes [templates.md](references/templates.md);
it writes `film.json` and deals the type pairing (`type-deal.ts`).

**2. Direction, then the spine, first.** `python3 scripts/deck.py --brief "<one line>" --format launch [--have ui,photos]
[--brand brand/brand.json]` deals three directions into `out/OPTIONS.md`; pick one with
`--direction <id> --why "<one line>"`. Then the spine, before any picture ([spine.md](references/spine.md)): one
sentence as 3-5 acts, one case (the brief's request, names and numbers in every act), one element changing form act to
act, said as a chain ("the word becomes the pill becomes the page becomes the count becomes the mark"); lines alone
only for the promise and the claim. In launch-simple it is `src/spine.ts`: print its plan, pass `grid-check.ts --part
spine`. Its lines go in [TREATMENT.md](assets/TREATMENT.md) (the idea sentence fails with a competitor's name in it);
`copy-check.py TREATMENT.md` passes before any picture work ([copy-and-type.md](references/copy-and-type.md)).

**3. World and scenes.** The deal (`src/dealt.ts`) holds the **world** where a template lights one: a designed place in
the brand's hue; a photograph only of the brief's own subject (`node scripts/assets.mjs plate <kind>`, then `--pick <n>
--to public/plates --accent '<accent>'`). **Scenes are dealt, not chosen:** launch-simple casts 8-12 **house scenes**
(`src/scenes`, 1.5-3 s, the lockup 2.5 s; two big at least) at random from the bank (`src/bank.ts`; update `src/deal.ts`),
seeded by the name and the last films, toward the act's verb and big scenes, none twice, two of the last film's at most;
you fill them with the product's content. 75 % or more from the bank, **one own scene at most** (`own`, 1.5-3 s); a dealt
slot is redrawn only with its reason (`why`; grid-check `deal-*`). One ground (`src/palette.ts`), one subject 4.5 s at
most, each point a big line, then its scene. Parts: `fx/world`, `fx/light`
([lighting.md](references/lighting.md) §8), `fx/depth` ([camera.md](references/camera.md) §13), `fx/three`
([three.md](references/three.md)), `kit/screens` ([product-ui.md](references/product-ui.md) §15). Content: `node
scripts/content.mjs --brief BRIEF.md --fetch --force`; keep what is true, look at every picture. Other templates pick
from the catalogue into `film.json` `devices`, then `node scripts/film-diff.mjs`.

**4. Music.** The track is chosen before the timeline and the picture is cut to it
([music.md](references/music.md)): `node scripts/music.mjs pick --mood "<words>" --length <s>` (the curated library;
`music.mjs search` without one), `get '#n' --to audio/music` (never the last film's track), then `python3
scripts/audio/track.py analyze` and, once the script is written, `fit` (the timeline's bars, the entry on the lockup,
the track's own ending: never a cut), `check`. The track plays only through `score.py` (`--bed-only` before the kit
exists); never cut it by hand.

**5. The product's scenes.** In launch-simple each scene's content is its `props` in `src/spine.ts` (the case's own
words; the rest from `src/content.ts`); your one own scene goes in `src/product.tsx` `OWN` from the kit. Something purposeful moves in every frame (a hold is a move's landing
tail, never still over 0.8 s, the lockup too); cards are lit or glass, never plain slabs. The kit shows only the film's own content (a part given nothing draws a dashed box and fails precheck;
[product-ui.md](references/product-ui.md)). Real people, places and objects are real photos or clips with a studio
finish, never drawn (`node scripts/assets.mjs recipe "<product>"`; [imagery.md](references/imagery.md)). Other products' marks: `node scripts/logos.mjs get <name> --film .`. Before a look:
`node scripts/precheck.mjs` (seconds). Look
with `node scripts/frames.mjs end` (the ending, first) and `still <frames>` (several in one call); then the draft.

**6. Draft, sound and check.** `npm run check` (tsc, `lint-film.mjs`, `grid-check.ts`) clean, then the whole draft:
`bash scripts/render.sh Film out/draft.mp4 --draft --max-min 9` (rerun until exit 0; the picked track under it until
the mix exists). `npm run sound` (cues, kit and mix in one command; it ends PASS, FAIL or PARTIAL), the draft again.
The fast gates: `npm run gates` (`forensics.py out/draft.mp4 --grammar-only`, `copy-check.py --ui src`, `logos.mjs
check`), `look-audit.py
out/draft.mp4 --look` (no flat void or slab cards) and `bash scripts/layout-audit.sh Film --cues --scale 0.5` (text cut by the frame) ([checks.md](references/checks.md) §1).

**7. One review round.** `node scripts/frames.mjs sheet --from out/draft.mp4` (16 tiles; `--frames A-B --every N` for
an act, `grab --from` for full frames), then the director pass
([director.md](assets/critics/director.md)): read the picture beats with the words ignored first (what
does the product do in each?), then the standard above, item by item, with frames. Fix every P0 and the P1s time allows, then the draft again. A second round only when a gate fails ([review-loop.md](references/review-loop.md) §1).

**8. Master and delivery.** By 70 % of the budget: `bash scripts/render.sh Film out/film.mp4 --max-min 9` (PNG frames;
`--blur` when the blur policy asks). Full `forensics.py` on the master, then `bash scripts/deliver.sh out/film.mp4`
with the format's variants (it runs `credits.py`: credits go into `CREDITS.md`, never the picture), a short
`README.md`, and `node scripts/film-diff.mjs --record` (the film joins the history; the run's minutes print).

## Formats

| Format | Length | Template | Script | Deliverables |
|---|---|---|---|---|
| Launch film | 15-30 s (to 45) | `launch-simple` | what it is, 2-5 things it does, the close | 16:9 master, 9:16 and 1:1 variants, poster |
| Update film ("vX is out") | 8-20 s | `update` | a line and a house scene per change; the mark pulls back | master, poster, 9:16 |
| Product or feature video | 8-30 s | `launch-simple` or `ui-walkthrough` | 3-6 lines | master, poster |
| UI walkthrough | 20-90 s | `ui-walkthrough` | what it is, one line per step | master, SRT captions |
| Feature loop | 4-15 s, whole bars | `--template none` | 1-2 lines, reads muted | MP4, WebM, GIF, seamless seam |
| Logo sting | 3-8 s | `--template none` | the name and at most one line | MP4, ProRes 4444 alphas, poster |

An update film: its lone line big, read whole in 1.2 s; no scene
over 3 s (a typed change 3 s); the lockup snaps once and keeps moving to the last frame; a plan outside `src/deal.ts` LIMITS fails: shorten the content, never raise a limit.
Films render at 30 fps (a move over 25 px a frame is smeared; `--fps 60` for fast camera travel);
a loop's last frame flows into frame 0 (`forensics.py --loop`, `render.sh --loop`).

## Craft essentials

**Timing.** `src/timeline.ts` is the only source of timing; picture, cues and checks import it. Acts, the reveal and
the ending land on the track's events within 1 frame (`b(bar, beat, sub)`); graphic cuts on its accents,
the picture leading by up to 3 f; a 0.2-0.5 s stop or dip before the biggest reveal
([timing-grid.md](references/timing-grid.md)).

**Motion. Never linear:** every move eases, by role from `lib/anim.ts` (`E.glideOut` to arrive, `stdInOut` to
reposition, `buildIn` to leave); zooms run in log space, pans and travels on exponential curves (fast out, long
landing); `lint-film.mjs` fails linear motion. One spring class a film, never an overshoot on type; never scale from zero; speed carried through cuts; nothing
changes state in one frame (`glideValue`), every move lands before its cut, no resting tilt; the signature moves are `fx/Moves`
([motion-tokens.md](references/motion-tokens.md), [camera.md](references/camera.md)).

**Engine.** Everything is a pure function of the frame: no CSS transitions or keyframes, no `Math.random`, `Date.now`
or `performance.now` (seeded `rand(seed)`); all translation in one `transform`; clamp every value feeding geometry;
no `will-change` where a blur animates, defocus at fixed levels, large soft shapes baked into dithered plates; fonts
loaded before any measurement. Never loop `npx remotion still`: a cut from the draft costs
seconds (`frames.mjs` and `render.sh` share one bundle)
([remotion-engine.md](references/remotion-engine.md), [chromium-rendering.md](references/chromium-rendering.md)).

**Sound.** A licensed, human-made instrumental track cut to the picture carries the film; each visible action gets a
real licensed recording (a line landing, a click, a result, a moving seam, one hit on the lockup) from the skill's
catalogue, a new set each film, fetched at film time with its licence (`node scripts/audio/sfx.mjs`, never committed);
earshot judges the takes, sync and mix. Placed by `plan.py` from the cues the picture exports, at -14 LUFS (-16 for a sting) and -1.5 dBTP, no ducking, a stop-down
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
| other templates, and how a film differs from one | [templates.md](references/templates.md) |
| colour, ground families, marks and lockups | [brand-and-color.md](references/brand-and-color.md) |
| a supplied brand kit; a clip to feel like | [brand-kits.md](references/brand-kits.md), [clip-match.md](references/clip-match.md) |
| the track: licences, analysis, the edit, cutting to music | [music.md](references/music.md) |
| real photos and footage, the core action, the studio finish | [imagery.md](references/imagery.md) |
| the product's UI, the kit, the macro screens, data | [product-ui.md](references/product-ui.md) |
| the timeline, declarations, density, holds | [timing-grid.md](references/timing-grid.md) |
| curves, springs, carry, creep; the camera; the seams | [motion-tokens.md](references/motion-tokens.md), [camera.md](references/camera.md), [transitions.md](references/transitions.md) |
| the world, the key light, glass, glow and plates; 3D hero objects | [lighting.md](references/lighting.md), [three.md](references/three.md) |
| moves, effects, seams, worlds with their numbers; every device (search it) | [motion-library/](references/motion-library/README.md), [devices/INDEX.md](references/devices/INDEX.md) |
| the effects kit, cues, placement, levels, mastering | [sound.md](references/sound.md) |
| render paths, blur, banding, encoding, deliverables | [finishing.md](references/finishing.md) |
| every gate script and its rules | [checks.md](references/checks.md) |
| the review round, and the long review when asked | [review-loop.md](references/review-loop.md), [assets/critics/](assets/critics/) |
| cheap-looking tells, mistakes of code films | [taste-and-slop.md](references/taste-and-slop.md), [craft-rules.md](references/craft-rules.md) |
| a whole film from idea to master, with its mistakes | [worked-example.md](references/worked-example.md) |
| update films | [update-films.md](references/update-films.md) |

## Other tools

| Need | Tool |
|---|---|
| spec, A/V lag, frame sync and true-peak gates | `scripts/probe.py`, `scripts/check-sync.py` |
| the recorded effects, their plan, the mix, the listening pass, credits | `scripts/audio/sfx.mjs`, `kit.py`, `plan.py`, `score.py`, `listen.py`, `credits.py` |
| a supplied kit; a palette or a ground family's tokens; a font | `scripts/brand.py`; `scripts/palette.py` (`--family`, `--recipe`); `scripts/add-font.mjs`, `scripts/font-match.mjs` |
| advisory reads: flat-film floors, grammar, speed, data | `scripts/look-audit.py`, `scripts/grammar-score.mjs`, `scripts/measure-speed.py`, `scripts/data-check.mjs` |
| a clip's grammar and the guard against copying it; the detail pass; device draws | `scripts/like.py`; `scripts/detail-pair.py`; `scripts/pick.py` |
