#!/usr/bin/env python3
"""Regression tests for score.py, plan.py, mixkeys.py and credits.py: the two kinds of film sound (effects-only
on an earshot kit; a licensed track with the launch kit levelled over it).

Builds its own cue lists, kits, takes and test beds in a temporary folder (test signals made in code: noise,
clicks and tones, never music, never files in the repo) and checks:
  - effects-only baseline: the same film renders bit for bit twice, and (with --baseline OLD/score.py) bit for
    bit the same WAV as that score.py on an effects-only film whose cues the kit covers (the 1.1 path)
  - kit: a take's transient lands on its cue frame, a whoosh's loudest point on its apex frame, a key's
    transient on its typing-plan time, within half a frame; two clicks play two different takes; a text chain
    steps through the chord's tones on the pitched takes; a role set to null skips its cue
  - every effect from the kit: a role the kit does not name, an explicit note no take sounds, or no kit at all
    fails the gate (exit 1); --draft plays placeholder voices and the report says "draft": true, "pass": false;
    "engine": "earshot" without a playable kit fails; "music": "synth" exits 1 with the migration message
  - tuned effects never become a melody: at most 2 pitched effects in any 4 s (the rest thinned, listed)
  - the stack guard reports a stacked lockup and stays quiet on one clean hit; score.json drops are read as
    stop-downs (no suck, no stack)
  - the progress climb on a tuned kit role (rungs 2 s apart) and its resolve; an untuned role warns
  - a text chain over two chords; a bright kit key names its take; land.light at level_db x weight; takes
    trimmed toward their role's median loudness; kit.py helpers (note names, roles, tuning, invalid key)
  - music-led (a test bed, an edit.json written here, the launch-style kit with bed_db / offset_ms / width):
    bed_edit (segments and a join: no click, the incoming attack on the film downbeat; stems sum to the
    premix), stopdown (depth and length, a top-up over the bed's own dip, back on the hit), no_duck, width_kept,
    over_bed (the plan's gain measured within 0.5 dB on a steady bed), on_beat_over_bed (pops on a strong kick read
    hot with the bed, each take alone within 0.5 dB of its level, no warning), carried_by_track (a strong track accent
    carries a hit; force keeps it), music_synth_refused, the -14 LUFS default; moments_arc (a salient hit read as earshot
    reads one, a moment's breath making its frame one, the moments' order, the arc ride lifting a body under its opening
    and leaving the break before the reveal and a body already over it alone)
  - mixkeys parity with earshot 0.4 (when earshot is importable: EARSHOT_PYTHON or this interpreter):
    loud_lufs, bed_level, over_bed, gain_db within 0.05 dB, place and space_run within 0.1 ms, corr
  - credits_gate: a valid record writes CREDITS.md and the description; a CC BY record without its credit, a
    record without licence_seen, a changed file, a --draft report are refused (exit 1); no report exits 2
  - av-audit.py (needs librosa): a skipped riser does not hide the hit on its frame; a sharp attack on a cue
    frame is not a click; onsets inside a whoosh's span are not strays; intended times from cues_sounded.json
  - with EARSHOT_PYTHON pointing at an earshot 0.4 interpreter: a real two-role kit renders with kit.py and its
    takes land on their frames (skipped otherwise)

Usage: python3 skills/cinetic/scripts/test/score.test.py [--baseline OLD/score.py] [--only test,test]
(needs numpy, scipy, soundfile and pyloudnorm; librosa for the av-audit checks). Exit 0 when every check
passes, 1 otherwise.
"""
import json
import os
import subprocess
import sys
import tempfile
import types

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, '..', 'audio')
SCORE = os.path.join(AUDIO, 'score.py')
KITPY = os.path.join(AUDIO, 'kit.py')
CREDITS = os.path.join(AUDIO, 'credits.py')
sys.path.insert(0, AUDIO)
import kit as K  # noqa: E402
import mixkeys as MK  # noqa: E402

FPS, SR = 60, 48000
FAILS = []


def check(ok, what):
    print(('ok   ' if ok else 'FAIL ') + what)
    if not ok:
        FAILS.append(what)


def run(d, name, cues, score, env=None, script=SCORE, args=()):
    """Render cues + score in d; returns (CompletedProcess, report dict or None)."""
    c, s = os.path.join(d, f'{name}.cues.json'), os.path.join(d, f'{name}.score.json')
    json.dump(cues, open(c, 'w'))
    json.dump(score, open(s, 'w'))
    rep = os.path.join(d, f'{name}.report.json')
    if os.path.exists(rep):
        os.remove(rep)
    a = [sys.executable, script, '--cues', c, '--score', s, '--out', os.path.join(d, f'{name}.wav'),
         '--stems', os.path.join(d, f'{name}.stems'), '--json', rep, '--quiet'] + list(args)
    p = subprocess.run(a, capture_output=True, text=True, env=dict(os.environ, **(env or {})))
    return p, (json.load(open(rep)) if os.path.exists(rep) else None)


