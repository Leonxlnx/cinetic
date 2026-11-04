#!/usr/bin/env python3
"""
plan.py: the film's effects plan, decided before anything is mixed.

For every event in out/cues.json it fixes the kit role, the take, the start time, the gain and the width,
and for a film cut to a licensed track the stop-downs and the hits the track already carries. score.py
renders exactly this plan; av-audit.py, listen.py and earshot's ears read out/qa/cues_sounded.json.

Usage (from the project root):
  python3 scripts/audio/plan.py [--cues out/cues.json] [--score audio/score.json] [--kit audio/kit.json]
          [--out out/qa/sfx_plan.json] [--sounded out/qa/cues_sounded.json] [--quiet]

Step by step:
  roles      each event's action (actions.py) and role: in a cast kit (kit.py cast) the action's own role
             "<role>.<action>" when the kit has one, else the role of its kind and variant (kit.role_for: kind,
             variant, weight, length), which carries the kind's main action; a role the kit sets null is off
             (listed as silent); a role the kit does not name is an error (an earshot kit role or nothing:
             effects never come from placeholder voices outside a --draft build)
  takes      a new take per cue, the least recently played, never one heard within 3 s while the role has
             another (keys keep one take per key identity); a take that repeats within 3 s is listed
  restraint  with a track, while any 10 s holds more effects than the restraint number (10; score.json
             "sfx": {"restraint": N | "off"}; a typing run counts once), whole actions go quiet, the lightest
             first (actions.py ranks them): the music carries them. Never the reveal, the logo lock, the thud,
             a pass, a shape transition, a swell, a build or an error, nor an action with a structural, forced,
             payoff or lockup event
  keys       the typing plan (thinning to about 12 keys/s, word accents, sigma 2.5 dB, no jump over 5 dB),
             and no two keys closer than max(60 ms, the role's min_gap_ms); each run's dynamics are centred
             on the role's bed_db (the run's median key sits on it)
  runs       3+ events of one role within 250 ms of each other are a run: spaced to the role's min_gap_ms
             (space_run), the accent at its end checked against the kit's mix.runs.accent_at_end
  carried    with a track, a hit or drop with a strong low or mid accent of the track (>= 6 dB over its bed)
             within one frame, where the bed plays, is carried by the track: no take ("force": true keeps
             one); the track's own ending (button or ring) carries the lockup hit on its final hit
  tuned      tuned effects never become a melody: at most 2 pitched effects in any 4 s (so never 3 within
             2 s); the extra ones are thinned (heavy and structural ones keep priority); no tonal effect
             rings longer than 1.5 s (score.py fades it there)
  stop-downs with a track, the music steps down before a hit, a drop or a swell of weight 1 or more (a lighter
             swell only when it is the payoff, the lockup or structural; the arrangement first: a
             dip or stop the track already has there counts, and only the missing depth is added): the length
             nearest 0.4 s among 1 beat, 3/16 and 1/8 of a bar (0.3-0.5 s), depth 6 + 4 (weight - 0.5) dB
             within the kit lock's mix.stop_down range, at most 3 in any 10 s and 2 s apart, back on the hit
             (a 40 ms step down, a hold, 5 ms back up ending on the hit's sync time); a hit ending's lockup
             takes the deepest of the range, and the bed's last downbeat comes back 6 dB under its level for the
             hit and the release (score.py rings that chord out through the hall): the hit lands clear and the
             music resolves under it;
             nothing ever ducks under an effect
  moments    the picture's landings (a card, a device, a seam through a shape or a cut, a tap that does the
             thing, a success; weight 0.45 or more, never a key, a text sound or a tick) take a breath of the
             music before them inside the same spacing (2 s apart, 3 in any 10 s), after the stop-downs and in
             order of importance (the lock, the reveal, the thud, a seam, a landing ... a touch): 7 dB (8 at
             weight 0.8+), the musical length nearest 0.4 s within 0.22-0.32 s, back on the frame, so the effect
             lands as a hit the ear marks; the rest play over the bed (never every event: never a click track).
             An effect within 0.25 s of a seam the timeline declares (declared.seams, not the soft ones: a
             breath, a focus pull, a dissolve, a fade) keeps its sound when restraint quiets its action: the
             whole picture changes there
  gains      with a track: bed_db over the bed as played (the median 50 ms K-weighted level of the second
             before the sync point; a stop-down target reads the bed before its own stop-down), plus
             20 log10(weight) within -12..+6 dB, never past a -1 dBFS sample peak; with no bed under a cue
             (before the track, inside a stop or a silence, after a hit ending's release) the film's reference bed
             (the median bed level over its cues) plus quiet_db (score.json stopdowns.quiet_db, default -7:
             an element in silence reads louder than over a bed; the lockup after a stop then peaks near -7.5
             dBFS in a -14 LUFS master);
             effects-only: the role's level_db x weight (score.py's own level model)
  width      roles with a width keep the stereo they were rendered with; whooshes, risers and swells travel
             along the cue's pan; every other effect is mono within +-0.15 of the centre

Report: density per 10 s against the kit's band (music-led 3-13, no floor for a sting of 8 s or less; a typing
run counts once), one gesture (a hit, drop, landing or long whoosh within 30 ms of a strong track accent: let
the track carry it or move it), runs, stop-downs (length, depth, the track's own dip, the depth added), statuses.

Exit codes: 0 planned; 1 invalid input, a role missing from the kit or its lock, a stale lock (kit.json
changed since the render: npm run kit), an explicit note no take sounds; 2 no rendered kit at all.
"""
import argparse
import json
import math
import os
import sys
import zlib

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import actions as AC  # noqa: E402
import kit as K  # noqa: E402
import mixkeys as MK  # noqa: E402

SR = 48000
RUN_GAP_S = 0.25            # events of one role closer than this (3+) form a run
KEY_FLAM_S = 0.060          # never two keys closer than this
CARRY_DB = 6.0              # a track accent this strong carries a hit or drop on its frame
GESTURE_S = 0.030           # a heavy designed effect this close to a strong accent doubles it
HEAVY_GESTURE = ('hit', 'drop', 'land', 'whoosh.long')
STOP_ROLES = ('hit', 'drop', 'swell')   # gain stop-downs only before these
# moments: what the picture lands (a card or device landing, a seam through a shape or a cut, a tap that does the
# thing, the claim, the lockup). Each takes a short breath of the music before it (a stop-down of 1/8-3/16 bar,
# MOMENT_DB deep, back on the frame), so the effect lands as a hit the ear marks, within the same spacing as the
# stop-downs (2 s apart, 3 in any 10 s): the most important moments first, never every event (never a click track)
MOMENT_ACTIONS = ('logo-lock', 'reveal', 'thud', 'jump-cut', 'shape', 'pass', 'whip', 'shutter', 'card-land', 'land',
                  'lock', 'success', 'touch', 'toggle')  # in order of importance: the lock, the claim, the seams (where the
                                                         # whole picture changes), the landings, then what a tap does
