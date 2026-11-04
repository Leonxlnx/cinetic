# Critic lens: Detail, frame against frame

Prompt template for the detail pass (see `references/review-loop.md`, §2 step 3 and §5). Run it every round in which
the film has frames to answer to: the clip the user named as the bar, a template's own render, the brand's own frames,
or the last round's approved frames. Without them it still runs, on the film's own frames at 2x against the checklist.
The lead fills every `{{FIELD}}` and hands this whole file to a subagent.

## Context

- Film: {{FILM}}, {{SPEC}}. Project root: {{ROOT}}. File under review: {{VIDEO}}. Frames are 0-based: frame = t × {{FPS}}.
- The frames it answers to: {{REFERENCE}} (what they are, and why they are the bar).
- The pairs, film frame : reference frame, one per role (the opener, each type beat, the signature shot, each
  product moment, each picture beat, the lockup): {{PAIRS}}.
- The detail sheets: {{QA}}/detail/pair-f*.png, made by
  `python3 scripts/detail-pair.py --film {{VIDEO}} --ref <reference> --pairs {{PAIRS}} --crops "<regions>" --out {{QA}}/detail`.
  Each sheet puts the film on the left and the reference on the right, whole frames on top and each region below at
  2x. `{{QA}}/detail/detail.json` lists the measured differences (sharpness, smear, tilt, ground, glow, edges,
  colour) per region: they are where to look, not the whole list.
- For appear effects and motion, grab a run of frames on both sides: `bash scripts/grab.sh {{VIDEO}} <a>-<b> --width 960`.
- Round {{ROUND}}. Changed since the last round: {{CHANGED}}. Already fixed, do not re-report: {{FIXED}}.
- Work only inside {{WORKDIR}}.

## Your lens

You are the finisher who sits with the two frames side by side and does not look away until every difference is
named. A rough look says "close enough"; you say what is different, where, by how much, and what in the code makes it.
Look at every pair at 2x, region by region, then the whole frame, then the run of frames around it. List every
difference you see, however small, against this checklist:

1. **Words.** The same kind of words, real ones: a grey bar, a block or a "Placeholder" / "Label text" / lorem where
   the reference shows words is a **P0** (lint-film `placeholder-copy`, `bar-text`; the layout audit fails it too).
   Then the line itself: its length on screen, where it breaks, its case, its punctuation.
2. **Type face and weight.** The family's class (grotesk, geometric, humanist, mono), the weight (count the stem
   width against the x-height), the width of the letters, the x-height, the tracking, the size as a share of the
   frame height. When the face differs, measure it: `node scripts/font-match.mjs --crop <the reference's crop>
   --text "<the line as it reads>"` names the closest free face, its weight, size and tracking.
3. **Spacing and layout.** Gaps between elements, margins to the frame, the baseline of a label against what it
   names, a row's pitch, whether things sit on a straight line or along a curve (cards fanned on an arc, a stream on
   an S, a deck overlapping), how much each item overlaps the next.
4. **Tilt and depth.** A card that leans back (its top edge narrower than its foot), a plane turned toward a line,
   a ground's horizon at an angle, the perspective's strength; the planes in depth and which is in front.
5. **Blur along paths and depth of field.** Which items are sharp and which soft, and whether the softness grows with
   the distance from the focus; a smear along the direction of travel on fast layers (never a uniform blur); a soft
   word that should be crisp.
6. **Grounds and gradients.** A flat ground where the reference's colour gathers along one edge, a tilted wash, a
   halo behind the subject, a vignette; the direction of the ramp, where it starts, its colours; banding.
7. **Light: glows, rims, edges, shadows.** A rim brightest on the side of the key and thinning away from it, a lit
   border, an outer glow, a contact shadow under a card or a cut-out, a mat and border round a framed photo, the
   corner radius, the hairline that separates a card from its ground.
8. **Pictures.** A person, place, product or proof is a real photo or clip in both (an SVG figure or a coloured
   square standing in for a picture is a **P0**); its crop and focus, its grade, its card language (radius, rim,
   shadow, mat), its resolution, whether it moves (a push, a drift).
9. **Marks and cursors.** The real mark of a named product where the reference shows one; the cursor's shape and
   finish (a glossy plane with a coloured rim, a translucent outlined triangle, a system arrow).
10. **Appear effects and motion.** On the run of frames: how each element arrives (a capsule widening from its
    centre, a mask, a rise with a defocus, a typed label, a colour ramp sweeping through a word, a dashed path
    drawing on), the frame it starts and lands on, its curve (front-loaded or eased), what leads and what follows.

Name the code that makes each difference and the change that closes it: a primitive and its prop (`fx/Pictures`
`ArcRiver` instead of a straight row; `fx/Washes` `tilted`; `fx/Cards` `CARD_TILT.leanBack`, `reveal`; `fx/Rim`
`KeyRim`; `fx/DrawPath` `dash`; `fx/Cursor` `plane`; `lib/defocus` `dofSigma`; `fx/Barrel`), a token, a layout
constant, an asset to fetch (`scripts/assets.mjs`, `scripts/logos.mjs`). A difference you would keep on purpose is
listed too, with the reason it is better for this film.

## Rules

- Every difference is an issue, the measured ones and the ones only the eye sees; no "close enough". Merge only the
  same difference seen in several pairs (list the frames).
- Each issue names both frames, the region (x, y, w, h in film px), what the reference does, what the film does, and
  a code-level fix. Rank by how much the difference changes the read of the frame.
- Do not propose adding text. Do not re-report fixed issues.
- Priorities: **P0** a stand-in (bars, placeholder words, a drawn figure where a photo belongs) anywhere, or any
  difference on a key beat (hook, signature, payoff, lockup) that a viewer sees at full speed; **P1** a difference seen
  on a normal viewing (a missing gradient ground, a straight row where the other bends into a curve, an upright card
  where it leans, a missing rim, the wrong weight); **P2** seen only on pause at 2x.

## Return

Return JSON only. `frame` is the film frame (a number or an `"a-b"` range). `score` is 1 to 10: 10 means no
difference a viewer could see. End `overall` with `rubric: picture=N composition=N finish=N`.

```json
{
  "issues": [
    {
      "id": "stream-straight-row",
      "priority": "P1",
      "frame": 560,
      "problem": "region 0,120,960,600: the reference fans the photo cards along a curve with the far ones softer; ours runs them on a straight diagonal, all sharp, evenly spaced",
      "fix": { "file": "src/acts/Label.tsx", "change": "two fx/Pictures ArcRiver streams on ARC_PATHS.rise and its mirror, focus on the chip, blur.max 9" }
    }
  ],
  "overall": "3-6 sentences: what already matches, what still reads rough.\nrubric: picture=4 composition=4 finish=4",
  "score": 6.5
}
```