def cues_with(events, total=300, cue=None, bpm=120):
    return dict(fps=FPS, bpm=bpm, total=total, acts={'all': {'from': 0, 'dur': total}}, cue=cue or {'mid': total // 2},
                events=events)


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


def body(seed, lead=0.01, dur=0.15, tau=0.03):
    """a short noise body (a pop or a hit for the over-bed checks): onset at `lead`, peak normalised to -1 dBFS"""
    r = np.random.default_rng(seed)
    u = np.arange(int(dur * SR)) / SR
    x = np.concatenate([np.zeros(int(lead * SR)), r.standard_normal(len(u)) * np.exp(-u / tau) * np.minimum(1, u / 0.001)])
    return x / np.abs(x).max() * 10 ** (-1 / 20)


def whoosh_take(peak=0.3, dur=0.8, seed=9):
    r = np.random.default_rng(seed)
    u = np.arange(int(dur * SR)) / SR
    env = np.exp(-((u - peak) / 0.07) ** 2)
    return np.stack([r.standard_normal(len(u)) * env * 0.4] * 2, axis=1)


def wide_take(seed, lead=0.01, dur=0.08):
    """a stereo take with two independent channels (L / R correlation near 0)"""
    a, b = body(seed, lead, dur, 0.012), body(seed + 1, lead, dur, 0.012)
    return np.stack([a, b], axis=1)


def on(lead=0.03):
    """The sync points of a transient() take."""
    return dict(onset_s=lead, peak_s=lead + 0.002, end_s=lead + 0.03)


def tone_role(notes, level_db=-6.0):
    """files for add_role: one tone() take per note, onset at 0."""
    return [(f'{n}.wav', tone(440.0 * 2 ** ((K.to_midi(n) - 69) / 12)), dict(onset_s=0.0, peak_s=0.003, end_s=0.5), n)
            for n in notes]


def add_role(kit_path, role, sound, files, align='onset', level_db=-6.0, pitches=None, lufs=None, mix=None):
    """Add (or replace) a role in a kit made by make_kit: its takes (files = [(name, samples, sync, pitch)]), the
    lock rows (lufs: one lufs_m_max per take; mix: the role's mix keys, bed_db, offset_ms, min_gap_ms, width, with
    l50_lufs and corr measured on the takes as earshot 0.4 does) and the source digest, so it stays current."""
    d = os.path.dirname(kit_path)
    takes = os.path.join(d, 'kit')
    kit, lock = K.read_json(kit_path, 'kit'), K.read_json(os.path.join(takes, K.LOCK), 'lock')
    kit['roles'][role] = {'sound': sound, 'takes': len(files) // (len(pitches) if pitches else 1), 'align': align,
                          'level_db': level_db, **({'pitches': pitches} if pitches else {}), **(mix or {})}
    lock['roles'][role] = {'sound': sound, 'align': align, 'level_db': level_db, 'max_s': None, **(mix or {}), 'takes': []}
    for k, (name, x, sync, p) in enumerate(files):
        name = f"{role.replace('.', '-')}_{name}" if not name.startswith(role.replace('.', '-')) else name
        sf.write(os.path.join(takes, name), np.asarray(x, np.float32), SR, subtype='PCM_24')
        y, _ = sf.read(os.path.join(takes, name), dtype='float64')
        row = dict(file=name, seed=1, pitch=p, dur_s=len(x) / SR, peak_db=round(float(20 * np.log10(np.abs(y).max() + 1e-12)), 2),
                   sha1=K.sha1_file(os.path.join(takes, name)), checks=[], **sync, **({'lufs_m_max': lufs[k]} if lufs else {}))
        if mix and mix.get('bed_db') is not None:
            row['l50_lufs'] = MK.loud_lufs(y)
        if mix and mix.get('width') is not None:
            row['corr'] = round(MK.corr(y), 3)
        lock['roles'][role]['takes'].append(row)
    K.write_json(kit_path, kit)
    K.write_json(os.path.join(takes, K.LOCK), lock)
    K.write_json(os.path.join(takes, K.SOURCE), dict(kit='audio/kit.json', sha1=K.digest(kit)))


def make_kit(d, roles_extra=None, tock=False):
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
    add('click', 'tap/finger', [('click_1.wav', transient(1), on(), None), ('click_2.wav', transient(2), on(), None)])
    add('hit', 'notify/m0', [('hit_1.wav', transient(3), on(), None)], level_db=-3.0)
    add('key', 'typing_key/thock', [(f'key_{k}.wav', transient(10 + k, 0.008), on(0.008), None) for k in range(1, 4)])
    add('whoosh.long', 'whoosh_big/swell', [('whoosh-long_1.wav', whoosh_take(), dict(onset_s=0.1, peak_s=0.3, end_s=0.6),
                                             None)], align='peak')
    add('text', 'pluck/kalimba_soft', [(f'text_{n}.wav', tone(K_HZ[n]), dict(onset_s=0.0, peak_s=0.003, end_s=0.5), n)
                                       for n in ('G4', 'B4', 'D5')], level_db=-12.0, pitches=['G4', 'B4', 'D5'])
    if tock:
        add('tock', 'tap/knuckle', [('tock_1.wav', transient(30), on(), None)], level_db=-6.0)
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
FX_ONLY = {'key': 'G major', 'bpm': 120, 'music': 'none', 'sfx': {'engine': 'auto', 'kit': 'audio/kit.json'},
           'master': {'fade': 0.4}}


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
# effects-only
# ------------------------------------------------------------------------------------------
def effects_only_baseline(d, baseline):
    """The effects-only path is the 1.1 path: a film whose cues the kit covers renders bit for bit the same."""
    make_kit(d, tock=True)
    ev = [dict(f=30, kind='click', id='a:c1'), dict(f=60, kind='click', id='a:c2'), dict(f=90, kind='text', id='a:t1'),
          dict(f=220, kind='text', id='a:t2'), dict(f=150, kind='whoosh', dur=40, apexFrac=0.5, id='a:w'),
          dict(f=200, kind='tock', id='a:k'), dict(f=360, kind='hit', id='a:lockup'), dict(f=250, kind='drop', id='a:d')]
    ev += [dict(f=300 + 4 * k, kind='key', id=f'a:key{k}', **({'variant': 'word'} if k == 0 else {})) for k in range(4)]
    cues = cues_with(ev, total=420, cue={'lockup': 360})
    score = dict(FX_ONLY, payoff='@lockup', chords=['Gadd9', 'Cmaj9', 'Em9', '-'])
    p1, r1 = run(d, 'fx1', cues, score, NO_EARSHOT)
    p2, r2 = run(d, 'fx2', cues, score, NO_EARSHOT)
    ok = r1 is not None and r2 is not None and p1.returncode == 0
    check(ok, 'an effects-only film renders and passes' + ('' if ok else f': {(p1.stderr or p2.stderr).strip()[-300:]}'))
    if not ok:
        return
    w1, w2 = (open(os.path.join(d, f'{n}.wav'), 'rb').read() for n in ('fx1', 'fx2'))
    check(w1 == w2, 'the same effects-only film renders bit for bit twice')
    check(r1['music']['source'] == 'none' and r1['target_lufs']['lufs'] == -18 and abs(r1['lufs'] + 18) <= 0.5,
          f"an effects-only film: no music, -18 LUFS ({r1['lufs']})")
    st = os.listdir(os.path.join(d, 'fx1.stems'))
    check(st == ['sfx.wav'], f'effects-only stems: sfx only ({st})')
    if baseline:
        p0, r0 = run(d, 'baseline', cues, score, NO_EARSHOT, script=baseline)
        same = r0 is not None and open(os.path.join(d, 'baseline.wav'), 'rb').read() == w1
        check(same, f'effects-only matches {baseline} bit for bit' + ('' if r0 else f': {p0.stderr.strip()[-300:]}'))


def kit_engine(d):
    make_kit(d)
    ev = [dict(f=30, kind='click', id='a:click-1'), dict(f=60, kind='click', id='a:click-2'),
          dict(f=90, kind='text', id='a:fragment-1'), dict(f=220, kind='text', id='a:fragment-2'),
          dict(f=350, kind='text', id='a:fragment-3'), dict(f=200, kind='whoosh', dur=48, apexFrac=0.5, id='a:move'),
          dict(f=480, kind='hit', id='a:lockup'), dict(f=500, kind='drop', id='a:drop')]
    ev += [dict(f=12 + 4 * k, kind='key', variant='word' if k == 0 else None, id=f'a:key{k}') for k in range(3)]
    ev = [{k: v for k, v in e.items() if v is not None} for e in ev]
    p, r = run(d, 'kit', cues_with(ev, total=560), FX_ONLY, NO_EARSHOT)  # "audio/kit.json" resolves next to the score
    check(r is not None and p.returncode == 0, 'renders with a kit' + ('' if r else f': {p.stderr.strip()[-400:]}'))
    if not r:
        return
    sx = r['sfx']
    check(sx['source'] == 'earshot kit', f"the kit plays as rendered ({sx['source']})")
    x, _ = sf.read(os.path.join(d, 'kit.stems', 'sfx.wav'))
    for f, what in ((30, 'click'), (60, 'second click'), (480, 'hit')):
        off = (onset_near(x, f / FPS, 0.05, 0.05) - f / FPS) * FPS
        check(abs(off) < 0.5, f'{what} transient on its frame ({off:+.2f} f)')
    pk = (peak_near(x, 200 / FPS) - 200 / FPS) * FPS
    check(abs(pk) < 0.5, f'whoosh peak on its apex frame ({pk:+.2f} f)')
    check(sx['roles'].get('click', {}).get('takes') == ['click_1.wav', 'click_2.wav'], 'two clicks play two different takes')
    notes = [t['note'] for t in r['events']['tuned'] if t['kind'] == 'text']
    check(notes == ['G4', 'B4', 'D5'], f'a text chain (fragments 2 s apart) steps through the chord tones on the pitched takes ({notes})')
    check(sx['off'] == {'drop': 1} and any(s.get('role') == 'drop' for s in r['events']['skipped']),
          'a role set to null skips its cue')
    keys = sx['roles'].get('key', {})
    check(keys.get('cues') == 3, f"every planned key plays a key take ({keys.get('cues')})")
    offs = [(onset_near(x, f / FPS, 0.03, 0.03) - f / FPS) * FPS for f in (12, 16, 20)]
    check(all(abs(o) < 0.5 for o in offs), f"key transients on their frames, within the typing plan's jitter "
          f"({', '.join(f'{o:+.2f}' for o in offs)} f)")
    check('hook' not in r and r['stacks'] == [], f"no hook check without music; one clean hit is not a stack ({r['stacks']})")


def kit_only(d):
    """Every effect is an earshot kit take: a role the kit does not name, an explicit note no take sounds, no kit
    at all fail the gate; --draft plays placeholder voices and never passes."""
    make_kit(d)
    ev = [dict(f=60, kind='click', id='a:c'), dict(f=150, kind='tock', id='a:tock')]
    FX = dict(FX_ONLY, master={'fade': 0.4, 'lufs': -26})  # two lone test clicks: a quiet target the limiter can reach
    p, r = run(d, 'miss', cues_with(ev), FX, NO_EARSHOT)
    check(p.returncode == 1 and r is not None and any('no earshot kit take' in f for f in r['fails'])
          and r['sfx']['missing'] == 1, f"a role the kit does not name fails the gate ({(r or {}).get('fails')})")
    p, r = run(d, 'miss-draft', cues_with(ev), FX, NO_EARSHOT, args=['--draft'])
    check(p.returncode == 0 and r is not None and r['draft'] is True and r['pass'] is False
          and r['sfx']['draft_voices'] == {'tock': 1}, f"--draft plays a placeholder voice and never passes ({r and r['sfx']})")
    ev = [dict(f=60, kind='text', pitch='C#7', id='a:set'), dict(f=200, kind='text', id='a:free')]
    p, r = run(d, 'note', cues_with(ev), FX_ONLY, NO_EARSHOT)
    check(p.returncode == 1 and r is not None and any('has no take on' in f for f in r['fails']),
          'an explicit note no take sounds fails the gate (never a neighbouring, wrong take)')
    p, r = run(d, 'synth', cues_with(ev[1:]), dict(FX_ONLY, sfx={'engine': 'synth'}), NO_EARSHOT)
    check(p.returncode == 1 and '--draft' in p.stderr, '"engine": "synth" is a --draft build only')
    os.rename(os.path.join(d, 'audio', 'kit'), os.path.join(d, 'audio', 'kit-gone'))
    p, r = run(d, 'nokit', cues_with(ev[1:]), FX_ONLY, NO_EARSHOT)
    check(p.returncode == 1 and 'no earshot kit can be played' in p.stderr, 'no takes and no earshot: the build fails (no blind voices)')
    p, r = run(d, 'strict', cues_with(ev[1:]), dict(FX_ONLY, sfx={'kit': 'audio/kit.json', 'engine': 'earshot'}), NO_EARSHOT)
    check(p.returncode == 1 and 'no kit can be played' in p.stderr, '"engine": "earshot" without a playable kit fails')


def vendored(d):
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


def tuned_budget(d):
    """At most 2 pitched effects in any 4 s: a run of four text fragments 0.6 s apart keeps two."""
    make_kit(d)
    ev = [dict(f=60 + 36 * k, kind='text', id=f'a:frag{k}') for k in range(4)]
    p, r = run(d, 'tuned', cues_with(ev, total=420), FX_ONLY, NO_EARSHOT)
    if not r:
        check(False, f'a dense text chain renders: {p.stderr.strip()[-300:]}')
        return
    played = [t for t in r['events']['tuned'] if t['kind'] == 'text']
    thin = [s for s in r['events']['skipped'] if 'tuned budget' in str(s.get('why'))]
    check(len(played) == 2 and len(thin) == 2 and any('tuned budget' in w for w in r['warnings']),
          f'four tuned fragments in 2 s: two sound, two are thinned and listed ({[t["note"] for t in played]})')


def stack_guard(d):
    kit = make_kit(d)
    add_role(kit, 'drop', 'cut_hit/kick', [('1.wav', transient(60), on(), None)], level_db=-6.0)
    add_role(kit, 'snap', 'shutter/dslr', [('1.wav', transient(61), on(), None)], level_db=-6.0)
    ev = [dict(f=214, kind='whoosh', dur=24, apexFrac=0.5, id='m:slide'), dict(f=228, kind='drop', id='m:lockup'),
          dict(f=228, kind='snap', id='m:name-locks')]
    score = dict(FX_ONLY, payoff='@lockup')
    p, r = run(d, 'stacked', cues_with(ev, cue={'lockup': 228}), score, NO_EARSHOT)
    st = (r or {}).get('stacks') or []
    check(len(st) == 1 and st[0]['at'] == 'lockup' and len(st[0]['layers']) == 2 and st[0]['lead_ins'] == ['whoosh m:slide'],
          f"the stack guard reports the stacked lockup ({st or (p.stderr.strip()[-200:])})")
    check(any(x.startswith('stacked lockup') for x in (r or {}).get('warnings', [])), 'and warns about it')
    ev = [dict(f=160, kind='click', id='m:piece'), dict(f=228, kind='hit', id='m:lockup')]
    drop = [{'at': '@lockup', 'silence': '1/16', 'suck': 0.2}]
    p, r = run(d, 'clean', cues_with(ev, cue={'lockup': 228}), dict(score, drops=drop), NO_EARSHOT)
    check(r is not None and r['stacks'] == [] and any('older form' in w for w in r['warnings'])
          and not any('suck' in w and 'duck' not in w for w in r['warnings'] if 'older form' not in w),
          'one clean hit after a stop-down is not a stack; score.json drops read as the older form of a stop-down')


def music_none(d):
    make_kit(d)
    ev = [dict(f=30, kind='text', id='a:t1'), dict(f=180, kind='text', id='a:t2')]
    p, r = run(d, 'nomusic', cues_with(ev), dict(FX_ONLY, key='D minor'), NO_EARSHOT)
    check(r is not None and r['target_lufs']['music'] == 'none', 'music "none" renders without chords'
          + ('' if r else f': {p.stderr.strip()[-200:]}'))
    p, r = run(d, 'oldsynth', cues_with(ev), dict(FX_ONLY, chords=['Em9', '-'], sections=[{'bars': [1, 2], 'style': 'drive'}],
                                                  music=None), NO_EARSHOT)
    check(r is not None and any('generated band' in w for w in r['warnings']) and not os.path.exists(os.path.join(d, 'oldsynth.stems', 'pad.wav')),
          'a 1.1 band score without "music" renders effects-only with a warning (no band stems)')


def music_synth_refused(d):
    make_kit(d)
    p, r = run(d, 'synth', cues_with([dict(f=30, kind='click', id='a:c')]), dict(FX_ONLY, music='synth'), NO_EARSHOT)
    check(p.returncode == 1 and 'cinetic makes no music' in p.stderr and 'licensed' in p.stderr and r is None,
          '"music": "synth" exits 1 with the migration message')


def kit_helpers():
    check(K.note(K.to_midi('C#5')) == 'C#5' and abs(K.to_midi(440) - 69) < 1e-9 and K.to_midi('Cs5') == 73,
          'kit.py reads note names and Hz')
    check([K.role_for('tick', 'crisp'), K.role_for('land', None, 0.5), K.role_for('whoosh', None, 1, 0.3),
           K.role_for('whoosh', None, 1, 0.9), K.role_for('key', 'space')] ==
          ['tick.crisp', 'land.light', 'whoosh.short', 'whoosh.long', 'key.space'], 'the cue -> role mapping')
    kit = {'roles': {'bell': {'sound': 'pluck/kalimba', 'pitches': ['C5', 'D5', 'E5', 'G5', 'A5']},
                     'text': {'sound': 'pluck/kalimba_soft', 'pitches': ['C5', 'E5', 'G5']},
                     'click.confirm': {'sound': 'pluck/kalimba_soft', 'edits': {'pitch': 'C6'}},
                     'hit': {'sound': 'notify/m0'}, 'tick': {'sound': 'tap/glass'},
                     'drop': {'sound': 'cut_hit/kick'}, 'text2': {'sound': 'mallet/pluck', 'pitches': ['C4']}}}
    knobs = {'notify/m0': {'pitch': {'native_hz': 523.25, 'range_hz': [220.0, 3200.0]}},
             'cut_hit/kick': {'pitch': {'native_hz': 55.0, 'range_hz': [40.0, 120.0]}}}
    K.tune(kit, (7, [0, 2, 4, 5, 7, 9, 11], 'G major'), knobs)
    r = kit['roles']
    check(r['bell']['pitches'] == ['G4', 'A4', 'B4', 'D5', 'E5'] and r['text']['pitches'] == ['G4', 'B4', 'D5']
          and r['click.confirm']['edits']['pitch'] == 'G5' and r['hit']['edits']['pitch'] == 'G4' and 'edits' not in r['tick'],
          f"tuning to G major: bell pentatonic, text triad, nearest tonics ({r})")
    check(r['drop'].get('edits', {}).get('pitch') == 'G1', f"a cut_hit drop is pitched to the root ({r['drop']})")
    kit = {'roles': {'text': {'sound': 'mallet/pluck', 'pitches': ['G3', 'A3', 'B3', 'D4', 'E4']}}}
    K.tune(kit, (2, [0, 2, 3, 5, 7, 8, 10], 'D minor'), {'mallet/pluck': {'pitch': {'native_hz': 262.0, 'range_hz': [150.0, 3200.0]}}})
    check(kit['roles']['text']['pitches'] == ['D4', 'F4', 'G4', 'A4', 'C5'],
          f"tuning to D minor moves the text set an octave up into mallet/pluck's range ({kit['roles']['text']['pitches']})")
    check('mallet' in K.TONAL and 'cut_hit' in K.TONAL and 'launch' in K.PRESETS, 'kit.py knows the launch kit and its tonal members')
    import plan as PL  # noqa: E402
    check(PL.is_accent('land.light') and PL.is_accent('click.confirm') and PL.is_accent('drop') and not PL.is_accent('click')
          and not PL.is_accent('landing') and not PL.is_accent(None), "a run's landing: click.confirm, land, drop and their variants")
    note = 'Soft, short effects. Levels are median values measured over a set of sample clips; the rest stays. A pluck for text.'
    check(K.house_wording(note) == 'Soft, short effects. The numbers are house numbers for music-led films; the rest stays. '
          'A pluck for text.' and K.house_wording('x.wav vs 7 sample clips') == 'x.wav vs 7 sample clips',
          'kit.py init rewrites a note that says where its numbers came from (and leaves the rest)')
    # critique lines in the shapes earshot prints: range labels, a count of the set, the set named, a profile entry,
    # and two rules meeting on one phrase; every one comes out in house wording, the numbers kept
    # earshot's raw lines are assembled from pieces, so this file never spells the phrases it tests out whole
    REFS, FILMS, LOO = 'refer' + 'ences', 'launch ' + 'films', 'leave-' + 'one-out'
    cases = [
        (f'x.wav vs 5 {FILMS} (bundled {FILMS}): close - 12 of 15 scored metrics in range.',
         'x.wav vs the launch profile: close - 12 of 15 scored metrics in range.'),
        ('nearly mono (side -30.0 dB vs mid; ' + 're' + 'fs -12.0 dB .. -4.0 dB): use stereo music',
         'nearly mono (side -30.0 dB vs mid; house range -12.0 dB .. -4.0 dB): use stereo music'),
        ('tempo 96 BPM ' + 're' + 'fs p' + '10-p' + '90 100 .. 110 BPM', 'tempo 96 BPM house range 100 .. 110 BPM'),
        (f'no stop-downs: 3 of 5 {REFS} drop the sound out before a big hit',
         'no stop-downs: the launch profile tends to drop the sound out before a big hit'),
        (f'Nothing to fix against the {REFS}.', 'Nothing to fix against the house ranges.'),
        (f'Not measured: lra (clip under 12 s; the {REFS} are 12-40 s films).',
         'Not measured: lra (clip under 12 s; the house ranges hold for 12-40 s films).'),
        ('NOTE: this file is ref_2 of the profile (same duration and measurements), so it is scored against the other '
         f'4 {REFS} ({LOO}): its own values do not set the ranges.',
         "NOTE: this file is one of the launch profile's own entries, so it is scored without it: its own values do "
         'not set the ranges.'),
    ]
    got = [K.house_wording(a) for a, _ in cases]
    import re as _re
    left = [g for g in got if _re.search(r'\brefs?\b|\breferences?\b|\bp10\b|\bp90\b|\(the launch profile\)', g, _re.I)]
    check(got == [b for _, b in cases] and not left,
          f"critique lines come out in house wording ({[g for g, (_, b) in zip(got, cases) if g != b] or left})")
    deep = K.house_wording_deep({'critique': {'summary': cases[0][0], 'actions': [{'action': cases[1][0]}], 'score': 0.9}})
    check(deep == {'critique': {'summary': cases[0][1], 'actions': [{'action': cases[1][1]}], 'score': 0.9}},
          'a saved report is rewritten string by string (numbers and keys kept)')


def typing_events(n_words=7, letters=4, f0=30, step=2):
    """A typed line: words of `letters` letters split by spaces, one key every `step` frames
    (step 2 at 60 fps = 30 chars/s), word starts marked 'word'."""
    ev, f = [], f0
    for w in range(n_words):
        for k in range(letters):
            ev.append(dict(f=f, kind='key', id=f'a:key{len(ev)}', **({'variant': 'word'} if k == 0 else {})))
            f += step
        if w < n_words - 1:
            ev.append(dict(f=f, kind='key', variant='space', id=f'a:key{len(ev)}'))
            f += step
    return ev


def typing_word_kit(d):
    """P0: word-style typing (score.json "word", or "auto" above 25 chars/s) with a kit key role crashed
    with KeyError 'word'; it must render and play one key take per word."""
    make_kit(d)
    ev = typing_events()  # 34 keys at 30 chars/s
    for style in ('word', 'auto'):
        p, r = run(d, f'type-{style}', cues_with(ev), {'key': 'G major', 'music': 'none', 'typing': style,
                                                       'master': {'lufs': -26},  # a lone 1 s burst of test clicks
                                                       'sfx': {'kit': 'audio/kit.json'}}, NO_EARSHOT)
        check(r is not None and p.returncode == 0, f'typing "{style}" at 30 chars/s renders with a kit'
              + ('' if r else f': {p.stderr.strip()[-300:]}'))
        if not r:
            continue
        keys = r['sfx']['roles'].get('key', {})
        check(keys.get('cues') == 7 and len(keys.get('takes', [])) >= 2,
              f'typing "{style}": one key take per word, varied ({keys})')
        check(r['typing']['styles'] == ['word'], f"typing \"{style}\" sounds the 30 chars/s run per word ({r['typing']['styles']})")


PENTA_G = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'D6', 'E6']


