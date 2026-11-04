# Sound

How a launch film sounds: the arranged record whose sections turn with the story, the pre-hit gap, the drop, the sync
grammar (which events get a sound and on which frame), endings and openings, and a palette of one-shots built in code
(UI pops, sub drops, risers and swells, whooshes, dings and bells, low impacts, melodic answers, ticks, typing, shutter
clicks, pitched sweeps, glitch bursts, shimmer, stabs, tactile sounds, vocal chops), plus the bed characters, voice-over,
the mix and master, stereo, and the code-built bed as a fallback. Each entry gives the job, the numbers (in ms, Hz,
semitones, dBFS and LUFS), presets, what makes it rich or cheap, where it lands on the timeline, its level, and
TypeScript that renders it deterministically on the CPU. Judge every sound by ear (and with a listening tool), not by the
recipe alone; for the music itself, a found, licensed track always beats a synthesised bed.

**Units.** Frames at 30 fps unless noted; an offset "+1 f" means the sound starts one frame after the picture event. Levels:
dBFS peak for one-shots, LUFS for the mix, LU for ranges and dips. "st" = semitones.

---

## Sound in numbers

| measure | aim | house range |
|---|---|---|
| integrated loudness | -15 LUFS | -19 to -14 (-23 to -7 by character) |
| loudness range | 2.4 LU | 1.2-7.4 (an arranged record 3-16) |
| true peak | ship -1 dBTP | never a master that clips above 0 |
| tempo | 120 BPM | 108-148 |
| pulse | soft | a felt groove before a hammered beat |
| sound onsets per second (music + effects) | 6 | 4.5-7.1 |
| onset kinds | taps and pops first, then clicks / ticks and tonal notes, then hits | risers and whooshes rare |
| scene changes with a sound within 1.5 f | 60 % or more | with a strong sound about 20 % |
| cut-to-sound offset | on the cut (about +5 ms) | -65 to +73 ms; 60 % or more within 42 ms |
| cuts on a beat | not a target | picture events sync to cues, not to the bar grid |
| strong hits after a dip of 8 LU or more in the 0.4 s before | about 15 % of strong hits | dip 8-19 LU (aim 10), 3-11 frames under |
| loudest moment | about 64 % of the way through | 14-92 % |
| first 2 s vs the body | 0 LU (open at body level) | -6 to +1.6 |
| silent tail | 0 s | 1.8 s at most |
| last strong onset before the end | 0.6 s | 0-2.5 s |
| voice-over | when the film speaks | female or male |

**Which picture event gets which sound** (first choice first): words and letters landing -> tick, pop, ding, hit, sub;
an element landing or snapping -> tick, pop, ding, hit; a card, pill, chip or toast -> tick, pop, ding, hit, swell; a hard
cut -> hit, tick, pop, sub; something appearing or blooming -> tick, ding, pop, swell; a cursor click -> tick, pop, hit; a logo
or lockup -> pop, ding, tick, hit; a flash, glow, iris or wipe -> tick, pop, ding, swell; a camera push or zoom -> pop, hit, tick,
whoosh; a swap, scramble or morph -> tick, pop, ding; a whip pan -> tick, hit, whoosh.

## What sounds cheap (avoid)

1. **One loop at one level:** no arc, no drop, no gap (a loudness range under 1.5 LU with nothing happening). Use `arranged-record`,
   `pre-hit-gap`, `drop`.
2. **Sounds on starts.** Events that begin are rarely sounded; arrivals, contacts, cuts with a reason and resolutions are.
3. **Everything at 0 offset:** whooshes that begin on the cut, risers that end after the hit, a voice ahead of its words.
4. **Off-key tonal effects:** pops, dings, plucks and bells outside the track's scale.
5. **One sample repeated:** no seeded pitch, level or pan variation inside a run.
6. **Reverb on UI.** Clicks, ticks, pops and thumps are dry; only bells and chimes get a short plate.
7. **A boom or a whoosh on every cut.** About 2 whooshes and 2-6 subs per film is plenty; about 4 in 10 cuts carry no onset at all.
8. **A synthesised bed shipped as music:** the timing is right, the character is wrong (`code-bed`).
9. **Fades as structure.** Start on a hit or a designed swell, end on an accent, a stop or a cut; fades are 0.5-3 s and come after
   the lockup has resolved.
10. **Clipping.** Ship -1 dBTP.

## One-shot quick reference

| sound | recipe | level | lands |
|---|---|---|---|
| UI pop | sine 1.6 x f0 -> f0 in 12 ms, attack 2 ms, tau 25 ms, + 3 ms noise band-passed 2-4 kHz at -12 dB; f0 520-660 Hz in key | -16 dBFS | word +4-5 f at 60 fps |
| UI pop, bigger | sine 520-900 Hz falling 5-12 st over 40 ms, attack 1-3 ms, decay 60-120 ms, + 3 ms noise high-passed 3 kHz at -12 dB | -12 dBFS | press, landing |
| chat pop | sine 550 -> 500 Hz, 70 ms; or 1.8 kHz -> 900 Hz, 40 ms | -8 / -3 dBFS | a message lands |
| bubble pop | sine 420 -> 300 Hz in 60 ms + a 200 ms body, slight saturation | -6 dBFS | merge, close |
| tap | 1.2 kHz sine, 2 ms attack, 40 ms decay, + 3 ms noise band-passed 2 kHz | -6 dB vs the bed | small landing |
| click | 3 ms noise high-passed 3 kHz + a 4 kHz sine of 8 ms | -8 dB vs the bed | press |
| tick | 2.6 kHz square, 1 ms attack, 25 ms decay; or 10 ms noise high-passed 5 kHz | -10 / -20 dB | step, check |
| digital click | sine 13-14.7 kHz (or 2.7-3.5 kHz) 10-30 ms, 1 ms attack, + 5 ms noise high-passed 9 kHz; pan alternating +/-40 % | -16 dBFS | mosaic step |
| key | an 8-10 kHz transient of 10-30 ms + a 1-2 kHz body; one per 2-3 characters, +/-15 % pitch | -22 to -34 dBFS | letter +1 f |
| shutter | two 12 ms noise clicks 18 ms apart, 4.5 kHz then 2.5 kHz; or 10 kHz, 11 ms | -6 dB / -19 dBFS | snap zoom |
| thump | 95-165 Hz, 20-45 ms, a 25-45 st drop, no tail; or 140 Hz, 5 ms attack, 120 ms decay | -14 dBFS | card swap |
| click thump | about 73 Hz, 12 ms attack, 0.35 s, kick-like | loud | button press |
| world hit | sub kick 60 -> 40 Hz + a felt-piano low note, 1.25 s | -5 dBFS | world impact |
| sub drop | sine 80 -> 38 Hz over 250-450 ms, duck the bed 4 dB for 300 ms; or 110 -> 55 Hz over 300 ms, 1.4 s, + a 30 ms click | -3 dBFS | section cut |
| impact | sub 90 -> 45 Hz over 120 ms, 500-650 ms, + a 120 Hz sine of 30 ms + a 2 s plate at -18 dB | -2 dB | reveal |
| whoosh | noise band-passed 400 Hz -> 4 kHz over 240-380 ms, peak at 70 %; or 500 -> 4k -> 1k Hz over 410 ms, peak 3 f after the cut | -12 dBFS (the one big pass about -1) | velocity peak |
| riser | noise band-passed 400 Hz -> 3 kHz over its length, gain rising linearly, ending abruptly on the hit; or 400 Hz -> 6 kHz + a sine glide | -6 dB | ends on the hit |
| swell | band-limited noise 300 Hz-4 kHz, 120-220 ms exponential rise, 40 ms fall | -4 dB | blooms |
| reverse swell | band-pass 4 kHz -> 1 kHz, 230 ms; or a reversed cymbal of 1.2-2 s | -26 dBFS | into an event |
| ding | 980 + 1960 Hz, 2 ms attack, 300 ms decay; or 880 + 1320 (+2640 at -12) Hz, 600 ms | -10 / -8 | confirm |
| bell | sine + a 2.76x partial, 150 ms-1.2 s | -9 dBFS | milestone |
| glock | 1318 Hz + 3.9 kHz, 1 ms attack, 700 ms; or 1572 Hz + a 4.2x partial, 130 ms, bend -21 st; or FM ratio 3.5, index 1.5, 0.9 s | -6 to -14 | logo, title |
| chime | 3.5 + 4.6 + 7 kHz, 1 ms attack, 90 ms into a 0.6 s tail at -16 dB | -2 dB (once) | the best moment |
| ting | sine 7.3-9.1 kHz, 2 ms attack, 200 ms decay | -14 to -17 dBFS | swap glint |
| shimmer | noise band-passed 8-12 kHz, 60 ms; or 7-13 kHz with a 300 ms decay | -16 dBFS | glint, iris |
| pluck | 2-op FM ratio 2, index 2.5 -> 0 over 250 ms; or Karplus-Strong, decay 0.25 s, brightness 0.6 | -22 / -12 | an element lands |
| bloop | 2 detuned saws, resonant low-pass 4 kHz -> 600 Hz in 80 ms, decay 120 ms, -1 st in 40 ms | -12 | off-beat accent |
| pew | sine 1.9 kHz falling 58 st in 210 ms, 60 ms attack | -20 dBFS | shrink away |
| rising bloop | sine 600 Hz -> 4.6 kHz in 180 ms | soft | before an arrival |
| glitch click | 10-40 ms band-passed noise or a sine blip at 1.8-4 kHz, 1 ms attack; a sample-and-hold bloop 800 -> 2400 Hz | -0.3 to -6 over silence | grid step |
| stab | saw + pulse, 6 voices, low-pass 3 kHz, instant attack, 300-1000 ms decay | +18 to +36 dB over the bed | title, tear |
| wood tock | noise band-passed 1.6 kHz + an 870 Hz sine blip, 40 ms; or 900 + 1700 Hz sines, 40 ms | -12 to -14 | place, stack |
| drip | sine 2.8 kHz, +5 st in 20 ms, 60 ms | -36 dBFS | bed texture |
| vocal chop | a saw through formants 700 / 1220 / 2600 Hz, 90-140 ms, ping-pong 1/8 at 20 %; accents pitched down 8-30 st over 250 ms | -20 to -30 | half bar, cue |

## Shared kit

Three files every entry imports: `src/sound/sfx-kit.ts` (deterministic one-shot synthesis at 48 kHz in Float32: oscillators, noise,
filters, envelopes, a seeded random), `render-sound.ts` (renders a cue list to a WAV, places one-shots on frames, sums, normalises)
and `soundtrack.tsx` (wires the WAV into the Remotion composition). Everything runs on the CPU.

```ts
// src/sound/sfx-kit.ts: deterministic one-shot synthesis for Remotion films (48 kHz, Float32, CPU only)
export const SR = 48000;
export type Mono = Float32Array;
export type Stereo = { L: Float32Array; R: Float32Array };
export const db = (x: number) => Math.pow(10, x / 20);
export const st = (n: number) => Math.pow(2, n / 12);                 // semitones -> ratio
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);  // MIDI -> Hz
export const decayToTau = (decayMs: number) => decayMs / 1000 / 4.6;  // "decay X ms" (-40 dB) -> tau s
export const bus = (sec: number): Stereo => ({ L: new Float32Array(Math.ceil(sec * SR)), R: new Float32Array(Math.ceil(sec * SR)) });

// seeded xorshift32 in [-1, 1): same seed, same noise, every render
export function rng(seed: number) {
  let s = (seed | 0) || 0x9e3779b9;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; };
}
// attack (linear) then exponential decay
export const envAD = (t: number, a: number, tau: number) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / tau));
// exponential pitch glide f0 -> f1 over g seconds, then hold
export const glide = (t: number, f0: number, f1: number, g: number) => (g <= 0 || t >= g ? f1 : f0 * Math.pow(f1 / f0, t / g));

// RBJ biquad; call set() again while running to sweep the cutoff (state is kept)
export class Biquad {
  b0 = 1; b1 = 0; b2 = 0; a1 = 0; a2 = 0; x1 = 0; x2 = 0; y1 = 0; y2 = 0;
  set(type: 'lp' | 'hp' | 'bp', f: number, q = 0.707) {
    const w = (2 * Math.PI * Math.min(Math.max(f, 10), SR * 0.45)) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), a0 = 1 + al;
    let b0: number, b1: number, b2: number;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; }                                // band-pass, 0 dB at the centre
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * c) / a0; this.a2 = (1 - al) / a0;
    return this;
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y;
  }
}

// a tone with partials: [ratio, gain dB, tau multiplier]; optional glide; sine / triangle / soft square
export function tone(o: { f0: number; f1?: number; glide?: number; a: number; tau: number; len: number;
  partials?: [number, number, number?][]; wave?: 'sine' | 'tri' | 'square' }): Mono {
  const n = Math.ceil(o.len * SR), y = new Float32Array(n);
  const P: [number, number, number][] = [[1, 0, 1], ...(o.partials ?? []).map((p) => [p[0], p[1], p[2] ?? 1] as [number, number, number])];
  const ph = new Float64Array(P.length);
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = o.f1 !== undefined ? glide(t, o.f0, o.f1, o.glide ?? 0.03) : o.f0;
    let s = 0;
    for (let j = 0; j < P.length; j++) {
      const fr = f * P[j][0]; if (fr > SR * 0.45) continue;
      ph[j] += (2 * Math.PI * fr) / SR;
      const w = j === 0 && o.wave === 'tri' ? (2 / Math.PI) * Math.asin(Math.sin(ph[j]))
              : j === 0 && o.wave === 'square' ? Math.tanh(3 * Math.sin(ph[j])) : Math.sin(ph[j]);
      s += w * db(P[j][1]) * envAD(t, o.a, o.tau * P[j][2]);
    }
    y[i] = s;
  }
  return fadeTail(y, 0.004);
}

// filtered noise: cutoff path f(u) with u = 0..1 over the length; env(t, u); white or pink; 1-4 filter stages
export function noise(o: { len: number; type: 'bp' | 'hp' | 'lp'; f: (u: number) => number; q?: number;
  env: (t: number, u: number) => number; seed: number; pink?: boolean; stages?: number }): Mono {
  const n = Math.ceil(o.len * SR), y = new Float32Array(n), r = rng(o.seed);
  const F = Array.from({ length: o.stages ?? 1 }, () => new Biquad());
  let p0 = 0, p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, u = t / o.len;
    let w = r();
    if (o.pink) { p0 = 0.99765 * p0 + w * 0.099046; p1 = 0.963 * p1 + w * 0.2965164; p2 = 0.57 * p2 + w * 1.0526913; w = (p0 + p1 + p2 + w * 0.1848) * 0.25; }
    if ((i & 31) === 0) for (const b of F) b.set(o.type, o.f(u), o.q ?? 0.9);
    let s = w; for (const b of F) s = b.run(s);
    y[i] = s * o.env(t, u);
  }
  return fadeTail(y, 0.004);
}

// Karplus-Strong pluck: bright 0 (dark) .. 1 (bright); 60 dB down after `decay` s
export function pluck(f: number, len: number, seed: number, bright = 0.6, decay = 0.25): Mono {
  const n = Math.ceil(len * SR), y = new Float32Array(n), D = Math.max(2, Math.round(SR / f)), buf = new Float32Array(D), r = rng(seed);
  for (let i = 0; i < D; i++) buf[i] = r();
  const g = Math.pow(10, -3 / (decay * f)), k = 0.5 + 0.5 * bright;
  let idx = 0, prev = 0;
  for (let i = 0; i < n; i++) { const v = buf[idx]; buf[idx] = (k * v + (1 - k) * prev) * g; prev = v; y[i] = v; idx = (idx + 1) % D; }
  return fadeTail(y, 0.01);
}

// 2-operator FM (bells, glock, bloops): index decays exponentially (indexTau) or linearly to 0 (indexTo0)
export function fm(f: number, o: { ratio: number; index: number; a?: number; tau: number; len: number; indexTau?: number; indexTo0?: number }): Mono {
  const n = Math.ceil(o.len * SR), y = new Float32Array(n);
  let pc = 0, pm = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const I = o.indexTo0 ? o.index * Math.max(0, 1 - t / o.indexTo0) : o.index * Math.exp(-t / (o.indexTau ?? o.tau * 0.5));
    pm += (2 * Math.PI * f * o.ratio) / SR; pc += (2 * Math.PI * f) / SR;
    y[i] = Math.sin(pc + I * Math.sin(pm)) * envAD(t, o.a ?? 0.001, o.tau);
  }
  return fadeTail(y, 0.01);
}

// small plate (Schroeder: 4 damped combs + 2 allpasses per side); returns stereo, dry included
export function plate(x: Mono, rt60: number, wet = 0.2, damp = 0.3): Stereo {
  const n = x.length + Math.ceil(rt60 * SR), out: Stereo = { L: new Float32Array(n), R: new Float32Array(n) };
  for (const [ch, spread] of [['L', 0], ['R', 23]] as const) {
    const acc = new Float32Array(n);
    for (const d of [0.0297, 0.0371, 0.0411, 0.0437]) {
      const D = Math.round(d * SR) + spread, g = Math.pow(10, (-3 * (D / SR)) / rt60), buf = new Float32Array(D);
      let idx = 0, lp = 0;
      for (let i = 0; i < n; i++) { const v = buf[idx]; lp = v * (1 - damp) + lp * damp; buf[idx] = (i < x.length ? x[i] : 0) + lp * g; idx = (idx + 1) % D; acc[i] += v * 0.25; }
    }
    for (const [d, g] of [[0.005, 0.7], [0.0017, 0.7]]) {
      const D = Math.round(d * SR), buf = new Float32Array(D); let idx = 0;
      for (let i = 0; i < n; i++) { const b = buf[idx], v = acc[i], yv = -g * v + b; buf[idx] = v + g * yv; idx = (idx + 1) % D; acc[i] = yv; }
    }
    for (let i = 0; i < n; i++) out[ch][i] = (i < x.length ? x[i] : 0) * (1 - wet) + acc[i] * wet;
  }
  return out;
}

// utilities
export function fadeTail(y: Mono, sec: number) { const n = Math.min(y.length, Math.round(sec * SR)); for (let i = 0; i < n; i++) y[y.length - 1 - i] *= i / n; return y; }
export function peak(y: Mono) { let m = 0; for (let i = 0; i < y.length; i++) m = Math.max(m, Math.abs(y[i])); return m; }
export function norm(y: Mono, peakDb: number) { const m = peak(y), g = m > 0 ? db(peakDb) / m : 0; for (let i = 0; i < y.length; i++) y[i] *= g; return y; }
export function mix(...xs: Mono[]) { const n = Math.max(...xs.map((x) => x.length)), y = new Float32Array(n); for (const x of xs) for (let i = 0; i < x.length; i++) y[i] += x[i]; return y; }
export function shift(x: Mono, sec: number) { const o = Math.round(sec * SR), y = new Float32Array(x.length + o); y.set(x, o); return y; }
export function sat(x: Mono, drive = 2) { const k = Math.tanh(drive); for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive) / k; return x; }
export const rev = (x: Mono) => x.slice().reverse();

// place a mono one-shot on the bus (equal-power pan, unity at centre); `at` in seconds
export function place(b: Stereo, x: Mono, at: number, gainDb = 0, pan = 0) {
  const g = db(gainDb), th = ((pan + 1) * Math.PI) / 4, gl = Math.cos(th) * g * Math.SQRT2, gr = Math.sin(th) * g * Math.SQRT2, o = Math.round(at * SR);
  for (let i = 0; i < x.length; i++) { const j = o + i; if (j < 0 || j >= b.L.length) continue; b.L[j] += x[i] * gl; b.R[j] += x[i] * gr; }
}
export function placeSt(b: Stereo, x: Stereo, at: number, gainDb = 0) {
  const g = db(gainDb), o = Math.round(at * SR);
  for (let i = 0; i < x.L.length; i++) { const j = o + i; if (j < 0 || j >= b.L.length) continue; b.L[j] += x.L[i] * g; b.R[j] += x.R[i] * g; }
}
// Haas width for plucks and pads: right channel delayed 8-15 ms
export function haas(x: Mono, ms = 8): Stereo { const d = Math.round((ms / 1000) * SR), R = new Float32Array(x.length + d); R.set(x, d); const L = new Float32Array(R.length); L.set(x); return { L, R }; }


```