MOMENT_W = 0.45             # a lighter event is never a moment
MOMENT_DB = 7.0             # a moment's breath: the music this far down for MOMENT_LEN before the frame
MOMENT_LEN = (0.22, 0.32)   # s: the breath covers the 200 ms the ear compares the hit with
END_UNDER_DB = 6.0          # a hit ending: the bed's last downbeat this far under its level, under the lockup's hit
# the seams the timeline declares (cues.json declared.seams) are where the whole picture changes: an effect within
# SEAM_NEAR_S of one keeps its sound when restraint quiets its action. Soft seams (a breath, a focus pull, a dissolve, a
# fade) do not count.
SOFT_SEAMS = ('breath', 'defocus', 'dissolveUi', 'fadeEnd', 'stepped')
SEAM_NEAR_S = 0.25
STOP_MAX_PER_10S, STOP_MIN_GAP_S = 3, 2.0
STOP_EDGE_DOWN_S, STOP_EDGE_UP_S = 0.040, 0.005
STOP_ADD_MAX = 18.0         # dB of gain a stop-down may add (over a build that rises into the hit, more than its depth)
TUNED_PER_4S, TUNED_PER_2S = 2, 2
TONAL_MAX_S = 1.5
QUIET_DB = -7.0
WEIGHT_DB = (-12.0, 6.0)
CEILING_DB = -1.0
DENSITY_BAND = (3, 13)
STING_S = 8.0               # a film this long or shorter is a sting: one kit element, no density floor
RESTRAINT = 10.0            # effects in any 10 s, with a track: over it, whole actions go quiet, the lightest first
WIDE_KINDS = ('whoosh', 'riser', 'swell', 'suck')
SFX_PAN = 0.15
ACCENT_AT_END = ('click.confirm', 'land', 'drop')


class PlanError(Exception):
    def __init__(self, msg, code=1):
        super().__init__(msg)
        self.code = code


def r4(x):
    return None if x is None else round(float(x), 4)


def stop_down_cfg(kit):
    """the kit lock's mix.stop_down (depth and length ranges), with the house defaults where it says nothing"""
    sd = ((getattr(kit, 'lock', None) or {}).get('mix') or {}).get('stop_down') or {}
    depth = sd.get('depth_db') or [6, 12]
    length = sd.get('length_s') or [0.3, 0.5]
    before = [r for r in (sd.get('before') or list(STOP_ROLES)) if r in STOP_ROLES]
    return dict(depth=(float(depth[0]), float(depth[-1])), length=(float(length[0]), float(length[-1])),
                before=before or list(STOP_ROLES), from_lock=bool(sd))


def restraint_target(song, music):
    """the restraint number for this film: score.json sfx.restraint (a number, or "off"), else RESTRAINT with a track;
    None: no restraint (effects-only, or off)"""
    v = getattr(song, 'restraint', None)
    if not music or (isinstance(v, str) and v.lower() in ('off', 'none', 'false')) or v is False:
        return None
    try:
        return float(v) if v is not None else RESTRAINT
    except (TypeError, ValueError):
        return RESTRAINT


def restrain(rows, events, song, runs_k, target, special, keep=None):
    """whole actions thinned while any 10 s window holds more than `target` placed effects (a typing run counts
    once), the lowest restraint rank first, then the action with the most effects in the window; an action with a
    structural, forced, payoff or lockup event, or one actions.py never silences, stays; a member `keep` names (an
    effect on a declared seam) stays when its action goes quiet. Returns the silenced actions [{action, events,
    window_s}]."""
    if target is None:
        return []
    out, tried = [], set()
    scale = 10.0 / min(10.0, song.dur) if song.dur > 0 else 1.0
    while True:
        pts, seen = [], set()
        for r in rows:
            if r.get('status') != 'placed':
                continue
            if r['kind'] == 'key':
                ri = next((k for k, rr in enumerate(runs_k) if r['i'] in rr['idx']), None)
                if ri is not None:
                    if ri in seen:
                        continue
                    seen.add(ri)
            pts.append((r['cue_t'], r))
        if not pts:
            break
        best = None
        for a0 in np.arange(0.0, max(0.01, song.dur - 10.0) + 1e-9, 0.5):
            win = [r for t, r in pts if a0 <= t < a0 + 10.0]
            if best is None or len(win) > len(best[1]):
                best = (float(a0), win)
        a0, win = best
        if len(win) * scale <= target + 1e-9:
            break
        acts = {}
        for r in win:
            if r.get('action'):
                acts[r['action']] = acts.get(r['action'], 0) + 1
        cand = []
        for a, n in acts.items():
            rank = (AC.ACTIONS.get(a) or {}).get('rank')
            if a in tried or rank is None:
                continue
            members = [r for r in rows if r.get('status') == 'placed' and r.get('action') == a]
            if any(events[r['i']].get('structural') or events[r['i']].get('force') or special(r['cue_t']) for r in members):
                tried.add(a)
                continue
            cand.append((rank, -n, a, members))
        if not cand:
            break
        _, _, a, members = min(cand, key=lambda c: (c[0], c[1], c[2]))
        tried.add(a)
        for r in members:
            if keep is not None and keep(r['cue_t']):
                continue  # on a seam: the picture changes there, the effect stays
            r.update(status='thinned', why=f'restraint: the music carries {a} (over {target:g} effects in the 10 s from '
                                           f'{a0:.1f} s)')
        out.append(dict(action=a, events=len(members), window_s=round(a0, 2)))
    return out


def is_accent(role):
    """A role that lands a run: click.confirm, land or drop, or a variant of one (land.light)."""
    return bool(role) and any(role == a or role.startswith(a + '.') for a in ACCENT_AT_END)


def density_band(kit):
    d = (((getattr(kit, 'lock', None) or {}).get('mix') or {}).get('density_per_10s') or {}).get('music_led')
    return tuple(d) if d else DENSITY_BAND


def stop_length(beat_s, rng=(0.3, 0.5)):
    """the musical length nearest 0.4 s within rng: 1 beat, 3/16 or 1/8 of a bar at the track's tempo"""
    c = [x for x in (beat_s, 0.75 * beat_s, 0.5 * beat_s) if rng[0] - 1e-9 <= x <= rng[1] + 1e-9]
    return min(c, key=lambda x: (abs(x - 0.4), -x)) if c else float(np.clip(0.4, *rng))


