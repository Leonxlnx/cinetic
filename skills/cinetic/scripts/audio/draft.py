#!/usr/bin/env python3
"""
draft.py: placeholder effect voices for a draft soundtrack (numpy + scipy, 48 kHz, deterministic).

score.py imports this module only under --draft, to hear the timing of a cue list before the film's
earshot kit is rendered. A draft is never deliverable: its report says "draft": true, every gate and
deliver.sh refuse it, and nothing here makes music (no pads, drones, chords, basses or drums). Each
voice is one effect: a tick, a knock, a key, a click, a pop, a landing, a whoosh, a hit.

Conventions are dsp.py's: SR 48000, seconds and Hz, deterministic seeds, mono (n,) or stereo (n, 2).
"""
import numpy as np

from dsp import (SR, bp, colored, filt, hp, lp, mtof, noise, ns, rng, sat, saw, sine, stereo, sweep,  # noqa: F401
                 tt)


def sub_boom(f0=104, f1=52, glide=0.12, d=2.5, seed=12, tau=0.9):
    """Sub thump gliding from f0 onto f1 (the key's root), decaying with time constant tau: the
    weight under a placeholder hit, drop or heavy landing."""
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / glide)
    x = sine(f, d) * np.exp(-t / tau) + sine(f * 2, d) * np.exp(-t / 0.25) * 0.25
    thump = filt(noise(d, seed), lp(180, 2)) * np.exp(-t / 0.05) * 0.6
    y = sat(x, 1.4) * 0.9 + thump
    a = min(len(y), max(1, int(0.003 * SR)))  # a 3 ms raised-cosine attack: lands on silence without a click
    y[:a] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    return y


def clap(d=0.45, seed=13):
    """Four noise bursts 9-10 ms apart, the last one with a short tail (the crack of a placeholder hit)."""
    t = tt(d)
    n = filt(noise(d, seed), bp(900, 5200, 2))
    env = np.zeros_like(t)
    for k, off in enumerate((0, 0.009, 0.019, 0.028)):
        env += (t >= off) * np.exp(-np.maximum(t - off, 0) / (0.006 if k < 3 else 0.11))
    return n * env * 0.8


# ------------------------------------------------------------------------------------------
# clock, UI and foley-like voices
# ------------------------------------------------------------------------------------------
def modal(t, modes, pitch=1.0):
    """Sum of damped sines [(f Hz, tau s, gain), ...] over the time axis t, each from phase 0 so the
    onset is continuous; modes above 0.45*SR are skipped. The body of every key, tick and click."""
    x = np.zeros_like(t)
    for f, tau, g in modes:
        f = f * pitch
        if g and f < SR * 0.45:
            x += g * np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
    return x


def soft_onset(t, a=0.0004):
    """1 - exp(-t/a): a soft attack of time constant a that starts from exact zero (no step)."""
    return 1 - np.exp(-t / a)


def tick(freq=1567.98, d=0.07, tau=0.010, body=0.8, seed=21, dark=False):
    """Clock tick, a small wooden mallet rather than a beep: the tuned fundamental (decay tau, 8-12 ms),
    free-bar partials at 2.76x and 5.4x dying 2.5-7x faster, and a 0.5 ms low-passed felt transient.
    dark=True is the tock: a quieter 2.76x partial and a duller transient."""
    t = tt(d)
    x = modal(t, [(freq, tau, 1.0), (freq * 2.76, min(0.004, tau * 0.4), 0.12 if dark else 0.22),
                  (freq * 5.4, 0.0015, 0.03 if dark else 0.06)]) * body
    x += filt(noise(d, seed), lp(2500 if dark else 4000, 2)) * np.exp(-t / 0.0005) * 0.3
    return filt(x * soft_onset(t, 0.0003), hp(150, 2))


