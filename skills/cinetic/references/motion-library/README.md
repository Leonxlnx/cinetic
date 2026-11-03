# Motion library

A library of 269 techniques for launch films, each written as a recipe you can build: what it is for, its numbers,
named presets, what makes it look expensive or cheap, and Remotion 4 code (TypeScript / TSX) that is a pure function of
the frame and renders on the CPU. Use it to give every film its own devices instead of the same moves every time: pick
from the lists, vary the pick from film to film, and let one action of the product decide what goes on screen.

## Files

| file | entries | what it covers |
|---|---|---|
| [effects.md](effects.md) | 36 | depth of field and blur ladders, defocus timing, motion blur, floor and stage light, glass, light sweeps, glows and bloom, irises, mesh gradients, develop and gradient maps, zoom blur, flash frames, light floods, soft masks, particles, light geometry and trails, 3D lighting, shadows, colour fronts, shimmer, mosaics, lens distortion, echoes, chromatic aberration, grain, halftone, knockouts, final soften, vignette, reflections, smears |
| [animations.md](animations.md) | 44 | snap-and-settle timing, word builds and rises, arrival tints, make-room inserts, accelerating exits, pops, decode, typing, spring landings, cascades, stroke draws, letter reveals, cursor presses, morphs, drums and swaps, mask reveals, counters, tracking, blur and smear arrivals, snap growth, punch-ins, list pushes, gravity, swings, arcs, fly-ins, 3D flips, growth from a dot, radial fields, shimmer, marquees, orbits, stepped time, font cycles, split and assemble, deals, collapses, drift tails, echo stamps |
| [items.md](items.md) | 41 | the things on screen: product windows, prompt boxes, cursors, glass panes, 3D hero objects, chats, inline pictures, logo lockups, toasts, cards, photos, card rings, pills, buttons, toggles, counters, charts, lists, checklists, avatars, treated portraits, video panels, app and line icons, node graphs, markers, guides, hand strokes, code panels, devices, tile grids, mosaics, dot grids, particle fields, discs, orbit rings, planets, giant type, skeletons, menus, light objects |
| [transitions.md](transitions.md) | 27 | velocity cuts, zoom-throughs, shared elements, continuous camera, morphs, whips, match cuts, irises, light handovers, exit-then-enter, cross-overs, card expands, blur-throughs, push wipes, flash frames, snap punches, text swaps, mosaics, collapses, ground flips, hard cuts done right, torn steps, glitch breaks, split panels, dissolves, callbacks, the last handover |
| [backgrounds.md](backgrounds.md) | 24 | lit dark stages, daylight fields, living light fields, photographic plates, world changes, 3D environments, plate grades, defocused plates, value ramps, brand fields, lit lattices, light architecture, world swaps, windows onto worlds, context plates, giant type as scenery, hairline grids, paper, ground texture, wallpaper worlds, space fields, radial shaping, the white stage, panel grids |
| [camera-type.md](camera-type.md) | 37 | camera moves (velocity cuts, pushes that land, follows, pushes into cuts, punch-ins, pull reveals, whips, 3D planes, rack focus, pulsed travel, rolls, cranes, orbits, zoom-out exits, drift tails, plate pushes, parallax, panel cameras, the UI canvas camera, handheld, lens bulge) and type (the centred build, the type system, readable time, word rises, colour emphasis, giant type, face switches, letter lockups, typing, decode and slot rolls, tracking, brackets, blur-resolve, slot reveals, exits, stacked captions) |
| [content-pacing.md](content-pacing.md) | 30 | what to show and when: the one case, the motion floor, the typed request, the status ladder, the output, the problem pile, word-picture lines, cut rhythm, specifics, proof by numbers, the film arc, verb ladders, the cursor as actor, brand placement, the hook, the text budget, accelerating swaps, people, integrations, metaphor objects, before / after, the human beat, the world arc, sound sync, camera pacing, and formats (grid, sizzle, one-take, voice-over explainer, ending in action) |
| [sound.md](sound.md) | 30 | the arranged record, pre-hit gaps, drops, the sync grammar, endings and openings, music-led accents, bed characters, voice-over, mix and master, stereo, and a palette of one-shots built in code (pops, subs, risers, whooshes, bells, impacts, plucks, runs, ticks, typing, shutters, sweeps, glitch bursts, shimmer, stabs, tactile sounds, vocal chops), plus the code-built bed as a fallback |

## How to use it

1. **Start from the product's one action** (the input becoming the output) and the case that shows it
   ([content-pacing.md](content-pacing.md) `one-case`). Every device you pick must serve that action.
