#!/usr/bin/env python3
"""
mixkeys.py: the level, placement and spacing helpers of an earshot 0.4 kit lock, mirrored in numpy.

cinetic plans and mixes in its own Python, and earshot lives in its own virtualenv, so plan.py and
score.py cannot import earshot. These helpers are short; each one equals earshot.forge.kit of the
version below, number for number (scripts/test/score.test.py checks the parity whenever earshot is
importable: within 0.05 dB and 0.1 ms).

  K power        K-weighted power per sample, summed over the channels as they play; a mono signal counts
                 as the two identical channels a player makes of it (dual mono at unity: +3.01 dB)
  loud_lufs(y)   -0.691 + 10 log10(the largest 50 ms (2400-sample) moving mean of the K power)
  bed_level(m,t) -0.691 + 10 log10(the median of the 50 ms block means over [t - 1 s, t)); None under
                 -60 LUFS (no bed there); raises BedError when less than 50 ms of music lies before t
  over_bed(b)    10 log10(10^(b / 10) - 1): the take alone over the bed, for a mix b dB over it
  gain_db(take, role, bed)  bed + over_bed(bed_db) - take l50_lufs, capped so the take's sample peak stays
                 under -1 dBFS; without a bed (or without bed_db / l50_lufs) the role's level_db
  place(take, role, cue)    cue + offset_ms / 1000 - take[<align>_s]: where the take file starts
  space_run(times, gap_ms)  in time order, each time at least the previous one + the gap
  corr(y)        L / R correlation (1 for mono)

Works at 48 kHz (the rate of every kit take and of the mixer). Other rates are resampled first with
scipy (earshot uses soxr there, so parity is only claimed at 48 kHz).
"""
import numpy as np

EARSHOT_VERSION = '0.4.0'   # the earshot.forge.kit these helpers mirror
SR = 48000
L_WIN = 2400                # 50 ms at 48 kHz: the loudest-window measure of bed_db
BED_SPAN_S = 1.0            # bed_level(): the music's level over the second before the cue
BED_FLOOR_LUFS = -60.0      # bed_level(): a quieter bed is no bed
CEILING_DB = -1.0           # gain_db never lifts a take's sample peak over this
# ITU-R BS.1770 K-weighting at 48 kHz (high shelf, then the RLB high-pass); master.py uses the same numbers
K_SOS = np.array([[1.53512485958697, -2.69169618940638, 1.19839281085285, 1.0, -1.69065929318241, 0.73248077421585],
                  [1.0, -2.0, 1.0, 1.0, -1.99004745483398, 0.99007225036621]])


class BedError(ValueError):
    """bed_level() was asked about a moment with less than 50 ms of music before it"""


