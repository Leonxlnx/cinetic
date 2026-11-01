#!/usr/bin/env python3
"""render-parts.test.py: render.sh keeps its parts until every gate has passed, and deliver.sh cleans them.

A made-up project renders through render.sh with a stand-in for `npx remotion` (bundle, compositions, and a
render that encodes a test pattern with ffmpeg), so the parts route runs end to end without Remotion:
  1. A master renders in parts and joins; the bundle and the parts stay in out/render/<name>.
  2. Rerun with src/ unchanged (a gate failed after the join): every part is reused, nothing renders again.
  3. --clean removes them; --clean refuses a folder that holds no render parts.
  4. --keep marks them: deliver.sh, passing, leaves them; a later run without --keep clears the mark and
     deliver.sh, passing, removes them.
  5. The key covers what the composition imports: an edit to src/sync.ts (only FilmSub reads it) keeps the bundle,
     the cached composition list and every part; an edit to an act re-bundles, names the file and drops the parts.
  6. --redo A-B keeps the parts outside A..B and re-renders the others, checked against the old ones outside A..B;
     a change outside them stops the run and the kept parts re-render on the next one.
  7. --join-only joins the parts there without Remotion; a missing part stops it with its --part K.
  8. Two paths: --split renders the parts on the GPU path forward and software GL (--gl=swangle) backward, no part
     twice, and joins them into one stream of every frame; --split-after 0 starts the software-GL worker by itself
     after the first part; --worker cpu alone renders every part on software GL and joins (the last worker joins);
     a claim left by a worker that is gone is cleared.
  8. Part boundaries move back onto the latest cut in their part's last half (out/cues.json act lines), so a part's
     first frame, an I-frame, lands on a cut.
Needs bash (Git for Windows' on Windows), node, ffmpeg and ffprobe, and this Python with numpy (render.sh checks it); no network.

Usage (from the skill root):  python3 scripts/test/render-parts.test.py [--verbose] [--part keep|key|split]
(--part runs 1-4, 5-7 or 8 alone, so a shared machine's job limit holds each run.)
Exit codes: 0 all pass, 1 a test failed.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.abspath(os.path.join(HERE, '..', '..'))
RENDER = os.path.join(SKILL, 'scripts', 'render.sh')
DELIVER = os.path.join(SKILL, 'scripts', 'deliver.sh')
VERBOSE = '--verbose' in sys.argv
PART = sys.argv[sys.argv.index('--part') + 1] if '--part' in sys.argv else 'all'
failed = 0

STUB = r'''#!/usr/bin/env bash
# a stand-in for `npx remotion`: bundle, compositions, render (a test pattern of the asked frames), nothing else
echo "$*" >> "$STUB_LOG"
[[ "$1" == remotion ]] || exit 1
shift; cmd=$1; shift
case "$cmd" in
  bundle) out=""; while [[ $# -gt 0 ]]; do [[ "$1" == --out-dir ]] && out=$2; shift; done
          mkdir -p "$out" && echo '<html></html>' > "$out/index.html" ;;
  compositions) echo "Film 30 64x36 20 (stub)" ;;
  render) out=$3; shift 3; fr=""
          for a in "$@"; do case "$a" in --frames=*) fr=${a#--frames=} ;; esac; done
          n=$(( ${fr#*-} - ${fr%-*} + 1 ))
          # the picture of film frame k is the k-th frame of the pattern ($STUB_PATTERN, testsrc by default)
          ffmpeg -v error -y -f lavfi -i "${STUB_PATTERN:-testsrc}=size=64x36:rate=30" -vf "trim=start_frame=${fr%-*}:end_frame=$(( ${fr#*-} + 1 )),setpts=PTS-STARTPTS" \
            -frames:v "$n" -c:v libx264 -pix_fmt yuv420p "$out" ;;
  *) exit 1 ;;
esac
'''


def result(ok, name, detail=''):
    global failed
    failed += 0 if ok else 1
    print(f'{"pass" if ok else "FAIL"}  {name}{"  (" + detail + ")" if detail and (not ok or VERBOSE) else ""}')


# On Windows, Git for Windows' bash (the bash on PATH may be WSL's, which cannot see this folder)
GIT_BASH = os.path.join(os.environ.get('ProgramFiles', 'C:' + os.sep + 'Program Files'), 'Git', 'bin', 'bash.exe')
BASH = (GIT_BASH if os.path.isfile(GIT_BASH) else None) if os.name == 'nt' else shutil.which('bash')


def main():
    for tool in ('node', 'ffmpeg', 'ffprobe'):
        if not shutil.which(tool):
            print(f'skip  render-parts tests: {tool} not found')
            return 0
    if not BASH:
        print('skip  render-parts tests: no bash (on Windows: Git for Windows)')
        return 0
    try:
        import numpy  # noqa: F401  (render.sh checks its Python imports numpy)
    except ImportError:
        print('skip  render-parts tests: this Python has no numpy (run it with the environment render.sh uses)')
        return 0
    tmp = tempfile.mkdtemp(prefix='cinetic-parts-')
    try:
        proj, stub = os.path.join(tmp, 'film'), os.path.join(tmp, 'bin')
        for d in (os.path.join(proj, 'src'), os.path.join(proj, 'public'), stub):
            os.makedirs(d)
        # a project shaped like the starter: the Film reads an act; FilmSub (another composition) reads the sound plan
        files = {
            'index.ts': "import { registerRoot } from 'remotion';\nimport { RemotionRoot } from './Root';\nregisterRoot(RemotionRoot);\n",
            'Root.tsx': ("import { Composition } from 'remotion';\nimport { Film } from './Film';\nimport { FilmSub, subMetadata } from './FilmSub';\n"
                         "export const RemotionRoot = () => (<>\n  <Composition id=\"Film\" component={Film} durationInFrames={20} fps={30} width={64} height={36} />\n"
                         "  <Composition id=\"FilmSub\" component={FilmSub} durationInFrames={20} fps={30} width={64} height={36} calculateMetadata={subMetadata} />\n</>);\n"),
            'Film.tsx': "import { Act } from './acts/Act';\nexport const Film = () => <Act />;\n",
            'FilmSub.tsx': "import * as SYNC from './sync';\nexport const FilmSub = () => null;\nexport const subMetadata = () => ({ props: SYNC });\n",
            'sync.ts': 'export const EVENTS = [1, 2, 3];\n',
            os.path.join('acts', 'Act.tsx'): 'export const Act = () => null; // v1\n',
        }
        os.makedirs(os.path.join(proj, 'src', 'acts'))
        for name, body in files.items():
            open(os.path.join(proj, 'src', name), 'w', newline='\n').write(body)
        open(os.path.join(stub, 'npx'), 'w', newline='\n').write(STUB)
        os.chmod(os.path.join(stub, 'npx'), 0o755)
        log = os.path.join(tmp, 'npx.log')
        env = {**os.environ, 'PATH': stub + os.pathsep + os.environ.get('PATH', ''), 'STUB_LOG': log, 'PYTHON': sys.executable, 'PYTHONUTF8': '1',
               'TMPDIR': tmp.replace(os.sep, '/')}  # render.sh's work folders (--keep keeps one) stay in this test's folder
        parts = os.path.join(proj, 'out', 'render', 'film')

        def sh(script, *args):
            r = subprocess.run([BASH, script, *args], cwd=proj, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace')
            return r.returncode, r.stderr

        def renders():
            return sum(1 for l in open(log) if l.startswith('remotion render')) if os.path.exists(log) else 0

        def listing():
            return sorted(os.listdir(parts)) if os.path.isdir(parts) else []

        master = ['Film', 'out/film.mp4', '--no-audio', '--no-check', '--chunk-frames', '10']
        if PART in ('all', 'keep'):
            code, err = sh(RENDER, *master)
            have = listing()
            result(code == 0 and os.path.isfile(os.path.join(proj, 'out', 'film.mp4')) and renders() == 2, 'a master renders in two parts and joins', err[-400:])
            result({'bundle', 'bundle.key', 'part-000000-000009.mp4', 'part-000010-000019.mp4'} <= set(have) and 'until every gate has passed' in err,
                   'the bundle and the parts stay after a passing render, and it says until when', ' '.join(have))
            code, err = sh(RENDER, *master)
            result(code == 0 and renders() == 2, 'a rerun with src/ unchanged joins the kept parts and renders nothing again', f'{renders()} renders; {err[-300:]}')
            code, err = sh(RENDER, 'Film', 'out/film.mp4', '--clean')
            result(code == 0 and not os.path.exists(parts), '--clean removes the bundle and the parts', err[-200:])
            other = os.path.join(proj, 'out', 'notes')
            os.makedirs(other)
            open(os.path.join(other, 'keep-me.txt'), 'w').write('x')
            code, err = sh(RENDER, 'Film', 'out/film.mp4', '--clean', '--parts', 'out/notes')
            result(code == 1 and os.path.isfile(os.path.join(other, 'keep-me.txt')), '--clean refuses a folder that holds no render parts', err[-200:])
            code, err = sh(RENDER, *master, '--keep')
            result(code == 0 and '.keep' in listing(), '--keep marks the parts', ' '.join(listing()))
            code, err = sh(DELIVER, 'out/film.mp4')
            result(code == 0 and os.path.isfile(os.path.join(parts, 'part-000000-000009.mp4')), 'deliver.sh, passing, leaves parts marked --keep', err[-300:])
            code, err = sh(RENDER, *master)
            result(code == 0 and '.keep' not in listing() and renders() == 4, 'a run without --keep clears the mark (and reuses the parts)', ' '.join(listing()))
            code, err = sh(DELIVER, 'out/film.mp4')
            result(code == 0 and not os.path.exists(parts) and 'removed the render parts' in err, 'deliver.sh, passing, removes the parts', err[-300:])

        if PART in ('all', 'key'):
            def calls(what):
                return sum(1 for l in open(log) if l.startswith(f'remotion {what}')) if os.path.exists(log) else 0

            def edit(name, text):
                with open(os.path.join(proj, 'src', name), 'a', newline='\n') as fh:
                    fh.write(text)

            code, err = sh(RENDER, *master)
            r0, b0, c0 = renders(), calls('bundle'), calls('compositions')
            edit('sync.ts', 'export const MORE = 4;\n')
            code, err = sh(RENDER, *master)
            result(code == 0 and renders() == r0 and calls('bundle') == b0 and calls('compositions') == c0,
                   'an edit to src/sync.ts (the composition never imports it) keeps the bundle, the composition list and every part',
                   f'{renders() - r0} renders, {calls("bundle") - b0} bundles, {calls("compositions") - c0} listings; {err[-300:]}')
            edit(os.path.join('acts', 'Act.tsx'), '// v2\n')
            code, err = sh(RENDER, *master)
            result(code == 0 and renders() == r0 + 2 and 'src/acts/Act.tsx' in err and '--redo' in err,
                   'an edit to an act re-bundles, names the file, drops the parts and says --redo keeps the others', f'{renders() - r0} renders; {err[-400:]}')
            r1 = renders()
            edit(os.path.join('acts', 'Act.tsx'), '// v3\n')
            code, err = sh(RENDER, *master, '--redo', '12-19')
            result(code == 0 and renders() == r1 + 1 and 'kept 1 part' in err and 'match the part rendered before the edit' in err
                   and not any(n.endswith('.old.mp4') for n in listing()),
                   '--redo 12-19 keeps part 0, re-renders part 1 and checks its frames 10-11 against the old part', f'{renders() - r1} renders; {err[-400:]}')
            r2 = renders()
            edit(os.path.join('acts', 'Act.tsx'), '// v4\n')
            env['STUB_PATTERN'] = 'rgbtestsrc'  # the edit changes every frame, not only 12-19
            code, err = sh(RENDER, *master, '--redo', '12-19')
            result(code == 1 and renders() == r2 + 1 and 'reaches past --redo' in err, '--redo stops when a re-rendered part changed outside the frames named', err[-400:])
            code, err = sh(RENDER, *master)
            result(code == 0 and renders() == r2 + 2, 'after that stop the kept part re-renders on the next run (the --redo part stays)', f'{renders() - r2} renders; {err[-300:]}')
            del env['STUB_PATTERN']
            os.remove(os.path.join(proj, 'out', 'film.mp4'))
            r3, b3, c3 = renders(), calls('bundle'), calls('compositions')
            code, err = sh(RENDER, *master, '--join-only')
            result(code == 0 and os.path.isfile(os.path.join(proj, 'out', 'film.mp4')) and (renders(), calls('bundle'), calls('compositions')) == (r3, b3, c3),
                   '--join-only joins the parts there with no bundle and no Remotion call', f'{err[-300:]}')
            os.remove(os.path.join(parts, 'part-000010-000019.mp4'))
            code, err = sh(RENDER, *master, '--join-only')
            result(code == 1 and '--part 1 (frames 10-19)' in err and renders() == r3, '--join-only names a missing part and renders nothing', err[-300:])
            json.dump({'fps': 30, 'total': 20, 'acts': {'a': {'from': 0, 'dur': 7}, 'b': {'from': 7, 'dur': 7}, 'c': {'from': 14, 'dur': 6}}, 'declared': {'seams': []}},
                      open(os.path.join(proj, 'out', 'cues.json'), 'w'))
            code, err = sh(RENDER, 'Film', 'out/cut.mp4', '--no-audio', '--no-check', '--chunk-frames', '10')
            cut_parts = sorted(n for n in os.listdir(os.path.join(proj, 'out', 'render', 'cut')) if n.startswith('part-'))
            result(code == 0 and cut_parts == ['part-000000-000006.mp4', 'part-000007-000013.mp4', 'part-000014-000019.mp4'],
                   'part boundaries land on the act lines in the last half of their parts (7 and 14 for parts of up to 10)', ' '.join(cut_parts))
            # the act lines above are this test's own: the split tests below cut 20 frames into parts of 5 with none
            os.remove(os.path.join(proj, 'out', 'cues.json'))
        if PART in ('all', 'split'):
            def renders_of(out_dir_name):
                rows = [l for l in open(log) if l.startswith('remotion render') and f'/render/{out_dir_name}/' in l.replace(os.sep, '/')] if os.path.exists(log) else []
                return [('swangle' if '--gl=swangle' in l else 'gpu', l.split('--frames=')[1].split()[0]) for l in rows]

            def frames_in(p):
                r = subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets',
                                    '-of', 'csv=p=0', p], capture_output=True, text=True)
                return int((r.stdout or '0').strip() or 0)
            code, err = sh(RENDER, 'Film', 'out/split.mp4', '--no-audio', '--no-check', '--chunk-frames', '5', '--split')
            rs = renders_of('split')
            ranges = [x[1] for x in rs]
            result(code == 0 and len(rs) == 4 and len(set(ranges)) == 4 and {k for k, _ in rs} == {'gpu', 'swangle'} and frames_in(os.path.join(proj, 'out', 'split.mp4')) == 20,
                   '--split: the GPU path forward and software GL backward, no part twice, one joined stream of every frame', f'exit {code}, {frames_in(os.path.join(proj, "out", "split.mp4"))} frames, {rs}; {err[-300:]}')
            code, err = sh(RENDER, 'Film', 'out/auto.mp4', '--no-audio', '--no-check', '--chunk-frames', '5', '--split-after', '0')
            rs = renders_of('auto')
            result(code == 0 and len(rs) == 4 and len({x[1] for x in rs}) == 4 and rs[0][0] == 'gpu' and any(k == 'swangle' for k, _ in rs) and 'slow here' in err,
                   '--split-after 0: the software-GL worker starts by itself after the first part', f'exit {code}, slow said: {"slow here" in err}, {rs}; {err[-300:]}')
            wdir = os.path.join(proj, 'out', 'render', 'worker')
            os.makedirs(os.path.join(wdir, '.claim-1'))
            open(os.path.join(wdir, '.claim-1', 'pid'), 'w').write('999999')  # a worker that is gone
            code, err = sh(RENDER, 'Film', 'out/worker.mp4', '--no-audio', '--no-check', '--chunk-frames', '5', '--worker', 'cpu')
            rs = renders_of('worker')
            result(code == 0 and len(rs) == 4 and all(k == 'swangle' for k, _ in rs) and os.path.isfile(os.path.join(proj, 'out', 'worker.mp4'))
                   and not any(n.startswith('.claim-') for n in os.listdir(wdir)), '--worker cpu alone renders every part on software GL, clears the claim of a gone worker and joins',
                   f'{rs}; {err[-300:]}')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print('render-parts tests: ' + ('all pass' if not failed else f'{failed} failed'))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
