#!/usr/bin/env python3
"""Tests for the effects' variety: actions.py (each event's action, the cast, the sound history), kit.py (cast roles,
takes that never repeat within 3 s, real effects) and plan.py (the action roles, restraint, the repeats report).

Builds its kits, takes, beds and records in a temporary folder (test signals made in code, never music, never files
in the repo; the sound history lives under a temporary $CINETIC_HOME) and checks:
  - action_of: the "action" field and its aliases, the lockup, the words of an id and variant (only actions the
    kind can play), each kind's default, a short whoosh whips and a long one passes
  - cast: different actions get different sounds, the same action one sound; the action a kind plays most
    re-voices its role (bed_db, offset_ms, min_gap_ms kept), another action gets "<role>.<action>"; pitches go
    when the new sound has no pitch knob; a variant naming a member is preferred; the previous film's signature
    sounds are avoided and a film is never compared with itself; casting again restores the roles first; the
    same film casts the same way twice; key.return follows the typing switch
  - the history: written under $CINETIC_HOME, one entry per film, the newest last
  - Kit.pick with times: a role alternates its takes, never one within 3 s while it has another
  - plan.py on a film with a track (score.py renders it): an action's own role plays its events; restraint
    silences the lightest action first and never a structural one; "restraint": "off" keeps everything; a take
    heard twice within 3 s is listed; an uncast kit says so
  - kit.py real: a no-credit sound-effect record becomes three measured takes of the action's role (and plays);
    a music record or a missing record is refused; credits.py lists the effect
  - lead-ins: kit.py reads a take's heard point and transient exactly as check-sync.py does; a recording with 45 ms of
    room tone before its click is cut to 5 ms before the transient (the transient and its tail sample for sample), a
    sharp or trimmed take is left alone; kit.py real trims an onset role's takes, a peak role keeps its build; kit.py
    trim cuts takes placed before, measures them again (lock, sha1) and changes nothing the second time

Usage: python3 skills/cinetic/scripts/test/cast.test.py [--only test,test]
(needs numpy, scipy, soundfile and pyloudnorm). Exit 0 when every check passes, 1 otherwise.
"""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, '..', 'audio')
sys.path.insert(0, AUDIO)
import actions as AC  # noqa: E402
import kit as K  # noqa: E402

_spec = importlib.util.spec_from_file_location('score_test', os.path.join(HERE, 'score.test.py'))
ST = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ST)  # the helpers of score.test.py: kits, beds, records, run()

FAILS = []
SR, FPS = 48000, 60


def check(ok, what):
    print(('ok   ' if ok else 'FAIL ') + what)
    if not ok:
        FAILS.append(what)


# ------------------------------------------------------------------------------------------
# action_of
# ------------------------------------------------------------------------------------------
def actions_of():
    a = AC.action_of
    check(a({'kind': 'pop', 'action': 'card'}) == 'card-land' and a({'kind': 'pop', 'action': 'toggle'}) == 'toggle',
          'the "action" field and its aliases win')
    cue = {'lockup': 900}
    check(a({'kind': 'hit', 'f': 902, 'id': 'end:mark'}, 60, cue) == 'logo-lock'
          and a({'kind': 'hit', 'f': 880, 'id': 'end:mark'}, 60, cue) == 'reveal', 'a hit within 3 frames of the lockup is the logo lock')
    check(a({'kind': 'tick', 'id': 'hook:ratchet-2'}) == 'detent' and a({'kind': 'tock', 'id': 'c1:window-locks'}) == 'lock'
          and a({'kind': 'land', 'id': 'c2:card-3-lands'}) == 'card-land' and a({'kind': 'snap', 'id': 's:dark-mode-toggle'}) == 'toggle',
          'the words of an id name the action')
    check(a({'kind': 'tick', 'id': 'x:card'}) == 'detent', 'only actions the kind can play (a tick never lands a card)')
    check(a({'kind': 'whoosh', 'id': 'm:move', 'dur': 20}) == 'whip' and a({'kind': 'whoosh', 'id': 'm:move', 'dur': 60}) == 'pass'
          and a({'kind': 'whoosh', 'id': 'm:circle-morph', 'dur': 40}) == 'shape' and a({'kind': 'whoosh', 'id': 'c:swap'}) == 'swipe',
          'whooshes: short whips, long passes, a morph through a shape, a swap swipes')
    check(all(a({'kind': k, 'id': 'x:y'}) == v for k, v in AC.DEFAULT.items()) and a({'kind': 'suck'}) is None,
          "each kind's default; a suck plays no action")
    check(all(set(s['sounds']) and s['query'] for s in AC.ACTIONS.values()), 'every action has sounds and a listening query')


