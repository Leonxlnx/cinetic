// Sample worlds for dense product screens: a believable workspace (people, records, statuses, dates, amounts) dealt
// from a seed, so two films never show the same data. Everything adds up: the statuses agree with the dates (a bill
// past its due date and unpaid is overdue), the tab counts are the rows' counts, the totals are the rows' sums, the
// chart's points sum to the total, the activity names real rows. Pure: the same seed gives the same world on every
// frame and every machine. It is the floor for a screen the brand has not supplied yet: seed it with the film's own
// name (`sampleWorld('<film>')`), then replace it with the product's real strings before the film ships.
import { rand } from '../lib/anim';
import type { IconName } from './icons';

export type WorldKind = 'billing' | 'deploys' | 'support' | 'orders' | 'pipeline' | 'hiring';
/** How a status draws: the accent (the state the story is about), done, waiting, quiet (draft, queued), alert. */
export type StatusTone = 'accent' | 'done' | 'wait' | 'quiet' | 'alert';
export type WorldPerson = { name: string; first: string; initials: string; role: string; seed: string };
export type WorldStatus = { label: string; tone: StatusTone; count: number };
export type WorldRecord = {
  /** the record's id as the product prints it: INV-0412, a3f9c21, #4821, #10482 */
  id: string;
  /** the main cell: a client, a service, a subject, a customer, a company, a candidate */
  title: string;
  /** the second line: what it is for, the commit message, the plan, the role */
  sub: string;
  /** the person who owns it (index into people) */
  who: number;
  /** the number behind `value`: cents, seconds, minutes or a score */
  amount: number;
  value: string;
  date: string;
  status: number;
  tag: string;
};
export type SampleWorld = {
  seed: string;
  kind: WorldKind;
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
  /** twelve points that sum to total.amount: the chart beside the table */
  series: number[];
  /** the world's own number format */
  fmt: (v: number) => string;
};

