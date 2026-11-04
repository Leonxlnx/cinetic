#!/usr/bin/env python3
"""
library.py: the sound library, real effects by action, for the cast.

A library is a library.json with its effects beside it (or under its "root" folder): each one a recording whose licence needs no
credit (Mixkit's free sound effects, CC0 recordings), with its licence record, cut to one gesture, levelled to one
loudness, measured and tagged, and filed under the actions it can play (actions.py: appear, card-land, whip,
reveal ...). `kit.py cast` draws each action's sound from earshot's bank and from the library together, matched
to the action and to the film's track; a library sound it picks is copied into the film (audio/sfx/, its licence
record beside it) and becomes the takes of that action's role, so the film rebuilds without the library.

Where the library is, first that applies: --library PATH, $CINETIC_SFX_LIBRARY, $CINETIC_HOME/sfx-library.json
(~/.cinetic/sfx-library.json): a library itself, or {"link": "<path to library.json>"}. With none, the cast uses
the bank alone.

  add      a downloaded effect (music.mjs get --kind sfx writes it with its record; a CC0 recording needs a record
           of the same form, its licence quoted from the item's own page): the first gesture is kept (from the
           onset to where it decays 45 dB under its loudest point or a new attack begins, at most the action's
           length), faded, levelled to -16 LUFS over its loudest 50 ms with the sample peak under -1 dBFS, written
           as a 24-bit 48 kHz WAV under <library>/<action>/<id>.wav with its record (file and sha256 of the cut,
           the download's own in "original"), measured and tagged:
             length     tiny < 0.12 s, short < 0.35 s, medium < 0.9 s, long
             transient  sharp (onset to peak under 8 ms), firm (under 30), soft (under 120), swell
             character  dark / warm / mid / bright (centroid under 400 Hz, 1.2 kHz, 3 kHz, above), tonal or
                        noisy, dry or ringing (20 dB decay under 60 ms or over 250 ms), wide (L/R correlation
                        under 0.7), low (more than half its energy under 150 Hz)
           and, for a tonal sound, its note (the cast tunes it to the film's key).
  listen   earshot's ears on every sound for each of its actions: a forced choice between the action's own
           description and cheap-synth alternatives (listen.py's); the winners rank first in the cast.
  list     the library by action; check: every file there, unchanged, and its licence record valid with no
           credit asked (credits.py's rules); measure: every cut measured again (after an update of these
           measures; the files stay as they are); where: which library is used.
  Every sound also keeps its power per octave band, where in them it is heard (A-weighted) and its mean power
  against its loudest 5 ms: the cast weighs them against the film's track (a sound masked there loses ground).

Usage:
  python3 scripts/audio/library.py add FILE --action ACTION[,ACTION] [--licence REC] [--id ID] [--library PATH]
  python3 scripts/audio/library.py listen [--action ACTION[,ACTION]] [--python PY]
  python3 scripts/audio/library.py list [--action ACTION] [--json]
  python3 scripts/audio/library.py check
  python3 scripts/audio/library.py measure
  python3 scripts/audio/library.py where
Exit codes: 0 done; 1 a refused or invalid input, a failed check; 2 no library (list, check, listen) or no earshot
(listen).
"""
import argparse
import datetime
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
ENV = 'CINETIC_SFX_LIBRARY'
HOME_FILE = 'sfx-library.json'
TARGET_LUFS = -16.0     # the loudest 50 ms of every library sound
CEILING_DB = -1.0
ON_DB = 30.0            # the onset: the first 5 ms within this of the loudest point
END_DB = 45.0           # the end: 50 ms held this far under the loudest point
FRESH_DB = 12.0         # a new attack: this far over the quietest point since the peak, and within 20 dB of the top
# the longest cut per action (s); the rest of a file is left out
MAX_S = {'letter': 0.4, 'detent': 0.4, 'appear': 0.6, 'press': 0.5, 'touch': 0.5, 'type': 0.5, 'jump-cut': 0.5,
         'toggle': 0.6, 'lock': 0.6, 'shutter': 0.8, 'card-land': 0.8, 'land': 0.9, 'error': 0.8, 'slide': 1.0,
         'swipe': 1.0, 'whip': 1.2, 'success': 1.5, 'chime': 1.5, 'text': 1.5, 'reveal': 2.0, 'thud': 2.0,
         'pass': 2.0, 'shape': 2.0, 'logo-lock': 2.0, 'swell': 3.0, 'build': 3.0}


