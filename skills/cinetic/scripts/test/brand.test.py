#!/usr/bin/env python3
"""brand.test.py: regression tests for brand.py, the brand-kit intake.

  1. A full kit (scripts/test/brand-fixtures/kit-a plus a screenshot, a TTF face and an italic face made
     here): named colours give the roles, a second hue is recorded and kept out of the tokens, the mark
     splits into its three named parts, the wordmark is found, unsafe SVG content is stripped.
  2. Writing into a film project: tokens.ts keeps every role key and the type scale, marks the supplied
     colours cinetic:brand-supplied, drops the palette placeholder, and passes palette.py --check-tokens;
     logo.ts parses the logo for LogoMark; fonts.ts imports the vendored face; FONT and FACES name it;
     the screenshot is copied to public/brand/ and listed.
  3. A logo-only kit: the colours are measured from the SVG fills (source "measured").
  4. A dark-ground kit with CSS custom properties: the starter's paper and ink stages take the brand's
     light and dark neutrals and its surface grey, the mark splits by its group ids.
 4b. A cobalt kit with cool greys: paper, soft panels and hairlines are the kit's own greys and whatever is
     derived keeps their chroma, never a ground at the accent hue; an accent-only kit gets plain greys.
  5. A raster logo (a PNG made here) is placed whole; its colours are measured without any image library.
  6. --check re-reads brand.json and fails when the tokens no longer hold contrast; a folder that is not
     a film project is refused; deck.py --brand reads what brand.py wrote.
  7. House wording in brand.py.
  8. Real kits: --out writes brand.json before a project exists, and a folder that is not a project is refused
     before anything is copied into it; a photos folder wins over a file name (photos/landmark.jpg is a photo);
     files it cannot place are listed as unused; CSS comments are skipped and custom properties win over rules;
     --bg names the ground and --border the line; an orange brand's lifted accent is marked brand-supplied (or
     is the accent itself when it holds 3:1 on the slate); a warm-grey kit with a dark neutral keeps its slate
     off brown and mauve.
  9. palette.py --recipe slateMid writes the starter's names (slate the stage, ink the darkest, accentLift the
     accent) and passes --check-tokens on the slate; --temp grey writes untinted greys.

Usage (from the skill root):  python3 scripts/test/brand.test.py [--verbose]
Exit codes: 0 all pass, 1 a test failed.
"""
import importlib.util
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, '..', '..'))
BRAND = os.path.join(SKILL, 'scripts', 'brand.py')
DECK = os.path.join(SKILL, 'scripts', 'deck.py')
FIX = os.path.join(HERE, 'brand-fixtures')
STARTER_BRAND = os.path.join(SKILL, 'assets', 'remotion-starter', 'src', 'brand')
VERBOSE = '--verbose' in sys.argv
TMP = tempfile.mkdtemp(prefix='brand-test-')
failed = 0


def result(ok, name, detail=''):
    global failed
    if not ok:
        failed += 1
    print(f"{'pass' if ok else 'FAIL'}  {name}{f'  ({detail})' if detail else ''}")


def run(*args, script=BRAND):
    r = subprocess.run([sys.executable, script, *args], capture_output=True, text=True, encoding='utf-8',
                       env=dict(os.environ, PYTHONUTF8='1', PYTHONDONTWRITEBYTECODE='1'))
    if VERBOSE:
        print(f'  $ {os.path.basename(script)} {" ".join(args)} -> {r.returncode}\n' + r.stdout[-1200:] + r.stderr[-1200:])
    return r


def png(path, w, h, pixel):
    """A small RGBA PNG written with zlib: pixel(x, y) -> (r, g, b, a)."""
    raw = b''.join(b'\x00' + bytes(v for x in range(w) for v in pixel(x, y)) for y in range(h))

    def chunk(kind, body):
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body) & 0xFFFFFFFF)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
                           + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))


