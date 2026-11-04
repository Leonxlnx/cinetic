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
              "your way", "like never before", a question, an exclamation, "Plan. Track. Win."; (warning) two words of a
              short line that rhyme ("Launch by lunch.")
  claims      more than one claim in a line: two sentences, a list, two clauses joined by and/but. A short
              list (2-4) of the real marks the film shows is one claim ("Ask ChatGPT, Claude and Gemini."):
              the names in public/logos/logos.json (scripts/logos.mjs), `marks` in the cues, a **Marks:**
              line in TREATMENT.md or --marks; the rest of the line still needs a verb and one claim
  verb        a line with no verb (an abstract noun alone says nothing: "Total control.")
  together    two lines on screen at once (a line declared `swap` excepted)
  name        no line names the product
  what-it-is  no line says what the product is by 3 s (launch), or no "[Name] [version]" by 3 s (update)
  close       (warning) the film does not end on the name and what to do (a URL, "Out now")
  brief-claim a line states a fact BRIEF.md never gives: a price or "free", a figure (a number with what it counts),
              a superlative or a promise ("fastest", "only", "unlimited"); only with a BRIEF.md (--brief FILE, else beside
              the script, its project root or the working folder)
  placeholder a line or a UI string that marks itself unfinished: lorem ipsum, "Placeholder", "Label text", "Your
              text here", a generic label alone ("Button", "Caption") or a generic noun and a number ("Item 1");
              the lists are scripts/placeholders.json, which lint-film.mjs reads too
  repeats     (warning; COPY with ids: out/cues.json, grid-check's --stdin) a line that says what its own picture shows:
              two of its words (or half of them) are the strings its picture puts on screen (line<k> against ui<k>.*); the
              picture tells it, the line says what the picture cannot, or the pair keeps no line
  quantity    (warning) "every", "each", "all", "always", "automatically": a claim about many or every time, which one
              example on screen never proves: the picture shows three or more at once or the whole lifecycle (one next
              to a [bracketed placeholder] of a template's scaffold line passes)
  case       (out/cues.json) one case runs from the request to the result: with the spine (cues `spine`: its case and its
              acts' strings) the case's request, names or numbers (or two of the request's nouns) on screen in fewer than
              two acts is an error; without it, the brief's typed request (its content block's `prompt:`) against the
              strings COPY shows in each act (cues `acts`) is a warning
  scaffold    (out/cues.json) the script is still a template's sample: a content module of the film (src/*.ts: the
              file a template keeps its script and product strings in, the timeline) still carries its
              cinetic:placeholder marker, so its lines are stand-ins (a sample product, a sample domain, a slot), never
              this film's: write the film's own lines there, then delete the marker
  slot        (--ui) a UI string still holding a template's bracketed slot ("[Product]", "[N] items", "[$19]"): with
              --ui src every object value and list item of the film's source is read, whatever its key (a mark's
              logoName, a chip, a status, a pair's ui list), never a call's argument or a citation ("[2]")
  kit-sample  the kit's sample content in the film: a string of the kit's samples (assets/remotion-starter/src/kit/
              sample.ts, and the film's own copy of it: its sample products, workspaces such as "Zephyr Legal" or
              "Yarrow Analytics", rows, comments, tile and file names) in a script line, a UI string, the film's source
              (--ui src: every string literal outside kit/, lib/, fx/) or the render (--ui layout.json, --ocr)
  kit-sample-name (warning) a UI string that is one of the kit's sample people ("Mara K.")
  truncated   (--ui, --ocr) a UI title cut with "..." or "…": write it whole (shorter); an error in a final film
              (--final, or CINETIC_GATE=ship), a warning in dev
  cut-phrase  (--ui, --ocr) a status or UI line that stops mid-phrase (it ends on "to", "the", "and", "on", a comma
              or a dash): an error in a final film, a warning in dev
  ocr-small   (warning, --ocr) stills under 1600 px wide: a screen's 12-16 px strings are unreadable there, so sample
              content in them goes unseen; read full-size stills
Then it prints what a stranger reads: what it is, what it does, what to do, and each line's key words: the words
between asterisks in the line ("Brook is a *water bottle*.": the marks leave the text before any check), else a
suggestion (a number or a [slot], else the last word that is not a small word or the product's name). The film's
TypeLine sets its emphasis device on them (fx/TypeEmphasis); a template names them in its script's `keys`.

UI strings (--ui): every string the product's UI shows is real words too. --ui src reads the on-screen strings of the
film's source (JSX text, text/label/title/caption/meta/value/... props and keys, lists of rows, steps and options; fx/
and lib/ are house code and skipped); --ui out/qa/layout-Film.json reads the UI boxes the layout audit measured on the
render. Given alone (no script), only the UI strings are checked. --ocr reads what a render shows: a .txt (one string
per line, or "frame<TAB>text"), a .json list of strings, or still images (a PNG/JPG or a folder of them), read with
RapidOCR or Tesseract when installed, else Windows' own OCR; kit-sample, truncated and cut-phrase run on it.

Usage:
  python3 scripts/copy-check.py TREATMENT.md
  python3 scripts/copy-check.py out/cues.json --name Tessel
  python3 scripts/copy-check.py script.txt --format update --name Plumb
  options: --name N (the product's name)  --format launch|update|feature|loop|sting|walkthrough
           --fps N (cues without fps)  --allow word,word (the brand's own voice, recorded in BRIEF.md)
           --marks Name,Name (real marks the film shows, beside public/logos/logos.json)
           --json (machine-readable)  --strict (warnings fail too)  --stdin (JSON on stdin)
           --ui src|layout.json (the product's UI strings: placeholders and unfilled slots fail)
           --ocr file.txt|file.json|still.png|stills/ (the strings a render shows)
           --final (a final film: truncated and cut-phrase fail; also under CINETIC_GATE=ship)
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
# a bracketed slot: "[Product]", "[N] items", "[$19]", "[4 tasks, 3 owners]", "[0:42]"; never a bare number (a citation "[2]")
SLOT = re.compile(r'\[(?!\d{1,3}\])[A-Za-z$€£#@\d][^\]\n]{0,40}\]')


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
# the sound plan: its `action: 'text'` and `kind` names are cue labels, never on screen
SOUND_PLANS = {'sync.ts', 'music.ts'}


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
    """On-screen strings in a film's source: (text, 'file:line') pairs. kit/, fx/, lib/ (house code), node_modules and tests are skipped."""
    found = []
    skip = {'node_modules', 'fx', 'lib', 'kit', 'out', 'test', 'tests', '__pycache__', 'scripts'}
    pats = [
        (re.compile(r'(?<![=\-])>([^<>{}();=|&\n]*)<'), 1, ('.tsx', '.jsx')),
        (re.compile(r'>\s*\{\s*([\'"`])((?:(?!\1)[^\n$])*)\1\s*\}'), 2, ('.tsx', '.jsx')),
        (re.compile(r'(?<![\w-])(?:' + ON_SCREEN + r')\s*=\s*(?:\{\s*)?([\'"`])((?:(?!\1)[^\n$])*)\1'), 2, None),
        (re.compile(r'(?<![\w$.-])(?:' + ON_SCREEN + r')\s*:\s*([\'"`])((?:(?!\1)[^\n$])*)\1'), 2, None),
    ]
    # the list's body with its quoted items whole, so an item holding a ']' (a slot: '[AK]') never ends the list
    lists = re.compile(r'(?<![\w$.-])(?:' + LISTS + r')\s*:\s*\[((?:\'(?:[^\'\\\n]|\\.)*\'|"(?:[^"\\\n]|\\.)*"|[^\]\'"])*)\]')
    strs = re.compile(r'([\'"`])((?:(?!\1)[^\n$])*)\1')
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in skip]
        for f in files:
            if not f.endswith(('.ts', '.tsx', '.js', '.jsx')) or f.endswith('.d.ts') or f in SOUND_PLANS:
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


# A string literal in a content position: an object value (`key: '...'`), an array element (`['...', '...']`) or a
# template literal's text (`${NAME} turns ...`), never a call's argument (hashSeed('[Product]')) or a comparison.
_CONTENT_STR = re.compile(r"(?:[:\[,]|\?\?)\s*(?:'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\\n]|\\.)*)`)")
# prose with slots: words, numbers and punctuation a line or a label has, never code (=, <, >, {, }, (, ), ;)
_PROSE = re.compile(r"^[^=<>{}();\n]*$")
_ATTR_SEL = re.compile(r'^\[(?:data|aria)-[\w-]+(?:[~|^$*]?=[^\]]*)?\]$')


def slot_values_from_src(root):
    """Content values of a film's source that still hold a template's [slot]: (text, 'file:line') pairs. Every
    object value and array element is read, whatever its key (a change's `words`, a chip's `logoName`, a card's
    `event`, a launch pair's `ui` list, a source's `logo` slug), so an unfilled slot the key list of
    ui_strings_from_src does not name still fails. kit/, fx/, lib/ (house code), node_modules and tests are skipped."""
    out = []
    skip = {'node_modules', 'fx', 'lib', 'kit', 'out', 'test', 'tests', '__pycache__', 'scripts'}
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in skip]
        for f in files:
            if not f.endswith(('.ts', '.tsx', '.js', '.jsx')) or f.endswith('.d.ts') or f in SOUND_PLANS:
                continue
            path = os.path.join(d, f)
            try:
                code = _strip_comments(open(path, encoding='utf-8').read())
            except OSError:
                continue
            try:
                rel = os.path.relpath(path)
            except ValueError:
                rel = path
            for m in _CONTENT_STR.finditer(code):
                t = next((g for g in m.groups() if g is not None), '').strip()
                t = re.sub(r'\$\{[^}]*\}', '', t).strip() if m.group(3) is not None else t
                if not t or not SLOT.search(t) or not _PROSE.match(t) or _ATTR_SEL.match(t):
                    continue
                out.append((t, f'{rel}:{code.count(chr(10), 0, m.start()) + 1}'))
    return list(dict.fromkeys(out))


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


# ------------------------------------------------------------------------------------- the kit's sample content
_HERE = os.path.dirname(os.path.abspath(__file__))
KIT_SAMPLE_TS = os.path.join(_HERE, '..', 'assets', 'remotion-starter', 'src', 'kit', 'sample.ts')
# strings the kit's parts drew before the content gate, kept so an old film's render still fails on them
LEGACY_KIT = ['Last 12 weeks ·', 'members · Pro', 'Sent to print', 'Weekly spend']
_STR = re.compile(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"")


def _array(src, name):
    m = re.search(r'\b' + name + r'\s*(?::[^=]*)?=\s*\[([\s\S]*?)\];', src)
    return [a or b for a, b in _STR.findall(m.group(1))] if m else []


def _css_value(s):
    """A CSS or token value, never on-screen words: lowercase hyphenated keywords only ("tabular-nums lining-nums",
    "ease-in-out"), or a function call ("cubic-bezier(.2, 0, 0, 1)")."""
    t = s.strip()
    if re.fullmatch(r'[a-z][a-z0-9-]*\(.*\)', t):
        return True
    words = t.split()
    return bool(words) and all(re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)+', w) for w in words)


def kit_samples(extra=()):
    """The kit's sample strings: (phrases, names), read from the skill's kit/sample.ts and any film copies given."""
    phrases, names = set(LEGACY_KIT), set()
    for path in [KIT_SAMPLE_TS, *extra]:
        try:
            src = _strip_comments(open(path, encoding='utf-8').read())
        except OSError:
            continue
        for a, b in _STR.findall(src):
            s = (a or b).replace("\\'", "'").strip()
            if '${' in s or not re.search(r'[A-Za-z]', s) or _css_value(s):
                continue
            words = s.split()
            if len(words) >= 3 or len(s) >= 18:
                phrases.add(s)
        for m in re.finditer(r"\bproduct:\s*'([^']+)'", src):
            phrases.add(m.group(1))
        pre, suf = _array(src, 'COMPANY_PRE') or _array(src, 'PRE'), _array(src, 'COMPANY_SUF') or _array(src, 'SUF')
        phrases |= {f'{p} {s}' for p in pre for s in suf}
        names |= {m.group(1) for m in re.finditer(r"\bname:\s*'([A-Z][a-z]+ [A-Z]\.)'", src)}
    # house words and code that are not on screen (imports, keys) never count
    phrases = {p for p in phrases if not re.match(r'^(\.\.?/|[\w-]+/[\w./-]*$)', p)}
    return phrases, names


def _norm(s):
    return re.sub(r'[^0-9a-z]+', '', s.lower().replace('&', 'and'))


def sample_hits(text, phrases, names):
    """The kit sample strings a text shows: (phrase hits, name hits). Compared without case, space or punctuation."""
    n = _norm(text)
    if len(n) < 4:
        return [], []
    hits = sorted({p for p in phrases if len(_norm(p)) >= 6 and _norm(p) in n}, key=len, reverse=True)
    who = sorted({p for p in names if _norm(p) == n})
    return hits, who


def raw_strings_from_src(root):
    """Every string literal of a film's own source (kit/, lib/, fx/ and node_modules skipped): (text, 'file:line')."""
    out = []
    skip = {'node_modules', 'fx', 'lib', 'kit', 'out', 'test', 'tests', '__pycache__', 'scripts'}
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in skip]
        for f in files:
            if not f.endswith(('.ts', '.tsx', '.js', '.jsx')) or f.endswith('.d.ts'):
                continue
            path = os.path.join(d, f)
            # the design tokens (type-deal.ts writes TYPE_FEATURES and the faces there) hold values, not screen copy
            if f == 'tokens.ts' and os.path.basename(d) == 'brand':
                continue
            try:
                code = _strip_comments(open(path, encoding='utf-8').read())
            except OSError:
                continue
            try:
                rel = os.path.relpath(path)
            except ValueError:
                rel = path
            for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\$]|\\.)*)`|>([^<>{}\n]+)<", code):
                t = next(g for g in m.groups() if g is not None).strip()
                if re.search(r'[A-Za-z]', t) and not _css_value(t):
                    out.append((t, f'{rel}:{code.count(chr(10), 0, m.start()) + 1}'))
    return out


def film_kit_copies(root):
    """The film's own copy of the kit's sample file (an older kit keeps its samples in data.ts and tiles.tsx too)."""
    out = []
    for d in [root, os.path.join(root, 'src')]:
        for f in ('sample.ts', 'data.ts', 'tiles.tsx', 'parts.tsx', 'panels.tsx'):
            p = os.path.join(d, 'kit', f)
            if os.path.isfile(p):
                out.append(p)
    return out


TRUNC = re.compile(r'(\.\.\.|…)\s*$|\w(\.\.\.|…)\s+\S')
DANGLING = {'a', 'an', 'the', 'to', 'of', 'and', 'or', 'but', 'for', 'with', 'in', 'on', 'at', 'by', 'from', 'into',
            'your', 'my', 'our', 'their', 'its', 'is', 'are', 'was', 'be', 'that', 'this', 'as', 'than', 'via'}


def check_cut(strings, final, phrase=True, held=None):
    """Truncated titles ("...", "…") and (with `phrase`) lines cut mid-phrase in UI strings: errors in a final film,
    warnings in dev. Source strings take `phrase=False`: a JSX text before an {expression} ends mid-phrase by design.
    OCR strings pass `held`, the number of stills each string was read in: a line cut mid-phrase in one still only is a
    warning (a line still typing on, or an OCR misread); one held over two or more stills fails a final film."""
    sev = 'error' if final else 'warn'
    findings = []
    for t, where in strings:
        s = (t or '').strip()
        if not s:
            continue
        if TRUNC.search(s):
            findings.append({'rule': 'truncated', 'severity': sev, 'line': None, 'text': s, 'where': where,
                             'message': f'UI string "{s[:60]}" ({where}) is cut with an ellipsis: write the title whole (shorter), never truncated'})
            continue
        words = re.findall(r"[\w’']+", s)
        if phrase and len(words) >= 2 and (re.search(r'[,:;–—-]$', s) or words[-1].lower() in DANGLING) and not re.search(r'[.!?]$', s):
            once = held is not None and held.get(_norm(s), 0) < 2
            findings.append({'rule': 'cut-phrase', 'severity': 'warn' if once else sev, 'line': None, 'text': s, 'where': where,
                             'message': f'UI line "{s[:60]}" ({where}) stops mid-phrase ("{words[-1]}"): show the whole status line, or a shorter one that ends'})
    return findings


def check_samples(strings, phrases, names):
    """kit-sample findings over strings: the kit's sample content shown by the film."""
    findings = []
    for t, where in strings:
        hits, who = sample_hits(t, phrases, names)
        if hits:
            findings.append({'rule': 'kit-sample', 'severity': 'error', 'line': None, 'text': t, 'where': where,
                             'message': f'"{t[:60]}" ({where}) is the kit\'s sample content ("{hits[0]}"): show the product\'s own strings; '
                                        'the kit\'s samples are for its gallery and tests (sample())'})
        elif who:
            findings.append({'rule': 'kit-sample-name', 'severity': 'warn', 'line': None, 'text': t, 'where': where,
                             'message': f'"{t[:60]}" ({where}) is a name from the kit\'s sample people ("{who[0]}"): use the product\'s own people'})
    return findings


WIN_OCR = r"""param([string]$List)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
foreach ($p in (Get-Content -LiteralPath $List -Encoding UTF8)) {
  if (-not $p) { continue }
  $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($p)) ([Windows.Storage.StorageFile])
  $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  foreach ($line in $result.Lines) { Write-Output ("{0}`t{1}" -f (Split-Path $p -Leaf), $line.Text) }
  $stream.Dispose()
}
"""


def ocr_images(paths):
    """Text lines in still images: (text, 'image'). RapidOCR or Tesseract when installed, else Windows' own OCR."""
    import importlib
    out = []
    try:  # optional engines, loaded by name: neither is a requirement of the skill
        eng = importlib.import_module('rapidocr_onnxruntime').RapidOCR()
        for p in paths:
            res, _ = eng(p)
            out += [(r[1], os.path.basename(p)) for r in (res or [])]
        return out
    except ImportError:
        pass
    try:
        tess, image = importlib.import_module('pytesseract'), importlib.import_module('PIL.Image')
        for p in paths:
            out += [(ln, os.path.basename(p)) for ln in tess.image_to_string(image.open(p)).splitlines() if ln.strip()]
        return out
    except ImportError:
        pass
    if os.name == 'nt':
        import subprocess
        import tempfile
        with tempfile.TemporaryDirectory(prefix='cinetic-ocr-') as tmp:
            ps1, lst = os.path.join(tmp, 'ocr.ps1'), os.path.join(tmp, 'list.txt')
            open(ps1, 'w', encoding='utf-8').write(WIN_OCR)
            open(lst, 'w', encoding='utf-8').write('\n'.join(os.path.abspath(p) for p in paths))
            r = subprocess.run(['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-List', lst],
                               capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=900)
            if r.returncode != 0:
                raise OSError(f'Windows OCR failed: {(r.stderr or r.stdout).strip()[:200]}')
            for ln in r.stdout.splitlines():
                if '\t' in ln:
                    img, text = ln.split('\t', 1)
                    out.append((text, img))
        return out
    raise OSError('no OCR engine: pip install rapidocr_onnxruntime (or pytesseract), or give --ocr a .txt of the strings')