def tock(freq=1100, d=0.12, tau=0.03, low=0.4, seed=22):
    """Wooden knock: noise ringing a resonant band at freq, plus a small 140 Hz thump."""
    t = tt(d)
    exc = noise(d, seed) * np.exp(-t / 0.004)
    res = filt(exc, bp(freq * 0.85, freq * 1.18, 2)) * 6 * np.exp(-t / tau)
    return res + np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.025) * low


# Modal keys, set to the house key profile: a dark "tock" (spectral peak 0.7-1.0 kHz, centroid about
# 1.0-1.8 kHz, 2-5 kHz share about 0.1-0.15), attack 1-4 ms, -20 dB within about 6 ms, gone in about 12 ms.
# Per kind: body f1 range (Hz) and decay, plate ratio to f1 and decay, case thud (Hz, decay, gain),
# definition tick (ratio to f1, decay, gain), excitation low-pass, length (s). Space and return are lower
# (centroid ~700 Hz), a little longer, and always bottom out (`second`).
_KEY = {
    'letter': dict(f1=(760, 940), tau1=(0.0024, 0.0030), r2=(1.9, 2.15), tau2=(0.0014, 0.0018), g2=1.0, thud=(240, 300),
                   tau3=0.0030, g3=0.35, r4=(3.3, 3.8), tau4=0.0011, g4=1.0, exc=6000, d=0.03),
    'space': dict(f1=(370, 410), tau1=(0.0048, 0.0054), r2=(2.6, 2.8), tau2=(0.0028, 0.0032), g2=1.3, thud=(140, 160),
                  tau3=0.0055, g3=0.40, r4=(6.2, 6.8), tau4=0.0009, g4=0.8, exc=4000, d=0.05),
    'return': dict(f1=(400, 440), tau1=(0.0042, 0.0048), r2=(2.5, 2.7), tau2=(0.0025, 0.0029), g2=1.3, thud=(150, 170),
                   tau3=0.0060, g3=0.40, r4=(5.8, 6.4), tau4=0.0009, g4=0.8, exc=4000, d=0.06),
}
KEY_STYLES = ('soft', 'mechanical', 'pitched', 'muted')
_PENTA_C = (67, 69, 72, 74, 76)  # G4 A4 C5 D5 E5: the pitched keys' default tones (400-700 Hz)


