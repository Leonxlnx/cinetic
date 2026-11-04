#!/usr/bin/env python3
"""
dsp.py: the shared signal helpers of cinetic's mixer (numpy + scipy, 48 kHz, deterministic).

score.py, plan.py and track.py import it; draft.py builds its placeholder voices on it. It holds no
instrument and makes no music: pitch arithmetic, buffers, filters, oscillators for the placeholder
voices, the effects rooms and the placement helpers that put a sound into a stereo buffer.

    import sys; sys.path.insert(0, 'scripts/audio')
    import dsp as D
    bus = D.Bus(seconds=10)
    bus.place(take, t=4.0, gain=0.45, pan=0.2)

Conventions
- SR is 48000. Durations are in seconds and pitch is in Hz; convert with hz('Ab5') or mtof(80).
  Octaves are scientific: C4 = MIDI 60, Ab7 = MIDI 104.
- Generators return float64 arrays, mono (n,) or stereo (n, 2).
- Everything random takes `seed`, so the same call always renders the same samples.
- Oscillators integrate phase (sine, saw, square). sin(2*pi*f(t)*t) chirps on a glide; these do not.
"""
import re
from functools import lru_cache

import numpy as np
from scipy import signal

SR = 48000

# ------------------------------------------------------------------------------------------
# pitch
# ------------------------------------------------------------------------------------------
_PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
_NOTE = re.compile(r'^\s*([A-Ga-g])([#b♯♭]{0,2})(-?\d+)?\s*$')


def mtof(m):
    """MIDI note number (float ok) to Hz."""
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def ftom(f):
    """Hz to fractional MIDI note number."""
    return 69 + 12 * np.log2(f / 440.0)


def pitch_class(name):
    """'Eb' -> 3, 'F#' -> 6. Octave digits are ignored."""
    m = _NOTE.match(str(name))
    if not m:
        raise ValueError(f'not a note name: {name!r}')
    acc = m.group(2).replace('♯', '#').replace('♭', 'b')
    return (_PC[m.group(1).upper()] + acc.count('#') - acc.count('b')) % 12


def midi(x):
    """'Ab5' -> 80, 80 -> 80. Accepts note names with octave, or numbers."""
    if isinstance(x, (int, float, np.integer, np.floating)):
        return float(x)
    m = _NOTE.match(str(x))
    if not m or m.group(3) is None:
        raise ValueError(f'need a note with an octave such as "Ab5", got {x!r}')
    acc = m.group(2).replace('♯', '#').replace('♭', 'b')
    return float(_PC[m.group(1).upper()] + acc.count('#') - acc.count('b') + 12 * (int(m.group(3)) + 1))


def hz(x):
    """'Ab5' or MIDI number -> Hz."""
    return mtof(midi(x))


def nearest(pcs, target_midi):
    """MIDI note whose pitch class is in `pcs` and which sits closest to target_midi."""
    best = None
    for p in pcs:
        base = target_midi - ((target_midi - p) % 12)
        for cand in (base, base + 12):
            if best is None or abs(cand - target_midi) < abs(best - target_midi):
                best = cand
    return float(best)


# ------------------------------------------------------------------------------------------
# buffers, noise, filters
# ------------------------------------------------------------------------------------------
def ns(d):
    """seconds -> sample count (at least 1)"""
    return max(1, int(round(d * SR)))


def tt(d):
    return np.arange(ns(d)) / SR


def rng(seed=0):
    return np.random.default_rng(seed)


def noise(d, seed=0):
    return rng(seed).standard_normal(ns(d))


def lp(f, order=2):
    return signal.butter(order, float(np.clip(f, 10, SR * 0.45)), 'low', fs=SR, output='sos')


def hp(f, order=2):
    return signal.butter(order, float(np.clip(f, 10, SR * 0.45)), 'high', fs=SR, output='sos')


def bp(lo, hi, order=2):
    lo, hi = float(np.clip(lo, 10, SR * 0.44)), float(np.clip(hi, 12, SR * 0.45))
    return signal.butter(order, [lo, max(hi, lo * 1.01)], 'band', fs=SR, output='sos')


def filt(x, sos):
    return signal.sosfilt(sos, x, axis=0)


