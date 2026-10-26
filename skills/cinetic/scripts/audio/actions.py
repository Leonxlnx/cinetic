#!/usr/bin/env python3
"""
actions.py: what each effect of a film is for, and the earshot bank sounds that suit that job.

A kind (pop, tock, whoosh ...) says how loud and where an effect sits; the action says what the picture does:
a card landing, a toggle, typing, a swipe, a logo lock, a transition through a shape. Every action has its own
short list of bank sounds in order of fit, so a film never plays one generic whoosh or pop for everything, and
`kit.py cast` gives each action of the film one sound (the same action always the same sound, alternating its
takes), different actions different sounds, and avoids the previous film's signature sounds (the history in
~/.cinetic/sound-history.json, or $CINETIC_HOME).

An event's action, first that applies:
  1. its own "action" field in src/sync.ts (any name below, or an alias: "card" for card-land ...);
  2. the lockup: a hit, drop, land, pop, snap or bell within 3 frames of the "lockup" cue is the logo lock;
  3. the words of its id and variant ("change1:card-3-lands" reads as card-land, "hook:ratchet-2" as detent),
     among the actions its kind can play;
  4. its kind's default (tick detent, tock lock, pop appear, land land, hit reveal, drop thud, snap shutter,
     whoosh whip when short and pass when long, key type, click press, text text, bell chime, swell swell,
     riser build).

Restraint (plan.py): when the effects in any 10 s pass the film's restraint number, whole actions go quiet,
the lightest first (letters and detents, then pops, cuts, touches ...): the music carries them. The
reveal, the logo lock, the thud, big passes, transitions through a shape, swells, builds and errors never
do, nor any action one of whose events is structural or forced.

Usage (from the project root):
  python3 scripts/audio/actions.py                     # the actions, their kinds and candidate sounds
  python3 scripts/audio/actions.py --cues out/cues.json    # each event's action, as kit.py cast reads it
  python3 scripts/audio/actions.py --history           # the sounds the last films were cast with
Exit codes: 0 done; 1 a missing or unreadable input.
"""
import argparse
import datetime
import json
import os
import re
import sys
import zlib

HISTORY_FILE = 'sound-history.json'
HISTORY_KEEP = 30
LOCKUP_F = 3            # frames: an effect this close to the lockup cue is the logo lock


def A(kinds, words, sounds, query, rank):
    return dict(kinds=tuple(kinds), words=tuple(words), sounds=list(sounds), query=query, rank=rank)


