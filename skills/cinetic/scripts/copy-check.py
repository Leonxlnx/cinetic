#!/usr/bin/env python3
"""copy-check.py: is the film's script clear? A stranger must know within 5 seconds what the product is and does.

Reads a film's script and fails on vague, fancy or slogan copy, the way a stranger would read it with the
sound off. The script is one of:
  TREATMENT.md     the Script table (a heading with "Script", a table with a "Line" column; optional
                   "At" or "Time" column in seconds or m:ss.s); the format from the Spec line, the name
                   from a **Name:** line or the what-it-is line
  out/cues.json    the timeline's COPY with frames (npx tsx scripts/export-cues.ts writes it)
  a .txt file      one line of the script per row; `2.4 | The line.` gives its time in seconds; # comments
  --stdin          the same JSON as cues.json on stdin ({fps, total, copy, name?, end?}); grid-check sends it

The formula it holds the script to (references/copy-and-type.md §1):
  launch   line 1 or 2 says what the product is in plain words: "[Name] is a [plain category] for [who]."
           or "[Name] turns [input] into [output]."; then 3-5 lines, each one concrete thing it does, said
           with a verb while the product shows it; close on the name and what to do (a URL, "Out now").
  update   "[Name] [version]" first, then one line per change, each a result the user sees.
Every line: a short real sentence of 2-7 words, one clean line on screen at a time, one claim, no metaphor,
no slogan, no fancy word, the words a customer would use.

Checks (error unless marked):
  long        a line over 7 words
  keyword     a one-word line (a name, a version or the close excepted)
  vague       fancy or vague words a customer would not say: unleash, reimagine, seamless, effortless,
              elevate, supercharge, next-level, the future of, magic, journey, unlock, empower,
              revolutionize, beyond, redefine, game-changing, built different and the rest of the list
  metaphor    a figure of speech instead of the thing: superpower, second brain, rocket fuel, on autopilot...
  slogan      slogan shapes: "Meet X", "X, reimagined", "Less X. More Y.", "X meets Y", "made simple",
              "your way", "like never before", a question, an exclamation, "Plan. Track. Win."
  claims      more than one claim in a line: two sentences, a list, two clauses joined by and/but. A short
              list (2-4) of the real marks the film shows is one claim ("Ask ChatGPT, Claude and Gemini."):
              the names in public/logos/logos.json (scripts/logos.mjs), `marks` in the cues, a **Marks:**
              line in TREATMENT.md or --marks; the rest of the line still needs a verb and one claim
  verb        a line with no verb (an abstract noun alone says nothing: "Total control.")
  together    two lines on screen at once (a line declared `swap` excepted)
  name        no line names the product
  what-it-is  no line says what the product is by 3 s (launch), or no "[Name] [version]" by 3 s (update)
  close       (warning) the film does not end on the name and what to do (a URL, "Out now")
  placeholder a line or a UI string that marks itself unfinished: lorem ipsum, "Placeholder", "Label text", "Your
              text here", a generic label alone ("Button", "Caption") or a generic noun and a number ("Item 1");
              the lists are scripts/placeholders.json, which lint-film.mjs reads too
  slot        (--ui) a UI string still holding a template's bracketed slot ("[Product]", "[N] items")
Then it prints what a stranger reads: what it is, what it does, what to do.

UI strings (--ui): every string the product's UI shows is real words too. --ui src reads the on-screen strings of the
film's source (JSX text, text/label/title/caption/meta/value/... props and keys, lists of rows, steps and options; fx/
and lib/ are house code and skipped); --ui out/qa/layout-Film.json reads the UI boxes the layout audit measured on the
render. Given alone (no script), only the UI strings are checked.

Usage:
  python3 scripts/copy-check.py TREATMENT.md
  python3 scripts/copy-check.py out/cues.json --name Tessel
  python3 scripts/copy-check.py script.txt --format update --name Plumb
  options: --name N (the product's name)  --format launch|update|feature|loop|sting|walkthrough
           --fps N (cues without fps)  --allow word,word (the brand's own voice, recorded in BRIEF.md)
           --marks Name,Name (real marks the film shows, beside public/logos/logos.json)
           --json (machine-readable)  --strict (warnings fail too)  --stdin (JSON on stdin)
           --ui src|layout.json (the product's UI strings: placeholders and unfilled slots fail)
Exit codes: 0 pass, 1 a check failed (or a warning with --strict), 2 bad arguments or an unreadable script.
"""
import json
import os
import re
import sys

MAX_WORDS, MIN_WORDS = 7, 2
WHAT_BY_S = 3.0  # the what-it-is line arrives by this second

