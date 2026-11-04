// Dense product screens: the product as it looks in use, a texture of real small type (names, ids, amounts, dates,
// statuses that add up) with exactly ONE line held readable at a time. A screen with five rows and grey bars reads
// as a mock; a screen with 25 to 200 small strings and one lifted line reads as software, and the viewer still reads
// only what the film says.
//   Micro        texture type: a product string at 12-16 px at 1080p (6-8 px on a half-size still). It is tagged
//                data-texture, never data-text: it is not copy and nobody is asked to read it
//   FocusLens    the focus helper: dims the screen under a veil (and softens it with `blur`), lifts the one readable
//                line on a raised strip at >= 4 % of the frame height, and glides it from row to row (16 f at 60 fps
//                on E.glideOut) when `focus` is a schedule
//   AppWindow    the chrome: title bar, workspace, nav with counts, team, the viewer
//   DenseScreen  a whole screen from the film's own world (kit/data.ts filmWorld): `layout` 'table' (tabs, figures, a
//                records table, activity and a chart) or 'board' (the records as cards in status columns), with the
//                lens on top. A part the world does not give (figures, chart, activity, nav, chrome strings) is not
//                drawn; no world at all draws the empty state (kit/gate.tsx) and reports kit-empty.
// Every part is a pure function of its props and `frame`. The kit's sample worlds are sample().world(), for its gallery.
import React from 'react';
import { FONT, TEXT_MIN } from '../brand/tokens';
import { Defocus } from '../fx/Defocus';
import { clamp, E, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { f60x, fpsOf, useFilm } from '../lib/film';
import { isEmptyWorld, type SampleWorld, type StatusTone, type WorldKind } from './data';
import { kitEmpty, KitEmpty } from './gate';
import { Avatar, face, Glyph, keyFace, Sparkline, surfaceShadow, useKitScale } from './parts';
import { type KitTheme, kitTheme } from './theme';

/**
 * House numbers: texture type sizes (px at 1080p), the readable line's share of the frame height (its font size),
 * the fewest strings a product screen shows, the veil over the rest, the lens's glide (60 fps frames).
 */
export const DENSE = { micro: [12, 16] as const, focusShare: 0.04, minTexts: 25, veil: 0.3, blur: 0.75, glide60: 16, swap60: 8 } as const;

/** The smallest font size (px) of the readable line in a frame of height `h` shown at `view` scale. */
export const focusPx = (h: number, view = 1) => Math.ceil((DENSE.focusShare * h) / Math.max(0.05, view));

type MicroProps = { px?: number; weight?: number; color: string; mono?: boolean; track?: number; upper?: boolean; style?: React.CSSProperties; children: React.ReactNode };
/** Texture type: a product string drawn small, tagged data-texture (never data-text). */
export const Micro: React.FC<MicroProps> = ({ px = 14, weight = 500, color, mono, track, upper, style, children }) => (
  <span data-texture style={{ ...face(px, weight, color, track ?? (upper ? 0.06 : -0.005), 1.2), ...(mono ? { fontFamily: FONT.mono, letterSpacing: '0em' } : null), ...(upper ? { textTransform: 'uppercase' } : null), ...style }}>
    {children}
  </span>
);

/** Where the lens is at `frame` for a fixed row or a schedule [{ at, row }]: the row, the one before, 0..1 through the glide. Pure. */
export const focusState = (frame: number, focus: number | { at: number; row: number }[], o: { glide?: number; fps?: number } = {}) => {
  if (typeof focus === 'number') return { row: focus, prev: focus, k: 1 };
  const steps = [...focus].sort((a, b) => a.at - b.at);
  if (!steps.length) return { row: 0, prev: 0, k: 1 };
  let i = 0;
  while (i < steps.length - 1 && frame >= steps[i + 1].at) i++;
  const cur = steps[i];
  const prev = i > 0 ? steps[i - 1].row : cur.row;
  const glide = f60x(o.glide ?? DENSE.glide60, o.fps ?? fpsOf());
  const k = i === 0 ? 1 : clamp((frame - cur.at) / Math.max(1, glide));
  return { row: cur.row, prev, k };
};

/** A status as the product draws it: the dot's shape carries the meaning, the accent only on the story's state. */
export const StatusPill: React.FC<{ theme: KitTheme; label: string; tone: StatusTone; px: number; strong?: boolean }> = ({ theme: t, label, tone, px, strong }) => {
  const d = px * 0.62;
  const second = t.second;
  const dot: React.CSSProperties =
    tone === 'accent' ? { background: t.accent } :
    tone === 'done' ? { background: t.text } :
    tone === 'wait' ? { background: `linear-gradient(90deg, ${t.mute} 50%, transparent 50%)`, boxShadow: `inset 0 0 0 ${(px * 0.1).toFixed(2)}px ${t.mute}` } :
    tone === 'alert' ? { background: second ?? t.text, boxShadow: `0 0 0 ${(px * 0.14).toFixed(2)}px ${mixColor(t.surface, second ?? t.text, 0.22)}` } :
    { boxShadow: `inset 0 0 0 ${(px * 0.1).toFixed(2)}px ${t.mute}` };
  const fill = tone === 'accent' ? mixColor(t.surface, t.accent, strong ? 0.2 : 0.12) : mixColor(t.surface, t.text, 0.06);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: px * 0.42, height: px * 1.7, padding: `0 ${px * 0.62}px 0 ${px * 0.5}px`, borderRadius: px, background: fill, flex: 'none' }}>
      <span style={{ width: d, height: d, borderRadius: '50%', flex: 'none', ...dot }} />
      <Micro px={px} weight={600} color={tone === 'accent' ? (t.dark ? t.text : t.accentDeep) : t.text}>
        {label}
      </Micro>
    </span>
  );
};

