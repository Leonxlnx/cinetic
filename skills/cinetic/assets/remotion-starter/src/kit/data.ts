// Worlds for dense product screens: a workspace (people, records, statuses, dates, amounts) that a DenseScreen, an
// AppWindow or a wall of tiles shows. The film builds its own from the product's real strings with filmWorld(): the
// rows, people and labels are the film's, and everything the screen derives adds up (the tab counts are the rows'
// counts, the totals are the rows' sums, the focus record is in the accent state); nothing is invented, so a part the
// film does not give (a chart, an activity feed, a nav, a figure) is simply not drawn. A part given no world draws its
// empty state (kit/gate.tsx). The kit's dealt sample worlds live behind sample().world() (kit/sample.ts), for the
// kit's own gallery and tests; sampleWorld() is retired and returns an empty world.
import { rand } from '../lib/anim';
import type { IconName } from './icons';
import { kitEmpty } from './gate';
import { day, FILM_DATE, WEEKDAYS } from './real';

/** The product types the kit's sample worlds deal; a film's own world is 'film'. */
export type SampleKind = 'billing' | 'deploys' | 'support' | 'orders' | 'pipeline' | 'hiring';
export type WorldKind = SampleKind | 'film';
/** How a status draws: the accent (the state the story is about), done, waiting, quiet (draft, queued), alert. */
export type StatusTone = 'accent' | 'done' | 'wait' | 'quiet' | 'alert';
/** A person of the world; `photo` is a real portrait (a staticFile() URL), shown wherever the person is large enough to read as a face. */
export type WorldPerson = { name: string; first: string; initials: string; role: string; seed: string; photo?: string; focus?: [number, number] };
export type WorldStatus = { label: string; tone: StatusTone; count: number };
export type WorldRecord = {
  /** the record's id as the product prints it: INV-0412, a3f9c21, #4821, #10482 */
  id: string;
  /** the main cell: a client, a service, a subject, a customer, a company, a candidate */
  title: string;
  /** the second line: what it is for, the commit message, the plan, the role */
  sub: string;
  /** the person who owns it (index into people; -1: nobody shown) */
  who: number;
  /** the number behind `value`: cents, seconds, minutes or a score */
  amount: number;
  value: string;
  date: string;
  /** index into statuses (-1: no status pill) */
  status: number;
  tag: string;
};
/** The screen's chrome strings: each is drawn only when the world gives it (a film's own words, never the kit's). */
export type WorldChrome = { url?: string; plan?: string; range?: string; action?: string; activity?: string; chart?: string; search?: string; team?: string; all?: string };
export type SampleWorld = {
  seed: string;
  kind: WorldKind;
  /** who wrote it: the film (filmWorld), the kit's gallery (sample().world) or nobody (an empty world) */
  origin?: 'film' | 'sample' | 'empty';
  workspace: string;
  screen: string;
  noun: [one: string, many: string];
  today: { y: number; m: number; d: number; weekday: string; label: string };
  people: WorldPerson[];
  /** the viewer (index into people) */
  me: number;
  columns: [id: string, title: string, value: string, date: string, status: string, who: string];
  statuses: WorldStatus[];
  records: WorldRecord[];
  total: { count: number; amount: number; value: string; done: number; doneAmount: number; doneValue: string; share: number; unit: string };
  nav: { label: string; glyph: IconName; count?: number }[];
  activity: { who: number; text: string; ago: string }[];
  /** the record the story is about (its status is the accent) */
  focus: number;
  /** points that sum to total.amount: the chart beside the table (empty: no chart) */
  series: number[];
  /** the figures over the table, [label, value] (empty: no figures) */
  kpis?: [label: string, value: string][];
  chrome?: WorldChrome;
  /** the world's own number format */
  fmt: (v: number) => string;
};
/** A world: the film's own (filmWorld) or the gallery's (sample().world). */
export type World = SampleWorld;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Points with a believable shape (a trend, a dip, noise) that sum exactly to `total`, dealt from `key` (pure). */
export const seriesFor = (total: number, key: string, n = 12): number[] => {
  const w = Array.from({ length: n }, (_, i) => 0.6 + (0.5 * i) / n + 0.35 * Math.sin(i * 0.9 + rand(`${key}:ph`) * 6) * 0.5 + 0.3 * rand(`${key}:${i}`));
  const s = w.reduce((a, b) => a + b, 0);
  const out = w.map((v) => Math.floor((v / s) * total));
  out[n - 1] += total - out.reduce((a, b) => a + b, 0); // the remainder lands on the last point: the sum is exact
  return out;
};

