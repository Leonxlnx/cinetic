#!/usr/bin/env python3
"""Tests for scripts/audio/track.py on test beds made in code (noise thumps, ticks and bursts on a beat
grid: test signals, never music, never files in the repo).

The main bed: 124 BPM, the first downbeat at 0.37 s, 24 bars (intro 1-4, body 5-12, break 13-14 whose
last 0.42 s stop dead, peak 15-22, outro 23-24) and one final thump on bar 25. Checks:
  - analyze: the tempo within 0.05 BPM, bar 1 on its attack (+-5 ms), a confident downbeat, the stop
    found (and no groove trough taken for one), the entry after the break marked as a drop, the ending
    a button on the final thump, no bars counted in the file's trailing silence; a second run of the same
    file and settings keeps the analysis, another profile or --force makes it again
  - edit --end stop: the reveal's film bar holds the entry, whole bars, at most one splice per 8 bars,
    the bed stops on the bar line after the body; --end button back-times the final hit; --map writes the
    bars given by hand, and refuses a gap or a button ending off the bar before the final hit
  - grid: src/music.ts and music.js carry the MUSIC grid in film frames (t0, downbeats, ending), and the
    TypeScript file loads under node's type stripping when node can do it
  - check: every join measured on the edited bed (attack on the film downbeat, no click)
  - a bed with no bar accent (identical clicks): analyze exits 2 (downbeat unresolved), edit refuses,
    and --phase N resolves it
  - a bed that ends on a hit and a 2.5 s ring over level bars (the ring's tail a near-silent last bar):
    the ending is a ring on that hit, not a fade, and edit --end ring accepts it
  - add: an NC licence and a record without licence_seen are refused; a CC BY record needs its credit

Usage: python3 skills/cinetic/scripts/test/track.test.py [--keep DIR]
(needs numpy, scipy, soundfile, librosa and ffmpeg). Exit 0 when every check passes, 1 otherwise.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
TRACK = os.path.join(HERE, '..', 'audio', 'track.py')
SR = 48000
BPM, T0, BARS, STOP_S = 124.0, 0.37, 24, 0.42
BEAT = 60.0 / BPM
BAR = 4 * BEAT
FAILS = []


def check(ok, what):
    print(('ok   ' if ok else 'FAIL ') + what)
    if not ok:
        FAILS.append(what)


def run(args, cwd):
    return subprocess.run([sys.executable, TRACK] + args, capture_output=True, text=True, cwd=cwd)


def part_of(b):
    return 'intro' if b < 4 else 'body' if b < 12 else 'break' if b < 14 else 'peak' if b < 22 else 'outro'


def bed(accents=True, seed=1):
    """The test bed (stereo float32 at 48 kHz). accents=False: one identical click on every beat, with no
    bar accent and no sections (a downbeat no analysis can find)."""
    n = int((T0 + (BARS + 1) * BAR + 3.0) * SR)
    y = np.zeros(n)
    r = np.random.default_rng(seed)

    def add(x, t, g):
        i = int(round(t * SR))
        if 0 <= i < n:
            m = min(len(x), n - i)
            y[i:i + m] += x[:m] * g

    def u(d):
        return np.arange(int(d * SR)) / SR
    lowp = signal.butter(2, 120, 'low', fs=SR, output='sos')
    hpf = signal.butter(2, 5000, 'high', fs=SR, output='sos')
    bpf = signal.butter(2, [400, 2500], 'band', fs=SR, output='sos')

    def thump(g):  # a low noise thump with a 1.5 ms attack
        t = u(0.3)
        return signal.sosfilt(lowp, r.standard_normal(len(t))) * 8 * np.exp(-t / 0.09) * np.minimum(1, t / 0.0015) * g

    def tick():
        t = u(0.04)
        return signal.sosfilt(hpf, r.standard_normal(len(t))) * np.exp(-t / 0.006) * 0.4

    def burst():
        t = u(0.15)
        return signal.sosfilt(bpf, r.standard_normal(len(t))) * np.exp(-t / 0.04) * 0.8
    if not accents:
        for k in range(int((BARS + 1) * 4)):
            add(thump(0.6), T0 + k * BEAT, 1.0)
        y = y / (np.abs(y).max() + 1e-9) * 0.9
        return np.stack([y, y], 1).astype(np.float32)
    floor = signal.sosfilt(signal.butter(2, [200, 3000], 'band', fs=SR, output='sos'), r.standard_normal(n)) * 0.02
    env = np.zeros(n)
    for b in range(BARS):
        tb = T0 + b * BAR
        part = part_of(b)
        lvl = {'intro': 0.25, 'body': 0.6, 'break': 0.2, 'peak': 1.0, 'outro': 0.35}[part]
        stop_at = tb + BAR - STOP_S if b == 13 else None
        env[int(tb * SR):int((tb + BAR) * SR)] = lvl
        if stop_at:
            env[int(stop_at * SR):int((tb + BAR) * SR)] = 0.0
        for k in range(4):
            tk = tb + k * BEAT
            if stop_at and tk >= stop_at:
                continue
            if part in ('body', 'peak', 'outro'):
                add(thump(1.0 if k == 0 else 0.45), tk, lvl)
                if k in (1, 3):
                    add(burst(), tk, lvl)
            if not (stop_at and tk + BEAT / 2 >= stop_at):
                add(tick(), tk + BEAT / 2, lvl)
    add(thump(1.0), T0 + BARS * BAR, 0.9)
    y += floor * signal.sosfilt(signal.butter(1, 30, 'low', fs=SR, output='sos'), env)
    y = y / (np.abs(y).max() + 1e-9) * 0.9
    return np.stack([y, y], 1).astype(np.float32)


RING_BARS = 12


def ring_bed(seed=5):
    """A bed that ends on a hit and its ring (stereo float32 at 48 kHz): RING_BARS level bars (a thump on every
    beat, the downbeat's strongest, noise bursts on 2 and 4, ticks on the off-beats, a soft floor), then one
    final thump on the next downbeat with a noise splash and a 2.5 s decaying chord of three tones, then 3 s of
    silence. Counted as bars, the ring's tail makes a near-silent last bar after the level ones."""
    n = int((T0 + (RING_BARS + 1) * BAR + 3.0) * SR)
    y = np.zeros(n)
    r = np.random.default_rng(seed)

    def add(x, t, g):
        i = int(round(t * SR))
        m = min(len(x), n - i)
        y[i:i + m] += x[:m] * g

    def u(d):
        return np.arange(int(d * SR)) / SR
    lowp = signal.butter(2, 120, 'low', fs=SR, output='sos')
    hpf = signal.butter(2, 5000, 'high', fs=SR, output='sos')
    bpf = signal.butter(2, [400, 2500], 'band', fs=SR, output='sos')

    def thump(g):
        t = u(0.3)
        return signal.sosfilt(lowp, r.standard_normal(len(t))) * 8 * np.exp(-t / 0.09) * np.minimum(1, t / 0.0015) * g
    for b in range(RING_BARS):
        tb = T0 + b * BAR
        for k in range(4):
            add(thump(1.0 if k == 0 else 0.45), tb + k * BEAT, 0.8)
            if k in (1, 3):
                t = u(0.15)
                add(signal.sosfilt(bpf, r.standard_normal(len(t))) * np.exp(-t / 0.04) * 0.8, tb + k * BEAT, 0.8)
            t = u(0.04)
            add(signal.sosfilt(hpf, r.standard_normal(len(t))) * np.exp(-t / 0.006) * 0.4, tb + k * BEAT + BEAT / 2, 0.8)
    body_end = int((T0 + RING_BARS * BAR) * SR)
    y[int(T0 * SR):body_end] += signal.sosfilt(signal.butter(2, [200, 3000], 'band', fs=SR, output='sos'),
                                               r.standard_normal(body_end - int(T0 * SR))) * 0.12
    th = T0 + RING_BARS * BAR
    add(thump(1.0), th, 0.8)
    t = u(1.2)
    add(signal.sosfilt(hpf, r.standard_normal(len(t))) * np.exp(-t / 0.3) * np.minimum(1, t / 0.001), th, 0.15)
    t = u(2.5)
    ring = sum(np.sin(2 * np.pi * 220.0 * k * t) for k in (1.0, 1.2, 1.5)) / 3 * np.exp(-t / 0.8)
    ring *= np.minimum(1, t / 0.002) * np.minimum(1, (2.5 - t) / 0.05)
    add(ring, th, 0.2)
    y = y / (np.abs(y).max() + 1e-9) * 0.9
    return np.stack([y, y], 1).astype(np.float32)


def write_mp3(path_wav, path_mp3):
    """the bed as an MP3 too (track.py decodes through ffmpeg, never libsndfile)"""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path_wav, '-b:a', '192k', path_mp3], capture_output=True)
    return p.returncode == 0


