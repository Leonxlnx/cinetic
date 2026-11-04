#!/usr/bin/env python3
"""
actions.py: what each effect of a film is for, and the earshot bank sounds that suit that job.

A kind (pop, tock, whoosh ...) says how loud and where an effect sits; the action says what the picture does:
a card landing, a toggle, typing, a swipe, a logo lock, a transition through a shape. Every action has its own
short list of bank sounds in order of fit (earshot's ears first: the members that win its forced choice of the
action's own description against cheap-synth alternatives lead, the rest follow by how close they came), so a film
never plays one generic whoosh or pop for everything, and
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

Where the bank is weak (no member wins that forced choice: swipe, slide, build, press), kit.py cast says so and
names the real-effect route: a free no-credit sound effect found with music.mjs search --kind sfx, recorded with
its licence and made the action's takes with kit.py real.

With a sound library (library.py: real recordings whose licence needs no credit, cut, levelled and tagged by
action), its sounds for an action stand beside the bank's members, in order of fit (earshot's ears), first where
the bank is weak, interleaved elsewhere. Every candidate is then matched to the film's track (music_cost): a tail
longer than the action's share of the beat (BEATS) at the track's tempo costs, a lock or a reveal too short to ring
costs, a lock, reveal or thud whose peak holds it under its role's level over the bed costs (a spiky take is clamped at
-1 dBFS and buried), a sound masked under the track costs
(masked_db: per octave band its power against the track's where the action's events land, played at its role's
level over the bed, the best band of those where it is heard under MASK_DB; without the bands, a centroid within an
octave of the track's), and a tonal real effect is tuned to the key by up to a semitone (the rest costs). A bank
member the ears heard lose (LOST) gives way to a library sound of its action that won, an author's variant on such
a member too. A sound plays one action of a film, never two, and a second preset of a recipe already cast
(knock/snap after knock/plastic) loses ground; an action with four events or more that takes a library sound gets a
second one of the same action beside it (its takes alternate, so a run never repeats one recording); and the film's
set of sounds never equals an earlier film's (the history): the action that loses least takes its next sound.

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
import math
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
                   ['pluck/kalimba_ring', 'pro_sub_drop/quick', 'notify/mid_wood', 'pro_impact/short', 'cut_hit/punch',
                    'cut_hit/sub'], 'one clean low hit under a logo', None),
    'error': A(('hit', 'snap', 'click', 'pop', 'tock'), ('error', 'fail', 'failed', 'failure', 'warning', 'denied',
                                                          'invalid', 'glitch'),
               ['glitch/mid', 'glitch/chirp', 'glitch/hit', 'knock/double'], 'a short error buzz', None),
    'letter': A(('tick', 'tock', 'pop'), ('letter', 'glyph', 'char', 'character', 'initial'),
                ['pro_tap/glass', 'tap/glass', 'hover_tick/mid', 'pro_click/soft', 'pro_click/mouse',
                 'pro_click/tink'],
                'a tiny soft tap, a letter settling', 0),
    'detent': A(('tick', 'tock'), ('ratchet', 'detent', 'notch', 'dial', 'count', 'counter', 'digit', 'step', 'row',
                                   'scroll', 'clock', 'odometer', 'reel'),
                ['pro_hover_tick/detent', 'hover_tick/detent', 'hover_tick/mid', 'fit/tick/domino', 'pro_hover_tick/soft',
                 'hover_tick/air', 'pro_hover_tick/ping'], 'a small mechanical tick, a detent clicking over', 1),
    'appear': A(('pop',), ('appear', 'part', 'piece', 'chip', 'badge', 'icon', 'item', 'dot', 'bubble', 'pill', 'tag',
                           'label', 'avatar', 'emoji', 'spawn'),
                ['fit/pop/mouth_plop', 'fit/pop/lip_pop', 'drip/tiny', 'ui_pop/boop', 'ui_pop/step', 'ui_pop/wide',
                 'ui_pop/soft', 'ui_pop/fall'], 'a soft rounded pop, something appearing', 2),
    'jump-cut': A(('tock', 'snap'), ('jump', 'cut', 'splice'),
                  ['shutter/quick', 'knock/snap', 'toggle/micro', 'fit/snap/switch_flip', 'pro_click/mouse', 'knock/plastic'],
                  'a dry quick click on a cut', 3),
    'touch': A(('land', 'click', 'tock'), ('tap', 'touch', 'finger', 'thumb'),
               ['fit/land.light/finger_phone', 'tap/soft', 'tap/finger', 'pro_tap/glass', 'pro_tap/finger',
                'pro_tap/soft'],
               'a light finger tap on a screen', 4),
    'lock': A(('tock', 'snap'), ('lock', 'latch', 'seat', 'slot', 'seal', 'settle', 'align', 'engage', 'clamp', 'dock'),
              ['knock/wood', 'knock/snap', 'fit/hit/bamboo_tok', 'pro_tap/knock', 'knock/plastic', 'knock/double',
               'knock/desk'], 'a short wooden or plastic knock, a part locking into place', 5),
    'press': A(('click',), ('click', 'press', 'button', 'cursor', 'select', 'submit'),
               ['fit/click/floss_lid', 'pro_click/mouse', 'tap/glass', 'click/double', 'click/soft', 'click/thock'],
               'a soft mouse or button click', 5),
    'toggle': A(('snap', 'click', 'tock'), ('toggle', 'switch', 'checkbox', 'radio', 'enable', 'disable'),
                ['toggle/on', 'toggle/latch', 'toggle/rocker', 'toggle/micro', 'fit/snap/switch_flip'],
                'a small switch being flipped', 6),
    'shutter': A(('snap',), ('shutter', 'snap', 'zoom', 'capture', 'photo', 'camera', 'flash', 'frame'),
                 ['shutter/snap', 'shutter/mirror', 'shutter/dslr', 'shutter/quick', 'shutter/film'], 'a camera shutter', 7),
    'slide': A(('whoosh',), ('slide', 'text', 'line', 'caption', 'nudge', 'drift', 'glide'),
               ['swish/stick', 'swish/soft', 'swish/cane', 'swish/blade', 'swish/bright', 'swish/zing'],
               'a thin quick swish, something sliding', 8),
    'type': A(('key',), ('type', 'typing', 'key', 'keystroke'),
              ['typing_key/clicky', 'typing_key/crisp', 'typing_key/laptop', 'typing_key/light', 'fit/key/lubed',
               'fit/key/medium', 'fit/key/thock', 'typing_key/thock', 'typing_key/deep'], 'a mechanical keyboard key press', 9),
    'swipe': A(('whoosh',), ('swipe', 'swap', 'deal', 'carousel', 'flip', 'turn', 'page', 'card', 'sheet'),
               ['fit/whoosh.short/bamboo_swish', 'swipe/cloth', 'swipe/flick', 'swipe/paper', 'swipe/glide',
                'swish/soft'],
               'a card or a page swiped across a surface', 10),
    'whip': A(('whoosh',), ('whip', 'pan', 'fly', 'flight', 'dash', 'rush', 'zip'),
              ['whoosh_fast/tight', 'whoosh_fast/crisp', 'whoosh_fast/heavy', 'whoosh_fast/sleeve', 'whoosh_fast/whistle',
               'swish/flick', 'whoosh_fast/whip'], 'a fast air whoosh, a whip pan', 10),
    'card-land': A(('land', 'pop', 'tock'), ('card', 'panel', 'tile', 'sheet', 'modal', 'page', 'photo', 'plate', 'deck',
                                             'stack'),
                   ['pro_pop_in/knock', 'tap/table', 'pro_pop_in/airy', 'fit/land.light/finger_wood', 'pro_tap/double',
                    'knock/desk'], 'a card or a sheet landing on a table', 11),
    'land': A(('land',), ('land', 'drop', 'thump'),
              ['pro_pop_in/round', 'pro_pop_in/airy', 'pro_pop_in/deep', 'pro_pop_in/double', 'tap/table',
               'pro_pop_in/knock'],
              'a soft low thump, something landing', 12),
    'success': A(('bell', 'click'), ('success', 'done', 'check', 'confirm', 'sent', 'saved', 'complete', 'notify', 'toast'),
                 ['notify/mid_tine', 'notify/mid_wood', 'pro_notify/ding_2045', 'mallet/marimba', 'pro_notify/ding_1822'],
                 'a soft rounded ding, a success', 13),
    'chime': A(('bell',), ('chime', 'bell', 'ring'),
               ['mallet/glock', 'mallet/celesta', 'mallet/marimba', 'pluck/kalimba'], 'a struck bell note', 14),
    'text': A(('text',), (), ['pluck/kalimba_soft', 'mallet/glock', 'mallet/celesta', 'mallet/marimba', 'mallet/pluck'],
              'a soft plucked or tapped note', 15),
    'reveal': A(('hit',), ('reveal', 'slam', 'title', 'impact', 'hero', 'payoff'),
                ['pro_impact/air', 'cut_hit/punch', 'pro_impact/short', 'cut_hit/air', 'cut_hit/sub'],
                'a single clean low impact', None),
    'thud': A(('drop',), ('thud', 'drop', 'sub', 'weight'),
              ['pro_sub_drop/quick', 'sub_drop/punch', 'pro_impact/short', 'cut_hit/sub', 'cut_hit/kick'],
              'a deep short sub thud', None),
    'pass': A(('whoosh',), ('pass', 'scene', 'transition', 'push', 'pull', 'dolly', 'ride', 'sweep'),
              ['whoosh_big/thump', 'whoosh_big/cape', 'whoosh_big/swell', 'whoosh_big/thump_deep',
               'whoosh_big/gust', 'pro_whoosh_big/windy', 'whoosh_big/thump_airy'], 'a big low whoosh, a scene passing', None),
    'shape': A(('whoosh', 'swell'), ('morph', 'shape', 'mask', 'iris', 'wipe', 'through', 'portal', 'ring', 'circle',
                                     'blob', 'liquid'),
               ['swipe/velvet', 'swish/soft', 'reverse_swell/short', 'whoosh_big/reverse', 'reverse_swell/breath',
                'pro_zip/down_warm'], 'a soft air transition through a shape', None),
    'swell': A(('swell',), (), ['reverse_swell/cymbal', 'pro_whoosh_big/swell', 'reverse_swell/short', 'reverse_swell/dark',
                                'reverse_swell/breath'], 'a reverse swell', None),
    'build': A(('riser',), (), ['pro_riser/air_gate', 'pro_riser/roll', 'riser/snatch', 'riser/dark', 'riser/build'],
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
# the actions no bank member sounds convincingly to earshot's ears, with the words to search a real effect by
WEAK = {'swipe': 'paper slide', 'slide': 'slide', 'build': 'swell', 'press': 'mouse click'}
# the members earshot 0.4's ears heard lose the forced choice of the action's own words against the cheap-synth
# alternatives (rendered at their defaults): with a library sound of the action that won, they give way to it
LOST = {
    'logo-lock': ('notify/mid_wood', 'pro_impact/short', 'cut_hit/punch', 'cut_hit/sub'),
    'error': ('glitch/chirp', 'glitch/hit', 'knock/double'),
    'letter': ('hover_tick/mid', 'pro_click/soft', 'pro_click/mouse', 'pro_click/tink'),
    'appear': ('fit/pop/lip_pop', 'drip/tiny', 'ui_pop/boop', 'ui_pop/step', 'ui_pop/wide', 'ui_pop/soft', 'ui_pop/fall'),
    'touch': ('tap/soft', 'tap/finger', 'pro_tap/glass', 'pro_tap/finger', 'pro_tap/soft'),
    'lock': ('pro_tap/knock', 'knock/plastic', 'knock/double', 'knock/desk'),
    'press': ('fit/click/floss_lid', 'pro_click/mouse', 'tap/glass', 'click/double', 'click/soft', 'click/thock'),
    'shutter': ('shutter/mirror', 'shutter/dslr', 'shutter/quick', 'shutter/film'),
    'slide': ('swish/stick', 'swish/soft', 'swish/cane', 'swish/blade', 'swish/bright', 'swish/zing'),
    'swipe': ('fit/whoosh.short/bamboo_swish', 'swipe/cloth', 'swipe/flick', 'swipe/paper', 'swipe/glide', 'swish/soft'),
    'whip': ('whoosh_fast/whip',),
    'card-land': ('knock/desk',),
    'land': ('pro_pop_in/double', 'pro_pop_in/knock'),
    'chime': ('mallet/celesta',),
    'text': ('mallet/glock', 'mallet/celesta', 'mallet/marimba', 'mallet/pluck'),
    'reveal': ('cut_hit/punch', 'pro_impact/short', 'cut_hit/air', 'cut_hit/sub'),
    'thud': ('cut_hit/sub', 'cut_hit/kick'),
    'pass': ('whoosh_big/thump', 'whoosh_big/thump_deep', 'whoosh_big/gust', 'pro_whoosh_big/windy', 'whoosh_big/thump_airy'),
    'shape': ('swish/soft', 'reverse_swell/short', 'whoosh_big/reverse', 'reverse_swell/breath', 'pro_zip/down_warm'),
    'swell': ('reverse_swell/short', 'reverse_swell/dark', 'reverse_swell/breath'),
    'build': ('pro_riser/air_gate', 'pro_riser/roll', 'riser/snatch', 'riser/dark', 'riser/build'),
}
VARIANT_BONUS = 8.0     # a variant naming a member of the action: the author's choice, unless the history forbids it
UNCAST = ('key.space',)  # generic roles cast leaves alone (the one space bar recording)
# the tempo budget: a sound for the action should have rung out (its peak plus a 20 dB decay) within this many beats
# of the track; longer, it smears the groove (a pop is a half-beat gesture, a logo lock may ring a bar or two)
BEATS = {'letter': 0.5, 'detent': 0.5, 'press': 0.5, 'touch': 0.5, 'type': 0.5, 'jump-cut': 0.5, 'appear': 0.75,
         'toggle': 0.75, 'lock': 1, 'shutter': 1, 'card-land': 1, 'land': 1, 'error': 1, 'slide': 1, 'swipe': 1.5,
         'whip': 1.5, 'success': 2, 'chime': 2, 'text': 2, 'pass': 3, 'shape': 3, 'reveal': 4, 'thud': 4,
         'logo-lock': 8, 'swell': 8, 'build': 8}
PENTA_ACTIONS = ('chime', 'text', 'success', 'logo-lock')  # tonal sounds tuned to the key's pentatonic, else its scale
LIB_START, LIB_START_WEAK, LIB_STEP = 0.5, -2.0, 0.35  # a library sound's place among the bank's members (0, 1, 2 ...):
# its winners differ little among themselves (each won the forced choice), so the track decides between them
LIB_LOST = 3.0          # a library sound earshot's ears heard lose to a cheap-synth alternative for this action
PARTNER_MIN = 4         # events: an action this busy that takes a library sound takes a second one beside it
OCTAVE_HZ = (63, 125, 250, 500, 1000, 2000, 4000, 8000)  # library.py OCTAVES, score.py's masking bands
BED_DB = 7.0            # a role's level over the bed when the kit does not say (the house median)
MASK_DB = 3.0           # a sound whose best band stands less than this over the busy track is masked there: it costs
STAGE_LUFS = -18.0      # the bed's staged level (score.py): a take's level over it is held by its peak (-1 dBFS)
RING_MIN_S = {'logo-lock': 0.45, 'reveal': 0.3}  # a lock or a reveal rings: a thinner sound reads as a knock, not a resolve
HEADROOM_ACTIONS = ('logo-lock', 'reveal', 'thud')  # the heroes that sit high over the bed: a spiky take is held under it
FAMILY_COST = 2.5       # a bank sound whose recipe already plays another action of the film
RETUNE_MAX = 1.0        # semitones a tonal library sound is moved to the key; the rest of the distance costs


def family(sound):
    """the recipe a bank sound renders from (knock/plastic and knock/snap: knock; fit/pop/lip_pop: fit/pop;
    pro_hover_tick/detent: hover_tick), so two actions of a film are not two presets of one recipe; None for a
    library sound"""
    s = str(sound)
    if s.startswith(('lib:', 'real:')):
        return None
    parts = s.split('/')
    if parts[0] == 'fit' and len(parts) > 1:
        return 'fit/' + parts[1]
    return parts[0][4:] if parts[0].startswith('pro_') else parts[0]


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


def flagged_of(h):
    """{sound: [audit codes]}: sounds earshot rendered with a take-breaking flag (truncated, clipped) in an earlier
    film, so a cast skips them before a render fails kit.py check"""
    return dict((h or {}).get('flagged') or {})


def with_flags(h, flags):
    """h with these sounds' flags recorded (a sound flagged again keeps its codes merged)"""
    f = flagged_of(h)
    for s, codes in (flags or {}).items():
        f[s] = sorted(set(f.get(s) or []) | set(codes))
    return dict(h, flagged=f) if f else dict(h)


