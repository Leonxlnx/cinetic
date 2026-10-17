#!/usr/bin/env python3
"""Regression tests for score.py's effect voices: the synth engine, the earshot kit and the fallbacks.

Builds its own cue lists, kits and takes in a temporary folder and checks:
  - synth: "sfx": {"engine": "synth"}, the default "auto" without a kit, and a score that predates the
    "sfx" and "music" fields render bit for bit the same WAV (with --baseline OLD/score.py, also the
    same as that older score.py)
  - kit: a take's transient (after 30 ms of silence in its file) lands on its cue frame, a whoosh's loudest
    point on its apex frame, a key's transient on its typing-plan time, all within half a frame; two
    clicks play two different takes; a text chain steps through the chord's tones on the pitched takes;
    a role set to null skips its cue; a role the kit does not name keeps its synth voice
  - fallbacks (EARSHOT_PYTHON=none): rendered takes play without earshot (vendored), a changed kit.json
    plays the old takes with a warning, no takes at all falls back to the synth voices with a loud
    warning, and "engine": "earshot" then fails (exit 1)
  - the stack guard reports a stacked lockup (a whoosh into a drop + snap + motif) and stays quiet on
    one clean hit after a stop-down
  - "music": "none": no chords needed, the target defaults to -18 LUFS, the hook check is off
  - kit.py: note names, the role mapping, tuning a kit to the film's key
  - with EARSHOT_PYTHON pointing at an earshot 0.3+ interpreter: a real two-role kit renders with kit.py
    and its takes land on their frames (skipped otherwise)

Usage: python3 skills/cinetic/scripts/test/score.test.py [--baseline OLD/score.py]
(needs numpy, scipy, soundfile and pyloudnorm). Exit 0 when every check passes, 1 otherwise.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, '..', 'audio')
SCORE = os.path.join(AUDIO, 'score.py')
KITPY = os.path.join(AUDIO, 'kit.py')
sys.path.insert(0, AUDIO)
import kit as K  # noqa: E402

FPS, SR = 60, 48000
FAILS = []


def check(ok, what):
    print(('ok   ' if ok else 'FAIL ') + what)
    if not ok:
        FAILS.append(what)


def run(d, name, cues, score, env=None, script=SCORE):
    """Render cues + score in d; returns (CompletedProcess, report dict or None)."""
    c, s = os.path.join(d, f'{name}.cues.json'), os.path.join(d, f'{name}.score.json')
    json.dump(cues, open(c, 'w'))
    json.dump(score, open(s, 'w'))
    rep = os.path.join(d, f'{name}.report.json')
    if os.path.exists(rep):
        os.remove(rep)
    args = [sys.executable, script, '--cues', c, '--score', s, '--out', os.path.join(d, f'{name}.wav'),
            '--stems', os.path.join(d, f'{name}.stems'), '--json', rep, '--quiet']
    p = subprocess.run(args, capture_output=True, text=True, env=dict(os.environ, **(env or {})))
    return p, (json.load(open(rep)) if os.path.exists(rep) else None)


def cues_with(events, total=300, cue=None):
    return dict(fps=FPS, bpm=120, total=total, acts={'all': {'from': 0, 'dur': total}}, cue=cue or {'mid': total // 2},
                events=events)


SYNTH_SCORE = {'key': 'G major', 'bpm': 120, 'chords': ['Gadd9', 'Cmaj9', '-'],
               'sections': [{'bars': [1, 1], 'style': 'intro'}, {'bars': [2, 3], 'style': 'resolve'}],
               'payoff': 120, 'master': {'lufs': -14, 'ceiling': 0.77, 'fade': 0.6}}


# ------------------------------------------------------------------------------------------
# a synthetic kit: takes with known sync points, written the way earshot writes them
# ------------------------------------------------------------------------------------------
def tone(hz, dur=0.6, tau=0.15):
    u = np.arange(int(dur * SR)) / SR
    return 0.5 * np.sin(2 * np.pi * hz * u) * np.exp(-u / tau) * np.minimum(1, u / 0.002)


def transient(seed, lead=0.03, dur=0.05):
    """lead s of silence, then a 2 ms-decay noise transient: its onset is exactly `lead`."""
    r = np.random.default_rng(seed)
    u = np.arange(int(dur * SR)) / SR
    return np.concatenate([np.zeros(int(lead * SR)), r.standard_normal(len(u)) * np.exp(-u / 0.004) * 0.6])


def whoosh_take(peak=0.3, dur=0.8, seed=9):
    r = np.random.default_rng(seed)
    u = np.arange(int(dur * SR)) / SR
    env = np.exp(-((u - peak) / 0.07) ** 2)
    return np.stack([r.standard_normal(len(u)) * env * 0.4] * 2, axis=1)


def make_kit(d, roles_extra=None):
    """audio/kit.json + audio/kit/ (takes, kit.lock.json, kit.source.json) in d; returns the kit path."""
    takes = os.path.join(d, 'audio', 'kit')
    os.makedirs(takes, exist_ok=True)
    lock = {'kit': 1, 'earshot': 'test', 'bank': 'test', 'sr': SR, 'name': 'test', 'roles': {}}
    kit = {'kit': 1, 'name': 'test', 'sr': SR, 'roles': {}}

    def add(role, sound, files, align='onset', level_db=-6.0, pitches=None):
        kit['roles'][role] = {'sound': sound, 'takes': len(files) // (len(pitches) if pitches else 1), 'align': align,
                              'level_db': level_db, **({'pitches': pitches} if pitches else {})}
        lock['roles'][role] = {'sound': sound, 'align': align, 'level_db': level_db, 'max_s': None, 'takes': []}
        for name, x, sync, p in files:
            sf.write(os.path.join(takes, name), x.astype(np.float32), SR, subtype='PCM_24')
            lock['roles'][role]['takes'].append(dict(file=name, seed=1, pitch=p, dur_s=len(x) / SR, peak_db=-1.0,
                                                     sha1=K.sha1_file(os.path.join(takes, name)), checks=[], **sync))
    on = lambda lead=0.03: dict(onset_s=lead, peak_s=lead + 0.002, end_s=lead + 0.03)  # noqa: E731
    add('click', 'tap/finger', [('click_1.wav', transient(1), on(), None), ('click_2.wav', transient(2), on(), None)])
    add('hit', 'notify/m0', [('hit_1.wav', transient(3), on(), None)], level_db=-3.0)
    add('key', 'typing_key/thock', [(f'key_{k}.wav', transient(10 + k, 0.008), on(0.008), None) for k in range(1, 4)])
    add('whoosh.long', 'whoosh_big/swell', [('whoosh-long_1.wav', whoosh_take(), dict(onset_s=0.1, peak_s=0.3, end_s=0.6),
                                             None)], align='peak')
    add('text', 'pluck/kalimba_soft', [(f'text_{n}.wav', tone(K_HZ[n]), dict(onset_s=0.0, peak_s=0.003, end_s=0.5), n)
                                       for n in ('G4', 'B4', 'D5')], level_db=-12.0, pitches=['G4', 'B4', 'D5'])
    kit['roles'].update({'drop': None, 'riser': None, 'swell': None, 'suck': None})
    lock['roles'].update({'drop': None, 'riser': None, 'swell': None, 'suck': None})
    for r, spec in (roles_extra or {}).items():
        kit['roles'][r] = spec
    path = os.path.join(d, 'audio', 'kit.json')
    K.write_json(path, kit)
    K.write_json(os.path.join(takes, K.LOCK), lock)
    K.write_json(os.path.join(takes, K.SOURCE), dict(kit='audio/kit.json', sha1=K.digest(kit)))
    return path


K_HZ = {n: 440.0 * 2 ** ((K.to_midi(n) - 69) / 12) for n in ('G4', 'B4', 'D5')}
NO_EARSHOT = {'EARSHOT_PYTHON': 'none'}


def onset_near(x, t, before=0.1, after=0.1):
    """The first sample at half the local peak within [t - before, t + after] (seconds)."""
    m = np.abs(x).max(axis=1) if x.ndim == 2 else np.abs(x)
    a, b = int((t - before) * SR), int((t + after) * SR)
    seg = m[a:b]
    return (a + int(np.argmax(seg >= 0.5 * seg.max()))) / SR


def peak_near(x, t, span=0.4):
    a, b = int((t - span) * SR), int((t + span) * SR)
    w = int(0.03 * SR)
    env = np.convolve((x[a:b] ** 2).mean(axis=1), np.ones(w) / w, 'same')
    return (a + int(np.argmax(env))) / SR


# ------------------------------------------------------------------------------------------
# the checks
# ------------------------------------------------------------------------------------------
def synth_engine(d, baseline):
    ev = [dict(f=30, kind='tick', id='a:tick'), dict(f=60, kind='pop', id='a:pop'), dict(f=90, kind='whoosh', dur=30,
          apexFrac=0.5, id='a:whoosh'), dict(f=120, kind='hit', id='a:hit'), dict(f=150, kind='land', variant='light',
          weight=0.5, id='a:land'), dict(f=180, kind='click', id='a:click')]
    cues = cues_with(ev)
    p1, r1 = run(d, 'legacy', cues, SYNTH_SCORE, NO_EARSHOT)
    p2, r2 = run(d, 'synth', cues, dict(SYNTH_SCORE, sfx={'engine': 'synth'}), NO_EARSHOT)
    p3, r3 = run(d, 'auto', cues, dict(SYNTH_SCORE, sfx={'engine': 'auto', 'kit': os.path.join(d, 'nokit.json')}),
                 NO_EARSHOT)
    ok = r1 and r2 and r3
    check(bool(ok), 'the synth paths render' + ('' if ok else f': {(p1.stderr or p2.stderr or p3.stderr).strip()[-300:]}'))
    if not ok:
        return
    w = [open(os.path.join(d, f'{n}.wav'), 'rb').read() for n in ('legacy', 'synth', 'auto')]
    check(w[0] == w[1] == w[2], 'engine synth, auto without a kit and a score without "sfx" render the same WAV bit for bit')
    check(r2['sfx']['source'].startswith('synth') and r3['sfx']['source'] == 'synth (fallback)',
          f"the report names the voices ({r2['sfx']['source']}; {r3['sfx']['source']})")
    check(any('blind synthesis fallback' in x for x in r3['warnings']), 'auto without a kit warns about the synth fallback')
    if baseline:
        p0, r0 = run(d, 'baseline', cues, SYNTH_SCORE, NO_EARSHOT, script=baseline)
        same = r0 is not None and open(os.path.join(d, 'baseline.wav'), 'rb').read() == w[1]
        check(same, f'engine synth matches {baseline} bit for bit' + ('' if r0 else f': {p0.stderr.strip()[-300:]}'))


def kit_engine(d):
    make_kit(d)
    ev = [dict(f=30, kind='click', id='a:click-1'), dict(f=60, kind='click', id='a:click-2'),
          dict(f=90, kind='text', id='a:fragment-1'), dict(f=126, kind='text', id='a:fragment-2'),
          dict(f=162, kind='text', id='a:fragment-3'), dict(f=200, kind='whoosh', dur=48, apexFrac=0.5, id='a:move'),
          dict(f=240, kind='hit', id='a:lockup'), dict(f=250, kind='drop', id='a:drop'),
          dict(f=270, kind='tock', id='a:tock')]
    ev += [dict(f=12 + 4 * k, kind='key', variant='word' if k == 0 else None, id=f'a:key{k}') for k in range(3)]
    ev = [{k: v for k, v in e.items() if v is not None} for e in ev]
    score = {'key': 'G major', 'bpm': 120, 'music': 'none', 'sfx': {'engine': 'auto', 'kit': 'audio/kit.json'},
             'master': {'fade': 0.4}}
    p, r = run(d, 'kit', cues_with(ev), score, NO_EARSHOT)  # "audio/kit.json" resolves next to the score
    check(r is not None, 'renders with a kit' + ('' if r else f': {p.stderr.strip()[-400:]}'))
    if not r:
        return
    sx = r['sfx']
    check(sx['source'] == 'earshot kit', f"the kit plays as rendered ({sx['source']})")
    x, _ = sf.read(os.path.join(d, 'kit.stems', 'sfx.wav'))
    for f, what in ((30, 'click'), (60, 'second click'), (240, 'hit')):
        off = (onset_near(x, f / FPS, 0.05, 0.05) - f / FPS) * FPS
        check(abs(off) < 0.5, f'{what} transient on its frame ({off:+.2f} f)')
    pk = (peak_near(x, 200 / FPS) - 200 / FPS) * FPS
    check(abs(pk) < 0.5, f'whoosh peak on its apex frame ({pk:+.2f} f)')
    check(sx['roles'].get('click', {}).get('takes') == ['click_1.wav', 'click_2.wav'], 'two clicks play two different takes')
    notes = [t['note'] for t in r['events']['tuned'] if t['kind'] == 'text']
    check(notes == ['G4', 'B4', 'D5'], f'a text chain steps through the chord tones on the pitched takes ({notes})')
    check(sx['off'] == {'drop': 1} and any(s.get('role') == 'drop' for s in r['events']['skipped']),
          'a role set to null skips its cue')
    check(sx['synth'] == {'tock': 1}, f"a role the kit does not name keeps its synth voice ({sx['synth']})")
    keys = sx['roles'].get('key', {})
    check(keys.get('cues') == 3, f"every planned key plays a key take ({keys.get('cues')})")
    offs = [(onset_near(x, f / FPS, 0.03, 0.03) - f / FPS) * FPS for f in (12, 16, 20)]
    check(all(abs(o) < 0.5 for o in offs), f"key transients on their frames, within the typing plan's jitter "
          f"({', '.join(f'{o:+.2f}' for o in offs)} f)")
    check(r['target_lufs']['lufs'] == -18 and abs(r['lufs'] + 18) <= 0.5, f"an effects-only film defaults to -18 LUFS ({r['lufs']})")
    check('hook' not in r, 'the hook check is off without music')
    check(r['stacks'] == [], f"one clean hit is not a stack ({r['stacks']})")


def fallbacks(d):
    kit = make_kit(d)
    ev = [dict(f=60, kind='click', id='a:click'), dict(f=150, kind='hit', id='a:hit')]
    score = {'key': 'C major', 'music': 'none', 'sfx': {'kit': kit}}
    src = os.path.join(d, 'audio', 'kit', K.SOURCE)
    keep = open(src).read()
    os.remove(src)
    p, r = run(d, 'vend', cues_with(ev), score, NO_EARSHOT)
    check(r is not None and r['sfx']['source'] == 'vendored kit (unchecked)',
          f"takes rendered outside kit.py play without earshot ({r and r['sfx']['source']})")
    open(src, 'w').write(keep)
    k = K.read_json(kit, 'kit')
    k['roles']['hit']['level_db'] = -1.0
    K.write_json(kit, k)
    p, r = run(d, 'stale', cues_with(ev), score, NO_EARSHOT)
    check(r is not None and r['sfx']['source'] == 'vendored kit (stale)'
          and any('playing the takes as they are' in x for x in r['warnings']),
          'a changed kit.json without earshot plays the rendered takes with a warning')
    os.rename(os.path.join(d, 'audio', 'kit'), os.path.join(d, 'audio', 'kit-gone'))
    p, r = run(d, 'none', cues_with(ev), score, NO_EARSHOT)
    check(r is not None and r['sfx']['source'] == 'synth (fallback)'
          and any('blind synthesis fallback' in x for x in r['warnings']), 'no takes and no earshot: synth voices, loud warning')
    p, r = run(d, 'strict', cues_with(ev), dict(score, sfx={'kit': kit, 'engine': 'earshot'}), NO_EARSHOT)
    check(p.returncode == 1 and 'no kit can be played' in p.stderr, '"engine": "earshot" without a playable kit fails')


def stack_guard(d):
    ev = [dict(f=214, kind='whoosh', dur=24, apexFrac=0.5, id='m:slide'), dict(f=228, kind='drop', id='m:lockup'),
          dict(f=228, kind='snap', id='m:name-locks')]
    score = dict(SYNTH_SCORE, payoff='@lockup', motifs=[{'at': '@lockup'}], sfx={'engine': 'synth'})
    p, r = run(d, 'stacked', cues_with(ev, cue={'lockup': 228}), score)
    st = (r or {}).get('stacks') or []
    check(len(st) == 1 and st[0]['at'] == 'lockup' and len(st[0]['layers']) == 3 and st[0]['lead_ins'] == ['whoosh m:slide'],
          f"the stack guard reports the stacked lockup ({st})")
    check(any(x.startswith('stacked lockup') for x in (r or {}).get('warnings', [])), 'and warns about it')
    ev = [dict(f=160, kind='land', id='m:piece'), dict(f=228, kind='hit', id='m:lockup')]
    p, r = run(d, 'clean', cues_with(ev, cue={'lockup': 228}), dict(SYNTH_SCORE, payoff='@lockup', sfx={'engine': 'synth'}))
    check(r is not None and r['stacks'] == [], 'one clean hit after a stop-down is not a stack')


def music_none(d):
    ev = [dict(f=30, kind='text', id='a:t1'), dict(f=90, kind='text', id='a:t2')]
    p, r = run(d, 'nomusic', cues_with(ev), {'key': 'D minor', 'music': 'none', 'sfx': {'engine': 'synth'}})
    check(r is not None and r['target_lufs']['music'] == 'none', 'music "none" renders without chords'
          + ('' if r else f': {p.stderr.strip()[-200:]}'))
    if r:
        notes = [t['note'] for t in r['events']['tuned']]
        check(notes == ['D5', 'F5'], f'synth text sounds step through the key\'s triad without chords ({notes})')
        bed = os.path.join(d, 'nomusic.stems', 'pad.wav')
        check(os.path.exists(bed) and float(np.abs(sf.read(bed)[0]).max()) == 0.0, 'and no synth band plays')
    p, r = run(d, 'needchords', cues_with(ev), {'key': 'C major', 'music': 'synth'})
    check(p.returncode == 1 and 'needs "chords"' in p.stderr, 'the synth band still needs chords')


def kit_helpers():
    check(K.note(K.to_midi('C#5')) == 'C#5' and abs(K.to_midi(440) - 69) < 1e-9 and K.to_midi('Cs5') == 73,
          'kit.py reads note names and Hz')
    check([K.role_for('tick', 'crisp'), K.role_for('land', None, 0.5), K.role_for('whoosh', None, 1, 0.3),
           K.role_for('whoosh', None, 1, 0.9), K.role_for('key', 'space')] ==
          ['tick.crisp', 'land.light', 'whoosh.short', 'whoosh.long', 'key.space'], 'the cue -> role mapping')
    kit = {'roles': {'bell': {'sound': 'pluck/kalimba', 'pitches': ['C5', 'D5', 'E5', 'G5', 'A5']},
                     'text': {'sound': 'pluck/kalimba_soft', 'pitches': ['C5', 'E5', 'G5']},
                     'click.confirm': {'sound': 'pluck/kalimba_soft', 'edits': {'pitch': 'C6'}},
                     'hit': {'sound': 'notify/m0'}, 'tick': {'sound': 'tap/glass'}}}
    knobs = {'notify/m0': {'pitch': {'native_hz': 523.25, 'range_hz': [220.0, 3200.0]}}}
    K.tune(kit, (7, [0, 2, 4, 5, 7, 9, 11], 'G major'), knobs)
    r = kit['roles']
    check(r['bell']['pitches'] == ['G4', 'A4', 'B4', 'D5', 'E5'] and r['text']['pitches'] == ['G4', 'B4', 'D5']
          and r['click.confirm']['edits']['pitch'] == 'G5' and r['hit']['edits']['pitch'] == 'G4' and 'edits' not in r['tick'],
          f"tuning to G major: bell pentatonic, text triad, nearest tonics ({r})")


def real_earshot(d):
    py = os.environ.get('EARSHOT_PYTHON')
    es = K.find_earshot()[0] if py and py.lower() not in ('none', 'off') else None
    if not es:
        print('skip real earshot render (set EARSHOT_PYTHON to an earshot 0.3+ interpreter)')
        return
    os.makedirs(os.path.join(d, 'audio'), exist_ok=True)
    kit = {'kit': 1, 'name': 'tiny', 'sr': SR, 'roles': {
        'tick': {'sound': 'tap/glass', 'takes': 2, 'align': 'onset', 'level_db': -8.0},
        'whoosh.long': {'sound': 'whoosh_big/swell', 'takes': 1, 'align': 'peak', 'level_db': -7.0}, 'riser': None}}
    path = os.path.join(d, 'audio', 'kit.json')
    K.write_json(path, kit)
    p = subprocess.run([sys.executable, KITPY, 'render', '--kit', path, '--score', os.path.join(d, 'none.json')],
                       capture_output=True, text=True)
    check(p.returncode == 0 and K.kit_state(path, os.path.join(d, 'audio', 'kit'))['status'] == 'current',
          f'kit.py render writes current takes with earshot ({(p.stdout + p.stderr).strip()[-200:]})')
    ev = [dict(f=60, kind='tick', id='a:t1'), dict(f=150, kind='whoosh', dur=60, apexFrac=0.5, id='a:w'),
          dict(f=240, kind='tick', id='a:t2')]
    p, r = run(d, 'real', cues_with(ev), {'key': 'C major', 'music': 'none', 'sfx': {'kit': path}})
    if not r:
        check(False, f'renders with the real kit: {p.stderr.strip()[-300:]}')
        return
    x, _ = sf.read(os.path.join(d, 'real.stems', 'sfx.wav'))
    lock = K.read_json(os.path.join(d, 'audio', 'kit', K.LOCK), 'lock')
    for f in (60, 240):
        off = (onset_near(x, f / FPS, 0.05, 0.05) - f / FPS) * FPS
        check(abs(off) <= 1.0, f'a real tap/glass take lands on frame {f} ({off:+.2f} f)')
    check(r['sfx']['source'] == 'earshot kit' and lock['bank'], f"report names the kit and bank ({r['sfx']['source']}, {lock['bank']})")


def main():
    baseline = sys.argv[sys.argv.index('--baseline') + 1] if '--baseline' in sys.argv else None
    kit_helpers()
    for fn in (lambda d: synth_engine(d, baseline), kit_engine, fallbacks, stack_guard, music_none, real_earshot):
        with tempfile.TemporaryDirectory() as d:
            fn(d)
    print(f"score.test.py: {'all checks pass' if not FAILS else f'{len(FAILS)} failed'}")
    return 1 if FAILS else 0


if __name__ == '__main__':
    sys.exit(main())
