# Critic lens: Forensics

Prompt template for one review lens (see `references/review-loop.md`, §5). The lead fills every `{{FIELD}}` and hands this whole file to a subagent.

## Context

- Film: {{FILM}}, {{SPEC}}. Project root: {{ROOT}}. Read `src/timeline.ts` for the acts and cues.
- File under review: {{VIDEO}} ({{KIND}}). Frames are 0-based: frame = t × {{FPS}}.
- QA folder for this round: {{QA}}. It holds:
  - `forensics.json`, from `python3 scripts/forensics.py {{VIDEO}} --cues out/cues.json`;
  - `probe.json` (spec, BT.709 tags, audio stream);
  - `banding.png` (a x12 contrast stretch, with red boxes on banded tiles);
  - `smear.png` (a x25 contrast stretch of flat fields, for the `smear` check);
  - the watch sheets.
- Declared cuts, freezes and ignores are listed in `forensics.json` under `declared`. Do not report those.
- Round {{ROUND}}. Changed since the last round, so check these hardest: {{CHANGED}}
- Already fixed. Do not re-report these: {{FIXED}}
- Work only inside {{WORKDIR}}.

## Your lens

You hunt technical artifacts: anything a viewer would read as broken, glitchy or cheap, even for one frame. The scripts find candidates, and you decide what is real.

1. **Triage every flag** in `forensics.json` `flags`. Fails come first, then warnings.
   - Make a paired sheet of each flagged range, two frames either side. For a flag at f1739: `python3 scripts/sheet.py {{VIDEO}} --frames 1737-1741 --diff --width 480 --out {{WORKDIR}}/f1739.png`.
   - Grab full-resolution stills where detail matters: `bash scripts/grab.sh {{VIDEO}} 1739 1740 --out {{WORKDIR}}/full`, or crop with `--crop w:h:x:y`.
   - For each flag, decide one of three:
     - **real**: report it;
     - **designed**: the lead should declare it: in the timeline (`SEAMS`, `STEPPED`, `FLASHES`, `CAMERA_BLUR`, `END`) for a film with cues, or `--cuts`, `--freeze-ok` for a file without; a primitive's own `declares()` must be covered by the timeline;
     - **false positive**: say why in one clause in `overall`.
   - What the classes mean:

   | Class | What it is | Usual cause (see `references/chromium-rendering.md`) |
   |---|---|---|
   | `spike` pop / seam-pop | a 1-2 frame change that motion does not explain | a property flipping at a cut; a fade collapsing into 1-2 frames; expo-out on a fade-out |
   | `spike` hit | the same, on a cue | fine if the hit is designed; a pop if it is a reveal that finishes too fast |
   | `stall` | a repeated frame inside motion | a duplicated rest pose at a seam; two moves easing to rest back to back |
   | `dead-stretch` / `hold` | a run over 2.5 s outside `END` where nothing changes at all | a dead stretch. Fix with a product change in the hold or a sooner cut; a still hold shorter than that is fine (the camera moves only with a purpose) |
   | `camera-wander` | inside one shot the camera pans or pushes one way and back at slow speed; or it never rests | the old aimless float. Fix: hold the camera still, or one declared move that starts, travels and lands |
   | `carried-cut` | a declared velocity seam whose direction or speed breaks (cosine under 0.7, incoming outside 0.4-1.4× the outgoing, no decay) | the incoming shot opened from rest or the wrong way; use `carry()` / `handoffShot()` |
   | `dissolve-detect` | a rising mix of two different images, or a fade to black before the last 2 s | a crossfade between scenes; build a carried seam, or declare `dissolveUi` / `fadeEnd` where it belongs |
   | `still-cut`, `static-share`, `hold-into-exit` | cuts from still to still, too much of the body standing still, holds that do not accelerate into their cut | the camera parks; `intoCut()`, `launch()` |
   | `end-card` | nothing assembles in the 1.5 s before the end lock, or the card fades in | a lockup that is not a physical story |
   | `ghost` | a one-frame image neither neighbour has | `will-change` on a layer with an animated blur; a stale layer |
   | `border` | a 1-3 px sliver at an edge for several frames | a camera that exposes the stage edge; layers without overscan |
   | `judder` | whole-pixel stairs in a slow move | fractional left/top with a transform; text snapping at the tail of an ease |
   | `sharpness` | a one-frame blur step | an animated CSS blur on a large layer; use fixed defocus levels (`lib/defocus.ts`) |
   | `banding` | smooth gradients drawn as 8-bit plateaus | CSS gradients; use baked, dithered plates (`scripts/dither-gradient.py`, `ditherPlate()`) |
   | `smear` | compression smear: blotches of 1-level texture next to clean blocks on a flat field | an 8-bit dither the encoder half kept; re-run the blur with the current `accumulate.py` (`references/finishing.md` §5) |

2. **Hunt what the scripts cannot see.** Scan the watch sheets, then check suspects at full resolution:
   - z-order errors, and lifted items drawn under grounded ones;
   - clipped, overlapping or colliding text: a word space closed by overshoot, glyphs poking out of their cover;
   - elements that appear or vanish without a transition;
   - thin lines and small text that crawl or alias at small scale or under perspective;
   - faux italics from 3D shear;
   - motion-blur stamping and smears: visible discrete copies, or a streak longer than the object, on the fastest frames. On a blurred master, `fastest_frames` and `too_fast` in `out/samples.json` name them (so do `stats.mad_max_frame` and the biggest `burst` spikes); grab each at full size and crop 1:1. Check the blur policy first (`LOOK.blur`, `CAMERA_BLUR`): a crisp film's flat graphics are sharp on purpose; a move the camera policy cannot carry is a redesign (a cut on the accent, a match cut, a mask wipe, a shorter distance), not a sample-count fix.
   - designed artifacts that are not declared: a stepped layer, a one-frame flash, a jump frame; and declared ones that do not match the frames;
   - blur windows that cross a hard cut;
   - UI chrome cross-faded over a different shape (a double exposure);
   - colour shifts between preview and master: `probe.json` must show BT.709, tv range.
3. For each real issue, name the smallest fix in code, and name the frames that prove it is fixed.

## Rules

- Report only what you verified on real frames, with exact frame numbers. A flag number alone is not evidence.
- Do not re-report fixed issues. Do not propose adding text. Rank by impact per minute of fixing.
- Priorities: **P0** is visible on a key beat or breaks the story. **P1** is noticeable on a normal viewing, which includes a one-frame pop on a big area. **P2** is visible only on pause.

## Return

Return JSON only. `frame` is a number or an `"a-b"` range. `score` is 1 to 10 for technical finish. In `overall`, list the flags you judged designed (with the declaration to add) and the false positives, then end with `rubric: finish=N motion=N`.

```json
{
  "issues": [
    {
      "id": "lockup-two-frame-exit",
      "priority": "P1",
      "frame": "1920-1922",
      "problem": "what is wrong on those frames and why a viewer sees it",
      "fix": { "file": "src/acts/Act6.tsx", "change": "the concrete edit, with values" }
    }
  ],
  "overall": "verdict; designed flags to declare: --cuts 360-363; false positives: ...\nrubric: finish=4 motion=4",
  "score": 8
}
```