def progress_kit(d):
    """Under a kit, the progress climb steps up the notes a tuned role has takes for (rungs 2.1 s apart: a climb of
    tuned hits closer than that would be a melody, the tuned budget thins it) and resolves on one; an untuned
    role warns that its rungs cannot climb."""
    kit = make_kit(d)
    add_role(kit, 'bell', 'pluck/kalimba', tone_role(PENTA_G), level_db=-5.0, pitches=PENTA_G)
    add_role(kit, 'pop', 'fit/pop/mouth_plop', [('1.wav', transient(40), on(), None), ('2.wav', transient(41), on(), None)])
    k = K.Kit(K.read_json(os.path.join(d, 'audio', 'kit', K.LOCK), 'lock'), os.path.join(d, 'audio', 'kit'), 'current')
    check(k.pick('bell', 'x', K.to_midi('C6'), explicit=True) is None and k.pick('bell', 'x', K.to_midi('D6'), explicit=True)
          and not k.covers('bell', K.to_midi('F#5')) and k.covers('pop', 60.0),
          'Kit.pick: an explicit note with no take within a quarter tone gets None (covers() says so)')
    base = dict(FX_ONLY)
    pops = [dict(f=30 + 24 * j, kind='pop', id=f'p:day{j + 1}') for j in range(5)]
    p, r = run(d, 'prog-pop', cues_with(pops + [dict(f=250, kind='hit', id='p:streak')], cue={'streak': 250}),
               dict(base, progress={'match': 'day', 'kind': 'pop', 'resolve': '@streak'}), NO_EARSHOT)
    check(r is not None and any('is untuned' in w and 'pop' in w for w in r['warnings']),
          'progress on an untuned kit role warns that its rungs cannot climb' + ('' if r else f': {p.stderr.strip()[-300:]}'))
    bells = [dict(f=30 + 126 * j, kind='bell', id=f'p:day{j + 1}') for j in range(4)]
    p, r = run(d, 'prog-bell', cues_with(bells + [dict(f=660, kind='hit', id='p:streak')], total=720, cue={'streak': 660}),
               dict(base, progress={'match': 'day', 'kind': 'bell', 'resolve': '@streak'}), NO_EARSHOT)
    if not r:
        check(False, f'progress on the kit bell renders: {p.stderr.strip()[-300:]}')
        return
    rungs = [K.to_midi(x['note']) for x in r['progress']['rungs']]
    tuned = [t['note'] for t in r['events']['tuned'] if t['kind'] == 'bell' and t.get('id') != 'progress:resolve']
    played = [K.to_midi(n) for n in tuned]
    check(rungs == played and played == sorted(set(played)) and len(played) == 4 and all(n in PENTA_G for n in tuned),
          f"progress on the kit bell climbs its take notes, a new note each rung ({tuned})")
    check(r['progress']['resolve']['note'] == 'G5' and r['pass'],
          f"and resolves on a tonic it has a take for ({r['progress'].get('resolve')}, {r['fails']})")
    fast = [dict(f=30 + 30 * j, kind='bell', id=f'p:day{j + 1}') for j in range(5)]
    p, r = run(d, 'prog-fast', cues_with(fast + [dict(f=250, kind='hit', id='p:streak')], cue={'streak': 250}),
               dict(base, progress={'match': 'day', 'kind': 'bell'}), NO_EARSHOT)
    n_played = len([t for t in (r or {}).get('events', {}).get('tuned', []) if t['kind'] == 'bell'])
    check(r is not None and n_played <= 2, f'a climb of five tuned rungs in 2 s is thinned to two (a melody otherwise: {n_played})')


