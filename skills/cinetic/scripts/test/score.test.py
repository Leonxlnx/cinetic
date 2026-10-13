#!/usr/bin/env python3
"""Regression tests for the recorded audio in score.py ("bed" and "samples" in audio/score.json).

Builds its own takes and cue lists in a temporary folder, renders them with score.py and checks:
  - a take lands on its frame: a click's transient (after 30 ms of silence in the file), a whoosh's
    loudest point, a pop's onset, all within half a frame at 60 fps
  - the takes of a kind play in turn (two clicks, two different files)
  - a take with a "root" is retuned to the event's note, and the report lists the note
  - a bed segment plays its "from"-"to" slice at its "at" frame
  - chords may be left out when the music is a recorded bed with "hold" sections only
  - unknown kinds and missing files fail with a readable message (exit 1)

Usage: python3 skills/cinetic/scripts/test/score.test.py   (needs numpy, scipy and soundfile)
Exit 0 when every check passes, 1 otherwise.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
SCORE = os.path.join(HERE, '..', 'audio', 'score.py')
FPS = 60
FAILS = []


def check(ok, what):
    print(('ok   ' if ok else 'FAIL ') + what)
    if not ok:
        FAILS.append(what)


def run(d, cues, score, stems=True):
    json.dump(cues, open(os.path.join(d, 'cues.json'), 'w'))
    json.dump(score, open(os.path.join(d, 'score.json'), 'w'))
    args = [sys.executable, SCORE, '--cues', os.path.join(d, 'cues.json'), '--score', os.path.join(d, 'score.json'),
            '--out', os.path.join(d, 'out.wav'), '--json', os.path.join(d, 'report.json'), '--quiet']
    if stems:
        args += ['--stems', os.path.join(d, 'stems')]
    return subprocess.run(args, capture_output=True, text=True)


def cues_with(events, total=600):
    return dict(fps=FPS, bpm=120, total=total, acts={'all': {'from': 0, 'dur': total}}, cue={'mid': total // 2}, events=events)


def make_takes(d):
    sr = 44100
    rng = np.random.default_rng(3)
    t = lambda s: np.arange(int(s * sr)) / sr  # noqa: E731
    os.makedirs(os.path.join(d, 'sfx'), exist_ok=True)
    for k in range(2):  # 30 ms of silence, then a 10 ms transient
        x = np.concatenate([np.zeros(int(0.03 * sr)), rng.standard_normal(int(0.01 * sr)) * np.exp(-t(0.01) / 0.002)])
        sf.write(os.path.join(d, 'sfx', f'click-{k + 1}.wav'), (0.5 * x).astype(np.float32), sr)
    u = t(0.12)
    sf.write(os.path.join(d, 'sfx', 'pop-a5.wav'), (0.4 * np.sin(2 * np.pi * 880 * u) * np.exp(-u / 0.03)).astype(np.float32), sr)
    u = t(0.6)  # loudest 0.4 s in
    env = np.exp(-((u - 0.4) / 0.12) ** 2)
    sf.write(os.path.join(d, 'sfx', 'whoosh.wav'), (rng.standard_normal((len(u), 2)) * env[:, None] * 0.3).astype(np.float32), sr)
    u = t(4.0)  # a "track": a 1 kHz tone for 4 s
    sf.write(os.path.join(d, 'tone.wav'), (0.3 * np.sin(2 * np.pi * 1000 * u)).astype(np.float32), sr)


def timing(d):
    cues = cues_with([dict(f=120, kind='click', id='a:click-1'), dict(f=180, kind='click', id='a:click-2'),
                      dict(f=300, kind='whoosh', dur=36, id='a:whoosh'), dict(f=450, kind='pop', id='a:pop')])
    score = dict(key='F major', samples={'click': ['sfx/click-1.wav', 'sfx/click-2.wav'], 'whoosh': 'sfx/whoosh.wav',
                                         'pop': {'file': 'sfx/pop-a5.wav', 'root': 'A5'}})
    r = run(d, cues, score)
    check(r.returncode in (0, 1) and os.path.exists(os.path.join(d, 'stems', 'sfx.wav')), 'renders with recorded takes')
    x, sr = sf.read(os.path.join(d, 'stems', 'sfx.wav'))
    m = np.abs(x).max(axis=1)

    def onset(sec):
        a, b = int((sec - 0.3) * sr), int((sec + 0.3) * sr)
        seg = m[a:b]
        return (a + int(np.argmax(seg >= 0.5 * seg.max()))) / sr

    def peak(sec):
        a, b = int((sec - 0.6) * sr), int((sec + 0.6) * sr)
        w = int(0.03 * sr)
        env = np.convolve((x[a:b] ** 2).mean(axis=1), np.ones(w) / w, 'same')
        return (a + int(np.argmax(env))) / sr

    check(abs(onset(2.0) - 2.0) * FPS < 0.5, f'click transient on its frame ({(onset(2.0) - 2.0) * FPS:+.2f} f)')
    check(abs(peak(5.0) - 5.0) * FPS < 0.5, f'whoosh peak on its frame ({(peak(5.0) - 5.0) * FPS:+.2f} f)')
    check(abs(onset(7.5) - 7.5) * FPS < 0.5, f'pop onset on its frame ({(onset(7.5) - 7.5) * FPS:+.2f} f)')
    rep = json.load(open(os.path.join(d, 'report.json')))
    rec = rep.get('recorded', {}).get('samples', {})
    check(rec.get('click', {}).get('files') == ['click-1.wav', 'click-2.wav'], 'two clicks play the two takes in turn')
    pops = [p for p in rep['events']['tuned'] if p['kind'] == 'pop']
    check(len(pops) == 1 and pops[0]['in_key'], f'the pop is retuned into the key ({pops[0]["note"] if pops else "none"})')


def bed(d):
    cues = cues_with([dict(f=300, kind='click', id='a:click')])
    score = dict(key='A minor', sections=[{'bars': [3, 3], 'style': 'hold', 'level': 0.6}],
                 bed=[{'file': 'tone.wav', 'at': 60, 'from': 0.5, 'to': 1.0}])
    r = run(d, cues, score)
    check(r.returncode in (0, 1) and os.path.exists(os.path.join(d, 'stems', 'bed.wav')),
          'a bed with "hold" sections renders without chords' + ('' if r.returncode in (0, 1) else f': {r.stderr.strip()}'))
    if os.path.exists(os.path.join(d, 'stems', 'bed.wav')):
        y, sr = sf.read(os.path.join(d, 'stems', 'bed.wav'))
        on = np.nonzero(np.abs(y).max(axis=1) > 0.01)[0]
        a, b = on[0] / sr, on[-1] / sr
        check(abs(a - 1.0) < 0.02 and abs((b - a) - 0.5) < 0.06, f'the bed segment plays 0.5 s from frame 60 ({a:.3f}-{b:.3f} s)')


def errors(d):
    cues = cues_with([dict(f=120, kind='click', id='a:click')])
    r = run(d, cues, dict(key='C major', samples={'boing': 'sfx/click-1.wav'}), stems=False)
    check(r.returncode == 1 and 'unknown event kind "boing"' in r.stderr, 'an unknown kind fails with a message')
    r = run(d, cues, dict(key='C major', samples={'click': 'sfx/nope.wav'}), stems=False)
    check(r.returncode == 1 and 'sample not found: sfx/nope.wav' in r.stderr, 'a missing take fails with a message')
    r = run(d, cues, dict(key='C major', sections=[{'bars': [1, 1], 'style': 'groove'}]), stems=False)
    check(r.returncode == 1 and 'needs "chords"' in r.stderr, 'synth music still needs chords')


def main():
    with tempfile.TemporaryDirectory() as d:
        make_takes(d)
        timing(d)
        bed(d)
        errors(d)
    print(f"score.test.py: {'all checks pass' if not FAILS else f'{len(FAILS)} failed'}")
    return 1 if FAILS else 0


if __name__ == '__main__':
    sys.exit(main())
