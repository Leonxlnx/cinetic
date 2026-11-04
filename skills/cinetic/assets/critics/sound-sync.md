# Critic lens: Sound and sync

Prompt template for one review lens (see `references/review-loop.md`, §5). The lead fills every `{{FIELD}}` and hands this whole file to a subagent.

## Context

- Film: {{FILM}}, {{SPEC}}. Project root: {{ROOT}}.
- The soundtrack is rendered by `scripts/audio/score.py` from `out/cues.json`, which `scripts/export-cues.ts` computes from the same constants the picture animates with. Every film is **music-led**: one licensed, human-made, instrumental track found for this film (`scripts/music.mjs`) and edited at bar lines by `scripts/audio/track.py`, with the earshot `launch` kit cast for the film's actions (`kit.py cast`) and levelled over it by `scripts/audio/plan.py`. The effects-only route (`"music": "none"`) is only for old projects. Every effect is a take of the film's kit (`audio/kit.json`, rendered into `audio/kit/` by `scripts/audio/kit.py`). `audio/score.json` names the music (`"none"` or `{track, edit, licence}`), the stop-downs, silences, payoff and master. Read `references/sound.md` and `references/music.md` for the house rules.
- File under review: {{VIDEO}} ({{KIND}}). Frames are 0-based: frame = t × {{FPS}}.
- QA folder for this round: {{QA}}. It holds:
  - `av.json`, from `python3 scripts/av-audit.py {{VIDEO}} --cues out/cues.json --stems out/stems` (sync against the intended times of `cues_sounded.json`, `music_sync`, per-role masking);
  - `score.json`, the report `score.py --json` wrote (`sfx`, `stacks`, `music`, `over_bed`, `stop_downs`, `no_duck`, `density`, `one_gesture`, `lockup`, payoff dynamics), and `sfx_plan.json`, the plan behind it;
  - `listen.json` and `sound_sheet.png`, from `python3 scripts/audio/listen.py --video {{VIDEO}}` when earshot is installed (`"listened": false` says why not), and `listen_track.json` from `listen.py --track`;
  - `sync.json`, from `check-sync.py` (mux lag, true peak after AAC);
  - `forensics.json`, whose `stats.energy_per_second` is the picture's energy curve.
- Round {{ROUND}}. Changed since the last round, so check these hardest: {{CHANGED}}
- Already fixed. Do not re-report these: {{FIXED}}
- Work only inside {{WORKDIR}}.

## Your lens

You cannot listen, so you measure, and earshot listens for you. You judge whether the sound makes the picture feel better: locked, levelled, restrained, cut to the music, with an arc.

0. **Source.** Read `score.json` `music` and `sfx`.
   - Generated music of any kind (a synth bed, a pad, a drone, a band made in code) is a **P0**: cinetic makes no music. The track is licensed, and every film has one: a new film with `"music": "none"` is a **P0** too.
   - A film with a track whose licence record is missing, unconfirmed (no `licence_seen`) or, for CC BY, without its credit line is a **P0** for delivery (`credits.py`, `deliver.sh` refuse it).
   - The kit is cast for this film: `audio/kit.json` holds a `cast` block, each action of the film its own sound, the previous film's signature sounds avoided. A preset kit that was never cast (the same whoosh and pop as every film) is a **P1**: `kit.py cast`, then render, plan and score again.
   - `"draft": true` (placeholder voices) is never delivered: a **P0** for delivery. `sfx.missing` lists cues no kit take sounds: give each role a sound. `off` lists cues of roles the kit leaves off (fine for `suck`, and for `riser`, `swell` in a kit that leaves them off). A `vendored kit (stale)` source plays takes older than `audio/kit.json`.