/** What a film says about its own product screen; every string is the film's, and anything left out is not drawn. */
export type WorldSpec = {
  workspace?: string;
  screen?: string;
  noun?: [one: string, many: string];
  people?: { name: string; initials?: string; role?: string; photo?: string; focus?: [number, number]; seed?: string }[];
  me?: number;
  columns?: SampleWorld['columns'];
  /** the statuses a record can be in; the first is the accent (the state the story is about) */
  statuses?: { label: string; tone: StatusTone }[];
  records: { id?: string; title: string; sub?: string; who?: number; amount?: number; value?: string; date?: string; status?: number; tag?: string }[];
  nav?: { label: string; glyph: IconName; count?: number }[];
  activity?: { who: number; text: string; ago: string }[];
  focus?: number;
  kpis?: [label: string, value: string][];
  series?: number[];
  fmt?: (v: number) => string;
  unit?: string;
  /** the day the screen is seen on (ISO; default the film's own day, kit/real.ts FILM_DATE) */
  today?: string;
  chrome?: WorldChrome;
  kind?: WorldKind;
};

const initialsOf = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return (w.length > 1 ? `${w[0][0]}${w[w.length - 1][0]}` : (w[0] ?? '').slice(0, 2)).toUpperCase();
};

/**
 * The film's own world for a dense screen, from the product's real strings: rows, people, statuses and labels as the
 * film gives them; the derived parts add up (status counts, totals, the done share, the focus record in the accent
 * state). Nothing is invented: no chart without `series`, no figures without `kpis`, no nav, activity or chrome
 * strings unless given. Pure.
 */
export const filmWorld = (spec: WorldSpec): SampleWorld => {
  const ws = spec.workspace ?? '';
  const people: WorldPerson[] = (spec.people ?? []).map((p) => ({
    name: p.name,
    first: p.name.trim().split(/\s+/)[0] ?? p.name,
    initials: p.initials ?? initialsOf(p.name),
    role: p.role ?? '',
    seed: p.seed ?? `${ws}:p:${p.name}`,
    ...(p.photo ? { photo: p.photo } : {}),
    ...(p.focus ? { focus: p.focus } : {}),
  }));
  const statuses: WorldStatus[] = (spec.statuses ?? []).map((s) => ({ ...s, count: 0 }));
  const records: WorldRecord[] = spec.records.map((r) => {
    const status = statuses.length ? Math.max(0, Math.min(statuses.length - 1, r.status ?? 0)) : -1;
    return { id: r.id ?? '', title: r.title, sub: r.sub ?? '', who: r.who !== undefined && r.who >= 0 && r.who < people.length ? r.who : -1, amount: r.amount ?? 0, value: r.value ?? '', date: r.date ?? '', status, tag: r.tag ?? '' };
  });
  for (const r of records) if (r.status >= 0) statuses[r.status].count++;
  const fmt = spec.fmt ?? ((v: number) => String(Math.round(v)));
  const hasAmounts = records.some((r) => r.amount !== 0);
  const amount = records.reduce((a, r) => a + r.amount, 0);
  const done = records.filter((r) => r.status === 0);
  const doneAmount = done.reduce((a, r) => a + r.amount, 0);
  const td = day(spec.today ?? FILM_DATE);
  const focus = spec.focus ?? Math.max(0, records.findIndex((r) => r.status === 0));
  return {
    seed: ws || 'film',
    kind: spec.kind ?? 'film',
    origin: records.length || people.length ? 'film' : 'empty',
    workspace: ws,
    screen: spec.screen ?? '',
    noun: spec.noun ?? ['', ''],
    today: { y: td.y, m: td.m, d: td.d, weekday: WEEKDAYS[td.wd], label: `${WEEKDAYS[td.wd]}, ${MONTHS[td.m - 1]} ${td.d}` },
    people,
    me: Math.max(0, Math.min(people.length - 1, spec.me ?? 0)),
    columns: spec.columns ?? ['', '', '', '', '', ''],
    statuses,
    records,
    total: { count: records.length, amount, value: hasAmounts || spec.fmt ? fmt(amount) : '', done: done.length, doneAmount, doneValue: hasAmounts || spec.fmt ? fmt(doneAmount) : '', share: records.length ? (hasAmounts ? doneAmount / Math.max(1, amount) : done.length / records.length) : 0, unit: spec.unit ?? '' },
    nav: spec.nav ?? [],
    activity: (spec.activity ?? []).filter((a) => a.who >= 0 && a.who < people.length),
    focus: Math.min(focus, Math.max(0, records.length - 1)),
    series: spec.series ?? [],
    kpis: spec.kpis ?? [],
    chrome: spec.chrome ?? {},
    fmt,
  };
};