def _img_width(path):
    """An image's width in px (PNG header, else Pillow when installed), or None."""
    try:
        with open(path, 'rb') as f:
            head = f.read(24)
        if head[:8] == b'\x89PNG\r\n\x1a\n':
            return int.from_bytes(head[16:20], 'big')
        import importlib
        with importlib.import_module('PIL.Image').open(path) as im:
            return im.size[0]
    except Exception:
        return None


def ocr_small(path, need=1600):
    """The --ocr stills narrower than `need` px: a product screen's micro text (12-16 px at 1080p) is unreadable there."""
    imgs = ('.png', '.jpg', '.jpeg', '.webp', '.bmp')
    files = (sorted(os.path.join(path, f) for f in os.listdir(path) if f.lower().endswith(imgs)) if os.path.isdir(path)
             else [path] if path.lower().endswith(imgs) else [])
    return [(os.path.basename(f), w) for f in files for w in [_img_width(f)] if w and w < need]


def ocr_strings(path):
    """The strings a render shows, from --ocr: a .txt, a .json, an image or a folder of images."""
    imgs = ('.png', '.jpg', '.jpeg', '.webp', '.bmp')
    if os.path.isdir(path):
        return ocr_images(sorted(os.path.join(path, f) for f in os.listdir(path) if f.lower().endswith(imgs)))
    if path.lower().endswith(imgs):
        return ocr_images([path])
    text = open(path, encoding='utf-8', errors='replace').read()
    if path.lower().endswith('.json'):
        doc = json.loads(text)
        items = doc if isinstance(doc, list) else doc.get('strings') or doc.get('lines') or []
        out = []
        for i, x in enumerate(items):
            if isinstance(x, str):
                out.append((x, f'#{i + 1}'))
            elif isinstance(x, dict):
                for t in ([x['text']] if 'text' in x else []) + list(x.get('lines') or []):
                    out.append((t, f'f{x.get("frame", i)}'))
        return out
    out = []
    for i, ln in enumerate(text.splitlines()):
        if not ln.strip():
            continue
        where, t = (ln.split('\t', 1) if '\t' in ln else (f'line {i + 1}', ln))
        out.append((t.strip(), where.strip()))
    return out


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
            ui.append({'text': text, 'at': c.get('in', 0) / fps, 'end': is_end, 'id': c.get('id')})
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


