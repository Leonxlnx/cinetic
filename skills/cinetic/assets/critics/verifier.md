# Critic lens: Verifier

Prompt template for the refute pass (see `references/review-loop.md`, §6). The lead collects every P0 and P1 from the lenses, fills the `{{FIELD}}`s, and runs one verifier per issue, or per batch of up to 5 issues on the same act. The verifier's job is to kill wrong issues before anyone spends time fixing them.

## Context

- Film: {{FILM}}, {{SPEC}}. Project root: {{ROOT}}. Read `BRIEF.md` (its hard bans and brand-supplied exceptions), `src/timeline.ts` and the files the issues name.
- File under review: {{VIDEO}}. Frames are 0-based: frame = t × {{FPS}}.
- QA folder for this round: {{QA}}, with `forensics.json`, `av.json` and the sheets.
- Work only inside {{WORKDIR}}.
- The issues to check, as the lenses returned them:

```json
{{ISSUES}}
```

## Your job

For each issue, try to refute it. Treat it as a claim, not a fact.

1. **Look at the frames yourself.**
   - `bash scripts/grab.sh {{VIDEO}} <frames> --out {{WORKDIR}}/<id>` gives full-resolution stills.
   - `python3 scripts/sheet.py {{VIDEO}} --frames A-B --diff --width 480 --out {{WORKDIR}}/<id>.png` gives the frame-to-frame change.
   - For sound: `av.json` rows near the frame. To isolate a moment, cut it with `ffmpeg -ss T -t 1 -i {{VIDEO}} {{WORKDIR}}/<id>.wav` and measure onsets or levels in Python.
2. **Watch it at speed.** A one-frame blemish on a small area inside a fast move is often invisible at 60 fps. A pop on a large area, or anything on a key beat, is not. Judge what a viewer sees at normal playback.
3. **Read the code the fix names.** Is the cause really there? Would the fix work, and could it break something else, such as a seam, a sync point or a hold budget in `grid-check.ts`?
4. **Decide.** An issue is **rejected** when any of these holds:
   - the claim is wrong;
   - it is exaggerated, which means its priority drops;
   - it is invisible at normal speed and sits on no key beat;
   - it is already fixed in the current code;
   - the fix would make the film worse.
   If the problem is real but the fix is wrong, keep the issue and write a better fix.

## Rules

- Evidence means frame numbers plus a measurement or a clearly described image. "Looks fine" is not evidence either way.
- You may lower or raise a priority when the evidence shows it: **P0** is visible on a key beat or breaks the story, **P1** is noticeable on a normal viewing, **P2** is visible only on pause.
- **Hard-ban issues** (IDs HB1–HB11) stay P0 wherever they show: do not reject or lower one because it is brief, small or off a key beat. Reject it only when the frames don't show it, or when `BRIEF.md` lists that exact thing as brand-supplied.
- Do not add new issues. List anything new you notice in `overall`.

## Return

Return JSON only, in the lens schema. `issues` holds only the confirmed issues, with the corrected frame, priority and fix, and a problem that starts with `VERIFIED:` followed by the evidence. `overall` lists every rejected id with its reason (`rejected: id — reason; ...`). `score` is your confidence in these verdicts, 1 to 10.

```json
{
  "issues": [
    {
      "id": "end-lockup-pops-off",
      "priority": "P0",
      "frame": "1920-1922",
      "problem": "VERIFIED: MAD 0.1 -> 31.7 -> 0.2 at f1921; the whole lockup is gone in 2 frames on the last beat",
      "fix": { "file": "src/acts/Act6.tsx", "change": "exit by reversing the reveal over 20 f on E.in instead of the 6 f opacity fade" }
    }
  ],
  "overall": "rejected: hook-too-slow — the line starts at f45 and reads by f60; seam-flash-a3 — a declared cut at f600",
  "score": 8
}
```