```ts
// src/sound/cues.ts: the film's cue list, frames from the picture timeline (render-sound.ts reads it)
import type { Mono, Stereo } from './sfx-kit';
export const FPS = 30;
export const TOTAL = 900;                    // the film's length in frames
export type Cue = { f: number; make: () => Mono | Stereo; gainDb?: number; pan?: number; offsetF?: number };
export const cues = (): Cue[] => [
  // { f: 42, make: () => pop(), gainDb: -6 },   one row per sound, on the frame its picture event lands
];
```

```ts
// scripts/render-sound.ts  (npx tsx scripts/render-sound.ts): cues -> public/sfx.wav, deterministic
import { writeFileSync } from 'node:fs';
import { SR, bus, place, placeSt, db, rng, Stereo, Mono } from '../src/sound/sfx-kit';
import { cues, FPS, TOTAL } from '../src/sound/cues';       // cues(): { f, make: () => Mono | Stereo, gainDb?, pan?, offsetF? }[]

const b = bus(TOTAL / FPS + 3);
for (const c of cues()) {
  const at = (c.f + (c.offsetF ?? 0)) / FPS;                    // the frame the sound STARTS on
  const x = c.make();
  if (x instanceof Float32Array) place(b, x, at, c.gainDb ?? 0, c.pan ?? 0); else placeSt(b, x as Stereo, at, c.gainDb ?? 0);
}
writeWav('public/sfx.wav', b, -1.5, Math.ceil((TOTAL / FPS) * SR));

// 16-bit PCM with seeded TPDF dither; scales DOWN only if the peak passes the ceiling (never boosts)
function writeWav(path: string, s: Stereo, ceilDb: number, len: number) {
  let m = 0; for (let i = 0; i < len; i++) m = Math.max(m, Math.abs(s.L[i]), Math.abs(s.R[i]));
  const g = m > db(ceilDb) ? db(ceilDb) / m : 1, buf = Buffer.alloc(44 + len * 4), r = rng(7);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + len * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(len * 4, 40);
  for (let i = 0; i < len; i++) {
    const l = Math.max(-1, Math.min(1, s.L[i] * g + (r() + r()) / 65536)), rr = Math.max(-1, Math.min(1, s.R[i] * g + (r() + r()) / 65536));
    buf.writeInt16LE(Math.round(l * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(rr * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
}


```

```tsx
// src/sound/Soundtrack.tsx: the found record + the effects stem, all automation as functions of the frame
import React from 'react';
import { Audio, Sequence, staticFile, interpolate, Easing } from 'remotion';   // Remotion 4 (newer: <Audio> from @remotion/media)

const g = (dB: number) => Math.pow(10, dB / 20);
const C = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// a hole of `depthDb` for `pre` frames before `hit`, `ramp` frames in, instant return ON the hit (`pre-hit-gap`)
export const stopDown = (f: number, hit: number, depthDb = -18, pre = 7, ramp = 2) =>
  g(interpolate(f, [hit - pre - ramp, hit - pre, hit - 0.01, hit], [0, depthDb, depthDb, 0], C));
// duck under voice phrases [from, to] (frames): attack 30 ms, release 250 ms, depth 3-4 dB (`voice-over`)
export const duck = (f: number, phrases: [number, number][], fps: number, depthDb = -3.5) => {
  const a = 0.03 * fps, r = 0.25 * fps;
  let d = 0;
  for (const [p0, p1] of phrases) d = Math.min(d, interpolate(f, [p0 - a, p0, p1, p1 + r], [0, depthDb, depthDb, 0], C));
  return g(d);
};
// dB-linear fade (`endings`)
export const fadeDb = (f: number, from: number, to: number, endDb = -60) => g(interpolate(f, [from, to], [0, endDb], C));
// fade-in from silence (`openings`)
export const fadeIn = (f: number, from: number, to: number) => interpolate(f, [from, to], [0, 1], { ...C, easing: Easing.in(Easing.quad) });

export const Soundtrack: React.FC<{ fps: number; music?: string; musicFrom?: number; gain: (f: number) => number }> = ({ music, musicFrom = 0, gain }) => (
  <>
    {music ? (
      <Sequence from={musicFrom}>
        <Audio src={staticFile(music)} volume={(f) => gain(f + musicFrom)} />
      </Sequence>
    ) : null}
    <Audio src={staticFile('sfx.wav')} />
  </>
);
// usage: gain = (f) => stopDown(f, 150, -18, 7) * stopDown(f, 302, -20, 8) * duck(f, VO, 24) * fadeDb(f, 1063, 1075)
```

## Index

| # | slug | entry | family |
|---|---|---|---|
| 1 | `arranged-record` | one edited track whose sections turn with the story | structure |
| 2 | `pre-hit-gap` | the bed falls away for 3-12 frames and comes back on the hit | structure |
| 3 | `drop` | the beat enters on the turn | structure |
| 4 | `sync-grammar` | which events get a sound, and on which frame | placement |
| 5 | `endings` | a final accent, a stop with the picture holding, or a cut at level | structure |
| 6 | `openings` | a hit from silence, or a swell from silence | structure |
| 7 | `ui-pop` | the tonal UI pop | one-shot |
| 8 | `sub-drop` | the sub drop and sub boom | one-shot |
| 9 | `music-accents` | the music carries the accents | structure |
| 10 | `riser-swell` | riser, reverse swell and swell | one-shot |
| 11 | `whoosh` | band-passed noise that follows the move | one-shot |
| 12 | `bells` | ding, bell, glockenspiel and chime | one-shot |
| 13 | `low-impact` | a thump with a pitch drop and a click top | one-shot |
| 14 | `melodic-answers` | plucks, mallets and FM bloops in key | one-shot |
| 15 | `density-runs` | micro-sound cascades, one strong sound per gesture | placement |
| 16 | `bed-characters` | the record genres a launch film is built on | music |
| 17 | `voice-over` | cast, processed, placed; the bed ducks 3-4 dB | mix |
| 18 | `mix-master` | loudness, range, peaks, width, brightness | mix |
| 19 | `ticks-clicks` | 3-15 ms high transients | one-shot |
| 20 | `typing` | one soft key per 1-3 characters | one-shot |
| 21 | `shutter-clicks` | shutter, toggle and mouse clicks | one-shot |
| 22 | `pitched-sweeps` | the falling pew and the rising bloop | one-shot |
| 23 | `glitch-bursts` | loud dry clicks over silence | one-shot |
| 24 | `sound-design-score` | no beat, three textures, real silences | music |
| 25 | `air-shimmer` | 7-13 kHz noise or sine for glints | one-shot |
| 26 | `stab` | a short chord hit | one-shot |
| 27 | `tactile` | wood, rim clicks, drips, plastic, paper | one-shot |
| 28 | `vocal-chop` | the genre's signature texture and pitched-down sweeps | music |
| 29 | `stereo` | effects centred, whooshes travel, width by section | mix |
| 30 | `code-bed` | the code-built bed (fallback only) | music |

---

## Entries

### 1. The arranged record: one edited track whose sections turn with the story · `arranged-record`

Family: structure. See `music.md` (finding and cutting a licensed track).

**Job.** The record is the film's three acts in sound: a sparse or broken problem section, a drop on the reveal, a breakdown under
the demo (room for clicks and voice), a second drop for the montage, an outro under the lockup. The viewer feels the turns before
reading them.

**Numbers.**
- 2 to 9 sections per film; the section changes sit on a cut or a reveal, to the frame.
- Loudness range 3-16 LU for an arranged record (vs 0.4-2.4 LU for a one-loop film).
- Level steps between sections of 5-20 LU (for example -25 -> -10, or -12 -> -28 -> -10 -> -8).
- 2-3 contrasting genres edited at bar lines (a sparse or broken one for the problem, a heavier one for the drop, a third for the
  last call).

**Presets.**
- *Full power from frame 1* (24 fps, 140 BPM, G minor). One edited glitch hop / trap / drum and bass record: a full-band hit on
  frame 1, a breakdown with a long quiet hole under the demo, drops on the title frames.
- *Bells then beat* (60 fps, 150 BPM, A minor). 8 s of airy bells and glassy shimmer with no drums at -25 LUFS, very wide; then the
  beat on the cut to the first big word.