_PLAIN = {'your', 'their', 'with', 'from', 'into', 'that', 'this', 'what', 'when', 'they', 'them', 'have', 'every', 'each',
          'before', 'after', 'just', 'only', 'more', 'less', 'than', 'over', 'under', 'about', 'there', 'here', 'make', 'makes'}


def _stem(w):
    """A word's crude stem: lower case, a plural or tense ending off (tests -> test, merged -> merg, merge -> merg)."""
    w = re.sub(r'[^a-z0-9]', '', w.lower())
    for suf in ('ing', 'ed', 'es', 's', 'e'):
        if len(w) > len(suf) + 3 and w.endswith(suf):
            return w[:-len(suf)]
    return w


def check_repeats(lines, ui, name):
    """repeats: a line that says what its own picture already shows (its words are the picture's strings: "Reviewers
    test it before they merge." over a card reading "All tests passed" and "Merge pull request"); line 1 is left out (it
    says what the product is, and its picture shows exactly that). The picture tells it;
    the line says what the picture cannot (who it is for, why it matters, what it saves), or the pair keeps no line.
    COPY ids pair them: line<k> and its picture's ui<k>.<j>."""
    out = []
    by = {}
    for u in ui:
        m = re.match(r'ui(\d+)\.', str(u.get('id') or ''))
        if m:
            by.setdefault(m.group(1), []).append(u['text'])
    nm = {_stem(w) for w in words_of(name or '')}
    for i, l in enumerate(lines):
        m = re.match(r'line(\d+)$', str(l.get('id') or ''))
        # line 1 says what the product is and its picture shows exactly that, literally: the one pair meant to agree
        if not m or m.group(1) not in by or i == 0:
            continue
        mine = {_stem(w) for w in words_of(l['text']) if len(_stem(w)) >= 4 and re.sub(r'[^a-z]', '', w.lower()) not in _PLAIN} - nm
        shown = {_stem(w) for t in by[m.group(1)] for w in words_of(t) if len(_stem(w)) >= 4}
        both = sorted(mine & shown)
        said = [re.sub(r'[^\w]', '', w) for w in words_of(l['text']) if _stem(w) in both]
        if mine and (len(both) >= 2 or (len(both) >= 1 and len(both) * 2 >= len(mine))):
            out.append({'rule': 'repeats', 'severity': 'warn', 'line': i + 1, 'text': l['text'],
                        'message': f'it says what its own picture shows ({", ".join(said)}: words its picture shows): the picture '
                                   'tells it; give the line what the picture cannot (who it is for, why it matters), or leave the line '
                                   'out of that pair (launch-simple: a pair with no line plays its picture alone)'})
    return out


