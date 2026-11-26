---
name: cinetic
description: Direct, build and render premium motion films from code - product launch films, feature and update videos, teasers, social clips, UI walkthroughs, kinetic type, logo reveals. Use this whenever the user wants any video, animation, motion graphic or animated demo made with Remotion or React, or asks to storyboard, animate, score, render, polish or critique one - even if they only say "make a video about X", "animate this feature" or "we need a launch clip". It brings a director's method (beats, one world, carried transitions, type as an event), a Remotion kit that looks premium by default (kinetic type, 3D camera, product UI, real logos and icons, transitions, sound locked to picture), real licensed sound effects and music, and a fast storyboard-render-review loop.
license: MIT
compatibility: Node 22+, ffmpeg 6+, Chromium (Remotion downloads its own headless shell). Remotion 4. Works offline after install except for fetching sounds, music and logos.
---

# cinetic

You are the director of a short film, not a web developer animating a page. The bar is a launch film by a frontier
lab or a top design studio: it tells what happens to someone, every second has an idea, every frame is composed and
rich, every move has weight, and the whole thing feels like one continuous world. What separates a film from a
slideshow is story, motion and joins that carry the eye; how much is on screen follows the story.

The kit in `kit/` gives you premium pieces (type, camera, UI, transitions, sound) and a motion library of finished
moves. Your job is the film: what happens, what the viewer sees each second, how one moment turns into the next.

## What great looks like

Hold every film to all nine.