@lru_cache(maxsize=4096)
def _design(kind, qc, order, q):
    c = 2.0 ** (qc / 48.0)
    return lp(c, order) if kind == 'low' else hp(c, order) if kind == 'high' else bp(c / q, c * q, order)


def sweep(x, cutoff, kind='low', order=2, block=256, q=1.35):
    """Time-varying filter. cutoff is Hz per sample (array) or a scalar; kind low|high|band.
    Coefficients are redesigned per block (cutoff quantized to 1/48 octave and cached) with the
    filter state carried across blocks."""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), (len(x),))
    y = np.zeros_like(x)
    zi = None
    for s in range(0, len(x), block):
        c = float(np.mean(cutoff[s:s + block]))
        sos = _design(kind, int(round(48 * np.log2(max(c, 10.0)))), order, q)
        if zi is None:
            zi = np.zeros((sos.shape[0], 2) + x.shape[1:])
        y[s:s + block], zi = signal.sosfilt(sos, x[s:s + block], axis=0, zi=zi)
    return y


def colored(d, seed=0, alpha=1.6):
    """1/f^alpha noise, unit RMS: alpha 1 is pink, 2 is brown. 1.6 (between them) is the body of
    every placeholder whoosh: dull, never hissy."""
    n = ns(d)
    X = np.fft.rfft(noise(d, seed))
    fr = np.fft.rfftfreq(n, 1 / SR)
    X[1:] /= (fr[1:] / 100.0) ** (alpha / 2)
    X[0] = 0
    y = filt(np.fft.irfft(X, n), hp(40, 2))
    return y / (np.std(y) + 1e-12)


# ------------------------------------------------------------------------------------------
# oscillators and envelopes (the placeholder voices in draft.py use them)
# ------------------------------------------------------------------------------------------
def _f(freq, n):
    return np.full(n, float(freq)) if np.isscalar(freq) else np.asarray(freq, dtype=float)[:n]


def _phase(freq, d, phase0):
    n = ns(d)
    f = _f(freq, n)
    return (phase0 + np.cumsum(f) / SR) % 1.0, f / SR


def _blep(ph, dt):
    y = np.zeros_like(ph)
    m1 = ph < dt
    t1 = ph[m1] / dt[m1]
    y[m1] = t1 + t1 - t1 * t1 - 1
    m2 = ph > 1 - dt
    t2 = (ph[m2] - 1) / dt[m2]
    y[m2] = t2 * t2 + t2 + t2 + 1
    return y


def sine(freq, d, phase0=0.0):
    """Integrated-phase sine; freq may be an array (a glide)."""
    n = ns(d)
    return np.sin(2 * np.pi * (phase0 + np.cumsum(_f(freq, n)) / SR))


def saw(freq, d, phase0=0.0):
    """PolyBLEP band-limited saw."""
    ph, dt = _phase(freq, d, phase0)
    return 2 * ph - 1 - _blep(ph, dt)


def square(freq, d, phase0=0.0, pw=0.5):
    """PolyBLEP pulse built from two saws."""
    ph, dt = _phase(freq, d, phase0)
    ph2 = (ph + pw) % 1.0
    return (2 * ph - 1 - _blep(ph, dt)) - (2 * ph2 - 1 - _blep(ph2, dt))