def analyze_main(d):
    music = os.path.join(d, 'audio', 'music')
    os.makedirs(music)
    wav = os.path.join(music, 'click_bed.wav')
    sf.write(wav, bed(), SR, subtype='FLOAT')
    p = run(['analyze', 'audio/music/click_bed.wav', '--quiet'], d)
    tj = os.path.join(music, 'click_bed.track.json')
    check(p.returncode == 0 and os.path.isfile(tj), 'analyze runs' + ('' if p.returncode == 0 else f': {p.stderr[-400:]}'))
    if not os.path.isfile(tj):
        return None
    a = json.load(open(tj))
    t, g = a['tempo'], a['grid']
    check(abs(t['bpm'] - BPM) <= 0.05, f"tempo within 0.05 BPM ({t['bpm']})")
    check(abs(g['t0'] - T0) <= 0.005, f"bar 1 on its attack within 5 ms ({g['t0']} vs {T0})")
    check(g['downbeat_confidence'] >= 0.5 and g['phase'] == 0, f"the downbeat is found ({g['downbeat_confidence']}, phase {g['phase']})")
    check(len(a['bars']) == BARS + 1, f"the bars end with the music ({len(a['bars'])} bars, want {BARS + 1})")
    drift = [b['t'] - (T0 + i * BAR) for i, b in enumerate(a['bars'])]
    check(max(abs(x) for x in drift) <= 0.006, f'every bar on its downbeat within 6 ms (worst {max(abs(x) for x in drift) * 1000:.1f} ms)')
    want_stop = T0 + 14 * BAR - STOP_S
    hit = [s for s in a['stops'] if abs(s['t'] - want_stop) <= 0.06]
    check(len(hit) == 1 and abs(hit[0]['len_s'] - STOP_S) <= 0.1, f"the stop at {want_stop:.2f} s is found ({a['stops']})")
    check(len(a['stops']) == 1, f"no groove trough is taken for a stop ({len(a['stops'])} stops)")
    e15 = [e for e in a['entries'] if e['bar'] == 15]
    check(bool(e15) and e15[0]['drop'], f"the entry after the break (bar 15) is a drop ({a['entries']})")
    check(any(e['bar'] == 5 for e in a['entries']), 'the body entry (bar 5) is found')
    check(any(b['bar'] == 13 for b in a['breaks']), f"the break (bar 13) is found ({a['breaks']})")
    end = a['ending']
    check(end['kind'] == 'button' and abs(end['last_hit_t'] - (T0 + BARS * BAR)) <= 0.01,
          f"the ending is a button on the final thump ({end})")
    check(t['drift_rms_ms'] <= 3.0, f"a steady grid reads as steady (drift {t['drift_rms_ms']} ms RMS)")
    check(a['phrases']['len'] in (4, 8) and 5 in a['phrases']['starts'], f"phrases start on the body entry ({a['phrases']})")
    # the same bed as an MP3: decoded by ffmpeg, same tempo and bar 1 within the codec's delay compensation
    mp3 = os.path.join(d, 'click_bed.mp3')
    if write_mp3(wav, mp3):
        p = run(['analyze', mp3, '--quiet', '--json', os.path.join(d, 'mp3.track.json')], d)
        if p.returncode == 0:
            b = json.load(open(os.path.join(d, 'mp3.track.json')))
            check(abs(b['tempo']['bpm'] - BPM) <= 0.05 and abs(b['grid']['t0'] - T0) <= 0.01,
                  f"an MP3 decodes through ffmpeg ({b['tempo']['bpm']} BPM, bar 1 at {b['grid']['t0']})")
        else:
            check(False, f'an MP3 analyses: {p.stderr[-300:]}')
    else:
        print('skip the MP3 check (ffmpeg cannot encode MP3 here)')
    # a second analyze of the same file with the same settings keeps the analysis; other settings or --force redo it
    before = os.path.getmtime(tj)
    p = run(['analyze', 'audio/music/click_bed.wav', '--quiet'], d)
    check(p.returncode == 0 and 'is current' in p.stdout and os.path.getmtime(tj) == before,
          'the same file and settings: the analysis is kept, not made again' + ('' if p.returncode == 0 else f': {p.stderr[-300:]}'))
    p = run(['analyze', 'audio/music/click_bed.wav', '--quiet', '--profile', 'calm'], d)
    check(p.returncode == 0 and 'wrote' in p.stdout and json.load(open(tj))['analysis']['profile'] == 'calm',
          'another profile analyses again')
    p = run(['analyze', 'audio/music/click_bed.wav', '--quiet', '--force'], d)
    check(p.returncode == 0 and 'wrote' in p.stdout and json.load(open(tj))['analysis']['profile'] == 'crisp',
          '--force analyses again')
    return a