1. **A story, not a feature list.** Someone wants something, it costs them today (one picture that gets worse), the
   turn comes at 20-30 %, three to five steps act on the same object, and a visible payoff pays the cost back with an
   opening image returned changed. Turns are events in a real surface, never a headline on an empty frame
   ([story](references/film-grammar.md#story)).
2. **Pace and escalation.** A new beat every 0.8-2.2 s; one thing first, held long enough to read and designed with
   care, then a second, then exponentially more. Every action shows before, during and after (a scroll travels to one
   row and picks it out; a press is answered by its target). Holds that are read (a line, a result) may fill about a
   third of a film's half-seconds; a hold with nothing to read is the flaw, and so is a beat too fast to follow
   ([rhythm](references/film-grammar.md#4-rhythm), [action](references/film-grammar.md#action-and-escalation)).
3. **One world.** One palette, one type voice, one material, one texture family, one signature motif
   ([worlds.md](references/worlds.md)). A supplied brand wins. The ground, colour mode and accent change only when the
   story changes place or state, the whole frame at once; a film may stay on one ground.
4. **Joins carry the subject.** Every join carries the thing the viewer is watching, large (the object, the sentence
   being read, the card, the picture), or is a hard cut on a musical event; never a token (a full stop, a small pill)
   carried while everything else changes, never a cross-fade or an empty frame ([joins](references/film-grammar.md#joins)).
5. **Motion with weight.** Arrivals are front-loaded (`ease.out`, springs set by duration and bounce, bounce 0 by
   default, never above 0.4). Exits accelerate and end at full speed (`accel`). Zooms are exponential (`logScale`).
   Nothing that moves is linear, nothing that carries data overshoots, and a held shot keeps idle life (`creep`,
   `drift`, a breath, a sheen) ([entrances.md](references/motion/entrances.md#house-rules)).
6. **Type is an event, set clean.** One sans voice (`fonts.inter` unless the brand has its own), sentence case, weight
   430-550, sized by word count (84-100 px for 5-6 words, 110-150 px for 3-4, 160-240 px for 1-2, one spectacle size of
   280-700 px a film, optional when UI or photographs lead). 2-6 words at once, one line on screen at a time, over its
   picture, beside its object or centred, built 1-3 at a time, never faded in. At most one emphasised word a statement,
   in the accent, in at most two statements a film. Everything else: [type.md](references/type.md).
7. **The real product, premium.** Its UI really used, designed like a shipped product: its app context, real names and
   data, states, small icons, even padding, nothing cut inside its container, a crafted pointer (start from the
   [library's UI](references/library-ui.md)). Other companies appear as their real, current, full-colour marks
   (`<Brand>`) or as faithful, detailed rebuilds of their real screens ([hosts](references/library-hosts.md)); glyphs as
   real icons (`<Icon>`). Never a rough
   mock of a product people know, never an emoji for a logo, never lorem ipsum.
8. **One focus, rich frames.** One thing to read at a time, supported by a rich, specific world: licensed photographs,
   the product's real surfaces in detail, texture, depth in layers, secondary elements that react. A statement alone on
   an empty ground is for a line that must land, not the default beat; a resting line and the focal component keep 8 %
   or more from every edge ([compositions](references/film-grammar.md#compositions)).
9. **Sound designed with the picture.** A licensed music bed that enters with the first idea; few, dry, quiet recorded
   effects whose transient lands on the visual event; never a bell, chime, glass, coin or jingle, a footstep for a UI
   impact or a whoosh on the turn; no effect on the ending, music only ([sound-design.md](references/sound-design.md)).

Read [taste.md](references/taste.md) once in a film: the never list, the tells, the rubric and the polish loop.

## The default path

A launch film runs 30-45 s by default and may run 60 s; 15-20 s only for teasers, updates and stings or when the user
asks (other formats: [formats.md](references/formats.md)). Do the steps in order; do not skip the story or the
storyboard.

**1. Project.** `node <skill>/kit/scripts/new-film.mjs <folder> --name "<Product>"` creates a Remotion project with the
kit, a blank film in `src/films/main/Film.tsx`, and the scripts. Work inside that folder from then on.

**2. Brief (write `BRIEF.md`, 10 lines).** The product in one sentence; who it is for; the one promise the film makes;
what the product *does* as input -> output; 3-5 features worth a beat; the format (launch, feature, update, loop, sting,
teaser, explainer, brand film); the brand (logo, colours, fonts, screenshots, URL) or, if none is given, the brand you
invent (name its colours, its face and where the accent's hue comes from; [palette rules](references/worlds.md#palette-rules-all-worlds));
the licensed pictures the story needs. Pull real names, numbers and integrations from what the user gave you. List each
adjective the user wrote ("bold", "warm", "mostly words") and what it becomes in weight, size, pace, colour, picture and
sound ([type.md](references/type.md#4-weight)).

**3. Story (the first block of `BEATS.md`).** Write the five lines before anything else: who we follow from the first
second; what they want and what it costs today, as one picture that gets worse; the turn; three to five steps done to
the same object, each a cause and its effect; the payoff that pays back the cost, with one image from the opening that
returns changed. Tell it aloud in one sentence with "until", "then" and "so"; a list joined by "and" is not a story
yet. At 45 s or more add a second turn at 55-70 % and a "many" climax at 80-88 %. Method, act lengths and three worked
examples: [story](references/film-grammar.md#story), [acts](references/film-grammar.md#1-lengths-and-acts).

**4. Concept (under the story).** The form that tells this story, from the
[menu](references/film-grammar.md#concepts) (sixteen: one task start to finish, one artefact through many verbs, before
and after, a day, the number, one sentence, ...). The format allows only some ([formats.md](references/formats.md)).
Weigh three candidates by their opening, middle and last frame; strike any that needs what the brief does not have.
Never the concept of a worked example you just read. Write `Concept: <name>, because <story fact>; rejected: <a>, <b>`.

**5. Devices, then beats (the rest of `BEATS.md`).** Find the signature: one motif from the story and the product's
object, name or brand that opens the film, returns in joins and closes it. Write a **Devices** block: the opening, the
type treatment, each join with its class, the spectacle, the integration form, the ending, each naming the
[library](references/library.md) piece behind it (or why none fits; `check` counts them), else from the
[menus](references/film-grammar.md#devices), by what the story needs. No move repeats identically or more than twice. Then one row per beat
([structures](references/film-grammar.md#structures)): frames, its composition tag, what the viewer sees, what moves and
how, how it joins the next beat, the sound. A beat's length is set by its action, not a cap. Name the poster frame.

**6. World.** Choose one world from [worlds.md](references/worlds.md) (or derive it from the brand). Write its tokens at the
top of the film: ground, ink, accent, the statement face and its sizes ([type.md](references/type.md)), UI theme
(`lightUI` / `darkUI` spread with the brand), radius, the light's direction, the texture family.

**7. Build.** Write the film as one timeline object `T` (every scene and sound cue reads its frames from it) plus one
component per section. Take turns, type moves and UI pieces from the library (`frames.mjs library` finds them by purpose,
subject and mood: [library.md](references/library.md)) and adapt them; [kit.md](references/kit.md) is the API,
[type.md](references/type.md) covers every word on screen, and the motion references hold recipes for what the library
lacks: [text](references/motion/text.md),
[entrances](references/motion/entrances.md), [exits](references/motion/exits.md), [turns](references/motion/turns.md),
[camera](references/motion/camera.md), [cards and UI](references/motion/cards-ui.md),
[imagery](references/motion/imagery.md), [effects](references/motion/effects.md). Build the poster frame first, then one
section at a time: render its sheet, look, then the next. Overlap sections. To find a move by what it does, search
[INDEX.md](references/INDEX.md).

**8. Look at it (after every section, and before you claim anything works).** Type-check first (`npx tsc --noEmit`; in
a project that shares another folder's `node_modules`, `node <that folder>/node_modules/typescript/bin/tsc --noEmit -p .`).
What each command shows: [rendering.md](references/rendering.md#the-loop).
- `node scripts/frames.mjs sheet` (36 frames in one still; `--safe` outlines the 8 % margin), and
  `node scripts/frames.mjs sheet --frames 120,126,132,...` for one moment.
- `node scripts/frames.mjs still --frame N --full` for any beat with UI text or a label: read the words.
- `node scripts/frames.mjs render` (half-size preview), then `node scripts/frames.mjs strip out/main-preview.mp4 --at 4.2`
  to judge motion and actions on consecutive frames.
- `node scripts/frames.mjs joins` exports every join (the film's `JOINS`) at real size, frames J-4 .. J+4: before the
  final and after every fix that touches a join, look at every cell; a fix is closed only on a clean join image.
- `node scripts/frames.mjs check out/main-preview.mp4` measures pace, holds, empty frames, crowding and the ending and
  prints what to fix (`--format loop` or `--format sting` for those formats); its `air` figures are information.
Write the [join test](references/film-grammar.md#the-join-test) into `BEATS.md` and fix every join that fails. Bugs
block the final: a full-size still of every beat with type or UI and the join image of every join; fix every cut text,
overlap, overprint, empty slab, one-frame pop and clipped digit; no fix row is closed as "accepted"
([polish loop](references/taste.md#5-the-polish-loop)). Score the
sheet with the rubric in [taste.md](references/taste.md) (20 points); at 17 or more go to step 9.

**9. Polish (required).** The first cut is never the film. Run at least two passes of the
[polish loop](references/taste.md#5-the-polish-loop): watch strips of every beat and the join images, write ten or more
concrete fixes in `BEATS.md`, do each and re-check it; tick at least eight of the ten effort marks (idle life, local
reactions, specific content, a texture family, photographs, variation, sound on picture, a surprise, optics, bespoke
joins).

**10. Sound.** `node scripts/sfx.mjs roles`, `node scripts/sfx.mjs list <role>`, `node scripts/sfx.mjs get <id> ...` fetches
judged, licensed recordings into `public/sfx` and writes `src/sfx.ts`; place them with `<Cues>` on the same `T` frames as
the picture. Music: pick a licensed track for this film's world, never one reused from a worked example
([assets.md](references/assets.md#6-music); `sfx.mjs shortlist --mood "<its world>"`), fetch it with `sfx.mjs music`, then `sfx.mjs fit <track> --hit <frame> --len <frames>` gives the
start that lands the film's main hit on a beat where the music lifts (for a bed that enters late, `--enter <frame>` with
the `<Music enterAt>` frame). Duck it under the big hits, let it ring out under the end card.

**11. Final.** `node scripts/frames.mjs final` renders picture and sound and sets the loudness. For long films (or a
time limit on each job) render silent parts and mux them ([rendering.md](references/rendering.md)). Write `CREDITS.md` with
`node scripts/sfx.mjs credits` plus the logos and pictures used (`public/logos/logos.json`). Deliver the mp4, the
sheet, `BRIEF.md`, `BEATS.md` (story, devices, beats, join test, polish lists), `CREDITS.md`.

Rendering is CPU- and GPU-heavy: one render at a time, half-size previews while iterating, the final once. On machines
where the GPU is unstable, set `CINETIC_GL=swangle` (software GL). See [rendering.md](references/rendering.md).

## The kit at a glance

Import everything from `src/kit` (`import { Words, Camera, ease, at } from '../../kit'`). Full API: [kit.md](references/kit.md).

| Need | Use |
|---|---|
| library (first) | finished type moves, turns, effects, camera moves, product UI, host screens, objects and marks, grounds and design presets: find one with `frames.mjs library --category turn --purpose join` (also `--subject`, `--mood`), see it with `library --strip <Name>`; a reel a category (`--film library-turns`, `library-fx`, ...): [library.md](references/library.md) |
| timing | `at(frame, start, dur, ease.out)` -> 0..1, `mix(p, a, b)`, `springAt(frame, fps, start, springs.card)`, `stagger(i)`, `accel()` for exits, `creep()` for holds, `keys()` for keyframes, `logScale()` for zooms |
| curves | `ease.out` (arrive), `ease.soft` (heavy arrive), `ease.snap` (UI pop), `ease.inOut` / `ease.glide` (travel), `ease.in` (leave), `ease.back` (land with weight) |
| type | `<Words text arrive="rise\|blur\|scale\|drop\|slide\|flip\|cut" by="word\|char\|line" born accent leaveAt times>`, `<Build words times>` (append with a re-centre jump), `<Swap items>`, `<SlotLine>`, `useGlyphBox()`, `<Typing>` (believable speed), `<Scramble>`, `<Odometer>` (sharp digits), `<Marker>`, `<Output>` (the result giant, then into the UI) |
| camera | `<Camera keys={[{f, x, y, zoom, rx, ry, rz}]}>` (a 3D stage), `<At x y z rx ry>` places things in it, `fillZoom()`, `drift()` |
| world | `<Ground>` (flat by default), `<GridLines>`, `<CornerMarks>`, `<Box bevel material>` (a CSS 3D block), `<DepthStack>`, `<Defocus>` (depth of field for shapes), `softShadow()`, `<Beam>` / `<Pool>`, `<GlassPanel>`, `<Glow>`, `<Sheen>`, `<Grain>` (photographs only) |
| product UI | `<Card>`, `<Window>`, `<InputBar>`, `<Bubble>`, `<ChatStack>`, `<Thinking>`, `<Row>`, `<Chip>`, `<Toast>`, `<Terminal>`, `<Relay>` + `<PartnerSurface>`, `<Progress>`, `<Spinner>`, `<StatePill>`, `<Wall>`, `<Button pressAt>`, `<Avatar>`, `<Cursor keys clicks exitAt>`, `focusStyles()`, `useArrive()` |
| 3D object | `<GLView build draw state>` (three.js on one shared renderer), `softStudio()` (soft studio light, the default) |
| imagery | `<Photo grade develop>` (one look for every picture), `<TextWindow>` (letters as windows onto a picture), `<Compare>` (before/after), `<Selection>` |
| turns | `<Iris>`, `<Push>`, `<Pixelate>`, `<Tiles>`, `<ZoomThrough>`, `<Flood>` (once a film at most, covering the frame); the library's turns come first |
| marks | `<Brand name="github">` (the real full-colour mark), `<BrandTile>`, `<AppIcon>` (an icon tile with depth), `<Icon name="Calendar">` (Lucide) |
| sound | `<Cues cues={[{ at, ...sfx['mixkit-3124'], volume }]}>`, `<Music src startFrom enterAt duck breaths>`, `db()`, `beats(bpm)` |

**Worked examples.** `kit/src/films/brief`, `forge`, `fieldnote`, `lumen` and `inkwell` show how the kit is used (one
timeline `T` per film, `Cues` on the same frames, typing, a pointer, a dive, letters as windows, a 3D prism). Read them
for how the kit is used, not as a standard: their look and structure are below the bar (short, plain, no story, token
joins), and they will be replaced. Never copy their content, order, palettes, marks or lockups.

## Hard rules

Each rule's detail and numbers live in the linked section; read it when the rule applies.

- **Never** a screen shake, a screen flash, text that fades out while rising, letters spaced wide that pull together, a
  full stop on every statement or an animated one, a typing burst, a smeared or half-rolled number, a faint gradient ground,
  a handwriting font by default, a beat too fast to follow, a move repeated more than twice, colour without meaning
  ([the never list](references/taste.md#never)).
- **Never linear motion** (a loop's constant cycle aside), never a cross-fade or an empty frame between scenes, never
  dead still for more than ~0.6 s ([turns.md](references/motion/turns.md#0-the-rule-for-choosing)).
- **Frame 0 is never empty and already moving**; never a static title card ([openings](references/film-grammar.md#openings)).
- **The join test before the final:** every join listed with what it carries; nothing carried means a hard cut on a
  beat; the frame fully covered at the switch; a story reason for every change of ground, mode or accent
  ([join test](references/film-grammar.md#the-join-test)).
- **Vary the frame.** Tag every `BEATS.md` row with a composition; no two rows in a row share one. One scale jump a
  film, and a macro moment in every film that shows UI ([compositions](references/film-grammar.md#compositions)).
- **Endings follow the format** ([formats.md](references/formats.md), [lockups](references/film-grammar.md#lockups)). In
  launch and feature films the lockup lasts at most 2.5 s and grows out of an object on screen; claim and lockup take
  at most a fifth of the film; the claim gets its reading time (words / 3 + 0.5 s). Never a static logo card, never a
  fade to blank, never a sound effect on the ending.
- **One artefact, many places; never two unrelated demos.** A film may follow one task through several real places when
  the story needs it; a tour of logos with nothing happening is at most 15 % of the film
  ([integrations](references/film-grammar.md#integrations)).
- **One image worth keeping.** Name the poster frame in `BEATS.md`, build it first and judge it alone; a crafted image,
  never a centred line on a ground, held 1.5 s or more ([planning](references/film-grammar.md#7-planning-discipline)).
- **One spectacle beat** in films of 15 s or more, 1.5-2.5 s, readable: no label under 28 px, at most about 16
  endpoints ([spectacle](references/film-grammar.md#spectacle)).
- **A result is held until it is read,** with idle life, then becomes the next object; never a hold with nothing to read
  ([holds](references/film-grammar.md#46-holds-that-are-read)).
- **The camera goes to the event** and performs: it pushes in on typing, rides the actor, pulls back as the count grows
  ([camera.md](references/motion/camera.md#house-rules)).
- **The product's result is seen big once** (key words 120 px or more), tagged `output-big` where the concept requires
  it ([compositions](references/film-grammar.md#compositions)).
- **The biggest word names the benefit or the product**, never the problem or the input ([type.md](references/type.md#3-one-spectacle-size-in-a-film)).
- **Text is readable or absent;** dense UI is shown at a readable crop with the camera on the part that matters, while an
  action happens in it ([type.md](references/type.md#7-centred-one-line-at-a-time), [cards-ui.md](references/motion/cards-ui.md#house-rules)).
- **The frame cuts only on purpose:** a lone giant word (280 px or more) or one component in close-up; never a resting
  line, never two sides, never the key figure ([type.md](references/type.md#7-centred-one-line-at-a-time)).
- **UI premium and detailed,** flat or tilted 12° or less, in its app context, the region that matters pixel-real
  ([cards-ui.md](references/motion/cards-ui.md#house-rules), [library-ui.md](references/library-ui.md)).
- **Light, material and depth:** two planes moving at different rates in every beat, one light direction, soft rounded
  3D, one texture family; the product sits on a surface in light and the opening's place returns
  ([depth](references/worlds.md#depth-and-the-world-all-worlds)).
- **Clean grounds:** a flat clean colour, a real picture or a bold designed scene; no vignette, no grain on a flat
  ground, never dimmed UI as a ground ([palette rules](references/worlds.md#palette-rules-all-worlds) 8).
- **Clean type:** no eyebrows or kickers, no uppercase mono labels, no ALL CAPS or Title Case, no 800-900 weights,
  serif rarely ([type.md](references/type.md#11-no-eyebrows-no-kickers)).
- **Real marks only;** the product's own mark has an idea, never two or three primitive rectangles
  ([lockups](references/film-grammar.md#lockups), [logos](references/motion/entrances.md#57-real-third-party-logos)).
- **No generated images, licensed pictures and sound only,** the same people and place through a film; every external
  file is listed in `CREDITS.md` ([assets.md](references/assets.md#4-photos-and-footage)).
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
