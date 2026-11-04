#!/usr/bin/env python3
"""
credits.py: the licence gate and the credits of a film's music.

A music-led film plays one licensed, human-made, instrumental track. Its licence record
(audio/music/<name>.licence.json, written by `track.py add` and committed; the track itself never is)
says what the track is, where it came from, which licence covers it, and quotes the licence text as it
was read on the item's own page (licence_seen). This script checks those records and writes the
credits that travel with the film:

  out/deliver/CREDITS.md                every track that is heard: title, artist, source, licence and link,
                                        and the modifications sentence; the effects line, and each real
                                        effect the kit plays (kit.py real: audio/kit/real.lock.json) with
                                        its own record, checked like a track's
  out/deliver/CREDITS_description.txt   paste-ready lines for the post or the video description: the
                                        required CC BY credits, and a courtesy line for the others

Usage (from the project root):
  python3 scripts/audio/credits.py [--score audio/score.json] [--report out/qa/score.json] [--out out/deliver]
  python3 scripts/audio/credits.py --check audio/music/<name>.licence.json [--track FILE]   # one record
  python3 scripts/audio/credits.py --classify "CC BY 4.0"                                   # the classifier

Licences (the classifier):
  allowed    cc0, pd (public domain mark), cc-by-3.0, cc-by-4.0, mixkit-music (Mixkit Stock Music Free
             License), coverr (Coverr License), pixabay (Pixabay Content License); for a sound effect ("kind": "sfx") also mixkit-sfx
             (Mixkit Sound Effects Free License), which never covers a music track
  forbidden  NonCommercial, NoDerivatives (syncing to picture is an adaptation), ShareAlike, personal,
             editorial or custom licences, all rights reserved
  unknown    anything else: refused until the item's own page names a licence above
A record also fails when the track is marked AI generated, has a lead vocal, has no licence_seen quote
(read on the item's own page in this session, never filled in from memory or a list), when a CC BY
track has no credit line, or when the file's sha256 differs from the record (the file changed since
it was checked).

Exit codes: 0 every record valid and the credits written; 1 a record is missing, invalid or refused, or
the score report says it was a --draft build; 2 the score report is missing (render the soundtrack first).
"""
import argparse
import hashlib
import json
import os
import re
import sys

CC = 'https://creativecommons.org/'
ALLOWED = {
    'cc0': ('CC0 1.0 (public domain dedication)', CC + 'publicdomain/zero/1.0/', False),
    'pd': ('Public Domain Mark 1.0', CC + 'publicdomain/mark/1.0/', False),
    'cc-by-3.0': ('CC BY 3.0', CC + 'licenses/by/3.0/', True),
    'cc-by-4.0': ('CC BY 4.0', CC + 'licenses/by/4.0/', True),
    'mixkit-music': ('Mixkit Stock Music Free License', 'https://mixkit.co/license/#musicFree', False),
    'pixabay': ('Pixabay Content License', 'https://pixabay.com/service/license-summary/', False),
    'coverr': ('Coverr License', 'https://coverr.co/license', False),
    'mixkit-sfx': ('Mixkit Sound Effects Free License', 'https://mixkit.co/license/#sfxFree', False),
}
SFX_ONLY = ('mixkit-sfx',)  # licences that cover a sound effect, never a music track
FORBID = [  # (pattern on the lower-cased licence text, reason)
    (r'\bnc\b|non-?commercial', 'NonCommercial: a launch film is commercial use'),
    (r'\bnd\b|no-?deriv', 'NoDerivatives: cutting a track to picture is an adaptation'),
    (r'\bsa\b|share-?alike', 'ShareAlike: the whole film would have to be released under the same licence'),
    (r'sampling', 'a Sampling licence: retired and restrictive'),
    (r'personal', 'personal use only'),
    (r'editorial', 'editorial use only'),
    (r'custom|free with credit|social media only', 'a custom licence, not one the gate can trust'),
    (r'restricted', 'a restricted licence: read its terms (the free tiers are the ones allowed)'),
    (r'uppbeat', 'a free tier for individual use only'),
]
RESERVED = r'all rights reserved|\bcopyrighted\b'
EFFECTS_LINE = 'Sound effects made in code with earshot (https://github.com/Leonxlnx/earshot).'
DEFAULT_MODS = 'edited at bar lines for the film; levels adjusted'


class CreditError(Exception):
    pass


