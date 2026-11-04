#!/usr/bin/env python3
"""Tests for the sound library and the cast that draws from it: library.py (cut, level, measure, tag, licence
records, where the library is, check, order of fit), actions.py (music_cost, retune, the cast with a library: the
weak action takes a library sound, a sound plays one action, the track changes the choice, a busy action takes a
second sound, the set never repeats an earlier film's, tonal sounds tuned) and kit.py (music_of, place_library: the
library pick copied into the film with its record and placed as takes, an earlier cast's takes removed) and
credits.py (a second sound's record listed, each record once).

No network and no earshot: test signals made in code in a temporary folder (clicks, tones, thumps, never music),
records written by the test, the history under a temporary $CINETIC_HOME.

Usage: python3 skills/cinetic/scripts/test/library.test.py [--only test,test]
(needs numpy, scipy and soundfile). Exit 0 when every check passes, 1 otherwise.
"""
import copy
import json
import math
import os
import sys
import tempfile

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, '..', 'audio')
sys.path.insert(0, AUDIO)
import actions as AC  # noqa: E402
import credits as CR  # noqa: E402
import kit as K  # noqa: E402
import library as LB  # noqa: E402

SR = 48000
FAILS = []


def check(ok, what):
    print(('ok   ' if ok else 'FAIL ') + what)
    if not ok:
        FAILS.append(what)


# ------------------------------------------------------------------------------------------
# signals and records
# ------------------------------------------------------------------------------------------
def silence(s):
    return np.zeros(int(s * SR))


def click(ms=25, seed=1, amp=0.8):
    n = int(ms / 1000 * SR)
    r = np.random.default_rng(seed)
    return amp * r.standard_normal(n) * np.exp(-np.arange(n) / (0.004 * SR))


def tone(hz, s=0.4, amp=0.6, tau=0.12):
    t = np.arange(int(s * SR)) / SR
    return amp * np.sin(2 * np.pi * hz * t) * np.exp(-t / tau) * np.minimum(1, t / 0.002)


def write(path, x, sr=SR):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sf.write(path, np.asarray(x, np.float32), sr, subtype='PCM_24')
    return path


def record(wav, licence='Mixkit Sound Effects Free License', kind='sfx', credit=False, path=None):
    rec = {'record': 1, 'kind': kind, 'file': os.path.basename(wav), 'sha256': CR.sha256_file(wav),
           'bytes': os.path.getsize(wav), 'title': os.path.basename(wav), 'artist': 'tester', 'source': 'Test',
           'page': 'https://example.org/sfx', 'file_url': None, 'licence': licence,
           'licence_id': CR.classify(licence)['id'], 'licence_url': None, 'credit_required': credit, 'credit': None,
           'content_id': 'unknown', 'ai_generated': False, 'vocals': False, 'checked': '2026-10-27', 'certificate': None,
           'licence_seen': {'quote': 'can be used in commercial projects', 'url': 'https://example.org/l',
                            'date': '2026-10-27'}, 'limits': None, 'modifications': None}
    p = path or os.path.splitext(wav)[0] + '.licence.json'
    with open(p, 'w', encoding='utf-8') as fh:
        json.dump(rec, fh)
    return p


def quiet(*_a, **_k):
    pass


def make_lib(d, items):
    """a library from [(stem, signal, actions, licence)] -> path of library.json"""
    lp = os.path.join(d, 'lib', 'library.json')
    for stem, x, acts, lic in items:
        w = write(os.path.join(d, 'raw', stem + '.wav'), x)
        record(w, lic)
        LB.add(lp, w, acts, log=quiet)
    return lp