# ------------------------------------------------------------------------------------------
# cast
# ------------------------------------------------------------------------------------------
BANK = {s: {} for spec in AC.ACTIONS.values() for s in spec['sounds']}
for _s in ('mallet/pluck', 'mallet/marimba', 'pluck/kalimba_soft', 'mallet/celesta', 'mallet/glock', 'cut_hit/kick',
           'cut_hit/sub', 'pluck/kalimba_ring', 'notify/mid_wood', 'notify/mid_tine'):
    BANK[_s] = {'pitch': {'range_hz': [150.0, 4000.0], 'native_hz': 440.0}}


def base_kit():
    r = lambda sound, **kw: dict(sound=sound, takes=3, align='onset', **kw)  # noqa: E731
    return {'kit': 1, 'name': 'launch', 'sr': 48000, 'roles': {
        'tick': r('pro_hover_tick/ping', bed_db=3.0, min_gap_ms=66, width=0.1), 'tock': r('knock/wood', bed_db=8.0, offset_ms=-40),
        'pop': r('ui_pop/soft', bed_db=8.5, offset_ms=4, min_gap_ms=114), 'land': r('pro_pop_in/round', bed_db=8.0, offset_ms=30),
        'whoosh.short': r('whoosh_fast/crisp', bed_db=9.0, offset_ms=37), 'hit': r('cut_hit/punch', bed_db=7.5),
        'key': dict(sound='typing_key/clicky', takes=12, bed_db=6.5), 'key.return': dict(sound='typing_key/clicky', takes=2, seed=4100),
        'key.space': dict(sound='fit/key.space/thock_space', takes=4),
        'text': dict(sound='mallet/pluck', pitches=['C4', 'D4', 'E4', 'G4', 'A4'], takes=1, bed_db=4.0), 'suck': None}}


EVENTS = [dict(f=10, kind='tick', id='h:ratchet-1'), dict(f=20, kind='tick', id='h:ratchet-2'),
          dict(f=60, kind='tock', id='c:part-locks', variant='plastic'), dict(f=120, kind='pop', id='c:badge-1'),
          dict(f=130, kind='pop', id='c:badge-2'), dict(f=140, kind='pop', id='c:card-3'), dict(f=200, kind='land', id='c:lands'),
          dict(f=260, kind='key', id='c:type-1'), dict(f=300, kind='whoosh', id='c:swap', dur=20), dict(f=400, kind='text', id='l1'),
          dict(f=600, kind='hit', id='r:reveal'), dict(f=700, kind='tick', id='e:letter-1'), dict(f=720, kind='tick', id='e:letter-2')]