- *Three genres* (30 fps, 120 BPM, F# minor). Tech house for the problem and product, inspirational corporate with pizzicato for the
  case, a funk vocal chop for the end.
- *Two sections* (24 fps). Light tech house at about 122 BPM in C minor, then inspirational corporate pizzicato at about 118 BPM in
  C major, the change inside a cut.

**Rich.** Sections change on the story turn to the frame; each section has its own density and brightness (a sparse, wide breakdown
vs a dense, bright drop); contrasting genres edited at bar lines with 5 ms fades; the loudest section is the payoff.

**Cheap.** One 8-bar loop at one level under everything; arrangement changes that ignore the picture; cross-fades in the middle of a
bar; a library track used from its own start with its own intro length.

**Placement.** Every section start is a structural event in the cue list: the music edit point = the picture frame of the turn
(sample = round(frame / fps x 48000)); drop-outs end on the frame the next picture event lands.

**Level.** -10 to -15 LUFS integrated; sections step 5-20 LU; breakdowns wider (side/mid -5 to +1 dB), drops narrower (-12 dB).

```ts
// src/sound/record.ts: the arrangement is data; the picture timeline imports the same frames
export const FPS = 30;
export type Piece = { from: number; src: string | null; srcAt: number; gainDb?: number };
// An example arc for a 30 s film on a 120 BPM track (a bar = 2 s); frames are the film's, src = a found track file,
// srcAt = seconds into it (a bar line). Every `from` is a picture event of the cue list.
export const RECORD: Piece[] = [
  { from: 0,   src: 'problem.wav', srcAt: 0.0 },              // sparse problem section from the first frame
  { from: 150, src: null,          srcAt: 0 },                // pre-hit gap: 0.5 s of room (`pre-hit-gap`)
  { from: 165, src: 'body.wav',    srcAt: 16.0 },             // the drop on the reveal
  { from: 405, src: 'break.wav',   srcAt: 32.0, gainDb: -3 }, // breakdown under the demo: room for clicks and voice
  { from: 585, src: null,          srcAt: 0 },                // 0.5 s hole before the payoff
  { from: 600, src: 'body.wav',    srcAt: 48.0 },             // second drop for the montage
  { from: 780, src: 'outro.wav',   srcAt: 0.0 },              // outro under the lockup
  { from: 870, src: null,          srcAt: 0 },                // digital silence to the end
];
// one ffmpeg command (CPU): each piece trimmed at bar lines, 5 ms fades, delayed to its film frame, summed
export function editCommand(rec: Piece[], fps: number, total: number, out = 'public/music.wav') {
  const files = [...new Set(rec.filter((p) => p.src).map((p) => p.src as string))];
  const parts: string[] = [], labels: string[] = [];
  rec.forEach((p, i) => {
    if (!p.src) return;
    const end = (rec[i + 1]?.from ?? total) / fps, dur = end - p.from / fps, ms = Math.round((p.from / fps) * 1000);
    parts.push(`[${files.indexOf(p.src)}:a]atrim=start=${p.srcAt.toFixed(4)}:duration=${dur.toFixed(4)},asetpts=PTS-STARTPTS,` +
      `afade=t=in:d=0.005,afade=t=out:st=${(dur - 0.005).toFixed(4)}:d=0.005,volume=${p.gainDb ?? 0}dB,adelay=${ms}|${ms}[p${i}]`);
    labels.push(`[p${i}]`);
  });
  return `ffmpeg -y ${files.map((f) => `-i audio/${f}`).join(' ')} -filter_complex "${parts.join(';')};` +
    `${labels.join('')}amix=inputs=${labels.length}:duration=longest:normalize=0,atrim=duration=${(total / fps).toFixed(4)}[m]" -map "[m]" -ar 48000 -ac 2 ${out}`;
}
// srcAt values must be bar lines of the found track: bar = 4 * 60 / BPM s (120 BPM: 2 s); check with track.py analyze
```

### 2. The pre-hit gap: the bed falls away for 3-12 frames and comes back on the hit · `pre-hit-gap`

Family: structure.

**Job.** The hole says "look now": the next frame becomes the event. It is the cheapest way to make one hit feel ten times bigger, and
it gives the film breath without loudness.

**Numbers.**
- A dip of 8-19 LU (aim about 10) in the 0.4 s before a strong onset; 3-11 frames more than 6 LU under the running level.
- Depth -10 to -20 dB, 7-10 dB, or to silence; 3-8 f inside a section, 6-12 f, or 0.3-1.1 s for a section drop-out; a 2-frame ramp in
  and an instant return on the hit.
- Spacing: one every 4-10 s, or three in 2.5 s as a stutter figure.

**Presets.**
- *Hit gap* (24 fps). The bed drops to about -36 LUFS for 3 frames and all music ducks -18 dB for 8 f; then a full-band hit (950 ms,
  -4 dBFS) on the next frame.
- *Duck before events.* The bed ducks 7-10 dB for 6-12 frames and returns on the picture event (a card cut, a flash, a reveal).
- *Stutter drop-outs.* Three short drop-outs between beat sections (to -32, -46 LUFS), then a one-second hole before a strong hit.
- *Dead stop.* The music stops dead for 0.4 s, then a high bell and a sub swell under the end card.
- *Drop-out, riser, drop-out.* A 0.3 s drop-out, a pop and a 0.4 s riser into a word, a 1.1 s drop-out, then a sub-bass impact.

**Rich.** 3-8 frames before a hit that matters (a dock, a reveal, a logo, a drop); 10-20 dB deep or to silence; a 2-frame ramp in and an
instant return on the picture frame with the hit (never a fade back); used a handful of times; a short, full-band hit.

**Cheap.** Fading the music down and up; a gap not followed by a hit; a gap on every cut; effects still playing inside the gap; gaps
longer than about 0.5 s mid-film without a picture reason.

**Placement.** Gap = [hitF - pre - 2, hitF), return at hitF exactly; the hit one-shot starts on hitF. Section drop-outs (0.3-1.1 s) end on
the next structural frame. For single hits use 3-8 f at -16 to -20 dB; for section drops 0.3-1.1 s to silence.

**Level.** The hit after a gap peaks -3 to -6 dBFS, +20 to +49 dB over the gap level.

```ts
// gaps are data next to the hits they serve; the Soundtrack gain multiplies them (stopDown in Soundtrack.tsx)
import { stopDown } from './Soundtrack';
export const GAPS: { hit: number; depthDb: number; pre: number }[] = [   // 24 fps
  { hit: 150, depthDb: -18, pre: 8 },   // 8 f gap -> full-band hit
  { hit: 302, depthDb: -20, pre: 12 },  // 12 f gap (+3 f held) -> strongest accent
  { hit: 362, depthDb: -16, pre: 2 },   // a 2 f gap straddling a hard cut
  { hit: 507, depthDb: -16, pre: 9 },   // 9 f gap -> pop
  { hit: 915, depthDb: -10, pre: 10 },  // 10 f gap -> ding
];
export const gapGain = (f: number) => GAPS.reduce((acc, gp) => acc * stopDown(f, gp.hit, gp.depthDb, gp.pre, 2), 1);
// silence-type drop-outs: depth -90 dB, and also mute the effects stem in that window
export const dropOut = (f: number, from: number, to: number) => (f >= from && f < to ? 0 : 1);
// cue for the hit itself (`low-impact` / `sub-drop` one-shots): { f: 150, make: () => dockHit(), gainDb: 0 }
```

### 3. The drop: the beat enters on the turn after a sparse opening · `drop`

Family: structure.

**Job.** Problem in sparse sound, answer with a beat. The drop is the moment the product appears; the film starts moving. Holding the
beat back for 2-7 s makes the arrival a reward.

**Numbers.**
- Position: 7-50 % of the runtime (up to 80 % for a late payoff).
- Before it: a gap of 0.3-0.85 s, a riser of 0.4-2 s, or a 1 s build.
- The drop hit: +20 to +43 dB over the preceding bed; a kick at 50-60 Hz with a pitch drop from 140-196 Hz in 30-40 ms, or an 808 on
  the key root.
- Intro -20 to -36 LUFS momentary; body -12 to -15 LUFS.

**Presets.**
- *Voice first.* 7 s of voice with UI plops, ticks and chimes and no beat, a 0.85 s gap, then glitch hop / tech house at about 108 BPM.
- *Glitch intro.* A sparse intro of ticks and bloops at -36 to -24 LUFS with a rising sweep (filtered noise plus a sine rise), then the
  first kick on the reveal.
- *Ping and silence.* A ping, near silence, nine high ticks on card pops, a thin sustained tone, then the beat 2 frames before the cut.
- *Quiet intro.* An intro at -21 LUFS with a handful of onsets, then the drop at 1.5 s.
- *Build after the breakdown.* The short-term level climbs -26 -> -14 LUFS over 1 s, a low boom, a pop, the drop.

**Rich.** A designed intro (ticks, bloops, pings that answer the picture), not an empty one; the drop on the reveal frame with a gap or
a riser before it; the beat after the drop is the body of the film.

**Cheap.** A beat from frame 0 to the end with nothing held back; a drop on an arbitrary frame; a riser that ends somewhere near the cut.

**Placement.** The drop kick on the reveal frame (0 f); or the beat starting 2 f before the cut so the downbeat and the cut fuse; a
riser ends on the drop (`riser-swell`).

**Level.** Intro -20 to -36 LUFS momentary (-16 with a voice), body -12 to -15 LUFS; a step of 5-20 LU.

```ts
import { tone, noise, mix, norm, sat, st } from './sfx-kit';
// the drop kick: sine body with a fast pitch drop + 2-3 ms click; soft-clipped
export function dropKick(o = { root: 98, from: 196, dropMs: 30, decayS: 0.8, peakDb: -3 }) {
  const body = tone({ f0: o.from, f1: o.root, glide: o.dropMs / 1000, a: 0.001, tau: o.decayS / 4.6, len: o.decayS + 0.05, partials: [[2, -18]] });
  const click = noise({ len: 0.004, type: 'hp', f: () => 2500, env: (t) => Math.exp(-t / 0.0008), seed: 11 });
  return norm(sat(mix(norm(body, 0), norm(click, -10)), 1.6), o.peakDb);
}
// Beat kick: sine 150 -> 55 Hz over 60 ms + 3 ms click, decay 110 ms
export const beatKick = () => dropKick({ root: 55, from: 150, dropMs: 60, decayS: 0.11, peakDb: -6 });
// arrangement: intro pieces (designed ticks / bloops) -> riser (`riser-swell`) ending on DROP -> beat from DROP
export const DROP = 110;                 // (25 fps)
export const cuesDrop = (fps: number) => [
  { f: DROP, make: () => dropKick(), gainDb: 0 },
  { f: DROP - Math.round(1.52 * fps), make: () => riserTo(1.52), gainDb: -6 },   // the sweep ends on the drop
];
declare function riserTo(len: number): Float32Array;   // = riser() of `riser-swell`
```

### 4. The sync grammar: which picture events get a sound, and on which frame · `sync-grammar`

Family: placement. See also `content-pacing.md` `sound-synced`.

**Job.** Sync makes sound read as the picture's own voice. The rules are physical: a contact sounds at contact, a cut sounds on the cut,
a word sounds just after it becomes readable, a moving mass (a whoosh) is loudest at its fastest.

**Numbers.**
- Strong sounds against cuts: on the cut or one frame after it (-2 to +2 f at most).
- Strong sounds against element landings: the contact frame, a 1 f lead allowed.
- Cut sync overall: land cut sounds within about +-30 ms of the cut, centred on it; aim for 60 % or more within 42 ms.
- 60 % or more of the cuts with an onset within 1.5 f; arrivals are sounded, departures and starts are not.
- Or the other grammar, one per film: leave most cuts silent and sound the elements instead.

**Presets (designed offsets).**
- Word pops start 4-5 f after the word cuts on (60 fps); typing ticks 1 f after the letter.
- The strongest whoosh peaks 3 f after the cut (it starts 4 f before it).
- A riser or breath swell peaks about 110 ms after the cut it carries.
- The picture leads the voice by 1-4 f.
- A beat or pop starts 2 f before a cut so they fuse; a level swell peaks 90 ms before a cut that gets no hit.
- A riser ends abruptly on the picture hit; a whoosh peaks at 70 % of its length.
- Hand-placed cues land at 0 f about half the time, +1 f a quarter of the time, +2 to +4 f or -1 f for the rest.

**Rich.** Every sounded event with a designed offset for its kind; arrivals and contacts sounded, departures mostly not; the strongest
sounds on the 3-6 structural frames; the voice slightly after the picture.

**Cheap.** Sounds on the first frame of every animation; everything at 0 offset, whooshes included (a whoosh that starts on the cut
sounds late); sounds leading the picture by more than 2 f; a hit on every cut.

**Placement (sound start vs the picture frame).** Cut 0 to +1 f; contact, landing, dock 0 f (-1 allowed); word cut-on +50 to +83 ms
(+1 to +2 f at 30 fps, +4 to +5 at 60); a typed letter +1 f; a click on the press frame; a whoosh's peak at the velocity peak or 3 f after
the cut, start = peak - 0.7 x length; a riser ends on the hit; a reverse swell peaks 0 to +110 ms after the cut; the voice +1 to +4 f after
its on-screen word.

```ts
// one place for the grammar: cues are written against PICTURE frames, the offset is applied here (fps-aware)
export type Kind = 'cut' | 'land' | 'word' | 'key' | 'click' | 'whoosh' | 'riser' | 'swell' | 'voice' | 'hit' | 'pop' | 'ding' | 'sub';
const MS: Record<Kind, number> = { cut: 0, land: 0, word: 67, key: 0, click: 0, whoosh: 0, riser: 0, swell: 0, voice: 70, hit: 0, pop: 0, ding: 0, sub: 0 };
export function soundStart(kind: Kind, pictureF: number, fps: number, lenS = 0): number {
  switch (kind) {
    case 'key': return pictureF + 1;                                     // 1 f after the letter
    case 'word': return pictureF + Math.round((MS.word / 1000) * fps);   // 4-5 f@60, 1-2 f@30
    case 'whoosh': return pictureF + 3 - Math.round(0.7 * lenS * fps);   // peak 3 f after the cut, peak at 70 %
    case 'riser': return pictureF - Math.round(lenS * fps);              // ends ON the hit
    case 'swell': return pictureF + Math.round(0.11 * fps) - Math.round(lenS * fps);  // peaks 110 ms after the cut
    case 'voice': return pictureF + Math.round((MS.voice / 1000) * fps); // picture leads voice 1-4 f
    default: return pictureF + Math.round((MS[kind] / 1000) * fps);      // cut / land / click / hit: on the frame
  }
}
// which events to sound (from the sync grammar): arrivals yes, starts no, cuts only with a reason
export const SOUND_IT = { elementStart: false, elementLands: true, wordCutOn: true, hardCut: 'when it carries a reveal or a drop', whip: 'tick or short whoosh', logoResolve: true };
```

### 5. Endings: a final accent that rings out, the music stops while the picture holds, or a cut at level · `endings`

Family: structure. See also `transitions.md` `end-handover`.

**Job.** The ending is the brand's signature: the last accent is the lockup. Ringing out says settled and confident; a hard cut says loop
or social; music stopping under a held lockup says calm, done.

**Numbers.** A silent tail of 0 s by default (1.8 s at most); the last strong onset about 0.6 s before the end (0-2.5 s); a ring-out of
0.6-6 s after the last accent; fades of 0.5-3 s, linear in dB; the final hit +27 to +49 dB over the gap before it; the end sting narrower
than the body.

**Presets.**
- *Gap and final hits.* A music gap on the still logo (to -50 LUFS), then a kick and three hits, the last on the final frame.
- *Stop, low swell, decay.* The music stops for 0.4 s; a high bell (about 1175 Hz, 520 ms); a deep sub swell; the decay rings for
  about 6 s while the end card holds.
- *Music stops, picture holds.* No final hit: the bed fades out over about 3 s (linear in dB) starting 1.5 s after the lockup completes,
  then near-silence to the end.
- *Cut at level.* The film ends abruptly at full level; or cut in the middle of a decay with no fade; or a kick on the last frame.

**Rich.** A gap or stop before the last accent; the last accent on the lockup frame; the decay allowed to finish (1-2 s) before the picture
ends, or a deliberate hit on the very last frame; a sting narrower and lower than the body; true digital silence at the end.

**Cheap.** Music cut mid-bar on a random frame; a fade that starts before the logo resolves; a lockup landing in silence with no accent; a
4-8 s fade under a static card.

**Placement.** The final accent on the frame the lockup is readable (the first glyph's frame + 1); a fade starts 1.5 s after the lockup
completes.

**Level.** End stings -6 to -9 dBFS peak; the tail under -45 LUFS before the last frame.

```ts
import { tone, noise, mix, norm, plate, fadeTail, SR } from './sfx-kit';
import { fadeDb, stopDown } from './Soundtrack';
// (a) gap + kick + three hits (30 fps). Music gain: silence for 21 f; one-shots 2, 12, 21 and 27 f after the gap ends
export const endA = { gain: (f: number) => (f >= 1299 ? 0 : 1),
  hits: [1322, 1332, 1341, 1347].map((f, i) => ({ f, make: () => endHit(i === 0 ? 0 : -4) })) };
function endHit(levelDb: number) {
  const k = tone({ f0: 140, f1: 52, glide: 0.04, a: 0.001, tau: 0.18 / 4.6 * 3, len: 0.4, partials: [[2, -16]] });
  const c = noise({ len: 0.006, type: 'hp', f: () => 3000, env: (t) => Math.exp(-t / 0.001), seed: 3 });
  return norm(mix(norm(k, 0), norm(c, -12)), -4 + levelDb);
}
// (b) stop 0.4 s, bell D6, sub swell 80 -> 40 Hz 1.5 s under the first glyph, long decay
export const endB = (fps: number) => ({ gain: (f: number) => (f >= 2790 && f < 2814 ? 0.02 : f >= 2814 ? 0 : 1),
  hits: [{ f: 2825, make: () => bellD6() }, { f: 2839, make: () => subSwell() }] });
function bellD6() { return norm(tone({ f0: 1175, a: 0.002, tau: 0.523 / 4.6 * 2, len: 1.2, partials: [[2.76, -10], [5.4, -20, 0.5]] }), -9); }
function subSwell() {   // 1.0 s rise-and-ring: slow attack 120 ms, pitch 80 -> 40 Hz over 1.5 s
  const y = tone({ f0: 80, f1: 40, glide: 1.5, a: 0.12, tau: 0.45, len: 2.6, partials: [[2, -14]] });
  return norm(fadeTail(y, 0.4), -3);
}
// (c) dB-linear fade over 189 f (about 3 s) to -60 dB, then nothing to the end (no final hit)
export const endC = { gain: (f: number) => fadeDb(f, 1930, 2119, -60) };
```

### 6. Openings: a hit from silence on frames 1-7, or a 0.3-2 s swell from silence · `openings`

Family: structure.

**Job.** The first sound is the promise of the record. A hit says confident, no warm-up (social, launch); a swell says a world is opening
(3D, brand). Either way the first sound and the first picture event are one event.

**Numbers.** The first sound on frames 0-7; body level by 0.5 s by default, or a quiet open (5-12 LU under for 1-3 s); swells of 0.4 s, 0.5 s, 0.8 s or 2 s; sparse intros of 1.5-8 s.

**Presets.**
- *Hit from silence.* A hard full-band hit on frame 1 (a kick plus a bright click), +48 dB over silence.
- *Sub from silence.* A sub-bass drop on frames 2-5 (a 110 -> 55 Hz fall with a click), strong.
- *Swell from silence.* A reverse-swell pad (filtered noise and a pad, low-pass 400 -> 4000 Hz over 0.5 s) fading in from silence to
  -18 dBFS by frame 12, on the first light.
- *Sparse intro.* Glitch ticks and bloops at -36 to -24 LUFS with a riser; or 8 s of airy bells at -25 LUFS; or 7 s of voice and UI sounds
  with no beat.

**Rich.** The opening sound tied to the first picture event; full level within 0.5 s unless the film is built on a sparse intro; true
silence before it.

**Cheap.** A slow fade-in from nothing under a static title; music starting late under moving picture; a generic whoosh on frame 0 that
answers nothing.

**Placement.** Hit openings on frames 0-7 on the first landing; swells start on frame 1 and reach the body level on the first picture
accent.

**Level.** Hit openings peak -2.4 to -6 dBFS; swell openings peak -18 to -27 dBFS.

```ts
import { tone, noise, mix, norm, rev, fadeTail } from './sfx-kit';
// Sub drop at full level on f2: 55 Hz from 110 Hz over 300 ms, 1.4 s decay, + soft 30 ms click
export const openHit = () => norm(mix(
  norm(tone({ f0: 110, f1: 55, glide: 0.3, a: 0.002, tau: 1.4 / 4.6, len: 1.5, partials: [[2, -14]] }), 0),
  norm(noise({ len: 0.03, type: 'bp', f: () => 2500, q: 0.8, env: (t) => Math.exp(-t / 0.006), seed: 5 }), -14)), -2.4);
// Reverse-swell pad from silence: filtered noise + pad C, LPF 400 -> 4000 Hz over 0.5 s, -inf -> -18 dBFS by frame 12 (24 fps)
export function openSwell(len = 2.0) {
  const air = noise({ len, type: 'lp', f: (u) => 400 * Math.pow(10, Math.min(1, (u * len) / 0.5)), q: 0.7, pink: true,
    env: (t) => Math.min(1, t / 0.5) ** 2 * Math.exp(-Math.max(0, t - 0.5) / 0.6), seed: 9 });
  const pad = mix(...[130.81, 196.0, 261.63].map((f) => tone({ f0: f, a: 0.5, tau: 0.6, len, wave: 'tri' })));
  return norm(fadeTail(mix(norm(air, 0), norm(pad, -6)), 0.3), -18);
}
// Breath chop + swish from silence: formant noise burst, 30 ms attack, 260 ms decay (formants 700 / 1220 Hz)
export const breathOpen = () => norm(mix(
  noise({ len: 0.29, type: 'bp', f: () => 700, q: 4, env: (t) => (t < 0.03 ? t / 0.03 : Math.exp(-(t - 0.03) / 0.057)), seed: 21 }),
  noise({ len: 0.29, type: 'bp', f: () => 1220, q: 4, env: (t) => (t < 0.03 ? t / 0.03 : Math.exp(-(t - 0.03) / 0.057)), seed: 22 })), -21);
