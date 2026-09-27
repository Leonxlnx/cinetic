# Worked example: Tessel

This is the story of one finished film, from idea to measured master, including the mistakes. It shows what each rule in SKILL.md looks like in a real film. Read it once before your first film, and come back when a rule seems arbitrary.

Tessel is a fictional product: *the calendar that plans itself*. Its launch film runs 33 s at 1920×1080 and 60 fps. It was built in Remotion 4.0.529, and the soundtrack was synthesized in Python. The numbers here are Tessel's. They became the skill's defaults because they held up, but they remain starting points.

**Contents**
1. [Brand](#1-brand)
2. [Idea and copy](#2-idea-and-copy)
3. [The device: the red now-dot](#3-the-device-the-red-now-dot)
4. [Grid and act/bar table](#4-grid-and-actbar-table)
5. [Sound](#5-sound)
6. [Pipeline](#6-pipeline)
7. [Fifteen lessons: first attempt → fix](#7-fifteen-lessons-first-attempt--fix)
8. [Measured final numbers](#8-measured-final-numbers)
9. [What the skill does differently now](#9-what-the-skill-does-differently-now)

---

## 1. Brand

- **Name.** Tessel, from *tessellation*: pieces that fit together with no gaps. The name holds the film's idea, so the finale can literally tessellate.
- **Mark.** Three primitives tile one square in a 100-unit box: a tall block, a square block and a red dot. The gap is 8 units and the corner radius 13, and one fully rounded corner lets it read at 16 px. It was built as a component (`Mark.tsx`) and studied as one-frame stills: the mark alone, the app before planning, and the app after.
- **Palette.** Ink `#0B0B0C`, paper `#FFFFFF`, and cool neutrals (mist `#F4F5F7`, line `#E3E4E8`, mute `#8A8D96`). One accent, red `#EC2A3A`, means only **"now" or "just happened"**. It is the now-dot, the now-line, each newly typed letter, and the send button, and nothing else. Two slightly different reds in early code were merged into one token.
- **Type.** Geist and Geist Mono, shipped as local variable fonts. The roles were: headline 128 px / 600 / −0.05 em; wordmark 190 / 620 / −0.055; feature lines 120 / 600; descriptor 44 / 460 in grey; payoff 176 / 600. Tabular figures were used everywhere.

## 2. Idea and copy

**Logline:** *Your week doesn't fit. Tessel fits it.*

**Arc**

| Beat | What happens |
|---|---|
| Hook / problem | An overbooked week, shown before it is stated. |
| Turn | The mark arrives and opens into the product. |
| Proof | One typed request, then the week plans itself. |
| Consequences | Three consequences, one per bar. |
| Promise | "Everything fits." |
| Lockup | The mark and the URL. |

**On-screen copy** (22 words outside the product UI):

| Where | Text |
|---|---|
| Hook | "Your week" / "doesn't fit." |
| Turn | "Tessel" (wordmark), then the descriptor "The calendar that plans itself." |
| Consequences | "Meetings move over." / "Mornings stay yours." / "Overruns fit too." |
| Promise and end card | "Everything fits." and "tessel.app" |

The typed prompt is product UI rather than film copy: *"Protect my mornings. Gym Tue + Thu. Ship the deck by Friday."*

**Callback copy.** The consequence lines replaced a first draft of stock feature bullets:
- they pay off the typed prompt ("Protect my mornings" becomes "Mornings stay yours.");
- they set up the refrain that the finale resolves ("fit too" becomes "Everything fits.");
- a viewer who reads only the big type still gets the story.

## 3. The device: the red now-dot

One red dot, the calendar's *now* marker, is handed from shot to shot and never leaves the screen. Colour carries its meaning, so the film reads muted.

| Frame (time) | What the dot is |
|---|---|
| 0 (0.0 s) | The whole frame. The dot starts at 80× (2240 px, covering the diagonal) and irises down in log space. |
| 30 (0.5 s) | The 28 px *now* dot. It ticks like a clock, and the day line draws out of it at f45. |
| 90–330 (1.5–5.5 s) | The now marker while meetings rain in, faster and faster. "doesn't fit." slams at f240. |
| 330–360 (5.5–6 s) | The implosion target. The whole world scales into the dot, followed by 15 f of true silence. |
| 360 (6 s) | The source of the shockwave that floods the frame ink. Two blocks snap around it, and it becomes the mark's dot. |
| 540 (9 s) | The mark's blocks open into the sidebar and the calendar. The dot flies to the app's now-line: Monday, 08:42. |
| 660–810 (11–13.5 s) | The colour of each newly typed letter, which relaxes to ink over 12 f. Then the send button. |
| 814 (13.6 s) | A red circle grows from the send button, with its edge fastest at the cut. |
| 840 (14 s) | The red field collapses like a shutter (height first, then width) into the now-line, and then into the dot. |
| 840–1440 (14–24 s) | The now-line in the planned week. In the third feature, the clock races to the afternoon. |
| 1440–1680 (24–28 s) | During the pull-back, the dot never shrinks with the camera. It hops out of the week, arcs over the incoming word, and lands as the period of "Everything fits." |
| 1740 (29 s) | The word underlines swell into the mark's two blocks, and the period drops into the dot's slot of the mark. |
| 1890–1979 (31.5–33 s) | A tick-tock blink. The lockup folds away and the dot returns to the centre, where the film began: the bookend. |

- **Signature move, used 3 times.** The dot owns the frame: an iris at the open, a flood in the middle, and the return at the close.
- **Luminance sequence.** The frame's luminance flips several times (red, white, ink, white, red, white, the grey quilt, white), and each flip is hidden inside a move, so the eye never registers a "scene change".

## 4. Grid and act/bar table

The film runs at 120 BPM and 60 fps: a beat is 30 f, a bar is 120 f (2 s), an 8th is 15 f and a 16th is 7.5 f. Every cue is `b(bar, beat, sub)`. Acts are contiguous and aligned to bars. `TOTAL = b(17) + 60` = 1980 f.

| Act | Bars | Frames | Time | Picture | Copy | Sound |
|---|---|---|---|---|---|---|
| fit | 1–3 | 0–359 | 0–6 s | Iris onto the dot (f30), day line (f45), grid (f60), accelerating rain (f90 on), headline slam (f240), implosion (f330) | Your week / doesn't fit. | tick-tock alone, then intro chords; rain tocks panned to their day column; a "suck" to silence at f345 |
| mark | 4–5 | 360–599 | 6–10 s | Ink flood, the mark assembles (drop 1, f360), lockup (f405), dolly and beat punches, the mark opens into the app (f540) | Tessel / The calendar that plans itself. | drop 1; the clock keeps time through the hold (hats removed on those beats) |
| prompt | 6–7 | 600–839 | 10–14 s | Clashes flash day by day on the downbeat, the camera pushes to the command bar (f630), typing (f660–780), click (f810), red flood (f814) | the typed prompt (UI) | key clicks with accented word starts; 8th-note hats only under typing |
| plan | 8–9 | 840–1079 | 14–18 s | Shutter into the now-line (drop 2, f840); tabletop: 34 blocks lift, fly and land on an accelerating schedule (f870–990); straighten (f990); "Week planned" (f1050) | UI toast | drop 2; landing tocks climb chord-tone ladders |
| feat | 10–12 | 1080–1439 | 18–24 s | The window splits on its sidebar seam; one line clicks home per bar (f1080, f1200, f1320); each payoff lands on the clap (+60 f) and its consequence on the kick (+75 f) | the three consequence lines | whips peak on the kick; check pips in key |
| end | 13–16 + 60 f | 1440–1979 | 24–33 s | Pull-back, neighbouring weeks tessellate in a wave (f1560), "Everything" (f1620), "fits." (f1680), lockup (f1740), URL (f1800), tick-tock and return home (f1890) | Everything fits. / tessel.app | breakdown, resolution on "fits.", bookend tick-tock, 1 s tail to digital zero |

**Budgets as shipped**
- 8–10 story beats.
- One motion peak per bar.
- About 22 words.
- 15 velocity peaks, each with its sound on the apex.
- Section changes on downbeats.
- Two drops, at 6 s and 14 s.

## 5. Sound

Everything was synthesized with numpy and scipy at 48 kHz from `cues.json`, with deterministic seeds. There are no samples.

- **Harmony.** A♭ major, one chord per bar:
  - intro: Fm Fm G♭;
  - then D♭ – A♭/C – Fm9 – E♭ (IV – I/3 – vi – V), twice;
  - breakdown: D♭ Fm9 E♭;
  - resolution: A♭ on "fits."

  The V-chord pads end at the bar + 0.08 s, so they are gone before the chord they resolve into.
- **Signature.** A tuned clock: a tick on A♭7 and a tock on E♭7. It opens the film, keeps time through the logo hold and closes the film. The final tick-tock bypasses the master fade.
- **Everything pitched is in key:**
  - check pips E♭7 F7 G7 A♭7;
  - landing tocks on chord-tone ladders;
  - quilt tocks that rise with distance from the centre;
  - the kick settles on A♭1 (51.9 Hz);
  - snaps are tuned to the chord root with integrated-phase oscillators.
- **Mix.**
  - Sidechain at depth 0.55, τ 0.14 s. Reverb sends are high-passed at 250 Hz.
  - The music bus sits at 0.8 under typing and 0.72 under the feature UI, rising to 1.0 at the resolution.
  - Drop 1 lands on true silence, with everything (including reverb) ducked 97%. Everything below 120 Hz is mono.
  - Bus compression is 2:1 above −14 dBFS.
  - Mastering ran three loudness passes to −14 LUFS, then a 4× oversampled lookahead limiter with a 0.77 ceiling, and zeroed the last 480 samples.

The skill's version of this toolchain is in `references/sound.md` and `scripts/audio/`.

## 6. Pipeline

One command rendered the master from source. The skill's scripts generalise each step.

| Step | Tessel | cinetic |
|---|---|---|
| Cue export | `export-cues.ts` imports the act modules and computes `peak()` / `hit()` | `scripts/export-cues.ts` + `src/sync.ts` |
| Soundtrack | `soundtrack.py` | `scripts/audio/score.py`, `synth.py`, `master.py` |
| Sharp render | `remotion render --muted`, JPEG q95, ANGLE | `scripts/render.sh` |
| Speed | optical flow → samples per frame | `scripts/measure-speed.py` |
| Sub-frames | a `Freeze` wrapper composition sized by `calculateMetadata` | `FilmSub` in the starter |
| Accumulate | float rgb48le, ±1 LSB TPDF dither, quantise once, x264 CRF 14 BT.709 | `scripts/accumulate.py` |
| Mux and gate | ffmpeg AAC 320k, cross-correlation at 3 points, true peak | `render.sh`, `scripts/check-sync.py` |
| Review | contact sheets, forensic scripts, 5 critique rounds | `scripts/sheet.py`, `forensics.py`, `av-audit.py`, `assets/critics/` |

The preview path skipped the blur pass and ran about 6× faster. Critique rounds mostly ran on previews, and only the release renders paid for motion blur.

## 7. Fifteen lessons: first attempt → fix

Each lesson is now a default somewhere in the skill; the file named after "Now in" holds it.

1. **Compute sync points; never type them.**
   - *First attempt:* whooshes and hits were placed by hand from the beat sheet, and landed 8–11 f off.
   - *Fix:* the cue export imports the same act modules. `peak(a, b, ease)` samples 400 steps for the velocity peak, and `hit(start, cfg, thr)` walks the spring to its threshold.
   - *Now in:* `references/timing-grid.md`, `scripts/export-cues.ts`.

2. **Cue to what the eye sees.**
   - *First attempt:* springs were cued on their settle, which is 5 f late. Quilt snaps were cued at full travel, on a surface that had nearly stopped.
   - *Fix:* use the pop threshold 0.5 for pop-ins, 0.92–1.0 (or the contact ease) for impacts, velocity peaks for whooshes, and 97% for tween settles.
   - *Now in:* SKILL.md §5.

3. **The first new picture belongs on the hit frame.**
   - *First attempt:* `prog(f, cue, …)` is 0 on the cue frame, so every change appeared one frame after its boom. Half-sine pulses peaked 6–8 f late.
   - *Fix:* start changes at `cue − 1`, and use `hitPulse`, which peaks 2 f after the sound.
   - *Now in:* `references/motion-tokens.md`.

4. **Use one attack-decay envelope for every punch.**
   - *First attempt:* half-sines on hard windows left velocity clunks at both ends. A helper that defaulted to expo-out made fade-outs pop half their change on frame 1, and that default caused problems four separate times.
   - *Fix:* `hitPulse(t, 2, 5)` for every tick and punch, and fades of 10–14 f on `smooth`.
   - *Now in:* SKILL.md §6.

5. **Clamp overshoot wherever it can collide or go negative.**
   - *First attempt:* springs drove the logo pieces into each other for 11 f. A rebound pushed a shutter past 1, which made `rx = 30·(1 − shut)` negative, so Chromium rejected the attribute and kept the stale shape.
   - *Fix:* clamp at the rest pose, `Math.min(0, (1 − s) · −1150)`, and put `Math.max(0, …)` on every geometric input.
   - *Now in:* `references/chromium-rendering.md`.

6. **Static reads as broken.**
   - *First attempt:* the lockup was held for 2.75 s with a 1.0 → 1.1 dolly and beat pulses, and that hold was flagged in all five rounds. The 0.6 s of static 28 px dot after the iris read as a stalled player.
   - *Fix:*
     - the day line draws 0.25 s after the iris lands, the grid appears at 1.0 s, and the rain starts at 1.5 s;
     - holds are ≤ 1.5 s, or they build visibly (≥ 20% dolly, a 2.5% breath, an eased-in drift).
   - *Now in:* SKILL.md §5.

7. **Show, don't tell.**
   - *First attempt:*
     - the overload wasn't visible before the headline stated it;
     - a frozen "12 clashes" chip contradicted the fitting happening around it;
     - a strike-through crossed out the film's own promise;
     - the feature lines were stock bullets.
   - *Fix:*
     - pile the week up visibly by 3 s;
     - count the chip down on each landing;
     - replace the strike with an underline that swells into a block;
     - write callback copy.
   - *Now in:* `references/concept-and-story.md`, `references/copy-and-type.md`.

8. **One relay object plus a bookend is the concept.**
   - *First attempt:*
     - the dot's opacity flipped 0 → 1 at one cut, so it blinked;
     - a duplicated rest-pose frame read as stop-hold-go;
     - the dot descended while "fits" was still sliding and passed through the "s".
   - *Fix:*
     - keep the device at full opacity through every cut;
     - match every property across the seam;
     - show the rest pose once;
     - lock the target first, then land. The words lock on the snap via an exported `WORDS_LEAD`.
   - *Now in:* `references/transitions.md`.

9. **Motion blur is a render pass, not a component.**
   - *First attempt:* in-browser blur composited 8-bit samples. It posterised gradients, turned `#E7E8EC` cyan and lavender, and left rings. Percentile speed estimates under-read small fast text by about 2×, which stamped 2–4 copies of it, and the sample count flickered 4 → 34 → 4.
   - *Fix:*
     - float accumulation outside the browser;
     - robust-max speed with a temporal max-filter;
     - discrete state computed from `Math.round(frame)`;
     - sub-frames clamped inside their act so cuts stay crisp.
   - *Now in:* `references/finishing.md`.

10. **Put all translation in the transform matrix.**
    - *First attempt:* a fractional left/top plus a scale snapped to whole pixels. That gave −1 px jumps on 40% of frames during a 0.05 px/f drift, and 1 px stairs on the descriptor every 6–8 f.
    - *Fix:* `left:0; top:0; transform-origin:0 0; transform: translate() scale()`. Lay text out statically and animate one wrapper.
    - *Now in:* SKILL.md §7.

11. **Assume Chromium quirks.**
    - *First attempt:*
      - `will-change` on a layer with an animated blur produced ghost frames, spaced by the render concurrency;
      - a blur ramp stepped (Laplacian variance 1416 → 83 in one frame);
      - text under `perspective` was capped at a low raster scale;
      - 2 px strokes crawled at quilt scale;
      - `overflow:hidden` flattened `preserve-3d`, so lifted cards drew under grounded ones;
      - a CSS glow showed 18 contour rings.
    - *Fix:*
      - no `will-change` near blur;
      - RackFocus cross-fades;
      - CSS `zoom` switched at a velocity peak;
      - gaps ≥ 8 units;
      - paint sorted by z;
      - dithered PNG backdrops.
    - *Now in:* `references/chromium-rendering.md`.

12. **Never double-expose.**
    - *First attempt:* window chrome faded over a tile of a different shape, and two versions of a card cross-faded into a translucent slab with doubled text.
    - *Fix:* morph one object, wipe chrome with a clip, and swap content on a single element at the apex of its arc.
    - *Now in:* `references/transitions.md`.

13. **UI truth survives a pause.**
    - *First attempt:*
      - the mini-month had the wrong weekday for the 1st;
      - time labels went stale after blocks moved;
      - the planner replanned days that had already passed;
      - a red ring meant both "clash" and "success";
      - a 14 px toast was flagged as random text.
    - *Fix:*
      - one data module with asserts;
      - labels derived from positions and rolled in 5-minute steps;
      - the product only replans the future;
      - one meaning per colour;
      - readable UI ≥ 20–22 px after camera scale.
    - *Now in:* `references/product-ui.md`.

14. **Sound craft is harmony plus room.**
    - *First attempt:*
      - booms and snaps were untuned, and a 60 Hz sub partial sat under the 51.9 Hz tonic;
      - a V-chord pad smeared over the resolution;
      - hats masked the typing;
      - drop 1 did not land on silence.
    - *Fix:*
      - tune every sound to the chord and use integrated-phase oscillators;
      - end the V pads at the bar + 0.08 s;
      - play 8th-note hats only under typing;
      - duck everything 97% before the drop;
      - verify each effect's audibility by mute-and-subtract, at ≥ +6 dB in its own band.
    - *Now in:* `references/sound.md`.

15. **Delivery is part of the film.**
    - *First attempt:*
      - Remotion's own AAC mux left 2048 samples of priming (42.7 ms, 2.56 f late);
      - a WAV at −1.41 dBTP measured −0.5 dBTP after AAC encoding;
      - previews came out `yuvj420p`, bt470bg and full range, while the master was BT.709 limited, so colour judgements made on previews were wrong.
    - *Fix:*
      - render muted and mux with ffmpeg;
      - set the limiter ceiling to 0.77 with 4× oversampled detection, and measure true peak after decoding;
      - use identical BT.709 tags on every file;
      - gate the render script on sync and peak.

      Multi-lens critique with a refutation pass, plus numeric forensics, caught sub-pixel stairs, single ghost frames and 3-frame sync slips that eyes on contact sheets missed.
    - *Now in:* `references/finishing.md`, `references/review-loop.md`.

## 8. Measured final numbers

All measured on the shipped file.

| Measure | Value |
|---|---|
| Container | 33.000 s, 1980 frames, 1920×1080, 60 fps, H.264 yuv420p, BT.709 primaries/transfer/matrix, limited range; video about 6.2 Mb/s |
| Audio | AAC 48 kHz stereo, about 320 kb/s |
| Loudness | −14.1 LUFS integrated, LRA 5.2 LU |
| True peak | −1.7 dBTP after decoding the AAC |
| Sync | cross-correlation lag 0 samples at 4 s, 14 s and 28 s (gate: ≤ 48 samples = 1 ms) |
| Events within ±1 f of their sound | 29 SFX, 15 velocity peaks, 60 rain hits, 34 landings, 54 quilt tiles; plus 60 keystrokes |
| Motion blur | 19,841 sub-frames for 1,980 frames; 420 still frames at 1 sample; up to 48 samples per frame; peak measured speed about 690 px/f |
| Master render cost | 3,387 s at concurrency 4 (the preview skipped this pass) |
| Copy | 22 words on screen outside the product UI |
| Critique | 5 rounds; overall scores rose from 6.5–7 to 7.6–8.3 (out of 10, against top-tier launch films) |

## 9. What the skill does differently now

Tessel shipped with a few known compromises. The skill's defaults fix them for the next film.

- **Lockup hold.** Tessel kept a 1.0 → 1.1 dolly, and the note never went away. The default is now a hold of ≤ 1.5 s, or a build of ≥ 10–20%.
- **Final frame.** Tessel ends on the dot alone. That is elegant, but the poster had to be taken from the mid-film lockup. The default is now "the final frame is the poster and carries the brand", with the trade-off stated in `references/formats.md`.
- **Cursor.** The cursor was positioned with left/top. The starter's `Cursor.tsx` is transform-only.
- **Motion-blur sampling.** Sample counts came from optical flow alone. `measure-speed.py` now uses robust-max statistics and a temporal filter, and it can take analytic velocity exported from the timeline.
- **Critique order.** Critique started late. The workflow now gates each step (treatment, style stills, grid check, act sheets) so that problems of taste surface before the expensive renders.
