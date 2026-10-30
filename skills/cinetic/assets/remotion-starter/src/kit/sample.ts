// The kit's sample content, behind one door: sample(). Two made-up products (a review desk, shared budgets), dealt
// sample workspaces for dense screens, tile previews, file names. They exist for the kit's own gallery and tests, to
// show what a part looks like full; a film never shows them. No kit part falls back to them: a part given no content of
// the film's own draws its empty state (kit/gate.tsx), and scripts/copy-check.py fails any string of this file found in
// a film's source or render (it reads the quoted strings and the company lists of this file), so keep every sample
// string here and nowhere else in the kit.
//   sample().review / .budgets      the two sample products, the shapes ReviewData and BudgetData
//   sample().world(seed, o)         a dealt sample workspace (people, records, statuses, figures, chrome) that adds up
//   sample().nodes(world, n)        tile nodes from a sample world, with sample previews (doc lines, code, bars)
//   sample().docLines / codeLines / listLines / fileStems   the tile previews' and file thumbs' sample strings
import { rand } from '../lib/anim';
import { checkWorld, type SampleKind, type SampleWorld, seriesFor, type StatusTone, type WorldPerson, type WorldRecord, type WorldStatus } from './data';
import { kitSampleUsed } from './gate';
import type { IconName } from './icons';
import { day, FILM_DATE } from './real';

export type Person = { initials: string; name: string; seed?: string; src?: string; focus?: [number, number] };
export type ChatLine = { text: string; side: 'in' | 'out'; kind?: 'typing' };
export type FeedRow = { who: number; ref: string; text: string };
export type Category = { name: string; glyph: GlyphName; budget: number; spent: number };
/** A generic glyph's name (kit/icons.ts): generic actions only; a named product, source or model is its real mark (kit/logos.tsx). */
export type GlyphName = IconName;

/** A project under review, its team, chat, comments and figures: what ProjectPanel, ChatCard, FeedCard, StatCard and ApprovalsCard show. */
export type ReviewData = {
  product?: string;
  line?: string;
  team: Person[];
  /** `label` heads the selects ("Selects"); `files` name the selects shown as files when no photo is given */
  project: { title: string; meta: string; shots: number; approved: number; status: { open: string; done: string }; label?: string; files?: { name: string; size: string }[] };
  actions: { approve: string; done: string; count: (n: number, of: number) => string };
  chat: { title: string; draft: string; lines: ChatLine[] };
  feed: { title: string; count: number; rows: FeedRow[] };
  stats: { approved: { label: string; value: number; of: number }; saves: { label: string; from: number; perSec: number }; views: { label: string; from: number; perSec: number; since: string } };
};
/** A team's budgets for a period: what BudgetCard, CategoryRows, ChartCard, RingCard, AmountToast and ReportCover show. */
export type BudgetData = {
  product?: string;
  line?: string;
  team: string;
  period: string;
  categories: Category[];
  /** one category's spend, week by week (ChartCard's bars, ReportCover's bars) */
  weeks: number[];
  toast: { amount: number; category: string; when: string };
  report: { title: string; meta: string };
  people: Person[];
  receipts?: number;
  /** ChartCard's title, RingCard's sentence (`${name} is on track`): the product's own words */
  chartTitle?: string;
  onTrack?: (name: string) => string;
};

/** Totals that always add up with the categories. */
export const budgetTotals = (cats: readonly Category[]) => {
  const budget = cats.reduce((a, c) => a + c.budget, 0);
  const spent = cats.reduce((a, c) => a + c.spent, 0);
  return { budget, spent, share: spent / Math.max(1, budget) };
};

/** Money as the product shows it: "$48,200". */
export const money = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

// ================================================================================================ sample content
// Everything below is sample content: reachable only through sample().

const TEAM: Person[] = [
  { initials: 'MK', name: 'Mara K.' },
  { initials: 'JO', name: 'Jun O.' },
  { initials: 'AL', name: 'Ada L.' },
  { initials: 'SR', name: 'Sol R.' },
  { initials: 'TV', name: 'Teo V.' },
  { initials: 'IP', name: 'Ines P.' },
];

