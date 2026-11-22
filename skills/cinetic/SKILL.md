---
name: cinetic
description: Direct, build and render premium motion films from code - product launch films, feature and update videos, teasers, social clips, UI walkthroughs, kinetic type, logo reveals. Use this whenever the user wants any video, animation, motion graphic or animated demo made with Remotion or React, or asks to storyboard, animate, score, render, polish or critique one - even if they only say "make a video about X", "animate this feature" or "we need a launch clip". It brings a director's method (beats, one world, carried transitions, type as an event), a Remotion kit that looks premium by default (kinetic type, 3D camera, product UI, real logos and icons, transitions, sound locked to picture), real licensed sound effects and music, and a fast storyboard-render-review loop.
license: MIT
compatibility: Node 22+, ffmpeg 6+, Chromium (Remotion downloads its own headless shell). Remotion 4. Works offline after install except for fetching sounds, music and logos.
---

# cinetic

You are the director of a short film, not a web developer animating a page. The bar is a launch film by a frontier
lab or a top design studio: every second has an idea, every frame is composed, every move has weight, and the whole
thing feels like one continuous world. A clean slideshow of centred text and cards is a failure, however tidy.

The kit in `kit/` gives you premium pieces (type, camera, UI, transitions, sound). Your job is the film: what it says,
what the viewer sees each second, how one moment turns into the next.

## What great looks like

These eight qualities separate great launch films from template videos. Hold every film to all of them.

1. **Pace: a new beat every 0.8-1.6 s, a visible change every half second.** A 30 s film has 20-35 beats. Inside a beat,
   something larger than a caret changes at least every 0.5 s (a word joins, a block lands, the crop changes, a value
   steps). Each feature is one action and one visible result. The most common flaw is a hold that waits.
2. **One world.** The film lives in one graphic language from first to last frame: one ground, one palette, one display
   face, one material, two or three signature devices (see [worlds.md](references/worlds.md)). A supplied brand wins.
3. **Continuity: nothing is ever just cut away.** One element becomes the next beat: the full stop grows into the next
   world, the button becomes the progress bar, the card rewrites itself, the camera dives into a tile and its inside is
   the next scene. Every scene change is carried by speed, shape, an object or light. Never a cross-fade, never an empty
   frame between scenes ([turns.md](references/motion/turns.md)).
4. **Motion with weight.** Arrivals are front-loaded (most of the travel in the first frames, a long settle: `ease.out`,
   springs). Exits accelerate and end at full speed, cut or carried on their last frame (`accel`). Zooms are
   exponential (`logScale`). Nothing that moves is linear. Nothing is ever dead still: a held shot creeps (`creep`, `drift`).
5. **Type is an event.** Few words (1-6 a line), big, in the film's one display face, built rather than faded in: masked
   rise, cut-on words, born-tint, a swap, a decode, type set on a surface. Text sits on clean ground, never over busy
   imagery without a plate. One line on screen at a time.
6. **The real product, really used.** Its UI is built in code at film size with real strings and believable data, used by
   a real pointer or by visible state changes (typing, presses, a list filling, a toggle, a count). Other companies'
   products appear as their real, current logos (`<Brand>`, `scripts/logos.mjs`), interface glyphs as real icons
   (`<Icon>`, Lucide). Never a drawn look-alike, never an emoji standing in for a logo, never lorem ipsum.
7. **Fill the frame. Depth and density.** The subject spans 65 % of the width or more, or bleeds off an edge; UI is shown
   in close-up (its body text 30 px or more on screen), type is giant or cropped. A small card centred on an empty ground
   is the commonest tell. A frame has foreground, subject and background: blur by distance, depth ladders for stacks,
   a 3D camera that tilts and pushes, scale jumps (macro on a caret, then wide on the whole system). Real detail in
   quantity (twelve notifications, not three) makes a frame feel expensive. Restraint in effects: grain, one glow
   sized to its source, light that is timed.
8. **Sound designed with the picture.** A licensed music bed that enters with the first idea; real recorded effects
   whose transient lands on the visual event (a press, a landing, a cut); a short breath of silence before the big hit;
   the music rings out under the end card ([sound-design.md](references/sound-design.md)).

Read [taste.md](references/taste.md) once per film: the tells that make a video look AI-made, and the review rubric.

## The default path

A 20-40 s film in one session. Do the steps in order; do not skip the storyboard.

**1. Project.** `node <skill>/kit/scripts/new-film.mjs <folder> --name "<Product>"` creates a Remotion project with the
kit, a blank film in `src/films/main/Film.tsx`, and the scripts. Work inside that folder from then on.

**2. Brief (write `BRIEF.md`, 10 lines).** The product in one sentence; who it is for; the one promise the film makes;
what the product *does* as input -> output (this becomes the picture); 3-5 features worth a beat; the brand (logo,
colours, fonts, screenshots, URL) or, if none is given, the brand you invent (name its colours and face; no purple, no
green, no default AI gradient). Pull real names, numbers and integrations from what the user gave you.

