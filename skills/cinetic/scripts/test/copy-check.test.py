#!/usr/bin/env python3
"""copy-check.test.py: regression tests for copy-check.py, the clear-copy gate.

  1. A clear launch script passes with no finding and a stranger reads what it is, what it does and what to do.
  2. Each rule fires on its own fault: long, keyword, vague, metaphor, slogan (an opener, "X, reimagined",
     a question), claims (two sentences, a list, two clauses), verb (an abstract noun alone), what-it-is
     (said too late, or never), name, together (two lines at once in cues; a declared swap passes), close
     (a warning; --strict fails it); --allow keeps a brand's own word.
  3. Update films: "[Name] [version]" first passes; a script without the version fails.
  4. The readers: a TREATMENT.md Script table (with an At column), out/cues.json (a build chain is one line,
     ui and name entries set apart, the end card apart), --stdin, a .txt with times; --json carries the lines,
     the findings and the stranger's read.
  5. Every example script the skill ships passes: the Script tables in assets/TREATMENT.md, the good scripts in
     references/copy-and-type.md, references/update-films.md and references/worked-example.md; the bad ones fail.

Usage (from the skill root):  python3 scripts/test/copy-check.test.py [--verbose]
Exit codes: 0 all pass, 1 a test failed.
"""
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.abspath(os.path.join(HERE, '..', '..'))
CC = os.path.join(SKILL, 'scripts', 'copy-check.py')
VERBOSE = '--verbose' in sys.argv
TMP = tempfile.mkdtemp(prefix='cinetic-copy-')
failed = 0


def result(ok, name, detail=''):
    global failed
    failed += 0 if ok else 1
    print(f'{"pass" if ok else "FAIL"}  {name}{"  (" + detail + ")" if detail and (not ok or VERBOSE) else ""}')


def run(args, stdin=None):
    env = {**os.environ, 'PYTHONUTF8': '1'}
    r = subprocess.run([sys.executable, CC, *args, '--json'], input=stdin, capture_output=True, text=True, encoding='utf-8', env=env)
    try:
        return r.returncode, json.loads(r.stdout)
    except ValueError:
        return r.returncode, {'findings': [], 'error': (r.stderr or r.stdout).strip()[:300]}