_QUANT = re.compile(r"\b(every|each|all|any|always|automatically|whenever|never)\b", re.I)
_SLOT = re.compile(r"\[[^\[\]]*\]")


def _quant_claim(text):
    """The first quantifier that is copy. One inside a [bracketed placeholder] or next to one (only spaces between:
    "Every [record] gets [its fields filled].", "Ask it for any [task].") sits in a template's scaffold line, whose
    real words are not written yet, and passes."""
    slots = [(s.start(), s.end()) for s in _SLOT.finditer(text)]
    for m in _QUANT.finditer(text):
        if any(a <= m.start() and m.end() <= b for a, b in slots):
            continue
        if any((a >= m.end() and not text[m.end():a].strip()) or (b <= m.start() and not text[b:m.start()].strip())
               for a, b in slots):
            continue
        return m
    return None


def check_quantity(lines):
    """quantity: "every PR", "each order", "always": a claim about many or about every time. One PR on screen proves one;
    the picture shows the many (three or more at once, each with its result) or the lifecycle (it opens, works, and is
    gone when done), or the word lives only in text and the picture never tells it. A quantifier next to a [bracketed
    placeholder] is a template's unwritten line and passes."""
    out = []
    for i, l in enumerate(lines):
        if l.get('end'):
            continue
        m = _quant_claim(l['text'])
        if m:
            out.append({'rule': 'quantity', 'severity': 'warn', 'line': i + 1, 'text': l['text'],
                        'message': f'"{m.group(1)}" claims many (or every time): draw it, not one: three or more at once, each with '
                                   'its own result (every PR its own database, side by side), or the whole lifecycle (made, used, gone '
                                   'on merge); one example on screen proves one'})
    return out


