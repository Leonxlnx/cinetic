# Cadence and grammar

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Film-wide choices: one motion grammar, designed holds, characters with life.

[One motion grammar for the whole film](#one-motion-grammar-for-the-whole-film) · [Graphics on a lower animation cadence](#graphics-on-a-lower-animation-cadence) · [Eyes open and blink](#eyes-open-and-blink) · [A designed hold that clicks into place](#a-designed-hold-that-clicks-into-place)

### One motion grammar for the whole film

`dv-motion-grammar-rules` · workhorse · energy calm · any · primitive: recipe (plain layers)

A film keeps one grammar: every arrival an exponential ease-out with no overshoot (t50 0.10-0.20 s, t90 0.27-0.47 s), every departure a pure ease-in cut at speed, no blur; emphasis by colour, focus and layout only, never by text overshoot or scale-ups. **When:** Every film: write the grammar into the treatment. **Avoid:** Mixing springs, bounces and eases without a rule.

- **Anatomy:** Arrivals 24-40 f; exits 16-24 f; one accent for emphasis.
- **Timing:** Whole film.
- **Sound:** None.
- **Build:** Recipe: motion tokens (E.snapOut arrivals, E.launchIn exits) as the only curves in the timeline.

### Graphics on a lower animation cadence

`dv-stepped-cadence` · workhorse · energy medium · any · primitive: Stepped

Graphics animate on a lower cadence than the file: on twos (12 in 24, 30 in 60), at 16 fps in a 24 fps timeline (new, new, hold), about 18 fps in 25, 25 in 29.97; footage at its own 24 fps under 30 fps graphics; only grain and glow change every frame; edges stay crisp with no motion blur. **When:** Graphic, illustrative, collage films; a crafted, hand-made feel. **Avoid:** Stepping the camera and type in a smooth film (step one layer, not everything).

- **Anatomy:** Hold patterns: 1 of 2, 1 of 3, 1 of 6 frames; footage pulldown 1 in 5.
- **Timing:** Whole film or whole sections.
- **Sound:** None.
- **Build:** `<Stepped fps={16}>` (or on={2}) around the graphic layers; declare the stepped ranges.

### Eyes open and blink

`dv-character-life` · accent · energy calm · launch, feature · primitive: recipe (plain layers)

A character or object gets life from its eyes: an eye springs open behind an object, gets a catch-light and blinks 1-4-1 frames; a character closes its eyes for about 4 frames. **When:** Mascots and characters. **Avoid:** Blinks on a regular metronome.

- **Anatomy:** Lid spring zeta 0.70 with 4.5 % overshoot; blink 2/10/2 f.
- **Timing:** Open 22 f; blink 15 f.
- **Sound:** A UI pop on the open.
- **Build:** Recipe: lid as a clip-path driven by a spring; blink as three stepped states.

### A designed hold that clicks into place

`dv-designed-hold` · accent · energy calm · any · primitive: recipe (plain layers)

A held frame on purpose: the settled mark is bit-identical for 4 frames as it clicks into place; a stamped line sits perfectly still while only the background light pools move; a title holds over a second with under 3 px drift. **When:** After a landing that should feel locked. **Avoid:** Long dead holds without any living layer.

- **Anatomy:** 4-28 f of stillness; a living background layer.
- **Timing:** 4-70 f.
- **Sound:** Silence or the voice.
- **Build:** Recipe: no creep on the element for the hold (declare the still range); keep LightField or grain alive.