def track_dip(bed, t, L):
    """the dip the bed already has before t: the median 50 ms K-weighted level over [t - 1.5, t - 0.5) minus
    the 25th percentile over [t - L, t), dB; negative when the track builds into t (a fill or a riser: the
    stop-down then has more to add); 0 when either side has no music"""
    bt, lv = MK.block_levels(bed[max(0, int((t - 1.5) * SR)):max(0, int(t * SR))])
    if len(lv) < 4:
        return 0.0
    t0 = max(0.0, t - 1.5)
    tt = bt + t0
    pre = lv[(tt >= t - 1.5) & (tt < t - 0.5)]
    win = lv[(tt >= t - L) & (tt < t)]
    if len(pre) < 2 or len(win) < 1:
        return 0.0
    return float(np.median(pre) - np.percentile(win, 25))


def stop_envelope(n, stops, skip=None):
    """the stop-down gain (n,): each stop = {from, t, added_db}: a raised-cosine step down over 40 ms from
    `from`, a hold, back to 0 dB over 5 ms ending on t. skip: the index of a stop to leave out (a target
    reads its bed without its own stop-down)."""
    g = np.ones(n)
    for k, s in enumerate(stops):
        if k == skip or not s.get('added_db'):
            continue
        a, t, d = s['from'], s['t'], 10 ** (-float(s['added_db']) / 20)
        i0, i1 = max(0, int(round(a * SR))), min(n, int(round(t * SR)))
        if i1 <= i0:
            continue
        u = np.arange(i0, i1) / SR
        down = 0.5 - 0.5 * np.cos(np.pi * np.clip((u - a) / STOP_EDGE_DOWN_S, 0, 1))
        up = 0.5 - 0.5 * np.cos(np.pi * np.clip((t - u) / STOP_EDGE_UP_S, 0, 1))
        g[i0:i1] = np.minimum(g[i0:i1], 1 - (1 - d) * np.minimum(down, up))
        if s.get('through'):  # a hit ending: the bed's last downbeat comes back only part way, under the hit and its release
            g[i1:] = np.minimum(g[i1:], 10 ** (-float(s['through']) / 20))
    return g


def hold_envelope(song, n):
    """score.json silences (everything mutes, effects included) as a gain (n,), opening again over 8 ms"""
    t = np.arange(n) / SR
    h = np.ones(n)
    for a, b, depth, scope in song.silences:
        if scope != 'all':
            continue
        w_ = (t > a - 0.04) & (t < b)
        h[w_] = np.minimum(h[w_], 1 - depth * np.clip((t[w_] - (a - 0.04)) / 0.04, 0, 1))
        r_ = (t >= b) & (t < b + 0.008)
        h[r_] = np.minimum(h[r_], 1 - depth * (0.5 + 0.5 * np.cos(np.pi * (t[r_] - b) / 0.008)))
    return h


def end_fade(song, n):
    t = np.arange(n) / SR
    return np.clip((song.dur - 0.03 - t) / song.fade, 0, 1) ** 2


def ride_envelope(song, n):
    """the arc ride as a gain (n,), 1 when the plan made none (song.ride: [(t, dB), ...] breakpoints)"""
    pts = getattr(song, 'ride', None)
    if not pts:
        return np.ones(n)
    t = np.arange(n) / SR
    tt, gg = zip(*pts)
    return 10 ** (np.interp(t, tt, gg) / 20)


RIDE_OPEN_MAX, RIDE_LIFT_MAX = 3.0, 4.0   # dB: how far the arc ride may lower the opening / lift the body
RIDE_BUILD_LU = 1.0                       # the body rises this much from the product's first moment to the reveal
RIDE_SLEW = 3.0                           # dB per bar at most


def arc_ride(bed, song, product_s, reveal_s, end_s, bar_s, keep=()):
    """The arc: the music never plays under its opening once the product starts, and builds into the product's
    moments. Short-term (3 s) loudness of the bed: the opening is the bed before the product's first moment; from there
    to the reveal the target rises RIDE_BUILD_LU over the opening, and holds to the end. Where the body sits under its
    target, the opening steps down first (up to RIDE_OPEN_MAX, back to unity over a bar into the product) and the body's
    dips are lifted (up to RIDE_LIFT_MAX, slewed at RIDE_SLEW dB a bar); `keep` spans (the break before the reveal,
    stops) are left as the edit made them. Returns (breakpoints [(t, dB)], report) or (None, report)."""
    rep = dict(product_s=None if product_s is None else round(product_s, 2))
    if product_s is None or end_s is None or end_s - product_s < 3.0:
        rep['why'] = 'no product moment or too short a body to read'
        return None, rep
    import master as MA
    ts, S = MA.blocks(bed[:int(end_s * SR)], 3.0, 0.25)
    if len(S) < 4:
        rep['why'] = 'too short'
        return None, rep
    p_lin = lambda v: 10 * np.log10(np.mean(10 ** (np.asarray(v) / 10))) if len(v) else None
    o_end = max(product_s, 1.5)
    op = S[ts <= o_end]
    if not len(op):
        op = S[:1]
    L_open = float(p_lin(op))
    rv = reveal_s if reveal_s is not None and product_s < reveal_s <= end_s else end_s
    body = (ts >= product_s + 1.5) & (ts <= end_s - 0.5)
    for a, b in keep:
        body &= ~((ts >= a - 1.5) & (ts <= b + 1.5))
    if body.sum() < 2:
        rep['why'] = 'the body is all kept spans'
        return None, rep
    target = L_open + RIDE_BUILD_LU * np.clip((ts - product_s) / max(rv - product_s, 1e-6), 0, 1)
    deficit = np.where(body, target - S, 0.0)
    rep.update(opening_lufs=round(L_open, 2), body_lufs=round(float(p_lin(S[body])), 2),
               body_min_lufs=round(float(S[body].min()), 2))
    if deficit.max() <= 0.5:
        rep['why'] = 'the body already plays at or over its opening'
        return None, rep
    open_db = -float(np.clip(np.median(deficit[body]), 0, RIDE_OPEN_MAX))
    lift = np.clip(deficit + open_db, 0, RIDE_LIFT_MAX) * body
    # slew: at most RIDE_SLEW dB a bar, both ways (a lift arrives over the bar before the dip it fills)
    step = RIDE_SLEW * 0.25 / max(bar_s, 0.5)
    for k in range(1, len(lift)):
        lift[k] = max(lift[k], lift[k - 1] - step)
    for k in range(len(lift) - 2, -1, -1):
        lift[k] = max(lift[k], lift[k + 1] - step)
    pts = [(0.0, open_db), (max(0.0, product_s - bar_s), open_db), (product_s, 0.0)] if open_db < -0.25 else [(0.0, 0.0)]
    for t, g in zip(ts, lift):
        if t > product_s:
            pts.append((float(t), round(float(g), 2)))
    pts.append((end_s, 0.0))
    pts = sorted(dict(pts).items())
    rep.update(opening_db=round(open_db, 2), lift_max_db=round(float(lift.max()), 2),
               why='the body sat under its opening' if deficit.max() > 0.5 else '')
    return pts, rep