def adsr(d, a=0.005, dcy=0.1, s=0.7, r=0.2):
    n = ns(d)
    env = np.full(n, float(s))
    na, nd, nr = min(n, max(1, int(a * SR))), int(dcy * SR), int(r * SR)
    env[:na] = np.linspace(0, 1, na)
    if na + nd < n:
        env[na:na + nd] = np.linspace(1, s, nd)
    if 0 < nr < n:
        env[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return env


def expdec(d, tau):
    return np.exp(-tt(d) / tau)


def sat(x, drive=1.5):
    return np.tanh(x * drive) / np.tanh(drive)


# ------------------------------------------------------------------------------------------
# space
# ------------------------------------------------------------------------------------------
def make_ir(rt60=2.4, pre=0.02, lpf=6500, width=1.0, seed=3):
    """Stereo noise-tail impulse response with air absorption. Unit energy."""
    n = ns(rt60 * 1.2)
    t = np.arange(n) / SR
    r = rng(seed)
    ir = np.stack([r.standard_normal(n), r.standard_normal(n)], axis=1) * np.exp(-6.9 * t / rt60)[:, None]
    ir = filt(ir, lp(lpf, 1))
    mid = ir.mean(axis=1, keepdims=True)
    ir = mid + (ir - mid) * width
    ir = np.concatenate([np.zeros((ns(pre), 2)), ir])
    return ir / np.sqrt(np.sum(ir ** 2))


_IR = {}


def ir(name='hall'):
    """Cached rooms: 'hall' (2.8 s) for big hits, 'room' (0.7 s) for landings and moves, 'small'
    (0.3 s, 5 ms predelay, narrow) for keys, ticks and clicks: tiny sounds get a tiny room."""
    if name not in _IR:
        _IR[name] = {'hall': lambda: make_ir(2.8, 0.025, 5500, 1.0, 3),
                     'room': lambda: make_ir(0.7, 0.008, 7000, 0.8, 5),
                     'small': lambda: make_ir(0.3, 0.005, 6000, 0.6, 7)}[name]()
    return _IR[name]


def reverb(x, room='hall'):
    """Convolution reverb, output the same length as x. High-pass the send first (250 Hz)."""
    h = ir(room) if isinstance(room, str) else room
    x = stereo(x)
    return np.stack([signal.fftconvolve(x[:, c], h[:, c])[:len(x)] for c in (0, 1)], axis=1)


# ------------------------------------------------------------------------------------------
# placement
# ------------------------------------------------------------------------------------------
def pan2(x, pan=0.0):
    """Mono -> stereo with a constant-power pan (-1 left .. +1 right)."""
    a = (float(np.clip(pan, -1, 1)) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def stereo(x):
    return pan2(x, 0.0) if x.ndim == 1 else x


def fade_tail(x, d=0.01):
    """cos^2 fade over the last d seconds (a copy): use before summing a layer into a longer sound."""
    x = x.copy()
    k = min(len(x), ns(d))
    w = np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    x[-k:] *= w[:, None] if x.ndim == 2 else w
    return x


def layer_in(base, x, gain=1.0):
    """Sum x (faded at its end) into the start of base, growing base if x is longer."""
    x = fade_tail(x) * gain
    if x.ndim != base.ndim:
        base, x = stereo(base), stereo(x)
    if len(x) > len(base):
        base = np.concatenate([base, np.zeros((len(x) - len(base),) + base.shape[1:])])
    base = base.copy()
    base[:len(x)] += x
    return base


def place(dst, x, t, gain=1.0, pan=0.0, tail=0.006):
    """Add x into the stereo buffer dst at t seconds. Mono x is panned; every placed sound gets a
    `tail`-second cos^2 fade at its end so nothing clicks where a buffer stops."""
    i = int(round(t * SR))
    n_dst = len(dst)
    if i >= n_dst or len(x) == 0:
        return
    x = pan2(x, pan) if x.ndim == 1 else x.copy()
    nf = min(len(x), int(tail * SR))
    if nf > 1:
        x[-nf:] *= (np.cos(np.linspace(0, np.pi / 2, nf)) ** 2)[:, None]
    if i < 0:
        x = x[-i:]
        i = 0
    n = min(len(x), n_dst - i)
    dst[i:i + n] += x[:n] * gain


def place_at_peak(dst, x, frac, t_peak, gain=1.0, pan=0.0):
    """Place a sound so the point at `frac` of its length lands on t_peak (a whoosh apex on the
    velocity-peak frame)."""
    place(dst, x, t_peak - frac * len(x) / SR, gain, pan)


class Bus:
    """A stereo buffer with place() helpers."""

    def __init__(self, seconds=None, n=None):
        self.x = np.zeros((n if n is not None else ns(seconds), 2))

    def place(self, x, t, gain=1.0, pan=0.0):
        place(self.x, x, t, gain, pan)

    def place_at_peak(self, x, frac, t_peak, gain=1.0, pan=0.0):
        place_at_peak(self.x, x, frac, t_peak, gain, pan)



# ------------------------------------------------------------------------------------------
# the ending, measured (track.py check, score.py and av-audit judge it the same way)
# ------------------------------------------------------------------------------------------
END_DROP_DB, END_DROP_S = 20.0, 0.15   # an ending that falls 20 dB inside 150 ms ...
END_TAIL_S = 0.3                       # ... and then has no decay (under 0.3 s more to its floor) is cut, not ended
END_DEAD_AIR_S = 1.0                   # silence after the music this long reads as the film stalling


def ending_shape(x, sr=SR):
    """How a soundtrack (mono or stereo, any rate) ends, in 10 ms frames: the body level (80th percentile of the
    audible frames in the first 85 %), the last frame within 12 dB of it, the time from there to 20 dB under it
    (drop20_s), to its floor (50 dB under it, or -80 dBFS: fall_s), the decay after the first 20 dB (tail_s) and
    the silence after the last sound (dead_air_s). The end of the file counts as silence. `abrupt`: the last
    loud moment falls END_DROP_DB inside END_DROP_S with under END_TAIL_S of decay after it, and nothing comes
    back within 24 dB (a gap the music returns from is a stop-down, not the end) (a cut, a 60 ms
    master fade over full-level music, a bed stopped dead); a hit that rings, the track's own button with its
    room, a 2-3 s fade under the end card all decay."""
    y = np.asarray(x, np.float64)
    if y.ndim == 2:
        y = y.mean(axis=1)
    w = max(1, int(round(0.01 * sr)))
    k = len(y) // w
    if k < 20:
        return dict(abrupt=False, note='too short to judge')
    env = 20 * np.log10(np.sqrt((y[:k * w].reshape(k, w) ** 2).mean(axis=1)) + 1e-12)
    env = np.concatenate([env, np.full(80, -150.0)])  # the file's end is silence
    aud = env[:int(k * 0.85)]
    aud = aud[aud > -70]
    if not len(aud):
        return dict(abrupt=False, note='no sound')
    body = float(np.percentile(aud, 80))  # the playing level: a sparse bed's gaps do not drag it down
    loud = np.flatnonzero(env[:k] >= body - 12)
    if not len(loud):
        return dict(abrupt=False, body_db=round(body, 1), note='nothing near the body level')
    i = int(loud[-1])
    start = float(env[i])
    after = env[i:]
    j20 = int(np.argmax(after <= start - END_DROP_DB))
    floor = max(start - 50.0, -80.0)
    j50 = int(np.argmax(after <= floor))
    sounding = np.flatnonzero(env[:k] > body - 40)
    last_sound = (int(sounding[-1]) + 1) if len(sounding) else 0
    drop20, fall = j20 * 0.01, j50 * 0.01
    tail = max(0.0, fall - drop20)
    # a stop-down inside the ending (a gap the music comes back from) is arrangement, not the end: only a fall
    # nothing returns from (within 24 dB of where it fell from) can be a cut
    back = bool(len(after) > j50 + 1 and float(np.max(after[j50:])) > start - 24.0)
    abrupt = bool(drop20 <= END_DROP_S + 1e-9 and tail < END_TAIL_S and not back)
    return dict(abrupt=abrupt, body_db=round(body, 1), last_loud_s=round(i * w / sr, 3), drop20_s=round(drop20, 3),
                fall_s=round(fall, 3), tail_s=round(tail, 3), dead_air_s=round(max(0.0, (k - last_sound) * w / sr), 3),
                ends_at_level=bool(i >= k - 2))


def ending_problem(shape):
    """The ending's problem in words (None when it decays): what av-audit fails and score.py and track.py check refuse."""
    if not shape or not shape.get('abrupt'):
        return None
    where = f"at {shape['last_loud_s']:.2f} s" if not shape.get('ends_at_level') else 'on the last frame, still at level'
    return (f"the music ends abruptly {where}: it falls {END_DROP_DB:g} dB in {shape['drop20_s'] * 1000:.0f} ms with "
            f"{shape['tail_s']:.2f} s of decay after it (want a decay: the track's own ending ringing out, a hit that "
            "rings 1.5 s or more, or a 2-3 s fade under the end card; never a cut)")

if __name__ == '__main__':  # a library module: --help prints what it holds
    import argparse
    argparse.ArgumentParser(description=__doc__.strip().split('\n')[0], epilog=__doc__,
                            formatter_class=argparse.RawDescriptionHelpFormatter).parse_args()