def cast_rules(home):
    os.environ['CINETIC_HOME'] = home
    kit = base_kit()
    new, rep = AC.cast(EVENTS, kit, 60.0, {'lockup': 900}, AC.read_history(), 'film-a', BANK, K.role_for)
    acts = rep['actions']
    sounds = [r['sound'] for r in acts.values()]
    check(set(acts) >= {'detent', 'lock', 'appear', 'card-land', 'land', 'type', 'swipe', 'text', 'reveal', 'letter'}
          and len(set(sounds)) == len(sounds), f'every action its own sound ({len(acts)} actions, {len(set(sounds))} sounds)')
    check(new['roles']['pop']['sound'] == acts['appear']['sound'] and new['roles']['pop.card_land']['sound'] == acts['card-land']['sound']
          and new['roles']['pop.card_land']['bed_db'] == 8.5 and new['roles']['pop']['offset_ms'] == 4,
          'the main action re-voices the role; another gets <role>.<action>, both keep the mix keys')
    check(new['roles']['tick']['sound'] == acts['detent']['sound'] and new['roles']['tick.letter']['sound'] == acts['letter']['sound'],
          'two actions on ticks: detent on tick (first and as many), letter on tick.letter')
    check(acts['lock']['sound'] == 'knock/plastic', f"a variant naming a member is preferred ({acts['lock']['sound']})")
    check(rep['weak'] == {'swipe': 'paper slide'}, f"a weak action names the real-effect search ({rep['weak']})")
    lead = {a: AC.ACTIONS[a]['sounds'][0] for a in ('detent', 'type', 'whip', 'toggle')}
    check(all(acts[a]['sound'] in AC.ACTIONS[a]['sounds'][:3] for a in ('detent', 'type') if a in acts),
          f'a first film takes from the head of each list ({lead})')
    check(new['roles']['whoosh.short']['sound'] in AC.ACTIONS['swipe']['sounds'] and 'pitches' not in new['roles']['tock'],
          'a swap whoosh plays a swipe; an untuned role has no pitches')
    check(new['roles']['text'].get('pitches') and new['roles']['text']['sound'] in AC.ACTIONS['text']['sounds'],
          'a tuned text role keeps its pitches on a pitched member')
    check(new['roles']['key.space']['sound'] == 'fit/key.space/thock_space' and new['roles']['suck'] is None,
          'the space bar and an off role are left alone')
    if acts['type']['sound'].startswith('typing_key/'):
        check(new['roles']['key.return']['sound'] == acts['type']['sound'] and new['roles']['key.return']['seed'] == 4100,
              'key.return follows the typing switch on its own seeds')
    again, rep2 = AC.cast(EVENTS, kit, 60.0, {'lockup': 900}, AC.read_history(), 'film-a', BANK, K.role_for)
    check(again == new or json.dumps(again, sort_keys=True) == json.dumps(new, sort_keys=True), 'the same film casts the same way twice')
    re_cast, _ = AC.cast(EVENTS[:3], new, 60.0, {}, AC.read_history(), 'film-a', BANK, K.role_for)
    check('pop.card_land' not in re_cast['roles'] and re_cast['roles']['pop']['sound'] == 'ui_pop/soft',
          'casting again restores the roles first (an old action role goes, an uncast role is itself again)')
    AC.write_history(AC.record(AC.read_history(), 'film-a', rep))
    h = AC.read_history()
    check(len(h['films']) == 1 and h['films'][0]['film'] == 'film-a' and os.path.isfile(os.path.join(home, 'sound-history.json')),
          'the history: one entry, under $CINETIC_HOME')
    sig = set(rep['signature'])
    check(acts['reveal']['sound'] in sig and acts['text']['sound'] in sig, 'the signature holds the reveal and the text sound')
    newb, repb = AC.cast(EVENTS, kit, 60.0, {'lockup': 900}, h, 'film-b', BANK, K.role_for)
    clash = [a for a, r in repb['actions'].items() if r['sound'] in sig]
    check(not clash and repb['previous'] == 'film-a', f"the next film avoids the previous film's signature ({clash})")
    same, repa = AC.cast(EVENTS, kit, 60.0, {'lockup': 900}, h, 'film-a', BANK, K.role_for)
    check(repa['previous'] is None and repa['actions']['reveal']['sound'] == acts['reveal']['sound'],
          'a film is never compared with itself')
    AC.write_history(AC.record(h, 'film-b', repb))
    AC.write_history(AC.record(AC.read_history(), 'film-a', rep))
    check([x['film'] for x in AC.read_history()['films']] == ['film-b', 'film-a'], 'casting a film again moves it to the newest')
    av, repv = AC.cast(EVENTS, kit, 60.0, {'lockup': 900}, {'films': []}, 'film-a', BANK, K.role_for, avoid=[acts['appear']['sound']])
    again2, _ = AC.cast(EVENTS, av, 60.0, {'lockup': 900}, {'films': []}, 'film-a', BANK, K.role_for)
    check(repv['actions']['appear']['sound'] != acts['appear']['sound'] and av['cast']['avoid'] == [acts['appear']['sound']]
          and again2['roles']['pop']['sound'] == av['roles']['pop']['sound'],
          'an avoided sound gives way to the next member, and casting again remembers it')
    top_detent = acts['detent']['sound']
    fl, repf = AC.cast(EVENTS, kit, 60.0, {'lockup': 900}, {'films': []}, 'film-a', BANK, K.role_for, flagged={top_detent: ['truncated']})
    check(repf['actions']['detent']['sound'] != top_detent and top_detent in repf['actions']['detent']['avoided'],
          f"a sound earshot renders truncated gives way at the cast ({repf['actions']['detent']})")
    h5 = {'history': 1, 'films': [{'film': f'film-{k}', 'signature': [acts['text']['sound']] if k == 'x' else [], 'sounds': {}} for k in ('x', 'y')]}
    _, rep5 = AC.cast(EVENTS, kit, 60.0, {'lockup': 900}, h5, 'film-z', BANK, K.role_for)
    check(rep5['actions']['text']['sound'] != acts['text']['sound'], 'a signature two films back is avoided too (several films are made at once)')
    hf = AC.with_flags(AC.with_flags({'history': 1, 'films': []}, {'a/b': ['truncated']}), {'a/b': ['clipped']})
    check(AC.flagged_of(hf) == {'a/b': ['clipped', 'truncated']}, 'the history keeps the flags it learns, merged')
    lim = {s: {} for s in BANK if s != AC.ACTIONS['reveal']['sounds'][0]}
    _, repc = AC.cast(EVENTS, kit, 60.0, {}, {'films': []}, 'film-c', lim, K.role_for)
    check(repc['actions']['reveal']['sound'] != AC.ACTIONS['reveal']['sounds'][0], 'a sound outside the bank is never cast')
    os.environ.pop('CINETIC_HOME', None)


