---
name: cinetic
description: Direct, build and render premium motion films from code - product launch films, feature and update videos, teasers, social clips, UI walkthroughs, kinetic type, logo reveals. Use this whenever the user wants any video, animation, motion graphic or animated demo made with Remotion or React, or asks to storyboard, animate, score, render, polish or critique one - even if they only say "make a video about X", "animate this feature" or "we need a launch clip". It brings a director's method (beats, one world, carried transitions, type as an event), a Remotion kit that looks premium by default (kinetic type, 3D camera, product UI, real logos and icons, transitions, sound locked to picture), real licensed sound effects and music, and a fast storyboard-render-review loop.
license: MIT
compatibility: Node 22+, ffmpeg 6+, Chromium (Remotion downloads its own headless shell). Remotion 4. Works offline after install except for fetching sounds, music and logos.
---

# cinetic

You are the director of a short film, not a web developer animating a page. The bar is a launch film by a frontier
lab or a top design studio: every second has an idea, every frame is composed and calm, every move has weight, and the
whole thing feels like one continuous world. What separates a film from a slideshow is motion and carried transitions,
not how much is on screen.

The kit in `kit/` gives you premium pieces (type, camera, UI, transitions, sound). Your job is the film: what it says,
what the viewer sees each second, how one moment turns into the next.

## What great looks like

These eight qualities separate great launch films from template videos. Hold every film to all of them.

1. **Pace: a new beat every 0.8-1.6 s, a visible change every half second.** A 30 s film has 20-35 beats; each feature
   is one action and one visible result. A reading hold (a statement resting with a slow creep) may fill up to a
   quarter of a film's half-seconds; a hold that waits for nothing is the flaw ([rhythm](references/film-grammar.md#4-rhythm)).
2. **One world.** One palette with 2-3 grounds (base, accent, inverse), one type voice, one material, one signature
   device it repeats ([worlds.md](references/worlds.md)). A supplied brand wins.
3. **Continuity: nothing is ever just cut away.** One element becomes the next beat (the full stop grows into the next
   world, the button becomes the progress bar, the card rewrites itself, the camera dives into a tile and its inside is
   the next scene). Every scene change is carried by speed,
   shape, an object or light; never a cross-fade, never an empty frame between scenes ([turns.md](references/motion/turns.md)).