/** A world with nothing in it: what a part shows as its empty state (no rows, no people, no strings). */
export const emptyWorld = (kind: WorldKind = 'film'): SampleWorld => ({ ...filmWorld({ records: [] }), kind, origin: 'empty' });

/** Has the world no content of the film's own (no rows and no people)? A part given one draws its empty state. */
export const isEmptyWorld = (w: SampleWorld | null | undefined): boolean => !w || (!w.records.length && !w.people.length);

/**
 * @deprecated Retired: the kit never deals a sample world into a film. Returns an empty world (every part fed by it draws
 * its empty state, and kitEmpty reports it: a warning in dev, an error under the ship gate). Build the film's world with
 * filmWorld({ records, people, statuses, ... }) from the product's own strings; the kit's gallery and tests use
 * sample().world(seed).
 */
export const sampleWorld = (_seed: string | number = '', o: { kind?: WorldKind; rows?: number; currency?: string; today?: string; photos?: (string | { src: string; focus?: [number, number] })[] } = {}): SampleWorld => {
  kitEmpty('sampleWorld', "the film's own world: filmWorld({ records, people, statuses })");
  return emptyWorld(o.kind);
};

/** Asserts a world adds up (tests and a film's data module call it): counts, sums, dates and the focus record. */
export const checkWorld = (w: SampleWorld): string[] => {
  const bad: string[] = [];
  const counts = w.statuses.map((_, i) => w.records.filter((r) => r.status === i).length);
  if (counts.some((c, i) => c !== w.statuses[i].count)) bad.push('status counts differ from the rows');
  if (w.records.length && w.statuses.length && w.records[w.focus]?.status !== 0) bad.push('the focus record is not in the accent state');
  if (w.series.length && w.series.reduce((a, b) => a + b, 0) !== (w.kind === 'hiring' ? w.total.amount * 12 : w.total.amount)) bad.push('the series does not sum to the total');
  if (w.kind !== 'hiring' && w.records.reduce((a, r) => a + r.amount, 0) !== w.total.amount) bad.push('the total is not the sum of the rows');
  if (new Set(w.records.map((r) => r.id).filter(Boolean)).size !== w.records.filter((r) => r.id).length) bad.push('ids repeat');
  if (new Set(w.people.map((p) => p.name)).size !== w.people.length) bad.push('names repeat');
  if (w.statuses.length && w.records.length >= w.statuses.length + 3 && w.statuses.some((s) => s.count === 0)) bad.push('a status has no rows (an empty tab or column)');
  return bad;
};