def bed_as_played(bed, song, stops, skip=None):
    """the staged bed times its automation: the arc ride, stop-downs, silences and the end fade"""
    n = len(bed)
    return bed * (ride_envelope(song, n) * stop_envelope(n, stops, skip) * hold_envelope(song, n) * end_fade(song, n))[:, None]


def safe_bed_level(bed, t):
    try:
        return MK.bed_level(bed, t)
    except MK.BedError:
        return None


def in_spans(t, spans):
    return any(a <= t < b for a, b in spans)


def tuned_budget(cands):
    """cands: [(priority key, time s, idx)] of pitched effects -> (kept idx set, thinned {idx: why}). Greedy by
    priority: an effect is kept when every 4 s window keeps at most TUNED_PER_4S pitched effects and every
    2 s window at most TUNED_PER_2S."""
    kept, why = [], {}
    for _, t, i in sorted(cands):
        c4 = sum(1 for _, u in kept if abs(u - t) < 4.0)
        # every window that holds t: a window starting at each effect near t (or at t itself)
        ok = True
        near = sorted([u for _, u in kept if abs(u - t) < 4.0] + [t])
        for a in near:
            if sum(1 for u in near if a <= u < a + 4.0) > TUNED_PER_4S:
                ok = False
        near2 = sorted([u for _, u in kept if abs(u - t) < 2.0] + [t])
        for a in near2:
            if sum(1 for u in near2 if a <= u < a + 2.0) > TUNED_PER_2S:
                ok = False
        if ok:
            kept.append((i, t))
        else:
            why[i] = (f'tuned budget: at most {TUNED_PER_4S} pitched effects in 4 s (a run of tuned hits is a melody); '
                      f'{c4} kept within 4 s')
    return {i for i, _ in kept}, why