def estimate_times(lines):
    """No times given: the house calm pace (a line resolves 28 + 11 f a word, reads max(52, 36 + 7 f a word), leaves in 15 f)."""
    t = 0.0
    for l in lines:
        n = max(1, len(words_of(l['text'])))
        l['at'], l['estimated'] = t, True
        t += (28 + 11 * (n - 1) + max(52, 36 + 7 * n) + 15) / 60


# the film's own source files that are entry points, sound or the dealt direction, not content (precheck.mjs NOT_CONTENT)
_NOT_CONTENT = {'index.ts', 'blur.ts', 'sync.ts', 'music.ts', 'logos.ts', 'deal.ts'}


def scaffold_markers(path):
    """The content modules of the film a cues.json belongs to that still carry a template's cinetic:placeholder marker:
    (file, line) pairs. The film is the first folder holding src/timeline.ts at or above the cues file's folder."""
    d = os.path.dirname(os.path.abspath(path))
    for _ in range(4):
        if os.path.isfile(os.path.join(d, 'src', 'timeline.ts')):
            break
        d = os.path.dirname(d)
    else:
        return []
    src = os.path.join(d, 'src')
    out = []
    for f in sorted(os.listdir(src)):
        if not f.endswith('.ts') or f.endswith('.d.ts') or f in _NOT_CONTENT:
            continue
        try:
            text = open(os.path.join(src, f), encoding='utf-8').read()
        except OSError:
            continue
        m = re.search(r'cinetic:placeholder\b', text)
        if m:
            out.append((f'src/{f}', text.count('\n', 0, m.start()) + 1))
    return out


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
KEY_SKIP = set('a an the of for to in on at by with and or but so your our my its it it\'s is are be was were this that these '
               'those you we they i me us them from into as all any every more most just now then than out up'.split())