# rank: the restraint order (low ranks go quiet first); None: never silenced by restraint. Order matters: on a tie
# of word hits the earlier action wins.
ACTIONS = {
    'logo-lock': A(('hit', 'drop', 'land', 'pop', 'snap', 'bell'), ('logo', 'lockup', 'wordmark'),
                   ['cut_hit/sub', 'pro_impact/short', 'notify/mid_wood', 'cut_hit/punch', 'pluck/kalimba_ring',
                    'pro_sub_drop/quick'], 'one clean low hit under a logo', None),
    'error': A(('hit', 'snap', 'click', 'pop', 'tock'), ('error', 'fail', 'failed', 'failure', 'warning', 'denied',
                                                          'invalid', 'glitch'),
               ['glitch/mid', 'knock/double', 'glitch/hit', 'glitch/chirp'], 'a short error buzz', None),
    'letter': A(('tick', 'tock', 'pop'), ('letter', 'glyph', 'char', 'character', 'initial'),
                ['pro_click/soft', 'pro_tap/glass', 'hover_tick/mid', 'pro_click/tink', 'tap/glass', 'pro_click/mouse'],
                'a tiny soft tap, a letter settling', 0),
    'detent': A(('tick', 'tock'), ('ratchet', 'detent', 'notch', 'dial', 'count', 'counter', 'digit', 'step', 'row',
                                   'scroll', 'clock', 'odometer', 'reel'),
                ['pro_hover_tick/detent', 'hover_tick/detent', 'hover_tick/mid', 'fit/tick/domino', 'pro_hover_tick/soft',
                 'hover_tick/air', 'pro_hover_tick/ping'], 'a small mechanical tick, a detent clicking over', 1),
    'appear': A(('pop',), ('appear', 'part', 'piece', 'chip', 'badge', 'icon', 'item', 'dot', 'bubble', 'pill', 'tag',
                           'label', 'avatar', 'emoji', 'spawn'),
                ['ui_pop/soft', 'ui_pop/step', 'ui_pop/boop', 'fit/pop/mouth_plop', 'ui_pop/fall', 'fit/pop/lip_pop',
                 'drip/tiny', 'ui_pop/wide'], 'a soft rounded pop, something appearing', 2),
    'jump-cut': A(('tock', 'snap'), ('jump', 'cut', 'splice'),
                  ['shutter/quick', 'knock/snap', 'toggle/micro', 'fit/snap/switch_flip', 'pro_click/mouse', 'knock/plastic'],
                  'a dry quick click on a cut', 3),
    'touch': A(('land', 'click', 'tock'), ('tap', 'touch', 'finger', 'thumb'),
               ['pro_tap/finger', 'tap/finger', 'pro_tap/soft', 'fit/land.light/finger_phone', 'tap/soft', 'pro_tap/glass'],
               'a light finger tap on a screen', 4),
    'lock': A(('tock', 'snap'), ('lock', 'latch', 'seat', 'slot', 'seal', 'settle', 'align', 'engage', 'clamp', 'dock'),
              ['knock/wood', 'knock/plastic', 'knock/snap', 'knock/desk', 'fit/hit/bamboo_tok', 'knock/double',
               'pro_tap/knock'], 'a short wooden or plastic knock, a part locking into place', 5),
    'press': A(('click',), ('click', 'press', 'button', 'cursor', 'select', 'submit'),
               ['click/soft', 'click/double', 'pro_click/mouse', 'fit/click/floss_lid', 'click/thock', 'tap/glass'],
               'a soft mouse or button click', 5),
    'toggle': A(('snap', 'click', 'tock'), ('toggle', 'switch', 'checkbox', 'radio', 'enable', 'disable'),
                ['toggle/on', 'toggle/latch', 'toggle/rocker', 'toggle/micro', 'fit/snap/switch_flip'],
                'a small switch being flipped', 6),
    'shutter': A(('snap',), ('shutter', 'snap', 'zoom', 'capture', 'photo', 'camera', 'flash', 'frame'),
                 ['shutter/snap', 'shutter/dslr', 'shutter/quick', 'shutter/film', 'shutter/mirror'], 'a camera shutter', 7),
    'slide': A(('whoosh',), ('slide', 'text', 'line', 'caption', 'nudge', 'drift', 'glide'),
               ['swish/blade', 'swish/stick', 'swish/soft', 'swish/zing', 'swish/cane', 'swish/bright'],
               'a thin quick swish, something sliding', 8),
    'type': A(('key',), ('type', 'typing', 'key', 'keystroke'),
              ['typing_key/clicky', 'typing_key/crisp', 'typing_key/laptop', 'typing_key/light', 'fit/key/lubed',
               'fit/key/medium', 'fit/key/thock', 'typing_key/thock', 'typing_key/deep'], 'a mechanical keyboard key press', 9),
    'swipe': A(('whoosh',), ('swipe', 'swap', 'deal', 'carousel', 'flip', 'turn', 'page', 'card', 'sheet'),
               ['swipe/flick', 'swipe/paper', 'swipe/cloth', 'swipe/glide', 'fit/whoosh.short/bamboo_swish', 'swish/soft'],
               'a card or a page swiped across a surface', 10),
    'whip': A(('whoosh',), ('whip', 'pan', 'fly', 'flight', 'dash', 'rush', 'zip'),
              ['whoosh_fast/tight', 'whoosh_fast/crisp', 'whoosh_fast/heavy', 'whoosh_fast/sleeve', 'whoosh_fast/whistle',
               'swish/flick', 'whoosh_fast/whip'], 'a fast air whoosh, a whip pan', 10),
    'card-land': A(('land', 'pop', 'tock'), ('card', 'panel', 'tile', 'sheet', 'modal', 'page', 'photo', 'plate', 'deck',
                                             'stack'),
                   ['pro_pop_in/knock', 'tap/table', 'knock/desk', 'pro_pop_in/airy', 'fit/land.light/finger_wood',
                    'pro_tap/double'], 'a card or a sheet landing on a table', 11),
    'land': A(('land',), ('land', 'drop', 'thump'),
              ['pro_pop_in/round', 'pro_pop_in/knock', 'pro_pop_in/double', 'pro_pop_in/airy', 'pro_pop_in/deep', 'tap/table'],
              'a soft low thump, something landing', 12),
    'success': A(('bell', 'click'), ('success', 'done', 'check', 'confirm', 'sent', 'saved', 'complete', 'notify', 'toast'),
                 ['notify/mid_tine', 'notify/mid_wood', 'pro_notify/ding_2045', 'mallet/marimba', 'pro_notify/ding_1822'],
                 'a soft rounded ding, a success', 13),
    'chime': A(('bell',), ('chime', 'bell', 'ring'),
               ['mallet/glock', 'mallet/celesta', 'mallet/marimba', 'pluck/kalimba'], 'a struck bell note', 14),
    'text': A(('text',), (), ['mallet/pluck', 'mallet/marimba', 'pluck/kalimba_soft', 'mallet/celesta', 'mallet/glock'],
              'a soft plucked or tapped note', 15),
    'reveal': A(('hit',), ('reveal', 'slam', 'title', 'impact', 'hero', 'payoff'),
                ['cut_hit/punch', 'cut_hit/air', 'pro_impact/short', 'cut_hit/sub', 'pro_impact/air'],
                'a single clean low impact', None),
    'thud': A(('drop',), ('thud', 'drop', 'sub', 'weight'),
              ['cut_hit/kick', 'cut_hit/sub', 'pro_sub_drop/quick', 'sub_drop/punch', 'pro_impact/short'],
              'a deep short sub thud', None),
    'pass': A(('whoosh',), ('pass', 'scene', 'transition', 'push', 'pull', 'dolly', 'ride', 'sweep'),
              ['whoosh_big/thump', 'whoosh_big/thump_airy', 'whoosh_big/cape', 'whoosh_big/swell', 'whoosh_big/gust',
               'whoosh_big/thump_deep', 'pro_whoosh_big/windy'], 'a big low whoosh, a scene passing', None),
    'shape': A(('whoosh', 'swell'), ('morph', 'shape', 'mask', 'iris', 'wipe', 'through', 'portal', 'ring', 'circle',
                                     'blob', 'liquid'),
               ['reverse_swell/breath', 'swipe/velvet', 'whoosh_big/reverse', 'pro_zip/down_warm', 'reverse_swell/short',
                'swish/soft'], 'a soft air transition through a shape', None),
    'swell': A(('swell',), (), ['reverse_swell/dark', 'reverse_swell/breath', 'reverse_swell/short', 'reverse_swell/cymbal',
                                'pro_whoosh_big/swell'], 'a reverse swell', None),
    'build': A(('riser',), (), ['riser/dark', 'riser/snatch', 'pro_riser/roll', 'riser/build', 'pro_riser/air_gate'],
               'a short dark riser', None),
}
ALIASES = {'card': 'card-land', 'logo': 'logo-lock', 'lockup': 'logo-lock', 'tap': 'touch', 'click': 'press',
           'switch': 'toggle', 'typing': 'type', 'key': 'type', 'snapzoom': 'shutter', 'zoom': 'shutter', 'morph': 'shape',
           'transition': 'pass', 'whoosh': 'whip', 'riser': 'build', 'cut': 'jump-cut', 'pop': 'appear', 'tick': 'detent'}