def key_click(seed=0, pitch=1.0, d=None, style='soft', kind='letter', strike=None, level=1.0, keyup=None,
              note=None, tau=1.0, second=None, second_db=None):
    """One keystroke, modelled as a small damped object rather than a noise burst: a dark "tock" with a
    body mode at 760-940 Hz (the spectral peak), a plate mode at ~2.0x, a case thud near 270 Hz and a
    1 ms definition tick at ~3.5x, excited by a 0.4 ms low-passed noise transient under a 0.7 ms soft
    onset, low-passed at 6 kHz and high-passed at 150 Hz.

    seed    the key's identity: the same seed is the same key (body pitch, mode ratios, decays drawn once)
    pitch   multiplies every mode; keep the per-press drift within +-1.5%
    d       length in seconds (default per kind: letter 0.03, space 0.05, return 0.06, plus the
            secondary transient or keyup)
    style   'soft' (default), 'mechanical' (stiffer and crisper, a bottom-out tick 4-5 ms later),
            'pitched' (a felt mallet tuned to `note`) or 'muted' (dull, short)
    kind    'letter', 'space', 'return' or 'back' (backspace: a letter 5% higher, 15% shorter)
    strike  this press: a new noise waveform and +-1% mode detune every strike (default: seed)
    level   press strength (1 = normal); the output peaks at `level`
    keyup   seconds after the press for a separate release click (70-120 ms); None (default) for none
    note    Hz for style 'pitched' (default: a C major pentatonic tone in 400-700 Hz from seed)
    tau     multiplies every decay (score.py shortens them when keys come fast)
    second  seconds after the press for the secondary transient (the key bottoming out, 25-35 ms later on
            about half the letters); None = the kind's default (none on letters; 32 ms on space and return)
    second_db  its level re the press (default -13.5 dB on letters, -10 dB on space and return)"""
    if style not in KEY_STYLES or kind not in ('letter', 'space', 'return', 'back'):
        raise ValueError(f'key style {style!r} / kind {kind!r}: styles {", ".join(KEY_STYLES)}; '
                         'kinds letter, space, return, back')
    back = kind == 'back'
    wide = kind in ('space', 'return')
    P = _KEY['letter' if back else kind]
    k = rng(1000 + int(seed) + {'letter': 0, 'back': 0, 'space': 500, 'return': 600}[kind])
    s = rng(50000 + 7919 * int(seed if strike is None else strike))
    u = [k.random() for _ in range(6)]
    pick = lambda rg, x: rg[0] + (rg[1] - rg[0]) * x  # noqa: E731
    f1 = pick(P['f1'], u[0]) * (1.05 if back else 1.0)
    tau1, tau2 = pick(P['tau1'], u[1]), pick(P['tau2'], u[3])
    modes = [[f1, tau1, 1.0], [f1 * pick(P['r2'], u[2]), tau2, P['g2']],
             [pick(P['thud'], u[4]), P['tau3'], P['g3']], [f1 * pick(P['r4'], u[5]), P['tau4'], P['g4']]]
    exc_lp, exc_g, onset, out_lp, length = P['exc'], 0.5, 0.0007, 6000.0, P['d']
    if style == 'mechanical':  # stiffer, a little higher and drier; a crisper onset and a bottom-out
        modes[0][0] *= 1.12
        modes[0][1] *= 0.85
        modes[3][2] *= 0.6
        exc_lp, exc_g, onset, out_lp = exc_lp * 1.1, 0.6, 0.0003, 7000.0
    elif style == 'muted':  # a fingertip on a laptop: no tick, a dull short body
        modes[0][1] *= 0.8
        modes[1][2], modes[2][2], modes[3][2] = 0.2, P['g3'] * 1.3, 0.0
        exc_lp, exc_g, onset, out_lp, length = 2200.0, 0.3, 0.0012, 2500.0, length * 0.85
    elif style == 'pitched':  # a felt mallet on a small bar: tuned body, a quiet 3.93x overtone, no tick
        f1 = note if note else mtof(_PENTA_C[int(seed) % len(_PENTA_C)] - (12 if wide else 0))
        long_ = 0.035 if not wide else 0.06
        modes = [[f1, long_, 1.0], [f1 * 3.93, 0.008, 0.2], [pick(P['thud'], u[4]), 0.012, 0.12]]
        exc_lp, exc_g, onset, out_lp, length = 3000.0, 0.45, 0.0008, 5000.0, long_ * 4
    if back:
        for m in modes:
            m[1] *= 0.85
        modes[-1][2] *= 0.85
    if second is None:
        second = 0.032 if wide and style != 'pitched' else 0.0
    if second_db is None:
        second_db = -10.0 if wide else -13.5
    if d is None:
        d = length + max(keyup or 0.0, (second + 0.025) if second else 0.0)
    bright = float(np.clip(1 + 0.25 * (level - 1) + 0.08 * s.standard_normal(), 0.6, 1.6))
    t = tt(d)
    detune = [1 + (0.0 if style == 'pitched' else 0.01) * s.standard_normal() for _ in modes]
    x = modal(t, [(f * dt, tau_ * tau, g) for (f, tau_, g), dt in zip(modes, detune)], pitch)
    nz = noise(d, 777 + int(seed if strike is None else strike) % 100000)
    exc = filt(filt(nz, lp(exc_lp * bright, 2)), hp(300, 2)) * np.exp(-t / 0.0004) * exc_g
    y = (x + exc) * soft_onset(t, onset)
    peak0 = np.max(np.abs(y)) + 1e-12
    if style == 'mechanical':  # the bottom-out: the plate and a short transient again, 9 dB down
        i = ns(0.004 + 0.001 * s.random())
        if i < len(t):
            tb = t[:len(t) - i]
            bo = modal(tb, [(modes[1][0] * 1.03, 0.0015, 0.6), (modes[0][0] * 1.4, 0.0012, 0.4)], pitch)
            bo += filt(nz[i:], lp(exc_lp * bright, 2)) * np.exp(-tb / 0.0003) * 0.3
            y[i:] += bo * soft_onset(tb, 0.0002) * 0.35
    if second and second < d - 0.005:  # the cap bottoms out and rattles: the same key, smaller and higher
        i = ns(second)
        tb = t[:len(t) - i]
        sec = modal(tb, [(f * 1.08, tau_ * 0.7, g) for f, tau_, g in modes[:3]], pitch)
        sec += filt(filt(noise(len(tb) / SR, 131 + int(seed if strike is None else strike) % 100000),
                         lp(exc_lp, 2)), hp(300, 2)) * np.exp(-tb / 0.0003) * exc_g
        sec *= soft_onset(tb, onset)
        y[i:] += sec * (peak0 * 10 ** (second_db / 20) / (np.max(np.abs(sec)) + 1e-12))
    if keyup and keyup < d - 0.01:
        i = ns(keyup)
        tu = t[:len(t) - i]
        if style == 'pitched':  # the felt lifts: no tone, just a little air and the thud
            up = modal(tu, [(modes[2][0] * 1.18, 0.008, 0.5)], pitch)
        else:
            up = modal(tu, [(f * 1.18, tau_ * 0.7, g) for f, tau_, g in modes[:2]] + [(modes[0][0] * 1.18 * 4.3, 0.0005, 0.15)], pitch)
        up += filt(noise(len(tu) / SR, 99 + int(seed if strike is None else strike) % 100000), lp(6000, 2)) * np.exp(-tu / 0.0004) * 0.3
        up *= soft_onset(tu, 0.0004)
        y[i:] += up * (peak0 * (0.1 if style == 'muted' else 0.32) / (np.max(np.abs(up)) + 1e-12))
    y = filt(filt(y, lp(out_lp * bright, 1)), hp(150 if not wide else 90, 2))
    return y * (level / (np.max(np.abs(y)) + 1e-12))