def edit_grid_check(d, a):
    music = os.path.join(d, 'audio', 'music')
    p = run(['edit', '--bars', '8', '--reveal-bar', '4', '--end', 'stop', '--film-t0', '0.25'], d)
    ej = os.path.join(music, 'edit.json')
    check(p.returncode == 0 and os.path.isfile(ej), 'edit --end stop runs' + ('' if p.returncode == 0 else f': {p.stderr[-400:]}'))
    if not os.path.isfile(ej):
        return
    e = json.load(open(ej))
    check(e['reveal']['src_bar'] == 15 and e['reveal']['film_bar'] == 4, f"the reveal's film bar 4 holds the entry, source bar 15 ({e['reveal']})")
    src = []
    for s in e['segments']:
        src += list(range(s['src_bar'], s['src_bar'] + s['bars']))
    check(len(src) == 8 and all(s['bars'] >= 2 for s in e['segments']), f"8 whole film bars, 2+ per segment ({e['segments']})")
    check(e['cost']['splices'] <= 1, f"at most one splice per 8 film bars ({e['cost']['splices']})")
    fd = e['film']['downbeats']
    check(len(fd) == 9 and abs(fd[0] - 0.25) < 1e-3, f'film bar 1 at 0.25 s, 9 bar lines ({fd[:2]}...)')
    check(e['ending']['mode'] == 'stop' and abs(e['ending']['bed_stops_film_s'] - fd[-1]) < 1e-3
          and abs(e['ending']['end_s'] - fd[-1] - 0.4) < 1e-3, f"the bed stops on the bar line after the body ({e['ending']})")
    check(abs(e['reveal']['film_s'] - fd[3]) < 1e-3 and any(abs(x - fd[3]) < 0.01 for x in e['film']['entries']),
          'the reveal is an entry of the film grid')
    # grid: TypeScript and HyperFrames
    os.makedirs(os.path.join(d, 'src'), exist_ok=True)
    open(os.path.join(d, 'src', 'timeline.ts'), 'w').write('export const FPS = 60;\n')
    p = run(['grid'], d)
    ts = os.path.join(d, 'src', 'music.ts')
    check(p.returncode == 0 and os.path.isfile(ts), 'grid writes src/music.ts (fps read from timeline.ts)'
          + ('' if p.returncode == 0 else f': {p.stderr[-300:]}'))
    if os.path.isfile(ts):
        txt = open(ts, encoding='utf-8').read()
        m = re.search(r'\bt0: ([0-9.]+)', txt)
        check('export const MUSIC: Music | null = {' in txt and m and abs(float(m.group(1)) - 15.0) < 1e-6
              and 'export const bar = ' in txt and 'export const accentNear = ' in txt and 'mode: "stop"' in txt,
              f"music.ts carries the grid in film frames (t0 {m.group(1) if m else None})")
        node = shutil.which('node')
        if node:
            probe = ("import('./src/music.ts').then(m => { const M = m.MUSIC; "
                     "console.log(JSON.stringify({t0: M.t0, n: M.downbeats.length, b4: m.bar(4), end: M.end, "
                     "acc: M.accents.length})); })")
            q = subprocess.run([node, '--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', probe],
                               capture_output=True, text=True, cwd=d)
            if q.returncode == 0 and q.stdout.strip():
                v = json.loads(q.stdout.strip().splitlines()[-1])
                check(v['n'] == 9 and abs(v['b4'] - fd[3] * 60) < 0.02 and v['end']['mode'] == 'stop' and v['acc'] > 0,
                      f"music.ts loads in node: bar(4) = {v['b4']} f, {v['n']} downbeats, {v['acc']} accents")
            else:
                print('skip loading music.ts in node (no type stripping here): ' + (q.stderr.strip()[-160:] or 'no output'))
    p = run(['grid', '--out', 'music.js', '--fps', '60'], d)
    js = os.path.join(d, 'music.js')
    check(p.returncode == 0 and 'root.MUSIC_GRID = API' in open(js, encoding='utf-8').read(), 'grid writes music.js for HyperFrames')
    # check: the joins on the edited bed
    p = run(['check', '--json', 'out/qa/track_check.json'], d)
    rep = json.load(open(os.path.join(d, 'out', 'qa', 'track_check.json'))) if os.path.isfile(
        os.path.join(d, 'out', 'qa', 'track_check.json')) else None
    joins = (rep or {}).get('joins', [])
    jp = [x for x in (rep or {}).get('problems', []) if x.startswith('join')]
    check(rep is not None and all(abs(j['attack_off_ms']) <= 2.0 and j['click_db'] < 10 for j in joins) and not jp,
          f"every join: attack on the film downbeat, no click ({[(j['attack_off_ms'], j['click_db']) for j in joins]}; {jp})")
    lic = [x for x in (rep or {}).get('problems', []) if x.startswith('licence') or x.startswith('no licence')]
    check(p.returncode == 1 and lic, 'check fails without a licence record')
    # button ending: the final hit back-timed into the tail
    p = run(['edit', '--bars', '8', '--reveal-bar', '4', '--end', 'button', '--out', 'audio/music/edit_button.json'], d)
    eb = os.path.join(music, 'edit_button.json')
    if p.returncode == 0 and os.path.isfile(eb):
        e = json.load(open(eb))
        last = e['segments'][-1]
        hit_src = a['ending']['last_hit_t']
        check(abs(e['ending']['last_hit_film_s'] - e['film']['downbeats'][-1]) < 0.01
              and last['src_bar'] + last['bars'] - 1 == BARS,
              f"--end button: the body ends on the bar before the final hit, which lands on the bar line after it "
              f"({e['ending']['last_hit_film_s']} vs {e['film']['downbeats'][-1]}; hit at {hit_src} s in the source)")
    else:
        check(False, f'edit --end button runs: {p.stderr[-300:]}')
    # --map: the film's bars by hand, the planner skipped; a gap in the map and a button off its bar are refused
    p = run(['edit', '--bars', '6', '--reveal-bar', '4', '--end', 'stop', '--map', '1:5x3,4:15x3',
             '--out', 'audio/music/edit_map.json'], d)
    em = os.path.join(music, 'edit_map.json')
    if p.returncode == 0 and os.path.isfile(em):
        e = json.load(open(em))
        segs = [(s['film_bar'], s['src_bar'], s['bars']) for s in e['segments']]
        check(segs == [(1, 5, 3), (4, 15, 3)] and e['reveal']['src_bar'] == 15 and e['args']['map'] == '1:5x3,4:15x3'
              and len(e['joins']) == 1 and len(e['film']['downbeats']) == 7,
              f"--map writes the given bars, its join and the grid ({segs}, reveal {e['reveal']['src_bar']})")
    else:
        check(False, f'edit --map runs: {p.stderr[-300:]}')
    p = run(['edit', '--bars', '6', '--reveal-bar', '4', '--end', 'stop', '--map', '1:5x3,5:15x3', '--out', 'audio/music/x.json'], d)
    check(p.returncode == 1 and 'does not follow' in p.stderr, '--map with a gap is refused')
    p = run(['edit', '--bars', '6', '--reveal-bar', '4', '--end', 'button', '--map', '1:5x3,4:15x3', '--out', 'audio/music/x.json'], d)
    check(p.returncode == 1 and 'end the map on that bar' in p.stderr, '--map: a button ending off the bar before the final hit is refused')


