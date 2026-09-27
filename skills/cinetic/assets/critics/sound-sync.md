# Critic lens: Sound and sync

Prompt template for one review lens (see `references/review-loop.md`, §5). The lead fills every `{{FIELD}}` and hands this whole file to a subagent.

## Context

- Film: {{FILM}}, {{SPEC}}. Project root: {{ROOT}}.
- The soundtrack is synthesized by `scripts/audio/score.py` from `out/cues.json`, which `scripts/export-cues.ts` computes from the same constants the picture animates with. The harmony, sections and silences live in `audio/score.json`. Read `references/sound.md` for the house rules.
- File under review: {{VIDEO}} ({{KIND}}). Frames are 0-based: frame = t × {{FPS}}.
- QA folder for this round: {{QA}}. It holds:
  - `av.json`, from `python3 scripts/av-audit.py {{VIDEO}} --cues out/cues.json --stems out/stems`;
  - `score.json`, the report `score.py --json` wrote (per-event band masking, payoff dynamics);
  - `sync.json`, from `check-sync.py` (mux lag, true peak after AAC);
  - `forensics.json`, whose `stats.energy_per_second` is the picture's energy curve.
- Round {{ROUND}}. Changed since the last round, so check these hardest: {{CHANGED}}
- Already fixed. Do not re-report these: {{FIXED}}
- Work only inside {{WORKDIR}}.

## Your lens

You cannot listen, so you measure. You judge whether the sound makes the picture feel better: locked, tuned, audible, with an arc.

1. **Lock.** Read `av.json` `sync`: the hit rate, the median and p90 offsets, and the misses. The file should be strict (`"strict": true`, run with `--stems`).
   - A median offset beyond ±1 f is a systematic lag: check the mux and the priming (`sync.json`).
   - Each miss is a sound that is missing, early or late. Read the event's code in `src/sync.ts` and say which. Common causes: a spring cued on its settle instead of its pop (0.5) or contact (0.92-1.0); a whoosh apex off the velocity peak; a picture change that starts at `cue` instead of `cue − 1`.
   - `stray_sfx_onsets_f` lists sounds with no picture reason, or events missing from cues.json.
2. **Picture against sound.** Read `av.json` `visual`. `misaligned` lists isolated events whose visual peak sits away from the sound. `peaks_without_event` lists strong picture changes with no sound. Some are fine: a silent implosion, or a cut on a silence. Name the ones that need a sound.
3. **Audibility.** Read `av.json` `masking` and `score.json`. Effects should sit at least +6 dB over the music in their own band. Name the masked ones that matter: key hits, payoff, logo.
4. **Arc and finish.** Check four things:
   - Integrated loudness is −14 ±1 LUFS, and true peak is at most −1 dBTP after AAC.
   - The LRA is 3 to 8 LU.
   - The loudest momentary window sits on the payoff. Find the payoff cue in `src/timeline.ts`.
   - Clicks are none, and the tail decays to digital zero with 60 f or more of silence at the end.
   For a momentary curve, run `ffmpeg -i {{VIDEO}} -af ebur128 -f null - 2>&1 | grep M:`.
5. **Composition.** Read `audio/score.json` and the relevant `score.py` settings as a composer:
   - Every pitched effect is in key, and the snaps and booms are tuned to the chord root.
   - V-chord pads end before the downbeat they resolve into.
   - Each drop lands on true silence.
   - Typing is thinned (clicks closer than 2 f are dropped, and word starts are accented).
   - Heavy thuds play only for landings that happen in shot.
   - Whooshes are dull (centroid 150-600 Hz) and panned with the motion.

## Rules

- When a hit belongs on the beat, move the picture, not the sound. Audio that leads the picture by more than 45 ms reads as "sound first".
- Fixes are code-level: an event's frame or threshold in `src/sync.ts`, a gain or pitch in `audio/score.json`, a helper in `scripts/audio/`. Never propose stock or sampled sounds.
- Do not re-report fixed issues. Do not propose adding text. Rank by impact per minute of fixing.
- Priorities: **P0** is audible on a key beat, or the audio is out of lock or clipped. **P1** is noticeable on a normal listen. **P2** is a refinement.

## Return

Return JSON only. `frame` is a number or an `"a-b"` range. `score` is 1 to 10 for sound and sync. End `overall` with `rubric: sound=N`.

```json
{
  "issues": [
    {
      "id": "fits-snap-on-settle",
      "priority": "P1",
      "frame": 1686,
      "problem": "what is off, by how many frames or dB, and what it costs the moment",
      "fix": { "file": "src/sync.ts", "change": "cue the snap on hit(start, SPR.snap, 0.92) instead of settleOf(...)" }
    }
  ],
  "overall": "3-6 sentences on lock, audibility, arc and ending.\nrubric: sound=4",
  "score": 8
}
```