```

### 7. The tonal UI pop: a short pitched sine glide with a noise click, in key · `ui-pop`

Family: one-shot.

**Job.** The pop says "this appeared, this is a thing". A run of pops on words becomes the reading rhythm of the film; one big pop marks
the arrival that matters.

**Numbers.**
- f0 300-1800 Hz (house 500-900); a start ratio of 1.1-2.0 (house 1.6, 3-12 st above); a glide of 12-60 ms; attack 1-3 ms; decay
  20-235 ms (tau 9-25 ms); a click of 2-10 ms band- or high-passed at 2-5 kHz, 10-20 dB under the body.
- House pops: a peak partial around 210 / 510 / 1370 Hz (low / middle / high), 10-130 ms long, 1-12 ms attack, peaking about -25 /
  -16 / -10 dBFS; most of the energy in the low-mid and mid bands.
- Chat-message pops around 200-1800 Hz and 10-200 ms; bubble pops around 150-720 Hz and 70-200 ms.
- Level over the bed 6-12 dB, 10-20 dB inside the bed, 15-35 dB in bare passages.

**Presets.**
- *Bubble pop in key.* A sine gliding from 1.6 x f0 down to f0 in 12 ms, 2 ms attack, exponential decay tau 25 ms, plus a 3 ms
  band-passed noise click; f0 520-660 Hz on the scale; -16 dBFS.
- *Press pop.* A sine 520-900 Hz with a fast pitch drop (-5 to -12 st over 40 ms), 1-3 ms attack, 60-120 ms decay, plus 3 ms of noise
  high-passed at 3 kHz at -12 dB; -12 dBFS.
- *Bright pop.* A 900 Hz sine with a 1.4x -> 1x drop over 30 ms, 80-120 ms decay, plus a 10 ms noise click.
- *Under the voice.* One short pop (900 -> 600 Hz in 40 ms plus a 2 kHz click) per pill, -18 dB under the voice.
- *Chat pops.* A message pop of 60-80 ms (550 -> 500 Hz, -8 dBFS); a bubble pop of 235 ms (centroid 450 Hz, -6 dBFS).

**Rich.** Pitched on the track's scale with a small variation per pop inside the scale; 20-120 ms; dry, mono, centred; the click 12 dB under
the body; 10-20 dB over the bed and under the voice; the strong version only on the key arrivals.

**Cheap.** The same pitch every time; a long cartoon "boing" (an upward sweep over 150 ms, vibrato); reverb on pops; a pop on every element
start; pops louder than the voice.

**Placement.** A word cut-on +4 to +5 f at 60 fps (+1 to +2 f at 30); a card or pill on its landing frame (or the 50 % frame of a scale-in);
typed letters +1 f with f0 550-1600 Hz.

**Level.** -16 dBFS, -12 dBFS, strong ones -3 to -7 dBFS; mono centre.

```ts
import { tone, noise, mix, norm, rng, st, decayToTau, mtof, sat } from './sfx-kit';
type PopOpt = { from?: number; glideMs?: number; tauMs?: number; clickHz?: number; clickType?: 'bp' | 'hp'; clickDb?: number; peakDb?: number; seed?: number; len?: number; body?: number };
// inKey bubble pop (defaults): 1.6 x f0 -> f0 in 12 ms, attack 2 ms, tau 25 ms, 3 ms band-passed click 2-4 kHz 12 dB under, peak -16 dBFS
export function pop(f0 = 600, o: PopOpt = {}) {
  const tau = (o.tauMs ?? 25) / 1000;
  const body = norm(tone({ f0: f0 * (o.from ?? 1.6), f1: f0, glide: (o.glideMs ?? 12) / 1000, a: 0.002, tau, len: o.len ?? Math.min(0.3, tau * 5 + 0.02) }), 0);
  const click = norm(noise({ len: 0.006, type: o.clickType ?? 'bp', f: () => o.clickHz ?? 3000, q: 1.0, env: (t) => (t < 0.003 ? 1 : 0), seed: o.seed ?? 1 }), o.clickDb ?? -12);
  return norm(mix(body, click), o.peakDb ?? -16);
}
export const POP = {
  inKey: (f0: number) => pop(f0),                                                                    // f0 520-660 (E5 659, C5 523)
  press: (f0: number, drop = 8) => pop(f0, { from: st(drop), glideMs: 40, tauMs: decayToTau(90) * 1000, clickType: 'hp', clickHz: 3000, peakDb: -12 }),
  bright: () => pop(900, { from: 1.4, glideMs: 30, tauMs: decayToTau(100) * 1000, clickDb: -10 }),
  underVoice: () => pop(600, { from: 1.5, glideMs: 40, tauMs: 12, clickHz: 2000, peakDb: -18 }),
  short: () => pop(600, { from: 1.5, glideMs: 30, tauMs: 6, peakDb: -18 }),
  chatPopLow: () => pop(500, { from: 1.1, glideMs: 70, tauMs: decayToTau(70) * 1000, clickDb: -20, peakDb: -8 }),
  chatPopHigh: () => pop(900, { from: 2, glideMs: 40, tauMs: 8, peakDb: -2.7 }),
  soft: () => pop(500, { from: 1.8, glideMs: 40, tauMs: 9, peakDb: -16 }),
};
// Bubble pop: 420 -> 300 Hz in 60 ms + 200 ms body, slight saturation, -6 dBFS
export const bubble = () => norm(sat(tone({ f0: 420, f1: 300, glide: 0.06, a: 0.002, tau: 0.26 / 4.6, len: 0.26, partials: [[2, -18]] }), 1.4), -6);
// in key, varied per pop: seed -> a note of the scale, never the same note twice in a row
export function inKey(seed: number, scaleMidi = [66, 69, 71, 73, 76, 78], last?: number) {   // F# minor pentatonic F#4..F#5
  const r = rng(seed); let m = scaleMidi[Math.floor(((r() + 1) / 2) * scaleMidi.length) % scaleMidi.length];
  if (m === last) m = scaleMidi[(scaleMidi.indexOf(m) + 1) % scaleMidi.length];
  return mtof(m);
}
```

### 8. The sub drop and sub boom · `sub-drop`

Family: one-shot.

**Job.** Weight: the sub says "this is the important one" without adding brightness or clutter; felt on a good system and implied on a
phone by its harmonic and click.

**Numbers.** A start of 80-196 Hz falling to 32-79 Hz; a glide of 30 ms to 1.5 s; a decay of 80 ms (a punch) to 1.6 s (a boom); -2 to -12 dBFS
peak, +20 to +36 dB over the bed; always mono; the part that reads on small speakers is the click and the 2nd harmonic (centroid around
0.7-2.3 kHz); 2-6 per film, on section cuts and reveals.

**Presets.**
- *Section sub drop.* A sine 80 -> 38 Hz over 250-450 ms at -3 dBFS, the bed ducked 4 dB for 300 ms; on three section cuts in a minute.
- *Opening sub.* A 55 Hz sine falling from 110 Hz over 300 ms, 1.4 s decay, plus a soft 30 ms click (-2.4 dBFS).
- *Sub and impact.* A 50 Hz sine with a 90 -> 45 Hz glide over 120 ms, 500-650 ms decay, mono; the impact version adds a 120 Hz sine hit
  of 30 ms.
- *Terminal cut.* A sine sub drop 80 -> 35 Hz over 300 ms on the cut to a terminal.
- *Low boom.* A sub hit at 69 Hz, 216 ms, -11.5 dBFS, 22 dB over the bed, as a box fills.

**Rich.** A 40-60 Hz fundamental plus a 2nd harmonic (about -14 dB) and a soft click so small speakers hear it; on the 3-6 structural frames
only; the bed ducked 4 dB for 300 ms under it; mono; sometimes after a gap.

**Cheap.** A boom on every cut; a 100-200 Hz thud with no sub; long 3 s cinematic booms with reverb in a UI film; clipping the master with sub.

**Placement.** On the cut frame or the settle frame (0 f), or +1 f on cuts; the swell version starts on the glyph frame and peaks about
120 ms later.

**Level.** -2 to -4 dBFS for drops, -10 to -12 dBFS for punches; duck the bed -4 dB for 300 ms.

```ts
import { tone, noise, mix, norm, plate, peak } from './sfx-kit';
// generic sub drop; section defaults: 80 -> 38 Hz over 350 ms, decay to silence, -3 dBFS, 2nd harmonic -14 dB, soft click
export function subDrop(o: { from?: number; to?: number; glideS?: number; decayS?: number; clickDb?: number; peakDb?: number } = {}) {
  const decay = o.decayS ?? 0.45;
  const body = tone({ f0: o.from ?? 80, f1: o.to ?? 38, glide: o.glideS ?? 0.35, a: 0.003, tau: decay / 4.6, len: decay + 0.05, partials: [[2, -14]] });
  const click = noise({ len: 0.03, type: 'bp', f: () => 2200, q: 0.8, env: (t) => Math.exp(-t / 0.005), seed: 17 });
  return norm(mix(norm(body, 0), norm(click, o.clickDb ?? -16)), o.peakDb ?? -3);
}
export const SUB = {
  section: () => subDrop(),                                                                      // + duck bed -4 dB 300 ms
  openSub: () => subDrop({ from: 110, to: 55, glideS: 0.3, decayS: 1.4, clickDb: -14, peakDb: -2.4 }),
  punchSub: () => subDrop({ from: 79, to: 79, glideS: 0, decayS: 0.08, peakDb: -10 }),
  impact: () => subDrop({ from: 90, to: 45, glideS: 0.12, decayS: 0.6, peakDb: -4 }),
  terminal: () => subDrop({ from: 80, to: 35, glideS: 0.3, decayS: 0.32 }),
  longBoom: () => subDrop({ from: 60, to: 32, glideS: 1.0, decayS: 1.0, clickDb: -8 }),
  lowBoom: () => subDrop({ from: 90, to: 69, glideS: 0.04, decayS: 0.216, peakDb: -11.5 }),
};
// impact impact: sub + 120 Hz sine hit 30 ms + 2 s plate tail at -18 dB (stereo)
export function impact() {
  const dry = mix(norm(SUB.impact(), 0), norm(tone({ f0: 120, a: 0.001, tau: 0.03 / 4.6, len: 0.04 }), -3));
  const wet = plate(norm(dry, 0), 2.0, 1.0, 0.4);
  const out = { L: new Float32Array(wet.L.length), R: new Float32Array(wet.R.length) };
  for (let i = 0; i < out.L.length; i++) { const d = i < dry.length ? dry[i] : 0; out.L[i] = d + wet.L[i] * 0.126; out.R[i] = d + wet.R[i] * 0.126; }   // -18 dB tail
  const k = Math.pow(10, -2 / 20) / Math.max(peak(out.L), peak(out.R));            // impact: -2 dB
  for (let i = 0; i < out.L.length; i++) { out.L[i] *= k; out.R[i] *= k; }
  return out;
}
```

### 9. The music carries the accents · `music-accents`

Family: structure. See `music.md`.

**Job.** When the picture is cut to the music, every accent feels inevitable and the film sounds like one piece; nothing is added on. The
most musical way, and the cheapest to produce well, if the track is right.

**Numbers.** A music-led film may carry no separate effects at all: every accent is in the music or the voice. Even then, do not cut
on every beat: choose accents (40-60 % of the big changes on an accent at most). Repeat the accent pitch (the same tonal hit, for example
F5, on most tonal hits; other accents on E5 / C5 / G5 / E6).

**Presets.**
- *Bed only.* No voice and no separate effects track: every accent is in the music, the picture's downbeats on its strong onsets.
- *Tonal hits.* The strongest onsets are part of the music: the same tonal hit again and again, and the picture lands on them.
- *Voice and music only.* Every accent is the voice or the music.
- *One-shots that sound like the record.* Accents built as separate one-shots in the track's key and timbre (plucks on the chord), so
  they land on frames but sound like part of the record.

**Rich.** The track chosen first and analysed (beats, accents, sections); picture events snapped to the track's strongest onsets within 1-3
f; added one-shots in the track's key and timbre.

**Cheap.** Generic UI sounds on top of a track that already has its own accents (double hits, flams); ignoring the track's accents so the music
and the picture argue.

**Placement.** Snap picture accents to music onsets 6 dB or more over the bed within +/-3 f (prefer the music onset 0 to +1 f after the
picture frame).

**Level.** No ducking needed; master the record alone (anywhere from -19 to -7 LUFS by character).

```ts
// accents = the found track's strong onsets in film frames (from track.py analyze / earshot), sorted
export type Accent = { f: number; db: number };
// move each picture event to the nearest strong accent within maxF frames (prefer accents just after the event)
export function snapToAccents<T extends { f: number }>(events: T[], accents: Accent[], maxF = 3, minDb = 6): T[] {
  const strong = accents.filter((a) => a.db >= minDb);
  return events.map((e) => {
    let best: Accent | undefined, cost = Infinity;
    for (const a of strong) { const d = a.f - e.f, c = d >= 0 ? d : -1.5 * d; if (Math.abs(d) <= maxF && c < cost) { best = a; cost = c; } }
    return best ? { ...e, f: best.f } : e;
  });
}
// the timeline then animates to the snapped frames (picture follows music); no one-shot is added where an accent exists:
export const needsOneShot = (f: number, accents: Accent[]) => !accents.some((a) => a.db >= 6 && Math.abs(a.f - f) <= 1);
```

### 10. Riser, reverse swell and swell: tension that ends exactly on the hit · `riser-swell`

Family: one-shot.

**Job.** Suspense with a known landing: the riser says something is about to arrive; the abrupt end on the hit is the arrival.

**Numbers.** House risers and swells run 360-620 ms, peaking at 60-100 % of their length, centroid 0.6-2.4 kHz, a sweep of -17 to +3 st.
The full range: risers 0.3-2.0 s (0.3-0.9 s in a UI film; 1.2-2.0 s before a drop), band-pass 400 Hz -> 3-8 kHz; swells 90-220 ms rise + 40 ms fall; reverse
swells 230 ms-2 s. Levels -26 dBFS (a reverse swell) to about 0 dBFS (a drop riser); +15 to +20 dB over the bed.

**Presets.**
- *Band-pass riser.* Noise through a band-pass sweeping 400 Hz -> 3 kHz over its length, the gain rising linearly, ending abruptly on the
  picture hit.
- *Riser into the first kick.* White noise through a band-pass sweeping 400 Hz -> 6 kHz plus a sine glide, over about 1.5 s, into the first
  kick.
- *Breath swell.* A riser or breath swell peaking 110 ms after the cut.
- *Reverse swell.* Noise band-passed and sweeping down 4 kHz -> 1 kHz over 230 ms at -26 dBFS; or a reversed cymbal of 1.2-2 s into an
  event.
- *Swell.* Band-limited noise 300 Hz-4 kHz, a 120-220 ms exponential rise and a 40 ms fall, starting 3-10 f before the bloom.

**Rich.** Short (0.3-0.9 s) in UI films; filtered noise plus one pitched element in key; the level rising to the last sample and cut dead on the
hit frame (or a 0-3 f gap before it); used before 1-3 big moments.

**Cheap.** 4-8 s EDM risers; a riser that fades away without a landing; a riser before every transition; the riser and the hit both loud with
no contrast.

**Placement.** A riser ends on the hit frame (start = hit - length). A reverse swell peaks on the cut or up to 110 ms after it. A swell starts
3-10 f before the event it blooms into.

**Level.** A linear rise to -4 to -6 dB under the following hit; full width; panned along the motion.

```ts
import { tone, noise, mix, norm, rev, plate } from './sfx-kit';
// Riser: band-pass 400 Hz -> 3 kHz over the length, gain rising linearly, ends abruptly
export function riser(len: number, o: { f0?: number; f1?: number; sine?: [number, number]; peakDb?: number; seed?: number } = {}) {
  const f0 = o.f0 ?? 400, f1 = o.f1 ?? 3000;
  const n = noise({ len, type: 'bp', f: (u) => f0 * Math.pow(f1 / f0, u), q: 1.2, env: (_t, u) => u, seed: o.seed ?? 31, stages: 2 });
  const parts = [norm(n, 0)];
  if (o.sine) { const s = tone({ f0: o.sine[0], f1: o.sine[1], glide: len, a: len * 0.9, tau: 10, len }); parts.push(norm(s, -9)); }
  const y = mix(...parts); y[y.length - 1] = 0;     // dead stop on the hit
  return norm(y, o.peakDb ?? -6);
}
export const dropRiser = () => riser(1.52, { f0: 400, f1: 6000, sine: [220, 880] });          // 1.52 s at 25 fps
// Swell: band-limited noise 300 Hz-4 kHz, exponential rise (120-220 ms), 40 ms fall, -4 dB
export function swell(riseS = 0.18) {
  const len = riseS + 0.04;
  return norm(noise({ len, type: 'bp', f: () => 1100, q: 0.35, pink: true, seed: 41,
    env: (t) => (t < riseS ? Math.pow(t / riseS, 3) : 1 - (t - riseS) / 0.04) }), -4);
}
// Reverse swell: band-pass sweeping DOWN 4 kHz -> 1 kHz, 230 ms, -26 dBFS
export const reverseSwell = () => norm(noise({ len: 0.23, type: 'bp', f: (u) => 4000 * Math.pow(0.25, u), q: 1.4, seed: 43,
  env: (_t, u) => Math.sin(Math.PI * Math.min(1, u * 1.2)) }), -26);