def ttf(path, family, sub, weight, italic=False):
    """A minimal sfnt with a name table (family, subfamily) and an OS/2 table (weight, italic bit)."""
    names = [(1, family), (2, sub), (16, family), (17, sub)]
    strings, recs, off = b'', b'', 0
    for nid, s in names:
        b = s.encode('utf-16-be')
        recs += struct.pack('>HHHHHH', 3, 1, 0x409, nid, len(b), off)
        strings += b
        off += len(b)
    name = struct.pack('>HHH', 0, len(names), 6 + 12 * len(names)) + recs + strings
    os2 = bytearray(78)
    struct.pack_into('>H', os2, 4, weight)
    struct.pack_into('>H', os2, 62, 1 if italic else 0x40)
    tables = [(b'OS/2', bytes(os2)), (b'name', name)]
    head = struct.pack('>IHHHH', 0x00010000, len(tables), 32, 1, 0)
    offset = 12 + 16 * len(tables)
    dir_, body = b'', b''
    for tag, data in tables:
        dir_ += struct.pack('>4sIII', tag, 0, offset + len(body), len(data))
        body += data + b'\0' * ((4 - len(data) % 4) % 4)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "wb").write(head + dir_ + body)


def project(name):
    """A film project's brand folder: the starter's tokens.ts, fonts.ts and Mark.tsx."""
    d = os.path.join(TMP, name)
    os.makedirs(os.path.join(d, 'src', 'brand'), exist_ok=True)
    for f in ('tokens.ts', 'fonts.ts', 'Mark.tsx'):
        shutil.copy2(os.path.join(STARTER_BRAND, f), os.path.join(d, 'src', 'brand', f))
    return d


def read(*parts):
    p = os.path.join(*parts)
    return open(p, encoding='utf-8').read() if os.path.isfile(p) else ''


spec = importlib.util.spec_from_file_location('brand', BRAND)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

# 1. a full kit ----------------------------------------------------------------------------------------
kit = os.path.join(TMP, 'kit-a')
shutil.copytree(os.path.join(FIX, 'kit-a'), kit)
png(os.path.join(kit, 'screenshots', 'home.png'), 48, 30, lambda x, y: (244, 246, 250, 255) if y > 6 else (15, 26, 43, 255))
ttf(os.path.join(kit, 'fonts', 'LedgerSans-SemiBold.ttf'), 'Ledger Sans', 'SemiBold', 600)
ttf(os.path.join(kit, 'fonts', 'LedgerSans-Italic.ttf'), 'Ledger Sans', 'Italic', 400, italic=True)
r = run(kit, '--dry-run')
js = r.stdout[:r.stdout.rfind('}\nexport const C') + 1] if 'export const C' in r.stdout else r.stdout
try:
    b = json.loads(js)
except ValueError:
    b = {}
col = b.get('colours', {})
result(r.returncode == 0 and col.get('source') == 'supplied' and col.get('accent') == '#1F6FEB' and b.get('name') == 'Ledgerly',
       'named colours give the accent; the name comes from the logo file', (r.stderr or '')[-200:])
result(col.get('second_hues') == ['#1FAA59'] and any('accent hues' in w for w in b.get('warnings', [])),
       'a second brand hue is recorded and kept for product UI states and imagery')
mark = (b.get('logo') or {}).get('mark') or {}
result(mark.get('parts') == ['page', 'fold', 'tick'] and mark.get('split') == 'leaves' and (b.get('logo') or {}).get('wordmark'),
       'the mark splits into its three named parts; the wordmark file is found', json.dumps(mark)[:160])
fonts = b.get('fonts', {})
result(fonts.get('family') == 'Ledger Sans' and fonts.get('faces') == [{'file': 'LedgerSans-SemiBold.ttf', 'weight': 600}]
       and fonts.get('skipped') == ['LedgerSans-Italic.ttf'],
       'the family and weight come from the font\'s name and OS/2 tables; the italic face is skipped', json.dumps(fonts)[:200])