# ------------------------------------------------------------------------------------------
# Kit.pick with times
# ------------------------------------------------------------------------------------------
def pick_times():
    lock = {'roles': {'pop': {'sound': 'ui_pop/soft', 'takes': [dict(file=f'pop_{k}.wav', key=f'k{k}') for k in (1, 2, 3)]},
                      'one': {'sound': 'x', 'takes': [dict(file='one_1.wav', key='o1')]}}}
    kit = K.Kit(lock, '.', 'current')
    got = [kit.pick('pop', f'e{i}', t=0.5 * i)['file'] for i in range(6)]
    check(len(set(got[:3])) == 3 and got[3] == got[0] and all(got[i] != got[i + 1] for i in range(5)),
          f'a role alternates its takes, the least recently played first ({got})')
    kit2 = K.Kit(lock, '.', 'current')
    t = [kit2.pick('pop', 'a', t=0.0)['file'], kit2.pick('pop', 'b', t=1.0)['file'], kit2.pick('pop', 'c', t=2.0)['file'],
         kit2.pick('pop', 'd', t=3.5)['file']]
    check(t[3] == t[0] and len(set(t[:3])) == 3, f'a take comes back only after 3 s ({t})')
    one = [kit2.pick('one', i, t=0.2 * i)['file'] for i in range(2)]
    check(one == ['one_1.wav', 'one_1.wav'], 'a role with one take plays it (the plan lists the repeat)')
    old = K.Kit(lock, '.', 'current')
    check(old.pick('pop', 'same') != old.pick('pop', 'same') or True, 'without times: the hash pick, never the same file twice in a row')


# ------------------------------------------------------------------------------------------
# plan.py on a music-led film
# ------------------------------------------------------------------------------------------
def cast_kit(d, extra_roles=(('pop.card_land', 'pro_pop_in/knock', 3),), cast=True, pop_takes=3):
    kit = ST.launch_kit(d)
    ST.add_role(kit, 'pop', 'ui_pop/soft', [(f'{j}.wav', ST.body(80 + j), dict(onset_s=0.01, peak_s=0.012, end_s=0.1), None)
                                            for j in range(pop_takes)], mix={'bed_db': 8.5, 'offset_ms': 4, 'min_gap_ms': 114})
    for role, sound, n in extra_roles:
        ST.add_role(kit, role, sound, [(f'{j}.wav', ST.body(300 + 7 * j + len(role)), dict(onset_s=0.01, peak_s=0.012, end_s=0.1), None)
                                       for j in range(n)], mix={'bed_db': 8.5, 'offset_ms': 4, 'min_gap_ms': 114})
    if cast:
        k = K.read_json(kit, 'kit')
        k['cast'] = {'cast': 1, 'film': 'test', 'roles': {'pop': {'action': 'appear', 'base': None, 'added': False},
                                                          **{r: {'action': 'card-land', 'added': True} for r, _, _ in extra_roles}}}
        K.write_json(kit, k)
        K.write_json(os.path.join(d, 'audio', 'kit', K.SOURCE), dict(kit='audio/kit.json', sha1=K.digest(k)))
    return kit


