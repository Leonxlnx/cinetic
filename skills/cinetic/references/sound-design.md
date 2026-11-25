# Sound design: placing sound on picture

Sound is half of what makes motion feel physical, and the cheapest way to make a film sound cheap. Measured on top launch
films, effects are **few, short, dry and quiet**: soft taps, ticks, paper and cloth, a muted tap, a short breath of
air. They answer a picture event on its exact frame and die within a fifth of a second; the music carries everything
else, the ending included. This file pairs with the kit's `Sfx`, `Cues` and `Music` (`sound.tsx`). Frames at 30 fps.

```tsx
import { Cues, Music, db, type Cue } from './kit';
// one array beside the timeline, so picture and sound move together
export const cues: Cue[] = [
  { at: T.send, ...sfx['kenney-interface-click_001'], volume: db(-14) },
  { at: T.land, ...sfx['mixkit-2384'], volume: db(-14) },
  { at: T.reveal, ...sfx['kenney-interface-bong_001'], volume: db(-12) },
];
<Music src="music/bed.mp3" startFrom={12.4} volume={0.5} fadeIn={4} fadeOut={40} breaths={[T.reveal]} />
<Cues cues={cues} />
```

---

## 1. Principles

1. **A modern, clean palette is dry.** Every effect is a short unpitched transient: a click, a tick, a tap, a paper slice,
   a cloth swish, a muted tap. Nothing rings, nothing sings, nothing swells. A sound is what the picture's object would
   make: never a footstep as an interface impact (it reads as someone walking), a footstep only for feet on screen, and
   never an air whoosh (a sweep reads as a trailer move).
2. **The transient lands on the frame.** A sound's attack, not its file start, sits on the visual event (`leadMs` from
   `sfx.mjs get`; peak-aligned whooshes land their loudest point). Never retime the picture to fix audio.
3. **Fewer and quieter.** Sound the events that carry meaning (a press, a landing, the one main hit); leave routine motion,
   most cuts and every repeat of a series silent. An effect sits a few dB over the bed, never on top of it.
4. **The music does the big moments.** A breath of silence before the main hit and the bed coming back on it is the hit;
   an effect under it is a muted tap at most. The biggest moment is never the loudest effect. The story's turn is carried
   by the music's lift or register change (5.4), not by a whoosh: the turn takes no whoosh.
5. **The ending is music only.** No effect under the claim's last word, the mark, the wordmark or the URL.
6. **The bed fits the film's temperature.** A warm, quiet or family film takes a sparse bed: soft percussion or none, no
   kick or hit on every beat. Listen for a constant train of transients (`sfx.mjs analyze` shows a track with no quiet
   stretch as even); pick another track rather than a pulse under every beat.
7. **Never silent by accident.** A film whose code plays cues or music and whose file is silent lost its sound on the way
   (a part rendered `--muted`, parts joined without `--audio`): `frames.mjs check` fails it. A film meant to be silent
   says so with `check --silent`.

---

## 2. The palette, measured

Measured on launch films by top studios: every onset over the music bed, its level over the 400 ms before it, its decay
to -30 dB, its brightness and whether it holds a stable pitched partial. Every sound of the catalogue was measured the
same way on its own.

| Measure | Top launch films | Rule for a film |
|---|---|---|
| pitched ringing effects (bells, chimes, glass, coins, notification tones) | none found; every flagged moment checked by eye on the spectrogram was the music's own note or pad | **none, ever** |
| decay of a dry event (peak to -30 dB) | median 90 ms, 90 % under 175 ms (as heard in the mix) | effects die in 60-180 ms; a whoosh's tail under 400 ms; nothing longer |
| level of an effect over the bed (its attack over the 400 ms before) | dry events median +6 dB, 75 % under +8.5 dB, 90 % under +11.5 dB; salient non-music events median +9.6 dB | UI events +3 to +9 dB; the one main hit at most +12 dB; nothing over +14 dB |
| brightness (spectral centroid) of dry events | median about 1 kHz in the mix, 2-3 kHz on their own | clicks and ticks 1-4 kHz on their own; nothing bright and long (over 3 kHz and over 400 ms) |
| salient non-music events a second | median 1.5, a quarter of the measured set under 0.7 (an upper bound: it counts voice syllables and fills) | about one audible effect a second averaged; a typing run may cluster, then silence |
| the last second | median 6.7 dB under the average level; close to half carry no salient effect in the last 2.5 s, the rest only the music's own kicks | music only; the bed rings out or fades |