// ------------------------------------------------------------------------------------------------ the focus lens
export type LensRect = { x: number; y: number; w: number; h: number };
/**
 * The focus helper over any dense layer: `children` is the screen, drawn under a veil of `veil` (0..1) and softened
 * by `blur` px (two fixed levels, never an animated radius); `lens` is the readable line, drawn on a raised strip at
 * `rect` (px inside the layer), lifted toward the key. Give the lens one data-text element at >= focusPx().
 */
export const FocusLens: React.FC<{ theme: KitTheme; w: number; h: number; rect: LensRect; veil?: number; blur?: number; radius?: number; lift?: number; scale?: number; ring?: boolean; children: React.ReactNode; lens: React.ReactNode }> = ({
  theme: t,
  w,
  h,
  rect,
  veil = DENSE.veil,
  blur = DENSE.blur,
  radius,
  lift = 30,
  scale,
  ring = true,
  children,
  lens,
}) => {
  const u = useKitScale(scale);
  const r = radius ?? Math.min(rect.h * 0.28, 22 * u);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
      {blur >= 0.5 ? <Defocus sigma={blur} style={{ width: w, height: h }}>{children}</Defocus> : <div style={{ position: 'absolute', inset: 0 }}>{children}</div>}
      {veil > 0 && <div style={{ position: 'absolute', inset: 0, background: mixColor(t.surface, t.ground, 0.25), opacity: clamp(veil) }} />}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: rect.w,
          height: rect.h,
          transform: `translate(${rect.x.toFixed(2)}px, ${rect.y.toFixed(2)}px)`,
          borderRadius: r,
          background: keyFace(t, t.dark ? t.raised : t.surface, 0.06),
          boxShadow: `${surfaceShadow(t, lift, u)}${ring ? `, inset 0 0 0 ${(2 * u).toFixed(2)}px ${mixColor(t.surface, t.accent, 0.7)}` : ''}`,
          overflow: 'hidden',
        }}
      >
        {lens}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ chrome
const mono = (s: string) => s.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();