def _resample(x, sr):
    if sr == SR:
        return x
    from math import gcd
    from scipy import signal
    g = gcd(SR, int(sr))
    return signal.resample_poly(x, SR // g, int(sr) // g, axis=0)


def _chans(x):
    x = np.asarray(x, np.float64)
    return x.T if x.ndim == 2 else x[None]


def kweight(m):
    """K-weighting of one channel (48 kHz)."""
    from scipy import signal
    return signal.sosfilt(K_SOS, m)


def _movmax(p, n):
    """the largest mean of n consecutive values (the whole mean when shorter)"""
    if len(p) < n:
        return float(p.sum() / n)
    c = np.concatenate([[0.0], np.cumsum(p)])
    return float((c[n:] - c[:-n]).max() / n)


def kpower(x):
    """K-weighted power per sample summed over the channels as they play (a mono signal as dual mono)."""
    ch = _chans(x)
    tot = sum(kweight(c) ** 2 for c in ch)
    return 2.0 * tot if len(ch) == 1 else tot


def loud_lufs(y, sr=SR, win=None):
    """The loudest 50 ms of a sound, K-weighted over the channel sum of powers, on the LUFS scale."""
    x = _resample(np.asarray(y, np.float64), sr)
    return round(float(-0.691 + 10 * np.log10(_movmax(kpower(x), win or L_WIN) + 1e-24)), 2)


def bed_level(music, t, sr=SR):
    """The bed's level before a cue at t seconds: the median of its 50 ms K-weighted levels over the
    second before t (LUFS scale). None under BED_FLOOR_LUFS (no bed there). BedError when less than
    50 ms of music lies before t. music: samples (n,) or (n, ch) at sr."""
    x = _resample(np.asarray(music, np.float64), sr)
    b, e = int(max(0.0, t - BED_SPAN_S) * SR), int(max(0.0, t) * SR)
    seg = x[b:e]
    k = len(seg) // L_WIN
    if k < 1:
        raise BedError(f'bed_level: no music before t = {t:g} s')
    tot = kpower(seg)[:k * L_WIN].reshape(k, L_WIN).mean(1)
    lv = round(float(-0.691 + 10 * np.log10(np.median(tot) + 1e-24)), 2)
    return None if lv < BED_FLOOR_LUFS else lv


def block_levels(music, sr=SR):
    """(block start s, LUFS) of every 50 ms block of a bed: the series bed_level() takes medians of."""
    x = _resample(np.asarray(music, np.float64), sr)
    p = kpower(x)
    k = len(p) // L_WIN
    lv = -0.691 + 10 * np.log10(p[:k * L_WIN].reshape(k, L_WIN).mean(1) + 1e-24)
    return np.arange(k) * L_WIN / SR, lv


def over_bed(bed_db):
    """The take's own loudest 50 ms over the bed for a mix bed_db over it (the two add as powers)."""
    return float(10 * np.log10(10 ** (float(bed_db) / 10) - 1.0))


def gain_db(take, role, bed_lufs=None, ceiling_db=CEILING_DB):
    """The gain (dB) for one take file on one cue (take / role = rows of kit.lock.json): with the role's
    bed_db, the take's l50_lufs and a bed there, bed + over_bed(bed_db) - l50_lufs, never past
    ceiling_db at the take's sample peak; otherwise the role's level_db."""
    if bed_lufs is not None and bed_lufs >= BED_FLOOR_LUFS and role.get('bed_db') is not None \
            and take.get('l50_lufs') is not None:
        g = bed_lufs + over_bed(role['bed_db']) - take['l50_lufs']
        if take.get('peak_db') is not None:
            g = min(g, ceiling_db - take['peak_db'])
        return round(float(g), 2)
    return float(role.get('level_db') or 0.0)


def place(take, role, cue_s):
    """Where a take file starts (s) so its sync point (the role's align) lands on the cue shifted by
    the role's offset_ms (negative = the sound leads the picture). May be negative: the caller trims."""
    a = role.get('align') or 'onset'
    return round(float(cue_s + float(role.get('offset_ms') or 0.0) / 1000.0 - float(take[f'{a}_s'])), 4)


def space_run(times, min_gap_ms):
    """Cue times (s) of a run pushed apart to at least min_gap_ms, in time order."""
    out, gap = [], float(min_gap_ms or 0.0) / 1000.0
    for t in sorted(float(x) for x in times):
        out.append(round(max(t, out[-1] + gap), 4) if out else t)
    return out


def corr(y):
    """L / R correlation of a take (1 for mono): sum(L R) / sqrt(sum L^2 sum R^2)."""
    y = np.asarray(y, np.float64)
    if y.ndim == 1 or y.shape[1] == 1:
        return 1.0
    L, R = y[:, 0], y[:, 1]
    return float((L * R).sum() / (np.sqrt((L * L).sum() * (R * R).sum()) + 1e-20))


if __name__ == '__main__':  # a library module: --help prints what it holds
    import argparse
    argparse.ArgumentParser(description=__doc__.strip().split('\n')[0], epilog=__doc__,
                            formatter_class=argparse.RawDescriptionHelpFormatter).parse_args()
