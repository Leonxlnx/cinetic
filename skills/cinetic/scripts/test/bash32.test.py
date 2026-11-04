#!/usr/bin/env python3
"""bash32.test.py: no heredoc inside a command or process substitution in the shell scripts.

macOS ships bash 3.2.57 as /bin/bash. To find the end of a $( ), a `...` or a <( ), its parser
scans the text as shell words, heredoc bodies included, so an apostrophe or an unbalanced
parenthesis in such a body breaks the parse ("unexpected EOF while looking for matching", #2).
The house rule: a heredoc goes in a shell function, and the substitution calls that function.

The scanner below tracks quotes, comments, heredoc bodies, arithmetic and the nesting of $( ),
`...`, <( ) and >( ) across lines, and reports every heredoc operator (<< or <<-, not the <<<
here-string) inside one, wherever its body starts. CI also parses every script with bash 3.2 itself
(bash -n); this check catches the construct on any bash, before a body that happens to parse today
gains an apostrophe. Known limit, shared with bash 3.2: the ')' of a case pattern inside a $( )
ends the substitution early.

Usage (from the skill root):  python3 scripts/test/bash32.test.py [file.sh ...]
  With no files it checks every .sh under the skill folder (node_modules excluded); CI passes
  every tracked .sh in the repository.
Exit codes: 0 all pass, 1 a self-test failed or a script has a heredoc inside a substitution.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..', '..'))
META = set(' \t\n;&|<>()')
WORD_START = set(' \t\n;&|()')


class Scanner:
    def __init__(self, src):
        self.s = src.replace('\r\n', '\n')
        self.n = len(self.s)
        self.found = []    # (line, message)
        self.pending = []  # heredocs whose body starts after the next newline: (word, strip_tabs)

    def line(self, i):
        return self.s.count('\n', 0, i) + 1

    def run(self):
        self.code(0, None, ())
        return self.found

    def code(self, i, closer, stack):
        """Shell code from i up to `closer` (')' or '`'; None at the top). Returns the index after it."""
        s, n = self.s, self.n
        parens, start = 0, i
        while i < n:
            c = s[i]
            if c == '\\':
                i += 2
            elif closer == '`' and c == '`':
                return i + 1
            elif c == ')' and closer == ')' and parens == 0:
                return i + 1
            elif c == '\n':
                i = self.bodies(i + 1)
            elif c == '#' and (i == start or s[i - 1] in WORD_START):
                j = s.find('\n', i)
                i = n if j < 0 else j
            elif c == "'":
                j = s.find("'", i + 1)
                i = n if j < 0 else j + 1
            elif c == '"':
                i = self.dquote(i + 1, stack)
            elif c == '`':
                i = self.code(i + 1, '`', stack + ('`...`',))
            elif c == '$':
                i = self.dollar(i, stack)
            elif s.startswith('<<<', i):
                i += 3
            elif s.startswith('<<', i):
                i = self.heredoc(i, stack)
            elif c in '<>' and s.startswith('(', i + 1):
                i = self.code(i + 2, ')', stack + (c + '( )',))
            elif s.startswith('((', i):
                i = self.arith(i + 2, stack)
            else:
                if c == '(':
                    parens += 1
                elif c == ')' and parens:
                    parens -= 1
                i += 1
        return n

    def dollar(self, i, stack):
        s = self.s
        if s.startswith('$((', i):
            return self.arith(i + 3, stack)
        if s.startswith('$(', i):
            return self.code(i + 2, ')', stack + ('$( )',))
        if s.startswith('${', i):
            return self.brace(i + 2, stack)
        if s.startswith("$'", i):
            j = i + 2
            while j < self.n and s[j] != "'":
                j += 2 if s[j] == '\\' else 1
            return j + 1
        if s.startswith('$"', i):
            return self.dquote(i + 2, stack)
        return i + 1

    def dquote(self, i, stack):
        s = self.s
        while i < self.n:
            c = s[i]
            if c == '\\':
                i += 2
            elif c == '"':
                return i + 1
            elif c == '$':
                i = self.dollar(i, stack)
            elif c == '`':
                i = self.code(i + 1, '`', stack + ('`...`',))
            else:
                i += 1
        return self.n

    def brace(self, i, stack):
        """${...}: up to the matching brace; substitutions inside it still count."""
        s, depth = self.s, 0
        while i < self.n:
            c = s[i]
            if c == '\\':
                i += 2
            elif c == '"':
                i = self.dquote(i + 1, stack)
            elif c == '$':
                i = self.dollar(i, stack)
            elif c == '`':
                i = self.code(i + 1, '`', stack + ('`...`',))
            elif c == '{':
                depth, i = depth + 1, i + 1
            elif c == '}':
                if depth == 0:
                    return i + 1
                depth, i = depth - 1, i + 1
            else:
                i += 1
        return self.n

    def arith(self, i, stack):
        """$(( )) or (( )): up to the closing '))'. Its << is a shift, not a heredoc."""
        s, depth = self.s, 0
        while i < self.n:
            c = s[i]
            if c == '$':
                i = self.dollar(i, stack)
                continue
            if c == '(':
                depth += 1
            elif c == ')':
                if depth == 0:
                    return i + (2 if s.startswith('))', i) else 1)
                depth -= 1
            i += 1
        return self.n

    def heredoc(self, i, stack):
        s, j = self.s, i + 2
        strip = j < self.n and s[j] == '-'
        j += strip
        while j < self.n and s[j] in ' \t':
            j += 1
        word = ''
        while j < self.n and s[j] not in META:
            if s[j] in '\'"':
                k = s.find(s[j], j + 1)
                k = self.n if k < 0 else k
                word, j = word + s[j + 1:k], k + 1
            elif s[j] == '\\':
                word, j = word + s[j + 1:j + 2], j + 2
            else:
                word, j = word + s[j], j + 1
        if not word:
            return i + 2
        self.pending.append((word, strip))
        if stack:
            where = stack[-1]
            self.found.append((self.line(i), f'heredoc <<{word} inside {where}: bash 3.2 scans its body as shell '
                                             f'code; move the heredoc into a function and call that inside {where}'))
        return j

    def bodies(self, i):
        """At the start of a line: skip the bodies of the heredocs opened on the line before."""
        for word, strip in self.pending:
            while i < self.n:
                j = self.s.find('\n', i)
                end = self.n if j < 0 else j
                body_line = self.s[i:end]
                i = end + 1
                if (body_line.lstrip('\t') if strip else body_line) == word:
                    break
        self.pending = []
        return min(i, self.n)


def scan(src):
    return Scanner(src).run()


# (name, script, number of heredocs inside a substitution it must report)
CASES = [
    ('issue #2: preflight heredoc in "$( )"', 'PRE="$(PROJ=x node - <<\'JS\'\nconst it = "it\'s";\nJS\n)" || die\n', 1),
    ('$( on one line, heredoc on the next', "X=$(\n  python3 - <<'PY'\nprint(\"it's\")\nPY\n)\n", 1),
    ('nested $( ) before the heredoc', 'Y=$(cat "$(dirname "$0")/a" <<EOF\nhi\nEOF\n)\n', 1),
    ('heredoc in backticks', 'Z=`cat <<EOF\nhi\nEOF\n`\n', 1),
    ('heredoc in <( )', 'diff a <(cat <<-EOF\n\tb\n\tEOF\n)\n', 1),
    ('heredoc in >( )', 'tee >(cat > f <<EOF\nx\nEOF\n) < /dev/null\n', 1),
    ('heredoc in $( ) inside ${...}', 'V="${A:-$(cat <<EOF\nx\nEOF\n)}"\n', 1),
    ('two heredocs in one $( )', "W=$(cat <<A; cat <<'B'\na\nA\nb\nB\n)\n", 2),
    ('heredoc at the top level', "cat <<'EOF'\nit's ( $(not code) `nor this`\nEOF\necho done\n", 0),
    ('heredoc in a function called inside $( )', "f() {\n  cat <<'EOF'\nit's (\nEOF\n}\nX=$(f)\n", 0),
    ('here-string in $( )', 'X=$(tr a b <<<"$Y")\n', 0),
    ('shift in $(( )) inside $( )', 'X=$(echo $((1 << 2)) $(( (3) << 1 )))\n', 0),
    ('shift in (( ))', 'f() { (( x = 1 << 4 )); }\n', 0),
    ('<< inside quotes in $( )', 'X=$(echo "a << b" \'c << d\' $\'e << f\')\n', 0),
    ('<< in comments', "# cat <<EOF\nX=$(  # not <<EOF either\n  echo hi)\n", 0),
    ("$# and ${#a[@]} are not comments", 'X=$(echo $# ${#a[@]})\ncat <<EOF\nok\nEOF\n', 0),
    ('heredoc after a closed $( )', 'X=$(date)\ncat <<EOF\n)\nEOF\n', 0),
    ('subshell parens inside $( )', "X=$( (cd /tmp && pwd) )\ncat <<'EOF'\nx\nEOF\n", 0),
]

failed = 0


def result(ok, name, detail=''):
    global failed
    if not ok:
        failed += 1
    print(f"{'pass' if ok else 'FAIL'}  {name}{f'  ({detail})' if detail else ''}")


for name, src, want in CASES:
    got = scan(src)
    result(len(got) == want, f'scanner: {name}', f'reported {len(got)}, want {want}' + ''.join(f'; line {ln}' for ln, _ in got))

files = [a for a in sys.argv[1:] if not a.startswith('-')]
if not files:
    for root, dirs, names in os.walk(SKILL):
        dirs[:] = sorted(d for d in dirs if d not in ('node_modules', '.git'))
        files += [os.path.join(root, f) for f in sorted(names) if f.endswith('.sh')]
if not files:
    result(False, 'found no .sh files to check')
for path in files:
    with open(path, encoding='utf-8') as fh:
        found = scan(fh.read())
    result(not found, f'{os.path.relpath(path)}: no heredoc inside a substitution')
    for ln, msg in found:
        print(f'      {os.path.relpath(path)}:{ln}: {msg}')

sys.exit(1 if failed else 0)
