// Content tiles: the nodes of a ring, a wall or a ticker carry the film's content, never a bare pill or a bare accent
// square. A tile is a small lit card: its real mark (kit/logos.tsx, when the film has fetched it) or the glyph the film
// gives, a label, a sub line and a tiny preview of what it holds (a document, a chart, a list, a person, a table, code),
// drawn from the node's own lines, rows, values or code: a preview without its content draws nothing and reports
// kit-empty, never sample lines; a tile given no node (an index past the end of an empty list) is the empty state. Tiles arrive tumbling in 3D (20-60 degrees, the house tileArrival), settle on depth
// bands (smaller and softer further back) and, given a designed drift or turn, travel with parallax and land (then hold):
//   ContentTile    one tile at a size (px), any aspect
//   ContentWall    a wall: the given nodes take the slots nearest the centre, the rest is filled from `fill` (the
//                  film's own further items) or by repeating the nodes; no nodes at all: the empty state
//   ContentRing    a ring round a kept-free centre, a turn that slows to rest
//   ContentTicker  rows of tiles flowing past at constant speeds on two depths, curved toward the camera
//   worldNodes     tile nodes from the film's world (kit/data.ts filmWorld): its records and its people
// Labels are texture (data-texture) unless a tile is large enough to read (>= TEXT_MIN): then data-text.
import React from 'react';
import { Img } from 'remotion';
import { FONT, TEXT_MIN } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { clamp, mix, rand } from '../lib/anim';
import { mixColor } from '../lib/color';
import { f60x, uOf, useFilm } from '../lib/film';
import type { SampleWorld } from './data';
import { kitEmpty, KitEmpty } from './gate';
import { AppIcon, DEPTH, depthBlur, hasLogo, landedTravel, type LogoRef, ringSlots, type TileSlot, tileArrival, TRAVEL_S, wallSlots } from './logos';
import { face, fitTitle, GlyphTile, keyFace, Sparkline, surfaceShadow, useKitScale } from './parts';
import type { GlyphName } from './sample';
import { type KitTheme, kitTheme } from './theme';

export type TilePreview = 'doc' | 'chart' | 'bars' | 'list' | 'person' | 'table' | 'code' | 'photo'; // photo: node.photo fills the preview (a real picture of what the item holds)
/**
 * A tile's content, all the film's own: a real mark or the glyph that matches it, a label, a sub line, and the preview's
 * content: `lines` (doc: a heading then lines; list: the items, `done` ticks them), `rows` (table cells), `code`
 * ([keyword, rest] per line), `values` (chart or bars, with `value` the figure over them), `photo` (a real picture, or a
 * person's portrait for 'person'). `preview` picks the kind (default: the kind its content makes); a kind without its
 * content draws nothing in the preview and reports kit-empty.
 */
export type TileNode = {
  logo?: LogoRef;
  glyph?: GlyphName;
  label: string;
  sub?: string;
  preview?: TilePreview;
  value?: string;
  seed?: string;
  photo?: string;
  focus?: [number, number];
  lines?: readonly string[];
  done?: readonly boolean[];
  rows?: readonly (readonly string[])[];
  code?: readonly (readonly [string, string])[];
  values?: readonly number[];
  /** the person preview's status line ("In a call"): the product's own words, drawn only when given */
  status?: string;
};

/**
 * Text that reads only when it is large enough: data-text at TEXT_MIN and up, texture under it. With `fit` (the
 * column's width, px) a title shrinks or wraps to two lines instead of being cut with "..." (fitTitle, kit/parts.tsx);
 * texture (preview lines, cells) runs under its well's edge, clipped: the kit never draws "..." or "…".
 */