def script(lines, name='s.txt'):
    p = os.path.join(TMP, name)
    open(p, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    return p


def rules(rep, sev=None):
    return sorted({f['rule'] for f in rep.get('findings', []) if sev is None or f['severity'] == sev})


GOOD = ['Tessel is a calendar for busy teams.', 'It moves a meeting when plans change.',
        'It finds one free hour for everyone.', 'Your mornings stay blocked.', 'Tessel is out now at tessel.app.']

# 1. a clear script
code, rep = run([script(GOOD)])
st = rep.get('stranger', {})
result(code == 0 and not rep.get('findings') and rep.get('name') == 'Tessel', 'a clear launch script passes with no finding', json.dumps(rep.get('findings'))[:300])
result(st.get('is') == GOOD[0] and len(st.get('does', [])) == 3 and 'tessel.app' in (st.get('todo') or '') and GOOD[0] in st.get('reads', ''),
       'a stranger reads what it is, what it does and what to do', json.dumps(st)[:300])

# 2. each rule on its own fault (the clear script with one line changed)
CASES = [
    ('long', 2, 'It moves every meeting when your plans change today.'),
    ('keyword', 2, 'Meetings.'),
    ('vague', 2, 'It unlocks a seamless week.'),
    ('metaphor', 2, 'It works like a second brain.'),
    ('slogan', 2, 'Scheduling, reimagined.'),
    ('slogan', 2, 'Meet the calendar that thinks.'),
    ('slogan', 2, 'Tired of double bookings?'),
    ('claims', 2, 'It moves meetings. It blocks focus.'),
    ('claims', 2, 'It books rooms, sends invites, and takes notes.'),
    ('claims', 2, 'It moves meetings and blocks your mornings.'),
    ('verb', 2, 'Total control.'),
]
for rule, at, text in CASES:
    lines = list(GOOD)
    lines[at - 1] = text
    code, rep = run([script(lines)])
    got = [f for f in rep.get('findings', []) if f['rule'] == rule and f.get('line') == at]
    result(code == 1 and bool(got), f'{rule}: "{text}" fails', ', '.join(rules(rep)) or rep.get('error', ''))
late = ['Your week does not fit.', 'Three meetings want one hour.', 'Tessel is a calendar for busy teams.'] + GOOD[1:]
code, rep = run([script(late)])
msg = ' '.join(f['message'] for f in rep.get('findings', []) if f['rule'] == 'what-it-is')
result(code == 1 and 'line 3' in msg, 'what-it-is: said on line 3, after 3 s, fails and names the line', msg[:200])
code, rep = run([script(['Your week does not fit.', 'Meetings move on their own.', 'Your mornings stay blocked.'])])
result(code == 1 and {'what-it-is', 'name'} <= set(rules(rep)), 'what-it-is and name: a script that never says what or which product fails', ', '.join(rules(rep)))
code, rep = run([script(GOOD[:4])])
result(code == 0 and rules(rep, 'warn') == ['close'], 'close: no name and URL at the end is a warning', ', '.join(rules(rep)))
code, rep = run([script(GOOD[:4]), '--strict'])
result(code == 1, 'close: --strict fails the warning', str(code))
lines = list(GOOD)
lines[1] = 'It moves meetings like magic.'
code, rep = run([script(lines), '--allow', 'magic'])
result(code == 0, '--allow keeps a word the brand voice owns', ', '.join(rules(rep)))

# 3. update films
code, rep = run([script(['Plumb 2.4 is out.', 'Approvals take one tap.', 'Replies land in the thread.', 'Counts update while you watch.']), '--format', 'update'])
result(code == 0 and not rep.get('findings'), 'update: "[Name] [version]" first, one result a line, passes', ', '.join(rules(rep)))
code, rep = run([script(['Plumb is better now.', 'Approvals take one tap.', 'Replies land in the thread.']), '--format', 'update'])
result(code == 1 and 'what-it-is' in rules(rep), 'update: no version in the first 3 s fails', ', '.join(rules(rep)))

# 4. the readers
md = os.path.join(TMP, 'TREATMENT.md')
open(md, 'w', encoding='utf-8').write('**Spec:** `1920x1080@60, 20s, pace: calm, format: launch`\n\n## 0b. Script\n| # | Role | Line | Words | At |\n|---|---|---|---|---|\n'
                                      + ''.join(f'| {i + 1} | x | {l} | {len(l.split())} | {i * 3.2:.1f} |\n' for i, l in enumerate(GOOD)) + '\n## 1. Inventory\n')
code, rep = run([md])
result(code == 0 and rep.get('timed') and len(rep.get('lines', [])) == 5 and rep.get('format') == 'launch', 'TREATMENT.md: the Script table, its At column and the Spec format are read', json.dumps(rep)[:200])
cues = {'fps': 60, 'total': 1200, 'copy': [
    {'id': 'a.1', 'text': 'Tessel moves', 'in': 0, 'resolved': 40, 'out': 300, 'chain': 'a', 'mode': 'build'},
    {'id': 'a.2', 'text': 'your meetings.', 'in': 120, 'resolved': 160, 'out': 300, 'chain': 'a', 'mode': 'build'},
    {'id': 'b', 'text': 'Your mornings stay free.', 'in': 280, 'resolved': 340, 'out': 500},
    {'id': 'c', 'text': 'Plans fit by Monday.', 'in': 520, 'resolved': 580, 'out': 700},
    {'id': 'cmd', 'text': 'tessel move --all', 'kind': 'ui', 'in': 520, 'resolved': 540, 'out': 700},
    {'id': 'name', 'text': 'Tessel', 'kind': 'name', 'in': 900, 'resolved': 960, 'out': 1200},
    {'id': 'url', 'text': 'tessel.app', 'kind': 'ui', 'in': 920, 'resolved': 960, 'out': 1200}]}
p = os.path.join(TMP, 'cues.json')
open(p, 'w', encoding='utf-8').write(json.dumps(cues))
code, rep = run([p, '--format', 'launch'])
texts = [l['text'] for l in rep.get('lines', [])]
tog = [f for f in rep.get('findings', []) if f['rule'] == 'together']
result(texts[:1] == ['Tessel moves your meetings.'] and len(texts) == 3 and len(tog) == 1 and tog[0]['line'] == 2,
       'cues.json: a build chain is one line, ui and name apart, two lines at once fail', json.dumps(rep.get('findings'))[:300])
cues['copy'][2]['swap'] = 'a'
code, rep = run(['--stdin', '--format', 'launch'], json.dumps(cues))
result(code == 0 and not rules(rep), '--stdin: the same line declared swap passes, the end card closes on the name and URL', ', '.join(rules(rep)))
code, rep = run([script(['0 | Tessel is a calendar for teams.', '4.5 | It moves meetings that clash.'], 'timed.txt')])
result(rep.get('timed') and [l['at'] for l in rep.get('lines', [])] == [0, 4.5], 'a .txt with "seconds | line" rows carries its times', json.dumps(rep.get('lines'))[:200])

# 5. every example script the skill ships
def tables(path):
    """Each table with a "Line" column, with the nearest label above it (a heading or a bold lead-in)."""
    out, label, cur, header = [], '', None, None
    for raw in open(path, encoding='utf-8').read().splitlines() + ['']:
        s = raw.strip()
        if s.startswith('|'):
            cells = [c.strip() for c in s.strip('|').split('|')]
            if header is None:
                if any(c.lower() == 'line' for c in cells) and re.search(r'script|good|bad', label, re.I):
                    header, cur = [c.lower() for c in cells], []
                continue
            if cur is not None and not all(re.match(r'^:?-+:?$', c) for c in cells if c):
                row = dict(zip(header, cells))
                line = next((v for k, v in row.items() if k == 'line'), '').strip().strip('"“”')
                if line and not line.startswith('<') and not line.startswith('**'):
                    at = next((v for k, v in row.items() if k in ('at', 'time')), None)
                    cur.append(f'{at} | {line}' if at and re.match(r'^\d', at) else line)
            continue
        if cur:
            out.append((label, cur))
        cur, header = None, None
        if s.startswith('> ') and re.search(r'\bbad\b', label, re.I):  # a bad script quoted as "> a · b · c"
            out.append((label, [x.strip() for x in s[2:].split(' · ') if x.strip()]))
        if s.startswith('#') or s.startswith('**'):
            label = s
    return out

EXAMPLES = [('assets/TREATMENT.md', None), ('references/copy-and-type.md', None), ('references/update-films.md', 'update'),
            ('references/worked-example.md', None)]
seen = 0
for rel, fmt in EXAMPLES:
    path = os.path.join(SKILL, rel)
    if not os.path.exists(path):
        result(False, f'{rel} exists')
        continue
    for label, lines in tables(path):
        if len(lines) < 2:
            continue
        bad = bool(re.search(r'\bbad\b', label, re.I))
        f = fmt or ('update' if re.search(r'update', label, re.I) else 'launch')
        code, rep = run([script(lines, f'ex{seen}.txt'), '--format', f])
        seen += 1
        errs = [f'{x["rule"]}: {x.get("text") or ""}' for x in rep.get('findings', []) if x['severity'] == 'error']
        result((code == 1) if bad else (code == 0), f'{rel}: {"a bad" if bad else "the"} script under "{label[:60]}" {"fails" if bad else "passes"}', '; '.join(errs)[:300])
result(seen >= 5, f'the example scripts were found ({seen})')

print(f'copy-check tests: {failed} failed' if failed else 'copy-check tests: all pass')
sys.exit(1 if failed else 0)
