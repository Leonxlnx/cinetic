# Taste: what separates a premium film from a generated one

A generated or template film is recognisable in two seconds, even muted, even as a contact sheet. The tells are not
exotic; they are defaults. This file lists them, the qualities that replace them, and a 20-point rubric (look first,
then the film) to score your own contact sheets before you render a final.

Five things are never acceptable, whatever the brief: uppercase monospace labels, eyebrow kickers, sloppy colour (more
than one accent, off-hue tints, coloured punctuation), the generic AI-app look (a purple-to-blue gradient, dark mode
with grey text, a glowing orb, a sparkle for "AI", glass on everything), and a serif font picked at random.

The other failure is the opposite of clutter: a film that is clean, calm and plain, with no story, generic UI and empty
frames, reads as cheap. Craft, depth, designed motion and detail inside the one thing on screen matter more than
restraint; clean composition stays, and richness never means more information at once.

## Never

Hard rules from review; each is a tell on sight. The file named after each owns the detail.
- No screen shake, not even a small one on a landing ([camera](motion/camera.md)); no screen flash
  ([turns](motion/turns.md)).
- Text never leaves by fading out while rising; exits are a hard cut, a wipe by what arrives, a mask that closes, or
  pushed out ([exits](motion/exits.md)).
- No letters that start widely spaced and pull together ([text](motion/text.md)).
- A statement ends without a full stop unless the sentence needs one; punctuation is never animated or turned into an
  object ([type.md](type.md#9-emphasis-by-colour)).
- Typing runs at a believable speed to the end (about 15-18 characters a second); no burst where the rest lands at once:
  when time is short, show a prefix as already typed ([type.md](type.md#12-labels-figures-and-mono)).
- Rolling numbers stay sharp and move in whole digits: no smear, no pixelated digits, no digit clipped mid-roll on a
  held frame ([type.md](type.md#12-labels-figures-and-mono)).
- A turn or a claim is shown by an event in a real surface, never a headline alone on an empty frame or the text of one
  card swapped in place ([story](film-grammar.md#story)).
- No faint gradient grounds (a pale gradient field, a dark ground with a soft bloom): a ground is a flat clean colour,
  a real picture or a bold designed scene ([palette rules](worlds.md#palette-rules-all-worlds)).
- No eyebrow lines; no handwriting font by default; serif rarely ([type.md](type.md#10-serif-only-with-a-reason)).
- Nothing too fast to follow: a viewer can say what happened in every beat; no move repeated more than twice
  ([rhythm](film-grammar.md#4-rhythm), [devices](film-grammar.md#devices)).
- Colour only with meaning; the ground, colour mode or accent change only when the story changes place or state, the
  whole frame at once ([joins](film-grammar.md#joins)).
- No bell, chime, glass, coin or jingle sound, no harsh or exaggerated effect, and no effect on the ending: music only
  ([sound-design.md](sound-design.md)).
- No stock photograph as wallpaper, no picture that fails the bar, no card or plate over a photograph, no lockup on a
  plate ([imagery](motion/imagery.md#house-rules), [cards-ui](motion/cards-ui.md#house-rules)).
- No motion that stops dead, starts with a jerk or steps in whole pixels; no frame still for over ~0.3 s; no screen
  full of small information at once ([stay in motion](film-grammar.md#stay-in-motion),
  [one thing](film-grammar.md#one-thing-at-a-time)).
- Other products only as their real, current, full-colour marks or faithful rebuilds of their real screens; never a
  one-colour silhouette of a colour mark, never a rough mock of a product people know ([assets.md](assets.md)).

---

## 1. The tells (avoid every one)

### Look
1. **No focal subject.** A heading, a list, a blurred layer, cropped UI, a chip and a label in one frame with nothing
   leading; three things competing for the eye. Keep one focal subject in every frame and let the rest support it.
   The opposite fails too: a small UI token or a short line alone on a dead ground beat after beat, generic cards with
   two grey lines, nothing specific, no designed light, no depth, nothing moving. A frame is calm when the eye knows
   where to look, not when it is empty.
2. **Text as fog.** Blurred, ghosted, faded or tiny unreadable copies of words, rows or code behind or around a
   statement; a wall of tiny pale rows; a full-frame screen of code nobody can read; tiny captions on tiles and corners.
3. **Crops that read as mistakes.** Mid-size lines and UI cut on two or three edges at once; a word cut mid-word at
   rest; the title of the beat cut by the top edge; a line crossed by an object.
4. **The house palette.** Warm cream or warm near-black with a hot accent from the yellow-orange-red arc in every film;
   the accent flooding the frame beat after beat; a coloured full stop; a statement in two colours (half in the accent,
   half in the ink); a brown or sepia-dimmed stage.
5. **Muddy or cheap grounds.** Grain on light paper, a dark-edged vignette, dimmed and blurred UI under a claim, a
   dark-brown stage, a saturated swirl of distant hues, a faint gradient (a pale gradient field, a dark ground with a
   soft bloom).
6. **Cheap material.** Flat CSS boxes, black chrome lit by hard strips, wireframe edges, a pasted shadow; one grey drop
   shadow on a flat card; light coming from a different side on each object; fake glass (a translucent rectangle with a
   backdrop blur over a flat colour, nothing behind it, no lit rim).
7. **Generic or busy UI.** Flat cards with no content, pills without padding, text cut inside its container, a
   simple-looking pointer, a button only partly highlighted; overlapping windows at angles, a chip pasted on a small mock
   at another scale, a phone or laptop mock floating as a wrapper, illegible charts, emoji as icons, lorem, round
   numbers; a rough mock of a real product.
8. **Placeholder marks.** A product mark of two or three primitive rectangles, a stock glyph or handwriting; the same
   glyph + wordmark + small line lockup every time; look-alike partner logos, or a colour mark drawn as a one-colour
   silhouette.
9. **Kickers through the back door.** A label above a figure, a product name in small type above a UI element, a
   category line over a number.
10. **Template decoration.** Three or six identical icon cards in a row, a bento tour, a pill badge above a title, an
    accent stripe on card edges, a sparkle for "AI", a glowing orb or particle brain, floating code that is not the
    product's, glow on every card, glass on every panel, a neon route on a black grid, a hand-drawn squiggle in the accent.
11. **Effects stacked.** Bokeh, particles, lens flares, light leaks, motion blur on every move (or none on a 250 px/f
    whip), pure black with banding gradients.
12. **Random stock.** Pictures from five different shoots and grades; stock used as wallpaper behind text; a picture
    added because a film "needs visuals"; a white card or plate laid on a photograph.

### Type
13. **Medium everything.** Every line the same mid size whatever its word count, and no contrast of scale (no giant
    word; in a film led by UI or photographs, no macro or full-frame picture either). Or the opposite: a six-word line
    blown up to 200 px.
14. **Template type.** Eyebrows and kickers over a heading, uppercase mono labels, letter-spaced small caps, ALL CAPS or
    Title Case statements, weights of 800-900, a serif or script accent word by habit, a trend display face used as a
    default, two faces in one line, a mono statement; gradient fills on headlines, decorative glows, outlines, drop
    shadows, per-letter bouncing staggers, letters that start wide and pull together, a full stop on every statement or
    an animated one (`type.md` tells).
15. **Too many words.** Full sentences on screen (more than six words at once), generic claims ("Revolutionize your
    workflow", "Seamless", "Unlock", "Supercharge", "Powered by AI", "The future is here", "Next-gen"), invented "10x"
    figures, round-number stat banners, exclamation marks.
16. **Scramble on whole sentences**; matrix rain; random glyph noise without a rule.

### Motion
17. **Fades everywhere.** Text fades up 20 px with a 100 ms stagger, text fades out while it rises, scenes crossfade,
    logos fade from black.
18. **Symmetric easing at every join.** Everything eases to a stop, holds, then the next thing eases from rest: a
    slideshow. Exits that decelerate.
19. **One entrance for everything,** and every child of a panel with its own entrance; staggers past five visible steps,
    like a metronome.
20. **Bounce and overshoot on everything,** including data, prices, progress bars and the pointer; a 360-degree logo
    spin; a bouncing CTA; a screen shake on a landing; a screen flash.
21. **Dead holds and aimless float.** A frame frozen for a third of a second or more, a move that stops dead or starts
    with a jerk, a value stepping in whole pixels; or the opposite, a camera drifting under
    everything with no direction and no reason.
22. **Generic transitions.** Zoom-blur, glitch, slide-wipe, spin, the same one on every cut; a token (a full stop, a
    pill, a dot) carried while the whole ground changes colour around it; a flood that does not cover the frame; the
    ground changing first and the card after it.
23. **Showing the wait, or skipping the act.** Spinners looping with no state, progress bars as filler; or the
    opposite: a typing burst where the rest of the line lands at once, a scroll with no reader and no reason to stop, a
    press nothing answers.
24. **The literal cursor.** A small system pointer gliding in straight lines, teleporting, freezing between clicks, clicking
    with no visible state change; a camera that chases every twitch of it, or zooms out before the result is read.

### Sound
25. **Wall of music** from frame 0 to the end; upbeat electropop with drum drops or a riser-and-drop trailer bed under a
    product film.
26. **A whoosh on every cut**, a bell, chime, glass, coin or jingle anywhere, harsh or exaggerated hits, sounds a few
    frames late because the file's lead-in was ignored; any effect on the ending.

### Structure and habit
27. **A title card first, or no story.** A logo card or "Introducing ..." before anything moves; a feature list with no
    one it happens to: no want, no cost, no turn, a payoff that is a statement ([story](film-grammar.md#story)).
28. **Features as equal slides.** Identical cards ("Fast / Secure / Smart") with the same animation; every beat a fresh
    layout with nothing carried from the last; no through-line, no bookend.
29. **Monotone or unreadable pace.** Every beat the same length; no held frame before the reveal; no rest at the end;
    beats too fast to follow; one move repeated three times or more; a change of colour or mode with no reason.
30. **The same film every time.** The same concept (one task, start to finish), the same opening (a macro pull-back, a
    prompt box being typed into), the same back half (a flood out of a button, a relay of three hosts, a wall pulled
    back from, the wall draining into the mark), the same ending chain in film after film (a dive to a giant figure, then
    the accent filling the frame, then the object becoming the mark), every line born in a tint, a recipe's timings
    copied number for number. Each is fine once (a closing line that becomes the mark is a lockup form); as a default it
    is a template.
31. **A logo tour in every film.** The artefact swapped through other companies' products as word swaps with logos,
    nothing happening in any of them. A journey through real places is a story; a tour of marks is at most 15 % of the
    film.
32. **A claim you cannot read.** The claim or the benefit fully on screen for less than its reading time
    (words / 3 + 0.5 s).
33. **A turn told, not shown.** The turn or the second turn as a headline on an empty frame; the same card's text
    swapped again and again as the join; a step that happens nowhere real.
34. **Bugs left in.** Text cut by the frame or a mask, an overlap or overprint, an empty slab during a reflow, a
    one-frame pop, a digit half-rolled on a held frame, a fix row closed as "accepted".

### Overused now

Each reads as generic today even when it is well made: an animated mesh of distant hues as the whole ground; glass and
frosted panels everywhere; rows of glossy 3D icons as decoration (one crafted tile for the product's own mark is fine),
and clay 3D as a default; bento-grid tours and three-card feature rows; a
centred mid-size headline fading up; a prompt box being typed into as the opener; a fast feature montage nobody can
read; dark mode with grey text and tracked labels; neon accents; trend display faces used as defaults; floating device
mockups; electropop with drum drops; motion for its own sake (random pushes, a float with no direction, everything
bouncing). A slow idle with a direction under a hold is not this: it is required.
Use one only when the brief truly asks for it.

---

## 2. The qualities (hit every one)

1. **A story, one concept, chained.** The film tells what happens to someone (`film-grammar.md` story): it can be told
   in one sentence with "until", "then" and "so", and its concept was chosen to tell it, against two rejected ones.
   Every beat is caused by the previous one: an object becomes the next beat, a word carries across a cut, a hub is
   re-entered, one artefact runs through every feature. At least two chaining devices a film (`film-grammar.md` section 3).
2. **One thing at a time, a designed world.** Each shot has one subject and one thing to read, in a world designed in
   code (ground, light, the product's surfaces, objects); interface one component, large, built in steps; a resting
   line and the focal component sit 8 % or more from the edges ([one thing](film-grammar.md#one-thing-at-a-time)).
3. **One world, held strictly.** One ground system (a flat clean colour, a real picture, or a bold designed scene),
   one palette (one accent, used for meaning, on a tenth of the frame or less), one sans voice
   for statements and UI (or the brand's serif voice for statements), mono only for code and data, one material family
   under one light direction. Thirty images look like one shoot (`worlds.md`).
4. **The product is real.** UI premium, detailed and specific, designed like a shipped product (`motion/cards-ui.md`),
   plausible named data with irregular numbers, real full-colour logos, state changes that carry the story.
5. **Joins carry the subject.** Each join carries the thing the viewer is watching, large, or is a hard cut on a
   musical event (`film-grammar.md` joins); cuts land on motion; morphs, irises and dives are made of the scene's own
   geometry and cover the frame. Almost no dissolves.
6. **Smooth, exponential motion.** Arrivals put most of their travel in the first frames and settle long (expo-out);
   moves from rest ease in and out; zooms by a constant ratio; two moves in a row meet without a corner; springs at
   bounce 0 unless the object is playful; re-centres glide fast and settle; the camera brakes without bounce
   ([stay in motion](film-grammar.md#stay-in-motion)).
7. **Two clocks.** Content that is digital by nature (a pixel mosaic, a spinner) may step; position, scale and the
   camera never step.
8. **Always in motion.** A result or a line is held until it is read, and while held it moves (a drift, a push, a
   breath); no hold with nothing to read; every exit is the next entrance. The ending is the only rest.
9. **Type with a decision.** Resting lines sized by their word count, centred or set beside or over their picture;
   one spectacle word giant. One or two arrival styles. At most one emphasised word or phrase a statement, in the accent; never by a second
   face, a heavier weight or a bounce (`type.md`).
10. **Effects with a job.** The world's effect budget respected (`motion/effects.md`); glow and glass at most once a
    shot, on the accent, glows in their own hue and sized to their source; blur only on fast frames and on shapes.
11. **Designed sound.** A quiet opener, music entering on the first word, few, dry, quiet effects with transients on
    the frame, breath gaps before hits, no effect on the ending, a silent last half-second.
12. **Copy a person would say.** 2-6 words on screen at once (most titles 2-4), concrete nouns, the product's real
    vocabulary.

---

## 3. Fixes for the most common failures

Typical misses: no story, a plain frame, generic UI, a frame with no focal subject, text used as texture, a line cut by
the frame edge, dead frames, UI text under 30 px, the same layout beat after beat, a join with nothing carried, a
change of colour with no reason.

| Symptom on the sheet | Fix |
|---|---|
| no story | write the five lines (`film-grammar.md` story) and rebuild the beats from them |
| a plain or empty frame | design the world: the product's detailed surface, a lit object, depth in layers, a designed move; never a stock photograph or a card added to fill it |
| a dense screen, too much at once | one component, large, built in steps; a number or claim in its own shot |
| a move that jerks, stops dead or pops | rebuild it on exponential curves with a long tail (the smooth motion section of the motion references); re-measure with `frames.mjs motion` |
| generic UI | start from the library's UI ([library-ui.md](library-ui.md)); real names, states, small icons, even padding, its app context |
| no focal subject | pick the one thing to read; set the rest behind it by scale, focus or depth, or give it its own beat |
| text behind or around a statement | delete it; the line sits on a flat ground, a calm area of a picture, or beside its object |
| a line cut by the frame edge | bring it 8 % inside the frame, or make it one giant word alone, or one component leaving on one side |
| a beat looks like a slide | find what the previous beat can hand it (object, word, direction, shape); rebuild the join |
| a crossfade between two scenes | a join that carries the subject, or a hard cut on a music event (`film-grammar.md` joins) |
| identical feature cards | turn them into chapters: hub and dive, or one artefact through every verb |
| a still stretch (over ~10 f) | add a slow idle with a direction (a creep of 0.8 % over 20 f, a drift, a breath) if it is read; cut it if nothing is read |
| text fades in | cut on, a swap or a decode, or a masked rise; keep 2-4 f fades only inside words |
| everything springs | springs at bounce 0, or `ease.out` / `ease.inOut` on cards and camera; keep one pop family |
| UI unreadable or busy | one component, flat, 1.4x camera; the rest reduced to quiet shapes; or a punch-in |
| type looks templated | one sans at 430-550, sentence case, sized by word count, centred or set beside its object; no kicker, no caps labels (`type.md`) |
| palette looks "AI" or warm by habit | derive from the brand; an invented accent takes its hue from the product's object, off the yellow-orange-red arc by default; neutral or cool white, or a deep tone of the accent's hue; one accent on a tenth of the frame |
| a muddy or gradient ground | remove grain, vignette, blooms and dimmed under-layers; a flat clean colour, a real picture, or a bold designed scene |
| flat or cheap 3D | `softStudio`, `Box` with `bevel` and a matte or frosted `material`, a soft contact shadow, one light direction |
| glass looks fake | lit top rim + moving specular; on a plain ground use a lit gradient instead of backdrop blur |
| sound feels pasted | measure `leadMs`; remove half the effects; no effect on the ending; add breath gaps; move the kick 2 f after the cut |

When you ask for a fix (from yourself or another agent), name **the frame, the problem, the allowed change and what must
stay the same**. Otherwise unrelated parts get "improved".

---

## 4. The contact-sheet rubric (20 points)

Make two sheets before any final render: an **overview** (`node scripts/frames.mjs sheet`: 36 frames spread over the
film) and a **beat sheet** (`node scripts/frames.mjs sheet --frames ...`: one still per beat at its most important frame,
plus the first and last frame of every join). Judge motion from strips of a preview (`frames.mjs strip`). Score each
point 0 or 1. **17-20: go to the polish loop. 13-16: fix the failing points, re-sheet. 12 or less: restructure before
touching motion.** Run `node scripts/frames.mjs check` on the preview first: it measures pace, holds, empty frames and
crowding; its `air` and coverage figures are information, not targets (a rich frame is not a crowded one). Look points come first because a film can pass every
film point and still look generated.

**Score on the right evidence.** The sheet samples too rarely to see a join or a crop: points 3 (clean crops) and 13
(joins) are scored only on the whole-move join images (`frames.mjs joins`, every join given as `{ at, len }`) and on
full-size stills of every interface state (`still --frame N --full`), never on the sheet. **A bug caps the score:** a
film with one blocking bug open (text cut by the frame, a mask or its own box; an overprint; an empty slab or a plate
without its text; a one-frame pop; the old scene left round the new one; a clipped digit) scores 14 at most and does not
ship, whatever its points add up to.

A film can pass every point and still be forgettable. Before the final, answer three questions in one line each: which
frame is the poster (a crafted image, not a centred line); what is the film's one material or picture; where is its
contrast of scale; what is the story in one sentence. If an answer is missing, the film is not ready, whatever it scores.

| # | Point | Pass when |
|---|---|---|
| 1 | **One focal subject** | in 80 % or more of the frames one element is clearly the subject (the brightest, most contrasted thing) and everything else supports it |
| 2 | **One thing, designed** | one subject and one thing to read a shot, in a designed world (ground, light, the product's surface, depth); interface one component, text 30 px or more; no stock picture, no picture that fails the bar, no card that is not real interface; a resting statement and the focal component sit 8 % or more from every edge |
| 3 | **Clean crops** | on the full-size stills and join images, not the sheet: the frame cuts only a lone giant word, or one component on one side in close-up; no resting line or key word is cut; never two sides at once |
| 4 | **Readable or absent** | no blurred, ghosted or faded text behind or around statements; no walls of unreadable rows or code; dense UI shown at a readable crop while an action happens in it |
| 5 | **Clean grounds** | a flat clean colour, a real picture or a bold designed scene; no faint gradient, no soft bloom as a ground, no grain on flat grounds, no vignette corners, no dimmed UI as a ground, no banding |
| 6 | **Light and material** | one light direction; soft layered shadows and contact shadows; depth of field on shapes only; 3D soft-lit and rounded; glow and glass at most once a shot, on the accent; motion blur on fast moves |
| 7 | **Colour** | one accent, used only with meaning, on a tenth of the frame or less; no object that suddenly turns the accent; no two-colour statements, no coloured punctuation; for an invented brand no purple, no green, no default gradient, and not the warm-cream + hot-accent or neon-on-black default |
| 8 | **UI craft** | designed like a shipped product: its app context, density inside the focal component, real names and data, states, small icons, even padding, nothing cut inside its container, a crafted pointer; flat or 12° or less, one radius family, UI text 30 px or more on screen |
| 9 | **Marks** | the product mark has an idea and finish (a drawn glyph, a crafted tile, a custom wordmark); partner logos real; the lockup is not the glyph + wordmark + small line template |
| 10 | **Type** | statements sized by word count, no word under 64 px, 7:1 against what is behind it, sentence case, centred or deliberately placed; no kicker over a heading, a figure or UI; needed labels a third of their line and 40 px or more |
| 11 | **A story, one world** | `BEATS.md` opens with the five-line story and the concept line; the one-sentence test passes ("until", "then", "so"); the payoff is visible and an opening image returns changed; every thumbnail could only belong to this film |
| 12 | **A first frame with an idea** | frame 0 is the concept's subject already moving (the product, the primitive, the first words, the mark); when the concept shows the product, it or its artefact is on screen by 5 s |
| 13 | **Joins** | on the whole-move join images, every cell clean; the join test in `BEATS.md` passes: every join carries the subject (a sixth of the frame or more) or is an allowed hard cut on a beat; the frame is covered at every switch; every change of ground, mode or accent has a story reason |
| 14 | **Smooth and always moving** | on the motion pass's strips and `frames.mjs motion`, not the sheet: no pop, no dead stop, no hard start from rest, no stepping of position or scale, nothing still over ~10 f before the ending; every join one move; every action shows before, during and after |
| 15 | **Strong moves, varied** | against the Devices block: a designed move every 3-4 s, linked; plain text rises or fades on two lines at most; no entrance more than twice; 1 overshoot family, no flash, no shake; at most 1 flood |
| 16 | **Pace** | every hold read and moving; mean beat 1.4-2.2 s; one thing first, then more, then many; a viewer can say what happened in every beat |
| 17 | **Composition variety** | no two adjacent beats share a composition; at least 4 compositions; the ground changes only with the story |
| 18 | **The camera goes to the event** | a held framing carries a large change about every 0.7 s; when something happens elsewhere the camera is on it or travelling; it moves on the machine's turn and holds while the person acts |
| 19 | **The output and the spectacle** | where the concept requires it, the product's result is seen once in macro or as giant type (key words 120 px or more); the spectacle (15 s or more) lasts 1.5 s or more and reads |
| 20 | **An ending that suits the format** | the ending its format allows (formats.md); the claim fully readable for its reading time; in a launch or feature film the lockup is born from an object on screen, at most 2.5 s, claim and lockup at most a fifth of the film (3.5 s under 18 s) |

`frames.mjs check` passing is necessary, not sufficient. It measures pixels, so it cannot see what a viewer sees at
once: a hold with nothing to read, a token carried across a join, a camera parked while small things change inside the
shot, the same layout three beats in a row with the label swapped, two unrelated demos, a biggest word that names the
problem or the input, ghost text that raises its reach, a film with no story. Look for each on strips and on the sheet
before you render the final.

Also note three numbers for every film, they catch most problems: **mean beat length** (1.4-2.2 s), **number of hard
cuts vs carried joins** (hard cuts on the turn, the second turn and into the lockup; any other hard cut sits on a music event; never two in a row), and **frames moving > 10 px/f at
each cut** (every cut except the one into the ending).

---

## 5. The polish loop

A film is not finished after the first cut, and its motion takes the most time of all.

### The motion pass

Before the bug passes, at least two motion passes. Motion that is merely correct reads as angular and laggy; it has to
be smooth and satisfying, and that takes rework.
1. List every join and every entrance with its first frame and length (`JOINS` covers the joins).
2. Render each as consecutive frames (`frames.mjs joins`, `strip --at <s>`) and measure the preview with
   `frames.mjs motion out/main-preview.mp4` (pops, dead stops, hard starts from rest, stepping, stillness, a curve image).
3. For each, write in `BEATS.md` (`frame | move | what is not smooth | the change | re-checked on`): a corner between
   two moves, a landing with no tail, a start from rest with a jerk, a linear ramp, a value stepping in pixels, a still
   stretch, a join where A stops before B starts, a move too fast to follow. Rebuild it on exponential curves (the
   smooth motion section of the motion references), re-render, re-measure.
4. Two passes is the minimum, and a pass that finds nothing is not a reason to stop: look again at the three moves that
   carry the film and make each one better (a longer tail, a better hand-off, a cleaner curve). Never stop at "it
   passes"; stop when every join and entrance is one you would show on its own.

### Bug passes

After it scores 17 or more, run at least two polish passes:
1. Render a preview and make strips of consecutive frames (`frames.mjs strip <video> --at <s>`) of every beat, and the
   join images of every join (`frames.mjs joins`, below), not only the 36-frame sheet. Step through the first twelve
   frames of every plate, card and window as it arrives (`sheet --frames N,N+1,...,N+11`, or its join image): no plate
   without its text, no window half empty, no card that lands blank and fills later.
2. Write a list of up to ten concrete fixes in `BEATS.md` (`frame | what is wrong | the fix | re-checked on`): a pill
   without padding, a press its target does not answer, a join whose frame is not covered, a hold with nothing to read,
   a repeated move, a sound too loud. List only faults you can point to on a frame: a short film may have six, and a
   fix invented to reach a count makes a new fault. "Re-checked on" names the image the fix was closed on (for a join, its join image:
   `out/joins/main-join-245.png`).
3. Do every fix, re-render, and re-check each one on its strip or join image; tick it off.
4. Run the pass again with a fresh list. Two passes is the minimum; stop when a pass finds fewer than five real faults.
   Each pass lists the bugs it found by frame (`f618-623 overprint at the dive; f782-786 claim outside the plate`),
   never as a count ("3 bugs fixed").

**Joins are judged at real size, every frame.** A small strip hides what breaks a join, and a fix made on one frame
often breaks the frames beside it (a third of the fixes in one tested polish pass made a new fault at a join). So every
join is exported with `node scripts/frames.mjs joins` (the whole move, from 2 frames before its first to 4 after its
last, 960 px each; the film exports `JOINS` beside `T`, each `{ at, len }`: the frame where anything of the join starts
to move and how long it runs until the new scene has landed) before the final and again after every fix that touches it, and every cell is looked at for: anything cut by the
frame or its container, overlapping or overprinted text, an empty slab, a one-frame pop or flip of ground, a camera
snap, misaligned parts, a thing leaving before the cut. A fix is closed only when its join image is clean. Clean means: every frame of the join is looked at, one by one with no frame skipped (every frame `joins` exports; a join given as a bare frame shows only nine round it,
and a fault before or after them is not on the image); nothing of the old scene is left on screen once the new one has landed; nothing pops in a frame late; no cell is waved through as an intended smear unless it is motion blur on the one thing that is moving. A move that
cannot be made clean is replaced by a simpler one: a hard cut on the beat beats a broken transition.

**Bugs are blockers.** Before the final, render a full-size still of every beat with type and of every interface state
(each state a screen, card or window passes through: `frames.mjs still --frame N --full`), the join image of every join and a strip of every reflow or layout change, and fix every cut
text (by the frame, a mask or its own box), overlap, overprint, empty slab, one-frame pop and clipped digit. Each one
blocks the final, whatever the rubric says. A row of the fix table is closed only by a fix or a redesign of the beat,
re-checked on its frame: never "accepted", "noted", "minor" or "later".

The effort checklist: add at least eight of these ten, deliberately, and tick them in `BEATS.md`.
1. **Idle life:** everything that has landed keeps a small life of its own (a bob, a blink, a breathing light, a sheen
   travelling along an edge), never a frozen card.
2. **Local reactions:** the target reacts on the contact frame (a 2-4 px dip, a highlight, a ripple, letters near the
   pointer change).
3. **Specific content:** real names, prices, counts and places that belong to this story (no "Project A", no rounded
   numbers); the real, current, full-colour marks of other products.
4. **A texture family:** one material across the film (grain on photographs, halftone, dither, a lens, tracking marks,
   paper) used as join material at least twice.
5. **A designed world:** a ground, light and objects built for this film (a picture only when it passed the bar in
   [imagery](motion/imagery.md#house-rules)).
6. **Variation:** a recurring device changes every time it returns (timing, direction, size, what it reveals); no
   identical repeat, nothing more than twice.
7. **Sound on picture:** every cut on the music's grid; one musical event (a drop, a stop) used as a join; effects only
   where something physical happens; nothing on the ending.
8. **One surprise:** a joke, a visual pun or a match nobody expects (an object that turns out to be the next thing).
9. **Optics:** motion blur on every fast move, focus used to direct the eye, depth by layers moving at different rates.
10. **Bespoke joins:** at least two joins made from the scene's own objects (its cells, its words, its shape).