result(mod.font_from_filename('Brandsans-ExtraBold.woff2') == ('Brandsans', 800, False)
       and mod.font_from_filename('Acme_Grotesk-500.otf') == ('Acme', 500, False) and mod.font_from_filename('Acme-BoldItalic.woff')[2],
       'a face whose tables cannot be read takes its family and weight from the file name')
result(b.get('screenshots') and b['screenshots'][0]['file'] == 'home.png' and 'live UI' in b['screenshots'][0]['use'],
       'a screenshot is recorded with how the film uses it (rebuilt as live UI)')

# 2. writing into a film project --------------------------------------------------------------------
proj = project('film-a')
r = run(kit, '--project', proj)
tok = read(proj, 'src', 'brand', 'tokens.ts')
starter = read(STARTER_BRAND, 'tokens.ts').replace('\r\n', '\n')
keys = re.findall(r'^\s+(\w+): \'#', re.search(r'export const C = \{[\s\S]*?\n\};', tok).group(0), re.M) if 'export const C' in tok else []
skeys = re.findall(r'^\s+(\w+): \'#', re.search(r'export const C = \{[\s\S]*?\n\};', starter).group(0), re.M)
result(r.returncode == 0 and keys == skeys, 'tokens.ts keeps every colour role the acts use', f'{keys} vs {skeys}; {r.stderr[-200:]}')
lines = {k: next((x for x in tok.splitlines() if re.match(rf'\s+{k}: ', x)), '') for k in keys}
result('#1F6FEB' in lines.get('accent', '') and 'cinetic:brand-supplied' in lines.get('accent', '')
       and '#F4F6FA' in lines.get('paper', '') and 'cinetic:brand-supplied' in lines.get('paper', '')
       and '#0F1A2B' in lines.get('ink', '') and 'cinetic:brand-supplied' in lines.get('ink', '')
       and 'cinetic:brand-supplied' not in lines.get('mist', '') and '#1FAA59' not in tok,
       'supplied colours are marked cinetic:brand-supplied, derived ones are not, the second hue stays out')
type_block = lambda s: re.search(r'export const TYPE = \{[\s\S]*?\n\};', s).group(0)  # noqa: E731
no_w = lambda s: re.sub(r'\bweight: \d+', 'weight: W', type_block(s))  # noqa: E731
result('delete these four lines' not in tok and no_w(tok) == no_w(starter) and 'export const SAFE' in tok
       and set(re.findall(r'\bweight: (\d+)', type_block(tok))) == {'600'},
       'the palette placeholder goes; the type scale, units and safe areas stay; every role is on the one supplied weight (600)')
w3 = [400, 500, 700]
snapped, used = mod.snap_type(starter, w3)
roles = dict(re.findall(r'^\s+(\w+): \{ size: \d+, weight: (\d+)', type_block(snapped), re.M))
result(roles.get('ui') == '500' and roles.get('line') == '500' and roles.get('display') == '500' and roles.get('giant') == '500'
       and roles.get('secondary') == '500' and used == {500} and mod.css_weight(600, w3) == 700 and mod.css_weight(300, w3) == 400
       and mod.css_weight(450, [400, 600]) == 400,
       'faces 400/500/700: the calm roles (450 and 500) draw at 500, a 600 role at 700, as a browser matches them', json.dumps(roles))
chk = run('--check-tokens', os.path.join(proj, 'src', 'brand', 'tokens.ts'), script=os.path.join(SKILL, 'scripts', 'palette.py'))
result(chk.returncode == 0, 'the written tokens pass palette.py --check-tokens (contrast and one accent)', (chk.stdout + chk.stderr)[-300:])
logo = read(proj, 'src', 'brand', 'logo.ts')
result("logoParts(LOGO_SVG, { split: 'leaves' })" in logo and 'export const WORDMARK: Logo | null = logoParts' in logo
       and '<script' not in logo and 'onclick' not in logo and 'LOGO_PARTS = ["page", "fold", "tick"]' in logo,
       'logo.ts holds the cleaned SVG parsed into parts, and the wordmark')