/** A review desk for photo shoots: one project from review to print. */
const REVIEW: ReviewData = {
  product: 'Kitewing',
  line: 'Review desk for shoots',
  team: TEAM,
  project: {
    title: 'Tide · Spring lookbook',
    meta: '48 shots · print Friday 4 pm',
    shots: 48,
    approved: 44,
    status: { open: 'In review', done: 'Ready to print' },
    label: 'Selects',
    files: [{ name: 'IMG_2041.jpg', size: '3.2 MB' }, { name: 'DSC_0418.jpg', size: '4.7 MB' }, { name: 'cover-v3.jpg', size: '2.6 MB' }, { name: 'hero-crop.jpg', size: '5.1 MB' }],
  },
  actions: { approve: 'Approve all', done: 'Approved · sent to print', count: (n: number, of: number) => `${n} of ${of} approved` },
  chat: {
    title: 'Tide team',
    draft: 'Message Tide team',
    lines: [
      { text: 'Cover is perfect.', side: 'in' },
      { text: 'Send all 48 to print.', side: 'out' },
      { text: '', side: 'in', kind: 'typing' },
      { text: 'Booked for Friday, 4 pm.', side: 'in' },
    ],
  },
  feed: {
    title: 'Comments',
    count: 214,
    rows: [
      { who: 0, ref: 'shot 1', text: 'Cover approved. Lovely light.' },
      { who: 1, ref: 'shot 22', text: 'Can 22 go tighter?' },
      { who: 2, ref: 'shot 14', text: 'Dust spot near the foot.' },
      { who: 3, ref: 'shot 9', text: 'Cups read best on chalk.' },
      { who: 4, ref: 'shot 30', text: 'Retouch done, 30 to 36.' },
      { who: 5, ref: 'shot 41', text: 'Softer shadow on the jar.' },
      { who: 0, ref: 'shot 12', text: 'Approved 1 to 12.' },
      { who: 1, ref: 'shot 5', text: 'The deep glaze works.' },
      { who: 2, ref: 'shot 14', text: 'Dust spot fixed.' },
      { who: 3, ref: 'shot 48', text: 'Print order confirmed.' },
    ],
  },
  stats: {
    approved: { label: 'Approved', value: 48, of: 48 },
    saves: { label: 'saves', from: 1204, perSec: 3.1 },
    views: { label: 'Views · live', from: 18240, perSec: 412, since: 'since print' },
  },
};

/** Shared budgets for small teams: one quarter, three teams, a live total. */
const BUDGETS: BudgetData = {
  product: 'Tallyfold',
  line: 'Shared budgets for small teams',
  team: 'Product team',
  period: 'Q3 budget',
  categories: [
    { name: 'Design', glyph: 'pen', budget: 12400, spent: 8140 },
    { name: 'Engineering', glyph: 'code', budget: 24600, spent: 17220 },
    { name: 'Marketing', glyph: 'mega', budget: 11200, spent: 6100 },
  ],
  weeks: [620, 980, 1140, 760, 1310, 1050, 1170, 1110], // Design, week by week: sums to its 8,140 spent
  toast: { amount: 1200, category: 'Engineering', when: 'just now' },
  report: { title: 'Q3 report', meta: '12 pages · today' },
  people: TEAM.slice(0, 4),
  receipts: 37,
  chartTitle: 'Weekly spend',
  onTrack: (name: string) => `${name} is on track`,
};