def thock(freq=950, seed=0, style='soft', kind='space', strike=None, level=1.0, keyup=None, d=None, note=None, tau=1.0,
          second=None, second_db=None):
    """Space bar (kind='space') or return (kind='return'): the same modal key family, lower and a
    little longer, always bottoming out about 32 ms after the press; the other arguments are key_click's."""
    return key_click(seed, freq / 950.0, d, style, kind, strike, level, keyup, note, tau, second, second_db)


def ui_click(ping=1975.53, d=0.14, seed=23, release=0.085, tone=None, strike=None, release_db=-1.5):
    """Cursor press and release: one bright, very short voice per film. A tuned mode at `ping` (tau
    3 ms), partials at ~1.5x and ~2.2x dying faster, and a 0.4 ms band-passed transient under a 0.6 ms
    soft onset, high-passed at 600 Hz (4th order). release: seconds after the press for the release
    (about 85 ms), 6% higher; release_db its level; tone: a confirm tone 12 dB under the press."""
    if release and release > d - 0.03:
        d = release + 0.04
    v = rng(9000 + int(seed))
    r2, r3 = 1.42 + 0.1 * v.random(), 2.1 + 0.2 * v.random()
    s = rng(9100 + int(seed if strike is None else strike))
    f = ping * (1 + 0.0015 * s.standard_normal())
    t = tt(d)
    exc_seed = 23 + int(seed if strike is None else strike) % 100000

    def press(tt_, f_, k, seed_):
        x = modal(tt_, [(f_, 0.0030 * k, 1.0), (f_ * r2, 0.0022 * k, 1.0), (f_ * r3, 0.0014 * k, 0.8)])
        x += filt(noise(len(tt_) / SR, seed_), bp(1500, 9000, 2)) * np.exp(-tt_ / 0.0004) * 0.5
        return x * soft_onset(tt_, 0.0006)

    y = press(t, f, 1.0, exc_seed)
    peak0 = np.max(np.abs(y)) + 1e-12
    if release:
        i = ns(release)
        tu = t[:len(t) - i]
        rel = press(tu, f * 1.06, 0.85, exc_seed + 1)
        y[i:] += rel * (peak0 * 10 ** (release_db / 20) / (np.max(np.abs(rel)) + 1e-12))
    y = filt(y, hp(600, 4))
    y /= np.max(np.abs(y[:ns(min(d, (release or d)))])) + 1e-12
    if tone:
        y += sine(tone, d) * soft_onset(t, 0.001) * np.exp(-t / 0.06) * 0.25
    return y


