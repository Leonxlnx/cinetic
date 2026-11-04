#!/usr/bin/env python3
"""check-sync.test.py: check-sync.py's frames gate on signals made in code (no film, no earshot).

  1. A ringing take (a kalimba-like tine: an attack and a 1.8 s ring) reads as tonal and a click does not.
  2. The ringing take on its cue is found on its cue by its attack (the waveform match alone can land a few hundred ms
     into its own ring, which read as a false OFF); the same take 180 ms early is still found early (a real slip is
     never excused); a click keeps the plain waveform match. A short take whose weak best match sits in its own tail is
     placed by its attack on the plan; the same take 180 ms early stays early.
  3. cut_frames() takes the act changes, the declared seams and the cues marked as cuts (one within 2 frames), and the
     cues marked as hits as the key state changes.
  4. cut_onsets(): of four cuts, the three with a hit in the audio within a frame count (75 %), the silent one is
     listed; a hit two frames off does not count.

Usage (from the skill root): python3 scripts/test/check-sync.test.py
Exit codes: 0 all pass, 1 a test failed.
"""
import importlib.util
import os
import sys

import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('check_sync', os.path.join(HERE, '..', 'check-sync.py'))
CS = importlib.util.module_from_spec(spec)
spec.loader.exec_module(CS)
SR = CS.SR

failed = 0


def check(ok, what, detail=''):
    global failed
    failed += not ok
    print(f"{'pass' if ok else 'FAIL'}  {what}" + (f'  ({detail})' if detail else ''))


rng = np.random.default_rng(7)
t = np.arange(int(1.8 * SR)) / SR
# a tine: a fast attack, partials at 1, 2.76 and 5.4 x 523 Hz ringing down together, a touch of beating
tine = np.sin(2 * np.pi * 523 * t) + 0.5 * np.sin(2 * np.pi * 1444 * t) + 0.25 * np.sin(2 * np.pi * 2824 * t)
tine *= np.exp(-t / 0.9) * np.minimum(1.0, t / 0.002) * (1 + 0.04 * np.sin(2 * np.pi * 3 * t))
click = np.zeros(int(0.08 * SR))
click[:int(0.004 * SR)] = rng.standard_normal(int(0.004 * SR)) * np.linspace(1, 0, int(0.004 * SR))
sos = signal.butter(4, 150.0, btype='highpass', fs=SR, output='sos')


def mix(take, at, dur=3.0):
    y = rng.standard_normal(int(dur * SR)) * 10 ** (-46 / 20)
    k = int(at * SR)
    y[k:k + len(take)] += 0.5 * take[:len(y) - k]
    return signal.sosfiltfilt(sos, y)


# 1. tonal or not
mb = signal.sosfiltfilt(sos, tine)
i0, i1 = 0, int(0.23 * SR)  # the template: 30 ms before the onset (here the file's start) to 200 ms after
cb = signal.sosfiltfilt(sos, np.concatenate([click, np.zeros(int(0.5 * SR))]))
check(CS.tonal(mb, i0, i1) and not CS.tonal(cb, 0, int(0.23 * SR)), 'a ringing tine reads as tonal, a click does not')

# 2. located by its attack
tpl = mb[i0:i1]
on = mix(tine, 1.0)
plain, _ = CS.locate(on, 0.0, tpl, 1.0, 0.35)
got, corr = CS.locate_tonal(on, 0.0, tpl, 1.0, 0.35, 0)
check(got is not None and abs(got - 1.0) < 0.004, 'the ringing take on its cue is placed on its cue by its attack',
      f'attack {got if got is None else round(got, 4)} s, waveform match alone {plain:.4f} s, corr {corr:.2f}')
early = mix(tine, 0.82)
got_e, _ = CS.locate_tonal(early, 0.0, tpl, 1.0, 0.35, 0)
check(got_e is not None and abs(got_e - 0.82) < 0.004, 'the same take 180 ms early is found early (a real slip stays OFF)',
      f'{got_e if got_e is None else round(got_e, 4)} s')
cl = mix(click, 1.0)
ctpl = cb[:int(0.23 * SR)]
got_c, _ = CS.locate(cl, 0.0, ctpl, 1.0, 0.35)
check(abs(got_c - 1.0) < 0.002, 'a click keeps the plain waveform match', f'{got_c:.4f} s')

# 2b. a short take whose weak best match sits in its own tail (a detent's second click, an air tick the encoder smears):
# a clear attack on the plan places it; a real slip (the take's attack early, the best match on it) stays where it is
det = np.zeros(int(0.04 * SR))
for at_s, amp in ((0.0, 1.0), (0.02, 0.8)):
    k = int(at_s * SR)
    det[k:k + int(0.003 * SR)] += amp * rng.standard_normal(int(0.003 * SR)) * np.linspace(1, 0, int(0.003 * SR))
dtpl = signal.sosfiltfilt(sos, det)
on_d = mix(det, 1.0)
g_d, _ = CS.locate_attack(on_d, 0.0, dtpl, 1.0, 0.35, 0, 1.0225)
check(g_d is not None and abs(g_d - 1.0) < 0.002, 'a weak match in its own tail gives way to the take attack on the plan',
      f'{g_d if g_d is None else round(g_d, 4)} s')
slip = mix(det, 0.82)
g_s, _ = CS.locate_attack(slip, 0.0, dtpl, 1.0, 0.35, 0, 0.82)
check(g_s is None or abs(g_s - 0.82) < 0.002, 'the same take 180 ms early is still found early (a real slip stays OFF)',
      f'{g_s if g_s is None else round(g_s, 4)} s')

# 3. the cuts and the key state changes of a cue list
cues = {'fps': 60, 'total': 600, 'acts': {'p1': {'from': 0, 'dur': 300}, 'end': {'from': 300, 'dur': 300}},
        'declared': {'seams': [{'at': 120, 'kind': 'defocus'}, {'at': 301, 'kind': 'morph'}, {'at': 420, 'kind': 'hard'}]},
        'cue': {'ta1': 120, 'a1h1': 160, 'line2': 200, 'a2cut': 480, 'name': 330}, 'salience': {'ta1': 'cut', 'a1h1': 'hit', 'line2': 'copy', 'a2cut': 'cut', 'name': 'hit'}}
cuts, keys = CS.cut_frames(cues)
check(cuts == [120.0, 300.0, 420.0, 480.0] and keys == [160.0, 330.0], 'cut_frames: act changes, declared seams and cut cues (one within 2 f); hit cues as key state changes',
      f'{cuts} {keys}')

# 4. the share with an onset within a frame
y = rng.standard_normal(10 * SR) * 10 ** (-40 / 20)
for f in (120, 300, 480, 160):  # hits on three cuts and one key; 420 silent; 330 gets a hit two frames late
    k = int(f / 60 * SR)
    y[k:k + len(click)] += click
k = int((330 + 2) / 60 * SR)
y[k:k + len(click)] += click
dec = np.stack([y, y], axis=1)
sos_lo = signal.butter(4, 40.0, btype='highpass', fs=SR, output='sos')
co = CS.cut_onsets(dec.mean(axis=1), cues, 60.0, 0.0, 1 / 60, sos_lo)
check(co['cuts']['share'] == 0.75 and co['cuts']['missing'] == [420.0], 'cut_onsets: 3 of 4 cuts carry a hit within a frame; the silent one is listed', str(co['cuts']))
check(co['key']['with_onset'] == 1 and co['key']['missing'] == [330.0], 'cut_onsets: a hit two frames off its key state change does not count', str(co['key']))

print('check-sync tests: ' + ('all pass' if not failed else f'{failed} failed'))
sys.exit(1 if failed else 0)