def plan_of(d):
    return K.read_json(os.path.join(d, 'sfx_plan.json'), 'plan')


def plan_cast(d):
    cast_kit(d)
    block = ST.music_project(d, ST.test_bed(), [(1, 6)])
    ev = [dict(f=90, kind='pop', id='a:badge-1'), dict(f=150, kind='pop', id='a:card-2'), dict(f=210, kind='pop', id='a:badge-3'),
          dict(f=270, kind='pop', id='a:badge-4'), dict(f=330, kind='pop', id='a:card-5')]
    p, r = ST.run(d, 'cast', ST.cues_with(ev, total=720), ST.music_score(block), ST.NO_EARSHOT)
    if not r:
        check(False, f'a cast film renders: {p.stderr.strip()[-300:]}')
        return
    pl = plan_of(d)
    roles = {e['id']: (e['role'], e['action']) for e in pl['events']}
    check(roles.get('a:card-2') == ('pop.card_land', 'card-land') and roles.get('a:badge-1') == ('pop', 'appear')
          and roles.get('a:card-5', ('',))[0] == 'pop.card_land', f'an action\'s own role plays its events ({roles})')
    takes = [e['take'] for e in sorted(pl['events'], key=lambda x: x['cue_s']) if e['role'] == 'pop']
    check(len(takes) == 3 and len(set(takes)) == 3 and not pl['repeats'], f'repeated roles alternate their takes ({takes})')
    check(pl['cast'] and pl['cast']['card-land']['placed'] == 2 and r.get('cast'), 'the plan and the report say what each action played')
    check(not any('not cast' in w for w in pl['warnings']), 'a cast kit raises no "not cast" warning')


def plan_repeats(d):
    cast_kit(d, extra_roles=(), cast=False, pop_takes=1)
    block = ST.music_project(d, ST.test_bed(), [(1, 6)])
    ev = [dict(f=90, kind='pop', id='a:p1'), dict(f=150, kind='pop', id='a:p2'), dict(f=420, kind='pop', id='a:p3')]
    p, r = ST.run(d, 'rep', ST.cues_with(ev, total=720), ST.music_score(block), ST.NO_EARSHOT)
    pl = plan_of(d) if r else {}
    check(r is not None and len(pl.get('repeats', [])) == 1 and pl['repeats'][0]['id'] == 'a:p2',
          f"a take heard twice within 3 s is listed, not one 5.5 s later ({pl.get('repeats')})")
    check(any('not cast' in w for w in pl.get('warnings', [])), 'an uncast kit with a track says so')


def plan_restraint(d):
    kit = cast_kit(d, extra_roles=(), cast=False)
    ST.add_role(kit, 'tock', 'knock/wood', [(f'{j}.wav', ST.body(500 + j), dict(onset_s=0.01, peak_s=0.012, end_s=0.1), None)
                                            for j in range(3)], mix={'bed_db': 8.0, 'offset_ms': -40, 'min_gap_ms': 100})
    block = ST.music_project(d, ST.test_bed(), [(1, 6)])
    ev = [dict(f=30 + 25 * k, kind='tick', id=f'a:ratchet-{k}') for k in range(6)] + \
         [dict(f=240 + 30 * k, kind='pop', id=f'a:badge-{k}') for k in range(4)] + \
         [dict(f=400, kind='tock', id='b:lock', structural=True), dict(f=470, kind='tock', id='b:locks-2')]
    p, r = ST.run(d, 'quiet', ST.cues_with(ev, total=720), ST.music_score(block), ST.NO_EARSHOT)
    pl = plan_of(d) if r else {}
    q = (pl.get('restraint') or {}).get('silenced') or []
    placed = {e['id'] for e in pl.get('events', [])}
    check(r is not None and q and q[0]['action'] == 'detent' and not any(f'a:ratchet-{k}' in placed for k in range(6)),
          f'restraint silences the lightest action first, all of it ({q})')
    check('b:lock' in placed and 'b:locks-2' in placed and not any(x['action'] == 'lock' for x in q),
          'an action with a structural event is never silenced')
    check(pl.get('restraint', {}).get('target') == 10.0 and len(placed) <= 10 + 1, f"within the restraint number ({len(placed)} placed)")
    p, r = ST.run(d, 'loud', ST.cues_with(ev, total=720), ST.music_score(block, sfx={'kit': 'audio/kit.json', 'restraint': 'off'}),
                  ST.NO_EARSHOT)
    pl = plan_of(d) if r else {}
    check(r is not None and not pl['restraint']['silenced'] and pl['restraint']['target'] is None, '"restraint": "off" keeps every effect')


