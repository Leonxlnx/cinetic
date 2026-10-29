// Sample products for the kit: two believable apps with real states, numbers that add up and copy that
// states a product fact. They are the fallback when a film has no product UI of its own yet (a card is
// never an empty slab or a stack of grey bars), and the shape to copy when you rebuild the real product:
// replace every string and number with the brand's own before the film ships.
import type { IconName } from './icons';

export type Person = { initials: string; name: string };
export type ChatLine = { text: string; side: 'in' | 'out'; kind?: 'typing' };
export type FeedRow = { who: number; ref: string; text: string };
export type Category = { name: string; glyph: GlyphName; budget: number; spent: number };
/** A generic glyph's name (kit/icons.ts): generic actions only; a named product, source or model is its real mark (kit/logos.tsx). */
export type GlyphName = IconName;

const TEAM: Person[] = [
  { initials: 'MK', name: 'Mara K.' },
  { initials: 'JO', name: 'Jun O.' },
  { initials: 'AL', name: 'Ada L.' },
  { initials: 'SR', name: 'Sol R.' },
  { initials: 'TV', name: 'Teo V.' },
  { initials: 'IP', name: 'Ines P.' },
];

/** A review desk for photo shoots: one project from review to print. */
export const REVIEW = {
  product: 'Kitewing',
  line: 'Review desk for shoots',
  team: TEAM,
  project: { title: 'Tide · Spring lookbook', meta: '48 shots · print Friday 4 pm', shots: 48, approved: 44, status: { open: 'In review', done: 'Ready to print' } },
  actions: { approve: 'Approve all', done: 'Approved · sent to print', count: (n: number, of: number) => `${n} of ${of} approved` },
  chat: {
    title: 'Tide team',
    draft: 'Message Tide team',
    lines: [
      { text: 'Cover is perfect.', side: 'in' },
      { text: 'Send all 48 to print.', side: 'out' },
      { text: '', side: 'in', kind: 'typing' },
      { text: 'Booked for Friday, 4 pm.', side: 'in' }, // the project's own print slot (meta): a chat agrees with the screen beside it
    ] as ChatLine[],
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
    ] as FeedRow[],
  },
  stats: {
    approved: { label: 'Approved', value: 48, of: 48 },
    saves: { label: 'saves', from: 1204, perSec: 3.1 },
    views: { label: 'Views · live', from: 18240, perSec: 412, since: 'since print' },
  },
};

/** Shared budgets for small teams: one quarter, three teams, a live total. */
export const BUDGETS = {
  product: 'Tallyfold',
  line: 'Shared budgets for small teams',
  team: 'Product team',
  period: 'Q3 budget',
  categories: [
    { name: 'Design', glyph: 'pen', budget: 12400, spent: 8140 },
    { name: 'Engineering', glyph: 'code', budget: 24600, spent: 17220 },
    { name: 'Marketing', glyph: 'mega', budget: 11200, spent: 6100 },
  ] as Category[],
  weeks: [620, 980, 1140, 760, 1310, 1050, 1170, 1110], // Design, week by week: sums to its 8,140 spent
  toast: { amount: 1200, category: 'Engineering', when: 'just now' },
  report: { title: 'Q3 report', meta: '12 pages · today' },
  people: TEAM.slice(0, 4),
  receipts: 37,
};

/** Totals that always add up with the categories. */
export const budgetTotals = (cats: Category[] = BUDGETS.categories) => {
  const budget = cats.reduce((a, c) => a + c.budget, 0);
  const spent = cats.reduce((a, c) => a + c.spent, 0);
  return { budget, spent, share: spent / Math.max(1, budget) };
};

/** Money as the product shows it: "$48,200". */
export const money = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

export const SAMPLE = { review: REVIEW, budgets: BUDGETS } as const;