1. **Lock.** Read `av.json` `sync` (strict, with `--stems`; `intended` names the `cues_sounded.json` it judged against): the hit rate, the median and p90 offsets, and the misses.
   - A median offset beyond ±1 f is a systematic lag: check the mux and the priming (`sync.json`).
   - Each miss is a sound that is missing, early or late. Read the event's code in `src/sync.ts` and say which. Common causes: a spring cued on its settle instead of its pop (0.5) or contact (0.92-1.0); a whoosh apex off the velocity peak; a picture change that starts at `cue` instead of `cue − 1`. A role's designed offset is not a miss: the intended times already carry it.
   - `stray_sfx_onsets_f` lists sounds with no picture reason, or events missing from cues.json.
   - Cross-check with `listen.json` `sync`: two independent readings that agree are a fact; when only one flags a cue, open `sound_sheet.png` at that time.
2. **Picture against music.** With a track, read `av.json` `music_sync`: every structural cue and act boundary within ±1 f of a downbeat attack, an entry, a stop's end or the ending (the reveal, the payoff or the lockup off is a **P1**, a **P0** on a feed deliverable); near misses (a hard cut 2–4 f off a strong accent) are a **P2**: move it onto the accent or well clear of it. `av.json` `visual` lists isolated events whose picture peak sits away from the sound, and the film's biggest picture changes with no audio onset at all within ±3 f. Not every picture event gets a sound: most cuts are carried by the music, and continuous motion stays silent. What should hold:
   - cuts land on the track's accents, not the bare bar grid, and not on every downbeat; big moves peak on an accent;
   - the biggest reveal comes after a dip (a break, a stop or a stop-down) and lands on the track's entry;
   - designed effects sit on discrete state changes, 3–13 per 10 s with a track (`score.json` `density`), clustered where the music is sparse; a sounded class of action is sounded every time at one level (partial coverage is a **P1**); whooshes, about 2 a film, only on camera-scale moves and logo zooms.
3. **Levels.** With a track, read `score.json` `over_bed`: each role's median within ±2 dB of its `bed_db` (per-effect misses on a kick or in a gap are a **P2**; a whole role off is a **P1**), the overall median 3–10 dB. `stop_downs`: every hit, drop and swell target has a measured dip of 6 dB or more (`measured_dip_db`) and the bed back within 3 dB on the hit; a missing breath before the payoff is a **P1**. `no_duck.ok` must be true: a duck under the effects is a **P0** (the music never ducks). `one_gesture`: a heavy effect on the track's own accent is a **P1** (let the track carry it). Read `av.json` `masking`: each effect over the bed in its best band by its role's margin (3 dB for roles 4 dB or less over the bed, 6 dB for the rest); name the masked ones that matter: key hits, the payoff, the logo.
4. **Arc and finish.**
   - Integrated loudness on the film's target ±1 LUFS (−14, −16 for a sting of 8 s or less; −18 only for an old effects-only project, which a new film never is), true peak at most −1 dBTP after AAC; the limiter under 1.5 dB at the payoff.
   - The LRA 5–8 LU for a film with a track of 20 s or more (the arc comes from the edit: an intro, a break, the entry on the reveal), and the payoff 2–3 LU above the median momentary loudness (`score.json` `payoff`).
   - The loudest momentary window sits on the payoff, about 75–90% into the film (`loudest_frac`). The lockup is the most resolved moment: after a `stop` ending, 0.2–0.7 s of near-silence then ONE element at −9 to −6 dBFS peak and 2 LU or more under the payoff (`score.json` `lockup`; out of range is a **P1**, the warning names the `quiet_db` to try); a `button` ending lets the track's final hit carry it; a logo slam as the film's peak is a **P1** (a sting excepted).
   - The track's edit (`score.json` `music.joins`): a click, a chopped note, a start inside a note or an unplanned loudness step at a join is a **P1**; a track cut mid-phrase or faded mid-phrase is a **P1**.
   - Clicks none, the head from silence (`av.json` `head`), the tail to digital zero with 60 f or more of silence; no effect inside the end fade.
   - **The hook** (films with a track): the first sound by 0.15–0.45 s, the track's intro entered with intent (`score.json` `hook`); silence under a moving first second is a **P1**, a **P0** on a feed or loop deliverable.
   - **Restraint.** `stacks`: a stacked lockup or payoff (a second designed sound within ±3 f, a whoosh or riser running into it) is a **P1**. A rising synth whip (a kit role with `rising_glide` in its audit) is a **P1**. A run of tuned effects that reads as a melody is a **P1** (`score.json` thins pitched effects past 2 in 4 s; a warning lists them). Stacked effects elsewhere are a **P2**, a **P1** on a key beat.