// ------------------------------------------------------------------------------------------------ sample worlds
const FIRST = ['Mara', 'Jun', 'Ada', 'Sol', 'Teo', 'Ines', 'Kofi', 'Priya', 'Lena', 'Omar', 'Yuki', 'Nils', 'Amara', 'Rafael', 'Hana', 'Tomas', 'Zara', 'Ivo', 'Leila', 'Mateo', 'Noor', 'Felix', 'Aiko', 'Diego', 'Elif', 'Sami', 'Bea', 'Kai', 'Lucia', 'Arjun', 'Mina', 'Oskar', 'Rosa', 'Femi', 'Ana', 'Theo', 'Iris', 'Malik', 'Sara', 'Emil', 'Chloé', 'Jonas', 'Wen', 'Dara', 'Luca', 'Nadia', 'Olu', 'Pia', 'Ravi', 'Sofia', 'Tariq', 'Uma', 'Vera', 'Wim', 'Yara', 'Zoë', 'Aron', 'Beatriz', 'Cyrus', 'Dalia'];
const LAST = ['Okafor', 'Lindqvist', 'Moreau', 'Tanaka', 'Haddad', 'Novak', 'Brennan', 'Castillo', 'Varga', 'Osei', 'Petrov', 'Nakamura', 'Ferreira', 'Kowalski', 'Mensah', 'Larsen', 'Quinn', 'Reyes', 'Sato', 'Abara', 'Holm', 'Ibarra', 'Jansen', 'Kaur', 'Laine', 'Mwangi', 'Nieminen', 'Ortega', 'Park', 'Rossi', 'Silva', 'Touré', 'Ueda', 'Vidal', 'Weber', 'Yilmaz', 'Zhou', 'Adeyemi', 'Bauer', 'Costa', 'Duarte', 'Eriksen', 'Farah', 'Gallo', 'Hayes', 'Iwu', 'Juárez', 'Keller', 'Lund', 'Marsh', 'Nair', 'Pires', 'Ruiz', 'Sørensen', 'Tran', 'Uddin', 'Volkov', 'Wren', 'Achterberg', 'Bello'];
const ROLES = ['Design lead', 'Engineer', 'Ops', 'Finance', 'Support lead', 'Product', 'Account manager', 'Data', 'Founder', 'Recruiter', 'Platform', 'Marketing'];
// The sample companies are COMPANY_PRE x COMPANY_SUF ("Zephyr Legal", "Yarrow Analytics"); copy-check.py reads both lists.
const COMPANY_PRE = ['Alder', 'Birch', 'Cobalt', 'Delta', 'Fable', 'Granite', 'Harbor', 'Juniper', 'Kestrel', 'Lumen', 'Marlow', 'Nimbus', 'Orchard', 'Pine', 'Quarry', 'Rowan', 'Slate', 'Tidal', 'Vale', 'Willow', 'Yarrow', 'Zephyr', 'Beacon', 'Cedar', 'Drift', 'Fern', 'Glade', 'Heron', 'Isla', 'Larch', 'Moss', 'North Pier', 'Otter', 'Pebble', 'Reed', 'Signal', 'Thistle', 'Upland', 'Wharf', 'Arbor'];
const COMPANY_SUF = ['Studio', 'Dental', 'Labs', 'Legal', '& Co', 'Supply', 'Health', 'Works', 'Partners', 'Foods', 'Logistics', 'Design', 'Bakery', 'Clinic', 'Architects', 'Analytics', 'Freight', 'Print', 'Coffee', 'Books'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const KINDS: SampleKind[] = ['billing', 'deploys', 'support', 'orders', 'pipeline', 'hiring'];

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
const shift = (y: number, m: number, d: number, days: number) => {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() };
};
const dayLabel = (m: number, d: number) => `${MONTHS[m - 1]} ${d}`;
const clock = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const ago = (min: number) => (min < 1 ? 'now' : min < 60 ? `${min} min ago` : min < 1440 ? `${Math.floor(min / 60)} h ago` : `${Math.floor(min / 1440)} d ago`);
const dur = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
const cash = (cur: string) => (cents: number) => `${cur}${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cashRound = (cur: string) => (cents: number) => `${cur}${Math.round(cents / 100).toLocaleString('en-US')}`;
const hex = (key: string) => Array.from({ length: 7 }, (_, i) => '0123456789abcdef'[Math.floor(rand(`${key}:${i}`) * 16)]).join('');

type KindSpec = { screen: string; noun: [string, string]; columns: SampleWorld['columns']; statuses: { label: string; tone: StatusTone }[]; nav: { label: string; glyph: IconName }[]; unit: string };
const SPEC: Record<SampleKind, KindSpec> = {
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

type DealOpts = { kind?: SampleKind; rows?: number; currency?: string; today?: string; photos?: (string | { src: string; focus?: [number, number] })[] };

/** A dealt sample workspace (the gallery's): every kind adds up, the statuses agree with the dates, the chart sums to the total. */
const dealWorld = (seed: string | number = 'cinetic', o: DealOpts = {}): SampleWorld => {
  const S = String(seed);
  const kind = o.kind ?? pick(KINDS, `${S}:kind`);
  const spec = SPEC[kind];
  const n = Math.max(4, Math.min(40, o.rows ?? 14));
  const cur = o.currency ?? pick(['$', '$', '€', '£'], `${S}:cur`);
  const td = day(o.today ?? FILM_DATE);
  const t0 = shift(td.y, td.m, td.d, 0);
  const today = { y: t0.y, m: t0.m, d: t0.d, weekday: DAYS[t0.wd], label: `${DAYS[t0.wd]}, ${dayLabel(t0.m, t0.d)}` };
  const firsts = shuffle(FIRST, `${S}:first`);
  const lasts = shuffle(LAST, `${S}:last`);
  const roles = shuffle(ROLES, `${S}:roles`);
  const people: WorldPerson[] = Array.from({ length: 9 }, (_, i) => {
    const first = firsts[i];
    const last = lasts[i];
    const ph = o.photos?.[i];
    const photo = typeof ph === 'string' ? { src: ph } : ph;
    return { first, name: `${first} ${last}`, initials: `${first[0]}${last[0]}`.toUpperCase(), role: roles[i % roles.length], seed: `${S}:p:${first}${last}`, ...(photo ? { photo: photo.src, ...(photo.focus ? { focus: photo.focus } : {}) } : {}) };
  });
  const companies = shuffle(COMPANY_PRE, `${S}:pre`).map((p, i) => `${p} ${shuffle(COMPANY_SUF, `${S}:suf`)[i % COMPANY_SUF.length]}`);
  const workspace = companies[companies.length - 1];
  const statuses: WorldStatus[] = spec.statuses.map((s) => ({ ...s, count: 0 }));
  const fmtMoney = cash(cur);
  const fmtRound = cashRound(cur);
  const base = int(180, 920, `${S}:base`);
  const now = int(9 * 60, 17 * 60, `${S}:now`);
  const free = shuffle(Array.from({ length: n }, (_, i) => i).filter((i) => i >= 3), `${S}:force`);
  const upper = free.filter((i) => i <= Math.max(3, Math.min(8, n - 2)));
  const focus = upper[0] ?? free[0] ?? n - 1;
  free.splice(free.indexOf(focus), 1);
  free.unshift(focus);
  const force = new Map<number, number>();
  force.set(focus, 0);
  statuses.forEach((_, st) => { if (st > 0 && free[st] !== undefined && !(kind === 'deploys' && st !== 2)) force.set(free[st], st); });
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
      const st = draft ? 3 : paid ? 0 : off < 0 ? 2 : 1;
      rec = { id: `INV-${String(base + n - i).padStart(4, '0')}`, title: companies[i % (companies.length - 1)], sub: `${pick(BILL_FOR, `${k}:for`)} · ${pick(['Net 30', 'Net 15', 'Card', 'Bank transfer'], `${k}:terms`)}`, who, amount: cents, value: fmtMoney(cents), date: draft ? '—' : dayLabel(due.m, due.d), status: st, tag: pick(['Net 30', 'Net 15', 'Card'], `${k}:tag`) };
    } else if (kind === 'deploys') {
      const started = now - i * int(6, 38, `${k}:gap`) - 3;
      const r = rand(`${k}:s`);
      const st = i === 0 || (i === 1 && r < 0.5) ? 3 : i <= 2 ? 1 : want ?? (r < 0.18 ? 2 : 0);
      const secs = st === 1 ? (now - started) * 60 : st === 3 ? 0 : int(38, 412, `${k}:d`);
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
      const st = want ?? (off < 0 ? (r < 0.7 ? 0 : 2) : r < 0.25 ? 2 : r < 0.6 ? 1 : 3);
      rec = { id: `D-${base + n - i}`, title: companies[i % (companies.length - 1)], sub: `${pick(['Annual', 'Pilot', 'Expansion', 'Renewal'], `${k}:t`)} · ${int(10, 400, `${k}:seats`)} seats`, who, amount: cents, value: fmtRound(cents), date: dayLabel(close.m, close.d), status: st, tag: pick(['Annual', 'Pilot', 'Renewal'], `${k}:tag`) };
    } else {
      const score = want === 0 ? int(90, 97, `${k}:sc`) : want === 1 ? int(80, 89, `${k}:sc`) : want === 2 ? int(61, 67, `${k}:sc`) : want === 3 ? int(68, 79, `${k}:sc`) : int(61, 97, `${k}:sc`);
      const off = -int(1, 40, `${k}:ap`);
      const ap = shift(t0.y, t0.m, t0.d, off);
      const st = score >= 90 ? 0 : score >= 80 ? 1 : score < 68 ? 2 : 3;
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
  const verbs: Record<SampleKind, (r: WorldRecord) => string> = {
    billing: (r) => `${r.status === 0 ? 'marked' : 'sent'} ${r.id} ${r.status === 0 ? 'paid' : `to ${r.title}`}`,
    deploys: (r) => `deployed ${r.id} to ${r.title}`,
    support: (r) => `${r.status === 0 ? 'solved' : 'replied to'} ${r.id}`,
    orders: (r) => `${r.status === 0 ? 'shipped' : 'packed'} ${r.id}`,
    pipeline: (r) => `moved ${r.title} to ${statuses[r.status].label}`,
    hiring: (r) => `scored ${r.title.split(' ')[0]} ${r.value}`,
  };
  const activity = [f, ...records.filter((_, i) => i !== focus)].slice(0, 8).map((r, i) => ({ who: r.who, text: verbs[kind](r), ago: ago(i === 0 ? 0 : 2 + i * int(3, 17, `${S}:ago${i}`)) }));
  const overdue = records.filter((r) => statuses[r.status].tone === 'alert');
  const kpis: [string, string][] = [
    [total.unit[0].toUpperCase() + total.unit.slice(1), total.value],
    [statuses[0].label, total.doneValue],
    [statuses[2].label, kind === 'hiring' || kind === 'deploys' || kind === 'support' ? String(overdue.length) : fmt(overdue.reduce((sum, r) => sum + r.amount, 0))],
    ['Share', `${Math.round(100 * total.share)} %`],
  ];
  const chrome = {
    url: `app.${workspace.toLowerCase().replace(/[^a-z]+/g, '')}.com/${spec.screen.toLowerCase()}`,
    plan: `${people.length} members · Pro`,
    range: 'This month',
    action: `New ${spec.noun[0]}`,
    activity: 'Activity',
    chart: `Last 12 weeks · ${total.value}`,
    search: 'Search',
    team: 'Team',
    all: 'All',
  };
  return {
    seed: S, kind, origin: 'sample', workspace, screen: spec.screen, noun: spec.noun, today, people, me: 0, columns: spec.columns, statuses, records, total, nav, activity, focus,
    series: seriesFor(kind === 'hiring' ? amount * 12 : amount, `${S}:series`), kpis, chrome, fmt,
  };
};

// ------------------------------------------------------------------------------------------------ tile previews
const DOC_LINES = ['Launch moves to the 12th', 'Pricing page, second pass', 'Owners for every open item', 'Numbers from the Q3 close', 'Notes from the Friday review', 'Migrate the old exports', 'Hiring plan for the spring', 'Copy for the welcome email', 'Retro: what slowed us down', 'Support macros, updated', 'Roadmap for the next six weeks', 'Contracts waiting on legal'];
const CODE_LINES: [string, string][] = [['const', 'total = rows.reduce(sum)'], ['await', 'queue.flush({ batch: 50 })'], ['export', 'function sign(payload)'], ['return', 'cache.get(key) ?? load()'], ['if', '(retry > 3) throw err'], ['import', '{ send } from "./mail"']];
const LIST_LINES = ['Review the draft', 'Send to finance', 'Book the photo day', 'Approve 12 shots', 'Ship the fix', 'Reply to Alder', 'Close the quarter', 'Merge the branch'];
const FILE_STEMS = ['IMG_2041', 'IMG_2077', 'DSC_0418', 'DSC_0533', 'shoot-day-2', 'final-select', 'cover-v3', 'hero-crop'];

type SamplePreview = 'doc' | 'chart' | 'bars' | 'list' | 'person' | 'table' | 'code';
const PREVIEWS: SamplePreview[] = ['doc', 'chart', 'list', 'person', 'table', 'bars', 'code'];
const KIND_GLYPH: Record<SampleKind | 'film', GlyphName> = { billing: 'doc', deploys: 'terminal', support: 'chat', orders: 'cart', pipeline: 'chart', hiring: 'user', film: 'doc' };

/** A sample tile node's preview content (lines, rows, code, values) dealt from its seed. */
const previewFor = (preview: SamplePreview, s: string) => {
  const line = (i: number) => DOC_LINES[Math.floor(rand(`${s}:d${i}`) * DOC_LINES.length)];
  if (preview === 'doc') return { lines: [0, 1, 2, 3].map(line) };
  if (preview === 'list') return { lines: [0, 1, 2].map((i) => LIST_LINES[Math.floor(rand(`${s}:li${i}`) * LIST_LINES.length)]), done: [0, 1, 2].map((i) => rand(`${s}:l${i}`) < 0.6 || i === 0) };
  if (preview === 'code') return { code: [0, 1, 2, 3].map((i) => CODE_LINES[Math.floor(rand(`${s}:c${i}`) * CODE_LINES.length)]) };
  if (preview === 'table') return { rows: [0, 1, 2, 3].map((r) => [line(r).split(' ').slice(0, 2).join(' '), `${(rand(`${s}:t${r * 3 + 1}`) * 9000 + 400).toFixed(0)}`, `${Math.round(rand(`${s}:p${r * 3 + 2}`) * 90 + 5)} %`]) };
  if (preview === 'chart' || preview === 'bars') return { values: Array.from({ length: 10 }, (_, i) => 0.35 + 0.55 * rand(`${s}:v${i}`) + i * 0.04), value: `${Math.round(40 + 50 * rand(`${s}:fig`))} %` };
  return {};
};

/** Tile nodes from a sample world with sample previews (the gallery's walls, rings and tickers). */
const sampleNodes = (w: SampleWorld, n = 24) => {
  const out: { glyph: GlyphName; label: string; sub?: string; preview: SamplePreview | 'photo'; value?: string; seed: string; photo?: string; focus?: [number, number]; lines?: string[]; done?: boolean[]; code?: [string, string][]; rows?: string[][]; values?: number[] }[] = [];
  const faces = w.people.filter((p) => p.photo);
  for (let i = 0; out.length < n && i < n * 2; i++) {
    if (i % 4 === 3 && faces.length) {
      const p = faces[(i >> 2) % faces.length];
      out.push({ glyph: 'user', label: p.name, sub: p.role, preview: 'person', value: p.first, seed: p.seed, photo: p.photo, focus: p.focus });
    } else {
      const r = w.records[i % w.records.length];
      const prev = PREVIEWS[(i + w.seed.length) % PREVIEWS.length];
      const kind = prev === 'person' ? 'doc' : prev;
      const seed = `${w.seed}:${r.id}`;
      const content = previewFor(kind, seed);
      out.push({ glyph: prev === 'code' ? 'code' : prev === 'chart' || prev === 'bars' ? 'chart' : KIND_GLYPH[w.kind], label: r.title, sub: `${r.id} · ${r.value}`, preview: kind, seed, ...content, ...((prev === 'chart' || prev === 'bars') && /[0-9]/.test(r.value) ? { value: r.value } : {}) });
    }
  }
  return out;
};

/** A sample file thumb's name and size, dealt from its seed. */
const sampleFile = (seed = 1) => ({ name: `${FILE_STEMS[Math.floor(rand(seed * 3 + 1) * FILE_STEMS.length)]}.jpg`, size: `${(1.8 + 4.6 * rand(seed * 5 + 2)).toFixed(1)} MB` });

const SAMPLE = {
  review: REVIEW,
  budgets: BUDGETS,
  team: TEAM,
  world: dealWorld,
  nodes: sampleNodes,
  preview: previewFor,
  file: sampleFile,
  check: checkWorld,
  docLines: DOC_LINES as readonly string[],
  codeLines: CODE_LINES as readonly (readonly [string, string])[],
  listLines: LIST_LINES as readonly string[],
  fileStems: FILE_STEMS as readonly string[],
  companies: { pre: COMPANY_PRE as readonly string[], suf: COMPANY_SUF as readonly string[] },
} as const;

/**
 * The only door to the kit's sample content, for the kit's own gallery and tests: sample().review, .budgets, .world(seed,
 * { kind, rows, currency, today, photos }), .nodes(world, n), .file(seed). A film never calls it: each call reports
 * kit-sample (kit/gate.tsx kitSampleUsed: a warning in dev, an error under the ship gate), scripts/precheck.mjs fails a
 * film whose source calls it, and copy-check.py fails its strings in a film's source or render.
 */
export const sample = () => {
  kitSampleUsed();
  return SAMPLE;
};
