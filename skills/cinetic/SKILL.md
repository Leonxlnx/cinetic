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

1. **Pace: a new beat every 0.8-1.6 s, a visible change every half second.** A 30 s film has 20-35 beats. Inside a beat,
   something larger than a caret changes at least every 0.5 s (a word joins, a block lands, the crop changes, a value
   steps). Each feature is one action and one visible result. A statement may rest for its reading time with
   only a slow creep (a reading hold); up to a quarter of a film's half-seconds may rest like that, and nothing else
   moves while a line is read. The flaw is a hold that waits for nothing.
2. **One world.** The film lives in one graphic language from first to last frame: one palette with 2-3 grounds (base,
   accent, inverse), one type voice, one material, one signature device it repeats (see [worlds.md](references/worlds.md)). A supplied brand wins.
3. **Continuity: nothing is ever just cut away.** One element becomes the next beat: the full stop grows into the next
   world, the button becomes the progress bar, the card rewrites itself, the camera dives into a tile and its inside is
   the next scene. Every scene change is carried by speed, shape, an object or light. Never a cross-fade, never an empty
   frame between scenes ([turns.md](references/motion/turns.md)).
4. **Motion with weight.** Arrivals are front-loaded (most of the travel in the first frames, a long settle: `ease.out`,
   springs set by duration and bounce, bounce 0 by default, never above 0.4). Exits accelerate and end at full speed, cut
   or carried on their last frame (`accel`). Zooms are exponential (`logScale`). Nothing that moves is linear, nothing
   that carries data (a value, a price, a progress bar, the pointer) overshoots. Nothing is ever dead still: a held shot
   creeps (`creep`, `drift`).
5. **Type is an event, set clean.** One sans voice (`fonts.inter` unless the brand has its own), sentence case, weight
   430-550, sized by word count: 84-100 px for 5-6 words, 110-150 px for 3-4, 160-240 px for 1-2, and one spectacle size
   a film (280-700 px, may crop at the frame edge). 2-6 words at once, centred alone on clean ground, built 1-3 at a time,
   never faded in: cut-on words, a last-word swap, a decode, an append that re-centres, a colour wake, type set on a
   surface, a masked rise (two per film), and one type treatment repeated through it. At most one emphasised word or
   phrase a statement, in the accent. One line on screen at a time. Sizes, weights, tracking, serif and labels: [type.md](references/type.md).
6. **The real product, shown the way the concept shows it:** its UI really used (task, artefact, update and explainer
   films), its output or its object (shape, point, object and number films), or its words (sentence, case and manifesto
   films). Whatever appears is real: UI built in code with real strings and plausible named data, used by a real pointer
   or by visible state changes; other companies as their current logos (`<Brand>`, `scripts/logos.mjs`), glyphs as real
   icons (`<Icon>`). Never a drawn look-alike, never an emoji for a logo, never lorem ipsum.
7. **One subject and air.** One thing is clearly what the viewer looks at; at most one supporting element shares the
   frame. Type, UI and hard edges together take about an eighth of the frame in most beats and never more than a third
   outside the spectacle; the rest is calm ground. A resting statement and the focal component keep 8 % or more from
   every edge. A short line or one component alone on a clean, lit ground is a calm frame, not an empty one. Density
   belongs to one spectacle beat, not to every beat. Depth comes from light and focus, not from stuff: one light
   direction, soft layered shadows (`softShadow`), depth of field on shapes (`Defocus`), scale jumps (a giant word cut to
   a small one, a dive). Restraint in effects: glow and glass at most once a shot, only on the accent, light that is timed.
8. **Sound designed with the picture.** A licensed music bed that enters with the first idea; real recorded effects
   whose transient lands on the visual event (a press, a landing, a cut); a short breath of silence before the big hit;
   the music rings out under the end card ([sound-design.md](references/sound-design.md)).

Read [taste.md](references/taste.md) once in a film: the tells that make a video look AI-made, and the review rubric.

## The default path