class LibraryError(Exception):
    pass


# ------------------------------------------------------------------------------------------
# where, load, save
# ------------------------------------------------------------------------------------------
def home_dir():
    return os.environ.get('CINETIC_HOME') or os.path.join(os.path.expanduser('~'), '.cinetic')


def resolve(path=None):
    """(path of library.json or None, how it was found)"""
    if path:
        return os.path.abspath(path), '--library'
    if os.environ.get(ENV):
        return os.path.abspath(os.environ[ENV]), f'${ENV}'
    hp = os.path.join(home_dir(), HOME_FILE)
    if os.path.isfile(hp):
        try:
            with open(hp, encoding='utf-8') as fh:
                doc = json.load(fh)
        except (OSError, ValueError):
            return None, f'{hp} is not readable JSON'
        if isinstance(doc, dict) and doc.get('link'):
            return os.path.abspath(os.path.join(os.path.dirname(hp), doc['link'])), f'{hp} (link)'
        return hp, hp
    return None, f'no --library, no ${ENV}, no {hp}'


def empty(name='library', root='.'):
    return {'library': 1, 'name': name, 'root': root, 'updated': None, 'sounds': []}


def load(path):
    """the library at path, each sound with '_file' and '_licence' (absolute paths); raises LibraryError"""
    try:
        with open(path, encoding='utf-8') as fh:
            doc = json.load(fh)
    except FileNotFoundError:
        raise LibraryError(f'no library at {path}') from None
    except ValueError as e:
        raise LibraryError(f'{path} is not valid JSON ({e})') from None
    if not isinstance(doc, dict) or doc.get('library') != 1 or not isinstance(doc.get('sounds'), list):
        raise LibraryError(f'{path} is not a sound library ("library": 1, "sounds": [...])')
    base = os.path.join(os.path.dirname(os.path.abspath(path)), doc.get('root') or '.')
    for s in doc['sounds']:
        s['_file'] = os.path.normpath(os.path.join(base, s['file']))
        s['_licence'] = os.path.normpath(os.path.join(base, s['licence'])) if s.get('licence') else None
    doc['_path'] = os.path.abspath(path)
    return doc


def save(doc, path):
    out = dict(doc, updated=datetime.date.today().isoformat())
    out.pop('_path', None)
    out['sounds'] = [{k: v for k, v in s.items() if not k.startswith('_')} for s in doc['sounds']]
    out['sounds'].sort(key=lambda s: (s['actions'][0], s['id']))
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(json.dumps(out, indent=1, ensure_ascii=False) + '\n')


def lib_id(s):
    return f"lib:{s['id']}"


def candidates(doc, action):
    """the library's sounds for an action, in order of fit: earshot's ears first (a win over the cheap-synth
    alternatives, then its probability), then the shortest cut, then the id"""
    out = [s for s in (doc or {}).get('sounds') or [] if action in (s.get('actions') or [])]

    def key(s):
        e = (s.get('ears') or {}).get(action) or {}
        p = e.get('p')
        won = 0 if e.get('won') else 1
        return (won if p is not None else 0.5, -(p if p is not None else 0.5), s.get('dur_s') or 9, s['id'])
    return sorted(out, key=key)


# ------------------------------------------------------------------------------------------
# cutting, levelling, measuring
# ------------------------------------------------------------------------------------------
def _np():
    import numpy as np
    return np