// reversed cymbal: reverse a decaying high noise burst through a small plate
export function reversedCymbal(len = 1.2) {
  const hit = noise({ len, type: 'hp', f: () => 5000, q: 0.7, seed: 47, env: (t) => Math.exp(-t / (len / 4.6)) });
  const w = plate(hit, 1.0, 0.35);
  return norm(rev(mix(w.L, w.R)), -10);
}
```

### 11. The whoosh: band-passed noise whose sweep follows the move · `whoosh`

Family: one-shot. See also `transitions.md` `whip`.

**Job.** Mass moving through air: a camera whip, a flight, a zoom-through, a card leaving. It glues two shots into one motion.

**Numbers.** 120-660 ms (house 200-450); a band of 300 Hz-7 kHz; rising (400 -> 4000 Hz) for pushes, lifts and arrivals, falling
(2 kHz -> 600 Hz, 4 kHz -> 1 kHz) for exits and landings, rise-then-fall (500 -> 4k -> 1k) for a pass-by; the peak at 50-70 % of the
length; -21 to -6 dBFS (the one big pass about -1 dBFS), +14 to +34 dB over the bed. Keep whooshes rare: a few per film.

**Presets.**
- *The big pass.* A 410 ms noise whoosh band-passed 500 Hz -> 4 kHz -> 1 kHz, starting 4 f before the cut and peaking 3 f after it,
  -0.9 dBFS.
- *Limb drop.* A noise sweep band-passed 300 -> 2000 Hz over 440 ms at -8 dBFS as a planet limb drops in and the sky opens.
- *Rising whooshes.* White noise band-passed 400 Hz -> 4 kHz rising over 240-380 ms, peaking at 70 % of its length.
- *Falling pink whoosh.* Pink noise band-passed 2 kHz -> 600 Hz over 450 ms, bell-shaped gain, panned left to right.
- *Air whoosh up.* A band-passed noise sweep 2 -> 7 kHz over 660 ms as a button flies up.

**Rich.** Band-passed (not full-band) noise whose sweep direction follows the motion; bell-shaped gain peaking at the velocity peak; panned
with the object; 200-450 ms; pink noise for soft moves; one or two big ones per film; the whoosh starts before the cut.

**Cheap.** A stock swoosh on every transition; a whoosh starting on the cut (it sounds late); broadband white hiss; the same whoosh every time;
whooshes on slow moves.

**Placement.** The peak on the velocity peak or 3 f after the cut; start = peak - 0.7 x length; pan from the object's screen x at the start to
its x at the end.

**Level.** -12 to -21 dBFS normally, -1 to -6 dBFS for the one big pass; full width or panned.

```ts
import { noise, norm, Stereo, SR } from './sfx-kit';
// band-pass sweep through a list of [u, Hz] knots (log interpolation), bell gain peaking at `peakAt`
export function whoosh(len: number, knots: [number, number][], o: { peakAt?: number; q?: number; pink?: boolean; peakDb?: number; seed?: number } = {}) {
  const fAt = (u: number) => { let i = 0; while (i < knots.length - 2 && u > knots[i + 1][0]) i++; const [u0, f0] = knots[i], [u1, f1] = knots[i + 1];
    const k = Math.min(1, Math.max(0, (u - u0) / (u1 - u0))); return f0 * Math.pow(f1 / f0, k); };
  const p = o.peakAt ?? 0.7;
  const env = (_t: number, u: number) => (u < p ? Math.pow(u / p, 2) : Math.pow(Math.max(0, 1 - (u - p) / (1 - p)), 1.5));
  return norm(noise({ len, type: 'bp', f: fAt, q: o.q ?? 1.1, env, seed: o.seed ?? 51, pink: o.pink, stages: 2 }), o.peakDb ?? -14);
}
export const WHOOSH = {
  bigPass: () => whoosh(0.41, [[0, 500], [0.45, 4000], [1, 1000]], { peakAt: 0.45, peakDb: -0.9 }),   // peak 3 f after the cut
  rising: (len = 0.3) => whoosh(len, [[0, 400], [1, 4000]], { peakAt: 0.7, peakDb: -12.4 }),
  limbDrop: () => whoosh(0.44, [[0, 300], [1, 2000]], { peakAt: 0.6, peakDb: -8 }),
  fallingPink: () => whoosh(0.45, [[0, 2000], [1, 600]], { peakAt: 0.5, pink: true, peakDb: -10 }),
  air: () => whoosh(0.2, [[0, 600], [1, 3000]], { peakAt: 0.7, peakDb: -14 }),
  shortRise: (fps: number, frames = 7) => whoosh(frames / fps, [[0, 600], [1, 3000]], { peakAt: 0.6, peakDb: -18 }),
};
// pan along the motion: L -> R over the length (fallingPink), equal power
export function panSweep(x: Float32Array, from = -0.8, to = 0.8): Stereo {
  const L = new Float32Array(x.length), R = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) { const p = from + (to - from) * (i / x.length), th = ((p + 1) * Math.PI) / 4; L[i] = x[i] * Math.cos(th) * Math.SQRT2; R[i] = x[i] * Math.sin(th) * Math.SQRT2; }
  return { L, R };
}
```

### 12. Ding, bell, glockenspiel and chime · `bells`

Family: one-shot.

**Job.** Success, confirmation, "it worked": the ring closes, the button turns green, the logo glyph appears. The brightest bell of a film
marks its single most satisfying moment.

**Numbers.** Fundamentals 445 Hz-3.1 kHz (bells 445-1575, glocks 1318-2400, chimes 3.5-9.1 kHz); partials at 2x, 1.5x + 3x, 2.76x (a bell),
2.96x / 3.9x / 4.2x (a glock), or FM ratio 3.5 index 1.5; attack 1-3 ms (37 ms for a soft bell); decay 90 ms-1.6 s, house 300-800 ms;
-2 dB (the brightest accent, used once) to -17 dBFS. House tonal hits: 110-250 ms long, a partial at 300-1500 Hz.

**Presets.**
- *Ding.* Two sines 980 + 1960 Hz, 2 ms attack, 300 ms exponential decay, -10 dBFS.
- *Three-partial ding.* 880 + 1320 Hz (+2640 at -12 dB), 2 ms attack, 600 ms decay, -8 dB.
- *The chime.* 3.5 + 4.6 + 7 kHz, 1 ms attack, 90 ms into a 0.6 s tail at -16 dB, -2 dB, once, on the best moment.
- *Notification ding.* A sine bell 1.1 kHz + a 2.2 kHz partial, 0.8 s decay, as a loading ring closes.
- *Glock ding.* 1572 Hz + a 4.2x partial, 3 ms attack, 130 ms decay, a pitch bend of -21 st over its length, just before a cut.
- *Bell note.* A sine + an inharmonic partial at 2.76x, 150-270 ms, on each bell frame.

**Rich.** Inharmonic partials (2.76x, 4.2x: a real bell or glock, not a beep); on the track's scale; a short bright plate (0.8 s, 20 % wet); 2-6
per film; the brightest one used once.

**Cheap.** The same two-tone notification at 1 kHz on everything; a long hall reverb; off-key bells; a ding on every card.

**Placement.** On the confirm frame (the ring closes, the button changes colour, the glyph appears); a bell may sit 1 f early; a glock just
before a cut.

**Level.** -8 to -10 dBFS, up to -2 dB for the one chime; slight width from the plate.

```ts
import { tone, fm, noise, mix, norm, plate, mtof } from './sfx-kit';
export const DING = {
  ding: () => norm(tone({ f0: 980, a: 0.002, tau: 0.3 / 4.6, len: 0.4, partials: [[2, -3]] }), -10),
  ding3: () => norm(tone({ f0: 880, a: 0.002, tau: 0.6 / 4.6, len: 0.7, partials: [[1.5, -2], [3, -12]] }), -8),
  notify: () => norm(tone({ f0: 1100, a: 0.002, tau: 0.8 / 4.6, len: 0.9, partials: [[2, -6]] }), -6),
};
// Bell: sine + inharmonic partial at 2.76x (decay 150-270 ms, 1.2 s)
export const bell = (f: number, decayS = 1.2, peakDb = -9) => norm(tone({ f0: f, a: 0.002, tau: decayS / 4.6, len: decayS + 0.05, partials: [[2.76, -8, 0.6], [5.4, -18, 0.3]] }), peakDb);
// Glock ding: 1572 Hz + 4.2x partial, 3 ms attack, 130 ms decay, bending -21 st over its length
export const glockBend = () => norm(tone({ f0: 1572, f1: 1572 * Math.pow(2, -21 / 12), glide: 0.13, a: 0.003, tau: 0.13 / 4.6, len: 0.14, partials: [[4.2, -10]] }), -6);
// ding3 glock E6: 1318 Hz + 3.9 kHz partial, 1 ms attack, 700 ms decay, -9 dB; FM glock: ratio 3.5, index 1.5, 0.9 s
export const glock = (f = 1318) => norm(tone({ f0: f, a: 0.001, tau: 0.7 / 4.6, len: 0.75, partials: [[2.96, -9, 0.4]] }), -9);
export const fmGlock = (midi: number) => norm(fm(mtof(midi), { ratio: 3.5, index: 1.5, a: 0.001, tau: 0.9 / 4.6, len: 1.0, indexTau: 0.08 }), -14);
// ding3 chime: 3.5 + 4.6 + 7 kHz, 1 ms attack, 90 ms body into a 0.6 s shimmer tail at -16 dB
export function chime() {
  const body = tone({ f0: 3500, a: 0.001, tau: 0.09 / 4.6, len: 0.12, partials: [[4600 / 3500, -2], [2, -4]] });
  const tail = tone({ f0: 3500, a: 0.02, tau: 0.6 / 4.6, len: 0.7, partials: [[4600 / 3500, -3], [2, -6]] });
  return norm(mix(norm(body, 0), norm(tail, -16)), -2);
}
// bells get the short bright plate; clicks never do
export const withPlate = (x: Float32Array) => plate(x, 0.8, 0.2, 0.2);
```

### 13. The low impact: a thump with a pitch drop and a click top · `low-impact`

Family: one-shot.

**Job.** Weight and contact: a card lands, a button is pressed, a swap clicks into place. Scale it to the object: UI = short and dry, world
= felt with a tail.

**Numbers.** A body of 60-240 Hz (UI thumps 95-178 Hz, world hits 40-73 Hz); a pitch drop of 20 % to 45 st over 30-80 ms; 20-160 ms dry (UI) or
0.35-1.25 s (world scale); a click top of 2-3.7 kHz, 10-76 ms; -4 to -15 dBFS, +22 to +46 dB over the bed. House hits: a partial at 66-225
Hz, 10-130 ms, most of the added energy below 250 Hz.

**Presets.**
- *Card-swap thumps.* Punchy low thumps 95-165 Hz, 20-45 ms, a fast pitch drop (-25 to -45 st), no tail: one per swap on a conveyor of 22
  swaps, the pitch varying.
- *Thud.* A 140 Hz sine, 5 ms attack, 120 ms decay plus soft noise.
- *World hit.* A soft sub kick 60 -> 40 Hz plus a felt-piano low note, a 1.25 s tail, -4.9 dBFS, as a runway reaches full width.
- *Push and swap.* A 150 ms 240 Hz thump plus a 76 ms 2 kHz tick at the peak of a push-in, as the copy swaps.
- *Tom with a sweep.* A 162 Hz drum hit with a 32-semitone downward sweep as the camera dives.

**Rich.** A pitched body with a fast drop plus a short click top so it reads on phones; dry and short for UI; a sequence varying in pitch; world
hits layering a sub and a tonal note in key.

**Cheap.** A cinematic boom with reverb on a small UI card; the same kick sample every time; a muddy 200-300 Hz thud with no click and no sub.

**Placement.** The contact frame (0 f, a 1 f lead allowed); the press frame for clicks (1 f before the picture is fine); every swap frame.

**Level.** UI thumps -14 to -21 dBFS, mono, dry; world hits -4 to -5 dBFS with a 1 s tail.

```ts
import { tone, noise, mix, norm, st, sat } from './sfx-kit';
// Card-swap thump: 95-165 Hz body, -25..-45 st drop, 20-45 ms, no tail, click top
export function thump(f = 130, o: { dropSt?: number; lenMs?: number; clickHz?: number; clickDb?: number; peakDb?: number; seed?: number } = {}) {
  const len = (o.lenMs ?? 35) / 1000, drop = o.dropSt ?? 35;
  const body = tone({ f0: f * st(drop * 0.35), f1: f * st(-drop * 0.65), glide: len, a: 0.0015, tau: len / 3, len: len + 0.02 });
  const click = noise({ len: 0.008, type: 'bp', f: () => o.clickHz ?? 2500, q: 1, env: (t) => Math.exp(-t / 0.0015), seed: o.seed ?? 61 });
  return norm(mix(norm(body, 0), norm(click, o.clickDb ?? -10)), o.peakDb ?? -14);
}
export const THUMP = {
  swapThump: (i: number) => thump(95 + ((i * 37) % 71), { seed: 61 + i }),          // pitch varies over the conveyor
  thud: () => norm(mix(norm(tone({ f0: 140, a: 0.005, tau: 0.12 / 4.6, len: 0.15 }), 0), norm(noise({ len: 0.12, type: 'lp', f: () => 900, env: (t) => Math.exp(-t / 0.03), seed: 62 }), -14)), -5),
  checkHit: () => norm(tone({ f0: 110, f1: 70, glide: 0.03, a: 0.001, tau: 0.13 / 4.6, len: 0.15, partials: [[2, -12]] }), -10),
  clickThump: () => norm(sat(tone({ f0: 120, f1: 73.4, glide: 0.04, a: 0.012, tau: 0.35 / 4.6, len: 0.36, partials: [[2, -10]] }), 1.5), -8),
  tap: (f = 210) => norm(tone({ f0: f, f1: f * 0.8, glide: 0.08, a: 0.002, tau: 0.02, len: 0.1 }), -14),
};
// World hit: soft sub kick 60 -> 40 Hz + felt-piano note C2 (65.4 Hz), long release (1.1-1.25 s)
export const worldHit = () => norm(mix(
  norm(tone({ f0: 60, f1: 40, glide: 0.08, a: 0.004, tau: 0.25, len: 1.25 }), 0),
  norm(tone({ f0: 65.41, a: 0.006, tau: 0.3, len: 1.25, partials: [[2, -6], [3, -14], [4, -20]] }), -6)), -4.9);