# ------------------------------------------------------------------------------------------
# library.py
# ------------------------------------------------------------------------------------------
def cutting(d):
    x = np.concatenate([silence(0.2), click(seed=2), silence(0.4), click(seed=3)])
    w = write(os.path.join(d, 'two-clicks.wav'), x)
    record(w)
    lp = os.path.join(d, 'lib', 'library.json')
    e = LB.add(lp, w, ['press'], log=quiet)
    check(abs(e['cut_from_s'] - 0.195) < 0.004, f"the onset kept, 5 ms before it ({e['cut_from_s']} s)")
    check(e['cut_by'] in ('decay', 'next attack') and e['dur_s'] < 0.3,
          f"only the first of two clicks ({e['dur_s']} s, cut by {e['cut_by']})")
    check(abs(e['l50_lufs'] - LB.TARGET_LUFS) < 0.6 or abs(e['peak_db'] - LB.CEILING_DB) < 0.05,
          f"levelled: loudest 50 ms {e['l50_lufs']} LUFS, peak {e['peak_db']} dBFS")
    check(e['tags']['transient'] == 'sharp' and 'bright' in e['tags']['character'] and 'tonal' not in e['tags']['character'],
          f"a click is sharp, bright, not tonal ({e['tags']})")
    ring = 0.8 * np.random.default_rng(4).standard_normal(int(0.12 * SR)) * np.exp(-np.arange(int(0.12 * SR)) / (0.012 * SR))
    ring[int(0.035 * SR):int(0.035 * SR) + int(0.025 * SR)] += click(seed=5, amp=0.5)
    two = np.concatenate([silence(0.1), ring])
    w2 = write(os.path.join(d, 'shutter.wav'), two)
    record(w2)
    e2 = LB.add(lp, w2, ['shutter'], log=quiet)
    check(e2['dur_s'] > 0.06, f"a two-stage sound (a second click 35 ms on, the first still ringing) stays one gesture ({e2['dur_s']} s)")
    w3 = write(os.path.join(d, 'bell.wav'), np.concatenate([silence(0.05), tone(440.0, 1.2, tau=0.25)]))
    record(w3)
    e3 = LB.add(lp, w3, ['chime'], log=quiet)
    check(e3['note'] == 'A4' and abs(e3['midi'] - 69) < 0.3 and 'tonal' in e3['tags']['character'],
          f"a struck tone is tonal, its note A4 ({e3['note']}, {e3['midi']}, tonal {e3['tonal']})")
    check(e3['dur_s'] <= LB.MAX_S['chime'] + 1e-3, f"cut at the action's length ({e3['dur_s']} s <= {LB.MAX_S['chime']})")
    # a whoosh: noise through a sweeping band-pass, a smooth spectrum however narrow its band: not tonal, no note
    from scipy import signal
    n = int(0.5 * SR)
    wn = np.random.default_rng(6).standard_normal(n)
    sos = signal.butter(2, [600, 2400], 'bandpass', fs=SR, output='sos')
    wh = signal.sosfilt(sos, wn) * np.sin(np.pi * np.arange(n) / n) ** 2
    wt = LB.tonality(wh / np.abs(wh).max())
    check(wt < 0.25 and LB.tonality(tone(440.0, 1.0, tau=0.25)) > 0.8,
          f"a band-passed whoosh is not tonal ({wt:.3f}), a struck tone is")
    w4 = write(os.path.join(d, 'thump.wav'), np.concatenate([silence(0.02), tone(55.0, 0.5, amp=0.9, tau=0.08)]))
    record(w4)
    e4 = LB.add(lp, w4, ['land', 'card-land'], log=quiet)
    check('low' in e4['tags']['character'] and 'dark' in e4['tags']['character'] and e4['actions'] == ['land', 'card-land'],
          f"a 55 Hz thump is low and dark, filed under two actions ({e4['tags']['character']}, {e4['actions']})")
    doc = LB.load(lp)
    rec = json.load(open(os.path.join(os.path.dirname(lp), e['licence']), encoding='utf-8'))
    check(rec['sha256'] == CR.sha256_file(os.path.join(os.path.dirname(lp), e['file'])) and rec['original']['sha256']
          and not CR.check_record(rec, os.path.join(os.path.dirname(lp), e['licence']))[0],
          'the record names the cut (its sha256), keeps the download\'s, and stays valid')
    check(len(doc['sounds']) == 4 and LB.check(doc) == [], 'check: four sounds, all there, licences need no credit')
    with open(os.path.join(os.path.dirname(lp), e['file']), 'r+b') as fh:
        fh.seek(200)
        fh.write(b'\x01\x02\x03')
    probs = LB.check(LB.load(lp))
    check(any('changed since' in p for p in probs), f'check: a changed file is named ({probs[:1]})')


