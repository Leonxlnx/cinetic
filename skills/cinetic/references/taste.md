# Taste: what separates a premium launch film from a generated one

A generated or template film is recognisable in two seconds, even muted, even as a contact sheet. The tells are not
exotic; they are defaults. This file lists them, the qualities that replace them, and a 10-point rubric to score your own
contact sheets before you render a final.

---

## 1. The tells (avoid every one)

### Structure
1. **Company first.** A logo card or "Introducing ..." before anything happens; no product or artefact in the first 5 s.
2. **Features as equal slides.** Three or five identical cards ("Fast / Secure / Smart") with the same animation; every beat
   a fresh layout with nothing carried from the last.
3. **No through-line.** No object, word, shape or place that recurs; no bookend; the ending could belong to any film.
4. **Monotone pace.** Every beat the same length; staggers like a metronome; no held frame before the reveal; no rest at the end.

### Motion
5. **Fades everywhere.** Text fades in, scenes crossfade, logos fade from black. Fades read unsure.
6. **Symmetric easing at every seam.** Everything eases to a stop, holds, then the next thing eases from rest: a slideshow.
   Exits that decelerate.
7. **One entrance for everything.** Every element fades up, rises 40 px and de-blurs, in the same 20 frames.
8. **Bounce and overshoot on everything.** Springy cards, wobbling text, a 360-degree logo spin, a bouncing CTA button.
9. **Dead holds.** Frames frozen for a second or more between animations.
10. **Generic transitions.** Zoom-blur, glitch, slide-wipe, spin, the same one on every cut.
11. **Showing the wait.** Spinners looping, every character typed at constant speed, progress bars as filler.
12. **The literal cursor.** A small system pointer gliding in straight lines, teleporting, freezing between clicks, clicking with
    no visible state change.

### Type
13. **Medium everything.** Every line the same mid size, centred, never cropped, never small, never giant.
14. **Decorated type.** Gradient fills on every headline, glows, outlines, drop shadows, per-letter bouncing staggers.
15. **Too many words.** Full sentences on screen, generic claims ("Revolutionize your workflow", "Seamless", "Unlock",
    "Supercharge", "AI-powered", "Next-gen"), exclamation marks.
16. **Scramble on whole sentences**; matrix rain; random glyph noise without a rule.

### Look
17. **The default AI palette.** Purple-to-blue gradients on near-black, neon edges, a rainbow "AI" gradient, glow on everything.
18. **Fake glass.** A translucent rounded rectangle with a backdrop blur over a flat colour (nothing behind it to blur), no lit
    rim, no highlight, no state.
19. **Fake UI.** Lorem dashboards, illegible charts in a tilted laptop, a phone mock floating in the middle, emoji as icons,
    look-alike logos, round numbers.
20. **Random stock.** Pictures from five different shoots and grades; stock used as wallpaper behind text.
21. **Effects stacked.** Grain on white, bokeh, particles, lens flares, light leaks, vignette on everything, motion blur on every
    move (or none on a 250 px/f whip).
22. **Pure black with banding** gradients.

### Sound
23. **Wall of music** from frame 0 to the end, a riser-and-drop trailer bed under a product film.
24. **A whoosh on every cut**, a chime on every click, sounds that land a few frames late because the file's lead-in was ignored.
25. **Ending on a reverb whoosh** over a logo fade.

---

## 2. The qualities (hit every one)

1. **One argument, chained.** The film can be told in one sentence. Every beat is caused by the previous one: an object becomes
   the next beat, a word carries across a cut, a hub is re-entered, one invented artefact runs through every feature. At least
   two chaining devices per film (`film-grammar.md` section 3).
2. **One world, held strictly.** One ground system, one palette (one accent, used for meaning), one display face plus one UI face
   plus one mono, one material family. Thirty images look like one shoot (`worlds.md`).
3. **The product is real.** Legible UI with specific copy, real data with irregular numbers, real integrations with their real
   logos, state changes that carry the story. Shown flat and large, or under one camera.
4. **Seams are carried.** Cuts land on motion; exits accelerate into the cut; entrances arrive already moving; morphs, irises and
   dives are made of the scene's own geometry. Almost no dissolves.
5. **Front-loaded easing.** Arrivals put 50-80 % of their travel in the first frames and settle long; re-centres jump; whips are
   asymmetric; the camera brakes without bounce.
6. **Two clocks.** Digital things step (on twos, threes, 6 fps), physical things ease. At least one stepped element in a smooth
   film, or a smooth camera over stepped content.
7. **Nothing holds, except the end.** Every hold creeps, drifts, breathes or counts. The lockup is the only rest.
8. **Type with a decision.** Small and quiet, or giant and cropped. One or two arrival styles. Emphasis by colour, size, position,
   focus and timing; never by bounce.
9. **Effects with a job.** The world's effect budget respected (`motion/effects.md`); glows in their own hue and sized to their
   source; blur only on fast frames; flashes counted.
10. **Designed sound.** A quiet opener, music entering on the first word, breath gaps before hits, transients on the frame, a low
    climax, a silent last half-second.