```

### 14. Melodic answers: plucks, mallets and FM bloops on the track's scale · `melodic-answers`

Family: one-shot.

**Job.** The interface plays a tune as it assembles: each landing adds the next note; a rising pair means "yes, done". UI motion becomes musical
instead of mechanical.

**Numbers.** Notes from the track's chord or pentatonic scale, G3-A6 (196-1760 Hz); attack 1-5 ms (31 ms for a pad note); decay 120-300 ms
(541 ms for a pad note); -4 to -25 dBFS; spread +/-30-40 % or a Haas delay of 8 ms.

**Presets.**
- *Plucks on landings.* Plucks C5, G4 as a crystal column and an octahedron land; E4 as a cube settles front-on; C5 E5 as two parts join.
- *Mallet notes.* Tonal mallet notes around 1365 Hz, 130-200 ms, as a word lands; a pad note on E5 (541 ms) under the next beat.
- *Key plucks.* Karplus-Strong (or triangle + square), 2 ms attack, 180-300 ms decay, pitched from the key (G4, Bb4, D5 in G minor), slightly
  spread.

**Rich.** Notes from the bed's current chord; rising sequences on builds, falling on exits; soft attacks and short decays; plucks spread, bass
mono; the melodic layer quieter than the bed's own lead.

**Cheap.** Random pitches; chromatic or out-of-key notes; every element on the same note; plucks louder than the voice.

**Placement.** The landing frame of each element (0 f); arpeggio runs locked to a 6-frame or 1/8-note grid.

**Level.** -14 to -25 dBFS; Haas 8 ms or pan +/-30-40 %.

```ts
import { pluck, fm, tone, noise, mix, norm, mtof, haas, Biquad, SR, envAD } from './sfx-kit';
// next note of the current chord for each arriving element (deterministic, rising inside a gesture)
export function chordNote(i: number, chordMidi = [60, 64, 67, 71]) { const o = Math.floor(i / chordMidi.length); return mtof(chordMidi[i % chordMidi.length] + 12 * o); }
export const PLUCK = {
  fmPluck: (midi: number) => norm(fm(mtof(midi), { ratio: 2, index: 2.5, a: 0.002, tau: 0.25 / 4.6 * 2, len: 0.45, indexTo0: 0.25 }), -22),
  ksPluck: (midi: number, seed = 1) => haas(norm(pluck(mtof(midi), 0.4, seed, 0.55, 0.25), -4), 8),
  pizzPluck: (midi: number, seed = 1) => norm(pluck(mtof(midi), 0.35, seed, 0.6, 0.25), -12),
  bloopFx: (midi: number) => norm(fm(mtof(midi), { ratio: 2, index: 3, a: 0.002, tau: 0.18, len: 0.3, indexTo0: 0.12 }), -10),
  mallet: (hz = 1365) => norm(fm(hz, { ratio: 3.5, index: 1.2, a: 0.001, tau: 0.16 / 4.6 * 2, len: 0.22, indexTau: 0.02 }), -14.3),
};
// Bloop: two detuned saws through a resonant LP 4 kHz -> 600 Hz in 80 ms, amp decay 120 ms, pitch -1 st in 40 ms
export function bloop(midi: number) {
  const n = Math.ceil(0.18 * SR), y = new Float32Array(n), lp = new Biquad(); let p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = mtof(midi) * Math.pow(2, -Math.min(t, 0.04) / 0.04 / 12);
    p1 = (p1 + f / SR) % 1; p2 = (p2 + (f * 1.006) / SR) % 1;
    if ((i & 15) === 0) lp.set('lp', 600 + 3400 * Math.exp(-t / 0.027), 4);
    y[i] = lp.run(p1 * 2 - 1 + p2 * 2 - 1) * envAD(t, 0.002, 0.12 / 4.6);
  }
  return norm(y, -12);
}
```

### 15. Density, runs and variation · `density-runs`

Family: placement.

**Job.** A cascade of tiny sounds makes a fast UI gesture legible (you hear how many items arrived) without making it loud; the single strong
sound tells you which one matters.

**Numbers.** 3.4-8.7 onsets per second (music and effects together), aim about 6; designed cues per 10 s about 10-22 in a voice or UI film,
up to about 58 in a sound-design score, none in a music-only film; runs of 4-11 micro-sounds 2-5 f apart at -20 to -31 dBFS; one strong sound per
gesture (at the start or end of the run) at -6 to -16 dBFS; variation: pitch random within the scale, +/-15 % seeded, a pitch range over a
conveyor, pan alternating +/-40 %; never two identical in a row.

**Presets.**
- *Typing code.* 7 faint ticks at -28 to -31 dBFS, 0.3-1.3 kHz, 10-85 ms, under code typing; then 11 small pops at 360-1316 Hz for a list.
- *Placeholder swaps.* Soft UI ticks (5-8 ms clicks, 3-4 kHz) on each placeholder swap, 7 f apart.
- *Cards fly in.* Seven tiny ticks, one per card, 15 ms high clicks (band-pass 3-4 kHz) at -24 dB under the voice, about 1.5 f apart.
- *Every event sounded.* Bright plastic clicks (10-13 kHz, 10-60 ms), one per wipe block.

**Rich.** Micro-sounds quiet and short, one per item, accelerating with the picture; pitch and pan varied by seed; the strong accent once per
gesture; silence while the voice says something important.

**Cheap.** Every element at the same level; one sample repeated identically (a machine gun); sounds stacked inside 60 ms; a dense run under the
voice.

**Placement.** One sound per item frame; runs keep their picture spacing (2-5 f); at least 60 ms between two sounds of one kind; the strong one on
the last or the key item.

**Level.** Runs -20 to -31 dBFS; the strong one 8-14 dB above the run.

```ts
import { rng } from './sfx-kit';
// a run: one micro-sound per item frame, quiet, varied by seed; the key item gets the strong version
export function run<T>(frames: number[], micro: (i: number, seed: number) => Float32Array, strong: () => Float32Array, keyIndex = frames.length - 1,
  o: { microDb?: number; strongDb?: number; minGapF?: number; panSpread?: number } = {}) {
  const r = rng(frames[0] * 7919 + frames.length);
  const out: { f: number; make: () => Float32Array; gainDb: number; pan: number }[] = [];
  let last = -1e9;
  frames.forEach((f, i) => {
    if (f - last < (o.minGapF ?? 2) && i !== keyIndex) return;          // never stack inside ~60 ms
    last = f;
    const pan = (o.panSpread ?? 0.4) * (i % 2 === 0 ? -1 : 1) * (0.5 + 0.5 * Math.abs(r()));   // Alternating pan
    out.push(i === keyIndex ? { f, make: strong, gainDb: o.strongDb ?? 0, pan: 0 }
                            : { f, make: () => micro(i, 1000 + i), gainDb: (o.microDb ?? -12) + 2 * r(), pan });  // level jitter +-2 dB
  });
  return out;
}
// Swaps: run([150,157,164,171,178,185,190,195,200,203,206,209,212,215,218].map(f => f + 1), (i, s) => tick(3400 + 300 * (i % 3), s),  => POP., 10)
```

### 16. Bed characters: the record genres a launch film is built on · `bed-characters`

Family: music. See `music.md` for licensing and cutting.

**Job.** The genre is the brand's voice: tech house = confident product, glitch hop = edgy developer tool, inspirational corporate = trust, funk
and pizzicato = playful consumer app. The vocal chop is the genre's signature colour.

**Numbers.** Tempo 90-171 BPM (aim about 120); a minor key by default, a major one for a bright, warm film; a soft pulse by default (the
groove is felt), a clear pulse when the film rides the beat.

**Presets.**
- *Tech house / house.* 118-138 BPM; four-on-the-floor, a rolling bass, offbeat hats, a vocal chop; a confident product film.
- *Glitch hop / trap.* 108-140 BPM (or 75 / 150 half and double time); an 808 sub, vocal chops, stutters; developer tools, edgy launches.
- *Inspirational corporate.* 107-150 BPM; pizzicato, celesta, glockenspiel, soft piano, claps; trust, health, enterprise.
- *Funk / playful.* 95-116 BPM; slap bass, pizzicato and celesta, brass and sax; consumer apps.
- *Lo-fi hip hop.* 112-136 BPM in a minor key, a 16-beat loop, foley percussion; creative tools, calm films.

**Rich.** A found, licensed track (for example Pixabay Content License, Uppbeat free tier, Free Music Archive CC-BY, royalty-free loops) of the
right genre, tempo and key, cut at bar lines to the story; name the record you want, not just the accents.

**Cheap.** A code-synthesised bed presented as the music; a generic corporate ukulele; a track whose energy fights the picture.

**Placement.** Choose by genre, then tempo (the cut grid), then key (for the in-key one-shots), then sections (for `arranged-record`).

**Level.** The bed alone staged at about -18 to -22 LUFS before the voice and effects.

```ts
// the selection table the music search reads (cinetic music.mjs search terms per character)
export const BEDS = {
  techHouse:     { bpm: [118, 138], keys: ['F# min', 'G min', 'C min'], search: ['tech house corporate 120 bpm', 'upbeat technology presentation', 'soft tech house corporate'], instruments: ['4/4 soft kick', 'offbeat hats', 'round sub', 'plucked stabs', 'vocal chops'] },
  glitchHop:     { bpm: [108, 140], keys: ['D min', 'F min', 'G min'], search: ['glitch hop', 'trap beat 140', 'vocal chop hip hop'], instruments: ['808 sub', 'vocal chops', 'snare rolls', 'drips / clinks'] },
  corporate:     { bpm: [107, 150], keys: ['G min', 'A maj', 'C maj'], search: ['inspiring corporate pizzicato', 'minimal technology glockenspiel', 'tech explainer'], instruments: ['pizzicato', 'celesta / glock', 'orchestral percussion', 'soft kick + sub'] },
  funk:          { bpm: [95, 117], keys: ['F', 'E min'], search: ['upbeat funk', 'quirky pizzicato', 'funk brass'], instruments: ['slap bass', 'tight kit', 'wood block', 'brass stabs'] },
  lofi:          { bpm: [110, 136], keys: ['Bb min', 'G min'], search: ['lo-fi glitch hop', 'lofi hip hop beat'], instruments: ['dusty kit', 'sub', 'mallet bloops', 'vocal chops'] },
  drumAndBass:   { bpm: [140, 175], keys: ['G min', 'F# min'], search: ['drum and bass 140', 'breakbeat energetic'], instruments: ['breakbeat', 'snare rolls', 'crisp hats'] },
  futureBass:    { bpm: [120, 160], keys: ['B min'], search: ['future bass chill', 'trap future bass'], instruments: ['supersaw chords with sidechain dips', 'vocal chops', 'sub'] },
  soundDesign:   { bpm: [0, 0], keys: ['F#'], search: [], instruments: ['chime cloud', 'digital clicks', 'thumps', 'silence'] },
} as const;
// verify before use: genre / mood / instrument tags with earshot (CPU) against the brief, tempo with track.py analyze
```

### 17. Voice-over: cast, processed, placed on the on-screen words · `voice-over`

Family: mix. See `music.md` and `content-pacing.md` `vo-explainer`.

**Job.** The voice carries the argument; the picture shows its words; the music steps aside without pumping.

**Numbers.** A voice-over, female or male (F0 about 190-250 Hz female, 110-150 Hz male); a pace of 2.4-2.6 words
per second (4.6-5 syllables per second); the voice -16 to -18 LUFS short-term alone, 6-8 dB over the bed; peaks -3 to -7 dBFS; the bed ducked 3-4
dB with a 30 ms attack and a 200-250 ms release (8 dB or 14 dB for a deeper duck, none when the bed is kept low and constant); processing: high-pass
90 Hz, +3 dB at 4 kHz, 4:1 compression, de-ess, a plate at 0-5 % wet; mono centre; a phone voice band-passed 300-3400 Hz.

**Presets.**
- *Warm narrator.* A warm mid-register voice, clear neutral diction, confident and friendly, a medium pace (about 2.4 words per second).
- *Bright narrator.* A bright mid-high register (F0 about 247 Hz), close-miked and dry.
- *Processing chain.* High-pass 90 Hz, presence +3 dB at 4 kHz, 4:1 compression, de-ess, a short plate (5 % wet); the voice about 6-8 dB over
  the bed.
- *Constant bed.* A close, dry voice at about 2.6 words per second over a constant low bed with no ducking.

**Rich.** A real cast read (or a good synthetic voice) of the actual copy, close and dry; words placed on their on-screen frames; the bed ducked
3-4 dB smoothly; effects never covering a word.

**Cheap.** A guessed script with a placeholder voice; pumping ducks; reverb on the voice; effects louder than words.

**Placement.** Each word's spoken onset at its on-screen frame +1 to +4 f (or +/-2 f); phrases from the timeline drive the duck.

**Level.** Voice -16 LUFS short-term, bed -22 LUFS short-term; master the sum to the film's target.

```ts
// VO processing (CPU ffmpeg), the chain; the caller gets the phone band
export const VO_CHAIN = 'highpass=f=90,equalizer=f=4000:t=q:w=1:g=3,acompressor=threshold=-20dB:ratio=4:attack=5:release=80,deesser=i=0.4,aecho=0.8:0.9:20:0.05';
export const PHONE_CHAIN = 'highpass=f=300,lowpass=f=3400,volume=-3dB';
export const voCmd = (inp: string, out: string, phone = false) => `ffmpeg -y -i ${inp} -af "${phone ? PHONE_CHAIN : VO_CHAIN}" -ar 48000 -ac 1 ${out}`;
// phrases come from the same timeline as the on-screen words (frame each phrase starts / ends)
import { duck } from './Soundtrack';
export const PHRASES: [number, number][] = [[13, 79], [85, 175], [182, 224], [234, 294], [299, 441]];   // 24 fps
export const musicGainVO = (f: number) => duck(f, PHRASES, 24, -3.5);
// place the VO so each word lands 1-4 f after its on-screen frame: <Sequence from={wordF + 2}><Audio src={staticFile('vo/l01.wav')} /></Sequence>
```

### 18. Mix and master: loudness, range, peaks, width and brightness · `mix-master`

Family: mix. See `finishing.md` (the loudness pass and the mux).

**Job.** Loudness and range are part of the character: a quiet, dark master reads premium and calm; a loud, narrow master reads social and
aggressive. The range should come from the arrangement (gaps, breakdowns), not from unlimited peaks.

**Numbers.** Integrated -19 to -14 LUFS (aim -15; -23 to -7 by character); loudness range 0.4-16 LU (aim about 2.4); ship -1 dBTP; side/mid -21
to -4 dB (aim -12 to -15; a wide mix -5 to -8.5); brightness (spectral centroid) dark 280-450 Hz to bright 1.8-3.4 kHz; effects 6-20 dB over the
bed, 15-35 dB in bare passages, 20-49 dB for strong accents after gaps.

**Presets.**
- *Huge range.* -10 LUFS integrated with a 15.7 LU range from a long quiet breakdown in the middle.
- *Effects over a constant bed.* Effects +8 to +20 dB over the bed at their onset; the bed never ducks.
- *Pops over the bed.* UI pops 6-12 dB over the bed; the bed ducked only for the voice.
- *Quiet, dark master.* About -22 LUFS integrated with a dark centroid: premium and calm.
- *Loud, narrow master.* About -7 LUFS with a 0.4 LU range: social, aggressive.

**Rich.** A target set by the film's character; range from the arrangement; -1 dBTP; effects mono centre and the bed wide; brightness matched to
the picture (a dark film, a dark master).

**Cheap.** Everything slammed to -9 LUFS with no range; clipping; effects louder than the bed's accents everywhere; a bright, harsh master on a dark
film.

**Level.** A two-pass loudness normalisation to the target, then a true-peak limiter at -1 dBTP.

```ts
// two-pass EBU R128 normalisation with CPU ffmpeg; run pass 1, read its JSON, run pass 2 (linear when possible)
export const pass1 = (inp: string, I: number, LRA = 7) => `ffmpeg -hide_banner -i ${inp} -af loudnorm=I=${I}:TP=-1.0:LRA=${LRA}:print_format=json -f null -`;
export const pass2 = (inp: string, out: string, I: number, m: { input_i: string; input_tp: string; input_lra: string; input_thresh: string; target_offset: string }, LRA = 7, lowpassHz?: number) =>
  `ffmpeg -y -i ${inp} -af "${lowpassHz ? `lowpass=f=${lowpassHz}:p=1,` : ''}loudnorm=I=${I}:TP=-1.0:LRA=${LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:` +
  `measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,alimiter=limit=0.89:level=false" -ar 48000 ${out}`;
// targets by character
export const TARGETS = { calmPremium: { I: -19, LRA: 4 }, standard: { I: -14.8, LRA: 3 }, arranged: { I: -12, LRA: 10 }, socialLoud: { I: -9, LRA: 2 }, dark: { I: -22, LRA: 2, lowpassHz: 9000 } };
```

### 19. Ticks and clicks: 3-15 ms high transients · `ticks-clicks`

Family: one-shot.

**Job.** Precision and "digital": small steps, checks, snaps, marker jumps. A rising sequence of ticks accelerates a move before it happens.

**Numbers.** 3-60 ms (house 8-15); a centre of 2.6-14.7 kHz; 1 ms attack; -10 dB under the bed to -31 dBFS (in runs); pan alternating +/-40 %,
or centred. House clicks: a centroid of 2.7 / 4.1 / 7.9 kHz (low / middle / high), 10-65 ms, peaking -31 / -21 / -13 dBFS; most energy at 4-10
kHz.

**Presets.**
- *Click.* 3 ms of noise high-passed at 3 kHz plus a 4 kHz sine of 8 ms, -8 dB.
- *Tick.* A 2.6 kHz square, 1 ms attack, 25 ms decay, -10 dB.
- *Digital clicks.* A 10-30 ms burst of a sine at 13-14.7 kHz (or 2.7-3.5 kHz for the lower ones) with a 1 ms attack, plus 5 ms of noise
  high-passed at 9 kHz, panned alternately +/-40 %.
- *Under the voice.* 15 ms high clicks (band-pass 3-4 kHz) at -24 dB under the voice.
- *Soft UI ticks.* 5-8 ms clicks at 3-4 kHz.

**Rich.** Very short, high, quiet (runs at -24 to -31 dBFS), varied in pitch and pan, dry; a rising pitch figure into a whip; the low click (2.7-3.5
kHz) for weight and the high one (13 kHz) for sparkle.

**Cheap.** Loud mid-range clacks; one click sample on everything; clicks on every frame of a slow move.

**Placement.** The step, check or jump frame (0 f); runs one per item; on twos for pixel steps.

**Level.** -16 to -31 dBFS; centre or alternating +/-40 %.

```ts
import { tone, noise, mix, norm } from './sfx-kit';
// Click: 3 ms noise HP 3 kHz + 4 kHz sine 8 ms; tick: 2.6 kHz soft square, 1 ms attack, 25 ms decay
export const click = (seed = 71, peakDb = -18) => norm(mix(
  norm(noise({ len: 0.004, type: 'hp', f: () => 3000, env: (t) => (t < 0.003 ? 1 : 0), seed }), 0),
  norm(tone({ f0: 4000, a: 0.0005, tau: 0.008 / 4.6, len: 0.01 }), -4)), peakDb);