# ------------------------------------------------------------------------------------------
# the classifier
# ------------------------------------------------------------------------------------------
def classify(text):
    """licence text as read on a page or written in a record -> {id, status, name, url, attribution, reason}
    (status allowed | forbidden | unknown)."""
    s = (text or '').strip().lower().replace('_', ' ')
    if not s:
        return dict(id='none', status='unknown', name=None, url=None, attribution=False, reason='no licence given')
    for pat, why in FORBID:
        if re.search(pat, s):
            return dict(id='forbidden', status='forbidden', name=text, url=None, attribution=False, reason=why)
    key = None
    if re.search(r'\bcc0\b|cc-0|creative commons zero|publicdomain/zero|public domain dedication', s):
        key = 'cc0'
    elif 'public domain' in s or 'publicdomain/mark' in s:
        key = 'pd'
    elif 'mixkit' in s:
        key = 'mixkit-sfx' if ('sound effect' in s or 'sfx' in s) else 'mixkit-music' if 'music' in s or 'stock' in s else None
        if key is None:
            return dict(id='unknown', status='unknown', name=text, url=None, attribution=False,
                        reason='a Mixkit licence other than the Stock Music or Sound Effects Free License: name it')
    elif 'pixabay' in s:
        key = 'pixabay'
    elif 'coverr' in s:
        key = 'coverr'
    else:
        m = re.search(r'(?:\bby\b|attribution)[^0-9]{0,24}([1-4])(?:\.0)?', s)
        if m and m.group(1) in ('3', '4'):
            key = f'cc-by-{m.group(1)}.0'
        elif m:
            return dict(id='unknown', status='unknown', name=text, url=None, attribution=True,
                        reason=f'CC BY {m.group(1)}.0 is not on the house list: use a 3.0 or 4.0 track')
    if re.search(RESERVED, s):
        return dict(id='forbidden' if key is None else 'unknown', status='forbidden' if key is None else 'unknown',
                    name=text, url=None, attribution=False,
                    reason='all rights reserved' if key is None else 'names a free licence and "all rights reserved"')
    if key is None:
        return dict(id='unknown', status='unknown', name=text, url=None, attribution=False,
                    reason='not a licence the gate recognises: read the item page and record the exact licence')
    name, url, attr = ALLOWED[key]
    return dict(id=key, status='allowed', name=name, url=url, attribution=attr, reason=None)


# ------------------------------------------------------------------------------------------
# records
# ------------------------------------------------------------------------------------------
def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def read_json(path, what='record'):
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    except FileNotFoundError:
        raise CreditError(f'{what} not found: {path}') from None
    except json.JSONDecodeError as e:
        raise CreditError(f'{what} {path} is not valid JSON ({e})') from None


def track_path(rec, rec_path, track=None):
    """Where the record's audio file is: --track, else next to the record, else as written."""
    if track:
        return track
    d = os.path.dirname(os.path.abspath(rec_path))
    for p in (os.path.join(d, os.path.basename(str(rec.get('file') or ''))), str(rec.get('file') or '')):
        if p and os.path.isfile(p):
            return p
    return os.path.join(d, os.path.basename(str(rec.get('file') or '')))


