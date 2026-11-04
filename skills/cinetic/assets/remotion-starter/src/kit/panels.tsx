// The kit's panels: whole product surfaces composed from the parts, with live states (a count that runs,
// a badge that switches, bars that grow, a chat that lands, a list that flicks) as pure functions of the
// frame. Each is laid out at film size in its own box (`w` x `h`, px at 1080p times the film's unit) and
// drawn on a lit Surface, from the film's own `data` (the shapes ReviewData and BudgetData in kit/sample.ts):
// without it a panel draws its empty state (kit/gate.tsx KitEmpty) and reports kit-empty, never sample content.
// Frame them as macro crops and hero planes, not as a centred dashboard: the camera does the reading. The
// exception is the film's one product moment (kit/moment.tsx): the panel in use, full frame on a flat field.
import React from 'react';
import { Bubbles, type Message } from '../fx/Bubbles';
import { countLinear } from '../fx/Roll';
import { type FlickProps, Scroll } from '../fx/Scroll';
import { E, fd, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { useFilm } from '../lib/film';
import {
  Avatar,
  AvatarStack,
  Badge,
  BarChart,
  Button,
  Check,
  face,
  Glyph,
  GlyphTile,
  KIT_TYPE,
  Meter,
  Pending,
  FileThumb,
  Photo,
  Ring,
  Sparkline,
  Surface,
  Text,
  Toast,
  useKitScale,
} from './parts';
import { KitEmpty } from './gate';
import { type BudgetData, budgetTotals, money, type Person, type ReviewData } from './sample';
import { type KitTheme, kitTheme } from './theme';

type Base = { frame: number; theme?: KitTheme; w?: number; h?: number; x?: number; y?: number; scale?: number; lift?: number; style?: React.CSSProperties };

// ------------------------------------------------------------------------------------------ review desk
/**
 * A project under review: its title and deadline, the status, the team, four selects with their
 * approvals, the count and the bar, the primary action. `doneAt`: the frame the last approvals land (the
 * badge, the count, the last tick and the button switch in that one frame: hard UI). `buttonQ` is the
 * press amount (fx/Cards press().q) so the click and the product's answer stay on one curve. `photos`: the selects as
 * real photographs (staticFile paths); without them each select shows as the file it is (FileThumb), never drawn.
 */
export const ProjectPanel: React.FC<Base & { data?: ReviewData; doneAt?: number; buttonQ?: number; hover?: boolean; photos?: (string | undefined)[] }> = ({
  frame: f,
  theme,
  w: w0,
  h: h0,
  x = 0,
  y = 0,
  scale,
  lift = 36,
  data,
  doneAt = Infinity,
  buttonQ = 0,
  hover,
  photos = [],
  style,
}) => {
  const t = theme ?? kitTheme();
  const u = useKitScale(scale);
  const w = w0 ?? 1160 * u;
  const h = h0 ?? 740 * u;
  if (!data) return <KitEmpty part="ProjectPanel" need="data (the product's own project, team and actions: ReviewData)" theme={t} w={w} h={h} x={x} y={y} r={56 * u} style={style} />;
  const done = fd(f) >= doneAt;
  const p = data.project;
  const approved = done ? p.shots : p.approved;
  const bar = done ? 1 : p.approved / p.shots;
  const fill = done ? prog(f, doneAt, doneAt + 30, E.snapOut) : 0;
  const thumb = (w - 2 * 60 * u - 3 * 22 * u) / 4;
  return (
    <Surface theme={t} w={w} h={h} x={x} y={y} r={56 * u} lift={lift} scale={u} style={style}>
      <div style={{ position: 'absolute', left: 60 * u, top: 60 * u }}>
        <GlyphTile theme={t} name="image" size={120 * u} solid />
      </div>
      <Text id="kit-project-title" x={214 * u} y={62 * u} px={KIT_TYPE.title * u} weight={600} color={t.text}>
        {p.title}
      </Text>
      <Text id="kit-project-meta" x={216 * u} y={142 * u} px={KIT_TYPE.label * u} color={t.mute}>
        {p.meta}
      </Text>
      <div style={{ position: 'absolute', right: 56 * u, top: 72 * u }}>
        <Badge theme={t} label={done ? p.status.done : p.status.open} on={done} px={KIT_TYPE.label * u} id="kit-project-status" />
      </div>
      {p.label && (
        <Text id="kit-project-selects" x={60 * u} y={252 * u} px={KIT_TYPE.label * u} weight={600} color={t.mute}>
          {p.label}
        </Text>
      )}
      <div style={{ position: 'absolute', right: 60 * u, top: 236 * u }}>
        <AvatarStack theme={t} people={data.team} size={64 * u} ring={t.surface} />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ position: 'absolute', left: 60 * u + i * (thumb + 22 * u), top: 324 * u, width: thumb, height: thumb, borderRadius: 30 * u, overflow: 'hidden' }}>
          {photos[i] ? <Photo theme={t} w={thumb} h={thumb} src={photos[i]} /> : <FileThumb theme={t} w={thumb} h={thumb} name={p.files?.[i]?.name} size={p.files?.[i]?.size} scale={u} />}
          <div style={{ position: 'absolute', right: 14 * u, top: 14 * u }}>
            {i < 3 || done ? <Check size={48 * u} fill={t.accent} tick={t.accentInk} /> : <Pending size={48 * u} stroke={t.mute} fill={t.well} />}
          </div>
        </div>
      ))}
      <Text id="kit-project-count" x={60 * u} y={h - 128 * u} px={44 * u} weight={500} color={done ? t.text : t.mute}>
        {data.actions.count(approved, p.shots)}
      </Text>
      <div style={{ position: 'absolute', left: 60 * u, top: h - 64 * u }}>
        <Meter theme={t} w={360 * u} h={12 * u} p={bar + (1 - bar) * fill} />
      </div>
      <div style={{ position: 'absolute', right: 56 * u, top: h - 152 * u }}>
        <Button theme={t} label={done ? data.actions.done : data.actions.approve} w={340 * u} h={100 * u} q={buttonQ} hover={hover} id="kit-project-action" />
      </div>
    </Surface>
  );
};