result("FONT = {\n  text: '\"Ledger Sans\", system-ui, sans-serif'" in tok and "'600 16px \"Ledger Sans\"'" in tok
       and 'family is the starter\'s stand-in' not in tok,
       'FONT and FACES name the vendored family at its real weight')
ft = read(proj, 'src', 'brand', 'fonts.ts')
css = read(proj, 'src', 'brand', 'fonts', 'ledger-sans', 'index.css')
result("import './fonts/ledger-sans/index.css';" in ft and "import '@fontsource-variable/inter" not in ft and 'cinetic:placeholder' not in ft
       and "font-weight: 600" in css and "format('truetype')" in css
       and os.path.isfile(os.path.join(proj, 'src', 'brand', 'fonts', 'ledger-sans', 'LedgerSans-SemiBold.ttf'))
       and not os.path.isfile(os.path.join(proj, 'src', 'brand', 'fonts', 'ledger-sans', 'LedgerSans-Italic.ttf')),
       'the licensed face is vendored with an @font-face sheet and imported in fonts.ts (upright only)')
assets = read(proj, 'src', 'brand', 'assets.ts')
result(os.path.isfile(os.path.join(proj, 'public', 'brand', 'screens', 'home.png')) and 'brand/screens/home.png' in assets
       and 'Ledgerly' in read(proj, 'src', 'brand', 'identity.ts') and os.path.isfile(os.path.join(proj, 'brand', 'logo', 'ledgerly-mark.svg')),
       'screenshots go to public/brand/ and src/brand/assets.ts, the name to identity.ts, the originals to brand/logo/')
r2 = run(kit, '--project', proj)
result(r2.returncode == 0 and read(proj, 'src', 'brand', 'tokens.ts') == tok, 'running it twice gives the same tokens')
mk = read(proj, 'src', 'brand', 'Mark.tsx') or ''
result('cinetic:placeholder' not in mk and 'supplied logo' in mk and 'export const logoParts' in mk,
       'with a supplied logo the starter mark\'s stand-in notice goes (its sample mark stays as the fallback)')

# 3. a logo-only kit: measured colours ---------------------------------------------------------------
pb = project('film-b')
r = run(os.path.join(FIX, 'kit-b'), '--project', pb)
bj = json.loads(read(pb, 'brand', 'brand.json') or '{}')
c = bj.get('colours', {})
result(r.returncode == 0 and c.get('source') == 'measured' and c.get('accent') == '#0E7C6B'
       and c.get('tokens', {}).get('ink', {}).get('hex') == '#12201D',
       'with no colours file the roles are measured from the logo\'s fills', json.dumps(c.get('tokens', {}))[:200])

# 4. a dark-ground kit ---------------------------------------------------------------------------------
pd = project('film-dark')
r = run(os.path.join(FIX, 'kit-dark'), '--project', pd, '--name', 'Orbit')
bj = json.loads(read(pd, 'brand', 'brand.json') or '{}')
t = bj.get('colours', {}).get('tokens', {})
result(r.returncode == 0 and t.get('paper', {}).get('hex') == '#EEF2F8' and t.get('ink', {}).get('hex') == '#0B1220'
       and t.get('accent', {}).get('hex') == '#3DD6B5' and bj.get('colours', {}).get('checks', {}).get('statements', 0) >= 7,
       'a dark-ground brand fills the paper and ink stages with its own light and dark neutrals', json.dumps(t)[:200])
result((bj.get('logo', {}).get('mark') or {}).get('split') == 'ids' and bj['logo']['mark']['parts'] == ['ring', 'moon'],
       'a logo with group ids splits by them')
