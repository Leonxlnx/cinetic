#!/usr/bin/env python3
"""render-parts.test.py: render.sh keeps its parts until every gate has passed, and deliver.sh cleans them.

A made-up project renders through render.sh with a stand-in for `npx remotion` (bundle, compositions, and a
render that encodes a test pattern with ffmpeg), so the parts route runs end to end without Remotion:
  1. A master renders in parts and joins; the bundle and the parts stay in out/render/<name>.
  2. Rerun with src/ unchanged (a gate failed after the join): every part is reused, nothing renders again.
  3. --clean removes them; --clean refuses a folder that holds no render parts.
  4. --keep marks them: deliver.sh, passing, leaves them; a later run without --keep clears the mark and
     deliver.sh, passing, removes them.
Needs bash (Git for Windows' on Windows), node, ffmpeg and ffprobe, and this Python with numpy (render.sh checks it); no network.

Usage (from the skill root):  python3 scripts/test/render-parts.test.py [--verbose]
Exit codes: 0 all pass, 1 a test failed.
"""
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
          ffmpeg -v error -y -f lavfi -i "testsrc=size=64x36:rate=30" -frames:v "$n" -c:v libx264 -pix_fmt yuv420p "$out" ;;
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
        open(os.path.join(proj, 'src', 'index.ts'), 'w').write('// the stand-in renders no source\n')
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
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print('render-parts tests: ' + ('all pass' if not failed else f'{failed} failed'))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
