# Sound: effects, the track, the mix and the master from the cues

Covers the soundtrack end to end: where the sounds come from (the licensed track every film has, and real licensed recordings from the catalogue for every effect, earshot judging them), the `out/cues.json` contract, writing `src/sync.ts`, the `audio/score.json` schema, the effects plan, the stop-down, the mix and the master, and listening to the result. Read it before Step 8 (Sound), and again whenever sound and picture disagree. The track itself (choosing, licensing, analysing, editing it, and cutting the picture to it) is `references/music.md`, Step 3.

The numbers here are house numbers: starting points with a reason, not dogma. When the brand supplies a sonic logo or a voice-over, the brand wins: time everything else around it (§5.6).

## Contents
1. [Where the sounds come from](#1-where-the-sounds-come-from) (two kinds of film sound, the kit, its roles)
2. [Pipeline and gate](#2-pipeline-and-gate)
3. [cues.json and the event kinds](#3-cuesjson-and-the-event-kinds)
4. [Writing src/sync.ts](#4-writing-srcsyncts)
5. [score.json](#5-scorejson) (5.5a personality, 5.5b progress, 5.5c typing, 5.7 text films)
6. [Tuning](#6-tuning)
7. [Placement and levels](#7-placement-and-levels) (the launch kit, bed_db, offsets, gaps, width)
8. [Mix](#8-mix) (the stop-down, no ducking, staging)
9. [Master and verification](#9-master-and-verification) (9.1 listening with earshot)
10. [Reading the report](#10-reading-the-report)
11. [Failure modes](#11-failure-modes)
12. [Sound slop](#12-sound-slop)
13. [House numbers](#13-house-numbers)

## 1. Where the sounds come from

**Every cinetic film has a licensed music track.** Launch films, update films, stings and loops with sound are all
music-led: one licensed, human-made, instrumental track, edited at bar lines, with code-made effects levelled over it.
The effects-only route stays in the code (old projects render with it), but a
film you make never chooses it.

| Kind | Music | Effects | Level model | Target |
|---|---|---|---|---|
| **Music-led** (every film) | one licensed, human-made, instrumental track, edited at bar lines (`references/music.md`) | real licensed recordings from the catalogue (`sfx.mjs`) on the `launch` kit's roles, each effect levelled over the track | `bed_db`: dB over the bed as played | −14 LUFS (−16 for a sting of 8 s or less) |
| Effects-only (compatibility only) | none (`"music": "none"`) | an earshot kit: `calm`, `crisp` or `minimal` | `level_db` × weight | −18 LUFS |

cinetic makes no music. There is no generated bed, pad, drone or band: `"music": "synth"` exits with a message pointing here. Effects never become music either (§6): at most two pitched effects in any 4 s, no tuned run that reads as a melody, no tonal effect ringing past 1.5 s, and no pad, drone or bed from earshot. Nothing sustained plays under the film besides the track: no looping effect bed (a buzz, a whirr, an engine); effects stay short and land on what you see.

**Real effects first.** Every film's effects are real recordings: `node scripts/audio/sfx.mjs` (after `npm run cues` and `kit.py cast`, before `npm run sound`) picks one sound per kit role (by the action the cast gave it) from the curated catalogue `scripts/audio/sfx-catalogue.json` (84 sounds in 17 kinds: whooshes in three lengths, soft and hard clicks, key taps, typing, notification tones, shutters, impacts, sub drops, risers, reverse swells, glass, paper, ticks, lockup hits; each auditioned with earshot, a forced choice against cheap and cartoon alternatives, and measured: onset, lead, peak, loudness, floor, character tags). A different set every film: the film's name seeds the draw among the best few of each kind, and a sound any of the last four films played is held back (`~/.cinetic/sfx-history.json`). It downloads each pick into `audio/sfx/` with its licence record (the record a track has; `credits.py` lists it) and places it as the takes of its role (`kit.py real --role`: cut to 5 ms before its transient, so the onset lands on the cue frame; faded; peak-normalised; the role's `bed_db`, `offset_ms`, `min_gap_ms` and `width`), and `score.py` levels it over the bed, pans it along the cue and masters to −14 LUFS. After the mix and `kit.py listen`, `sfx.mjs refine` picks again for every effect `score.py` calls masked or buried and every take earshot's ears flag (then mix and listen again); `--avoid <id>` drops a sound the ears judged poorly. Sources: only libraries whose licence allows a commercial film with no credit and whose files download with no account or key: Mixkit's sound effects (Mixkit Sound Effects Free License, read on its page; the file may never be redistributed on its own, so the catalogue holds links and the audio is fetched at film time and never committed). Pixabay's effects answer scripts with a bot check, Freesound and Zapsplat need an account: not used (`sfx.mjs licences`). Offline, the kit's synthesized takes play instead and every run says so (`FALLBACK: synthesized effects`): never deliver a film on the fallback. earshot is the ears, not the generator: `kit.py listen` judges the placed takes, `listen.py` the mix and its sync.

**The kit.** Every effect is a take of the film's **sound kit**, `audio/kit.json` (a recorded take from the catalogue where `sfx.mjs` placed one, the earshot render as the fallback): one sound per role (the cue kinds and their variants), chosen from the bank of [earshot](https://github.com/Leonxlnx/earshot), a separate, optional tool that designs sounds in code and checks them by measurement. `scripts/audio/kit.py render` has earshot render every role into takes in `audio/kit/` (24-bit WAVs), with each take's onset, loudest point, end, loudest-50 ms level (`l50_lufs`) and stereo correlation (`corr`) in `audio/kit/kit.lock.json`; `plan.py` and `score.py` place those takes on the cue frames. Rendering is pure DSP (no models, no network): seconds for a cached kit, under a minute for a fresh one.

In order of preference:

1. **An earshot kit** (always): a preset edited per film. Every take is deterministic, audited (`kit.py check`: clicks, cut tails, a pitch that climbs, stacked attacks) and tuned through its recipe's own pitch parameter, never resampled.
2. **An earshot fit of a recording**: `earshot fit` turns a public-domain (CC0) recording, or one the user owns, into a recipe that renders variations of it; earshot adds it to the bank as `fit/<role>/<name>` and the kit names it like any other sound. Use it when a role needs a material the bank lacks.
3. **A free real effect where the bank is weak for an action**: a sound effect under a licence that needs no credit (Mixkit's free sound effects; CC0 effects on Wikimedia Commons and in Openverse, whose own page `get` reads again), found with `node scripts/music.mjs search --kind sfx --mood "<the action in words>"` (paper slide, camera shutter, switch; `--source mixkit|commons|openverse` narrows it), downloaded with `get '#n' --kind sfx --to audio/sfx` (its licence record beside it, the same record a track has), made the takes of that action's role with `python3 scripts/audio/kit.py real audio/sfx/<file> --action <action>` (measured, peak-normalised, three takes at the role's own mix keys, the lead-in trimmed: below) and judged with `kit.py listen` against the action like any role; `credits.py` lists its record. No other downloaded effect is used.
4. **The sound library: real recordings for every action, film after film.** A library (`scripts/audio/library.py`: a `library.json` with its effects beside it, found by `--library`, `$CINETIC_SFX_LIBRARY` or `~/.cinetic/sfx-library.json`, which may hold `{"link": "<path>"}`) keeps effects whose licence needs no credit, filed by action. `library.py add <file> --action <action>[,<action>]` takes an effect downloaded with its licence record (item 3), keeps its first gesture (from the onset to a 45 dB decay or the next attack, at most the action's length; a shutter's second stage stays), levels it to −16 LUFS over its loudest 50 ms under a −1 dBFS peak, and tags it: length (tiny, short, medium, long), transient (sharp, firm, soft, swell), character (dark, warm, mid or bright; tonal or noisy; dry or ringing; wide; low) and, for a tonal sound, its note. Every sound also keeps its power per octave band, where in them it is heard (A-weighted) and its mean power against its loudest 5 ms, for the cast's masking check. `library.py listen` has earshot's ears judge every sound against each of its actions (the winners rank first; winners differ little among themselves, so the track decides between them); `library.py check` re-reads every file and record; `library.py measure` measures every cut again after an update of these measures; `library.py list` shows it by action. Keep six or more distinct sounds for every action your films use, so no two films need the same set. With a library, `kit.py cast` draws from the bank and the library together (below); a library pick is copied into `audio/sfx/` with its record and plays as the takes of its action's roles (`audio/kit/real.lock.json`), so the film rebuilds without the library, and `credits.py` lists it.
5. **A recording's lead-in never plays ahead of its picture.** Recordings can carry room tone or a quiet press 30-80 ms before the transient (a mouse click, a shutter, a card landing on a desk). `plan.py` puts a take's onset, its transient (the first sample at 10 % of the peak), on the cue frame, so that lead-in would be heard before the picture. For every role aligned on its onset, `kit.py cast` and `kit.py real` cut a recorded take heard more than 12 ms before its transient to 5 ms before it, with a fade-in over those 5 ms; the transient and everything after it stay as recorded. Whooshes, risers and swells (aligned on their peak) keep their build. Takes placed before this: `python3 scripts/audio/kit.py trim`, then `npm run audio` and mux again; `kit.py check` lists any left.
6. **Nothing else ships.** A cue whose role the kit does not name, or an explicit note no take sounds, fails the soundtrack's gate. `score.py --draft` plays placeholder voices for them, for a timing check only: its report says `"draft": true`, and `deliver.sh`, `credits.py` and `av-audit.py` refuse it.

What the kit route gives the film:

- **Sample-accurate and re-timeable.** Every take is placed by its measured sync point on the exact frame the picture code computes, shifted by its role's offset. Retime an act and the next `export-cues.ts` + `npm run audio` moves every sound with it.
- **Tuned.** Tonal roles (a struck bell, a mallet, a pluck, a sub drop) render in the film's key (`kit.py tune`); with a track the key is the track's (`track.py analyze` reports it). An explicit note (a hand-set `pitch`, a progress rung) plays only a take on that note.
- **Levelled to the music.** With a track each effect is set `bed_db` over the bed as it plays at that moment (§7), so a pop sits where it should over a quiet intro and over the full groove alike. Effects-only, each role plays at its `level_db`, each take trimmed toward its role's median loudness.
- **Deterministic and licence-free.** The same kit renders the same takes; the bank's recipes are code.
- **One source of truth.** Bars, cues and sync points come from `src/timeline.ts`, `src/music.ts` and the act modules, never from a second, hand-typed list.

**Presets and roles.** A cue plays the role of its kind and variant; a role the kit sets to `null` is off (its cues are skipped and listed). The `launch` preset (a film cut to a track; earshot 0.4+, as the starters ship it) and the `calm` preset (effects-only):

| Cue (kind, variant) | Role | launch: sound, bed_db, offset | calm: sound, level_db |
|---|---|---|---|
| `text` | `text` | a soft felt pluck on the pentatonic, 4 dB, 0 ms | a soft kalimba pluck on the pentatonic, −12 |
| `hit` | `hit` | one short punchy cut hit, 7.5 dB, 0 ms | one struck bell on the tonic, −3 |
| `drop` | `drop` | a short kick-led sub hit on the root, 7 dB, 0 ms | off |
| `land` / light | `land` / `land.light` | a round low pop-in thump, 8 dB, +30 ms / a finger tap, 3 dB, −60 ms | a round low thump / a soft fingertip, −5 / −8 |
| `pop` | `pop` | the soft rounded mid pop, 8.5 dB, +4 ms | a soft plop, −2.5 |
| `snap` | `snap` | a camera shutter, 4 dB, +9 ms | a switch flip, −3.5 |
| `tick` / crisp / `tock` | `tick` / `tick.crisp` / `tock` | an airy tick set wide, 3 dB / a bright tink, 3 dB / a wooden knock, 8 dB, −40 ms | dominoes / a glass touch / a knuckle knock |
| `whoosh` short / long | `whoosh.short` / `whoosh.long` | a fast air whoosh, 9 dB, peak +37 ms / a big low whoosh with a thump, 8.5 dB, peak +3 ms | a bamboo swish / an air swell |
| `riser`, `swell` | same | a short dark riser, 8 dB, peak −23 ms / a dark reverse swell, 9.5 dB, peak +42 ms: about one a film, at a section change | off |
| `key` / space / return | `key` / `key.space` / `key.return` | realistic mid keys, 6.5 / 6.5 / 7 dB, +8 ms | a thocky key / a space bar / a deep cap |
| `click` / confirm | `click` / `click.confirm` | a small plastic click, 6.5 dB, −11 ms / a rounded mid ding, 8.5 dB | a plastic click / a soft tuned pluck |
| `bell` | `bell` | a glockenspiel note on the pentatonic, set wide, 7.5 dB, −20 ms | the kalimba on two octaves of the pentatonic |
| `suck` | `suck` | off (the stop-down does its job) | off |

**Every sound for its action.** A kind says where an effect sits and how loud; its action says what the picture does, and the action picks the sound. `scripts/audio/actions.py` holds the actions, each with its own bank members in order of fit and the words that name it. earshot's ears ordered each list: the members that win its forced choice of the action's own description against cheap-synth alternatives (a laser zap, a video-game blip, an 8-bit sound, a rising synth whip) lead, the rest follow by how close they came. Where no member wins (swipe, slide, build, press: the bank is weak there), `kit.py cast` says so and names the real-effect route (item 3 above). A sound library's sounds for the action join its list (item 4): ahead of the bank where it is weak, interleaved with its members elsewhere, a library sound the ears heard lose to a cheap-synth alternative behind them:

| Action | Kinds | The sound (bank members, first in order of fit) |
|---|---|---|
| `card-land` | land, pop, tock | a card or a sheet landing on a table (`pro_pop_in/knock`, `tap/table`, `pro_pop_in/airy`) |
| `appear` | pop | a soft rounded pop, something appearing (`fit/pop/mouth_plop`, `fit/pop/lip_pop`, `drip/tiny`) |
| `toggle` | snap, click, tock | a small switch flipped (`toggle/on`, `toggle/latch`, `toggle/rocker`) |
| `press`, `touch` | click; land, click, tock | a soft button click (`fit/click/floss_lid`, `pro_click/mouse`; weak); a finger tap on a screen (`fit/land.light/finger_phone`, `tap/soft`) |
| `type` | key | a mechanical key (`typing_key/clicky`, `typing_key/crisp`, `typing_key/laptop`, `fit/key/lubed`) |
| `swipe`, `slide`, `whip` | whoosh | a card or a page swiped (`fit/whoosh.short/bamboo_swish`, `swipe/cloth`; weak); a thin quick swish (`swish/stick`; weak); a fast whip (`whoosh_fast/tight`, `whoosh_fast/crisp`) |
| `pass`, `shape` | whoosh, swell | a big low whoosh, a scene passing (`whoosh_big/thump`, `whoosh_big/cape`); a soft air transition through a shape (`swipe/velvet`, `swish/soft`) |
| `lock`, `jump-cut`, `detent`, `letter` | tock, snap, tick | a knock, a part locking in (`knock/wood`, `knock/snap`); a dry click on a cut (`shutter/quick`); a detent (`pro_hover_tick/detent`); a tiny letter tap (`pro_tap/glass`) |
| `logo-lock` | hit, drop, land, pop, snap, bell at the lockup | one clean element under the logo (`pluck/kalimba_ring`, `pro_sub_drop/quick`, `notify/mid_wood`) |
| `reveal`, `thud` | hit; drop | a single clean impact (`pro_impact/air`, `cut_hit/punch`); a deep short sub (`pro_sub_drop/quick`, `sub_drop/punch`) |
| `shutter`, `success`, `chime`, `text`, `swell`, `build`, `error` | snap; bell, click; bell; text; swell; riser; hit, snap | a camera shutter; a rounded ding; a struck bell; a soft plucked note; a reverse swell; a short riser (weak); a short buzz |

- **The action of an event:** its own `action` field in `src/sync.ts` (a name above, or an alias: `card`, `logo`, `tap`, `switch` …), else a hit, drop, land, pop, snap or bell within 3 frames of the `lockup` cue is the logo lock, else the words of its id and variant (`c2:card-3-lands` is a card landing, `hook:ratchet-2` a detent), else its kind's default (tick detent, tock lock, pop appear, land land, hit reveal, drop thud, snap shutter, a short whoosh whips and a long one passes, key type, click press). `python3 scripts/audio/actions.py --cues out/cues.json` prints every event's action.
- **The cast:** `python3 scripts/audio/kit.py cast` (after `npm run cues`, before `npm run kit`) gives each action of the film one sound, from earshot's bank and the sound library: the same action always the same sound, and a sound plays one action of a film, never two. Two presets of one recipe (`knock/snap` and `knock/plastic`) for two actions lose ground, so the film's sounds differ in kind as well as in name. A bank member the ears heard lose its action's forced choice gives way to a library sound of the action that won, an author's variant on such a member too (a `film` shutter rendered in code reads as a synth sweep; twelve recorded shutters win).
- **Matched to the track:** with a track every candidate is weighed against it. A sound that rings past its action's share of the beat at the track's tempo (half a beat for a press, a letter, a detent or a key; a beat for a landing, a knock or a shutter; one and a half for a swipe or a whip; a bar or two for the logo lock, a swell or a build), one the track masks where the action's events land and a tonal recording off the key all lose ground. The masking check reads the track as the edit plays it: per octave band, the sound at its role's level over the bed (its loudest 5 ms against the music around the event, held for its length) against the music's power over the 0.4 s after each of the action's events; a sound whose best band, among those where it is heard, stands less than 3 dB over the music loses ground, more the deeper it sits (a low thump under a kick-heavy track, a mid pop under an arpeggio). An effect is read by its spectrum, never by level. Without the track's audio (no ffmpeg) the cast weighs the centroid instead. A tonal library sound is tuned to the key by up to a semitone (the pentatonic for bells, plucks, dings and the logo lock, the scale for the rest); on a role with notes (the text chain, the bell) it plays a take on each of the role's notes, every take within six semitones of the recording, in one register (a second sound an octave away is left out). The bank's tonal roles are tuned by `kit.py tune`; the cast tunes before it places the library's takes, and a later key change needs a new cast. The bank's sounds are measured once per earshot version (`~/.cinetic/bank-feats.json`).
- **Busy actions:** an action with four events or more on a library sound takes a second library sound of the same action and length beside it; its takes alternate, so a run of badges never repeats one recording.
- **Roles:** the action a kind plays most re-voices that kind's role (its `bed_db`, `offset_ms` and `min_gap_ms` stay); any other action on the kind gets a role of its own, `<role>.<action>` (`land.card_land`). A variant that names a member (`variant: 'plastic'`) is preferred; near-equal members differ from film to film. A tonal role keeps its pitches on a pitched member and is tuned again. A role cast to a library sound keeps a bank sound in `kit.json` as its fallback render. `kit.json` keeps a `cast` block (the roles' own specs and the library picks, so casting again starts clean and removes the takes an earlier cast placed); `kit.py cast --no-library` casts from the bank alone.
- **Judge and cast again:** after `npm run audio` and `kit.py listen`, a member the report lists as masked under this track (`events.masked`: an effect several dB under the music in its best band) or one the ears flag gives way: `kit.py cast --avoid <sound>,<sound>` takes the next member of its action and remembers the list; render, plan and score again. A low thump under a kick-heavy track and a mid pop under an arpeggio are the usual ones.
- **Film to film:** the sound history (`~/.cinetic/sound-history.json`, or `$CINETIC_HOME`) records each film's cast and its signature sounds (the reveal, the logo lock, the thud, passes, shapes, swells, builds, the text sound and the film's most frequent action). The next film never takes the previous film's signature sounds while its action has another, the signatures of the four films before it lose a lot of ground (several films are made at once), and the sounds it used lose a little; a sound whose takes earshot renders cut off or clipped is skipped at the cast (the known ones, and every one a film's render flagged, which the history keeps); a film's set of sounds never equals an earlier film's (the action that loses least takes its next sound). `python3 scripts/audio/actions.py --history` shows it.
- **Takes:** each cue plays the take of its role least recently played, never one heard within 3 s while the role has another (two roles cast with one sound share their takes' identity); keys keep one take per key identity. `plan.py` lists a take that repeats within 3 s.
- **Restraint:** fewer, better sounds; the music carries most moments. With a track, while any 10 s holds more than 10 effects (`score.json` `"sfx": {"restraint": N}`, or `"off"`; a typing run counts once), `plan.py` silences whole actions, the lightest first (letters and detents, then pops, cuts, touches, locks, presses, toggles, shutters, slides, typing, swipes, whips, card landings, landings), never part of one (coverage stays whole) and never the reveal, the logo lock, the thud, a pass, a shape transition, a swell, a build, an error or an action one of whose events is structural, forced, the payoff or the lockup.

The calm kit's fitted roles are public-domain recordings that earshot fitted as code; each role's `note` in `audio/kit.json` says why it was chosen. `kit.py init --preset <name> --force` writes a preset (tuned to `score.json`'s key; the notes in house wording); `earshot sfx list` shows the whole bank; `kit.py audition` plays every take at its level, and `kit.py audition --over-bed` plays every take over 2 s of the film's own track at its `bed_db`.

**kit.json** (schema 1, written by `kit.py init`, edited by hand):

```json
{"kit": 1, "name": "launch", "sr": 48000,
 "roles": {
   "pop":  {"sound": "ui_pop/soft", "takes": 4, "align": "onset", "bed_db": 8.5, "offset_ms": 4, "min_gap_ms": 114, "level_db": -8.0},
   "bell": {"sound": "mallet/glock", "pitches": ["A4", "C5", "D5", "E5", "G5"], "takes": 1, "bed_db": 7.5, "offset_ms": -20, "width": 0.6},
   "suck": null},
 "mix": {"level": "bed", "duck_db": 0, "stop_down": {"before": ["hit", "drop", "whoosh.long", "swell"], "depth_db": [6, 12], "length_s": [0.3, 0.5]}}}
```

`sound` is a bank id; `takes` how many to render (a new take per cue, the least recently played, never one heard within 3 s while the role has another; keys keep one take per key identity); `edits` the knobs every take renders with (`dur`, `apex`, `pitch`, `peak_db`); `pitches` one set of takes per note; `align` the sync point (`onset`, `peak` for whooshes, risers and swells); `max_s` fades a long tail; `level_db` the effects-only level; `bed_db`, `offset_ms`, `min_gap_ms`, `width` the mix keys (§7); `mix` the kit-level stop-down ranges and density band. Change a role, run `npm run kit` (only the changed takes render again).

**Finding earshot** (`kit.py where` says which one is used and whether it has the launch preset): `--python`, `score.json` `sfx.python`, `$EARSHOT_PYTHON`, an `earshot` importable in the interpreter running the script, `earshot` on `PATH`. earshot normally lives in its own virtualenv: point `EARSHOT_PYTHON` at that interpreter (`docs/setup.md`). `EARSHOT_PYTHON=none` turns it off; the rendered takes in `audio/kit/` then play as they are (vendored), so a film rebuilds where earshot is not installed. With neither earshot nor takes the build fails.

## 2. Pipeline and gate

**One command: `npm run sound`** (`node scripts/sound.mjs`). It needs no setting: it finds a Python with the mix's packages (scripts/py.mjs first, then the interpreter an earlier run found and the earshot virtualenv) and earshot (kit.py: the interpreter an earlier run found, `~/earshot/.venv`, a 0.4 checkout beside an older one; what works is remembered in `~/.cinetic/tools.json`). It analyses and fits a licensed track that is not cut yet (never an edit already there), exports the cues, writes the kit from the launch preset when there is none, casts it when this film's actions are not cast (`--recast` casts again), renders it (cached), plans and mixes. A hero sound the track buries is cast once more without it. A step that cannot run says why and falls back: a timeline that does not import keeps the last cues; no earshot and no rendered takes play the bed alone (`PARTIAL`). Its last line: `PASS` / `FAIL` / `PARTIAL`, the loudness, how many of the picture's events land as hits, and the ending. `npm run sound -- --bed-only` is the edited track alone, before any cue exists. The steps it runs, one by one:

```bash
# Step 3 (references/music.md): music.mjs search / sheet / get, then track.py analyze / edit / grid / check  (npm run music)
npx tsx scripts/export-cues.ts                       # src/sync.ts -> out/cues.json        (npm run cues)
python3 scripts/audio/kit.py cast                    # each action its own sound (bank or library) -> audio/kit.json
python3 scripts/audio/kit.py render                  # audio/kit.json -> audio/kit/ takes   (npm run kit, cached)
python3 scripts/audio/plan.py                        # out/qa/sfx_plan.json + out/qa/cues_sounded.json (npm run plan)
python3 scripts/audio/score.py --cues out/cues.json --score audio/score.json \
    --out public/audio/soundtrack.wav --stems out/stems --json out/qa/score.json   # (npm run audio: plan, then score)
python3 scripts/audio/score.py ... --bed-only        # the edited track alone (no out/cues.json needed: the edit gives the length)
python3 scripts/audio/listen.py                      # earshot's ears: out/qa/listen.json + sound_sheet.png (npm run listen)
python3 scripts/audio/kit.py check                   # the kit against the film's cues + earshot's audit of every take
python3 scripts/audio/master.py --measure public/audio/soundtrack.wav   # loudness, true peak, LRA, PLR of any WAV
python3 scripts/audio/credits.py                     # Step 8: CREDITS.md + CREDITS_description.txt (npm run credits)
```

`plan.py` decides every effect before anything is mixed (role, take, start, gain over the bed, width, runs, the hits the track carries, the stop-downs) and `score.py` renders exactly that plan over the staged, edited track (an effects-only film renders its kit at `level_db`). It writes a 48 kHz, 24-bit stereo WAV exactly `TOTAL / FPS` seconds long, the stems (`bed.wav` as played and `sfx.wav`, which sum to the premix) and the report. `render.sh --audio` muxes it (`references/finishing.md` §6); never let Remotion encode the audio. `render.sh --build-audio` runs cues, kit, plan and score first.

**The track only ever plays through `score.py`.** The timeline cut every act to the edit's film-time grid, and the edit puts bar 1's downbeat at its `film_t0` (0.25 s by default), its joins on their attacks and its ending on the track's own decay. A film whose effects are not made yet renders the edited track alone with `score.py --bed-only` (the same bed, staging and master as the full mix, no kit read). Never cut the track by hand with ffmpeg: a cut from the first segment's `src_from` at 0 s drops `film_t0` and puts every downbeat 250 ms early against the cuts, and an intermediate lossy encode can add its priming pad on top (2048 samples at 44.1 kHz is 46 ms of silence); the mux lag gate passes it anyway, because the WAV and the MP4 agree with each other.

**Hits on the picture, the arc and the end (with a track).** The track carries the film; the moments the picture lands
are where the ear must mark a hit. `plan.py` gives each moment (a seam through a shape or a cut, a card or device
landing, the claim, a tap that does the thing, the lockup; weight 0.45 or more) a breath of the music before it: 7 dB
(8 at weight 0.8+) for the musical length nearest 0.4 s within 0.22-0.32 s, back on the frame, inside the stop-down
spacing (2 s apart, 3 in any 10 s), the most important first: the effect then lands as a salient hit (a 100 ms block
6 dB over the 200 ms before it, as earshot reads a film against its picture). The rest play over the bed: never every
event, never a click track. `score.py` reports `accents` (the share of events with a salient hit within 100 ms; under
30 % warns) and warns on a click track (over 85 % evenly spaced). The arc ride: once the product's first moment comes,
the music never plays under its opening; where the edit's body sits lower, the opening steps down (up to 3 dB) and the
body's dips are lifted (up to 4 dB, slewed 3 dB a bar), building 1 LU into the reveal, the break before the reveal kept
(`ride` in the plan and the report; it is the arrangement's level, not a duck). The end: a hit ending's lockup takes
the deepest stop-down, the bed's last downbeat comes back 6 dB under its level for the hit and its release, and that
chord rings out through a hall as long as the end card holds (2.8-6 s): the lockup lands and the music resolves under
it, never a fade under nothing, never a stop. When the edit's last bar line comes after the lockup with nothing on it,
the lockup stays the last hit: from it the bed plays 6 dB under, and its last downbeat rings out on the bar line
(reported; an element on the bar line, or a body ending on the lockup's bar, ends it cleaner).

**Gate (Step 8):**
- loudness: the target ±0.5 LUFS integrated (§9), true peak ≤ −1.5 dBTP on the WAV, last 480 samples digital zero;
- no generated music (`music.source` is `none` or `track:<record>`) and every effect from the kit (no placeholder voice, nothing missing; a `--draft` render never passes);
- with a track: every effect within ±2 dB of its role's `bed_db` (warn per role), a measured dip of 6 dB or more before every stop-down target and the bed back within 3 dB on the hit (a failure at the payoff), no ducking anywhere (the bed's gain moves only for stop-downs, silences and the end fade), every join clean (no click, the incoming attack within ±2 ms of its film downbeat, a loudness step under 3 LU unless it is the entry), density 3–13 effects per 10 s (no floor for a sting of 8 s or less: one element), one gesture (no heavy effect on the track's own accent), one element at the lockup;
- the report clean or every warning answered. `score.py` exits 1 when a gate fails.

After the mux, `scripts/check-sync.py` gates lag ≤ 48 samples and ≤ −1 dBTP on the decoded MP4, and, whenever `out/cues.json` exists, every sound against its frame on the decoded audio: each placed effect of `out/qa/sfx_plan.json` is found in the mix by cross-correlation with its take as `score.py` plays it (the edited bed and the other placed effects taken out first, a thump matched in its lows or over 150 Hz, whichever is clearer, so a quiet key under the music or a landing under a whoosh's tail is still found; a far match that is not clear is only a warning while the take matches nearly as well where the plan put it, else the effect fails), and the take's own sync point, the one `plan.py` put on the cue (its onset, or the loudest 5 ms for whooshes, risers and swells, measured on the file under its lock's rule), must sit within ±1 delivered frame of its cue frame (a role's planned offset widens its own side only; `--strict` drops that; a take changed after it was locked, or a recording's pre-roll heard more than 45 ms before its picture, warns); the edited track, rebuilt from `edit.json`, must sit within ±1 frame of where the edit puts it at every act change, structural cue and declared seam, so the track's own hits land on the cuts (`--picture` also measures the picture's cut at every act change). Each effect and each cut is listed with its offset in frames. Then `scripts/av-audit.py --stems out/stems` checks every onset against its intended time (`out/qa/cues_sounded.json`: the cue plus the role's offset), the structural cuts against the music (`music_sync`) and the masking margin per role (`references/review-loop.md`); with earshot, `listen.py` adds a listening pass (§9.1). `deliver.sh` runs `credits.py` for a film with a track and refuses to deliver without a valid licence record or a CC BY credit line (`references/music.md` §8).

## 3. cues.json and the event kinds

```json
{ "fps": 60, "bpm": 124, "total": 900,
  "acts": { "statement": { "from": 0, "dur": 360 }, "reveal": { "from": 360, "dur": 540 } },
  "cue":  { "reveal": 360, "lockup": 820 },
  "events": [ { "f": 358, "kind": "whoosh", "weight": 1, "pan": -0.5, "apexFrac": 0.9, "dur": 42, "id": "statement:push" },
              { "f": 360, "kind": "hit", "weight": 1.5, "structural": true, "id": "reveal:product" } ],
  "music": { "bpm": 124, "t0": 15, "downbeats": [15, 44.03], "accents": [{ "f": 360.2, "db": 9.4, "band": "low" }] } }
```

| Field | Meaning |
|---|---|
| `f` | absolute frame the sound belongs on; fractional is fine (`b(3,3,2)` = 352.5) |
| `kind` | one of the kinds below; anything else fails `export-cues.ts` |
| `weight` | 0–2, 1 = normal. Scales level (20·log10, within −12..+6 dB), the stop-down's depth; picks heavy vs light landings and whoosh size |
| `pan` | −1 left … +1 right, from the object's screen x. Effects sit within ±0.15; whooshes, risers and swells travel along it |
| `pitch` | optional MIDI number or note (`"Eb6"`). Leave it out: the chord logic picks a tone in key |
| `apexFrac` | `whoosh`/`suck`: the fraction of the move that lands on `f` (default 0.5 / 0.85) |
| `dur` | frames; length of the move under a `whoosh`, `riser`, `swell`, `suck` |
| `variant` | `key`: `word` (word start), `space`, `return`, `back`; `tick`: `crisp`; `click`: `confirm`; `land`: `light`; `pop`: `down`. A variant that names a bank member of the event's action (`plastic` for `knock/plastic`) is preferred by the cast |
| `action` | what the picture does (§1, every sound for its action): `card-land`, `toggle`, `type`, `swipe`, `logo-lock`, `shape` …; without it the id's words and the kind decide |
| `structural` | `true`: an act or section change, the reveal, the ending. `av-audit.py` checks it lands on the music (`references/music.md` §7) |
| `force` | `true`: sound this hit even where the track's own accent carries the moment |
| `offset_ms` | this event only: where the take's sync point sits against the frame (−500..500), instead of its role's offset (rare) |
| `salience` | how much of the frame the event owns (`grid-check.ts` reads it with the timeline's `SALIENCE` map) |
| `id` | a label for QA reports; the starter prefixes the act (`mark:dome`); the take choice hashes it with `f` |

| Kind | Picture event | `f` is |
|---|---|---|
| `text` | a copy fragment resolving: the phrase is fully readable | the frame its last word visibly comes to rest (`chainResolves()` in the starter) |
| `tick` / `tock` | the device keeps time | the pulse's start |
| `pop` | something appears: a word, a badge, a chip | its 50% frame |
| `snap` | a lock-in: a line closing, a piece seating, a snap zoom | the contact frame |
| `land` | an in-shot landing | the contact frame |
| `hit` | a slam, a cut on impact, the reveal | the contact / cut frame |
| `drop` | the one sub hit on the wordmark at a hit ending (it rings 1.5 s or more through the hall) | the frame the wordmark becomes readable |
| `whoosh` | a camera-scale move, a flight, a whip | the velocity peak |
| `riser` | tension into a section change | the arrival |
| `swell` | a reveal that blooms | its peak |
| `suck` | an implosion into silence (off in every preset) | the implosion's end |
| `key` | a typed character | the character's frame (fractional) |
| `click` | a cursor press | the press frame |
| `bell` | a chime: a success, a progress step | the strike |

Not every event sounds: `plan.py` lists every silent one with its reason (`off`, `thinned`, `carried` by the track, `missing`), and `out/qa/cues_sounded.json` holds only the events that received a sound, each at its intended time.

## 4. Writing src/sync.ts

`src/sync.ts` default-exports `cues()`, which returns the events. It imports the constants the acts animate with, so every frame is computed. The starter's version is the pattern (excerpt):

```ts
import { DOT_TRAVEL, STATEMENT_SIZE } from './acts/Act1';  // acts export what the sound needs
import { HERO } from './acts/Act2';
import { chainResolves } from './fx/Chain';
import { peak, settleOf } from './lib/sync';
import { ACT, CUE, TOTAL, W } from './timeline';

const panX = (x: number) => Math.max(-0.8, Math.min(0.8, ((x - W / 2) / (W / 2)) * 0.8));
/** A move from a to b on `ease`: a whoosh as long as the move, apex on its velocity peak. */
const move = (m: { from: number; to: number; ease: (t: number) => number }, weight: number, pan: number, id: string) => {
  const apex = peak(m.from, m.to, m.ease);
  return { f: apex, kind: 'whoosh', weight, pan, dur: m.to - m.from, apexFrac: (apex - m.from) / (m.to - m.from), id };
};

export default function cues() {
  return [
    ...chainResolves('statement', { size: STATEMENT_SIZE })                  // each fragment comes to rest: one soft sound
      .map((f, i) => ({ f, kind: 'text', weight: 0.8, id: `fragment${i + 1}` })),
    move(DOT_TRAVEL, 1, -0.5, 'dot-flight'),                                  // flies left
    { f: settleOf(DOT_TRAVEL.from, DOT_TRAVEL.to, DOT_TRAVEL.ease), kind: 'tock', weight: 0.7, id: 'dot-seats' },
    { f: CUE.pieceA, kind: 'land', weight: 1, pan: panX(HERO.x + 150), id: 'dome' }, // spring started by delayTo
    { f: CUE.lockup, kind: 'hit', weight: 1, structural: true, id: 'lockup' }, // a stop-down, then one clean element
  ];
}
```

Where the sound goes (the helpers and their spring numbers are in `references/timing-grid.md`):

| Picture event | Frame | Helper |
|---|---|---|
| Landing, impact, lock-in | contact: the first frame the spring reaches 1.0 (0.92 if it is nearly at rest) | `hit(start, cfg, 1)` |
| Tween into contact | its last frame | — |
| Pop-in | 50% of its travel | `hit(start, cfg, 0.5)` |
| Tween that settles | the 97% frame, never the last frame | `settleOf(a, b, ease)` |
| Text or a wordmark arriving | the frame it becomes readable: the `settleOf` of its reveal (a chain fragment: `chainResolves()`), never the tween's end or the next bar line | `settleOf`, `chainResolves(id, {size})` |
| Whoosh (camera-scale moves, logo zooms) | apex on the velocity peak, length = the move, its onset 100–450 ms before the apex | `peak(a, b, ease)` |
| A cut on the music | the track's accent within a frame (`MUSIC.accentNear(f)`, `snapToAccent(f, tol)` in `lib/sync.ts`) | `references/music.md` §7 |

The role's offset is applied by `plan.py`, never folded into the cue frame: the picture's frame stays the truth, and taps, knocks, clicks and bell notes lead it by their designed few milliseconds while pop-in thumps and whoosh peaks land after.

- **Name each event by what it does:** `id: 'c2:card-3-lands'`, `'s:theme-toggle'`, `'m:circle-morph'`, or an `action` field: the cast gives each action its own sound (§1).
- **Every sound has a visible cause; not every picture event gets a sound.** Sound discrete state changes (a press, an insert, a lock, a counter landing, the logo assembling) and leave continuous motion silent (scrolls, streaming text, progress bars, rolling counters, hovers). With a track, 3–13 designed effects per 10 s; an effects-led passage runs denser. Effects cluster where the music is sparse (a cold open, typing, the logo build) and thin out once the full groove plays.
- **Coverage is all or nothing.** Once a class of action is sounded, every instance gets the same sound at the same level.
- **Most cuts carry no sound of their own.** The music carries them; cut them on its accents (`references/music.md` §7). A whoosh (about 2 a film) goes only on a camera-scale move or a logo zoom; a hit (about 2 a film) is structural.
- **One gesture at a time.** A cut that lands on a strong accent of the track is carried by it: a `hit` or `drop` there gets no take (`plan.py` marks it `carried`; `force: true` overrides). Designed hits go where the music has nothing, after a stop-down; UI sounds go on discrete state changes.
- **Move the picture, not the sound.** When a hit belongs on the beat, start the spring at `beat − delayTo(cfg, 1)`. Audio that leads its picture by more than ~45 ms reads as "sound first", except a role's designed lead.
- **Text: one sound per fragment.** A `text` event on the frame each fragment resolves (§5.7), never one per word.
- **The lockup is ONE clean element, and the music never cuts out under it.** Nothing else lands with it (no whoosh into it, no riser). With a track the track's own final hit carries it and rings out (`track.py edit --end own`, the default when the track has an ending), or the bed fades over 2–3 s under the end card (`--end fade`), or the bed is released under one kit hit that rings 1.5 s or more (`--end hit`). Never a bed stopped dead into silence (`references/music.md` §6).
- **Effects are dry and centred**, within ±0.15 of the centre; the roles with a `width` (ticks, bells) keep the stereo earshot rendered them with, and whooshes, risers and swells travel along the cue's `pan`.
- **Typing:** one `key` per character from the same `CHAR_AT` array the picture types with, at its fractional frame; mark word starts `word`, spaces `space` and a final `return` (§5.5c).
- **Check the file.** Open `out/cues.json` and read it against the contact sheet, then `out/qa/sfx_plan.json`: every event has a picture, every sounded class is complete, nothing continuous is sounded.

## 5. score.json

The starter's `audio/score.json` already plays a track at `audio/music/track.mp3`, which a starter cannot ship:
until the film's licensed file and its record are there, `npm run audio` stops with "not found"
(`audio/music/README.md`). A film cut to its own track (`audio/score.track.example.json`; `new-film.sh --music`
and `track.py grid` write it):

```json
{
  "key": "A minor",
  "music": { "track": "audio/music/deep_urban.mp3", "edit": "audio/music/edit.json",
             "licence": "audio/music/deep_urban.licence.json", "gain_db": 0 },
  "sfx": { "engine": "auto", "kit": "audio/kit.json", "python": null },
  "stopdowns": { "auto": "kit", "add": [], "skip": [], "quiet_db": -7 },
  "ending": { "mode": "own", "at": "@lockup" },
  "payoff": "@reveal",
  "master": { "lufs": -14, "ceiling": 0.77, "fade": 1.3 }
}
```

### 5.1 Fields

| Field | Default | Meaning |
|---|---|---|
| `key` | `"C major"` | tonic + mode (major, minor, dorian, mixolydian, lydian, phrygian). With a track, the track's key (`track.py analyze`) |
| `bpm` | timeline | optional; must equal the timeline's `BPM` (with a track, `src/music.ts`'s); leave it out with a track |
| `music` | `"none"` | `"none"`: effects only. `{track, edit, licence, gain_db}`: the licensed track, its edit (`track.py edit`), its licence record (`track.py add`) and a trim after staging. `"synth"` exits 1 |
| `sfx` | `{"engine": "auto", "kit": "audio/kit.json"}` | `engine` `auto` (render when stale, else the takes as they are) or `earshot` (render or fail); `kit` the kit file (its takes in the folder of the same name, or `takes`); `python` the interpreter that has earshot; `restraint` the effects any 10 s may hold before whole actions go quiet (default 10 with a track; `"off"`). `"synth"` is a `--draft` build only |
| `chords` | — | optional, one entry per bar: it steers which tones a text chain steps through. Without it the tuned roles follow the key's scale and triad |
| `stopdowns` | `{"auto": "kit"}` | `auto`: a stop-down before every hit, drop and swell the kit lock names (a swell of weight 1 or more, or a structural one; `"off"` for none); `add`: extra targets (`{at, weight?, depth?: "stop"}`); `skip`: event ids or cue names to leave alone; `quiet_db`: where an effect plays with no bed under it (default −7, §7) |
| `ending` | — | informational (`{mode, at}`): the edit decides the ending (`own`: the track's `button` or `ring`; `fade`; `hit`) |
| `silences` | `[]` | `{from, to, depth?}`: true silence for a designed freeze; mutes everything, effects included; the picture freeze sits exactly on it (≤ 15 f) |
| `payoff` | — | the moment that must be loudest: the biggest reveal on the track's entry, about 75–90% into the film (`references/formats.md` §2; in a sting, its hit); the report checks it. `"@reveal"` reads the timeline's `REVEAL` when no cue has that name (the starter's payoff: the name locking on the track's entry, before its ending). When a hit ending's element is the lockup, the payoff is still the reveal before it. On a `ring` ending whose last hit is the reveal (a sting), that hit is the payoff: add no drop on it (it doubles the track's accent) and keep at most a swell into it |
| `progress` | — | `{match, kind?, start?, tonic?, resolve?, gain?}`: the progress climb (§5.5b) |
| `typing` | `"auto"` | how `key` events sound: `auto`, `soft`, `mechanical`, `pitched`, `muted`, `word` or `off` (§5.5c) |
| `keyup` | `false` | `true` adds a key-release click on slow typing |
| `mix` | `{music: 1, sfx: 1, reverb: 1}` | bus trims for a film without a track. With a track every effect is levelled against the bed as played: the balance is each role's `bed_db` and the headroom `music.gain_db`, and a trim other than 1 warns (the over-bed and masking reads would no longer describe the master). The music never ducks: there is no duck, sidechain or suck to set |
| `master` | as shown | target `lufs` (default −14 with a track, −16 for a sting of 8 s or less with a track, −18 effects-only, §9), limiter ceiling (linear), the end fade (s) |

Older fields still parse, with a warning naming the replacement: `sections`, `signature.motif` and `motifs` are ignored (cinetic makes no music); `drops` becomes a stop-down (`stopdowns.add` with `"depth": "stop"` for its silence; the suck is gone); `mix.sidechain`, `mix.duck_db` and `mix.typing_duck_db` are ignored; a bare `"music": "<file>"` or `"bed"` plays the whole file from frame 0 with no edit and no licence record, which `credits.py` and `deliver.sh` then refuse.

**Times** are a frame number (`360`), a cue (`"@lockup"`, `"@lockup-6"`), or a string `"bar:beat:16th"` (`"4"`, `"3:2"`, `"3:3:2"`, 1-based bars, 0-based beats as in `b()`; with a track, on its measured downbeats).

**Chord symbols:** a root (`C`, `F#`, `Bb`), a quality, optionally `/bass`. Qualities: major (none), `m`, `5`, `6`, `m6`, `69`, `7`, `maj7`, `m7`, `mmaj7`, `9`, `maj9`, `m9`, `m11`, `maj7#11`, `add9`, `madd9`, `add2`, `sus2`, `sus4`, `7sus4`, `9sus4`, `6sus4`, `dim`, `dim7`, `m7b5`, `aug`.

### 5.3 Shaping the arc

With a track the arc comes from the edit, not from automation (`references/music.md` §6): the opening inside the track's intro (5–12 LU under the body for 2–3 s, the first sound by 0.15–0.45 s), the reveal on the track's entry after its break or stop, a mid-film dip from the track's own break (about 5 LU down at 40–80% of the runtime), the ending on the track's own final hit ringing out, a 2–3 s fade under the end card, or a hit that rings: never a cut.

- **The payoff is the loudest moment, clearly:** 2–3 LU or more over the median momentary loudness. If a later section of the track is louder, the edit is wrong: `track.py edit` penalises it and `score.py` warns.
- **The biggest reveal comes after a dip:** 0.2–0.5 s of break, stop or stop-down, then the entry on the reveal.
- **The lockup is the most resolved moment, not the loudest, and the music ends on a decay.** Launch music ends on the track's own last hit with its natural ring-out (about 2.5 s from the hit to silence, dead air under 0.1 s), on a short natural button, or on a fade under the end card; a film whose music stops dead reads as cut off. So: a `button` or `ring` ending (`--end own`) lets the track's final hit carry the lockup and ring for 1.5–2.5 s; a `fade` ending fades the bed out over 2–3 s under the end card (a track that fades or loops); a `hit` ending releases the bed over 0.5 s under ONE kit element on the bar line (`drop`, a kick-led sub hit tuned to the root, or `hit`), which `score.py` sends through the hall so it rings 1.5 s or more. The tail holds `MUSIC.end.hold`. `score.py` and `av-audit.py` fail an ending that falls 20 dB inside 150 ms with no decay after it, and warn on more than 1 s of silence after the music.
- **Effects-only:** the stop-down before the lockup is the 0.2–0.7 s with no effect before the hit, and the accents stand alone in silence.
- **Contrast is the arc.** A film with music of 20 s or more wants an LRA of 5–8 LU; choose the bars that give it.
- The tail holds the music's ending (`MUSIC.end.hold`, at least 60 f): the ring or the fade completes, the music and the effects fade over the last `master.fade` seconds and the WAV reaches digital zero on the last frame. An effect that starts inside the fade is mostly lost, and `score.py` names it.

### 5.4 Stems

`--stems DIR` writes `bed.wav` (the edited track as played: staged, with its stop-downs, silences and the end fade) and `sfx.wav` (every effect), which sum exactly to the premix; an effects-only film writes `sfx.wav` only. `av-audit.py --stems` compares effects with the bed they sit in, and the over-bed and stop-down gates read them. Stems mixed from a licensed track stay git-ignored and are never delivered.

### 5.5a Sound follows the personality

The sound's energy must match the brand's three adjectives (`references/brand-and-color.md` §2), and the row picks the kit and the music brief:

| Personality | Effects | Music brief (every film has a track) | Lockup |
|---|---|---|---|
| Calm, literary, unhurried | soft touches, one tuned voice, gentle air (`launch` with the `calm` kit's `text` and `hit` swapped in) | a soft pulse, 95–110 BPM, a long intro, a `ring` ending | one struck note with a long tail |
| Fast, exact, confident | tight clicks, pops in runs, a short sub (`launch`, crisp roles) | a clear four-on-the-floor, 120–128 BPM, an entry after a break, the track's own final hit (`own`) | a breath, then one sub hit that rings |
| Bright, friendly | pops and taps, a bell | a bouncy groove, a clear entry | the track's final hit (`button`) |
| Precise, expensive | sparse touches, low swells (`launch` with `minimal` roles) | minimal electronic with space | one low element after a stop |
| Raw, mechanical | ticks, detents, metallic hits | a dry, stepped groove | a hard latch |

Pick the row before writing `score.json`, and write it in `TREATMENT.md` next to the adjectives, with the music brief (mood, tempo range, an entry for the reveal, a break, the ending mode). A swapped-in role keeps the `bed_db`, `offset_ms` and `min_gap_ms` of the launch role of the same kind (`kit.py check` warns when a role has no `bed_db` in a film with a track).

### 5.5b The progress climb

When the story is progress (days of a streak, steps of a setup, items cleared), give each step one tuned note, one step higher than the last, and resolve on the tonic at the payoff. The ear hears "closer" before the eye counts. One rule keeps it from becoming a melody: at most two pitched effects in any 4 s, so the steps sit 2 s or more apart (closer rungs are thinned and listed).

```json
{ "key": "D major", "progress": { "match": "day", "kind": "bell", "resolve": "@streak" } }
```

- `match` picks the events: every event whose `id` contains it (and whose `kind` is `kind`, if given), in frame order.
- The rungs climb the notes the steps' role has takes for (the `bell` has two octaves of the pentatonic), and `resolve` lands the tonic above the last rung, with its octave below, at once: one gesture. An untuned role (a pop, a tap) cannot climb, and `score.py` warns.
- With a track, warn-free progress needs the track's key: `score.json` `key` from `track.py analyze`; the report warns when the key estimate is weak.

### 5.5c Typing

Most on-screen typing is best left silent; a sound per key suits typing in the foreground at a human rate, one per word fast type-ons. Pick one style per film; `auto` picks per run:

| `typing` | What it does | Use it for |
|---|---|---|
| `auto` (default) | per run: above 25 chars/s `word`, otherwise `soft` (thinned to about 12 sounded keys/s) | almost every film |
| `soft` / `mechanical` | a key take per key, dynamics below | typing in the foreground |
| `pitched` | as `soft`, levelled 6 dB lower | a placeholder style; with a kit the keys stay untuned |
| `muted` | 10 dB under the role's level | typed text that is background |
| `word` | one key take per word, on its word starts | fast type-ons, prompts that stream in |
| `off` | nothing | the picture types but any sound would compete |

The kit's `key`, `key.space` and `key.return` takes set the timbre (one take per key identity, so a key keeps its sound); the style shapes timing and level only. What every run gets: never two keys within 60 ms (or the role's `min_gap_ms`, 87 ms in the launch kit), runs faster than 12 keys/s thinned (word starts, spaces and returns kept); +2.5 dB on word starts, −0.3 dB per letter after, −1 dB before a space, σ 2.5 dB, −3 dB after the first 1.5 s, no jump over 5 dB between neighbours; σ 3.5 ms jitter; dry and centred. With a track each run's dynamics are centred on the role's `bed_db` (6.5 dB over the bed): the edit puts a sparse bar under foreground typing; the music never ducks under it. A bright run (its centroid over 3 kHz) warns and names the key take: give the role a darker member.

### 5.6 When the brand brings sound

- **Music supplied by the brand:** it is a track like any other: record its licence (`track.py add`, the brand's own licence quoted), analyse and edit it (`references/music.md`).
- **Sonic logo supplied:** place it as the lockup's one element (a kit role rendered from it with `earshot fit`, or the brand's file as a recorded role the user owns), after a stop-down.
- **Voice-over brought by the brand** (cinetic writes none): the bed sits at a static level under the voice (1.2–3.6 LU under it, statically mixed, never ducked), effects keep off the syllables that matter, and the density may rise to 18–30 per 10 s only if the picture asks for it.

### 5.7 Scoring a text-led film

- **One soft sound per fragment arrival, 0–80 ms after the visual**, on the frame the text becomes readable (±45 ms at the tightest): a `text` event on the fragment's resolve frame, and a chain's fragments step through the chord's tones among the text takes (two tuned notes in 4 s at most, so a dense chain sounds every other fragment).
- **Near-silence holds the reading.** Gaps of 0.6–1.75 s fall right after a line has fully arrived. The held line gets no ticks, pulses or moving beds; the next sound comes with the next picture event.
- **A big low hit only for the single reveal.** About 2 hits a film; the rest of the text sounds sit low.
- **The lockup is a stop-down and one element** (§5.3).
- **The track carries a text-led film too.** Choose a calm track (95-110 BPM, a soft pulse, room in the mix) and let its breaks hold the reading; the effects stay few and soft over it. An old project on `"music": "none"` masters at −18 LUFS.

## 6. Tuning

- **Every pitched effect is in key.** `kit.py tune` writes the tonal roles' `pitches` and `edits.pitch` from `score.json`'s key: `bell` and `text` on the key's pentatonic (a `text` role of three notes keeps the tonic triad), `click.confirm` and a struck `hit` on the nearest tonic, the launch `drop` on the root. With a track the key is the track's.
- **Each cue plays the take nearest the note its moment asks for:** a chain's text fragments step through the chord's tones (root, third, fifth, third), a bell on a chord tone near A♭5, a confirm on the pentatonic. An explicit note plays only a take on that note: with none the gate fails (add the note to the role's `pitches` and `npm run kit`, or drop the hand-set pitch).
- **Tuned effects never become music.** At most two pitched effects in any 4 s (so never three within 2 s); heavy and structural ones keep priority and the rest are thinned and listed. A tuned take fades out by 1.5 s. Noise roles (taps, whooshes, keys) are untuned.
- The report lists every tuned sound with its note and flags anything outside the key and the chord.

## 7. Placement and levels

Every effect is placed and levelled by `plan.py`, with the helpers of `scripts/audio/mixkeys.py` (the level model of earshot 0.4's kit lock, number for number):

- **Level over the bed.** A role's `bed_db` is where the mix's loudest 50 ms at the effect sits over the bed: over the median 50 ms K-weighted level of the music in the second before the effect's sync point (as it plays: with its stop-downs, silences and end fade). The take alone goes to bed + 10·log10(10^(bed_db/10) − 1) − its `l50_lufs`, never past a −1 dBFS peak (a clamped take is named in the report). A stop-down target reads the bed before its own stop-down, so the breath never makes the hit quieter. The weight adds 20·log10(w) within −12..+6 dB.
- **No bed under it.** Before the track starts, inside a stop or a silence, after a hit ending's release: the film's reference bed (the median bed level over its cues) plus `quiet_db` (default −7: an element in silence reads louder than the same element over a bed; the lockup after a stop then peaks near −7.5 dBFS in a −14 LUFS master).
- **Effects-only:** the role's `level_db` × weight, each take trimmed toward its role's median loudness.

| Role | dB over the bed (`bed_db`) | Offset (`offset_ms`) | Run gap (`min_gap_ms`) | Width |
|---|---|---|---|---|
| ticks, light taps | 3 | 0 / −60 | 66 / 115 | ticks 0.1 (wide) |
| text, snap | 4 | 0 / +9 | 110 / 66 | — |
| keys, clicks | 6.5 | +8 / −11 | 87 / 85 | — |
| drop | 7 | 0 | — | — |
| hit, bell | 7.5 | 0 / −20 | — / 110 | bell 0.6 |
| land, riser | 8 | +30 / peak −23 | 159 / — | — |
| pop | 8.5 | +4 | 114 | — |
| whooshes | 8.5–9 | peak +3 / +37 | — | travel |
| swell | 9.5 | peak +42 | — | travel |

Taps, knocks, clicks and bell notes lead the cut by a few milliseconds; pop-in thumps and whoosh and swell peaks land after. `offset_ms` moves the take's sync point, never the cue frame.

- **Runs.** Three or more events of one role within 250 ms of each other are a run: spaced to the role's `min_gap_ms`, and a run ends on an accent (`click.confirm`, `land` or `drop`), or the report says so.
- **Width.** Roles with a `width` keep the stereo earshot rendered them with (L/R correlation 0.1 for ticks, 0.6 for bells); whooshes, risers and swells travel along the cue's `pan`; every other effect is mono (as dual mono at unity: the level model's own measure) within ±0.15 of the centre.
- **Density.** 3–13 effects per 10 s in a music-led film (a typing run counts once); 18–30 under a brand's voice-over; 30–38 in an effects-led passage. Restraint keeps every 10 s at 10 or fewer by silencing whole light actions (§1).
- **Takes.** The least recently played take of the role, never one heard within 3 s while the role has another.
- **One gesture.** A `hit` or `drop` within a frame of a strong `low` or `mid` track accent (6 dB or more over its bed) is carried by the track; a heavy designed effect within 30 ms of a strong accent warns.

## 8. Mix

| Stage | With a track | Effects-only | Why |
|---|---|---|---|
| Bed | the edit's segments and joins, staged to −18 LUFS integrated, then `music.gain_db`; no EQ, no saturation | none | a mastered track at −8..−10 LUFS comes down 8–10 dB, which leaves headroom for effects at bed + 8 dB |
| Stop-down | before every hit, drop and swell (§8.1) | the 0.2–0.7 s with no effect before the lockup | the breath is what makes the hit land |
| Ducking | none, anywhere | none | effects ride the bed by timing and spectrum, not by level |
| Effects | the takes at the plan's gains, dry, a 30 Hz high-pass | the takes at `level_db`, landings and moves through a 0.7 s room, keys and clicks dry | the launch members carry their own short space, and the pop-in thumps and sub hits keep their low end |
| Silences | everything mutes, effects included | the same | true silence for a designed freeze |
| Master | 28 Hz high-pass → mono below 120 Hz → 2:1 bus compressor above −14 dBFS → no glue (the track is already mastered) → loudness passes with the true-peak limiter | the same with soft saturation and an air shelf | §9 |
| End | the music's own ending (its ring, a 2–3 s fade, a hit that rings) inside the tail; the bed and the effects fade over `master.fade` (1.3 s) to zero 30 ms before the end; last 480 samples zero | the same | the delivered audio ends on a decay into digital silence, never a cut |

### 8.1 The stop-down

The music never ducks under the effects. The one move is the stop-down: before a hit, a drop or a swell, the bed steps down and comes back with the hit.

- **The arrangement first.** `track.py edit` cuts to a break or a stop before the reveal wherever the track has one; a dip the track already has there counts, and only the missing depth is added (over a track that builds into the hit, the stop-down adds what makes the dip real).
- **Length:** the musical length nearest 0.4 s within 0.3–0.5 s, out of 1 beat, 3/16 and 1/8 of a bar (at 124 BPM, 0.363 s).
- **Depth:** 6 + 4·(weight − 0.5) dB, within the kit lock's `mix.stop_down` range (6–12 dB): 6 at weight 0.5, 8 at weight 1, 12 at weight 1.5 and over.
- **Shape:** a raised-cosine step down over 40 ms, a hold, back to 0 dB over 5 ms ending on the hit's sync time.
- **Few and spaced:** at most 3 in any 10 s, 2 s apart; the payoff, the lockup and structural events first, then by weight. A target inside a silence gets none; in a `hit` ending the bed's release under the hit is its stop-down.
- **Measured:** `score.py` reads every stop-down on the `bed` stem: a dip of 6 dB or more in the 0.5 s before the target and the bed back within 3 dB in the 250 ms after (a failure at the payoff, a warning elsewhere).

## 9. Master and verification

`master.py` (imported by `score.py`, also standalone) runs loudness passes: measure integrated loudness, gain to the target, then a true-peak lookahead limiter (4× oversampled detection, 4 ms lookahead, 80 ms release, ceiling 0.77 linear = −2.3 dBFS), repeated until within 0.05 LU, then fades the edges (3 ms in from zero at sample 0, at least 10 ms out onto the last sample). The ceiling leaves room for AAC, which adds 0.5–1 dB of peak. With a track, `finish(..., glue=False)` skips the saturation and air; `stage(x, lufs)` gain-stages a bed; `--measure` adds PLR.

```bash
python3 scripts/audio/master.py mix.wav public/audio/soundtrack.wav --lufs -14          # any mix
python3 scripts/audio/master.py --measure public/audio/soundtrack.wav --json -           # I, TP, LRA, PLR, loudest moment
```

**Loudness per film.** With a track, −14 LUFS integrated: streaming and social players normalise loud films down to about that and never turn quiet ones up. A sting of 8 s or less with a track may sit at −16. An effects-only film defaults to −18 LUFS: its loudness comes from a handful of accents, and pushing them to −14 puts the limiter on every one (−16 to −18 is the range; raise it only while the limiter stays under 1.5 dB). Set `"master": {"lufs": …}` or pass `--lufs`. Keep −1 dBTP after the encode either way.

Targets: the film's LUFS ±0.5; true peak ≤ −1.5 dBTP on the WAV and ≤ −1 dBTP after the encode; limiter under 1.5 dB at the payoff; LRA 5–8 LU for a film with a track of 20 s or more; the payoff 2–3 LU over the median momentary loudness, about 75–90% into the film; the end card 8–20 dB under the peak; the lockup element after a `stop` at −9 to −6 dBFS peak and 2 LU or more under the payoff; the tail's last 50 ms under −45 dB.

You cannot listen, so measure what a listener hears:

- **Sync:** `check-sync.py` cross-correlates the muxed audio with the WAV, then measures every placed effect and the music at every cut on the delivered file against its frame (±1 f), placing a ringing take (a tine, a bell) by its attack; it reports the share of cuts and of key state changes (the hit cues) that carry an onset within a frame and warns under 75 %: cuts land on the track's hits, and every key state change has its sound. `av-audit.py` matches onsets to intended times (`cues_sounded.json`) within ±2 f.
- **Levels:** the report's `over_bed` (each effect over the bed it was levelled against, per role) and `masked` (each effect over the bed in its best band: 3 dB for roles 4 dB or less over the bed, 6 dB for the rest). The payoff, the lockup or a structural sound that reads under the music in its best band fails, whatever the over-bed range says (audibility wins: raise its role's `bed_db` or cast another sound); more than 30 % of the effects masked warns.
- **Arc:** the momentary-loudness curve (`master.blocks()`): the intro under the body, the payoff highest, the dip, the ending.
- **Timbre:** `kit.py audition` (and `--over-bed`), `kit.py check`, and `listen.py`'s sound sheet.

### 9.1 Listening with earshot

`python3 scripts/audio/listen.py` (`npm run listen`; add `--video out/preview.mp4` once there is a render) runs earshot's timeline with the intended cues (`out/qa/cues_sounded.json` when current), its annotated sound sheet and its critique scorecard against earshot's launch profile in one process, and writes `out/qa/listen.json` and `out/qa/sound_sheet.png`. Read them in this order:

1. **`sync`** (model-free): every cue with the sound that answers it, `offset_ms` and `status` (`OK` = an onset within one frame, `near` = within 100 ms, `peak` = only a level peak, as from a soft whoosh, `no sound`). A `text`, `hit` or `land` that is not `OK` is a sync bug.
2. **The sheet**: the spectrogram, waveform and loudness curve with every cue marked. Check the near-silence after each line of text, the reveal as the loudest accent, the tail.
3. **`loudness`, `summary`, `transcript`**: what earshot heard, event by event, with tags. Tags are hints.
4. **`critique`**: hints. On an effects-only film "no music", "sparse onsets" and "low loudness" are the style, not defects.

`listen.py --track audio/music/<file>` listens to the track alone (`out/qa/listen_track.json`): its tempo against `track.py`'s, possible vocals (choose another track if the page says otherwise), genre and mood hints. `kit.py listen` listens to the kit: one take per role and a forced choice against cheap-synth alternatives. Without earshot or its models they write `"listened": false` and exit 0: listening informs the review, it never blocks a build. Everything they print and save is in house wording.

## 10. Reading the report

`score.py --json out/qa/score.json` writes `lufs`, `target_lufs`, `true_peak_db`, `lra`, `plr`, `momentary_max` and its time, `limiter_max_gr_db`, `limiter_hot`, `payoff`, `hook`, `tail_50ms_db`, `sfx` (the kit, its source, each role with its cues and takes, `off`, `missing`, `draft_voices`), `stacks`, `events.skipped` (with the reason: off, thinned, tuned budget, carried, no kit take), `events.masked`, `events.tuned`, `progress`, `typing`, `draft`, `warnings`, `fails`, `pass`. With a track also: `music` (the record, segments, joins, ending), `over_bed` (every effect, per-role median and IQR), `stop_downs` (each with its length, depth, the track's own dip, the depth added and the measured dip), `no_duck`, `density`, `one_gesture`, `runs`, `ending` (how the master ends: the last loud moment, the time to fall 20 dB, the decay after it, `abrupt`, the silence after the music), `lockup` (an old edit's stop ending only: the element's peak and distance under the payoff). `out/qa/sfx_plan.json` holds the plan behind it; `out/qa/cues_sounded.json` the intended times.

| Warning or failure | Fix |
|---|---|
| no earshot kit can be played | install earshot (`docs/setup.md`), set `EARSHOT_PYTHON`, `npm run kit`; or copy a rendered kit in (`kit.py vendor --from DIR`) |
| N cue(s) with no earshot kit take | give the role a sound in `audio/kit.json` and `npm run kit`; for a note, add it to the role's `pitches` or drop the hand-set pitch |
| "music": "synth" (exit 1) | cinetic makes no music: choose a licensed track (`references/music.md`) |
| a --draft build | never delivered: render the kit and the soundtrack again without `--draft` |
| the stop-down before … measures N dB | the track rises into the hit: give it more weight, or let `track.py edit` cut to a break before the reveal |
| the bed is N dB down 250 ms after … | the track breaks there (fine) or the edit lands the hit inside a break: move the reveal onto the entry |
| role … N dB over the bed (want …) | an effect on a kick or a gap sits off its `bed_db`: move it off the accent, or accept a role median within ±2 dB. With a track the role's `bed_db` moves its level (`level_db` is the effects-only level); a take held at the −1 dBFS peak cannot go higher |
| … clamped by the −1 dBFS ceiling | the bed is too loud for that short take: a quieter bar under it, or a fuller member |
| doubles the track's accent | one gesture: let the track carry it (drop the effect) or move it off the accent |
| density … outside the band | thin the effects, or sound the classes the picture asks for |
| run … ends without an accent | end the run on `click.confirm`, `land` or a `drop` |
| N pitched effect(s) thinned by the tuned budget | expected: at most two tuned effects in 4 s; space the fragments or steps 2 s apart |
| join at …: a click / a step / a chopped note | `track.py edit` on other bars (`--start-bar`, `--entry`), or a longer tail on a sustained bar |
| the lockup element … peaks at N dBFS | set `stopdowns.quiet_db` to the value the warning names |
| stacked lockup / payoff | keep ONE clean element on the reveal: cut the whoosh into it, the snap or bell on top |
| payoff is not the loudest moment | a later section of the track is louder: edit it out (`track.py edit`), or point `payoff` at the entry |
| LRA flat | choose bars with an intro, a break and the entry (`track.py edit --arc`) |
| limiter over 1.5 dB at t | too many loud effects on one frame: lower the weights there |
| … plays at level_db in a film with a track | give the role a `bed_db` (the launch role of the same kind) |
| typing … is bright | a darker member for the key role in `audio/kit.json` |
| the kit is not cast for this film | `python3 scripts/audio/kit.py cast`, then `npm run kit` |
| … plays the take … heard N s before | the role has too few takes for its rate: raise its `takes` in `audio/kit.json` (`npm run kit`) |
| check-sync: take real-… is heard from −50 ms, a pre-roll (kit check: … heard N ms before its transient) | a recording placed with its lead-in: `python3 scripts/audio/kit.py trim`, `npm run audio`, mux again |
| restraint: … quiet | expected: the music carries that action; give an event `structural: true` or `force: true` only when it must sound, or set `sfx.restraint` |
| starts inside the end fade | move the event before the fade (`master.fade` + 0.03 s from the end) |

## 11. Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Sound lands 3–10 f late | cued on the settle or typed by hand | contact frame, 50% pop, 97% settle, velocity peak, via `lib/sync.ts` |
| Whoosh smears across the move | apex not on the velocity peak | `move()` in `sync.ts`: length = the move, apex = `peak()` |
| The hit vanishes into the track | it lands on the track's kick, or no breath before it | let the track carry it, or a stop-down (automatic before hits, drops and swells) |
| The music pumps | a duck crept back in | there is none: `no_duck` fails; check for hand-made gain moves in the bed |
| Effects sound pasted on | levels at `level_db` in a film with a track | the launch kit (`bed_db` per role) |
| A melody of effects | tuned roles in a run | the tuned budget thins them; use untuned roles for runs |
| The join clicks or chops | a cut mid-note or off the attack | `track.py check` names it; re-edit on other bars |
| Ending clicks or cuts off, or the music stops dead | no tail, an event inside the end fade, a bed stopped on a bar line, a tail shorter than the ending | `track.py edit --end own` (or `fade`, `hit`); the tail holds `MUSIC.end.hold`; move late events before the fade |
| The film is silent, or its music stops at full level on the last frame | no track picked, or the picture timed before the track was fitted (the mux trims the ring-out to the picture) | pick and fit the track before the timeline (`music.mjs pick`, `get`, `npm run sound`, then the draft again: render.sh plays the track alone under a draft until the mix exists); `forensics.py` audio fails a silent film and audio-end warns on a cut ending |
| Peaks over −1 dBTP after encode | ceiling raised, or effects added after the master | keep ceiling 0.77; re-run `score.py` after every change |
| A kit sound starts before its move | a whoosh take with a long build on a short move | `score.py` fades the lead-in to start at most 2 f before the move |
| Sound late after mux | Remotion's AAC priming | render `--muted`, mux with ffmpeg (`render.sh` does) |
| Every music hit 5–8 f early (or late) against the cuts while the mux lag gate passes | the track cut by hand: `film_t0` dropped (bar 1 belongs 0.25 s in), an intermediate encode's priming pad, a hand offset | `score.py` (or `--bed-only` before the kit exists); `check-sync.py` measures the music against the edit at every cut and names the offset |
| A 30 fps delivery of a 60 fps timeline shows some cuts half a frame late | keeping every second frame: an act change on an odd 60 fps frame first shows on the next even one | the sound stays on the cue's time (within the ±1 f gate); for a 30 fps delivery put act changes on even frames, or render at 30 fps; `check-sync.py --picture` lists each cut's offset |

HyperFrames: it has no master bus, loudness stage or audio-to-picture sync. Export the same `out/cues.json` from the composition's timeline, render the WAV with `score.py`, and mux it with `scripts/hf-finish.sh --audio` (`references/hyperframes-engine.md` §11). A film with a track loads `music.js` before `timeline.js`.

## 12. Sound slop

The habits that make a launch film sound cheap, and what to do instead. Most are defaults here; the critic checks the rest (`assets/critics/sound-sync.md`).

| Slop | Instead |
|---|---|
| A generated bed: a synth pad, a drone, a band made in code | a licensed, human-made track (`references/music.md`) |
| Ducking under the effects; a pumping bed | effects ride the bed by timing and spectrum; one stop-down before the big hit |
| A track cut mid-phrase, a click at the join, an ending that stops dead | whole bars, joins on the incoming attack, an ending on the track's own final hit ringing out, a 2–3 s fade under the end card or a hit that rings |
| A hit on top of the track's own kick | one gesture: the track carries it |
| A whoosh on every cut, a slam on every cut, a riser before every reveal | most hard cuts get no sound of their own; about 2 whooshes a film on camera-scale moves; risers and swells about one a film at a section change |
| A boom on every logo and landing; the logo slammed as the loudest moment | about 2 hits a film; the lockup after a stop, one element at −9 to −6 dBFS peak, 8–20 dB under the film's peak |
| Effects at one fixed level over a changing bed | each role at its `bed_db` over the bed as it plays |
| A run of tuned effects: a melody of pops or bells | at most two pitched effects in 4 s; runs on untuned roles |
| Pings and bright clicks; every event centroid over 6.5 kHz | keys a dark tock (centroid 0.8–3 kHz), clicks bright but short, every centroid at 6.5 kHz or below |
| Sounding every UI motion: scrolls, progress bars, streaming text, hovers | only discrete state changes |
| Partial coverage: 5 of 14 presses clicked | the same action gets the same sound every time |
| The machine gun: one take on every hit | a new take per cue; keys vary (σ 2.5 dB, no jump over 5 dB) |
| A key sound on every typed character at 30 a second | at most about 12 keys/s; one take per word above 25 chars/s; a sparse bar under foreground typing |
| Wide panning or long reverb on tiny sounds | effects dry and centred; width only on the roles that carry it and on travelling whooshes |
| A stacked sting on the logo: whoosh + impact + sub + bell on one frame | stop-down, then ONE clean element |
| A sound on every word of a text build; ticks through the held line | one soft `text` sound per fragment; the held line in near-silence |
| Brickwall limiting to 0 dBFS with overs between samples | −14 LUFS, −1 dBTP with oversampling, PLR 12–16 dB |
| A rising synth whip into a cut | air without pitch, or nothing; `kit.py check` flags a role whose pitch climbs |
| One generic whoosh and one pop for every move and every appearance | each action its own sound (`kit.py cast`): a card landing, a toggle, typing, a swipe, a logo lock, a transition through a shape |
| The same handful of sounds in every film | the cast avoids the previous film's signature sounds and never repeats an earlier film's set; a sound library gives every action real recordings to choose from |
| One recording on every pop of a long run | a busy action takes two sounds of its kind and alternates them: a 20 s film plays nearly as many distinct sounds as effects |
| Effects chosen without hearing the track | the cast matches each sound to the track: its tempo, its band, its key |
| An effect on everything | restraint: the music carries most moments; whole light actions go quiet first |

Premium, in one line: restraint, one palette, a licensed track cut on its bars, effects at their place over it, a breath before the big hit, and an ending that subtracts. Good sound design mostly disappears.

## 13. House numbers

**Loudness and arc**
- −14 LUFS integrated with a track (−16 for a sting of 8 s or less), −18 effects-only; −1 dBTP after the encode (the WAV holds −1.5); PLR 12–16 dB.
- LRA 5–8 LU for a film with a track of 20 s or more.
- The loudest moment is the payoff, 2–3 LU or more over the median momentary loudness, about 75–90% into the film; the end card 8–20 dB under it.
- The intro runs 5–12 LU under the body for 2–3 s; the first sound arrives by 0.15–0.45 s.

**The track**
- Edited at bar lines only: at least 2 bars per segment, at most one splice per 8 film bars; joins 8 ms before the incoming attack, the outgoing bar on 60 ms (150 ms when it sustains); no click, the attack within ±2 ms of the film downbeat, a step under 3 LU unless it is the entry.
- The bed staged to −18 LUFS before the mix; no EQ, no saturation, no glue on it.
- A mid-film dip from the track's own break, about 5 LU down at 40–80% of the runtime.

**Effects**
- 3–13 effects per 10 s with a track, at most 10 in any 10 s (restraint); most hard cuts silent; about 2 whooshes and 2 hits a film.
- Each action of a film its own sound, each sound one action; no take heard twice within 3 s while its role has another; none of the previous film's signature sounds, never an earlier film's set.
- About 16 effects in 20 s of a music-led film and nearly as many distinct sounds, of 7–8 kinds: a sound seldom plays more than twice.
- By action: a line landing a soft rounded pop or a drop, about 0.2 s, 8–9 dB over the bed, mostly in runs; a card arriving a pop, a low pop-in thump or a ding; a UI click a pop, a knock or a short sub; a whip or a camera move a pop, a tick or a fast whoosh; a morph a pop, a sub or a short boom, about 10 dB over the bed; a counter seldom sounded (a knock or a click when it is); the name reveal the loudest effect, 11–12 dB over the bed, about 0.25 s (a pop, a whoosh, a sub or a pluck); the last sound short (about 0.1 s), about 5 dB over what is left of the bed.
- Over the bed: ticks and taps 3 dB, text and snap 4, keys and clicks 6.5, drop 7, hit and bell 7.5, land and riser 8, pop 8.5, whooshes 8.5–9, swell 9.5; the overall median 3–10 dB.
- Offsets: taps −60 ms, knocks −40, bells −20, clicks −11; pops +4, keys +8, snaps +9, landings +30, whoosh peaks +3 to +37, swell peaks +42, riser peaks −23.
- Run gaps: ticks and snaps 66 ms, clicks 85, keys 87, bells and text 110, pops 114, light taps 115, landings 159.
- Stop-downs: 6–12 dB for 0.3–0.5 s, at most 3 in 10 s, 2 s apart; a full stop of 0.2–0.7 s before the lockup.
- Tuned: at most 2 pitched effects in any 4 s; no tonal effect past 1.5 s.
- The lockup element after a stop: −9 to −6 dBFS peak (about −7.5), 2 LU or more under the payoff.

**Typing**
- Sounded keys at most about 12 per second; above 25 chars/s one take per word, or silence.
- Never two keys within 60 ms; level σ 2.5 dB, no jump over 5 dB between neighbours; dry, centred.

**Sync**
- The picture may lead its sound by 1–3 f; a sound never leads its picture by more than 45 ms, except a role's designed offset.
- On the delivered file every effect's sync point sits within ±1 frame of its cue frame (its role's designed offset aside) and the music within ±1 frame of where the edit puts it: `check-sync.py` measures both.
- Judge sync only against onsets 6 dB or more over the bed.
