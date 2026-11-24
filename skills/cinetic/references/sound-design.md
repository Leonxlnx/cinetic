# Sound design: placing sound on picture

Sound is half of what makes motion feel physical. In good launch films it is **placed**, not laid under: every effect
answers a picture event on its exact frame, the music bed is shaped by designed silences, and the loudest moments are
earned by the quiet before them. This file pairs with the kit's `Sfx`, `Cues` and `Music` (`sound.tsx`). Frames at 30 fps.

```tsx
import { Cues, Music, type Cue } from './kit';
// one array beside the timeline, so picture and sound move together
export const cues: Cue[] = [
  { at: T.firstWord, src: 'sfx/pluck-a.wav', leadMs: 12, volume: 0.5 },
  { at: T.send, src: 'sfx/click-soft.wav', leadMs: 4, volume: 0.45 },
  { at: T.reveal, src: 'sfx/low-hit.wav', leadMs: 30, volume: 0.9 },
];
<Music src="music/bed.mp3" startFrom={12.4} volume={0.5} fadeIn={4} fadeOut={40} duck={[T.reveal]} />
<Cues cues={cues} />
```

---

## 1. Principles

1. **The transient lands on the frame.** A sound's attack, not its file start, sits on the visual event. Most files have
   leading silence: 200 ms of it lands 6 frames late at 30 fps. Measure each file's onset once (`leadMs` in
   `public/sfx/sfx.json`) and let `Sfx` start early by that much. Never retime the picture to fix audio.
2. **Silence designs the hit.** The bed drops out before major accents so they land from silence. A wall of music with a
   whoosh on every cut is the template sound.
3. **Fewer, better sounds.** Sound the events that carry meaning (landings, presses, confirmations, reveals); leave routine
   motion silent.
4. **Music is structure.** Its entry, its register changes, its breakdown and its end are section markers. Choose the track
   and its start bar before you cut.
5. **Low end carries the climax.** The biggest moment is a sub swell or a low hit, not the brightest, loudest impact.

---

## 2. Two ways to score a film

**A. Music only, picture cut to the bed.** No separate effects: the track's own kicks, plucks, pops and fills are aligned to
cuts and settles. Words cut on on plucks; a settle lands on a pop every two bars; a drum fill under the logo. Even the click
can be silent (a glow is the feedback). Suits consumer, lifestyle and calm agent films with a characterful lo-fi or
electronic bed. Requires cutting picture to the beat grid (section 6).

**B. Bed + a placed UI layer.** A flat bed (or a voice-over over a bed) plus short, tonal effects on picture events. The
picture follows the voice or the story, not the grid; the effects follow the picture. Suits product demos, developer tools,
platform launches.

Do not mix the two halfway: either the music is the sound design, or the effects are.

---

## 3. Placement rules

| Event | Sound | Where exactly |
|---|---|---|
| object lands / spawns | soft pop (420-1100 Hz, 60-235 ms) | on the landing frame, not the start of the move |
| card or toast arrives | glassy ding for the first of a run; softer pops after | on arrival in its slot |
| press / click | short dry click | on the visible press (the dip frame) |
| completion / ready | a distinct tonal cue (ding, two notes a fourth apart) | on the visible ready state, never on the click |
| state change (tick, Add -> Added, check) | tiny high tick, 5-8 ms, 3-4 kHz | on the frame the state flips |
| typing | soft key ticks, one per 2-3 characters, pitch ±15 % | on the characters; pause when typing pauses |
| counter | a light tick per change | on each change, very low |
| whip / fast exit | sub drop starting ~2 f before the cut + a shutter click on the cut | the cut frame ±1 |
| reveal / act start | low hit (soft kick + pad) | after a breath gap, on the first frame of the new act |
| light opens (iris, flood) | airy shimmer (8-12 kHz) | as the opening accelerates |
| a thing leaves (slot exit, card flies off) | whoosh | on the frame it disappears, or on its peak acceleration |
| mosaic / pixel frames | tiny tonal clicks (13-14 kHz, ~15 ms) | one per mosaic frame |
| a carried cut in a music-only film | the bed's kick | 2-3 f **after** the cut: the eye registers the cut, the ear confirms it |
| logo | kick on the cut, low pop on the settle, sub tail | settle frame |

