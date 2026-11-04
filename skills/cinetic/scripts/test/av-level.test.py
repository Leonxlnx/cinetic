#!/usr/bin/env python3
"""av-level.test.py: av-audit.py's level check (the music never steps mid-shot) on signals made in code.

  1. A bed that jumps 12 dB at 8.0 s with no cut there is found at 8.0 s and fails; a cut at 8.0 s carries it (none).
  2. A cut 0.3 s away does not carry it; one within 0.15 s does.
  3. A fall of 6 dB mid-shot warns, a fall of 11 dB fails, a rise of 3 dB is no step.
  4. The opening second, a stop the grid declares and the ending after the body's last bar line are left out.
  5. A film without a track grid (no cues "music") is not checked.

Usage (from the skill root): python3 scripts/test/av-level.test.py
Exit codes: 0 all pass, 1 a test failed.
"""
import importlib.util
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('av_audit', os.path.join(HERE, '..', 'av-audit.py'))
AV = importlib.util.module_from_spec(spec)
spec.loader.exec_module(AV)
SR, FPS = 24000, 60
failed = 0


def check(ok, what, detail=''):
    global failed
    failed += not ok
    print(f"{'pass' if ok else 'FAIL'}  {what}" + (f'  ({detail})' if detail else ''))


def bed(steps, dur=16.0, seed=3):
    """a groove (noise bursts on a 120 BPM grid) whose level steps by dB at the given times"""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    pulse = 0.4 + 0.6 * (np.mod(t, 0.5) < 0.12)
    gain = np.ones(n)
    for at, db in steps:
        gain[t >= at] *= 10 ** (db / 20)
    return 0.05 * rng.standard_normal(n) * pulse * gain


def cues(cuts=(), stops=(), body_end_s=15.0):
    return {'fps': FPS, 'acts': {'a': {'from': 0, 'dur': 60}}, 'declared': {'seams': [{'at': c * FPS, 'kind': 'hard'} for c in cuts]},
            'cue': {}, 'salience': {},
            'music': {'downbeats': [int(x * FPS) for x in np.arange(0.25, body_end_s + 0.01, 2.0)] + [int(body_end_s * FPS)],
                      'stops': [{'from': a * FPS, 'to': b * FPS} for a, b in stops]}}


def steps_at(sig, c):
    return AV.level_steps(sig, SR, c, FPS) or []


# 1.
r = steps_at(bed([(8.0, 12)]), cues(cuts=(4.0, 12.0)))
check(len(r) == 1 and abs(r[0]['t'] - 8.0) <= 0.06 and r[0]['step_db'] >= 10 and AV.level_severity(r[0]['step_db']) == 'fail',
      'a 12 dB jump mid-shot is found where it starts and fails', str(r))
check(not steps_at(bed([(8.0, 12)]), cues(cuts=(4.0, 8.0, 12.0))), 'the same jump on a cut rides the cut')
# 2.
check(len(steps_at(bed([(8.0, 12)]), cues(cuts=(8.3,)))) == 1 and not steps_at(bed([(8.0, 12)]), cues(cuts=(8.1,))),
      'a cut 0.3 s away does not carry it, one 0.1 s away does')
# 3.
w = steps_at(bed([(8.0, -6)]), cues())
f = steps_at(bed([(8.0, -11)]), cues())
check(len(w) == 1 and AV.level_severity(w[0]['step_db']) == 'warn' and len(f) == 1 and AV.level_severity(f[0]['step_db']) == 'fail'
      and not steps_at(bed([(8.0, 3)]), cues()), 'a 6 dB fall warns, an 11 dB fall fails, a 3 dB rise is no step', f'{w} {f}')
# 4.
check(not steps_at(bed([(0.6, 12)]), cues()), 'the opening second is left out')
check(not steps_at(bed([(8.0, -20), (8.6, 20)]), cues(stops=((8.0, 8.6),))), 'a stop the grid declares is left out')
check(not steps_at(bed([(15.4, -14)]), cues(body_end_s=15.0)), 'the ending after the body is left out')
# 5.
c = cues()
c.pop('music')
check(AV.level_steps(bed([(8.0, 12)]), SR, c, FPS) is None, 'no track grid: not checked')

print('av-level tests: ' + ('all pass' if not failed else f'{failed} failed'))
sys.exit(1 if failed else 0)