# ---------------------------------------------------------------------------------------------- the lists
# Fancy or vague words: a customer never says them about a tool they use. Regexes, matched on word boundaries.
VAGUE = [
    r'unleash\w*', r're-?imagin\w*', r'seamless\w*', r'effortless\w*', r'elevat\w*', r'supercharg\w*',
    r'next[- ]level', r'the future of', r'magic\w*', r'journey\w*', r'unlock\w*', r'empower\w*',
    r'revolution\w*', r'beyond', r're-?defin\w*', r'game[- ]chang\w*', r'built different', r'cutting[- ]edge',
    r'state[- ]of[- ]the[- ]art', r'best[- ]in[- ]class', r'world[- ]class', r'next[- ]gen\w*', r'innovat\w*',
    r'transform\w*', r'streamlin\w*', r'harness\w*', r'level up', r'synerg\w*', r'leverag\w*', r'robust',
    r'powerful', r'smart(er|est)?', r'intelligen\w*', r'ai[- ]powered', r'all[- ]in[- ]one', r'at scale',
    r'like never before', r'and (so much )?more', r'breakthrough\w*', r'disrupt\w*', r'ultimate', r'limitless',
    r'endless', r'infinite', r'frictionless', r'delightful\w*', r'stunning\w*', r'amazing\w*', r'incredibl\w*',
    r'awesome', r'ecosystem\w*', r'solutions?', r'experiences?', r'productivity', r'workflows?', r'reinvent\w*',
    r'rethink\w*', r'whole new', r'curated', r'bespoke', r'unparalleled', r'unmatched', r'unprecedented',
    r'enhanc\w*', r'empowering', r'possibilit\w*', r'potential', r'simply', r'truly', r'reimagined',
]
# Figures of speech: say the thing instead.
METAPHOR = [
    r'superpowers?', r'magic wand', r'wizards?', r'rocket ?fuel', r'rockets?', r'ignit\w*', r'sparks?',
    r'soar\w*', r'take flight', r'skyrocket\w*', r'north star', r'secret weapon', r'swiss[- ]army knife',
    r'second brain', r'brains?', r'heartbeat', r'dna', r'playground', r'command (center|centre)',
    r'mission control', r'at your fingertips', r'in a snap', r'a breeze', r'on autopilot', r'autopilot',
    r'on steroids', r'bridge the gap', r'break(s|ing)? (down )?barriers', r'comes? alive', r'breathes? life',
    r'gold ?mine', r'holy grail', r'silver bullet', r'magic bullet', r'moonshot', r'launch ?pad', r'springboard',
    r'gateway to', r'building blocks', r'tidal wave', r'avalanche', r'tsunami', r'ocean of', r'sea of',
    r'universe of', r'world of', r'superhero\w*', r'ninjas?', r'rock ?stars?', r'gurus?', r'sidekicks?',
    r'co-?pilot\w*', r'flywheel', r'cockpit', r'x-ray', r'window into', r'oasis', r'sanctuary', r'zen',
    r'nirvana', r'speed of thought', r'new chapter', r'next chapter', r'new era', r'dawn of', r'frontier',
    r'symphony', r'orchestra', r'alchemy', r'blueprint for', r'compass', r'home for', r'heart of',
    r'fuel(s|led|ing)?', r'supercharged', r'turbo\w*', r'on fire', r'unstoppable', r'fearless',
]
# Slogan shapes: landing-page grammar, never a sentence a person says.
SLOGAN = [
    (r'^(meet|say hello to|say goodbye to|introducing|welcome to|imagine|what if|ready to|it\'?s time to|get ready)\b',
     'an opener ("Meet", "Introducing", "Imagine")'),
    (r'\b\w+,\s+(reimagined|redefined|reinvented|perfected|elevated|simplified|unleashed|evolved|done right)\b', '"X, reimagined"'),
    (r'\bless \w+[.,;]?\s+more \w+', '"Less X. More Y."'),
    (r'^\S+ meets \S+[.]?$', '"X meets Y"'),
    (r'\bmade (simple|easy|effortless|better|beautiful)\b', '"X made simple"'),
    (r'\byour way\b', '"your way"'),
    (r'\bthe \w+ you (deserve|need|love|always wanted)\b', '"the X you deserve"'),
    (r'\bwork smarter\b|\bdo more with less\b|\bthink (different|bigger)\b', 'a stock slogan'),
    (r'\bnever \w+ again\b', '"never X again"'),
    (r'\bfrom idea to\b', '"from idea to X"'),
    (r'\b(built|made|designed) for (everyone|everything|the way you work)\b', '"built for everyone"'),
    (r'\bthe only \w+ you(\'ll)? (ever )?need\b', '"the only X you need"'),
    (r'\b(one|1) \w+\.\s+(infinite|endless|unlimited|zero)\b', '"One X. Infinite Y."'),
    (r'\bthe (art|science|power|heart|home|new standard|next generation) of\b', '"the art of X"'),
    (r'\bat the speed of\b', '"at the speed of X"'),
    (r'\bit just works\b', '"it just works"'),
]
ABSTRACT = {
    'power', 'speed', 'control', 'freedom', 'clarity', 'simplicity', 'efficiency', 'innovation', 'future',
    'creativity', 'flow', 'focus', 'noise', 'chaos', 'growth', 'success', 'excellence', 'quality', 'performance',
    'scale', 'insight', 'insights', 'intelligence', 'value', 'impact', 'vision', 'peace', 'calm', 'joy', 'delight',
    'confidence', 'momentum', 'simplicity', 'connection', 'collaboration', 'everything', 'nothing',
}