4. **Motion with weight.** Arrivals are front-loaded (`ease.out`, springs set by duration and bounce, bounce 0 by
   default, never above 0.4). Exits accelerate and end at full speed (`accel`). Zooms are exponential (`logScale`).
   Nothing that moves is linear, nothing that carries data (a value, a price, a progress bar, the pointer) overshoots,
   and a held shot creeps (`creep`, `drift`) ([entrances.md](references/motion/entrances.md#house-rules)).
5. **Type is an event, set clean.** One sans voice (`fonts.inter` unless the brand has its own), sentence case, weight
   430-550, sized by word count (84-100 px for 5-6 words, 110-150 px for 3-4, 160-240 px for 1-2, one spectacle size of
   280-700 px a film). 2-6 words at once, centred alone on clean ground, built 1-3 at a time, never faded in, one type
   treatment repeated. At most one emphasised word or phrase a statement, in the accent, in at most two statements a film. One line
   on screen at a time. Everything else: [type.md](references/type.md).
6. **The real product, shown the way the concept shows it:** its UI really used, its output or object, or its words
   ([concepts](references/film-grammar.md#concepts)). Whatever appears is real: UI in code with real strings and
   plausible named data, other companies as their current logos (`<Brand>`), glyphs as real icons (`<Icon>`). Never a
   drawn look-alike, never an emoji for a logo, never lorem ipsum.
7. **One subject and air.** One thing to look at, at most one supporting element. Type, UI and hard edges take about an
   eighth of the frame in most beats, never more than a third outside the spectacle; a resting statement and the focal
   component keep 8 % or more from every edge. Depth comes from light and focus, not stuff; glow and glass at most once
   a shot, only on the accent ([compositions](references/film-grammar.md#compositions), [light and material](references/worlds.md#palette-rules-all-worlds)).
8. **Sound designed with the picture.** A licensed music bed that enters with the first idea; real recorded effects
   whose transient lands on the visual event; a short breath of silence before the big hit; the music rings out under
   the end card ([sound-design.md](references/sound-design.md)).

Read [taste.md](references/taste.md) once in a film: the tells that make a video look AI-made, and the review rubric.

## The default path

A film in one session (most launch films run 15-25 s, a type or number film 10-15 s; other formats in
[formats.md](references/formats.md)). Do the steps in order; do not skip the storyboard.

**1. Project.** `node <skill>/kit/scripts/new-film.mjs <folder> --name "<Product>"` creates a Remotion project with the
kit, a blank film in `src/films/main/Film.tsx`, and the scripts. Work inside that folder from then on.

**2. Brief (write `BRIEF.md`, 10 lines).** The product in one sentence; who it is for; the one promise the film makes;
what the product *does* as input -> output (one candidate picture; the concept in step 3 decides whether the film shows
it); 3-5 features worth a beat; the format (launch, feature, update, loop, sting, teaser, explainer, brand film); the
brand (logo, colours, fonts, screenshots, URL) or, if none is given, the brand you invent (name its colours, its face and
where the accent's hue comes from; [palette rules](references/worlds.md#palette-rules-all-worlds)). Pull real names,
numbers and integrations from what the user gave you.

**3. Concept (the first line of `BEATS.md`).** A film is carried by one concept from the
[menu](references/film-grammar.md#concepts) (sixteen: one task start to finish, the shape that becomes everything, built
from a point, one object through many worlds, one unbroken camera, one sentence, the number, before and after, ...).
- Format first: the format allows only some concepts ([formats.md](references/formats.md)).
- Claim second: name what the product claims in one word and take the concepts it points to (the menu's claim list).
- Three candidates: for each, one sentence for its opening frame, its middle and its last frame. Strike any that needs
  what the brief does not have (UI screens, real numbers, photographs, a voice).
- Not the default: "one task, start to finish" only when the brief is literally one flow and no other candidate
  survives; never the concept of a worked example you just read. Keep the one whose first frame could belong to no other
  product, and write `Concept: <name>, because <brief fact>; rejected: <a>, <b>`.

**4. Devices, then beats (the rest of `BEATS.md`).** Find the film's signature: one visual device taken from the concept
and the product's name, object or brand (a mosaic tool's tile, a writing app's ink, a model's light, a planner's page).
It opens the film, carries turns between beats, and closes it. Then write a **Devices** block with the slots your
concept has, each picked from its menu in [film-grammar.md](references/film-grammar.md#devices) by what the product
claims (the opening, the type treatment, each seam's device, the spectacle, the integration form, the ending). No
device is used twice except the signature, and the block never copies an example's sequence. Then write one row per
beat in the concept's section order ([structures](references/film-grammar.md#structures)): frames, its
composition tag, what the viewer sees, what moves and how, how it leaves into the next beat, the sound. Check the rows
against qualities 1, 3 and 7, the Devices block and the hard rules before writing code. Budget the length: each feature
beyond the core at most 1.2 s, and a row over 1.6 s names its second and third event. A 20 s film that could be 15
should be 15.

**5. World.** Choose one world from [worlds.md](references/worlds.md) (or derive it from the brand). Write its tokens at the
top of the film: ground, ink, accent, the statement face and its sizes ([type.md](references/type.md)), UI theme
(`lightUI` / `darkUI` spread with the brand), radius, the light's direction.

**6. Build.** Write the film as one timeline object `T` (every scene and sound cue reads its frames from it) plus one
component per section; see [kit.md](references/kit.md) for the API, [type.md](references/type.md) for every word on
screen and the motion references for recipes:
[text](references/motion/text.md), [entrances](references/motion/entrances.md), [exits](references/motion/exits.md),
[turns](references/motion/turns.md), [camera](references/motion/camera.md), [cards and UI](references/motion/cards-ui.md),
[imagery](references/motion/imagery.md), [effects](references/motion/effects.md). Build one section, render its sheet, look,
then the next. Overlap sections: the next one starts while the last one is still leaving. To find a move by what it
does, search [INDEX.md](references/INDEX.md) (every recipe and section, one line each).

**7. Look at it (after every section, and before you claim anything works).** Type-check first (`npx tsc --noEmit`; in
a project that shares another folder's `node_modules`, `node <that folder>/node_modules/typescript/bin/tsc --noEmit -p .`).
What each command shows and how to read it: [rendering.md](references/rendering.md#the-loop).
- `node scripts/frames.mjs sheet` (36 frames in one still; `--safe` outlines the 8 % margin), and
  `node scripts/frames.mjs sheet --frames 120,126,132,...` for one moment.
- `node scripts/frames.mjs still --frame N` at full size for any beat with UI text or a label: read the words.
- `node scripts/frames.mjs render` (half-size preview), then `node scripts/frames.mjs strip out/main-preview.mp4 --at 4.2`
  to judge motion.
- `node scripts/frames.mjs check out/main-preview.mp4` measures crowding (`air`), pace, empty frames and the ending and
  prints what to fix; a crowded film fails. Add `--format loop` or `--format sting` for those formats.
Score the sheet with the rubric in [taste.md](references/taste.md) (20 points, look first; render at 17+). Fix the three
worst things, render again.

**8. Sound.** `node scripts/sfx.mjs roles`, `node scripts/sfx.mjs list <role>`, `node scripts/sfx.mjs get <id> ...` fetches
judged, licensed recordings into `public/sfx` and writes `src/sfx.ts`; place them with `<Cues>` on the same `T` frames as
the picture. Music: pick a licensed track whose character is this film's world, not the default
([assets.md](references/assets.md#6-music); `sfx.mjs shortlist`), fetch it with `sfx.mjs music`, then
`sfx.mjs fit <track> --hit <frame> --len <frames>` gives the start that lands the film's main hit on a beat where the music
lifts (for a bed that enters late, `--enter <frame>` with the `<Music enterAt>` frame). Duck it under the big hits, let
it ring out under the end card.

**9. Final.** `node scripts/frames.mjs final` renders picture and sound and sets the loudness. For long films (or a
time limit on each job) render silent parts and mux them ([rendering.md](references/rendering.md)). Write `CREDITS.md` with
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
| type | `<Words text arrive="rise\|blur\|scale\|drop\|slide\|flip\|cut" by="word\|char\|line" born accent leaveAt times>`, `<Build words times>` (append with a re-centre jump), `<Swap items>`, `<SlotLine>` (a sentence whose slot swaps marks), `useGlyphBox()` (where a letter sits), `<Typing>`, `<Scramble>`, `<Odometer>`, `<Marker>`, `<Output>` (the result giant, then into the UI) |
| camera | `<Camera keys={[{f, x, y, zoom, rx, ry, rz}]}>` (a 3D stage), `<At x y z rx ry>` places things in it, `fillZoom()`, `drift()`, `shake()` |
| world | `<Ground>`, `<Field>` (a soft ground of 2-3 neighbouring hues), `<Aura>`, `<GridLines>`, `<CornerMarks>` (four marks framing a line or component), `<Box bevel material>` (a CSS 3D block), `<DepthStack>`, `<Defocus>` (depth of field for shapes), `softShadow()` (layered shadows from one light), `<Beam>` / `<Pool>`, `<GlassPanel>`, `<Glow>`, `<Sheen>`, `<Grain>` (photographs only) |
| product UI | `<Card>`, `<Window>`, `<InputBar>` (typing + send), `<Bubble>`, `<ChatStack>`, `<Thinking>`, `<Row>`, `<Chip>`, `<Toast>`, `<Terminal>`, `<Relay>` + `<PartnerSurface>` (the artefact carried through other products), `<Progress>`, `<Spinner>` (working -> check), `<StatePill>`, `<Wall>` (many of a thing), `<Button pressAt>`, `<Avatar>`, `<Cursor keys clicks exitAt>` (a real arrow pointer, arcing paths, presses), `focusStyles()`, `useArrive()` |
| 3D object | `<GLView build draw state>` (three.js on one shared renderer: a ring, a device, a glass solid), `softStudio()` (soft studio light, the default), `studioEnvironment()` |
| imagery | `<Photo grade develop>` (one look for every picture, duotone develop), `<TextWindow>` (letters as windows onto a picture), `<Compare>` (before/after), `<Selection>` (a box with handles marking what was found) |
| turns | `<Iris>`, `<Push>`, `<Pixelate>`, `<Tiles>`, `<ZoomThrough>`, `<Flash>`, `<Flood>` (a ground cut grown from an object, once a film at most); the best turns are hand-built from the scene's own objects |
| marks | `<Brand name="github">` (official mark, its own colour), `<BrandTile>`, `<AppIcon>` (an icon tile with depth), `<Icon name="Calendar">` (Lucide) |
| sound | `<Cues cues={[{ at, ...sfx['mixkit-2568'], volume }]}>`, `<Music src startFrom enterAt duck breaths>`, `db()`, `beats(bpm)` |

**Worked examples** (read one before your first film; they show the kit used idiomatically, one timeline `T` per film).
Every example shows one concept, and all five show the same one (one task, start to finish): read them for moves, never
for the concept or the look.
`kit/src/films/brief` (light product UI: typing, thinking dots that become the answer card, a pointer that opens a row),
`forge` (isometric blocks: floor type, a dive into a block's face that is a terminal; read its `BEATS.md`), `fieldnote`
(paper and photographs: letters as windows, a dive into a letter stroke, a before/after), `lumen` (a dark stage and a 3D
glass prism: the typed question becomes a beam), `inkwell` (a serif voice: the weak sentence struck out and falling, a
rewrite lifting off as a plate). Never copy their content or their order; take single moves. Their palettes, marks and
lockups are taken: yours differ from all five.

## Hard rules

Each rule's detail and numbers live in the linked section; read it when the rule applies.

- **Never linear motion** (a loop's constant cycle aside), never a cross-fade or an empty frame between scenes, never
  dead still for more than ~0.6 s; a reading hold creeps ([turns.md](references/motion/turns.md#0-the-rule-for-choosing)).
- **Frame 0 is never empty and already moving**; never a static title card ([openings](references/film-grammar.md#openings)).
- **Vary the frame.** Tag every `BEATS.md` row with a composition; no two rows in a row share one. One scale jump a
  film, and a macro moment in every film that shows UI ([compositions](references/film-grammar.md#compositions)).
- **Change the ground.** A film over 12 s changes ground at least twice, on downbeats, each by a different device; a
  continuous concept or a loop may change the light instead ([seams](references/film-grammar.md#seams-and-ground-cuts)).
- **Endings follow the format** ([formats.md](references/formats.md), [lockups](references/film-grammar.md#lockups)). In
  launch and feature films the lockup lasts at most 2.5 s and grows out of an object on screen; claim and lockup take
  at most a fifth of the film (3.5 s under 18 s); the claim gets its reading time (words / 3 + 0.5 s). Explainers,
  brand films and event promos: an end card of up to 4 s. Never a static logo card, never a fade to blank.
- **Integrations are not a row.** One form or none; one tour of other products a film, at most 15 % of its length; the
  artefact is the largest text in each host (60 px or more) ([integrations](references/film-grammar.md#integrations)).
- **One image worth keeping.** Name the poster frame in `BEATS.md`, build it first and judge it alone; a crafted image,
  never a centred line on a ground, held 1.5 s or more ([planning](references/film-grammar.md#7-planning-discipline)).
- **One spectacle beat** in films of 15 s or more, 1.5-2.5 s, readable: no label under 28 px, at most about 16
  endpoints. One spectacle, not two ([spectacle](references/film-grammar.md#spectacle)).
- **At most one demo.** A second input is a 1-2 s variation of the same shot ([compositions](references/film-grammar.md#compositions)).
- **A finished state does not hold:** cut within half a second or keep it changing ([nothing holds](references/film-grammar.md#46-nothing-holds)).
- **The camera goes to the event.** A framing holds only while something large changes in it about every 0.7 s
  ([camera.md](references/motion/camera.md#house-rules)).
- **The product's result is seen big once** (key words 120 px or more), tagged `output-big` where the concept requires
  it; a series of features rotates its compositions ([compositions](references/film-grammar.md#compositions)).
- **The biggest word names the benefit or the product**, never the problem or the input ([type.md](references/type.md#3-one-spectacle-size-in-a-film)).
- **Text is readable or absent;** code or a dense UI is one real, whole panel for at most 2 s ([type.md](references/type.md#7-centred-alone),
  [cards-ui.md](references/motion/cards-ui.md#house-rules)).
- **The frame cuts only on purpose:** a lone giant word (280 px or more) or one component in close-up; never a resting
  line, never two sides, never the key figure ([type.md](references/type.md#7-centred-alone)).
- **UI as one calm component,** flat or tilted 12° or less, the region that matters pixel-real ([cards-ui.md](references/motion/cards-ui.md#house-rules)).
- **Light and material:** two planes moving at different rates in every beat, one light direction, soft rounded 3D
  ([light and material](references/worlds.md#palette-rules-all-worlds)).
- **Clean grounds:** no vignette, no dark corners, no visible grain on a flat ground, never dimmed UI as a ground
  ([palette rules](references/worlds.md#palette-rules-all-worlds) 8).
- **Clean type:** no eyebrows or kickers, no uppercase mono labels, no ALL CAPS or Title Case, no 800-900 weights, no
  serif by habit; in product UI type two or three words and land the rest (`burst`) ([type.md](references/type.md#11-no-eyebrows-no-kickers)).
- **Real marks only;** the product's own mark has an idea, never two or three primitive rectangles
  ([lockups](references/film-grammar.md#lockups), [logos](references/motion/entrances.md#57-real-third-party-logos)).
- **No generated images, licensed sound only;** every external file is listed in `CREDITS.md` ([assets.md](references/assets.md)).
- **Invented palettes:** no purple, no green, no purple-to-blue gradient; the accent's hue from the product's own object
  (three candidates in `BRIEF.md`) on a tenth of the frame or less; light ground #FFFFFF to #F4F5F7, dark ground a deep
  tone of the accent's hue ([palette rules](references/worlds.md#palette-rules-all-worlds)).
- **Legibility:** statements at 7:1 or more, no word under 64 px, no line over 1500 px; UI text 30-44 px at 4.5:1; a
  needed label a third of its line and 40 px or more; text never crops in its own box ([type.md](references/type.md#2-size-by-word-count)).
- **Respect the brief's facts.** Never invent customer logos, testimonials or numbers presented as real; use the user's
  data or clearly fictional demo data.

## When the request is different

- **Another format** (a loop, a logo sting, an explainer, a vertical teaser, a feature update, a brand film, a series
  opener): read [formats.md](references/formats.md) first. It gives the length, the sections, the concepts that suit
  and what differs from a launch film; the format decides the ending.
- **Vertical (9:16) or square:** re-lay out, never crop: compositions stack vertically, type wraps to 2-3 words a line,
  the camera moves vertically. Keep type and the subject out of the top 12 % and the bottom 20 % (the platform's own UI
  sits there), and fit giant type to the width: a key word is never cut off by the frame edge. Give the film its size in `src/films.ts` (`width: 1080, height: 1920`); the sheet and
  `check` follow it. `fillZoom`, `diveZoom` and `toScreen` take the frame size as their last arguments.
- **Critique of an existing video:** `frames.mjs check <video>` for the measures, `frames.mjs strip <video> --at ...` for
  moments, then score with [taste.md](references/taste.md).