def text_chord_kit(d):
    """P2: with the kit, a chain's text fragments step through each chord's tones among the text takes
    (Em9 then Cmaj9 over a G pentatonic): two fragments, two different notes, each a tone of its chord."""
    kit = make_kit(d)
    notes5 = ['G4', 'A4', 'B4', 'D5', 'E5']
    add_role(kit, 'text', 'pluck/kalimba_soft', tone_role(notes5), level_db=-12.0, pitches=notes5)
    ev = [dict(f=60, kind='text', id='a:fragment1'), dict(f=180, kind='text', id='a:fragment2')]
    score = {'key': 'G major', 'bpm': 120, 'music': 'none', 'chords': ['Em9', 'Cmaj9', '-'], 'sfx': {'kit': 'audio/kit.json'}}
    p, r = run(d, 'textchord', cues_with(ev), score, NO_EARSHOT)
    if not r:
        check(False, f'text chain over two chords renders: {p.stderr.strip()[-300:]}')
        return
    notes = [t['note'] for t in r['events']['tuned'] if t['kind'] == 'text']
    pcs = [{4, 7, 11, 2, 6}, {0, 4, 7, 11, 2}]  # Em9, Cmaj9
    check(len(notes) == 2 and notes[0] != notes[1] and all(int(K.to_midi(n)) % 12 in pc for n, pc in zip(notes, pcs))
          and len(r['sfx']['roles']['text']['takes']) == 2,
          f'a text chain over Em9 then Cmaj9 steps through each chord\'s tones on two takes ({notes})')


def band_take(seed, bands):
    """A key take of band-passed noise: bands = [(lo, hi, amplitude)]."""
    from scipy import signal
    r = np.random.default_rng(seed)
    u = np.arange(int(0.05 * SR)) / SR
    x = sum(a * signal.sosfilt(signal.butter(4, [lo, hi], 'band', fs=SR, output='sos'), r.standard_normal(len(u)))
            for lo, hi, a in bands) * np.exp(-u / 0.006)
    return np.concatenate([np.zeros(int(0.008 * SR)), 0.8 * x / np.abs(x).max()])


def typing_bright_kit(d):
    """P2: with a kit the key take sets the timbre: a bright run (centroid over the house 0.8-3 kHz of key
    clicks) warns and names the take, never a typing style that cannot change it; a dark thock whose 2-5 kHz
    share passes the placeholder voice's 25% (as every recorded key in earshot's bank does) does not warn."""
    kit = make_kit(d)
    ev = typing_events(n_words=3, letters=4, f0=130, step=6)  # 10 chars/s
    score = dict(FX_ONLY, typing='soft', chords=['Gadd9', 'Cmaj9', '-'])
    for name, bands, bright in (('bright', [(2200, 4800, 1.0)], True), ('thock', [(400, 1000, 1.0), (2200, 3800, 0.6)], False)):
        add_role(kit, 'key', f'typing_key/{name}', [(f'{k}.wav', band_take(70 + k, bands), on(0.008), None) for k in range(3)],
                 level_db=-10.0)
        p, r = run(d, name, cues_with(ev), score, NO_EARSHOT)
        w = [x for x in (r or {}).get('warnings', []) if 'is bright' in x]
        run_ = ((r or {}).get('typing') or {}).get('runs') or [{}]
        if bright:
            check(len(w) == 1 and 'key: typing_key/bright' in w[0] and 'use "soft"' not in w[0],
                  f'a bright kit key names the take in its warning ({w or run_ or p.stderr.strip()[-200:]})')
        else:
            check(r is not None and not w and run_[0].get('share_2k_5k_A_pct', 0) > 25 and run_[0].get('centroid_hz', 9e9) < 3000,
                  f"a dark kit thock is not called bright by the placeholder voice's 2-5 kHz share ({w or run_[0]})")


def land_light_and_levels(d):
    """P3: a kit land.light plays at level_db x weight like every other role (it doubled at weight 1);
    each take is trimmed toward its role's median loudness, so identical audio measured 3 LU apart in the
    lock plays 3 dB apart (and real takes measured apart play level)."""
    import score as SC
    kit = make_kit(d)
    add_role(kit, 'land.light', 'tap/soft', [('1.wav', transient(50), on(), None)], level_db=-8.0)
    same = transient(3)
    add_role(kit, 'hit', 'notify/m0', [('1.wav', same, on(), None), ('2.wav', same, on(), None)], level_db=-3.0,
             lufs=[-20.0, -23.0])
    takes = os.path.join(d, 'audio', 'kit')
    k = K.Kit(K.read_json(os.path.join(takes, K.LOCK), 'lock'), takes, 'current')
    check([t['trim_db'] for t in k.roles['hit']['takes']] == [-1.5, 1.5] and k.roles['hit']['lufs_spread'] == 3.0,
          f"takes are trimmed toward the role's median loudness ({[t['trim_db'] for t in k.roles['hit']['takes']]})")
    cues = cues_with([dict(f=60, kind='land', variant='light', weight=0.9, id='a:dot'), dict(f=120, kind='hit', id='a:h1'),
                      dict(f=240, kind='hit', id='a:h2')])
    song = SC.Song({'key': 'C major', 'music': 'none'}, cues)
    _, placed, _, _ = SC.build_sfx(song, int(6 * SR), cues['events'], {}, {}, k)
    land = next(p for p in placed if p['kind'] == 'land')
    want = SC.KIT_GAIN * 10 ** (-8.0 / 20) * 0.9
    check(abs(land['g'] - want) < 1e-9, f'a kit light landing plays at level_db x weight ({land["g"]:.4f} vs {want:.4f})')
    hits = [p for p in placed if p['kind'] == 'hit']
    lv = [20 * np.log10(np.abs(p['x']).max() * p['g']) for p in hits]
    check(len(hits) == 2 and {p['sample'] for p in hits} == {'hit_1.wav', 'hit_2.wav'} and abs(abs(lv[0] - lv[1]) - 3.0) < 0.01,
          f'identical takes measured 3 LU apart play 3 dB apart ({lv[0]:.2f}, {lv[1]:.2f} dB)')


def kit_tools(d):
    """P3s in kit.py: an invalid key is a KitError (not a traceback); text with 5 notes tunes to the key's
    pentatonic; an earshot on PATH through a symlink (pipx, Homebrew) is used with its own interpreter."""
    sp = os.path.join(d, 'score.json')
    json.dump({'key': 'H major'}, open(sp, 'w'))
    try:
        K.key_of(sp)
        ok = False
    except K.KitError as e:
        ok = 'H major' in str(e)
    check(ok, 'an invalid score.json key is a KitError')
    kit = {'roles': {'text': {'sound': 'pluck/kalimba_soft', 'pitches': ['C5', 'D5', 'E5', 'G5', 'A5']}}}
    K.tune(kit, (7, [0, 2, 4, 5, 7, 9, 11], 'G major'))
    check(kit['roles']['text']['pitches'] == ['G4', 'A4', 'B4', 'D5', 'E5'],
          f"five text notes tune to the key's pentatonic ({kit['roles']['text']['pitches']})")
    if os.name == 'nt':
        print('skip the symlinked-earshot check (POSIX only)')
        return
    venv, bindir = os.path.join(d, 'venv', 'bin'), os.path.join(d, 'bin')
    os.makedirs(venv)
    os.makedirs(bindir)
    for name, body in (('python', 'if [ "$1" = "-c" ]; then echo 0.3.0; fi'), ('earshot', 'exit 0')):
        with open(os.path.join(venv, name), 'w') as fh:
            fh.write('#!/bin/sh\n' + body + '\n')
        os.chmod(os.path.join(venv, name), 0o755)
    os.symlink(os.path.join(venv, 'earshot'), os.path.join(bindir, 'earshot'))
    keep = dict(os.environ)
    try:
        os.environ['PATH'] = bindir + os.pathsep + keep.get('PATH', '')
        os.environ['EARSHOT_PYTHON'] = ''
        exe = sys.executable
        sys.executable = ''  # no "this interpreter" candidate
        es = K.find_earshot()[0]
    finally:
        sys.executable = exe
        os.environ.clear()
        os.environ.update(keep)
    check(es is not None and es.python == os.path.join(venv, 'python'),
          f'an earshot symlinked onto PATH runs with the interpreter beside its target ({es and es.python})')




# ------------------------------------------------------------------------------------------
# music-led: a test bed, an edit written here, a launch-style kit
# ------------------------------------------------------------------------------------------
BEAT = 0.5          # 120 BPM
SRC_T0 = 0.5        # the test bed's first downbeat


def test_bed(seconds=24.0, dip=None, seed=4, kick=2.0):
    """A steady test bed (noise + a soft thump on every beat from SRC_T0), stereo float. dip = (t0, t1, dB): a
    stretch the bed itself plays quieter (the arrangement's own breath); kick: the thump's gain."""
    from scipy import signal
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    x = signal.sosfilt(signal.butter(2, [120, 6000], 'band', fs=SR, output='sos'), r.standard_normal((n, 2)), axis=0) * 0.08
    u = np.arange(int(0.2 * SR)) / SR
    th = signal.sosfilt(signal.butter(2, 150, 'low', fs=SR, output='sos'), r.standard_normal(len(u))) * np.exp(-u / 0.06) * kick
    th *= np.minimum(1, u / 0.0015)
    for k in range(int((seconds - SRC_T0) / BEAT)):
        i = int(round((SRC_T0 + k * BEAT) * SR))
        m = min(len(th), n - i)
        x[i:i + m] += th[:m, None] * (1.0 if k % 4 == 0 else 0.6)
    if dip:
        a, b, db = dip
        x[int(a * SR):int(b * SR)] *= 10 ** (-db / 20)
    return x.astype(np.float32)


def write_record(path, track, title='Test Bed', licence='Mixkit Stock Music Free License', credit=None, seen=True):
    import credits as CR
    rec = {'record': 1, 'file': os.path.basename(track), 'sha256': CR.sha256_file(track), 'bytes': os.path.getsize(track),
           'title': title, 'artist': 'Nobody', 'source': 'Test', 'page': 'https://example.org/track', 'file_url': None,
           'licence': licence, 'licence_id': CR.classify(licence)['id'], 'licence_url': None,
           'credit_required': CR.classify(licence)['attribution'], 'credit': credit, 'content_id': 'not registered',
           'ai_generated': False, 'vocals': False, 'checked': '2026-10-23', 'certificate': None,
           'licence_seen': ({'quote': 'commercial and non-commercial projects', 'url': 'https://example.org/licence',
                             'date': '2026-10-23'} if seen else None),
           'limits': None, 'modifications': 'edited at bar lines for the film; levels adjusted'}
    K.write_json(path, rec)
    return rec


