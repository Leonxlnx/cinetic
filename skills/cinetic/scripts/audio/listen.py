#!/usr/bin/env python3
"""
listen.py: earshot's ears on the film's soundtrack, in one process so its models load once: the
timeline (every sound event with tags, loudness, the beat grid, and how each cue is answered: offset in
ms, OK / near / no sound; the cues are out/qa/cues_sounded.json when plan.py or score.py wrote it, so a
role's designed offset and the deliberately silent cues count as intended), the annotated sound sheet,
and the critique scorecard against earshot's launch profile. Writes out/qa/listen.json and
out/qa/sound_sheet.png. Everything it prints and saves is in house wording.
With --track it listens to the licensed track alone (out/qa/listen_track.json): its tempo against
track.py's (a warning when neither earshot's tempo nor its double / half is within 1 %), possible vocals
(VOICE events, or a section where speech or singing passes 0.3: check the page or choose another track),
and genre and mood tags as hints for TREATMENT.md. It never blocks.
With --kit it listens to the kit instead: one take per role, earshot's description and a forced choice
between the role's own description and cheap-synth alternatives (a laser zap, a video-game blip, an
8-bit sound, a rising synth whip) -> out/qa/kit_listen.json; a role an alternative outranks is flagged.
A cast kit (kit.py cast) is judged against each role's action ("a card or a sheet landing on a table"),
and a real effect (kit.py real, audio/kit/real.lock.json) is judged like any role.

Usage (from the project root):
  python3 scripts/audio/listen.py [--audio public/audio/soundtrack.wav] [--cues out/cues.json]
                                  [--video out/preview.mp4] [--out out/qa] [--fast]
  python3 scripts/audio/listen.py --kit audio/kit.json [--takes audio/kit] [--json out/qa/kit_listen.json]
  python3 scripts/audio/listen.py --track audio/music/<file> [--analysis audio/music/<name>.track.json]
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
        fh.write(json.dumps(house(obj), indent=1, ensure_ascii=False, default=str) + '\n')


def house(obj):
    """earshot's lines in house wording (kit.house_wording): where its numbers came from is never quoted"""
    sys.path.insert(0, HERE)
    import kit as K
    return K.house_wording_deep(obj)


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
    real, cast = {}, {}
    try:
        with open(os.path.join(a.takes, 'real.lock.json'), encoding='utf-8') as fh:
            real = (json.load(fh) or {}).get('roles') or {}
    except (OSError, ValueError):
        pass
    try:
        with open(a.kit, encoding='utf-8') as fh:
            cast = ((json.load(fh) or {}).get('cast') or {}).get('roles') or {}
    except (OSError, ValueError):
        pass
    sys.path.insert(0, HERE)
    import actions as AC
    rep = dict(listened=True, earshot=earshot.__version__, kit=a.kit, takes=a.takes, bank=lock.get('bank'), roles={},
               flagged=[], errors={})
    t0 = time.time()
    for role, r in dict(lock.get('roles') or {}, **real).items():
        if not r or not r.get('takes'):
            continue
        f = os.path.join(a.takes, r['takes'][0]['file'])
        act = (cast.get(role) or {}).get('action') or r.get('action')
        q = AC.ACTIONS[act]['query'] if act in AC.ACTIONS else \
            ROLE_QUERY.get(role, ROLE_QUERY.get(role.split('.')[0], 'a sound effect'))
        try:
            m = api.match(f, q, alts=SLOP)
            d = api.describe(f)
            alts = sorted(m.get('alts') or [], key=lambda x: -x['p'])
            row = dict(sound=r['sound'], action=act, real=role in real, file=r['takes'][0]['file'], query=q,
                       verdict=m.get('verdict'),
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


def _track(a, api, earshot):
    """the bed alone: tempo, vocals, genre and mood hints (earshot timeline, high detail)"""
    rep = dict(listened=True, earshot=earshot.__version__, track=a.track, errors={}, warnings=[])
    t0 = time.time()
    try:
        tl = api.timeline(a.track, detail='high')
    except Exception as e:  # noqa: BLE001
        rep.update(listened=False, why=f'{type(e).__name__}: {e}')
        return rep
    m = tl.get('music') or {}
    tempo, alt = m.get('tempo') or m.get('bpm'), m.get('tempo_alt')
    rep['tempo'] = dict(earshot=tempo, earshot_alt=alt, pulse_clarity=m.get('pulse_clarity'), confidence=m.get('confidence'))
    ours = None
    if a.analysis and os.path.isfile(a.analysis):
        with open(a.analysis, encoding='utf-8') as fh:
            ours = (json.load(fh).get('tempo') or {}).get('bpm')
    rep['tempo']['track_py'] = ours
    if ours and tempo:
        cands = [x for x in (tempo, alt) if x] + [x * k for x in (tempo, alt) if x for k in (0.5, 2.0)]
        if not any(abs(c - ours) / ours <= 0.01 for c in cands):
            rep['warnings'].append(f'tempo: earshot hears {tempo}' + (f' (or {alt})' if alt else '') + f' BPM, track.py measured '
                                   f'{ours}: check the grid (track.py analyze --bpm N with a stated tempo)')
    voice = [e for e in tl.get('events') or [] if e.get('kind') == 'VOICE']
    secs = tl.get('sections') or []
    sung = []
    for sct in secs:
        ap = sct.get('ast') or {}
        sp = max(float(ap.get('Speech', 0) or 0), float(ap.get('Singing', 0) or 0))
        if sp > 0.3:
            sung.append(dict(t=sct.get('t') or sct.get('start'), share=round(sp, 2)))
    rep['vocals'] = dict(voice_events=len(voice), sections=sung, possible=bool(voice or sung))
    if voice or sung:
        rep['warnings'].append('possible vocals: check the page (instrumental only) or choose another track')
    rep['hints'] = [{k: sct.get(k) for k in ('t', 'start', 'end', 'genre', 'mood', 'label') if k in sct} for sct in secs][:12]
    rep['summary'] = tl.get('summary')
    rep['seconds'] = round(time.time() - t0, 1)
    return rep


def inner(a):
    import earshot
    from earshot import api
    rep = _kit(a, api, earshot) if a.kit else _track(a, api, earshot) if a.track else _soundtrack(a, api, earshot)
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
    ap.add_argument('--track', help='listen to the licensed track alone (tempo, vocals, genre hints)')
    ap.add_argument('--analysis', help="--track: track.py's analysis (default: <name>.track.json beside the track)")
    ap.add_argument('--takes', help='the kit\'s rendered takes (default: the kit path without .json)')
    ap.add_argument('--score', default='audio/score.json')
    ap.add_argument('--json', help='the report (default out/qa/listen.json, or out/qa/kit_listen.json with --kit)')
    ap.add_argument('--python', help='the interpreter that has earshot')
    ap.add_argument('--inner', action='store_true', help=argparse.SUPPRESS)
    a = ap.parse_args(argv)
    a.json = a.json or os.path.join(a.out, 'kit_listen.json' if a.kit else 'listen_track.json' if a.track else 'listen.json')
    if a.kit:
        a.takes = a.takes or os.path.splitext(a.kit)[0]
    if a.track and not a.analysis:
        import re as _re
        stem = _re.sub(r'[^a-z0-9]+', '_', os.path.splitext(os.path.basename(a.track))[0].lower()).strip('_')
        a.analysis = os.path.join(os.path.dirname(a.track) or '.', stem + '.track.json')
    if not a.kit and not a.track and not a.inner:
        sounded = os.path.join(a.out, 'cues_sounded.json')
        if a.cues == 'out/cues.json' and os.path.isfile(sounded) and os.path.isfile(a.cues) \
                and os.path.getmtime(sounded) >= os.path.getmtime(a.cues):
            a.cues = sounded  # the intended sound times: offsets and deliberate silences count
    if a.inner:
        return inner(a)
    sys.path.insert(0, HERE)
    import kit as K
    if a.kit:
        if not os.path.isfile(os.path.join(a.takes, K.LOCK)):
            return not_listened(a.json, f'no rendered takes in {a.takes} (python3 scripts/audio/kit.py render)')
    elif a.track:
        if not os.path.isfile(a.track):
            print(f'listen.py: {a.track} not found', file=sys.stderr)
            return 1
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
        if a.kit or a.track:
            return not_listened(a.json, 'kit and track listening need earshot\'s interpreter (set EARSHOT_PYTHON)')
        write(a.json, cli_fallback(es, a))
    else:
        args = [es.python, os.path.abspath(__file__), '--inner', '--json', a.json, '--out', a.out, '--audio', a.audio,
                '--cues', a.cues] + (['--video', a.video] if a.video else []) + (['--fast'] if a.fast else []) + (
                ['--kit', a.kit, '--takes', a.takes] if a.kit else []) + (
                ['--track', a.track, '--analysis', a.analysis or ''] if a.track else [])
        p = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')
        if p.returncode != 0 or not os.path.isfile(a.json):
            last = (p.stderr.strip().splitlines() or ['no output'])[-1]
            return not_listened(a.json, f'earshot failed: {last}', earshot=str(es))
    with open(a.json, encoding='utf-8') as fh:
        rep = json.load(fh)
    if not rep.get('listened'):
        print(f"listen: not listened: {rep.get('why')}\n  wrote {a.json}")
        return 0
    if a.track:
        tp = rep.get('tempo') or {}
        print(f"listen: the track at {tp.get('earshot')} BPM (track.py {tp.get('track_py')}); vocals "
              f"{'POSSIBLE' if (rep.get('vocals') or {}).get('possible') else 'none heard'}")
        for w in rep.get('warnings', []):
            print(f'  warning: {w}')
    elif a.kit:
        print(f"listen: {len(rep['roles'])} roles in {rep.get('seconds')} s; "
              + (f"flagged: {'; '.join(rep['flagged'])}" if rep['flagged'] else 'no role outranked by a cheap-synth alternative'))
    else:
        st = (rep.get('sync') or {}).get('stats') or {}
        k1 = next((k for k in st if k.startswith('hit_within_1')), None) or next((k for k in st if k.startswith('hit_within_4')), None)
        print(f"listen: {house((rep.get('summary') or '').split('. ')[0])}"
              + (f"; cues answered {100 * st[k1]:.0f}% within one frame, median |offset| {st.get('median_abs_offset_ms')} ms"
                 if k1 else '')
              + (f"; critique {house(rep['critique']['verdict'])}" if rep.get('critique') else ''))
        for k, v in rep.get('errors', {}).items():
            print(f'  {k}: {house(v)}')
    print(f'  wrote {a.json}' + (f" and {rep['sheet']}" if rep.get('sheet') else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main())