result(t.get('ink2', {}).get('hex') == '#172033' and t['ink2'].get('supplied'),
       'the kit\'s own surface grey becomes the raised surface on ink', json.dumps(t.get('ink2')))

# 4b. a cobalt brand with cool greys: the kit's greys are the grounds, nothing is derived at the accent hue ----
kc = os.path.join(TMP, 'kit-cool')
os.makedirs(kc, exist_ok=True)
json.dump({'primary': '#1F5EFF', 'background': '#F5F7F9', 'surface': '#EBEDF0', 'border': '#DFE2E6', 'text': '#0E0F13'},
          open(os.path.join(kc, 'colours.json'), 'w'))
pc = project('film-cool')
r = run(kc, '--project', pc, '--name', 'Cobalt')
bj = json.loads(read(pc, 'brand', 'brand.json') or '{}')
t = bj.get('colours', {}).get('tokens', {})
hx = {k: v.get('hex') for k, v in t.items()}
result(r.returncode == 0 and hx.get('paper') == '#F5F7F9' and hx.get('mist') == '#EBEDF0' and hx.get('line') == '#DFE2E6'
       and hx.get('ink') == '#0E0F13', 'paper, soft panels and hairlines are the kit\'s own greys', json.dumps(hx))
pal = importlib.util.spec_from_file_location('palette', os.path.join(SKILL, 'scripts', 'palette.py'))
PAL = importlib.util.module_from_spec(pal)
pal.loader.exec_module(PAL)
derived = {k: PAL.parse_colour(v['hex']) for k, v in t.items() if not v.get('supplied') and k not in ('accentLift', 'white', 'accent')}
result(derived and all(c[1] <= 0.012 for c in derived.values()),
       'what the kit leaves out is derived on its greys (chroma no higher than theirs), never a ground at the accent hue',
       json.dumps({k: [round(x, 3) for x in c] for k, c in derived.items()}))
kn = os.path.join(TMP, 'kit-plain')
os.makedirs(kn, exist_ok=True)
json.dump({'primary': '#1F5EFF'}, open(os.path.join(kn, 'colours.json'), 'w'))
pn = project('film-plain')
r = run(kn, '--project', pn, '--name', 'Plain')
t = json.loads(read(pn, 'brand', 'brand.json') or '{}').get('colours', {}).get('tokens', {})
grounds = [PAL.parse_colour(t[k]['hex']) for k in ('paper', 'mist', 'slate', 'slateRaised', 'ink', 'ink2') if k in t]
result(r.returncode == 0 and len(grounds) == 6 and all(c[1] <= 0.005 for c in grounds),
       'an accent-only kit gets plain grey grounds (C <= .005), not grounds tinted with the accent',
       json.dumps([[round(x, 3) for x in c] for c in grounds]))

# 5. a raster logo ---------------------------------------------------------------------------------------
kr = os.path.join(TMP, 'kit-r')
png(os.path.join(kr, 'tern-logo.png'), 40, 40, lambda x, y: (31, 111, 235, 255) if 8 <= x < 32 and 8 <= y < 32 else (255, 255, 255, 0) if x < 4 else (250, 250, 252, 255))
pr = project('film-r')
r = run(kr, '--project', pr)
bj = json.loads(read(pr, 'brand', 'brand.json') or '{}')
acc = bj.get('colours', {}).get('accent') or '#000000'
result(r.returncode == 0 and (bj.get('logo') or {}).get('raster') and abs(int(acc[1:3], 16) - 31) < 16 and abs(int(acc[5:7], 16) - 235) < 16
       and "LOGO_RASTER: string | null = 'brand/tern-logo.png'" in read(pr, 'src', 'brand', 'logo.ts'),
       'a PNG logo is placed whole and its colours are measured with no image library', acc)