def music_project(d, bed, segments, film_t0=0.25, ending=None, accents=None, stops=None, name='bed'):
    """audio/music/<name>.wav + .licence.json + edit.json for a hand-written edit (source bars on the test bed's
    grid: bar n starts at SRC_T0 + (n - 1) * 2 s). Returns the score.json music block."""
    music = os.path.join(d, 'audio', 'music')
    os.makedirs(music, exist_ok=True)
    wav = os.path.join(music, f'{name}.wav')
    sf.write(wav, bed, SR, subtype='FLOAT')
    write_record(os.path.join(music, f'{name}.licence.json'), wav)
    bar = 4 * BEAT
    segs, joins, t, down = [], [], film_t0, []
    for k, (src_bar, bars) in enumerate(segments):
        sa, sb = SRC_T0 + (src_bar - 1) * bar, SRC_T0 + (src_bar - 1 + bars) * bar
        s = dict(film_bar=sum(b for _, b in segments[:k]) + 1, src_bar=src_bar, bars=bars, film_s=round(t, 3),
                 src_from=round(sa, 3), src_to=round(sb, 3))
        if k:
            s['join'] = dict(pre_ms=8.0, tail_ms=60.0)
            joins.append(dict(film_s=round(t, 3), film_bar=s['film_bar'], src_in=sa, src_out=segs[-1]['src_to'], tail_ms=60.0))
        segs.append(s)
        down += [round(t + b * bar, 3) for b in range(bars)]
        t += bars * bar
    down.append(round(t, 3))
    end = ending or dict(mode='ring', last_hit_film_s=round(t, 3), end_s=round(t, 3), ring_out_s=1.0)
    if end['mode'] == 'stop':
        end = dict(mode='stop', bed_stops_film_s=round(t, 3), gap_s=0.4, end_s=round(t + 0.4, 3))
    edit = {'edit': 1, 'track': f'audio/music/{name}.wav', 'sha256': None, 'bpm': 120.0, 'beat_s': BEAT, 'beats_per_bar': 4,
            'film_t0': film_t0, 'film_bars': len(down) - 1, 'phrase_len': 8, 'segments': segs, 'joins': joins,
            'ending': end, 'track_dips': [], 'licence': f'audio/music/{name}.licence.json',
            'film': {'downbeats': down, 'accents': accents or [], 'entries': [], 'breaks': [], 'stops': stops or [],
                     'phrases': [down[0]], 'sections': []}}
    K.write_json(os.path.join(music, 'edit.json'), edit)
    return {'track': f'audio/music/{name}.wav', 'edit': 'audio/music/edit.json', 'licence': f'audio/music/{name}.licence.json'}


def launch_kit(d):
    """a launch-style kit: every role with bed_db (and offsets, gaps, widths), takes with l50_lufs, the mix block"""
    kit = make_kit(d)
    k = K.read_json(kit, 'kit')
    for r in list(k['roles']):
        k['roles'][r] = None
    K.write_json(kit, k)
    lk = K.read_json(os.path.join(d, 'audio', 'kit', K.LOCK), 'lock')
    lk['roles'] = {r: None for r in lk['roles']}
    lk['mix'] = {'level': 'bed', 'duck_db': 0, 'stop_down': {'before': ['hit', 'drop', 'whoosh.long', 'swell'],
                                                              'depth_db': [6, 12], 'length_s': [0.3, 0.5]},
                 'runs': {'accent_at_end': ['click.confirm', 'land', 'drop']}, 'density_per_10s': {'music_led': [3, 13]}}
    K.write_json(os.path.join(d, 'audio', 'kit', K.LOCK), lk)
    add_role(kit, 'pop', 'ui_pop/soft', [(f'{j}.wav', body(80 + j), dict(onset_s=0.01, peak_s=0.012, end_s=0.1), None)
                                         for j in range(3)], mix={'bed_db': 8.5, 'offset_ms': 4, 'min_gap_ms': 114})
    add_role(kit, 'hit', 'cut_hit/punch', [('1.wav', body(90, dur=0.25, tau=0.06), dict(onset_s=0.01, peak_s=0.012, end_s=0.2), None)],
             level_db=-9.0, mix={'bed_db': 7.5, 'offset_ms': 0})
    add_role(kit, 'click', 'fit/click/floss_lid', [(f'{j}.wav', body(95 + j, dur=0.05, tau=0.008),
                                                    dict(onset_s=0.01, peak_s=0.011, end_s=0.04), None) for j in range(2)],
             mix={'bed_db': 6.5, 'offset_ms': -11, 'min_gap_ms': 85})
    add_role(kit, 'tick', 'pro_hover_tick/ping', [(f'{j}.wav', wide_take(100 + 2 * j), dict(onset_s=0.01, peak_s=0.011, end_s=0.06), None)
                                                  for j in range(2)], mix={'bed_db': 3.0, 'offset_ms': 0, 'min_gap_ms': 66, 'width': 0.1})
    # re-read the lock (add_role rewrites it) and keep the mix block
    lk = K.read_json(os.path.join(d, 'audio', 'kit', K.LOCK), 'lock')
    lk['mix'] = {'level': 'bed', 'duck_db': 0, 'stop_down': {'before': ['hit', 'drop', 'whoosh.long', 'swell'],
                                                              'depth_db': [6, 12], 'length_s': [0.3, 0.5]},
                 'runs': {'accent_at_end': ['click.confirm', 'land', 'drop']}, 'density_per_10s': {'music_led': [3, 13]}}
    K.write_json(os.path.join(d, 'audio', 'kit', K.LOCK), lk)
    return kit


def music_score(block, **kw):
    s = {'key': 'A minor', 'bpm': 120, 'music': block, 'sfx': {'kit': 'audio/kit.json'}, 'master': {'fade': 0.4}}
    s.update(kw)
    return s


def bed_edit(d):
    """A two-segment edit: the join has no click and its incoming attack sits on the film downbeat; the stems sum
    to the premix; a music film masters to -14 LUFS without glue."""
    import track as TR
    launch_kit(d)
    block = music_project(d, test_bed(), [(1, 2), (5, 3)])
    edit = K.read_json(os.path.join(d, 'audio', 'music', 'edit.json'), 'edit')
    bed, info = TR.build_bed(edit, d, n=int(12 * SR))
    rows = TR.join_report(bed, edit)
    j = rows[0] if rows else {}
    check(len(rows) == 1 and abs(j['attack_off_ms']) <= 2.0 and j['click_db'] < 10 and not j['problems'],
          f"the join: incoming attack on the film downbeat ({j.get('attack_off_ms')} ms), no click ({j.get('click_db')} dB), "
          f"no problems ({j.get('problems')})")
    ev = [dict(f=90, kind='pop', id='a:p1'), dict(f=300, kind='click', id='a:c1'), dict(f=500, kind='pop', id='a:p2')]
    cues = cues_with(ev, total=840, cue={'lockup': 800})
    p, r = run(d, 'edit', cues, music_score(block), NO_EARSHOT)
    if not r:
        check(False, f'a film with a track renders: {p.stderr.strip()[-400:]}')
        return
    check(r['music']['source'] == 'track:audio/music/bed.licence.json' and r['target_lufs']['lufs'] == -14
          and abs(r['lufs'] + 14) <= 0.5, f"a music film: the record named, -14 LUFS ({r['music']['source']}, {r['lufs']})")
    st = sorted(os.listdir(os.path.join(d, 'edit.stems')))
    b, _ = sf.read(os.path.join(d, 'edit.stems', 'bed.wav'))
    s, _ = sf.read(os.path.join(d, 'edit.stems', 'sfx.wav'))
    check(st == ['bed.wav', 'sfx.wav'], f'music stems: bed and sfx only ({st})')
    check(len(b) == len(s) and r['music']['joins'] and not [x for x in r['fails'] if 'join' in x]
          and [x for x in r['fails'] if 'ends abruptly' in x] and r['ending']['abrupt'],
          f"the joins are measured in the score report; a bed at full level into a 0.4 s end fade is an abrupt ending ({r['fails']})")
    # the same film with the track faded out over 2.5 s under the end card (track.py edit --end fade): it passes
    block = music_project(d, test_bed(), [(1, 2), (5, 3)],
                          ending=dict(mode='fade', fade_from_film_s=10.25, fade_s=2.5, end_s=10.25, hold_s=2.5))
    p, r = run(d, 'editfade', cues, music_score(block), NO_EARSHOT)
    check(r is not None and r['pass'] and not r['ending']['abrupt'] and r['ending']['drop20_s'] > 0.15,
          f"faded out under the end card, the film ends on a decay and passes ({(r or {}).get('fails')}, {(r or {}).get('ending')})")
    check(os.path.isfile(os.path.join(d, 'sfx_plan.json')) and os.path.isfile(os.path.join(d, 'cues_sounded.json')),
          'the render writes the plan and cues_sounded.json next to the report')


def stopdown(d):
    """A hit 5 s in: the bed steps down 8 dB for 0.375 s (120 BPM) and comes back on the hit; a bed that already
    breathes 4 dB there gets only the missing depth."""
    launch_kit(d)
    ev = [dict(f=300, kind='hit', id='a:hit'), dict(f=120, kind='pop', id='a:p')]
    for name, dip in (('flat', None), ('breath', (4.6, 5.0, 4.0))):
        dd = os.path.join(d, name)
        os.makedirs(dd)
        launch_kit(dd)
        bed = test_bed(dip=None if dip is None else (dip[0] - 0.25 + SRC_T0, dip[1] - 0.25 + SRC_T0, dip[2]))
        block = music_project(dd, bed, [(1, 6)])
        p, r = run(dd, 'sd', cues_with(ev, total=720, cue={'lockup': 300}), music_score(block, payoff='@lockup'), NO_EARSHOT)
        if not r:
            check(False, f'stop-down film renders ({name}): {p.stderr.strip()[-300:]}')
            continue
        sd = [s for s in r['stop_downs'] if s.get('status') in ('added', 'arrangement')]
        s = sd[0] if sd else {}
        if name == 'flat':
            check(len(sd) == 1 and abs(s['length_s'] - 0.375) < 1e-3 and s['depth_db'] == 8.0 and s['ok'] and s['returned']
                  and s['measured_dip_db'] >= 6.0, f"the stop-down before the hit: 0.375 s, 8 dB, measured {s.get('measured_dip_db')} dB, "
                  f"back on the hit ({s.get('back_within_db')} dB)")
        else:
            check(len(sd) == 1 and 2.5 <= s['track_dip_db'] <= 5.0 and abs(s['added_db'] - (8.0 - s['track_dip_db'])) < 0.01
                  and s['measured_dip_db'] >= 6.0, f"over the bed's own {s.get('track_dip_db')} dB breath only {s.get('added_db')} dB is added "
                  f"(measured {s.get('measured_dip_db')} dB)")
        check(r['no_duck']['ok'] and r['no_duck']['automation_max_db'] <= 0.01,
              f"no ducking outside the stop-down ({name}: {r['no_duck']})")