5. **Personality and text.** Read the brand's three adjectives in `TREATMENT.md`, the row it picked in the personality table (`references/sound.md` §5.5a), its music brief, the kit preset (`audio/kit.json` `name`) and the track (`references/music.md` §4: the profile, the tempo, the structure). A calm brand on a driving track with sub hits is the wrong tone (**P1**); a fast launch film with no contrast is the opposite failure. Text (`references/sound.md` §5.7): one soft `text` sound per fragment on its resolve frame and near-silence while the line is read; a sound on every word of a build, or ticks through a held line, is a **P2** (a **P1** when it machine-guns). For a progress story, check that the steps climb (`progress.rungs`) at least 2 s apart and resolve on the payoff.
6. **Composition.**
   - Every pitched effect is in key (`events.tuned`, out-of-key warnings): with a track the key is the track's (`track.py analyze`), and the kit's tonal roles were tuned to it (`kit.py tune`).
   - A chain's text sounds step through the chord's tones; a role's repeated cues sit at one level.
   - Typing (`typing.runs`): `"typing": "auto"` unless the brand asks otherwise; per key up to 25 chars/s, one take per word above; a bright run (`centroid_hz` over 3 kHz) needs a darker key member; foreground typing over the full groove wants a sparse bar under it (`track.py edit`), never a duck.
   - Effects are dry and centred; only the roles with a width (ticks, bells) and travelling whooshes, risers and swells are wide.
   - `listen.json` `critique` is a scorecard against earshot's launch profile: hints, never targets. `listen_track.json` flags possible vocals: a **P1** until the page confirms an instrumental.

## Rules

- When a hit belongs on the beat, move the picture, not the sound. Audio that leads the picture by more than 45 ms reads as "sound first", except a role's designed offset.
- Fixes name one of: a cut moved onto the music (`src/timeline.ts`, `MUSIC.accentNear`, a `STRUCTURAL` cue); an edit of the track (`track.py edit` with other bars, `--entry`, `--start-bar`, `--end`, `--arc`); a kit change in `audio/kit.json` (another bank member for a role, a knob in `edits`, a role's `bed_db`, `offset_ms` or `level_db`, a role set to `null`), then `npm run kit`; a new sound when the bank lacks the material (an `earshot fit` of a public-domain or user-owned recording); a cue (an event's frame, kind, weight, `structural` or `force` in `src/sync.ts`); or a score parameter in `audio/score.json` (`stopdowns`, `quiet_db`, a gain, `master.lufs`). Music comes only as a licensed track recorded with `track.py add`; effects never come from downloads: an earshot kit role, an earshot fit of a CC0 or owned recording, or nothing. Never propose ducking.
- Do not re-report fixed issues. Do not propose adding text. Rank by impact per minute of fixing.
- Priorities: **P0** is audible on a key beat, the audio out of lock or clipped, generated music, a duck, or a delivery the licence gate refuses. **P1** is noticeable on a normal listen. **P2** is a refinement.

## Return

Return JSON only. `frame` is a number or an `"a-b"` range. `score` is 1 to 10 for sound and sync. End `overall` with `rubric: sound=N`.

```json
{
  "issues": [
    {
      "id": "reveal-off-entry",
      "priority": "P1",
      "frame": 1686,
      "problem": "what is off, by how many frames or dB, and what it costs the moment",
      "fix": { "file": "src/timeline.ts", "change": "start the reveal act on the track's entry (MUSIC.entries[0], f1684.4 -> b(9))" }
    }
  ],
  "overall": "3-6 sentences on lock, levels, the cut to the music, arc and ending.\nrubric: sound=4",
  "score": 8
}
```