**3. Idea, then beats (write `BEATS.md`).** First find the film's one visual idea: a device taken from the product's
name, its input -> output or its brand (a mosaic tool's tile, a writing app's ink, a model's light, a planner's page). It
opens the film, carries the turns between beats, and becomes the end card. Then pick a structure from
[film-grammar.md](references/film-grammar.md) and write one row per beat: frames, what the viewer sees, what moves and how, how it leaves into the next beat, the sound. Check the row list
against quality 1 (an idea every 1-2 s) and quality 3 (every row says how it hands off) before writing code.

**4. World.** Choose one world from [worlds.md](references/worlds.md) (or derive it from the brand). Write its tokens at the
top of the film: ground, ink, accent, display face, UI theme (`lightUI` / `darkUI` spread with the brand), radius.

**5. Build.** Write the film as one timeline object `T` (every scene and sound cue reads its frames from it) plus one
component per section; see [kit.md](references/kit.md) for the API and the motion references for recipes:
[text](references/motion/text.md), [entrances](references/motion/entrances.md), [exits](references/motion/exits.md),
[turns](references/motion/turns.md), [camera](references/motion/camera.md), [cards and UI](references/motion/cards-ui.md),
[imagery](references/motion/imagery.md), [effects](references/motion/effects.md). Build one section, render its sheet, look,
then the next. Overlap sections: the next one starts while the last one is still leaving. To find a move by what it
does, search [INDEX.md](references/INDEX.md) (every recipe and section, one line each).

**6. Look at it (after every section, and before you claim anything works).**
- `node scripts/frames.mjs sheet` renders the whole film as 36 frozen frames in one still: read the image.
- `node scripts/frames.mjs sheet --frames 120,126,132,...` zooms in on one moment (a turn, a morph).
- `node scripts/frames.mjs render` makes a half-size preview video; `node scripts/frames.mjs strip out/main-preview.mp4 --at 4.2`
  shows a moment at 15 frames a second, so you can judge motion, not just layout.
- `node scripts/frames.mjs check out/main-preview.mp4` measures the preview against the bar of top studios' films (subject
  coverage, change every half second, empty frames, ending length) and prints what to fix.
Score the sheet with the rubric in [taste.md](references/taste.md) (13 points, render at 11+). Fix the three worst
things, render again.
Typical misses: an empty first frame, dead frames, things too small (UI text under 26 px at 1080p), the same layout
beat after beat, a cut with nothing carried, a hold with no creep, text over a busy picture, everything the same size.