def stop_payoff(d):
    """A stop ending whose one element is the payoff: one warning that names the fix, the element is not measured
    against itself and not called quieter than the loudest moment; a payoff on the reveal before the stop is
    compared with the element."""
    launch_kit(d)
    block = music_project(d, test_bed(), [(1, 6)], ending=dict(mode='stop'))
    ev = [dict(f=300, kind='hit', id='a:reveal'), dict(f=120, kind='pop', id='a:p'), dict(f=756, kind='pop', id='a:lockup')]
    cues = cues_with(ev, total=840, cue={'reveal': 300, 'lockup': 756})
    p, r = run(d, 'stoplock', cues, music_score(block, payoff='@lockup'), NO_EARSHOT)
    if not r:
        check(False, f'a stop-ending film renders: {p.stderr.strip()[-300:]}')
        return
    w = r['warnings']
    check(any("is the stop ending's element" in x for x in w) and not any('LU under the payoff' in x for x in w)
          and not any('is not the loudest moment' in x for x in w) and (r.get('lockup') or {}).get('under_payoff_lu') is None,
          f"a payoff on the stop's element: one warning naming the fix, no self-comparison ({[x[:60] for x in w]})")
    p, r = run(d, 'stoprev', cues, music_score(block, payoff='@reveal'), NO_EARSHOT)
    lk = (r or {}).get('lockup') or {}
    check(r is not None and not any("is the stop ending's element" in x for x in r['warnings'])
          and lk.get('under_payoff_lu') is not None and not any('is buried' in x for x in r['fails']),
          f"a payoff on the reveal: the element is measured under it ({lk.get('under_payoff_lu')} LU), the hit at its bed_db is not buried")
    # no cue named reveal: "@reveal" reads the timeline's REVEAL (export-cues declared.reveal), as the starter's payoff
    decl = dict(cues_with(ev, total=840, cue={'lockup': 756}), declared={'reveal': 300})
    p, r = run(d, 'stopdecl', decl, music_score(block, payoff='@reveal'), NO_EARSHOT)
    check(r is not None and abs(((r.get('payoff') or {}).get('t') or 0) - 300 / FPS) < 1e-3,
          f"\"@reveal\" with no reveal cue reads the declared REVEAL ({(r or {}).get('payoff') or p.stderr.strip()[-200:]})")


def light_swell(d):
    """A stop-down goes before a swell of weight 1, never before a light one (weight 0.5) that is not structural."""
    kit = launch_kit(d)
    add_role(kit, 'swell', 'whoosh_big/swell', [('1.wav', whoosh_take(peak=0.5, dur=1.0), dict(onset_s=0.3, peak_s=0.5, end_s=0.8), None)],
             align='peak', mix={'bed_db': 6.0, 'offset_ms': 0})
    block = music_project(d, test_bed(), [(1, 6)])
    ev = [dict(f=90, kind='pop', id='a:p'), dict(f=300, kind='swell', id='a:soft', weight=0.5), dict(f=540, kind='swell', id='a:full', weight=1.0)]
    p, r = run(d, 'swells', cues_with(ev, total=720), music_score(block), NO_EARSHOT)
    fors = [s['for'] for s in (r or {}).get('stop_downs') or []]
    check(r is not None and any(f.endswith('a:full') for f in fors) and not any(f.endswith('a:soft') for f in fors),
          f"a stop-down before the weight-1 swell only ({fors or (p.stderr.strip()[-200:])})")


def masked_hero(d):
    """A hero sound the music buries fails: a tick levelled 0.3 dB over the bed reads under the music in every band;
    on the payoff it fails and names its role's bed_db, the same tick elsewhere is only listed, and a hit at its
    bed_db over the bed is not failed; a mix trim with a track warns."""
    kit = launch_kit(d)
    add_role(kit, 'tick', 'pro_hover_tick/ping', [(f'{j}.wav', wide_take(100 + 2 * j), dict(onset_s=0.01, peak_s=0.011, end_s=0.06), None)
                                                  for j in range(2)], mix={'bed_db': 0.3, 'offset_ms': 0, 'min_gap_ms': 66, 'width': 0.1})
    block = music_project(d, test_bed(), [(1, 6)])
    ev = [dict(f=90, kind='pop', id='a:p1'), dict(f=300, kind='tick', id='a:reveal'), dict(f=480, kind='tick', id='a:t2'),
          dict(f=560, kind='pop', id='a:p2')]
    p, r = run(d, 'masked', cues_with(ev, total=720, cue={'reveal': 300}), music_score(block, payoff='@reveal', mix={'music': 0.8}),
               NO_EARSHOT)
    if not r:
        check(False, f'the masking film renders: {p.stderr.strip()[-300:]}')
        return
    m = {x['id']: x for x in r['events']['masked']}
    hero = [f for f in r['fails'] if 'is buried' in f]
    check('a:reveal' in m and m['a:reveal'].get('hero') == 'the payoff' and len(hero) == 1 and 'a:reveal' in hero[0]
          and "tick's bed_db" in hero[0] and ('a:t2' not in m or not m['a:t2'].get('hero')),
          f"a masked payoff fails and names its role's bed_db; a masked tick elsewhere is listed only ({hero}, {sorted(m)})")
    check(any(w.startswith('mix.music 0.8') for w in r['warnings']), 'a mix trim with a track warns that the reads no longer describe the master')


def width_and_bed_levels(d):
    """width_kept: a role with a width plays its stereo take (L / R decorrelated) while a role without one is mono;
    over_bed: on a steady bed every effect's loudest 50 ms lands on its bed_db (within 0.5 dB)."""
    launch_kit(d)
    block = music_project(d, test_bed(), [(1, 6)])
    ev = [dict(f=90 + 60 * k, kind='pop', id=f'a:p{k}') for k in range(4)] + \
         [dict(f=420, kind='tick', id='a:tick'), dict(f=540, kind='click', id='a:click')]
    p, r = run(d, 'levels', cues_with(ev, total=720), music_score(block), NO_EARSHOT)
    if not r:
        check(False, f'the levels film renders: {p.stderr.strip()[-300:]}')
        return
    s, _ = sf.read(os.path.join(d, 'levels.stems', 'sfx.wav'))
    plan = K.read_json(os.path.join(d, 'sfx_plan.json'), 'plan')
    tk = next(e for e in plan['events'] if e['role'] == 'tick')
    pp = next(e for e in plan['events'] if e['role'] == 'pop')
    seg = s[int(tk['start_s'] * SR):int((tk['start_s'] + 0.06) * SR)]
    c = float((seg[:, 0] * seg[:, 1]).sum() / np.sqrt((seg[:, 0] ** 2).sum() * (seg[:, 1] ** 2).sum()))
    seg2 = s[int(pp['start_s'] * SR):int((pp['start_s'] + 0.1) * SR)]
    check(c < 0.5 and np.allclose(seg2[:, 0], seg2[:, 1]), f'a width role keeps its stereo (L / R correlation {c:.2f}); a role '
          'without one plays mono')
    ob = r['over_bed']['effects']
    errs = [abs(e['error_db']) for e in ob if e['role'] in ('pop', 'click')]
    # the takes alternate (the least recently played): a take whose own shape sits against a downbeat kick reads up to
    # ~0.6 dB off the level model, the rest within 0.5
    check(len(errs) >= 5 and max(errs) <= 0.65 and sorted(errs)[-2] <= 0.5,
          f"each effect's loudest 50 ms over the bed lands on its bed_db within 0.5 dB, one take on a kick within 0.65 "
          f"(worst {max(errs) if errs else None} dB over {len(errs)})")
    check(abs(tk['offset_ms']) < 1e-9 and next(e for e in plan['events'] if e['role'] == 'click')['offset_ms'] == -11
          and abs(next(e for e in plan['events'] if e['role'] == 'click')['sync_s'] - (540 / FPS - 0.011)) < 1e-4,
          "a role's offset_ms moves its sync point (clicks lead the cut by 11 ms)")


def on_beat_over_bed(d):
    """over_bed on a bed with a strong kick: pops on the beats read several dB over their bed_db with the bed
    (the kick fills the same 50 ms) while each take alone sits where the kit's gain puts it; the report gives
    both, the bed's own accent, and the warnings judge the take alone (none for correctly placed takes); a
    weighted pop is wanted louder by its weight_db."""
    launch_kit(d)
    block = music_project(d, test_bed(kick=6.0), [(1, 6)])
    on_f = [15 + 120 * k for k in range(1, 6)]         # film downbeats: 0.25 s + 2 s * k
    off_f = [30 + 30 * k for k in (9, 11)]              # between beats
    ev = [dict(f=f, kind='pop', id=f'a:on{k}') for k, f in enumerate(on_f)] +          [dict(f=f, kind='pop', id=f'a:off{k}') for k, f in enumerate(off_f)] + [dict(f=420, kind='pop', id='a:w', weight=1.25)]
    p, r = run(d, 'onbeat', cues_with(ev, total=720), music_score(block), NO_EARSHOT)
    if not r:
        check(False, f'the on-beat film renders: {p.stderr.strip()[-300:]}')
        return
    ob = r['over_bed']
    on = [e for e in ob['effects'] if e['id'].startswith('a:on')]
    off = [e for e in ob['effects'] if e['id'].startswith('a:off')]
    want = MK.over_bed(8.5)
    check(len(on) == 5 and min(e['error_db'] for e in on) > 2.0 and min(e['bed_accent_db'] for e in on) >= 4.0,
          f"on the beat the mix reads hot because of the bed's own kick (errors {[e['error_db'] for e in on]} dB, "
          f"the kick {[e['bed_accent_db'] for e in on]} dB over the bed's median)")
    check(len(on) + len(off) == 7 and all(abs(e['take_error_db']) <= 0.5 and abs(e['take_want_db'] - want) < 0.01
                                          for e in on + off),
          f"each take alone sits on over_bed(8.5) = {want:.2f} dB within 0.5 dB "
          f"({[e['take_db'] for e in on + off]})")
    wt = [e for e in ob['effects'] if e['id'] == 'a:w']
    wdb = 20 * np.log10(1.25)
    check(len(wt) == 1 and abs(wt[0]['weight_db'] - wdb) < 0.01 and abs(wt[0]['take_want_db'] - (want + wdb)) < 0.01
          and abs(wt[0]['take_error_db']) <= 0.5 and not wt[0]['clamped'],
          f"a pop with weight 1.25 is wanted {wdb:.2f} dB louder and sits there ({wt})")
    bad = [w for w in r['warnings'] if 'over the bed' in w or 'off their level' in w]
    check(not bad and ob['take_within_tol'] == ob['count'] == 8 and ob['within_tol'] < 8,
          f"no over-bed warning for correctly placed takes (warnings {bad}; takes {ob['take_within_tol']}/{ob['count']}, "
          f"mix {ob['within_tol']}/{ob['count']})")
    pr = ob['roles'].get('pop', {})
    check(abs(pr.get('steady_median', 0) - 8.5) <= 0.5 and abs(pr.get('take_want', 0) - round(want, 2)) < 0.01
          and pr.get('bed_accent_median', 0) > 2.0 and abs(ob['steady_median'] - 8.5) <= 0.5,
          f"the role reports the take alone as on a steady bed (steady median {pr.get('steady_median')}, want 8.5) next to "
          f"the mix median {pr.get('median')} and the kick {pr.get('bed_accent_median')} dB")


