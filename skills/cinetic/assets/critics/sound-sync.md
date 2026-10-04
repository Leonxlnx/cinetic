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
2. **Picture against sound.** Read `av.json` `visual`. `misaligned` lists isolated events whose visual peak sits away from the sound. `peaks_without_event` lists those of the film's 3 biggest picture changes (`biggest_changes`) with no audio onset at all, music or effect, within ±3 f. Not every picture event gets a sound: most cuts are carried by the music, and continuous motion (scrolls, streaming text, progress bars, rolling counters, hovers) stays silent. What should hold:
   - cuts and the velocity peaks of major moves sit on the grid (a transition peaking a quarter-second after its beat reads as late even when nobody can say why);
   - section changes and the hero reveal land with the music's own event (drop, stop, re-entry): for a listed peak that is one of these, propose moving the picture onto the bar or the event onto the picture; an ordinary cut needs nothing;
   - designed effects sit on discrete state changes, about 5 per 10 s, clustered where the music is sparse (cold open, typing, logo build) and thinning after the drop; a sounded class of action is sounded every time at one level (partial coverage is a **P1**); whooshes, about 2 a film, only on camera-scale moves and logo zooms, onset 100–450 ms ahead, apex on the visual peak.
   A designed silent moment is fine when it sits on a silence in the score.
3. **Audibility.** Read `av.json` `masking` and `score.json`. Effects should sit at least +6 dB over the music in their own band. Name the masked ones that matter: key hits, payoff, logo.
4. **Arc and finish.** Check these:
   - Integrated loudness is on the film's target ±1 LUFS (`av.json` `loudness.target`: `master.lufs`, −14 by default, −16 for a calm brand or a short sting), and true peak is at most −1 dBTP after AAC.
   - The LRA is 3 to 8 LU, and at least 5 LU for a film of 20 s or more: a launch film wants a thinned section before the turn, true silence before the drop, and a payoff 2–3 LU above the median momentary loudness (`score.json` reports both).
   - The loudest momentary window sits on the payoff: the drop on the hero reveal, about 30–60% into the film (`score.json` `loudest_frac`). Find the payoff cue in `src/timeline.ts`. The lockup is the most resolved moment, not the loudest: as the logo forms the music stops on a bar line or filters down, 0.2–0.7 s of near-silence, then one soft resolved element on the wordmark. A logo slam as the film's peak is a **P1** (a sting excepted: it is all lockup).
   - Clicks are none, the head starts from silence (`av.json` `head`: a warning means a sound begun before frame 0 cuts in mid-action, unless it is the attack of a hit designed for frame 0), and the tail decays to digital zero with 60 f or more of silence at the end. No effect starts inside the end fade (`score.json` warnings name any).
   - **The hook.** `score.json` `hook`: the first 0.5 s sits within 12 dB of the median momentary loudness, with a sound caused by something visible on or near frame 0. The intro may be soft (a drone or a 150–450 ms entry, 5–12 LU under the body for 2–3 s), but a pad fading in over the whole first bar, or silence under a moving first second, is a soft hook: **P1**, **P0** on a feed or loop deliverable.
   For a momentary curve, run `ffmpeg -i {{VIDEO}} -af ebur128 -f null - 2>&1 | grep M:`.
5. **Personality.** Read the brand's three adjectives in `TREATMENT.md` and the row it picked in the personality table (`references/sound.md` §5.5a). A calm, literary or kind brand scored with drops onto silence, sub booms, risers or a `drive` section is the wrong tone (**P1**: it reads as trailer noise); a fast launch film with no contrast is the opposite failure. For a progress story (days, steps, items cleared), check that the steps climb (`score.json` `progress.rungs`, `references/sound.md` §5.5b) and resolve on the payoff, or propose it.
6. **Composition.** Read `audio/score.json` and the relevant `score.py` settings as a composer:
   - Every pitched effect is in key, and the snaps and booms are tuned to the chord root.
   - V-chord pads end before the downbeat they resolve into.
   - Each drop lands on true silence.
   - Typing follows the measured norms (`score.json` `typing.runs`): `"typing": "auto"` unless the brand asks otherwise; per key (up to 25 chars/s) a dark tock with at most 25% of its energy in 2–5 kHz (`share_2k_5k_A_pct`), the music ducked about 10 dB (`duck_db`) and the run about −8 to −2 dB A against it (`vs_music_A_db`), the keys about 4 dB under the music's short-window level (`key_vs_music_db` about −4); above 25 chars/s one blip per word, +2 to +9 dB over the music; word starts accented. A key per character in a fast type-on, or typing over the full groove, is a **P1**.
   - UI clicks: one voice at one level for the whole film, about 3 dB under the music's short-window level (`score.json` `sfx_levels`); crisp ticks about 8 dB under.
   - Heavy thuds play only for landings that happen in shot.
   - Effects are dry, mono and centred (`score.py` keeps them within ±0.15); only whooshes, risers and the music are wide, and whooshes travel with the motion.

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