def crisp_tick(seed=0, d=0.05, freq=None):
    """A crisp tick for counters locking, list rows and build ticks: three inharmonic modes near 3.1,
    4.4 and 6.2 kHz drawn from `seed`, and a 0.5 ms band-passed transient, high-passed at 1.5 kHz."""
    r = rng(7000 + int(seed))
    f0 = float(freq) * (1 + 0.01 * r.standard_normal()) if freq else 2800 + 600 * r.random()
    t = tt(d)
    x = modal(t, [(f0, 0.0050, 1.0), (f0 * (1.38 + 0.1 * r.random()), 0.0035, 0.8),
                  (f0 * (1.95 + 0.15 * r.random()), 0.0020, 0.5)])
    x += filt(noise(d, 7100 + int(seed)), bp(2000, 9000, 2)) * np.exp(-t / 0.0005) * 0.6
    y = filt(x * soft_onset(t, 0.0007), hp(1500, 2))
    return y / (np.max(np.abs(y)) + 1e-12)


def snap(root=51.91, d=0.6, weight=1.0, seed=24):
    """Lock-in snap: click + body at 4x root + a low tail on the root."""
    t = tt(d)
    c = filt(noise(d, seed), bp(1800, 9000, 2)) * np.exp(-t / 0.003) * 1.2
    body = sine(4 * root * (1 + 0.8 * np.exp(-t / 0.008)), d) * np.exp(-t / 0.045) * 0.7
    low = sine(root * (1 + 0.5 * np.exp(-t / 0.02)), d) * np.exp(-t / 0.16) * weight
    return sat(c + body + low, 1.3)


def blip(freq=880, up=True, d=0.12):
    """Pop blip, mallet-like: a sine that slides 2 semitones into freq over ~20 ms, a 2.5 ms attack,
    and a 2.76x partial 15 dB down that dies in 3 ms."""
    t = tt(d)
    f = freq * 2 ** ((-2 if up else 2) / 12 * np.exp(-t / 0.007))
    x = sine(f, d) * np.exp(-t / 0.02) + sine(2.76 * f, d) * np.exp(-t / 0.003) * 0.18
    return x * np.minimum(1, t / 0.0025)


def word_blip(freq=660.0, d=0.048, glide=2.5, seed=0):
    """One blip per typed word (typing style "word"): a pitched sine 36-60 ms long gliding `glide`
    semitones up into freq, a 4 ms raised-cosine attack, a decay of tau 12 ms, a 2nd harmonic 18 dB
    down and a 6 ms fade to zero at its end. Peaks at 1. seed is unused (kept for a uniform signature)."""
    d = float(np.clip(d, 0.036, 0.06))
    t = tt(d)
    f = freq * 2 ** (-glide / 12 * np.exp(-t / 0.006))
    x = sine(f, d) + 0.125 * sine(2 * f, d)
    a = np.minimum(1, t / 0.004)
    env = (0.5 - 0.5 * np.cos(np.pi * a)) * np.exp(-np.maximum(t - 0.004, 0) / 0.012)
    y = x * env
    k = min(len(y), ns(0.006))
    y[-k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    return y / (np.max(np.abs(y)) + 1e-12)


def fm_bell(freq, d=3.0, index=2.2, ratio=3.5, tau=1.2):
    """FM bell (ratio 3.5, index ~2, modulator decaying in 0.35 s): one placeholder bell note."""
    d = max(d, 5 * tau)
    t = tt(d)
    mod = np.sin(2 * np.pi * freq * ratio * t) * index * np.exp(-t / 0.35)
    x = np.sin(2 * np.pi * freq * t + mod) * np.exp(-t / tau)
    x += np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-t / (tau * 0.35)) * 0.15
    return x * np.minimum(1, t / 0.003)