def moments_arc(d):
    """the hits the ear marks (score.salient_hits: a 100 ms block 6 dB over the 200 ms before), the moments' breaths and
    the arc ride (plan.arc_ride: the body never under its opening once the product starts), on signals made in code"""
    import plan as PL  # noqa: E402
    import score as SC  # noqa: E402
    rng = np.random.default_rng(3)
    n = int(8 * SR)
    bed = rng.standard_normal((n, 2)) * 0.05
    hit = bed.copy()
    k = int(4.0 * SR)
    hit[k:k + int(0.08 * SR)] += rng.standard_normal((int(0.08 * SR), 2)) * 0.4
    h = SC.salient_hits(hit)
    check(any(abs(t - 4.0) <= 0.1 for t in h) and not SC.salient_hits(bed), f'a burst 18 dB over a steady bed is a salient hit, the bed alone none ({h})')
    dip = bed.copy()
    dip[int(3.75 * SR):k] *= 10 ** (-7 / 20)
    h2 = SC.salient_hits(dip)
    check(any(abs(t - 4.0) <= 0.1 for t in h2), f'a 7 dB breath of 0.25 s before the frame makes the return a hit the ear marks ({h2})')
    check(PL.MOMENT_ACTIONS.index('jump-cut') < PL.MOMENT_ACTIONS.index('card-land') < PL.MOMENT_ACTIONS.index('touch')
          and 'text' not in PL.MOMENT_ACTIONS, 'moments in order: the seams before the landings before a touch; a text sound is never one')
    song = types.SimpleNamespace(dur=24.0)
    m = int(24 * SR)
    t = np.arange(m) / SR
    tone = np.sin(2 * np.pi * 220 * t)[:, None] * np.ones((1, 2))
    sag = tone * np.where(t < 6.0, 0.3, 0.3 * 10 ** (-4 / 20))[:, None]  # the body 4 dB under the opening
    pts, rep = PL.arc_ride(sag, song, 6.0, 18.0, 22.0, 2.0, keep=[(14.0, 18.0)])
    check(pts is not None and rep['opening_db'] < 0 and rep['lift_max_db'] > 0,
          f"a body 4 dB under its opening: the opening steps down and the body is lifted ({rep})")
    song.ride = pts
    g = PL.ride_envelope(song, m)
    check(abs(20 * np.log10(g[int(10 * SR)]) - (rep['lift_max_db'])) < 1.5 and abs(20 * np.log10(g[int(16 * SR)])) < 1.5,
          f'the lift holds in the body and the break before the reveal is left as it is ({20 * np.log10(g[int(10 * SR)]):.1f}, {20 * np.log10(g[int(16 * SR)]):.1f} dB)')
    rise = tone * np.where(t < 6.0, 0.3, 0.45)[:, None]
    pts2, rep2 = PL.arc_ride(rise, song, 6.0, 18.0, 22.0, 2.0)
    check(pts2 is None, f"a body over its opening is left alone ({rep2.get('why')})")


def carried_by_track(d):
    """A hit on a frame where the track has a strong low accent is carried by the track (no take, no stop-down);
    "force": true sounds it anyway."""
    launch_kit(d)
    acc = [dict(t=5.0, db=9.0, band='low')]
    block = music_project(d, test_bed(), [(1, 6)], accents=acc)
    ev = [dict(f=300, kind='hit', id='a:hit'), dict(f=120, kind='pop', id='a:p')]
    p, r = run(d, 'carry', cues_with(ev, total=720), music_score(block), NO_EARSHOT)
    plan = K.read_json(os.path.join(d, 'sfx_plan.json'), 'plan') if r else {}
    car = [s for s in plan.get('silent', []) if s['status'] == 'carried']
    check(r is not None and len(car) == 1 and not any(e['role'] == 'hit' for e in plan['events']),
          f"a hit on the track's own accent is carried by the track ({car or (p.stderr.strip()[-200:])})")
    ev[0]['force'] = True
    p, r = run(d, 'force', cues_with(ev, total=720), music_score(block), NO_EARSHOT)
    plan = K.read_json(os.path.join(d, 'sfx_plan.json'), 'plan') if r else {}
    check(r is not None and any(e['role'] == 'hit' for e in plan.get('events', [])), '"force": true sounds it anyway')


def mixkeys_parity(d):
    """mixkeys.py equals earshot 0.4's forge.kit helpers on the same inputs (0.05 dB, 0.1 ms)."""
    py = os.environ.get('EARSHOT_PYTHON')
    cand = [py] if py and py.lower() not in ('none', 'off') else []
    cand.append(sys.executable)
    use = None
    for c in cand:
        q = subprocess.run([c, '-c', 'import earshot.forge.kit as k, earshot; print(earshot.__version__)'], capture_output=True, text=True)
        if q.returncode == 0:
            use = (c, q.stdout.strip().splitlines()[-1])
            break
    if not use:
        print('skip the mixkeys parity check (no importable earshot: set EARSHOT_PYTHON, or PYTHONPATH to an earshot checkout)')
        return
    r = np.random.default_rng(11)
    bed = (r.standard_normal((int(4 * SR), 2)) * 0.05).astype(np.float64)
    bed[int(2.2 * SR):int(2.6 * SR)] *= 0.25
    mono = (np.sin(2 * np.pi * 440 * np.arange(int(0.3 * SR)) / SR) * np.exp(-np.arange(int(0.3 * SR)) / SR / 0.05)).astype(np.float64)
    st = np.stack([mono, np.roll(mono, 37) * 0.8], axis=1)
    np.save(os.path.join(d, 'bed.npy'), bed)
    np.save(os.path.join(d, 'mono.npy'), mono)
    np.save(os.path.join(d, 'st.npy'), st)
    times = [0.03, 0.5, 1.0, 2.0, 2.6, 3.99]
    take = {'l50_lufs': -11.3, 'peak_db': -1.0, 'onset_s': 0.012, 'peak_s': 0.02, 'end_s': 0.2}
    roles = [{'bed_db': 8.5, 'offset_ms': 4, 'align': 'onset', 'level_db': -8}, {'bed_db': 3.0, 'offset_ms': -60, 'align': 'peak'},
             {'level_db': -5.5, 'align': 'end', 'offset_ms': 30}]
    code = ("import json,sys,numpy as np\nimport earshot.forge.kit as k\nd=sys.argv[1]\n"
            "bed=np.load(d+'/bed.npy'); mono=np.load(d+'/mono.npy'); st=np.load(d+'/st.npy')\n"
            "T=json.loads(sys.argv[2]); tk=json.loads(sys.argv[3]); R=json.loads(sys.argv[4])\n"
            "def bl(t):\n    try:\n        return k.bed_level(bed, t)\n    except Exception as e:\n        return 'raise'\n"
            "out=dict(loud=[k.loud_lufs(mono), k.loud_lufs(st), k.loud_lufs(bed)], bed=[bl(t) for t in T],"
            " over=[k.over_bed(b) for b in (3, 6.5, 8.5, 9.5)],"
            " gain=[k.gain_db(tk, r, b) for r in R for b in (-20.0, -31.4, None, -70.0)],"
            " place=[k.place(tk, r, 1.234) for r in R], space=k.space_run([0.1, 0.12, 0.13, 0.5, 0.51], 87),"
            " corr=[k.corr(mono), k.corr(st)])\nprint(json.dumps(out))\n")
    q = subprocess.run([use[0], '-c', code, d, json.dumps(times), json.dumps(take), json.dumps(roles)], capture_output=True, text=True)
    if q.returncode != 0:
        check(False, f'earshot computed the parity inputs: {q.stderr.strip()[-300:]}')
        return
    e = json.loads(q.stdout.strip().splitlines()[-1])

    def bl(t):
        try:
            return MK.bed_level(bed, t)
        except MK.BedError:
            return 'raise'
    m = dict(loud=[MK.loud_lufs(mono), MK.loud_lufs(st), MK.loud_lufs(bed)], bed=[bl(t) for t in times],
             over=[MK.over_bed(b) for b in (3, 6.5, 8.5, 9.5)],
             gain=[MK.gain_db(take, r_, b) for r_ in roles for b in (-20.0, -31.4, None, -70.0)],
             place=[MK.place(take, r_, 1.234) for r_ in roles], space=MK.space_run([0.1, 0.12, 0.13, 0.5, 0.51], 87),
             corr=[MK.corr(mono), MK.corr(st)])

    def close(a, b, tol):
        if isinstance(a, str) or isinstance(b, str) or a is None or b is None:
            return a == b
        return abs(a - b) <= tol
    ok_db = all(close(a, b, 0.05) for k in ('loud', 'bed', 'over', 'gain') for a, b in zip(m[k], e[k]))
    ok_t = all(close(a, b, 1e-4) for k in ('place', 'space') for a, b in zip(m[k], e[k]))
    ok_c = all(close(a, b, 1e-6) for a, b in zip(m['corr'], e['corr']))
    check(ok_db and ok_t and ok_c and MK.EARSHOT_VERSION == use[1],
          f"mixkeys mirrors earshot {use[1]} ({use[0]}): levels within 0.05 dB, times within 0.1 ms, corr"
          + ('' if ok_db and ok_t and ok_c else f': ours {m} vs {e}'))
    import master as MA
    imp = np.zeros(4800)
    imp[0] = 1.0
    check(np.allclose(MK.kweight(imp), MA._kw(imp), atol=1e-12), 'the K-weighting is the one master.py measures with')


def credits_gate(d):
    """credits.py: a valid record writes CREDITS.md and the paste-ready description; a CC BY record without its
    credit line, a record without licence_seen, a changed file, a --draft report are refused (1); no report is 2."""
    music = os.path.join(d, 'audio', 'music')
    os.makedirs(music)
    os.makedirs(os.path.join(d, 'out', 'qa'))
    wav = os.path.join(music, 'bed.wav')
    sf.write(wav, test_bed(4.0), SR, subtype='FLOAT')
    score = os.path.join(d, 'audio', 'score.json')
    rep = os.path.join(d, 'out', 'qa', 'score.json')

    def go(rec_kw, report=None):
        write_record(os.path.join(music, 'bed.licence.json'), wav, **rec_kw)
        K.write_json(score, {'music': {'track': 'audio/music/bed.wav', 'edit': 'audio/music/edit.json',
                                       'licence': 'audio/music/bed.licence.json'}})
        if report is None and os.path.exists(rep):
            os.remove(rep)
        elif report is not None:
            K.write_json(rep, report)
        return subprocess.run([sys.executable, CREDITS, '--score', score, '--report', rep, '--out', os.path.join(d, 'out', 'deliver')],
                              capture_output=True, text=True, cwd=d)
    good = {'music': {'source': 'track:audio/music/bed.licence.json'}, 'draft': False}
    p = go({}, good)
    md = os.path.join(d, 'out', 'deliver', 'CREDITS.md')
    check(p.returncode == 0 and os.path.isfile(md) and 'Test Bed' in open(md, encoding='utf-8').read()
          and os.path.isfile(os.path.join(d, 'out', 'deliver', 'CREDITS_description.txt')),
          'a valid record writes CREDITS.md and CREDITS_description.txt' + ('' if p.returncode == 0 else f': {p.stderr.strip()[-200:]}'))
    p = go(dict(licence='CC BY 4.0'), good)
    check(p.returncode == 1 and 'credit line' in p.stderr, 'a CC BY record without its credit line is refused')
    p = go(dict(licence='CC BY 4.0', credit='"Test Bed" Nobody / Licensed under CC BY 4.0'), good)
    desc = open(os.path.join(d, 'out', 'deliver', 'CREDITS_description.txt'), encoding='utf-8').read() if p.returncode == 0 else ''
    check(p.returncode == 0 and '"Test Bed" Nobody' in desc and 'Edited for this film' in desc,
          'a CC BY credit goes into the description, with the edit named')
    p = go(dict(seen=False), good)
    check(p.returncode == 1 and 'licence_seen' in p.stderr, 'a record without licence_seen is refused')
    write_record(os.path.join(music, 'bed.licence.json'), wav)
    with open(wav, 'ab') as fh:
        fh.write(b'\0' * 16)
    p = subprocess.run([sys.executable, CREDITS, '--score', score, '--report', rep, '--out', os.path.join(d, 'out', 'deliver')],
                       capture_output=True, text=True, cwd=d)
    check(p.returncode == 1 and 'changed since it was checked' in p.stderr, 'a file changed since its record is refused')
    sf.write(wav, test_bed(4.0), SR, subtype='FLOAT')
    p = go({}, dict(good, draft=True))
    check(p.returncode == 1 and 'draft' in p.stderr, 'a --draft soundtrack is refused')
    p = go({}, None)
    check(p.returncode == 2, 'no score report: exit 2')
    p = go(dict(licence='CC BY-NC 4.0'), good)
    check(p.returncode == 1 and 'NonCommercial' in p.stderr, 'an NC licence is refused')