/** The app's chrome around a screen: title bar, workspace, nav with counts, the team, the viewer. `main` is the content box (px inside the window). */
export const AppWindow: React.FC<{ theme: KitTheme; world: SampleWorld; w: number; h: number; frame: number; scale?: number; active?: number; children: (main: { x: number; y: number; w: number; h: number }) => React.ReactNode }> = ({ theme: t, world: W, w, h, frame, scale, active = 1, children }) => {
  const u = useKitScale(scale);
  const { fps } = useFilm();
  const bar = 46 * u;
  const side = Math.min(250 * u, w * 0.18);
  const ink = t.text;
  const mute = t.mute;
  const sideBg = mixColor(t.surface, t.ground, t.dark ? 0.35 : 0.45);
  const live = 0.55 + 0.45 * Math.cos((frame / fps) * Math.PI * 1.1) ** 2; // the live dot breathes
  const chrome = W.chrome ?? {};
  const me = W.people[W.me];
  const plan = chrome.plan ?? ''; // the film's own words or nothing: the kit never writes "N members"
  const empty = !W.workspace && isEmptyWorld(W);
  if (empty) kitEmpty('AppWindow', "world: filmWorld({ workspace, people, nav }) with the product's own chrome");
  return (
    <div data-ui {...(empty ? { 'data-kit-empty': 'AppWindow', 'data-kit-need': 'world' } : {})} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: 22 * u, overflow: 'hidden', background: t.surface, boxShadow: `inset 0 0 0 ${(1 * u).toFixed(2)}px ${t.line}` }}>
      {/* title bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: bar, background: mixColor(t.surface, t.ground, 0.3), boxShadow: `inset 0 -${(1 * u).toFixed(2)}px 0 ${t.line}` }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: 'absolute', left: (20 + i * 20) * u, top: bar / 2 - 6 * u, width: 12 * u, height: 12 * u, borderRadius: '50%', background: mixColor(t.line, t.mute, 0.25 + 0.1 * i) }} />
        ))}
        <div style={{ position: 'absolute', left: w / 2 - 210 * u, top: 9 * u, width: 420 * u, height: bar - 18 * u, borderRadius: 8 * u, background: t.well, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 * u }}>
          {chrome.url && <Glyph name="lock" size={12 * u} color={mute} />}
          {chrome.url && <Micro px={12.5 * u} color={mute}>{chrome.url}</Micro>}
        </div>
        <div style={{ position: 'absolute', right: 18 * u, top: 0, height: bar, display: 'flex', alignItems: 'center', gap: 14 * u }}>
          <Glyph name="bell" size={16 * u} color={mute} />
          {me && <Avatar theme={t} i={W.me} initials={me.initials} seed={me.seed} src={me.photo} focus={me.focus} size={26 * u} kind="portrait" />}
        </div>
      </div>
      {/* sidebar */}
      <div style={{ position: 'absolute', left: 0, top: bar, width: side, height: h - bar, background: sideBg, boxShadow: `inset -${(1 * u).toFixed(2)}px 0 0 ${t.line}` }}>
        {W.workspace && (
          <div style={{ position: 'absolute', left: 18 * u, top: 18 * u, display: 'flex', alignItems: 'center', gap: 10 * u }}>
            <div style={{ width: 30 * u, height: 30 * u, borderRadius: 9 * u, background: `linear-gradient(135deg, ${t.accent}, ${t.accentDeep})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Micro px={13 * u} weight={700} color={t.accentInk}>{mono(W.workspace)}</Micro>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Micro px={14.5 * u} weight={650} color={ink}>{W.workspace}</Micro>
              {plan && <Micro px={11.5 * u} color={mute}>{plan}</Micro>}
            </div>
          </div>
        )}
        <div style={{ position: 'absolute', left: 14 * u, top: 66 * u, width: side - 28 * u, height: 32 * u, borderRadius: 8 * u, background: t.well, display: 'flex', alignItems: 'center', gap: 8 * u, padding: `0 ${10 * u}px`, boxSizing: 'border-box' }}>
          <Glyph name="search" size={14 * u} color={mute} />
          {chrome.search && <Micro px={13 * u} color={mute}>{chrome.search}</Micro>}
          <span style={{ flex: 1 }} />
          {chrome.search && <Micro px={11.5 * u} color={mute} mono>⌘K</Micro>}
        </div>
        {W.nav.map((n, i) => {
          const on = i === active;
          return (
            <div key={n.label} style={{ position: 'absolute', left: 10 * u, top: (114 + i * 36) * u, width: side - 20 * u, height: 32 * u, borderRadius: 8 * u, background: on ? mixColor(sideBg, t.accent, 0.12) : 'transparent', display: 'flex', alignItems: 'center', gap: 10 * u, padding: `0 ${10 * u}px`, boxSizing: 'border-box' }}>
              <Glyph name={n.glyph} size={16 * u} color={on ? (t.dark ? t.accent : t.accentDeep) : mute} variant={on ? 'fill' : 'line'} />
              <Micro px={14 * u} weight={on ? 650 : 500} color={on ? ink : mixColor(ink, mute, 0.4)}>{n.label}</Micro>
              <span style={{ flex: 1 }} />
              {n.count !== undefined && <Micro px={12 * u} color={mute}>{String(n.count)}</Micro>}
            </div>
          );
        })}
        {chrome.team && W.people.length > 1 && (
          <div style={{ position: 'absolute', left: 20 * u, top: (124 + W.nav.length * 36) * u }}>
            <Micro px={11 * u} weight={600} color={mute} upper>{chrome.team}</Micro>
          </div>
        )}
        {W.people.slice(1, 6).map((p, i) => (
          <div key={p.name} style={{ position: 'absolute', left: 18 * u, top: (150 + W.nav.length * 36 + i * 34) * u, display: 'flex', alignItems: 'center', gap: 10 * u }}>
            <Avatar theme={t} i={i} initials={p.initials} seed={p.seed} src={p.photo} focus={p.focus} size={24 * u} />
            <Micro px={13 * u} color={ink}>{p.name}</Micro>
            {i < 2 && <div style={{ width: 7 * u, height: 7 * u, borderRadius: '50%', background: t.accent, opacity: i === 0 ? live : 1 }} />}
          </div>
        ))}
        {me && (
          <div style={{ position: 'absolute', left: 14 * u, bottom: 14 * u, width: side - 28 * u, display: 'flex', alignItems: 'center', gap: 10 * u }}>
            <Avatar theme={t} i={W.me} initials={me.initials} seed={me.seed} src={me.photo} focus={me.focus} size={32 * u} kind="portrait" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Micro px={13 * u} weight={600} color={ink}>{me.name}</Micro>
              {me.role && <Micro px={11.5 * u} color={mute}>{me.role}</Micro>}
            </div>
          </div>
        )}
      </div>
      {children({ x: side, y: bar, w: w - side, h: h - bar })}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ the screen
export type DenseLayout = 'table' | 'board';
export type DenseScreenProps = {
  frame: number;
  theme?: KitTheme;
  /** the world shown: the film's own (kit/data.ts filmWorld); without one the screen draws its empty state */
  world?: SampleWorld;
  /** @deprecated ignored: the kit deals no sample world into a film (sample().world is the gallery's) */
  seed?: string | number;
  /** @deprecated ignored, as `seed` */
  kind?: WorldKind;
  layout?: DenseLayout;
  w?: number;
  h?: number;
  x?: number;
  y?: number;
  scale?: number;
  /** the scale the screen is seen at in the frame (a camera or a fit): the readable line keeps >= 4 % of the frame height */
  view?: number;
  /** the readable row: an index, a schedule [{ at, row }], or null for no lens (the whole screen as texture) */
  focus?: number | { at: number; row: number }[] | null;
  veil?: number;
  blur?: number;
  /** the frame the chart draws on */
  drawAt?: number;
  lift?: number;
  style?: React.CSSProperties;
};

/**
 * A whole product screen in use, dense with the world's real data, one line readable: `layout` 'table' (tabs with
 * counts, four figures, the records table, the activity feed and a chart that sums to the total) or 'board' (the
 * records as cards in their status columns). The lens lifts `focus` (default the world's story record).
 */
export const DenseScreen: React.FC<DenseScreenProps> = ({ frame: f, theme, world, layout = 'table', w: w0, h: h0, x = 0, y = 0, scale, view = 1, focus, veil, blur, drawAt = -1e9, lift = 40, style }) => {
  const t = theme ?? kitTheme();
  const u = useKitScale(scale);
  const film = useFilm();
  const w = w0 ?? 1600 * u;
  const h = h0 ?? 920 * u;
  if (!world || isEmptyWorld(world) || !world.records.length)
    return <KitEmpty part="DenseScreen" need="world: filmWorld({ records, people, statuses }) with the product's own rows" theme={t} w={w} h={h} x={x} y={y} r={22 * u} style={style} />;
  const W = world;
  const fx = focus === undefined ? W.focus : focus === null ? null : typeof focus === 'number' ? Math.min(focus, W.records.length - 1) : focus.map((s) => ({ ...s, row: Math.min(s.row, W.records.length - 1) }));
  return (
    <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate(${x}px, ${y}px)`, borderRadius: 22 * u, boxShadow: surfaceShadow(t, lift, u), ...style }}>
      <AppWindow theme={t} world={W} w={w} h={h} frame={f} scale={u}>
        {(m) =>
          layout === 'board' ? (
            <Board t={t} W={W} m={m} u={u} f={f} H={film.height} view={view} focus={fx} veil={veil} blur={blur} />
          ) : (
            <Table t={t} W={W} m={m} u={u} f={f} H={film.height} view={view} focus={fx} veil={veil} blur={blur} drawAt={drawAt} />
          )
        }
      </AppWindow>
    </div>
  );
};