def key_marks(text):
    """A line's *marks*: the clean text and the marked key words (None when the line marks none)."""
    if '*' not in text:
        return text, None
    parts = text.split('*')
    clean = re.sub(r'\s+', ' ', ''.join(parts)).strip()
    key = parts[1].strip() if len(parts) >= 3 else ''
    return clean, (key or None)


def suggest_key(text, name=None):
    """The words a line's emphasis lands on when it marks none: a number or a [slot], else the last word that is not a
    small word or the product's name."""
    bare = [re.sub(r"^[^\w\[]+|[^\w\]%]+$", '', w) for w in words_of(text)]
    bare = [w for w in bare if w]
    for w in bare:
        if re.search(r'\d', w) or w.startswith('['):
            return w
    nm = norm_word(name or '')
    for w in reversed(bare):
        if w.lower() not in KEY_SKIP and norm_word(w) != nm:
            return w
    return bare[-1] if bare else ''


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


RHYME_SUFFIX = ('ing', 'ion', 'ions', 'ed', 'ly', 'es', 'er', 'ers', 'ies', 'est', 'ness', 'ment', 'ments', 'able', 'ive', 'ous',
                'al', 'ity', 'ful', 'ally', 'ent', 'ant')


def rhyme_in(ws, skip=()):
    """Two words of a short line that rhyme (the same last three or four letters, not a common suffix): a slogan's ring,
    "Launch by lunch.", never a plain claim. Returns the pair or None."""
    w = [norm_word(x) for x in ws]
    w = [x for x in w if len(x) >= 4 and x not in KEY_SKIP and x not in skip]
    for i in range(len(w)):
        for j in range(i + 1, len(w)):
            a, b = w[i], w[j]
            if a == b or a.endswith(b) or b.endswith(a):
                continue
            if a[-3:] == b[-3:] and not any(a.endswith(x) and b.endswith(x) for x in RHYME_SUFFIX):
                return a, b
    return None


CLAIM_WORDS = ('free', 'unlimited', 'guaranteed', 'fastest', 'cheapest', 'first', 'only', 'best', '#1', 'number one', 'no credit card',
               'forever', 'instant', 'instantly')


def brief_claims(text, brief):
    """Facts a line states that the brief never gives: a price or "free", a figure (a number with what it counts), a
    superlative or a promise. Only with a BRIEF.md; the brief's own words (and the product's URL) pass."""
    if not brief:
        return []
    low, b = text.lower(), brief.lower()
    out = []
    for w in CLAIM_WORDS:
        if re.search(r'(?<![\w#])' + re.escape(w) + r'(?!\w)', low) and not re.search(r'(?<![\w#])' + re.escape(w) + r'(?!\w)', b):
            out.append(w)
    for m in re.finditer(r'[$€£]?\d+(?:[.,]\d+)?\s*(?:%|x\b|k\b|m\b)?', URL.sub(' ', text)):
        tok = m.group(0).strip()
        num = re.sub(r'[^\d.,]', '', tok)
        if num and num not in b:
            out.append(tok)
    return list(dict.fromkeys(out))


CASE_STOP = {'a', 'an', 'the', 'for', 'my', 'our', 'your', 'to', 'of', 'in', 'on', 'at', 'and', 'with', 'from', 'by', 'is', 'it', 'me',
             'i', 'we', 'you', 'this', 'that', 'can', 'could', 'please', 'make', 'want', 'new'}


def _case_norm(s):
    return re.sub(r'[^\w$€£%.]+', ' ', str(s).lower()).strip()


def brief_request(brief):
    """The request the brief's content block types (`prompt: ...`): the case a film without a spine follows."""
    m = re.search(r'^\s*prompt:\s*(.+?)\s*$', brief or '', re.M | re.I)
    return m.group(1) if m else None