# Verbs, to tell a sentence from a label. Base forms; inflections are generated below.
VERB_BASES = """
accept add agree allow analyse analyze animate answer appear approve archive argue arrive ask assign attach
automate back backup bake balance begin believe belong bill block book borrow break bring browse build bump buy
calculate call cancel capture care carry catch change charge chat check choose clean clear click clip close
code collect come compare compile complete compose connect contain convert cook copy correct cost count cover
crash create crop cross cut decide declare delete deliver deploy describe design detect dial do double download
drag draft draw dress drink drive drop dub earn edit email empty end enter erase escape estimate explain export
fail fall feel fetch file fill filter find finish fit fix flag flip float fly fold follow forget format forward
freeze gather generate get give go grab grade group grow guess guide halve hand handle happen hate have head hear
help hide highlight hire hit hold hope host hurt import include invite invoice join jump keep kill know label
land last launch lay lead learn leave lend let lift light like limit line link list listen live load lock log
look lose love make overflow manage map mark match matter mean measure meet melt merge message miss mix move mute name
need note notice notify number open order organise organize own pack paint park pass paste patch pause pay pick
pin place plan plant play plug point post pour predict prepare press preview price print protect prove publish
pull push put queue quit quote rank rate reach read rebuild receive recognise recognize record recover reduce
refund reject release reload remember remind remove rename render rent reorder repeat replace reply report
rerun reschedule resize resolve respond rest restore return review rewind rewrite ride ring rise roll route run
save say scale scan schedule score scroll search see seem select sell send set settle share ship shoot shop
show shrink shut sign sing sit size sketch skip sleep slide slow snap solve sort sound speak speed spend split
spot spread stand start stay step stick stop store stream study submit suggest sum summarise summarize support
swap swipe switch sync tag take talk tap teach tell test text thank think throw tidy time touch track trade
train transcribe translate travel trim try turn type undo unlock update upload use verify vote wait wake walk
want warn wash watch water wear weigh win wipe wish work worry wrap write zoom
""".split()
IRREGULAR = """
am is are was were be been being has had does did done can could will would shall should may might must
went gone got gotten made took taken gave given found kept left built brought bought caught chose chosen came
drew drawn drove driven fell fallen felt flew flown forgot forgotten froze frozen grew grown heard held hid
hidden knew known led lent lost meant met paid ran rode ridden rang rung rose risen said saw seen sold sent
shook shot showed shown sang sung sat slept slid spoke spoken spent stood stole stuck struck swept swam swung
taught told thought threw thrown understood woke woken wore worn won wrote written began begun became become
broke broken lit wound sped spun stuck dealt dug fed fought hung laid sought
""".split()
CONTRACTIONS = re.compile(r"^(\w+n[’']t|cannot|(it|that|here|there|what|who|let)[’']s|\w+[’'](re|ve|ll|d|m))$", re.I)
PREPOSITIONS = {'into', 'to', 'for', 'with', 'from', 'of', 'in', 'on', 'at', 'by', 'and', 'or'}
SUBJECTS = {'i', 'you', 'we', 'they', 'it', 'he', 'she', 'everyone', 'nobody', 'nothing', 'everything', 'someone',
            'who', 'that', 'which'}


def _forms(b):
    out = {b, b + 's', b + 'es', b + 'ed', b + 'ing'}
    if b.endswith('e'):
        out |= {b + 'd', b[:-1] + 'ing'}
    if b.endswith('y') and len(b) > 2 and b[-2] not in 'aeiou':
        out |= {b[:-1] + 'ies', b[:-1] + 'ied'}
    if len(b) >= 3 and b[-1] not in 'aeiouwxy' and b[-2] in 'aeiou' and b[-3] not in 'aeiou':
        out |= {b + b[-1] + 'ed', b + b[-1] + 'ing'}
    return out


VERBS = set(IRREGULAR)
for _b in VERB_BASES:
    VERBS |= _forms(_b)

URL = re.compile(r'\b[\w-]+(\.[\w-]+)*\.(app|com|dev|io|ai|co|so|sh|org|net|xyz|studio|design|tools?|me|run|page|site|fm|tv)\b(/\S*)?|\[[^\]]*\.(com|app|dev|io)[^\]]*\]', re.I)
CTA = re.compile(r'\b(out now|out today|available (now|today)|try it|get it|download|sign up|join (the )?(beta|waitlist)|'
                 r'free (to|for)|on the app store|in your browser|install)\b', re.I)
VERSION = re.compile(r'(^|\s)v?\d+(\.\d+)+\b|\bv\d+\b|\bversion \d+', re.I)


# ---------------------------------------------------------------------------------------------- reading
def words_of(text):
    return [w for w in re.split(r'\s+', text.strip()) if re.search(r'[\w\[\]]', w)]


def norm_word(w):
    return re.sub(r"^[^\w\[’']+|[^\w\]’']+$", '', w.lower()).replace('’', "'")


# ------------------------------------------------------------------------------------- placeholders (scripts/placeholders.json)
def _placeholder_lists():
    fallback = {'words': ['lorem', 'ipsum', 'dolor sit', 'placeholder', 'label text', 'sample text', 'dummy text', 'text here', 'title here'],
                'labels': ['label', 'text', 'heading', 'subtitle', 'caption', 'button', 'placeholder', 'lorem'],
                'numbered': ['item', 'label', 'text', 'title', 'card']}
    try:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'placeholders.json'), encoding='utf-8') as fh:
            j = json.load(fh)
        return {k: j.get(k) or fallback[k] for k in fallback}
    except (OSError, ValueError):
        return fallback


_PH = _placeholder_lists()
_esc = lambda w: r'\s+'.join(re.escape(x) for x in w.split())
PH_WORDS = re.compile(r'(?<![\w-])(' + '|'.join(_esc(w) for w in _PH['words']) + r')(?![\w-])', re.I)
PH_LABEL = re.compile(r'^\s*(' + '|'.join(_esc(w) for w in _PH['labels']) + r')\s*[.:]?\s*$', re.I)
PH_NUMBERED = re.compile(r'^\s*(' + '|'.join(_esc(w) for w in _PH['numbered']) + r')\s*#?\d{1,3}\s*$', re.I)
SLOT = re.compile(r'\[[A-Za-z][^\]\n]{0,40}\]')


def placeholder_in(text, slots=False):
    """The placeholder a string shows (the word, or the whole string), or None; brackets count with slots."""
    t = (text or '').strip()
    if not t:
        return None
    m = PH_WORDS.search(t)
    if m:
        return m.group(1)
    if PH_LABEL.match(t) or PH_NUMBERED.match(t):
        return t
    if slots:
        b = SLOT.search(t)
        if b:
            return b.group(0)
    return None


ON_SCREEN = r'text|label|title|caption|line|headline|subtitle|sub|body|meta|value|placeholder|cta|badge|name|heading|description|hint|who|handle|unit|busy|action|insight|count'
LISTS = r'stats|steps|rows|items|options|tags|labels|lines|words|columns|nav|tabs|people|names|results|chips'