type Inner = { t: KitTheme; W: SampleWorld; m: { x: number; y: number; w: number; h: number }; u: number; f: number; H: number; view: number; focus: number | { at: number; row: number }[] | null; veil?: number; blur?: number };

/** The lens's line for a record: id, the title at the readable size (the one data-text), value and status beside it. */
const LensLine: React.FC<{ t: KitTheme; W: SampleWorld; row: number; px: number; u: number; w: number; h: number; k: number; mode: 'in' | 'out' | 'still' }> = ({ t, W, row, px, u, w, h, k, mode }) => {
  const r = W.records[row];
  if (!r) return null;
  const st = W.statuses[r.status];
  const who = W.people[r.who];
  const q = E.glideOut(k);
  const op = mode === 'in' ? clamp((k - 0.25) / 0.5) : mode === 'out' ? 1 - clamp(k / 0.45) : 1;
  const dy = mode === 'in' ? (1 - q) * px * 0.32 : mode === 'out' ? -q * px * 0.2 : 0;
  const small = Math.max(px * 0.36, 14 * u);
  // one readable line at a time: through a glide the line that leads (the leaving one until k 0.4) carries data-text
  const lead = mode === 'still' || (mode === 'in' ? k >= 0.4 : k < 0.4);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, display: 'flex', alignItems: 'center', gap: px * 0.42, padding: `0 ${px * 0.55}px`, boxSizing: 'border-box', opacity: op, transform: `translateY(${dy.toFixed(2)}px)` }}>
      {who && <Avatar theme={t} i={r.who} initials={who.initials} seed={who.seed} src={who.photo} focus={who.focus} size={px * 1.1} kind="portrait" />}
      <div data-text={lead ? 'kit-dense-focus' : undefined} style={{ display: 'flex', alignItems: 'baseline', gap: px * 0.4, flex: 1, minWidth: 0 }}>
        <span style={{ ...face(px, 600, t.text, -0.02, 1.1), flex: 'none' }}>{r.title}</span>
        {r.value && <span style={{ ...face(px * 0.62, 500, t.mute, -0.01, 1.1), flex: 'none' }}>{r.value}</span>}
      </div>
      {r.id && <Micro px={small} color={t.mute} mono>{r.id}</Micro>}
      {st && <StatusPill theme={t} label={st.label} tone={st.tone} px={small} strong />}
    </div>
  );
};