def record(h, film, report, date=None):
    """h with this film's cast as its newest entry (an earlier entry of the same film replaced)"""
    sounds = {a: r['sound'] for a, r in report['actions'].items()}
    sounds.update({f'{a}+': r['partner'] for a, r in report['actions'].items() if r.get('partner')})  # a second sound
    entry = dict(film=film, date=date or datetime.date.today().isoformat(), sounds=sounds, signature=report['signature'])
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


def key_pcs(key, action):
    """the pitch classes a tonal sound of the action may sit on: the key's pentatonic for bells, plucks, dings and the
    logo lock, else its scale; key = (tonic pc, mode intervals, ...)"""
    tonic, iv = key[0], key[1]
    if action in PENTA_ACTIONS:
        iv = [0, 3, 5, 7, 10] if iv[2] == 3 else [0, 2, 4, 7, 9]
    return sorted({(tonic + i) % 12 for i in iv})


def retune(midi, key, action):
    """semitones from midi to the nearest note of the key for the action (signed)"""
    best = None
    for pc in key_pcs(key, action):
        d = (pc - midi) % 12
        for x in (d, d - 12):
            if best is None or abs(x) < abs(best):
                best = x
    return round(best, 3)


def local_bands(music, times, win=0.4, around=0.125):
    """the track's band powers where an action's events land (music film_bands, kit.py track_bands), on the scale
    of the level an effect is set against (the music's power within around s of the event): per event, each band
    over the win s from the event against that level; per band the 80th percentile over the events; None without"""
    rows = (music or {}).get('film_bands')
    if not rows or not times:
        return None
    per = []
    for t in times:
        lev = [r[1] for r in rows if abs(r[0] - t) <= around + 0.043]
        span = [r[2:] for r in rows if t - 0.043 <= r[0] <= t + win + 0.043]
        if not lev or not span:
            continue
        lv = sum(lev) / len(lev)
        per.append([sum(x[j] for x in span) / len(span) / max(lv, 1e-12) for j in range(len(span[0]))])
    if not per:
        return None
    out = []
    for j in range(len(per[0])):
        v = sorted(x[j] for x in per)
        out.append(round(v[min(len(v) - 1, int(0.8 * len(v)))], 5))
    return out


