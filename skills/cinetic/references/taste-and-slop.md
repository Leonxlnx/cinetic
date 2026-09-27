# Taste and slop: the tell catalogue

The full list of things that make motion design look cheap, templated or generated, one line each with its fix. Read it at Step 2 before the style stills, then search it during every review round. Numbers are proven defaults at 1920×1080 and 60 fps, starting points rather than dogma.

**How to use it**
- **When you invent, every entry applies.** When the user supplies a brand (colours, typeface, logo, footage, voice), the brand wins over any entry about that element; the rest still apply.
- **Cite the ID.** Critics put the ID at the start of an issue's `problem` field ("F4: expo-out fade-out on the lockup, 55% gone in 1 f"), so fixes can be traced and repeat offenders counted.
- **Search by group**, for example `grep -n '^- \*\*F' references/taste-and-slop.md` for motion, or by word (`grep -n -i 'glow'`).
- **Look for the fix, not just the tell.** Each fix names a number or a file to check it with.

**Groups:** [A Concept](#a-concept-and-story) · [B Copy](#b-copy) · [C Type](#c-type) · [D Colour](#d-colour-and-surface) · [E Layout](#e-layout-and-framing) · [F Motion](#f-motion-and-easing) · [G Transitions](#g-transitions) · [H Camera](#h-camera) · [I UI](#i-ui-depiction) · [J Sound](#j-sound) · [K Pacing](#k-pacing) · [L Finishing](#l-finishing)

---

## A. Concept and story
- **A1 Feature tour.** Feature, feature, feature, logo; the viewer has nothing to remember. **Fix:** problem → turn → promise; run the deletion test both ways (`references/concept-and-story.md` §4).
- **A2 Wrong first frame.** Opening on "Introducing…", a question, the logo or a blank frame. **Fix:** open inside the problem; felt by 1 s, stated by 2 s.
- **A3 Borrowed props.** A rocket, lightbulb, globe with arcs, up-and-right chart, floating phone, sparkle for AI, shield for security. **Fix:** the ownership test; build every image from the product's own atoms.
- **A4 A style posing as an idea.** "Bold, kinetic, minimal, 3D." **Fix:** write Idea / Device / Grammar first; the style follows from them.
- **A5 Demo without a cause, or a rushed result.** UI moves because the timeline says so, or the result is on screen 11 f before a whip. **Fix:** cause → action → result, with the result held ≥ 36 f + 6 f per word.
- **A6 The device drops out.** It blinks out for 4 f at a cut, or changes size or colour across a seam. **Fix:** full opacity through every seam; hand it over on a shared prop.
- **A7 Frames that contradict the promise.** A strike-through over the tagline, overlapping tiles in an "everything fits" shot, success in the error colour. **Fix:** read every key frame literally, as a paused still.
- **A8 A recycled or dead end card.** It replays the mid-film reveal, sits static for 2.7 s, fades to black, or the last frame shows no brand. **Fix:** the device becomes the mark; a 1.5–2 s hold that builds 10–20%; the final frame is the poster.

## B. Copy
- **B1 Landing-page grammar.** Eyebrow or kicker labels, a tagline stacked over a headline, all-caps micro labels. **Fix:** delete them; hierarchy comes from size and order of appearance.
- **B2 Stock phrasing and punctuation.** Seamless, unlock, supercharge, AI-powered, next-gen, "the future of"; exclamation marks, emoji, rhetorical questions. **Fix:** callback copy built from the film's own words; statements end in a period (`references/copy-and-type.md` §3–4).
- **B3 A feature name as a headline.** "Smart Split." **Fix:** say what changes for the viewer in ≤ 5 words.
- **B4 Text wall.** More than one statement readable at once, such as a list with blurred neighbours. **Fix:** one line at a time; neighbours masked to unreadable slivers.
- **B5 Over budget.** More than 35 words per 30 s, more than 5 words per line, more than 2 lines per shot. **Fix:** cut adjectives first, then whole lines.
- **B6 Microcopy asked to carry meaning.** A 14–16 px toast readable for 6 f. **Fix:** ≥ 22 px on screen and held for its reading time, or treat it as texture that carries nothing.
- **B7 Proofing bugs.** "1 clashes", mixed brand casing, straight quotes, lorem, "John Doe", example domains. **Fix:** the plural helper and the string audit (`references/copy-and-type.md` §5).

## C. Type
- **C1 Generated-look faces.** Serif or italic as instant "elegance", or a condensed display face for "impact", when the brand didn't ask for either. **Fix:** one sans; emphasis from size, weight contrast or motion.
- **C2 An unchosen default, or a fallback.** A ubiquitous UI default family picked by nobody, or a fallback face visible on any frame. **Fix:** choose the family on purpose, ship it locally (`@fontsource-variable/*`), gate it with `FontGate`.
- **C3 Near-miss tokens.** Display weights 590, 600 and 620, or tracking −0.04, −0.05 and −0.06, across scenes. **Fix:** one display token (for example 600 / −0.045 em), reused everywhere.
- **C4 Flat scale.** Everything at 48–64 px. **Fix:** statements 88–128 px, emphasis 1.5–1.7× that, headline to secondary ≥ 2:1.
- **C5 Faux italics from 3D shear.** Roll applied before tilt leans all UI text by ~18°. **Fix:** write `perspective() rotateZ() rotateX()` so the roll stays rigid; total shear ≤ 7°.
- **C6 Glyph collisions.** Overshoot closes a word space ("Everythingfits"), a period hangs 13 px under the baseline, a cover leaks glyph tops. **Fix:** clamp at the lock; place with `inkBox` and `baselineOf` after fonts load; pad covers by 8 px.
- **C7 Blur-dissolve on every word.** Or readable text left blurred for more than 6 f. **Fix:** blur only on entry (statements 14 → 0 px, body lines 8 → 0 px, through `blurIn` so it clears by 60% of a 26 f `E.out` move); land sharp.
- **C8 Jittering numbers.** Counters whose width changes, or mono timestamps in a consumer UI. **Fix:** tabular figures in the one family; digits roll 6–8 f each.
- **C9 Letter gimmicks.** Typewriter headlines, per-letter bounce, scramble or decode effects, wide-tracked titles at rest. **Fix:** word-level reveals; per-letter motion only for the one hero word, collapsing to normal tracking.

## D. Colour and surface
- **D1 Generated gradients.** Indigo or violet → blue, rainbow multi-hue, mesh blobs, aurora washes, gradient text. **Fix:** one flat accent with a written meaning; stages are tonal fields in the palette (`references/brand-and-color.md` §9).
- **D2 Neon on black.** Anything at OKLCH L > 0.85 with C > 0.15 on an ink stage. **Fix:** lower the lightness or chroma; the accent is a signal, not a light source.
- **D3 The beige default.** A beige or cream ground with an orange or terracotta accent. **Fix:** cool or accent-tinted neutrals (paper around `#F7F8F8`); warm only when the brand is warm.
- **D4 Glass and glow.** Backdrop blur with a 10–20% white fill and a 1 px white border; glows, halos, bloom, an outer glow on text. **Fix:** one soft shadow on paper (`0 28px 90px rgba(0,0,0,.16)`); on ink, a luminance step plus a 1 px top hairline at 8–12% white.
- **D5 An accent without a meaning.** Used everywhere, used for two opposite meanings, or two near-identical reds in the code. **Fix:** one token, one meaning, ≤ 8% of pixels, one flood; measure it with the coverage script.
- **D6 Filler decoration.** Particles, bokeh, starfields, code or ASCII rain, ghost text at 3–8%, grain that does nothing or changes per scene. **Fix:** every element names its job (reveal, route, validate, emphasise) or is cut; grain is none, or global 1.5–2% keyed to the output frame.
- **D7 Muddy washes.** A white radial wash turns ink cards into grey buttons; a dull grey stage with a colour cast. **Fix:** ink stays ink; veil at 80–85% only where type sits.
- **D8 Pure black holes.** Full-frame `#000` stages that crush under encoding. **Fix:** ink at OKLCH L 0.15–0.18, tinted 0.003–0.008 chroma toward the accent.

## E. Layout and framing
- **E1 The SaaS layout.** Text left, UI card right on white, or everything centred and floating. **Fix:** the product full-bleed, type anchored to an eye line or the lower third, one focal action per shot.
- **E2 Voids and edge bands.** 20% of the frame empty under the product, a dark window edge 20–130 px wide at the border, a UI header over 120 px of nothing. **Fix:** clamp the camera so the product covers the frame; overscan moving layers 5–8%; collapse a section until its content arrives.
- **E3 No margins.** Less than 96 px at the sides or 64 px top and bottom, or less than 24 px of headroom at maximum punch. **Fix:** check the safe area on the punch frame with `scripts/layout-audit.sh`.
- **E4 Crops that slice glyphs.** "aft", ":00", or text cut by a card edge moving across it. **Fix:** crop on column gutters; reveal text only after the edge has passed.
- **E5 Cropped social versions.** A 9:16 or 1:1 cut out of the 16:9 master. **Fix:** re-lay separate compositions from the same timeline (`references/formats.md`).

## F. Motion and easing
- **F1 The default entrance.** Everything fades in, or enters with `y: 30, opacity: 0`. **Fix:** one reveal system per role, with physical entrances: a mask sweep, a birth from a gap, a morph.
- **F2 Uniform timing.** Every move 0.4–0.5 s on one out-curve. **Fix:** duration = 0.35 s + 1.35 ms per px (camera clamped to 0.6–2.4 s); the slowest move ≥ 3× the fastest; about 3 easing characters per film.
- **F3 Bounce everywhere.** Back-out, elastic, overshoot on every card. **Fix:** critical damping by default; 1–7% overshoot on impacts only; ≤ 2 landing springs per film.
- **F4 Easing the wrong way.** Ease-in entrances, ease-out exits, expo-out fade-outs (a card at 55% in one frame), a 6 f expo-in fade that vanishes in 1 f. **Fix:** entrances decay, exits accelerate; fades run 10–14 f on `E.smooth`.
- **F5 Half-sine punches.** A pulse on a hard window: velocity clunks at both ends and a peak 6–8 f after its sound. **Fix:** `hitPulse(t, 2, 5)` for every punch and tick.
- **F6 Linear zooms and walls.** Scale lerped linearly; a camera that stops dead (1.46 → 0.17 px/f in one frame). **Fix:** `lmix` for scale; `E.rest` for moves that end at rest.
- **F7 Stall, then lurch.** Two moves ease to rest, then the next starts at speed. **Fix:** overlap consecutive moves by ~20 f, or start the second on a zero-slope curve.
- **F8 Everything moving at once.** Idle bobbing, pulsing badges, an ambient zoom on every scene. **Fix:** one hero motion plus ≤ 2 supporting ones; stillness after motion is a tool.
- **F9 Batch landings.** 6–7 objects hitting on the same frame. **Fix:** stagger 0–3 f within the group, with the first object on the beat.
- **F10 Shape snaps.** The aspect ratio flips in the last 1–2 frames because one ease drove size and position. **Fix:** shape settles 6 f before position; land with a contact squash (1.08 / 0.9 → 1 over 8 f).

## G. Transitions
- **G1 Crossfade by default.** Or two misregistered outlines double-exposed for 26 f. **Fix:** morph the container or clip it with an inset; only one outline ever exists (`references/transitions.md`).
- **G2 Presets and repeats.** Glitch, RGB split, light leak, film burn, swirl, ripple, dreamy zoom, flash to white; the same iris three times. **Fix:** 6–8 motivated types, each ≤ 2 uses, plus one signature move from the mark used at the open, middle and close.
- **G3 A pop where a move was meant.** A lockup gone in 2 f, a pill that changes state in 1 f. **Fix:** exit by reversing the entrance, or cut deliberately on the beat.
- **G4 Velocity mismatch at a cut.** **Fix:** the outgoing shot accelerates ×1.25–1.3 per frame over its last 24–30 f, the cut lands at peak velocity, and the incoming shot decays ~0.959 per frame.
- **G5 Seam stutter and dips.** A duplicated frame at a seam (stop, hold, go), or a crossfade through black that dips ~25% in luminance. **Fix:** show the rest pose once; carry luminance flips on a moving shape.

## H. Camera
- **H1 Floating screenshots.** Tilted screenshot cards, fly-throughs of screenshot fields, a device mockup orbiting in a void. **Fix:** real 3D on real components, perspective 1800–2600 px, one camera axis per act; hardware only when hardware is the product.
- **H2 Locked-off shots.** Mean frame difference around 0.1 for more than 1.5 s. **Fix:** a 2–3%/s push plus ~16 px of drift with parallax (`references/camera.md`).
- **H3 Invisible drift.** 1 → 1.05 over 2 s on a logo reads as dead. **Fix:** logo holds push 10–20%; UI holds drift 0.5–1.5 px/f.
- **H4 Strobing fast moves.** Unblurred motion above 20 px/f (falling blocks at 140 px/f). **Fix:** anything above 12 px/f gets the motion-blur pass (`references/finishing.md`).

## I. UI depiction
- **I1 Generic or pictured UI.** Fake KPIs, up-and-right charts, random numbers, stock icons, a screenshot zoomed until soft. **Fix:** the product's own surfaces as real components with named data from one module (`references/product-ui.md`).
- **I2 Data that disagrees.** A date on the wrong weekday, stale labels after a move, a counter saying 7 over 12 items, the product replanning the past. **Fix:** derive every label from `data.ts` and assert it.
- **I3 State that doesn't count.** A counter frozen during the action, then flipped in one frame. **Fix:** decrement on each visible event, computed on whole frames (`fd`).
- **I4 Z-order bugs.** A badge bitten by the next avatar, a lifted card drawn under a grounded one, a toast over the result. **Fix:** paint sorted by z; badges get a 2 px ring in the background colour.
- **I5 Input no real app has.** A caret floating 8–75 px from the text, a chip whose weight animates and reflows the line. **Fix:** padding grows with the reveal; weight stays constant; animate only fill and colour.
- **I6 A robotic cursor.** Straight paths at constant speed, a parked cursor, or any cursor on a product that acts alone. **Fix:** arc 15–25% of the path, travel 36–48 f, press to 0.88 over 4 f, ≤ 1 click per 30 f; no cursor once the product is autonomous.

## J. Sound
- **J1 Library sound.** A stock whoosh on every cut, meme effects, riser → boom on everything. **Fix:** a synthesized palette; whooshes only on camera moves, dull (centroid 150–600 Hz), apex on the velocity peak, panned with the motion (`references/sound.md`).
- **J2 Out of lock.** Audio leading picture by more than 45 ms, impacts on the settle instead of the contact, thuds for off-frame landings, visible events with no sound. **Fix:** cues exported from the picture code; impacts on the contact frame; ±1 f.
- **J3 Masked effects.** Effects 13–25 dB under the music in their own band. **Fix:** ≥ +6 dB in their band; duck the music 3 dB for 150 ms around key hits.
- **J4 Out of key.** Untuned booms, snaps and ticks; a riser landing a tritone away. **Fix:** tune every pitched effect to the chord root; synthesize with integrated phase so attacks don't chirp.
- **J5 The wrong ending.** Clicks at buffer ends, an ending cut at full level, or a mid-film drop louder than the payoff. **Fix:** 6 ms cos² tails, decay below −45 dB, last 480 samples at zero; the payoff has the highest momentary loudness with limiter gain reduction < 1.5 dB.
- **J6 Typing rattle.** 30 clicks per second fusing into a buzz. **Fix:** accent word starts, a lower thock on spaces, ±6% pitch, drop clicks closer than 2 f.

## K. Pacing
- **K1 Weak hook.** 1–2 s of near-blank frame (mean difference < 0.05), which a muted feed reads as a stalled player. **Fix:** frame 0 already composed and moving; a visible change about every 0.5 s.
- **K2 Dead holds.** More than 48 f with no visible life, such as a logo held 1.6–2.4 s at a frame difference of 0.03–0.08. **Fix:** every hold builds; a designed freeze is ≤ 15 f and sits exactly on a silence.
- **K3 Cramming.** 17 scenes in 32 s, or 3 features in 5 s. **Fix:** 8–10 story beats per 30 s and 1–2 capabilities.
- **K4 Flat energy.** A middle 10× calmer than the rest, or peaks with no calm between them. **Fix:** one motion peak per bar with 30–70 f of calm between; the first 6 s about 2× as dense as the middle.
- **K5 Off-grid timing.** Cuts and hits that ignore the music. **Fix:** a BPM grid; section changes on downbeats, cuts on 8ths (`references/timing-grid.md`).

## L. Finishing
- **L1 Pops and ghost frames.** Single-frame pops, or stale frames that land on different frames each render (`will-change` on a layer with an animated blur). **Fix:** never promote a layer with blur animating inside it; render twice and compare hashes.
- **L2 Stepped blur ramps.** An animated CSS blur that jumps sharp → soft in one frame (Laplacian variance 1416 → 83). **Fix:** `src/fx/RackFocus.tsx`, a cross-fade of a sharp copy and a constant-blur copy.
- **L3 Pixel-snap stairs.** Slow moves stepping in whole pixels every 6–8 f (a fractional left/top combined with a transform). **Fix:** all translation inside one transform.
- **L4 Hairline crawl.** Strokes under 1.5 px or gaps under 8 units crawling as dashes under scale or perspective. **Fix:** thicker strokes, wider gaps, hairlines faded out at small scale (`references/chromium-rendering.md`).
- **L5 Banding.** A CSS gradient spanning fewer than ~30 code values shows rings. **Fix:** dithered PNG stages from `scripts/dither-gradient.py`.
- **L6 Bad motion blur.** Stamped copies of text, greys tinted cyan, blur smeared across a cut, double carets. **Fix:** float accumulation with samples ≤ 3 px apart, clamped to the act, discrete state from whole frames.
- **L7 Sloppy delivery.** An untagged BT.601 preview, JPEG q80 intermediates, CRF 18, Remotion's AAC priming (~43 ms late). **Fix:** BT.709 tags everywhere, JPEG q95, CRF 14–16, a muted render muxed by ffmpeg, then `scripts/check-sync.py`.