# ------------------------------------------------------------------------------------------
# the plan
# ------------------------------------------------------------------------------------------
def make(cues, song, kit, bed=None, edit=None, draft=False, log=None):
    """The plan dict (see the module doc). song: score.Song; kit: kit.Kit (rendered or vendored); bed: the
    staged edited track (n, 2) at 48 kHz, or None for an effects-only film; edit: audio/music/edit.json."""
    import score as SC
    say = log or (lambda s: None)
    fps = song.fps
    events = sorted(cues.get('events', []), key=lambda e: e['f'])
    music = bed is not None
    warnings, silent, placed, missing = [], [], [], []
    tplan, thinned, runs_k = SC.plan_typing(song, events)
    cue_names = cues.get('cue') or {}
    lockup_t = cue_names['lockup'] / fps if 'lockup' in cue_names else None
    payoff_t = song.payoff
    film = (edit or {}).get('film') or {}
    accents = film.get('accents') or []
    stop_spans = [(s['from'], s['to']) for s in (film.get('stops') or [])]
    ending = (edit or {}).get('ending') or {}
    if ending.get('mode') == 'hit':  # the bed is gone once its release under the hit is over
        stop_spans.append((ending['bed_stops_film_s'] + 0.06 + float(ending.get('release_s', 0.5)), song.dur + 10))
    elif ending.get('mode') == 'stop':  # an old edit's stop: its element sounds after the bar line, on the bed's release tail
        stop_spans.append((ending['bed_stops_film_s'], song.dur + 10))
    beat_s = float((edit or {}).get('beat_s') or song.beat)
    sd = stop_down_cfg(kit)
    quiet_db = song.quiet_db if song.quiet_db is not None else QUIET_DB

    def special(t):
        return any(m is not None and abs(t - m) <= 3 / fps for m in (payoff_t, lockup_t))

    seams = sorted(float(x['at']) / fps for x in ((cues.get('declared') or {}).get('seams') or [])
                   if isinstance(x, dict) and x.get('at') is not None and x.get('kind') not in SOFT_SEAMS)

    def on_seam(t):
        return any(abs(t - x) <= SEAM_NEAR_S for x in seams)

    # ---- roles, takes, statuses (time order: Kit.pick never plays one file twice in a row)
    rows = []
    text_run, last_text = 0, -1e9
    for i, e in enumerate(events):
        kind, f = e['kind'], float(e['f'])
        t = f / fps
        w = float(e.get('weight', 1.0))
        dur = float(e['dur']) / fps if 'dur' in e else None
        row = dict(i=i, id=e.get('id', ''), kind=kind, f=f, cue_s=r4(t), weight=w)
        if kind == 'key' and i not in tplan:
            row.update(status='thinned', why=thinned.get(i, 'thinned'))
            rows.append(row)
            continue
        kp = tplan.get(i) if kind == 'key' else None
        role = K.role_for(kind, kp['kind'] if kp else e.get('variant'), w, dur)
        action = AC.action_of(e, fps, cue_names)
        row.update(role=role, action=action)
        row['for'] = role
        own = f'{role}.{AC.slug(action)}' if action and getattr(kit, 'cast', None) else None
        if own and own in kit.roles:
            st, name, spec = ('ok', own, kit.roles[own]) if kit.roles[own] else ('off', own, None)
        else:
            st, name, spec = kit.lookup(role)
        if st == 'off':
            row.update(status='off', why=f'{name} is off in the kit')
            rows.append(row)
            continue
        if st == 'missing':
            row.update(status='missing', why=f'the kit has no {role} role (nor one of its family)')
            missing.append(row)
            rows.append(row)
            continue
        row['role'] = name
        if music and kind in ('hit', 'drop') and not e.get('force'):
            acc = [a for a in accents if a.get('band') in ('low', 'mid') and a['db'] >= CARRY_DB and abs(a['t'] - t) <= 1.0 / fps]
            if acc and not in_spans(t, stop_spans):
                row.update(status='carried', why=f"the track's {acc[0]['band']} accent ({acc[0]['db']} dB) at "
                                                  f"{acc[0]['t']:.3f} s carries it", spec=spec)
                rows.append(row)
                continue
            if ending.get('mode') in ('button', 'ring') and lockup_t is not None and abs(t - lockup_t) <= 3 / fps \
                    and abs(ending.get('last_hit_film_s', -9) - t) <= 0.1:
                row.update(status='carried', why=f"the track's own final hit carries the lockup ({ending.get('mode')} ending)", spec=spec)
                rows.append(row)
                continue
        # the take: tonal roles aim at the note score.py's chord logic gives (an explicit pitch must exist)
        ch = song.chord_at(t + 1e-3)
        pcs = ch.pcs if ch else song.scale
        pitch = SC.D.midi(e['pitch']) if 'pitch' in e else None
        text_note = None
        if kind == 'text':  # one chain's fragments step through the chord's tones (score.py's text logic)
            text_run = text_run + 1 if t - last_text < SC.TEXT_RUN_GAP else 0
            last_text = t
            text_note = SC.text_chain_note(song, ch, text_run)
        target, explicit = SC.kit_target(song, kind, e, t, pcs, pitch, text_note)
        if kind == 'text' and pitch is None and kit.notes(name):
            target, explicit = SC.text_kit_target(song, kit, name, ch, pcs, text_run)
        if explicit and not kit.covers(name, target):
            row.update(status='missing', why=f'kit role {name} has no take on {SC.note_name(target)}: add it to the '
                                             "role's pitches in audio/kit.json (npm run kit) or drop the hand-set pitch")
            missing.append(row)
            rows.append(row)
            continue
        index = None
        if kp:
            kk = kp['kind']
            index = kp['strike'] if kk == 'word' else kp['seed'] if kk not in ('space', 'return') else None
        tk = kit.pick(name, f"{e.get('id', i)}|{f:g}", target, explicit, index, t=kp['t'] if kp else t)
        if tk is None:
            row.update(status='missing', why=f'kit role {name} has no take for this cue')
            missing.append(row)
            rows.append(row)
            continue
        row.update(status='placed', take=tk['file'], midi=tk.get('midi'), spec=spec, tk=tk, kp=kp,
                   cue_t=kp['t'] if kp else t, pan_in=float(e.get('pan', 0.0)), dur=dur, apex=e.get('apexFrac'))
        rows.append(row)

    # ---- keys: never closer than max(60 ms, min_gap_ms)
    last_key = None
    for row in rows:
        if row.get('status') != 'placed' or row['kind'] != 'key':
            continue
        gap = max(KEY_FLAM_S, float(row['spec'].get('min_gap_ms') or 0) / 1000.0)
        if last_key is not None and row['cue_t'] - last_key['cue_t'] < gap - 1e-9:
            row.update(status='thinned', why=f"{(row['cue_t'] - last_key['cue_t']) * 1000:.0f} ms after the previous key "
                                              f"(the role's gap is {gap * 1000:.0f} ms)")
            continue
        last_key = row

    # ---- restraint: with a track, whole actions go quiet while any 10 s is too busy
    target = restraint_target(song, music)
    hushed = restrain(rows, events, song, runs_k, target, special, keep=on_seam if music else None)

    # ---- runs: 3+ of one role within 250 ms of each other, spaced to min_gap_ms
    runs = []
    by_role = {}
    for row in rows:
        if row.get('status') == 'placed' and row['kind'] != 'key':
            by_role.setdefault(row['for'], []).append(row)
    for role, rs in sorted(by_role.items()):
        grp = []
        for row in rs + [None]:
            if row is not None and (not grp or row['cue_t'] - grp[-1]['cue_t'] <= RUN_GAP_S):
                grp.append(row)
                continue
            if len(grp) >= 3:
                gap = float(grp[0]['spec'].get('min_gap_ms') or 0)
                spaced = MK.space_run([g['cue_t'] for g in grp], gap)
                rid = f'r{len(runs) + 1}'
                for g, t2 in zip(grp, spaced):
                    g['run'], g['moved_ms'] = rid, round((t2 - g['cue_t']) * 1000, 1)
                    g['cue_t'] = t2
                end_t = spaced[-1]
                acc = [x for x in rows if x.get('status') == 'placed' and is_accent(x.get('for'))
                       and 0 <= x['cue_t'] - end_t <= RUN_GAP_S]
                gaps = [round((b - a) * 1000) for a, b in zip(spaced[:-1], spaced[1:])]
                runs.append(dict(id=rid, role=role, count=len(grp), gap_ms=gap, gaps_ms=gaps,
                                 accent=acc[0]['for'] if acc else None, t=[r4(spaced[0]), r4(end_t)]))
                if not acc:
                    warnings.append(f"run {rid} ({len(grp)} x {role} at {spaced[0]:.2f}-{end_t:.2f} s) ends without an accent "
                                    f"({', '.join(ACCENT_AT_END)} or a variant such as land.light, within 250 ms): give the run its landing")
            grp = [row] if row is not None else []

    # ---- tuned budget
    cands = []
    for row in rows:
        if row.get('status') == 'placed' and row.get('midi') is not None:
            pri = (0 if special(row['cue_t']) or events[row['i']].get('structural') else 1,
                   0 if row['for'] in ('hit', 'drop') else 1, -row['weight'], row['cue_t'])
            cands.append((pri, row['cue_t'], row['i']))
    keep, tw = tuned_budget(cands)
    for row in rows:
        if row['i'] in tw:
            row.update(status='thinned', why=tw[row['i']])
    if tw:
        warnings.append(f'{len(tw)} pitched effect(s) thinned by the tuned budget (at most {TUNED_PER_4S} in 4 s): '
                        + ', '.join(f"{events[i]['kind']} f{events[i]['f']:g}" for i in sorted(tw)[:6]))

    # ---- sync points and starts
    for row in rows:
        if row.get('status') not in ('placed', 'carried'):
            continue
        spec = row['spec']
        off = float(events[row['i']].get('offset_ms', spec.get('offset_ms') or 0.0))
        cue_t = row.get('cue_t', row['cue_s'])
        row['offset_ms'] = off
        row['sync_s'] = r4(cue_t + off / 1000.0)
        if row['status'] == 'placed':
            sp = dict(spec, offset_ms=off)
            row['align'] = spec.get('align') or 'onset'
            row['start_s'] = MK.place(row['tk'], sp, cue_t)

    # ---- the arc ride: the body never under its opening once the product starts, building into the reveal
    ride_rep = None
    if music and getattr(song, 'arc_ride', True):
        firsts = [r['cue_s'] for r in rows if r.get('status') in ('placed', 'carried') and r.get('action') in MOMENT_ACTIONS + (
            'press', 'appear', 'type', 'detent', 'swipe', 'slide')]
        p0 = min(firsts) if firsts else None
        end_t = ending.get('bed_stops_film_s') or lockup_t or song.dur
        keep = list(stop_spans)
        if payoff_t is not None:
            keep.append((payoff_t - 2 * 4 * beat_s, payoff_t))  # the break before the reveal stays as the edit made it
        song.ride, ride_rep = arc_ride(bed, song, p0, payoff_t, end_t, 4 * beat_s, keep)

    # ---- stop-downs
    stops = []
    if music:
        targets = []
        for row in rows:
            if row.get('status') not in ('placed', 'carried'):
                continue
            spec = special(row['cue_s']) or bool(events[row['i']].get('structural'))
            if row.get('for') in sd['before']:
                if row['for'] == 'swell' and row['weight'] < 1.0 and not spec:
                    continue  # a light swell blooms over the bed: no stop-down before it
                targets.append(dict(t=row['sync_s'], w=row['weight'], id=f"{row['kind']}:{row['id'] or row['i']}",
                                    row=row, special=spec))
            elif row['weight'] >= MOMENT_W and (row.get('action') in MOMENT_ACTIONS or spec) and row['kind'] not in ('key', 'text', 'tick'):
                rank = MOMENT_ACTIONS.index(row['action']) if row.get('action') in MOMENT_ACTIONS else 0
                targets.append(dict(t=row['sync_s'], w=row['weight'], id=f"{row['kind']}:{row['id'] or row['i']}",
                                    row=row, special=spec, moment=rank))
        for a in song.stopdowns.get('add', []):
            targets.append(dict(t=song.T(a['at'] if isinstance(a, dict) else a), w=float((a or {}).get('weight', 1.0))
                                if isinstance(a, dict) else 1.0, id=f'add:{a}', row=None, special=True,
                                stop=isinstance(a, dict) and a.get('depth') == 'stop'))
        skip = set(str(x) for x in song.stopdowns.get('skip', []))
        targets = [x for x in targets if x['id'] not in skip and (x['row'] is None or str(x['row']['id']) not in skip)]
        if not song.stopdowns.get('auto', True):
            targets = [x for x in targets if x['row'] is None]
        # the stop-downs first (hits, drops, swells, the payoff and the lockup), then the moments by importance
        targets.sort(key=lambda x: (not x['special'], 'moment' in x, x.get('moment', 0), -x['w'], x['t']))
        L = stop_length(beat_s, sd['length'])
        Lm = stop_length(beat_s, MOMENT_LEN)
        accepted = []
        for x in targets:
            t = x['t']
            rec = dict(**{'for': x['id']}, t=r4(t))
            if ending.get('mode') in ('hit', 'stop') and t > ending['bed_stops_film_s'] + 0.05:
                rec.update(status='ending', why='after the hit ending the bed is released: nothing to step down')
                stops.append(rec)
                continue
            if any(a - 1e-9 <= t < b for a, b, _, sc in song.silences):
                rec.update(status='silence', why='inside a score.json silence')
                stops.append(rec)
                continue
            near = [s for s in accepted if abs(s['t'] - t) < STOP_MIN_GAP_S]
            win = [s for s in accepted if abs(s['t'] - t) < 10.0]
            dense = any(sum(1 for s in win + [dict(t=t)] if a <= s['t'] < a + 10.0) > STOP_MAX_PER_10S
                        for a in [s['t'] for s in win + [dict(t=t)]])
            if near or dense:
                rec.update(status='skipped', why=('within 2 s of the stop-down before ' + near[0]['for']) if near else
                           f'at most {STOP_MAX_PER_10S} stop-downs in any 10 s')
                stops.append(rec)
                continue
            Lx = L
            depth = 6.0 + 4.0 * float(np.clip(x['w'] - 0.5, 0, 1.5))
            depth = float(np.clip(depth, *sd['depth']))
            if 'moment' in x and not x['special']:
                Lx, depth = Lm, MOMENT_DB + (1.0 if x['w'] >= 0.8 else 0.0)
                rec['moment'] = x['row'].get('action') or x['row']['kind']
            if x.get('stop'):
                depth, Lx = 60.0, float(np.clip(song.stopdowns.get('stop_len', 0.4), 0.2, 0.7))
            d0 = track_dip(bed, t, Lx)
            added = round(float(np.clip(depth - d0, 0.0, STOP_ADD_MAX)), 2)
            rec.update(status='arrangement' if added == 0 else 'added', **{'from': r4(t - Lx)}, length_s=r4(Lx),
                       depth_db=round(depth, 2), track_dip_db=round(d0, 2), added_db=added)
            if ending.get('under_from_s') is not None and abs(t - float(ending['under_from_s'])) <= 0.05:
                rec['through'] = END_UNDER_DB  # the lockup before a later bar line: the bed stays under from it (score.py settle_ending)
            elif ending.get('mode') in ('hit', 'stop') and abs(t - ending['bed_stops_film_s']) <= 0.05:
                # the lockup on a hit ending: the music breathes, its last downbeat stays under the hit while it is
                # released, and its chord rings out through the hall (score.py ring_bed): the hit lands clear, the music resolves
                depth = float(sd['depth'][1])
                rec.update(through=END_UNDER_DB, added_db=round(max(added, depth), 2), depth_db=round(depth, 2), status='added')
            accepted.append(rec)
            stops.append(rec)
        stops.sort(key=lambda s: s['t'])
        if not sd['from_lock']:
            warnings.append('the kit lock has no mix.stop_down: the house ranges (6-12 dB, 0.3-0.5 s) were used')
    active = [s for s in stops if s.get('status') in ('added', 'arrangement')]

    # ---- gains
    played = bed_as_played(bed, song, active) if music else None
    levels = []
    for row in rows:
        if row.get('status') != 'placed':
            continue
        spec, tk = row['spec'], row['tk']
        w = row['weight']
        wdb = float(np.clip(20 * math.log10(max(w, 1e-3)), *WEIGHT_DB))
        if music:
            own = next((k for k, s in enumerate(active) if s['for'].endswith(f":{row['id'] or row['i']}")
                        and abs(s['t'] - row['sync_s']) < 1e-3), None)
            ref = played if own is None else bed_as_played(bed, song, active, skip=own)
            # inside one of the track's stops, after a stop ending or in a silence there is no bed, whatever the
            # second before still holds (the element sounds in the near-silence)
            quiet = in_spans(row['sync_s'], stop_spans) or any(a - 1e-9 <= row['sync_s'] < b for a, b, _, _ in song.silences)
            lv = None if quiet else safe_bed_level(ref, row['sync_s'])
            row['bed_lufs'] = None if lv is None else round(lv, 2)
            row['bed_read'] = 'no bed (a stop, the ending or a silence)' if quiet else 'pre-dip' if own is not None else 'as played'
            if lv is not None:
                levels.append(lv)
        row['weight_db'] = round(wdb, 2)
    ref_bed = float(np.median(levels)) if levels else None
    # the typing dynamics of each run, centred: the run's median key sits on the role's level
    run_dyn = {}
    for row in rows:
        kp = row.get('kp')
        if row.get('status') == 'placed' and kp:
            ri = next((k for k, rr in enumerate(runs_k) if row['i'] in rr['idx']), -1)
            dens = kp['gain'] / (SC.TYPING_GAIN[kp['style']] * SC.KEY_KIND_GAIN.get(kp['kind'], 1.0))
            row['key_dyn'] = 20 * math.log10(max(kp['level'], 1e-4)) + 20 * math.log10(max(dens, 1e-4))
            run_dyn.setdefault(ri, []).append(row['key_dyn'])
            row['key_run'] = ri
    run_mid = {k: float(np.median(v)) for k, v in run_dyn.items()}
    for row in rows:
        if row.get('status') != 'placed':
            continue
        spec, tk, kp = row['spec'], row['tk'], row.get('kp')
        extra = 0.0
        if kp:  # the typing plan's word dynamics and density, centred on the run (the role's own bed_db sets
            # space and return)
            extra = row['key_dyn'] - (run_mid.get(row['key_run'], 0.0) if music else 0.0)
            if kp['style'] == 'muted':
                extra -= 10.0
        if music and spec.get('bed_db') is not None and tk.get('l50_lufs') is not None:
            if row.get('bed_lufs') is not None:
                g = MK.gain_db(tk, spec, row['bed_lufs'], ceiling_db=99.0)
                row['level'] = 'bed'
            else:
                g = MK.gain_db(tk, spec, ref_bed, ceiling_db=99.0) + quiet_db if ref_bed is not None \
                    else float(spec.get('level_db') or 0.0)
                row['level'] = 'no bed: ref_bed + quiet_db' if ref_bed is not None else 'level_db (no bed anywhere)'
        else:
            g = float(spec.get('level_db') or 0.0)
            row['level'] = 'level_db'
            if music:
                warnings.append(f"{row['role']} plays at level_db in a film with a track: give it the bed_db of the launch "
                                'role of the same kind (kit.py check)')
        g += row['weight_db'] + extra
        cap = CEILING_DB - float(tk.get('peak_db') if tk.get('peak_db') is not None else -1.0)
        row['clamped'] = bool(g > cap + 1e-9)
        row['gain_db'] = round(min(g, cap), 2)
        row['bed_db'] = spec.get('bed_db')
        wide_role = spec.get('width') is not None
        if row['kind'] in WIDE_KINDS:
            row['width'], row['pan'] = 'travel', round(float(np.clip(row['pan_in'], -1, 1)) * 0.6, 3)
        elif wide_role:
            row['width'], row['pan'] = float(spec['width']), 0.0
        else:
            row['width'], row['pan'] = None, round(SFX_PAN * float(np.clip(row['pan_in'] / 0.8, -1, 1)), 3)
        if row.get('midi') is not None and float(tk.get('dur_s') or 0) > TONAL_MAX_S:
            row['trim_s'] = TONAL_MAX_S

    # ---- report: density, one gesture
    sounded = [r for r in rows if r.get('status') == 'placed']
    pts = []
    key_runs = set()
    for r in sounded:
        if r['kind'] == 'key':
            ri = next((k for k, rr in enumerate(runs_k) if r['i'] in rr['idx']), None)
            if ri in key_runs:
                continue
            key_runs.add(ri)
        pts.append(r['sync_s'])
    pts.sort()
    dens = []
    if pts:
        for a in np.arange(0.0, max(0.01, song.dur - 10.0) + 1e-9, 0.5):
            dens.append(sum(1 for p in pts if a <= p < a + 10.0) * (10.0 / min(10.0, song.dur)))
    band = density_band(kit) if music else None
    density = dict(median=round(float(np.median(dens)), 1) if dens else 0.0, max=round(float(max(dens)), 1) if dens else 0.0,
                   band=list(band) if band else None, count=len(pts))
    lo = 0 if song.dur <= STING_S else band[0] if band else 0  # a sting carries one kit element: no floor
    if band and dens and not lo <= density['median'] <= band[1]:
        warnings.append(f"density {density['median']} effects per 10 s is outside the music-led band {band[0]}-{band[1]}")
    gesture = []
    if music:
        for r in sounded:
            if r['for'] in HEAVY_GESTURE:
                acc = [a for a in accents if a['db'] >= CARRY_DB and abs(a['t'] - r['sync_s']) <= GESTURE_S]
                if acc:
                    gesture.append(dict(id=r['id'], role=r['role'], t=r['sync_s'], accent_t=acc[0]['t'], accent_db=acc[0]['db']))
                    warnings.append(f"{r['role']} {r['id']} at {r['sync_s']:.3f} s doubles the track's accent at "
                                    f"{acc[0]['t']:.3f} s: let the track carry it or move it")
    # ---- takes heard twice within REPEAT_S (keys keep one take per key identity)
    repeats, heard = [], {}
    for r in sorted(sounded, key=lambda x: x['cue_t']):
        if r['kind'] == 'key':
            continue
        ident = K.take_id(r['tk'])
        if ident in heard and r['cue_t'] - heard[ident][0] < K.REPEAT_S - 1e-9:
            n_t = len((kit.roles.get(r['role']) or {}).get('takes') or [])
            repeats.append(dict(id=r['id'], role=r['role'], take=r['take'], t=r4(r['cue_t']), after=heard[ident][1],
                                gap_s=r4(r['cue_t'] - heard[ident][0])))
            warnings.append(f"{r['role']} {r['id']} at {r['cue_t']:.2f} s plays the take {r['take']} heard "
                            f"{r['cue_t'] - heard[ident][0]:.2f} s before ({n_t} take(s) for the note or role): give the role "
                            'more takes (kit.json "takes")')
        heard[ident] = (r['cue_t'], r['id'])
    # ---- the cast: which sound each action played
    cast_rep = None
    if getattr(kit, 'cast', None):
        cast_rep = {}
        for r in sounded:
            a = r.get('action') or '-'
            c = cast_rep.setdefault(a, dict(sounds=set(), roles=set(), placed=0))
            c['sounds'].add((kit.roles.get(r['role']) or {}).get('sound'))
            c['roles'].add(r['role'])
            c['placed'] += 1
        cast_rep = {a: dict(sounds=sorted(x for x in c['sounds'] if x), roles=sorted(c['roles']), placed=c['placed'])
                    for a, c in sorted(cast_rep.items())}
    elif music and sounded:
        warnings.append('the kit is not cast for this film: every action of a kind plays one sound (python3 '
                        'scripts/audio/kit.py cast, then npm run kit)')
    for r in rows:
        if r.get('status') in ('off', 'thinned', 'carried', 'missing'):
            silent.append(dict(i=r['i'], id=r['id'], kind=r['kind'], f=r['f'], role=r.get('role'), status=r['status'],
                               why=r.get('why'), action=r.get('action')))
    out_events = []
    for r in rows:
        if r.get('status') != 'placed':
            continue
        out_events.append(dict(i=r['i'], id=r['id'], kind=r['kind'], role=r['role'], action=r.get('action'),
                               generic=r.get('for'), f=r['f'], cue_s=r['cue_s'],
                               take=r['take'], midi=r.get('midi'), align=r['align'], offset_ms=r['offset_ms'],
                               start_s=r['start_s'], sync_s=r['sync_s'], bed_lufs=r.get('bed_lufs'),
                               bed_read=r.get('bed_read'), bed_db=r.get('bed_db'), level=r['level'],
                               gain_db=r['gain_db'], weight_db=r['weight_db'], clamped=r['clamped'],
                               width=r['width'], pan=r['pan'], run=r.get('run'), trim_s=r.get('trim_s'),
                               dur_s=r.get('dur'), apex=r.get('apex'), status='placed'))
    lock = getattr(kit, 'lock', None) or {}
    plan = {'plan': 1, 'kit': dict(name=lock.get('name'), earshot=lock.get('earshot'), bank=lock.get('bank'),
                                   source=getattr(kit, 'source', None)),
            'fps': fps, 'seconds': round(song.dur, 4),
            'bed': (dict(source='track', record=(song.music_cfg or {}).get('licence'), staged_lufs=song.bed_lufs,
                         ref_bed_lufs=None if ref_bed is None else round(ref_bed, 2), quiet_db=quiet_db,
                         ending=ending.get('mode')) if music else dict(source='none')),
            'events': out_events, 'silent': silent, 'stopdowns': stops, 'runs': runs,
            'ride': dict(ride_rep or {}, points=[[round(a, 3), b] for a, b in (getattr(song, 'ride', None) or [])]) if music else None,
            'stop_down': dict(length=list(sd['length']), depth=list(sd['depth']), before=sd['before']),
            'density_per_10s': density, 'one_gesture': gesture, 'warnings': warnings,
            'restraint': dict(target=target, silenced=hushed), 'repeats': repeats, 'cast': cast_rep,
            'missing': [dict(i=r['i'], id=r['id'], kind=r['kind'], f=r['f'], why=r['why']) for r in missing],
            'draft': bool(draft)}
    say(f"plan: {len(out_events)} placed, {len(silent)} silent, {len([s for s in stops if s.get('status') == 'added'])} "
        f"stop-down(s) added, density {density['median']}/10 s")
    return plan