def masked_db(feat, music, bed_db=None, bands=None):
    """(best band SNR dB, its band Hz) of a sound over the film's track, or None: per octave band, the sound's power
    share against the track's power there at its louder moments (kit.py track_bands), the sound played bed_db over
    the bed (its loudest 5 ms against the track's level) for its whole length (fill_db); the best of the bands that
    hold 15 % of where it is heard (score.py's band check, before the mix)"""
    eb, hb, fill, mb = feat.get('bands'), feat.get('heard'), feat.get('fill_db'), bands or (music or {}).get('bands')
    if not (eb and hb and mb and fill is not None) or len(eb) != len(mb):
        return None
    bed = BED_DB if bed_db is None else float(bed_db)
    best = None
    for hz, e, h, m in zip(OCTAVE_HZ, eb, hb, mb):
        if h < 0.15:
            continue
        snr = bed + float(fill) + 10 * math.log10(max(float(e), 1e-12) / max(float(m), 1e-12))
        if best is None or snr > best[0]:
            best = (round(snr, 1), hz)
    return best


def music_cost(feat, action, music, tuned=False, bed_db=None, bands=None):
    """(cost, why) of a sound's measured features (library.py measure: dur_s, peak_s, t20_ms, centroid_hz, midi,
    bands, heard, fill_db) against the film's track (music: bpm, centroid, bands, key); 0 without either. tuned:
    kit.py tune moves it to the key; bed_db: the level its role plays over the bed; bands: the track's bands where
    the action's events land (local_bands), else its own louder moments."""
    if not feat or not music:
        return 0.0, []
    c, why = 0.0, []
    bpm = music.get('bpm')
    if bpm and feat.get('dur_s'):
        t20 = feat.get('t20_ms')
        tail = float(feat.get('peak_s') or 0) + (float(t20) / 1000 if t20 is not None else float(feat['dur_s']))
        budget = BEATS.get(action, 2) * 60.0 / float(bpm)
        if tail > budget:
            c += min(2.0, 1.5 * (tail / budget - 1))
            why.append(f'rings {tail:.2f} s, over {BEATS.get(action, 2):g} beat(s) at {float(bpm):.0f} BPM')
    # headroom: a take reaches its level over the bed only when its peak allows it (score.py holds every take at -1 dBFS);
    # a spiky sound (peak far over its loudest 50 ms) on a role that sits high over the bed is held under it and buried
    if action in HEADROOM_ACTIONS and feat.get('l50_lufs') is not None and feat.get('peak_db') is not None:
        bd = float(bed_db if bed_db is not None else BED_DB)
        ob = 10 * math.log10(max(10 ** (bd / 10) - 1.0, 1e-6))
        short = (STAGE_LUFS + ob) - (-1.0 - (float(feat['peak_db']) - float(feat['l50_lufs'])))
        if short > 1.0:
            c += min(3.0, 0.5 * short)
            why.append(f'held {short:.1f} dB under its level over the bed by its peak')
    if action in RING_MIN_S and feat.get('dur_s'):
        t20 = feat.get('t20_ms')
        ring = float(feat.get('peak_s') or 0) + (float(t20) / 1000 if t20 is not None else float(feat['dur_s']))
        if max(ring, float(feat['dur_s'])) < RING_MIN_S[action]:
            c += 1.5
            why.append(f"{float(feat['dur_s']):.2f} s: too short to ring as a {action}")
    mk = masked_db(feat, music, bed_db, bands)
    cen, tc = feat.get('centroid_hz'), music.get('centroid')
    if mk is not None:
        if mk[0] < MASK_DB:
            c += min(4.0, 0.3 * (MASK_DB - mk[0]))
            why.append(f'masked under the track: {mk[0]:+.1f} dB in its best band ({mk[1]} Hz)')
    elif cen and tc:
        d = abs(math.log2(float(cen) / float(tc)))
        if d < 1:
            c += 1.2 * (1 - d)
            why.append(f"its centroid ({float(cen):.0f} Hz) in the track's band ({float(tc):.0f} Hz)")
    if not tuned and feat.get('midi') is not None and music.get('key'):
        st = abs(retune(float(feat['midi']), music['key'], action))
        c += 0.3 * min(st, RETUNE_MAX) + 1.5 * max(0.0, st - RETUNE_MAX)
    return round(c, 3), why