def check_record(rec, rec_path='', track=None, need_file=True):
    """Problems (list of str, empty = valid) and notes of one licence record."""
    probs, notes = [], []
    if not isinstance(rec, dict) or rec.get('record') != 1:
        return [f'{rec_path}: not a licence record ("record": 1)'], notes
    for k in ('file', 'title', 'artist', 'source', 'page', 'licence', 'licence_id'):
        if not str(rec.get(k) or '').strip():
            probs.append(f'"{k}" is empty')
    c = classify(rec.get('licence'))
    lid = rec.get('licence_id')
    if c['status'] != 'allowed':
        probs.append(f'licence "{rec.get("licence")}" is {c["status"]}: {c["reason"]}')
    elif lid and lid != c['id']:
        probs.append(f'licence_id "{lid}" but the licence text classifies as "{c["id"]}"')
    if lid and lid not in ALLOWED:
        probs.append(f'licence_id "{lid}" is not allowed ({", ".join(ALLOWED)})')
    sfx = rec.get('kind') == 'sfx'
    if not sfx and (lid in SFX_ONLY or c['id'] in SFX_ONLY):
        probs.append(f'{c["name"]} covers sound effects, not a music track')
    if rec.get('ai_generated') is not False:
        probs.append('"ai_generated" must be false (a track the page marks as AI generated is refused; '
                     'null means unchecked)')
    if rec.get('vocals') is not False:
        probs.append('"vocals" must be false (an instrumental track; null means unchecked)')
    seen = rec.get('licence_seen') or {}
    if not (isinstance(seen, dict) and str(seen.get('quote') or '').strip() and str(seen.get('url') or '').strip()
            and re.match(r'^\d{4}-\d{2}-\d{2}$', str(seen.get('date') or ''))):
        probs.append('no licence_seen {quote, url, date}: quote the licence as read on the item\'s own page '
                     '(track.py add --seen-quote ... --seen-url ...); a record without it is unconfirmed')
    attr = c['attribution'] if c['status'] == 'allowed' else bool(rec.get('credit_required'))
    if attr and not str(rec.get('credit') or '').strip():
        probs.append('a CC BY track needs its credit line ("credit", in the composer\'s template form)')
    if attr and rec.get('credit_required') is False:
        probs.append('"credit_required" is false but the licence requires a credit')
    if rec.get('content_id') not in (None, 'not registered', 'registered', 'unknown'):
        notes.append(f'content_id "{rec.get("content_id")}": write "not registered", "registered" or "unknown"')
    if rec.get('content_id') == 'registered' and not rec.get('certificate'):
        notes.append('a Content ID registered track: keep its licence certificate ("certificate") for claims')
    p = track_path(rec, rec_path, track)
    if os.path.isfile(p):
        got = sha256_file(p)
        if rec.get('sha256') and got != rec['sha256']:
            probs.append(f'{os.path.basename(p)} changed since it was checked (sha256 {got[:12]}... vs the record\'s '
                         f'{str(rec["sha256"])[:12]}...): read the page again and re-record it (track.py add --force)')
        elif not rec.get('sha256'):
            probs.append('"sha256" is empty: track.py add hashes the file')
    elif need_file:
        probs.append(f'the track file {p} is not here (it stays out of git: put it back in audio/music/)')
    else:
        notes.append(f'the track file {p} is not here; its hash was not checked')
    return probs, notes


def credit_lines(rec):
    """(credits.md block, description line, required) for one valid record."""
    c = classify(rec.get('licence'))
    mods = str(rec.get('modifications') or DEFAULT_MODS).strip().rstrip('.')
    req = bool(c['attribution'])
    title, artist = rec.get('title'), rec.get('artist')
    md = [f'### "{title}" by {artist}', '',
          f'- Source: {rec.get("source")} ({rec.get("page")})',
          f'- Licence: {c["name"]} ({rec.get("licence_url") or c["url"]})',
          f'- Credit: {"required" if req else "not required (a courtesy line is given below)"}',
          f'- Edited for this film: {mods}.']
    if rec.get('credit'):
        md += ['', '```', str(rec['credit']).strip(), '```']
    if req:
        desc = str(rec['credit']).strip() + f'\nEdited for this film: {mods}.'
    else:
        desc = str(rec.get('credit') or f'Music: "{title}" by {artist} ({rec.get("source")})').strip()
    return '\n'.join(md), desc, req


def effect_records(score, base):
    """[(role, record path)] of the real effects the film's kit plays (audio/kit/real.lock.json beside the kit): each
    role's record and the records of its other sounds ("also": a second library sound), each record once"""
    kit = locate(str((score.get('sfx') or {}).get('kit') or 'audio/kit.json'), base)
    takes = (score.get('sfx') or {}).get('takes') or os.path.splitext(kit)[0]
    lock = os.path.join(locate(takes, base), 'real.lock.json')
    if not os.path.isfile(lock):
        return []
    roles = (read_json(lock, 'real effects') or {}).get('roles') or {}
    root = os.path.dirname(os.path.dirname(os.path.abspath(kit)))
    out, seen = [], set()
    for r, v in sorted(roles.items()):
        for lp in [v.get('licence')] + list(v.get('also') or []):
            if not lp:
                continue
            p = lp if os.path.isabs(lp) else os.path.join(root, lp)
            if os.path.normcase(os.path.abspath(p)) not in seen:
                seen.add(os.path.normcase(os.path.abspath(p)))
                out.append((r, p))
    return out


def effect_line(rec):
    """(credits.md line, description line) of one real effect's valid record"""
    c = classify(rec.get('licence'))
    return (f'- "{rec.get("title")}" ({rec.get("source")}, {rec.get("page")}): {c["name"]} ({rec.get("licence_url") or c["url"]}), '
            'no credit required',
            f'Sound effect: "{rec.get("title")}" ({rec.get("source")})')


def records_of(score):
    """The licence record paths a score.json names: music.licence (one track)."""
    m = score.get('music')
    if isinstance(m, dict) and m.get('licence'):
        return [m['licence']]
    return []