def to48(x, fs):
    np = _np()
    if fs == SR:
        return x
    from math import gcd
    from scipy import signal
    g = gcd(SR, fs)
    return signal.resample_poly(x, SR // g, fs // g, axis=0)


def read_audio(path):
    """float64 at 48 kHz, shape (n, ch) with ch 1 or 2"""
    import soundfile as sf
    x, fs = sf.read(path, always_2d=True, dtype='float64')
    return to48(x[:, :2], fs)


def envelope(x):
    """5 ms RMS of the louder channel, per sample"""
    np = _np()
    m = np.abs(x).max(axis=1) if x.ndim == 2 else np.abs(x)
    w = max(1, int(0.005 * SR))
    return np.sqrt(np.convolve(m * m, np.ones(w) / w, mode='same'))


def first_gesture(x, max_s):
    """(start, end, why) in samples: the onset, the decay or the next attack, at most max_s"""
    np = _np()
    env = envelope(x)
    top = float(env.max()) if len(env) else 0.0
    if top <= 1e-7:
        raise LibraryError('silent')
    on = int(np.argmax(env >= top * 10 ** (-ON_DB / 20)))
    start = max(0, on - int(0.005 * SR))
    lim = min(len(env), start + int(max_s * SR))
    hold = int(0.05 * SR)
    end, why, run = lim, 'length', 0
    peak, pk, low = float(env[on]), on, float(env[on])  # this gesture's loudest point so far, and the quietest since
    for i in range(on + 1, lim):
        v = float(env[i])
        # a new sound, not a second stage of this one (a shutter's mirror, a key's release): after a near-silence,
        # or 150 ms on after a 20 dB decay
        if v > low * 10 ** (FRESH_DB / 20) and v > peak * 0.1 and (
                low < peak * 10 ** (-35 / 20) or (i - pk > int(0.15 * SR) and low < peak * 0.1)):
            end, why = max(pk + int(0.02 * SR), i - int(0.02 * SR)), 'next attack'
            break
        if v > peak:
            peak, pk, low = v, i, v
        low = min(low, v)
        if v < peak * 10 ** (-END_DB / 20):
            run += 1
            if run >= hold:
                end, why = i - hold + 1, 'decay'
                break
        else:
            run = 0
    return start, max(end, start + int(0.01 * SR)), why


def cut(x, action):
    """the first gesture of x for an action, faded and levelled: (y, info)"""
    np = _np()
    import mixkeys as MK
    max_s = MAX_S.get(action, 1.5)
    s, e, why = first_gesture(x, max_s)
    y = x[s:e].copy()
    fi = int(0.002 * SR)
    if s > 0 and len(y) > fi:
        y[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(0.015 * SR) if why == 'decay' else min(int(0.06 * SR), max(int(0.01 * SR), len(y) // 4))
    fo = min(fo, len(y))
    y[-fo:] *= np.linspace(1, 0, fo)[:, None]
    if y.shape[1] == 2 and np.allclose(y[:, 0], y[:, 1], atol=1e-6):
        y = y[:, :1]
    l50 = MK.loud_lufs(y[:, 0] if y.shape[1] == 1 else y, SR)
    g = 10 ** ((TARGET_LUFS - l50) / 20)
    pk = float(np.abs(y).max()) * g
    if pk > 10 ** (CEILING_DB / 20):
        g *= 10 ** (CEILING_DB / 20) / pk
    y = y * g
    return y, dict(cut_from_s=round(s / SR, 4), cut_to_s=round(e / SR, 4), cut_by=why)


def note_name(m):
    names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    r = int(round(m))
    return f'{names[r % 12]}{r // 12 - 1}'


def measure(y):
    """the measured features and tags of a cut (n, ch)"""
    np = _np()
    import mixkeys as MK
    mono = y.mean(axis=1) if y.ndim == 2 else y
    env = envelope(y)
    top = float(env.max())
    on = int(np.argmax(env >= top * 10 ** (-ON_DB / 20)))
    pk = int(np.argmax(env))
    below = np.nonzero(env[pk:] < top * 0.1)[0]
    t20 = round(1000 * below[0] / SR, 1) if len(below) else None
    loud = np.nonzero(env >= top * 10 ** (-50 / 20))[0]
    end = int(loud[-1]) if len(loud) else len(env) - 1
    seg = mono[on:end + 1] if end > on + 64 else mono
    n = 1 << int(min(16, max(10, math.ceil(math.log2(max(len(seg), 1024))))))
    P = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), n)) ** 2
    f = np.fft.rfftfreq(n, 1 / SR)
    band = (f >= 40) & (f <= 20000)
    tot = float(P[band].sum()) + 1e-20
    centroid = float((f[band] * P[band]).sum() / tot)
    low = float(P[(f >= 20) & (f < 150)].sum() / tot)
    high = float(P[f > 4000].sum() / tot)
    # tonal: the share of its loud frames' energy (40 Hz - 12 kHz) in narrow peaks, bins 10 dB over the median of
    # their third of an octave (a filtered noise, a whoosh or a click has a smooth spectrum, whatever its shape: near
    # 0; a struck note near 1); the note: the strongest peak of 60 Hz - 4 kHz (its octave below when that holds 30 %)
    tonal, midi = 0.0, None
    tonal = tonality(seg)
    mag = np.sqrt(P)
    sel = np.nonzero((f >= 60) & (f <= 4000))[0]
    if tonal >= 0.5 and len(sel):
        i = sel[int(np.argmax(mag[sel]))]
        f0 = f[i]
        half = int(np.argmin(np.abs(f - f0 / 2)))
        if f0 / 2 >= 60 and mag[half] >= 0.3 * mag[i]:
            f0 = f[half]
        midi = round(69 + 12 * math.log2(f0 / 440.0), 2)
    corr = round(MK.corr(y if y.ndim == 2 and y.shape[1] == 2 else y[:, 0] if y.ndim == 2 else y), 3)
    dur = len(mono) / SR
    attack = 1000 * max(0, pk - on) / SR
    bands, heard, fill = octave_bands(mono, env)
    feats = dict(dur_s=round(dur, 4), onset_s=round(on / SR, 4), peak_s=round(pk / SR, 4), end_s=round(end / SR, 4),
                 attack_ms=round(attack, 1), t20_ms=t20, centroid_hz=int(round(centroid)), low_share=round(low, 3),
                 high_share=round(high, 3), tonal=round(tonal, 3), midi=midi,
                 note=note_name(midi) if midi is not None else None, corr=corr,
                 l50_lufs=MK.loud_lufs(y[:, 0] if y.ndim == 2 and y.shape[1] == 1 else y, SR),
                 peak_db=round(20 * math.log10(max(float(np.abs(y).max()), 1e-9)), 2), bands=bands, heard=heard,
                 fill_db=fill)
    feats['tags'] = tags(feats)
    return feats


OCTAVES = [63, 125, 250, 500, 1000, 2000, 4000, 8000]  # score.py's bands for the masking check
A_WEIGHT_DB = [-26.2, -16.1, -8.6, -3.2, 0.0, 1.2, 1.0, -1.1]


def octave_bands(mono, env=None):
    """(bands, heard, fill_db) of a sound: its power share per octave band (OCTAVES), the A-weighted share
    (where it is heard: a landing by its knock, not its sub) and its mean power over its length against its loudest
    5 ms, in dB (a click near -15, a held tone near -3): with a level over the bed, what the masking check needs"""
    np = _np()
    x = np.asarray(mono, dtype=np.float64)
    P = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    e = np.array([P[(fr >= c / math.sqrt(2)) & (fr < c * math.sqrt(2))].sum() for c in OCTAVES]) + 1e-30
    h = e * 10 ** (np.array(A_WEIGHT_DB) / 10)
    env = envelope(x[:, None]) if env is None else env
    fill = 10 * math.log10(max(1e-30, float(np.mean(x * x))) / max(1e-30, float(np.max(env)) ** 2))
    return ([round(float(v), 4) for v in e / e.sum()], [round(float(v), 4) for v in h / h.sum()], round(fill, 2))


def tonality(seg):
    """0..1: the energy share of narrow spectral peaks (10 dB over the local median, 31 bins of 11.7 Hz) in the
    loud 4096-sample frames of seg, energy-weighted"""
    np = _np()
    from scipy.ndimage import median_filter
    fr, hop = 4096, 1024
    ff = np.fft.rfftfreq(fr, 1 / SR)
    fb = (ff >= 40) & (ff <= 12000)
    if len(seg) < fr:
        frames = [np.pad(seg, (0, fr - len(seg)))]
    else:
        frames = [seg[i:i + fr] for i in range(0, len(seg) - fr + 1, hop)]
    rows = []
    win = np.hanning(fr)
    for w in frames:
        q = np.abs(np.fft.rfft(w * win)) ** 2 + 1e-24
        loc = median_filter(q, size=31, mode='nearest')
        qb, lb = q[fb], loc[fb]
        e = float(qb.sum())
        rows.append((e, float(qb[qb > 10 * lb].sum()) / e))
    emax = max(r[0] for r in rows)
    sel = [(e, r) for e, r in rows if e >= emax * 0.01]
    return float(sum(e * r for e, r in sel) / max(1e-30, sum(e for e, _ in sel)))


def tags(m):
    d = m['dur_s']
    length = 'tiny' if d < 0.12 else 'short' if d < 0.35 else 'medium' if d < 0.9 else 'long'
    a = m['attack_ms']
    transient = 'sharp' if a < 8 else 'firm' if a < 30 else 'soft' if a < 120 else 'swell'
    c = m['centroid_hz']
    ch = ['dark' if c < 400 else 'warm' if c < 1200 else 'mid' if c < 3000 else 'bright']
    ch.append('tonal' if m['tonal'] >= 0.5 else 'noisy' if m['tonal'] < 0.25 else 'mixed')
    t20 = m.get('t20_ms')
    if t20 is not None and t20 < 60:
        ch.append('dry')
    elif t20 is None or t20 > 250:
        ch.append('ringing')
    if m['corr'] < 0.7:
        ch.append('wide')
    if m['low_share'] > 0.5:
        ch.append('low')
    return dict(length=length, transient=transient, character=ch)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def safe_id(s):
    return re.sub(r'[^a-z0-9]+', '-', str(s).lower()).strip('-')[:60] or 'sound'


def check_record(rec, rec_path, file):
    """problems of an effect's licence record (credits.py's rules, a sound effect, no credit asked)"""
    sys.path.insert(0, HERE)
    import credits as CR
    probs, _ = CR.check_record(rec, rec_path, file)
    if rec.get('kind') != 'sfx':
        probs.append('not a sound-effect record ("kind": "sfx")')
    if rec.get('credit_required') is not False:
        probs.append('its licence asks for a credit (or the record does not say): the library keeps effects that need none')
    return probs


def add(lib_path, file, actions, licence=None, sid=None, log=print):
    """cut, level, measure and file one effect; returns its library entry"""
    sys.path.insert(0, HERE)
    import actions as AC
    import soundfile as sf
    acts = [AC.ALIASES.get(a, a) for a in actions]
    bad = [a for a in acts if a not in AC.ACTIONS]
    if not acts or bad:
        raise LibraryError(f"--action is one or more of {', '.join(AC.ACTIONS)}" + (f" (not: {', '.join(bad)})" if bad else ''))
    if not os.path.isfile(file):
        raise LibraryError(f'no file {file}')
    rec_path = licence or os.path.splitext(file)[0] + '.licence.json'
    try:
        with open(rec_path, encoding='utf-8') as fh:
            rec = json.load(fh)
    except (OSError, ValueError) as e:
        raise LibraryError(f'no readable licence record {rec_path} ({e}): music.mjs get --kind sfx writes one') from None
    probs = check_record(rec, rec_path, file)
    if probs:
        raise LibraryError('refused (the licence record): ' + '; '.join(probs))
    try:
        x = read_audio(file)
    except Exception as e:  # noqa: BLE001
        raise LibraryError(f'cannot read {file} ({e})') from None
    y, info = cut(x, acts[0])
    feats = measure(y)
    if feats['dur_s'] < 0.02:
        raise LibraryError(f'{file}: the first gesture is under 20 ms')
    doc = load(lib_path) if os.path.isfile(lib_path) else empty()
    base = os.path.join(os.path.dirname(os.path.abspath(lib_path)), doc.get('root') or '.')
    sid = safe_id(sid or os.path.splitext(os.path.basename(file))[0])
    old = next((s for s in doc['sounds'] if s['id'] == sid), None)
    folder = os.path.join(base, acts[0])
    os.makedirs(folder, exist_ok=True)
    out = os.path.join(folder, sid + '.wav')
    sf.write(out, y.astype('float32'), SR, subtype='PCM_24')
    new_rec = dict(rec, file=os.path.basename(out), sha256=sha256_file(out), bytes=os.path.getsize(out),
                   original=dict(file=rec.get('file'), sha256=rec.get('sha256'), bytes=rec.get('bytes')),
                   modifications='cut to one gesture and levelled for the library; trimmed and levelled again for the film')
    rp = os.path.join(folder, sid + '.licence.json')
    with open(rp, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(json.dumps(new_rec, indent=1, ensure_ascii=False) + '\n')
    entry = dict(id=sid, actions=list(dict.fromkeys((old or {}).get('actions', []) + acts)) if old else acts,
                 file=os.path.relpath(out, base).replace(os.sep, '/'), licence=os.path.relpath(rp, base).replace(os.sep, '/'),
                 title=rec.get('title'), source=rec.get('source'), page=rec.get('page'), licence_id=rec.get('licence_id'),
                 sha256=new_rec['sha256'], **info, **feats, ears=(old or {}).get('ears') or {})
    doc['sounds'] = [s for s in doc['sounds'] if s['id'] != sid] + [entry]
    save(doc, lib_path)
    t = feats['tags']
    log(f"library: {sid} -> {entry['file']} ({', '.join(entry['actions'])}): {feats['dur_s']:.2f} s, {t['length']}, "
        f"{t['transient']}, {' '.join(t['character'])}" + (f", {feats['note']}" if feats['note'] else '')
        + f" (cut by {info['cut_by']})")
    return entry


def check(doc):
    """problems of a loaded library (list of str)"""
    probs = []
    seen = set()
    sys.path.insert(0, HERE)
    import actions as AC
    for s in doc['sounds']:
        sid = s.get('id')
        if sid in seen:
            probs.append(f'{sid}: listed twice')
        seen.add(sid)
        bad = [a for a in s.get('actions') or [] if a not in AC.ACTIONS]
        if not s.get('actions') or bad:
            probs.append(f"{sid}: actions {s.get('actions')} (unknown: {', '.join(bad)})")
        if not os.path.isfile(s['_file']):
            probs.append(f"{sid}: {s['file']} is missing")
            continue
        if s.get('sha256') and sha256_file(s['_file']) != s['sha256']:
            probs.append(f"{sid}: {s['file']} changed since it was added")
        if not s.get('_licence') or not os.path.isfile(s['_licence']):
            probs.append(f'{sid}: no licence record')
            continue
        with open(s['_licence'], encoding='utf-8') as fh:
            rec = json.load(fh)
        probs += [f'{sid}: {p}' for p in check_record(rec, s['_licence'], s['_file'])]
    return probs


# ------------------------------------------------------------------------------------------
# listening (inside earshot's interpreter)
# ------------------------------------------------------------------------------------------
def inner_listen(path, only, out_json):
    import earshot  # noqa: F401
    from earshot import api
    sys.path.insert(0, HERE)
    import actions as AC
    from listen import SLOP
    doc = load(path)
    res = {}
    only = {x.strip() for x in (only or '').split(',') if x.strip()}
    for s in doc['sounds']:
        for a in s['actions']:
            if only and a not in only:
                continue
            q = AC.ACTIONS[a]['query']
            try:
                m = api.match(s['_file'], q, alts=SLOP)
            except Exception as e:  # noqa: BLE001
                res.setdefault(s['id'], {})[a] = dict(error=f'{type(e).__name__}: {e}')
                continue
            alts = sorted(m.get('alts') or [], key=lambda x: -x['p'])
            p = m.get('p_vs_alts')
            res.setdefault(s['id'], {})[a] = dict(query=q, p=round(p, 3) if p is not None else None,
                                                  verdict=m.get('verdict'),
                                                  top_alt=alts[0]['query'] if alts else None,
                                                  alt_p=round(alts[0]['p'], 3) if alts else None,
                                                  won=bool(p is not None and (not alts or p >= alts[0]['p'])))
    with open(out_json, 'w', encoding='utf-8') as fh:
        json.dump(res, fh, indent=1)
    return 0


def inner_bankfeats(ids, out_json):
    """inside earshot's interpreter: each bank sound rendered at its defaults and measured like a library sound"""
    import tempfile
    from earshot import api
    res = {}
    with tempfile.TemporaryDirectory() as d:
        for i in ids:
            f = os.path.join(d, safe_id(i) + '.wav')
            try:
                api.sfx_render(i, f)
                res[i] = measure(read_audio(f))
            except Exception:  # noqa: BLE001 (a sound this earshot cannot render is left unmeasured)
                continue
    with open(out_json, 'w', encoding='utf-8') as fh:
        json.dump(res, fh, indent=1)
    return 0


def cmd_listen(a, path):
    sys.path.insert(0, HERE)
    import kit as K
    es, tried = K.find_earshot(a.python, None)
    if es is None or es.python is None:
        print('library.py: listen needs earshot\'s interpreter (' + '; '.join(tried) + f')\n  {K.INSTALL_HINT}',
              file=sys.stderr)
        return 2
    out = os.path.join(os.path.dirname(path), 'listen.json')
    p = subprocess.run([es.python, os.path.abspath(__file__), '_inner', '--library', path, '--out', out]
                       + (['--action', a.action] if a.action else []), capture_output=True, text=True,
                       encoding='utf-8', errors='replace')
    if p.returncode != 0 or not os.path.isfile(out):
        print(f"library.py: earshot failed: {(p.stderr.strip().splitlines() or ['no output'])[-1]}", file=sys.stderr)
        return 1
    with open(out, encoding='utf-8') as fh:
        res = json.load(fh)
    doc = load(path)
    won = n = 0
    for s in doc['sounds']:
        for act, r in (res.get(s['id']) or {}).items():
            if 'error' in r:
                continue
            s.setdefault('ears', {})[act] = r
            n += 1
            won += bool(r.get('won'))
    save(doc, path)
    print(f'library: listened to {n} sound-action pair(s): {won} beat every cheap-synth alternative; wrote {path}')
    return 0


# ------------------------------------------------------------------------------------------
# the CLI
# ------------------------------------------------------------------------------------------
def main(argv=None):
    ap = argparse.ArgumentParser(description='The sound library: real effects by action, for the cast.')
    ap.add_argument('cmd', choices=('add', 'listen', 'list', 'check', 'measure', 'where', '_inner', '_bankfeats'))
    ap.add_argument('file', nargs='?', help='add: the effect file (its licence record beside it)')
    ap.add_argument('--library', help='the library.json (default: $CINETIC_SFX_LIBRARY, then ~/.cinetic/sfx-library.json)')
    ap.add_argument('--action', help='add: the action(s) it plays; listen: only these (comma-separated); list: only this one')
    ap.add_argument('--licence', help='add: its licence record (default: <file stem>.licence.json)')
    ap.add_argument('--id', help='add: its id in the library (default: the file name)')
    ap.add_argument('--json', action='store_true', help='list: the ids by action as JSON')
    ap.add_argument('--out', help=argparse.SUPPRESS)
    ap.add_argument('--ids', help=argparse.SUPPRESS)
    ap.add_argument('--python', help='listen: the interpreter that has earshot')
    a = ap.parse_args(argv)
    if a.cmd == '_bankfeats':
        return inner_bankfeats([x for x in (a.ids or '').split(',') if x], a.out)
    path, how = resolve(a.library)
    if a.cmd == '_inner':
        return inner_listen(path, a.action, a.out)
    if a.cmd == 'where':
        print(f'library: {path} ({how})' if path else f'library: none ({how})')
        return 0
    try:
        if a.cmd == 'add':
            if not path:
                print(f'library.py: add needs a library: --library PATH (or ${ENV})', file=sys.stderr)
                return 1
            add(path, a.file, [x.strip() for x in (a.action or '').split(',') if x.strip()], a.licence, a.id)
            return 0
        if not path or not os.path.isfile(path):
            print(f'library.py: no library ({how})', file=sys.stderr)
            return 2
        if a.cmd == 'listen':
            return cmd_listen(a, path)
        doc = load(path)
        if a.cmd == 'measure':
            for snd in doc['sounds']:
                snd.update(measure(read_audio(snd['_file'])))
            save(doc, path)
            print(f"library: measured {len(doc['sounds'])} sound(s) again (their files unchanged); wrote {path}")
            return 0
        if a.cmd == 'check':
            probs = check(doc)
            for p in probs:
                print(f'  problem: {p}')
            print(f"library: {len(doc['sounds'])} sound(s), " + (f'{len(probs)} problem(s)' if probs else 'all files there, '
                                                               'unchanged, licences need no credit'))
            return 1 if probs else 0
        sys.path.insert(0, HERE)
        import actions as AC
        rows = {}
        for act in AC.ACTIONS:
            if a.action and act != a.action:
                continue
            cs = candidates(doc, act)
            if cs:
                rows[act] = cs
        if a.json:
            print(json.dumps({k: [s['id'] for s in v] for k, v in rows.items()}, indent=1))
            return 0
        print(f"library {path}: {len(doc['sounds'])} sound(s)")
        for act, cs in rows.items():
            print(f'  {act} ({len(cs)})')
            for s in cs:
                e = (s.get('ears') or {}).get(act) or {}
                t = s['tags']
                print(f"    {s['id']:24s} {s['dur_s']:5.2f} s {t['length']:6s} {t['transient']:6s} {' '.join(t['character']):28s}"
                      + (f" {s['note']:4s}" if s.get('note') else '     ')
                      + (f"  ears {e['p']:.2f}{' won' if e.get('won') else ''}" if e.get('p') is not None else ''))
        return 0
    except LibraryError as e:
        print(f'library.py: {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