DEFAULT = {'tick': 'detent', 'tock': 'lock', 'pop': 'appear', 'land': 'land', 'hit': 'reveal', 'drop': 'thud',
           'snap': 'shutter', 'key': 'type', 'click': 'press', 'text': 'text', 'bell': 'chime', 'swell': 'swell',
           'riser': 'build'}
WHOOSH_SHORT_S = 0.5    # kit.WHOOSH_SHORT_S: a short move whips, a long one passes
SIGNATURE = ('reveal', 'logo-lock', 'thud', 'pass', 'shape', 'swell', 'build', 'text')
UNCAST = ('key.space',)  # generic roles cast leaves alone (the one space bar recording)


def slug(action):
    """an action as a kit role segment: card-land -> card_land"""
    return re.sub(r'[^a-z0-9]+', '_', str(action).lower()).strip('_')


def words_of(*texts):
    out = []
    for t in texts:
        for w in re.findall(r'[a-z]+', str(t or '').lower()):
            out.append(w)
            if len(w) > 3 and w.endswith('s'):
                out.append(w[:-1])
            if len(w) > 4 and w.endswith('ing'):
                out.append(w[:-3])
            if len(w) > 3 and w.endswith('ed'):
                out.append(w[:-2])
    return out


def action_of(e, fps=60.0, cue=None):
    """the action of one cue event (module doc), or None for a kind no action plays (suck)"""
    kind = e.get('kind')
    a = e.get('action')
    if a:
        a = ALIASES.get(str(a), str(a))
        if a in ACTIONS:
            return a
    if cue and cue.get('lockup') is not None and kind in ACTIONS['logo-lock']['kinds'] \
            and abs(float(e.get('f', -1e9)) - float(cue['lockup'])) <= LOCKUP_F:
        return 'logo-lock'
    ws = words_of(e.get('id', '').split(':', 1)[-1], e.get('variant'))
    best = None
    for name, spec in ACTIONS.items():
        if kind not in spec['kinds'] or name == 'logo-lock':
            continue
        n = sum(1 for w in ws if w in spec['words'])
        if n and (best is None or n > best[0]):
            best = (n, name)
    if best:
        return best[1]
    if kind == 'whoosh':
        d = float(e['dur']) / fps if 'dur' in e else 0.45 + 0.35 * float(e.get('weight', 1.0))
        return 'whip' if d < WHOOSH_SHORT_S else 'pass'
    return DEFAULT.get(kind)