2. **Pick a world, then its devices.** Choose a ground system ([backgrounds.md](backgrounds.md), "World systems"), then three to
   five effects that belong to that world ([effects.md](effects.md), "Choosing a set by world"), a house seam plus three or four
   other seams ([transitions.md](transitions.md)), and a camera grammar ([camera-type.md](camera-type.md), "Choosing a camera
   grammar").
3. **Pick the items and moves for each beat** from [items.md](items.md) and [animations.md](animations.md): the items that carry the
   action, one hero item with one designed move, one type event.
4. **Be random from the lists.** Two films should not share their signature devices. When several entries fit, choose at random
   among them (with a seed per film) instead of reaching for the same favourites; vary presets inside an entry too.
5. **Give everything its sound** ([sound.md](sound.md) `sync-grammar`): arrivals, contacts, presses and cuts with a reason get a
   short sound on the right frame; find a licensed record for the music.
6. **Check against the numbers.** Most files end with a table of checks you can measure on a render (blur curves, glow rings, iris
   extents, camera progress, type centring, ground stability, loudness).

## Finding an entry by need

| you need | look at |
|---|---|
| a word or line to arrive | `animations.md` `word-rise`, `word-build-recentre`, `blur-resolve`, `smear-arrival`, `tracking-snap`, `letter-reveal`; `camera-type.md` `word-build-centred`, `face-switch`; `effects.md` `focus-pull-in`, `colour-front-sweep` |
| a line to leave | `animations.md` `exit-shrink-rise`, `whip-exit-match`; `camera-type.md` `type-exit` |
| the product to look real and act | `items.md` `product-window`, `prompt-input`, `cursor`, `chat-thread`; `content-pacing.md` `typed-request`, `status-ladder`, `show-output`; `camera-type.md` `scroll-camera`, `action-follow` |
| depth and production value | `effects.md` `dof-ladder`, `floor-glow`, `frosted-glass`, `glass-solid`, `light-sweep`, `bloom`; `camera-type.md` `plane3d-settle`, `rack-focus`, `parallax-layers`; `items.md` `hero-3d-object` |
| a scene change that flows | `transitions.md` (the house seam rules first), `camera-type.md` `velocity-cut`, `push-into-cut`, `zoom-out-exit` |
| a number or proof | `items.md` `counter`, `chart`, `toast-stack`; `animations.md` `counter-cut`; `content-pacing.md` `proof-numbers`, `specifics` |
| the problem, then the turn | `content-pacing.md` `problem-pile`, `before-after`, `world-arc`, `film-arc`; `backgrounds.md` `ground-flip`; `sound.md` `drop`, `pre-hit-gap` |
| many things at once | `items.md` `card-ring`, `pill-chip`, `tile-grid`; `animations.md` `stagger-cascade`, `marquee`, `orbit`, `deal-pile`; `content-pacing.md` `accelerating-swap`, `integrations` |
| the logo and the end | `items.md` `logo-lockup`; `camera-type.md` `letter-lockup`, `pull-reveal`; `transitions.md` `end-handover`; `content-pacing.md` `brand-placement`, `end-in-action`; `sound.md` `endings` |
| a hold that still lives | `animations.md` `drift-tail`, `shimmer`; `camera-type.md` `drift-tail`; `content-pacing.md` `motion-floor`; `effects.md` `status-shimmer`, `mesh-gradient` |
| texture and finish | `effects.md` `grain`, `halftone-screens`, `final-soften`, `vignette`; `backgrounds.md` `ground-texture`, `paper-ground` |

## Conventions

- **Units.** px at 1920 x 1080; frames at 30 fps unless an entry says otherwise (convert counts with `fps / 30`, or author in seconds
  with `sf(s, fps)`); colours in hex; blur values are the CSS `blur()` sigma; sound levels in dBFS (one-shots) and LUFS (the mix).
- **Determinism.** Every implementation is a pure function of the frame: seeded randomness (`random(seed)` from Remotion), no
  `Math.random`, no clock, no incremental state, so any frame can be rendered alone and in any order.
- **CPU-safe.** Transforms, opacity, clip-path, masks and baked gradients first; blur through two cached levels (`Soft`) rather than an
  animated radius; SVG directional blur only on fast frames; canvas only for bitmaps; three.js scenes kept small or pre-rendered.
- **Shared kits.** Each file starts with the kit its code imports (`fx-shared.tsx`, `motion.tsx`, `items-kit.tsx`, `seamKit.ts`,
  `bg-shared.tsx`, `camtype.tsx` (with `motion.tsx` beside it), `pace.ts`, and in `sound.md` `src/sound/sfx-kit.ts`,
  `scripts/render-sound.ts`, `src/sound/Soundtrack.tsx`); save the kit beside the components under the name its first line gives.
- **Starter primitives.** Entries name the starter module that already covers the basics (`assets/remotion-starter/src/fx/*`,
  `lib/*`); the library code adds the presets and variants. Prefer the starter primitive where it exists, and use the library numbers
  to set it. The signature moves are already starter parts at these numbers: `lib/moves.ts` (snap re-centre, word rise, arrival
  tint, pop, spring landing, doubling whip and matched entry, fly-in from the lens, press squash, hold tail and scale creep, depth
  ladder, make-room, click bloom, selection ring, glyph sweep, rim streak) and `fx/Moves.tsx`, which draws them (`BuildLine`,
  `RiseWord`, `Pop`, `Land`, `FromLens`, `Press`, `WhipCut`, `Tail`, `ClickBloom`, `SelectRing`, `GlyphSweep`, `RimStreak`;
  `src/gallery` shows each one).
- **Assets.** Pictures too complex for code (photographs, footage, rendered 3D characters) are found assets with an open licence,
  graded into the film's palette; real companies' logos are their official current files. Everything UI and animated is code.
- **Taste.** No idle bobbing, no aimless camera, no cards resting at a tilt, no decoration without a job, no glitch outside a film
  about signal. Every entry's "Cheap" list says what to avoid.
