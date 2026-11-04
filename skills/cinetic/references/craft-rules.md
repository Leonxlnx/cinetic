# Craft rules: what code films get wrong, and the house fix

The twenty mistakes that make a film read as made by code, each with the house fix and the check that catches it,
then the house rules for pacing, transitions, the camera, the product, colour over time and layout. Read it in Step 5
when you shape the beat sheet, in Steps 5-6 when you set durations, curves and staggers, and in review whenever a film
feels slow, busy, floaty, flat or cheap.

Conventions: **f** is a frame at 60 fps; speeds are px/f or px/s at 1080p; **FH** and **FW** are shares of the frame
height and width. Numbers are house defaults with normal ranges. Every rule is stated in its default form; a supplied
brand or a declared device may move it (`references/brand-and-color.md`).

**Contents**
1. [The twenty: what code films get wrong](#1-the-twenty-what-code-films-get-wrong)
2. [Pacing and structure](#2-pacing-and-structure)
3. [Transitions](#3-transitions)
4. [Camera and depth](#4-camera-and-depth)
5. [The product in motion](#5-the-product-in-motion)
6. [Colour and light over time](#6-colour-and-light-over-time)
7. [Composition and layout](#7-composition-and-layout)
8. [What reads as expensive, what reads as cheap](#8-what-reads-as-expensive-what-reads-as-cheap)

---

## 1. The twenty: what code films get wrong

| # | The mistake | The house fix | Check |
|---|---|---|---|
| 1 | **Fades on type and between shots** | words cut on in place (a pop, partial ink at 35-42 %, or opacity and rise as one `snapOut` tween); exits accelerate out or ride the camera; seams are built from content; dissolves only inside UI, at most 8 f | `word-first-frame`, `fade-detect` (look-audit), `fade-exit`, `crossfade` (lint), `dissolve-detect` (forensics) |
| 2 | **An aimless camera, bobbing UI, dead stretches** | the camera is still unless a shot declares a move (a push, pull or track that starts, travels and lands); no float, no drift, no idle push; held UI never bobs, breathes or sways; a hold may be completely still while the product changes in it; nothing at all changes for 2.5 s only at the end lock | `camera-wander`, `dead-stretch`, `motion-frozen` (forensics), `camera-float`, `idle-bob` (lint-film), `end-lock` (grid-check) |
| 3 | **A metronome** | staggers of about 4 / 10 / 7.5 f (letter / word / item), irregular, on the reading cadence; accelerate into the payoff | `stagger-shape` (grid-check), grammar-score `staggers` |
| 4 | **Editing on the bar grid instead of on sound** | cuts within 1 f of an onset of the track or a designed effect, the picture leading by up to 3 f; a 0.2-0.5 s dip before the biggest reveal; one designed sound per visual event; not every downbeat | `cut-on-sound`, `reveal-dip`, `anti-metronome` (grid-check), grammar-score `cut-sync` |
| 5 | **One symmetric ease for everything** | the curve by role: arrive, reposition, leave, linear (`references/motion-tokens.md`) | `ease-family`, `token-drift`, `whip-shape` (lint), grammar-score `role-mix` |
| 6 | **Motion blur as an effect** | blur is a declared policy: crisp flat graphics at any speed, or a 120-180° shutter above about 900-1200 px/s on camera moves and footage only; defocus is a separate tool | `blur-policy` (look-audit), `shutter`, `blur-on-crisp` (lint), `speed-ceiling` (measure-speed) |
| 7 | **Bounce as polish** | critically damped by default; one spring class per film (ζ 0.59-0.70, 4-10 % over); an oversized landing instead of a scale from zero | `spring-budget`, `spring-range`, `text-spring`, `scale-from-zero` (lint) |
| 8 | **A camera with no idea** | every camera move shows something: the push closes on the control that changes, the track follows what travels, the pull reveals the whole, the whip changes the subject; chained reframes land between moves (near-holds at rest); a tilted card is never a resting pose (cards face the camera; a 3D turn lands face-on) | `camera-wander` (forensics), `card-tilt` (lint-film), grammar-score `density` |
| 9 | **Exits that mirror entrances** | an exit eases in, runs shorter than the entrance and is cut at peak speed; the next element enters 0-1 f before | `ease-family`, `exit-length` (grid-check), `hold-into-exit` |
| 10 | **Shots that start from rest** | velocity-matched cuts: decelerate only after a cut, accelerate only into it, carry direction, speed and zoom rate across (`launch`, `carry`) | `still-cut`, `carried-cut` (forensics), `seam-plan` (grid-check) |
| 11 | **Lines that slide** | the re-centre jump (most of the distance in one frame, 22 f in all), the slot that opens early, word spaces opening over about 8 f | `chainJumps()` in the layout audit (a jump is a decisive move, not a drift) |
| 12 | **Everything smooth at full rate** | stepped and held devices where software is stepped: a lower cadence for illustration and collage, hard list jumps, one-frame flashes, all declared | review on a contact sheet at `--every 1`; `declares-cover` keeps them declared |
| 13 | **A logo that fades in on a static card** | the logo ends a physical story: an assembly, a collapse into a point or a snap and settle, then the lockup slide with the name, then the one held frame run with residual life | `end-card` (forensics), `end-lock` (grid-check), `fade-detect`, `end-card-template` (lint) |
| 14 | **Generic transitions** | an iris from a word gap, morph chains, masks made of the scene's shapes, outline hand-offs, type as a window (`references/transitions.md`) | `seam-plan` (grid-check), grammar-score `seams` |
| 15 | **Colour parked on type** | colour on type is transient: the accent marks newness, holds about 0.3 s and cools linearly over about 13 f; hard one-frame colour flips on hits (declared in `FLASHES`); colour withheld until the mark lands is a device; imagery develops from a tint | `accent-time` (grid-check), `hue-count`, `accent-share` (look-audit) |
| 16 | **A flat picture** | depth in three planes: occlusion (type behind objects, foreground occluders), parallax planes at about 1.16 : 1.08 : 1.0, a pre-softened foreground layer, lit relief under one key | the floor's depth item (two planes at different rates in half the shots, look-audit); occlusion itself is review only |
| 17 | **No overlap** | builds stagger 8-18 f from alternating edges; a secondary starts before the primary is 90 % home; the foreground lands about 20 f before the background (`overlapAt`, `leadBy`) | grammar-score `overlap` |
| 18 | **Dead grounds** | living light: a floor glow, wandering pools and looping bands (1-4 s periods) that brighten into transitions; one light event per act (`references/lighting.md`) | `living-ground`, the floor's light-event item (look-audit), `gradient-shape` (lint) |
| 19 | **Pictures that just appear** | images develop from a duotone, a gradient map or a blue-grey to true colour over 12-52 f, staggered (`fx/Develop`) | `image-develop` (look-audit, a hint); the timing is review only, on the contact sheet |
| 20 | **One duration for every class** | durations depend on the class: time constants of about 3 / 8 / 17 / 30 f for markers / elements / hero / world (`DUR`, `TAU`) | grammar-score `durations` |

Four more that have homes but no automated check:
- **Tracking as a device.** A wordmark tightens about 3 % over 10 f as it lands; a tracking collapse (5 f, ease-in) is an
  exit cut at speed (`Letters` `tracking` / `collapse`, `trackingState()`).
- **Inner content scales less than its container.** A card that grows 20 % while its text grows 8 % reads as depth.
- **Occlusion.** A word that passes behind the product, a foreground shape that crosses the subject: review on the
  sheet.
- **A designed near-still hold**, once per film: 60-96 f on the key claim or the success state, under a music stop, then
  the biggest move of the film.

## 2. Pacing and structure

1. **Two tempos of shot.** Cut-driven films hold a median shot of about 1.0-1.4 s (a launch film's band is 1.15-2.05 s,
   an update film's 0.7-1.4 s, an explainer's 1.75-2.65 s, a reel's 0.45-0.9 s); continuous takes run 2.3-2.8 s and carry
   each take with beats inside it (a take over 15 s changes its layout or type at least twice every 10 s). Shot
   lengths vary (q75/q25 1.9-3.1; under 1.9 the cuts read as a metronome): mix long holds with short punches, and let
   at least one change in seven happen without a hard cut (a morph, a mask, a wipe).
2. **Change the picture about every 0.7-1 s, whatever the cut count.** A one-take film changes something inside the
   shot (a reframe, a light event, a state change) at that rate; a locked camera with only a caption changing is a
   sag; a layout or type change at least every 2.5 s is the floor (a creep alone reads as a held frame at feed
   size). Density: about 1.9-2.8 starts per second, 1.6-2.5 things moving at once (two independent movers per shot:
   chips, labels, counters in staggers), idle frames under 15 %.
3. **Shots under 0.45 s carry no copy.** They are punctuation (a crash zoom, a caret-follow, a strobe frame).
4. **The first frame already moves.** Something changes within 2-6 frames; at least two picture changes in the first
   2.5 s; the first readable word by about 0.4-1 s; the premise reads by about 2 s. A still title before any motion is a slow hook.
5. **The product appears early,** unless a problem act of 10 s or more earns the wait; then the product or the name
   lands at about 20-26 % of the runtime.
6. **Act lengths.** The opening act runs about 12 % of the runtime (5-47 %); the proof runs 35-80 %; the outro about
   15 % (9-33 %) and the end card alone 2-13 %. Two acts in different visual worlds read as two films unless one
   object, shape or colour carries across.
7. **The energy curve has two peaks and a dip:** an early peak in the hook or reveal (10-25 % of the runtime), a
   designed lull of 1-4 s at about 55-85 % (inside a break of the track), the last and biggest peak at 75-90 %, then a
   calm outro. A film whose last peak comes before 60 % sags after it. Each act opens on a burst and decays into a
   reading plateau.
8. **Low-energy stretches stay under 4 s.** Five to ten seconds of small typing, static rows or a loader is a sag,
   most often in the middle of the demo.
9. **Spend stillness once, then pay it off:** one designed near-still hold of 1.0-1.6 s on the key claim, under a
   music stop; every other near-still stretch under 0.6-0.8 s; the biggest motion lands right after the stillness.
10. **Spotlight with silence, not with effects:** cut a statement card into a short hole in the track and bring the
    beat back on the next visual event (`references/music.md` §7).
11. **The end card assembles, holds briefly, and stops:** the lockup assembles over 1.0-1.3 s, holds 0.6-1.3 s still
    or creeping ≤ 6 %, then a hard cut or the stage dims a few frames before the mark. A card that cuts in complete
    and sits static is a dead frame; a URL needs at least 1.7 s.
12. **Repetition speeds up.** A repeated reveal runs about 40 % faster the second time; staggers compress through a
    film as the viewer learns the grammar; reframe every third repetition of a cycle (start it giant mid-sentence and
    pull back, or add a 3× macro insert). Five near-identical cycles turn formulaic by the fourth.
13. **Multi-cell loops are polyrhythms:** loop lengths with no small common factor, shots of 0.8-2.6 s per cell, cuts
    in different cells at least 6 f apart.

## 3. Transitions

1. **Every change is carried by something:** a velocity, a relay object, a morph, a shape match, a held anchor. At
   least 40 % of seams are carried and the house aims for about two thirds; no dissolves between scenes; a 1-2 f
   blend on a motion peak reads as a cut.
2. **Hide the cut.** Cut on the fastest frame; cross a foreground object through the frame at the camera's peak speed;
   leave one blank frame (ground only) after a hard cut to reset the eye; hide a big scale jump in one frame of
   motion; swap text on the frame of peak background speed instead of cutting; cut only the background under a locked
   foreground to imply time passing.
3. **Scale match cuts.** If the exit shrinks, the next shot enters oversized and keeps shrinking (a label jumps about
   1.76× across a cut and keeps pulling back; a shrinking logo cuts to a macro of the same mark that zooms out).
4. **Shape and colour match cuts.** Pill to circle to the logo's circle; a symbol to the logotype. Keep the anchor
   within about 7 % FW of its previous screen position; in an inverted match cut, figure and ground swap around a
   constant anchor while its drift continues.
5. **Object continuity carries the film.** One relay object binds abstract beats; the product is born from the type
   (a caret in a word gap grows into the UI header; a hairline in the gap becomes a prompt box).
6. **Light as a seam:** ramp the frame's luminance into the cut and land on the act's brightest frame, then exhale; a
   soft bright band sweeping the frame; an iris grown from a glyph (`Exposure`, `LightSweep`, `Iris`).
7. **Vary, then bookend.** The same wipe twice in a row reads as a preset; close by mirroring the opening (a window
   leaves as the time-reverse of its entrance, the opening shape returns in a word gap).
8. **Polarity flips are seams.** Change stage polarity only at act boundaries, with a different device each time.
9. **The next shot inherits.** It opens one step further along the outgoing move: the object the eye was on in the
   same place and size (`MatchCut`), a door split's speed turned into the card rising through the gap, an iris's line
   moving on at 1.15× (`IRIS_CARRY`), the pushed shot of a push-wipe riding 0.62 of its edge. Fast seams streak
   (0.3-0.5 of the step above about 720 px/s, `references/transitions.md` §11); slow ones stay sharp.

## 4. Camera and depth

1. **A virtual 2D or 2.5D camera** in scale and translation plus perspective planes; no handheld shake.
2. **Holds may be still:** the camera rests between declared moves (a sub-pixel creep at most, under 12 px/s, one
   way); the product changes in the hold. A move eases from rest and lands at rest; it never pans back the way it went.
3. **Pushes and pulls:** a push takes 1.5-3× over 30-70 f, peaking around 5 % scale a frame (never over 10 %); a
   pull-back 0.43-0.81× over 44-108 f. Put a foreground object across the frame at the peak to hide the speed.
4. **Punch-ins are cuts:** an establishing wide of 20-64 f, then an on-axis punch-in of 2-2.3× with the cursor and
   hover state continuous across it; every interaction gets a 3-5× close-up of 0.8-2.6 s; a wide shot of unreadable UI
   lasts at most about 1.7 s.
5. **Fast, slow, fast inside a shot:** enter fast, cruise at 1.5-8 px/f while text reads, exit fast into the cut, and
   keep consecutive shots moving the same way.
6. **Roll is secondary action:** a push carries a few degrees of roll that swings back to level; never a fixed dutch
   angle.
7. **Depth without spectacle:** perspective planes, an extruded slab under the key, progressive depth of field on one
   page; cards face the camera, and a 3D turn is one declared object move an act that lands face-on. A 2.5D film stays
   2.5D.
8. **Camera and content land together:** UI events start at 55-75 % of a camera move and captions in its last 25 %;
   the camera's own drift accelerates into the next transition.
9. **Momentum scrolls** peak early and tail off long, never overshooting; whips hide their fastest travel off frame
   and re-enter at speed.

## 5. The product in motion

1. **Scale:** product windows fill 70-92 % FW, often overflowing an edge; show the hero widget alone first, then pull
   back for context; UI rebuilt at about 2× its web size (`uiFilm()`). The house frames the product as an object on
   the stage at 50-80 % FW and goes full-frame only for a 1-2 s macro (`references/product-ui.md` §1).
2. **Legibility is the most common failure:** wide UI text at 5-16 px reads only as texture. Push in 2-5× on every
   interaction, or isolate in two steps (fade the neighbours, then dim the world, while the hero never moves).
3. **One hero per frame:** 1-4 objects; a dense full screen only as a 1-2 s establishing beat before the push.
4. **Real beats stylised:** the real product with plausible data; skeleton bars, placeholder strings and unrelated
   stock pictures read as generic.
5. **Every interaction gets a physical answer within 0.4 s:** a tab pill stretching mid-travel, a pressed card dipping
   and settling back face-on, a button's light envelope.
6. **Cause and effect to the frame:** the effect starts 1 f after the interaction lands; counters, checks and labels
   change on the landing frame; a label changes first and its colour follows 10-12 f later.
7. **Numbers count like software:** linear values cut mid-count, several counters at different rates, tabular
   figures; data draws at a constant rate while containers, camera and logos ease.
8. **The cursor** (when a human acts): 3-5 % FH, travel 12-44 f on an arrive curve with a dwell, at least 60 f of
   hover, press and release on the target; it leaves once the product acts on its own.
9. **Fast typing needs a hold:** typing faster than a person can read needs a read hold of at least 72 f afterwards.

## 6. Colour and light over time

1. **Polarity is structure:** the stage changes luminance or colour world by act (2-6 times a film), each change on
   an act boundary riding a cut, a flip or a morph; one inversion at about 40 % of the runtime, in a hole in the
   music, is the strongest reset there is. A cinetic film changes its ground inside the brand's own palette (ink,
   paper, the accent and tints of them) and twice at most, a flood and its return counting as one (`grounds`,
   `references/checks.md`).
2. **The accent is a signal:** one dominant accent over neutral grounds, a few percent of the pixels on most frames,
   one full-bleed accent beat of about 1.2 s at most (`references/brand-and-color.md`).
3. **Colour marks what just changed:** arrivals are tinted and resolve to neutral over 12-50 f.
4. **Light leads and geometry follows:** ramp luminance linearly under eased geometry; tie luminance to scale; build a
   reveal from light values.
5. **Light without wandering:** a ground lit once from the film's key, in one hue family; light changes on a beat (a
   colour event, a shade crossing on a cut), never a pool wandering to keep a still frame busy.
6. **Close the colour story:** the end mark can arrive in the accent and cool to neutral; the stage dims before the
   mark; colour withheld until the mark lands is a device.

## 7. Composition and layout

1. **Words in the middle.** A statement is centred horizontally and sits in the middle band of the frame (its centre
   at 35-65 % of the height): at least 80 % of the statement time centred, 85 % in the middle band. Centred top or
   bottom only over a full-bleed picture; never flush left at the top or the bottom; a line on top with a big picture
   below it at most once a film; a line beside, above or below a picture at most once per 30 s. When the product is on
   screen with the line, the product steps back behind it (`fx/ReadBack`) or plays its beat before or after the line
   (`layout-audit.sh` placement gate).
2. **Pictures may sit off-centre and bleed:** a product shot framed at 1.1-1.6× the frame, past an edge, is fine (the
   `framing-centred` check is for pictures only, never for type); the words stay centred over it.
3. **Symmetry for systems:** mirrored columns, centre-out reveals.
4. **Negative space is designed:** around a single type hero, 50-90 % of the frame stays empty; product shots fill the
   frame; no region larger than about a quarter of the frame stays empty by accident.
5. **Crop for scale:** giant type cut by the frame edge sells scale; a macro crop of letters reads as shapes before
   the pull-back reveals the word.
6. **Grids:** each cell holds one idea; seams align to the pixel; text in a cell stays at film size.
7. **Contrast:** anything that must be read at ≥ 4.5:1, statements at 7:1.
8. **An image inside a headline:** open the word gap over about 12 f, pop the image in, hold at most about 16 f, then
   fly the words apart while the image scales up into the next shot (`fx/InlineGap`).
9. **Keep the anchor** across shape and colour match cuts; in a layout push the neighbour gives way about 0.4× as far
   as the incoming element.

## 8. What reads as expensive, what reads as cheap

**Expensive:** zero overshoot except the one spring class; velocity carried across every cut; one settle constant for
all type; arrivals that peak early with a long tail; secondary moves smaller and earlier than the hero; settled type
that is crisp; a 10-30× contrast between fast moments and the reading cruise; stillness spent once, on purpose; real
pictures in one grade; one key light; a device per beat from many families.

**Cheap:** the same template twice in a row; per-letter re-centring of a centred line; animating on twos without
declaring it; a stall between an accelerating exit and the next shot; bounce on things that merely arrive; a 2-frame
effect that carries a story beat nobody can see; ambient motion on everything at once; grey placeholder cards; a mark
on a radial glow; a film that uses one device everywhere.
