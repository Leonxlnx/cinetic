// The film's screen content, as scripts/content.mjs writes it from the brief into src/content.ts: one object whose parts
// spread straight into the screens (<CommentFeed {...CONTENT.comments} />, <PromptBar {...CONTENT.prompt} at={12} />),
// so a film never hand-writes a list, a name, a price or a date. Everything in it is the film's own (generated from its
// brief, then edited by the film if it likes): people with real faces (public/people), pictures (public/thumbs), dates
// round the film's day with the calendar's weekdays, numbers that add up. checkContent() asserts that it still does after
// an edit; call it in the film's data module or a test.
import { day, fmtDay } from '../real';
import type { Site } from './BrowserWindow';
import type { ChatItem } from './ChatReply';
import type { CodeLang } from './CodePage';
import type { Comment } from './CommentFeed';
import type { Cover } from './CoverStack';
import type { DocTable } from './DocPage';
import type { Item } from './ItemList';
import type { NoticeItem } from './NoticeStack';
import type { Plan } from './PriceCards';
import type { PromptAttach } from './PromptBar';
import type { Thumb } from './ThumbGrid';

export type ContentPerson = { name: string; first: string; handle: string; photo?: string; role?: string };

export type FilmContent = {
  meta: { product: string; does: string; domain: string; date: string; weekday: string; now: string; seed: string; currency: string };
  /** the cast: people[0] is the viewer (the product's user), the rest its customers, commenters, teammates */
  people: ContentPerson[];
  prompt: { text: string; placeholder: string; model?: string; attach?: PromptAttach };
  url: { url: string; logo?: string; action: string; busy: string; done: string; placeholder?: string };
  profile: { name: string; handle: string; photo?: string; logo?: string; verified: boolean; stats: string[]; action: string; done: string };
  thumbs: Thumb[];
  comments: { comments: Comment[]; header: { label: string; total: number } };
  notices: { items: NoticeItem[] };
  /** the rows' values sum to header.value */
  payments: { items: Item[]; header: { title: string; value: number; money: true; currency: string } };
  products: { items: Item[] };
  steps: { title: string; sub: string; thumb?: string; steps: { label: string; meta?: string }[] };
  progress: { label: string; to: number };
  plans: { plans: Plan[]; currency: string };
  doc: { number?: string; brand: string; title: string; accentWord?: string; lead: string; section: string; body: string[]; table: DocTable; figure?: string };
  code: { code: string; file: string; lang: CodeLang; tabs: string[] };
  reply: { ask: string; who: { name: string; photo?: string }; text: string; items: ChatItem[]; close: string };
  /** the product's own site, or the app it built (BrowserWindow) */
  site?: Site;
  /** the one thing many asked for, found in what they wrote (RequestPill); count agrees with the answer's figures */
  request?: { label: string; text: string; people: { name: string; photo?: string }[]; count: number; countLabel?: string };
  /** the thing being made, as covers: the product's items, the first in front (CoverStack) */
  cover?: { items: Cover[]; kicker?: string };
};

const num = (s: string | undefined) => Number(String(s ?? '').replace(/[^0-9.-]/g, '')) || 0;

/** What no longer adds up in a film's content (empty: it holds). */
export const checkContent = (c: FilmContent): string[] => {
  const bad: string[] = [];
  const d = day(c.meta.date);
  if (fmtDay(d, 'weekday') !== c.meta.weekday) bad.push(`meta.weekday says ${c.meta.weekday} but ${c.meta.date} is a ${fmtDay(d, 'weekday')}`);
  const names = c.people.map((p) => p.name);
  if (new Set(names).size !== names.length) bad.push('a name repeats in the cast');
  if (new Set(c.people.map((p) => p.handle)).size !== c.people.length) bad.push('a handle repeats in the cast');
  const sum = Math.round(c.payments.items.reduce((a, r) => a + num(r.value), 0) * 100) / 100;
  if (Math.abs(sum - c.payments.header.value) > 0.005) bad.push(`the payments header says ${c.payments.header.value} but the rows sum to ${sum}`);
  if (c.comments.header.total < c.comments.comments.length) bad.push('the comment count is smaller than the comments shown');
  const photos = c.comments.comments.map((x) => x.photo).filter(Boolean);
  if (new Set(photos).size !== photos.length) bad.push('one face is two commenters');
  const faces = c.comments.comments.filter((x) => !x.photo).length;
  if (faces > Math.ceil(c.comments.comments.length / 3)) bad.push('most commenters have no face (fetch the cast: node scripts/content.mjs --fetch)');
  const thumbs = c.thumbs.map((t) => t.src).filter(Boolean);
  if (new Set(thumbs).size !== thumbs.length) bad.push('a thumbnail repeats');
  for (const p of c.plans.plans) if (!p.features.length) bad.push(`plan ${p.name} lists no features`);
  if (c.doc.table.rows.some((r) => r.length !== c.doc.table.head.length)) bad.push('a table row has the wrong number of cells');
  if (c.request && c.request.count < c.request.people.length) bad.push('the request count is smaller than the faces shown');
  if (c.cover && c.cover.items.some((it) => !it.title)) bad.push('a cover has no title');
  if (c.site && !c.site.headline) bad.push('the site has no headline');
  return bad;
};