const Table: React.FC<Inner & { drawAt: number }> = ({ t, W, m, u, f, H, view, focus, veil, blur, drawAt }) => {
  const { fps } = useFilm(); // the lens glides at the composition's rate (a variant cut at 30 fps)
  const pad = 26 * u;
  const insW = m.w > 1150 * u ? 300 * u : 0; // the inspector column when there is room
  const tw = m.w - 2 * pad - (insW ? insW + pad * 0.8 : 0);
  const head = 64 * u;
  const chrome = W.chrome ?? {};
  const kpis = W.kpis ?? [];
  const tabsY = head + 6 * u;
  const kpiY = tabsY + (W.statuses.length ? 50 : 0) * u;
  const kpiH = 78 * u;
  const tableY = kpis.length ? kpiY + kpiH + 20 * u : kpiY + 6 * u;
  const hdrH = 32 * u;
  const rowH = Math.max(40 * u, Math.min(54 * u, (m.h - tableY - hdrH - 18 * u) / W.records.length));
  const cols = [0.035, 0.12, 0.34, 0.14, 0.12, 0.17, 0.075].map((c) => c * tw); // check, id, title, value, date, status, who
  const cx = cols.map((_, i) => cols.slice(0, i).reduce((sum, c) => sum + c, 0));
  const ink = t.text;
  const mute = t.mute;
  const headLine = [W.today.label, W.noun[1] ? `${W.total.count} ${W.noun[1]}` : ''].filter(Boolean).join(' · ');
  const showIns = insW > 0 && (W.activity.length > 0 || W.series.length > 0);
  const fs = focus === null ? null : focusState(f, focus, { fps });
  const fpx = focusPx(H, view);
  const lensH = Math.max(rowH * 1.25, fpx * 1.75);
  const rowY = (i: number) => m.y + tableY + hdrH + i * rowH + rowH / 2 - lensH / 2;
  const screen = (
    <div style={{ position: 'absolute', left: m.x, top: m.y, width: m.w, height: m.h }}>
      {/* the screen's header */}
      <div style={{ position: 'absolute', left: pad, top: 18 * u, display: 'flex', alignItems: 'baseline', gap: 12 * u }}>
        {W.screen && <Micro px={24 * u} weight={650} color={ink} track={-0.02}>{W.screen}</Micro>}
        <Micro px={13 * u} color={mute}>{headLine}</Micro>
      </div>
      <div style={{ position: 'absolute', right: pad + insW + (insW ? pad * 0.8 : 0), top: 16 * u, display: 'flex', alignItems: 'center', gap: 10 * u }}>
        {chrome.range && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 * u, height: 32 * u, padding: `0 ${12 * u}px`, borderRadius: 8 * u, boxShadow: `inset 0 0 0 ${(1 * u).toFixed(2)}px ${t.line}` }}>
            <Glyph name="calendar" size={13 * u} color={mute} />
            <Micro px={13 * u} color={ink}>{chrome.range}</Micro>
          </span>
        )}
        {chrome.action && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 * u, height: 32 * u, padding: `0 ${14 * u}px`, borderRadius: 8 * u, background: t.accent }}>
            <Glyph name="plus" size={13 * u} color={t.accentInk} weight={2.6} />
            <Micro px={13 * u} weight={650} color={t.accentInk}>{chrome.action}</Micro>
          </span>
        )}
      </div>
      {/* tabs with the rows' own counts */}
      {W.statuses.length > 0 && <div style={{ position: 'absolute', left: pad, top: tabsY, width: tw, height: 36 * u, display: 'flex', alignItems: 'center', gap: 22 * u, boxShadow: `inset 0 -${(1 * u).toFixed(2)}px 0 ${t.line}` }}>
        {[...(chrome.all ? [{ label: chrome.all, count: W.total.count }] : []), ...W.statuses.map((s) => ({ label: s.label, count: s.count }))].map((tab, i) => (
          <span key={tab.label} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 * u, height: 36 * u }}>
            <Micro px={13.5 * u} weight={i === 0 ? 650 : 500} color={i === 0 ? ink : mute}>{tab.label}</Micro>
            <span style={{ padding: `${1 * u}px ${6 * u}px`, borderRadius: 6 * u, background: mixColor(t.surface, t.text, 0.07) }}>
              <Micro px={11.5 * u} weight={600} color={mute}>{String(tab.count)}</Micro>
            </span>
            {i === 0 && <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 * u, background: ink, borderRadius: u }} />}
          </span>
        ))}
      </div>}
      {/* four figures */}
      {kpis.map(([label, value], i) => (
        <div key={label} style={{ position: 'absolute', left: pad + i * (tw / 4), top: kpiY, width: tw / 4 - 14 * u, height: kpiH, borderRadius: 12 * u, background: mixColor(t.surface, t.ground, 0.22), boxShadow: `inset 0 0 0 ${(1 * u).toFixed(2)}px ${t.line}` }}>
          <div style={{ position: 'absolute', left: 14 * u, top: 12 * u }}>
            <Micro px={12 * u} weight={550} color={mute}>{label}</Micro>
          </div>
          <div style={{ position: 'absolute', left: 14 * u, top: 32 * u }}>
            <Micro px={25 * u} weight={650} color={ink} track={-0.03}>{value}</Micro>
          </div>
          {i === 0 && W.series.length > 1 && (
            <div style={{ position: 'absolute', right: 14 * u, top: 18 * u }}>
              <Sparkline values={W.series} w={tw / 4 - 190 * u} h={42 * u} color={t.accent} weight={2.2 * u} draw={prog(f, drawAt, drawAt + 40, E.softOut)} />
            </div>
          )}
        </div>
      ))}
      {/* the table: header, rows */}
      <div style={{ position: 'absolute', left: pad, top: tableY, width: tw, height: hdrH, boxShadow: `inset 0 -${(1 * u).toFixed(2)}px 0 ${t.line}` }}>
        {['', ...W.columns].map((c, i) => (
          <div key={i} style={{ position: 'absolute', left: cx[i] + (i === 3 ? 0 : 8 * u), top: 9 * u, width: i === 3 ? cols[i] - 12 * u : undefined, textAlign: i === 3 ? 'right' : 'left' }}>
            <Micro px={11 * u} weight={600} color={mute} upper>{c}</Micro>
          </div>
        ))}
      </div>
      {W.records.map((r, i) => {
        const st = W.statuses[r.status];
        const who = W.people[r.who];
        const top = tableY + hdrH + i * rowH;
        const sel = fs && i === fs.row;
        return (
          <div key={r.id || i} style={{ position: 'absolute', left: pad, top, width: tw, height: rowH, boxShadow: `inset 0 -${(1 * u).toFixed(2)}px 0 ${mixColor(t.line, t.surface, 0.35)}`, background: sel ? mixColor(t.surface, t.accent, 0.06) : 'transparent' }}>
            <div style={{ position: 'absolute', left: cx[0] + 8 * u, top: rowH / 2 - 7 * u, width: 14 * u, height: 14 * u, borderRadius: 4 * u, boxShadow: `inset 0 0 0 ${(1.4 * u).toFixed(2)}px ${t.line}`, background: sel ? t.accent : 'transparent' }} />
            <div style={{ position: 'absolute', left: cx[1] + 8 * u, top: rowH / 2 - 8 * u }}>
              <Micro px={12.5 * u} color={mute} mono>{r.id}</Micro>
            </div>
            <div style={{ position: 'absolute', left: cx[2] + 8 * u, top: rowH / 2 - 17 * u, width: cols[2] - 16 * u, display: 'flex', flexDirection: 'column', gap: 2 * u, overflow: 'hidden' }}>
              <Micro px={14.5 * u} weight={560} color={ink}>{r.title}</Micro>
              {r.sub && <Micro px={12 * u} color={mute}>{r.sub}</Micro>}
            </div>
            <div style={{ position: 'absolute', left: cx[3], top: rowH / 2 - 9 * u, width: cols[3] - 12 * u, textAlign: 'right' }}>
              <Micro px={14 * u} weight={560} color={ink}>{r.value}</Micro>
            </div>
            <div style={{ position: 'absolute', left: cx[4] + 8 * u, top: rowH / 2 - 9 * u }}>
              <Micro px={13 * u} color={mute}>{r.date}</Micro>
            </div>
            {st && (
              <div style={{ position: 'absolute', left: cx[5] + 8 * u, top: rowH / 2 - 11 * u }}>
                <StatusPill theme={t} label={st.label} tone={st.tone} px={12.5 * u} />
              </div>
            )}
            <div style={{ position: 'absolute', left: cx[6] + 8 * u, top: rowH / 2 - 13 * u, display: 'flex', alignItems: 'center', gap: 6 * u }}>
              {who && <Avatar theme={t} i={r.who} initials={who.initials} seed={who.seed} src={who.photo} focus={who.focus} size={26 * u} kind="portrait" />}
              {r.tag && <Micro px={11.5 * u} color={mute}>{r.tag}</Micro>}
            </div>
          </div>
        );
      })}
      {/* the inspector: activity and the chart */}
      {showIns && (
        <div style={{ position: 'absolute', left: m.w - pad - insW, top: 16 * u, width: insW, height: m.h - 32 * u, borderRadius: 14 * u, background: mixColor(t.surface, t.ground, 0.18), boxShadow: `inset 0 0 0 ${(1 * u).toFixed(2)}px ${t.line}` }}>
          {chrome.activity && W.activity.length > 0 && (
            <div style={{ position: 'absolute', left: 16 * u, top: 14 * u }}>
              <Micro px={13.5 * u} weight={650} color={ink}>{chrome.activity}</Micro>
            </div>
          )}
          {W.activity.map((a, i) => {
            const p = W.people[a.who];
            if (!p) return null;
            return (
              <div key={i} style={{ position: 'absolute', left: 16 * u, top: (46 + i * 50) * u, width: insW - 32 * u, display: 'flex', gap: 10 * u }}>
                <Avatar theme={t} i={a.who} initials={p.initials} seed={p.seed} src={p.photo} focus={p.focus} size={28 * u} kind="portrait" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 * u, minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: 5 * u, whiteSpace: 'nowrap' }}>
                    <Micro px={12.5 * u} weight={600} color={ink}>{p.first}</Micro>
                    <Micro px={12.5 * u} color={mixColor(ink, mute, 0.5)}>{a.text}</Micro>
                  </span>
                  <Micro px={11 * u} color={mute}>{a.ago}</Micro>
                </div>
              </div>
            );
          })}
          {W.series.length > 0 && <div style={{ position: 'absolute', left: 16 * u, bottom: 16 * u, width: insW - 32 * u }}>
            {chrome.chart && <Micro px={12 * u} weight={600} color={mute}>{chrome.chart}</Micro>}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 * u, height: 90 * u, marginTop: 10 * u }}>
              {W.series.map((v, i) => {
                const top = Math.max(...W.series);
                const g = E.snapOut(clamp((f - drawAt - i * 2) / 26));
                return <div key={i} style={{ flex: 1, height: `${((100 * v) / top) * (drawAt < -1e8 ? 1 : g)}%`, borderRadius: 3 * u, background: i === W.series.length - 1 ? t.accent : mixColor(t.surface, t.text, 0.16) }} />;
              })}
            </div>
          </div>}
        </div>
      )}
    </div>
  );
  if (!fs) return screen;
  const lensX = m.x + pad - 18 * u;
  const lensW = tw + 36 * u;
  const yNow = mix(rowY(fs.prev), rowY(fs.row), E.glideOut(fs.k));
  return (
    <FocusLens
      theme={t}
      w={m.x + m.w}
      h={m.y + m.h}
      rect={{ x: lensX, y: yNow, w: lensW, h: lensH }}
      veil={veil}
      blur={blur}
      scale={u}
      lens={
        <>
          {fs.k < 1 && <LensLine t={t} W={W} row={fs.prev} px={fpx} u={u} w={lensW} h={lensH} k={fs.k} mode="out" />}
          <LensLine t={t} W={W} row={fs.row} px={fpx} u={u} w={lensW} h={lensH} k={fs.k} mode={fs.k < 1 ? 'in' : 'still'} />
        </>
      }
    >
      {screen}
    </FocusLens>
  );
};