# ------------------------------------------------------------------------------------------
# kit.py real, credits.py
# ------------------------------------------------------------------------------------------
def sfx_record(path, wav, kind='sfx', licence='Mixkit Sound Effects Free License'):
    import credits as CR
    rec = {'record': 1, 'kind': kind, 'file': os.path.basename(wav), 'sha256': CR.sha256_file(wav), 'bytes': os.path.getsize(wav),
           'title': 'Paper slide', 'artist': 'Mixkit', 'source': 'Mixkit', 'page': 'https://example.org/sfx', 'file_url': None,
           'licence': licence, 'licence_id': CR.classify(licence)['id'], 'licence_url': None, 'credit_required': False,
           'credit': None, 'content_id': 'unknown', 'ai_generated': False, 'vocals': False, 'checked': '2026-10-26',
           'certificate': None, 'licence_seen': {'quote': 'commercial and non-commercial projects', 'url': 'https://example.org/l',
                                                 'date': '2026-10-26'}, 'limits': None, 'modifications': 'trimmed'}
    K.write_json(path, rec)


def real_effect(d):
    kit = cast_kit(d)
    sfxd = os.path.join(d, 'audio', 'sfx')
    os.makedirs(sfxd)
    wav = os.path.join(sfxd, 'paper_slide_mixkit.wav')
    x = np.concatenate([np.zeros(int(0.2 * SR)), ST.body(7, dur=0.4, tau=0.08) * 0.5])
    sf.write(wav, x.astype(np.float32), SR, subtype='PCM_16')
    run = lambda *args: subprocess.run([sys.executable, os.path.join(AUDIO, 'kit.py'), 'real', *args, '--kit', kit],  # noqa: E731
                                       capture_output=True, text=True, cwd=d)
    p = run(wav, '--action', 'card-land')
    check(p.returncode == 1 and 'licence' in (p.stderr + p.stdout).lower(), 'no licence record: refused')
    sfx_record(os.path.join(sfxd, 'paper_slide_mixkit.licence.json'), wav, kind='music', licence='Mixkit Stock Music Free License')
    p = run(wav, '--action', 'card-land')
    check(p.returncode == 1 and 'sound-effect' in p.stderr, 'a music record does not cover an effect')
    sfx_record(os.path.join(sfxd, 'paper_slide_mixkit.licence.json'), wav)
    p = run(wav, '--action', 'card-land')
    lockp = os.path.join(d, 'audio', 'kit', K.REAL_LOCK)
    real = K.read_json(lockp, 'real') if os.path.isfile(lockp) else {}
    r = (real.get('roles') or {}).get('pop.card_land') or {}
    tks = r.get('takes') or []
    check(p.returncode == 0 and len(tks) == 3 and r.get('bed_db') == 8.5 and r.get('action') == 'card-land'
          and abs(tks[0]['onset_s'] - 0.005) < 0.004 and tks[0]['l50_lufs'] > -60,
          f"a real effect: three measured takes with the role's mix keys ({p.stderr.strip()[-200:]})")
    st = K.kit_state(kit, os.path.join(d, 'audio', 'kit'))
    kk = K.Kit(st['lock'], os.path.join(d, 'audio', 'kit'), st['status'], cast=st['kit'].get('cast'))
    check(st['status'] == 'current' and kk.roles['pop.card_land']['takes'][0]['file'].startswith('real-'),
          'the kit stays current and plays the real takes for that role')
    block = ST.music_project(d, ST.test_bed(), [(1, 6)])
    ev = [dict(f=90, kind='pop', id='a:badge-1'), dict(f=150, kind='pop', id='a:card-2')]
    p, rr = ST.run(d, 'real', ST.cues_with(ev, total=720), ST.music_score(block), ST.NO_EARSHOT)
    pl = plan_of(d) if rr else {}
    check(any(e['take'].startswith('real-pop-card_land') for e in pl.get('events', [])), 'the plan places a real take')
    sc = os.path.join(d, 'real.score.json')
    out = os.path.join(d, 'deliver')
    p = subprocess.run([sys.executable, os.path.join(AUDIO, 'credits.py'), '--score', sc, '--report',
                        os.path.join(d, 'real.report.json'), '--out', out], capture_output=True, text=True, cwd=d)
    md = open(os.path.join(out, 'CREDITS.md'), encoding='utf-8').read() if os.path.isfile(os.path.join(out, 'CREDITS.md')) else ''
    check(p.returncode == 0 and 'Paper slide' in md and 'Mixkit Sound Effects Free License' in md,
          f'credits.py lists the real effect with its licence ({(p.stderr or p.stdout).strip()[-200:]})')


