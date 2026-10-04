# Sound: score, effects, mix and master from the cues

Covers the soundtrack end to end: the `out/cues.json` contract, writing `src/sync.ts`, the `audio/score.json` schema, tuning, the instrument palette, the mix and the master. Read it before Step 5 (Sound), and again whenever sound and picture disagree.

The numbers here are the defaults that shipped Tessel (−14.1 LUFS, LRA 5.2 LU, −1.7 dBTP after AAC, every effect within ±1 f of its picture). Treat them as starting points, not dogma. When the user supplies music, a sonic logo or a voiceover, the brand wins: tune and time everything else around it (§5.6).

## Contents
1. [Why synthesize](#1-why-synthesize)
2. [Pipeline and gate](#2-pipeline-and-gate)
3. [cues.json and the event kinds](#3-cuesjson-and-the-event-kinds)
4. [Writing src/sync.ts](#4-writing-srcsyncts)
5. [score.json](#5-scorejson) (5.5a personality, 5.5b progress motif, 5.5c typing)
6. [Harmony and tuning](#6-harmony-and-tuning)
7. [The instrument palette](#7-the-instrument-palette)
8. [Mix](#8-mix)
9. [Master and verification](#9-master-and-verification)
10. [Reading the report](#10-reading-the-report)
11. [Failure modes](#11-failure-modes)
12. [Sound slop](#12-sound-slop)

## 1. Why synthesize

- **Tuned.** Every pitched sound (clock, pops, snaps, booms, risers) is computed in the film's key and on the chord under it. Library effects arrive in random keys, and an untuned boom under a resolving chord sounds cheap even to people who cannot say why.
- **Sample-accurate and re-timeable.** Sounds are placed on the exact frame the picture code computes. Retime an act and the next run of `export-cues.ts` + `score.py` moves every sound with it.
- **Deterministic and clean.** Everything is seeded, so the same inputs render the same samples, and nothing needs a licence.
- **One source of truth.** Bars, cues and sync points come from `src/timeline.ts` and the act modules, never from a second, hand-typed list.

## 2. Pipeline and gate

```bash
npx tsx scripts/export-cues.ts                       # src/sync.ts -> out/cues.json      (npm run cues)
python3 scripts/audio/score.py --cues out/cues.json --score audio/score.json \
    --out public/audio/soundtrack.wav --stems out/stems --json out/qa/score.json   # (npm run audio)
python3 scripts/audio/synth.py --demo out/palette.wav --key G         # audition every voice in a key
python3 scripts/audio/master.py --measure public/audio/soundtrack.wav # loudness of any WAV
```

`score.py` renders the music and effects, mixes them, masters with `master.py` and writes a 48 kHz, 24-bit stereo WAV exactly `TOTAL / FPS` seconds long. `render.sh --audio` muxes it (`references/finishing.md` §6); never let Remotion encode the audio.

**Gate (Step 5):** the film's loudness target ±0.5 LUFS integrated (`master.lufs`: −14 by default, −16 for a calm brand or a short sting; §9), true peak ≤ −1.5 dBTP on the WAV (4× oversampled), last 480 samples digital zero, report clean or every warning answered. `score.py` exits 1 when the loudness gate fails. After the mux, `scripts/check-sync.py` gates lag ≤ 48 samples and ≤ −1 dBTP on the decoded MP4, and `scripts/av-audit.py --stems out/stems` checks onsets against the cues, per stem (`references/review-loop.md`).

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
| `pan` | −1 left … +1 right, from the object's screen x. For `whoosh`, the direction and amount of travel |
| `pitch` | optional MIDI number or note (`"Eb6"`). Leave it out: `score.py` picks a tone in key |
| `apexFrac` | `whoosh`/`suck`: the fraction of the sound's length that lands on `f` (default 0.5 / 0.85) |
| `dur` | frames; length of `whoosh`, `riser`, `swell`, `suck` |
| `variant` | `key`: `word` (word start), `space`, `return`, `back`; `click`: `confirm`; `land`: `light`; `bell`: `motif`; `pop`: `down` |
| `id` | a label for QA reports; the starter prefixes the act (`mark:dome`) |

| Kind | Picture event | `f` is | Sound (default tuning) |
|---|---|---|---|
| `tick` | the device keeps time; a clock | the pulse's start | a small wooden mallet on the signature tick (the tonic, octave 6): tuned fundamental, free-bar partials, a felt transient |
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
| `key` | a typed character | the character's frame (fractional) | a soft modal key in the film's `typing` style (§5.5c): 26 fixed keys, ±1.2% pitch per press, word starts +2.5 dB, `space` and `return` lower and longer; thinned by time |
| `click` | a cursor press | the press frame | modal press on the pentatonic tone near 1.2 kHz + its release 70–100 ms later; `confirm` adds a soft tuned tone |
| `bell` | a chime: a success, a logo moment | the strike | FM bell on the chord tone near A♭5; `motif` plays the signature motif from `f` |

## 4. Writing src/sync.ts

`src/sync.ts` default-exports `cues()`, which returns the events. It imports the constants the acts animate with, so every frame is computed. The starter's version is the pattern (excerpt):

```ts
import { DOT_TRAVEL } from './acts/Act1';          // acts export what the sound needs
import { HERO, LOCKUP_MOVE } from './acts/Act2';
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
    { f: CUE.lock, kind: 'snap', weight: 1.2, id: 'lock' },                  // E.contact: arrives with speed
    move(DOT_TRAVEL, 1, -0.5, 'dot-flight'),                                  // flies left
    { f: settleOf(DOT_TRAVEL.from, DOT_TRAVEL.to, DOT_TRAVEL.ease), kind: 'tock', weight: 0.7, id: 'dot-seats' },
    { f: CUE.pieceA, kind: 'land', weight: 1, pan: panX(HERO.x + 150), id: 'dome' }, // spring started by delayTo
    { f: CUE.lockup, kind: 'drop', weight: 1, id: 'lockup' },
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
| Whoosh | apex on the velocity peak, length = the move | `peak(a, b, ease)` |
| Exit roll | one tick, no detent | — |

- **One sound per visible event, one visible event per sound.** A landing that happens off-frame gets no thud; an effect with nothing on screen reads as a mistake.
- **Move the picture, not the sound.** When a hit belongs on the beat, start the spring at `beat − delayTo(cfg, 1)`. Audio that leads the picture by more than ~45 ms reads as "sound first".
- **Two hits a few frames apart flam.** If a settle's 97% frame sits 3–8 f before a downbeat that also sounds, put the lock on the downbeat and let the whoosh carry the move (the starter's `name-locks`).
- **Pan with the picture.** Map screen x to pan (±0.8 at the edges). Whooshes travel with the motion; a centred push or pull has `pan: 0`.
- **Typing:** one `key` per character from the same `CHAR_AT` array the picture types with, at its fractional frame (not `Math.round`: jitter and thinning work in time); mark word starts `word`, spaces `space` and a final `return`. `score.py` thins and shapes the run (§5.5c), so 30 characters a second never fuse into a buzz.
- **Dense batches** (rain, tiles, grids): emit every landing, weight them light, pan each to its column. Pitched light landings climb chord tones, so a cascade sounds ordered.
- **Check the file.** Open `out/cues.json` and read it against the contact sheet: every event has a picture, every picture event has a sound.

## 5. score.json

```json
{
  "key": "G major",
  "bpm": 120,
  "chords": ["Em9", "Cmaj9", "Am11 D7sus4", "Gadd9", "-"],
  "sections": [
    { "bars": [1, 1], "style": "intro" },
    { "bars": [2, 3], "style": "build" },
    { "bars": [4, 4], "style": "resolve" },
    { "bars": [5, 5], "style": "hold" }
  ],
  "signature": { "tick": "G6", "tock": "D6", "motif": [0, 7, 14], "rhythm": [0, 0.5, 1.5] },
  "typing": "soft",
  "motifs": [{ "at": "@lockup", "gain": 1.0 }],
  "drops": [{ "at": "@lockup", "silence": "1/16", "suck": 0.2 }],
  "payoff": "@lockup",
  "mix": { "music": 1.0, "sfx": 1.0, "reverb": 1.0, "sidechain": 0.55, "duck_db": 3 },
  "master": { "lufs": -14, "ceiling": 0.77, "fade": 1.3 }
}
```

### 5.1 Fields

| Field | Default | Meaning |
|---|---|---|
| `key` | `"C major"` | tonic + mode: major, minor, dorian, mixolydian, lydian, phrygian (ionian, aeolian) |
| `bpm` | timeline | optional; must equal the timeline's `BPM` or `score.py` refuses |
| `chords` | required | one entry per bar from bar 1. `"Am11 D7sus4"` splits the bar evenly; `"-"` continues; `"N.C."` is no chord; missing bars hold the last chord |
| `sections` | `[]` | `{bars: [from, to], style, level?, bright?, clock?, hats?, drums?, layers?}`; bars outside every section get no music |
| `signature` | tonic / fifth / `[0,7,14]` | `tick` and `tock` pitches, the `motif` (semitones above the tonic nearest C5, or note names) and its `rhythm` in beats (or an even `step`) |
| `motifs` | `[]` | `{at, gain?, notes?, rhythm?}`: where the signature motif plays (bells) |
| `drops` | `[]` | `{at, silence?, suck? (s), depth?, suckDepth?}`: the music stops dead for `silence`, ducks 90% over `suck`, and lands on `at` |
| `silences` | `[]` | `{from, to, depth?}`: true silence for a designed freeze; mutes everything, effects and reverb included |
| `payoff` | — | the moment that must be loudest; the report checks it |
| `progress` | — | `{match, kind?, start?, tonic?, resolve?, gain?}`: the progress motif (§5.5b): events whose `id` contains `match` climb the scale one step each; `resolve` lands the tonic on the payoff |
| `bed` | — | `{file, at?, gain_db?}`: a supplied music track joins the music bus (§5.6) |
| `typing` | `"soft"` | how `key` events sound: `soft`, `mechanical`, `pitched`, `muted` or `off` (§5.5c) |
| `mix` | as shown | music and effect bus gains, reverb amount, sidechain depth, dB the music dips under hits |
| `master` | as shown | target LUFS (−14; −16 for a calm brand or a sting of 8 s or less, §9), limiter ceiling (linear), the end fade's length (s), which the music and the effects both follow |

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
| `resolve` | fast-attack pad that rings, long bass, one kick (skipped when a `drop`/`hit` event owns the downbeat), a bell chord or the motif | the payoff and lockup |
| `hold` / `tail` | nothing new; what rings decays | the end card's tail |

Section options: `level` (music bus gain for the section), `bright` (multiplies the pad cutoff), `clock: true` (the signature tick/tock on every beat, skipping beats an event owns), `hats: false`, `drums` (`"build"`, `"groove"`, `"drive"`, `"clock"`, `"one"` or `null` to override the style's pattern), and `layers` (`{pad, bass, arp, drone, drums, bells}` gain multipliers; 0 mutes).

### 5.3 Shaping the arc

- One section per story beat, bar-aligned with the acts. Energy follows the treatment's arc: hush → build → drop → proof → breath → payoff → tail.
- **The hook starts at intent.** No fade-in on the first bar: frame 0 already has a sound with a reason (the device's first tick, a hit on the first move, the first chord at full level), because a muted-then-unmuted feed viewer and a sound-on viewer both decide in the first second. A pad swelling in, a drone rising or a riser into the opening reads as a soft start. `score.py` starts the film's first chord with a 20 ms attack and the `intro` drone at level (the intro still builds, by opening its filter), and warns "soft hook" when the first 0.5 s sits more than 12 dB under the film's median momentary loudness. "Hush" in the arc means sparse, not quiet: few layers at intent.
- **Drop on silence.** A `drops` entry stops the music (reverb included) for `silence` before `at` and sucks it down over the 0.2 s before. Effects of on-screen motion keep ringing, so a whoosh into the drop is not chopped. For a designed freeze with nothing moving, add a `silences` entry as well; it mutes everything, and the picture freeze must sit exactly on it (≤ 15 f).
- End a `riser` on the silence's first frame, never inside it. Use one or two per film, and skip it when a whoosh already leads into the same downbeat: two noise swells on one approach blur into hiss (the starter lets the lockup slide's whoosh do the job).
- The payoff has the highest momentary loudness of the film, clearly: 2–3 LU or more over the film's median momentary loudness. A mid-film `drive` that out-shouts the lockup is a common failure; the report flags it, and flags a payoff that only edges the rest.
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

Pick the row before writing `score.json`, and write it in `TREATMENT.md` next to the adjectives. `score.py` treats `drop` and `riser` as options, not requirements. The sound critic checks the score against this row (`assets/critics/sound-sync.md`).

### 5.5b The progress motif

When the story is progress (days of a streak, steps of a setup, items cleared, a build filling up), give each step one tuned note, one scale step higher than the last, and resolve on the tonic at the payoff. The ear hears "closer" before the eye counts, and the resolution lands the idea. It suits every personality row, because it is one soft note per event. The fields it adds to `score.json`:

```json
{
  "key": "D major",
  "progress": { "match": "day", "kind": "pop", "resolve": "@streak" },
  "motifs": []
}
```

- `match` picks the events: every event whose `id` contains it (and whose `kind` is `kind`, if given), in frame order. In `src/sync.ts` give the steps ids such as `day1` … `day7`, on the landing frame of each step.
- The k-th step gets scale degree `start + k` of the key's mode. By default `start` is chosen so the last step is the one under the octave (seven steps: 1 → 7), and `resolve` then places the tonic above it, with its octave below, on the bells. `tonic` sets the note of degree 1 (default: the tonic nearest E5, so the rungs sit around 0.5–1.5 kHz, above the pad).
- Use a voice that takes a pitch: `pop`, `bell`, `tick`, `tock`, `click` or a light `land` (weight under 0.6, or `variant: 'light'`). A heavy landing or a snap ignores it, and the report says so. Short voices (pop, light land) keep a fast climb clean; a bell rings, so space bell rungs at least a beat apart.
- Put the resolve on the payoff cue and drop the signature motif there (`"motifs": []`), or the two compete.
- The report lists every rung with its note (`progress.rungs`) and the resolution; `events.tuned` shows them in key.

### 5.5c Typing

Typing is a texture, not a rhythm section: soft, low-mid, under the music. Pick one style per film:

| `typing` | Sound | Use it for |
|---|---|---|
| `soft` (default) | damped modes: body 420–560 Hz, plate ~2.75×, thud ~180 Hz, a 3.5 ms tick at ~5.7×, 0.4 ms soft onset; ~80% of its A-weighted energy in 300 Hz–2 kHz, centroid ~600 Hz | almost every film |
| `mechanical` | the same keys stiffer: ~1 ms rise and a bottom-out tick 4–5 ms later; still under 20% in 2–5 kHz | a raw, mechanical or developer brand |
| `pitched` | felt mallets random-walking over the chord's pentatonic tones in G4–F5; space and return on the root | a moment where the typing is the music (a thinned section, a prompt-to-answer beat) |
| `muted` | dull, short, ~10 dB down | under VO, in a dense `drive`, across the payoff, typed text that is background |
| `off` | nothing | the picture types but any sound would compete |

What `score.py` does to every run, with no settings: never two keys within 60 ms, and runs faster than 12 keys/s thinned to about 12/s (word starts, spaces and returns kept); +2.5 dB on word starts, −0.3 dB per letter after, −1 dB before a space, σ 1 dB, −3 dB after the first 1.5 s; σ 3.5 ms timing jitter (≤ 8 ms, under a frame); a keyup 70–120 ms after the press when the next key is over 140 ms away; gain × √(10 / rate) and shorter decays when keys come fast; letters panned ±0.12 by keyboard column; a 0.3 s room instead of the hall. In bars with 4+ sounded keys the hats stop and the arp drops 4 dB (`muted` and `off` leave the music alone).

**Levels.** Under a full bed the typing sits 15–20 dB A under the music and at least 6 dB under it in 2–5 and 5–10 kHz: it is never the brightest thing in the mix. As the foreground (music thinned to a dark pad, which has no top end to hide under), 8–12 dB A under, with at most 25% of its own A-weighted energy in 2–5 kHz. The report's `typing` block measures each run (`bed_top_A_pct` is the music's share above 2 kHz) and warns past −8 dB A, when the keys are bright (over 25% in 2–5 kHz), or, over a bed with top end (5% or more above 2 kHz), when they come within 6 dB of it up there.

### 5.6 When the brand brings sound

- **Music supplied:** set `bed` to the file, set `key`, `bpm` and `chords` to match the track (effects are tuned from them), and leave `sections` empty or use `hold` so nothing competes. Sucks, silences, ducking under hits and the master still apply. Retime the picture to the track's bars, not the other way round.
- **Sonic logo supplied:** place it as the `bed` at the lockup cue (`"at": "@lockup"`) and drop the signature motif.
- **Voiceover:** mix it into the bed file, or build the bed around it; keep the music 10–12 dB under speech in the 1–4 kHz band, and keep effects off the syllables that matter.

## 6. Harmony and tuning

- **One chord per bar**, changing on downbeats, at most two per bar. Chords that move carry the film; one chord for 30 s sounds like a loop.
- **Voice leading is automatic.** Pads pick the voicing nearest the previous one, keep the root, third or fifth at the bottom (tensions such as 9 and 11 sit inside), and avoid close intervals below C4, which turn to mud.
- **The V chord is gone by the downbeat it resolves into.** A dominant pad ends at the next bar + 0.08 s, so the tonic lands clean.
- **Every pitched effect is in key.** The defaults: the clock on the tonic and the fifth below it, in octave 6 (0.8–1.6 kHz; octave 7 sits on the ear's 3–4 kHz resonance and reads as a beep); pops on the pentatonic, climbing within a run; snaps, landings, booms and drops on the current chord's root between E1 and E♭2; risers landing on the chord root at their arrival; clicks on a pentatonic tone near 1.2 kHz; light landings on chord tones. The report lists every tuned sound with its note and flags anything outside the key and the chord.
- **Tune the kick to the tonic.** It then agrees with every bass note.
- **The sonic signature.** A tuned tick/tock pair and a three- or four-note motif (1–5–9 by default) belong to the brand the way the accent colour does. Open and close on the same sound (the bookend), and place the motif once, on the lockup.

## 7. The instrument palette

All in `scripts/audio/synth.py` (48 kHz, numpy/scipy, seeded). Oscillators integrate their phase, because `sin(2πf(t)·t)` chirps on a glide.

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
| `key_click`, `thock` | modal key (body, plate, thud, a short tick) excited by a low-passed 0.6 ms transient under a soft onset; `style`, `kind` (`letter`, `space`, `return`, `back`), `keyup`; seeded per key and per press | key |
| `ui_click` | modal press at `ping` with a 0.42× body, the release 70–100 ms later, an optional confirm `tone` | click |
| `tock`, `snap`, `blip`, `swell`, `marker`, `drone`, `keys` | see the docstrings | effects |

`place(dst, x, t, gain, pan)` adds a sound with a constant-power pan and a 6 ms cos² fade at its end, so nothing clicks where a buffer stops; `layer_in(base, x)` does the same for a layer inside a composite sound (a hit's clap inside its boom). `place_at_peak(dst, x, frac, t)` puts the point at `frac` of a sound on `t`. For a one-off sound, import `synth` in a small script and add the result to the WAV with `master.py`, or add an event kind to `score.py`.

## 8. Mix

| Stage | Default | Why |
|---|---|---|
| Sidechain | depth 0.55, τ 0.14 s, from every kick, hit, drop, snap and heavy landing | the music breathes around the hits |
| Hit duck | music −3 dB for 150 ms around hits, drops, snaps and heavy landings | effects sit ≥ +6 dB over the music in their own band |
| Reverb | sends high-passed at 250 Hz; hall 2.8 s for music and big hits, room 0.7 s for landings and moves; keys, ticks and clicks dry plus a 0.3 s room at −22 dB (send high-passed at 350 Hz) | space without low-end smear; tiny sounds get a tiny room |
| Effects low end | 45% of the effects below 90 Hz removed | booms on consecutive hits do not stack into rumble |
| Suck | music ducked 90% over the 0.2 s before a drop | the drop lands on air |
| Silence | music 97% down for the drop's `silence`; everything down for `silences` | true silence makes the next hit feel twice as big |
| Mono low end | below 120 Hz | centred bass that survives phones and mono |
| Bus compressor | 2:1 above −14 dBFS, 5 ms RMS detector, 15 ms attack, 120 ms release | glue without pumping |
| Colour | soft saturation + a gentle air shelf | cohesion |
| End | music and effects (with their reverb) fade over the last `master.fade` (1.3 s), reaching zero 30 ms before the end; last 60 ms faded; last 480 samples zero | the delivered audio ends in digital silence, with no effect still sounding at the cut |
| Head | after the limiter, a 3 ms raised-cosine fade-in from exact zero at sample 0, always (and a fade-out of at least 10 ms onto the last sample) | a sound already at level on sample 0 (films measured about −22 dB) clicks and cuts in mid-action; `av-audit.py` warns when the first 5 ms still peak above −40 dBFS: either a hit designed for frame 0 (fine; say so) or a sound begun before frame 0, such as a whoosh whose apex comes early, a riser or a reverb tail (start it later or shorten it) |

Typing in the foreground owns the top end: the hats stop and the arp drops 4 dB in bars with 4+ sounded keys (§5.5c).

**Scale each sound to its cause.** A sound is as big as the thing the viewer sees make it. A caret blink or a small UI tick gets a whisper, about 12–18 dB under the landing hit; the mark landing or the payoff gets the loudest effect in the film. A loud tick over a held frame reads as a sound with no cause, and viewers hear it as a mistake. Set each event's `weight` in `src/sync.ts` (0–2, §3) from the size of its picture event (a caret or tick about 0.3, the landing 1.5–2), then read `av-audit.py`'s visual warnings: it flags loud effects that land on a still picture.

## 9. Master and verification

`master.py` (imported by `score.py`, also standalone) runs loudness passes: measure integrated loudness (pyloudnorm), gain to the target, then a true-peak lookahead limiter (4× oversampled detection, 4 ms lookahead, 80 ms release, ceiling 0.77 linear = −2.3 dBFS), repeated until within 0.05 LU, then fades the edges (3 ms in from zero at sample 0, at least 10 ms out onto the last sample). The ceiling leaves room for AAC, which adds 0.5–1 dB of peak.

```bash
python3 scripts/audio/master.py mix.wav public/audio/soundtrack.wav --lufs -14          # any mix, e.g. a supplied track (-16 for a calm sting)
python3 scripts/audio/master.py music.wav ducked.wav --sidechain kick.wav --sc-depth 0.55 # duck from a key signal
python3 scripts/audio/master.py --measure public/audio/soundtrack.wav --json -           # I, TP, LRA, loudest moment
```

**Loudness per film.** −14 LUFS integrated is the default: streaming and social players normalise to about that, so a quieter film plays quieter than the feed around it. A calm brand, or a short sting (8 s or less, often played at the head of someone else's video), may sit at −16 LUFS: set `"master": {"lufs": -16}` in `audio/score.json`, or pass `--lufs -16` to `score.py` or `master.py`. Keep −1 dBTP after the encode either way (the ceiling stays 0.77). Whatever the target, the loudest moment is the lockup or the payoff, never the bed: if the momentary peak sits on a pad or a drone, pull the bed down rather than the master up. `av-audit.py` reads `master.lufs` from the score and gates ±1 LU around it.

Targets: the film's LUFS target (−14 by default, −16 as above), LRA 5–8 LU for a launch film (4–6 for short pieces), true peak ≤ −1.5 dBTP on the WAV and ≤ −1 dBTP after the encode, limiter gain reduction under 1.5 dB at the payoff, the tail's last 50 ms under −45 dB. The starter's demo measures −14.0 LUFS, −2.3 dBTP and LRA about 5 LU on the WAV, and −2.2 dBTP after AAC 320k.

You cannot listen, so measure what a listener hears:

- **Sync:** `av-audit.py` matches onsets to events within ±2 f; `check-sync.py` cross-correlates the muxed audio with the WAV.
- **Audibility:** the report's `masked` list (event vs music energy per octave band, A-weighted to pick the band the ear uses); the stems for mute-and-subtract.
- **Harmony:** chroma per half bar, high-passed at 180 Hz so the bass does not leak into neighbouring notes, should show the chord's tones on top.
- **Arc:** the momentary-loudness curve (`master.blocks()`): hush, build, drop, payoff highest, tail to silence.
- **Timbre:** `synth.py --demo` renders the palette in the film's key; a spectrogram of the soundtrack with the cue frames marked shows collisions at a glance.

## 10. Reading the report

`score.py --json out/qa/score.json` writes `lufs`, `true_peak_db`, `lra`, `momentary_max` and its time, `limiter_max_gr_db`, `limiter_hot` (moments over 1.5 dB), `payoff`, `hook` (the first 0.5 s against the median momentary loudness), `tail_50ms_db`, `events.skipped`, `events.masked`, `events.tuned` (every pitched sound with its note), `progress` (when used), `typing` (each run against the music: A-weighted, 2–5 and 5–10 kHz), `chords`, `warnings`, `pass`.

| Warning | Fix |
|---|---|
| `masked: kind at f=… (x dB …)` | raise the event's weight, lower the section's `level`, or remove a layer that sits in that band (often the pad or bells) |
| payoff is not the loudest moment | lower the louder section's `level`, or give the payoff section `level` 1.0 and a `drop` |
| the payoff is only N LU over the median | thin the bars before it, add a `drops` silence before it, give the payoff section `level` 1.0 and the others 0.7–0.85 |
| LRA is flat for a film of 20 s or more | a `breakdown` (or `layers: {drums: 0}`) before the turn, a `drops` silence before the drop, the full kit only from the payoff |
| limiter over 1.5 dB at t | too many loud things on one frame: one boom per downbeat, lower the weights there |
| out of key | a hand-set `pitch` is wrong; delete it and let the chord decide, or fix `chords` |
| falls inside a silence | move the event, or shorten the silence |
| soft hook: the first 0.5 s sits N dB under the median | a sound with a reason on frame 0 (the device's tick, a hit on the first move); no section-less first bar, no riser or swell into the opening |
| starts inside the end fade | move the event before the fade (`master.fade` + 0.03 s from the end), or shorten `master.fade` |
| the ending is not silent | an effect or a supplied bed runs to the last frame: move it earlier or trim the bed |
| progress: … ignores its pitch | give the steps a pitched voice (`pop`, `bell`, `tick`, `click`, a light `land`) |
| a `key` skipped as thinned | expected: no two keys within 60 ms, fast runs at about 12/s; not an error |
| typing sits only N dB A under the music, is bright, or is brighter than it above 2 kHz | lower the key weights, or `"typing": "muted"` for that film |
| chords vs bars mismatch | one entry per bar, including the tail bar (`"-"`) |

## 11. Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Sound lands 3–10 f late | cued on the settle or typed by hand | contact frame, 50% pop, 97% settle, velocity peak, via `lib/sync.ts` |
| Whoosh smears across the move | apex not on the velocity peak | `move()` in `sync.ts`: length = the move, apex = `peak()` |
| Boom sounds wrong under the chord | pitch set by hand, or chords do not match the bars | drop `pitch`; fix `chords` |
| Drop does not land | no silence or suck; a riser runs into the downbeat | a `drops` entry; end the riser on the silence's first frame |
| Low end booms and blurs | a kick, a drop and a heavy landing on one downbeat | one weight per downbeat; `drop` already owns the kick |
| Typing rattles or sounds cheap | bright noise clicks, every key at one level, a random timbre per key | `"typing": "soft"`, `word`/`space` variants, fractional frames; thinning and dynamics are automatic |
| Effects vanish under the music | 13–25 dB under in their band | weights, section `level`, fewer layers where effects live |
| Ending clicks or cuts off | no tail, or an event inside the end fade | `TAIL` ≥ 60 f; move late events before the fade (the report names them) |
| The first second sounds like a fade-in | a slow pad attack, a swelling drone, nothing on frame 0 | a sound with a reason on frame 0; the first bar at intent (§5.3) |
| Peaks over −1 dBTP after encode | limiter ceiling raised, or effects added after the master | keep ceiling 0.77; re-run `score.py` after every change |
| Sound late after mux | Remotion's AAC priming | render `--muted`, mux with ffmpeg (`render.sh` does) |

HyperFrames: it has no master bus, loudness stage or audio-to-picture sync. Export the same `out/cues.json` from the composition's timeline, render the WAV with `score.py`, and mux it with `scripts/hf-finish.sh --audio` (`references/hyperframes-engine.md` §11).

## 12. Sound slop

The habits that make a launch film sound cheap, and what to do instead. Most are defaults here; the critic checks the rest (`assets/critics/sound-sync.md`).

| Slop | Instead |
|---|---|
| A whoosh on every move, a slam on every cut, a riser before every reveal | whoosh the moves the eye tracks (about 30% of the frame or more), at most about one a bar, each different; one or two risers a film, or 100–250 ms of silence before the payoff |
| A boom on every logo, lock and landing; trailer braams on a product film | one weighted hit, on the payoff; lock-ins are tuned snaps, light landings pitched knocks; the logo lands on the motif |
| Pings in 2.5–4.5 kHz: sine ticks in octave 7, band-passed noise keys, clicks with a 100–200 ms ring | modal, low-mid voices (400 Hz–1.6 kHz); nothing rings longer than 4 ms in 2.5–4.5 kHz; presses 25–40 ms; a confirm tone only on a meaningful action |
| The machine gun: one waveform on every hit (hats, claps, clock ticks, keys) | a new seed per hit, ±1 dB and ±1–2% pitch; keys keep a fixed timbre per key |
| Random-pitch typing (±6% per press on a random timbre per key): a marimba, not a keyboard | 26 fixed keys, ±1.2% per press |
| Typing at 30 clicks a second, at one level, brighter than the music | about 12 sounded keys a second, word dynamics, 15–20 dB A under the music and ≥ 6 dB under it above 2 kHz |
| Every effect at one loudness | scaled to its cause: the payoff hit loudest, snaps and heavy landings next, whooshes felt more than heard, ticks and clicks just clear of the music in their band, keys a texture |
| Long reverb on tiny sounds | keys, ticks and clicks dry plus a 0.3 s room; the hall only for hits, bells and the logo |
| Hats through every section | hats in one or two sections, accented, a new seed each hit, gone under typing |
| Glitter, shimmer and "magic" sweeps on reveals | the brand's palette and the motif; a shimmer only if it is the motif, once |
| A bed that never stops | hush, build, silence, payoff: LRA 5–8 LU, true silence before the drop |
| Cartoon glides, big Doppler swings | pitch moves within 1–2 semitones on pops, 2–4 on a whoosh |
| A different material for every sound | one palette (felt, wood, glass, soft synth), one scale for every tuned sound |

Premium, in one line: restraint, one palette, tuned and soft UI sounds, real dynamics, silence before the payoff. Good sound design mostly disappears.
