# Sound: score, effects, mix and master from the cues

Covers the soundtrack end to end: where the sounds come from (the earshot kit), the `out/cues.json` contract, writing `src/sync.ts`, the `audio/score.json` schema, tuning, the mix and the master, and listening to the result. Read it before Step 5 (Sound), and again whenever sound and picture disagree.

The numbers here are the defaults that shipped Tessel (−14.1 LUFS, LRA 5.2 LU, −1.7 dBTP after AAC, every effect within ±1 f of its picture), calibrated to the measured norms of top-tier launch films (§13) and to a frame-measured study of professional text-led films (§5.7). Treat them as starting points, not dogma. When the user supplies music, a sonic logo or a voiceover, the brand wins: tune and time everything else around it (§5.6).

## Contents
1. [Where the sounds come from](#1-where-the-sounds-come-from) (the kit, its roles, the fallback)
2. [Pipeline and gate](#2-pipeline-and-gate)
3. [cues.json and the event kinds](#3-cuesjson-and-the-event-kinds)
4. [Writing src/sync.ts](#4-writing-srcsyncts)
5. [score.json](#5-scorejson) (5.5a personality, 5.5b progress motif, 5.5c typing, 5.7 text films)
6. [Harmony and tuning](#6-harmony-and-tuning)
7. [The synth palette](#7-the-synth-palette)
8. [Mix](#8-mix)
9. [Master and verification](#9-master-and-verification) (9.1 listening with earshot)
10. [Reading the report](#10-reading-the-report)
11. [Failure modes](#11-failure-modes)
12. [Sound slop](#12-sound-slop)
13. [Measured norms](#13-measured-norms)

## 1. Where the sounds come from

The effects come from the film's **sound kit**, `audio/kit.json`: one sound per role (the cue kinds and their variants), chosen from the bank of [earshot](https://github.com/Leonxlnx/earshot), a separate, optional tool that designs sounds in code and checks them by measurement. `scripts/audio/kit.py render` has earshot render every role into takes in `audio/kit/` (24-bit WAVs) with each take's measured onset, loudest point and end in `audio/kit/kit.lock.json`; `score.py` places those takes on the cue frames. Rendering is pure DSP (no models, no network): about a minute for a fresh kit, seconds once cached.

In order of preference:

1. **An earshot kit** (the default): a preset (`calm` for text-led films, `crisp` for energetic product films, `minimal` for designed, sub-led films) edited per film. Every take is deterministic, audited (`kit.py check`: clicks, cut tails, a pitch that climbs, stacked attacks) and tuned through its recipe's own pitch parameter, never resampled.
2. **An earshot fit of a recording**: `earshot fit` turns a public-domain (CC0) recording, or one the user owns, into a recipe that renders variations of it; earshot adds it to the bank as `fit/<role>/<name>` (with its source and licence) and the kit names it like any other sound. Use it when a role needs a specific material the bank lacks. Licensed or third-party recordings are never vendored into a film.
3. **The synth voices** of `scripts/audio/synth.py` (§7): what plays when no kit can be rendered or found. `score.py` says so in a loud warning; a film should not ship on them.

What the kit route keeps from the synth one:

- **Sample-accurate and re-timeable.** Every take is placed by its measured sync point on the exact frame the picture code computes. Retime an act and the next `export-cues.ts` + `score.py` moves every sound with it.
- **Tuned.** Tonal roles (a struck bell, a pluck, a sub drop) are rendered in the film's key (`kit.py tune` moves them to `score.json`'s key), and each cue plays the take whose pitch is nearest the note its chord asks for. An explicit note (a hand-set `pitch`, a progress rung, a motif note) plays only a take on that note: when the role has none, that cue gets its synth voice and the report says which note to add, because a neighbouring take would be a wrong note. Noise sounds (taps, whooshes, keys) need no tuning.
- **Level.** Takes are normalised to a −1 dBFS peak, so the takes of one role can measure 3–4 LU apart; `score.py` trims each take toward its role's median loudness (the lock's `lufs_m_max`, at most ±6 dB), so a repeated cue keeps one level whichever take it gets.
- **Deterministic and licence-free.** The same kit renders the same takes; the bank's recipes are code.
- **One source of truth.** Bars, cues and sync points come from `src/timeline.ts` and the act modules, never from a second, hand-typed list.

**Roles.** A cue plays the role of its kind and variant; a role the kit sets to `null` is off (its cues are skipped and listed in the report), a role the kit does not name keeps its synth voice (also listed). The `calm` preset, as the starters ship it (tuned to G major):

| Cue (kind, variant) | Role | Align | calm | Level (dB) |
|---|---|---|---|---|
| `text` (a fragment resolving) | `text` | onset | a soft kalimba pluck on the key's pentatonic (5 notes); a chain steps through each chord's tones among them | −12 |
| `hit` | `hit` | onset | one struck bell on the tonic, 1.9 s natural decay: the lockup | −3 |
| `bell`, the motif, progress steps | `bell` | onset | the kalimba on two octaves of the key's pentatonic (10 notes), one take per note | −5 |
| `land` (weight ≥ 0.6) / `land` light | `land` / `land.light` | onset | a round low thump / a soft fingertip | −5 / −8 |
| `pop` | `pop` | onset | a soft mouth plop (a CC0 recording fitted as code), no pitch glide | −2.5 |
| `snap` | `snap` | onset | a switch flip (fitted CC0), one attack | −3.5 |
| `tick` / `tick` crisp / `tock` | `tick` / `tick.crisp` / `tock` | onset | dominoes knocking (fitted CC0) / a tight glass touch / a knuckle knock | −5 / −8 / −6 |
| `whoosh` (move under 0.5 s / longer) | `whoosh.short` / `whoosh.long` | peak | a short bamboo swish (fitted CC0) / a gentle air swell | −9 / −7 |
| `key` / `space` / `return` | `key` / `key.space` / `key.return` | onset | a thocky mechanical key (12 takes) / a mechanical space bar (fitted CC0) / a deep cap, firmer | −10 / −9.5 / −7 |
| `click` / `click` confirm | `click` / `click.confirm` | onset | a small plastic click (fitted CC0) / a soft tuned pluck | −4.5 / −10 |
| `drop`, `riser`, `swell`, `suck` | same | onset / end | off: a calm reveal resolves on one element | — |

The fitted roles are public-domain (CC0) recordings that earshot fitted as code, chosen where they measure closer to the role's description than the forge member; each role's `note` in `audio/kit.json` gives its measurement. `crisp` swaps in a gated impact for `hit`, a tight whoosh, crisp keys and a short sub drop; `minimal` a sub-led impact and glassy keys; all three keep `riser`, `swell` and `suck` off and give the lockup one clean hit. `earshot sfx list` shows the whole bank (by category, kind and the knobs each sound takes); `kit.py audition` plays every take of the film's kit, role by role, at its level.

**kit.json** (schema 1, written by `kit.py init --preset calm`, edited by hand):

```json
{"kit": 1, "name": "calm", "sr": 48000,
 "roles": {
   "hit":  {"sound": "notify/m0", "takes": 2, "align": "onset", "level_db": -3.0, "edits": {"pitch": "G4"}},
   "text": {"sound": "pluck/kalimba_soft", "pitches": ["G4", "A4", "B4", "D5", "E5"], "takes": 1, "level_db": -12.0},
   "whoosh.long": {"sound": "whoosh_big/swell", "takes": 2, "align": "peak", "level_db": -7.0},
   "riser": null}}
```

`sound` is a bank id; `takes` how many takes to render (a new take per cue, by a hash of its id and frame, never the same file twice in a row; keys keep one take per key identity); `edits` the knobs every take renders with (`dur`, `apex`, `pitch`, `peak_db`); `pitches` one set of takes per note; `align` the sync point that lands on the cue frame (`onset`, `peak` for whooshes, `end` for risers); `max_s` fades a long tail; `level_db` the role's mix level (every take trimmed toward the role's median loudness); `note` why this sound. Change a role, run `npm run kit` (only the changed takes render again).

**Fallback, in order** (`score.json` `"sfx": {"engine": "auto"}`, the default): render the kit with earshot when `kit.json` changed since the takes were rendered (or they are missing) → play the takes in `audio/kit/` as they are (vendored: the film rebuilds where earshot is not installed; a changed `kit.json` then plays the old takes with a warning) → the synth voices, with a loud warning in the report and on the console. `"engine": "earshot"` fails instead of falling back; `"engine": "synth"` plays the synth voices only. The build never fails only because earshot is missing.

**Finding earshot** (`kit.py where` says which one is used): `--python`, `score.json` `sfx.python`, `$EARSHOT_PYTHON`, an `earshot` importable in the interpreter running the script, `earshot` on `PATH`. earshot normally lives in its own virtualenv: point `EARSHOT_PYTHON` at that interpreter (`docs/setup.md`). `EARSHOT_PYTHON=none` turns it off.

## 2. Pipeline and gate

```bash
npx tsx scripts/export-cues.ts                       # src/sync.ts -> out/cues.json      (npm run cues)
python3 scripts/audio/kit.py render                  # audio/kit.json -> audio/kit/ takes (npm run kit, cached)
python3 scripts/audio/score.py --cues out/cues.json --score audio/score.json \
    --out public/audio/soundtrack.wav --stems out/stems --json out/qa/score.json   # (npm run audio)
python3 scripts/audio/listen.py                      # earshot's ears: out/qa/listen.json + sound_sheet.png (npm run listen)
python3 scripts/audio/kit.py check                   # the kit against the film's cues + earshot's audit of every take
python3 scripts/audio/kit.py audition                # every take, role by role: out/qa/kit_audition.wav
python3 scripts/audio/master.py --measure public/audio/soundtrack.wav # loudness of any WAV
```

`score.py` places the kit's takes (or the synth voices) and the music, mixes them, masters with `master.py` and writes a 48 kHz, 24-bit stereo WAV exactly `TOTAL / FPS` seconds long. `render.sh --audio` muxes it (`references/finishing.md` §6); never let Remotion encode the audio. `render.sh --build-audio` runs cues, kit and score first.

**Gate (Step 5):** the film's loudness target ±0.5 LUFS integrated (`master.lufs`; without it −14 with music, −18 for an effects-only film; −16 for a short sting; §9), true peak ≤ −1.5 dBTP on the WAV (4× oversampled), last 480 samples digital zero, the effects from the kit (`sfx` in the report is not `synth (fallback)`), no stack at the lockup, report clean or every warning answered. `score.py` exits 1 when the loudness gate fails. After the mux, `scripts/check-sync.py` gates lag ≤ 48 samples and ≤ −1 dBTP on the decoded MP4, and `scripts/av-audit.py --stems out/stems` checks onsets against the cues, per stem (`references/review-loop.md`); with earshot, `listen.py` adds a listening pass (§9.1).

## 3. cues.json and the event kinds

```json
{ "fps": 60, "bpm": 120, "total": 540,
  "acts": { "statement": { "from": 0, "dur": 240 }, "mark": { "from": 240, "dur": 300 } },
  "cue":  { "lock": 120, "lockup": 360 },
  "events": [ { "f": 210, "kind": "whoosh", "weight": 1, "pan": -0.5, "apexFrac": 0.286, "dur": 42, "id": "statement:dot-flight" } ] }
```

| Field | Meaning |
|---|---|
| `f` | absolute frame the sound belongs on; fractional is fine (`b(3,3,2)` = 352.5) |
| `kind` | one of the kinds below; anything else fails `export-cues.ts` |
| `weight` | 0–2, 1 = normal. Scales level; also picks heavy vs light landings and whoosh size |
| `pan` | −1 left … +1 right, from the object's screen x. `score.py` scales it into ±0.15: effects sit near the centre. For `whoosh`, the direction and amount of travel, at full width |
| `pitch` | optional MIDI number or note (`"Eb6"`). Leave it out: `score.py` picks a tone in key |
| `apexFrac` | `whoosh`/`suck`: the fraction of the sound's length that lands on `f` (default 0.5 / 0.85) |
| `dur` | frames; length of `whoosh`, `riser`, `swell`, `suck` |
| `variant` | `key`: `word` (word start), `space`, `return`, `back`; `tick`: `crisp`; `click`: `confirm`; `land`: `light`; `bell`: `motif`; `pop`: `down` |
| `id` | a label for QA reports; the starter prefixes the act (`mark:dome`); the kit's take choice hashes it with `f` |

The kit plays each kind's role (§1); the last column is the synth voice, what plays when the kit has no role for it.

| Kind | Picture event | `f` is | Synth voice (default tuning) |
|---|---|---|---|
| `text` | a copy fragment resolving: the phrase is fully readable | the frame its last word visibly comes to rest (`chainResolves()` in the starter: the 97% frame of the word's drawn rise, up to about 16 f before the COPY `resolved`, which marks the end of the reveal) | one soft mallet note; a chain's fragments step root, third, fifth, third of the chord (the key's triad without chords). With a kit, the same steps over the chord's tones among the text takes. One per fragment, never one per word (§5.7) |
| `tick` | the device keeps time; a clock | the pulse's start | a small wooden mallet on the signature tick (the tonic, octave 6): tuned fundamental, free-bar partials, a felt transient. `crisp`: a counter locking, list rows, a build: an untuned tick at 3–4.5 kHz, −20 dB in 10–20 ms, a new seed per hit, about 8 dB under the music |
| `tock` | the clock's other beat | the pulse's start | the tick voice, darker, on the signature tock (the fifth, a fourth below the tick) + a little wood |
| `pop` | something appears: a word, badge, chip | its 50% frame | a mallet-like blip sliding 2 semitones into its note; a run of pops climbs the key's pentatonic |
| `snap` | a lock-in: a line closing, a piece seating | the contact frame | click + body + low tail on the chord root |
| `land` | an in-shot landing | the contact frame | weight ≥ 0.6: wooden knock + short sub on the chord root; lighter or `light`: a pitched knock climbing chord tones |
| `hit` | a slam, a cut on impact | the contact / cut frame | sub boom gliding an octave onto the chord root + clap + band burst; ducks the music |
| `drop` | the music lands (a section downbeat after a silence) | the downbeat | long sub boom onto the root + falling air; a `resolve` section skips its own kick under it |
| `whoosh` | a move: camera, flight, whip | the velocity peak | dull 1/f noise band sweeping 120 Hz → ~750 Hz at the apex → 220 Hz, panned along the travel |
| `riser` | tension into a hit | the arrival (it stops here) | noise band 220 Hz → 7 kHz + two saws gliding an octave onto the chord root at `f` |
| `swell` | a reveal that blooms into a hit | its peak (it stops here) | reverse swell of three chord tones + air |
| `suck` | an implosion into silence | the implosion's end | reverse whoosh, bright to dark, apex at 85% |
| `key` | a typed character | the character's frame (fractional) | the film's `typing` style (§5.5c): by default a dark modal "tock" per key up to 25 chars/s, one pitched blip per word above; 26 fixed keys, `space` and `return` lower and longer; thinned by time |
| `click` | a cursor press | the press frame | one bright, very short voice for the film (a tone near 2 kHz, nothing below 500 Hz) at one level, about 3 dB under the music, with its release about 85 ms later; `confirm` adds a soft tuned tone |
| `bell` | a chime: a success, a logo moment | the strike | FM bell on the chord tone near A♭5; `motif` plays the signature motif from `f` |

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
    { f: CUE.lockup, kind: 'hit', weight: 1, id: 'lockup' },                 // stop-down, then one clean element
  ];
}
```

Where the sound goes (the helpers and their measured spring numbers are in `references/timing-grid.md`):

| Picture event | Frame | Helper |
|---|---|---|
| Landing, impact, lock-in | contact: the first frame the spring reaches 1.0 (0.92 if it is nearly at rest) | `hit(start, cfg, 1)` |
| Tween into contact (`E.contact`) | its last frame | — |
| Pop-in | 50% of its travel | `hit(start, cfg, 0.5)` |
| Tween that settles | the 97% frame, never the last frame | `settleOf(a, b, ease)` |
| Text or a wordmark arriving | the frame it becomes readable: the `settleOf` of its reveal (a chain fragment: the 97% frame of its last word's drawn rise, which `chainResolves()` computes, up to ~16 f before its COPY `resolved`), never the tween's end or the next bar line. An `E.out` covers 90% of its travel in about 40% of its duration, so the eye reads it as landed long before its last frame | `settleOf(a, b, ease)`, `chainResolves(id, {size})` |
| Whoosh (camera-scale moves, logo zooms) | apex on the velocity peak, length = the move, its onset 100–450 ms before the apex | `peak(a, b, ease)` |
| Exit roll | one tick, no detent | — |

- **Every sound has a visible cause; not every picture event gets a sound.** Sound discrete state changes (a press, an insert, a lock, a counter landing, the logo assembling) and leave continuous motion silent (scrolls, streaming text, progress bars, rolling counters, hovers). About 5 designed effects per 10 s on average, clustered where the music is sparse (the cold open, typing passages, the logo build) and thinning after the drop. A landing that happens off-frame gets no thud; an effect with nothing on screen reads as a mistake.
- **Every arrival of the lockup is sounded where it happens.** When the mark completes first and the name a beat later, each gets its sound on its own readable frame. A hit that waits for the next bar line after the motion has stopped lands on nothing, and the arrival it was for goes silent; `av-audit.py` warns when a landing sound comes after the picture has stopped.
- **Coverage is all or nothing.** Once a class of action is sounded, every instance gets the same sound at the same level: 5 clicks out of 14 presses reads as a mistake.
- **Most cuts carry no sound of their own.** The music carries them. A whoosh (about 2 a film) goes only on a camera-scale move or a logo zoom, with its onset 100–450 ms ahead and its apex on the visual peak; a hit (about 2 a film) is structural, usually the score's own drop on the hero reveal.
- **Move the picture, not the sound.** When a hit belongs on the beat, start the spring at `beat − delayTo(cfg, 1)`. Audio that leads the picture by more than ~45 ms reads as "sound first".
- **Two hits a few frames apart flam.** If a settle's 97% frame sits 3–8 f before a downbeat that also sounds, put the lock on the downbeat and leave the settle silent.
- **Text: one sound per fragment.** A `text` event on the frame each fragment resolves (§5.7), never one per word; the words' own entrances stay silent, and what was just said is read in near-silence.
- **The lockup is a stop-down and ONE clean element.** Nothing sounds in the 0.2–0.7 s before it (no whoosh into it, no riser, swell or suck), and nothing else lands with it: one `hit` on the frame the wordmark becomes readable. No snap, bell or motif on top, no ticks through the hold. `score.py`'s stack guard warns when a second sound lands within ±3 f of the payoff or the `lockup` cue, or a lead-in runs into it.
- **Effects are dry, mono and centred.** Keep the screen-x `pan` in the cues, but `score.py` scales it into ±0.15; width goes only to whooshes, risers and the music. Whooshes still travel with the motion; a centred push or pull has `pan: 0`.
- **Typing:** one `key` per character from the same `CHAR_AT` array the picture types with, at its fractional frame (not `Math.round`: jitter and thinning work in time); mark word starts `word`, spaces `space` and a final `return`. `score.py` picks per key or per word from the run's rate and shapes it (§5.5c), so 30 characters a second never fuse into a buzz.
- **Dense batches** (rain, tiles, grids, list rows): emit every landing, weight them light. The synth voice's light landings climb chord tones, so a cascade sounds ordered (the calm kit's `land.light` is an untuned tap, a new take per landing); crisp ticks (`variant: 'crisp'`) suit rows and counters.
- **Check the file.** Open `out/cues.json` and read it against the contact sheet: every event has a picture, every sounded class is complete, and nothing continuous is sounded.

## 5. score.json

```json
{
  "key": "G major",
  "bpm": 100,
  "music": "none",
  "sfx": { "engine": "auto", "kit": "audio/kit.json", "python": null },
  "chords": ["Em9", "Cmaj9", "Am11", "Am11 D7sus4", "Gadd9", "-"],
  "sections": [
    { "bars": [1, 1], "style": "intro" },
    { "bars": [2, 4], "style": "build" },
    { "bars": [5, 5], "style": "resolve" },
    { "bars": [6, 6], "style": "hold" }
  ],
  "signature": { "tick": "G6", "tock": "D6", "motif": [0, 7, 14], "rhythm": [0, 0.5, 1.5] },
  "typing": "auto",
  "payoff": "@lockup",
  "mix": { "music": 1.0, "sfx": 1.0, "reverb": 1.0, "sidechain": 0.55, "duck_db": 3, "typing_duck_db": 10 },
  "master": { "ceiling": 0.77, "fade": 1.3 }
}
```

(The Remotion starter's score: 100 BPM, six bars for its 13 s; the HyperFrames starter's has the same fields at 120 BPM over three bars, with its payoff on `@hit`. The starter is a calm, text-led sting: effects only, and its payoff is the lockup. Its `chords` still steer the tonal roles, and `"music": "synth"` turns the band on over the same sections. In a launch film with music the payoff is the drop on the hero reveal, §5.3.)

### 5.1 Fields

| Field | Default | Meaning |
|---|---|---|
| `key` | `"C major"` | tonic + mode: major, minor, dorian, mixolydian, lydian, phrygian (ionian, aeolian) |
| `bpm` | timeline | optional; must equal the timeline's `BPM` or `score.py` refuses |
| `music` | `"synth"` with `chords`, else `"none"` | `"none"`: effects only, the house default for a calm text-led film (the one effects-led film in the study runs −22 LUFS with an LRA of 12 LU and no bed, §5.7; a pad also sits in the band of the soft text sounds, and the report's `masked` list measures what it covers); `"synth"`: the built-in band (sections, chords, drums, the motif bells); a file path: that track as the bed (the same as `bed`) |
| `sfx` | `{"engine": "auto", "kit": "audio/kit.json"}` | where the effects come from (§1): `engine` `auto` (kit, else vendored takes, else synth with a warning), `earshot` (kit or fail), `synth`; `kit` the kit file (its takes in the folder of the same name); `python` the interpreter that has earshot |
| `chords` | required for `"music": "synth"` | one entry per bar from bar 1. `"Am11 D7sus4"` splits the bar evenly; `"-"` continues; `"N.C."` is no chord; missing bars hold the last chord. Without music they are optional: the tonal roles then follow the key's scale and triad |
| `sections` | `[]` | `{bars: [from, to], style, level?, bright?, clock?, hats?, drums?, layers?}`; bars outside every section get no music |
| `signature` | tonic / fifth / `[0,7,14]` | `tick` and `tock` pitches, the `motif` (semitones above the tonic nearest C5, or note names) and its `rhythm` in beats (or an even `step`) |
| `motifs` | `[]` | `{at, gain?, notes?, rhythm?}`: where the signature motif plays (bells) |
| `drops` | `[]` | `{at, silence?, suck? (s), depth?, suckDepth?}`: the music stops dead for `silence`, ducks 90% over `suck`, and lands on `at` |
| `silences` | `[]` | `{from, to, depth?}`: true silence for a designed freeze; mutes everything, effects and reverb included |
| `payoff` | — | the moment that must be loudest: the drop on the hero reveal, about 30–60% into the film (in a sting, its hit); the report checks it |
| `progress` | — | `{match, kind?, start?, tonic?, resolve?, gain?}`: the progress motif (§5.5b): events whose `id` contains `match` climb the scale one step each (with a kit, the tuned role's take notes); `resolve` lands the tonic on the payoff |
| `bed` | — | `{file, at?, gain_db?}`: a supplied music track joins the music bus (§5.6), with any `music` setting |
| `typing` | `"auto"` | how `key` events sound: `auto`, `soft`, `mechanical`, `pitched`, `muted`, `word` or `off` (§5.5c) |
| `keyup` | `false` | `true` adds a key-release click on slow typing (next key over 140 ms away); measured typing has none |
| `mix` | as shown | music and effect bus gains, reverb amount, sidechain depth, dB the music dips under hits (`duck_db`) and under typing sounded per key (`typing_duck_db`, 0 disables) |
| `master` | as shown | target `lufs` (without it: −14 with music, −18 for an effects-only film; −16 for a sting of 8 s or less, §9), limiter ceiling (linear), the end fade's length (s), which the music and the effects both follow |

**Times** are a frame number (`360`), a cue (`"@lockup"`, `"@lockup-6"`), or a string `"bar:beat:16th"` (`"4"`, `"3:2"`, `"3:3:2"`, 1-based bars, 0-based beats as in `b()`). **Durations** are frames or a note value (`"1/16"`).

**Chord symbols:** a root (`C`, `F#`, `Bb`), a quality, optionally `/bass`. Qualities: major (none), `m`, `5`, `6`, `m6`, `69`, `7`, `maj7`, `m7`, `mmaj7`, `9`, `maj9`, `m9`, `m11`, `maj7#11`, `add9`, `madd9`, `add2`, `sus2`, `sus4`, `7sus4`, `9sus4`, `6sus4`, `dim`, `dim7`, `m7b5`, `aug`.

### 5.2 Section styles

| Style | What plays | Use it for |
|---|---|---|
| `intro` | low-passed pad swelling (700 → 1300 Hz, slow attack); tonic + fifth drone that stops dead at the section's end | the hook; the first seconds under the problem |
| `build` | pad opening 1.4 → 3.2 kHz, whole-note bass, 8th-note arp and 8th hats rising, kick on each downbeat | the bars before a drop or the payoff |
| `groove` | half-time kick (1, the "a" of 2, 3), clap on 3, 8th hats, syncopated bass, 8th arp | product proof, UI sections |
| `drive` | four-on-the-floor, claps on 2 and 4, open offbeat hats, 16th hats, octave 8th bass, 16th arp | the fastest act; keep it below the payoff (`level` 0.85) |
| `breakdown` | sustained pad, soft bass, sparse arp, the signature clock on 8ths | the breath after a drop, before the resolution |
| `resolve` | fast-attack pad that rings, long bass, one kick (skipped when a `drop`/`hit` event owns the downbeat), a bell chord or the motif | the drop on the hero reveal; at the lockup, a soft resolution (`level` 0.6–0.8, `layers: {drums: 0}`) |
| `hold` / `tail` | nothing new; what rings decays | the end card's tail |

Section options: `level` (music bus gain for the section), `bright` (multiplies the pad cutoff), `clock: true` (the signature tick/tock on every beat, skipping beats an event owns), `hats: false`, `drums` (`"build"`, `"groove"`, `"drive"`, `"clock"`, `"one"` or `null` to override the style's pattern), and `layers` (`{pad, bass, arp, drone, drums, bells}` gain multipliers; 0 mutes).

### 5.3 Shaping the arc

- One section per story beat, bar-aligned with the acts. The measured shape of a good launch film: a soft entry, an intro with no sub or drums running 5–12 LU under the body for about 2–3 s, the drop on the hero reveal, the body, a breakdown or stop about 5 LU down at 40–80% of the runtime, a re-entry on a picture beat, and an ending that subtracts. The loudest moment is the drop or the hero reveal, about 30–60% into the film, and `payoff` points there.
- **The hook enters with intent.** Frame 0 already has a sound with a reason (the device's first tick, a drone, the first chord), because a muted-then-unmuted feed viewer and a sound-on viewer both decide in the first second. It can be soft: a drone, or an entry of 150–450 ms at most. A pad swelling in over the whole first bar or a riser into the opening reads as nothing happening yet. `score.py` starts the film's first chord with a 20 ms attack and the `intro` drone at level (the intro still builds, by opening its filter), and warns "soft hook" when the first 0.5 s sits more than 12 dB under the film's median momentary loudness. Place the first sharp transient once the bed is up.
- **Drop on silence.** A `drops` entry stops the music (reverb included) for `silence` before `at` and sucks it down over the 0.2 s before. Effects of on-screen motion keep ringing, so a whoosh into the drop is not chopped. The silence and the suck are the stop-down, so the stack guard never counts them as a layer (the suck ducks the music bus and plays no sound of its own). For a designed freeze with nothing moving, add a `silences` entry as well; it mutes everything, and the picture freeze must sit exactly on it (≤ 15 f).
- End a `riser` on the silence's first frame, never inside it: a riser ends in a hard stop, a filter drop or a 30–250 ms gap, never a crash. A drop may land 100–116 ms after its cut, a beat of air after the riser or the reveal. Use one or two per film, and skip it when a whoosh already leads into the same downbeat: two noise swells on one approach blur into hiss (the starter lets the lockup slide's whoosh do the job).
- The payoff (the drop on the hero reveal) has the highest momentary loudness of the film, clearly: 2–3 LU or more over the film's median momentary loudness. A `drive` section that out-shouts it is a common failure; the report flags it, flags a payoff that only edges the rest, and flags a loudest moment in the last 20% of a film over 8 s.
- **The lockup is the most resolved moment, not the loudest.** The ending subtracts: as the logo forms, the music stops on a bar line or filters down (end the section on the bar with a `hold` after it, or a `silences` entry), 0.2–0.7 s of near-silence, then ONE soft resolved element on the wordmark (the kit's `hit`: a struck note in `calm`, a clean impact in `crisp`), and a tail of 0.5–2.5 s to below −60 dBFS. Never a stack: no whoosh or riser into it, no snap, motif or bell on top (`score.py` warns: "stacked lockup"). The end card sits 8–20 dB under the film's peak. A logo sting is the exception: it is all lockup, so its hit is its loudest moment. In an effects-only film the stop-down is the 0.2–0.7 s with no effect before the hit.
- **Contrast is the arc.** A launch film of 20 s or more wants an LRA of about 5–8 LU. A score that runs `drive` from start to finish measures around 4 LU and feels dense and flat however good each sound is. Thin the section before the turn (a `breakdown`, or `layers: {drums: 0, arp: 0}` on the section), put true silence before the drop (`drops`), and hold something back (the kick, the top octave) until the payoff. `score.py` warns under 5 LU on films of 20 s or more.
- The last 60 f are a tail: the music and the effects (with their reverb) fade over `master.fade` seconds, and the WAV reaches digital zero on the last frame. An effect that starts inside the fade is mostly lost, and `score.py` names it; keep `hit`, `drop` and `bell` events before the fade starts (`master.fade` + 0.03 s from the end, 80 f at the default 1.3 s), and let the lockup's last sound ring into the tail rather than start in it.

### 5.4 Stems

`--stems DIR` writes stems the length of the film that sum exactly to the mix before the master: `drums`, `bass`, `pad` (with the drone), `arp`, `bells`, `reverb` (the music's hall), `sfx` (effects with their rooms), plus `bed` when used. Each music stem carries the bus automation, sucks and silences, so `av-audit.py --stems` can compare effects with the music they actually sit in, and a mute-and-subtract check is a subtraction.

### 5.5 Picking a key and tempo

The tempo comes from the timeline (`references/timing-grid.md` has the BPM/fps table). Pick the key for the low end too: the kick and the booms sit between E1 and E♭2 (41–78 Hz), and a tonic from F to A puts the kick at 44–55 Hz, the weight a sting wants. Major with added ninths and sevenths reads as confident and warm; dorian or minor reads as tense; keep one key for the whole film unless the story turns.

### 5.5a Sound follows the personality

The score's energy must match the brand's three adjectives (`references/brand-and-color.md` §2). A drop onto silence followed by a sub boom is launch-film grammar. On a calm brand it reads as trailer noise: the wrong tone, however well it is made.

| Personality | Palette | Dynamics | Signature hit |
|---|---|---|---|
| Calm, literary, unhurried | soft mallets, felt keys, a warm pad, a single bell | narrow and gentle; no sucks, no booms, no risers | one soft chord or mallet note with a long tail |
| Fast, exact, confident | tight kick, plucks, clicks, a short supersaw | wide; drops on true silence, a sub on the payoff | a tuned snap + kick |
| Bright, friendly | marimba, claps, pops in a major key | bouncy; small risers | a rising two-note motif |
| Precise, expensive | sparse piano-like tones, low strings pad | slow swells, lots of air | one low, warm chord |
| Raw, mechanical | ticks, detents, metallic hits, noise | stepped, rhythmic, dry | a hard mechanical latch |
| Warm, kind | plucked tones, soft pads | gentle rise and fall | a gentle two-note chime |

Pick the row before writing `score.json`, and write it in `TREATMENT.md` next to the adjectives. The row picks the kit preset too: `calm` for calm, warm and kind brands and any text-led film; `crisp` for fast, exact, bright and raw ones; `minimal` for precise, expensive ones (`python3 scripts/audio/kit.py init --preset crisp --force`). Whatever the row, the score keeps the measured shape of §5.3: the peak at the drop, the lockup resolved rather than loud. `score.py` treats `drop` and `riser` as options, not requirements, and every preset leaves `riser`, `swell` and `suck` off. The sound critic checks the score against this row (`assets/critics/sound-sync.md`).

### 5.5b The progress motif

When the story is progress (days of a streak, steps of a setup, items cleared, a build filling up), give each step one tuned note, one scale step higher than the last, and resolve on the tonic at the payoff. The ear hears "closer" before the eye counts, and the resolution lands the idea. It suits every personality row, because it is one soft note per event. The fields it adds to `score.json`:

```json
{
  "key": "D major",
  "progress": { "match": "day", "kind": "bell", "resolve": "@streak" },
  "motifs": []
}
```

- `match` picks the events: every event whose `id` contains it (and whose `kind` is `kind`, if given), in frame order. In `src/sync.ts` give the steps ids such as `day1` … `day7`, on the landing frame of each step.
- The k-th step gets scale degree `start + k` of the key's mode. By default `start` is chosen so the last step is the one under the octave (seven steps: 1 → 7), and `resolve` then places the tonic above it, with its octave below, on the bells. `tonic` sets the note of degree 1 (default: the tonic nearest E5, so the rungs sit around 0.5–1.5 kHz, above the pad).
- **With a kit**, the rungs climb the notes the steps' role has takes for, so every rung is a real take. The calm `bell` has two octaves of the key's pentatonic (10 notes): up to five rungs end on the note under its upper tonic and `resolve` lands on that tonic, with the octave below; more rungs climb from its lowest note (the resolve then comes from the synth bell, and the report says so), and past its top note they hold (also reported). `start` then counts those notes from the lowest. The calm `pop`, `tick`, `click` and `land.light` are untuned taps: their rungs cannot climb, and `score.py` warns. Use `"kind": "bell"` for the steps under the calm kit, or give the role `pitches`.
- With the synth voices, use a voice that takes a pitch: `pop`, `bell`, `tick`, `tock`, `click` or a light `land` (weight under 0.6, or `variant: 'light'`). A heavy landing or a snap ignores it, and the report says so. Short voices (pop, light land) keep a fast climb clean; a bell rings, so space bell rungs at least a beat apart.
- Put the resolve on the payoff cue and drop the signature motif there (`"motifs": []`), or the two compete.
- The report lists every rung with its note (`progress.rungs`), the kit role and notes it climbed (`progress.kit`) and the resolution; `events.tuned` shows what played, in key.

### 5.5c Typing

On screen, most typing is silent in measured films (about 75%); about 15% gets a sound per key and about 10% one sound per word, and none uses a continuous texture. Pick one style per film; `auto` picks per run:

| `typing` | Sound | Use it for |
|---|---|---|
| `auto` (default) | per run: above 25 chars/s `word`, otherwise `soft` (thinned to about 12 sounded keys/s) | almost every film |
| `soft` | a dark modal "tock": body 760–940 Hz (the spectral peak), plate ~2.0×, thud ~270 Hz, a 1 ms tick at ~3.5×; centroid ~1.2 kHz, ~11% in 2–5 kHz, attack ~1.5 ms, −20 dB ~6 ms after the peak, under 12 ms in all | typing in the foreground at a human rate |
| `mechanical` | the same keys stiffer: a 0.3 ms onset and a bottom-out 4–5 ms later; still under 25% in 2–5 kHz | a raw, mechanical or developer brand |
| `pitched` | felt mallets random-walking over the chord's pentatonic tones in G4–F5; space and return on the root | a moment where the typing is the music |
| `muted` | dull and short, 10 dB further under the music than `soft`, no duck | under VO, in a dense `drive`, typed text that is background |
| `word` | one pitched blip per word (36–60 ms, 330–1400 Hz, a small upward glide), stepping through the chord's tones on each word start; the other keys silent | fast type-ons, prompts that stream in |
| `off` | nothing | the picture types but any sound would compete |

With a kit, the `key`, `key.space` and `key.return` takes replace the synth keys (one take per key identity, so a key keeps its sound) and everything below still applies: the plan, the dynamics, the duck and the levels; `pitched` then plays the kit's keys untuned, `word` plays one key take per word (on its word starts, a new take each), and the bottom-out and key-up belong to the take. The take sets the timbre, so a bright run on a kit is a kit choice: the report judges it by the run's centroid against the measured 0.8–3 kHz of key clicks (§13), names the key sounds, and the fix is a darker member for the role in `audio/kit.json` (`earshot sfx list` shows each sound's `centroid_hz`), not another style. The 25% share in 2–5 kHz below is the synth keys' target only: the recorded keys in earshot's bank (fitted CC0 recordings) put 39–65% of their A-weighted energy there with centroids of 1–2.2 kHz.

What `score.py` does to every run, with no settings:

- **Thinning:** never two keys within 60 ms, and runs faster than 12 keys/s thinned to about 12/s (word starts, spaces and returns kept); word blips at least 80 ms apart.
- **Dynamics:** +2.5 dB on word starts, −0.3 dB per letter after, −1 dB before a space, σ 2.5 dB at random, −3 dB after the first 1.5 s: about 2.5 dB SD in all, with no jump over 6 dB between neighbouring keys. Keys are levelled by their 6 ms RMS, so `space` (+2 dB) and `return` (+2.5 dB) sit exactly above the letters whatever their timbre.
- **The key:** 26 fixed keys, ±1.2% pitch and a new transient per press; about half the letters bottom out 25–35 ms after the press at −12 to −15 dB, and `space` and `return` always do (about 700 Hz centroid, a little longer). A separate key-up click only with `"keyup": true`.
- **Timing:** σ 3.5 ms jitter (≤ 8 ms, under a frame); gain × √(10 / rate) and shorter decays when keys come fast.
- **Room:** dry, mono and centred (letters within ±0.05 by keyboard column).
- **The duck:** under every run of 3+ keys sounded per key (`soft`, `mechanical`, `pitched`) the music bus dips `mix.typing_duck_db` (default 10 dB; 0 disables), down over the 30 ms before the first key and back over 250 ms after the last; in bars with 4+ sounded keys the hats stop and the arp drops 4 dB. `muted`, `word` and `off` leave the music alone.

**Levels.** `score.py` levels each run against the music under it (6 ms key RMS against the music's 250 ms RMS, as the norms measure it, within ±12 dB of the static level): per key, about 4 dB under the ducked music's short-window RMS (`pitched`, whose tones carry more energy, 8 dB), which puts the run at about −8 to −2 dB A against it (measured films sit near +4 dB over music dipped 10–16 dB or drumless; over this engine's fuller groove that level measures about +5 dB A, so `score.py` holds the keys lower); `word` blips +6 dB over the music (measured +2 to +9); `muted` 10 dB lower than `soft`, under the full bed. These hold at weight 1; the run's median key weight moves its target by 20·log10 of it. The report's `typing` block measures each run (`vs_music_A_db`, `key_vs_music_db`, `level_db` applied, `duck_db`, `share_2k_5k_A_pct`) and warns when a per-key run sits above −1 dB A or below −10 dB A against the ducked music, when `muted` typing comes within 8 dB A of the bed, when word blips leave 0 to +11 dB, when keys are bright (over 25% of their A-weighted energy in 2–5 kHz; kit keys: a run centroid, `centroid_hz`, over 3 kHz), and when a style set by hand sounds per key above 25 chars/s.

### 5.6 When the brand brings sound

- **Music supplied:** set `bed` to the file, set `key`, `bpm` and `chords` to match the track (effects are tuned from them), and leave `sections` empty or use `hold` so nothing competes. Sucks, silences, ducking under hits and the master still apply. Retime the picture to the track's bars, not the other way round.
- **Sonic logo supplied:** place it as the `bed` at the lockup cue (`"at": "@lockup"`) and drop the signature motif.
- **Voiceover:** mix it into the bed file, or build the bed around it; keep the music 10–12 dB under speech in the 1–4 kHz band, and keep effects off the syllables that matter.

### 5.7 Scoring a text-led film

Measured, frame by frame, on eight professional motion films where short text fragments carry the story (patterns, not their copy):

- **One soft sound per fragment arrival, 0–80 ms after the visual.** Words and short phrases are "voiced" by small sounds (a tap, a tick, a soft tuned note) landing on the frame the text becomes readable, in the tightest films within ±45 ms of it. cinetic sounds the fragment, not each word: a `text` event on the fragment's resolve frame, and a chain's fragments step through the chord's tones (root, third, fifth; with a kit, the chord's tones among the text takes), so a thought building up is heard as one gesture. A word-by-word build that is the whole point of a shot may tick per word, at most, with the `text` sound on the last word.
- **Near-silence holds the reading.** Gaps of 0.6–1.75 s fall right after a line has fully arrived (0.6 s after a short statement, 1.75 s under a finished tagline). The held line gets no ticks, pulses or beds that move; the next sound comes with the next picture event.
- **A big low hit only for the single reveal.** Loud hits are rare and reserved for the one reveal (the product name, the hero moment): about 2 hits a film, the rest of the text sounds 10–27 dB under full scale. A sub drop under every statement turns a calm film into a trailer.
- **The lockup is a stop-down and one element** (§5.3): near-silence for 0.2–0.7 s, then one clean hit or struck note on the wordmark, then its tail.
- **Effects only is a legitimate score.** The one effects-led film in the study measures −22 LUFS with an LRA of 12 LU: its accents stand alone in silence. `"music": "none"` masters at −18 LUFS by default, so a few accents keep their peaks without the limiter crushing them; switch the music on only when the film wants a groove, and then a real track (`bed`) or the synth band at −14.

`score.py` checks the parts it can measure: the stack guard (two designed sounds within ±3 f, or a lead-in into the lockup), the payoff's loudness and lift, the tail. `listen.py` (§9.1) checks the rest by ear: every `text` cue answered within a frame, the gaps after the text, the loudest accent on the reveal.

## 6. Harmony and tuning

- **One chord per bar**, changing on downbeats, at most two per bar. Chords that move carry the film; one chord for 30 s sounds like a loop.
- **Voice leading is automatic.** Pads pick the voicing nearest the previous one, keep the root, third or fifth at the bottom (tensions such as 9 and 11 sit inside), and avoid close intervals below C4, which turn to mud.
- **The V chord is gone by the downbeat it resolves into.** A dominant pad ends at the next bar + 0.08 s, so the tonic lands clean.
- **Every pitched effect is in key.** The defaults: the clock on the tonic and the fifth below it, in octave 6 (0.8–1.6 kHz; octave 7 sits on the ear's 3–4 kHz resonance and reads as a beep); pops on the pentatonic, climbing within a run; snaps, landings, booms and drops on the current chord's root between E1 and E♭2; risers landing on the chord root at their arrival; clicks on one pentatonic tone near 2 kHz for the whole film; word blips stepping through the chord's tones; light landings on chord tones. Crisp ticks are untuned by design. With a kit, the tonal roles are rendered in the key (`kit.py tune` writes their `pitches` and `edits.pitch` from `score.json`'s key: the bell on the pentatonic, `text` on the pentatonic too (a text role of three notes keeps the tonic triad), the lockup's struck note on the tonic) and each cue plays the take whose pitch is nearest the note above; a chain's text fragments step through the chord's tones among the text takes, and an explicit note (a hand-set pitch, a progress rung, a motif note) plays only a take on that note, else the synth voice with a warning; noise roles (taps, whooshes, keys) are untuned. The report lists every tuned sound with its note and flags anything outside the key and the chord.
- **Tune the kick to the tonic.** It then agrees with every bass note.
- **The sonic signature.** A tuned tick/tock pair and a three- or four-note motif (1–5–9 by default) belong to the brand the way the accent colour does. Open and close on the same sound (the bookend), and place the motif once, on the lockup.

## 7. The synth palette

The built-in band (`"music": "synth"`) and the fallback effect voices, all in `scripts/audio/synth.py` (48 kHz, numpy/scipy, seeded); `synth.py --demo out/palette.wav --key G` auditions every voice in a key. With a kit these voices play only for a role the kit does not name. Oscillators integrate their phase, because `sin(2πf(t)·t)` chirps on a glide.

| Voice | Recipe | Used by |
|---|---|---|
| `saw`, `square` | PolyBLEP band-limited | pads, plucks, risers |
| `supersaw` | 5 saws over ±0.11 semitones, spread across the field, low-pass per section; pad bus high-passed at 170 Hz | pads |
| `pluck` | saw + pulse through a closing low-pass (3–4.2 kHz → 500 Hz over 90 ms), with a 3/8-beat ping-pong delay on the bus | arp |
| `bass` | sine + 2nd harmonic + a little saw, low-pass 900 Hz, soft saturation | bass |
| `kick` | sine gliding onto the tonic (+110 Hz decaying over 35 ms) + a 2.5 ms noise click | drums |
| `sub_boom` | sine gliding from an octave above onto the root, with a low-passed thump | hit, drop, heavy land |
| `clap` | four noise bursts 9–10 ms apart, band 0.9–5.2 kHz | drums, hit |
| `hat` | high-passed noise + metallic partials at 8.1, 10.9 and 13.3 kHz | drums |
| `fm_bell` | FM, ratio 3.5, index ~2 decaying in 0.35 s | bells, motif |
| `whoosh` | 1/f^1.6 noise through a wide band sweeping f0 → f1 at the apex → f2, envelope `(u/apex)²` then exponential; centroid ~550 Hz | whoosh, suck |
| `riser` | noise band 220 Hz → 7 kHz + two saws gliding an octave onto the target | riser |
| `tick` | tuned fundamental (τ 8–12 ms) + partials at 2.76× and 5.4× dying 2.5–7× faster + a 0.5 ms low-passed transient; `dark=True` for the tock | tick, tock, clocks |
| `crisp_tick` | three inharmonic modes near 3.1, 4.4 and 6.2 kHz drawn from the seed + a band-passed transient, high-passed at 1.5 kHz; centroid 3.5–4 kHz, −20 dB in about 11 ms | `tick` `crisp` |
| `key_click`, `thock` | modal "tock" (body 760–940 Hz, plate, thud, a 1 ms tick) excited by a low-passed 0.4 ms transient under a 0.7 ms soft onset; `style`, `kind` (`letter`, `space`, `return`, `back`), `second` (the bottom-out 25–35 ms later), `keyup` (off by default); seeded per key and per press | key |
| `word_blip` | a 48 ms sine gliding 2.5 semitones up into its note, 4 ms attack, a 2nd harmonic 18 dB down | key (`word`) |
| `ui_click` | a press at `ping` (~2 kHz) with partials at ~1.5× and ~2.2×, high-passed at 600 Hz (4th order): centroid ~2.5 kHz, −20 dB in ~6.5 ms; one `seed` per film, `strike` per press; the release ~85 ms later, 1.5 dB down; an optional confirm `tone` | click |
| `tock`, `snap`, `blip`, `swell`, `marker`, `drone`, `keys` | see the docstrings | effects |

`place(dst, x, t, gain, pan)` adds a sound with a constant-power pan and a 6 ms cos² fade at its end, so nothing clicks where a buffer stops; `layer_in(base, x)` does the same for a layer inside a composite sound (a hit's clap inside its boom). `place_at_peak(dst, x, frac, t)` puts the point at `frac` of a sound on `t`. For a one-off sound, import `synth` in a small script and add the result to the WAV with `master.py`, or add an event kind to `score.py`.

## 8. Mix

| Stage | Default | Why |
|---|---|---|
| Sidechain | depth 0.55, τ 0.14 s, from every kick, hit, drop, snap and heavy landing | the music breathes around the hits |
| Hit duck | music −3 dB for 150 ms around hits, drops, snaps and heavy landings | effects sit ≥ +6 dB over the music in their own band |
| Typing duck | music −10 dB under every run sounded per key, 30 ms down, 250 ms back (`mix.typing_duck_db`) | measured films carve a 10–16 dB dip for typing in the foreground |
| Levelling | each typing run, and one gain per film for the click and for the crisp tick, set against the music's 250 ms RMS: keys about −4 dB (ducked music), word blips +6, clicks −3, crisp ticks −8, at weight 1 (the median weight moves the target by 20·log10 of it) | the measured levels, whatever the section's density |
| Kit level | each take (peaking at −1 dBFS) at its role's `level_db` × the cue's weight × `KIT_GAIN` (0.83: measured so a kit sits against the music about where the synth voices did), trimmed toward its role's median loudness (the lock's `lufs_m_max`, at most ±6 dB); keys follow the typing plan's dynamics | the kit keeps its own balance between roles, the one `kit.py audition` plays, and a role keeps one level from take to take (peak-normalised takes of one role measure up to 3–4 LU apart) |
| Placement | every effect except whooshes and risers (and their reverse forms, sucks and swells) within ±0.15 of the centre, kit takes folded to mono | measured effects are mono and centred; the width lives in the music |
| Reverb | sends high-passed at 250 Hz; hall 2.8 s for music and big hits, room 0.7 s for landings and moves; keys, clicks and crisp ticks dry; the clock's tick and tock dry plus a 0.3 s room at −22 dB (send high-passed at 350 Hz) | space without low-end smear; tiny sounds stay dry |
| Effects low end | 45% of the effects below 90 Hz removed | booms on consecutive hits do not stack into rumble |
| Suck | music ducked 90% over the 0.2 s before a drop | the drop lands on air |
| Silence | music 97% down for the drop's `silence`; everything down for `silences` | true silence makes the next hit feel twice as big |
| Mono low end | below 120 Hz | centred bass that survives phones and mono |
| Bus compressor | 2:1 above −14 dBFS, 5 ms RMS detector, 15 ms attack, 120 ms release | glue without pumping |
| Colour | soft saturation + a gentle air shelf | cohesion |
| End | music and effects (with their reverb) fade over the last `master.fade` (1.3 s), reaching zero 30 ms before the end; last 60 ms faded; last 480 samples zero | the delivered audio ends in digital silence, with no effect still sounding at the cut |
| Head | after the limiter, a 3 ms raised-cosine fade-in from exact zero at sample 0, always (and a fade-out of at least 10 ms onto the last sample) | a sound already at level on sample 0 (films measured about −22 dB) clicks and cuts in mid-action; `av-audit.py` warns when the first 5 ms still peak above −40 dBFS: either a hit designed for frame 0 (fine; say so) or a sound begun before frame 0, such as a whoosh whose apex comes early, a riser or a reverb tail (start it later or shorten it) |

Typing in the foreground gets room: the music ducks 10 dB, and the hats stop and the arp drops 4 dB in bars with 4+ sounded keys (§5.5c). The UI click reads in the 2–5 kHz band the music leaves nearly empty (measured: 1.2–2.8% of the music's power), so it sits about 3 dB under the music broadband and still cuts through.

**Scale each sound to its cause.** A sound is as big as the thing the viewer sees make it. A caret blink or a small UI tick gets a whisper, about 12–18 dB under the landing hit; the drop on the hero reveal is the loudest moment, and the mark's landing at the end resolves rather than slams. A loud tick over a held frame reads as a sound with no cause, and viewers hear it as a mistake. Set each event's `weight` in `src/sync.ts` (0–2, §3) from the size of its picture event (a caret or tick about 0.3, the landing 1.5–2), then read `av-audit.py`'s visual warnings: it flags loud effects that land on a still picture. Clicks, crisp ticks and typing are the exception: `score.py` levels them against the music (clicks at one level per film, from their median weight).

## 9. Master and verification

`master.py` (imported by `score.py`, also standalone) runs loudness passes: measure integrated loudness (pyloudnorm), gain to the target, then a true-peak lookahead limiter (4× oversampled detection, 4 ms lookahead, 80 ms release, ceiling 0.77 linear = −2.3 dBFS), repeated until within 0.05 LU, then fades the edges (3 ms in from zero at sample 0, at least 10 ms out onto the last sample). The ceiling leaves room for AAC, which adds 0.5–1 dB of peak.

```bash
python3 scripts/audio/master.py mix.wav public/audio/soundtrack.wav --lufs -14          # any mix, e.g. a supplied track (-16 for a calm sting)
python3 scripts/audio/master.py music.wav ducked.wav --sidechain kick.wav --sc-depth 0.55 # duck from a key signal
python3 scripts/audio/master.py --measure public/audio/soundtrack.wav --json -           # I, TP, LRA, loudest moment
```

**Loudness per film.** With music, −14 LUFS integrated is the default: streaming and social players normalise loud films down to about that and never turn quiet ones up, so a quieter film plays quieter than the feed around it. That holds for a calm brand with music too: anything posted to a feed masters at −14, and the calm lives in the arrangement, not the level. An **effects-only** film (`"music": "none"`, no bed) defaults to −18 LUFS: its integrated loudness comes from a handful of accents, and pushing them to −14 puts the limiter on every one (the Remotion starter measures −18.0 LUFS with its loudest peak, the lockup's struck note, at −2.3 dBTP and 0.1 dB of limiting). −16 to −18 is the range; the report prints the limiter's gain reduction, so raise the target only while it stays under 1.5 dB. A short sting (8 s or less, played at the head of someone else's video) with music may sit at −16 LUFS. Set `"master": {"lufs": …}` in `audio/score.json`, or pass `--lufs` to `score.py` or `master.py`. Keep −1 dBTP after the encode either way (the ceiling stays 0.77). Whatever the target, the loudest moment is the payoff, the drop on the hero reveal (in a sting, its hit), never the bed or the end card, which sits 8–20 dB under the peak: if the momentary peak sits on a pad or a drone, pull the bed down rather than the master up. `av-audit.py` reads `master.lufs` from the score and gates ±1 LU around it.

Targets: the film's LUFS target (−14 with music, −18 effects only, −16 as above), LRA 5–8 LU for a launch film with music (4–6 for short pieces; an effects-only film may run wider, and `av-audit.py` accepts 3–14 for one), true peak ≤ −1.5 dBTP on the WAV and ≤ −1 dBTP after the encode, the loudest moment 30–60% into the film, limiter gain reduction under 1.5 dB at the payoff, the tail's last 50 ms under −45 dB. The Remotion starter (effects only, the calm kit) measures −18.0 LUFS, −2.3 dBTP, LRA 7.3 LU and 0.1 dB of limiting on the WAV.

You cannot listen, so measure what a listener hears:

- **Sync:** `av-audit.py` matches onsets to events within ±2 f; `check-sync.py` cross-correlates the muxed audio with the WAV.
- **Audibility:** the report's `masked` list (event vs music energy per octave band, A-weighted to pick the band the ear uses); the stems for mute-and-subtract.
- **Harmony:** chroma per half bar, high-passed at 180 Hz so the bass does not leak into neighbouring notes, should show the chord's tones on top.
- **Arc:** the momentary-loudness curve (`master.blocks()`): an intro 5–12 LU under the body, the drop highest, a breakdown about 5 LU down, an ending that subtracts to silence.
- **Timbre:** `kit.py audition` plays every take of the kit at its level; `kit.py check` audits them (clicks, cut tails, a rising pitch, stacked attacks); a spectrogram of the soundtrack with the cue frames marked (`listen.py`'s sound sheet) shows collisions at a glance.

### 9.1 Listening with earshot

`python3 scripts/audio/listen.py` (`npm run listen`; add `--video out/preview.mp4` once there is a render) runs earshot's timeline with the cues, its annotated sound sheet and its critique scorecard in one process, so the models load once (20–60 s, longer on a busy machine), and writes `out/qa/listen.json` and `out/qa/sound_sheet.png`. Read them in this order:

1. **`sync`** (model-free): every cue with the sound that answers it, `offset_ms` and `status` (`OK` = an onset within one frame, `near` = within 100 ms, `peak` = only a level peak, as from a soft whoosh, `no sound`). The stats compare the hit rate with chance. A `text`, `hit` or `land` that is not `OK` is a sync bug; a whoosh answered by its `peak` is normal.
2. **The sheet**: the spectrogram, waveform and loudness curve with every cue marked (green on time, amber near, violet a level peak, red nothing). Check the near-silence after each line of text, the reveal as the loudest accent, the tail.
3. **`loudness`, `summary`, `transcript`**: what earshot heard, event by event, with tags. Tags are hints.
4. **`critique`**: a scorecard against bundled music-led launch films. On an effects-only film "no music", "sparse onsets" and "low loudness" are the style, not defects; read its realness and first-sound lines, and its actions, as hints.

`python3 scripts/audio/kit.py listen` listens to the kit instead: one take per role, earshot's description of it and a forced choice between the role's description and cheap-synth alternatives (a laser zap, a video-game blip, an 8-bit sound, a rising synth whip) in `out/qa/kit_listen.json`; replace a role an alternative outranks. Without earshot or its models both write `"listened": false` with the reason and exit 0: listening informs the review, it never blocks a build. Lead with the measured numbers; model readings saturate and are easy to over-fit.

## 10. Reading the report

`score.py --json out/qa/score.json` writes `lufs`, `target_lufs` (the target and where it came from), `true_peak_db`, `lra`, `momentary_max` and its time, `limiter_max_gr_db`, `limiter_hot` (moments over 1.5 dB), `payoff`, `hook` (films with music: the first 0.5 s against the median momentary loudness), `tail_50ms_db`, `sfx` (where the effects came from: `source` (`earshot kit`, `earshot kit (rendered now)`, `vendored kit (…)` or `synth (fallback)`), the kit's name, bank and earshot version, each role with its sound, cues, the takes used, their loudness spread before the trim (`lufs_spread`) and the trims applied (`trim_db`), `off` (cues of roles the kit leaves off) and `synth` (kinds still on synth voices)), `stacks` (stacked gestures), `events.skipped`, `events.masked`, `events.tuned` (every pitched sound with its note: a tonal take reports the note it was rendered at), `progress` (when used), `typing` (the style per run, the duck, the level applied, each run against the music: A-weighted, short-window, 2–5 and 5–10 kHz; the run's centroid and, with a kit, its key sounds), `sfx_levels` (clicks and crisp ticks: the level applied and their median against the music), `loudest_frac`, `chords`, `warnings`, `pass`.

| Warning | Fix |
|---|---|
| blind synthesis fallback | no rendered kit and no earshot: install earshot (`docs/setup.md`), set `EARSHOT_PYTHON`, `npm run kit`; or copy a rendered kit in (`kit.py vendor --from DIR`). Do not ship on it |
| `audio/kit.json` changed since the takes were rendered … playing the takes as they are | earshot is not found here: render the kit where it is (`npm run kit`) and keep `audio/kit/` with the project |
| stacked lockup / payoff at t: … | keep ONE clean element on the reveal; cut the whoosh into it, the snap or bell on top, the score.json motif there (§5.3). A `drops` entry is not a layer: its silence and suck are the stop-down |
| kit role … has no take on N | a hand-set `pitch`, a progress rung or a motif note the tuned role has no take on: its synth voice played it. Add the note to the role's `pitches` in `audio/kit.json` and `npm run kit`, or drop the hand-set pitch |
| stacked effects at t: … | one sound per visible event: two heavy sounds or three kinds within ±3 f blur into one smear |
| cues the kit leaves off (skipped): … | by design for `riser`, `swell`, `suck` (and `drop` in `calm`); when the picture needs it, give the role a sound in `audio/kit.json`, then `npm run kit` |
| kit role … rises in pitch (rising_glide) | a rising synth whip: pick another sound for the role (`earshot sfx list`, then `kit.py check`) |
| kit role … stacks attacks or builds before its hit | the hit is two sounds: pick a single-attack member |
| synth riser at f=… | the synth riser is two saws gliding up an octave: let the reveal resolve on one element, or give `riser` a kit sound |
| `masked: kind at f=… (x dB …)` | raise the event's weight, lower the section's `level`, or remove a layer that sits in that band (often the pad or bells) |
| payoff is not the loudest moment | lower the louder section's `level`, or give the payoff section `level` 1.0 and a `drop`; point `payoff` at the hero reveal, not the lockup |
| the loudest moment is at N% (the ending) | the ending slams: peak on the drop at the hero reveal, then stop or filter the music as the logo forms and resolve softly (§5.3) |
| the payoff is only N LU over the median | thin the bars before it, add a `drops` silence before it, give the payoff section `level` 1.0 and the others 0.7–0.85 |
| LRA is flat for a film of 20 s or more | a `breakdown` (or `layers: {drums: 0}`) before the turn, a `drops` silence before the drop, the full kit only from the payoff |
| limiter over 1.5 dB at t | too many loud things on one frame: one boom per downbeat, lower the weights there; in an effects-only film, or lower `master.lufs` toward −18 |
| out of key | a hand-set `pitch` is wrong; delete it and let the chord decide, or fix `chords` |
| falls inside a silence | move the event, or shorten the silence |
| soft hook: the first 0.5 s sits N dB under the median | a sound with a reason on frame 0 (the device's tick, a hit on the first move); no section-less first bar, no riser or swell into the opening |
| starts inside the end fade | move the event before the fade (`master.fade` + 0.03 s from the end), or shorten `master.fade` |
| the ending is not silent | an effect or a supplied bed runs to the last frame: move it earlier or trim the bed |
| progress: … ignores its pitch | give the steps a pitched voice (`pop`, `bell`, `tick`, `click`, a light `land`) |
| progress: kit role … is untuned | its rungs all sound alike: `"kind": "bell"` for the steps (the kit's tuned voice), or give the role `pitches` |
| progress: N rungs but kit role … has takes on only M notes | the climb holds on the top note: add notes to the role's `pitches`, or use fewer steps |
| a `key` skipped as thinned, or "one blip per word" | expected: no two keys within 60 ms, fast runs at about 12/s, and a `word` run sounds only its word starts; not an error |
| typing sits N dB A against the ducked music, is buried under it, or is bright | lower the key weights; for buried, raise `mix.typing_duck_db` or thin the section; for bright, `soft` or `muted` with the synth keys, and with a kit (the warning names the key sound) a darker member for the key role in `audio/kit.json` |
| typing sounds per key above 25 chars/s | `"typing": "auto"`, `"word"` or `"off"` |
| click / crisp: N at x dB against the music, target y | the levelling hit its ±12 dB limit: the music there is unusually loud or quiet; check that section's `level` or the events' weights |
| chords vs bars mismatch | one entry per bar, including the tail bar (`"-"`) |

## 11. Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Sound lands 3–10 f late | cued on the settle or typed by hand | contact frame, 50% pop, 97% settle, velocity peak, via `lib/sync.ts` |
| Whoosh smears across the move | apex not on the velocity peak | `move()` in `sync.ts`: length = the move, apex = `peak()` |
| Boom sounds wrong under the chord | pitch set by hand, or chords do not match the bars | drop `pitch`; fix `chords` |
| Drop does not land | no silence or suck; a riser runs into the downbeat | a `drops` entry; end the riser on the silence's first frame |
| Low end booms and blurs | a kick, a drop and a heavy landing on one downbeat | one weight per downbeat; `drop` already owns the kick |
| Typing rattles or sounds cheap | bright noise clicks, every key at one level, a random timbre per key, a key per character in a fast type-on | `"typing": "auto"`, `word`/`space` variants, fractional frames; thinning, dynamics and the duck are automatic |
| Effects vanish under the music | 13–25 dB under in their band | weights, section `level`, fewer layers where effects live |
| Ending clicks or cuts off | no tail, or an event inside the end fade | `TAIL` ≥ 60 f; move late events before the fade (the report names them) |
| The first second sounds like a fade-in | a slow pad attack, a swelling drone, nothing on frame 0 | a sound with a reason on frame 0; the first bar at intent (§5.3) |
| Peaks over −1 dBTP after encode | limiter ceiling raised, or effects added after the master | keep ceiling 0.77; re-run `score.py` after every change |
| A kit sound starts before its move | a whoosh take with a long build placed on a short move | `score.py` fades the lead-in so it starts at most 2 f before the move; for very short moves use `whoosh.short` or a tighter member |
| The effects sound synthetic | the synth fallback played (no kit), or a role the kit does not name | the report's `sfx` line names the source and every synth kind: render the kit, name the role |
| Sound late after mux | Remotion's AAC priming | render `--muted`, mux with ffmpeg (`render.sh` does) |

HyperFrames: it has no master bus, loudness stage or audio-to-picture sync. Export the same `out/cues.json` from the composition's timeline, render the WAV with `score.py`, and mux it with `scripts/hf-finish.sh --audio` (`references/hyperframes-engine.md` §11).

## 12. Sound slop

The habits that make a launch film sound cheap, and what to do instead. Most are defaults here; the critic checks the rest (`assets/critics/sound-sync.md`). The numbers are the measured norms (§13).

| Slop | Instead |
|---|---|
| A whoosh on every cut or move, a slam on every cut, a riser before every reveal, a noise burst before anything moves | about 85% of hard cuts get no sound of their own, under 5% a whoosh; about 2 whooshes a film, on camera-scale moves and logo zooms, onset 100–450 ms ahead of a real move, apex on the visual peak (±45 ms); one or two risers, ending in a hard stop, a filter drop or a 30–250 ms gap, never a crash cymbal |
| A boom on every logo, lock and landing; trailer braams on a product film; the logo slammed as the loudest moment | about 2 hits a film, structural: the drop on the hero reveal (within 0–40 ms), lock-ins as tuned snaps, light landings as pitched knocks; the logo 8–20 dB under the film's peak: the music stops or filters down, 0.2–0.7 s of near-silence, then one soft sub boom (peak about −7.5 dBFS), bell or the motif on the wordmark |
| A drop or big hit on a static frame | the drop on the hero reveal; section changes (stop, re-entry, filter drop) within 0–150 ms of a picture change |
| Pings and bright clicks: sine ticks in octave 7, typewriter keys at 4–8 kHz, clicks with a 100–200 ms ring, pings at 9–14 kHz, UI sounds +9 dB over the music with −1 dBFS peaks | keys a dark tock (centroid 0.8–3 kHz, at most 25% in 2–5 kHz, spectral peak 0.75–1 kHz, under 10–12 ms); clicks bright but short (−20 dB in 6–10 ms), about 3 dB under the music broadband and 12–20 dB over its content above 3 kHz; every event centroid at 6.5 kHz or below; a confirm tone only on a meaningful action |
| Sounding every UI motion: scrolls, progress bars, streaming text, toggles, hovers, rolling counters | only discrete state changes (a press, an insert, a lock, a reveal, the logo), about 5 designed effects per 10 s |
| An even effects layer through the whole film | effects cluster where the music is sparse (a cold open at 10–28 per 10 s, typing, the logo build) and drop to 0–1 per 10 s once the full groove plays |
| Partial coverage: 5 of 14 identical presses clicked, the rest mute | the same action gets the same sound at the same level every time |
| The machine gun: one waveform on every hit (hats, claps, clock ticks, keys) at a machine-regular rate | a new seed per hit, ±1 dB and ±1–2% pitch; keys vary in level (σ about 2.5 dB, no jump over 6 dB between neighbours), with human timing and a second transient 25–35 ms later on about half of them. The UI click is the exception: one voice at one level per film |
| Random-pitch typing (±6% per press on a random timbre per key): a marimba, not a keyboard | 26 fixed keys, ±1.2% per press |
| A key sound on every typed character, 30 clicks a second, typing laid over the full groove | most on-screen typing is silent; at most about 12 keys/s, one pitched blip per word (36–60 ms) above 25 chars/s (`"typing": "auto"`); the music ducked 10–16 dB under typing in the foreground, the keys about 4 dB under its short-window level (−8 to −2 dB A) |
| Every effect at one loudness | scaled to its cause: the drop loudest; snaps and heavy landings next; word blips about +6 dB and clicks about −3 dB against the music; ticks about −8; whooshes felt more than heard |
| Long reverb, wide panning or phase tricks on tiny sounds | effects dry, mono and centred (±0.15); width only on whooshes, risers and the music; long tails only on the end boom (0.26–1.3 s) and a final wash |
| A wide or out-of-phase sub, a phase-inverted shimmer | mono below 150 Hz (side/mid −18 dB or lower) and positive left/right correlation in every section |
| Hats through every section | hats in one or two sections, accented, a new seed each hit, gone under typing |
| Glitter, shimmer and "magic" sweeps on reveals | the brand's palette and the motif; a shimmer only if it is the motif, once |
| A rising synth whip: a pitch sweep up into a cut or a reveal (a zip, a laser, a riser's gliding saws) | air without pitch (a whoosh, a swipe), or nothing; `kit.py check` and the report flag any role whose pitch climbs, and the presets use none |
| A stacked sting on the logo: a whoosh into an impact, plus a sub, a bell and a shimmer on one frame | stop-down, then ONE clean element (a struck note or a single hit); the stack guard flags a second sound within ±3 f |
| A sound on every word of a text build; ticks through the held line | one soft `text` sound per fragment, on its resolve frame; the held line in near-silence |
| A synth pad bed under quiet type | effects only (`"music": "none"`), or a real track: the one effects-led film in the study runs with no bed (§5.7), and a pad sits in the band of the soft text sounds (the report's `masked` list shows what it covers) |
| A bed that never stops; flat loudness (LRA 1–2 LU) | an intro 5–12 LU under the body for 2–3 s, the drop at about 3 s on the hero reveal, a breakdown about 5 LU down mid-film: LRA 5–9 LU, true silence before the drop |
| A full-level downbeat on frame 1, or a first ping 49 dB over silence | enter with intent but soft: a drone or a 150–450 ms entry, the first sharp transient once the bed is up |
| A truncated ending: the file stops mid-note or mid-fade | a tail of 0.5–2.5 s to below −60 dBFS, then 0.4–1.1 s of silence on the end card |
| Brickwall limiting to 0 dBFS with overs between samples; an infrasonic swell spending the headroom | −14 LUFS, −1 dBTP with oversampling (the WAV holds −1.5), PLR 12–16 dB; high-pass below about 25 Hz |
| Cartoon glides, big Doppler swings; an untuned sub, random pop pitches | pitch moves within 1–2 semitones on pops, 2–4 on a whoosh; the sub and kick on the key's root (39–62 Hz); pops and word blips stepped through chord tones (330–1400 Hz) |
| A different material for every sound | one palette (felt, wood, glass, soft synth), one scale for every tuned sound |

Premium, in one line: restraint, one palette, dark keys and short bright clicks, the music carrying the cuts, real dynamics, silence before the drop and an ending that subtracts. Good sound design mostly disappears.

## 13. Measured norms

Measured norms of top-tier launch films, from 9 s teasers to 90 s feature films, as median (range). *Decay* is the time from the peak to −20 dB; *vs music* is a 5–8 ms effect RMS against the music's 250 ms RMS at the same moment; *over bed* is the event's peak against the local background. Where good and bad habits both appear, the norm follows the good one.

**Loudness and arc**
- Integrated −14 LUFS (properly mastered: −12.6, −15.1 to −8). Two thirds go over 0 dBTP between samples (up to +1.5): a defect. Limit to −1 dBTP with oversampling.
- LRA 4.8 LU (1.1–8.7): films with a real arc sit at 5–9, masters at 1–2 sound crushed. PLR 13.5 dB (8.3–23.7).
- The loudest momentary is +4.4 LU over integrated (+2.1 to +7.0), at 41% of the runtime (12–91%). In every film with music the logo or end card is not the peak: it sits 8–20 dB below it.
- The intro runs 5–12 LU under the body for 2–3 s and enters with a 150–450 ms fade or a drone. The drop arrives at 3.0 s (2.0–6.0), about 11% of the runtime.

**Music**
- 126 BPM (84–130; nearly all 115–130, the slower ones half-time). Minor keys. The sub or 808 on the key root at 39–62 Hz; 808 kicks drop from 120–320 Hz to 50–62 Hz in 30–60 ms.
- A pad or chord bed in every film; an 808 in about 3/4; hats with 16th or 32nd-triplet rolls in 1/2; plucks or arps in 1/3; claps on 2 and 4 in 1/4; a chopped-vocal lead rarely.
- Harmonic material carries 85–91% of the energy; sidechain pumping takes 5–20 dB off the upper band, its trough 54–68 ms after each kick.
- 79–90% of the power below 250 Hz and only 1.2–2.8% at 2–5 kHz: the band where effects read. (The darkest mixes were judged thin on phones.)
- Shape: a soft entry; an intro with no sub or drums; the drop on the hero reveal; the body; 1–3 breakdowns or stops at 40–80% of the runtime, about 5 LU down; a re-entry on a picture beat; an ending that subtracts. The energy peak comes right after a drop or re-drop, never at the end.
- Silences in every scored film but one: gaps of 30–250 ms before an impact (median 150, at −11 to −42 dB), stops of a beat or a bar (200–900 ms), breakdowns with the kick out (0.45–6 s), a 250 ms, 16 dB dip carved for typing, stutter gates of 20–23 ms on 16ths.
- Arrangement events (drop, stop, re-entry, filter drop) land within 0–150 ms of a picture change in about 3/4 of scored films. Ordinary cuts land on the beat no more often than chance (12–33% against 14–28%).

**Effects: how many and where**
- About 5 designed effects per 10 s (0–28), in two groups: a third of the films use music only in the body (1 or fewer per 10 s); passages led by effects run 10–28 per 10 s.
- They cluster where the music is sparse (the cold open, typing passages, the logo build) and thin out or stop after the drop (20 per 10 s before it, 0.15 after).
- Sounded: discrete state changes: word reveals, cursor presses, icons or cards popping in, a counter locking on its value, the logo assembling or the wordmark landing; the hero reveal gets the music's drop rather than an effect.
- Deliberately silent: most hard cuts, scrolls, streaming text, progress bars, rolling counters, toggles, hovers, looping tiles, URLs typing on, most zooms.
- About 85% of hard cuts carry no dedicated sound and under 5% a whoosh; a strong music onset falls within 2 frames of 44% of cuts, close to chance.
- Once a class of action is sounded, every instance gets the same sound at the same level: partial coverage reads as a mistake.

**Effects: level, spectrum, envelope**

| Sound | Level | Centroid; 2–5 kHz share | Attack / decay |
|---|---|---|---|
| Key click | +4 dB vs music (−2 to +8), the music dipped 10–16 dB or drumless (RMS −33 to −18 dBFS) | 1.8 kHz (0.8–3); 0.1 (at most 0.25); spectral peak 0.75–1 kHz: a dark tock | 3 (1–6) / 4 ms (2–6); under 10 ms in all |
| UI click | −3 dB vs music (−8 to +3), +12 to +20 dB over the music above 3 kHz | 3.3 kHz (1.4–6.8); 0.25; a wood-tock variant at 0.66–0.76 kHz | 2 (1–4) / 6 ms (3–15); press and release 38–112 ms apart (about 85), the release 0–3 dB quieter |
| Pop, word blip | +7 dB vs music (+2 to +9) | 0.8 kHz (0.26–1.3); 0.1 or less; pitched, 330–1400 Hz, up about an octave in 60–70 ms or down two in 30–40 | 10 (2–40) / 30 ms (5–62) |
| Tick | −8 dB vs music (−17 to +4); +1 to +6 dB over the bed under a logo build | 4.4 kHz (2.8–7.9) | 4 (1–9) / 20 ms (3–35) |
| Whoosh | +6 dB over bed (+1 to +11), +12 to +45 dB above 3 kHz | 3.1 kHz (0.4–9); band-passed noise | 30 / 150 ms; 210 ms long (120–800), scene swells to 1.3 s |
| Hit | +21 dB over bed (+10 to +28), usually the score's own kick or 808 | 180 Hz (85–650); a broadband variant at 1.3 kHz | 25 / 200 ms; sub booms with 0.24–1.3 s tails |
| Chime | +14 dB over a quiet end pad (0 to +27) | a soft bell at 1.0–1.3 kHz, or a sparkle at 3.7–9.5 kHz | 5 ms / 18–350 ms, a faint ring to about 1.5 s |

Keep every event centroid at 6.5 kHz or below: pings at 9–14 kHz were judged fatiguing.

**Typing**
- About 75% of on-screen typing is silent, about 15% sounded per key and 10% per word; no continuous texture.
- On-screen typing runs 15–77 chars/s (about 35); sounded keys 9–12 per second. Above about 15 chars/s about 60% of the characters sound; above 25–30 chars/s one blip per word, or silence.
- Gaps between keys 75 ms (26–147), SD about 44 ms, in two groups: about 30 ms pairs and 75–145 ms gaps; about half land within ±12 ms of a character frame.
- Level SD about 4.5 dB with no jump over 8 dB between neighbours (a 19 dB jump was judged a flaw; `score.py` stays inside that at about 2.5 dB and 6 dB); centroid SD about 340 Hz; attack and decay constant.
- About half the keys get a second transient 25–35 ms later at −12 to −15 dB; there is no separate key-up sound. Dry, mono, centred.

**Whooshes, hits, risers, space and sync**
- Whooshes: 2 a film (0–8), on camera-scale moves and logo zooms, not on cuts; the onset 100–450 ms ahead and the peak on the visual peak (±45 ms); wide (side/mid −1 to +3 dB).
- Hits: 2 a film (0–13), mostly structural (the drop on the hero reveal, a sub boom on the logo), 0 to +75 ms after their cut (median +20); after a riser +100–116 ms, a beat of air.
- Risers in about 40% of films, 0.2–2.8 s, ending in a hard stop, a filter drop or a 30–250 ms gap, never a crash.
- Master width side/mid −8.8 dB (−17.6 to −3.2), left/right correlation 0.77 (0.36–0.97), the highs widest; below 150 Hz side/mid −18 dB or lower.
- Effects dry, mono and centred: pan within ±0.1, decays of 2–60 ms; width only on whooshes, risers and sparkles; at most one text layer 4–6 dB to one side.
- Music tails are short (125–300 ms on claps); long tails only on end booms (0.26–1.3 s) and a final wash (to 2.5 s).
- Designed accents land about +8 ms after their trigger (−45 to +75; −16 to +27 in the tightest films). Clicks come 10–30 ms before the visible press; word sounds sit on the frame the word reaches full opacity, +40 to +90 ms after it first appears.
- Music runs 55–117 onsets per 10 s, so "an onset within 2 frames" happens by chance 40–100% of the time: judge sync only against onsets at least 6 dB over the bed.

**Endings**
- As the logo forms (0–80 ms after its move starts) the music stops on a bar line or is filtered down; then 0.2–0.7 s of near-silence; then one soft element on the wordmark (+8 ms): a reverberant sub boom peaking around −7.5 dBFS, a soft bell or a low-passed pad.
- A tail of 0.5–2.5 s (about 1.5) to below −60 dBFS, then 0.4–1.1 s of silence on the end card. A third of films end mid-note or mid-fade, and it sounds unfinished.