const T: React.FC<{ id: string; px: number; u: number; weight?: number; color: string; mono?: boolean; fit?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ id, px: px0, u, weight = 500, color, mono, fit, children, style }) => {
  const f = fit !== undefined && typeof children === 'string' ? fitTitle(children, px0, weight, fit) : { px: px0, wrap: false };
  const px = f.px;
  return (
    <span
      {...(px >= TEXT_MIN * u ? { 'data-text': id } : { 'data-texture': '' })}
      style={{
        ...face(px, weight, color, -0.01, 1.2),
        ...(mono ? { fontFamily: FONT.mono, letterSpacing: '0em' } : null),
        overflow: 'hidden',
        textOverflow: 'clip',
        display: 'block',
        ...(f.wrap ? { whiteSpace: 'normal', overflowWrap: 'anywhere', maxHeight: px * 1.2 * 2 } : null),
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** Is this a node with content of the film's own (a label, a mark, a glyph or a preview's content)? undefined is not. */
export const isNode = (node: TileNode | null | undefined): node is TileNode =>
  !!node && typeof node === 'object' && !!(node.label || node.logo || node.glyph || node.photo || node.lines?.length || node.rows?.length || node.code?.length || node.values?.length);

/** The film's own nodes of a list (holes from an index past the end dropped). */
const ownNodes = (list?: readonly (TileNode | null | undefined)[] | null): TileNode[] => (Array.isArray(list) ? list.filter(isNode) : []);

/** The preview kind a node's own content makes (null: no preview). */
export const previewKind = (node: TileNode): TilePreview | null => {
  if (!node) return null;
  if (node.preview) return node.preview;
  if (node.photo) return 'photo';
  if (node.code?.length) return 'code';
  if (node.rows?.length) return 'table';
  if (node.values?.length) return 'chart';
  if (node.lines?.length) return 'doc';
  return null;
};

/** What a preview kind needs from the node, and the prop kit-empty names when it is missing. */
const NEED: Record<TilePreview, [has: (n: TileNode) => boolean, prop: string]> = {
  photo: [(n) => !!n.photo, 'node.photo'],
  person: [(n) => !!n.photo, 'node.photo'], // a person is their real portrait: the kit never draws a face for a name
  chart: [(n) => !!n.values?.length, 'node.values'],
  bars: [(n) => !!n.values?.length, 'node.values'],
  list: [(n) => !!n.lines?.length, 'node.lines'],
  doc: [(n) => !!n.lines?.length, 'node.lines'],
  table: [(n) => !!n.rows?.length, 'node.rows'],
  code: [(n) => !!n.code?.length, 'node.code'],
};

const Preview: React.FC<{ t: KitTheme; node: TileNode; kind: TilePreview; w: number; h: number; u: number }> = ({ t, node, kind, w, h, u }) => {
  const [has, prop] = NEED[kind];
  if (!has(node)) {
    kitEmpty('ContentTile', `${prop} for its '${kind}' preview`);
    return <div data-kit-empty="ContentTile" data-kit-need={prop} style={{ position: 'absolute', inset: 0 }} />;
  }
  if (kind === 'photo')
    return <Img data-imagery="" src={node.photo as string} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${((node.focus?.[0] ?? 0.5) * 100).toFixed(1)}% ${((node.focus?.[1] ?? 0.5) * 100).toFixed(1)}%`, display: 'block' }} />;
  const s = node.seed ?? node.label;
  const px = Math.max(8 * u, Math.min(h * 0.11, 15 * u));
  const ink = t.text;
  const mute = t.mute;
  if (kind === 'person')
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: w * 0.07, padding: `0 ${w * 0.07}px` }}>
        {node.photo ? (
          <Img data-imagery="" src={node.photo} style={{ width: Math.min(h * 0.78, w * 0.42), height: Math.min(h * 0.78, w * 0.42), borderRadius: '50%', objectFit: 'cover', objectPosition: `${((node.focus?.[0] ?? 0.5) * 100).toFixed(1)}% ${((node.focus?.[1] ?? 0.32) * 100).toFixed(1)}%`, flex: 'none', display: 'block' }} />
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: px * 0.3, minWidth: 0 }}>
          <T id="kit-tile-person" px={px * 1.05} u={u} weight={600} color={ink}>{node.value ?? node.label}</T>
          {node.sub && <T id="kit-tile-role" px={px * 0.9} u={u} color={mute}>{node.sub}</T>}
          {node.status && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: px * 0.3 }}>
              <span style={{ width: px * 0.5, height: px * 0.5, borderRadius: '50%', background: t.accent }} />
              <T id="kit-tile-status" px={px * 0.85} u={u} color={mute}>{node.status}</T>
            </span>
          )}
        </div>
      </div>
    );
  if (kind === 'chart' || kind === 'bars') {
    const vals = [...(node.values ?? [])];
    const top = Math.max(1e-9, ...vals);
    return (
      <div style={{ position: 'absolute', inset: 0, padding: `${h * 0.12}px ${w * 0.08}px` }}>
        {node.value && <T id="kit-tile-figure" px={px * 1.5} u={u} weight={650} color={ink}>{node.value}</T>}
        <div style={{ position: 'absolute', left: w * 0.08, right: w * 0.08, bottom: h * 0.14, height: h * 0.44, display: 'flex', alignItems: 'flex-end', gap: w * 0.02 }}>
          {kind === 'bars' ? (
            vals.map((v, i) => <div key={i} style={{ flex: 1, height: `${(v / top) * 100}%`, borderRadius: 2 * u, background: i === vals.length - 2 ? t.accent : mixColor(t.well, t.text, 0.18) }} />)
          ) : (
            <Sparkline values={vals} w={w * 0.84} h={h * 0.44} color={t.accent} weight={Math.max(1.5 * u, h * 0.03)} />
          )}
        </div>
      </div>
    );
  }
  if (kind === 'list')
    return (
      <div style={{ position: 'absolute', inset: 0, padding: `${h * 0.1}px ${w * 0.07}px`, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
        {(node.lines ?? []).slice(0, 3).map((item, i) => {
          const done = !!node.done?.[i];
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: px * 0.5 }}>
              <span style={{ width: px * 0.95, height: px * 0.95, borderRadius: '50%', flex: 'none', background: done ? t.accent : 'transparent', boxShadow: done ? undefined : `inset 0 0 0 ${Math.max(1, px * 0.1).toFixed(2)}px ${mute}` }} />
              <T id={`kit-tile-item-${i}`} px={px} u={u} color={done ? mute : ink} style={{ textDecoration: done ? 'line-through' : undefined, flex: 1 }}>{item}</T>
            </span>
          );
        })}
      </div>
    );
  if (kind === 'table') {
    const rows = (node.rows ?? []).slice(0, 4);
    const cols = Math.max(1, ...rows.map((r) => r.length));
    return (
      <div style={{ position: 'absolute', inset: 0, padding: `${h * 0.1}px ${w * 0.07}px`, display: 'grid', gridTemplateColumns: Array.from({ length: cols }, (_, c) => (c === 0 ? '1.4fr' : '1fr')).join(' '), rowGap: px * 0.35, columnGap: px * 0.6, alignContent: 'start' }}>
        {rows.flatMap((row, r) =>
          Array.from({ length: cols }, (_, c) => (
            <T key={`${r}-${c}`} id={`kit-tile-cell-${r * cols + c}`} px={px * 0.9} u={u} weight={r === 0 ? 650 : 500} color={r === 0 ? ink : mute} style={{ textAlign: c ? 'right' : 'left' }}>{row[c] ?? ''}</T>
          )),
        )}
      </div>
    );
  }
  if (kind === 'code')
    return (
      <div style={{ position: 'absolute', inset: 0, padding: `${h * 0.1}px ${w * 0.07}px`, display: 'flex', flexDirection: 'column', gap: px * 0.32 }}>
        {(node.code ?? []).slice(0, 4).map(([k, rest], i) => (
          <span key={i} style={{ display: 'flex', gap: px * 0.4, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <T id={`kit-tile-ln-${i}`} px={px * 0.85} u={u} color={mute} mono>{String(i + 1)}</T>
            <T id={`kit-tile-kw-${i}`} px={px * 0.85} u={u} color={t.dark ? t.accent : t.accentDeep} mono>{k}</T>
            <T id={`kit-tile-code-${i}`} px={px * 0.85} u={u} color={ink} mono>{rest}</T>
          </span>
        ))}
      </div>
    );
  // doc: the first line as its heading, the next lines under it, one marked
  const lines = node.lines ?? [];
  const marked = 1 + Math.floor(rand(`${s}:mark`) * 2);
  return (
    <div style={{ position: 'absolute', inset: 0, padding: `${h * 0.1}px ${w * 0.07}px`, display: 'flex', flexDirection: 'column', gap: px * 0.28 }}>
      <T id="kit-tile-doc-head" px={px * 1.08} u={u} weight={650} color={ink}>{lines[0]}</T>
      {lines.slice(1, 4).map((text, k) => {
        const i = k + 1;
        return (
          <T key={i} id={`kit-tile-doc-${i}`} px={px * 0.86} u={u} color={mute} style={{ background: i === marked ? t.accentSoft : undefined, borderRadius: 2 * u, padding: i === marked ? `0 ${px * 0.2}px` : undefined, transform: i === marked ? `translateX(${(-px * 0.2).toFixed(2)}px)` : undefined, width: i === 3 ? '62%' : undefined, color: i === marked ? (t.dark ? t.text : t.accentDeep) : mute }}>
            {text}
          </T>
        );
      })}
    </div>
  );
};

/**
 * One content tile: the mark (or glyph), the label and sub line, and a tiny preview; lit by the house key (a lifted
 * face, a rim on the key side, contact and cast shadows from `lift`). `w` px wide, `aspect` w / h (default 1).
 */
export const ContentTile: React.FC<{ node: TileNode; theme?: KitTheme; w: number; aspect?: number; lift?: number; scale?: number; style?: React.CSSProperties }> = ({ node, theme, w, aspect = 1, lift = 18, scale, style }) => {
  const t = theme ?? kitTheme('tintedPaper');
  const u = useKitScale(scale);
  const h = w / aspect;
  const r = Math.min(w, h) * 0.13;
  // no item of the film's own (an index past the end of an empty list, a node with nothing in it): the empty state, never a crash
  if (!isNode(node)) return <KitEmpty part="ContentTile" need="node (one of the film's own items: a label, a mark or glyph, its content)" theme={t} w={w} h={h} r={r} inline style={style} />;
  const icon = Math.min(w, h) * 0.2;
  const pad = Math.min(w, h) * 0.075;
  const px = Math.max(9 * u, Math.min(w, h) * 0.075);
  const hasMark = node.logo && hasLogo(node.logo);
  const previewTop = pad * 2 + icon;
  const kind = previewKind(node);
  const col = w - 2 * pad - (hasMark || node.glyph ? icon + pad * 0.8 : 0); // the label's column: titles fit it, never "..."
  return (
    <div data-ui style={{ position: 'relative', width: w, height: h, borderRadius: r, background: keyFace(t, t.dark ? t.raised : t.surface, 0.07), boxShadow: `${surfaceShadow(t, lift, u)}, inset 0 0 0 ${(1 * u).toFixed(2)}px ${mixColor(t.line, t.surface, 0.3)}`, overflow: 'hidden', flex: 'none', ...style }}>
      <div style={{ position: 'absolute', left: pad, top: pad, display: 'flex', alignItems: 'center', gap: pad * 0.8, width: w - 2 * pad }}>
        {hasMark ? <AppIcon logo={node.logo} size={icon} theme={t} lift={4} scale={u} /> : node.glyph ? <GlyphTile theme={t} name={node.glyph} size={icon} /> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: px * 0.15, minWidth: 0, flex: 1 }}>
          <T id="kit-tile-label" px={px * 1.12} u={u} weight={650} color={t.text} fit={col}>{node.label}</T>
          {node.sub && <T id="kit-tile-sub" px={px * 0.86} u={u} color={t.mute} fit={col}>{node.sub}</T>}
        </div>
      </div>
      {kind && (
        <div style={{ position: 'absolute', left: pad * 0.8, right: pad * 0.8, top: previewTop, bottom: pad * 0.8, borderRadius: r * 0.6, background: mixColor(t.surface, t.ground, t.dark ? 0.4 : 0.5), boxShadow: `inset 0 ${(1 * u).toFixed(2)}px ${(3 * u).toFixed(2)}px ${mixColor(t.line, t.ground, 0.3)}`, overflow: 'hidden' }}>
          <Preview t={t} node={node} kind={kind} w={w - pad * 1.6} h={h - previewTop - pad * 0.8} u={u} />
        </div>
      )}
    </div>
  );
};

/**
 * Tile nodes from the film's world (kit/data.ts filmWorld): its records (the title, the id and value as the sub line,
 * no invented preview) and, when the world's people have real portraits, its people, interleaved. Without photos every
 * tile is a record: a person is never drawn large in place of a photo. An empty world gives no nodes.
 */
export const worldNodes = (w: SampleWorld, n = 24): TileNode[] => {
  const out: TileNode[] = [];
  if (!w?.records?.length) return out;
  const faces = w.people.filter((p) => p.photo);
  for (let i = 0; out.length < n && i < n * 2; i++) {
    if (i % 4 === 3 && faces.length) {
      const p = faces[(i >> 2) % faces.length];
      out.push({ label: p.name, ...(p.role ? { sub: p.role } : {}), preview: 'person', value: p.first, seed: p.seed, photo: p.photo, focus: p.focus });
    } else {
      const r = w.records[i % w.records.length];
      const sub = [r.id, r.value].filter(Boolean).join(' · ');
      out.push({ label: r.title, ...(sub ? { sub } : {}), seed: `${w.seed}:${r.id || i}` });
    }
  }
  return out;
};

type FieldCommon = {
  /** the tiles that matter (real marks, the product's own items): they take the near slots by the centre */
  nodes: TileNode[];
  frame: number;
  start?: number;
  w?: number;
  h?: number;
  /** a near tile's width (px) */
  tile?: number;
  aspect?: number;
  stagger?: number;
  dur?: number;
  drift?: number;
  /** seconds a drift or turn travels before it lands at rest (kit/logos TRAVEL_S) */
  travel?: number;
  theme?: KitTheme;
  seed?: string | number;
  blur?: boolean;
  /** the film's further items for the other slots (default: the nodes again, in turn) */
  fill?: TileNode[];
};

const Placed: React.FC<{ slot: TileSlot; node: TileNode; frame: number; at: number; o: FieldCommon; x: number; y: number; size: number; extraY?: number }> = ({ slot, node, frame, at, o, x, y, size, extraY = 0 }) => {
  const u = useKitScale();
  const a = tileArrival(frame, at, { dur: o.dur, tilt: slot.tilt, depthPx: 520 * u, dropPx: 70 * u });
  if (a.opacity <= 0) return null;
  const s = mix(DEPTH.scale[0], DEPTH.scale[1], slot.depth);
  const sigma = o.blur === false ? 0 : depthBlur(slot.depth);
  const h = size / (o.aspect ?? 1);
  const tile = <ContentTile node={node} theme={o.theme} w={size} aspect={o.aspect} lift={mix(64, 18, a.p)} />;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, zIndex: Math.round((1 - slot.depth) * 100), opacity: a.opacity, transform: `translate3d(${(x - size / 2).toFixed(2)}px, ${(y - h / 2 + a.y + extraY).toFixed(2)}px, ${a.z.toFixed(1)}px) rotateX(${a.rx.toFixed(2)}deg) rotateY(${a.ry.toFixed(2)}deg) scale(${s.toFixed(4)})` }}>
      {sigma >= 0.75 ? <Defocus sigma={sigma} style={{ position: 'relative', width: size, height: h }}>{tile}</Defocus> : tile}
    </div>
  );
};

/** The other slots' content: the film's `fill`, else its own nodes in turn; null when the film gave nothing. */
const fillFor = (o: FieldCommon) => {
  const fill = ownNodes(o.fill);
  const pool = fill.length ? fill : ownNodes(o.nodes);
  if (!pool.length) return null;
  return (i: number) => pool[i % pool.length];
};

/**
 * A wall of content tiles: `nodes` take the slots nearest the centre on the near bands, the rest are filled with the
 * world's own content (never blank); each tile arrives tumbling out from the centre, settles on its depth band and
 * the wall travels with parallax, slowing to rest over `travel` s (then it holds still). `clear` keeps a box free for a line or a hub (px about the centre).
 */
export const ContentWall: React.FC<FieldCommon & { cols?: number; rows?: number; clear?: { w: number; h: number } }> = (props) => {
  const film = useFilm(); // the composition's size and rate, never the timeline's (a variant cut)
  const u = uOf(film);
  const { frame, start = 0, w = film.width, h = film.height, tile = 230 * u, stagger = 2, drift = 14 * u, seed = 'wall', travel = TRAVEL_S } = props;
  const nodes = ownNodes(props.nodes);
  const fps = film.fps;
  const cell = tile * 1.24;
  const cols = props.cols ?? Math.max(4, Math.round(w / cell) + 1);
  const rows = props.rows ?? Math.max(3, Math.round(h / (cell * 0.92)) + 1);
  const filler = fillFor(props);
  if (!filler) return <KitEmpty part="ContentWall" need="nodes (the film's own items)" theme={props.theme} w={w} h={h} />;
  const slots = wallSlots(nodes.length, { cols, rows, cell, w, h, seed, clear: props.clear });
  const t = landedTravel(Math.max(0, frame - start) / fps, travel);
  let k = 0;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, perspective: `${(1900 * u).toFixed(0)}px`, transformStyle: 'preserve-3d' }}>
      {slots.map((s, i) => {
        const node = s.logo !== null ? nodes[s.logo] : filler(k++);
        const dx = drift * t * mix(DEPTH.drift[0], DEPTH.drift[1], s.depth);
        return <Placed key={i} slot={s} node={node} frame={frame} at={start + f60x(stagger, fps) * s.order} o={props} x={s.x + dx} y={s.y - dx * 0.18} size={tile} />;
      })}
    </div>
  );
};

/** A ring of content tiles round a centre kept free: they arrive tumbling in turn while the ring turns (`orbit` deg a second), slowing to rest over `travel` s; the far side is smaller and softer. */
export const ContentRing: React.FC<FieldCommon & { count?: number; rx?: number; ry?: number; orbit?: number }> = (props) => {
  const film = useFilm();
  const u = uOf(film);
  const { frame, start = 0, w = film.width, h = film.height, tile = 200 * u, stagger = 3, rx = 680 * u, ry = 350 * u, orbit = 4, seed = 'ring', travel = TRAVEL_S } = props;
  const nodes = ownNodes(props.nodes);
  const fps = film.fps;
  const n = Math.max(nodes.length, props.count ?? 14);
  const filler = fillFor(props);
  if (!filler) return <KitEmpty part="ContentRing" need="nodes (the film's own items)" theme={props.theme} w={w} h={h} />;
  const t = landedTravel(Math.max(0, frame - start) / fps, travel);
  const slots = ringSlots(n, { rx, ry, w, h, turn: (orbit * Math.PI * t) / 180, seed });
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, perspective: `${(1900 * u).toFixed(0)}px`, transformStyle: 'preserve-3d' }}>
      {slots.map((s, i) => (
        <Placed key={i} slot={{ ...s, depth: s.depth * 0.8 }} node={i < nodes.length ? nodes[i] : filler(i - nodes.length)} frame={frame} at={start + f60x(stagger, fps) * s.order} o={{ ...props, blur: props.blur ?? true }} x={s.x} y={s.y} size={tile} />
      ))}
    </div>
  );
};

/**
 * Rows of content tiles flowing past (a ticker): the near row at `speed` px a second, the far row at 0.6 of it on the
 * far band (smaller, softer); the rows bend toward the camera at the frame's edges by `curve` degrees. The tiles
 * arrive tumbling in turn from `start`, then ride the flow. Positions are closed-form in the frame.
 */
export const ContentTicker: React.FC<FieldCommon & { rows?: number; speed?: number; curve?: number; gap?: number }> = (props) => {
  const film = useFilm();
  const u = uOf(film);
  const { frame, start = 0, w = film.width, h = film.height, tile = 240 * u, stagger = 2, speed = 90 * u, curve = 16, seed = 'ticker', rows = 2, gap = 34 * u } = props;
  const nodes = ownNodes(props.nodes);
  const fps = film.fps;
  const t = (frame - start) / fps;
  const th = tile / (props.aspect ?? 1);
  const filler = fillFor(props);
  if (!filler) return <KitEmpty part="ContentTicker" need="nodes (the film's own items)" theme={props.theme} w={w} h={h} />;
  const out: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const depth = r === 0 ? 0 : DEPTH.bands[Math.min(DEPTH.bands.length - 1, r)];
    const s = mix(DEPTH.scale[0], DEPTH.scale[1], depth);
    const pitch = (tile + gap) * s;
    const count = Math.ceil(w / pitch) + 2;
    const len = count * pitch;
    const v = speed * mix(1, 0.6, depth) * (r % 2 ? -1 : 1);
    const y = h / 2 + (r === 0 ? 0.3 * th : -0.36 * th - (r - 1) * 0.62 * th); // further rows sit higher (toward the horizon) and pass behind the near one
    for (let i = 0; i < count; i++) {
      const raw = i * pitch - v * Math.max(0, t) + rand(`${seed}:${r}:off`) * pitch;
      const x = ((raw % len) + len) % len - pitch / 2;
      const node = r === 0 && i < nodes.length ? nodes[i] : filler(r * 13 + i);
      const k = `${seed}:${r}:${i}`;
      const tilt: [number, number] = [(rand(`${k}:a`) < 0.5 ? -1 : 1) * (20 + 40 * rand(`${k}:x`)), (rand(`${k}:b`) < 0.5 ? -1 : 1) * (20 + 40 * rand(`${k}:y`))];
      const order = Math.abs(x - w / 2) / pitch + r * 2;
      const ry = clamp((x - w / 2) / (w / 2), -1.2, 1.2) * -curve;
      out.push(
        <div key={`${r}-${i}`} style={{ position: 'absolute', left: 0, top: 0, zIndex: 100 - r * 10, transform: `rotateY(${ry.toFixed(2)}deg)`, transformOrigin: `${(w / 2).toFixed(0)}px 50%`, transformStyle: 'preserve-3d' }}>
          <Placed slot={{ x, y, depth, order: Math.round(order), logo: null, tilt }} node={node} frame={frame} at={start + f60x(stagger, fps) * order} o={{ ...props, blur: props.blur ?? true }} x={x} y={y} size={tile} />
        </div>,
      );
    }
  }
  return <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, perspective: `${(1700 * u).toFixed(0)}px`, transformStyle: 'preserve-3d', overflow: 'hidden' }}>{out}</div>;
};
