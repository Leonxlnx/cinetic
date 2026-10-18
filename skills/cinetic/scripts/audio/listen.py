#!/usr/bin/env python3
"""
listen.py: earshot's ears on the film's soundtrack, in one process so its models load once: the
timeline (every sound event with tags, loudness, the beat grid, and how each cue in out/cues.json is
answered: offset in ms, OK / near / no sound), the annotated sound sheet, and the critique scorecard
against measured launch films. Writes out/qa/listen.json and out/qa/sound_sheet.png.
With --kit it listens to the kit instead: one take per role, earshot's description and a forced choice
between the role's own description and cheap-synth alternatives (a laser zap, a video-game blip, an
8-bit sound, a rising synth whip) -> out/qa/kit_listen.json; a role an alternative outranks is flagged.

Usage (from the project root):
  python3 scripts/audio/listen.py [--audio public/audio/soundtrack.wav] [--cues out/cues.json]
                                  [--video out/preview.mp4] [--out out/qa] [--fast]
  python3 scripts/audio/listen.py --kit audio/kit.json [--takes audio/kit] [--json out/qa/kit_listen.json]
  --fast   skip the critique's slower model passes (AST labels, realness); the timeline still runs
  --python PY   the interpreter that has earshot (else score.json sfx.python, EARSHOT_PYTHON, this
                interpreter, earshot on PATH: kit.py finds it)

It runs itself again inside earshot's interpreter when that is another one. Without earshot, or when
its models cannot load, it writes the JSON with "listened": false and the reason, and exits 0:
listening informs the review and never blocks a build. Read the model-free numbers first (cue sync
offsets, loudness, the beat grid, the sheet); tags, verdicts and scores are hints from models.

Exit codes: 0 written (listened or not); 1 invalid arguments or a missing input file.
"""
import argparse
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROLE_QUERY = {
    'tick': 'a light tap or tick', 'tick.crisp': 'a short crisp tick', 'tock': 'a soft wooden knock',
    'hit': 'a single clean impact or struck note', 'land': 'a soft low thump', 'land.light': 'a light soft tap',
    'pop': 'a soft pop', 'whoosh.short': 'a short soft air whoosh', 'whoosh.long': 'a long air whoosh',
    'suck': 'a reverse whoosh', 'riser': 'a rising whoosh', 'drop': 'a deep sub bass drop',
    'key': 'a mechanical keyboard key press', 'key.space': 'a keyboard space bar press',
    'key.return': 'a keyboard enter key press', 'click': 'a soft click', 'click.confirm': 'a soft plucked note',
    'snap': 'a short firm knock', 'swell': 'a reverse swell', 'bell': 'a plucked or struck bell note',
    'text': 'a soft plucked or tapped note',
}
SLOP = ['a cheap synthesizer laser zap', 'a video game blip', 'an 8-bit chiptune sound', 'a rising synth whip sweep']