# 6. checks and the deck ---------------------------------------------------------------------------------
r = run('--check', '--project', proj)
result(r.returncode == 0, '--check passes on what was written', r.stderr[-200:])
bad = read(proj, 'src', 'brand', 'tokens.ts').replace("ink: '#0F1A2B'", "ink: '#BBBBBB'")
open(os.path.join(proj, 'src', 'brand', 'tokens.ts'), 'w', encoding='utf-8').write(bad)
r = run('--check', '--project', proj)
result(r.returncode == 1, '--check fails when the tokens no longer hold contrast')
r = run(kit, '--project', os.path.join(TMP, 'not-a-film'))
result(r.returncode == 2 and 'new-film.sh' in r.stderr, 'a folder that is not a film project is refused')
r = run('--brief', 'a ledger app', '--format', 'launch', '--direction', 'fold', '--brand', os.path.join(pb, 'brand', 'brand.json'),
        '--out', os.path.join(TMP, 'deck'), '--no-history', script=DECK)
sh = json.loads(read(TMP, 'deck', 'direction.json') or '{}')
result(r.returncode == 0 and (sh.get('brand') or {}).get('accent', {}).get('hex') == '#0E7C6B',
       'deck.py --brand maps a direction onto what brand.py wrote', r.stderr[-200:])

# 7. house wording -----------------------------------------------------------------------------------------
src = open(BRAND, encoding='utf-8').read()
pats = [r'reference[ ](films?|clips?|videos?)', r'\bT[0-9]{2}\b', r'\blearned[ ]from\b', r'\bwe[ ](analy[sz]ed|measured)\b',
        r'\bmedian\b', r'\bstud(y|ied)\b']
leaks = [m.group(0) for p in pats for m in [re.search(p, src, re.I)] if m]
result(not leaks, 'brand.py carries no provenance phrasing', ', '.join(leaks))

# 8. real kits ------------------------------------------------------------------------------------------
k8 = os.path.join(TMP, 'kit-real')
os.makedirs(os.path.join(k8, 'photos'))
os.makedirs(os.path.join(k8, 'logo'))
shutil.copy2(os.path.join(FIX, 'kit-a', 'ledgerly-mark.svg'), os.path.join(k8, 'logo', 'kiln-mark.svg'))
png(os.path.join(k8, 'photos', 'landmark.png'), 24, 16, lambda x, y: (90, 120, 140, 255))
png(os.path.join(k8, 'photos', 'bookmark-shelf.png'), 24, 16, lambda x, y: (60, 70, 80, 255))
open(os.path.join(k8, 'notes.pdf'), 'wb').write(b'%PDF-1.4')
open(os.path.join(k8, 'brand-colours.css'), 'w', encoding='utf-8').write(
    '/* the old orange, retired: #FF8800 */\n:root {\n  --bg: #FAF8F5; /* paper */\n  --text: #1C1A18;\n  --primary: #E8590C;\n'
    '  --border: #E2DED8;\n  --grey-warm: #D9D2C9;\n  --stone: #8C8279;\n}\n.button { color: #123456; } // a rule, not the palette\n')
out8 = os.path.join(TMP, 'standalone', 'brand.json')
r = run(k8, '--out', out8, '--name', 'Kiln')
b8 = json.loads(read(out8) or '{}')
hexes = {c['hex'] for c in (b8.get('colours') or {}).get('list', [])}
result(r.returncode in (0, 1) and b8.get('name') == 'Kiln' and not os.path.exists(os.path.join(TMP, 'standalone', 'src')),
       '--out writes brand.json alone, before any project exists', r.stderr.strip()[-160:])
result('#FF8800' not in hexes and '#123456' not in hexes and {'#FAF8F5', '#1C1A18', '#E8590C', '#E2DED8'} <= hexes,
       'CSS comments are skipped and the custom properties are the palette (a rule\'s colour is not)', str(sorted(hexes)))
roles = {c['hex']: c.get('role') for c in b8['colours']['list']}
result(roles.get('#FAF8F5') == 'ground' and roles.get('#E2DED8') == 'line' and roles.get('#E8590C') == 'accent',
       '--bg names the ground, --border the line, --primary the accent', str(roles))