# ------------------------------------------------------------------------------------------
# the history
# ------------------------------------------------------------------------------------------
def home_dir():
    return os.environ.get('CINETIC_HOME') or os.path.join(os.path.expanduser('~'), '.cinetic')


def history_path():
    return os.path.join(home_dir(), HISTORY_FILE)


def read_history(path=None):
    p = path or history_path()
    try:
        with open(p, encoding='utf-8') as fh:
            h = json.load(fh)
        if isinstance(h, dict) and h.get('history') == 1 and isinstance(h.get('films'), list):
            return h
    except (OSError, ValueError):
        pass
    return {'history': 1, 'films': []}


def write_history(h, path=None):
    p = path or history_path()
    os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
    h = dict(h, films=h.get('films', [])[-HISTORY_KEEP:])
    with open(p, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(json.dumps(h, indent=1, ensure_ascii=False) + '\n')


def previous_films(h, film):
    """the history's films other than `film`, newest first"""
    return [x for x in reversed(h.get('films') or []) if x.get('film') != film]


def record(h, film, report, date=None):
    """h with this film's cast as its newest entry (an earlier entry of the same film replaced)"""
    entry = dict(film=film, date=date or datetime.date.today().isoformat(),
                 sounds={a: r['sound'] for a, r in report['actions'].items()}, signature=report['signature'])
    films = [x for x in h.get('films') or [] if x.get('film') != film] + [entry]
    return dict(h, films=films)


# ------------------------------------------------------------------------------------------
# casting
# ------------------------------------------------------------------------------------------
def jitter(film, action, sound):
    """a stable number in [0, 1) per film, action and sound: near-equal candidates differ from film to film"""
    return (zlib.crc32(f'{film}|{action}|{sound}'.encode()) % 1000) / 1000.0


def revoice(spec, sound, action, knobs=None, why=''):
    """a role spec moved onto another bank sound: pitches and a pitch edit stay only when the sound has a pitch knob
    (knobs known), the length and apex edits of the old sound go, at least 3 takes (one per note for a pitched set)"""
    new = dict(spec)
    if sound != spec.get('sound'):
        new['sound'] = sound
        ed = dict(new.get('edits') or {})
        for k in ('dur', 'apex'):
            ed.pop(k, None)
        if knobs is not None and not (knobs.get(sound) or {}).get('pitch'):
            new.pop('pitches', None)
            ed.pop('pitch', None)
        if ed:
            new['edits'] = ed
        else:
            new.pop('edits', None)
        if new.get('seed') is not None and not str(sound).startswith('typing_key/'):
            new.pop('seed', None)
    if not new.get('pitches') and int(new.get('takes') or 1) < 3:
        new['takes'] = 3
    new['note'] = f'cast for {action}' + (f': {why}' if why else '')
    return new


def cast(events, kit, fps=60.0, cue=None, history=None, film='film', knobs=None, role_for=None):
    """(kit dict with the film's actions cast, report). events: out/cues.json events; kit: audio/kit.json (a kit cast
    before is restored to its own roles first); knobs: {bank id: knobs} from earshot (candidates outside it are
    skipped; None trusts the table); role_for(kind, variant, weight, dur_s) -> the generic role (kit.role_for)."""
    import copy
    if role_for is None:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from kit import role_for  # noqa: E402
    kit = copy.deepcopy(kit)
    roles = kit.setdefault('roles', {})
    old = kit.get('cast') or {}
    for name, r in (old.get('roles') or {}).items():  # undo the previous cast: base specs back, sub-roles out
        if r.get('base') is not None:
            roles[name] = r['base']
        elif r.get('added'):
            roles.pop(name, None)
    groups, first_t, variants = {}, {}, {}
    for e in sorted(events, key=lambda x: x['f']):
        dur = float(e['dur']) / fps if 'dur' in e else None
        g = role_for(e.get('kind'), e.get('variant'), float(e.get('weight', 1.0)), dur)
        a = action_of(e, fps, cue)
        if a is None or g in UNCAST or g not in roles or roles[g] is None:
            continue
        groups.setdefault(a, {}).setdefault(g, []).append(e.get('id', ''))
        first_t.setdefault(a, float(e['f']) / fps)
        if e.get('variant'):
            variants.setdefault(a, set()).add(str(e['variant']).lower())
    prev = previous_films(history or {}, film)
    last = prev[0] if prev else None
    older = {s for x in prev[1:4] for s in (x.get('sounds') or {}).values()}
    count = {a: sum(len(v) for v in gs.values()) for a, gs in groups.items()}
    order = sorted(groups, key=lambda a: (ACTIONS[a]['rank'] is not None, -count[a], first_t[a]))
    taken, chosen = set(), {}
    for a in order:
        cands = [s for s in ACTIONS[a]['sounds'] if knobs is None or s in knobs]
        if not cands:
            continue
        sig = set((last or {}).get('signature') or [])
        used = set(((last or {}).get('sounds') or {}).values())

        def cost(k, s):
            c = float(k)
            why = []
            if s in taken:
                c += 20
            if s in sig:
                c += 50
                why.append("the previous film's signature")
            elif s in used:
                c += 4
                why.append('used by the previous film')
            if s in older:
                c += 1.5
            if s.split('/')[-1] in variants.get(a, ()):
                c -= 2.5
            return c + 1.6 * jitter(film, a, s), why
        scored = sorted(((cost(k, s), k, s) for k, s in enumerate(cands)), key=lambda x: (x[0][0], x[1]))
        (_, _), k, s = scored[0]
        avoided = [x[2] for x in scored[1:] if x[0][1] and x[1] < k]
        chosen[a] = dict(sound=s, rank=k, avoided=avoided)
        taken.add(s)
    cast_roles, report = {}, dict(actions={}, roles={}, film=film, previous=(last or {}).get('film'))
    by_generic = {}
    for a, gs in groups.items():
        for g, ids in gs.items():
            by_generic.setdefault(g, []).append((a, ids))
    for g, acts in by_generic.items():
        acts.sort(key=lambda x: (-len(x[1]), first_t[x[0]]))
        base = copy.deepcopy(roles[g])
        for n, (a, ids) in enumerate(acts):
            if a not in chosen:
                continue
            name = g if n == 0 else f'{g}.{slug(a)}'
            why = f"{ACTIONS[a]['query']}; {len(ids)} event(s)"
            roles[name] = revoice(base, chosen[a]['sound'], a, knobs, why)
            cast_roles[name] = dict(action=a, base=base if n == 0 else None, added=n > 0, generic=g)
            report['roles'][name] = dict(action=a, sound=chosen[a]['sound'], was=base.get('sound'), events=len(ids))
    t = chosen.get('type')
    if t and t['sound'].startswith('typing_key/') and isinstance(roles.get('key.return'), dict):
        base = copy.deepcopy(roles['key.return'])
        roles['key.return'] = dict(base, sound=t['sound'], note='cast: the typing run\'s own switch on its own seeds')
        cast_roles['key.return'] = dict(action='type', base=base, added=False, generic='key.return')
    for a, c in chosen.items():
        report['actions'][a] = dict(sound=c['sound'], events=count[a], roles=sorted(groups[a]), avoided=c['avoided'])
    top = max(count, key=lambda a: (count[a], -first_t[a])) if count else None
    report['signature'] = sorted({chosen[a]['sound'] for a in chosen if a in SIGNATURE or a == top})
    kit['cast'] = {'cast': 1, 'film': film, 'date': datetime.date.today().isoformat(),
                   'previous': report['previous'], 'roles': cast_roles,
                   'actions': {a: dict(sound=c['sound'], events=count[a]) for a, c in chosen.items()},
                   'signature': report['signature'], 'real': (old.get('real') or {})}
    return kit, report


# ------------------------------------------------------------------------------------------
# the CLI
# ------------------------------------------------------------------------------------------
def main(argv=None):
    ap = argparse.ArgumentParser(description='The actions an effect can play, their bank sounds, and each event\'s '
                                             'action (kit.py cast uses them).')
    ap.add_argument('--cues', help="print each event's action (out/cues.json)")
    ap.add_argument('--history', action='store_true', help='print the sound history')
    a = ap.parse_args(argv)
    if a.history:
        h = read_history()
        print(f"sound history ({history_path()}): {len(h['films'])} film(s)")
        for x in reversed(h['films'][-8:]):
            print(f"  {x.get('date')}  {x.get('film')}\n    signature: {', '.join(x.get('signature') or [])}")
        return 0
    if a.cues:
        try:
            with open(a.cues, encoding='utf-8') as fh:
                doc = json.load(fh)
        except (OSError, ValueError) as e:
            print(f'actions.py: {a.cues}: {e}', file=sys.stderr)
            return 1
        fps, cue = float(doc.get('fps', 60)), doc.get('cue') or {}
        for e in sorted(doc.get('events', []), key=lambda x: x['f']):
            print(f"  f{float(e['f']):7.1f}  {e.get('kind', '?'):7s} {action_of(e, fps, cue) or '-':10s} {e.get('id', '')}")
        return 0
    for name, s in ACTIONS.items():
        print(f"{name:10s} kinds {', '.join(s['kinds']):28s} restraint {'never' if s['rank'] is None else s['rank']}\n"
              f"           {s['query']}\n           {', '.join(s['sounds'])}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