11. **Copy a person would say.** 2-4 words per title, concrete nouns, the product's real vocabulary.

---

## 3. Fixes for the most common failures

| Symptom on the sheet | Fix |
|---|---|
| a beat looks like a slide | find what the previous beat can hand it (object, word, direction, shape); rebuild the seam |
| a crossfade between two scenes | carried cut, flash-hidden swap or a ground cut on the beat (`motion/turns.md` table) |
| identical feature cards | turn them into chapters: hub and dive, or one artefact through every verb |
| a frozen second | add a creep (0.8 % over 20 f) or a drift; or cut earlier |
| text fades in | cut on + born tint, or masked rise; keep 2-4 f fades only inside words |
| everything springs | replace springs on cards and camera with `ease.out` / `ease.inOut`; keep one pop family |
| UI unreadable | flat and large, one component, 1.4x camera; or a punch-in |
| palette looks "AI" | derive from the brand; one accent; flat grounds; remove gradients that carry no meaning |
| glass looks fake | lit top rim + moving specular; on flat grounds use a lit gradient instead of backdrop blur |
| sound feels pasted | measure `leadMs`; remove half the effects; add breath gaps; move the kick 2 f after the cut |

When you ask for a fix (from yourself or another agent), name **the frame, the problem, the allowed change and what must stay
the same**. Otherwise unrelated parts get "improved".

---

## 4. The contact-sheet rubric (13 points)

Make two sheets before any final render: an **overview** (`node scripts/frames.mjs sheet`: 36 frames spread over the
film) and a **beat sheet** (`node scripts/frames.mjs sheet --frames ...`: one still per beat at its most important frame, plus
the first and last frame of every seam). Judge motion from strips of a preview (`frames.mjs strip`). Score each point
0 or 1. **11-13: render. 8-10: fix the failing points, re-sheet. 7 or less: restructure the beats before touching motion.**
Run `node scripts/frames.mjs check` on the preview first: points 11-13 are measured there, and the absence of tells
(points 1-10) is not enough on its own. A film can pass 1-10 and still be half as dense and half as fast as the bar.

| # | Point | How to see it on the sheet | Pass when |
|---|---|---|---|
| 1 | **Product by 5 s** | overview, first 20 thumbnails | the product, its UI or its artefact is visible by thumbnail ~20 (5 s) unless it is a teaser |
| 2 | **One world** | squint at the whole overview | every thumbnail could only belong to this film: same ground system, palette, type, materials; no off-world frame |
| 3 | **Legible and real** | beat sheet at 320 px wide | every title reads at thumbnail size; UI copy is specific; numbers irregular; real logos where logos appear |
| 4 | **One focal point** | each beat still | the brightest, most contrasted element is the subject; scale varies across the film (small, giant, cropped) |
| 5 | **Carried seams** | seam pairs (last frame A / first frame B) | each pair shares an object, a direction, a shape or light; no blank frames, no grey mud midpoints, no two consecutive seams with the same device |
| 6 | **Nothing holds** | overview, runs of identical thumbnails | no run of more than 4 identical thumbnails (1 s) before the lockup; frame-difference check: no two consecutive identical frames before the end |
| 7 | **Restrained vocabulary** | count arrival styles and turn types | at most 2 text arrival styles; at most 1 overshoot family; flashes ≤ 4; brand device ≤ 3 uses |
| 8 | **Colour discipline** | overview | the accent appears only where it means something; no purple/green/default-gradient palette for an invented brand; dark grounds not pure black and not banding |
| 9 | **Effects budget** | beat sheet at 100 % | glows sized to their source and in their own hue; grain only where the world allows; motion blur only on seam frames (blurred thumbnails appear in pairs at seams, not throughout) |
| 10 | **An ending that rests** | last sheet row | the lockup is born from an object already on screen, lasts at most 2 s, has one CTA line; all end type is at most 15 % of the film |
| 11 | **Filled frames** | overview + `frames.mjs check` coverage | the subject spans 65 % of the width or more on average (top studios' films: 70-93 %); UI is in close-up; no small card centred on empty ground |
| 12 | **Pace** | `frames.mjs check` pace | at most 20 % of the half-seconds before the lockup are nearly still (top studios' films: 9-16 %); mean beat 0.8-1.6 s |
| 13 | **Composition variety** | `BEATS.md` composition tags + overview | no two adjacent beats share a composition; at least 4 different compositions; at least 2 ground cuts |

`frames.mjs check` passing is necessary, not sufficient. It measures pixels, so it cannot see these, which a viewer sees at
once: a finished state that only creeps (a full list, a landed number held for a second), the same layout three beats in a
row with the label swapped, a second full demo that makes the film 10 s too long, a biggest word that names the wrong
thing. Look for each on the sheet before you render the final.

Also log three numbers per film, they catch most problems: **mean beat length** (target 0.8-1.6 s for films under 30 s), **number of true hard cuts
vs carried seams** (most seams carried), and **frames moving > 10 px/f at each cut** (every cut except the lockup).