def sounded_cues(cues, plan):
    """cues.json with only the events that received a sound, each f moved to its intended sound time (the
    cue plus the role's offset, at the take's align point), and the silent ones listed apart."""
    fps = float(cues['fps'])
    ev = sorted(cues.get('events', []), key=lambda e: e['f'])
    out = dict(cues)
    rows = []
    for p in plan['events']:
        e = dict(ev[p['i']])
        e['cue_f'] = e['f']
        e['f'] = round(p['sync_s'] * fps, 3)
        e['role'] = p['role']
        if p.get('action'):
            e['action'] = p['action']
        e['offset_ms'] = p['offset_ms']
        e['align'] = p['align']
        rows.append(e)
    out['events'] = sorted(rows, key=lambda e: e['f'])
    out['silent'] = plan['silent']
    out['sounded'] = dict(plan=1, intended='cue + offset_ms at the align point')
    return out


def write_json(path, obj):
    os.makedirs(os.path.dirname(os.path.abspath(path)) or '.', exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(json.dumps(obj, indent=1, ensure_ascii=False) + '\n')


def main(argv=None):
    ap = argparse.ArgumentParser(description="The film's effects plan: roles, takes, starts, gains over the bed, "
                                             'stop-downs (out/qa/sfx_plan.json, out/qa/cues_sounded.json).')
    ap.add_argument('--cues', default='out/cues.json')
    ap.add_argument('--score', default='audio/score.json')
    ap.add_argument('--kit', help='the kit (default: score.json sfx.kit, else audio/kit.json)')
    ap.add_argument('--takes', help='the rendered takes (default: the kit path without .json)')
    ap.add_argument('--out', default='out/qa/sfx_plan.json')
    ap.add_argument('--sounded', default='out/qa/cues_sounded.json')
    ap.add_argument('--draft', action='store_true', help='plan a draft (missing roles stay listed, not an error)')
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args(argv)
    import score as SC
    try:
        cues = SC.read_json(a.cues, 'cues')
        score = SC.read_json(a.score, 'score')
        song = SC.Song(score, cues)
        base_dir = os.path.dirname(os.path.abspath(a.score))
        kit_path = SC.locate(a.kit or song.kit_path, base_dir)
        takes = K.takes_dir_for(kit_path, SC.locate(a.takes or song.kit_takes, base_dir) if (a.takes or song.kit_takes) else None)
        st = K.kit_state(kit_path, takes)
        if not st['lock']:
            raise PlanError(f"no rendered kit to plan with ({st['why']}): npm run kit (kit.py render), or vendor the takes", 2)
        if st['status'] == 'stale':
            raise PlanError(f"the takes are stale ({st['why']}): render the kit again (npm run kit)")
        kit = K.Kit(st['lock'], takes, st['status'], cast=(st['kit'] or {}).get('cast'))
        bed, edit = SC.load_music(song, base_dir, int(round(song.dur * SR)) + 4 * SR)
        plan = make(cues, song, kit, bed, edit, a.draft, None if a.quiet else (lambda s: print(s)))
    except (PlanError, SC.ScoreError, K.KitError) as e:
        print(f'plan.py: {e}', file=sys.stderr)
        return getattr(e, 'code', 1)
    write_json(a.out, plan)
    write_json(a.sounded, sounded_cues(cues, plan))
    if not a.quiet:
        for w in plan['warnings']:
            print(f'  warning: {w}')
        for q in plan['restraint']['silenced']:
            print(f"  restraint: {q['action']} quiet ({q['events']} effect(s); the 10 s from {q['window_s']:.1f} s held more "
                  f"than {plan['restraint']['target']:g})")
        for act, c in (plan.get('cast') or {}).items():
            print(f"  cast: {act}: {', '.join(c['sounds'])} ({c['placed']} placed)")
        for s in plan['stopdowns']:
            print(f"  stop-down for {s['for']} at {s['t']:.3f} s: {s['status']}"
                  + (f" ({s['length_s']:.3f} s, {s['depth_db']:g} dB, the track already dips {s['track_dip_db']:g}, "
                     f"added {s['added_db']:g})" if 'added_db' in s else f" ({s.get('why')})"))
        print(f"plan: wrote {a.out} and {a.sounded}")
    if plan['missing'] and not a.draft:
        for m in plan['missing']:
            print(f"  missing: {m['kind']} {m['id']} at f={m['f']:g}: {m['why']}", file=sys.stderr)
        print('plan.py: every effect comes from the earshot kit: add the missing roles to audio/kit.json and render it '
              '(npm run kit), or plan a --draft (never delivered)', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