**What does not get a sound:** routine moves, cursor glides, every cut, every word (except in a music-only film where words
sit on plucks), processing loops (no rhythmic clicking while "waiting"), hover states, drifts and creeps.

**Never:** the same whoosh on every cut (vary sample and pitch, `rate` 0.9-1.1); a success chime on the click; a warning that
reuses the success cue; a riser-drop trailer bed under a product film; sound as the only evidence of an event (it must be
visible too).

---

## 4. Designed silences

### 4.1 The earned opener
The first 1-3 s are near silent (-40 to -55 dBFS: faint ticks under a stepped mark, a soft breath under a first rise). The
music enters **with a full-band hit on the first word** (or the first real object), not on frame 0. A social spot may instead
start on a hit at frame ~4 and run the bed flat to the end: both work; a slow fade-in under a busy opener does not.

### 4.2 Breath gaps before hits
Before each act's hit, the bed drops 10-20 dB (or is muted) for 6-18 f (0.2-0.6 s); the hit lands on the first frame after the
gap. Smaller pre-hit gaps of 2-8 f sit before key accents (a dock, a hard cut, a confirmation ding). A duck of 7-10 dB for
6-12 f before each big reveal is the gentle version. These are drops, not fades: the gap must have a shape (in 1-2 f, out on
the hit).

```tsx
// the bed enters on the first word, drops out for `breathLen` frames before each listed hit and comes back on it
<Music src="music/bed.mp3" startFrom={12.4} volume={0.5} enterAt={T.firstWord} breaths={[T.reveal, T.dock]} breathLen={10} duck={[T.reveal]} />
// levels in dB, cues on the beat grid:
const g = beats(120, 6);           // 120 BPM, first downbeat at frame 6
<Cues cues={[{ at: g.snap(T.dock), ...sfx['mixkit-2299'], volume: db(-6) }]} />
```

### 4.3 The breakdown
In films over ~40 s, a 5-10 s stretch where the beat stops (sparse swells, dry clicks on every UI moment) under the most
intimate or precise beat; the level builds over its last second; then **the drop** lands on the strongest picture moment
(the frame a statement fills the screen, the first frame of the climax). A deliberate wide dynamic range (LRA ~10-16 LU) is a
style choice for editorial, high-energy films; most product films keep the bed flat (LRA 1.3-3 LU).

### 4.4 Register change at the story's turn
When the story turns (from listening to making, from problem to product), the music changes register (a new groove, a new
key, an arrangement switch) **on a downbeat hidden inside a cut** at that turn. One change per film.

### 4.5 The ending
Pick one:
- the lockup lands on a hit; the bed decays (to ~-45 dBFS within ~0.6 s) and sits under the end card, fading to silence before
  the last frame;
- a 0.4-0.7 s drop-out to near silence on the still wordmark, then a final kick (and a short tail);
- the music **stops dead** a few seconds before the end and the end card holds in 2-3.5 s of silence;
- a quiet tail with a sub swell on the first glyph of the wordmark and near-silence for the last 1-2 s.
In every case the last 0.5-1 s is silence or near silence. Never end on a reverb-soaked whoosh.

---

## 5. Levels

| Element | Level |
|---|---|
| integrated loudness, web delivery | -14 to -19 LUFS; quiet, premium mixes sit at -19 to -22 |
| loudness range (flat bed) | 1.3-3 LU |
| true peak | ≤ -1 dBTP |
| voice-over | ~-16 LUFS short-term, close and compressed, ~2.5 words/s |
| bed under voice | 8-12 dB under the voice, ducked another ~3 dB on phrases |
| effect onsets | 8-21 dB over the bed at their attack |
| the one loudest accent (a selection chime, the drop) | up to ~+25-35 dB over a quiet passage, once |
| UI ticks, typing, counters | -20 to -26 dB relative to the bed's peaks |

`Sfx` and `Music` take **linear** gain. Convert with `10^(dB / 20)`: -3 dB = 0.71, -6 dB = 0.5, -9 dB = 0.35, -12 dB = 0.25,
-20 dB = 0.1, -26 dB = 0.05.

```tsx
const db = (d: number) => Math.pow(10, d / 20);
{ at: f, src: 'sfx/tick.wav', leadMs: 2, volume: db(-22), rate: 0.95 + rand(f) * 0.1 }
```

