# Review loop

How to critique a render and decide whether it ships. The default is §1: one round on a contact sheet, one director pass against the checklist, the fast gates, and a second round only when a gate fails. §2 onwards is the long review (the critic lenses, the verify pass, the detail pass, the design-off, the rubric): optional, for when the user asks for a deeper review or a problem will not yield. Read §1 at the review step, and the rest whenever a script flags something you do not understand.

The numbers here are proven defaults from building and shipping films, not dogma. Tighten or loosen them for a film with a reason, and write the reason down.

## Contents

1. [The default review](#1-the-default-review)
2. [The long review, step by step (optional)](#2-the-long-review-step-by-step-optional)
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

## 1. The default review

One round on the draft, then the master, on the time plan in SKILL.md (a whole draft with its ending by 45 % of the
budget, the final started by 70 %, never a cut film).

1. **Render the draft** (`bash scripts/render.sh Film out/draft.mp4 --draft`: the whole film at half size, a fast
   encode, the sound under it, `out/qa/draft-sheet.png`). The ending was already looked at as stills
   (`node scripts/frames.mjs end`). A draft with no sound (`out/qa/SILENT`) is a picture test, never the film: the
   track is picked and fitted before the picture is timed, and `npm run sound` mixes the kit before the review.
2. **The fast gates**, each seconds to a minute on a 30 s film: `npm run gates` (`forensics.py out/draft.mp4 --cues
   out/cues.json --grammar-only`: the sound, cuts that hide themselves, ghost and torn cuts, empty frames and stalls,
   frozen holds, legibility, the ending, the world, and in a spine film the element in its box across every handover,
   undeclared swaps and the pixel loop; `copy-check.py --ui src`; `logos.mjs check`), `grid-check.ts` (the
   text-then-cards loop, the brief's length, the spine: the element carrying the changes, one case, lines alone only at
   the ends), `lint-film.mjs src`, `precheck.mjs` (the cast, the case), `look-audit.py out/draft.mp4 --look` (no
   flat void, no plain card slab), `layout-audit.sh Film --cues --scale 0.5` (placement, overlaps, text cut by the
   frame in the product beats, kit icons, stand-ins), `film-diff.mjs` (`references/checks.md` §1 lists them in order).
   A gate that costs more than 5 minutes on a 30 s film is advisory.
3. **One contact sheet, cut from the draft**: `node scripts/frames.mjs sheet --from out/draft.mp4` (16 labelled tiles;
   `--frames A-B --every N` for one act, `grab --from out/draft.mp4 <frames>` for full frames). No per-frame stills.
4. **The director pass** (`assets/critics/director.md`): the picture beats read with the words ignored first (what
   does the product do in each?), then the checklist: words in the middle, line then picture, one voice and quiet
   emphasis, seams that flow, clean UI, current marks and a centred end card built from the last element, its own film
   against the last three, plain words, less text, the picture telling it, colour, premium rather than merely clean,
   and the time left. Run it as a subagent with the filled template, or yourself with the sheet open before the code.
   The tells a blind reviewer finds first, each with its frames: the product's main act skipped (a cut from the request
   to a finished result) or its output bare (no picture of the brief's subjects); data that contradicts itself when
   paused (the newest card in front showing the oldest time, a count and a total that cannot both be true); a name on
   someone else's face, one face for two people; the same type device on every line (one size, one build, the accent
   on the last word each time); type that does not read against its ground; a cut that swaps the subject while it is
   still sharp in frame, a cross-fade of two scenes; an empty or stalled frame; a frozen hold over a second; the end
   card drifting off centre to the last frame; a world that is one still photograph or murk; a shot without the
   habits of standard 10 (a sharp plane and its falloff, a camera move that lands, light from a source, a real
   material, real content in quantity); the music cut at the end.
   Two tests on the sheet, before the checklist:
   - **The chain sentence.** Write the cut film as one line, "A becomes B becomes C ...", the element's form in each
     tile (the request typed becomes the page, the page's Publish becomes the live pill, the live pill becomes the
     first sign-up, the sign-ups become the count, the count becomes the mark). Every "then" between two tiles is a
     join still to design: a cut where the element should grow, shrink, swell and swap, fly or be zoomed into; a film
     that needs "and also" is two films, cut one. `chainSentence()` (lib/spine) prints the plan's own sentence:
     the sheet must read the same.
   - **The covered words.** Cover the text in six frames (one per act and the end) and ask: what is the one action,
     and which case runs through it (the same request, names and numbers)? If a stranger cannot say it, the picture
     does not tell it: the product's own words and the element carry the middle, the lines only promise and claim.
   The words a blind critic uses, and the gate that catches each: "text then cards" (grid-check `text-then-cards` and
   `spine-carry`; forensics `text-then-cards` and `swap`), "a checklist of strong moments" (grid-check `checklist`,
   `spine-case`), "no world that belongs to the product" (look-audit `flat-void`; forensics `world-still`,
   `world-murk`), "plain card slabs" (look-audit `card-slab`), "the product never does its job in motion" (grid-check
   `spine-carry` inside acts, forensics `spine-track`), "a lockup cut in from a picture" (grid-check `spine-end`).
5. **Fix** in order of impact per minute: every P0, then the P1s the time allows, then the draft again (only the parts
   whose source changed re-render).
6. **A second round only when a gate fails or a P0 was fixed**; otherwise go to the master. Stop after three rounds.
7. **The master** (`bash scripts/render.sh Film out/film.mp4 --max-min 9`, rerun until exit 0; `--blur` when the film's
   policy asks), started by 70 % of the budget; out of time, `--from-draft out/draft.mp4` is the delivery. It gets a check, not
   a round: full `forensics.py` on it, `probe.py` and `check-sync.py` (render.sh runs both), the sound gates, then
   `film-diff.mjs --record`.

Advisory, never a ship gate in the default review: `grammar-score.mjs` (it rewards the house grammar, not this film's),
`look-audit.py`'s full run (its floors are a useful read of a flat film; its `--look` read is the default look's
gate above), `measure-speed.py`. The blind pair test, the detail pass,
the four lenses, the verifier and the 12-dimension rubric belong to the long review.

### Rounds in the long review

- **Launch films and walkthroughs** get at least 2 rounds. **Stings and loops** need 1 round if every script passes.
- Stop after 5 rounds, or as soon as the long ship gate in §10 is met. Past that point, scores flatten and fixes start to fight each other.
- Round 1 runs four lenses: director, forensics, sound-sync and art-copy-ui. Later rounds drop art-copy-ui unless copy, type, colour or UI changed.
- **Every long round runs the detail pass** (§2 step 3, the detail lens in §5): matching frames side by side at 2x, every
  difference listed and fixed or answered.
- **A dev round can render every 4th frame.** The `FilmEvery` composition is the film sampled (`step` 4 by default,
  `offset` 0; the next round `--props='{"step":4,"offset":2}'`): a whole-film check at half size in about a quarter of
  the time, with a paired sheet that still shows every move. Judge timing and spacing on it, motion on a preview.
- **Every critique round reviews a draft** (`render.sh --draft`, or a full-size `--preview` for banding and small type), which carries the same BT.709 tags as the master, so colour judgements carry over. Drafts are minutes; a blurred master is tens of minutes, and blurring a film that is still changing wastes them.
- **The blurred master is rendered once, after the last critique round, and gets a check, not a round:** `forensics.py` and `av-audit.py` on the master, the fastest frames at full size (`fastest_frames` in `out/samples.json`, printed by `render.sh`), and a quick director glance at the watch sheets for stamped copies, smears and blur across cuts. If that check finds a problem in one act, re-render that act's range and splice it (§7) rather than re-blurring the film.

## 2. The long review, step by step (optional)

Keep each round in its own folder, so later lenses can be told what changed:

```
out/qa/round-2/
  forensics.json  banding.png  smear.png  av.json  score.json   script reports
  listen.json  sound_sheet.png                         earshot's listening pass (when installed)
  watch_01_f0-239.png ... legibility.png               sheets
  director.json  forensics-lens.json  sound.json  art.json
  verified.json  fixes.md                              verdicts, and what you changed
```

1. **Render.** Run `bash scripts/render.sh Film out/preview.mp4 --preview`. It mutes Remotion, muxes the WAV with ffmpeg, and gates on `check-sync.py` (lag ≤ 48 samples, true peak ≤ −1 dBTP after AAC) and `probe.py` (spec and tags). Those reports land in `out/qa/sync-preview.json` and `out/qa/probe-preview.json`. Rebuild the sound with stems first, so the audit below can be strict: `python3 scripts/audio/score.py --cues out/cues.json --score audio/score.json --out public/audio/soundtrack.wav --stems out/stems --json out/qa/round-2/score.json`.
2. **Measure.** Run the two audits, and the listening pass when earshot is installed:
   ```bash
   R=out/qa/round-2
   python3 scripts/forensics.py out/preview.mp4 --cues out/cues.json --json $R/forensics.json
   python3 scripts/av-audit.py out/preview.mp4 --cues out/cues.json --stems out/stems --json $R/av.json
   python3 scripts/audio/listen.py --video out/preview.mp4 --out $R    # listen.json + sound_sheet.png
   bash scripts/layout-audit.sh Film --every 6 --json $R/layout.json
   python3 scripts/look-audit.py out/preview.mp4 --cues out/cues.json --layout $R/layout.json --json $R/look.json
   node scripts/grammar-score.mjs --cues out/cues.json --layout $R/layout.json --look $R/look.json --forensics $R/forensics.json
   ```
   `look-audit.py` holds the two floors against a flat film (motion and picture) and the look checks; `grammar-score.mjs`
   scores the film's grammar against the house's (or a clip's, `--target out/like.json`) and appends to
   `out/grammar-score.json`, so the loop shows its progress. Write the weakest dimension and the weakest floor reading
   into `fixes.md` and fix those first (`references/checks.md`).
   Each prints a summary, writes JSON, and exits 0 when no check fails (`listen.py` always exits 0, and writes `"listened": false` with the reason when earshot or its models are missing; `references/sound.md` §9.1). Add `--declare qa.json` to forensics once you have declarations (§3), and `--loop` for a loop.
3. **Sheets.** Make the watch sheets and a legibility sheet:
   ```bash
   python3 scripts/sheet.py out/preview.mp4 --chunks 4 --rate 12 --cues out/cues.json --out $R/watch.png
   python3 scripts/sheet.py out/preview.mp4 --every 60 --width 480 --out $R/legibility.png
   ```
   The first command writes one sheet per 4 s chunk at 12 fps, each about 1950 × 850 px with 48 labelled tiles. The second writes one frame per second at phone size. For one act before the full film exists, use `sheet.py --comp Act3 --every 2 --offset <ACT.x.from>`; to tile stills or frames you already have, `sheet.py --images out/stills/*.png --out ...`.
   **Feed-size strips.** Then read the film the way it is met, small and fast: six frames over 2.5 s at 240 px wide,
   one strip for the opener, each signature beat, every type beat and the lockup (at 60 fps `--every 25` over 150 f):
   ```bash
   python3 scripts/sheet.py out/preview.mp4 --from <f> --to <f+149> --every 25 --width 240 --cols 6 --out $R/strip-<beat>.png
   ```
   Judge each strip on its own before the full frames. A strip whose 4-6 frames look the same is a held frame (the
   picture changes inside 2.5 s, `grid-check picture-change`); a word that cannot be read, a curve that crumples or
   a signature that reads as an overlay on a still is too small. Signature minimums at feed size: the change moves 15 %
   of the frame height or more, strokes are 8 px or more and data labels 48 px or more at 1080p.
   **The blind pair test** (every round from round 2, and before the ship gate): cut ten 2.5 s moments of the film
   (the opener, the signature beats, a type beat, a product moment, the lockup) and ten moments of the same roles from
   the clips the user named as the bar (or the `like.py` clip); render each as a 6-frame strip at 240 px, no audio,
   names and brand words hidden, files renamed by hash, A and B in random order. Give the ten pairs to a subagent with
   no brief and ask, per pair, which one was made by the film and what gave it away. If it picks the film in more than
   7 of 10 pairs, its list of giveaways (held frames, texture everywhere, small or skewed type, timid colour, stand-in
   UI, a camera that never locks, busy edges) is the brief of the next round, ahead of the lens issues.
   **The detail pass** (every round). A rough look passes what a detail look fails: photos on a straight row where the
   bar fans them along a curve with the far ones softer, a flat ground where its colour gathers along one edge, an
   upright card where it leans back, an edge with no rim, a grey bar where it shows words, a drawn face where it shows
   a photo, a wrong appear effect. Choose the frames the film answers to (the clip the user named as the bar, a
   template's own render, the brand's frames, the last round's approved frames) and pair one film frame with one of
   theirs per role: the opener, each type beat, the signature shot, each product moment, each picture beat, the lockup.
   Then put them side by side, whole and at 2x on the regions that matter (the type, a card's edge, the ground's far
   side, a picture, a cursor):
   ```bash
   python3 scripts/detail-pair.py --film out/preview.mp4 --ref <the frames> --pairs 120:88,240:201 --crops "x,y,w,h;..." --out $R/detail
   ```
   It writes one sheet per pair and `detail.json` with the measured differences (softer or crisper, a smear along a
   direction, a tilt, a gradient ground against a flat one, a glow, a busier or emptier region, the colour). Then the
   detail lens (`assets/critics/detail.md`) reads every sheet and lists **every** difference it sees, measured or not:
   type face and weight, spacing, tilt, blur along paths, gradients, glows, rims and edges, pictures, marks, cursors,
   and the appear effects on a run of frames each side (`bash scripts/grab.sh`). Fix each one or write why the film's
   version is better, re-render the pair and run the pass again until nothing a viewer could see stays open. With no
   frames to answer to, run the lens on the film's own frames at 2x against the same checklist.
4. **Read the flags yourself first** (§4), for five minutes, after the feed-size strips. Declare what is designed (§3) and re-run, so the lenses see only real candidates.
5. **Run the lenses** (§5) as parallel subagents with the filled templates. If the harness has no subagents, or usage is tight, run them one after another in your own context (at the least the director and art lenses; the scripts cover forensics and sync), and open each lens's sheets *before* reading any code: the code tells you what you meant, the sheets show what you made.
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

- Its spike classes: `pop`, `seam-pop`, `jump`, `jump-hit`, `pop-in`, `hit`, `region-hit`, `motion`, `burst`, `busy`, `cut`. `pop`, `seam-pop` and `jump` fail, `hit`, `jump-hit` and `pop-in` warn. The rest are information: fast designed moves that the flow test, the run length or a cue explains.
- `crossings` counts fast elements that jump with no overlap between frames. On a master with blur this is normal. On a sharp render it lists where blur is needed (see `references/finishing.md`).
- `stats.energy_per_second` is the pacing curve. A value near 0.1 reads as a stall, and a long flat run reads as flat energy. Give it to the director lens.

**`av.json`** contains:

- `sync`: the hit rate, the median and p90 offsets in frames, `misses`, and `stray_sfx_onsets_f`.
- `apex`: whoosh peaks against their frames.
- `visual`: picture peaks against sounds; the film's 3 biggest picture changes (`biggest_changes`), with a suggestion for any that has no audio onset, music or effect, within ±3 f (a section change or the hero reveal wants the music's own event; an ordinary cut needs no sound); loud sounds on a still picture; landing sounds (land, pop, tock, bell, snap, hit, drop) that come after the picture has already stopped moving (`late_sounds`): cue them on the readable frame instead.
- `loudness` (with the target it gated against and where that came from), `clicks`, `head`, `tail`, and `masking`, which is present only with stems.

Run av-audit with `--stems`. Only then is sync gated, because in the full mix the music hides quiet and soft-attack effects. With the full mix, a low hit rate is only a warning.

**What a good film looks like.** On the worked example's film (33 s, 1980 frames, motion-blurred master), forensics passes with 12 warnings, and each one is explainable:

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
| Director | `director.md` | watch sheets first, then `out/direction.json`, the code and energy stats | idea, hook, picture, composition, motion, transitions, pacing |
| Forensics | `forensics.md` | `forensics.json`, flagged frames at full size, banding sheet | finish, motion |
| Sound and sync | `sound-sync.md` | `av.json`, `score.json`, `sync-*.json`, `audio/score.json` | sound |
| Art, copy, UI (round 1, or when these changed) | `art-copy-ui.md` | legibility sheet, grabs of every `COPY` line, layout-audit JSON | copy, color, composition, product |
| Detail (every round) | `detail.md` | the `detail-pair.py` sheets at 2x and `detail.json`, frame runs each side | picture, composition, finish |
| Verifier (§6) | `verifier.md` | one to five P0/P1 issues, their frames and their code | none |

**Filling a template.** Replace every `{{FIELD}}`:

| Field | Value |
|---|---|
| `FILM`, `LOGLINE` | the film's name and its one-line idea |
| `SPEC`, `FPS` | for example `1920x1080@60, 30 s, 100 BPM, pace: calm` and `60` |
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
| `REFERENCE`, `PAIRS` | detail only: the frames the film answers to and why, and the film:reference frame pairs |

**Prompt rules that pay off.**

- Say what changed, so it gets checked hardest.
- Say "Do not re-report fixed issues", or every round re-litigates old notes.
- Ask the creative question every round: **is the picture doing something a template would not?** A film that is clean, synced and correct but could be any product's is not finished.
- Say "Don't propose adding text": critics reach for captions when a picture does not read, and the fix is the picture. Do let them propose rewriting a vague line in plain words, cutting a line to 2-7 words, and giving two lines that share an animation different ones, which are fixes of the same kind.
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
| **Copy and type** | no line says what the product is by 3 s, vague or fancy words, a keyword pile, labels, bullets, a line over 7 words, two lines at once, mixed fonts | plain lines, but clever before clear, or lines that all arrive the same way | what it is by 3 s, then one concrete thing it does a line while the UI shows it, the name and what to do (2–7 words, at least 8 f per word in a reveal), every line on the film's one text voice, quiet emphasis (colour on the key word, at most 60 % of lines), one family on one token set, zero collisions | art lens; `copy-check.py`; `grid-check.ts` script, words, holds and text flow |
| **Colour and brand** | a monochrome accent wash, neon, decorative gradients or glow, beige defaults; the starter's look | disciplined, but generic: the accent carries no meaning, or the brand has no personality | a look of its own from the brand's personality (or the supplied kit); one dominant accent with one meaning over neutral grounds; spectral, gradient and glow only inside devices; no banding; an ownable mark | art lens; look-audit colour checks; banding sheet; the mark sheet |
| **Picture** | flat: grey cards on a plain ground, a parked camera, a sampler of devices; or everything on texture, busy to the edges | tidy and moving, but thin: one plane, no light event, generic shapes where the product's UI or world belongs | clean and alive: the product's UI doing the thing, graphic effects or a lit world, depth planes, light that moves, type beats on clean fields, one signature shot, two or three moves done well; both floors pass and the picture target is met | look-audit floors and `picture` readings; watch sheets; `out/direction.json` |
| **Composition** | text flush left at the top or bottom, text on top of a big picture, voids | correct, but framing errors or crops that slice glyphs | statements centred in the middle band, pictures bleeding past an edge, one focal point per shot, headroom kept, type at film size | layout-audit placement; legibility sheet |
| **Motion** | uniform fades and bounces | good eases, with pops or stalls | named curves, weight, zero-slope landings, contact squash | director; forensics spikes and stalls |
| **Transitions** | crossfades and presets | motivated, but with repeats | built from what is on screen: exit-then-enter and text-swap on a kept ground, match cuts, velocity cuts, shared elements; every hard cut carries a device; no kind over 40 % of the changes; at most two ground flips | director; `SEAMS`; grammar-score `seams` |
| **Pacing** | frozen holds, cramming, or text racing the picture | even, with flat energy, or text on nearly every frame | text and picture take turns; every read held, with slow life in it; a calm cruise between a few clear peaks; results held long enough to land | energy curve; holds and quiet flags; `text-share` and `word-rate` |
| **Product truth** | a fake dashboard | real UI, but it shows only the naive version of the feature, or data or states contradict the story | the feature's non-obvious behaviour, shown; data that agrees with itself and with the story (roles, sums, ratios); state changes animate, counters count during the action | art lens; pause test; the story asserts in `data.ts` |
| **Sound and sync** | stock effects, generated music, no music, or out of lock | a licensed track, but effects masked, ducked or out of key, or cuts on the bar grid | a licensed track cut to the picture with structure on its events, every effect within ±1 f at its level over the bed, stop-downs before the hits, one element at the lockup, on its LUFS target (−14; −16 for a sting of 8 s or less) and −1 dBTP | `av.json` strict; `score.json`; sound lens |
| **Finish** | pops, ghosts, jitter or banding | occasional P1-level artifacts | zero failing forensics checks, explained warnings, clean blur, BT.709 tags | `forensics.json`; `probe` |

Formats without some dimensions score them against the format's own recipe in `references/formats.md`: a muted loop scores Sound and sync as N/A, and a sting's Product truth is its mark.

## 10. Severity and the ship gate

**Severity.**

| Level | Meaning | Examples |
|---|---|---|
| **P0** | visible on a key beat (hook, payoff, logo, end card), or it breaks the story or a fact, or it breaks a hard ban anywhere (`SKILL.md`; HB1–HB11 in `references/taste-and-slop.md`) that `BRIEF.md` does not list as brand-supplied | the lockup vanishes in 2 frames; a typo on the payoff; audio 3 frames late; the device blinks out at a seam; an eyebrow label, an orange glow or a serif caption on any frame |
| **P1** | noticeable on a normal viewing | a one-frame pop in the middle of an act; a 2.7 s dead logo hold; a masked hit; a stall at a seam |
| **P2** | visible only on pause | a 1 px sliver for 3 frames in a fast move; a label 2 px off its grid |

**Ship gate (the default review).** Every condition must hold:

- the fast gates of §1 pass: `copy-check.py --ui src`, `grid-check.ts`, `lint-film.mjs --strict`, `layout-audit.sh`
  (placement and its placeholder checks), `forensics.py` on the master (0 fails), `probe.py`, `check-sync.py`,
  `logos.mjs check` for a film that shows other products' marks, `film-diff.mjs`, the sound gates and `credits.py`;
- the director pass has no open P0, and every checklist item reads yes (or is answered in `fixes.md`);
- with a clip to match: `like.py guard` passes (`references/clip-match.md`).

**Ship gate (the long review).** When the user asks for the long review, every condition must hold:

- every rubric dimension is at least 3, Picture at least 4, Finish and Sound and sync are 5, and the mean is at least 4.2;
- there is no open verified P0;
- every script passes: `probe.py`, `check-sync.py`, `forensics.py` (0 fails; every warning explained in `fixes.md`), `av-audit.py --stems` (0 fails), `lint-film.mjs --strict`, `grid-check.ts`, `layout-audit.sh` (its placeholder checks included: no stand-in words, grey text bars or drawn figures in the render) and `copy-check.py --ui src` (the product's UI strings are real words);
- the detail pass has no open difference a viewer could see (every one fixed, or answered in `fixes.md`);
- `look-audit.py` passes with both floors (motion and picture);
- `grammar-score.mjs`: mean ≥ 80, no dimension under 70 (advisory in the default review);
- the sound gates (`references/sound.md` §2: a licensed track with a valid record, every effect from the kit, over-bed levels, stop-downs, no ducking, clean joins, one element at the lockup, loudness) and `credits.py`;
- with a clip to match: `like.py guard` passes (`references/clip-match.md`).

When the gate is met, or the rounds are used up (three in the default review, five in the long one), ship. In the hand-off, say plainly what you would still change.

## 11. Recurring issue classes

Look for these first; 10 to 13 are the ones scripts catch least well.

| # | Class | How it shows | First fix | See |
|---|---|---|---|---|
| 1 | Seam pops and duplicate frames | `seam-pop` or `stall` at an act start; the device blinks | match every property across the cut; show the rest pose once | `references/transitions.md` §3 |
| 2 | Sound on the settle, not the pop or contact; whooshes off the velocity peak | av-audit misses and `apex` warnings; picture peak 3-8 f from the sound | cue with `hit(…, 0.5)` for pops, `0.92`–`1.0` for contacts, `peak()` for whooshes | `references/timing-grid.md` §7 |
| 3 | Dead stretches and an aimless camera: a hold where nothing changes for 2.5 s; a camera floating one way and back | `dead-stretch` / `motion-frozen` fail, `camera-wander` flags | let the product change in the hold, or shorten it; hold the camera still or give the shot one declared move that lands (never a float to fake life) | `references/camera.md` §7 |
| 4 | Collisions from overshoot or moving targets | glyphs or pieces touching for a few frames | clamp springs at the rest pose; lock the target before landing on it | `references/motion-tokens.md` §3 |
| 5 | Chromium artifacts | `ghost`, `judder`, `sharpness`, `banding`, `border` | the matching row of the table | `references/chromium-rendering.md` |
| 6 | Envelope shape: half-sines, fades on arrive curves | a pulse peaking late; a fade that pops in 1-2 frames (`hit` or `pop`) | `hitPulse`; exits at speed on a leave curve, a short fade only inside a moving exit | `references/motion-tokens.md` §10 |
| 7 | UI truth | a wrong weekday, stale labels, a counter that flips at the end, the past replanned | derive every label from the data module, with asserts | `references/product-ui.md` |
| 8 | Out-of-key or masked effects | `masking` warnings; over-bed outside ±2 dB; a pitched effect off the key | tune to the track's key; the effect at its `bed_db`; a stop-down before the hit (never a duck) | `references/sound.md` |
| 9 | Templated layouts | text left, phone or card right; text on top of a tilted card; a mark pill on every line | a centred line alone, then the product full frame (line, then picture) | `references/taste-and-slop.md` E |
| 10 | House-style convergence and oversimplified features | the film looks like the starter or Tessel; the proof would be true of a simpler product | three adjectives → choices, a mark sheet; rebuild the proof on the non-obvious behaviour | `references/brand-and-color.md` §2, `references/concept-and-story.md` §3 |
| 11 | Moves too fast to blur | stepped copies or long smears on the fastest frames of the master | a crisp blur policy for flat graphics; a declared `CAMERA_BLUR` range; or cut, match or mask instead | `references/camera.md` §12 |
| 12 | An empty picture, or everything on texture | the picture floor fails or misses its target; one plane; no light event; grey cards; type on relief, footage or grain with no clean field | the product's UI, graphic effects or a lit world, three planes, living light, a device per beat; type beats on a clean field or a dimmed, defocused plate (`references/imagery.md`, `references/lighting.md`) | `references/checks.md` §6 |
| 13 | A sampler, or one device everywhere | a new device every half second, or the same device on every beat | one device per beat, from many families; one signature shot | `references/devices/INDEX.md` |
| 14 | A monochrome accent wash | saturated pixels at the accent's hue on most frames; neutral share low | neutral grounds, the accent at its share, the pictures' own colour | `references/brand-and-color.md` |
| 15 | Rough detail: stand-ins and missing finish | grey bars or "Placeholder" for words, a drawn face or object for a photo, a straight row where the bar curves, a flat ground where it has a gradient, no tilt, no rim, the wrong appear effect | real words and real photos (`scripts/assets.mjs`), then the detail pass and its primitives (`fx/Pictures`, `fx/Washes`, `fx/Cards`, `fx/Rim`, `fx/DrawPath`, `fx/Cursor`) | §2 step 3, `assets/critics/detail.md` |

## 12. Thresholds

Every script threshold in one place. Most can be changed with the flag named in the Flag column. Change a threshold for a film only with a written reason; declare intent (§3) before loosening anything.

**`forensics.py`.** d = mean |ΔRGB| between frames at 480×270, area downscale.

| Check | Rule | Result | Flag |
|---|---|---|---|
| Spike candidate | d > 1.0 and d > 2.5 × median(d over ±4 f, excluding f) + 0.3; inside a 3×3 region the floor is 1.5 | classified below | `--spike-min`, `--region-spike-min`, `--spike-ratio`, `--spike-add` |
| Burst | the change is spread over ≥ 3 frames | info | `--burst-frames` |
| Jump | the flow explains a 1-2 frame change, but it is ≥ 8 × the frames around it (≥ 3.0) and no seam is there: the picture moved in one step (a sway or drift switched off, a keyframe restarting, a reflow) | **fail** (on a cue: warn) | `--jump-ratio`, `--jump-min` |
| Motion | optical-flow residual < 0.5 of the change | info | `--flow-explained` |
| Busy | region spike while the whole-frame change is > 0.15 × it | info | `--region-busy` |
| Seam pop | 1-2 frame, unexplained, within 1 f of an act start | **fail** | declare with `--cuts` |
| Pop-in | a region hit ≥ 6 × the frames around it (≥ 3.0): a chip, pill or card that arrives whole in one frame on its cue | warn | `--popin-ratio`, `--popin-min` |
| Hit | 1-2 frame, unexplained, within 2 f of a cue or event (whole frame) | warn | |
| Pop | 1-2 frame, unexplained, no cue | **fail** | |
| Stall | d < 0.05 between d > 0.8 on both sides | **fail** | `--stall-max`, `--stall-moving` |
| Hold, frozen | d < 0.1 for > 48 f, and 90% of those frames change < 16 px by > 24 levels | **fail** | `--hold-mad`, `--max-hold`, `--frozen-px` |
| Hold, quiet | the same run, but small elements move | warn; a fragment's reading hold whose text drifts or creeps lands here, and is fine when the run sits inside its `copy` window in `out/cues.json` | |
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
| `grid-check.ts` | beat is whole frames; acts contiguous; cues on the 16th grid or `offgrid:`; reading holds ≥ max(52, 36 + 7 f per word) (crisp: max(36, 28 + 6 f per word)); no gap without an event or a reading hold > 72 f (crisp: 48 f); words ≤ budget; `script` (every line 2–7 words, `copy-check.py` on `COPY`, one line on screen at a time); text flow: `fragment` (> 4 new words), `copy-concurrent` (> 8 words visible, > 5 in replace mode), `reveal-rate` (< 8 f per word), `chain-gap` (picture beat outside 26–90 f), `chain-beat` (no cue in the picture beat), `read-first` (two separate lines arriving together), `read-quiet` (a cue starting inside a read), `word-rate` (> 6.75 words in any 5 s; a script: > 12), `text-share` (copy on > 65% of frames, a script: > 85%, or no 90 f text-free run in 10 s); limits from the film's `PACE_NAME` (`--pace` overrides; in a calm film a short or empty picture beat, lines together and copy on > 75% fail) |
| `lint-film.mjs` | 0 errors: no CSS animation, no nondeterminism, no frame-driven left/top, tokens only, clamped interpolate |
| `layout-audit.sh` | no text outside the safe zone (the aspect's preset; `feed9x16` for 9:16), no overlaps, readable text ≥ 36 px in focus for more than 6 f, no frame with more readable film words than the pace allows (`words`; 8 when calm, `data-ui` strings counted apart), no text covered by a `data-mover`, no readable text (opacity ≥ 0.5) moving faster than 20 px/f from f to f+1, at 1080 px tall (`--speed`, on with `--cues`; `--max-text-speed`; text inside an active `DirBlur` smear is blurred along its motion and left out). A text drawn twice (a ghost under its colour copy, `Defocus`/`DirBlur` levels, `data-audit-copy`) is read once; the rows of a list scrolling through the frame (`data-audit-scroll`) may cross its edges and pass under the UI over it |
| `deliver.sh --loop` | the loop-seam rule above, on the delivered file |
| `measure-speed.py` | `too_fast`: frames over 80 px/f (`--too-fast`), a redesign warning; `short_shutter`: frames the samples can't cover |
| `score.py` | LRA ≥ 5 LU for films of 20 s or more; the payoff ≥ 2 LU over the median momentary loudness; the first 0.5 s within 12 dB of the median (soft hook); no effect starting inside the end fade (warnings) |

Contact sheets (`sheet.py`) and frame grabs (`grab.sh`) have no thresholds. They label frames as 0-based frame numbers at the file's real fps, which are the same numbers every report uses.