def check_case(doc, brief=None):
    """case: the request made early returns later. With the spine (cues `spine`: its case, its acts and their strings) the
    case's request, names or numbers (or two of the request's nouns) are on screen in two acts or more, the later one
    after the first: an error otherwise. Without it, the brief's typed request against the strings COPY puts on screen
    in each act (cues `acts`): a warning (COPY may not list every string the product shows)."""
    sp = doc.get('spine') if isinstance(doc.get('spine'), dict) else None
    case = (sp or {}).get('case') or {}
    request = str(case.get('request') or '').strip() or (brief_request(brief) if not sp else '')
    names = [str(x) for x in case.get('names') or [] if str(x).strip()]
    numbers = [str(x) for x in case.get('numbers') or [] if str(x).strip()]
    if not request and not names and not numbers:
        return []
    fps = doc.get('fps') or 60
    if sp and isinstance(sp.get('acts'), list) and sp['acts']:
        acts = [(float(a.get('from', 0)), float(a.get('to', 0)), [str(s) for s in a.get('strings') or []]) for a in sp['acts'] if isinstance(a, dict)]
    else:
        acts = sorted(((float(v.get('from', 0)), float(v.get('from', 0)) + float(v.get('dur', 0)), []) for v in (doc.get('acts') or {}).values()
                       if isinstance(v, dict)), key=lambda x: x[0])
    if len(acts) < 2:
        return []
    copy = [c for c in doc.get('copy') or [] if isinstance(c, dict) and c.get('text')]
    nouns = list(dict.fromkeys(w for w in _case_norm(request).split() if len(w) >= 3 and w not in CASE_STOP))
    shows = []
    for a, b, own in acts:
        text = _case_norm(' | '.join(own + [c['text'] for c in copy if (c.get('in') or 0) < b and (c.get('out') if c.get('out') is not None else b) > a]))
        hit = bool(text) and ((request and _case_norm(request) in text) or any(_case_norm(x) in text for x in names + numbers)
                              or (nouns and sum(1 for w in nouns if re.search(r'(^|\W)' + re.escape(w) + r'(\W|$)', text)) >= min(2, len(nouns))))
        shows.append(hit)
    k = [i for i, h in enumerate(shows) if h]
    if len(k) >= 2:
        return []
    where = f'act {k[0] + 1} only' if k else 'no act'
    what = f'"{request}"' if request else ', '.join(names + numbers)
    if sp:
        return [{'rule': 'case', 'severity': 'error', 'line': None, 'text': request, 'where': where,
                 'message': f'the case {what} is on screen in {where} (of {len(acts)} acts): the request made early is the result shown later. Give the later '
                            'acts the case\'s own words (the request, its names and numbers) in what the product shows, and list them in each act\'s strings'}]
    return [{'rule': 'case', 'severity': 'warn', 'line': None, 'text': request, 'where': where,
             'message': f'the brief\'s request {what} shows in the on-screen strings of {where} (of {len(acts)} acts): one case runs from the request to '
                        'the result, the same names and numbers in the later acts (declare the strings the product shows as COPY ui entries, '
                        'or play the template\'s spine)'}]