def ring_ending(d):
    d2 = os.path.join(d, 'ring')
    os.makedirs(os.path.join(d2, 'audio', 'music'))
    sf.write(os.path.join(d2, 'audio', 'music', 'ring.wav'), ring_bed(), SR, subtype='FLOAT')
    p = run(['analyze', 'audio/music/ring.wav', '--quiet', '--phase', '0'], d2)  # the ending is under test, not the downbeat
    tj = os.path.join(d2, 'audio', 'music', 'ring.track.json')
    if p.returncode != 0 or not os.path.isfile(tj):
        check(False, f'the ring bed analyses: {(p.stderr or p.stdout)[-300:]}')
        return
    a = json.load(open(tj))
    end, lv = a['ending'], [b['lufs'] for b in a['bars']]
    hit = T0 + RING_BARS * BAR
    check(len(lv) == RING_BARS + 2 and lv[-1] - max(lv[-5:-1]) <= -20,
          f"the ring's tail is counted as a near-silent last bar after level ones ({lv[-5:]})")
    check(end['kind'] == 'ring' and abs(end['last_hit_t'] - hit) <= 0.01 and (end['ring_out_s'] or 0) >= 1.6,
          f"a final hit and its ring over level bars is a ring, not a fade ({end}, hit at {hit:.3f} s)")
    check(not any('ends on a fade' in x for x in a['notes']), f"no fade note for a ring ending ({a['notes']})")
    p = run(['edit', '--bars', '4', '--reveal-bar', '2', '--entry', '5', '--end', 'ring'], d2)
    check(p.returncode == 0, 'edit --end ring accepts it' + ('' if p.returncode == 0 else f': {p.stderr[-300:]}'))