/**
 * The team's chat: a header, the log (fx/Bubbles: bubbles cut on and slide, the log lifts), the composer
 * typing the next outgoing line at 30 characters a second before it lands. `at`: the frame each line lands.
 */
export const ChatCard: React.FC<Base & { data?: ReviewData['chat']; people?: Person[]; at: number[] }> = ({ frame: f, theme, w: w0, h: h0, x = 0, y = 0, scale, lift = 44, data, people = [], at, style }) => {
  const t = theme ?? kitTheme();
  const u = useKitScale(scale);
  const { fps } = useFilm();
  const w = w0 ?? 640 * u;
  const h = h0 ?? 600 * u;
  if (!data) return <KitEmpty part="ChatCard" need="data (the product's own chat: title, draft, lines)" theme={t} w={w} h={h} x={x} y={y} r={48 * u} style={style} />;
  const messages: Message[] = data.lines.map((l, i) => ({ text: l.text, side: l.side, kind: l.kind, at: at[i] ?? (at[at.length - 1] ?? 0) + 40 * (i - at.length + 1) }));
  // the next outgoing line types in the composer (30 a second) and lands as its bubble
  const next = messages.findIndex((m) => m.side === 'out' && (m.at ?? 0) > f);
  const typing = next >= 0 ? messages[next] : null;
  const typed = typing ? Math.floor(((f - ((typing.at ?? 0) - (typing.text.length / 30) * fps - 0.25 * fps)) * 30) / fps) : -1;
  const draft = typing && typed > 0 ? typing.text.slice(0, Math.min(typing.text.length, typed)) : '';
  const head = 128 * u;
  const foot = 116 * u;
  return (
    <Surface theme={t} w={w} h={h} x={x} y={y} r={48 * u} lift={lift} scale={u} style={style}>
      <div style={{ position: 'absolute', left: 40 * u, top: 34 * u, display: 'flex', alignItems: 'center', gap: 20 * u }}>
        <GlyphTile theme={t} name="team" size={64 * u} solid />
        <span data-text="kit-chat-title" style={face(48 * u, 600, t.text)}>
          {data.title}
        </span>
      </div>
      {people.length > 0 && (
        <div style={{ position: 'absolute', right: 40 * u, top: 40 * u }}>
          <AvatarStack theme={t} people={people} size={54 * u} ring={t.surface} n={4} />
        </div>
      )}
      <div style={{ position: 'absolute', left: 40 * u, top: head - 2 * u, width: w - 80 * u, height: 2 * u, background: t.line }} />
      <div style={{ position: 'absolute', left: 0, top: head, width: w, height: h - head - foot, overflow: 'hidden' }}>
        <Bubbles frame={f} messages={messages} x={36 * u} y={h - head - foot - 14 * u} anchor="bottom" width={w - 72 * u} role="caption" maxBubble={1} outFill={t.accent} inFill={t.raised} ink={t.text} lift={{ share: 0.5 }} />
      </div>
      <div style={{ position: 'absolute', left: 30 * u, top: h - foot + 18 * u, width: w - 60 * u, height: 80 * u, borderRadius: 40 * u, background: t.well }}>
        <span data-text="kit-chat-draft" style={{ ...face(KIT_TYPE.label * u, 500, draft ? t.text : t.mute), position: 'absolute', left: 34 * u, top: 18 * u }}>
          {draft || data.draft}
        </span>
        <div style={{ position: 'absolute', right: 10 * u, top: 10 * u, width: 60 * u, height: 60 * u, borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Glyph name="send" size={30 * u} color={t.accentInk} weight={2.4} />
        </div>
      </div>
    </Surface>
  );
};

/**
 * The comment feed: rows of who, where and what, one highlighted (the comment the story is about). Give
 * `flick` (fx/Scroll FlickProps, distance in px) for a hand-thrown scroll that lands on the highlight;
 * its fast frames are the flick's declared camera-blur range (fx/Scroll declares()).
 */
export const FeedCard: React.FC<Base & { data?: ReviewData['feed']; people?: Person[]; highlight?: number; flick?: FlickProps; rowH?: number }> = ({
  frame: f,
  theme,
  w: w0,
  h: h0,
  x = 0,
  y = 0,
  scale,
  lift = 32,
  data,
  people = [],
  highlight = 8,
  flick,
  rowH,
  style,
}) => {
  const t = theme ?? kitTheme();
  const u = useKitScale(scale);
  const w = w0 ?? 980 * u;
  const h = h0 ?? 720 * u;
  if (!data) return <KitEmpty part="FeedCard" need="data (the product's own feed: title, count, rows)" theme={t} w={w} h={h} x={x} y={y} r={56 * u} style={style} />;
  const row = rowH ?? 172 * u;
  const top = 132 * u;
  const rows = (
    <div>
      {data.rows.map((r, k) => {
        const hi = k === highlight;
        const who = people.length ? people[r.who % people.length] : undefined;
        return (
          <div key={k} style={{ position: 'relative', height: row, margin: `0 ${26 * u}px`, borderRadius: 30 * u, background: hi ? mixColor(t.surface, t.accent, 0.16) : 'transparent', boxShadow: hi ? `inset 0 0 0 ${3 * u}px ${t.accent}` : undefined }}>
            {who && <Avatar theme={t} i={r.who} initials={who.initials} seed={who.seed} src={who.src} focus={who.focus} size={96 * u} x={26 * u} y={(row - 96 * u) / 2} />}
            <Text id={`kit-feed-who-${k}`} x={150 * u} y={row / 2 - 56 * u} px={KIT_TYPE.label * u} color={t.mute}>
              {[who?.name, r.ref].filter(Boolean).join(' · ')}
            </Text>
            <Text id={`kit-feed-text-${k}`} x={150 * u} y={row / 2 - 6 * u} px={54 * u} color={t.text}>
              {r.text}
            </Text>
            {hi && (
              <div style={{ position: 'absolute', right: 32 * u, top: (row - 64 * u) / 2 }}>
                <Check size={64 * u} fill={t.accent} tick={t.accentInk} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
  return (
    <Surface theme={t} w={w} h={h} x={x} y={y} r={56 * u} lift={lift} scale={u} style={style}>
      <Text id="kit-feed-title" x={52 * u} y={40 * u} px={60 * u} weight={600} color={t.text}>
        {data.title}
      </Text>
      <Text id="kit-feed-count" x={w - 252 * u} y={50 * u} width={200 * u} align="right" px={48 * u} color={t.mute}>
        {String(data.count)}
      </Text>
      {flick ? (
        <Scroll frame={f} {...flick} x={0} y={top} width={w} height={h - top} edge={40 * u}>
          {rows}
        </Scroll>
      ) : (
        <div style={{ position: 'absolute', left: 0, top, width: w, height: h - top, overflow: 'hidden' }}>{rows}</div>
      )}
    </Surface>
  );
};

/**
 * One number the product is proud of: a label, the figure (counting on linearly when `count` is given,
 * still counting when the cut takes it), what changed, and a trend line drawn as it arrives.
 */
export const StatCard: React.FC<
  Base & { label?: string; value?: number; of?: number; count?: { from: number; perSec: number; start: number }; sub?: (v: number) => string; trend?: number[]; drawAt?: number; live?: boolean; tone?: 'surface' | 'accent' }
> = ({ frame: f, theme, w: w0, h: h0, x = 0, y = 0, scale, lift = 32, label, value, of, count, sub, trend, drawAt = -1e9, live = true, tone = 'accent', style }) => {
  const t = theme ?? kitTheme();
  const u = useKitScale(scale);
  const film = useFilm();
  const w = w0 ?? 640 * u;
  const h = h0 ?? 560 * u;
  if (!label || (value === undefined && !count))
    return <KitEmpty part="StatCard" need={!label ? "label (what the figure counts, in the product's words)" : 'value or count (the product\'s own figure)'} theme={t} w={w} h={h} x={x} y={y} r={56 * u} style={style} />;
  const c = count ?? null;
  const v = c ? countLinear(f, c, film).shown : (value ?? 0);
  const onAccent = tone === 'accent';
  const ink = onAccent ? t.accentInk : t.text;
  const mute = onAccent ? mixColor(t.accentInk, t.accent, 0.35) : t.mute;
  const fig = Math.min(KIT_TYPE.figure * u, ((w - 104 * u) / Math.max(4, `${v.toLocaleString('en-US')}${of ? ` / ${of}` : ''}`.length)) * 1.75);
  return (
    <Surface theme={t} w={w} h={h} x={x} y={y} r={56 * u} lift={lift} scale={u} tone={onAccent ? 'accent' : 'surface'} style={style}>
      <div style={{ position: 'absolute', left: 52 * u, top: 46 * u, display: 'flex', alignItems: 'center', gap: 16 * u }}>
        {live && <div style={{ width: 20 * u, height: 20 * u, borderRadius: '50%', background: ink, opacity: 0.55 + 0.45 * Math.cos(f / (0.15 * film.fps)) ** 2 }} />}
        <span data-text="kit-stat-label" style={face(KIT_TYPE.body * u, 600, ink)}>
          {label}
        </span>
      </div>
      <Text id="kit-stat-value" x={48 * u} y={128 * u} px={fig} weight={600} color={ink} track={-0.045}>
        {`${v.toLocaleString('en-US')}${of ? ` / ${of}` : ''}`}
      </Text>
      {sub && (
        <Text id="kit-stat-sub" x={52 * u} y={128 * u + fig * 1.12} px={44 * u} color={mute}>
          {sub(v)}
        </Text>
      )}
      {trend && trend.length > 1 && (
        <div style={{ position: 'absolute', left: 52 * u, top: h - 190 * u }}>
          <Sparkline values={trend} w={w - 104 * u} h={150 * u} color={ink} weight={6 * u} draw={prog(f, drawAt, drawAt + 40, E.softOut)} />
        </div>
      )}
    </Surface>
  );
};

/** Approvals as one figure with the team under it (the review desk's board tile). */
export const ApprovalsCard: React.FC<Base & { data?: ReviewData }> = ({ frame: f, theme, w: w0, h: h0, x = 0, y = 0, scale, lift = 32, data, style }) => {
  const t = theme ?? kitTheme();
  const u = useKitScale(scale);
  const film = useFilm();
  const w = w0 ?? 640 * u;
  const h = h0 ?? 380 * u;
  if (!data) return <KitEmpty part="ApprovalsCard" need="data (the product's own figures and team: ReviewData)" theme={t} w={w} h={h} x={x} y={y} r={56 * u} style={style} />;
  const saves = countLinear(f, { from: data.stats.saves.from, perSec: data.stats.saves.perSec, start: 0 }, film).shown;
  return (
    <Surface theme={t} w={w} h={h} x={x} y={y} r={56 * u} lift={lift} scale={u} tone="raised" style={style}>
      <Text id="kit-approved-label" x={54 * u} y={46 * u} px={56 * u} weight={600} color={t.accent}>
        {data.stats.approved.label}
      </Text>
      <div style={{ position: 'absolute', left: 50 * u, top: 110 * u, display: 'flex', alignItems: 'baseline', gap: 18 * u }}>
        <span data-text="kit-approved-value" style={face(KIT_TYPE.hero * u * Math.min(1, h / (380 * u)), 600, t.text, -0.05, 0.9)}>
          {String(data.stats.approved.value)}
        </span>
        <span data-text="kit-approved-of" style={face(76 * u, 600, t.mute)}>
          {`/ ${data.stats.approved.of}`}
        </span>
      </div>
      <div style={{ position: 'absolute', left: 54 * u, bottom: 46 * u, display: 'flex', alignItems: 'center', gap: 26 * u }}>
        <AvatarStack theme={t} people={data.team} size={80 * u} ring={t.raised} />
        <span data-text="kit-approved-saves" style={face(46 * u, 500, t.mute)}>
          {`${saves.toLocaleString('en-US')} ${data.stats.saves.label}`}
        </span>
      </div>
    </Surface>
  );
};

// ------------------------------------------------------------------------------------------ budgets
/** The quarter at a glance: the total, what is spent, the share, the bar. `add` lands an amount at `addAt` and counts it on. */
export const BudgetCard: React.FC<Base & { data?: BudgetData; add?: number; addAt?: number }> = ({ frame: f, theme, w: w0, h: h0, x = 0, y = 0, scale, lift = 32, data, add = 0, addAt = Infinity, style }) => {
  const t = theme ?? kitTheme();
  const u = useKitScale(scale);
  const w = w0 ?? 900 * u;
  const h = h0 ?? 440 * u;
  if (!data) return <KitEmpty part="BudgetCard" need="data (the product's own budgets: BudgetData)" theme={t} w={w} h={h} x={x} y={y} r={44 * u} style={style} />;
  const tot = budgetTotals(data.categories);
  const spent = tot.spent + add * prog(f, addAt + 4, addAt + 28, E.linear);
  return (
    <Surface theme={t} w={w} h={h} x={x} y={y} r={44 * u} lift={lift} scale={u} style={style}>
      <Text id="kit-budget-label" x={52 * u} y={46 * u} px={KIT_TYPE.label * u} color={t.mute}>
        {`${data.team} · ${data.period}`}
      </Text>
      <Text id="kit-budget-total" x={46 * u} y={98 * u} px={150 * u} weight={600} color={t.text} track={-0.045}>
        {money(tot.budget)}
      </Text>
      <Text id="kit-budget-spent" x={52 * u} y={h - 150 * u} px={46 * u} color={t.text}>
        {`${money(spent)} spent`}
      </Text>
      <Text id="kit-budget-share" x={w - 252 * u} y={h - 150 * u} width={200 * u} align="right" px={46 * u} weight={600} color={t.accent}>
        {`${Math.round((100 * spent) / tot.budget)} %`}
      </Text>
      <div style={{ position: 'absolute', left: 52 * u, top: h - 78 * u }}>
        <Meter theme={t} w={w - 104 * u} h={20 * u} p={spent / tot.budget} />
      </div>
    </Surface>
  );
};

/** The teams' budgets as rows: glyph, name, spent of budget, the bar, who spends it. */
export const CategoryRows: React.FC<Base & { data?: BudgetData; highlight?: number; add?: number; addAt?: number; gap?: number }> = ({
  frame: f,
  theme,
  w: w0,
  x = 0,
  y = 0,
  scale,
  lift = 24,
  data,
  highlight = 1,
  add = 0,
  addAt = Infinity,
  gap,
  style,
}) => {
  const t = theme ?? kitTheme();
  const u = useKitScale(scale);
  const w = w0 ?? 980 * u;
  const rh = 150 * u;
  const g = gap ?? 26 * u;
  if (!data) return <KitEmpty part="CategoryRows" need="data (the product's own categories: BudgetData)" theme={t} w={w} h={3 * rh + 2 * g} x={x} y={y} r={34 * u} style={style} />;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x}px, ${y}px)`, ...style }}>
      {data.categories.map((c, i) => {
        const s = c.spent + (i === highlight ? add * prog(f, addAt + 4, addAt + 28, E.linear) : 0);
        return (
          <Surface key={c.name} theme={t} w={w} h={rh} y={i * (rh + g)} r={34 * u} lift={lift} scale={u} tone={i === highlight ? 'raised' : 'surface'}>
            <div style={{ position: 'absolute', left: 32 * u, top: (rh - 84 * u) / 2 }}>
              <GlyphTile theme={t} name={c.glyph} size={84 * u} solid={i === highlight} />
            </div>
            <Text id={`kit-cat-name-${i}`} x={142 * u} y={22 * u} px={52 * u} weight={600} color={t.text}>
              {c.name}
            </Text>
            <Text id={`kit-cat-of-${i}`} x={142 * u} y={86 * u} px={KIT_TYPE.label * u} color={t.mute}>
              {`${money(s)} of ${money(c.budget)}`}
            </Text>
            <div style={{ position: 'absolute', left: w * 0.5, top: rh / 2 - 8 * u }}>
              <Meter theme={t} w={w * 0.26} h={16 * u} p={s / c.budget} fill={i === highlight ? t.accent : t.accentSoft} />
            </div>
            <div style={{ position: 'absolute', right: 30 * u, top: (rh - 60 * u) / 2 }}>
              <AvatarStack theme={t} people={data.people.slice(i, i + 3)} size={60 * u} ring={i === highlight ? t.raised : t.surface} />
            </div>
          </Surface>
        );
      })}
    </div>
  );
};

/** One team's weekly spend: the bars grow in turn from `growAt`; the week that matters in the accent. */
export const ChartCard: React.FC<Base & { data?: BudgetData; growAt?: number; highlight?: number; title?: string }> = ({ frame: f, theme, w: w0, h: h0, x = 0, y = 0, scale, lift = 32, data, growAt = -1e9, highlight = 4, title, style }) => {
  const t = theme ?? kitTheme();
  const u = useKitScale(scale);
  const w = w0 ?? 820 * u;
  const h = h0 ?? 620 * u;
  if (!data || !data.weeks.length) return <KitEmpty part="ChartCard" need="data.weeks (the product's own figures: BudgetData)" theme={t} w={w} h={h} x={x} y={y} r={44 * u} style={style} />;
  const head = title ?? data.chartTitle;
  return (
    <Surface theme={t} w={w} h={h} x={x} y={y} r={44 * u} lift={lift} scale={u} style={style}>
      {head && (
        <Text id="kit-chart-title" x={48 * u} y={42 * u} px={KIT_TYPE.body * u} weight={600} color={t.text}>
          {head}
        </Text>
      )}
      <Text id="kit-chart-total" x={w - 348 * u} y={46 * u} width={300 * u} align="right" px={KIT_TYPE.label * u} color={t.mute}>
        {money(data.weeks.reduce((a, b) => a + b, 0))}
      </Text>
      <div style={{ position: 'absolute', left: 48 * u, top: 140 * u }}>
        <BarChart theme={t} frame={f} values={data.weeks} labels={data.weeks.map((_, i) => `W${i + 1}`)} w={w - 96 * u} h={h - 180 * u} start={growAt} highlight={highlight} px={KIT_TYPE.label * u} id="kit-chart" />
      </div>
    </Surface>
  );
};

/** One team on track: a ring that fills as it arrives, the share, the sentence the product would say. */
export const RingCard: React.FC<Base & { data?: BudgetData; category?: number; drawAt?: number }> = ({ frame: f, theme, w: w0, h: h0, x = 0, y = 0, scale, lift = 32, data, category = 0, drawAt = -1e9, style }) => {
  const t = theme ?? kitTheme();
  const u = useKitScale(scale);
  const w = w0 ?? 560 * u;
  const h = h0 ?? 620 * u;
  const c = data?.categories[category];
  if (!data || !c) return <KitEmpty part="RingCard" need="data.categories (the product's own figures: BudgetData)" theme={t} w={w} h={h} x={x} y={y} r={56 * u} style={style} />;
  const p = c.spent / c.budget;
  const d = prog(f, drawAt, drawAt + 40, E.glideOut);
  const ring = Math.min(w - 120 * u, h * 0.5);
  return (
    <Surface theme={t} w={w} h={h} x={x} y={y} r={56 * u} lift={lift} scale={u} style={style}>
      <div style={{ position: 'absolute', left: (w - ring) / 2, top: 56 * u }}>
        <Ring theme={t} size={ring} p={p} draw={d} />
        <div style={{ position: 'absolute', left: 0, top: ring / 2 - 48 * u, width: ring, textAlign: 'center' }}>
          <span data-text="kit-ring-share" style={face(84 * u, 600, t.text, -0.03)}>{`${Math.round(100 * p * d)} %`}</span>
        </div>
      </div>
      <Text id="kit-ring-line" x={48 * u} y={h - 170 * u} width={w - 96 * u} align="center" px={52 * u} weight={600} color={t.text}>
        {data.onTrack ? data.onTrack(c.name) : c.name}
      </Text>
      <Text id="kit-ring-of" x={48 * u} y={h - 98 * u} width={w - 96 * u} align="center" px={KIT_TYPE.label * u} color={t.mute}>
        {`${money(c.spent)} of ${money(c.budget)}`}
      </Text>
    </Surface>
  );
};

/** The money landing: a toast with the amount, the team and when (lands with the film's one spring, drawn by the caller). */
export const AmountToast: React.FC<{ theme?: KitTheme; data?: BudgetData; w?: number; h?: number; scale?: number }> = ({ theme, data, w, h, scale }) => {
  const t = theme ?? kitTheme();
  const u = useKitScale(scale);
  if (!data) return <KitEmpty part="AmountToast" need="data.toast (the product's own amount: BudgetData)" theme={t} w={w ?? 520 * u} h={h ?? 124 * u} inline />;
  return <Toast theme={t} title={`+ ${money(data.toast.amount)}`} sub={`${data.toast.category} · ${data.toast.when}`} w={w ?? 520 * u} h={h ?? 124 * u} glyph="plus" id="kit-amount" />;
};

/** The report's cover: the period's figure over its bars, as it would open full-bleed. */
export const ReportCover: React.FC<Base & { data?: BudgetData; growAt?: number }> = ({ frame: f, theme, w: w0, h: h0, x = 0, y = 0, scale, lift = 40, data, growAt = -1e9, style }) => {
  const t = theme ?? kitTheme();
  const u = useKitScale(scale);
  const w = w0 ?? 1240 * u;
  const h = h0 ?? 560 * u;
  if (!data) return <KitEmpty part="ReportCover" need="data (the product's own report: BudgetData)" theme={t} w={w} h={h} x={x} y={y} r={60 * u} style={style} />;
  const tot = budgetTotals(data.categories);
  const spent = tot.spent + data.toast.amount;
  const bars = data.weeks;
  return (
    <Surface theme={t} w={w} h={h} x={x} y={y} r={60 * u} lift={lift} scale={u} tone="raised" style={style}>
      <Text id="kit-report-meta" x={0} y={56 * u} width={w} align="center" px={KIT_TYPE.label * u} color={t.mute}>
        {`${data.report.title} · ${data.team}`}
      </Text>
      <Text id="kit-report-figure" x={0} y={110 * u} width={w} align="center" px={170 * u} weight={600} color={t.text} track={-0.045}>
        {money(spent)}
      </Text>
      <Text id="kit-report-share" x={0} y={300 * u} width={w} align="center" px={KIT_TYPE.label * u} color={t.mute}>
        {`spent of ${money(tot.budget)} · ${Math.round((100 * spent) / tot.budget)} %`}
      </Text>
      <div style={{ position: 'absolute', left: w * 0.18, top: h - 170 * u }}>
        <BarChart theme={t} frame={f} values={bars} w={w * 0.64} h={130 * u} start={growAt} stagger={2} dur={30} highlight={4} />
      </div>
    </Surface>
  );
};

// ------------------------------------------------------------------------------------------ fallback
/**
 * A card that was given no UI and no picture (fx/Cards without children or image): its empty state, never the kit's
 * sample products. It reports kit-empty (a warning in dev, an error under the ship gate); give the card the product's
 * own UI (a kit panel with the film's data, a DenseScreen with filmWorld) or a real picture.
 */
export const KitFallback: React.FC<{ frame: number; w: number; h: number; seed?: number; theme?: KitTheme }> = ({ w, h, theme }) => (
  <KitEmpty part="KitFallback" need="the card's own UI (children) or a real picture (image)" theme={theme} w={w} h={h} r={Math.min(w, h) * 0.04} />
);