def check(lines, names=(), ui=(), name=None, fmt=None, allow=(), marks=(), brief=None):
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
        if n <= 5 and not (is_name or is_close or is_version):
            rh = rhyme_in(ws, name_tokens)
            if rh:
                add('slogan', f'{rh[0]!r} rhymes with {rh[1]!r}: a rhyming slogan, not a plain claim; say what it does', i, 'warn')
        bc = brief_claims(t, brief)
        if bc:
            add('brief-claim', f'{", ".join(repr(x) for x in bc)}: a claim BRIEF.md does not make (a price, "free", a figure, a superlative); '
                'say only what the brief gives, or ask', i)
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
    a = {'name': None, 'format': None, 'fps': None, 'allow': '', 'marks': '', 'ui': None, 'ocr': None, 'json': False, 'strict': False, 'stdin': False, 'final': False, 'path': None, 'brief': None}
    i = 0
    while i < len(argv):
        k = argv[i]
        if k in ('--json', '--strict', '--stdin', '--final'):
            a[k[2:]] = True
        elif k in ('--name', '--format', '--fps', '--allow', '--marks', '--ui', '--ocr', '--brief'):
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
    final = a['final'] or os.environ.get('CINETIC_GATE') == 'ship'
    ui_strings, ui_source, raw_src, ocr, copies, slot_src = [], None, [], [], [], []
    if a['ui']:
        try:
            if os.path.isdir(a['ui']):
                ui_strings = ui_strings_from_src(a['ui'])
                raw_src = raw_strings_from_src(a['ui'])
                slot_src = slot_values_from_src(a['ui'])
                copies = film_kit_copies(a['ui'])
            else:
                ui_strings = ui_strings_from_layout(json.load(open(a['ui'], encoding='utf-8')))
            ui_source = a['ui']
        except (OSError, ValueError) as e:
            print(f'copy-check: cannot read the UI strings in {a["ui"]}: {e}', file=sys.stderr)
            return 2
    if a['ocr']:
        try:
            ocr = ocr_strings(a['ocr'])
        except (OSError, ValueError) as e:
            print(f'copy-check: cannot read the render\'s strings in {a["ocr"]}: {e}', file=sys.stderr)
            return 2
    phrases, names = kit_samples(copies)
    held = {}
    for t, w in dict.fromkeys(ocr):
        held[_norm(t)] = held.get(_norm(t), 0) + 1

    def ui_findings():
        seen = {t for t, _ in ui_strings}
        src_only = [(t, w) for t, w in raw_src if t not in seen]
        small = ocr_small(a['ocr']) if a['ocr'] else []
        res = [{'rule': 'ocr-small', 'severity': 'warn', 'line': None, 'text': '', 'where': small[0][0],
                'message': f'{len(small)} still(s) read by OCR are {small[0][1]} px wide: a screen\'s small strings (12-16 px at '
                           '1080p) are unreadable there, so sample content in them goes unseen: give --ocr full-size stills'}] if small else []
        # a [slot] in any content value the key list above does not read (its key is not an on-screen word)
        slot_only = [(t, w) for t, w in slot_src if t not in seen]
        return (res + check_ui(ui_strings) + check_ui(slot_only) + check_samples(ui_strings + src_only + ocr, phrases, names)
                + check_cut([] if raw_src else ui_strings, final) + check_cut(ocr, final, held=held)
                + check_cut(ui_strings if raw_src else [], final, phrase=False))

    if (a['ui'] or a['ocr']) and not a['path'] and not a['stdin']:
        found = ui_findings()
        errs = [f for f in found if f['severity'] == 'error']
        wrn = [f for f in found if f['severity'] == 'warn']
        ok = not errs and not (a['strict'] and wrn)
        srcs = {k: v for k, v in (('ui', {'source': ui_source, 'strings': len(ui_strings)} if ui_source else None),
                                  ('ocr', {'source': a['ocr'], 'strings': len(ocr)} if a['ocr'] else None)) if v}
        if a['json']:
            print(json.dumps({'ok': ok, **srcs, 'final': final, 'findings': found,
                              'summary': {'errors': len(errs), 'warnings': len(wrn)}}, indent=1, ensure_ascii=False))
            return 0 if ok else 1
        if ui_source:
            print(f'copy-check: UI strings, {len(ui_strings)} read from {ui_source}')
        if a['ocr']:
            print(f'copy-check: {len(ocr)} strings read from the render ({a["ocr"]})')
        for f in found:
            print(f'{f["severity"]:>5}  {f["rule"]}: {f["message"]}')
        print(f'copy-check: {len(errs)} error{"s" * (len(errs) != 1)}, {len(wrn)} warning{"s" * (len(wrn) != 1)}' + ('' if ok else ': write the product\'s real words in its UI'))
        return 0 if ok else 1
    names, ui, fmt, name, marks, doc = [], [], a['format'], a['name'], [], None
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
    marked = []
    for l in lines:  # *marks* name the key words; the checks read the clean line
        l['text'], key = key_marks(l['text'])
        marked.append(key)
    # the brief the claims are held to: --brief, else BRIEF.md beside the script, its project root or the working folder
    here = os.path.dirname(os.path.abspath(a['path'])) if a['path'] and not a['stdin'] else os.getcwd()
    brief = None
    up = [os.path.join(here, '..', 'BRIEF.md')] if os.path.basename(here) == 'out' else []  # out/cues.json: the project root
    for bp in ([a['brief']] if a['brief'] else []) + [os.path.join(here, 'BRIEF.md')] + up + ['BRIEF.md']:
        if bp and os.path.isfile(bp):
            brief = open(bp, encoding='utf-8').read()
            break
    findings, name, stranger = check(lines, names, ui, name, fmt, allow, marks, brief)
    if isinstance(doc, dict):
        findings += check_case(doc, brief)
    if a['path'] and a['path'].endswith('.json') and not a['stdin']:
        for f, ln in scaffold_markers(a['path']):
            findings.append({'rule': 'scaffold', 'severity': 'error', 'line': None, 'text': '', 'where': f'{f}:{ln}',
                             'message': f'the script is still the template\'s sample: {f}:{ln} carries its cinetic:placeholder marker, so '
                                        'these lines are stand-ins (a sample product, a sample domain, a slot), not this film\'s: write the '
                                        'film\'s own lines and strings there (references/copy-and-type.md), then delete the marker'})
    keys = [{'line': i + 1, 'key': k or suggest_key(l['text'], name), 'marked': k is not None} for i, (l, k) in enumerate(zip(lines, marked))]
    findings += ui_findings()
    findings += check_repeats(lines, ui, name) + check_quantity(lines)
    script_strings = [(l['text'], f'line {i + 1}') for i, l in enumerate(lines)] + [(u['text'], 'COPY ui') for u in ui] + [(n['text'], 'COPY name') for n in names]
    findings += check_samples(script_strings, phrases, set())
    findings += check_cut([(u['text'], 'COPY ui') for u in ui], final)
    errors = [f for f in findings if f['severity'] == 'error']
    warns = [f for f in findings if f['severity'] == 'warn']
    ok = not errors and not (a['strict'] and warns)
    reads = summary(stranger, name)
    if a['json']:
        print(json.dumps({'ok': ok, 'source': source, 'format': fmt, 'name': name, 'timed': timed,
                          'lines': [{'line': i + 1, 'text': l['text'], 'words': len(words_of(l['text'])), 'at': round(l['at'], 2),
                                     'estimated': bool(l.get('estimated')), 'end': bool(l.get('end')), 'role': l.get('role') or None}
                                    for i, l in enumerate(lines)],
                          'findings': findings, 'stranger': {**stranger, 'reads': reads}, 'keys': keys,
                          **({'ui': {'source': ui_source, 'strings': len(ui_strings)}} if ui_source else {}),
                          **({'ocr': {'source': a['ocr'], 'strings': len(ocr)}} if a['ocr'] else {}),
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
    print('key words (the emphasis lands on them; ~ suggested: mark the line\'s own with *asterisks*): ' + ' · '.join(
        f'{k["line"]} {"" if k["marked"] else "~"}"{k["key"]}"' for k in keys))
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