def locate(path, base):
    for p in (path, os.path.join(base, path), os.path.join(os.path.dirname(base), path)):
        if os.path.exists(p):
            return p
    return path


def write_credits(out, items, effects=True, real=()):
    os.makedirs(out, exist_ok=True)
    md = ['# Credits', '']
    desc = []
    if items:
        md += ['## Music', '']
        for block, line, _ in items:
            md += [block, '']
            desc.append(line)
    if effects:
        md += ['## Sound effects', '', EFFECTS_LINE, ''] + ([m for m, _ in real] + [''] if real else [])
        desc += [d for _, d in real]
    with open(os.path.join(out, 'CREDITS.md'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(md).rstrip() + '\n')
    text = '\n\n'.join(desc + ([EFFECTS_LINE] if effects else []))
    with open(os.path.join(out, 'CREDITS_description.txt'), 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(text + '\n')
    return text


def main(argv=None):
    ap = argparse.ArgumentParser(description='Check the music licence records and write the film\'s credits.')
    ap.add_argument('--score', default='audio/score.json')
    ap.add_argument('--report', default='out/qa/score.json', help="score.py's report (what was audible)")
    ap.add_argument('--out', default='out/deliver')
    ap.add_argument('--check', metavar='RECORD', help='check one licence record and exit')
    ap.add_argument('--track', help='--check: the track file (default: next to the record)')
    ap.add_argument('--classify', metavar='TEXT', help='print how a licence text classifies and exit')
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args(argv)
    if a.classify is not None:
        print(json.dumps(classify(a.classify), indent=1))
        return 0 if classify(a.classify)['status'] == 'allowed' else 1
    try:
        if a.check:
            rec = read_json(a.check)
            probs, notes = check_record(rec, a.check, a.track)
            for n in notes:
                print(f'  note: {n}')
            for p in probs:
                print(f'  problem: {p}')
            print(f"credits: {'ok' if not probs else 'REFUSED'}  {a.check}")
            return 0 if not probs else 1
        if not os.path.isfile(a.report):
            print(f'credits.py: no score report at {a.report}: render the soundtrack first (npm run audio)', file=sys.stderr)
            return 2
        rep = read_json(a.report, 'score report')
        if rep.get('draft'):
            print('credits.py: the soundtrack is a --draft build (placeholder voices): it is never delivered. '
                  'Render the kit (npm run kit) and the soundtrack again without --draft', file=sys.stderr)
            return 1
        score = read_json(a.score, 'score') if os.path.isfile(a.score) else {}
        base = os.path.dirname(os.path.abspath(a.score))
        paths = records_of(score)
        music = rep.get('music') or {}
        heard = str(music.get('source') or 'none')
        if heard.startswith('track') and not paths:
            rec = music.get('record')
            paths = [rec] if rec else []
            if not paths:
                print('credits.py: the soundtrack plays a track but no licence record is named (score.json '
                      'music.licence)', file=sys.stderr)
                return 1
        items, bad = [], []
        for p in paths:
            lp = locate(p, base)
            try:
                rec = read_json(lp)
            except CreditError as e:
                bad.append(str(e))
                continue
            probs, notes = check_record(rec, lp)
            if not a.quiet:
                for n in notes:
                    print(f'  note: {os.path.basename(lp)}: {n}')
            if probs:
                bad += [f'{os.path.basename(lp)}: {x}' for x in probs]
                continue
            items.append(credit_lines(rec))
        real = []
        for role, lp in effect_records(score, base):
            try:
                rec = read_json(lp)
            except CreditError as e:
                bad.append(f'{role}: {e}')
                continue
            probs, notes = check_record(rec, lp)
            if rec.get('kind') != 'sfx':
                probs.append('a real effect\'s record says "kind": "sfx"')
            if rec.get('credit_required'):
                probs.append('a real effect needs a licence without a credit')
            if probs:
                bad += [f'{role} ({os.path.basename(lp)}): {x}' for x in probs]
                continue
            real.append(effect_line(rec))
        if bad:
            for b in bad:
                print(f'  problem: {b}', file=sys.stderr)
            print(f'credits.py: REFUSED: {len(bad)} problem(s); no credits written', file=sys.stderr)
            return 1
        text = write_credits(a.out, items, real=real)
        if not a.quiet:
            print(f"credits: wrote {os.path.join(a.out, 'CREDITS.md')} and CREDITS_description.txt "
                  f"({len(items)} track(s){', CC BY credit required' if any(r for _, _, r in items) else ''})")
            print('--- paste under the post / into the video description ---')
            print(text)
        return 0
    except CreditError as e:
        print(f'credits.py: {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
