# Evaluation

How cinetic was tested, what the results were, and what they do and do not show.

In short: across six judged rounds, cinetic met more of the written expectations than the baseline every time and won every house-style comparison. The neutral blind judge was split: 7 wins in 23 comparisons over the six rounds, and 2 of 4 in the last, on a snapshot of 1.1.0. Against the films of the previous version, 1.1.0's films won 5 of 8 blind comparisons. A cinetic run costs about three times the time and tokens of the baseline.

## Why evaluate a creative skill

cinetic asks an agent to do much more work than a plain attempt: invent a brand, score the sound, render motion blur and run review rounds. It also rules out a list of common looks. Any of these choices can be wrong. A rule that removes the generated look can also remove something viewers like. And a skill can make every film pass its own checks while people still prefer the plain version.

Part of the question can be measured. Is the file the size, frame rate and length the brief asked for? Is the loudness on target? Does the loop have a seam? Do the hits land on their frames? The rest is judgement, which needs a comparison against a real alternative, made by judges who do not know which film came from which process. The evaluation does both and reports them separately.

## The four briefs

[`evals/evals.json`](../evals/evals.json) holds four one-paragraph briefs, written the way a person would ask, each with a list of expectations the result is graded against. The films in the [README gallery](../README.md#gallery) were made from these same briefs.

| # | Brief (id in `evals.json`) | Format | Sound | Expectations |
|---|---|---|---|---|
| 1 | Ledgerly Auto-Split (`ledgerly-feature-loop`) | 10 s landing-page loop, 1920x1080 | none; autoplays muted | 12 |
| 2 | Kiln (`kiln-launch-teaser`) | 25 s launch teaser for X, 1920x1080, invented brand | yes | 15 |
| 3 | Halden (`halden-logo-sting`) | 6 s logo sting, 1920x1080, plus a transparent version, invented logo | yes | 15 |
| 4 | Quire Streaks (`quire-streaks-vertical`) | 12 s vertical video, 1080x1920, brand supplied | yes | 14 |

Six checks appear in every brief: a final MP4 at the expected size (1080x1920 for the vertical brief, 1920x1080 for the rest, which the Kiln and Halden briefs do not state); the duration within a tolerance (from ±0.25 s on the loop to ±1.5 s on the teaser); 60 fps; colour tagged BT.709; no motion stutter (frozen frames inside motion runs at most 1% of frames); and the hard bans respected, with exceptions for anything the brand supplied.

### 1. Ledgerly Auto-Split

A shared-expenses app's new feature splits a dinner bill between four friends, in a 10-second loop that has to work without sound. The expectations check:
- the loop seam: the change from the last frame to the first is at most 1.5x the median moving step, and under 3.0;
- that the proof shows something a naive version would not, such as per-item assignment or proportional sharing, rather than the total divided by four;
- that the numbers agree with the story: the shares add up to the total, whoever paid does not owe themselves, and the statuses are consistent;
- that no text is clipped or overlapping, UI text is roughly 20 px or larger, and the UI fills enough of the frame to read on a phone;
- that the UI looks like a specific app (named people, real amounts, consistent states), not a generic dashboard;
- that the delivery folder holds the deliverables at the top level and QA material in a subfolder.

### 2. Kiln

Invent the brand for a build cache that makes CI runs finish in seconds, and make a 25-second launch teaser with sound that should "feel like a well-funded company shipped it, not a template". The expectations check:
- sound: an audio track, true peak at or below -1.0 dBTP after encoding, integrated loudness of -14 ±1.5 LUFS, and hard cuts and the biggest moves landing on audio hits within about 3 frames;
- brand: a distinctive mark (not a letter in a rounded square, not a block and a dot) and a name lockup in the final seconds, plus a brand kit with the logo as SVG (light and dark), transparent PNGs and a square avatar;
- idea: one clear idea told visually, showing what the product does that a simpler one would not, that a stranger could describe with the sound off;
- copy: 35 on-screen words or fewer outside product-UI strings, with no stacked taglines or eyebrow labels;
- motion blur: no stepped or ghosted copies, and no smear longer than about a fifth of the frame.

### 3. Halden

Design the logo for a calm note-taking app and make a 6-second logo sting with sound, plus a transparent version for editors. The expectations check:
- files: an audio track, an alpha version, and the logo as PNG or SVG stills;
- sound: true peak at or below -1.0 dBTP, the audio decayed by the end (last 50 ms under -40 dBFS, no click), and a clear hit that lands as the logo resolves;
- the mark: ownable and derived from the name or the product, not the name set in a font;
- the hold: the logo fully resolved and readable for at least 1.5 s before the end, at roughly a quarter of the frame width or more;
- the reveal: no intermediate frame spells a different word.

This brief has no integrated-loudness check; for level, only the true peak and the tail are graded. cinetic masters short stings to -16 LUFS rather than -14.

### 4. Quire Streaks

A reading-tracker app ships Streaks next week. The brief asks for a 12-second vertical video for Reels and TikTok, with sound, showing a streak build over a week. It supplies the brand: ink `#1B1B1F`, paper `#FBF7F0`, accent `#3E7BFA`, typeface Manrope. The expectations check:
- sound: an audio track, true peak at or below -1.0 dBTP, -14 ±1.5 LUFS, and hits that land on visible events, while the film still reads with the sound off;
- brand: the supplied colours and Manrope used exactly, in code and in frames;
- the cream paper, which the hard bans would otherwise catch: it has to be kept, listed in `BRIEF.md` as brand-supplied, and marked `// cinetic:brand-supplied <what>` (for example `// cinetic:brand-supplied Quire paper`) so `lint-film.mjs` passes;
- the product: a streak visibly building over seven days in real product UI, with consistent dates and counts;
- layout: text and key UI clear of the top ~220 px and bottom ~420 px of platform chrome, and readable on a phone.

This is the brief that tests whether a supplied brand overrides the bans.

## Setup

Each round ran every brief with cinetic at the version under test and compared the result against a baseline:
- **with cinetic**: the agent pointed at a snapshot of the skill at the version under test and told to follow its SKILL.md;
- **baseline**: the same agent without cinetic, but with the official Remotion agent skills (`remotion-best-practices` and its companions).

The baseline films were made once (the first three briefs in round 1; the Quire Streaks brief in round 2, where it was first run, before it was added to `evals/evals.json` in 0.3.0), kept unchanged, and re-compared in every later round. They were re-graded in every round up to 5; rounds 6 and 7 reuse round 5's grades for them. Only the cinetic films were made again each round. Both setups got the same brief text, and judging started only after the runs had finished. Three judges looked at the outputs, and from round 6 a fourth comparison:

| Judge | Knows which film is cinetic's | Output |
|---|---|---|
| Expectation grader | yes; it reads each run's project files and notes, where the process shows | pass or fail for each expectation. Objective items (size, fps, duration, BT.709 tags, stutter, loop seam, loudness, true peak, the audio tail, and whether the audio, alpha and still files exist) are measured by script; the rest, including sync, are judged from frames, the audio and, where an expectation says so, the project files |
| Neutral comparator | no | a senior creative director persona that picks the better film of the pair and scores both on eight dimensions from 1 to 5 (idea, motion, type and layout, colour and brand, product truth, sound, finish, brief fit): 40 points, or 35 for a silent film, where sound is not scored |
| House-style comparator | no | the same comparison and rubric with a house style guide that restates the hard bans, plus the hard-ban violations it finds |
| Previous-version comparator (from round 6) | no | the neutral comparison again, but against the film the previous version (0.5.0) made for the same brief in round 5, to show whether the new version moved forward on its own terms |

For each pair, the two films were labelled A and B in a random order, and both comparators saw the same labels. The comparators saw only the delivered files, plus a contact sheet, sample frames and measured stats made the same way for both. They did not see the code, the agent's notes or the treatment, or which process made which film.

## Results

| Round | Version tested | Comparisons | Expectations met (cinetic vs baseline) | Neutral judge: cinetic wins | House-style judge: cinetic wins |
|---|---|---|---|---|---|
| 1 | 0.1.0 | 3 | 97.7% vs 80.3% | 0 of 3 | n/a |
| 2 | 0.2.0 | invalidated | not reported | not reported | not reported |
| 3 | 0.3.0 | 4 | 100% vs 74.8% | 2 of 4 | 4 of 4 |
| 4 | 0.4.0 | 4 | 55/56 (98%) vs 39/56 (70%) | 0 of 4 | 4 of 4 |
| 5 | 0.5.0 | 4 | 54/56 (96%) vs 41/56 (73%) | 2 of 4 | 4 of 4 |
| 6 | 1.1.0, first snapshot | 4 | 53/56 (95%) vs 41/56 (73%) | 1 of 4 | 4 of 4 |
| 7 | 1.1.0, second snapshot | 4 | 54/56 (96%) vs 41/56 (73%) | 2 of 4 | 4 of 4 |

Rounds 6 and 7 tested development snapshots of 1.1.0: round 6 the first build with the technique library and the recalibrated sound, round 7 the same after the round-6 fixes. The released 1.1.0 adds the fixes from round 7 (below), which have not been judged. Round 2 was invalidated by a harness problem, and its results are not reported. Round 1 has no house-style result; the hard bans that judge applies arrived in 0.3.0. Rounds 3 to 7 used the 56 expectations in the current file. Round 1 used an earlier set of 42 for the first three briefs. The percentages for rounds 1 and 3 are the mean of the per-brief pass rates. The baseline films were the same in every round, so the movement in their numbers (42, 39 and 41 of 56 in rounds 3 to 5) comes from the grader, not from the films.

Round 7, by brief (cinetic's score first, and 1.1.0's first in the last column; totals out of 40, or 35 for the silent Ledgerly loop, where sound is not scored):

| Brief | Expectations (cinetic vs baseline) | Neutral judge | House-style judge | Against the 0.5.0 film |
|---|---|---|---|---|
| Ledgerly Auto-Split | 12/12 vs 7/12 | 31-28, win | 31-21, win | 30-28, win |
| Quire Streaks | 13/14 vs 11/14 | 36-31, win | 34-28, win | 36-32, win |
| Halden | 15/15 vs 12/15 | 31-34, loss | 33-23, win | 32-30, win |
| Kiln | 14/15 vs 11/15 | 30-33, loss | 35-27, win | 30-35, loss |

Against the previous version's films, the first 1.1.0 snapshot won 2 of 4 (round 6) and the second 3 of 4 (round 7). The one expectation Quire Streaks missed in round 7 was loudness: the agent mastered the feed video to −16 LUFS, which the skill then allowed for a calm brand; 1.1.0 masters every feed cut to −14. Kiln missed the motion-blur expectation: two hard cuts inside acts each blurred into one double-exposed frame, which the render log had warned about; 1.1.0 renders hard cuts sharp and stops the blur render on a possible cut inside an act.

Round 5, by brief, for comparison:

| Brief | Neutral judge | Neutral result | House-style judge |
|---|---|---|---|
| Ledgerly Auto-Split | 31-24 | win | 30-25 |
| Quire Streaks | 35-31 | win | 36-26 |
| Halden | 27-33 | loss | 30-25 |
| Kiln | 30-34 | loss | 33-23 |

The house-style comparator preferred the cinetic film in every pair of rounds 3 to 7. In rounds 3 to 5 it found no hard-ban violations in any cinetic film. In rounds 6 and 7 it found one each time, a soft blue glow in the Quire Streaks film (a wash behind a line, then a halo round a moving dot), against 4 to 8 in each baseline film.

## What the neutral judge preferred

The neutral judge's preferences for the baseline fall into two groups.

**Taste.** Often the judge preferred exactly what the hard bans remove: serif wordmarks, cream paper, orange and amber accents, glow and confetti. That is a real disagreement about taste, not a scoring error. cinetic bans these looks because they are the fastest tells of generated work. A viewer who likes them will prefer the baseline on those films, and the house-style comparator exists to make that disagreement visible rather than hide it. The bans are a choice this skill makes, and a brand you supply still overrides them. Both round-7 losses had this side: the judge credited the Halden baseline's warm palette and brand board, and the Kiln baseline's orange-glow "funded launch" feel, while preferring cinetic's idea and product story in both.

**Craft.** Some of the judge's reasons were real gaps, and each round's findings became rules in the next version:

| After round | What the blind review found | Rules added in |
|---|---|---|
| 1 | Films were true of a simpler product; the story device drifted to a bare dot | 0.2.0: a specificity test at the concept gate, brand choices derived from three personality adjectives, a scored mark sheet |
| 3 | The logo sting's mark read as a minus; the teaser's blue on slate read as a stock dev-tool look | 0.4.0: a 64 px misread test for marks, palettes drawn from the name's world, a note on framework-default blues |
| 4 | Films were sparse, static at the end and quiet at the payoff | 0.5.0: the hero fills 40-70% of product shots, the last third keeps moving, music that leads the picture and resolves on a lockup chord, a payoff line |
| 5 | Quiet stretches, end cards without a line saying what the product is, a loud sound on a still frame | 1.0.0: flagged quiet stretches get motion, a hook-energy warning, a required end-card descriptor, a still-hit warning in `av-audit.py`, a text-speed audit, counters that roll or cut |
| 6 | A 12 s film built all 14 techniques it drew and lost its one UI language; wide UI too small to read on a phone; bare numbers; a wordmark wipe that spelled "halder" on the way; a soft wash read as glow; stepped copies on moves too fast to blur | 1.1.0 (before round 7): draws sized to the film's length, built only where the concept carries them; push-ins of 2–5× and at most 1.7 s of wide UI; labels on data; no partial-glyph reveals; the wash flagged as glow; a too-fast gate in `render.sh --blur` |
| 7 | A sound cued on a bar line after the word it belonged to had landed; a first second of a blinking caret; a letter mark that half-read as another word; a calm feed video mastered quiet; a loop whose poster frame did not name the product; two cuts inside acts that the blur turned into double exposures; an oversized opening line that read as a false start; a product first named at 19 s of 25 | 1.1.0 (release): sounds on the frame an arrival becomes readable, with a late-sound warning in `av-audit.py`; a still-opening gate in `forensics.py`; a word test for letter marks; −14 LUFS for every feed cut; loops that name the product on frame 0; hard cuts rendered sharp and a stop on a possible cut inside an act; an opening line that travels and hands straight over; the product named by a quarter of the runtime |

There is no row for round 2, which was invalidated; 0.3.0 added the hard bans.

The commit messages and [CHANGELOG.md](../CHANGELOG.md) record which rule came from which finding.

## Cost

cinetic runs take about three times the time and tokens of the baseline:

| Average per run | cinetic (round 7) | cinetic (round 5) | Baseline (rounds 1-2, reused) |
|---|---|---|---|
| Wall-clock time | 95 min | 99 min | 33 min |
| Tokens | 626k | 668k | 231k |

Round 6 is left out: its four runs shared one machine at the same time, which inflated their times.

The difference is the extra work: building a brand, scoring and mastering the sound, rendering motion blur, and running review rounds with measurement scripts and critic passes. For a short loop or sting, the skill's scaled-down path cuts some of that. A render with motion blur also costs CPU time, which `render.sh --blur` estimates, from the sharp pass's speed, before it renders the sub-frames (`--budget` caps it).

## Limitations

- **One cinetic run per brief per round, and one baseline run per brief in total.** How much a film changes between runs of the same brief was not measured. Because the baseline films never changed, their movement between rounds is judge noise: the same films met 42, 39 and 41 of 56 expectations in rounds 3 to 5, and the neutral judge scored the same unchanged baseline film up to 7 points apart in different rounds, each time against a different cinetic film (the Ledgerly baseline scored 24 to 31). A margin like 35-31 or 30-34 is within that noise. The neutral results across rounds (0 of 3, 2 of 4, 0 of 4, 2 of 4, 1 of 4, 2 of 4) show no clear trend, and rounds this small could not establish one.
- **Language-model judges.** All the judges are language models, not a panel of viewers, and they may share tastes and blind spots with the agent that made the films. The persona and rubric shape what they reward.
- **The house-style judge scores against cinetic's own rules.** Its clean sweep shows that the skill follows its rules and the baseline does not. It is not independent evidence that viewers prefer the result.
- **The expectations favour the skill.** They were written alongside it, and several check cinetic conventions that the baseline was never given: the hard bans themselves, 60 fps when the brief does not state a frame rate, QA material in a subfolder, a brand kit, the `BRIEF.md` exception and the `lint-film.mjs` marker. The gap in expectations met is partly a gap in instructions, so read it as an upper bound.
- **Round 2 is missing.** A harness problem invalidated it, so 0.2.0 has no judged result.
- **The released 1.1.0 is a little ahead of what was judged.** Round 7 tested a snapshot; the fixes from its findings (the sound timing, the still-opening gate, the word test, the feed loudness) shipped after it without a judged round of their own.
- **The previous-version comparison reuses one film per brief.** The 0.5.0 films were made once, in round 5, so a 1.1.0 win against one of them is one draw, not a measured trend.
- **Four short briefs.** No brief covers a UI walkthrough, a film longer than 25 s, or the social cut-downs.

## Run your own evaluation

This repository ships the briefs and expectations only, not a harness or judge prompts.

**The file format.** `evals/evals.json` has a `skill_name` and an `evals` array. Each entry has an `id`, a `name`, the `prompt` exactly as a person would send it, a one-line `expected_output`, the input `files` (none in these briefs) and `expectations`: plain sentences, each one pass or fail. One entry, trimmed:

```json
{
  "id": 3,
  "name": "halden-logo-sting",
  "prompt": "We're launching Halden, a calm note-taking app. Design the logo and make a 6-second logo sting with sound that we can put at the start of our videos, plus a transparent version for our editors.",
  "expected_output": "A 6 s MP4 logo sting with a tuned sound hit, a transparent (alpha) version, and the logo as stills; the mark assembles with intent and holds long enough to read.",
  "files": [],
  "expectations": [
    "Duration is 6 s (+-0.3 s)",
    "A transparent (alpha) version exists",
    "No intermediate frame of the name reveal spells a different word"
  ]
}
```

**The loop.** In general form:

1. Write briefs the way a real person would, including one that supplies its own brand, so the override path gets tested.
2. Write expectations that can be checked. Make them measurable where possible, and name a threshold.
3. Run each brief with the skill and with the strongest alternative you would actually use, with the same agent and the same brief text. Run each brief more than once if you can afford it.
4. Freeze every output before judging.
5. Grade the expectations, measuring the objective ones by script.
6. Compare each pair blind, with randomised labels and a fixed rubric: one neutral judge, and one with your house style if you have one.
7. Read the judges' reasons, separate taste from craft, turn the craft findings into rules, bump the version and run again.

**Scripted checks.** Many objective expectations map onto the skill's own QA scripts, run from a film project (`new-film.sh` copies the scripts into it):

```bash
python3 scripts/probe.py out/film.mp4 --spec 1920x1080@60 --dur 25 --tol 1.5 --lufs -14 --lufs-tol 1.5 --tp-max -1 --motion
python3 scripts/check-sync.py out/film.mp4 public/audio/soundtrack.wav
python3 scripts/forensics.py out/loop.mp4 --loop --json out/qa/loop.json
```

`probe.py` covers size, fps, duration, BT.709 tags, audio, loudness, true peak and frozen frames. `--motion` reports stutter frames but does not gate them, so compare the count against 1% of the frames yourself. `check-sync.py` checks audio lag and true peak after decoding, and `forensics.py --loop` checks the loop seam. The gates come from the flags you pass and otherwise from the skill's defaults, not from `evals.json`: `forensics.py`, for example, gates the seam at max(0.4, 1.5x the median step at the ends), while the Ledgerly expectation asks for at most 1.5x the median moving step and under 3.0. Grade against the numbers the expectation states, and compare different skills with the same scripts.