def _strip_comments(src):
    src = re.sub(r'/\*[\s\S]*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), src)
    out = []
    for line in src.split('\n'):
        q, i, cut = None, 0, None
        while i < len(line):
            c = line[i]
            if q:
                if c == '\\':
                    i += 1
                elif c == q:
                    q = None
            elif c in '\'"`':
                q = c
            elif line.startswith('//', i):
                cut = i
                break
            i += 1
        out.append(line if cut is None else line[:cut])
    return '\n'.join(out)


def ui_strings_from_src(root):
    """On-screen strings in a film's source: (text, 'file:line') pairs. fx/, lib/, node_modules and tests are skipped."""
    found = []
    skip = {'node_modules', 'fx', 'lib', 'out', 'test', 'tests', '__pycache__', 'scripts'}
    pats = [
        (re.compile(r'(?<![=\-])>([^<>{}();=|&\n]*)<'), 1, ('.tsx', '.jsx')),
        (re.compile(r'>\s*\{\s*([\'"`])((?:(?!\1)[^\n$])*)\1\s*\}'), 2, ('.tsx', '.jsx')),
        (re.compile(r'(?<![\w-])(?:' + ON_SCREEN + r')\s*=\s*(?:\{\s*)?([\'"`])((?:(?!\1)[^\n$])*)\1'), 2, None),
        (re.compile(r'(?<![\w$.-])(?:' + ON_SCREEN + r')\s*:\s*([\'"`])((?:(?!\1)[^\n$])*)\1'), 2, None),
    ]
    lists = re.compile(r'(?<![\w$.-])(?:' + LISTS + r')\s*:\s*\[([^\]]*)\]')
    strs = re.compile(r'([\'"`])((?:(?!\1)[^\n$])*)\1')
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in skip]
        for f in files:
            if not f.endswith(('.ts', '.tsx', '.js', '.jsx')) or f.endswith('.d.ts'):
                continue
            path = os.path.join(d, f)
            try:
                code = _strip_comments(open(path, encoding='utf-8').read())
            except OSError:
                continue
            try:
                rel = os.path.relpath(path)
            except ValueError:  # another drive (Windows)
                rel = path
            where = lambda i: f'{rel}:{code.count(chr(10), 0, i) + 1}'
            for pat, g, exts in pats:
                if exts and not f.endswith(exts):
                    continue
                for m in pat.finditer(code):
                    t = m.group(g).strip()
                    if re.search(r'[A-Za-z]', t):
                        found.append((t, where(m.start())))
            for m in lists.finditer(code):
                for x in strs.finditer(m.group(1)):
                    t = x.group(2).strip()
                    if re.search(r'[A-Za-z]', t):
                        found.append((t, where(m.start())))
    seen, out = set(), []
    for t, w in found:
        if (t, w) not in seen:
            seen.add((t, w))
            out.append((t, w))
    return out


def ui_strings_from_layout(doc):
    """The UI boxes a layout audit measured (data-ui), with their frames."""
    out = []
    for fr in doc.get('boxes') or []:
        for b in fr.get('boxes') or []:
            if b.get('ui') and b.get('text'):
                out.append((b['text'], f'f{fr.get("frame")} {b.get("id")}'))
    return list(dict.fromkeys(out))


def check_ui(strings):
    """Placeholder and slot findings over UI strings."""
    findings = []
    for t, where in strings:
        hit = placeholder_in(t)
        if hit:
            findings.append({'rule': 'placeholder', 'severity': 'error', 'line': None, 'text': t, 'where': where,
                             'message': f'UI string "{t[:48]}" ({where}) is placeholder text ("{hit}"): the product\'s real words, names and numbers'})
            continue
        b = SLOT.search(t)
        if b:
            findings.append({'rule': 'slot', 'severity': 'error', 'line': None, 'text': t, 'where': where,
                             'message': f'UI string "{t[:48]}" ({where}) still holds the slot {b.group(0)}: fill it with the product\'s own word or number'})
    return findings


def has_phrase(text, pats):
    low = ' ' + text.lower().replace('’', "'") + ' '
    hits = []
    for p in pats:
        m = re.search(r'(?<![\w-])(' + p + r')(?![\w-])', low)
        if m:
            hits.append(m.group(1).strip())
    return hits


def is_verb(w, prev=None, name_tokens=()):
    n = norm_word(w)
    if not n or n.startswith('['):
        return False
    if n in VERBS or CONTRACTIONS.match(n):
        return True
    if re.search(r'(ize|ise|ify|ate)(s|d|ed|ing)?$', n) and len(n) > 5:
        return True
    p = norm_word(prev) if prev else ''
    return bool(p) and (p in SUBJECTS or p in name_tokens) and n.isalpha()


DETS = {'your', 'the', 'a', 'an', 'my', 'our', 'their', 'his', 'her', 'its', 'this', 'that', 'every', 'each', 'no', 'one'}


def verbs_in(text, name_tokens=()):
    """The words that work as verbs: known verbs, a word after a subject or the name, and "[the] [noun] [-s]" ("Your week overflows")."""
    ws = words_of(text)
    out = []
    for i, w in enumerate(ws):
        n = norm_word(w)
        after_det = i >= 2 and norm_word(ws[i - 2]) in DETS and n.endswith('s') and n.isalpha() and not norm_word(ws[i - 1]) in DETS
        if is_verb(w, ws[i - 1] if i else None, name_tokens) or after_det:
            out.append(w)
    return out


def parse_time(s):
    s = (s or '').strip().lower().rstrip('s').strip()
    m = re.match(r'^(\d+):(\d+(?:\.\d+)?)', s)
    if m:
        return int(m.group(1)) * 60 + float(m.group(2))
    m = re.match(r'^(\d+(?:\.\d+)?)', s)
    return float(m.group(1)) if m else None


