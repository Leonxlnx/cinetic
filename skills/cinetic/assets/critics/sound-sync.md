# Critic lens: Sound and sync

Prompt template for one review lens (see `references/review-loop.md`, §5). The lead fills every `{{FIELD}}` and hands this whole file to a subagent.

## Context

- Film: {{FILM}}, {{SPEC}}. Project root: {{ROOT}}.
- The soundtrack is rendered by `scripts/audio/score.py` from `out/cues.json`, which `scripts/export-cues.ts` computes from the same constants the picture animates with. The effects are the takes of the film's earshot sound kit (`audio/kit.json`, rendered into `audio/kit/` by `scripts/audio/kit.py`), or synth voices where no kit could be played. The music (`"music"`: none, synth or a track), harmony, sections and silences live in `audio/score.json`. Read `references/sound.md` for the house rules.
- File under review: {{VIDEO}} ({{KIND}}). Frames are 0-based: frame = t × {{FPS}}.
- QA folder for this round: {{QA}}. It holds:
  - `av.json`, from `python3 scripts/av-audit.py {{VIDEO}} --cues out/cues.json --stems out/stems`;
  - `score.json`, the report `score.py --json` wrote (where every effect came from in `sfx`, `stacks`, per-event band masking, payoff dynamics);
  - `listen.json` and `sound_sheet.png`, from `python3 scripts/audio/listen.py --video {{VIDEO}}` when earshot is installed (`"listened": false` says why not): earshot's per-cue sync, transcript and critique;
  - `sync.json`, from `check-sync.py` (mux lag, true peak after AAC);
  - `forensics.json`, whose `stats.energy_per_second` is the picture's energy curve.
- Round {{ROUND}}. Changed since the last round, so check these hardest: {{CHANGED}}
- Already fixed. Do not re-report these: {{FIXED}}
- Work only inside {{WORKDIR}}.

## Your lens

You cannot listen, so you measure, and earshot listens for you. You judge whether the sound makes the picture feel better: locked, tuned, audible, restrained, with an arc.

0. **Source.** Read `score.json` `sfx`. `synth (fallback)` means the effects are synth voices nobody listened to: a **P1** whose fix is the environment (install earshot, `npm run kit`, or bring the rendered `audio/kit/` over), not code. `synth` lists kinds the kit does not name (each plays a synth voice: give the role a sound); `off` lists cues of roles the kit leaves off (fine for `riser`, `swell`, `suck`; a picture event that needs its sound gets a role). A `vendored kit (stale)` source plays takes older than `audio/kit.json`.
1. **Lock.** Read `av.json` `sync`: the hit rate, the median and p90 offsets, and the misses. The file should be strict (`"strict": true`, run with `--stems`).
   - A median offset beyond ±1 f is a systematic lag: check the mux and the priming (`sync.json`).
   - Each miss is a sound that is missing, early or late. Read the event's code in `src/sync.ts` and say which. Common causes: a spring cued on its settle instead of its pop (0.5) or contact (0.92-1.0); a whoosh apex off the velocity peak; a picture change that starts at `cue` instead of `cue − 1`.
   - `stray_sfx_onsets_f` lists sounds with no picture reason, or events missing from cues.json.
   - Cross-check with `listen.json` `sync`: each cue with `offset_ms` and `status` (`OK` within a frame, `near` within 100 ms, `peak` only a level peak, which is normal for a soft whoosh, `no sound`). Two independent readings that agree are a fact; when only one flags a cue, open `sound_sheet.png` at that time.
2. **Picture against sound.** Read `av.json` `visual`. `misaligned` lists isolated events whose visual peak sits away from the sound. `peaks_without_event` lists those of the film's 3 biggest picture changes (`biggest_changes`) with no audio onset at all, music or effect, within ±3 f. Not every picture event gets a sound: most cuts are carried by the music, and continuous motion (scrolls, streaming text, progress bars, rolling counters, hovers) stays silent. What should hold:
   - cuts and the velocity peaks of major moves sit on the grid (a transition peaking a quarter-second after its beat reads as late even when nobody can say why);
   - section changes and the hero reveal land with the music's own event (drop, stop, re-entry): for a listed peak that is one of these, propose moving the picture onto the bar or the event onto the picture; an ordinary cut needs nothing;
   - designed effects sit on discrete state changes, about 5 per 10 s, clustered where the music is sparse (cold open, typing, logo build) and thinning after the drop; a sounded class of action is sounded every time at one level (partial coverage is a **P1**); whooshes, about 2 a film, only on camera-scale moves and logo zooms, onset 100–450 ms ahead, apex on the visual peak.
   A designed silent moment is fine when it sits on a silence in the score.
