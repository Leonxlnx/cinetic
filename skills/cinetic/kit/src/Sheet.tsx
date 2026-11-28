// A contact sheet in ONE still render: the film frozen at 36 frames in a 6x6 grid (cols: 4 gives 16 bigger cells).
// The fastest way to see a whole film: `node scripts/frames.mjs sheet [--film main] [--grid 6]`.
import React from 'react';
import { AbsoluteFill, continueRender, delayRender, Freeze, Sequence, useCurrentFrame } from 'remotion';
import { FILMS } from './films';

/**
 * The film's own size and length for everything inside it: a piece that reads useVideoConfig (a turn covering the frame,
 * a line centred in it) lays itself out for the film, not for the sheet or the join image around it.
 */
const FilmSize: React.FC<{ F: (typeof FILMS)[string]; children: React.ReactNode }> = ({ F, children }) => (
  <Sequence layout="none" width={F.width ?? 1920} height={F.height ?? 1080} durationInFrames={F.duration}>
    {children}
  </Sequence>
);

/**
 * One cell's own ids. A sheet draws the film many times in one page, so every id the film gives (an SVG gradient, mask,
 * clip path, filter, marker; a React useId) repeats in every cell, and the browser resolves `url(#id)` and `href="#id"` to
 * the FIRST element with that id: every later cell would draw the first cell's gradient, mask or clip. After each render
 * this renames every id inside the cell to `<id>--c<cell>` and points the cell's references at the renamed ones (in
 * attributes, inline styles and <style> text), and keeps doing it while the cell's content changes, so each cell draws
 * exactly what a full-size still of its frame draws. Nothing in a film's code has to change.
 */
const URL_REF = /url\(\s*(['"]?)#([^'")\s]+)\1\s*\)/g;
const scopeIds = (root: HTMLElement, suffix: string, known: Set<string>) => {
  const tail = `--${suffix}`;
  const all = root.querySelectorAll<Element>('[id]');
  for (const el of Array.from(all)) {
    const id = el.getAttribute('id') ?? '';
    if (!id || id.endsWith(tail)) continue;
    known.add(id);
    el.setAttribute('id', id + tail);
  }
  if (!known.size) return;
  const fix = (v: string) => v.replace(URL_REF, (m, q: string, id: string) => (known.has(id) ? `url(${q}#${id}${tail}${q})` : m));
  for (const el of Array.from(root.querySelectorAll<Element>('*'))) {
    for (const a of Array.from(el.attributes)) {
      const v = a.value;
      if ((a.name === 'href' || a.name === 'xlink:href') && v.startsWith('#') && known.has(v.slice(1))) {
        el.setAttributeNS(a.namespaceURI, a.name, v + tail);
      } else if (v.includes('url(')) {
        const w = fix(v);
        if (w !== v) el.setAttributeNS(a.namespaceURI, a.name, w);
      }
    }
    if (el.tagName.toLowerCase() === 'style' && el.textContent?.includes('url(')) {
      const t = el.textContent;
      const w = fix(t);
      if (w !== t) el.textContent = w;
    }
  }
};
const Scoped: React.FC<{ cell: string; children: React.ReactNode }> = ({ cell, children }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const known = React.useRef(new Set<string>());
  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const run = () => scopeIds(root, cell, known.current);
    run();
    // a piece that measures itself and renders again, or a picture that mounts late, brings ids and references back
    const mo = new MutationObserver(run);
    mo.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    const handle = delayRender(`sheet cell ${cell}: scoping ids`);
    let done = false;
    const release = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };
    const raf = requestAnimationFrame(() => {
      run();
      release();
    });
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
      release();
    };
  }, [cell]);
  return (
    <div ref={ref} style={{ display: 'contents' }}>
      {children}
    </div>
  );
};