const FIRST = ['Mara', 'Jun', 'Ada', 'Sol', 'Teo', 'Ines', 'Kofi', 'Priya', 'Lena', 'Omar', 'Yuki', 'Nils', 'Amara', 'Rafael', 'Hana', 'Tomas', 'Zara', 'Ivo', 'Leila', 'Mateo', 'Noor', 'Felix', 'Aiko', 'Diego', 'Elif', 'Sami', 'Bea', 'Kai', 'Lucia', 'Arjun', 'Mina', 'Oskar', 'Rosa', 'Femi', 'Ana', 'Theo', 'Iris', 'Malik', 'Sara', 'Emil', 'Chloé', 'Jonas', 'Wen', 'Dara', 'Luca', 'Nadia', 'Olu', 'Pia', 'Ravi', 'Sofia', 'Tariq', 'Uma', 'Vera', 'Wim', 'Yara', 'Zoë', 'Aron', 'Beatriz', 'Cyrus', 'Dalia'];
const LAST = ['Okafor', 'Lindqvist', 'Moreau', 'Tanaka', 'Haddad', 'Novak', 'Brennan', 'Castillo', 'Varga', 'Osei', 'Petrov', 'Nakamura', 'Ferreira', 'Kowalski', 'Mensah', 'Larsen', 'Quinn', 'Reyes', 'Sato', 'Abara', 'Holm', 'Ibarra', 'Jansen', 'Kaur', 'Laine', 'Mwangi', 'Nieminen', 'Ortega', 'Park', 'Rossi', 'Silva', 'Touré', 'Ueda', 'Vidal', 'Weber', 'Yilmaz', 'Zhou', 'Adeyemi', 'Bauer', 'Costa', 'Duarte', 'Eriksen', 'Farah', 'Gallo', 'Hayes', 'Iwu', 'Juárez', 'Keller', 'Lund', 'Marsh', 'Nair', 'Pires', 'Ruiz', 'Sørensen', 'Tran', 'Uddin', 'Volkov', 'Wren', 'Achterberg', 'Bello'];
const ROLES = ['Design lead', 'Engineer', 'Ops', 'Finance', 'Support lead', 'Product', 'Account manager', 'Data', 'Founder', 'Recruiter', 'Platform', 'Marketing'];
const PRE = ['Alder', 'Birch', 'Cobalt', 'Delta', 'Fable', 'Granite', 'Harbor', 'Juniper', 'Kestrel', 'Lumen', 'Marlow', 'Nimbus', 'Orchard', 'Pine', 'Quarry', 'Rowan', 'Slate', 'Tidal', 'Vale', 'Willow', 'Yarrow', 'Zephyr', 'Beacon', 'Cedar', 'Drift', 'Fern', 'Glade', 'Heron', 'Isla', 'Larch', 'Moss', 'North Pier', 'Otter', 'Pebble', 'Reed', 'Signal', 'Thistle', 'Upland', 'Wharf', 'Arbor'];
const SUF = ['Studio', 'Dental', 'Labs', 'Legal', '& Co', 'Supply', 'Health', 'Works', 'Partners', 'Foods', 'Logistics', 'Design', 'Bakery', 'Clinic', 'Architects', 'Analytics', 'Freight', 'Print', 'Coffee', 'Books'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const KINDS: WorldKind[] = ['billing', 'deploys', 'support', 'orders', 'pipeline', 'hiring'];

/** A seeded shuffle (Fisher-Yates on rand). */
const shuffle = <T,>(arr: readonly T[], key: string): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(`${key}:${i}`) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = <T,>(arr: readonly T[], key: string): T => arr[Math.floor(rand(key) * arr.length) % arr.length];
const int = (lo: number, hi: number, key: string) => lo + Math.floor(rand(key) * (hi - lo + 1));

/** A calendar date shifted by `days` (UTC, so it is the same everywhere). */
const shift = (y: number, m: number, d: number, days: number) => {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() };
};
const dayLabel = (m: number, d: number) => `${MONTHS[m - 1]} ${d}`;
const clock = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const ago = (min: number) => (min < 1 ? 'now' : min < 60 ? `${min} min ago` : min < 1440 ? `${Math.floor(min / 60)} h ago` : `${Math.floor(min / 1440)} d ago`);
const dur = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
const money = (cur: string) => (cents: number) => `${cur}${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const moneyRound = (cur: string) => (cents: number) => `${cur}${Math.round(cents / 100).toLocaleString('en-US')}`;
const hex = (key: string) => Array.from({ length: 7 }, (_, i) => '0123456789abcdef'[Math.floor(rand(`${key}:${i}`) * 16)]).join('');

/** Twelve points with a believable shape (a trend, a dip, noise) that sum exactly to `total`. */
export const seriesFor = (total: number, key: string, n = 12): number[] => {
  const w = Array.from({ length: n }, (_, i) => 0.6 + (0.5 * i) / n + 0.35 * Math.sin(i * 0.9 + rand(`${key}:ph`) * 6) * 0.5 + 0.3 * rand(`${key}:${i}`));
  const s = w.reduce((a, b) => a + b, 0);
  const out = w.map((v) => Math.floor((v / s) * total));
  out[n - 1] += total - out.reduce((a, b) => a + b, 0); // the remainder lands on the last point: the sum is exact
  return out;
};

type KindSpec = {
  screen: string;
  noun: [string, string];
  columns: SampleWorld['columns'];
  statuses: { label: string; tone: StatusTone }[];
  nav: { label: string; glyph: IconName }[];
  unit: string;
};
const SPEC: Record<WorldKind, KindSpec> = {
  billing: {
    screen: 'Invoices', noun: ['invoice', 'invoices'], columns: ['Invoice', 'Client', 'Amount', 'Due', 'Status', 'Owner'],
    statuses: [{ label: 'Paid', tone: 'accent' }, { label: 'Due', tone: 'wait' }, { label: 'Overdue', tone: 'alert' }, { label: 'Draft', tone: 'quiet' }],
    nav: [{ label: 'Overview', glyph: 'grid' }, { label: 'Invoices', glyph: 'doc' }, { label: 'Clients', glyph: 'team' }, { label: 'Payments', glyph: 'chart' }, { label: 'Reports', glyph: 'folder' }, { label: 'Settings', glyph: 'gear' }],
    unit: 'billed',
  },
  deploys: {
    screen: 'Deployments', noun: ['deploy', 'deploys'], columns: ['Commit', 'Service', 'Duration', 'Started', 'Status', 'Author'],
    statuses: [{ label: 'Live', tone: 'accent' }, { label: 'Building', tone: 'wait' }, { label: 'Failed', tone: 'alert' }, { label: 'Queued', tone: 'quiet' }],
    nav: [{ label: 'Overview', glyph: 'grid' }, { label: 'Deployments', glyph: 'cloud' }, { label: 'Services', glyph: 'cpu' }, { label: 'Logs', glyph: 'terminal' }, { label: 'Domains', glyph: 'globe' }, { label: 'Settings', glyph: 'gear' }],
    unit: 'build time',
  },
  support: {
    screen: 'Tickets', noun: ['ticket', 'tickets'], columns: ['Ticket', 'Subject', 'Waiting', 'Opened', 'Status', 'Assignee'],
    statuses: [{ label: 'Solved', tone: 'accent' }, { label: 'Open', tone: 'wait' }, { label: 'Urgent', tone: 'alert' }, { label: 'Pending', tone: 'quiet' }],
    nav: [{ label: 'Inbox', glyph: 'mail' }, { label: 'Tickets', glyph: 'chat' }, { label: 'Customers', glyph: 'team' }, { label: 'Help center', glyph: 'doc' }, { label: 'Reports', glyph: 'chart' }, { label: 'Settings', glyph: 'gear' }],
    unit: 'waiting',
  },
  orders: {
    screen: 'Orders', noun: ['order', 'orders'], columns: ['Order', 'Customer', 'Total', 'Placed', 'Status', 'Packed by'],
    statuses: [{ label: 'Shipped', tone: 'accent' }, { label: 'Packing', tone: 'wait' }, { label: 'Refunded', tone: 'alert' }, { label: 'Paid', tone: 'quiet' }],
    nav: [{ label: 'Home', glyph: 'grid' }, { label: 'Orders', glyph: 'cart' }, { label: 'Products', glyph: 'image' }, { label: 'Customers', glyph: 'team' }, { label: 'Analytics', glyph: 'chart' }, { label: 'Settings', glyph: 'gear' }],
    unit: 'sales',
  },
  pipeline: {
    screen: 'Pipeline', noun: ['deal', 'deals'], columns: ['Deal', 'Company', 'Value', 'Close', 'Stage', 'Owner'],
    statuses: [{ label: 'Won', tone: 'accent' }, { label: 'Proposal', tone: 'wait' }, { label: 'At risk', tone: 'alert' }, { label: 'Demo', tone: 'quiet' }],
    nav: [{ label: 'Home', glyph: 'grid' }, { label: 'Pipeline', glyph: 'chart' }, { label: 'Companies', glyph: 'folder' }, { label: 'Contacts', glyph: 'user' }, { label: 'Calendar', glyph: 'calendar' }, { label: 'Settings', glyph: 'gear' }],
    unit: 'in pipeline',
  },
  hiring: {
    screen: 'Candidates', noun: ['candidate', 'candidates'], columns: ['ID', 'Candidate', 'Score', 'Applied', 'Stage', 'Interviewer'],
    statuses: [{ label: 'Offer', tone: 'accent' }, { label: 'Onsite', tone: 'wait' }, { label: 'Declined', tone: 'alert' }, { label: 'Screen', tone: 'quiet' }],
    nav: [{ label: 'Dashboard', glyph: 'grid' }, { label: 'Candidates', glyph: 'user' }, { label: 'Jobs', glyph: 'folder' }, { label: 'Interviews', glyph: 'calendar' }, { label: 'Offers', glyph: 'mail' }, { label: 'Settings', glyph: 'gear' }],
    unit: 'avg score',
  },
};

const BILL_FOR = ['Brand refresh', 'Retainer', 'Site audit', 'Packaging run', 'Q4 campaign', 'Menu redesign', 'Annual license', 'Photo day', 'Signage', 'Support hours', 'Onboarding', 'Print run', 'Product shoot', 'Strategy sprint'];
const SERVICES = ['api-gateway', 'billing-worker', 'web-app', 'search-indexer', 'auth', 'notifications', 'media-resizer', 'ledger', 'webhooks', 'scheduler', 'edge-cache', 'reports', 'checkout', 'sync'];
const COMMITS = ['Fix retry on 429', 'Bump node to 22.11', 'Add webhook signing', 'Cache invoice PDFs', 'Drop legacy v1 routes', 'Batch email sends', 'Index by updated_at', 'Stream large exports', 'Rotate signing keys', 'Lazy-load the editor', 'Split the worker pool', 'Tighten CSP headers', 'Paginate audit log', 'Warm the edge cache'];
const BRANCHES = ['main', 'main', 'main', 'release/2.14', 'fix/rate-limit', 'feat/exports'];
const SUBJECTS = ['Card declined at checkout', 'Export stuck at 90 %', 'Two-factor code not arriving', 'Invite link expired', 'Wrong VAT on invoice', 'Cannot reorder rows', 'Sync paused overnight', 'Refund for duplicate charge', 'SSO setup for 40 seats', 'Dark mode on Android', 'CSV import drops dates', 'Change billing email', 'Webhook returns 500', 'Seats after downgrade'];
const PLANS = ['Express', 'Standard', 'Pickup', 'Gift wrap'];
const ROLES_OPEN = ['Senior iOS engineer', 'Product designer', 'Data analyst', 'Support lead', 'Platform engineer', 'Account executive', 'Brand designer', 'QA engineer'];

/**
 * A believable workspace for a dense screen, dealt from `seed` (use the film's name). `kind` picks the product type
 * (billing, deploys, support, orders, pipeline, hiring; default: dealt by the seed), `rows` the visible records
 * (default 14), `currency` the money sign. Pure; the statuses, counts, totals and chart all agree.
 */
export const sampleWorld = (seed: string | number = 'cinetic', o: { kind?: WorldKind; rows?: number; currency?: string } = {}): SampleWorld => {
  const S = String(seed);
  const kind = o.kind ?? pick(KINDS, `${S}:kind`);
  const spec = SPEC[kind];
  const n = Math.max(4, Math.min(40, o.rows ?? 14));
  const cur = o.currency ?? pick(['$', '$', '€', '£'], `${S}:cur`);
  // today: a weekday in 2026, so dates and weekdays agree
  const t0 = shift(2026, int(1, 12, `${S}:m`), int(1, 28, `${S}:d`), 0);
  const today = { y: t0.y, m: t0.m, d: t0.d, weekday: DAYS[t0.wd], label: `${DAYS[t0.wd]}, ${dayLabel(t0.m, t0.d)}` };
  // people: unique first names and surnames
  const firsts = shuffle(FIRST, `${S}:first`);
  const lasts = shuffle(LAST, `${S}:last`);
  const roles = shuffle(ROLES, `${S}:roles`);
  const people: WorldPerson[] = Array.from({ length: 9 }, (_, i) => {
    const first = firsts[i];
    const last = lasts[i];
    return { first, name: `${first} ${last}`, initials: `${first[0]}${last[0]}`.toUpperCase(), role: roles[i % roles.length], seed: `${S}:p:${first}${last}` };
  });
  const companies = shuffle(PRE, `${S}:pre`).map((p, i) => `${p} ${shuffle(SUF, `${S}:suf`)[i % SUF.length]}`);
  const workspace = companies[companies.length - 1];
  const statuses: WorldStatus[] = spec.statuses.map((s) => ({ ...s, count: 0 }));
  const fmtMoney = money(cur);
  const fmtRound = moneyRound(cur);
  const base = int(180, 920, `${S}:base`);
  const now = int(9 * 60, 17 * 60, `${S}:now`); // minutes after midnight, "now"
  // the story's record (status 0, never on the top rows) and one record of every other status, so each tab and column has rows
  const free = shuffle(Array.from({ length: n }, (_, i) => i).filter((i) => i >= 3), `${S}:force`);
  const upper = free.filter((i) => i <= Math.max(3, Math.min(8, n - 2))); // the story sits in the upper middle of the list, where a lens reads well
  const focus = upper[0] ?? free[0] ?? n - 1;
  free.splice(free.indexOf(focus), 1);
  free.unshift(focus);
  const force = new Map<number, number>();
  force.set(focus, 0);
  statuses.forEach((_, st) => { if (st > 0 && free[st] !== undefined && !(kind === 'deploys' && st !== 2)) force.set(free[st], st); }); // a deploy queues and builds by its place in the list
  const records: WorldRecord[] = [];
  for (let i = 0; i < n; i++) {
    const k = `${S}:r${i}`;
    const who = int(0, people.length - 1, `${k}:who`);
    const want = force.get(i);
    let rec: WorldRecord;
    if (kind === 'billing') {
      const cents = int(24, 980, `${k}:a`) * 500 + (rand(`${k}:c`) < 0.3 ? 2500 : 0);
      const off = want === 1 ? int(1, 30, `${k}:due`) : want === 2 ? -int(1, 24, `${k}:due`) : int(-24, 30, `${k}:due`);
      const due = shift(t0.y, t0.m, t0.d, off);
      const draft = want === 3 || (want === undefined && rand(`${k}:draft`) < 0.12);
      const paid = want === 0 || (want === undefined && !draft && rand(`${k}:paid`) < (off < 0 ? 0.62 : 0.3));
      const st = draft ? 3 : paid ? 0 : off < 0 ? 2 : 1; // unpaid and past due is overdue; a draft has no due date yet
      rec = { id: `INV-${String(base + n - i).padStart(4, '0')}`, title: companies[i % (companies.length - 1)], sub: `${pick(BILL_FOR, `${k}:for`)} · ${pick(['Net 30', 'Net 15', 'Card', 'Bank transfer'], `${k}:terms`)}`, who, amount: cents, value: fmtMoney(cents), date: draft ? '—' : dayLabel(due.m, due.d), status: st, tag: pick(['Net 30', 'Net 15', 'Card'], `${k}:tag`) };
    } else if (kind === 'deploys') {
      const started = now - i * int(6, 38, `${k}:gap`) - 3;
      const r = rand(`${k}:s`);
      const st = i === 0 || (i === 1 && r < 0.5) ? 3 : i <= 2 ? 1 : want ?? (r < 0.18 ? 2 : 0); // the newest wait in the queue, the next is building, the rest went live or failed
      const secs = st === 1 ? (now - started) * 60 : st === 3 ? 0 : int(38, 412, `${k}:d`); // a running build shows the time since it started; a queued one has none yet
      rec = { id: hex(k), title: SERVICES[(i + int(0, 13, `${S}:svc`)) % SERVICES.length], sub: pick(COMMITS, `${k}:msg`), who, amount: secs, value: st === 3 ? 'queued' : dur(secs), date: clock(Math.max(0, started)), status: st, tag: pick(BRANCHES, `${k}:br`) };
    } else if (kind === 'support') {
      const waited = int(2, 960, `${k}:w`);
      const r = rand(`${k}:s`);
      const st = want ?? (r < 0.32 ? 0 : r < 0.62 ? 1 : r < 0.74 ? 2 : 3);
      const mins = st === 0 ? 0 : waited;
      rec = { id: `#${base * 10 + n - i}`, title: SUBJECTS[(i + int(0, 13, `${S}:sub`)) % SUBJECTS.length], sub: companies[i % (companies.length - 1)], who, amount: mins, value: st === 0 ? 'solved' : ago(waited).replace(' ago', ''), date: clock(Math.max(0, now - waited)), status: st, tag: pick(['P1', 'P2', 'P2', 'P3'], `${k}:p`) };
    } else if (kind === 'orders') {
      const items = int(1, 6, `${k}:items`);
      const cents = items * int(9, 140, `${k}:a`) * 100 + int(0, 99, `${k}:c`);
      const r = rand(`${k}:s`);
      const st = want ?? (r < 0.4 ? 0 : r < 0.68 ? 1 : r < 0.76 ? 2 : 3);
      const placed = now - i * int(4, 30, `${k}:gap`);
      rec = { id: `#${base * 20 + n - i}`, title: `${people[(i + 3) % people.length].first} ${LAST[(i * 7 + int(0, 50, `${S}:cust`)) % LAST.length]}`, sub: `${items} item${items > 1 ? 's' : ''} · ${pick(PLANS, `${k}:plan`)}`, who, amount: cents, value: fmtMoney(cents), date: clock(Math.max(0, placed)), status: st, tag: pick(PLANS, `${k}:tag`) };
    } else if (kind === 'pipeline') {
      const cents = int(6, 96, `${k}:a`) * 100000;
      const off = want === 0 ? -int(1, 6, `${k}:close`) : want === 1 || want === 3 ? int(0, 60, `${k}:close`) : int(-6, 60, `${k}:close`);
      const close = shift(t0.y, t0.m, t0.d, off);
      const r = rand(`${k}:s`);
      const st = want ?? (off < 0 ? (r < 0.7 ? 0 : 2) : r < 0.25 ? 2 : r < 0.6 ? 1 : 3); // closed in the past: won or at risk; open: a stage
      rec = { id: `D-${base + n - i}`, title: companies[i % (companies.length - 1)], sub: `${pick(['Annual', 'Pilot', 'Expansion', 'Renewal'], `${k}:t`)} · ${int(10, 400, `${k}:seats`)} seats`, who, amount: cents, value: fmtRound(cents), date: dayLabel(close.m, close.d), status: st, tag: pick(['Annual', 'Pilot', 'Renewal'], `${k}:tag`) };
    } else {
      const score = want === 0 ? int(90, 97, `${k}:sc`) : want === 1 ? int(80, 89, `${k}:sc`) : want === 2 ? int(61, 67, `${k}:sc`) : want === 3 ? int(68, 79, `${k}:sc`) : int(61, 97, `${k}:sc`);
      const off = -int(1, 40, `${k}:ap`);
      const ap = shift(t0.y, t0.m, t0.d, off);
      const st = score >= 90 ? 0 : score >= 80 ? 1 : score < 68 ? 2 : 3; // the stage follows the score
      rec = { id: `C-${base * 3 + n - i}`, title: `${firsts[(i + 12) % firsts.length]} ${lasts[(i + 12) % lasts.length]}`, sub: ROLES_OPEN[(i + int(0, 7, `${S}:job`)) % ROLES_OPEN.length], who, amount: score, value: String(score), date: dayLabel(ap.m, ap.d), status: st, tag: pick(['Remote', 'Hybrid', 'On site'], `${k}:tag`) };
    }
    records.push(rec);
  }
  for (const r of records) statuses[r.status].count++;
  const isMoney = kind === 'billing' || kind === 'orders' || kind === 'pipeline';
  const amount = kind === 'hiring' ? Math.round(records.reduce((a, r) => a + r.amount, 0) / n) : records.reduce((a, r) => a + r.amount, 0);
  const doneRecs = records.filter((r) => r.status === 0);
  const doneAmount = kind === 'hiring' ? doneRecs.length : doneRecs.reduce((a, r) => a + r.amount, 0);
  const fmt = isMoney ? fmtRound : kind === 'deploys' ? (v: number) => dur(Math.round(v)) : kind === 'support' ? (v: number) => `${Math.round(v / 60)} h` : (v: number) => String(Math.round(v));
  const total = { count: n, amount, value: fmt(amount), done: doneRecs.length, doneAmount, doneValue: kind === 'hiring' ? `${doneRecs.length} offers` : fmt(doneAmount), share: kind === 'hiring' ? doneRecs.length / n : doneAmount / Math.max(1, amount), unit: spec.unit };
  const nav = spec.nav.map((x, i) => (i === 1 ? { ...x, count: n } : i === 0 || i === spec.nav.length - 1 ? x : { ...x, count: int(3, 60, `${S}:nav${i}`) }));
  const f = records[focus];
  const verbs: Record<WorldKind, (r: WorldRecord) => string> = {
    billing: (r) => `${r.status === 0 ? 'marked' : 'sent'} ${r.id} ${r.status === 0 ? 'paid' : `to ${r.title}`}`,
    deploys: (r) => `deployed ${r.id} to ${r.title}`,
    support: (r) => `${r.status === 0 ? 'solved' : 'replied to'} ${r.id}`,
    orders: (r) => `${r.status === 0 ? 'shipped' : 'packed'} ${r.id}`,
    pipeline: (r) => `moved ${r.title} to ${statuses[r.status].label}`,
    hiring: (r) => `scored ${r.title.split(' ')[0]} ${r.value}`,
  };
  const activity = [f, ...records.filter((_, i) => i !== focus)].slice(0, 8).map((r, i) => ({ who: r.who, text: verbs[kind](r), ago: ago(i === 0 ? 0 : 2 + i * int(3, 17, `${S}:ago${i}`)) }));
  return {
    seed: S, kind, workspace, screen: spec.screen, noun: spec.noun, today, people, me: 0, columns: spec.columns, statuses, records, total, nav, activity, focus,
    series: seriesFor(kind === 'hiring' ? amount * 12 : amount, `${S}:series`), fmt,
  };
};

/** Asserts a world adds up (tests and a film's data module call it): counts, sums, dates and the focus record. */
export const checkWorld = (w: SampleWorld): string[] => {
  const bad: string[] = [];
  const counts = w.statuses.map((_, i) => w.records.filter((r) => r.status === i).length);
  if (counts.some((c, i) => c !== w.statuses[i].count)) bad.push('status counts differ from the rows');
  if (w.records[w.focus]?.status !== 0) bad.push('the focus record is not in the accent state');
  if (w.series.reduce((a, b) => a + b, 0) !== (w.kind === 'hiring' ? w.total.amount * 12 : w.total.amount)) bad.push('the series does not sum to the total');
  if (w.kind !== 'hiring' && w.records.reduce((a, r) => a + r.amount, 0) !== w.total.amount) bad.push('the total is not the sum of the rows');
  if (new Set(w.records.map((r) => r.id)).size !== w.records.length) bad.push('ids repeat');
  if (new Set(w.people.map((p) => p.name)).size !== w.people.length) bad.push('names repeat');
  if (w.records.length >= w.statuses.length + 3 && w.statuses.some((s) => s.count === 0)) bad.push('a status has no rows (an empty tab or column)');
  return bad;
};