def from_markdown(text):
    """The Script table: the first table with a "Line" column after a heading that says Script."""
    fmt = name = None
    m = re.search(r'format:\s*([a-z-]+)', text, re.I)
    if m:
        fmt = m.group(1).lower()
    for m in re.finditer(r'^\*\*Name:\*\*\s*(.+?)\s*(·|$)', text, re.M):
        if '<' not in m.group(1):
            name = m.group(1).strip().strip('`')
            break
    m = re.search(r'^\*\*Marks:\*\*\s*(.+)$', text, re.M)
    marks = [x.strip().strip('`') for x in m.group(1).split(',') if x.strip() and '<' not in x] if m else []
    lines, in_script, header = [], False, None
    for raw in text.splitlines():
        if re.match(r'^#{1,6}\s', raw):
            if lines:
                break
            in_script = bool(re.search(r'script', raw, re.I))
            header = None
            continue
        if not in_script or not raw.strip().startswith('|'):
            if header is not None and lines and not raw.strip().startswith('|'):
                break
            continue
        cells = [c.strip() for c in raw.strip().strip('|').split('|')]
        if header is None:
            low = [c.lower() for c in cells]
            if any(c == 'line' or c.startswith('line (') for c in low):
                header = low
            continue
        if all(re.match(r'^:?-+:?$', c) for c in cells if c):
            continue
        row = dict(zip(header, cells))
        line = next((v for k, v in row.items() if k == 'line' or k.startswith('line (')), '')
        line = line.strip().strip('"“”').strip()
        if not line or line.startswith('<'):
            continue
        at = next((parse_time(v) for k, v in row.items() if k in ('at', 'at (s)', 'time', 'in', 'when')), None)
        role = next((v for k, v in row.items() if k.startswith('role')), '')
        lines.append({'text': line, 'at': at, 'role': role.lower()})
    return lines, fmt, name, marks


def from_text(text):
    lines = []
    for raw in text.splitlines():
        s = raw.strip()
        if not s or s.startswith('#'):
            continue
        m = re.match(r'^(\d+(?::\d+)?(?:\.\d+)?)\s*s?\s*\|\s*(.+)$', s)
        lines.append({'text': m.group(2).strip(), 'at': parse_time(m.group(1))} if m else {'text': s, 'at': None})
    return lines


def from_copy(doc, fps_flag=None):
    """COPY entries with frames: build chains joined into one line, ui strings set aside, the end card apart."""
    fps = doc.get('fps') or fps_flag or 60
    copy = sorted(doc.get('copy') or [], key=lambda c: (c.get('in', 0), c.get('id', '')))
    total = doc.get('total') or max([c.get('out') or 0 for c in copy] + [0])
    end = doc.get('end')
    lines, names, ui, seen = [], [], [], set()
    for c in copy:
        kind = c.get('kind') or 'copy'
        text = (c.get('text') or '').replace('\n', ' ').strip()
        if not text:
            continue
        out = c.get('out') if c.get('out') is not None else total
        is_end = out >= total - 1 or (end is not None and c.get('resolved', 0) >= end)
        if kind == 'ui':
            ui.append({'text': text, 'at': c.get('in', 0) / fps, 'end': is_end})
            continue
        if kind == 'name':
            names.append({'text': text, 'at': c.get('in', 0) / fps, 'end': is_end})
            continue
        ch = c.get('chain')
        if ch and c.get('mode') == 'build':
            if ch in seen:
                continue
            seen.add(ch)
            parts = [x for x in copy if x.get('chain') == ch]
            text = ' '.join((x.get('text') or '').replace('\n', ' ').strip() for x in parts)
            out = max((x.get('out') if x.get('out') is not None else total) for x in parts)
            is_end = out >= total - 1 or (end is not None and parts[-1].get('resolved', 0) >= end)
        lines.append({'text': text, 'at': c.get('in', 0) / fps, 'out': out / fps, 'id': ch or c.get('id'),
                      'swap': c.get('swap'), 'end': is_end})
    return lines, names, ui


def estimate_times(lines):
    """No times given: the house calm pace (a line resolves 32 + 12 f a word, reads max(60, 42 + 8 f a word), leaves in 17 f)."""
    t = 0.0
    for l in lines:
        n = max(1, len(words_of(l['text'])))
        l['at'], l['estimated'] = t, True
        t += (32 + 12 * (n - 1) + max(60, 42 + 8 * n) + 17) / 60


def film_marks(path=None):
    """The real marks the film shows: the names in public/logos/logos.json (scripts/logos.mjs writes it), found beside
    the script, up to three folders above it, or in the working folder (grid-check runs from the film)."""
    dirs = []
    if path:
        d = os.path.dirname(os.path.abspath(path))
        for _ in range(4):
            dirs.append(d)
            d = os.path.dirname(d)
    dirs.append(os.getcwd())
    for d in dict.fromkeys(dirs):
        rec = os.path.join(d, 'public', 'logos', 'logos.json')
        if os.path.isfile(rec):
            try:
                logos = json.load(open(rec, encoding='utf-8')).get('logos') or {}
            except (OSError, ValueError):
                return []
            out = []
            for key, e in logos.items():
                out += [e.get('name') or '', key.replace('-', ' ')]
            return [x for x in dict.fromkeys(out) if x.strip()]
    return []


def mark_list(text, marks):
    """A short list of the film's real marks in a line ("ChatGPT, Claude and Gemini"): the line with the list said as
    one word ("them"), or None when there is none, it is longer than 4, or nothing outside it does anything."""
    if not marks:
        return None
    item = '(?:' + '|'.join(re.escape(m) for m in sorted(marks, key=len, reverse=True)) + ')'
    m = re.search(r'(?<![\w-])' + item + r'(?:,\s+' + item + r')*,?\s+(?:and|or|&)\s+' + item + r'(?![\w-])', text, re.I)
    if not m or not 2 <= len(re.findall(r'(?<![\w-])' + item + r'(?![\w-])', m.group(0), re.I)) <= 4:
        return None
    rest = text[:m.start()] + text[m.end():]
    if not verbs_in(rest):
        return None  # a pile of names: no line says what happens with them
    return text[:m.start()] + 'them' + text[m.end():]