A film in one session (most launch films run 15-25 s, a type or number film 10-15 s; other formats in
[formats.md](references/formats.md)). Do the steps
in order; do not skip the storyboard.

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
against quality 1 (a beat every 0.8-1.6 s), quality 3 (every row says how it hands off), quality 7 (one subject a
row), the Devices block and the hard rules before writing code. Budget the length: each feature beyond the core at most
1.2 s, and a row over 1.6 s names its second and third event. A 20 s film that could be 15 should be 15.

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

**7. Look at it (after every section, and before you claim anything works).** Type-check first (`npx tsc --noEmit`; in a project that shares another folder's
`node_modules`, `node <that folder>/node_modules/typescript/bin/tsc --noEmit -p .`).
- `node scripts/frames.mjs sheet` renders the whole film as 36 frozen frames in one still: read the image (`--safe`
  outlines the 8 % margin in every cell).
- `node scripts/frames.mjs sheet --frames 120,126,132,...` zooms in on one moment (a turn, a morph).
  The sheet shows composition and rhythm, not small type: for any beat with UI text or a label, also render
  `node scripts/frames.mjs still --frame N` at full size and read the words.
- `node scripts/frames.mjs render` makes a half-size preview video; `node scripts/frames.mjs strip out/main-preview.mp4 --at 4.2`
  shows a moment at 15 frames a second, so you can judge motion, not just layout.
- `node scripts/frames.mjs check out/main-preview.mp4` measures the preview (how crowded the frames are, change every
  half second, empty frames, ending length) and prints what to fix. Its `air` line says how much of the frame is sharp
  detail, how often three or more things share a frame and how often the frame cuts on two sides; a crowded film fails.
  The coverage figure is information, never a target: do not add things to raise it. For a loop or a sting add
  `--format loop` (no sound, ending or music lines; it fails when the last frame does not match the first) or
  `--format sting` (no pace gate under 8 s; the ending may hold).
Score the sheet with the rubric in [taste.md](references/taste.md) (20 points, look first; render at 17+). Fix the three
worst things, render again.
Typical misses: a crowded frame, text used as texture, a line cut by the frame edge, dead frames, UI text under 30 px,
the same layout beat after beat, a cut with nothing carried, a warm ground with a hot accent by habit.

