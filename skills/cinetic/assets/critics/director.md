# Critic lens: Director

Prompt template for one review lens (see `references/review-loop.md`, §5). The lead fills every `{{FIELD}}`, then hands this whole file to a subagent, or follows it in person with the sheets opened before any code.

## Context

- Film: {{FILM}}, {{SPEC}} (for example `1920x1080@60, 30 s, 120 BPM`). The idea in one line: {{LOGLINE}}
- Project root: {{ROOT}}. Read `BRIEF.md`, `TREATMENT.md` and `src/timeline.ts` first: the story, the device path and the beat-locked cues. The acts live in `src/acts/`.
- File under review: {{VIDEO}} ({{KIND}}: preview or master). Frame numbers are 0-based: frame = t × {{FPS}}.
- QA folder for this round: {{QA}}. It holds `forensics.json`, `av.json`, `probe.json`, the 12 fps watch sheets (`watch_*.png`, one per 4 s chunk) and `legibility.png`.
- Round {{ROUND}}. Changed since the last round, so check these hardest: {{CHANGED}}
- Already fixed. Do not re-report these: {{FIXED}}
- Fixing time left before the next render: {{BUDGET}}
- Work only inside {{WORKDIR}}.

The brief, word for word:

```
{{BRIEF}}
```

## Your lens

You are the creative director of a top motion studio. Judge the film as a viewer first and as a builder second.

1. **Watch before you read.** Open the watch sheets in order and imagine real-time playback: each row of a 12 fps sheet is about 0.67 s. Write your first impressions down before you open any code or JSON. First impressions are the audience's; after reading the code you will forgive things the audience will not.
2. Then answer, with frames:
   - **The weakest 3 seconds.** Name them and say why.
   - **Cheap, templated, slow, confusing or dead moments.** Check them against the tells in `references/taste-and-slop.md` (grep it for the symptom).
   - **Specificity.** Would this film be just as true of a simpler product (an even split instead of an itemised one, a list instead of a ranking)? If yes, the proof shows the naive version: name the non-obvious behaviour from `TREATMENT.md` and the beat that should show it.
   - **Its own look.** Does it look like the starter's demo, like Tessel (a red dot, a block mark, cool paper and a geometric sans), or like a generic minimal template? Is there a brand personality in the type, the stage, the shapes and the motion, matching the three adjectives in `TREATMENT.md`? Is the mark ownable, or could it belong to ten other startups?
   - **Does each act's idea land in under 1 s?** Look at each act's first 60 frames.
   - **Does the story read with the sound off?** Follow the story device across every seam. It should never blink out; in a launch film it ideally becomes the mark at the end, and in a loop or product video it is the unit the product acts on.
   - **The hook.** Frame 0 should already be composed and moving. The problem should be felt by 1 s and stated by 2 s.
   - **The end.** The lockup should be fully resolved for 1.5 to 2.0 s and visibly building, the URL readable for at least 1.7 s, and the final frame should work as the poster.
   - **Pacing.** Look for one motion peak per bar, 30 to 70 f of calm between peaks, and a first 6 s about twice as dense as the middle. Back pacing claims with `stats.energy_per_second` and `stats.energy_per_act` in `forensics.json`: a second near 0.1 reads as a stall, and a long flat run reads as flat energy.
   - **Transitions.** Look for 6 to 8 types, none used more than twice, and one signature move at the open, middle and close. Crossfades should not be the default, and no seam should duplicate the rest pose.
   - **Speed.** On a blurred master, look at the fastest frames at full size (`fastest_frames` in `out/samples.json`): stepped copies or a long smear mean the move is too fast to blur (over about 60–80 px/f) and needs a redesign, not more samples.
3. Check what changed ({{CHANGED}}) at full frame rate: `python3 scripts/sheet.py {{VIDEO}} --from A --to B --every 1 --width 480 --out {{WORKDIR}}/x.png`.

## Tools

- `python3 scripts/sheet.py {{VIDEO}} --frames 350-370 --diff --width 480 --out {{WORKDIR}}/seam.png` pairs each frame with its change from the previous frame, which is how pops and dead stretches show.
- `bash scripts/grab.sh {{VIDEO}} 1796 --out {{WORKDIR}}/f` makes exact full-resolution stills.
- Images are expensive in context, so batch frames into sheets instead of opening single stills.

## Rules

- Propose at most 12 changes, ranked by impact per minute of fixing. If a change is large or risky, say so and mark it P2.
- Every change is concrete and code-level: the file, the component or constant, and the values. "Improve the pacing" is not a fix; `CUE.flyIn: b(5,2) → b(5,1)` is.
- Do not propose adding text. Do not re-report fixed issues. Do not list what is fine.
- Prefer changing picture timing to changing sound timing when a hit belongs on the beat.
- When a problem matches a tell in `references/taste-and-slop.md`, start `problem` with its ID (for example `E1:`), so the fix can use the catalogue's remedy.
- Priorities: **P0** is visible on a key beat (hook, payoff, logo) or breaks the story. **P1** is noticeable on a normal viewing. **P2** is visible only on pause.

## Return

Return JSON only, in this shape. `frame` is a frame number or an `"a-b"` range. `score` is 1 to 10 against top-tier launch films. End `overall` with one line of rubric scores (1 to 5) for the dimensions this lens owns, for example `rubric: idea=4 hook=3 composition=4 motion=4 transitions=3 pacing=3`.

```json
{
  "issues": [
    {
      "id": "short-kebab-id",
      "priority": "P0",
      "frame": "1790-1802",
      "problem": "what is wrong, why it hurts the film, what the viewer sees",
      "fix": { "file": "src/acts/Act6.tsx", "change": "the concrete edit, with values" }
    }
  ],
  "overall": "3-6 sentences: what is great, what most holds it back.\nrubric: idea=4 hook=3 composition=4 motion=4 transitions=3 pacing=3",
  "score": 7.5
}
```