# ---------------------------------------------------------------------------------------------- checking
def guess_name(lines, names):
    for n in names:
        t = n['text'].strip().rstrip('.')
        if t and not VERSION.search(t) and len(words_of(t)) <= 3 and re.search(r'[A-Za-z\[]', t):
            return t
    for l in lines[:2]:
        m = re.match(r"^(.{1,30}?)\s+v?\d+(\.\d+)+\b", l['text'])
        if m and len(words_of(m.group(1))) <= 3:
            return m.group(1).strip()
    for l in lines:
        m = re.match(r"^(.{1,40}?)\s+(is (a|an|the|your)\b|turns\b.+\binto\b)", l['text'])
        if m and len(words_of(m.group(1))) <= 3:
            return m.group(1).strip()
    for l in lines:
        if l.get('end'):
            t = l['text'].strip().rstrip('.')
            if len(words_of(t)) <= 2 and not verbs_in(t):
                return t
    for l in lines[:2]:  # "Plumb reviews your pull requests.": a capitalised first word that does something
        ws = words_of(l['text'])
        first = norm_word(ws[0]) if ws else ''
        if len(ws) >= 2 and (ws[0][:1].isupper() or ws[0].startswith('[')) and first not in SUBJECTS | DETS \
                and first not in VERBS and is_verb(ws[1]) \
                and sum(1 for x in lines if first in [norm_word(w) for w in words_of(x['text'])]) >= 2:  # a name recurs
            return ws[0].strip('.,')
    return None


def what_kind(text, name):
    """How a line says what the product is: 'is' (a category), 'turns' (input into output), 'does' (name + verb)."""
    if not name:
        return None
    t = text.strip().replace('’', "'")
    nm = re.escape(name.strip())
    if re.match(nm + r"\s+(is|'s)\s+(a|an|the|your)\b", t, re.I):
        return 'is'
    if re.match(nm + r"\s+turns\b.+\binto\b", t, re.I):
        return 'turns'
    m = re.match(nm + r"\s+(\S+)", t, re.I)
    if m and is_verb(m.group(1)):
        return 'does'
    return None