export const tick = (hz = 2600, seed = 72, peakDb = -20) => norm(tone({ f0: hz, a: 0.001, tau: 0.025 / 4.6, len: 0.03, wave: 'square' }), peakDb);
// Bright tick: 10 ms noise click high-passed at 5 kHz
export const brightTick = (seed = 73, peakDb = -20) => norm(noise({ len: 0.01, type: 'hp', f: () => 5000, env: (t) => Math.exp(-t / 0.002), seed }), peakDb);
// Digital click: 10-30 ms sine at 13-14.7 kHz (or 2.7-3.5 kHz), 1 ms attack, exp decay + 5 ms white noise HP 9 kHz; optional 14 k -> 1 k sweep in 40 ms
export function digitalClick(hz = 14000, lenMs = 20, seed = 74, sweep = false, peakDb = -16) {
  const s = tone({ f0: hz, f1: sweep ? 1000 : hz, glide: 0.04, a: 0.001, tau: lenMs / 1000 / 4.6, len: Math.max(lenMs, sweep ? 45 : 0) / 1000 + 0.005 });
  const nz = noise({ len: 0.006, type: 'hp', f: () => 9000, env: (t) => (t < 0.005 ? 1 : 0), seed });
  return norm(mix(norm(s, 0), norm(nz, -6)), peakDb);
}
// Whip pre-roll: three clicks rising 1.6 / 5.1 / 8 kHz, one frame apart (place them on the 3 frames before the whip)
export const risingClicks = [1600, 5100, 8000].map((hz, i) => () => norm(noise({ len: 0.01, type: 'bp', f: () => hz, q: 2, env: (t) => Math.exp(-t / 0.002), seed: 75 + i }), -20 + i * 2));
```

### 20. Typing: one soft key per 1-3 characters · `typing`

Family: one-shot. See also `animations.md` `typewriter-head`.

**Job.** Typing makes the product live: someone (or the agent) is writing now. Sounding every second or third key keeps it human without a machine
gun.

**Numbers.** One key per 1-3 characters; an 8-10 kHz transient of 10-30 ms plus a 1-2 kHz body, or a tonal pop at 550-1600 Hz; pitch +/-15 % seeded;
-14 to -34 dBFS; at most about 12 sounded keys per second, never two within 60 ms, level variation sigma 2.5 dB; above 25 characters per second, one
per word or silence.

**Presets.**
- *Mechanical keys.* One click per character group: an 8-10 kHz transient of 10-30 ms with a tiny 1-2 kHz body, varied per key.
- *Tonal first letters.* The first letters of a title as pops (611, 553, 1166, 1611, 1611 Hz; -32 to -14 dBFS; 20-85 ms), the rest neutral.
- *Soft ticks.* Soft keyboard ticks at -22 dB, one per 2-3 typed characters, pitch randomised +/-15 % (seeded).

**Rich.** Quiet, dry, centred; one per 1-3 characters; seeded pitch and level variation; the first letter tonal, the rest neutral; the sound stops
when typing goes faster than about 12 per second.

**Cheap.** The same click on every character; loud keys over the voice; reverb; a typewriter bell.

**Placement.** +1 f after the letter appears; character groups on the frame the group appears.

**Level.** -18 to -34 dBFS; mono centre.

```ts
import { tone, noise, mix, norm, rng } from './sfx-kit';
// Key: 8-10 kHz transient 10-30 ms + tiny 1-2 kHz body, randomised per key by seed
export function key(seed: number, peakDb = -30) {
  const r = rng(seed), hz = 8000 + 2000 * ((r() + 1) / 2), body = 1000 + 1000 * ((r() + 1) / 2), len = 0.01 + 0.02 * ((r() + 1) / 2);
  return norm(mix(
    norm(noise({ len, type: 'bp', f: () => hz, q: 1.5, env: (t) => Math.exp(-t / (len / 4)), seed }), 0),
    norm(tone({ f0: body, a: 0.0008, tau: 0.006, len: 0.03 }), -8)), peakDb + 2.5 * r());   // level sigma ~2.5 dB
}
// typed text -> key cues: one per `every` chars, +1 f after the letter, never two within 60 ms, at most 12/s
export function typing(letterFrames: number[], fps: number, every = 2, seed = 900) {
  const out: { f: number; make: () => Float32Array }[] = []; let last = -1e9;
  letterFrames.forEach((f, i) => {
    if (i % every !== 0) return;
    const s = (f + 1) / fps; if (s - last < Math.max(0.06, 1 / 12)) return; last = s;
    out.push({ f: f + 1, make: i === 0 ? () => norm(tone({ f0: 1400, a: 0.001, tau: 0.02, len: 0.1 }), -20) : () => key(seed + i) });   // Tonal first letter
  });
  return out;
}
```

### 21. Shutter, toggle and mouse clicks · `shutter-clicks`

Family: one-shot.

**Job.** A snap zoom is a photograph being taken; a word cutting on is a frame being exposed. The click makes a hard edit feel deliberate and
mechanical, not accidental.

**Numbers.** 6-60 ms; a 2.5-10 kHz transient with an optional 800-1300 Hz body; a double click 18 ms apart; -6 dB under the bed to -19 dBFS.

**Presets.**
- *Snap zoom in.* A camera-shutter click (10 kHz, 11 ms) at -19 dBFS; the snap zoom out gets a lighter toggle click (5.4 kHz, 6 ms).
- *Shutter.* Two noise clicks 18 ms apart (the first band-passed at 4.5 kHz, the second at 2.5 kHz), each 12 ms, -6 dB.
- *Pen clicks.* Dry clicks (a pen click, a camera shutter) on UI moments during a breakdown: a marquee starting, a mask applied, a word on and off.
- *Mouse click.* A 9.7 kHz transient with an 825 Hz body.

**Rich.** A two-part transient (a shutter = two clicks 18 ms apart; a mouse = a high transient plus a body); dry; on the snap frame; the zoom-out
gets the lighter toggle.

**Cheap.** A shutter on every cut; a loud camera sample with mirror slap and reverb; mouse clicks with no visible cursor.

**Placement.** The snap frame (0 f); the cursor's press frame; a word's cut-on frame or +1 f.

**Level.** -13 to -19 dBFS, centre, dry.

```ts
import { tone, noise, mix, norm, shift } from './sfx-kit';
// Shutter: two 12 ms noise clicks 18 ms apart, band-passed 4.5 kHz then 2.5 kHz
export function shutter(peakDb = -16, seed = 81) {
  const c = (hz: number, s: number) => noise({ len: 0.012, type: 'bp', f: () => hz, q: 1.6, env: (t) => Math.exp(-t / 0.003), seed: s });
  return norm(mix(norm(c(4500, seed), 0), shift(norm(c(2500, seed + 1), -2), 0.018)), peakDb);
}
// Toggle click: 5.4 kHz, 6 ms; mouse click: 9.7 kHz transient + 825 Hz body
export const toggle = (peakDb = -13) => norm(noise({ len: 0.006, type: 'bp', f: () => 5400, q: 2, env: (t) => Math.exp(-t / 0.0015), seed: 83 }), peakDb);
export const mouseClick = (peakDb = -14) => norm(mix(
  norm(noise({ len: 0.008, type: 'bp', f: () => 9700, q: 1.5, env: (t) => Math.exp(-t / 0.0015), seed: 84 }), 0),
  norm(tone({ f0: 825, a: 0.0005, tau: 0.006, len: 0.03 }), -6)), peakDb);
```

### 22. Pitched sweeps: the falling pew and the rising bloop · `pitched-sweeps`

Family: one-shot.

**Job.** Pitch draws direction: up = appear, grow, rise, yes; down = shrink, vanish, exit, no. A single motion gets a character without a melody.

**Numbers.** Sweeps of -58 to +49 st; 40-210 ms; starts from 370 Hz to 14 kHz; exponential in pitch; a soft attack (60 ms) for falls into silence,
1-2 ms for pops; house tonal sweeps -14 to +20 st, clicks -4.5 to +12 st.

**Presets.**
- *Falling pew.* A sine starting at 1.9 kHz and falling about 58 st (to about 65 Hz) in 210 ms, with a 60 ms attack, as an element shrinks
  away.
- *Rising sweep, then a tap.* A rising tonal sweep (+44 st from 1.1 kHz over 100 ms), then a dull 233 Hz tap and a low hit as an arrow turns and
  flies.
- *Falling clicks.* Digital clicks sweeping down 47 st (14 kHz -> 1 kHz in 40 ms); a glock with a -21 st bend.
- *Rising bloop.* A sine 600 Hz -> 4.6 kHz in 180 ms, ending 1-2 f before an arrival.

**Rich.** The direction matches the motion; exponential (equal semitones per ms); short; reserved for 2-5 character moments; landing on a quiet tap or
nothing.

**Cheap.** A slide whistle (long, linear in Hz); a pew on everything; sweeps against the motion.

**Placement.** A falling pew starts on the shrink's start and ends with the disappearance; a rising bloop ends 1-2 f before the arrival.

**Level.** -9 to -20 dBFS; centre.

```ts
import { tone, norm, st } from './sfx-kit';
// exponential sweep: f0 -> f0 * 2^(semis/12) over lenS, attack a
export const sweep = (f0: number, semis: number, lenS: number, a = 0.002, peakDb = -14) =>
  norm(tone({ f0, f1: f0 * st(semis), glide: lenS, a, tau: lenS / 1.5, len: lenS + 0.03 }), peakDb);
export const PEW = () => sweep(1900, -58, 0.21, 0.06, -20);
export const BLOOP_UP = () => sweep(600, 35, 0.18, 0.004, -16);      // (600 -> 4.6 kHz)
export const NOTIFY = (f = 1900) => sweep(f / st(17), 17, 0.09, 0.002, -17);   // Rows: ends at f (1.8-2.2 kHz)
export const BRACE = (f = 1400) => sweep(f, -20, 0.12, 0.002, -31);  // Braces open
```

### 23. Glitch click bursts over silence · `glitch-bursts`

Family: one-shot. Only for a film about signal or a stepping digital system.

**Job.** The digital system made audible: a grid stepping, a scramble resolving. In silence a 20 ms click is enormous; it is the most striking way to
make a small UI step feel important.

**Numbers.** Clicks of 10-60 ms at 1.8-14 kHz, peaking up to -0.3 dBFS over a bed at -32 to -46 LUFS; 3-4 f apart; a passage of 0.3-1.3 s; each click
preceded by a 20 LU dip.

**Presets.**
- *Glitch section.* Isolated, very loud, short clicks and liquid bloops (10-60 ms, 1.8-4 kHz) over a dropped-out bed, one per grid step.
- *Dry glitch burst.* Dry clicks at 4-14 kHz, 10-20 ms, as a word drops out, markers collapse and a quad snaps.

**Rich.** The bed truly out (a drop-out); each click answering one visible step; varied pitch and a few sample-and-hold bloops; a short passage (under
1.5 s), then the beat returning on a picture event.

**Cheap.** Glitch stutters on the music with no picture reason; glitch as decoration; clicks over a full bed (they vanish).

**Placement.** One click per step frame (0 f); the passage starts on the drop-out frame and ends where the beat comes back.

**Level.** Clicks peak -0.3 to -6 dBFS against near silence; dry; mono.

```ts
import { tone, noise, mix, norm, rng, SR } from './sfx-kit';
// Glitch click: 10-40 ms band-passed noise or sine blip at 1.8-4 kHz, 1 ms attack
export function glitchClick(seed: number, peakDb = -3) {
  const r = rng(seed), hz = 1800 + 2200 * ((r() + 1) / 2), len = 0.01 + 0.03 * ((r() + 1) / 2);
  const y = r() > 0 ? noise({ len, type: 'bp', f: () => hz, q: 3, env: (t) => (t < 0.001 ? t / 0.001 : Math.exp(-(t - 0.001) / (len / 4))), seed })
                    : tone({ f0: hz, a: 0.001, tau: len / 4, len });
  return norm(y, peakDb);
}
// sample-and-hold "liquid bloop": pitch jumps between 800 and 2400 Hz every 6 ms
export function shBloop(seed: number, len = 0.06, peakDb = -4) {
  const n = Math.ceil(len * SR), y = new Float32Array(n), r = rng(seed); let ph = 0, f = 800;
  for (let i = 0; i < n; i++) { if (i % Math.round(0.006 * SR) === 0) f = 800 + 1600 * ((r() + 1) / 2); ph += (2 * Math.PI * f) / SR; y[i] = Math.sin(ph) * Math.exp(-(i / SR) / (len / 3)); }
  return norm(y, peakDb);
}
// Passage (24 fps): bed dropped for 14 f (`pre-hit-gap` dropOut) and these one-shots (frames from the drop-out start)
export const GLITCH_PASSAGE = [2, 6, 9, 11, 14, 18, 20, 25, 28].map((f, i) => ({ f, make: () => (i === 1 ? shBloop(f) : glitchClick(f)) }));
```

### 24. The sound-design score: no beat, three textures, real silences · `sound-design-score`

Family: music.

**Job.** Craft without a soundtrack: every motion has its own sound and the silences are the luxury. It suits tools for creatives and very precise UI
films.

**Numbers.** Textures: chimes at 1.2-3 kHz, 60-300 ms, with stutters; clicks at 8-13 kHz, 5-30 ms; thumps at 95-165 Hz, 20-45 ms; silences of 0.3-1.4 s
(about 10 in 30 s); -22 LUFS integrated with a range of about 12 LU (the range comes from the silences); about 70 % of the energy harmonic.

**Presets.**
- *Three textures.* A sound-design track, not a song: no steady beat, long stretches of nothing; chimes, clicks and thumps return as motifs; silences
  planned as picture holds.
- *Bare passage inside a music film.* Up to 7 s of voice with UI plops, ticks and chimes and no beat at the start, or an almost bare passage in the
  middle.

**Rich.** Motifs (the same three textures returning); a key centre for every tonal sound; true silences; nothing on the bed; density following the
picture.

**Cheap.** Random effects with no key; constant room tone or a drone to fill gaps; a library track added under it.

**Placement.** Every event sounded at its frame (`sync-grammar` offsets); silences planned as picture holds.

**Level.** -22 LUFS, a range of about 12 LU, -1 dBTP; clicks dry, chimes with a 0.8 s plate at 20 %, thumps mono.

```ts
import { fm, noise, mix, norm, mtof, rng, plate, placeSt, place, Stereo } from './sfx-kit';
// Chime cloud: FM pings in the F# set with fast stutters over a faint airy pad
const SET = [90, 97, 102, 99, 86];   // MIDI of the partials: F#6 1478, C#7 2216, F#7 2956, D#7 2516, D6 1175 Hz
export function chimeCloud(b: Stereo, fromS: number, toS: number, seed = 101) {
  const r = rng(seed); let t = fromS;
  while (t < toS) {
    const m = SET[Math.floor(((r() + 1) / 2) * SET.length) % SET.length];
    const ping = norm(fm(mtof(m), { ratio: 3.5, index: 1.5, a: 0.001, tau: (0.06 + 0.24 * ((r() + 1) / 2)) / 4.6 * 3, len: 0.35, indexTau: 0.03 }), -30 + 6 * r());
    placeSt(b, plate(ping, 0.8, 0.2, 0.2), t);
    if (r() > 0.3) for (let k = 1; k <= 2; k++) place(b, ping, t + k * (0.03 + 0.02 * ((r() + 1) / 2)), -6 * k);   // stutter repeats
    t += 0.08 + 0.25 * ((r() + 1) / 2);
  }
  place(b, norm(noise({ len: toS - fromS, type: 'hp', f: () => 6000, q: 0.5, pink: true, env: (tt, u) => Math.sin(Math.PI * u), seed }), -46), fromS);   // faint air
}
```

### 25. Air shimmer and "ting": 7-13 kHz noise or sine for glints · `air-shimmer`

Family: one-shot. See also `effects.md` `light-sweep`.

**Job.** Light as sound: a glint on glass, an iris opening, a rim light sweeping. It adds polish without adding weight or melody.

**Numbers.** Noise in a 6-13 kHz band, or a 7.3-9.1 kHz sine ting; 60 ms-0.9 s; -14 to -17 dBFS (a ting) or -16 dBFS (a 60 ms shimmer); 23-33 dB over the
bed in the high band only.

**Presets.**
- *Airy shimmer.* Band-passed noise at 8-12 kHz, 60 ms, -16 dBFS, as a cone settles.
- *Shimmer notes.* A sine at 7.3-9.1 kHz with a 2 ms attack and a 200 ms decay, -14 to -17 dBFS, on each glint.
- *Long shimmer.* 7-13 kHz noise with a 300 ms decay over a light sweep, with a low note under it so it does not float.

**Rich.** Very high and quiet, synced to a light event; a low note under the long ones; dry or a short plate.

**Cheap.** Fairy-dust sparkles on everything; loud 3-5 kHz "magic" chimes; shimmer with no visible light event.

**Placement.** The glint or settle frame; long shimmers start with the light sweep.

**Level.** -14 to -17 dBFS; slight width.

```ts
import { noise, tone, norm } from './sfx-kit';
// Shimmer: band-passed noise 8-12 kHz (60 ms) / 7-13 kHz with a 300 ms decay (460 ms)
export const shimmer = (lenS = 0.06, decayS = 0.3, peakDb = -16, seed = 111) =>
  norm(noise({ len: lenS, type: 'bp', f: () => 10000, q: 2.2, env: (t) => Math.min(1, t / 0.004) * Math.exp(-t / (decayS / 4.6)), seed, stages: 2 }), peakDb);