# ------------------------------------------------------------------------------------------
# moves: whoosh, riser, suck, swell (all stereo)
# ------------------------------------------------------------------------------------------
def whoosh(d=0.8, f0=120, f1=750, f2=220, apex=0.5, travel=0.0, air=0.025, seed=31):
    """Move whoosh. A wide band of 1/f^1.6 noise sweeps f0 -> f1 at the apex -> f2; the envelope
    rises as (u/apex)^2 and decays after. travel pans it from -0.6*travel to +0.6*travel."""
    n = ns(d)
    u = np.arange(n) / n
    cut = np.where(u < apex, f0 * (f1 / f0) ** (u / apex), f1 * (f2 / f1) ** ((u - apex) / (1 - apex)))
    x = np.stack([colored(d, seed), colored(d, seed + 1)], axis=1)
    y = sweep(x, cut, 'band', q=1.8) * 1.6
    y += filt(np.stack([noise(d, seed + 2), noise(d, seed + 3)], axis=1), bp(3000, 9000, 2)) * air
    env = np.where(u < apex, (u / apex) ** 2, np.exp(-(u - apex) * d / 0.18))
    y *= env[:, None]
    ang = (np.linspace(-0.6, 0.6, n) * travel + 1) * np.pi / 4
    y[:, 0] *= np.cos(ang) * 1.4
    y[:, 1] *= np.sin(ang) * 1.4
    return y


def riser(d=2.0, f0=250, f1=7000, target=None, seed=32):
    """Noise band sweeping up plus (if target Hz is given) two saws gliding an octave up onto target.
    A placeholder only: a rising synth sweep reads as cheap in a film."""
    n = ns(d)
    u = np.arange(n) / n
    cut = f0 * (f1 / f0) ** (u ** 1.3)
    x = np.stack([noise(d, seed), noise(d, seed + 1)], axis=1)
    y = sweep(x, cut, 'band') * (u ** 2.2)[:, None] * 0.9
    if target:
        f = target * 2 ** (u ** 2 - 1.0)
        s = saw(f, d) * 0.5 + saw(f * 1.005, d, 0.37) * 0.5
        s = sweep(s, 400 + 5000 * u ** 2, 'low') * u ** 2.5 * 0.35
        y += stereo(s) * np.sqrt(2)
    return y


def suck(d=0.35, seed=33):
    """Reverse suck into an implosion or a silence: bright to dark, apex at 85% of its length."""
    return whoosh(d, 2500, 900, 200, apex=0.85, air=0.04, seed=seed)


def swell(freqs, d=1.0, seed=34):
    """Reverse swell whose loudest point is its last sample: tones plus an airy band, rising as u^3."""
    n = ns(d)
    t = np.arange(n) / SR
    u = t / d
    tone = np.zeros(n)
    for k, f in enumerate(freqs):
        tone += (sine(f, d, 0.13 * k) + 0.18 * sine(2 * f, d) + 0.06 * saw(f, d, 0.29 * k)) / len(freqs)
    tone = filt(tone, lp(2500, 1))
    air_ = sweep(noise(d, seed), 600 * (6000 / 600) ** u, 'band') * 0.35
    y = (tone + air_) * u ** 3
    y[-ns(0.012):] *= np.linspace(1, 0, ns(0.012))
    return stereo(y)


if __name__ == '__main__':  # a library module: --help prints what it holds
    import argparse
    argparse.ArgumentParser(description=__doc__.strip().split('\n')[0], epilog=__doc__,
                            formatter_class=argparse.RawDescriptionHelpFormatter).parse_args()