const Board: React.FC<Inner> = ({ t, W, m, u, f, H, view, focus, veil, blur }) => {
  const { fps } = useFilm(); // the lens glides at the composition's rate (a variant cut at 30 fps)
  const pad = 24 * u;
  const n = Math.max(1, W.statuses.length);
  const gap = 16 * u;
  const colW = (m.w - 2 * pad - gap * (n - 1)) / n;
  const top = 92 * u;
  const cardH = 112 * u;
  const cardGap = 12 * u;
  const ink = t.text;
  const mute = t.mute;
  const order = W.statuses.length ? [3, 1, 2, 0].filter((s) => s < n) : [-1]; // quiet, waiting, alert, then the story's column last (no statuses: one column)
  const placed: { i: number; col: number; k: number }[] = [];
  const storyRow = typeof focus === 'number' ? focus : W.focus;
  order.forEach((s, col) => {
    const rows = W.records.map((_, i) => i).filter((i) => W.records[i].status === s);
    const at = rows.indexOf(storyRow);
    if (at > 1) rows.splice(1, 0, ...rows.splice(at, 1)); // the story's card rides second in its column, where the lens reads
    rows.forEach((i, k) => placed.push({ i, col, k }));
  });
  const pos = (i: number) => {
    const slot = placed.find((c) => c.i === i)!;
    return { x: m.x + pad + slot.col * (colW + gap), y: m.y + top + 40 * u + slot.k * (cardH + cardGap) };
  };
  const fs = focus === null ? null : focusState(f, focus, { fps });
  const fpx = focusPx(H, view);
  const screen = (
    <div style={{ position: 'absolute', left: m.x, top: m.y, width: m.w, height: m.h }}>
      <div style={{ position: 'absolute', left: pad, top: 18 * u, display: 'flex', alignItems: 'baseline', gap: 12 * u }}>
        {W.screen && <Micro px={24 * u} weight={650} color={ink} track={-0.02}>{W.screen}</Micro>}
        <Micro px={13 * u} color={mute}>{[W.noun[1] ? `${W.total.count} ${W.noun[1]}` : '', W.total.value ? `${W.total.value} ${W.total.unit}`.trim() : ''].filter(Boolean).join(' · ')}</Micro>
      </div>
      <div style={{ position: 'absolute', right: pad, top: 16 * u }}>
        {/* the team on this board */}
        <div style={{ display: 'flex' }}>
          {W.people.slice(0, 5).map((p, i) => (
            <div key={p.name} style={{ marginLeft: i ? -8 * u : 0, zIndex: 5 - i }}>
              <Avatar theme={t} i={i} initials={p.initials} seed={p.seed} src={p.photo} focus={p.focus} size={30 * u} ring={t.surface} kind="portrait" />
            </div>
          ))}
        </div>
      </div>
      {order.map((s, col) => {
        const st = W.statuses[s];
        return (
          <div key={st?.label ?? col} style={{ position: 'absolute', left: pad + col * (colW + gap), top, width: colW, height: m.h - top - pad, borderRadius: 14 * u, background: mixColor(t.surface, t.ground, 0.28) }}>
            {st && (
              <div style={{ position: 'absolute', left: 12 * u, top: 10 * u, display: 'flex', alignItems: 'center', gap: 8 * u }}>
                <StatusPill theme={t} label={st.label} tone={st.tone} px={12.5 * u} />
                <Micro px={12 * u} color={mute}>{String(st.count)}</Micro>
              </div>
            )}
          </div>
        );
      })}
      {W.records.map((r, i) => {
        const card = pos(i);
        const who = W.people[r.who];
        return (
          <div key={r.id || i} style={{ position: 'absolute', left: card.x - m.x + 8 * u, top: card.y - m.y, width: colW - 16 * u, height: cardH, borderRadius: 12 * u, background: keyFace(t, t.dark ? t.raised : t.surface, 0.05), boxShadow: surfaceShadow(t, 6, u) }}>
            <div style={{ position: 'absolute', left: 14 * u, top: 12 * u, right: 14 * u, display: 'flex', justifyContent: 'space-between' }}>
              {r.id && <Micro px={12 * u} color={mute} mono>{r.id}</Micro>}
              {r.date && <Micro px={11.5 * u} color={mute}>{r.date}</Micro>}
            </div>
            <div style={{ position: 'absolute', left: 14 * u, top: 34 * u, right: 14 * u, overflow: 'hidden' }}>
              <Micro px={14.5 * u} weight={600} color={ink}>{r.title}</Micro>
            </div>
            {r.sub && (
              <div style={{ position: 'absolute', left: 14 * u, top: 56 * u, right: 14 * u, overflow: 'hidden' }}>
                <Micro px={12 * u} color={mute}>{r.sub}</Micro>
              </div>
            )}
            <div style={{ position: 'absolute', left: 14 * u, bottom: 12 * u, right: 14 * u, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 * u }}>
                {who && <Avatar theme={t} i={r.who} initials={who.initials} seed={who.seed} src={who.photo} focus={who.focus} size={22 * u} />}
                {r.tag && <Micro px={11.5 * u} color={mute}>{r.tag}</Micro>}
              </span>
              <Micro px={13.5 * u} weight={600} color={ink}>{r.value}</Micro>
            </div>
          </div>
        );
      })}
    </div>
  );
  if (!fs) return screen;
  const lensW = Math.min(m.w - 16 * u, Math.max(colW * 1.75, fpx * 15));
  const lensH = Math.max(cardH * 0.8, fpx * 1.75);
  const lensAt = (i: number) => {
    const card = pos(i);
    return { x: clamp(card.x + colW / 2 - lensW / 2, m.x + 8 * u, m.x + m.w - lensW - 8 * u), y: card.y + cardH / 2 - lensH / 2 };
  };
  const from = lensAt(fs.prev);
  const to = lensAt(fs.row);
  const glide = E.glideOut(fs.k);
  return (
    <FocusLens
      theme={t}
      w={m.x + m.w}
      h={m.y + m.h}
      rect={{ x: mix(from.x, to.x, glide), y: mix(from.y, to.y, glide), w: lensW, h: lensH }}
      veil={veil}
      blur={blur}
      scale={u}
      lens={
        <>
          {fs.k < 1 && <LensLine t={t} W={W} row={fs.prev} px={fpx} u={u} w={lensW} h={lensH} k={fs.k} mode="out" />}
          <LensLine t={t} W={W} row={fs.row} px={fpx} u={u} w={lensW} h={lensH} k={fs.k} mode={fs.k < 1 ? 'in' : 'still'} />
        </>
      }
    >
      {screen}
    </FocusLens>
  );
};

/** Is a font size texture (under the readable floor) at kit scale `u`? Texture strings carry data-texture, not data-text. */
export const isTexturePx = (px: number, u = 1) => px < TEXT_MIN * u;
