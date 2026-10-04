# Formats

This file has one recipe per format. Each gives the structure in bars, the device, the copy and sound budget, the format's own gates, and how to deliver it. Read it at Step 0, once you have picked a row in the formats table (SKILL.md §1).

The numbers are proven defaults, not rules. Bar arithmetic and tempo choice live in `references/timing-grid.md`. The finishing commands live in `references/finishing.md`. This file only says what each format needs from them.

**Contents**
1. [Choosing and adapting a format](#1-choosing-and-adapting-a-format)
2. [Launch film and teaser](#2-launch-film-and-teaser)
3. [Product / feature video](#3-product--feature-video)
4. [Feature loop](#4-feature-loop)
5. [Logo sting](#5-logo-sting)
6. [UI walkthrough](#6-ui-walkthrough)
7. [Social re-layouts (9:16, 1:1, 4:5)](#7-social-re-layouts-916-11-45)
8. [Other short forms](#8-other-short-forms)

---

## 1. Choosing and adapting a format

- **Match the request to the nearest row, then scale it.** Use §8 for anything not listed.
  - "A 15 s clip for the launch post" is a short launch film.
  - "Show the new export feature" is a feature video.
  - "Something for the hero section" is a feature loop.
- **The destination decides three things:**
  - whether the piece must read muted (feeds and landing pages autoplay without sound);
  - whether it loops;
  - which aspect ratios you owe.

  Write all three into `BRIEF.md`.
- **Budgets scale with length, not ambition.** At 30 s a launch film holds 8–10 story beats and 20–35 words. At 15 s, halve both; don't compress the same film into half the time. Cramming is the most common failure of short formats: 3 features in 5 s reads as none.
- **Every format keeps the five laws.** A 4-second loop still has one idea, one device, one accent meaning and one motion system, and it is still measured before it ships.

## 2. Launch film and teaser

**Purpose.** Make a viewer feel a problem, see the product answer it, and remember the name.

**Length.** 20–45 s at 120 BPM (a 2 s bar), with 8–10 story beats per 30 s. Keep the whole film to 20–35 words or fewer, set at most 5 words per line.

**Act template** (30 s + tail = 15 bars + 60 f; Tessel's shape, see `references/worked-example.md`):

| Bars | Time | Beat type | What happens | Sound |
|---|---|---|---|---|
| 1–3 | 0–6 s | hook → problem | Frame 0 is already moving, and the device is on screen. The problem is felt by 1 s and stated by 2 s, then piles up visibly. It ends in an implosion or a gather into the device. | Signature motif alone, then intro chords. A "suck" to true silence before bar 4. |
| 4–5 | 6–10 s | turn | Drop 1 on the bar 4 downbeat: the device meets or becomes the mark. The lockup lasts 1.5 s or less, or visibly builds. The mark then opens into the product (a container morph). | Drop 1, and the motif keeps time through the hold. |
| 6–9 | 10–18 s | proof 1 | One capability as cause → action → result. The human's one input comes first, and the product acts after it. Drop 2 lands on bar 8, where the product takes over. | Riser into drop 2. Landings sit on the chord tones. |
| 10–12 | 18–24 s | proof 2 / consequences | One line per bar, each paying off earlier copy. One consequence per line lands on the beat. | Whips peak on the kick. The payoff sits on the clap. |
| 13–15 | 24–30 s | promise | Pull back to show scale. The refrain resolves, and the device becomes the mark for the last time. | Breakdown, then the resolution chord lands on the promise word. |
| 16 + 60 f | 30–33 s | lockup / end card | Name, URL (readable ≥ 1.7 s), the bookend, and a tail that decays to digital zero. | The motif bookends; the tail runs to zero. |

- **Two drops, not five.** Energy needs somewhere to come from. Put the loudest moment on the promise, not on a mid-film drop.
- **The signature move appears 3 times:** at the open, the middle and the close. Tessel's was the red dot's iris, flood and return. Every other transition type is used at most twice (see `references/transitions.md`).
- **End card.**
  - The final frame is the poster by default, so it must carry the brand: the mark plus the name, or the mark plus the URL.
  - When the brief gives one practical fact (a date such as "next week", "out now", a URL), it goes on the end card at the secondary size under the lockup, readable for at least 1.7 s. It is the only line besides the name; a film that leaves it out has dropped the brief's call to action.
  - A frame of the device alone is elegant, but it is weak for recall on a paused player. If you end on it anyway, export the poster from the lockup and say so in the README.
- **Teaser (15–20 s).** Keep the hook, the turn and the lockup, and cut proof down to a single glimpse, or cut it entirely. Budget 6–10 words. The rule "open inside the problem" still applies: never open on the logo.

**Format gates**
- There are 8–10 beat rows per 30 s in `TREATMENT.md`, and the device appears in every row.
- The loudest momentary loudness is on the promise or payoff, with limiter gain reduction under 1.5 dB (`av-audit.py`).
- The poster exists and shows the brand.

**Deliver.** The 16:9 master, 9:16 and 1:1 re-layouts (§7), a poster, and the brand kit when you invented the brand (§5, "Brand kit").

## 3. Product / feature video

**Purpose.** Show one capability so clearly that the viewer could explain it afterwards.

**Length.** 8–30 s at 100–120 BPM. Budget one capability per 8–10 s and 15 words or fewer.

**Structure.** Cause → action → result, with the product doing the work:

| Bars (120 BPM, 16 s) | What happens |
|---|---|
| 1–2 | Inside the product, in the "before" state, with the pain visible. The device or accent marks the thing that is wrong. |
| 3 | The cause: one human input (a click, a typed line, an incoming event). This is the only cursor moment. |
| 4–6 | The product acts. State changes animate as FLIP inserts over 18–24 f, and counters count on each event. The camera anchors on the region doing the work (`references/camera.md`). |
| 7 | The result holds for at least 36 f + 6 f per word, together with the single line of copy that names the value. The line uses the viewer's words, not the feature's name. |
| 8 + tail | A small lockup: the mark, the name and the feature name if the brief needs it. |

- **Show the product for real.** Use real components and one `data.ts` with asserts. The data should survive a pause: correct weekdays, sums that add up, plurals that agree. Details are in `references/product-ui.md`.
- **Keep the story device.** Even in a UI-only piece something must carry the eye: the accent-marked item, a selection, or a moving total.
- **Show no cursor after the cause.** A cursor that keeps doing things implies the product needs babysitting.
- **Make the product and the feature identifiable.** A stranger should know it is software and which feature this is: enough real app chrome (a window edge, the app's own header or sidebar) and the feature's name once, as a UI label (a tab, a menu item, the button that causes the action), as the one line of copy, or on the end card. "No feature name as a headline" is a copy rule; it never means "never name it". A film that shows a clever behaviour without naming it can't be searched for or asked about.

**Format gates**
- One capability.
- The feature's name appears once, and a paused frame shows enough app chrome to read as software.
- A result hold of at least 36 f + 6 f per word before any camera move.
- Every counter changes on a visible event (a manual check on the act sheet).

## 4. Feature loop

**Purpose.** A landing-page hero or a social post that autoplays muted and repeats forever without a visible restart.

**Length.** A whole number of bars with no tail, for example 8 s = 4 bars at 120 BPM, or 9.6 s = 4 bars at 100. Budget 3–5 beats and 8 words or fewer. It must read with the sound off.

**The first 2 s already show the product and the action starting.** A landing-page visitor decides in a second or two, and many see only the first pass. Open on the product itself with the cause already under way (a row arriving, a reading dropping, a card being dragged); a quiet "measuring" or setup beat is not a hook.

**Design the loop as a cycle, not as enter → hold → exit.** A loop that fades out and fades back in is a slideshow. Pick a cycle that returns to its own start through an action:
- **Conveyor.** Items flow through a stage, and the last item arrives exactly where the first one started (for example a list that advances by one row per cycle, with the rows identical at the seam).
- **Relay.** The device carries the result out of frame on one side and re-enters with a new input on the other. The frame at the seam is the same moment of the same motion.
- **State round-trip.** State A → the product acts → state B → B becomes the next A. For example, a paid bill clears and the next one slides in, where the next one looks the same as the first.

**Loop-safe motion.** Set `TAIL = 0` in `timeline.ts`. Remotion renders frames 0…`TOTAL − 1`, so design motion so that the (unrendered) frame `TOTAL` would equal frame 0. A duplicate of frame 0 at the end reads as a stutter on every cycle.

```ts
import { noise3D } from '@remotion/noise';
import { TOTAL } from './timeline';

// 0..1 phase that wraps exactly at the loop point; cycles must be a whole number
export const phase = (f: number, cycles = 1) => (((f / TOTAL) * cycles) % 1 + 1) % 1;
// periodic drift: breathing, parallax, camera float
export const loopDrift = (f: number, amp: number, cycles = 1) => amp * Math.sin(2 * Math.PI * phase(f, cycles));
// seamless organic wobble: walk a circle through 3D noise, so the value at TOTAL equals the value at 0
export const loopNoise = (seed: string, f: number, radius = 0.6, x = 0) =>
  noise3D(seed, x, radius * Math.cos(2 * Math.PI * phase(f)), radius * Math.sin(2 * Math.PI * phase(f)));
```

- **Springs and tweens** must be at rest before the seam, or be part of a motion that continues identically after frame 0. A spring still settling at `TOTAL − 1` makes a visible hitch.
- **Keep text away from the seam.** It must be fully resolved or fully gone there, because a line cut in half at the seam reads as a glitch.
- **The first frame** is also the poster and the frame people see before autoplay starts, so make it a readable, composed state that names the product: the app chrome with the brand in it, or the name. A lone object in a wide empty frame is a weak poster, and a loop that shows its brand only in the middle of the cycle is anonymous on a paused page.

**Name what it is.** A loop has no end card, so the product and the feature must be identifiable inside it: the feature's name as a UI label (a tab, a label, the button that causes the action) readable at 480 px, or the loop's one line names it. A loop of beautiful motion around an anonymous card sells nothing.
- **Density.** Loops are watched repeatedly. Give each cycle one peak per bar, but make the calm between peaks real (30–70 f), or the loop becomes tiring on the third pass.

**Sound (optional).** Most loops ship muted. If a loop has sound:
- let the last bar's tails decay before the seam; or
- render the WAV at least one bar past the loop (for example, export cues with `TOTAL + BAR` for the audio pass only) and fold the overhang back onto the start.

The fold looks like this:

```python
# fold-loop.py: python3 fold-loop.py long.wav public/audio/loop.wav --frames 480 --fps 60
import argparse, numpy as np, soundfile as sf
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--frames', type=int, required=True); ap.add_argument('--fps', type=float, default=60)
a = ap.parse_args()
x, sr = sf.read(a.src, always_2d=True)
n = round(a.frames / a.fps * sr)                       # loop length in samples
if len(x) < n: raise SystemExit(f'{a.src} is shorter than the loop ({len(x)} < {n} samples)')
out, tail = x[:n].copy(), x[n:]
for k in range(0, len(tail), n):                        # overlap-add each overhang onto the start
    seg = tail[k:k + n]; out[:len(seg)] += seg
peak = np.abs(out).max()
if peak > 0.89: out *= 0.89 / peak                      # keep about 1 dB of headroom after the fold
sf.write(a.dst, out, sr, subtype='PCM_24')
```

Fold the mastered WAV that `score.py` wrote, and don't run `master.py` again on the folded loop. It always fades the last 60 ms and zeroes the last 480 samples, and a gap at the seam is a click on every cycle. Check the loudness with `python3 scripts/audio/master.py public/audio/loop.wav --measure`, and ignore its digital-zero-tail check, which doesn't apply to a loop.

**Format gates**
- The length is a whole number of bars (`grid-check.ts`), and `probe.py --dur <s>` matches it within one frame (add `--audio none` for a muted loop).
- **Seam.** The frame difference between the last frame and frame 0 is at most max(0.4, 1.5× the median of the 8 steps at each end), and it is not flagged as a spike (`forensics.py --loop`; `deliver.sh --loop` repeats the check on the delivered file).
- The muted read works: the director lens watches the sheet with no audio and states the idea.
- A paused frame names the product or the feature (a UI label or the one line).

**Deliver.** Render with `bash scripts/render.sh Film out/loop.mp4 --loop --no-audio` (or with the folded WAV instead of `--no-audio`), then run `bash scripts/deliver.sh out/loop.mp4 --loop --gif --webm`. `--loop` renders lossless PNG intermediates: with JPEG frames the encoder smooths the noise between neighbours but not across the seam, which then measures about 1.7× its neighbours. `deliver.sh --loop` encodes the WebM at CRF 26 for the same reason.
- **MP4 and WebM** for `<video autoplay muted loop playsinline>`. Default budget: 4 MB or less per 10 s at 1080p.
- **GIF** only when asked. Use 25 fps (or 50): GIF frame delays are whole hundredths of a second, so those play at the true rate while 30 fps plays 11% fast. 960 px wide or narrower, a palettegen palette and 8 MB or less (`deliver.sh --gif` does all of it). If the size is over budget, reduce the width before the frame rate.

## 5. Logo sting

**Purpose.** The mark arrives with intent, makes one sound, and holds long enough to be read and remembered.

**Length.** 3–8 s at 120 BPM. The copy is the name plus at most 4 words.

**Scale.** At its resolved size the lockup spans about 28–45% of the frame's width (540–860 px at 1920), with the mark and the name proportioned as in `references/brand-and-color.md` §6. Smaller than that and the brand becomes a small object in a void: the sting's whole job is to be read.

**Anatomy** (6 s = `b(3,2) + 60`):

| Beat | Time | What happens |
|---|---|---|
| Bar 1 | 0–2 s | Gather. Frame 0 is already moving. One primitive of the mark (the device) enters and builds tension with anticipation: a pull back before the push, or a rising tick. |
| Bar 2, downbeat | 2.0 s | Assembly hit. The primitives accelerate into contact on the `contact` ease, squash (scaleX 1.08 → 1, scaleY 0.9 → 1 over 8 f), and one tuned hit sounds on the contact frame. If the accent floods the frame, this is its one moment. |
| Bar 2, beats 2–3 | 2.5–3.5 s | The wordmark reveals from behind the mark's **live** edge. The clip follows the moving mark, never a fixed box. Words lock without overshoot past the lock. |
| Bar 3 + 60 f | 4–6 s | The lockup holds and builds: a sting's hold runs long, so a 10–20% push on `dolly` and one small beat punch (`hitPulse`, +1.5%). The tail decays to digital zero. |

- **Assemble the mark from its own primitives.** The sting teaches the construction of the mark, which is why the mark must be built from 2–4 primitives on a grid (`references/brand-and-color.md`). A fade or scale-up of a flat logo teaches nothing.
- **Clamp every spring that could push one piece into another.** Pieces interpenetrating for a few frames on overshoot is the classic sting bug.
- **The lockup cue sits at least 1.5 s before the end**, and scale changes by 3–20% over the last 1.5 s: alive, not dead-static, not drifting away.
- **The ending.** End on the lockup, held and building. If the brief says the sting opens other videos, it may end on a clean cut to the backdrop on the last beat instead. Never end on a slow fade to blank that leaves the full lockup readable for less than 1.5 s.
- **Sound.** One hit tuned to the root of the key, on the contact frame, with an optional pre-hit tick or riser that lands on the chord tone. There is no music bed unless asked. The last 10 ms are digital silence.

**Alpha versions.** Register compositions that render the same acts with no background fill, and deliver two: `StingAlpha`, which ends on the lockup (for editors who hold it), and `StingAlphaClear`, which clears it on the last beat (for intros that cut to footage). A prop such as `{transparent: true, clear: true}` on one component is enough.
- Shadows and hairlines that depend on the paper colour need a plate-independent version: design it so it reads on both a light and a dark plate, and check stills over both.
- `bash scripts/deliver.sh out/sting.mp4 --alpha StingAlpha --alpha-webm` renders ProRes 4444 (`--image-format=png --pixel-format=yuva444p10le --codec=prores --prores-profile=4444`) and a VP9 alpha WebM (`--codec=vp9 --pixel-format=yuva420p`) for the web.
- `references/finishing.md` covers colour tags and checks.

**Format gates**
- The duration is within ±0.1 s of the brief.
- Remotion encodes the ProRes file as `yuva444p10le`, but `ffprobe` reports the decoder's format, `yuva444p12le`; accept any `yuva444p*` with profile 4444 (`deliver.sh` does).
- A still of the mark exists at 16 px and at 512 px or larger (the starter's `Stills` folder).
- One hit lands within ±1 f of the lockup cue (`av-audit.py`), and the tail falls below −45 dB.
- The accent covers 8% of pixels or less on the final frame (unless the brand is the accent): `python3 scripts/palette.py --cover out/deliver/poster.png --accent '#…'`.
- The resolved lockup spans 28–45% of the frame's width, and the full lockup is readable for at least 1.5 s.

**Brand kit.** A sting that invents a brand, and a launch film for an invented brand, also deliver the brand as files: `bash scripts/brand-kit.sh` renders the `Brand` stills and writes, into `out/deliver/brand/`:
- the mark as SVG, for light and dark grounds;
- the lockup (mark and name) as SVG with the name outlined, for light and dark grounds;
- the lockup as transparent PNG, for light and dark grounds;
- the mark as PNG at 16, 32, 512 and 1024 px;
- a social avatar (400 × 400, the mark inside the platform's circle crop), and with `--x-header` a 1500 × 500 header for X that keeps the bottom-left clear for the avatar.

## 6. UI walkthrough

**Purpose.** Teach a flow: the viewer can repeat it afterwards. It is calmer than a launch film but never static.

**Length.** 20–90 s at 90–110 BPM, with one chapter per 2–4 bars and 6 words or fewer per caption.

**Chapter template** (repeat per feature; chapter changes land on downbeats):

| Phase | Bars | What happens |
|---|---|---|
| Establish | ½–1 | Wide on the product. The camera anchor is the whole window, and the chapter caption enters in the lower third. |
| Push | ½ | The camera moves to the feature's anchor on `cam` (duration grows with distance: 0.35 s + 1.35 ms per px). |
| Cause | ½–1 | The cursor travels a bezier arc over 36–48 f, presses (0.88 over 4 f) and makes one click; or the user types at about 30 characters/s. |
| Action → result | 1–2 | The product responds, and the result holds for at least 36 f + 6 f per word while the caption is readable. |
| Hand-off | ¼–½ | A whip or pull-back to the next anchor. The last chapter hands off to the lockup. |

- **Camera.** Use one anchor camera for the whole walkthrough (`references/camera.md`), and chain the anchors so every move starts where the previous one ended. During holds, the UI drifts 0.5–1.5 px/f so the shot is never locked off.
- **Cursor.** Follow the physics in `references/product-ui.md`: an arcing path, velocity that decays, and at most one click per 30 f. The cursor is placed by transform only.
- **Captions** are burned in for muted viewing, 28 px or larger in the lower third, and taken from `COPY`. Export an SRT file from the same data:

```ts
// scripts/srt.ts: npx tsx scripts/srt.ts → out/captions.srt
import { writeFileSync } from 'node:fs';
import { COPY, FPS } from '../src/timeline';

const ts = (f: number) => {
  const ms = Math.round((f / FPS) * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
writeFileSync('out/captions.srt', COPY.map((c, i) => `${i + 1}\n${ts(c.in)} --> ${ts(c.out)}\n${c.text}\n`).join('\n'));
```

- **Sound.** A light bed with UI clicks at one level, about 3 dB under the music's short-window level and centred (`score.py` levels them). Typing per key with the music ducked under it, or one blip per word when it streams fast (`"typing": "auto"`, or `"muted"` under VO; `references/sound.md` §5.5c).
- **Long walkthroughs** (over 60 s) get one act per chapter, so a fix re-renders one chapter. Master with `scripts/render-chunks.sh` when the blur pass would be slow.

**Format gates**
- Each chapter has exactly one caption line, 6 words or fewer.
- Every result hold passes `grid-check.ts`.
- The SRT timings match the burned-in captions.
- The legibility sheet at 480 px can be read.

## 7. Social re-layouts (9:16, 1:1, 4:5)

**Re-lay out; never crop.** A centre crop of a 16:9 master cuts the type, pushes the product off the frame and breaks the safe areas.
- Register each aspect as its own composition that uses the same component, the same `timeline.ts` and the same soundtrack.
- Let layout constants switch on the frame size.

```tsx
// src/Root.tsx — alongside "Film"
<Composition id="Film9x16" component={Film} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} defaultProps={{ audit: false }} />
<Composition id="Film1x1" component={Film} durationInFrames={TOTAL} fps={FPS} width={1080} height={1080} defaultProps={{ audit: false }} />
{/* only if the variant needs motion blur: same timing, so it can reuse the master's samples (deliver.sh --variant-samples) */}
<Composition id="Film9x16Sub" component={FilmSub} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} defaultProps={{ groups: [] as number[] }} calculateMetadata={subMetadata} />

// inside an act: one layout table per aspect, same timing
const { width, height } = useVideoConfig();
const LAY = layoutFor(width, height); // type sizes, camera anchors, safe box, line breaks
```

- **Timing stays identical**, so the soundtrack and `cues.json` are reused unchanged. Only positions, sizes, line breaks and camera anchors change.
- **Line breaks change.** A 5-word line at 120 px on 16:9 becomes two lines at 110–140 px on 9:16. Put the break in `COPY` or the layout table, never in a width that happens to wrap.
- **The product's framing changes.** A tall frame wants the camera closer on one region, with the anchor moved rather than the scale reduced.

**Vertical (9:16) composition.** A tall frame is not a wide frame with bars: use the height. A 16:9 layout moved into 1080 × 1920 leaves the product as a strip in the middle and the lower half empty, and on a phone that empty half is what the viewer sees above the caption.
- **The content's visual mass sits in the middle of the safe band**, not the middle of the frame. With the feed zones below, the band runs from y 270 to y 1500 and its centre is y ≈ 885 (`safeBox('feed9x16', W, H).cy` from `src/lib/safe.ts`).
- **No empty bottom 40%.** Stack the statement above the product, or let the product fill the band and bleed past its sides, so the region from y 1152 down to the caption zone holds content. The caption zone itself (below y 1500) carries the stage or the product's edge as texture, never anything to read.
- **Type and UI run about 1.3–1.5× their 16:9 pixel sizes**, because the frame is watched full-screen on a phone next to feed UI: readable UI ≥ 32 px (not 22), secondary lines and captions 60–72 px, the product framed so its body text reads ≥ 32 px. Statements are capped by the width instead: 110–140 px, at most two lines of ≤ 3 words (`references/copy-and-type.md` §7).

A layout sketch at 1080 × 1920 (feed zones: top 270, right 120, bottom 420, left 64):

| y (px) | Region | What goes there |
|---|---|---|
| 0–270 | header zone | the stage only (its tone, the device's path); nothing to read, no key action |
| 300–580 | statement | one statement on two lines at 110–140 px, left edge on x 96 (or centred on the band's x 512) |
| 620–1380 | the product | the working region, 896 px wide or bleeding off both sides, UI type ≥ 32 px; the action (the tap, the landing, the count) happens near y 900–1100, the band's centre |
| 1390–1490 | the result | the counter, check or feature label the action produces, ≥ 48 px |
| 1500–1920 | caption zone | the stage and the product's lower edge as texture; the feed's own UI sits here |

Check the mass on a still: this prints the share of non-stage pixels per horizontal band, and the bands from 40% down should not read near 0%.

```bash
python3 - out/qa/f600.png <<'PY'
import sys, cv2, numpy as np
im = cv2.imread(sys.argv[1]).astype(float); h = im.shape[0]
stage = np.median(im[: h // 40].reshape(-1, 3), axis=0)    # the top rows are stage
busy = (np.abs(im - stage).sum(axis=2) > 24).mean(axis=1)  # content share of each row
for a, b in [(0, .14), (.14, .40), (.40, .60), (.60, .80), (.80, 1)]:
    print(f'{a:>4.0%}-{b:<4.0%} {busy[int(a * h):int(b * h)].mean():6.1%}')
PY
```

**Safe zones and type minimums.** The zones are presets in `src/lib/safe.ts`, in px at the preset's own size and scaled with the frame. They are defaults taken from the current overlays of the big vertical feeds: the header and tabs take 240–290 px at the top, the action rail 120–190 px on the right (from about y 840 down), and the handle, a one- or two-line caption and the audio label 380–450 px at the bottom, up to about 670 px with a long caption or a paid post's call-to-action button. Check the destination's current overlays when it matters.

| Aspect | Size | Preset | Keep text and key action inside | Type minimums |
|---|---|---|---|---|
| 16:9 | 1920×1080 | `wide16x9` | 96 px at the sides, 64 px top and bottom | statement 88–128 px, UI ≥ 22 px |
| 9:16 feeds | 1080×1920 | `feed9x16` | top 270 (14%), right 120, bottom 420 (22%), left 64 | statement 110–140 px, secondary ≥ 60 px, UI ≥ 32 px |
| 9:16, strict | 1080×1920 | `feed9x16Strict` | top 288, right 192, bottom 672 (35%), left 64: long captions, paid posts | as above |
| 1:1 | 1080×1080 | `square1x1` | 64 px on every side | statement ≥ 72 px, secondary ≥ 44 px, UI ≥ 28 px |
| 4:5 | 1080×1350 | `portrait4x5` | 64 px at the sides, 96 px top and bottom | statement ≥ 80 px, secondary ≥ 48 px, UI ≥ 30 px |

- Run `bash scripts/layout-audit.sh Film9x16 --cues` for each variant.
  - `<Audit>` checks the preset for the frame's aspect by default (`presetFor(w, h)`: 9:16 gets `feed9x16`; an aspect with no preset gets `title`, 5% at the sides and 6% top and bottom). Its minimum readable size is 22 px, or 32 px in a 9:16 frame. It also fails text painted under a moving element tagged `data-mover` (`references/product-ui.md` §4.5).
  - Name another zone on the composition (`defaultProps={{ audit: false, safe: 'feed9x16Strict' }}`) or per run (`--safe feed9x16Strict`, or explicit insets as top,right,bottom,left: `--safe 288,192,672,64`). The older symmetric `{ x, y }` still works (`--safe 96,64`).
  - Lay out from the same numbers: `safeBox(spec, width, height)` returns the zone's edges, size and centre for a layout table, and `SAFE` in `tokens.ts` is its symmetric envelope (the larger inset of each pair), for centred text.
- Burn captions into every feed variant, because feeds autoplay muted.
- Render and probe with `bash scripts/deliver.sh out/film.mp4 --variants Film9x16,Film1x1`. Variants render sharp by default, which is right when their fastest motion is ≤ 12 px/f; otherwise add `--variant-samples out/samples.json` to blur them with the master's samples instead of measuring again (`references/finishing.md` §1).

## 8. Other short forms

| Request | Recipe | Adjustments |
|---|---|---|
| Teaser or trailer | §2, teaser variant | hook → turn → lockup, 15–20 s, 6–10 words |
| Intro or outro for other videos | §5 | 3–5 s; the outro reverses the intro's entrance; provide an alpha version |
| Kinetic type piece | §2 structure, words as the device | one line at a time; recipes in `references/copy-and-type.md`; a statement per bar |
| App demo | §3 if one capability, §6 if a flow | real components, a data module with asserts |
| Promo clip with footage | §3 structure | the footage is the product surface; the brand's footage and grade win; add type and sound on the grid |
| Social cut-down of a finished film | §7 | re-layout from the same timeline; trim at bar boundaries, never mid-bar |