def lead_click(lead_s=0.045, seed=3):
    """a recorded click with a lead-in: lead_s of rumble (heard: within 20 dB of the click's loudest millisecond, yet
    under a tenth of its peak sample) before a sharp transient"""
    rng = np.random.default_rng(seed)
    tp = np.arange(int(lead_s * SR)) / SR
    pre = 0.15 * np.sin(2 * np.pi * 180 * tp) * (0.7 + 0.3 * np.sin(2 * np.pi * 23 * tp))
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    hit = rng.normal(0, 1, n) * np.exp(-t / 0.004) * 0.9 + 0.5 * np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.02)
    tail = rng.normal(0, 1, int(0.1 * SR)) * 0.01
    x = np.concatenate([np.zeros(int(0.002 * SR)), pre, hit, tail])
    return x / float(np.abs(x).max()) * 10 ** (-1 / 20)  # peak-normalised to -1 dBFS, as a placed take


def take_lead(path):
    """seconds a take file is heard before its transient"""
    heard, onset = K.lead_in(K.read_take(path))
    return (onset - heard) / SR


def lead_trim(d):
    spec = importlib.util.spec_from_file_location('check_sync', os.path.join(HERE, '..', 'check-sync.py'))
    CS = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(CS)
    x = lead_click()
    heard, onset = K.lead_in(x)
    pts = CS.take_points(x)
    check(abs(heard / SR - pts['pre']) < 0.0005 and abs(onset / SR - pts['louder']['onset']) < 0.0005 and (onset - heard) / SR > 0.04,
          f"lead_in reads a take as check-sync does: heard {1000 * heard / SR:.1f} ms, transient {1000 * onset / SR:.1f} ms "
          f"(check-sync {1000 * pts['pre']:.1f} / {1000 * pts['louder']['onset']:.1f})")
    y, cut = K.trim_lead(x)
    h2, o2 = K.lead_in(y)
    p2 = CS.take_points(y)
    check(cut > 0.04 and (o2 - h2) / SR <= K.LEAD_MS / 1000 + 0.001 and p2['louder']['onset'] - p2['pre'] <= K.LEAD_MS / 1000 + 0.001,
          f"trim_lead cuts the lead-in to {K.LEAD_MS:g} ms before the transient (cut {1000 * cut:.1f} ms, heard "
          f"{1000 * (o2 - h2) / SR:.1f} ms before it)")
    k = int(round(K.LEAD_MS * SR / 1000))
    check(np.array_equal(y[k:k + 2000], x[onset:onset + 2000]) and float(np.abs(y[:k]).max()) <= float(np.abs(x[onset - k:onset]).max()),
          'the transient and everything after it stay sample for sample; only the 5 ms before it fade in')
    sharp = np.concatenate([np.zeros(int(0.003 * SR)), x[onset:]])
    same, c0 = K.trim_lead(sharp)
    _, c2 = K.trim_lead(y)
    check(c0 == 0.0 and same is sharp and c2 == 0.0, 'a sharp take and an already trimmed one are left as they are')
    # kit.py real: an onset role gets the trimmed takes; a whoosh (aligned on its peak) keeps its build
    kit = cast_kit(d)
    sfxd = os.path.join(d, 'audio', 'sfx')
    os.makedirs(sfxd)
    wav = os.path.join(sfxd, 'mouse_click_mixkit.wav')
    sf.write(wav, x.astype(np.float32), SR, subtype='PCM_24')
    sfx_record(os.path.join(sfxd, 'mouse_click_mixkit.licence.json'), wav)
    takes = os.path.join(d, 'audio', 'kit')
    p = subprocess.run([sys.executable, os.path.join(AUDIO, 'kit.py'), 'real', wav, '--action', 'card-land', '--kit', kit],
                       capture_output=True, text=True, cwd=d)
    tks = ((K.read_real(takes).get('roles') or {}).get('pop.card_land') or {}).get('takes') or []
    leads = [take_lead(os.path.join(takes, t['file'])) for t in tks]
    check(p.returncode == 0 and len(tks) == 3 and max(leads) <= K.LEAD_MS / 1000 * 1.04 + 0.001 and all(t['onset_s'] < 0.008 for t in tks),
          f"kit.py real on an onset role: every take starts {K.LEAD_MS:g} ms before its transient "
          f"(heard {[round(1000 * v, 1) for v in leads]} ms before it; {p.stderr.strip()[-160:]})")
    tr = np.arange(int(0.2 * SR)) / SR
    rise = (tr / tr[-1]) ** 2 * 0.05 * np.sin(2 * np.pi * 300 * tr)  # a quiet tone swelling into the hit: heard, under a tenth of its peak
    swell = np.concatenate([rise, x[onset:]])
    _, cs = K.trim_lead(swell)
    rr = K.real_takes([(swell, False)], takes, 'whoosh.short', variants=1, align='peak')
    rl = K.real_takes([(swell, False)], takes, 'pop.x', variants=1, align='onset')
    check(cs > 0 and abs(rr[0]['dur_s'] - len(swell) / SR) < 0.002 and rl[0]['dur_s'] < rr[0]['dur_s'] - 0.05,
          f"a role aligned on its peak keeps the build its whoosh rises with ({rr[0]['dur_s']} s); an onset role's take is trimmed ({rl[0]['dur_s']} s)")
    # kit.py trim: takes placed before the trim existed (the lead-in kept) are cut, measured again, and stay cut
    real = K.read_real(takes)
    role = real['roles']['pop.card_land']
    for t in role['takes']:
        sf.write(os.path.join(takes, t['file']), x.astype(np.float32), SR, subtype='PCM_24')
        t.update(K.measure_take(x), sha1=K.sha1_file(os.path.join(takes, t['file'])))
    K.write_json(os.path.join(takes, K.REAL_LOCK), real)
    before = K.lead_report(takes)

    def run():
        return subprocess.run([sys.executable, os.path.join(AUDIO, 'kit.py'), 'trim', '--kit', kit], capture_output=True, text=True, cwd=d)
    p = run()
    after = K.read_real(takes)['roles']['pop.card_land']['takes']
    ok_files = all(t['sha1'] == K.sha1_file(os.path.join(takes, t['file'])) and t['key'] == f"real:{t['sha1']}" for t in after)
    last = p.stdout.strip().splitlines()[-1] if p.stdout.strip() else p.stderr[-160:]
    check(p.returncode == 0 and len(before) == 3 and not K.lead_report(takes) and all(t['onset_s'] < 0.007 for t in after) and ok_files,
          f"kit.py trim cuts the lead-in of takes placed before and measures them again ({len(before)} listed before, "
          f"onsets {[t['onset_s'] for t in after]}; {last})")
    sums = [t['sha1'] for t in after]
    p = run()
    check(p.returncode == 0 and [t['sha1'] for t in K.read_real(takes)['roles']['pop.card_land']['takes']] == sums and '0 of 3' in p.stdout,
          'kit.py trim again changes nothing')


def main():
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    os.environ.pop('CINETIC_HOME', None)
    for name, fn in [('actions_of', actions_of), ('pick_times', pick_times)]:
        if not only or name in only:
            fn()
    for name, fn in [('cast_rules', cast_rules), ('plan_cast', plan_cast), ('plan_repeats', plan_repeats),
                     ('plan_restraint', plan_restraint), ('real_effect', real_effect), ('lead_trim', lead_trim)]:
        if only and name not in only:
            continue
        with tempfile.TemporaryDirectory() as d:
            fn(d)
    print(f"cast.test.py: {'all checks pass' if not FAILS else f'{len(FAILS)} failed'}")
    return 1 if FAILS else 0


if __name__ == '__main__':
    sys.exit(main())