def check(lines, names=(), ui=(), name=None, fmt=None, allow=(), marks=()):
    findings = []
    allow = {a.strip().lower() for a in allow if a.strip()}

    def add(rule, msg, line=None, sev='error'):
        findings.append({'rule': rule, 'severity': sev, 'line': None if line is None else line + 1,
                         'text': None if line is None else lines[line]['text'], 'message': msg})

    name = name or guess_name(lines, names)
    name_tokens = tuple(norm_word(w) for w in words_of(name)) if name else ()
    script = [i for i, l in enumerate(lines) if not l.get('end')]
    for i, l in enumerate(lines):
        t = l['text']
        ws = words_of(t)
        n = len(ws)
        low = t.lower()
        is_name = bool(name) and low.strip().rstrip('.') == name.lower()
        is_close = bool(URL.search(t) or CTA.search(t))
        is_version = bool(VERSION.search(t)) and n <= 3
        if n > MAX_WORDS:
            add('long', f'{n} words; a line holds {MIN_WORDS}-{MAX_WORDS}: cut it, or say it as two lines, each its own beat', i)
        if n == 1 and not (is_name or is_close or is_version or l.get('end')):
            add('keyword', 'one word is a label, not a line: say what it does in a short sentence', i)
        ph = placeholder_in(t)
        if ph:
            add('placeholder', f'"{ph}" is placeholder text: write the real line, in the words a customer would use', i)
        before = len(findings)
        hits = list(dict.fromkeys(h for h in has_phrase(t, VAGUE) if h not in allow))
        if hits:
            add('vague', f'{", ".join(repr(h) for h in hits)}: fancy words a customer would not say. Say the concrete thing it does, with a verb', i)
        hits = list(dict.fromkeys(h for h in has_phrase(t, METAPHOR) if h not in allow))
        if hits:
            add('metaphor', f'{", ".join(repr(h) for h in hits)}: a figure of speech. Name the real thing the product does instead', i)
        for pat, label in SLOGAN:
            if re.search(pat, low.replace('’', "'")):
                add('slogan', f'a slogan shape ({label}): write the plain sentence a person would say', i)
                break
        if re.search(r'[?!]', t):
            add('slogan', 'a question or an exclamation: say it as a plain statement', i)
        # more than one claim: two sentences, a dash, a list, two clauses joined by and/but
        body = URL.sub('URL', t)
        body = mark_list(body, marks) or body  # the film's real marks listed: one claim ("the products it works with")
        sentences = [s for s in re.split(r'(?<=[.;!?])\s+|\s+[—–-]\s+', body.strip()) if words_of(s)]
        plain_close = is_close and all(URL.search(x) or CTA.search(x) or (name and x.strip().rstrip('.').lower() == name.lower()) or VERSION.search(x) for x in sentences)
        if len(sentences) > 1 and not plain_close:
            add('claims', f'{len(sentences)} sentences in one line: one claim a line, each its own beat', i)
        elif len(sentences) > 1:
            pass
        elif body.count(', ') >= 2 or re.search(r'\w+,\s+\w+,?\s+(and|or)\s+\w+', body):
            add('claims', 'a list in one line: pick the one that matters, or give each its own line', i)
        else:
            parts = re.split(r',\s+|\s+(?:and|but|plus)\s+', body)
            if len(parts) > 1 and verbs_in(parts[0], name_tokens):
                for p in parts[1:]:
                    pw = words_of(p)
                    pw = pw[1:] if pw and norm_word(pw[0]) in ('then', 'also') else pw  # ", then compare": a second claim
                    lead = pw[1:2] if pw and norm_word(pw[0]) in SUBJECTS | set(name_tokens) else pw[:1]
                    after = pw[pw.index(lead[0]) + 1:pw.index(lead[0]) + 2] if lead else []
                    noun = bool(after) and norm_word(after[0]) in PREPOSITIONS
                    if lead and is_verb(lead[0]) and not noun:
                        add('claims', 'two claims joined in one line: keep the one the picture shows, give the other its own line', i)
                        break
        worded = any(f['rule'] in ('vague', 'metaphor', 'slogan') for f in findings[before:])
        if not (is_name or is_close or is_version or l.get('end') or worded) and n >= 1 and not verbs_in(t, name_tokens):
            abstract = [norm_word(w) for w in ws if norm_word(w) in ABSTRACT]
            add('verb', (f'{", ".join(repr(a) for a in abstract)} without a verb says nothing' if abstract else 'no verb, so it names a thing instead of saying what happens')
                + f': say what it does ("{name or "[Name]"} moves your meetings.")', i)
    # one clean line at a time
    timed_lines = [i for i in script if lines[i].get('out') is not None]
    for a_i, a in enumerate(timed_lines):
        for b in timed_lines[a_i + 1:]:
            A, B = lines[a], lines[b]
            if B['at'] < A['out'] - 1e-6 and not (B.get('swap') in (True, A.get('id'))):
                add('together', f'on screen with line {a + 1} ("{A["text"]}") from {B["at"]:.1f} s: one clean line at a time; '
                    f'let it leave first, or declare swap when this line takes its place in one move', b)
    for i, l in enumerate(lines):
        if re.search(r'\s/\s|<br\s*/?>', l['text']):
            add('together', 'two lines in one row: one clean line on screen at a time', i)
    # the product, named and said plainly, early
    fmt = (fmt or '').lower()
    every = [l['text'] for l in lines] + [n['text'] for n in names]
    named = bool(name) and any(name.lower() in t.lower() for t in every)
    structural = len(script) >= 2 or fmt in ('launch', 'update', 'walkthrough', 'feature', 'product')
    if fmt in ('loop', 'sting'):
        structural = False
    what = None
    if structural and fmt == 'update':
        early = [x for x in lines + list(names) + list(ui) if (x.get('at') or 0) <= WHAT_BY_S]
        has_name = bool(name) and any(name.lower() in x['text'].lower() for x in early)
        has_ver = any(VERSION.search(x['text']) or re.fullmatch(r'v?\d+(\.\d+)*', x['text'].strip()) for x in early)
        if not (has_name and has_ver):
            add('what-it-is', f'an update film opens on the name and the version ("{name or "[Name]"} 2.4") by {WHAT_BY_S:g} s'
                + ('' if has_name else ': the name is missing') + ('' if has_ver else ': the version is missing'))
        else:
            what = next((x['text'] for x in early if name.lower() in x['text'].lower()), None)
    elif structural:
        cands = [i for i in script[:2] if (lines[i].get('at') or 0) <= WHAT_BY_S + 1e-6]
        hit = next((i for i in cands if what_kind(lines[i]['text'], name)), None)
        if hit is None:
            late = next((i for i in script if what_kind(lines[i]['text'], name)), None)
            where = f' (line {late + 1} says it at {lines[late]["at"]:.1f} s: move it up)' if late is not None else ''
            add('what-it-is', f'no line says what the product is by {WHAT_BY_S:g} s{where}: open with "{name or "[Name]"} is a '
                f'[plain category] for [who]." or "{name or "[Name]"} turns [input] into [output]." as line 1 or 2')
        else:
            what = lines[hit]['text']
            lines[hit]['role'] = 'what it is'
    if structural and not named:
        add('name', 'no line names the product: a stranger cannot look it up. Say the name in the what-it-is line and on the end card'
            if name is None else f'"{name}" never appears on screen: say it in the what-it-is line and on the end card')
    tail = lines[-2:] + [n for n in names if n.get('end')] + [u for u in ui if u.get('end')]
    todo = next((x['text'] for x in reversed(tail) if URL.search(x['text']) or CTA.search(x['text'])), None)
    ends_named = bool(name) and any(name.lower() in x['text'].lower() for x in tail)
    if structural and fmt in ('launch', 'feature', 'product', 'walkthrough') and not (todo and ends_named):
        add('close', 'the end does not say ' + ' and '.join(w for w, ok in (('the name', ends_named), ('what to do (a URL or "Out now")', bool(todo))) if not ok)
            + ': close on the name and where to get it', sev='warn')
    for u in ui:
        ph = placeholder_in(u['text'])
        if ph:
            findings.append({'rule': 'placeholder', 'severity': 'error', 'line': None, 'text': u['text'],
                             'message': f'UI string "{u["text"][:48]}" is placeholder text ("{ph}"): the product\'s real words'})
    does = [lines[i]['text'] for i in script if lines[i]['text'] != what and not (URL.search(lines[i]['text']) or CTA.search(lines[i]['text']))]
    stranger = {'is': what, 'does': does, 'todo': todo}
    return findings, name, stranger