def cast(events, kit, fps=60.0, cue=None, history=None, film='film', knobs=None, role_for=None, avoid=(),
         library=None, music=None, feats=None, flagged=None):
    """(kit dict with the film's actions cast, report). events: out/cues.json events; kit: audio/kit.json (a kit cast
    before is restored to its own roles first); knobs: {bank id: knobs} from earshot (candidates outside it are
    skipped; None trusts the table); role_for(kind, variant, weight, dur_s) -> the generic role (kit.role_for); avoid:
    sounds the film's own listening or plan judged poorly (masked under this track, flagged by the ears): taken only
    when the action has nothing else; kept in the cast block, so casting again avoids them too. library: a loaded
    sound library (library.py load) whose sounds join each action's candidates as "lib:<id>"; music: the film's track
    {bpm, centroid, key: (tonic pc, mode intervals, text)}; feats: {bank id: measured features} for music_cost."""
    import copy
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    if role_for is None:
        from kit import role_for  # noqa: E402
    import library as LB
    kit = copy.deepcopy(kit)
    roles = kit.setdefault('roles', {})
    old = kit.get('cast') or {}
    for name, r in (old.get('roles') or {}).items():  # undo the previous cast: base specs back, sub-roles out
        if r.get('base') is not None:
            roles[name] = r['base']
        elif r.get('added'):
            roles.pop(name, None)
    groups, first_t, variants, times = {}, {}, {}, {}
    for e in sorted(events, key=lambda x: x['f']):
        dur = float(e['dur']) / fps if 'dur' in e else None
        g = role_for(e.get('kind'), e.get('variant'), float(e.get('weight', 1.0)), dur)
        a = action_of(e, fps, cue)
        if a is None or g in UNCAST or g not in roles or roles[g] is None:
            continue
        groups.setdefault(a, {}).setdefault(g, []).append(e.get('id', ''))
        first_t.setdefault(a, float(e['f']) / fps)
        times.setdefault(a, []).append(float(e['f']) / fps)
        if e.get('variant'):
            variants.setdefault(a, set()).add(str(e['variant']).lower())
    avoid = set(avoid or ()) | set(old.get('avoid') or [])
    prev = previous_films(history or {}, film)
    last = prev[0] if prev else None
    older = {s for x in prev[1:4] for s in (x.get('sounds') or {}).values()}
    # the signatures of the four films before the previous one: several films are made at once, so "the previous
    # film" alone let one film's signature come straight back in the next but one
    recent_sig = {s for x in prev[1:5] for s in (x.get('signature') or [])}
    flags = dict(flagged or {})
    count = {a: sum(len(v) for v in gs.values()) for a, gs in groups.items()}
    bed_of = {a: (roles.get(max(gs, key=lambda g: len(gs[g]))) or {}).get('bed_db') for a, gs in groups.items()}
    here_of = {a: local_bands(music, times[a]) for a in groups}  # the music where the action's events land
    order = sorted(groups, key=lambda a: (ACTIONS[a]['rank'] is not None, -count[a], first_t[a]))
    sig = set((last or {}).get('signature') or [])
    used = set(((last or {}).get('sounds') or {}).values())
    taken, chosen, scored_of, fams = set(), {}, {}, set()
    lib_by_id = {LB.lib_id(x): x for x in (library or {}).get('sounds') or []}

    def lib_won(a):
        """the library has a sound for the action that won the ears' forced choice"""
        return any(((x.get('ears') or {}).get(a) or {}).get('won') for x in (LB.candidates(library, a) if library else []))

    def cost(a, k, s, feat, tuned):
        c = float(k)
        why = []
        if s in avoid:
            c += 40
            why.append('avoided for this film')
        if s in flags:
            c += 60
            why.append(f"earshot renders it {', '.join(flags[s])}")
        if s in sig:
            c += 50
            why.append("the previous film's signature")
        elif s in recent_sig:
            c += 30
            why.append("a recent film's signature")
        elif s in used:
            c += 4
            why.append('used by the previous film')
        if s in older:
            c += 1.5
        if s.split('/')[-1] in variants.get(a, ()):
            if s in LOST.get(a, ()) and lib_won(a):
                why.append("the author's variant, heard to lose to a cheap-synth alternative: a real recording leads")
            else:
                c -= VARIANT_BONUS
        if family(s) and family(s) in fams:
            c += FAMILY_COST
            why.append('its recipe already plays another action')
        m, mwhy = music_cost(feat, a, music, tuned, bed_of.get(a), here_of.get(a))
        return c + m + 1.6 * jitter(film, a, s), why, mwhy

    def candidates_of(a):
        """[(base cost, sound, features, tuned)]: the bank's members, then the library's sounds for the action"""
        out = []
        lost = LIB_LOST if lib_won(a) else 0.0  # a member the ears heard lose gives way to a library sound that won
        for k, s in enumerate(ACTIONS[a]['sounds']):
            if knobs is None or s in knobs:
                out.append((k + (lost if s in LOST.get(a, ()) else 0.0), s, (feats or {}).get(s),
                            bool(((knobs or {}).get(s) or {}).get('pitch'))))
        start = LIB_START_WEAK if a in WEAK else LIB_START
        for j, x in enumerate(LB.candidates(library, a) if library else []):
            ears = (x.get('ears') or {}).get(a) or {}
            base = start + j * LIB_STEP + (LIB_LOST if ears.get('p') is not None and not ears.get('won') else 0)
            out.append((base, LB.lib_id(x), x, False))
        return out
    for a in order:
        cands = candidates_of(a)
        if not cands:
            continue
        scored = sorted(((cost(a, k, s, f, t), k, s) for k, s, f, t in cands), key=lambda x: (x[0][0], x[1]))
        scored_of[a] = scored
        free = [x for x in scored if x[2] not in taken] or scored  # a sound plays one action, unless nothing is left
        (_, _, mwhy), k, s = free[0]
        avoided = [x[2] for x in scored if x[0][1] and x[1] < k and not str(x[2]).startswith('lib:')]
        chosen[a] = dict(sound=s, rank=k, avoided=avoided, music=mwhy)
        taken.add(s)
        fams.add(family(s))
    # the film's set of sounds is never an earlier film's: the action that loses least takes its next sound
    earlier = [sorted(set((x.get('sounds') or {}).values())) for x in prev]
    for _ in range(6):
        if sorted({c['sound'] for c in chosen.values()}) not in earlier:
            break
        swaps = []
        for a, c in chosen.items():
            nxt = [x for x in scored_of[a] if x[2] not in taken]
            if nxt:
                best = next(x for x in scored_of[a] if x[2] == c['sound'])
                swaps.append((nxt[0][0][0] - best[0][0], a, nxt[0]))
        if not swaps:
            break
        _, a, x = min(swaps, key=lambda z: (z[0], z[1]))
        taken.discard(chosen[a]['sound'])
        chosen[a] = dict(sound=x[2], rank=x[1], avoided=[], music=x[0][2], why='an earlier film had this set')
        taken.add(x[2])
    # a busy action on a library sound: a second library sound of the same action beside it
    for a, c in chosen.items():
        if not str(c['sound']).startswith('lib:') or count[a] < PARTNER_MIN:
            continue
        mine = lib_by_id[c['sound']]
        pool = [x for x in scored_of[a] if str(x[2]).startswith('lib:') and x[2] not in taken and x[2] not in avoid]
        near = [x for x in pool if x[0][0] <= pool[0][0][0] + 1.5] if pool else []  # the length, among the best
        length = (mine.get('tags') or {}).get('length')
        same = [x for x in near if (lib_by_id[x[2]].get('tags') or {}).get('length') == length]
        pick = (same or pool)[:1]
        if pick:
            c['partner'] = pick[0][2]
            taken.add(pick[0][2])
    # a library pick: the bank sound its role renders as a fallback (kit.json names a bank sound), its tuning
    for a, c in chosen.items():
        if not str(c['sound']).startswith('lib:'):
            continue
        bank = [x[2] for x in scored_of[a] if not str(x[2]).startswith('lib:')]
        c['fallback'] = next((b for b in bank if b not in taken), bank[0] if bank else None)
        x = lib_by_id[c['sound']]
        if x.get('midi') is not None and (music or {}).get('key') and float(x.get('tonal') or 0) >= 0.5:
            st = retune(float(x['midi']), music['key'], a)
            c['retune'] = st if abs(st) <= RETUNE_MAX else 0.0
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
            c = chosen[a]
            if str(c['sound']).startswith('lib:'):  # the library sound plays (kit.py places its takes); the bank's renders
                why += f"; plays {c['sound']}" + (f" and {c['partner']}" if c.get('partner') else '') + \
                       f" from the sound library, {c.get('fallback') or base.get('sound')} renders as its fallback"
                roles[name] = revoice(base, c.get('fallback') or base.get('sound'), a, knobs, why)
            else:
                roles[name] = revoice(base, c['sound'], a, knobs, why)
            cast_roles[name] = dict(action=a, base=base if n == 0 else None, added=n > 0, generic=g)
            report['roles'][name] = dict(action=a, sound=c['sound'], was=base.get('sound'), events=len(ids))
    t = chosen.get('type')
    if t and t['sound'].startswith('typing_key/') and isinstance(roles.get('key.return'), dict):
        base = copy.deepcopy(roles['key.return'])
        roles['key.return'] = dict(base, sound=t['sound'], note='cast: the typing run\'s own switch on its own seeds')
        cast_roles['key.return'] = dict(action='type', base=base, added=False, generic='key.return')
    lib = {}
    for a, c in chosen.items():
        report['actions'][a] = dict(sound=c['sound'], events=count[a], roles=sorted(groups[a]), avoided=c['avoided'],
                                    music=c.get('music') or [], **({'why': c['why']} if c.get('why') else {}))
        if str(c['sound']).startswith('lib:'):
            lib[a] = dict(sound=c['sound'], partner=c.get('partner'), retune=c.get('retune'), fallback=c.get('fallback'),
                          roles=sorted(n for n, r in cast_roles.items() if r['action'] == a))
            report['actions'][a].update(partner=c.get('partner'), retune=c.get('retune'))
    top = max(count, key=lambda a: (count[a], -first_t[a])) if count else None
    report['signature'] = sorted({chosen[a]['sound'] for a in chosen if a in SIGNATURE or a == top})
    report['weak'] = {a: WEAK[a] for a in chosen if a in WEAK and not str(chosen[a]['sound']).startswith(('real:', 'lib:'))}
    report['library'] = lib
    kit['cast'] = {'cast': 1, 'film': film, 'date': datetime.date.today().isoformat(),
                   'previous': report['previous'], 'roles': cast_roles,
                   'actions': {a: dict(sound=c['sound'], events=count[a]) for a, c in chosen.items()},
                   'signature': report['signature'], 'avoid': sorted(avoid), 'real': (old.get('real') or {}),
                   'library': lib}
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