def licences(d):
    lp = os.path.join(d, 'lib', 'library.json')
    w = write(os.path.join(d, 'a.wav'), np.concatenate([silence(0.05), click()]))
    for lic, kind, credit, what in (('CC BY 4.0', 'sfx', True, 'a licence that asks for a credit'),
                                    ('Mixkit Stock Music Free License', 'music', False, 'a music record'),
                                    ('CC BY-NC 4.0', 'sfx', False, 'a NonCommercial licence')):
        record(w, lic, kind, credit)
        try:
            LB.add(lp, w, ['press'], log=quiet)
            check(False, f'{what} is refused')
        except LB.LibraryError as e:
            check('refused' in str(e), f'{what} is refused')
    os.remove(os.path.splitext(w)[0] + '.licence.json')
    try:
        LB.add(lp, w, ['press'], log=quiet)
        check(False, 'a file without a record is refused')
    except LB.LibraryError:
        check(True, 'a file without a record is refused')
    record(w, 'CC0 1.0 (public domain dedication)')
    e = LB.add(lp, w, ['press'], log=quiet)
    check(e['licence_id'] == 'cc0', 'a CC0 record is taken')
    try:
        LB.add(lp, w, ['flying'], log=quiet)
        check(False, 'an unknown action is refused')
    except LB.LibraryError:
        check(True, 'an unknown action is refused')


def where(d):
    keep = {k: os.environ.get(k) for k in ('CINETIC_HOME', LB.ENV)}
    try:
        os.environ['CINETIC_HOME'] = os.path.join(d, 'home')
        os.environ.pop(LB.ENV, None)
        check(LB.resolve()[0] is None, 'no library anywhere: none')
        os.makedirs(os.path.join(d, 'home'))
        with open(os.path.join(d, 'home', LB.HOME_FILE), 'w') as fh:
            json.dump({'link': os.path.join(d, 'elsewhere', 'library.json')}, fh)
        check(LB.resolve()[0] == os.path.abspath(os.path.join(d, 'elsewhere', 'library.json')), 'the home file links a library')
        os.environ[LB.ENV] = os.path.join(d, 'env.json')
        check(LB.resolve()[0] == os.path.abspath(os.path.join(d, 'env.json')), f'${LB.ENV} comes before the home file')
        check(LB.resolve(os.path.join(d, 'cli.json'))[0] == os.path.abspath(os.path.join(d, 'cli.json')),
              '--library comes first')
    finally:
        for k, v in keep.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


def order():
    doc = {'sounds': [dict(id='a', actions=['whip'], dur_s=0.3, ears={'whip': dict(p=0.4, won=False)}),
                      dict(id='b', actions=['whip'], dur_s=0.5, ears={'whip': dict(p=0.9, won=True)}),
                      dict(id='c', actions=['whip'], dur_s=0.2, ears={}),
                      dict(id='d', actions=['pass'], dur_s=0.2)]}
    check([s['id'] for s in LB.candidates(doc, 'whip')] == ['b', 'c', 'a'],
          "order of fit: the ears' winner, then the unheard, then the loser (b, c, a)")


