# Review loop

How to critique a render and decide whether it ships: the round procedure, the critic lenses, the verify pass, the design-off for a weak act, the rubric, severity, the ship gate, recurring problems and every QA threshold. Read it at Step 7, and whenever a script flags something you do not understand.

The numbers here are proven defaults from building and shipping films, not dogma. Tighten or loosen them for a film with a reason, and write the reason down.

## Contents

1. [Rounds](#1-rounds)
2. [One round, step by step](#2-one-round-step-by-step)
3. [Declaring intent: cuts, freezes, ignores](#3-declaring-intent-cuts-freezes-ignores)
4. [Reading the reports](#4-reading-the-reports)
5. [The critic lenses](#5-the-critic-lenses)
6. [The verify pass](#6-the-verify-pass)
7. [Fixing](#7-fixing)
8. [Design-off for a weak act](#8-design-off-for-a-weak-act)
9. [The rubric](#9-the-rubric)
10. [Severity and the ship gate](#10-severity-and-the-ship-gate)
11. [Recurring issue classes](#11-recurring-issue-classes)
12. [Thresholds](#12-thresholds)

## 1. Rounds

- **Launch films and walkthroughs** get at least 2 rounds. **Stings and loops** need 1 round if every script passes.
- Stop after 5 rounds, or as soon as the ship gate in §10 is met. Past that point, scores flatten and fixes start to fight each other.
- Round 1 runs four lenses: director, forensics, sound-sync and art-copy-ui. Later rounds drop art-copy-ui unless copy, type, colour or UI changed.
- **Every critique round reviews a preview** (`render.sh --preview`), which carries the same BT.709 tags as the master, so colour and banding judgements carry over. Previews are minutes; a blurred master is tens of minutes, and blurring a film that is still changing wastes them.
- **The blurred master is rendered once, after the last critique round, and gets a check, not a round:** `forensics.py` and `av-audit.py` on the master, the fastest frames at full size (`fastest_frames` in `out/samples.json`, printed by `render.sh`), and a quick director glance at the watch sheets for stamped copies, smears and blur across cuts. If that check finds a problem in one act, re-render that act's range and splice it (§7) rather than re-blurring the film.

## 2. One round, step by step

Keep each round in its own folder, so later lenses can be told what changed:

```
out/qa/round-2/
  forensics.json  banding.png  smear.png  av.json  score.json   script reports
  watch_01_f0-239.png ... legibility.png               sheets
  director.json  forensics-lens.json  sound.json  art.json
  verified.json  fixes.md                              verdicts, and what you changed
```

1. **Render.** Run `bash scripts/render.sh Film out/preview.mp4 --preview`. It mutes Remotion, muxes the WAV with ffmpeg, and gates on `check-sync.py` (lag ≤ 48 samples, true peak ≤ −1 dBTP after AAC) and `probe.py` (spec and tags). Those reports land in `out/qa/sync-preview.json` and `out/qa/probe-preview.json`. Rebuild the sound with stems first, so the audit below can be strict: `python3 scripts/audio/score.py --cues out/cues.json --score audio/score.json --out public/audio/soundtrack.wav --stems out/stems --json out/qa/round-2/score.json`.
2. **Measure.** Run the two audits:
   ```bash
   R=out/qa/round-2
   python3 scripts/forensics.py out/preview.mp4 --cues out/cues.json --json $R/forensics.json
   python3 scripts/av-audit.py out/preview.mp4 --cues out/cues.json --stems out/stems --json $R/av.json
   ```
   Each prints a summary, writes JSON, and exits 0 when no check fails. Add `--declare qa.json` to forensics once you have declarations (§3), and `--loop` for a loop.
3. **Sheets.** Make the watch sheets and a legibility sheet:
   ```bash
   python3 scripts/sheet.py out/preview.mp4 --chunks 4 --rate 12 --cues out/cues.json --out $R/watch.png
   python3 scripts/sheet.py out/preview.mp4 --every 60 --width 480 --out $R/legibility.png
   ```
   The first command writes one sheet per 4 s chunk at 12 fps, each about 1950 × 850 px with 48 labelled tiles. The second writes one frame per second at phone size. For one act before the full film exists, use `sheet.py --comp Act3 --every 2 --offset <ACT.x.from>`; to tile stills or frames you already have, `sheet.py --images out/stills/*.png --out ...`.
4. **Read the flags yourself first** (§4), for five minutes. Declare what is designed (§3) and re-run, so the lenses see only real candidates.
5. **Run the lenses** (§5) as parallel subagents with the filled templates. If the harness has no subagents, run them one after another in your own context, and open each lens's sheets *before* reading any code: the code tells you what you meant, the sheets show what you made.
6. **Verify** every P0 and P1 (§6).
7. **Fix** in order of impact per minute (§7). Write `fixes.md`: each issue id, what changed, and which frames prove it.
8. **Score** the rubric (§9) from the lens scores and the verified issues, and check the ship gate (§10).

## 3. Declaring intent: cuts, freezes, ignores

The scripts cannot know what you meant. A designed flash transition looks like a pop to them, and so does a planned freeze on a silence. Declare these moments rather than raising thresholds, so real problems elsewhere still get caught. Every declaration needs a reason, and the lenses see the list.

| Intent | Flag | In `qa.json` (`--declare qa.json`) | Effect |
|---|---|---|---|
| Hard cut, flood or flash transition | `--cuts 600,836-840` | `"cuts": [600, [836, 840]]` | spikes overlapping ±1 f are class `cut` (info); ghosts next to it are skipped |
| Designed freeze or long read | `--freeze-ok 345-359` | `"freezes": [[345, 359]]` | holds, stalls and quiet runs inside are accepted |
| A deliberate glitch or effect frame | `--ignore 10-12` | `"ignore": [[10, 12]]` | every check skips those frames |

- Keep declarations in `qa.json` at the project root, and give each entry a reason in a `"why"` field, for example `{"cuts": [[836, 840]], "why": {"836-840": "red flood into act 4, on drop 2"}}`. The script ignores keys it does not use. Do not hand-edit `out/cues.json`, because every export rewrites it. If your export writes a `qa` block into cues.json, `--cues` reads that too.
- `forensics.py --cues out/cues.json` also takes two things from the cues:
  - act starts become **seams**, and a 1-2 frame change on a seam is a `seam-pop` (fail) unless it is declared;
  - every cue frame and sound event marks a designed **hit**, so a sudden change within 2 f of one is a warning, not a fail.
- A static end tail of up to 2 s (121 f at 60 fps) is always allowed (`--max-end-hold`), because it is where the audio decays.
- Do not declare your way to a pass. A freeze that is not on a silence, or a "cut" in the middle of a move, is still a problem.

## 4. Reading the reports

To inspect any flag, make a paired sheet of the frames around it with each frame's change from the one before, then grab full-size stills where detail matters:

```bash
python3 scripts/sheet.py out/preview.mp4 --frames 1737-1741 --diff --width 480 --out $R/f1739.png
bash scripts/grab.sh out/preview.mp4 1739 1740 --out $R/frames       # exact frames, full resolution
```

**`forensics.json`** contains `flags` (fails first), `checks` (every candidate with its measurements), `stats` (energy per second and per act, seam table, spike classes) and `declared`.

- Its spike classes: `pop`, `seam-pop`, `hit`, `region-hit`, `motion`, `burst`, `busy`, `cut`. Only `pop` and `seam-pop` fail, and `hit` warns. The rest are information: fast designed moves that the flow test, the run length or a cue explains.
- `crossings` counts fast elements that jump with no overlap between frames. On a master with blur this is normal. On a sharp render it lists where blur is needed (see `references/finishing.md`).
- `stats.energy_per_second` is the pacing curve. A value near 0.1 reads as a stall, and a long flat run reads as flat energy. Give it to the director lens.

**`av.json`** contains:

- `sync`: the hit rate, the median and p90 offsets in frames, `misses`, and `stray_sfx_onsets_f`.
- `apex`: whoosh peaks against their frames.
- `visual`: picture peaks against sounds; the film's 3 biggest picture changes (`biggest_changes`), with a suggestion for any that has no audio onset, music or effect, within ±3 f (a section change or the hero reveal wants the music's own event; an ordinary cut needs no sound); loud sounds on a still picture; landing sounds (land, pop, tock, bell, snap, hit, drop) that come after the picture has already stopped moving (`late_sounds`): cue them on the readable frame instead.
- `loudness` (with the target it gated against and where that came from), `clicks`, `head`, `tail`, and `masking`, which is present only with stems.

Run av-audit with `--stems`. Only then is sync gated, because in the full mix the music hides quiet and soft-attack effects. With the full mix, a low hit rate is only a warning.

**What a good film looks like.** On the shipped Tessel film (33 s, 1980 frames, motion-blurred master), forensics passes with 12 warnings, and each one is explainable:

- 8 banding warnings: a CSS radial wash in act 1, and soft gradients under the UI;
- one 0.9 s "quiet" hold at the hook, where only a hairline draws;
- one patch of whole-pixel stairs at 10.0 s;
- one 2-frame swell on its cue at 29.0 s;
- the 1.9 s end-card read.

With stems (and its cues in the events schema), av-audit passes: 158 of 165 onsets within ±2 f, median offset 0.00 f, p90 0.33 f, −14.1 LUFS, LRA 5.2 LU, −1.7 dBTP after AAC, no clicks, and a tail at −110 dBFS. Expect a finished film to look like this. Expect a first render to show a dozen real fails.

## 5. The critic lenses

The templates are in `assets/critics/`. Each ends with the same return schema:

```json
{"issues": [{"id": "", "priority": "P0|P1|P2", "frame": 0, "problem": "", "fix": {"file": "", "change": ""}}],
 "overall": "…\nrubric: dim=N …", "score": 7.5}
```

| Lens | Template | Reads | Owns (rubric) |
|---|---|---|---|
| Director | `director.md` | watch sheets first, then the code and energy stats | idea, hook, composition, motion, transitions, pacing |
| Forensics | `forensics.md` | `forensics.json`, flagged frames at full size, banding sheet | finish, motion |
| Sound and sync | `sound-sync.md` | `av.json`, `score.json`, `sync-*.json`, `audio/score.json` | sound |
| Art, copy, UI (round 1, or when these changed) | `art-copy-ui.md` | legibility sheet, grabs of every `COPY` line, layout-audit JSON | copy, color, composition, product |
| Verifier (§6) | `verifier.md` | one to five P0/P1 issues, their frames and their code | none |

**Filling a template.** Replace every `{{FIELD}}`:

| Field | Value |
|---|---|
| `FILM`, `LOGLINE` | the film's name and its one-line idea |
| `SPEC`, `FPS` | for example `1920x1080@60, 30 s, 120 BPM` and `60` |
| `ROOT` | the project root |
| `VIDEO`, `KIND` | the file under review, and whether it is a preview or the master |
| `QA` | `out/qa/round-N` |
| `WORKDIR` | a private folder per lens (`out/qa/round-N/work/<lens>`) |
| `ROUND` | the round number |
| `CHANGED` | a precise list from the last `fixes.md`: act, frames, what changed |
| `FIXED` | the ids and one-line summaries of every fixed issue so far |
| `BUDGET` | the fixing time left |
| `BRIEF` | `BRIEF.md`, word for word |
| `ISSUES` | verifier only: the P0/P1 issues as JSON |

**Prompt rules that pay off.**

- Say what changed, so it gets checked hardest.
- Say "Do not re-report fixed issues", or every round re-litigates old notes.
- Say "Don't propose adding text": critics reach for captions when a picture does not read, and the fix is the picture.
- Ask for a ranking by impact per minute of fixing, with the time left. Near the end, only small, safe, high-impact fixes are worth it.
- Batch images into sheets. Images are the expensive part of a critic's context, and one 48-tile sheet costs about the same as one still.

Keep each lens's JSON in the round folder. It is the record of what was checked, and the next round's `FIXED` list comes from it.

## 6. The verify pass

Critics are often confidently wrong: they report an effect that is invisible at speed, a seam that was declared, or a fix that would break sync. Before fixing anything, run `assets/critics/verifier.md` on every P0 and P1, one verifier per issue or per batch of up to 5 on one act, in parallel where possible.

A verifier tries to refute the issue from frames and code. It rejects the issue when it is:

- wrong;
- exaggerated, which demotes it;
- invisible at normal speed and on no key beat;
- already fixed;
- one whose fix would make the film worse.

It returns only confirmed issues, each with evidence (`VERIFIED: …`) and a corrected fix. It lists the rejections in `overall`. Merge the verified lists into `verified.json`. P2s skip verification and go into a backlog.

## 7. Fixing

- **Order.** Fix by impact per minute. Key-beat P0s first, then cheap P1s, then everything that shares a file with them. If two fixes pull against each other, for example a longer hold against the event-gap budget, the story wins.
- **Timing fixes go through the grid.** Change `src/timeline.ts` or the act's exported constants, then re-run `npx tsx scripts/export-cues.ts`, `score.py` and `grid-check.ts`. Never nudge a sound by hand to meet a late picture: move the picture.
- **Re-render only what changed.** Render the affected act with `render.sh Film out/actN.mp4 --frames A-B`, or render its per-act composition, and splice at a static seam frame (see `references/finishing.md` §7). Re-run forensics on the spliced file with `--from A-10 --to B+10`, so the splice seams are checked too.
- **Prove it.** Each fix in `fixes.md` names the frames that show it is fixed. The next round's `CHANGED` field comes from that file.

## 8. Design-off for a weak act

When one act stays at 2 or below on any rubric dimension for two rounds, or the director names the same act as the weakest 3 seconds twice, stop patching it. Redesign it in competition.

1. **Three designers, in parallel.** Each gets the brief, the treatment, the act's slot (frames, bars, the cues in and out, the device's state at both seams), the last two rounds' notes, and one bias:
   - **Story:** what must the viewer understand here, and what is the most direct image of it?
   - **Camera:** one continuous move, or a relay, that carries the idea.
   - **Rhythm:** start from the bars. Where do the peaks, the silence and the drop go?

   Each designer writes a frame-level beat sheet with columns frame | picture | camera | copy | sound. It must keep the seams, the device path and the word budget, and it must give an honest build estimate.
2. **One judge.** The judge scores each design 1 to 5 on four things:
   - **cinema**: would it make someone rewatch;
   - **clarity**: does it read muted in one viewing;
   - **restraint**: one idea, one focal action, no decoration;
   - **risk**: can it be built and made clean in the time left.

   The judge also:
   - checks every claim against the code, because designers promise things the engine cannot do cleanly;
   - re-estimates the time honestly;
   - picks a winner and grafts the best one or two ideas from the losers into it;
   - writes a cut list: what the new act drops.
3. **Build the winner** as a fresh act file behind the same composition id, then run a full round on it.

A design-off costs about one round. It is cheaper than a third round of polishing an act whose idea does not work.

## 9. The rubric

Score each dimension 1 to 5. The anchors are for 1, 3 and 5, and 2 and 4 sit between them. The lead sets the final score per dimension. Start from the owning lenses' `rubric:` lines, take the lower score where lenses disagree, and cap a dimension at 3 while it has an open verified P0.

| Dimension | 1 | 3 | 5 | Evidence |
|---|---|---|---|---|
| **Idea and device** | a feature tour | a clear idea, but the device drops out, or the film would be just as true of a simpler product | one idea specific to this product that reads muted; the device is an object this product owns, survives every cut and resolves (into the mark, or in a loop or product video into the product's finished state) | watch sheets with the sound off; the specificity answer in `TREATMENT.md` |
| **Hook (0–2 s)** | a blank or static frame | motion, but the problem lands after 2 s | frame 0 composed and moving; the problem felt by 1 s | first watch sheet; `energy_per_second[0:2]` |
| **Copy and type** | labels, bullets, more than 35 words, mixed fonts | clean but generic lines | at or under budget, lines that pay off the film's own words, one family on one token set, zero collisions | art lens; `grid-check.ts` words and holds |
| **Colour and brand** | gradients, neon, glass or beige defaults; the starter's or Tessel's look | disciplined, but generic: the accent carries no meaning, or the brand has no personality | a look of its own that follows from the brand's personality; one accent with one meaning at 8% or less, no banding, an ownable mark | art lens; banding sheet; the mark sheet |
| **Composition** | centred web layout, voids | correct, but framing errors or crops that slice glyphs | full-bleed, one focal point per shot, headroom kept | layout-audit; legibility sheet |
| **Motion** | uniform fades and bounces | good eases, with pops or stalls | named curves, weight, zero-slope landings, contact squash | director; forensics spikes and stalls |
| **Transitions** | crossfades and presets | motivated, but with repeats | velocity-matched cuts, relays and morphs, a signature move used 3 times | director; seam table |
| **Pacing** | dead holds or cramming | even, with flat energy | one peak per bar, calm between peaks, results held long enough to land | energy curve; holds and quiet flags |
| **Product truth** | a fake dashboard | real UI, but it shows only the naive version of the feature, or data or states contradict the story | the feature's non-obvious behaviour, shown; data that agrees with itself and with the story (roles, sums, ratios); state changes animate, counters count during the action | art lens; pause test; the story asserts in `data.ts` |
| **Sound and sync** | stock sounds, or out of lock | synced, but masked or out of key | every event within ±1 f and audible, tuned, the payoff loudest, on its LUFS target (−14; −16 for a calm brand or a sting) and −1 dBTP | `av.json` strict; sound lens |
| **Finish** | pops, ghosts, jitter or banding | occasional P1-level artifacts | zero failing forensics checks, explained warnings, clean blur, BT.709 tags | `forensics.json`; `probe` |

Formats without some dimensions score them against the format's own recipe in `references/formats.md`: a muted loop scores Sound and sync as N/A, and a sting's Product truth is its mark.

## 10. Severity and the ship gate

**Severity.**

| Level | Meaning | Examples |
|---|---|---|
| **P0** | visible on a key beat (hook, payoff, logo, end card), or it breaks the story or a fact, or it breaks a hard ban anywhere (`SKILL.md`; HB1–HB11 in `references/taste-and-slop.md`) that `BRIEF.md` does not list as brand-supplied | the lockup vanishes in 2 frames; a typo on the payoff; audio 3 frames late; the device blinks out at a seam; an eyebrow label, an orange glow or a serif caption on any frame |
| **P1** | noticeable on a normal viewing | a one-frame pop in the middle of an act; a 2.7 s dead logo hold; a masked hit; a stall at a seam |
| **P2** | visible only on pause | a 1 px sliver for 3 frames in a fast move; a label 2 px off its grid |

**Ship gate.** Every condition must hold:

- every rubric dimension is at least 3, Finish and Sound and sync are 5, and the mean is at least 4.2;
- there is no open verified P0;
- every script passes: `probe.py`, `check-sync.py`, `forensics.py` (0 fails; every warning explained in `fixes.md`), `av-audit.py --stems` (0 fails), `lint-film.mjs`, `grid-check.ts` and `layout-audit.sh`.

When the gate is met, or the 5 rounds are used up, ship. In the hand-off, say plainly what you would still change.

## 11. Recurring issue classes

Classes 1–9 are in order of how often they came up across five review rounds of a finished film; 10 and 11 are the ones blind comparisons caught that script checks don't. Look for them first.

| # | Class | How it shows | First fix | See |
|---|---|---|---|---|
| 1 | Seam pops and duplicate frames | `seam-pop` or `stall` at an act start; the device blinks | match every property across the cut; show the rest pose once | `references/transitions.md` §3 |
| 2 | Sound on the settle, not the pop or contact; whooshes off the velocity peak | av-audit misses and `apex` warnings; picture peak 3-8 f from the sound | cue with `hit(…, 0.5)` for pops, `0.92`–`1.0` for contacts, `peak()` for whooshes | `references/timing-grid.md` §7 |
| 3 | Dead holds: logo, post-hook, typing, end card | `hold` or `quiet` flags; energy near 0.1 for a second | a visible build: 10–20% dolly, 2.5% breath, eased-in drift; or shorten | `references/camera.md` §4 |
| 4 | Collisions from overshoot or moving targets | glyphs or pieces touching for a few frames | clamp springs at the rest pose; lock the target before landing on it | `references/motion-tokens.md` §3 |
| 5 | Chromium artifacts | `ghost`, `judder`, `sharpness`, `banding`, `border` | the matching row of the table | `references/chromium-rendering.md` |
| 6 | Envelope shape: half-sines, expo-out fade-outs | a pulse peaking late; a fade that pops in 1-2 frames (`hit` or `pop`) | `hitPulse`; fades of 10–14 f on `smooth` | `references/motion-tokens.md` §5 |
| 7 | UI truth | a wrong weekday, stale labels, a counter that flips at the end, the past replanned | derive every label from the data module, with asserts | `references/product-ui.md` |
| 8 | Out-of-key or masked effects | `masking` warnings; a pitched effect off the chord | tune to the chord root; +6 dB in band; duck the music | `references/sound.md` |
| 9 | Templated layouts | text left, card right; centred floating | full-bleed product, type on an eye line | `references/taste-and-slop.md` E |
| 10 | House-style convergence and oversimplified features | the film looks like the starter or Tessel; the proof would be true of a simpler product | three adjectives → choices, a mark sheet; rebuild the proof on the non-obvious behaviour | `references/brand-and-color.md` §2, `references/concept-and-story.md` §3 |
| 11 | Moves too fast to blur | stepped copies or long smears on the fastest frames of the master | keep elements under about 60–80 px/f; cut, match or mask instead | `references/transitions.md` |

## 12. Thresholds

Every script threshold in one place. Most can be changed with the flag named in the Flag column. Change a threshold for a film only with a written reason; declare intent (§3) before loosening anything.

**`forensics.py`.** d = mean |ΔRGB| between frames at 480×270, area downscale.

| Check | Rule | Result | Flag |
|---|---|---|---|
| Spike candidate | d > 1.0 and d > 2.5 × median(d over ±4 f, excluding f) + 0.3; inside a 3×3 region the floor is 1.5 | classified below | `--spike-min`, `--region-spike-min`, `--spike-ratio`, `--spike-add` |
| Burst | the change is spread over ≥ 3 frames | info | `--burst-frames` |
| Motion | optical-flow residual < 0.5 of the change | info | `--flow-explained` |
| Busy | region spike while the whole-frame change is > 0.15 × it | info | `--region-busy` |
| Seam pop | 1-2 frame, unexplained, within 1 f of an act start | **fail** | declare with `--cuts` |
| Hit | 1-2 frame, unexplained, within 2 f of a cue or event (whole frame) | warn | |
| Pop | 1-2 frame, unexplained, no cue | **fail** | |
| Stall | d < 0.05 between d > 0.8 on both sides | **fail** | `--stall-max`, `--stall-moving` |
| Hold, frozen | d < 0.1 for > 48 f, and 90% of those frames change < 16 px by > 24 levels | **fail** | `--hold-mad`, `--max-hold`, `--frozen-px` |
| Hold, quiet | the same run, but small elements move | warn | |
| End tail | a static run that reaches the last frame, ≤ 2 s + 1 f | allowed | `--max-end-hold` |
| Quiet | 60-frame mean d < 0.15, outside holds | warn | `--quiet-window`, `--quiet-mad` |
| Hook | the first 2 s move less than max(0.5, 0.5× the film's median 2 s window); for films of 6 s or less, the first 1 s under 0.5× the median 1 s; from frame 0, not loops | warn | declare a designed still read with `--ignore 0-119` |
| Still opening | the first 0.5 s window whose mean d passes max(0.03, 0.3× the median d of the film's moving frames) starts after 1.0 s (warn) or 2.5 s (**fail**); measured on the film's own scale, so a fine-line sting is not held to a product film's energy | warn / **fail** | `--freeze-ok 0-N` for a designed still |
| Ghost | differs from both neighbours by > 80 while they agree (< 30), on > 2000 px (full-res), nothing moving within 192 px | **fail** | `--ghost-delta`, `--ghost-px` |
| Border sliver | the outer 1-3 rows or columns differ by > 40 from rows 5-7, on > 25% of the edge, at a constant depth for ≥ 3 frames | **fail** | `--border-delta`, `--border-frac`, `--sliver-frames` |
| Judder | a 24 f window of a 256 px patch moving 0.08–0.9 px/f in whole-pixel stairs (rests < 0.15 px, ≥ 2 isolated 1 px jumps, phase-correlation response ≥ 0.7) | warn | `--judder-window`, `--judder-resp`, `--track x,y,w,h` |
| Sharpness step | a region's Laplacian variance changes ×3 in one frame, steady (< ×1.5) on both sides, and the region is otherwise calm (region d < 1) | warn | `--sharp-ratio`, `--sharp-min` |
| Banding | > 3% of the frame in 64 px tiles with a 1–12 level gradient drawn as flat plateaus (5×5 range 0 on 50–97%) with 1-level contours | warn | `--band-area`, `--banding-every` |
| Smear | on a flat field (≥ 1% of the frame, 17×17 range ≤ 3, 98% within ±2 of one value), 16 px blocks of 1-level texture (≥ 30% of pixels differ from a neighbour) next to clean ones (≤ 2%): smeared share of the frame (the lesser of the two × the field) > 0.2, sampled 2 per second on the exact luma plane; the `smear.png` sheet is a ×25 stretch (`references/finishing.md` §5) | **fail** on ≥ 2 samples, warn on one | `--smear-area`, `--smear-every`, `--no-smear` |
| Loop seam | last → first frame d ≤ max(0.4, 1.5 × median of the 8 steps at each end) | **fail** | `--loop`, `--seam-abs`, `--seam-ratio` |
| Determinism | per-frame d between two renders > max(0.3, 5 × median) | **fail** | `--against b.mp4` |

**`av-audit.py`**

| Check | Rule | Result | Flag |
|---|---|---|---|
| Sync (with `--stems`) | ≥ 90% of onset events (clustered within 2 f) have an onset within ±2 f: librosa backtracked, hop 128, delta 0.03, or a > 1 kHz 1 ms envelope rise ≥ 4× | **fail** | `--tol`, `--cluster`, `--min-hit`, `--onset-delta`, `--hf-ratio` |
| Sync (full mix) | the same rule | warn | |
| Systematic lag | \|median offset\| > 1 f | warn | |
| Stray effects | sfx-stem onsets with no event within 6 f | warn | |
| Apex | whoosh/suck (or `apexFrac`): 30 ms envelope maximum within ±3 f; risers and swells are listed only | warn (stems only) | `--apex-tol` |
| Visual | isolated events: the clear MAD peak within ±6 f sits −2…+3 f from the sound, or the picture changes on the sound by ≥ 35% of it | warn | `--vis-window` |
| Silent picture peak | a strong MAD peak (prominence ≥ max(1.5, 4 × median)) with no audio onset or sfx envelope peak within ±3 f | warn | `--peak-tol` |
| Loudness | integrated at the film's target ± 1 LUFS: `--lufs`, else `master.lufs` in `audio/score.json` (−14 by default, −16 for a calm brand or a sting), else −14 and −16 both pass; on an excerpt (audio shorter than the film) it is only reported | **fail** | `--lufs`, `--score`, `--lufs-tol`, `--no-loudness` |
| True peak | ≤ −1.0 dBTP, on the decoded track | **fail** | `--tp-max` |
| LRA | 3–8 LU | warn | `--lra` |
| Payoff | the loudest momentary window falls within 1.5 s after the `payoff` cue | warn | `--payoff <cue>` |
| Clipping | any sample at full scale | **fail** | |
| Clicks | > 14 kHz sample > 9× its 20 ms RMS and > 6× its 4 ms RMS, with ≥ 80% of that energy inside 1 ms | warn | |
| Tail | last 50 ms RMS ≤ −45 dBFS and last 10 ms peak ≤ −60 dBFS (fail); the last 0.5 s quieter than the one before (warn); skipped on an excerpt | **fail** / warn | `--tail-rms`, `--tail-peak` |
| Head | first 5 ms peak ≤ −40 dBFS: above it, sample 0 clicks (not faded in) or a sound already in progress cuts in mid-action; `master.py` fades in from zero over 3 ms, so a remaining flag is a sound begun before frame 0; skipped on an excerpt | warn | `--head-peak` |
| Masking (stems) | each effect ≥ +6 dB over the music in its best band (60 ms from onset); below 0 dB is flagged | warn | `--mask-db` |
| Duration | audio and picture differ by > 1.5 f | warn | |

**Other gates**, owned by their own scripts and listed here for the ship gate:

| Script | Gate |
|---|---|
| `probe.py` | size, fps, duration ±1 f, yuv420p, BT.709 tags with tv range, AAC 48 kHz stereo |
| `check-sync.py` | mux lag ≤ 48 samples at three points; true peak ≤ −1 dBTP after decode |
| `grid-check.ts` | beat is whole frames; acts contiguous; cues on the 16th grid or `offgrid:`; text holds ≥ 36 f + 6 f per word; no event gap > 48 f; words ≤ budget |
| `lint-film.mjs` | 0 errors: no CSS animation, no nondeterminism, no frame-driven left/top, tokens only, clamped interpolate |
| `layout-audit.sh` | no text outside the safe zone (the aspect's preset; `feed9x16` for 9:16), no overlaps, readable text ≥ 22 px (32 px in 9:16), no text covered by a `data-mover`, no readable text (opacity ≥ 0.5) moving faster than 20 px/f from f to f+1, at 1080 px tall (`--speed`, on with `--cues`; `--max-text-speed`) |
| `deliver.sh --loop` | the loop-seam rule above, on the delivered file |
| `measure-speed.py` | `too_fast`: frames over 80 px/f (`--too-fast`), a redesign warning; `short_shutter`: frames the samples can't cover |
| `score.py` | LRA ≥ 5 LU for films of 20 s or more; the payoff ≥ 2 LU over the median momentary loudness; the first 0.5 s within 12 dB of the median (soft hook); no effect starting inside the end fade (warnings) |

Contact sheets (`sheet.py`) and frame grabs (`grab.sh`) have no thresholds. They label frames as 0-based frame numbers at the file's real fps, which are the same numbers every report uses.