**8. Sound.** `node scripts/sfx.mjs roles`, `node scripts/sfx.mjs list <role>`, `node scripts/sfx.mjs get <id> ...` fetches
judged, licensed recordings into `public/sfx` and writes `src/sfx.ts`; place them with `<Cues>` on the same `T` frames as
the picture. Music: pick a licensed track whose character is this film's world, not the default
([assets.md](references/assets.md#music); `sfx.mjs shortlist`), fetch it with `sfx.mjs music`, then
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
rewrite lifting off as a plate). Never copy their content or their order; take single moves.

## Hard rules

- **Never linear motion** (a loop's constant cycle aside), never a cross-fade between scenes, never an empty frame
  between scenes (at a seam the next ground already holds its subject at full size while the old one shrinks away),
  never a frame that holds dead still for more than ~0.6 s (a reading hold creeps). **Frame 0 is never empty and already moving:** the product, the story's
  object, the concept's primitive (a point, a shape), the first words of the film's sentence on a lit ground, or the
  mark in a sting. Never a static title card.
- **Vary the frame.** Tag every row of `BEATS.md` with its composition from the table in
  [film-grammar.md](references/film-grammar.md#compositions); no two rows in a row share one (never "caption + centred card"
  for every feature). Every film has one scale jump (a giant word cut small, a dive, a pull-back), and every film that
  shows UI has a macro moment; neither has to open the film.
- **Change the ground.** The world has 2-3 grounds (base, accent, inverse); a film over 12 s changes between them at
  least twice, on downbeats, each time by a different device: an iris from one of the film's shapes, a ground swap under
  a layer that stays, a colour-flip cut with a size step, a flash-hidden swap, a dive whose inside is the new ground, or a
  flood from an object (one flood a film at most) ([menu](references/film-grammar.md#seams-and-ground-cuts)). A
  film whose concept is continuous (one camera, one object, a shape chain, built from a point) or a loop may change
  the light on one ground instead.
- **Endings follow the format** ([formats.md](references/formats.md)). Launch and feature films: the lockup lasts at most
  2.5 s and grows out of an object already on screen; the claim and the lockup together take at most a fifth of the
  film (3.5 s in a film under 18 s). The claim always gets its reading time (words / 3 + 0.5 s): shorten the middle,
  never the claim, and never pad the middle to earn a longer ending.
  Explainers, brand films and event promos: an end card of up to 4 s, still creeping. A loop has no lockup; in a sting the
  mark is the film; a teaser or an update may end on the product or a date. The claim sits on clean ground and is fully
  readable for its reading time (when it needs longer, it stays on as the lockup's line); a line of the claim is said
  once. A name revealed mid-film is fine when it is the film's turn; then the end is the mark small with the CTA, not a
  second reveal. Never a static logo card, never a fade to blank: the mark is born from what is on screen, in a way
  picked from the [lockup menu](references/film-grammar.md#lockups) to suit the signature, and lockups vary.
- **Integrations are not a row.** Never a row of logo tiles, and never two or three same-layout cards in a row. Pick one
  form ([cards-ui.md](references/motion/cards-ui.md#integrations)): a relay (the artefact pinned, two hosts cut round it on
  the beat, each in a different composition), an object-lock swap (the artefact fixed while 5-7 hosts swap behind it at
  4-6 f each), a sentence whose slot swaps partner marks, or one host used for real in macro; skip the beat when the
  brief does not hinge on it. One tour of other products a film (relay, swap, morph chain), at most 15 % of its length;
  the artefact is the largest text in each host (60 px or more).
- **One spectacle beat** in films of 15 s or more: one shot that could never be a slide, picked by what the product
  claims ([menu](references/film-grammar.md#spectacle)). When the concept is itself continuous (one unbroken camera, the
  shape that becomes everything, built from a point), the concept is the spectacle. Give it 1.5-2.5 s (count its frames
  in `T`), keep it readable (it starts on the artefact the film has carried, large): no label under 28 px, at most about
  16 endpoints, each a filled object, never hundreds of tiny pale cells. A wall only when the claim is literally a
  quantity. Name it in `BEATS.md` (a row tagged `spectacle`). One spectacle, not two.
- **At most one demo.** When the concept shows the product's core action, show it once, completely; a second input or
  use case is a 1-2 s variation of the same shot, never a second full demo: that is how a 20 s film becomes 30.
- **A finished state does not hold.** When a list is full, a number has landed or a card is complete, cut within half a
  second or keep it changing (the camera pushes, the next thing arrives on it). Never 1 s of a finished thing.
- **The camera goes to the event.** A framing may hold while something large changes in it about every 0.7 s (a line
  lands, a panel turns, the UI acts); when only a label or a detail changes, move on: a push, a ride along the object, a
  cut to macro. When the next thing happens somewhere else, the camera is already travelling to it.
- **When the film shows the product's result, it is seen big once:** in macro or as giant type (its key words 120 px or
  more on screen) before or instead of at UI size (`<Output>` lands the words giant, then carries them into the UI); a
  number is one option, not the default. Explaining is one claim a shot, set on or along the object, never a column of
  text beside it. Required (a row tagged `output-big`) in the one-task, number and one-artefact concepts and in updates.
- **A series rotates its compositions.** Three features, three metrics, two hosts: each in a different composition
  (macro, giant type, split, surface), never the same layout three times with the label swapped.
- **The biggest word names the right thing.** The largest type in a film names the benefit or the product, never the
  problem, the input or a noun from the story (a viewer reads it as the brand): the hours saved, not the pile; the amount
  that arrives, not the amount sent.
- **Text is readable or absent.** Never blurred, ghosted or faded copies of words, rows or code behind or around a
  statement; depth of field blurs shapes (cards, icons, photographs, objects), never a block of text. Code or a dense UI
  appears as one real, whole panel for at most 2 s.
- **The frame cuts only on purpose.** The frame edge may cut a single giant word (280 px or more) alone in the frame, or
  one component in close-up that leaves on one side while the camera follows it. Never a resting line of normal size,
  never two or more sides at once, never the words the beat is about. The film's key figure or claim is never cut by
  the frame, also while it counts or scales: size a rolling number so its widest state fits.
- **UI as one calm component.** Show product UI one component at a time, flat or at one gentle tilt (12° or less): the
  region that matters pixel-real, the rest reduced to quiet shapes, plausible named data, its context shown before a
  zoom. The camera moves on the machine's turn and holds still while the person acts. Never two windows overlapping at
  an angle, never a chip pasted on a mock at another scale or light.
- **Light and material.** Every beat has two planes moving at different rates; the second may be a soft light or a
  drifting ground. One light direction for the whole film: shadows are soft and layered (`softShadow`) and fall the same
  way. 3D is soft-lit, rounded and matte or frosted (`softStudio`, `<Box bevel material>`), never flat boxes or
  hard-strip chrome. Glow and glass at most once a shot, and only on the accent.
- **Clean grounds.** A ground is clean white, a soft field of two or three neighbouring hues drifting slowly (`Field`),
  a photograph, or a deep tone with one broad bloom of its own hue. A light ground may be flat; a ground light lifts the
  centre in the ground's own hue and never darkens the edges below the ground's colour. No vignette, no dark corners, no
  visible grain on a flat ground, never dimmed or blurred UI used as a ground. White or frosted cards on a coloured
  ground are fine. A line may be a hairline when it is structure (construction lines, circles, a curve to a label); a
  line that is the subject carries a filled object riding it, not a glow.
- **Clean type, no template tells.** No eyebrows or kickers (a small line above a heading, or a label above a figure:
  its unit or name follows it or sits under it), no uppercase mono labels, no letter-spaced small caps, no ALL CAPS or
  Title Case statements, no weights of 800-900. No serif by habit: only as the brand's voice (a writing, publishing or
  editorial brand may take one; then every statement) or its wordmark. Mono is for code and data only, as written
  ([type.md](references/type.md)). In product UI, type the first two or three words and land the rest at once (`burst`).
- **Real marks only.** A company or product logo is its official mark (`<Brand>` or `logos.mjs get`), never redrawn, never a
  generic glyph. The product's own logo: the user's file, or for an invented product a mark with an idea: a glyph drawn
  from the product's object (built once in the film), an app-icon tile with depth (`<AppIcon>`), or a custom wordmark.
  Two or three primitive rectangles are a placeholder, not a mark.
- **No generated images.** Pictures are code, the product's real screens, or licensed photos/footage
  ([assets.md](references/assets.md)). Every external file keeps its licence and is listed in `CREDITS.md`.
- **Licensed sound only**, from the catalogue or a source whose licence you read; never synthesized music.
- **Invented palettes:** no purple, no green, no purple-to-blue "AI" gradient. The accent's hue comes from the product's
  own object and is never a default: name three candidate objects and their hues in `BRIEF.md` and pick the one this
  product alone could own. Orange on cream, cobalt on cool white and wine red on white are the three commonest looks
  and need the strongest reason; a film may also carry no accent at all (ink, white and one grey).
  The light ground is neutral or cool white (#FFFFFF to #F4F5F7), cream only for paper and print products; the dark
  ground is a deep tone of the accent's own hue, not warm black or brown. The accent covers at most about a tenth of the
  frame, except on one ground cut; punctuation is never coloured. A supplied brand's own colours always win.
- **Legibility:** every word on screen is readable when paused. Statements sit on clean ground or a plate at 7:1 contrast
  or more, sized by word count ([type.md](references/type.md#2-size-by-word-count)): no statement word under 64 px, no
  line wider than 1500 px at 1080p. UI text is 30-44 px on screen after the camera's zoom, at 4.5:1 or more. A word needed
  to understand the beat (a figure's unit, the CTA) is 34 px or more; only texture labels inside a UI component may sit
  at 20-28 px. Text never crops inside its own box: fit it (`useTextWidth`) or shorten it.
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