def low_confidence(d):
    d2 = os.path.join(d, 'flat')
    os.makedirs(os.path.join(d2, 'audio', 'music'))
    sf.write(os.path.join(d2, 'audio', 'music', 'flat.wav'), bed(accents=False, seed=3), SR, subtype='FLOAT')
    p = run(['analyze', 'audio/music/flat.wav', '--quiet'], d2)
    check(p.returncode == 2 and 'LOW downbeat confidence' in p.stdout, f'identical clicks: analyze exits 2 (downbeat unresolved, exit {p.returncode})')
    p = run(['edit', '--bars', '4', '--reveal-bar', '2', '--end', 'stop'], d2)
    check(p.returncode == 2 and '--phase' in p.stderr, 'and edit refuses until the phase is set')
    p = run(['analyze', 'audio/music/flat.wav', '--quiet', '--phase', '0'], d2)
    check(p.returncode == 0, '--phase 0 resolves it' + ('' if p.returncode == 0 else f': {p.stderr[-200:]}'))
    p = run(['edit', '--bars', '4', '--reveal-bar', '2', '--end', 'stop'], d2)
    check(p.returncode == 0, 'edit runs on the set phase' + ('' if p.returncode == 0 else f': {p.stderr[-200:]}'))


def add_records(d):
    music = os.path.join(d, 'audio', 'music')
    f = 'audio/music/click_bed.wav'
    base = ['add', f, '--title', 'Test Bed', '--artist', 'Nobody', '--source', 'Test', '--page', 'https://example.org/t',
            '--ai-generated', 'no', '--vocals', 'no', '--out', 'audio/music/rec.json', '--force']
    p = run(base + ['--licence', 'CC BY-NC 4.0', '--seen-quote', 'q', '--seen-url', 'https://example.org/l'], d)
    check(p.returncode == 1 and 'NonCommercial' in p.stdout, 'add refuses an NC licence')
    p = run(base + ['--licence', 'CC BY 4.0', '--credit', '"Test Bed" Nobody / CC BY 4.0'], d)
    check(p.returncode == 1 and 'licence_seen' in p.stdout, 'add refuses a record without licence_seen')
    p = run(base + ['--licence', 'CC BY 4.0', '--seen-quote', 'Attribution 4.0', '--seen-url', 'https://example.org/l'], d)
    rec = json.load(open(os.path.join(music, 'rec.json')))
    check(rec['credit_required'] and rec['credit'] is None and 'credit line' in p.stdout and p.returncode == 1,
          'a CC BY record needs its credit line')
    p = run(base + ['--licence', 'CC BY 4.0', '--seen-quote', 'Attribution 4.0', '--seen-url', 'https://example.org/l',
                    '--credit', '"Test Bed" Nobody / Licensed under CC BY 4.0'], d)
    rec = json.load(open(os.path.join(music, 'rec.json')))
    check(p.returncode == 0 and rec['licence_id'] == 'cc-by-4.0' and len(rec['sha256']) == 64 and rec['licence_seen']['quote'],
          f"a complete CC BY record is accepted ({rec['licence_id']}, exit {p.returncode}"
          + ('' if p.returncode == 0 else f": {p.stdout[-300:]}") + ')')


def main():
    keep = sys.argv[sys.argv.index('--keep') + 1] if '--keep' in sys.argv else None
    d = keep or tempfile.mkdtemp(prefix='track-test-')
    os.makedirs(d, exist_ok=True)
    try:
        a = analyze_main(d)
        if a:
            edit_grid_check(d, a)
        low_confidence(d)
        ring_ending(d)
        add_records(d)
    finally:
        if not keep:
            shutil.rmtree(d, ignore_errors=True)
    print(f'\n{len(FAILS)} failed' if FAILS else '\nall track checks pass')
    return 1 if FAILS else 0


if __name__ == '__main__':
    sys.exit(main())