def write(path, obj):
    os.makedirs(os.path.dirname(os.path.abspath(path)) or '.', exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(json.dumps(obj, indent=1, ensure_ascii=False, default=str) + '\n')


def not_listened(path, why, **extra):
    rep = dict(listened=False, why=why, **extra)
    write(path, rep)
    print(f'listen: not listened: {why}\n  wrote {path}')
    return 0


# ------------------------------------------------------------------------------------------
# inside earshot's interpreter
# ------------------------------------------------------------------------------------------
def _soundtrack(a, api, earshot):
    rep = dict(listened=True, earshot=earshot.__version__, audio=a.audio, video=a.video, cues=a.cues, errors={})
    t0 = time.time()
    tl = None
    try:
        tl = api.timeline(a.audio, video=a.video, cues=a.cues)
    except Exception as e:  # noqa: BLE001  (models missing, offline, out of memory: say so, keep going)
        rep['errors']['timeline'] = f'{type(e).__name__}: {e}'
    if tl:
        lo = tl.get('loudness') or {}
        cues = (tl.get('sync') or {}).get('cues') or {}
        rep.update(summary=tl.get('summary'),
                   loudness={k: lo.get(k) for k in ('integrated_lufs', 'true_peak_dbtp', 'lra_lu', 'max_short_term',
                                                     'digital_silence') if k in lo},
                   sync=dict(stats=cues.get('stats'), items=[{k: it.get(k) for k in (
                       't', 'kind', 'id', 'offset_ms', 'status', 'event', 'event_prominence_db') if k in it}
                       for it in cues.get('items') or []]),
                   events=len(tl.get('events') or []), sections=tl.get('sections'),
                   music={k: (tl.get('music') or {}).get(k) for k in ('bpm', 'pulse_clarity') if k in (tl.get('music') or {})},
                   transcript=tl.get('text'))
        try:
            sh = api.sheet(a.audio, os.path.join(a.out, 'sound_sheet.png'), video=a.video, cues=a.cues, tl=tl)
            rep['sheet'] = (sh or {}).get('png') or os.path.join(a.out, 'sound_sheet.png')
        except Exception as e:  # noqa: BLE001
            rep['errors']['sheet'] = f'{type(e).__name__}: {e}'
    try:
        cr = api.critique(a.video or a.audio, video=a.video, use_ast=not a.fast, use_realness=not a.fast)
        rep['critique'] = dict(verdict=cr.get('verdict'), score=cr.get('score'), summary=cr.get('summary'),
                               actions=cr.get('actions'), tips=cr.get('tips'),
                               off=[{k: m.get(k) for k in ('metric', 'label', 'value', 'status', 'weight')}
                                    for m in cr.get('metrics') or [] if m.get('status') not in ('ok', 'n.a.')])
    except Exception as e:  # noqa: BLE001
        rep['errors']['critique'] = f'{type(e).__name__}: {e}'
    rep['seconds'] = round(time.time() - t0, 1)
    if not tl and 'critique' not in rep:
        rep['listened'] = False
        rep['why'] = '; '.join(f'{k}: {v}' for k, v in rep['errors'].items())
    return rep


def _kit(a, api, earshot):
    with open(os.path.join(a.takes, 'kit.lock.json'), encoding='utf-8') as fh:
        lock = json.load(fh)
    rep = dict(listened=True, earshot=earshot.__version__, kit=a.kit, takes=a.takes, bank=lock.get('bank'), roles={},
               flagged=[], errors={})
    t0 = time.time()
    for role, r in (lock.get('roles') or {}).items():
        if not r or not r.get('takes'):
            continue
        f = os.path.join(a.takes, r['takes'][0]['file'])
        q = ROLE_QUERY.get(role, ROLE_QUERY.get(role.split('.')[0], 'a sound effect'))
        try:
            m = api.match(f, q, alts=SLOP)
            d = api.describe(f)
            alts = sorted(m.get('alts') or [], key=lambda x: -x['p'])
            row = dict(sound=r['sound'], file=r['takes'][0]['file'], query=q, verdict=m.get('verdict'),
                       p_vs_alts=m.get('p_vs_alts'), top_alt=alts[0] if alts else None,
                       sounds_like=d.get('summary'))
            if alts and alts[0]['p'] > (m.get('p_vs_alts') or 0):
                rep['flagged'].append(f"{role} ({r['sound']}): '{alts[0]['query']}' outranks '{q}' "
                                      f"({alts[0]['p']:.2f} vs {m.get('p_vs_alts'):.2f})")
            rep['roles'][role] = row
        except Exception as e:  # noqa: BLE001
            rep['errors'][role] = f'{type(e).__name__}: {e}'
    rep['seconds'] = round(time.time() - t0, 1)
    if not rep['roles']:
        rep['listened'] = False
        rep['why'] = '; '.join(f'{k}: {v}' for k, v in rep['errors'].items()) or 'the kit has no rendered takes'
    return rep


def inner(a):
    import earshot
    from earshot import api
    rep = _kit(a, api, earshot) if a.kit else _soundtrack(a, api, earshot)
    write(a.json, rep)
    return 0


# ------------------------------------------------------------------------------------------
# the outer call: find earshot, run inside it
# ------------------------------------------------------------------------------------------
def cli_fallback(es, a):
    """earshot is only a bare `earshot` command (no interpreter beside it): one CLI call per step."""
    rep = dict(listened=True, earshot=es.version, audio=a.audio, video=a.video, cues=a.cues, errors={},
               note='earshot CLI calls, one process each (models load per call)')
    vid = ['--video', a.video] if a.video else []
    code, tl, err = es.run_json(['timeline', a.audio, '--cues', a.cues] + vid)
    if tl:
        rep.update(summary=tl.get('summary'), loudness=tl.get('loudness'), sync=(tl.get('sync') or {}).get('cues'),
                   transcript=tl.get('text'))
    else:
        rep['errors']['timeline'] = err.splitlines()[-1] if err else f'exit {code}'
    p = es.run(['sheet', a.audio, '--cues', a.cues, '-o', os.path.join(a.out, 'sound_sheet.png')] + vid)
    if p.returncode == 0:
        rep['sheet'] = os.path.join(a.out, 'sound_sheet.png')
    code, cr, err = es.run_json(['critique', a.video or a.audio] + (['--fast'] if a.fast else []))
    rep['critique'] = {k: cr.get(k) for k in ('verdict', 'score', 'summary', 'actions', 'tips')} if cr else None
    if not cr:
        rep['errors']['critique'] = err.splitlines()[-1] if err else f'exit {code}'
    return rep


def main(argv=None):
    ap = argparse.ArgumentParser(description="earshot's ears on the soundtrack (or, with --kit, on each kit role).")
    ap.add_argument('--audio', default='public/audio/soundtrack.wav')
    ap.add_argument('--cues', default='out/cues.json')
    ap.add_argument('--video', help='the rendered film (preview or master): cuts and picture sync join the timeline')
    ap.add_argument('--out', default='out/qa', help='folder for listen.json and sound_sheet.png')
    ap.add_argument('--fast', action='store_true', help="skip the critique's AST labels and realness")
    ap.add_argument('--kit', help='listen to this kit (audio/kit.json) instead of the soundtrack')
    ap.add_argument('--takes', help='the kit\'s rendered takes (default: the kit path without .json)')
    ap.add_argument('--score', default='audio/score.json')
    ap.add_argument('--json', help='the report (default out/qa/listen.json, or out/qa/kit_listen.json with --kit)')
    ap.add_argument('--python', help='the interpreter that has earshot')
    ap.add_argument('--inner', action='store_true', help=argparse.SUPPRESS)
    a = ap.parse_args(argv)
    a.json = a.json or os.path.join(a.out, 'kit_listen.json' if a.kit else 'listen.json')
    if a.kit:
        a.takes = a.takes or os.path.splitext(a.kit)[0]
    if a.inner:
        return inner(a)
    sys.path.insert(0, HERE)
    import kit as K
    if a.kit:
        if not os.path.isfile(os.path.join(a.takes, K.LOCK)):
            return not_listened(a.json, f'no rendered takes in {a.takes} (python3 scripts/audio/kit.py render)')
    else:
        for f in (a.audio, a.cues) + ((a.video,) if a.video else ()):
            if not os.path.isfile(f):
                print(f'listen.py: {f} not found (npm run cues, npm run audio first)', file=sys.stderr)
                return 1
    score_python = None
    if os.path.isfile(a.score):
        try:
            score_python = (K.read_json(a.score, 'score').get('sfx') or {}).get('python')
        except K.KitError:
            pass
    es, tried = K.find_earshot(a.python, score_python)
    if es is None:
        return not_listened(a.json, 'earshot not found', tried=tried, hint=K.INSTALL_HINT)
    print(f'listen: {es}; models load once (20-60 s)')
    os.makedirs(a.out, exist_ok=True)
    if es.python is None:
        if a.kit:
            return not_listened(a.json, 'kit listening needs earshot\'s interpreter (set EARSHOT_PYTHON)')
        write(a.json, cli_fallback(es, a))
    else:
        args = [es.python, os.path.abspath(__file__), '--inner', '--json', a.json, '--out', a.out, '--audio', a.audio,
                '--cues', a.cues] + (['--video', a.video] if a.video else []) + (['--fast'] if a.fast else []) + (
                ['--kit', a.kit, '--takes', a.takes] if a.kit else [])
        p = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if p.returncode != 0 or not os.path.isfile(a.json):
            last = (p.stderr.strip().splitlines() or ['no output'])[-1]
            return not_listened(a.json, f'earshot failed: {last}', earshot=str(es))
    with open(a.json, encoding='utf-8') as fh:
        rep = json.load(fh)
    if not rep.get('listened'):
        print(f"listen: not listened: {rep.get('why')}\n  wrote {a.json}")
        return 0
    if a.kit:
        print(f"listen: {len(rep['roles'])} roles in {rep.get('seconds')} s; "
              + (f"flagged: {'; '.join(rep['flagged'])}" if rep['flagged'] else 'no role outranked by a cheap-synth alternative'))
    else:
        st = (rep.get('sync') or {}).get('stats') or {}
        k1 = next((k for k in st if k.startswith('hit_within_1')), None) or next((k for k in st if k.startswith('hit_within_4')), None)
        print(f"listen: {(rep.get('summary') or '').split('. ')[0]}"
              + (f"; cues answered {100 * st[k1]:.0f}% within one frame, median |offset| {st.get('median_abs_offset_ms')} ms"
                 if k1 else '')
              + (f"; critique {rep['critique']['verdict']}" if rep.get('critique') else ''))
        for k, v in rep.get('errors', {}).items():
            print(f'  {k}: {v}')
    print(f'  wrote {a.json}' + (f" and {rep['sheet']}" if rep.get('sheet') else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main())