# ------------------------------------------------------------------------------------------
# actions.py: the match to the track
# ------------------------------------------------------------------------------------------
def music():
    key = (2, [0, 2, 3, 5, 7, 8, 10], 'D minor')
    ring = dict(dur_s=0.9, peak_s=0.01, t20_ms=600, centroid_hz=5000)
    slow, _ = AC.music_cost(ring, 'appear', dict(bpm=80))
    fast, why = AC.music_cost(ring, 'appear', dict(bpm=140))
    check(fast > slow > 0 and 'rings' in why[0], f'a ringing pop costs more at 140 BPM than at 80 ({fast} > {slow})')
    near, why = AC.music_cost(dict(centroid_hz=1300), 'appear', dict(centroid=1200))
    far, _ = AC.music_cost(dict(centroid_hz=5000), 'appear', dict(centroid=1200))
    check(near > 1.0 and far == 0.0 and "track's band" in why[0], f"a centroid in the track's band costs ({near}), two "
          f'octaves away nothing ({far})')
    check(AC.retune(69.0, key, 'chime') == 0.0 and AC.retune(68.2, key, 'chime') == 0.8 and AC.retune(65.6, key, 'lock') == -0.6,
          'retune: A4 sits in D minor, G#4+0.2 moves up to A4 on the pentatonic, F4+0.6 down to F4 in the scale')
    t0, _ = AC.music_cost(dict(midi=69.0), 'chime', dict(key=key))
    t1, _ = AC.music_cost(dict(midi=68.5), 'chime', dict(key=key))
    t2, _ = AC.music_cost(dict(midi=68.5), 'chime', dict(key=key), tuned=True)
    check(t0 == 0.0 and t1 > 0 and t2 == 0.0, 'an off-key tonal real effect costs; a tuned bank sound does not')
    check(AC.music_cost(ring, 'appear', None) == (0.0, []) and AC.music_cost(None, 'appear', dict(bpm=120)) == (0.0, []),
          'no track or no measurement: no cost')
    # masking: a bass-heavy track hides a low thump, not a bright click; measured bands win over the centroid
    bass = dict(bands=[0.6, 0.2, 0.08, 0.05, 0.03, 0.02, 0.01, 0.01], centroid=300)
    thump = LB.measure(np.concatenate([silence(0.01), tone(70.0, 0.3, tau=0.06)])[:, None])
    tick = LB.measure(np.concatenate([silence(0.01), np.pad(click(seed=9), (0, 4000))])[:, None])
    mt, mc = AC.masked_db(thump, bass, 8), AC.masked_db(tick, bass, 8)
    ct, why = AC.music_cost(thump, 'land', bass, bed_db=8)
    cc, _ = AC.music_cost(tick, 'land', bass, bed_db=8)
    check(mt[0] < AC.MASK_DB <= mc[0] and ct > 1 and cc == 0 and 'masked' in why[0] and len(thump['bands']) == 8,
          f'a 70 Hz thump is masked under a bass-heavy track ({mt}), a click is not ({mc}); the cost follows')
    # where the events land: a busy 500 Hz moment at 1 s, a quiet one at 3 s
    rows = [[round(0.085 * i, 3), 1.0] + ([0.05, 0.05, 0.05, 0.6, 0.1, 0.05, 0.05, 0.05] if 0.8 <= 0.085 * i <= 1.5 else
                                         [0.4, 0.3, 0.1, 0.05, 0.05, 0.04, 0.03, 0.03]) for i in range(60)]
    tr = dict(bands=[0.3] * 8, film_bands=rows)
    b1, b3 = AC.local_bands(tr, [1.0]), AC.local_bands(tr, [3.0])
    check(b1[3] > 10 * b3[3] and AC.local_bands(tr, []) is None and AC.local_bands({}, [1.0]) is None,
          f'the music where an event lands: 500 Hz at 1 s ({b1[3]}) over 3 s ({b3[3]})')
    # score.py's band check reads a take's attack: a click at the start of its window over steady noise
    import score as S
    n = int(0.5 * SR)
    take = np.zeros((n, 2))
    take[:len(click())] = click()[:, None]
    noise = np.random.default_rng(3).standard_normal((n, 2)) * 0.01
    r = S.band_snr(take, noise)
    A = np.abs(np.fft.rfft(take.mean(axis=1))) ** 2
    B = np.abs(np.fft.rfft(noise.mean(axis=1))) ** 2
    fr = np.fft.rfftfreq(n, 1 / SR)
    band = (fr >= r[0] / math.sqrt(2)) & (fr < r[0] * math.sqrt(2))
    flat = 10 * math.log10(A[band].sum() / B[band].sum())
    check(abs(r[1] - flat) < 2.0, f"score.py's band check reads the attack at the window's start ({r[1]:.1f} dB, unwindowed {flat:.1f})")


# ------------------------------------------------------------------------------------------
# actions.cast with a library
# ------------------------------------------------------------------------------------------
def base_kit():
    r = lambda sound, **kw: dict(dict(sound=sound, takes=3, align='onset'), **kw)  # noqa: E731
    return {'kit': 1, 'name': 'launch', 'sr': 48000, 'roles': {
        'tick': r('pro_hover_tick/ping', bed_db=3.0), 'tock': r('knock/wood', bed_db=8.0, offset_ms=-40),
        'pop': r('ui_pop/soft', bed_db=8.5, offset_ms=4), 'land': r('pro_pop_in/round', bed_db=8.0, offset_ms=30),
        'whoosh.short': r('whoosh_fast/crisp', bed_db=9.0, offset_ms=37, align='peak'), 'hit': r('cut_hit/punch', bed_db=7.5),
        'bell': dict(sound='mallet/glock', pitches=['A4', 'C5'], takes=1, bed_db=7.5), 'suck': None}}