# ------------------------------------------------------------------------------------------
# av-audit.py against score.py's report and the kit's own sounds
# ------------------------------------------------------------------------------------------
AVAUDIT = os.path.join(HERE, '..', 'av-audit.py')


def av_run(d, name, events, sig, report=None, music=None, sounded=None, silent=None, sounded_age=5):
    """av-audit --audio/--stems on a synthetic soundtrack (sig, mono) for `events`; returns (exit, report).
    sounded: the events of a cues_sounded.json (intended times) written beside, `sounded_age` s newer than the
    cues (negative: older), with `silent` as its silent rows."""
    out = os.path.join(d, name)
    os.makedirs(os.path.join(out, 'stems'), exist_ok=True)
    os.makedirs(os.path.join(out, 'qa'), exist_ok=True)
    cues = os.path.join(out, 'cues.json')
    json.dump(cues_with(events), open(cues, 'w'))
    if sounded is not None:
        sp = os.path.join(out, 'qa', 'cues_sounded.json')
        json.dump(dict(cues_with(sounded), silent=silent or []), open(sp, 'w'))
        os.utime(sp, (os.path.getmtime(cues) + sounded_age, os.path.getmtime(cues) + sounded_age))
    st = np.stack([sig, sig], axis=1).astype(np.float32)
    sf.write(os.path.join(out, 'mix.wav'), st, SR, subtype='FLOAT')
    sf.write(os.path.join(out, 'stems', 'sfx.wav'), st, SR, subtype='FLOAT')
    sf.write(os.path.join(out, 'stems', 'bed.wav'), np.zeros_like(st) if music is None else music, SR, subtype='FLOAT')
    rp = os.path.join(out, 'score_report.json')
    json.dump(report or {'events': {'skipped': []}}, open(rp, 'w'))
    os.utime(rp, (os.path.getmtime(cues) + 5, os.path.getmtime(cues) + 5))  # newer than the cues
    js = os.path.join(out, 'av.json')
    p = subprocess.run([sys.executable, AVAUDIT, '--audio', os.path.join(out, 'mix.wav'), '--stems', os.path.join(out, 'stems'),
                        '--cues', cues, '--score-report', rp, '--json', js, '--no-loudness'],
                       capture_output=True, text=True)
    return p, (json.load(open(js)) if os.path.exists(js) else None)


def place(sig, x, f):
    i = int(round(f / FPS * SR))
    sig[i:i + len(x)] += x[:len(sig) - i]


def av_audit(d):
    try:
        import librosa  # noqa: F401
    except ImportError:
        print('skip av-audit checks (librosa is not installed)')
        return
    n = int(300 / FPS * SR)
    hit = transient(5, 0.0, 0.08)
    # 1. a skipped riser shares its frame with the hit it leads into; a soundtrack without that hit must fail
    sig = np.zeros(n)
    place(sig, hit, 60)
    ev = [dict(f=60, kind='click', id='a:c'), dict(f=200, kind='riser', dur=60, id='a:r'), dict(f=200, kind='hit', id='a:h')]
    p, r = av_run(d, 'nohit', ev, sig, {'events': {'skipped': [{'f': 200, 'kind': 'riser', 'role': 'riser'}]}})
    check(p.returncode == 1 and r is not None and any(m['f'] == 200 for m in r['sync']['misses']),
          'av-audit still expects a hit whose frame a skipped riser shares (missing hit fails)'
          + ('' if r else f': {p.stderr.strip()[-300:]}'))
    # 2. a sharp attack on a cue frame is the take's designed transient; the same click off any cue is a click
    sig = np.zeros(n)
    for f in (60, 150):
        sig[int(round(f / FPS * SR))] = 0.5
    p, r = av_run(d, 'clicks', [dict(f=60, kind='tock', id='a:t')], sig)
    cl = (r or {}).get('clicks', [])
    check(r is not None and [c['kind'] for c in cl] == ['attack', 'click'] and cl[0].get('on_cue'),
          f"av-audit counts a sharp attack on a cue frame as the sound's own attack, not a click ({cl})")
    # 3. onsets inside a whoosh's own body are not strays
    sig = np.zeros(n)
    u = np.arange(int(1.0 * SR)) / SR
    swell = np.random.default_rng(8).standard_normal(len(u)) * np.exp(-((u - 0.5) / 0.15) ** 2) * 0.3
    place(sig, swell, 200 - 30)
    for f in (180, 190):
        place(sig, transient(f, 0.0, 0.03) * 0.8, f)
    ev = [dict(f=200, kind='whoosh', dur=60, apexFrac=0.5, id='a:w')]
    p, r = av_run(d, 'whoosh', ev, sig)
    check(r is not None and r['sync'].get('stray_sfx_onsets_f') == [] and r['sync'].get('onsets_inside_long_effects', 0) >= 1,
          f"av-audit does not call onsets inside a whoosh's span strays ({r and r['sync'].get('stray_sfx_onsets_f')})")
    # the head: a bed already playing at frame 0 warns, naming --film-t0, unless the edit puts bar 1's attack on frame 0
    u = np.arange(n) / SR
    bed = np.sin(2 * np.pi * 220 * u) * 0.3 * np.minimum(1, u / 0.003)
    heads = {}
    for name, t0 in (('head25', 0.25), ('head0', 0.0)):
        p, r = av_run(d, name, [dict(f=60, kind='click', id='a:c')], bed, {'events': {'skipped': []}, 'music': {'segments': [{'film_s': t0}]}})
        heads[name] = [f['note'] for f in (r or {}).get('flags', []) if f['check'] == 'head']
    check(len(heads['head25']) == 1 and '--film-t0 0' in heads['head25'][0] and not heads['head0'],
          f"a bed in progress at frame 0 warns and names --film-t0 0; bar 1 on frame 0 does not ({heads})")
    # 4. intended times: a click whose role leads the cut by 11 ms (cues_sounded.json) is judged at its intended
    # time, and a cue the plan left silent (carried by the track) is not expected
    sig = np.zeros(n)
    place(sig, hit, 120 - 0.011 * FPS * 3)  # 33 ms early: inside +-2 f of either time, so check the offset itself
    ev = [dict(f=120, kind='click', id='a:c'), dict(f=200, kind='hit', id='a:carried')]
    p, r = av_run(d, 'intended', ev, sig, sounded=[dict(f=120 - 0.033 * FPS, kind='click', id='a:c', role='click')])
    rows = (r or {}).get('sync', {}).get('rows', [])
    check(r is not None and r.get('intended') and len(rows) == 1 and abs(rows[0]['offset_f']) < 0.5,
          f"av-audit judges sync against the intended times of cues_sounded.json ({rows})")
    # 4b. cues re-exported after the plan with the same events: cues_sounded.json is still current (the silent
    # cue stays unexpected); with an event the plan never saw it is stale and every cue is expected again
    planned = [dict(f=120 - 0.033 * FPS, cue_f=120, kind='click', id='a:c', role='click')]
    quiet = [dict(f=200, kind='hit', id='a:carried', status='carried')]
    p, r = av_run(d, 'intended-older', ev, sig, sounded=planned, silent=quiet, sounded_age=-5)
    check(r is not None and r.get('intended') and len((r.get('sync') or {}).get('rows', [])) == 1,
          f"av-audit keeps an older cues_sounded.json planned from the same events ({r and r.get('intended')})")
    p, r = av_run(d, 'intended-stale', ev + [dict(f=250, kind='tock', id='a:new')], sig, sounded=planned, silent=quiet, sounded_age=-5)
    check(r is not None and not r.get('intended') and any('older than' in n for n in r.get('notes', [])),
          f"av-audit drops an older cues_sounded.json whose events differ, and says so ({r and r.get('notes')})")
    # 5. a --draft soundtrack fails
    p, r = av_run(d, 'draft', [dict(f=60, kind='click', id='a:c')], np.zeros(n) + 0, {'events': {'skipped': []}, 'draft': True})
    check(r is not None and any(f['check'] == 'draft' and f['severity'] == 'fail' for f in r['flags']),
          'av-audit fails a --draft soundtrack')


def real_earshot(d):
    py = os.environ.get('EARSHOT_PYTHON')
    es = K.find_earshot()[0] if py and py.lower() not in ('none', 'off') else None
    if not es:
        print('skip real earshot render (set EARSHOT_PYTHON to an earshot 0.4 interpreter)')
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
    # kit.py remembers the earshot it finds in $CINETIC_HOME/tools.json: a test never writes the user's own home
    os.environ['CINETIC_HOME'] = tempfile.mkdtemp(prefix='cinetic-home-')
    baseline = sys.argv[sys.argv.index('--baseline') + 1] if '--baseline' in sys.argv else None
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    if not only or 'kit_helpers' in only:
        kit_helpers()
    tests = [('effects_only_baseline', lambda d: effects_only_baseline(d, baseline))] + [(fn.__name__, fn) for fn in (
        kit_engine, kit_only, vendored, tuned_budget, stack_guard, music_none, music_synth_refused, typing_word_kit,
        progress_kit, text_chord_kit, typing_bright_kit, land_light_and_levels, kit_tools, bed_edit, stopdown,
        stop_payoff, masked_hero, light_swell, width_and_bed_levels, on_beat_over_bed, carried_by_track, moments_arc, mixkeys_parity, credits_gate, av_audit, real_earshot)]
    for name, fn in tests:
        if only and name not in only:
            continue
        with tempfile.TemporaryDirectory() as d:
            fn(d)
    print(f"score.test.py: {'all checks pass' if not FAILS else f'{len(FAILS)} failed'}")
    return 1 if FAILS else 0


if __name__ == '__main__':
    sys.exit(main())
