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
     the findings and the stranger's read. A cues.json of a film whose content module (src/*.ts) still carries the
     template's cinetic:placeholder marker fails scaffold (the template's sample script) until the marker goes.
  5. Every example script the skill ships passes: the Script tables in assets/TREATMENT.md, the good scripts in
     references/copy-and-type.md, references/update-films.md and references/worked-example.md; the bad ones fail.
  6. Placeholders: a script line that says "Placeholder" and a COPY ui string in lorem ipsum fail; --ui src reads
     the on-screen strings of a film's source (not comments, not fx/) and fails placeholder text and unfilled
     slots (under any key and in any list item, a slot opening with a number or a price too; never a call's argument, a
     citation "[2]" or the sound plan's cue words); --ui layout.json reads the UI boxes the layout audit measured; real UI
     words pass.
  7. Key words: *marks* name a line's key words and leave the text before any check; a line without marks gets a
     suggestion (a number or a [slot], else the last word that is not a small word or the product's name).
  8. The kit's sample content: its strings (read from the kit's own sample.ts: sample rows, tile lines such as
     "Pricing page, second pass", the sample products, the sample companies such as "Zephyr Legal") fail in a film's
     source (--ui src: any string literal outside kit/), a layout audit's UI boxes, an OCR file of the render (--ocr) and
     a script; the kit's own sample.ts inside the film's src/kit is house code and does not count; a full name of the
     kit's sample people is a warning; the film's own strings pass. A UI title cut with "..." or "…" and a status line
     that stops mid-phrase are warnings in dev and errors with --final (or CINETIC_GATE=ship); in OCR a line cut in one
     still only stays a warning; a whole line passes.
  9. The case: with the spine in the cues, the request on screen in one act only fails and its name and number in a
     later act pass; without the spine, the brief's typed request (`prompt:`) in one act's COPY strings only warns.

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
# a rhyming slogan warns; a claim the brief never makes fails, only where a BRIEF.md is given
lines = list(GOOD)
lines[1] = 'Launch it by lunch.'
code, rep = run([script(lines)])
got = [f for f in rep.get('findings', []) if f['rule'] == 'slogan' and f.get('line') == 2 and f['severity'] == 'warn']
result(bool(got), 'slogan: "Launch it by lunch." warns (launch / lunch rhyme)', ', '.join(rules(rep)))
os.makedirs(os.path.join(TMP, 'briefed'), exist_ok=True)
open(os.path.join(TMP, 'briefed', 'BRIEF.md'), 'w', encoding='utf-8').write('Tessel is a calendar for busy teams. It moves meetings.')
claimed = GOOD[:4] + ['Tessel is free at tessel.app.']
code, rep = run([script(claimed, os.path.join('briefed', 's.txt'))])
got = [f for f in rep.get('findings', []) if f['rule'] == 'brief-claim']
result(code == 1 and len(got) >= 1 and any("'free'" in f['message'] for f in got), 'brief-claim: "free" (and the "one free hour" line) the brief never says fails beside a BRIEF.md',
       json.dumps([f['message'][:80] for f in got]))
code, rep = run([script(claimed)])
result('brief-claim' not in rules(rep), 'brief-claim: without a BRIEF.md nothing is held to it', ', '.join(rules(rep)))
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

# 2b. a short list of the real marks the film shows is one claim (public/logos/logos.json, --marks, cues `marks`)
film = os.path.join(TMP, 'marks-film')
os.makedirs(os.path.join(film, 'public', 'logos'), exist_ok=True)
open(os.path.join(film, 'public', 'logos', 'logos.json'), 'w', encoding='utf-8').write(json.dumps({'logos': {
    'chatgpt': {'name': 'ChatGPT'}, 'claude': {'name': 'Claude'}, 'google-gemini': {'name': 'Gemini'},
    'mistral-ai': {'name': 'Mistral AI'}, 'meta': {'name': 'Meta'}}}))
PLURAL = ['Plural asks three AI models at once.', 'Ask ChatGPT, Claude and Gemini.', 'Get three answers side by side.',
          'See where all three agree.', 'Try it free at plural.chat.']


def marks_case(line, args=(), where=None):
    lines = list(PLURAL)
    lines[1] = line
    p = os.path.join(where or TMP, 'marks.txt')
    open(p, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    code, rep = run([p, '--name', 'Plural', *args])
    return code, [f for f in rep.get('findings', []) if f.get('line') == 2]


code, got = marks_case('Ask ChatGPT, Claude and Gemini.')
result(code == 1 and [f['rule'] for f in got] == ['claims'], 'marks: without a declared mark, three names in a line are a list', json.dumps(got)[:200])
code, got = marks_case('Ask ChatGPT, Claude and Gemini.', where=film)
result(code == 0 and not got, 'marks: the names in public/logos/logos.json listed in one line are one claim', json.dumps(got)[:200])
code, got = marks_case('Ask ChatGPT, Claude and Gemini.', ['--marks', 'ChatGPT,Claude,Gemini'])
result(code == 0 and not got, 'marks: --marks declares them', json.dumps(got)[:200])
code, got = marks_case('Use ChatGPT, Claude, Mistral AI and Meta.', where=film)
result(code == 0 and not got, 'marks: four marks (a two-word name too) pass', json.dumps(got)[:200])
for line, why in [('Ask ChatGPT, Claude, Gemini, Meta and Mistral AI.', 'five marks are a list'),
                  ('ChatGPT, Claude and Gemini.', 'marks alone, no verb, are a keyword pile'),
                  ('Ask ChatGPT, Claude and your team.', 'a name that is not a mark is a list'),
                  ('Ask ChatGPT, Claude and Gemini, then compare.', 'a second claim beside the marks'),
                  ('Ask ChatGPT, Claude and Gemini. Compare them.', 'two sentences')]:
    code, got = marks_case(line, where=film)
    result(code == 1 and 'claims' in [f['rule'] for f in got],
           f'marks: {why} still fails ("{line}")', json.dumps(got)[:200])
md2 = os.path.join(TMP, 'MARKS.md')
open(md2, 'w', encoding='utf-8').write('**Spec:** `format: launch`\n**Name:** Plural\n**Marks:** ChatGPT, Claude, Gemini\n\n## Script\n| # | Line |\n|---|---|\n'
                                       + ''.join(f'| {i + 1} | {l} |\n' for i, l in enumerate(PLURAL)) + '\n## Next\n')
code, rep = run([md2])
result(code == 0, 'marks: a **Marks:** line in TREATMENT.md declares them', ', '.join(rules(rep)))
pc = {'fps': 60, 'total': 1500, 'name': 'Plural', 'marks': ['ChatGPT', 'Claude', 'Gemini'],
      'copy': [{'id': f'l{i}', 'text': l, 'in': i * 300, 'resolved': i * 300 + 40, 'out': i * 300 + 280} for i, l in enumerate(PLURAL)]}
code, rep = run(['--stdin'], json.dumps(pc))
result(code == 0 and not rules(rep, 'error'), 'marks: `marks` in the cues (stdin) declares them', ', '.join(rules(rep)))

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
# scaffold: the same clean script in a film whose content module still carries the template's cinetic:placeholder marker
# (the template's sample script, never this film's) fails until the marker goes; the house files (deal.ts) never count
film = os.path.join(TMP, 'film')
os.makedirs(os.path.join(film, 'src'), exist_ok=True)
os.makedirs(os.path.join(film, 'out'), exist_ok=True)
open(os.path.join(film, 'src', 'timeline.ts'), 'w', encoding='utf-8').write('export const FPS = 60;\n')
open(os.path.join(film, 'src', 'deal.ts'), 'w', encoding='utf-8').write('// cinetic:placeholder - a house file: not the script\n')
content = os.path.join(film, 'src', 'update.ts')
open(content, 'w', encoding='utf-8').write('// The update film\'s facts.\n//\n// cinetic:placeholder - an invented release: write the real one, then delete this line.\nexport const U = 1;\n')
fc = os.path.join(film, 'out', 'cues.json')
open(fc, 'w', encoding='utf-8').write(json.dumps(cues))
code, rep = run([fc, '--format', 'launch'])
sc = [f for f in rep.get('findings', []) if f['rule'] == 'scaffold']
result(code == 1 and len(sc) == 1 and sc[0]['severity'] == 'error' and sc[0]['where'] == 'src/update.ts:3',
       "scaffold: a clean script whose content module still carries the template's marker fails (src/update.ts:3), a house file's marker does not", json.dumps(sc)[:300])
open(content, 'w', encoding='utf-8').write('export const U = 1;\n')
code, rep = run([fc, '--format', 'launch'])
result(code == 0 and 'scaffold' not in rules(rep), 'scaffold: the marker deleted, the same script passes', ', '.join(rules(rep)))
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

# 6. placeholders: a script line, COPY ui strings, and the product's UI strings (--ui src | layout.json)
code, rep = run([script(['Tessel is a calendar for busy teams.', 'Placeholder line', 'It finds one free hour for everyone.', 'Tessel is out now at tessel.app.'], 'ph.txt')])
result(code == 1 and 'placeholder' in rules(rep, 'error'), 'placeholder: a script line that says "Placeholder" fails', ', '.join(rules(rep)))
doc = {'fps': 60, 'total': 600, 'name': 'Tessel', 'copy': [
    {'id': 'a', 'text': 'Tessel is a calendar for busy teams.', 'in': 0, 'resolved': 30, 'out': 200},
    {'id': 'b', 'text': 'It moves a meeting when plans change.', 'in': 200, 'resolved': 230, 'out': 400},
    {'id': 'c', 'text': 'Tessel is out now at tessel.app.', 'in': 400, 'resolved': 430, 'out': 600},
    {'id': 'u', 'text': 'Lorem ipsum dolor', 'in': 250, 'resolved': 250, 'out': 300, 'kind': 'ui'}]}
code, rep = run(['--stdin'], stdin=json.dumps(doc))
result(code == 1 and any(f['rule'] == 'placeholder' and 'Lorem' in (f.get('text') or '') for f in rep.get('findings', [])), 'placeholder: a COPY ui string in lorem ipsum fails', ', '.join(rules(rep)))
ui = os.path.join(TMP, 'ui', 'src')
os.makedirs(os.path.join(ui, 'acts'), exist_ok=True)
os.makedirs(os.path.join(ui, 'fx'), exist_ok=True)
open(os.path.join(ui, 'content.ts'), 'w', encoding='utf-8').write("export const C = { title: '[Your output]', rows: ['Invoices sent', 'Item 2'], who: 'Ana Ruiz' };\n")
open(os.path.join(ui, 'acts', 'Feed.tsx'), 'w', encoding='utf-8').write("export const F = () => <div><span>Label text</span><Pill label=\"Paid\" /><span>Due Friday</span></div>; // <b>Lorem ipsum</b> in a comment\n")
open(os.path.join(ui, 'fx', 'House.tsx'), 'w', encoding='utf-8').write("export const kind = { text: 'Placeholder' };\n")
code, rep = run(['--ui', ui])
got = sorted((f['rule'], f['text']) for f in rep.get('findings', []))
result(code == 1 and got == [('placeholder', 'Item 2'), ('placeholder', 'Label text'), ('slot', '[Your output]')],
       '--ui src: placeholder text and an unfilled slot fail; real words, comments and house code (fx/) do not', str(got))
result(rep.get('ui', {}).get('strings', 0) >= 6, '--ui src: the UI strings are counted', str(rep.get('ui')))
lay = os.path.join(TMP, 'layout.json')
json.dump({'boxes': [{'frame': 120, 'boxes': [{'id': 'kit-row', 'text': 'Invoice #4821', 'ui': True}, {'id': 'kit-title', 'text': 'Untitled text', 'ui': True}, {'id': 'line', 'text': 'Placeholder', 'ui': False}]}]}, open(lay, 'w', encoding='utf-8'))
code, rep = run(['--ui', lay])
got = [f['text'] for f in rep.get('findings', [])]
result(code == 1 and got == ['Untitled text'], '--ui layout.json: the UI boxes the audit measured (a film line belongs to the script, not the UI)', str(got))
open(os.path.join(ui, 'content.ts'), 'w', encoding='utf-8').write("export const C = { title: 'Weekly report', rows: ['Invoices sent', 'Paid this week'], who: 'Ana Ruiz' };\n")
open(os.path.join(ui, 'acts', 'Feed.tsx'), 'w', encoding='utf-8').write("export const F = () => <div><Field placeholder=\"Search invoices\" /><span>Due Friday</span></div>;\n")
code, rep = run(['--ui', ui])
result(code == 0 and not rep.get('findings'), '--ui src: real UI words pass (a field hint included)', str(rep.get('findings'))[:200])
# a template's slots under any key (a mark's logoName, a pair's ui list, a chip, a status, a list of slot items), slots
# that open with a number or a price, and the sound plan's cue words (action: 'text') not read as UI
open(os.path.join(ui, 'content.ts'), 'w', encoding='utf-8').write(
    "export const C = { logoName: '[Source]', chip: '[Model]', status: '[Building the app]', ui: ['[step one]', 'Paid this week'],\n"
    "  people: ['[AK]', '[JM]'], value: '[$19]', body: '[4 tasks, 3 owners]', seed: hashSeed('[Product]'), cite: 'Sources [2]' };\n")
open(os.path.join(ui, 'sync.ts'), 'w', encoding='utf-8').write("export const ev = [{ kind: 'text', action: 'text', id: 'line1' }];\n")
open(os.path.join(ui, 'acts', 'Feed.tsx'), 'w', encoding='utf-8').write("export const F = () => <div data-x={sel('[data-ui]')}><span>Due Friday</span></div>;\n")
code, rep = run(['--ui', ui])
got = sorted(f['text'] for f in rep.get('findings', []) if f['rule'] == 'slot')
want = sorted(['[Source]', '[Model]', '[Building the app]', '[step one]', '[AK]', '[JM]', '[$19]', '[4 tasks, 3 owners]'])
other = [(f['rule'], f['text']) for f in rep.get('findings', []) if f['rule'] != 'slot']
result(code == 1 and got == want and not other, '--ui src: a slot fails under any key and in any list item ([AK]), a slot opening with a number or a price fails; a seed argument, a citation [2] and the sound plan\'s cue words do not', f'{got} {other}')
os.remove(os.path.join(ui, 'sync.ts'))

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

# 7. key words
code, rep = run([script(['0 | Brook is a *water bottle*.', '2.5 | Its cap counts every sip.', '5 | It logs 2 litres a day.', '8 | Get Brook at brook.com.'], 'keys.txt'), '--name', 'Brook'])
keys = {k['line']: (k['key'], k['marked']) for k in rep.get('keys', [])}
texts = [l.get('text') for l in rep.get('lines', [])]
result(code == 0 and keys.get(1) == ('water bottle', True) and keys.get(2) == ('sip', False) and keys.get(3) == ('2', False) and not any('*' in (t or '') for t in texts),
       'key words: *marks* name them and leave the text; an unmarked line gets a suggestion (a number first, else its last content word)', json.dumps(keys))

# 8. the kit's sample content, truncated titles, lines cut mid-phrase
kitsrc = os.path.join(TMP, 'kitfilm', 'src')
os.makedirs(os.path.join(kitsrc, 'acts'), exist_ok=True)
os.makedirs(os.path.join(kitsrc, 'kit'), exist_ok=True)
open(os.path.join(kitsrc, 'kit', 'sample.ts'), 'w', encoding='utf-8').write(open(os.path.join(SKILL, 'assets', 'remotion-starter', 'src', 'kit', 'sample.ts'), encoding='utf-8').read())
open(os.path.join(kitsrc, 'walk.ts'), 'w', encoding='utf-8').write("export const WALK = { results: [{ title: 'Send Maya the slides', meta: 'Today' }, { title: 'Book the dentist', meta: 'Tuesday' }] };\n")
open(os.path.join(kitsrc, 'acts', 'Card.tsx'), 'w', encoding='utf-8').write("export const C = () => <div><span>Send Maya the slides</span></div>;\n")
code, rep = run(['--ui', kitsrc])
result(code == 0 and not [f for f in rep.get('findings', []) if f['rule'].startswith('kit-sample')], "kit-sample: the film's own strings pass; the kit's sample.ts in the film's src/kit is house code", str(rep.get('findings'))[:200])
open(os.path.join(kitsrc, 'acts', 'Card.tsx'), 'w', encoding='utf-8').write("const DOCS = ['Pricing page, second pass', 'Notes from the Friday review'];\nexport const C = () => <div><span>Zephyr Legal</span>{DOCS[0]}</div>;\n")
code, rep = run(['--ui', kitsrc])
hits = sorted({f['text'] for f in rep.get('findings', []) if f['rule'] == 'kit-sample'})
result(code == 1 and {'Pricing page, second pass', 'Notes from the Friday review', 'Zephyr Legal'} <= set(hits), "kit-sample: a kit sample tile line and a sample company in the film's source fail (any string literal outside kit/)", str(hits))
lay = os.path.join(TMP, 'layout-kit.json')
json.dump({'boxes': [{'frame': 300, 'boxes': [{'id': 'kit-ws', 'text': 'Yarrow Analytics', 'ui': True}, {'id': 'kit-row', 'text': 'Contracts waiting on legal', 'ui': True}, {'id': 'kit-row2', 'text': 'Send Maya the slides', 'ui': True}, {'id': 'kit-who', 'text': 'Mara K.', 'ui': True}]}]}, open(lay, 'w', encoding='utf-8'))
code, rep = run(['--ui', lay])
got = {f['text']: (f['rule'], f['severity']) for f in rep.get('findings', [])}
result(code == 1 and got.get('Yarrow Analytics', ('',))[0] == 'kit-sample' and got.get('Contracts waiting on legal', ('',))[0] == 'kit-sample' and got.get('Mara K.') == ('kit-sample-name', 'warn') and 'Send Maya the slides' not in got,
       "kit-sample: the render's UI boxes (layout audit) fail on a sample workspace and row; a sample person's full name warns", str(got))
ocr = os.path.join(TMP, 'ocr.txt')
open(ocr, 'w', encoding='utf-8').write('f_02.png\tthe den...\nf_09.png\tand call Mum back on ...\nf_09.png\tAdded to\nf_10.png\tAdded to\nf_09.png\tBook the dentist\nf_11.png\tPricing page, second pass\nf_12.png\tTern is out now.\nf_13.png\tRecord a\n')
code, rep = run(['--ocr', ocr])
dev = {(f['rule'], f['severity']) for f in rep.get('findings', [])}
result(code == 1 and ('kit-sample', 'error') in dev and ('truncated', 'warn') in dev and ('cut-phrase', 'warn') in dev and ('truncated', 'error') not in dev,
       '--ocr: a sample string in the render fails; a truncated title and a line cut mid-phrase warn in dev', str(sorted(dev)))
code, rep = run(['--ocr', ocr, '--final'])
fin = [(f['rule'], f['severity'], f['text']) for f in rep.get('findings', []) if f['rule'] in ('truncated', 'cut-phrase')]
result(code == 1 and {('truncated', 'error', 'the den...'), ('truncated', 'error', 'and call Mum back on ...'), ('cut-phrase', 'error', 'Added to'), ('cut-phrase', 'warn', 'Record a')} <= set(fin) and not [x for x in fin if x[2] in ('Book the dentist', 'Tern is out now.')],
       '--ocr --final: a title cut with "..." and a status line held cut mid-phrase over two stills fail a final film; a line cut in one still only warns (still typing, or a misread); whole lines pass', str(fin))
env_ship = {**os.environ, 'PYTHONUTF8': '1', 'CINETIC_GATE': 'ship'}
r = subprocess.run([sys.executable, CC, '--ocr', ocr, '--json'], capture_output=True, text=True, encoding='utf-8', env=env_ship)
result(r.returncode == 1 and json.loads(r.stdout).get('final') is True, 'CINETIC_GATE=ship makes the check final', r.stdout[:120])
code, rep = run([script(['0 | Tern turns voice memos into to-dos.', '3 | Your list is ready in seconds.', '6 | Tide · Spring lookbook is ready.', '9 | Tern is out now.'], 'kit-script.txt'), '--name', 'Tern'])
result(code == 1 and any(f['rule'] == 'kit-sample' and 'Tide' in f['text'] for f in rep.get('findings', [])), "kit-sample: a script line naming the kit's sample project fails", ', '.join(rules(rep)))

# repeats: a line whose words are its own picture's strings (line<k> against ui<k>.*); line 1 (what it is) is left out.
# quantity: "every" claims many, which one example on screen never proves.
doc = {'fps': 30, 'total': 600, 'name': 'Ferry', 'copy': [
    {'id': 'line1', 'text': 'Ferry gives every PR a database.', 'in': 8, 'resolved': 30, 'out': 66},
    {'id': 'ui1.1', 'text': 'Preview database', 'kind': 'ui', 'in': 71, 'resolved': 81, 'out': 170},
    {'id': 'line2', 'text': 'Reviewers test it before they merge.', 'in': 170, 'resolved': 190, 'out': 230},
    {'id': 'ui2.1', 'text': 'All tests passed', 'kind': 'ui', 'in': 236, 'resolved': 246, 'out': 330},
    {'id': 'ui2.2', 'text': 'Merge pull request', 'kind': 'ui', 'in': 236, 'resolved': 246, 'out': 330},
    {'id': 'line3', 'text': 'Nothing to clean up after.', 'in': 330, 'resolved': 350, 'out': 390},
    {'id': 'ui3.1', 'text': 'Preview database closed', 'kind': 'ui', 'in': 396, 'resolved': 406, 'out': 500},
    {'id': 'line4', 'text': 'Ship what you actually tested.', 'in': 500, 'resolved': 520, 'out': 560},
]}
code, rep = run(['--stdin', '--format', 'launch'], json.dumps(doc))
rep_lines = sorted(f['line'] for f in rep.get('findings', []) if f['rule'] == 'repeats')
q_lines = sorted(f['line'] for f in rep.get('findings', []) if f['rule'] == 'quantity')
result(rep_lines == [2] and q_lines == [1] and all(f['severity'] == 'warn' for f in rep.get('findings', []) if f['rule'] in ('repeats', 'quantity')),
       'repeats: a line made of the words its own picture shows warns (line 1 and a line saying what the picture cannot pass); quantity: "every" warns',
       f'repeats {rep_lines}, quantity {q_lines}')
# quantity skips a template's scaffold line: a quantifier inside or next to a [bracketed placeholder] is not copy yet;
# a quantifier apart from the placeholders, in the same line, still warns
slot_lines = ['Every [record] gets [its fields filled].', 'Ask it for any [task].', 'Each [part] shares one [record].',
              '[Name] checks [every order] for you.', 'Every [record] gets its fields filled, always.']
doc = {'fps': 30, 'total': 600, 'name': 'Ferry', 'copy': [
    {'id': f'line{k + 1}', 'text': t, 'in': 10 + 100 * k, 'resolved': 40 + 100 * k, 'out': 90 + 100 * k} for k, t in enumerate(slot_lines)]}
code, rep = run(['--stdin', '--format', 'launch'], json.dumps(doc))
q_slot = [(f['line'], f['message'].split('"')[1]) for f in rep.get('findings', []) if f['rule'] == 'quantity']
result(q_slot == [(5, 'always')], 'quantity: a quantifier inside or next to a [bracketed placeholder] passes, one apart from them warns',
       str(q_slot))

# --ocr on stills under 1600 px wide: a screen's small strings are unreadable there, so it warns (ocr_small, no OCR needed)
import importlib.util
_spec = importlib.util.spec_from_file_location('copy_check_mod', CC)
_cc = importlib.util.module_from_spec(_spec)
_argv, sys.argv = sys.argv, [CC]
_spec.loader.exec_module(_cc)
sys.argv = _argv
stills = os.path.join(TMP, 'stills')
os.makedirs(stills, exist_ok=True)
png = lambda w, h: b'\x89PNG\r\n\x1a\n' + (13).to_bytes(4, 'big') + b'IHDR' + w.to_bytes(4, 'big') + h.to_bytes(4, 'big') + b'\x08\x02\x00\x00\x00'
open(os.path.join(stills, 'half.png'), 'wb').write(png(960, 540))
open(os.path.join(stills, 'full.png'), 'wb').write(png(1920, 1080))
small = _cc.ocr_small(stills)
result(small == [('half.png', 960)] and _cc.ocr_small(os.path.join(stills, 'full.png')) == [], '--ocr: a still under 1600 px wide is named (a screen\'s small strings are unreadable there: ocr-small warns), a full-size one is not', str(small))

# case: one request from the input to the result. With the spine in the cues, the case in one act only fails and in two
# acts passes; without it, the brief's typed request against COPY's strings per act warns
spine_lines = [
    {'id': 'line1', 'text': 'Fernway writes your booking page.', 'in': 0, 'resolved': 30, 'out': 120},
    {'id': 'line2', 'text': 'It tells you who booked.', 'in': 700, 'resolved': 730, 'out': 820},
]
spine_doc = lambda strings: {'fps': 60, 'total': 1200, 'name': 'Fernway', 'acts': {'a': {'from': 0, 'dur': 600}, 'b': {'from': 600, 'dur': 600}},
                             'copy': spine_lines, 'spine': {'case': {'request': 'A booking page for my Sunday choir rehearsal', 'names': ['Sunday Choir'], 'numbers': ['42']},
                                                            'acts': [{'from': 0, 'to': 600, 'strings': strings[0]}, {'from': 600, 'to': 1200, 'strings': strings[1]}]}}
_, once = run(['--stdin'], json.dumps(spine_doc([['A booking page for my Sunday choir rehearsal'], ['Book a seat']])))
_, twice = run(['--stdin'], json.dumps(spine_doc([['A booking page for my Sunday choir rehearsal'], ['42 booked', 'Sunday Choir']])))
case_of = lambda rep: [(f['severity'], f['where']) for f in rep.get('findings', []) if f['rule'] == 'case']
result(case_of(once) == [('error', 'act 1 only')] and case_of(twice) == [],
       'case: with the spine, the request on screen in one act only fails; its name and number in a later act pass', f'{case_of(once)} / {case_of(twice)}')
bdir = os.path.join(TMP, 'case-film')
os.makedirs(os.path.join(bdir, 'out'), exist_ok=True)
open(os.path.join(bdir, 'BRIEF.md'), 'w', encoding='utf-8').write('# Fernway\n\n```content\nname: Fernway\nprompt: A booking page for my Sunday choir rehearsal\n```\n')
plain = {k: v for k, v in spine_doc([[], []]).items() if k != 'spine'}
plain['copy'] = spine_lines + [{'id': 'ui1.1', 'text': 'A booking page for my Sunday choir rehearsal', 'kind': 'ui', 'in': 200, 'resolved': 210, 'out': 500}]
json.dump(plain, open(os.path.join(bdir, 'out', 'cues.json'), 'w', encoding='utf-8'))
_, nospine = run([os.path.join(bdir, 'out', 'cues.json')])
result(case_of(nospine) == [('warn', 'act 1 only')], 'case: without the spine, the brief\'s typed request in one act\'s strings only warns', str(case_of(nospine)))

print(f'copy-check tests: {failed} failed' if failed else 'copy-check tests: all pass')
sys.exit(1 if failed else 0)