Mix order: voice first (if any), then the bed, then only purposeful effects. If two sounds fight, move or remove one; do not
turn the master down. Check on a phone speaker and on the final encode.

---

## 6. The sync grid

Frames per beat at 30 fps = `1800 / BPM`:

| BPM | f / beat | f / bar (4/4) | notes |
|---|---|---|---|
| 90 | 20 | 80 | a shimmer every 20 f sits on the beat |
| 100 | 18 | 72 | |
| 112 | 16.07 | 64.3 | round per beat from a float grid, never accumulate rounded beats |
| 120 | 15 | 60 | cuts on whole and half beats (every 7.5 f) |
| 128 | 14.06 | 56.25 | |
| 136 | 13.24 | 52.9 | |
| 150 | 12 | 48 | |

```tsx
const beat = (n: number, bpm: number, offsetF: number) => Math.round(offsetF + (n * 1800) / bpm);
// offsetF = frame of the first downbeat after Music startFrom; snap cuts to beat(n) or beat(n + 0.5)
```

- **Music-only films:** cut on the beat or half-beat grid; land settles on the track's pops; put the kick 2-3 f after carried
  cuts. Choose `startFrom` so a downbeat falls on the first word: `node scripts/sfx.mjs fit <track> --hit <frame> --len
  <frames>` lists the starts that land the main hit on a beat. When the bed enters late (`<Music enterAt>`), add
  `--enter <that frame>`: fit then counts the track from the frame it enters and prints the beat grid in the film's
  frames (`beats(bpm, offset)`).
- **Voice-over films:** the picture follows the voice (each caption word cuts on the frame it is spoken; picture leads voice by
  1-4 f), the effects follow the picture; cuts land on the grid only by chance, and that is fine.
- **Beat-locked devices:** shimmers, swaps and stepped builds can run on the beat period even when cuts do not.
- **Loops:** a 4-bar loop repeated is fine for a 15-35 s film if it has fills; edit at bar lines.

---

## 7. Effect vocabulary (what to fetch)

Keep a small, consistent palette per film (6-12 files), short and tonal:
- **ticks** (5-15 ms, 2-4 kHz) for state changes and typing;
- **pops / plucks** (60-240 ms, tuned to the track's key if possible) for landings and word cut-ons;
- **one click** (dry) for presses;
- **one ding or two-note chime** for completion / notification;
- **one low hit** (kick + pad or sub) for reveals and the drop;
- **one sub drop** for whips and size jumps;
- **one airy shimmer** for light opening;
- **one or two whooshes** (vary pitch) for things leaving fast;
- **tiny digital clicks** only in pixel worlds.
Licences: CC0 or royalty-free with commercial use; keep a credits list for CC BY; never redistribute the pack. The kit fetches
files with `scripts/sfx.mjs` (`get` for effects, `shortlist` and `music` for the bed) into `public/` (not committed).

---

## 8. Checklist before render

- Every cue's `at` is a named timeline event, not a magic number.
- Every file's `leadMs` is measured; a spot check of 5 cues on the timeline shows the waveform attack on the event frame.
- The opener is quiet; the music enters on the first word or first object.
- Each act boundary has a breath gap; the reveal and the drop land from silence.
- No two consecutive cuts use the same whoosh; repeated ticks vary `rate` 0.9-1.1.
- The climax is carried by low end.
- The last 0.5-1 s is silence or near silence.
- Integrated loudness and true peak measured on the final encode.

---

## Not in the kit yet (build these by hand from the recipes above)

- **Pre-reveal soft ducks** (7-10 dB for 6-12 f) as their own option; today use `duck` after the hit and `breaths` (a full
  drop) before it.
- **`Music` hard stop:** `stopAt` (a dead stop, no fade); today wrap the `Music` in a `Sequence` with `durationInFrames`.
- **Bed register change:** a `MusicPart` list (several tracks with cut points on downbeats) instead of a single source.
- **Seeded pitch variety:** `Sfx` could take `vary: 0.1` to randomise `rate` deterministically per cue.
- **Cue lint:** a check that every cue is within 1 f of a visual event in the timeline, and that no effect file repeats on two
  consecutive cuts.
- **Filtering:** Remotion cannot low-pass the bed for a filtered "breath"; use muting/ducking as the substitute, or pre-render
  a filtered stem with ffmpeg (`lowpass=f=800`) and switch to it for the breath.