3. **Audibility.** Read `av.json` `masking` and `score.json`. Effects should sit at least +6 dB over the music in their own band. Name the masked ones that matter: key hits, payoff, logo.
4. **Arc and finish.** Check these:
   - Integrated loudness is on the film's target ±1 LUFS (`av.json` `loudness.target`: `master.lufs`, else −14 with music and −18 for an effects-only film; −16 for a short sting with music), and true peak is at most −1 dBTP after AAC. In an effects-only film the limiter stays under 1.5 dB (`score.json` `limiter_max_gr_db`): over it, lower the target, not the accents.
   - The LRA is 3 to 8 LU with music (an effects-only film may run to 14), and at least 5 LU for a film with music of 20 s or more: a launch film wants a thinned section before the turn, true silence before the drop, and a payoff 2–3 LU above the median momentary loudness (`score.json` reports both).
   - The loudest momentary window sits on the payoff: the drop on the hero reveal, about 30–60% into the film (`score.json` `loudest_frac`). Find the payoff cue in `src/timeline.ts`. The lockup is the most resolved moment, not the loudest: as the logo forms the music stops on a bar line or filters down, 0.2–0.7 s of near-silence, then one soft resolved element on the wordmark. A logo slam as the film's peak is a **P1** (a sting excepted: it is all lockup).
   - Clicks are none, the head starts from silence (`av.json` `head`: a warning means a sound begun before frame 0 cuts in mid-action, unless it is the attack of a hit designed for frame 0), and the tail decays to digital zero with 60 f or more of silence at the end. No effect starts inside the end fade (`score.json` warnings name any).
   - **The hook** (films with music). `score.json` `hook`: the first 0.5 s sits within 12 dB of the median momentary loudness, with a sound caused by something visible on or near frame 0. The intro may be soft (a drone or a 150–450 ms entry, 5–12 LU under the body for 2–3 s), but a pad fading in over the whole first bar, or silence under a moving first second, is a soft hook: **P1**, **P0** on a feed or loop deliverable. An effects-only film may open on near-silence until its first visible event.
   - **Restraint.** `score.json` `stacks` and its warnings: a stacked lockup or payoff (a second designed sound within ±3 f, a whoosh, riser, swell or suck running into it, a score.json motif on it) is a **P1**: the reveal resolves on ONE clean element after a stop-down. A score.json drop at the reveal is not a layer: its silence and the music's suck into it are the stop-down. A rising synth whip (a kit role with `rising_glide` in its audit, a synth `riser`) is a **P1**. Stacked effects elsewhere (two heavy sounds or three kinds within ±3 f) are a **P2**, a **P1** on a key beat.
   For a momentary curve, run `ffmpeg -i {{VIDEO}} -af ebur128 -f null - 2>&1 | grep M:`.
5. **Personality and text.** Read the brand's three adjectives in `TREATMENT.md` and the row it picked in the personality table (`references/sound.md` §5.5a), and the kit preset in `audio/kit.json` (`name`). A calm, literary or kind brand scored with drops onto silence, sub booms, risers or a `drive` section is the wrong tone (**P1**: it reads as trailer noise); a synth pad bed under quiet type, where effects only would do, is a **P2** (house style: the one effects-led film in the study runs with no bed, `references/sound.md` §5.7; `score.json` `events.masked` shows the text sounds a pad covers); a fast launch film with no contrast is the opposite failure. Text (`references/sound.md` §5.7): one soft `text` sound per fragment on its resolve frame and near-silence while the line is read; a sound on every word of a build, or ticks through a held line, is a **P2** (a **P1** when it machine-guns). For a progress story (days, steps, items cleared), check that the steps climb (`score.json` `progress.rungs` and what played in `events.tuned`, `references/sound.md` §5.5b) and resolve on the payoff, or propose it. Under a kit the steps need a tuned role (the calm `bell`): an untuned role's rungs sound alike, and the report warns.
6. **Composition.** Read `audio/score.json`, `audio/kit.json` and the relevant `score.py` settings as a composer:
   - Every pitched effect is in key (`score.json` `events.tuned`, out-of-key warnings): the kit's tonal roles were tuned to this key (`kit.py tune` after a key change), and with synth music the snaps and booms sit on the chord root. A "has no take on" warning means a synth voice played a note the kit's tuned role lacks: add the note to its `pitches`.
   - A chain's text sounds step through the chord's tones (consecutive fragments on different notes in `events.tuned`), and a role's repeated cues sit at one level (`sfx.roles[].trim_db` evens out the takes' loudness).
   - V-chord pads end before the downbeat they resolve into.
   - Each drop lands on true silence.
   - Typing follows the measured norms (`score.json` `typing.runs`): `"typing": "auto"` unless the brand asks otherwise; per key (up to 25 chars/s) a dark tock with at most 25% of its energy in 2–5 kHz (`share_2k_5k_A_pct`; with a kit the key take sets the timbre and a run is bright when `centroid_hz` passes 3 kHz, the top of the measured key-click range, so the fix is another key member in `audio/kit.json`, not the typing style), the music ducked about 10 dB (`duck_db`) and the run about −8 to −2 dB A against it (`vs_music_A_db`), the keys about 4 dB under the music's short-window level (`key_vs_music_db` about −4); above 25 chars/s one blip per word, +2 to +9 dB over the music; word starts accented. A key per character in a fast type-on, or typing over the full groove, is a **P1**.
   - UI clicks: one voice at one level for the whole film, about 3 dB under the music's short-window level (`score.json` `sfx_levels`); crisp ticks about 8 dB under.
   - Heavy thuds play only for landings that happen in shot.
   - Effects are dry, mono and centred (`score.py` keeps them within ±0.15); only whooshes, risers and the music are wide, and whooshes travel with the motion.
   - `listen.json` `critique` is a scorecard against music-led launch films: on an effects-only film its "no music", "sparse" and "low loudness" lines describe the style, not defects. Treat its realness reading and actions as hints, never as targets.

## Rules

- When a hit belongs on the beat, move the picture, not the sound. Audio that leads the picture by more than 45 ms reads as "sound first".
- Fixes name one of: a kit change in `audio/kit.json` (another bank member for a role from `earshot sfx list`, a knob in `edits` such as `pitch` or `dur`, a role's `level_db`, a role set to `null`), then `npm run kit`; a new sound when the bank lacks the material (an `earshot forge` run, or an `earshot fit` of a public-domain or user-owned recording, added to the bank as `fit/<role>/<name>` with its licence); a cue (an event's frame, kind, weight or threshold in `src/sync.ts`); or a score parameter in `audio/score.json` (`music`, a gain, a section, `master.lufs`). Never propose dropping in downloaded stock effects or music: a recording reaches the film only through a fit, with its licence recorded.
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