export const Sheet: React.FC<{ film?: string; from?: number; to?: number; frames?: number[]; cols?: number }> = ({ film, from = 0, to, frames, cols = 6 }) => {
  const F = FILMS[film ?? Object.keys(FILMS)[0]];
  if (!F) throw new Error(`No film "${film}" in src/films.ts (films: ${Object.keys(FILMS).join(', ')})`);
  const end = to ?? F.duration - 1;
  const n = cols * cols;
  const list = frames ?? Array.from({ length: n }, (_, i) => Math.round(from + ((end - from) * i) / (n - 1)));
  // lay the frames out at the film's own aspect (vertical and square films too): pick the grid that shows them biggest
  const FW = F.width ?? 1920;
  const FH = F.height ?? 1080;
  let best = { c: cols, r: Math.ceil(list.length / cols), s: 0 };
  for (let c = 1; c <= list.length; c++) {
    const r = Math.ceil(list.length / c);
    const sc = Math.min(1920 / (c * FW), 1080 / (r * FH));
    if (sc > best.s) best = { c, r, s: sc };
  }
  const gc = best.c;
  const w = FW * best.s;
  const h = FH * best.s;
  return (
    <AbsoluteFill style={{ background: '#111' }}>
      {list.map((fr, i) => (
        <div key={i} style={{ position: 'absolute', left: (i % gc) * w, top: Math.floor(i / gc) * h, width: w, height: h, overflow: 'hidden', outline: '1px solid #000' }}>
          <div style={{ width: FW, height: FH, transform: `scale(${best.s})`, transformOrigin: '0 0', position: 'relative' }}>
            <Scoped cell={`c${i}`}>
              <Freeze frame={fr}>
                <FilmSize F={F}>
                  <F.component />
                </FilmSize>
              </Freeze>
            </Scoped>
          </div>
          <div style={{ position: 'absolute', left: 6, top: 4, font: `600 ${cols > 4 ? 12 : 15}px monospace`, color: '#ff0', background: 'rgba(0,0,0,.6)', padding: '1px 5px' }}>
            {fr} · {(fr / 30).toFixed(2)}s
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

/**
 * Every join at real size, one row of a join a frame: frame i of this composition draws `rows[i]`, up to `cols` frames of
 * the film side by side, each `cell` px wide, a band above them naming the join and the move, the frame number on each
 * cell, the move's first frame outlined thick and its other frames thin. `node scripts/frames.mjs joins` renders every
 * row in one browser and stacks a join's rows into one image (the whole move, from two frames before it to four after).
 */
export type JoinRow = { frames: number[]; start: number; end: number; title: string };
export type JoinsProps = { film?: string; rows?: JoinRow[]; cols?: number; cell?: number; joins?: number[]; pad?: number };
const joinsGrid = (props: JoinsProps) => {
  const F = FILMS[props.film ?? Object.keys(FILMS)[0]];
  if (!F) throw new Error(`No film "${props.film}" in src/films.ts (films: ${Object.keys(FILMS).join(', ')})`);
  const FW = F.width ?? 1920;
  const FH = F.height ?? 1080;
  const cell = props.cell ?? (FW >= FH ? 960 : 540);
  const cols = props.cols ?? 6;
  const ch = Math.round((cell * FH) / FW);
  const band = Math.max(32, Math.round((cols * cell) / 120));
  // the old form (joins + pad): the frames J - pad .. J + pad of each join, one row a join
  const pad = props.pad ?? 4;
  const rows: JoinRow[] = props.rows ?? (props.joins ?? [0]).map((j) => ({ frames: Array.from({ length: 2 * pad + 1 }, (_, k) => j - pad + k), start: j, end: j, title: `join ${j}` }));
  return { F, FW, FH, cell, cols, ch, band, rows };
};
export const joinsMetadata = ({ props }: { props: JoinsProps }) => {
  const g = joinsGrid(props);
  const even = (v: number) => Math.ceil(v / 2) * 2;
  // as long as the film (a Sequence inside it is cut by the composition's length); frames.mjs renders frames 0 .. rows-1
  const cols = Math.max(1, ...g.rows.map((r) => Math.min(g.cols, r.frames.length)));
  return { durationInFrames: Math.max(g.rows.length, g.F.duration), fps: g.F.fps, width: even(cols * g.cell), height: even(g.band + g.ch) };
};
export const Joins: React.FC<JoinsProps> = (props) => {
  const i = useCurrentFrame();
  const { F, FW, FH, cell, ch, band, rows } = joinsGrid(props);
  const row = rows[Math.min(i, rows.length - 1)];
  const s = cell / FW;
  const label = Math.max(16, Math.round(Math.max(cell, ch) / 40));
  const single = row.start === row.end;
  return (
    <AbsoluteFill style={{ background: '#111' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: band, display: 'flex', alignItems: 'center', padding: '0 14px', font: `600 ${Math.round(band * 0.56)}px monospace`, color: '#ff0', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {row.title}
      </div>
      {row.frames.map((fr, k) => {
        const f = Math.max(0, Math.min(F.duration - 1, fr));
        const inMove = fr >= row.start && fr <= row.end;
        const tag = f !== fr ? ' (film edge)' : single ? (fr === row.start ? ' · join' : '') : fr === row.start ? ' · move starts' : fr === row.end ? ' · move ends' : inMove ? '' : fr < row.start ? ' · before' : ' · after';
        return (
          <div key={k} style={{ position: 'absolute', left: k * cell, top: band, width: cell, height: ch, overflow: 'hidden' }}>
            <div style={{ width: FW, height: FH, transform: `scale(${s})`, transformOrigin: '0 0', position: 'relative' }}>
              <Scoped cell={`c${k}`}>
                <Freeze frame={f}>
                  <FilmSize F={F}>
                    <F.component />
                  </FilmSize>
                </Freeze>
              </Scoped>
            </div>
            <div style={{ position: 'absolute', inset: 0, boxShadow: fr === row.start ? `inset 0 0 0 ${Math.max(3, label / 5)}px #ff0` : inMove && !single ? 'inset 0 0 0 2px #ff0' : 'inset 0 0 0 1px #000' }} />
            <div style={{ position: 'absolute', left: 8, top: 6, font: `600 ${label}px monospace`, color: inMove ? '#ff0' : '#ccc', background: 'rgba(0,0,0,.66)', padding: '2px 8px' }}>
              {f} · {(f / F.fps).toFixed(2)}s{tag}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