**7. Sound.** `node scripts/sfx.mjs roles`, `node scripts/sfx.mjs list <role>`, `node scripts/sfx.mjs get <id> ...` fetches
judged, licensed recordings into `public/sfx` and writes `src/sfx.ts`; place them with `<Cues>` on the same `T` frames as
the picture. Music: pick a licensed track ([assets.md](references/assets.md#music)), fetch it with `sfx.mjs music`, start
it at a bar where it is already moving (`sfx.mjs shortlist` gives each track's tempo and the second its beat is going),
duck it under the big hits, let it ring out under the end card.

**8. Final.** `node scripts/frames.mjs final` renders picture and sound and sets the loudness. For long films (or a
time limit per job) render silent parts and mux them ([rendering.md](references/rendering.md)). Write `CREDITS.md` with
`node scripts/sfx.mjs credits` plus the logos used (`public/logos/logos.json`). Deliver the mp4, the sheet, `BRIEF.md`,
`BEATS.md`, `CREDITS.md`.

Rendering is CPU- and GPU-heavy: one render at a time, half-size previews while iterating, the final once. On machines
where the GPU is unstable, set `CINETIC_GL=swangle` (software GL). See [rendering.md](references/rendering.md).

## The kit at a glance

Import everything from `src/kit` (`import { Words, Camera, ease, at } from '../../kit'`). Full API: [kit.md](references/kit.md).

| Need | Use |
|---|---|
| timing | `at(frame, start, dur, ease.out)` -> 0..1, `mix(p, a, b)`, `springAt(frame, fps, start, springs.card)`, `stagger(i)`, `accel()` for exits, `creep()` for holds, `keys()` for keyframes, `logScale()` for zooms |
| curves | `ease.out` (arrive), `ease.soft` (heavy arrive), `ease.snap` (UI pop), `ease.inOut` / `ease.glide` (travel), `ease.in` (leave), `ease.back` (land with weight) |
| type | `<Words text arrive="rise\|blur\|scale\|drop\|slide\|flip\|cut" by="word\|char\|line" born accent leaveAt times>`, `<Build words times>` (append with a re-centre jump), `<Swap items>`, `<Typing>`, `<Scramble>`, `<Odometer>`, `<Marker>` |
| camera | `<Camera keys={[{f, x, y, zoom, rx, ry, rz}]}>` (a 3D stage), `<At x y z rx ry>` places things in it, `fillZoom()`, `drift()`, `shake()` |
| world | `<Ground>`, `<Aura>` (soft living gradient), `<GridLines>`, `<Box>` (a solid CSS 3D block with content on its faces), `<DepthStack>` (a pile that pushes back), `<Beam>` / `<Pool>` (shaped light), `<GlassPanel>`, `<Glow>`, `<Sheen>`, `<Grain>`, `<Vignette>` |
| product UI | `<Card>`, `<Window>`, `<InputBar>` (typing + send), `<Bubble>`, `<ChatStack>`, `<Thinking>`, `<Row>`, `<Chip>`, `<Toast>`, `<Terminal>`, `<PartnerSurface>` (the artefact inside another product), `<Progress>`, `<Spinner>` (working -> check), `<StatePill>`, `<Wall>` (many of a thing), `<Button pressAt>`, `<Avatar>`, `<Cursor keys clicks exitAt>` (a real arrow pointer, arcing paths, presses), `focusStyles()`, `useArrive()` |
| imagery | `<Photo grade develop>` (one look for every picture, duotone develop), `<TextWindow>` (letters as windows onto a picture), `<Compare>` (before/after), `<Selection>` (a box with handles marking what was found) |
| turns | `<Flood>` (a ground cut grown from an object), `<Iris>`, `<Tiles>`, `<Pixelate>`, `<Push>`, `<ZoomThrough>`, `<Flash>`; the best turns are hand-built from the scene's own objects |
| marks | `<Brand name="github">` (official mark, its own colour), `<BrandTile>`, `<Icon name="Calendar">` (Lucide) |
| sound | `<Cues cues={[{ at, ...sfx['mixkit-2568'], volume }]}>`, `<Music src startFrom enterAt duck breaths>`, `db()`, `beats(bpm)` |

**Worked examples** (read one before your first film; they show the kit used idiomatically, one timeline `T` per film):
`kit/src/films/brief/Film.tsx` (light product UI: a depth-ladder pile, a full stop that grows into the reveal, typing,
thinking dots that become the answer card, a pointer that opens a row), `kit/src/films/forge/Film.tsx` (an isometric block
world with type on the floor, a dive into a block's face that is a terminal, a caret-following camera, real marks in a
ring), `kit/src/films/fieldnote/Film.tsx` (editorial paper and photographs: stepped photo cards, letters as windows, a
dive into a letter, selections, a before/after), `kit/src/films/lumen/Film.tsx` (a dark stage: a beam that
splits onto named benchmarks, the name on an amber flood, a real prompt answered under the light with punch-ins),
`kit/src/films/inkwell/Film.tsx` (soft air and a serif voice: a partner's real mark joining a line, a rewrite in macro,
the artefact landing inside three real surfaces on a coral flood, a pull-back into a wall that drains into the mark). Never copy their content; learn their moves.

## Hard rules

- **Never linear motion**, never a cross-fade between scenes, never an empty frame between scenes, never a frame that
  holds dead still for more than ~0.6 s. **Frame 0 is never empty**: the film opens on something already happening.
- **Vary the frame.** Tag every row of `BEATS.md` with its composition from the table in
  [film-grammar.md](references/film-grammar.md#compositions); no two rows in a row share one (never "caption + centred card"
  for every feature). Every film has at least one macro moment and one scale jump (a giant word, a pull-back to all of it).
- **Cut the ground.** The world has 2-3 grounds (base, accent flood, inverse); the film cuts between them at least twice,
  on downbeats, carried by an object (a flood from a button, a block that fills the frame).
- **Short endings.** The lockup lasts at most 2 s (60 f) and grows out of an object already on screen; all end type
  (claim + lockup) is at most 15 % of the film. No mid-film brand card in films under 30 s.
- **Integrations are surfaces, not logo rows.** Show the product's artefact landing inside the other product (a message in
  its chat, a row in its tracker, a doc in its editor: `<PartnerSurface>`), the mark in its header. A row of logo tiles at
  most once, as a quick stamp.
- **Real marks only.** A company or product logo is its official mark (`<Brand>` or `logos.mjs get`), never redrawn, never a
  generic glyph. The product's own logo: the user's file, or for an invented product a simple mark you design for it.
- **No generated images.** Pictures are code, the product's real screens, or licensed photos/footage
  ([assets.md](references/assets.md)). Every external file keeps its licence and is listed in `CREDITS.md`.
- **Licensed sound only**, from the catalogue or a source whose licence you read; never synthesized music.
- **Invented palettes:** no purple, no green, no purple-to-blue "AI" gradient. Derive from the product; one accent.
- **Legibility:** every word on screen is readable when paused: on clean ground or a plate, big enough (statements
  ~110-220 px cap at 1080p, UI text 26-40 px), contrast at least 4.5:1.
- **Respect the brief's facts.** Never invent customer logos, testimonials or numbers presented as real; use the user's
  data or clearly fictional demo data.

## When the request is different

- **An update / changelog film** ("v2.3 is out"): one beat per change, 8-20 s, the [film-grammar.md](references/film-grammar.md#update-film) structure.
- **A loop for a landing page:** 6-12 s, the last frame continues into the first, no music.
- **Vertical (9:16) or square:** re-lay out, never crop: compositions stack vertically, type wraps to 2-3 words a line,
  the camera moves vertically. Set the composition size in `src/films.ts` / `Root.tsx`.
- **Critique of an existing video:** sheet it (`frames.mjs strip <video> --at ...`), then score with [taste.md](references/taste.md).