How reliable this is: onsets in a full mix are mostly the music's. The measures separate an effect from the bed by level,
by whether the same sound repeats a beat or a bar away, and by a stable pitched partial; on test mixes of known sounds over
our beds this finds about 60 % of the effects with 0.4 false events a second, and calls about 40 % of real chimes "pitched"
while the beds alone produce 0.15 false pitched events a second. The absence of bells is the solid finding (no film shows
more pitched events than its music explains, and every hand-checked one was music); the event rate is an upper bound.

---

## 3. Hard rules

- **Never a bell, chime, glass, coin, ding, sparkle, shimmer, notification tone, success jingle, kalimba or guitar note,
  bubble or bloop.** Not for a confirmation, not for a card, not for a number landing, not reversed into a swell. A
  confirmation is the visible state change, with a dry click at most.
- **Never a trailer sound:** no reverse impacts, risers, sub booms with a long tail, braams, "cinematic" whooshes, tape
  rewinds, horror drums. A product film is not a trailer: these read as harsh and exaggerated.
- **No effect on the ending.** From the lockup on (the claim's last word, the mark, the wordmark, the URL) the music alone.
- **No effect under a screen shake or a flash** (neither belongs in the picture either).
- **No footstep and no air whoosh** in anything an interface event or a join plays (principle 1), and **no whoosh on
  the story's turn** (principle 4). The catalogue's roles hold neither: the footsteps and the air sweeps are in its
  `rejected` list; a fast exit takes a cloth swish (`kenney-rpg-cloth1`, `kenney-rpg-clothbelt`) or nothing.
- **Clicks sit under the big moments:** every interface click, tick and key peaks at least 6 dB under the film's
  loudest moment (the music's lift, the main hit). The loudest event of a film is never a click.
- **A double click never plays under a single press;** one press, one click.
- `scripts/sfx.mjs` only offers sounds that pass these rules; the rest sit in the catalogue's `rejected` list with the
  measure that failed. Never fetch a rejected sound by URL.

---

## 4. Placement

| Event | Sound | Where exactly |
|---|---|---|
| press / click / send | one dry click (`kenney-interface-click_001`, `mixkit-3124`) | on the visible press (the dip frame) |
| state change (a check, a toggle, a counter step) | a tiny tick (`kenney-interface-tick_001`), on one step in two or three | on the frame the state flips |
| typing | soft key sounds (`mixkit-2533`) on every second or third key, `rate` 0.9-1.1, -14 to -18 dB | on the characters; silent when typing pauses |
| a card or sheet lands | a paper slice or a muted tap (`mixkit-2384`, `kenney-interface-bong_001`) | on the landing frame |
| the main hit | the bed's breath and return; under it one muted tap or cloth landing (`kenney-interface-bong_001`, `kenney-rpg-cloth3`) or nothing | the first frame after the gap |
| the story's turn | the music's lift or register change; no effect | on the downbeat inside the cut |
| a fast exit or a whip (not the turn) | a cloth swish (`kenney-rpg-cloth1`, `kenney-rpg-clothbelt`) or nothing; never an air sweep | its peak on the cut frame |
| a carried cut in a music-only film | the bed's own kick | 2-3 f after the cut |
| the ending | nothing | |

**What gets no sound:** routine moves, cursor glides, most cuts, every member of a series after the first few, processing
loops, hover states, drifts and creeps, a colour change, a number that rolls.

**Never:** the same whoosh on two consecutive cuts; two effects stacked on one frame (a whoosh and a hit and a click);
sound as the only evidence of an event (it must be visible too).

---

## 5. Designed silences

### 5.1 The opener
The first 1-3 s are near silent or carried by the bed alone; the bed enters with the first idea. A row of taps under an
opening pile is fine if it is quiet and thins out.

### 5.2 Breath gaps before the hit
Before the main hit the bed drops out for 6-18 f (`breaths`); the hit is the bed coming back. Smaller gaps of 2-8 f may sit
before a dock or a hard cut. These are drops, not fades (in 1-2 f, out on the hit).

```tsx
<Music src="music/bed.mp3" startFrom={12.4} volume={0.5} enterAt={T.firstWord} breaths={[T.reveal]} breathLen={10} />
const g = beats(120, 6);           // 120 BPM, first downbeat at frame 6
<Cues cues={[{ at: g.snap(T.dock), ...sfx['kenney-interface-click_001'], volume: db(-6) }]} />
```

### 5.3 The breakdown
In films over ~40 s, a 5-10 s stretch where the beat stops under the most precise beat, with dry clicks on its UI moments;
the bed's return lands on the strongest picture moment.

### 5.4 Register change at the story's turn
When the story turns, the music changes register on a downbeat hidden inside a cut. One change per film.

### 5.5 The ending
Music only. Pick one: the bed rings out under the end card and fades to silence before the last frame; or it stops dead a
few seconds before the end and the card holds in silence; or a quiet tail. The last 0.5-1 s is silence or near silence.

---

## 6. Levels

| Element | Level |
|---|---|
| integrated loudness, web delivery | -14 to -19 LUFS; quiet, premium mixes sit at -19 to -22 |
| true peak | ≤ -1 dBTP |
| bed under a voice | 8-12 dB under the voice |
| UI effects (clicks, ticks, paper, taps) | +3 to +9 dB over the bed at their attack, and at least 6 dB under the film's loudest moment (start a click at `db(-14)`, a key at `db(-18)`) |
| typing | +0 to +4 dB over the bed; quieter than the clicks |
| the main hit's knock | at most +12 dB over the bed (it lands from the breath, so less is needed) |
| anything | never over +14 dB; nothing that rings past 400 ms |

`Sfx` and `Music` take **linear** gain: `db(-6)` = 0.5, `db(-12)` = 0.25, `db(-20)` = 0.1. Catalogue files differ by up to
20 dB in loudness (`l50_db` in the catalogue): set each cue by ear-free numbers, then render the audio alone
(`node scripts/frames.mjs audio`) and check the cues' peaks against the bed before the final render.

Mix order: voice first (if any), then the bed, then only purposeful effects. If two sounds fight, remove one.

---

## 7. The sync grid

Frames per beat at 30 fps = `1800 / BPM`:

| BPM | f / beat | f / bar (4/4) |
|---|---|---|
| 90 | 20 | 80 |
| 100 | 18 | 72 |
| 112 | 16.07 | 64.3 |
| 120 | 15 | 60 |
| 128 | 14.06 | 56.25 |
| 150 | 12 | 48 |

- **Music-only films:** cut on the beat or half-beat grid; put the kick 2-3 f after carried cuts. `node scripts/sfx.mjs fit
  <track> --hit <frame> --len <frames> [--enter <frame>]` lists the starts that land the main hit on a beat and prints the
  grid in the film's frames (`beats(bpm, offset)`). Each start says whether the hit lands on the first beat of a bar or
  only on a beat: land the main hit on a bar's first beat.
- **Voice-over films:** the picture follows the voice, the effects follow the picture.
- Round per beat from a float grid; never accumulate rounded beats.

---

## 8. What to fetch

A small, consistent palette per film (4-8 files), all short and dry:
- **one click** for presses (`kenney-interface-click_001`, `kenney-interface-click_003`, `mixkit-3124`);
- **one tick** for state changes (`kenney-interface-tick_001`);
- **soft key sounds** for typing (`mixkit-2533`, `mixkit-1125`);
- **paper or cloth** for landings and slides (`mixkit-2384`, `kenney-rpg-cloth3`, `kenney-rpg-bookflip3`);
- **one muted tap** for the main hit, or none (`kenney-interface-bong_001`, `kenney-rpg-cloth3`,
  `kenney-rpg-handlesmallleather`); the two Kenney footsteps are rejected for interface use (they read as steps);
- **one cloth swish** for a fast exit, or none (`kenney-rpg-cloth1`, `kenney-rpg-clothbelt`); the air whooshes are
  rejected for every role.

`node scripts/sfx.mjs list <role>` shows what is left in each role; `get` fetches into `public/sfx` and writes `src/sfx.ts`.
Licences: CC0 or royalty-free with commercial use; never redistribute a pack.

---

## 9. Checklist before render

- Every cue's `at` is a named timeline event.
- No cue uses a pitched, ringing, swelling or trailer sound (the catalogue's `rejected` list); no cue sits on the ending.
- About one audible effect a second at most; series sounded on one member in two or three.
- The main hit lands from a breath; its tap (if any) is at most +12 dB over the bed.
- No footstep and no air whoosh anywhere, no whoosh on the turn; a warm or quiet film's bed has no hit on every beat.
- Every click, tick and key peaks 6 dB or more under the film's loudest moment.
- The track was chosen for this film's world (`sfx.mjs shortlist --mood`), never a worked example's bed.
- `frames.mjs check` on the muxed file shows sound (it fails a silent file whose code plays sound).
- The audio rendered alone: integrated loudness, true peak and the loudest cues' level over the bed measured.