EVENTS = [dict(f=10, kind='whoosh', id='c:card-swap', dur=20), dict(f=60, kind='tock', id='c:part-locks'),
          dict(f=120, kind='pop', id='c:badge-1'), dict(f=130, kind='pop', id='c:badge-2'),
          dict(f=140, kind='pop', id='c:badge-3'), dict(f=150, kind='pop', id='c:badge-4'),
          dict(f=200, kind='land', id='c:lands'), dict(f=600, kind='hit', id='r:reveal'), dict(f=640, kind='bell', id='r:chime')]


def lib_entry(sid, acts, **kw):
    e = dict(id=sid, actions=acts, dur_s=0.2, peak_s=0.01, t20_ms=60, centroid_hz=3000, tonal=0.1, midi=None,
             tags=dict(length='short', transient='firm', character=['mid']), ears={})
    e.update(kw)
    return e


def cast_library(home):
    os.environ['CINETIC_HOME'] = home
    lib = {'sounds': [lib_entry('paper-1', ['swipe']), lib_entry('paper-2', ['swipe']),
                      lib_entry('pop-a', ['appear']), lib_entry('pop-b', ['appear']), lib_entry('pop-c', ['appear']),
                      lib_entry('knock-1', ['lock', 'card-land']),
                      lib_entry('bell-1', ['chime'], tonal=0.9, midi=68.4, tags=dict(length='medium', transient='firm', character=['mid', 'tonal']))]}
    kit = base_kit()
    new, rep = AC.cast(EVENTS, kit, 60, {}, {'history': 1, 'films': []}, 'f1', None, K.role_for, (), library=lib)
    sw = rep['actions']['swipe']['sound']
    check(sw.startswith('lib:paper'), f'the weak action (swipe) takes a library sound ({sw})')
    check(not rep.get('weak', {}).get('swipe'), 'a library swipe is not named weak')
    sounds = [r['sound'] for r in rep['actions'].values()] + [r['partner'] for r in rep['actions'].values() if r.get('partner')]
    check(len(sounds) == len(set(sounds)), f'a sound plays one action ({len(sounds)} sounds, all different)')
    ap = rep['actions']['appear']
    check(ap['events'] == 4 and (not ap['sound'].startswith('lib:') or ap.get('partner', '').startswith('lib:')),
          f"a busy action on a library sound takes a second one ({ap['sound']} + {ap.get('partner')})")
    for a, r in rep['actions'].items():
        if r['sound'].startswith('lib:'):
            for name in new['cast']['library'][a]['roles']:
                check(not str(new['roles'][name]['sound']).startswith('lib:'),
                      f"{name}: kit.json keeps a bank sound to render ({new['roles'][name]['sound']}) for {r['sound']}")
            break
    # the track: everything equal but one pop sits in the track's band
    lib2 = {'sounds': [lib_entry('pop-near', ['appear'], centroid_hz=1250), lib_entry('pop-far', ['appear'], centroid_hz=5000)]}
    ev = [dict(f=10, kind='pop', id='a:badge')]
    picks = set()
    for film in ('m1', 'm2', 'm3', 'm4'):
        _, r = AC.cast(ev, base_kit(), 60, {}, None, film, {'nothing': {}}, K.role_for, (), library=lib2,
                       music=dict(centroid=1200))
        picks.add(r['actions']['appear']['sound'])
    check(picks == {'lib:pop-far'}, f"the track's band decides between two equal library pops ({picks})")
    # tonal: tuned to the key
    _, r = AC.cast([dict(f=10, kind='bell', id='x:chime')], base_kit(), 60, {}, None, 't1', {'nothing': {}}, K.role_for, (),
                   library={'sounds': [lib['sounds'][-1]]}, music=dict(key=(2, [0, 2, 3, 5, 7, 8, 10], 'D minor')))
    check(r['actions']['chime']['sound'] == 'lib:bell-1' and abs(r['actions']['chime']['retune'] - 0.6) < 1e-6,
          f"a tonal library bell is tuned to D minor's pentatonic (+0.6 semitone: {r['actions']['chime'].get('retune')})")
    # the history: the set is never an earlier film's
    h = AC.record({'history': 1, 'films': []}, 'f1', rep)
    check(any(k.endswith('+') for k in h['films'][-1]['sounds']) or not ap.get('partner'),
          'the history records the second sound too')
    same = copy.deepcopy(h['films'][-1])
    same['film'], same['signature'] = 'f0', []
    hist = {'history': 1, 'films': [same]}
    _, rep2 = AC.cast(EVENTS, base_kit(), 60, {}, hist, 'f1', None, K.role_for, (), library=lib)
    s1 = sorted({r['sound'] for r in rep['actions'].values()})
    s2 = sorted({r['sound'] for r in rep2['actions'].values()})
    check(s2 != s1, 'the previous film cast with this set: this cast differs')
    hist = {'history': 1, 'films': [dict(film='f0', sounds={a: r['sound'] for a, r in rep['actions'].items()}, signature=[])]}
    _, rep3 = AC.cast(EVENTS, base_kit(), 60, {}, hist, 'f1', None, K.role_for, (), library=lib)
    s3 = sorted({r['sound'] for r in rep3['actions'].values()})
    check(s3 != s1, f"the same film's exact set from an earlier film is never repeated ({len(set(s3) ^ set(s1))} sounds differ)")
    # without a library the cast is the bank's, as before
    _, rep4 = AC.cast(EVENTS, base_kit(), 60, {}, None, 'f1', None, K.role_for, ())
    check(not any(r['sound'].startswith('lib:') for r in rep4['actions'].values()) and rep4['library'] == {},
          'no library: bank sounds only')
    # the set rule alone: the earlier film with this very set is five films back (no history penalty reaches it)
    s4 = {a: r['sound'] for a, r in rep4['actions'].items()}
    films = [dict(film='old', sounds=s4, signature=[])] + [dict(film=f'b{i}', sounds={'x': 'none/none'}, signature=[])
                                                            for i in range(4)]
    _, rep5 = AC.cast(EVENTS, base_kit(), 60, {}, {'history': 1, 'films': films}, 'f1', None, K.role_for, ())
    moved = [a for a, r in rep5['actions'].items() if r['sound'] != s4[a]]
    check(len(moved) == 1 and rep5['actions'][moved[0]].get('why') == 'an earlier film had this set',
          f'the set of a film five back is not repeated: one action takes its next sound ({moved})')
    # the ears: an author's variant on a member heard to lose gives way once a library shutter won (to it or to the
    # bank member that won) ...
    won = dict(ears={'shutter': dict(p=0.99, won=True)})
    shot = [dict(f=10, kind='snap', id='s:camera-shutter', variant='film')]
    sk = dict(base_kit())
    sk['roles'] = dict(sk['roles'], snap=dict(sound='shutter/dslr', takes=3, align='onset', bed_db=4.0))
    _, r6 = AC.cast(shot, sk, 60, {}, None, 'v1', None, K.role_for, (),
                    library={'sounds': [lib_entry('cam-1', ['shutter'], **won)]})
    _, r7 = AC.cast(shot, sk, 60, {}, None, 'v1', None, K.role_for, ())
    check('shutter/film' in AC.LOST['shutter'] and r6['actions']['shutter']['sound'] in ('lib:cam-1', 'shutter/snap')
          and r7['actions']['shutter']['sound'] == 'shutter/film',
          f"a variant heard to lose gives way once a library sound won ({r6['actions']['shutter']['sound']}); "
          f"without a library the variant stands ({r7['actions']['shutter']['sound']})")
    # ... a library sound that lost does not displace it
    _, r8 = AC.cast(shot, sk, 60, {}, None, 'v1', None, K.role_for, (),
                    library={'sounds': [lib_entry('cam-2', ['shutter'], ears={'shutter': dict(p=0.1, won=False)})]})
    check(r8['actions']['shutter']['sound'] == 'shutter/film', f"a library sound that lost leaves the variant ({r8['actions']['shutter']['sound']})")
    # two presets of one recipe for two actions lose ground
    check(AC.family('knock/plastic') == AC.family('knock/snap') == 'knock' and AC.family('pro_hover_tick/detent') == 'hover_tick'
          and AC.family('fit/pop/lip_pop') == 'fit/pop' and AC.family('lib:x') is None, 'the recipe family of a bank sound')
    two = [dict(f=10, kind='tock', id='a:part-locks'), dict(f=40, kind='tock', id='b:part-locks'),
           dict(f=80, kind='tock', id='c:jump-cut', action='jump-cut')]
    fams = set()
    for film in ('k1', 'k2', 'k3', 'k4', 'k5', 'k6'):
        _, r9 = AC.cast(two, base_kit(), 60, {}, None, film, None, K.role_for, ())
        fams.add(AC.family(r9['actions']['lock']['sound']) == AC.family(r9['actions']['jump-cut']['sound']))
    check(fams == {False}, 'the lock and the jump cut never take two presets of one recipe (six films)')
    os.environ.pop('CINETIC_HOME', None)