def summary(stranger, name):
    said = ' '.join(x for x in [stranger['is'], *stranger['does'], stranger['todo']] if x)
    return said or '(nothing: the film has no lines)'


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        print(__doc__.strip())
        return 0 if argv else 2
    a = {'name': None, 'format': None, 'fps': None, 'allow': '', 'marks': '', 'ui': None, 'json': False, 'strict': False, 'stdin': False, 'path': None}
    i = 0
    while i < len(argv):
        k = argv[i]
        if k in ('--json', '--strict', '--stdin'):
            a[k[2:]] = True
        elif k in ('--name', '--format', '--fps', '--allow', '--marks', '--ui'):
            if i + 1 >= len(argv):
                print(f'copy-check: {k} needs a value', file=sys.stderr)
                return 2
            a[k[2:]] = argv[i + 1]
            i += 1
        elif k.startswith('-'):
            print(f'copy-check: unknown option {k} (see --help)', file=sys.stderr)
            return 2
        else:
            a['path'] = k
        i += 1
    ui_strings, ui_source = [], None
    if a['ui']:
        try:
            if os.path.isdir(a['ui']):
                ui_strings = ui_strings_from_src(a['ui'])
            else:
                ui_strings = ui_strings_from_layout(json.load(open(a['ui'], encoding='utf-8')))
            ui_source = a['ui']
        except (OSError, ValueError) as e:
            print(f'copy-check: cannot read the UI strings in {a["ui"]}: {e}', file=sys.stderr)
            return 2
        if not a['path'] and not a['stdin']:
            found = check_ui(ui_strings)
            ok = not found
            if a['json']:
                print(json.dumps({'ok': ok, 'ui': {'source': ui_source, 'strings': len(ui_strings)}, 'findings': found,
                                  'summary': {'errors': len(found), 'warnings': 0}}, indent=1, ensure_ascii=False))
                return 0 if ok else 1
            print(f'copy-check: UI strings, {len(ui_strings)} read from {ui_source}')
            for f in found:
                print(f'error  {f["rule"]}: {f["message"]}')
            print(f'copy-check: {len(found)} error{"s" * (len(found) != 1)}' + ('' if ok else ': write the product\'s real words in its UI'))
            return 0 if ok else 1
    names, ui, fmt, name, marks = [], [], a['format'], a['name'], []
    try:
        if a['stdin'] or (a['path'] and a['path'].endswith('.json')):
            doc = json.loads(sys.stdin.read() if a['stdin'] else open(a['path'], encoding='utf-8').read())
            if isinstance(doc, list):
                doc = {'copy': doc}
            lines, names, ui = from_copy(doc, float(a['fps']) if a['fps'] else None)
            name = name or doc.get('name')
            fmt = fmt or doc.get('format')
            marks = [str(x) for x in doc.get('marks') or []]
            source = 'stdin' if a['stdin'] else a['path']
        elif a['path']:
            text = open(a['path'], encoding='utf-8').read()
            if a['path'].lower().endswith('.md'):
                lines, f2, n2, marks = from_markdown(text)
                fmt, name = fmt or f2, name or n2
            else:
                lines = from_text(text)
            source = a['path']
            fmt = fmt or 'launch'
        else:
            print('copy-check: give a script (TREATMENT.md, out/cues.json, a .txt) or --stdin', file=sys.stderr)
            return 2
    except (OSError, ValueError) as e:
        print(f'copy-check: cannot read the script: {e}', file=sys.stderr)
        return 2
    if not lines and not names:
        print(f'copy-check: no script found in {source} (a Script table with a "Line" column, COPY entries, or one line per row)', file=sys.stderr)
        return 2
    timed = all(l.get('at') is not None for l in lines)
    if not timed:
        estimate_times(lines)
    allow = a['allow'].split(',') if a['allow'] else []
    marks = [x.strip() for x in a['marks'].split(',') if x.strip()] + marks + film_marks(None if a['stdin'] else a['path'])
    findings, name, stranger = check(lines, names, ui, name, fmt, allow, marks)
    findings += check_ui(ui_strings)
    errors = [f for f in findings if f['severity'] == 'error']
    warns = [f for f in findings if f['severity'] == 'warn']
    ok = not errors and not (a['strict'] and warns)
    reads = summary(stranger, name)
    if a['json']:
        print(json.dumps({'ok': ok, 'source': source, 'format': fmt, 'name': name, 'timed': timed,
                          'lines': [{'line': i + 1, 'text': l['text'], 'words': len(words_of(l['text'])), 'at': round(l['at'], 2),
                                     'estimated': bool(l.get('estimated')), 'end': bool(l.get('end')), 'role': l.get('role') or None}
                                    for i, l in enumerate(lines)],
                          'findings': findings, 'stranger': {**stranger, 'reads': reads},
                          **({'ui': {'source': ui_source, 'strings': len(ui_strings)}} if ui_source else {}),
                          'summary': {'errors': len(errors), 'warnings': len(warns)}}, indent=1, ensure_ascii=False))
        return 0 if ok else 1
    print(f'copy-check: {source} ({fmt or "format unknown"}, name {json.dumps(name) if name else "unknown"}, {len(lines)} lines, '
          + ('times from the script' if timed else 'times estimated at the calm pace') + ')')
    for i, l in enumerate(lines):
        tag = '  [what it is]' if l.get('role') == 'what it is' else ('  [end card]' if l.get('end') else '')
        print(f'  {i + 1:>2}  {"~" if l.get("estimated") else " "}{l["at"]:5.1f} s  {l["text"]}  ({len(words_of(l["text"]))}){tag}')
    if ui_source:
        print(f'  UI strings: {len(ui_strings)} read from {ui_source}')
    for f in findings:
        where = f' line {f["line"]} "{f["text"]}"' if f['line'] else ''
        print(f'{f["severity"]:>5}  {f["rule"]}{where}: {f["message"]}')
    print(f'a stranger reads: {reads}')
    print(f'  what it is:   {stranger["is"] or "(not said)"}')
    print(f'  what it does: {" · ".join(stranger["does"]) or "(not said)"}')
    print(f'  what to do:   {stranger["todo"] or "(not said)"}')
    gaps = [w for w, ok in (('what it is', stranger['is']), ('what it does', stranger['does']), ('what to do', stranger['todo'])) if not ok]
    print('  verdict:      ' + ('clear' if not errors and not gaps else 'unclear: ' + '; '.join(
        (['not said: ' + ', '.join(gaps)] if gaps else []) + ([f'{len(errors)} line problem{"s" * (len(errors) != 1)}'] if errors else []))))
    print(f'copy-check: {len(errors)} error{"s" * (len(errors) != 1)}, {len(warns)} warning{"s" * (len(warns) != 1)}'
          + ('' if ok else ': rewrite the lines above before any picture work'))
    return 0 if ok else 1


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main(sys.argv[1:]))