t8 = b8['colours']['tokens']
result(t8['line']['hex'] == '#E2DED8' and t8['line']['supplied'], 'the named border colour is the line token')
result(len(b8['photos']) == 2 and (b8['logo']['mark'] or {}).get('file') == 'kiln-mark.svg' and not b8['logo']['raster'],
       'a photos folder wins over a file name: landmark and bookmark stay photos, the logo folder holds the mark', str(b8['photos']))
result(any('not used' in n and 'notes.pdf' in n for n in b8['notes']), 'files it cannot place are listed as unused', str(b8['notes'])[:160])
slate = t8['slate']['hex']
sl = mod.lch(slate)
result(not (30 <= sl[2] <= 100 and sl[1] > 0.02) and sl[1] <= 0.03, "a warm-grey kit's slate stays off brown (C <= .03, never a warm hue at strength)", f'{slate} {sl}')
pr8 = project('kiln-film')
r = run(k8, '--project', pr8, '--name', 'Kiln')
tk8 = read(pr8, 'src', 'brand', 'tokens.ts')
lift_line = next((ln for ln in tk8.splitlines() if ln.strip().startswith('accentLift:')), '')
result('cinetic:brand-supplied' in lift_line, "an orange brand's accentLift is marked brand-supplied (derived from the brand's accent), so lint and the bans pass it", lift_line.strip()[:140])
bare = os.path.join(TMP, 'not-a-film-2')
os.makedirs(bare)
r = run(k8, '--project', bare)
result(r.returncode == 2 and '--out' in r.stderr and not os.listdir(bare), 'a folder that is not a film project is refused before anything is copied into it', str(os.listdir(bare)))

# 9. palette.py writes the starter's names: a slateMid block pastes over C without turning a role over (the mid slate is
# `slate`, ink stays the darkest), passes --check-tokens on the slate, and --temp grey leaves the greys untinted
PALETTE = os.path.join(SKILL, 'scripts', 'palette.py')
r = run('--accent', '#54B3FD', '--recipe', 'slateMid', script=PALETTE)
blk = dict(re.findall(r"^\s+(\w+): '(#[0-9A-F]{6})'", r.stdout, re.M))
result(r.returncode == 0 and set(blk) == set(skeys) - {'white'} and '// stage: slate' in r.stdout
       and PAL.parse_colour(blk['slate'])[0] > 0.3 and PAL.parse_colour(blk['ink'])[0] < 0.2 and blk.get('accentLift') == blk.get('accent'),
       "palette.py --recipe slateMid writes the starter's names (slate the stage, ink the darkest, accentLift the accent)", json.dumps(blk))
pt = os.path.join(TMP, 'slate-tokens.ts')
open(pt, 'w', encoding='utf-8').write(r.stdout)
chk = run('--check-tokens', pt, script=PALETTE)
result(chk.returncode == 0 and 'the stage named in the tokens: slate' in chk.stdout + chk.stderr, 'the slateMid block passes --check-tokens, judged on the slate',
       (chk.stdout + chk.stderr)[-200:])
r = run('--accent', '#54B3FD', '--stage', 'dark', '--temp', 'grey', script=PALETTE)
greys = [PAL.parse_colour(h) for k, h in re.findall(r"^\s+(\w+): '(#[0-9A-F]{6})'", r.stdout, re.M) if k != 'accent']
result(r.returncode == 0 and len(greys) == 6 and all(c[1] < 0.002 for c in greys) and 'dev-tool' not in r.stderr,
       '--temp grey writes untinted greys (a true charcoal), with no dev-tool note', r.stderr[-160:])

shutil.rmtree(TMP, ignore_errors=True)
print(f'\n{"all pass" if not failed else f"{failed} failed"}')
sys.exit(1 if failed else 0)