# ------------------------------------------------------------------------------------------
# kit.py: music_of, place_library; credits.py
# ------------------------------------------------------------------------------------------
def placing(d):
    os.environ['CINETIC_HOME'] = os.path.join(d, 'home')
    proj = os.path.join(d, 'film')
    os.makedirs(os.path.join(proj, 'audio', 'music'))
    K.write_json(os.path.join(proj, 'audio', 'music', 'x.track.json'), {'bars': [{'centroid': 1000}, {'centroid': 1400},
                                                                                  {'centroid': 1200}]})
    K.write_json(os.path.join(proj, 'audio', 'music', 'edit.json'), {'edit': 1, 'bpm': 121.0,
                                                                     'analysis': 'audio/music/x.track.json'})
    K.write_json(os.path.join(proj, 'audio', 'score.json'), {'key': 'D minor', 'music': {'track': 'audio/music/x.mp3',
                                                                                        'edit': 'audio/music/edit.json'}})
    m = K.music_of(os.path.join(proj, 'audio', 'kit.json'), os.path.join(proj, 'audio', 'score.json'))
    check(m.get('bpm') == 121.0 and m.get('centroid') == 1200 and m['key'][0] == 2, f'music_of: tempo, centroid, key ({m})')
    check(K.music_of(os.path.join(proj, 'audio', 'kit.json'), os.path.join(d, 'none.json')) == {}, 'music_of: no score, no track')
    pops = [(f'pop-{i}', np.concatenate([silence(0.01), tone(700 + 90 * i, 0.15, tau=0.03) + 0.05 * np.pad(click(seed=i), (0, int(0.125 * SR)))]),
             ['appear'], 'Mixkit Sound Effects Free License') for i in range(3)]
    bell = ('bell-1', np.concatenate([silence(0.01), tone(425.0, 0.8, tau=0.2)]), ['chime'], 'CC0 1.0 (public domain dedication)')
    lp = make_lib(d, pops + [bell])
    lib = LB.load(lp)
    kp = os.path.join(proj, 'audio', 'kit.json')
    K.write_json(kp, base_kit())
    takes = os.path.join(proj, 'audio', 'kit')
    ev = [dict(f=10 + 10 * i, kind='pop', id=f'a:badge-{i}') for i in range(5)] + [dict(f=200, kind='bell', id='b:chime')]
    new, rep = AC.cast(ev, base_kit(), 60, {}, None, 'p1', {'nothing': {}}, K.role_for, (), library=lib, music=m)
    placed = K.place_library(kp, takes, new, lib, m, log=quiet)
    real = K.read_real(takes)
    pop = real['roles'].get('pop') or {}
    check(set(placed) == {'pop', 'bell'} and pop.get('cast') and pop.get('action') == 'appear',
          f'placed: the pop role plays appear, the bell role chime ({placed})')
    check(len(pop.get('takes') or []) == 4 and pop.get('also'), f"a busy action: two sounds, four takes ({len(pop.get('takes') or [])})")
    sfx = os.path.join(proj, 'audio', 'sfx')
    copied = sorted(os.listdir(sfx))
    check(all(os.path.isfile(os.path.join(takes, t['file'])) for t in pop['takes']) and len(copied) == 6,
          f'the takes are written; the sounds and their records copied into audio/sfx ({len(copied)} files)')
    recs = [json.load(open(os.path.join(sfx, f), encoding='utf-8')) for f in copied if f.endswith('.licence.json')]
    check(all(not CR.check_record(r, os.path.join(sfx, f))[0] for r, f in zip(recs, [f for f in copied if f.endswith('.licence.json')])),
          'each copied record is valid beside its file')
    b = real['roles']['bell']
    y, _ = sf.read(os.path.join(takes, b['takes'][0]['file']))
    y = y if y.ndim == 1 else y.mean(axis=1)
    spec = np.abs(np.fft.rfft(y * np.hanning(len(y)), 1 << 17))
    f0 = np.fft.rfftfreq(1 << 17, 1 / SR)[int(np.argmax(spec))]
    check(abs(12 * math.log2(f0 / 440.0)) < 0.15, f'the bell at 425 Hz plays tuned to A4 in D minor ({f0:.1f} Hz)')
    y1, _ = sf.read(os.path.join(takes, b['takes'][1]['file']))
    y1 = y1 if y1.ndim == 1 else y1.mean(axis=1)
    f1 = np.fft.rfftfreq(1 << 17, 1 / SR)[int(np.argmax(np.abs(np.fft.rfft(y1 * np.hanning(len(y1)), 1 << 17))))]
    check([t['pitch'] for t in b['takes']] == ['A4', 'C5'] and abs(12 * math.log2(f1 / 523.25)) < 0.15,
          f"a pitched role: a take on each of its notes ({[t['pitch'] for t in b['takes']]}, C5 at {f1:.1f} Hz)")
    nb = copy.deepcopy(new)
    nb['roles']['bell'].pop('pitches')
    K.place_library(kp, takes, nb, lib, m, log=quiet)
    b2 = K.read_real(takes)['roles']['bell']
    l2 = [len(sf.read(os.path.join(takes, t['file']))[0]) for t in b2['takes']]
    check(len(l2) == 3 and max(l2) - min(l2) <= 1 and not any(t['pitch'] for t in b2['takes']),
          "a tonal sound on a role without notes: its takes keep its pitch (no speed variants)")
    K.place_library(kp, takes, new, lib, m, log=quiet)
    raw = [(tone(440.0, 0.3), 69.0, True), (tone(110.0, 0.3), 45.0, True), (click(), None, False)]
    pc = K.pitched_clips(raw, ['A4', 'C5', 'E5'])
    check(sorted(n[2] for n in pc if n[2]) == ['A4', 'C5', 'E4'] and {n[3] for n in pc} == {0, 2},
          f"pitched takes stay in the first sound's register: a sound two octaves off is left out ({[n[2] for n in pc]})")
    old_files = [t['file'] for t in pop['takes']]
    new2, _ = AC.cast(ev, new, 60, {}, None, 'p1', {'nothing': {}}, K.role_for, (), library=None, music=m)
    K.place_library(kp, takes, new2, None, m, log=quiet)
    real2 = K.read_real(takes)
    check(not real2['roles'] and not any(os.path.isfile(os.path.join(takes, f)) for f in old_files),
          'cast again without the library: the earlier placements and their takes go')
    K.place_library(kp, takes, new, lib, m, log=quiet)
    score = {'sfx': {'kit': 'audio/kit.json'}}
    recs = CR.effect_records(score, proj)
    names = sorted(os.path.basename(p) for _, p in recs)
    check(len(names) == len(set(names)) == 3, f'credits: the main and the second sound of appear and the bell, each once ({names})')
    os.environ.pop('CINETIC_HOME', None)


def main():
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    keep = os.environ.pop(LB.ENV, None)
    for name, fn in [('order', order), ('music', music)]:
        if not only or name in only:
            fn()
    for name, fn in [('cutting', cutting), ('licences', licences), ('where', where), ('cast_library', cast_library),
                     ('placing', placing)]:
        if only and name not in only:
            continue
        with tempfile.TemporaryDirectory() as d:
            fn(d)
    if keep is not None:
        os.environ[LB.ENV] = keep
    print(f"library.test.py: {'all checks pass' if not FAILS else f'{len(FAILS)} failed'}")
    return 1 if FAILS else 0


if __name__ == '__main__':
    sys.exit(main())