// Ting: sine 7.3-9.1 kHz, 2 ms attack, 200 ms decay, -14..-17 dBFS
export const ting = (hz = 8000, peakDb = -16) => norm(tone({ f0: hz, a: 0.002, tau: 0.2 / 4.6, len: 0.22 }), peakDb);
```

### 26. The stab: a short chord hit · `stab`

Family: one-shot.

**Job.** Authority and punctuation: a title lands, a montage tears, a section ends. Repeated, it becomes the brand's sonic logo.

**Numbers.** 137 ms (house) to 1.1 s; a centroid of 0.94-2.0 kHz; 6 voices; low-pass 3 kHz; +18 to +36 dB over the bed; repeated as a signature 7-8
times in a film.

**Presets.**
- *Brass stab chords.* Saw + pulse, 6 voices, low-pass 3 kHz, no attack, 300-1000 ms decay, in C major, on title cards.
- *Signature stab.* 225-290 ms, centroid 1050-1280 Hz, the bed dropping 1-3 f before each, repeated seven times on the same kind of picture event.
- *Orchestral stab and riser.* An orchestral stab with a riser into the drop; stabs of 0.5-1.1 s as a tile flares and the picture cuts to white.

**Rich.** In key with the bed (a chord, not a noise); a 1-3 f bed dip before it; repeated as a motif on the same kind of event.

**Cheap.** A stock orchestra-hit sample from the 90s; stabs on random frames; detuned and long.

**Placement.** The title, tear or card frame (0 f) after a 1-3 f bed dip.

**Level.** +18 to +36 dB over the bed; centre.

```ts
import { Biquad, mix, norm, mtof, SR, envAD, noise, tone, plate } from './sfx-kit';
// Brass stab: saw + pulse, 6 voices, low-pass 3 kHz, instant attack, 300-1000 ms decay
export function stab(chordMidi = [48, 55, 60, 64, 67, 72], decayS = 0.5, peakDb = -8) {
  const n = Math.ceil((decayS + 0.05) * SR), y = new Float32Array(n), lp = new Biquad().set('lp', 3000, 0.8);
  const ph = chordMidi.map(() => 0);
  for (let i = 0; i < n; i++) {
    const t = i / SR; let s = 0;
    chordMidi.forEach((m, j) => { const f = mtof(m) * (1 + (j % 2 ? 0.003 : -0.003)); ph[j] = (ph[j] + f / SR) % 1;
      s += j % 2 ? (ph[j] < 0.4 ? 1 : -1) * 0.7 : ph[j] * 2 - 1; });
    y[i] = lp.run(s / chordMidi.length) * envAD(t, 0.002, decayS / 4.6);
  }
  return norm(y, peakDb);
}
// Bar hit: kick 120 -> 50 Hz 120 ms + band-passed noise snare 1-4 kHz 180 ms with a 0.8 s plate at -12 dB
export function barHit() {
  const k = norm(tone({ f0: 120, f1: 50, glide: 0.04, a: 0.001, tau: 0.12 / 4.6, len: 0.13 }), 0);
  const s = norm(noise({ len: 0.18, type: 'bp', f: () => 2000, q: 0.5, env: (t) => Math.exp(-t / (0.18 / 4.6)), seed: 121 }), -3);
  const w = plate(s, 0.8, 1.0);
  const out = mix(k, s); for (let i = 0; i < out.length; i++) out[i] += (w.L[i] + w.R[i]) * 0.5 * 0.25;
  return norm(out, -6);
}
```

### 27. The tactile palette: wood, rim clicks, drips, plastic, paper · `tactile`

Family: one-shot.

**Job.** Touch: the interface as a physical object (blocks, paper, plastic, water). Digital motion feels handmade and playful.

**Numbers.** Wood 870-900 Hz + 1.6-1.7 kHz, 20-40 ms; rim or plastic clicks 3-13 kHz, 10-60 ms; drips 2.8 kHz +5 st in 20 ms; paper taps 1.7-1.9 kHz,
10-70 ms; textures at -36 to -60 dBFS, accents at -11 dBFS.

**Presets.**
- *Wooden tock.* Band-passed noise at 1.6 kHz plus an 870 Hz sine blip, 40 ms, under a lo-fi beat with foley percussion.
- *Wood block.* 900 Hz + 1.7 kHz sines, 40 ms; clicks of 10 ms noise; plastic brick clicks around 1.85 kHz.
- *Quiet clock.* Very quiet wooden taps every 6-7 frames (10-75 ms, -45 to -60 dBFS) in the reverb tail under an end-card hold.
- *Drip.* A 2.8 kHz sine rising 5 st in 20 ms, 60 ms, at -36 dBFS as a bed texture.

**Rich.** One material per film (wood, or plastic, or wood and paper); quiet; varied by seed; tied to physical-looking motion (placing, stacking,
stepping).

**Cheap.** Mixing every material; cartoon water drops on UI; loud foley that fights the music.

**Placement.** The contact frame; ticking figures every 6-7 f as a clock under a hold.

**Level.** -36 to -60 dBFS for textures; -11 to -20 dBFS for accents; dry.

```ts
import { tone, noise, mix, norm } from './sfx-kit';
// Wooden tock: band-passed noise 1.6 kHz + 870 Hz sine blip, 40 ms
export const tock = (seed = 131, peakDb = -14) => norm(mix(
  norm(noise({ len: 0.04, type: 'bp', f: () => 1600, q: 3, env: (t) => Math.exp(-t / 0.006), seed }), -4),
  norm(tone({ f0: 870, a: 0.0008, tau: 0.04 / 4.6, len: 0.045 }), 0)), peakDb);
// Wood block: 900 Hz + 1.7 kHz sines, 40 ms
export const woodBlock = (peakDb = -12) => norm(tone({ f0: 900, a: 0.0008, tau: 0.04 / 4.6, len: 0.045, partials: [[1700 / 900, -3]] }), peakDb);
// Drip: sine 2.8 kHz gliding +5 st in 20 ms, 60 ms
export const drip = (peakDb = -36) => norm(tone({ f0: 2800, f1: 2800 * Math.pow(2, 5 / 12), glide: 0.02, a: 0.001, tau: 0.06 / 4.6, len: 0.065 }), peakDb);
// Paper tap: 1-2 ms attack, 10-70 ms, centroid ~1.8 kHz
export const paperTap = (lenMs = 40, seed = 133, peakDb = -24) => norm(noise({ len: lenMs / 1000, type: 'bp', f: () => 1800, q: 0.8,
  env: (t) => (t < 0.0015 ? t / 0.0015 : Math.exp(-(t - 0.0015) / (lenMs / 1000 / 4.6))), seed }), peakDb);
```

### 28. The vocal chop · `vocal-chop`

Family: music.

**Job.** A human voice without words: contemporary, "now", the colour that says this is a current product film. As an accent, the pitched-down sweep is a
playful exclamation.

**Numbers.** 80-150 ms; formants F1 700, F2 1200-1220, F3 2600 Hz; notes from the key (for example D4 F4 A4, C#4 F#4, F#4 A4); pan +/-0.3; ping-pong 1/8 at
20 %; accent sweeps pitched down 8-30 st over 250 ms; the bed's chops at -20 to -30 dB. Let the vocal chop colour about half of the music sections.

**Presets.**
- *Chop sweeps on cues.* Vocal-chop sweeps pitched down -20, -23, -30, -9 st on the cue frames of a sizzle.
- *Bed chops.* A formant-filtered saw (formants 700 / 1220 / 2600 Hz) pitched D4 / F4 / A4, 90-140 ms, one every half bar, -30 dBFS, ping-pong 1/8
  at 20 %.

**Rich.** Taken from the found track (a real voice); in key; short; spread; accents as pitched-down sweeps on the cue frames.

**Cheap.** A synthetic formant buzz exposed (it reads robotic and cheap); chops on every beat at the front of the mix.

**Placement.** Accent sweeps on the cue frame (0 f); bed chops on the half bar.

**Level.** Bed -20 to -30 dB; accents +10 to +20 dB over the bed.

```ts
import { Biquad, norm, mtof, SR, envAD } from './sfx-kit';
// formant chop: saw at a key note through 2-3 band-pass formants (700 / 1220 / 2600 Hz), optional pitch drop
export function vocalChop(midi: number, o: { lenS?: number; dropSt?: number; dropS?: number; formants?: number[]; q?: number; peakDb?: number } = {}) {
  const len = o.lenS ?? 0.12, F = (o.formants ?? [700, 1220, 2600]).map((f) => new Biquad().set('bp', f, o.q ?? 6));
  const n = Math.ceil(len * SR), y = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = mtof(midi) * Math.pow(2, -((o.dropSt ?? 0) * Math.min(1, t / (o.dropS ?? 0.25))) / 12);
    ph = (ph + f / SR) % 1; const saw = ph * 2 - 1;
    let s = 0; F.forEach((b, j) => (s += b.run(saw) * [1, 0.7, 0.35][j]));
    y[i] = s * envAD(t, 0.008, len / 3);
  }
  return norm(y, o.peakDb ?? -20);
}
export const CHOP_SWEEP = (st = 20) => vocalChop(69, { lenS: 0.28, dropSt: st, dropS: 0.25, peakDb: -12 });   // -20 / -23 / -30 st
```

### 29. Stereo and pan · `stereo`

Family: mix.

**Job.** Width is space and air (a world opening, a breath); narrow is punch and focus (the drop, the logo).

**Numbers.** Side/mid -21 to -4.3 dB, aim -12 to -15; wide sections -5 to +1 dB (intros, breakdowns); narrow -12 to -20 (drops, stings, a voice film).
Pans: plucks +/-30-40 %, clicks alternating +/-40 %, chops +/-0.3, whooshes along the motion; Haas 8-15 ms; kick, sub, bass, voice and pops mono centre.

**Presets.**
- *Pops centred.* Pops mono and centred; the bed wide.
- *Moderate width.* Moderate width on the chime texture, everything else centred.
- *Spread plucks.* Plucks panned +/-30-40 %, kick and bass mono; the voice centred.

**Rich.** The low end and all UI accents centred; space from pads and plucks; width automated by section; whooshes travelling with their object.

**Cheap.** Random pans on UI sounds; a wide sub; everything equally wide; pans that contradict the picture.

**Placement.** Pan from the object's screen x: pan = (x / width) x 2 - 1, clamped to +/-0.6 for effects (+/-0.15 for UI accents).

```ts
import { Stereo } from './sfx-kit';
// mid/side width: k = 0 mono, 1 unchanged, > 1 wider (breakdowns), < 1 narrower (drops, end stings)
export function width(s: Stereo, k: number): Stereo {
  const L = new Float32Array(s.L.length), R = new Float32Array(s.R.length);
  for (let i = 0; i < L.length; i++) { const m = (s.L[i] + s.R[i]) / 2, d = ((s.L[i] - s.R[i]) / 2) * k; L[i] = m + d; R[i] = m - d; }
  return { L, R };
}
export const panFromX = (x: number, frameW: number, limit = 0.6) => Math.max(-limit, Math.min(limit, (x / frameW) * 2 - 1));
// side/mid in dB, to check a mix against the targets (aim -12..-15)
export function sideMid(s: Stereo) { let m = 0, d = 0; for (let i = 0; i < s.L.length; i++) { const a = (s.L[i] + s.R[i]) / 2, b = (s.L[i] - s.R[i]) / 2; m += a * a; d += b * b; } return 10 * Math.log10((d + 1e-12) / (m + 1e-12)); }
```

### 30. The code-built bed (fallback only) · `code-bed`

Family: music. Ship a found, licensed record; use this as a temp track, under a found loop, or for a sound-design score.

**Job.** A timing scaffold: it proves the arc and the cut points before the real record is found; the right tool only for sound-design scores where
there is no bed to license.

**Numbers.** Kick: an end at 40-60 Hz from a start of 110-150 Hz, a drop of 30-60 ms, a decay of 110-450 ms. Hats 6-12 kHz, 15-90 ms, -18 to -40 dB. Snare:
1.2-2 kHz noise + a 180-200 Hz body, 110-180 ms. Swing 54-58 %. Sidechain 4-6 dB with a 120-250 ms release. A synthesised bed next to a real record
reads darker, far narrower and childish: never ship it as the music.

**Presets.**
- *Kicks.* A 52 Hz sine with a 140 -> 52 Hz pitch drop in 30 ms and a 220 ms decay; or 55 Hz from 140 Hz in 40 ms.
- *Hats, snares, claps.* Hats = 8 kHz high-passed noise, 20 ms; snare = a 120 ms noise burst band-passed at 2 kHz plus a 180 Hz tone.
- *Bass and pads.* A sub bass of a sine plus a 2nd harmonic at 15 %, an 8th-note pulse with a 4 dB sidechain duck released over 250 ms.

**Rich.** Used as a temp track or under a found loop, or for the effects layer that must sit on frames; mixed dark and narrow if it must ship.

**Cheap.** Shipping it as the music.

**Placement.** The grid from the film: beat frame = t0 + k x 60 / BPM x fps.

**Level.** The bed alone at -18 to -22 LUFS before the voice and effects.

```ts
import { bus, place, tone, noise, mix, norm, mtof, rng, Stereo } from './sfx-kit';
// a minimal deterministic bed on the film grid (temp track): kick on beats, off-beat hat, clap on 2 and 4, sub per bar with sidechain
export function tempBed(o: { bpm: number; bars: number; t0: number; rootsMidi: number[]; seed?: number }): Stereo {
  const beat = 60 / o.bpm, b = bus(o.t0 + o.bars * 4 * beat + 2), r = rng(o.seed ?? 1);
  const kick = norm(mix(norm(tone({ f0: 140, f1: 52, glide: 0.03, a: 0.001, tau: 0.22 / 4.6, len: 0.25 }), 0),
                        norm(noise({ len: 0.003, type: 'hp', f: () => 3000, env: () => 1, seed: 2 }), -14)), -6);
  const hat = (s: number) => norm(noise({ len: 0.09, type: 'hp', f: () => 7000, env: (t) => Math.exp(-t / 0.02), seed: s }), -24);
  const clap = (s: number) => norm(mix(norm(noise({ len: 0.11, type: 'bp', f: () => 1800, q: 0.8, env: (t) => Math.exp(-t / 0.025), seed: s }), 0),
                                       norm(tone({ f0: 190, a: 0.001, tau: 0.03, len: 0.11 }), -8)), -14);
  for (let bar = 0; bar < o.bars; bar++) {
    const root = mtof(o.rootsMidi[bar % o.rootsMidi.length] - 24);
    for (let k = 0; k < 4; k++) {
      const t = o.t0 + (bar * 4 + k) * beat;
      place(b, kick, t);
      place(b, hat(100 + bar * 4 + k), t + beat / 2, 0, 0.2 * r());
      if (k % 2 === 1) place(b, clap(200 + bar * 4 + k), t);
      // sub: an 8th-note pulse ducked 4-6 dB after each kick
      for (let e = 0; e < 2; e++) place(b, norm(tone({ f0: root, a: 0.008, tau: 0.2 / 4.6, len: beat / 2, partials: [[2, -16]] }), e === 0 ? -16 : -12), t + (e * beat) / 2);
    }
  }
  return b;
}
```

---

## Building a soundtrack from this file

1. Find the record first (`bed-characters`, `music.md`); mark its sections, strong onsets and key.
2. Cut the picture's structural frames (the turn, the reveal, the lockup) to the record's section changes (`arranged-record`, `drop`).
3. Make the cue list from the picture: every arrival, contact, press, cut with a reason and resolution gets a kind and an offset (`sync-grammar`).
4. Place 2-4 pre-hit gaps before the hits that matter; at most two whooshes and 2-6 subs.
5. Render the one-shots in the record's key with seeded variation; mix effects mono centre over a wide bed; duck for the voice.
6. Master to the film's character with a true peak of -1 dBTP; listen to the whole film, then fix what your ear and the listening tool flag.
