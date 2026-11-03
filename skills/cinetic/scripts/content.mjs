#!/usr/bin/env node
/**
 * content.mjs: the film's screen content, written from its brief, so a film never hand-writes a list, a name, a price or a
 * date. It reads a few facts about the product (its name, what it does, its world's nouns, its own items, a price, a
 * link) and writes src/content.ts: one object whose parts spread into the macro screens of the kit (src/kit/screens:
 * <CommentFeed {...CONTENT.comments} />, <PromptBar {...CONTENT.prompt} at={12} />): a cast of people with real faces,
 * comments and notifications with believable names, times and numbers that add up, payments whose rows sum to the
 * header, products and prices, plans, a step list, a document page, a code file, an assistant's answer, a profile, a
 * grid of real pictures, the product's own site (a headline written from what it does, its accent, a lead, cards whose
 * figures are the other screens' own), the one thing many people asked for, and the covers of what it makes. Dates sit
 * round the film's day with the calendar's weekdays. The same brief and seed write the same file.
 *
 *   node scripts/content.mjs --brief BRIEF.md [--fetch] [--out src/content.ts] [--date 2026-11-01] [--seed <word>] [--force]
 *   node scripts/content.mjs --name "Pantry" --does "turns a cooking channel into a paid cookbook" --domain creator \
 *        --topic recipes --item "Weeknight Pasta Book" --price 29 --photos "pasta,cooking,kitchen" --fetch
 *   node scripts/content.mjs --check [src/content.ts]       the content still adds up (exit 1 with what does not)
 *   node scripts/content.mjs --domains                      the worlds it knows and the keys a brief can give
 *
 * The brief. A fenced block in BRIEF.md (```content ... ```) or key: value lines, any of:
 *   name, does, domain (creator | assistant | commerce | devtool | finance | team; guessed from the words when left out),
 *   topic (the plural noun of the product's world: recipes, invoices, trips), thing (what it makes: cookbook, plan),
 *   items (the product's own things, separated by ;), price, currency, url, logo (a mark slug for scripts/logos.mjs),
 *   channel (a handle), prompt (the request typed into the input), photos (search words for the pictures, separated
 *   by ,), people (how many in the cast, default 14), date, seed, headline (the site's headline; default: from
 *   `does`, "turns a channel into a cookbook" -> "Turn a channel into a cookbook"), accent (its words in the accent).
 * Anything left out is written from the world's own vocabulary with the brief's words in it; read the file, keep what
 * is true of the product and change the rest. A person in a screen is a user of the product, never a named testimonial.
 *
 * --fetch downloads the cast's faces (scripts/content-people.json: open-licence portraits, cropped to the face, 512 px)
 * into public/people/ and the pictures (a photo search for `photos`, else the topic) into public/thumbs/, and writes the
 * private licence record to assets/licences.json, and gets the real marks the screens name (the link's platform, the
 * notifications' apps) through scripts/logos.mjs. Without --fetch (or offline) the screens draw the product's own
 * coloured initial discs, lit posters and glyph tiles, never grey.
 * The film's day: --date, else the brief's date, else today; the film's src/kit/real.ts FILM_DATE is set to it.
 * Exit codes: 0 written (or the check passed), 1 the check failed or nothing could be written, 2 bad arguments.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// ------------------------------------------------------------------------------------------------ args
const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const val = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 && i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};
const vals = (f) => argv.flatMap((a, i) => (a === f && argv[i + 1] && !argv[i + 1].startsWith('--') ? [argv[i + 1]] : []));
if (flag('--help') || flag('-h')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*\n?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}

// ------------------------------------------------------------------------------------------------ seeded chance
const hash = (s) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
  return h >>> 0;
};
/** A number in [0, 1) from a key: the same key, the same number, on every machine. */
export const rnd = (key) => {
  let t = (hash(String(key)) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr, key) => arr[Math.floor(rnd(key) * arr.length) % arr.length];
const shuffle = (arr, key) => arr.map((v, i) => [rnd(`${key}:${i}`), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const between = (a, b, key) => a + (b - a) * rnd(key);
const int = (a, b, key) => Math.floor(between(a, b + 1, key));

// ------------------------------------------------------------------------------------------------ the calendar
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MOL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dayOf = (iso, off = 0) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(iso).trim());
  if (!m) throw new Error(`"${iso}" is not a YYYY-MM-DD date`);
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3] + off);
  const d = new Date(t);
  const y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1, dd = d.getUTCDate();
  return { y, m: mo, d: dd, wd: d.getUTCDay(), iso: `${y}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}` };
};
const short = (d) => `${WD[d.wd].slice(0, 3)}, ${MO[d.m - 1]} ${d.d}`;
const clock = (min, h12 = true) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0');
  return h12 ? `${hh % 12 === 0 ? 12 : hh % 12}:${mm} ${hh < 12 ? 'AM' : 'PM'}` : `${String(hh).padStart(2, '0')}:${mm}`;
};
/** "how long ago" for an age in minutes, the way feeds print it. */
const ago = (min, style = 'long') => {
  if (min < 1) return style === 'short' ? 'now' : 'just now';
  if (min < 60) return style === 'short' ? `${Math.round(min)}m` : `${Math.round(min)} ${Math.round(min) === 1 ? 'minute' : 'minutes'} ago`;
  const h = min / 60;
  if (h < 24) return style === 'short' ? `${Math.round(h)}h` : `${Math.round(h)} ${Math.round(h) === 1 ? 'hour' : 'hours'} ago`;
  const d = h / 24;
  if (d < 7) return style === 'short' ? `${Math.round(d)}d` : Math.round(d) === 1 ? '1 day ago' : `${Math.round(d)} days ago`;
  const w = d / 7;
  return style === 'short' ? `${Math.round(w)}w` : Math.round(w) === 1 ? '1 week ago' : `${Math.round(w)} weeks ago`;
};

// ------------------------------------------------------------------------------------------------ numbers
const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(Math.round(n)));
const money = (v, cur = '$') => `${cur}${v.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;
/** A price that ends the way prices do: 19, 29, 37, 49, 67, 99, 149. */
const charm = (v) => {
  if (v < 10) return Math.max(1, Math.round(v)) - 0.01;
  const ends = [7, 9];
  const base = Math.floor(v / 10) * 10;
  const c = ends.map((e) => base + e).concat(ends.map((e) => base - 10 + e)).filter((x) => x > 0);
  return c.sort((a, b) => Math.abs(a - v) - Math.abs(b - v))[0];
};
const duration = (key, lo = 4, hi = 24) => {
  const s = int(lo * 60, hi * 60, key);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ------------------------------------------------------------------------------------------------ words
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const title = (s) => s.replace(/\b([a-z])([a-z]*)/g, (m, a, b) => (/^(a|an|the|of|to|in|on|for|and|or|with|at|by)$/.test(m) ? m : a.toUpperCase() + b));
const singular = (w) => (/ies$/.test(w) ? w.replace(/ies$/, 'y') : /(ss|us)$/.test(w) ? w : /ses$/.test(w) ? w.replace(/es$/, '') : w.replace(/s$/, ''));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18);
/** A template filled from ctx; "a" before a vowel sound becomes "an" (a app -> an app; a user stays a user). */
const fill = (tpl, ctx) => tpl.replace(/\{(\w+)\}/g, (m, k) => (ctx[k] !== undefined ? String(ctx[k]) : m)).replace(/(^|[^\w’'])([Aa]) (?=(?:[aeio]|u(?!ni|se|sa|ro))\w)/g, '$1$2n ');

// The cast's names: first names by how the portrait presents, family names from everywhere. Never a placeholder name.
const FIRST = {
  f: ['Maya', 'Priya', 'Sofia', 'Amara', 'Lena', 'Chloe', 'Nadia', 'Grace', 'Hana', 'Zoe', 'Elena', 'Aisha', 'Mei', 'Ines', 'Tara', 'Leila', 'Nora', 'Camila', 'Yuki', 'Freya', 'Imani', 'Rosa', 'Mira', 'Jade', 'Clara', 'Lucia', 'Noor', 'Ada', 'Esme', 'Talia'],
  m: ['Daniel', 'Marcus', 'Theo', 'Ravi', 'Omar', 'Lucas', 'Kenji', 'Mateo', 'Jonah', 'Elias', 'Samuel', 'Diego', 'Andre', 'Felix', 'Malik', 'Arjun', 'Hugo', 'Isaac', 'Tomas', 'Kai', 'Rafael', 'Noah', 'Adrian', 'Jamal', 'Victor', 'Aaron', 'Miguel', 'Owen', 'Luca', 'Dev'],
};
const LAST = ['Okafor', 'Lindqvist', 'Moreau', 'Patel', 'Nakamura', 'Rivera', 'Haddad', 'Kowalski', 'Bennett', 'Osei', 'Fischer', 'Alvarez', 'Chen', 'Duarte', 'Varga', 'Novak', 'Adeyemi', 'Larsen', 'Mendes', 'Brooks', 'Sato', 'Romero', 'Kaur', 'Weiss', 'Costa', 'Jensen', 'Ibrahim', 'Silva', 'Park', 'Quinn', 'Hale', 'Abe', 'Reyes', 'Mercer', 'Dubois'];

// ------------------------------------------------------------------------------------------------ the worlds
// Each world writes every screen from the brief's words. {P} product, {topic} plural noun, {one} singular, {Topic},
// {thing} what the product makes, {item} one of its items, {first} a person, {handle}, {n} a number.
const WORLDS = {
  creator: {
    about: 'a creator\'s channel, newsletter or podcast and what it sells (courses, guides, books, memberships)',
    keys: /\b(creator|channel|youtube|subscriber|video|podcast|newsletter|audience|course|fans?|followers|tiktok|instagram|stream)/i,
    topic: 'videos', thing: 'guide', logo: 'youtube', handleWords: ['makes', 'daily', 'club', 'at.home', 'notes', 'learns'],
    url: { tpl: 'youtube.com/@{channel}', action: 'Scan my channel', busy: 'Analyzing', done: 'Ready', placeholder: 'Paste your channel link' },
    prompt: ['Turn my most asked {topic} into a {thing}', 'Make a {thing} from my top {n} {topic}', 'Which {topic} should go in the {thing}?'],
    placeholder: 'Ask {P} anything',
    profile: { stats: ['{subs} subscribers', '{count} videos'], action: 'Subscribe', done: 'Subscribed' },
    thumbs: ['My {n}-minute {one} routine (start here)', 'Stop making these 3 {one} mistakes', 'I tried {topic} every day for 30 days', '{Topic} for complete beginners: the whole plan', 'The only {n} {topic} you actually need', 'What nobody tells you about {topic}', 'Watch this before your next {one}', 'The {one} I get asked about most', '{Topic} on a budget: what I\'d buy again', 'Is this the easiest {one} ever?', 'A week of {topic}, start to finish', 'The {one} test that shows where you are'],
    overlays: ['START HERE', '30 DAYS', 'NO EXCUSES', 'BEGINNER?', 'WORTH IT?', 'THE TRICK', 'SAVE THIS', 'TRY THIS', 'BIG MISTAKE', 'ONE WEEK', 'SO EASY', 'WATCH FIRST'],
    comments: ['Can you put all of these into one {thing}?', 'Love these {topic}, I just never know which one to do next.', 'Been following along for a month. What should I try next?', 'Finally something I can actually do at home.', 'Is there a printable version of this anywhere?', 'Would honestly pay for a proper {thing} of this.', 'Please make a beginner series!', 'Saved. Doing this tonight.', 'Where do I start if I\'m completely new?', 'The way you explain it just clicks for me.', 'Week three and I can already see the difference.', 'Which of these would you do first?'],
    commentLabel: 'Reading {n} comments',
    notices: [
      { app: 'stripe', glyph: 'dollar', title: 'New sale', body: '{handle} bought {item} for {price}' },
      { app: 'stripe', glyph: 'dollar', title: 'New sale', body: '{first} bought {item} for {price}' },
      { app: 'youtube', glyph: 'play', title: 'New subscriber', body: '{handle} subscribed to your channel' },
      { app: 'gmail', glyph: 'mail', title: '{first} {last}', body: 'Is the {thing} coming out this month?' },
    ],
    payments: 'Sales today',
    productSubs: ['Ebook · {pages} pages', 'Video course · {lessons} lessons', 'Guide · {lessons} chapters', 'Template pack · {files} files', 'Workbook · {pages} pages'],
    steps: { title: '{item}', sub: 'Course · {lessons} lessons', items: ['Best {topic} picked from your channel', 'Lessons written and put in order', 'Store page published', 'Checkout and welcome email ready'], progress: 'Creating your {thing} · {n}%' },
    plans: [
      { name: 'Free', price: 0, period: '/mo', features: ['One product page', 'Up to 50 sales a month', 'Email receipts', 'Basic stats'], cta: 'Start free' },
      { name: 'Creator', price: 19, period: '/mo', badge: 'Popular', featured: true, features: ['Unlimited products', 'Your own domain', 'Courses and memberships', 'Comments turned into lessons', 'Payouts every day'], cta: 'Go Creator' },
      { name: 'Studio', price: 49, period: '/mo', features: ['Everything in Creator', 'Three team seats', 'Affiliate links', 'Priority support'], cta: 'Talk to us' },
    ],
    // the page the product makes is the product itself (the creator's own item), written from its items, never a
    // stock "plan" page
    doc: { title: '{item}', accent: '{item}', lead: 'Your {n} most asked {topic}, in one {thing}', section: 'Inside the {thing}', body: ['Every {one} your audience asked about, in the order you would teach it, each with the question that asked for it.', 'The questions asked most come first; the rest follow as extras, so the first page is the one people wanted.'], head: ['Part', 'What it covers', 'Asked by'], rows: [['1', '{item}', '{c1} people'], ['2', '{item2}', '{c2} people'], ['3', '{item3}', '{c3} people'], ['4', 'Questions you sent in', '{c4} people']] },
    code: { file: 'course.ts', lang: 'ts' },
    reply: { ask: 'What do my viewers ask for most?', text: 'I read your last {count} videos and {comments} comments. Three requests come up again and again:', items: ['A full {thing} for beginners ({c1} asks)', 'One plan to follow, week by week ({c2} asks)', 'A printable version of every {one} ({c3} asks)'], close: 'Want me to draft the {thing}?' },
  },
  assistant: {
    about: 'an assistant or agent that handles email, calendar, tasks, travel and errands',
    keys: /\b(assistant|agent|inbox|email|calendar|schedule|meeting|tasks?|errands?|reminder|to-?do|plans? my|travel|trip|booking)/i,
    topic: 'tasks', thing: 'plan', logo: 'gmail', handleWords: ['works', 'plans', 'hq', 'office'],
    url: { tpl: 'mail.google.com/mail/u/0/#inbox', action: 'Connect inbox', busy: 'Syncing', done: 'Connected', placeholder: 'Connect an account' },
    prompt: ['Move my 3 PM and tell {first} why', 'What is left for me to finish today?', 'Book a table for four on {weekday} at 7', 'Find a time for all of us next week'],
    placeholder: 'Ask {P} to do anything',
    profile: { stats: ['{count} tasks done', '{subs} hours saved'], action: 'New task', done: 'Started' },
    thumbs: ['Corner table at Lune|0', 'Rooftop room, 12 people|1', 'Studio by the river|1', 'Quiet café near the office|0', 'Conference room 4B|1', 'Garden terrace, heated|0', 'Private room at Halden|1', 'Hotel bar, open late|2', 'Library meeting room|1'],
    thumbMeta: '4.{r} · {min} min away',
    photos: ['restaurant table', 'meeting room', 'hotel lobby'],
    overlays: [],
    comments: ['Can we move the sync to Thursday?', 'Sent the deck, have a look before 3.', 'Booked the room for Friday, it fits all of us.', 'Who has the latest version of the contract?', 'Running ten minutes late, start without me.', 'Can you send me the notes from yesterday?', 'Flights are cheaper on Tuesday, should we switch?', 'Approved. Go ahead and send it.', 'The client wants a call this week, any time works.', 'Lunch is on me if we finish by noon.'],
    commentLabel: 'Reading {n} messages',
    notices: [
      { app: 'gmail', glyph: 'mail', title: '{first} {last}', body: 'Re: the contract, can we talk at {time}?' },
      { app: 'google-calendar', glyph: 'calendar', title: 'Daily sync at {sync}', body: 'Room 4B · 30 minutes · 6 people' },
      { app: 'slack', glyph: 'chat', title: '{first} mentioned you', body: 'Can you check the numbers before the call?' },
      { app: 'gmail', glyph: 'mail', title: 'Reply drafted', body: '{P} wrote back to {first} for you' },
    ],
    payments: 'Expenses this week',
    expenseItems: ['Lunch with a client', 'Train to the airport', 'Hotel, one night', 'Taxi to the venue', 'Team coffee', 'Printing for the workshop'],
    productSubs: ['{mins} min · video call', 'Due {day}', 'Room 4B · {mins} min', 'Due today'],
    agenda: ['Review the venue contract', 'Call with {first}', 'Send the Q4 numbers', 'Pick up the passports', 'Prep notes for the board', 'Reply to {first} about the offer'],
    steps: { title: 'Planning your {weekday}', sub: '{count} emails · {mins} events', items: ['Read {count} new emails', 'Drafted {d} replies', 'Moved two meetings', 'Booked the room and sent invites'], progress: 'Planning your week · {n}%' },
    plans: [
      { name: 'Free', price: 0, period: '/mo', features: ['One inbox and one calendar', '50 tasks a month', 'Daily summary'], cta: 'Start free' },
      { name: 'Plus', price: 12, period: '/mo', badge: 'Popular', featured: true, features: ['Every inbox and calendar', 'Unlimited tasks', 'Replies in your voice', 'Bookings and reminders'], cta: 'Get Plus' },
      { name: 'Team', price: 24, period: '/seat', features: ['Everything in Plus', 'Shared calendars', 'Meeting notes for the team', 'Admin controls'], cta: 'Talk to us' },
    ],
    doc: { title: 'Weekly sync', accent: 'sync', lead: '{dayLong} · 30 minutes · 6 people', section: 'What we decided', body: ['The launch moves to {day2}, so the review lands a week earlier and nobody works the weekend. Design hands over the final screens on Monday.', 'Budget stays as planned. {first} owns the venue, the rest of us own our talks. Questions go in the thread, not in a meeting.'], head: ['#', 'Task', 'Owner'], rows: [['1', 'Final screens to engineering', '{first}'], ['2', 'Book the venue', '{first2}'], ['3', 'Draft the launch email', '{first3}'], ['4', 'Dry run with the team', 'Everyone']] },
    code: { file: 'week.json', lang: 'json' },
    reply: { ask: 'What is left for me to finish today?', text: 'I read your calendar, inbox and tasks. Three things matter today:', items: ['Reply to {first} about the contract', 'Review the new venue photos', 'Daily sync at {sync}'], close: 'Shall I deal with the first two for you?' },
  },
  commerce: {
    about: 'a shop or brand selling things (orders, products, reviews, payouts)',
    keys: /\b(store|shop|order|products?|checkout|cart|inventory|merch|brand|retail|e-?commerce|sell|buyers?)/i,
    topic: 'products', thing: 'store', logo: 'shopify', handleWords: ['shops', 'buys', 'style', 'home'],
    url: { tpl: '{slug}.com', action: 'Import products', busy: 'Importing', done: 'Imported', placeholder: 'Your store\'s address' },
    prompt: ['Write product pages for my new {topic}', 'Which {topic} should I restock this week?', 'Make a sale page for the weekend'],
    placeholder: 'Ask {P} about your store',
    profile: { stats: ['{subs} followers', '{count} products'], action: 'Follow', done: 'Following' },
    thumbs: ['{Item} in stone', 'The everyday {one}', '{Item}, set of two', 'The travel {one}', 'Limited {one}, oak', 'The gift box', '{Item}, refill', 'The weekend {one}', 'Classic {one}, sand'],
    thumbMeta: '{price} · 4.{r} ({reviews})',
    overlays: [],
    comments: ['Arrived in two days and it\'s even better in person.', 'Bought one for my sister, now she wants another.', 'The quality is way better than I expected.', 'Will you restock the large size?', 'Packaging was beautiful, felt like a gift.', 'Third order this year. Never disappointed.', 'Is this one dishwasher safe?', 'Customer support sorted my order in minutes.', 'Exactly like the photos. Love it.', 'Do you ship to Canada?'],
    commentLabel: 'Reading {n} reviews',
    notices: [
      { app: 'shopify', glyph: 'bag', title: 'New order #{order}', body: '{first} ordered {item} · {price}' },
      { app: 'shopify', glyph: 'bag', title: 'New order #{order}', body: '{first} {last} ordered two items · {price2}' },
      { app: 'stripe', glyph: 'dollar', title: 'Payout sent', body: '{payout} is on its way to your bank' },
      { app: 'instagram', glyph: 'heart', title: 'New review', body: '{handle}: “Even better in person.”' },
    ],
    payments: 'Orders today',
    productSubs: ['In stock · {left} left', 'Bestseller · {sold} sold', 'New this week', 'Back in stock'],
    steps: { title: '{P} store', sub: '{count} products · {d} collections', items: ['Products imported', 'Photos cleaned up', 'Checkout connected', 'Store is live'], progress: 'Setting up your store · {n}%' },
    plans: [
      { name: 'Starter', price: 9, period: '/mo', features: ['Up to 50 products', 'Online checkout', 'Order emails'], cta: 'Start' },
      { name: 'Growth', price: 39, period: '/mo', badge: 'Popular', featured: true, features: ['Unlimited products', 'Abandoned cart emails', 'Reviews and bundles', 'Lower card fees'], cta: 'Choose Growth' },
      { name: 'Scale', price: 99, period: '/mo', features: ['Everything in Growth', 'Five staff accounts', 'Wholesale prices', 'Priority support'], cta: 'Talk to us' },
    ],
    doc: { title: 'The {season} collection', accent: '{season}', lead: 'Made in small batches. Built to last.', section: 'What\'s inside', body: ['Every piece is made in small runs and checked by hand before it ships. The colours come from the season: stone, moss, sand and slate.', 'Order by Thursday for delivery before the weekend. Returns are free for thirty days, no questions asked.'], head: ['#', 'Product', 'Price'], rows: [] },
    code: { file: 'products.json', lang: 'json' },
    reply: { ask: 'Which {topic} should I restock this week?', text: 'I looked at the last 30 days of orders. Three {topic} will run out before next week:', items: ['{item}: {left} left, {sold} sold this month', '{item2}: {left2} left', '{item3}: back orders from {d} customers'], close: 'Want me to draft the purchase orders?' },
  },
  devtool: {
    about: 'a tool for developers or for building software (apps, deploys, APIs, data)',
    keys: /\b(code|deploy|api|developer|repo|github|build|app builder|database|backend|frontend|sdk|cli|devops|ship|software|web ?app|website)/i,
    topic: 'apps', thing: 'app', logo: 'github', handleWords: ['dev', 'codes', 'ships', 'builds'],
    url: { tpl: 'github.com/{channel}/{repo}', action: 'Import repo', busy: 'Building', done: 'Deployed', placeholder: 'Paste a repository' },
    prompt: ['I want to build a {one} for {audience}', 'Add sign-in and payments to my {one}', 'Build me a booking page for my clients'],
    placeholder: 'Describe what you want to build',
    profile: { stats: ['{subs} stars', '{count} contributors'], action: 'Star', done: 'Starred' },
    thumbs: ['Booking page', 'Habit tracker', 'Client portal', 'Team dashboard', 'Recipe planner', 'Invoice app', 'Waitlist page', 'Course platform', 'Shop with checkout'],
    thumbMeta: '{tech} · {uses} uses',
    photos: ['laptop on desk', 'workspace desk', 'phone in hand'],
    overlays: [],
    comments: ['Deployed in four minutes. I\'m a little scared.', 'The generated code is actually readable.', 'Finally a tool that doesn\'t fight my stack.', 'Migrated our whole side project in an afternoon.', 'Does it work with an existing database?', 'The preview links alone are worth it.', 'Shipped a client project with this last week.', 'Can it write the tests too?', 'Rollbacks saved me twice already.', 'Love that I can still edit everything by hand.'],
    commentLabel: 'Reading {n} issues',
    notices: [
      { app: 'github', glyph: 'git', title: 'Pull request merged', body: '{handle} merged #{order} into main' },
      { app: 'vercel', glyph: 'rocket', title: 'Deployment ready', body: '{repo} is live · built in {secs}s' },
      { app: 'notion', glyph: 'doc', title: 'Project brief updated', body: '{first} added new requirements' },
      { app: 'linear', glyph: 'check', title: 'Issue closed', body: '{first} closed “Fix checkout redirect”' },
    ],
    payments: 'Usage this month',
    usageItems: ['Builds', 'Preview deploys', 'Database rows', 'Bandwidth', 'Image optimizations', 'Function calls'],
    productSubs: ['main · {sha} · {ago}', 'preview · {sha} · {ago}', 'main · {sha} · {ago}'],
    deploys: ['Fix checkout redirect', 'Add booking calendar', 'Speed up the home page', 'New pricing page', 'Sign-in with email links', 'Dark mode for settings'],
    steps: { title: 'Building your {one}', sub: '{count} files · {d} pages', items: ['Project scaffolded', 'Database and auth created', 'Pages and API written', 'Deployed to production'], progress: 'Building your {one} · {n}%' },
    plans: [
      { name: 'Free', price: 0, period: '/mo', features: ['Three projects', 'Preview deploys', 'Community support'], cta: 'Start free' },
      { name: 'Pro', price: 20, period: '/mo', badge: 'Popular', featured: true, features: ['Unlimited projects', 'Custom domains', 'Team previews', 'More build minutes', 'Daily backups'], cta: 'Go Pro' },
      { name: 'Team', price: 40, period: '/seat', features: ['Everything in Pro', 'Roles and audit log', 'SSO', 'Priority support'], cta: 'Talk to us' },
    ],
    doc: { title: 'Getting started', accent: 'started', lead: 'From an idea to a live {one} in one afternoon.', section: 'Three commands', body: ['Describe what you want and {P} writes the project: pages, an API, a database and sign-in. Everything it writes is plain code in your repository.', 'Every change gets its own preview link. When it looks right, merge it and it goes live. Roll back with one click if it does not.'], head: ['#', 'Command', 'What it does'], rows: [['1', '{cli} new', 'Creates the project'], ['2', '{cli} dev', 'Runs it on your machine'], ['3', '{cli} deploy', 'Puts it live']] },
    code: { file: 'booking.tsx', lang: 'ts' },
    reply: { ask: 'Build me an app where clients book a session', text: 'Here is the plan for your booking app:', items: ['A booking page with your free slots', 'Payments at checkout, then a confirmation email', 'A dashboard for your week'], close: 'Should I start building?' },
  },
  finance: {
    about: 'money: invoices, payments, budgets, expenses, payroll, accounting',
    keys: /\b(invoice|payment|budget|expense|bank|payroll|accounting|bookkeeping|tax|finance|money|spend|card|billing|subscription revenue)/i,
    topic: 'invoices', thing: 'report', logo: 'stripe', handleWords: ['studio', 'co', 'works', 'design'],
    url: { tpl: 'pay.{slug}.com/inv-{order}', action: 'Send invoice', busy: 'Sending', done: 'Sent', placeholder: 'Invoice link' },
    prompt: ['Who still owes me money this month?', 'Send reminders for everything overdue', 'Split this month\'s software costs by team'],
    placeholder: 'Ask {P} about your money',
    profile: { stats: ['{subs} clients', '{count} invoices'], action: 'Pay invoice', done: 'Paid' },
    thumbs: ['Studio rent, {mon}|0', 'Client dinner|1', 'New laptop|2', 'Team offsite|1', 'Software, yearly|2', 'Conference tickets|0', 'Office plants|0', 'Print run|0', 'Photo shoot|0'],
    thumbMeta: '{price} · {ago}',
    photos: ['office desk', 'restaurant table', 'laptop desk'],
    overlays: [],
    comments: ['Paid. Thanks for the reminder!', 'Could you resend the invoice with our new address?', 'Sorry for the delay, sent it this morning.', 'Can we split this into two payments?', 'All good on our side, payment goes out Friday.', 'Do you accept bank transfers?', 'The PO number is in the email thread.', 'Approved by finance, should land tomorrow.'],
    commentLabel: 'Reading {n} replies',
    notices: [
      { app: 'stripe', glyph: 'dollar', title: 'Invoice paid', body: '{company} paid {price}' },
      { app: 'stripe', glyph: 'dollar', title: 'Invoice paid', body: '{company2} paid {price2}' },
      { app: 'gmail', glyph: 'mail', title: 'Reminder sent', body: '{P} nudged {company3} about INV-{order}' },
      { app: 'slack', glyph: 'chat', title: '{first} approved an expense', body: 'Client dinner · {price3}' },
    ],
    payments: 'Paid this week',
    companies: ['Marlow & Reyes', 'Alder Dental', 'Kestrel Studio', 'Okafor Legal', 'Northbeam', 'Halden & Co', 'Juniper Health', 'Vale Architects', 'Brightwork', 'Fennel Foods'],
    productSubs: ['INV-{order} · due {day}', 'INV-{order} · paid {day}', 'INV-{order} · overdue'],
    steps: { title: 'Closing {mon}', sub: '{count} invoices · {d} expenses', items: ['Bank feeds matched', 'Receipts attached', 'Overdue clients reminded', 'Report sent to your accountant'], progress: 'Closing the month · {n}%' },
    plans: [
      { name: 'Solo', price: 0, period: '/mo', features: ['Five invoices a month', 'Card and bank payments', 'Automatic receipts'], cta: 'Start free' },
      { name: 'Studio', price: 15, period: '/mo', badge: 'Popular', featured: true, features: ['Unlimited invoices', 'Reminders that send themselves', 'Expenses and receipts', 'Reports for your accountant'], cta: 'Choose Studio' },
      { name: 'Company', price: 39, period: '/mo', features: ['Everything in Studio', 'Approvals', 'Multiple currencies', 'Payroll exports'], cta: 'Talk to us' },
    ],
    doc: { title: '{mon} in numbers', accent: 'numbers', lead: 'Revenue up, costs flat, two clients late.', section: 'The month at a glance', body: ['Revenue came in above plan thanks to two new retainers. Costs stayed flat: software went up a little, travel came down.', 'Two invoices are past due. Reminders went out on {day}; both clients have promised payment this week.'], head: ['#', 'Client', 'Amount'], rows: [] },
    code: { file: 'invoices.json', lang: 'json' },
    reply: { ask: 'Who still owes me money this month?', text: 'Three invoices are still open, {total} in all:', items: ['{company}: {price}, due {day}', '{company2}: {price2}, due {day2}', '{company3}: {price3}, overdue since {day3}'], close: 'Want me to send friendly reminders?' },
  },
  team: {
    about: 'a workspace for teams (projects, docs, notes, tickets, wikis)',
    keys: /\b(team|project|docs?|workspace|collaborat|notes?|wiki|tickets?|roadmap|sprint|tasks? board|kanban|okrs?)/i,
    topic: 'projects', thing: 'doc', logo: 'notion', handleWords: ['team', 'works', 'pm', 'design'],
    url: { tpl: '{slug}.com/workspace', action: 'Import workspace', busy: 'Importing', done: 'Imported', placeholder: 'Your workspace link' },
    prompt: ['Summarize what changed in {topic} this week', 'Write the launch plan from these notes', 'Who is blocked and why?'],
    placeholder: 'Ask {P} about your team',
    profile: { stats: ['{subs} members', '{count} projects'], action: 'Join workspace', done: 'Joined' },
    thumbs: ['Launch plan|1', 'Design review|0', 'Q4 roadmap|1', 'Hiring board|1', 'Brand refresh|0', 'Customer interviews|2', 'Offsite agenda|2', 'Pricing research|0', 'Onboarding guide|2'],
    thumbMeta: 'Edited {ago} · {first}',
    photos: ['whiteboard meeting', 'sticky notes wall', 'team meeting'],
    overlays: [],
    comments: ['Looks good, one note on the timeline.', 'Can we split this into two tickets?', 'Shipped! Thanks everyone.', 'I\'ll take the copy, can someone review the screens?', 'Moving this to next sprint, blocked on legal.', 'Love the new layout, much easier to scan.', 'Added the numbers from last quarter.', 'Who owns the follow-up with the client?'],
    commentLabel: 'Reading {n} comments',
    notices: [
      { app: 'notion', glyph: 'doc', title: 'Project brief updated', body: '{first} added new requirements' },
      { app: 'slack', glyph: 'chat', title: '{first} replied in #launch', body: 'Screens are ready for review' },
      { app: 'figma', glyph: 'paint', title: 'New comment', body: '{first} on Home screen: “Love this.”' },
      { app: 'google-drive', glyph: 'folder', title: 'New file uploaded', body: '{first} added logo_final.ai' },
    ],
    payments: 'Spend this month',
    usageItems: ['Seats', 'Storage', 'Guests', 'Automations', 'Video calls'],
    productSubs: ['{d} tasks · due {day}', '{d} tasks · on track', '{d} tasks · blocked'],
    steps: { title: 'Launch plan', sub: '{count} tasks · {d} people', items: ['Notes from {d} meetings read', 'Tasks pulled out and assigned', 'Timeline drafted', 'Shared with the team'], progress: 'Writing the plan · {n}%' },
    plans: [
      { name: 'Free', price: 0, period: '/mo', features: ['Up to five people', 'Unlimited docs', 'Seven days of history'], cta: 'Start free' },
      { name: 'Team', price: 10, period: '/seat', badge: 'Popular', featured: true, features: ['Unlimited people', 'Projects and timelines', 'Guests and sharing', 'Full history'], cta: 'Choose Team' },
      { name: 'Business', price: 18, period: '/seat', features: ['Everything in Team', 'SSO and audit log', 'Advanced permissions', 'Priority support'], cta: 'Talk to us' },
    ],
    doc: { title: 'Launch plan', accent: 'plan', lead: 'Everything we ship on {day}, and who owns it.', section: 'The plan', body: ['We launch on {dayLong}. The week before is for polish only: no new features, no new pages. Every open question has an owner and a date.', 'Design freezes on Monday, the launch email goes to review on Tuesday and the press kit is out Wednesday morning.'], head: ['#', 'What', 'Owner'], rows: [['1', 'Freeze the design', '{first}'], ['2', 'Launch email to review', '{first2}'], ['3', 'Press kit out', '{first3}'], ['4', 'Go live', 'Everyone']] },
    code: { file: 'plan.md', lang: 'text' },
    reply: { ask: 'Who is blocked and why?', text: 'Two people are blocked this week:', items: ['{first} is waiting on legal for the terms page', '{first2} needs the final logo files', 'Everyone else is on track'], close: 'Want me to nudge legal and the designers?' },
  },
};
const DOMAINS = Object.keys(WORLDS);

// ------------------------------------------------------------------------------------------------ the site, the request, the covers
// The product's own site in a browser window (its nav, a lead under the headline written from `does`, the cards' titles),
// the one thing many people asked for (a request pill), and the covers of what it makes (a cover stack).
const PAGES = {
  creator: { tld: 'co', glyph: 'play', nav: ['How it works', 'Creators', 'Pricing'], cta: 'Start free', ctaAlt: 'Watch the demo', lead: '{P} reads your videos and comments, then writes the {thing} your viewers keep asking for.', people: ['Creators this week', 'joined'], request: { label: 'Recurring request', text: 'A full {thing} for beginners', countLabel: 'Asked {n}+' }, covers: null },
  assistant: { tld: 'ai', glyph: 'sparkle', nav: ['Product', 'Use cases', 'Pricing'], cta: 'Try it free', ctaAlt: 'See it work', lead: 'Email, calendar and errands in one place. {P} reads, replies and books, and checks with you first.', people: ['Teams on {P}', 'people'], request: { label: 'Asked most this week', text: 'Can we move the sync?', countLabel: '{n} messages', range: [9, 24] }, covers: [['Your week, planned', 'Plan · {n} tasks'], ['Board meeting prep', 'Brief · 6 pages'], ['Trip to Lisbon', 'Itinerary · 3 days']] },
  commerce: { tld: 'com', glyph: 'bag', nav: ['Shop', 'Stories', 'Stores'], cta: 'Shop now', ctaAlt: 'Our story', lead: 'Made in small batches, shipped in two days, and loved by people who buy it twice.', people: ['Customers this week', 'orders'], request: { label: 'Most asked by customers', text: 'Is the large size back?', countLabel: '{n} asks', range: [40, 160] }, covers: null },
  devtool: { tld: 'dev', glyph: 'code', nav: ['Product', 'Docs', 'Pricing', 'Changelog'], cta: 'Start building', ctaAlt: 'Watch the demo', lead: 'Describe it in a sentence. {P} writes the code, the database and the sign-in, then puts it live.', people: ['Builders this week', 'apps'], request: { label: 'Most requested', text: 'Sign in with GitHub', countLabel: '{n} upvotes', range: [120, 480] }, covers: [['Getting started', 'Guide · 12 pages'], ['The API reference', 'Docs · 64 pages'], ['Deploy guide', 'Guide · 9 pages']] },
  finance: { tld: 'app', glyph: 'receipt', nav: ['Product', 'Customers', 'Pricing'], cta: 'Start free', ctaAlt: 'See how it works', lead: 'Invoices that send themselves, reminders that sound like you, and payments that land on time.', people: ['Freelancers this week', 'invoices'], request: { label: 'Clients asked for', text: 'Pay by card', countLabel: '{n} clients', range: [12, 40] }, covers: [['{Mon} report', 'Report · {n} pages'], ['Tax summary', 'PDF · 4 pages'], ['Client statements', 'PDF · 12 pages']] },
  team: { tld: 'so', glyph: 'stack', nav: ['Product', 'Templates', 'Pricing'], cta: 'Get started', ctaAlt: 'Book a demo', lead: 'Projects, docs and decisions in one place, so everyone knows what ships and who owns it.', people: ['Teams this week', 'teams'], request: { label: 'Most upvoted', text: 'Dark mode for docs', countLabel: '{n} votes', range: [60, 240] }, covers: [['Launch plan', 'Doc · 8 pages'], ['Brand guide', 'Doc · 24 pages'], ['The Q1 roadmap', 'Board · 18 cards']] },
};

/** Verbs a product line often joins with "and" ("sends invoices and chases late payments"): turned with the first. */
const VERBS = new Set(['answers', 'books', 'builds', 'chases', 'checks', 'creates', 'deploys', 'designs', 'drafts', 'edits', 'files', 'finds', 'fixes', 'gets', 'handles', 'helps', 'keeps', 'lets', 'makes', 'manages', 'moves', 'organises', 'organizes', 'pays', 'plans', 'publishes', 'puts', 'reads', 'records', 'replies', 'runs', 'saves', 'schedules', 'sells', 'sends', 'ships', 'shows', 'summarises', 'summarizes', 'syncs', 'tests', 'tracks', 'translates', 'turns', 'writes']);
/** "turns" -> "turn", "replies" -> "reply", "does" -> "do", "pushes" -> "push" */
const baseVerb = (w) => (/ies$/i.test(w) ? w.replace(/ies$/i, 'y') : /(ches|shes|sses|xes|zes|oes)$/i.test(w) ? w.replace(/es$/i, '') : /[^s]s$/i.test(w) ? w.replace(/s$/i, '') : w);
/**
 * The site's headline from what the product does: "turns a cooking channel into a paid cookbook" -> "Turn a cooking
 * channel into a paid cookbook"; "an assistant that handles your email" -> "Orrin handles your email". A long line drops
 * its closing "for ..." clause.
 */
export const headlineOf = (name, does) => {
  let s = String(does ?? '').trim().replace(/[.!]+$/, '');
  if (!s) return `Meet ${name}`;
  const rel = /^(?:an?|the)\s+[\w\s-]*?\b(?:that|which|who)\s+(.+)$/i.exec(s);
  if (rel) s = `${name} ${rel[1]}`;
  else if (/^(?:an?|the)\b/i.test(s)) return `Meet ${name}`;
  else {
    const words = s.split(/\s+/);
    if (/[^s]s$|ies$|(ches|shes|sses|xes|zes|oes)$/i.test(words[0])) {
      words[0] = baseVerb(words[0]);
      for (let i = 1; i < words.length - 1; i++) if (/^(and|or)$/i.test(words[i]) && VERBS.has(words[i + 1].toLowerCase())) words[i + 1] = baseVerb(words[i + 1]);
    }
    s = words.join(' ');
  }
  if (s.length > 52) s = s.replace(/\s+for\s+[\w\s-]+$/i, '');
  return cap(s);
};
/** The headline's accent: the object of its last "from / into / in / with / for / to / on" (up to three words), else its last words. */
export const accentOf = (headline) => {
  const m = /\b(?:from|into|in|with|for|to|on)\s+(?:(?:a|an|the|your|their)\s+)?([^,]+?)\s*$/i.exec(headline);
  if (m && m[1].split(/\s+/).length <= 3) return m[1];
  // else its last two words ("late payments"), or the last one when the word before it is a little word ("and tasks")
  const w = headline.replace(/[,.]/g, '').split(/\s+/);
  return w.length > 2 && !/^(and|or|a|an|the|your|my|our|their|its|of|to|with|for|in|on|at|by)$/i.test(w[w.length - 2]) ? w.slice(-2).join(' ') : w[w.length - 1] ?? '';
};

/** A product's line under its name, from what its name says it is (a course has lessons, a book pages), else the world's own. */
const subFor = (domain, item, subs, i) => {
  if (domain === 'creator') {
    const s = String(item).toLowerCase();
    if (/course|class|masterclass|bootcamp|academy/.test(s)) return 'Video course · {lessons} lessons';
    if (/cookbook|book|ebook|handbook/.test(s)) return 'Ebook · {pages} pages';
    if (/plan|program|programme|challenge/.test(s)) return '{weeks}-week plan · {lessons} sessions';
    if (/pack|templates?|presets?|kit|sheets?|bundle/.test(s)) return 'Template pack · {files} files';
    if (/guide|workbook|manual/.test(s)) return 'Guide · {chapters} chapters';
    if (/club|membership|community/.test(s)) return 'Membership · monthly';
  }
  return subs[i % subs.length];
};

// ------------------------------------------------------------------------------------------------ the brief
const parseBrief = (file) => {
  const out = {};
  if (!file) return out;
  const raw = fs.readFileSync(file, 'utf8');
  const block = /```content\s*\n([\s\S]*?)```/.exec(raw);
  const text = block ? block[1] : raw;
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*[-*]?\s*([a-z]+)\s*:\s*(.+?)\s*$/i.exec(line);
    if (m && /^(name|does|domain|topic|thing|items|price|currency|url|logo|channel|prompt|photos|people|date|seed|audience|headline|accent)$/i.test(m[1])) out[m[1].toLowerCase()] = m[2];
  }
  if (!out.name) {
    const h = /^#\s+(.+)$/m.exec(raw);
    if (h) out.name = h[1].replace(/[^\p{L}\p{N} .&-]/gu, '').trim().split(/\s+/).slice(0, 3).join(' ');
  }
  if (!out.does) {
    const d = /\b(?:does|turns|helps|lets|makes)\b[^.\n]{6,120}/i.exec(raw);
    if (d) out.does = d[0];
  }
  return out;
};

const fromArgs = () => {
  const b = parseBrief(val('--brief'));
  for (const k of ['name', 'does', 'domain', 'topic', 'thing', 'price', 'currency', 'url', 'logo', 'channel', 'prompt', 'photos', 'people', 'date', 'seed', 'audience', 'headline', 'accent']) if (val(`--${k}`)) b[k] = val(`--${k}`);
  const items = vals('--item');
  if (items.length) b.items = items.join(';');
  return b;
};

const guessDomain = (b) => {
  if (b.domain && WORLDS[b.domain]) return b.domain;
  const words = `${b.does ?? ''} ${b.topic ?? ''} ${b.thing ?? ''} ${b.items ?? ''} ${b.url ?? ''}`;
  let best = 'team';
  let score = 0;
  for (const d of DOMAINS) {
    const n = (words.match(new RegExp(WORLDS[d].keys.source, 'gi')) ?? []).length;
    if (n > score) [best, score] = [d, n];
  }
  return best;
};

// ------------------------------------------------------------------------------------------------ the cast
const PEOPLE = JSON.parse(fs.readFileSync(path.join(HERE, 'content-people.json'), 'utf8'));

const castOf = (seed, n, domainWords) => {
  const faces = shuffle(PEOPLE.people, `${seed}:faces`).slice(0, Math.min(n, PEOPLE.people.length));
  const usedF = new Set();
  const usedL = new Set();
  return faces.map((p, i) => {
    let first = pick(FIRST[p.p] ?? FIRST.f, `${seed}:first:${i}`);
    for (let k = 1; usedF.has(first) && k < 40; k++) first = pick(FIRST[p.p] ?? FIRST.f, `${seed}:first:${i}:${k}`);
    usedF.add(first);
    let last = pick(LAST, `${seed}:last:${i}`);
    for (let k = 1; usedL.has(last) && k < 40; k++) last = pick(LAST, `${seed}:last:${i}:${k}`);
    usedL.add(last);
    const style = Math.floor(rnd(`${seed}:hs:${i}`) * 4);
    const yy = int(80, 99, `${seed}:yy:${i}`) % 100;
    const f0 = first.toLowerCase();
    const handle = style === 0 ? `${f0}_${pick(domainWords, `${seed}:hw:${i}`)}` : style === 1 ? `${f0}${last[0].toLowerCase()}_${yy}` : style === 2 ? `${f0}-${last.slice(0, 3).toLowerCase()}${int(1, 9, `${seed}:hd:${i}`)}` : `${f0}.${last.toLowerCase()}`;
    return { name: `${first} ${last}`, first, last, handle: handle.replace(/[^a-z0-9_.-]/g, ''), face: p };
  });
};

// ------------------------------------------------------------------------------------------------ writing the screens
const build = (b, date) => {
  const name = (b.name ?? 'Untitled').trim();
  const seed = b.seed ?? name;
  const domain = guessDomain(b);
  const W = WORLDS[domain];
  const topic = (b.topic ?? W.topic).toLowerCase();
  const one = singular(topic);
  const thing = (b.thing ?? W.thing).toLowerCase();
  const cur = b.currency ?? '$';
  const price = Number(b.price) || { creator: 29, commerce: 48, devtool: 20, finance: 1200, assistant: 12, team: 10 }[domain];
  const ownItems = (b.items ?? '').split(';').map((s) => s.trim()).filter(Boolean);
  const itemNames = [...ownItems];
  const extra = { creator: ['The {One} Starter Guide', 'The Complete {One} Course', '{n} {One} Cheat Sheets', 'The Weekly {One} Plan'], commerce: ['The Everyday {One}', 'The Travel {One}', '{One} Gift Set', 'The Classic {One}'], devtool: ['Booking starter', 'SaaS starter', 'Shop starter', 'Docs starter'], finance: ['Retainer, monthly', 'Brand workshop', 'Website build', 'Design sprint'], assistant: ['Morning briefing', 'Inbox zero', 'Trip planner', 'Meeting notes'], team: ['Roadmap template', 'Launch checklist', 'Sprint board', 'Meeting notes'] }[domain];
  for (let k = 0; itemNames.length < 4; k++) itemNames.push(fill(extra[k % extra.length], { Topic: title(topic), One: title(one), n: int(20, 60, `${seed}:xn:${k}`) }));
  const people = castOf(seed, Math.max(10, Number(b.people) || 14), W.handleWords);
  /** each of the product's items has one price everywhere it shows (the list, a payment, a notice, the document) */
  const itemPrice = (k) => [price, charm(price * 1.8), charm(price * 0.55), charm(price * 1.3)][((k % 4) + 4) % 4];
  const viewer = people[0];
  const photo = (p) => `@static:people/${p.face.id}.jpg`;
  const d0 = dayOf(date);
  const now = 9 * 60 + int(10, 400, `${seed}:now`); // the film's clock: 9:10 AM .. 3:50 PM
  const channel = b.channel ?? `${name.replace(/[^A-Za-z0-9]/g, '')}${pick(['HQ', 'Studio', 'Kitchen', 'Lab', 'Daily', ''], `${seed}:ch`)}`;
  const slug = slugify(name) || 'store';
  const ctx = (i, more = {}) => {
    const p = people[(i % (people.length - 1)) + 1];
    const day = dayOf(date, int(1, 6, `${seed}:day:${i}`));
    return {
      P: name, topic, one, Topic: title(topic), One: title(one), thing, Thing: title(thing), item: itemNames[i % itemNames.length], Item: title(one), item2: itemNames[(i + 1) % itemNames.length], item3: itemNames[(i + 2) % itemNames.length],
      first: p.first, last: p.last, handle: p.handle, first2: people[((i + 1) % (people.length - 1)) + 1].first, first3: people[((i + 2) % (people.length - 1)) + 1].first,
      price: money(itemPrice(i % itemNames.length), cur), n: int(5, 12, `${seed}:n:${i}`), channel, weekday: WD[day.wd], slug, repo: slugify(name) || 'app', cli: slugify(name).slice(0, 8) || 'app',
      day: short(day), day2: short(dayOf(date, 7 + int(1, 4, `${seed}:d2:${i}`))), day3: short(dayOf(date, -int(3, 9, `${seed}:d3:${i}`))), dayLong: `${WD[day.wd]}, ${MOL[day.m - 1]} ${day.d}`,
      mon: MOL[d0.m - 1], season: ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][d0.m - 1],
      time: clock(Math.ceil((now + 60 + int(0, 240, `${seed}:t:${i}`)) / 15) * 15), sync: clock(Math.ceil((now + 20) / 30) * 30), weeks: pick([6, 8, 10, 12], `${seed}:wk`), audience: b.audience ?? pick(['small studios', 'personal trainers', 'busy parents', 'freelancers'], `${seed}:aud`),
      ...more,
    };
  };

  // the prompt
  const prompt = { text: b.prompt ?? fill(pick(W.prompt, `${seed}:prompt`), ctx(0)), placeholder: fill(W.placeholder, ctx(0)), ...(domain === 'devtool' || domain === 'assistant' ? { model: pick(['Auto', 'Deep work', 'Fast'], `${seed}:model`) } : {}) };
  if (domain === 'creator' || domain === 'team' || domain === 'finance') prompt.attach = { name: domain === 'creator' ? `${slug}-comments.csv` : domain === 'finance' ? `statement-${MO[d0.m - 1].toLowerCase()}.pdf` : 'kickoff-notes.pdf', meta: domain === 'creator' ? `Spreadsheet · ${int(400, 900, `${seed}:rows`)} rows` : `PDF · ${(between(0.8, 3.6, `${seed}:mb`)).toFixed(1)} MB`, kind: domain === 'creator' ? 'sheet' : 'pdf' };

  // the link
  const url = { url: b.url ?? fill(W.url.tpl, ctx(0, { order: int(1000, 9999, `${seed}:inv`) })), logo: b.logo ?? W.logo, action: W.url.action, busy: W.url.busy, done: W.url.done, placeholder: W.url.placeholder };

  // the profile
  const subs = int(8, 640, `${seed}:subs`) * (domain === 'creator' ? 100 : domain === 'devtool' ? 10 : 1);
  const count = int(24, 180, `${seed}:count`);
  const profile = { name: domain === 'creator' ? name : name, handle: domain === 'creator' ? `@${channel}` : `@${slug}`, logo: undefined, verified: domain === 'creator' || domain === 'commerce', stats: W.profile.stats.map((s) => fill(s, { subs: compact(subs), count })), action: W.profile.action, done: W.profile.done, photo: domain === 'creator' ? photo(viewer) : undefined };

  // the pictures
  const nThumbs = 9;
  const titles = shuffle(W.thumbs, `${seed}:thumbs`).slice(0, nThumbs);
  const overlays = shuffle(W.overlays ?? [], `${seed}:ov`);
  const thumbs = titles.map((t0, i) => {
    // a title may name the photo word it needs (`|k`: W.photos[k]), so a room is never shown as a dinner
    const cat = /\|(\d)$/.exec(t0);
    const t = t0.replace(/\|\d$/, '');
    const age = Math.round(60 * 24 * between(0.3, 30, `${seed}:tage:${i}`));
    const views = Math.round(Math.exp(between(Math.log(subs * 0.3 + 800), Math.log(subs * 4 + 5000), `${seed}:views:${i}`)));
    const meta = domain === 'creator' ? `${compact(views)} views · ${ago(age)}` : fill(W.thumbMeta ?? '{ago}', ctx(i, { r: int(5, 9, `${seed}:r:${i}`), min: int(4, 25, `${seed}:min:${i}`), reviews: int(40, 900, `${seed}:rv:${i}`), price: money(charm(price * between(0.6, 1.8, `${seed}:tp:${i}`)), cur), tech: pick(['Next.js', 'Remix', 'Astro', 'SvelteKit'], `${seed}:tech:${i}`), uses: compact(int(300, 9000, `${seed}:uses:${i}`)), ago: ago(age, 'long') }));
    return { title: fill(t, ctx(i, { n: int(5, 25, `${seed}:tn:${i}`) })), meta, ...(domain === 'creator' ? { duration: duration(`${seed}:dur:${i}`), ...(overlays[i] ? { overlay: overlays[i] } : {}) } : {}), _age: age, _cat: cat ? Number(cat[1]) : null };
  });
  if (domain === 'creator') thumbs.sort((a, b2) => a._age - b2._age);
  const thumbCats = thumbs.map((t) => t._cat);
  thumbs.forEach((t) => { delete t._age; delete t._cat; });

  // comments
  const nCom = 6;
  const comTexts = shuffle(W.comments, `${seed}:com`).slice(0, nCom);
  const comAges = comTexts.map((_, i) => Math.round(between(8, 60 * 30, `${seed}:cage:${i}`))).sort((a, c) => a - c);
  const comments = comTexts.map((t, i) => {
    const p = people[1 + (i % (people.length - 1))];
    return { name: p.name, handle: domain === 'creator' ? `@${p.handle}` : p.name, photo: photo(p), ago: ago(comAges[i]), text: fill(t, ctx(i)), likes: Math.round(between(3, 900, `${seed}:likes:${i}`) * (1 - i / (nCom + 2))), ...(rnd(`${seed}:rep:${i}`) > 0.55 ? { replies: int(1, 14, `${seed}:reps:${i}`) } : {}) };
  });
  const comTotal = int(260, 980, `${seed}:ctot`);

  // notices: newest last (they arrive in order), ages counting down to now
  const notices = W.notices.map((n, i) => {
    const p = people[1 + ((i + 3) % (people.length - 1))];
    const pr = charm(price * between(0.8, 2.4, `${seed}:np:${i}`));
    const cx = ctx(i + 3, { first: p.first, last: p.last, handle: p.handle, price2: money(charm(price * 2.1), cur), price3: money(charm(price * 0.12 + 40), cur), payout: money(Math.round(price * between(40, 90, `${seed}:po`)) , cur), order: int(1040, 1890, `${seed}:ord:${i}`), secs: int(18, 70, `${seed}:secs:${i}`), company: (W.companies ?? [''])[i % (W.companies?.length || 1)], company2: (W.companies ?? [''])[(i + 1) % (W.companies?.length || 1)], company3: (W.companies ?? [''])[(i + 2) % (W.companies?.length || 1)], ...(domain === 'finance' ? { price: money(pr * 1, cur) } : {}) });
    const age = [34, 12, 4, 0][i] ?? 0;
    // the product's own notification (it did the thing: "{P} wrote back ...") carries the product's mark (own), never a
    // stock glyph or another app's
    const own = /^\{P\}/.test(n.body) || n.app === 'self';
    return { ...(own ? { own: true } : { app: n.app }), glyph: n.glyph, title: fill(n.title, cx), body: fill(n.body, cx), ago: age === 0 ? 'now' : `${age}m ago`, ...(n.app === 'gmail' && /\{first\} \{last\}/.test(n.title) ? { photo: photo(p), person: p.name } : {}) };
  });

  // payments: rows that sum to the header
  const payRows = [];
  for (let i = 0; i < 6; i++) {
    const p = people[1 + ((i + 5) % (people.length - 1))];
    const minutes = Math.round(between(2, 60 * 9, `${seed}:pay:${i}`));
    let value, titleS, sub;
    if (domain === 'creator' || domain === 'commerce') {
      const k = int(0, 3, `${seed}:pit:${i}`);
      const it = itemNames[k];
      value = itemPrice(k);
      titleS = p.name; sub = `${it} · ${ago(minutes)}`;
    } else if (domain === 'finance') {
      titleS = W.companies[i % W.companies.length]; sub = `INV-${int(1100, 1999, `${seed}:inv:${i}`)} · ${ago(minutes)}`; value = Math.round(price * between(0.4, 2.6, `${seed}:pv:${i}`) / 50) * 50;
    } else if (domain === 'assistant') {
      titleS = W.expenseItems[i % W.expenseItems.length]; sub = short(dayOf(date, -int(0, 4, `${seed}:ed:${i}`))); value = Math.round(between(8, 220, `${seed}:pv:${i}`) * 100) / 100;
    } else {
      titleS = (W.usageItems ?? ['Usage'])[i % (W.usageItems?.length ?? 1)]; sub = `${compact(int(200, 90000, `${seed}:uq:${i}`))} this month`; value = Math.round(between(2, 60, `${seed}:pv:${i}`) * 100) / 100;
    }
    payRows.push({ title: titleS, sub, value: money(value, cur), _v: value, _m: domain === 'assistant' || domain === 'devtool' || domain === 'team' ? i : minutes, ...(domain === 'creator' || domain === 'commerce' ? { photo: photo(p), person: p.name } : { glyph: domain === 'finance' ? 'receipt' : domain === 'assistant' ? 'card' : 'chart' }) });
  }
  const payTotal = Math.round(payRows.reduce((a, r) => a + r._v, 0) * 100) / 100;
  payRows.sort((a, r) => a._m - r._m); // newest first, the way a feed of payments reads
  payRows.forEach((r) => { delete r._v; delete r._m; });

  // products
  const products = itemNames.slice(0, 4).map((it, i) => {
    const pv = domain === 'finance' ? Math.round(price * [1, 1.6, 0.6, 2.2][i] / 50) * 50 : domain === 'assistant' || domain === 'team' ? null : itemPrice(i);
    const sub = fill(subFor(domain, it, W.productSubs, i), ctx(i, { pages: int(60, 220, `${seed}:pg:${i}`), lessons: int(12, 48, `${seed}:ls:${i}`), files: int(8, 40, `${seed}:fl:${i}`), chapters: int(8, 18, `${seed}:ch:${i}`), left: int(3, 40, `${seed}:left:${i}`), sold: int(40, 900, `${seed}:sold:${i}`), order: int(1100, 1999, `${seed}:po:${i}`), sha: (hash(`${seed}:sha:${i}`) >>> 0).toString(16).slice(0, 7), ago: ago(int(2, 300, `${seed}:pa:${i}`)), mins: pick([15, 30, 45], `${seed}:mins:${i}`), d: int(3, 12, `${seed}:pd:${i}`) }));
    if (domain === 'assistant') {
      const t0 = Math.ceil((now + 30 + i * 70) / 15) * 15;
      return { title: fill(W.agenda[i % W.agenda.length], ctx(i)), sub, value: clock(t0), glyph: ['mail', 'calendar', 'doc', 'check'][i % 4] };
    }
    if (domain === 'devtool') return { title: W.deploys[i % W.deploys.length], sub, tag: i === 0 ? 'Building' : 'Ready', glyph: 'git' };
    if (domain === 'team') return { title: it, sub, value: `${int(40, 100, `${seed}:pct:${i}`)}%`, glyph: 'doc' };
    return { title: it, sub, value: money(pv, cur), glyph: domain === 'finance' ? 'receipt' : 'package' };
  });

  // steps and progress
  const stepCtx = ctx(0, { lessons: int(12, 40, `${seed}:sl`), count: int(30, 140, `${seed}:sc`), d: int(3, 9, `${seed}:sd`), mins: int(3, 9, `${seed}:sm`) });
  // a step card about one of the product's own items says what that item is (its line in the product list)
  const steps = { title: fill(W.steps.title, { ...stepCtx, item: itemNames[0] }), sub: /\{item\}/.test(W.steps.title) && products[0]?.sub ? products[0].sub : fill(W.steps.sub, stepCtx), steps: W.steps.items.map((s) => ({ label: fill(s, stepCtx) })) };
  const progress = { label: fill(W.steps.progress, { ...stepCtx, n: '{n}' }), to: int(46, 88, `${seed}:prog`) };

  // plans
  const plans = { plans: W.plans.map((pl) => ({ ...pl, features: pl.features.map((f2) => fill(f2, ctx(0))) })), currency: cur };

  // the document
  const dc = ctx(0, { c1: int(140, 420, `${seed}:dc1`), c2: int(80, 139, `${seed}:dc2`), c3: int(40, 79, `${seed}:dc3`), c4: int(12, 39, `${seed}:dc4`) });
  const docRows = W.doc.rows.length ? W.doc.rows.map((r) => r.map((c) => fill(c, dc))) : domain === 'finance' ? W.companies.slice(0, 5).map((c, i) => [String(i + 1), c, money(Math.round(price * between(0.4, 2.6, `${seed}:dr:${i}`) / 50) * 50, cur)]) : itemNames.slice(0, 4).map((it, i) => [String(i + 1), it, money(products[i]?.value ? Number(String(products[i].value).replace(/[^0-9.]/g, '')) : price, cur)]);
  const doc = { number: domain === 'creator' ? '01' : undefined, brand: name, title: fill(W.doc.title, dc), accentWord: fill(W.doc.accent, dc), lead: fill(W.doc.lead, dc), section: fill(W.doc.section, dc), body: W.doc.body.map((t) => fill(t, dc)), table: { head: W.doc.head, rows: docRows, numbered: true } };
  if (!doc.number) delete doc.number;

  // the code
  const code = { ...W.code, code: codeFor(domain, { name, slug, itemNames, people, price, cur, date, topic, one, thing, seed, lessons: thumbs.map((t) => t.title) }), tabs: domain === 'devtool' ? ['api.ts', 'schema.sql'] : [] };

  // the answer
  const rc = ctx(1, { count, comments: comTotal, c1: int(60, 140, `${seed}:c1`), c2: int(30, 59, `${seed}:c2`), c3: int(12, 29, `${seed}:c3`), left: int(3, 9, `${seed}:rl`), left2: int(2, 8, `${seed}:rl2`), sold: int(40, 120, `${seed}:rs`), d: int(4, 15, `${seed}:rd`), total: money(Math.round(price * 3.4 / 50) * 50, cur), company: W.companies?.[0], company2: W.companies?.[1], company3: W.companies?.[2], price: money(Math.round(price * 1.2 / 50) * 50, cur), price2: money(Math.round(price * 1.4 / 50) * 50, cur), price3: money(Math.round(price * 0.8 / 50) * 50, cur) });
  const reply = { ask: fill(W.reply.ask, rc), who: { name }, text: fill(W.reply.text, rc), items: W.reply.items.map((t, i) => ({ text: fill(t, rc), glyph: ['checkCircle', 'calendar', 'doc'][i % 3] })), close: fill(W.reply.close, rc) };

  // the site, the request, the covers (their figures are the other screens' own: the sales card is the payments header)
  const PG = PAGES[domain];
  const headline = b.headline ?? headlineOf(name, b.does);
  const joined = int(1200, 24000, `${seed}:joined`);
  const statOf = {
    creator: { title: 'Sales today', value: money(payTotal, cur), delta: `+${int(8, 34, `${seed}:sd1`)}% this week` },
    commerce: { title: 'Sales today', value: money(payTotal, cur), delta: `+${int(6, 28, `${seed}:sd1`)}% this week` },
    finance: { title: 'Paid this week', value: money(payTotal, cur), delta: `${int(88, 98, `${seed}:sd1`)}% on time` },
    assistant: { title: 'Hours saved', value: compact(subs), delta: `+${int(6, 19, `${seed}:sd1`)} this week` },
    devtool: { title: 'Average build', value: `${int(18, 70, `${seed}:secs:1`)} s`, delta: `${int(12, 40, `${seed}:sd1`)}% faster` },
    team: { title: 'Shipped this week', value: String(int(12, 48, `${seed}:sd1`)), delta: `${int(2, 9, `${seed}:sd2`)} more than last` },
  }[domain];
  const newest = notices[notices.length - 1];
  const site = {
    url: `${slug}.${PG.tld}`,
    brand: name,
    glyph: PG.glyph,
    nav: PG.nav,
    signIn: 'Sign in',
    cta: PG.cta,
    headline,
    accentWord: b.accent ?? accentOf(headline),
    lead: fill(PG.lead, ctx(0)),
    ctaAlt: PG.ctaAlt,
    notice: { title: newest.title, body: newest.body, ...(newest.photo ? { photo: newest.photo } : { logo: newest.app, glyph: newest.glyph }) },
    cards: [
      { kind: 'people', title: fill(PG.people[0], ctx(0)), value: `${joined.toLocaleString('en-US')} ${PG.people[1]}`, faces: people.slice(6, 10).map((p) => ({ name: p.name, photo: photo(p) })), tag: 'Live' },
      { kind: 'stat', ...statOf },
      { kind: 'photo', title: thumbs[0].title, sub: thumbs[0].meta },
    ],
  };
  const rq = PG.request;
  const rqCount = domain === 'creator' ? int(60, 140, `${seed}:c1`) : int(rq.range[0], rq.range[1], `${seed}:rq`);
  const request = { label: rq.label, text: fill(rq.text, ctx(0)), people: people.slice(10, 13).map((p) => ({ name: p.name, photo: photo(p) })), count: rqCount, countLabel: rq.countLabel };
  const cover = {
    kicker: name,
    items: (PG.covers ?? itemNames.slice(0, 3).map((it, i) => [it, products[i]?.sub ?? ''])).slice(0, 3).map(([t, sub], i) => {
      const title = fill(t, ctx(i, { Mon: MOL[d0.m - 1] }));
      const fig = title.split(/\s+/).find((w) => /\d/.test(w));
      return { title, ...(fig ? { accentWord: fig } : {}), sub: fill(sub, ctx(i, { n: int(8, 40, `${seed}:cn:${i}`) })) };
    }),
  };
  const cast = people.map((p) => ({ name: p.name, first: p.first, handle: p.handle, photo: photo(p) }));
  return {
    meta: { product: name, does: b.does ?? '', domain, date: d0.iso, weekday: WD[d0.wd], now: clock(now), seed, currency: cur },
    people: cast,
    prompt, url, profile, thumbs,
    comments: { comments, header: { label: fill(W.commentLabel, { n: '{n}' }), total: comTotal } },
    notices: { items: notices },
    payments: { items: payRows, header: { title: W.payments, value: payTotal, money: true, currency: cur } },
    products: { items: products },
    steps, progress, plans, doc, code, reply, site, request, cover,
    _cast: people,
    // the pictures' search words: the brief's own, else what the world's grid shows (places for an assistant's bookings,
    // desks for a tool's templates), else the product's topic
    _photos: b.photos ? b.photos.split(',').map((s) => s.trim()).filter(Boolean) : W.photos ?? [topic, `${one} close up`, title(one)],
    _thumbCats: !b.photos && W.photos && thumbCats.some((k) => k !== null) ? thumbCats : null,
  };
};

/** A code file in the product's own words: data, a component or a plan, about twenty lines. */
const codeFor = (domain, o) => {
  const items = o.itemNames;
  if (domain === 'devtool')
    return [
      `import { db } from './db';`,
      `import { sendEmail } from './email';`,
      ``,
      `// ${o.name}: a booking page with free slots and checkout`,
      `export async function bookSession(clientId: string, slot: Date) {`,
      `  const taken = await db.bookings.find({ slot });`,
      `  if (taken) throw new Error('That time was just booked');`,
      ``,
      `  const booking = await db.bookings.create({`,
      `    clientId,`,
      `    slot,`,
      `    price: ${Math.round(o.price * 100)},`,
      `    status: 'confirmed',`,
      `  });`,
      ``,
      `  await sendEmail(clientId, 'booking-confirmed', { slot });`,
      `  return booking;`,
      `}`,
      ``,
      `export const openSlots = (day: Date) =>`,
      `  db.slots.where({ day, booked: false }).orderBy('start');`,
    ].join('\n');
  if (domain === 'creator')
    return [
      `// ${o.name}: the ${o.thing}, built from the channel`,
      `export const course = {`,
      `  title: '${items[0].replace(/'/g, '’')}',`,
      `  price: ${o.price},`,
      `  // the channel's most watched videos, in teaching order`,
      `  lessons: [`,
      ...(o.lessons?.length ? o.lessons : items).slice(0, 4).map((it, i) => `    { week: ${i + 1}, title: '${it.replace(/'/g, '’')}', minutes: ${int(8, 24, `${o.seed}:lm:${i}`)} },`),
      `  ],`,
      `  bonus: ['Printable plan', 'Shopping list', 'Q&A replay'],`,
      `};`,
      ``,
      `export const totalMinutes = course.lessons`,
      `  .reduce((sum, l) => sum + l.minutes, 0);`,
    ].join('\n');
  if (domain === 'team') return [`# Launch plan`, ``, `## Owners`, ...o.people.slice(1, 4).map((p, i) => `- ${['Design freeze', 'Launch email', 'Press kit'][i]}: ${p.first}`), ``, `## Dates`, `- Freeze: ${short(dayOf(o.date, 3))}`, `- Review: ${short(dayOf(o.date, 4))}`, `- Launch: ${short(dayOf(o.date, 10))}`, ``, `## Open questions`, `- Final pricing for teams`, `- Who hosts the live demo`].join('\n');
  const rows = domain === 'finance'
    ? WORLDS.finance.companies.slice(0, 4).map((c, i) => `  { "id": "INV-${1100 + i * 7}", "client": "${c}", "amount": ${Math.round(o.price * (0.6 + i * 0.4))}, "due": "${dayOf(o.date, i * 3 - 2).iso}" }`)
    : domain === 'assistant'
      ? o.people.slice(1, 5).map((p, i) => `  { "time": "${clock(9 * 60 + i * 75)}", "with": "${p.first}", "what": "${['Venue walkthrough', 'Contract review', 'Team sync', 'Call with the bank'][i]}" }`)
      : items.slice(0, 4).map((it, i) => `  { "sku": "${o.slug.slice(0, 3).toUpperCase()}-${100 + i}", "name": "${it}", "price": ${charm(o.price * (0.6 + i * 0.4))}, "stock": ${int(3, 60, `${o.seed}:stk:${i}`)} }`);
  return ['[', rows.join(',\n'), ']'].join('\n');
};

// ------------------------------------------------------------------------------------------------ fetching
const get = async (u, ms = 30000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA, accept: 'text/html,image/*' }, signal: c.signal, redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } finally {
    clearTimeout(t);
  }
};
const hasFfmpeg = () => spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).status === 0;

/**
 * One grade for the whole cast, so the faces read as one shoot and not as portraits from unrelated sessions (a yellow
 * wall, a navy backdrop, a red shirt side by side in one row): colour held back, the same contrast, and the corners of
 * the square (the backdrop round the avatar's circle) falling off a little.
 */
const FACE_GRADE = 'eq=saturation=0.78:contrast=1.03,vignette=angle=PI/5';
/** The cast's faces: download, crop to the face, grade them as one set, 512 px. Returns the ids written. */
const fetchFaces = async (cast, dir, record) => {
  fs.mkdirSync(dir, { recursive: true });
  const ff = hasFfmpeg();
  const done = [];
  for (const p of cast) {
    const out = path.join(dir, `${p.face.id}.jpg`);
    if (fs.existsSync(out)) { done.push(p.face.id); continue; }
    const src = PEOPLE.cdn.replace('{slug}', p.face.slug).replace('{width}', '1000');
    try {
      const buf = Buffer.from(await (await get(src)).arrayBuffer());
      const tmp = `${out}.src.jpg`;
      fs.writeFileSync(tmp, buf);
      const [cx, cy, cw, ch] = p.face.crop;
      const r = ff ? spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-vf', `crop=iw*${cw}:ih*${ch}:iw*${cx}:ih*${cy},scale=512:512:flags=lanczos,${FACE_GRADE}`, '-q:v', '3', out], { encoding: 'utf8' }) : { status: 1 };
      if (r.status !== 0) fs.copyFileSync(tmp, out);
      fs.unlinkSync(tmp);
      done.push(p.face.id);
      record.push({ file: path.relative(path.dirname(path.dirname(dir)), out).replace(/\\/g, '/'), source: 'Burst', page: PEOPLE.page.replace('{slug}', p.face.slug), licence: PEOPLE.licence.name, licence_url: PEOPLE.licence.url, credit: false, use: 'a user inside a product screen', checked: PEOPLE.licence.checked });
    } catch (e) {
      console.log(`  face ${p.face.id}: ${e.message} (the screen draws a coloured initial disc)`);
    }
  }
  return done;
};

/**
 * Pictures for the grid, through scripts/assets.mjs (its search reads each photo's own licence page and keeps only
 * licences that need no credit; its get writes the private licence record): one search per word, landscape, the hits
 * shuffled by the seed and taken in turn across the words, each saved as thumbs/t01.jpg ... at 1280 px.
 * The words' own pictures come first, so a grid about pasta shows pasta. Returns the file names written, in order.
 */
const fetchThumbs = async (words, n, dir, seed, cats = null) => {
  fs.mkdirSync(dir, { recursive: true });
  const assets = path.join(HERE, 'assets.mjs');
  const tmp = path.join(path.dirname(dir), '..', 'out', 'assets');
  fs.mkdirSync(tmp, { recursive: true });
  const run = (args) => spawnSync(process.execPath, [assets, ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const per = Math.ceil(n / Math.max(1, words.length)) + 2;
  const lists = [];
  for (const q of words) {
    const out = path.join(tmp, `content-thumbs-${slugify(q) || 'q'}.json`);
    // Burst first (food, objects and places, no credit), then the other keyless photo sources when it is busy or has
    // nothing (it rate-limits a run of searches for ten minutes)
    let r = null;
    for (const source of ['burst', 'isorepublic', 'openverse']) {
      r = run(['search', q, '--kind', 'photo', '--source', source, '--orientation', 'landscape', '--min-width', '1200', '--no-vet', '--limit', String(per + 4), '--out', out]);
      if (r.status === 0 && fs.existsSync(out)) break;
    }
    if (!r || r.status !== 0 || !fs.existsSync(out)) { console.log(`  pictures "${q}": no results (${(r?.stderr || r?.stdout || '').trim().split('\n').pop()})`); lists.push({ out, items: [] }); continue; }
    const doc = JSON.parse(fs.readFileSync(out, 'utf8'));
    const ok = (doc.items ?? []).filter((it) => it.licence !== 'unknown' && !/(logo|text|sign|letter|quote|mockup|screen)/i.test(it.title ?? ''));
    // a 16:9 thumbnail crops a landscape photo least: landscape first (a source may ignore the orientation filter)
    const wide = (it) => (it.width && it.height ? it.width >= it.height * 1.2 : true);
    const mixed = shuffle(ok, `${seed}:${q}`);
    lists.push({ out, items: [...mixed.filter(wide), ...mixed.filter((it) => !wide(it))].slice(0, per) });
  }
  let chosen = [];
  if (cats) {
    // each title takes the next photo of the word it names
    const used = lists.map(() => 0);
    chosen = Array.from({ length: n }, (_, i) => {
      const k = cats[i] ?? i % lists.length;
      const it = lists[k]?.items[used[k]];
      if (!it) return null;
      used[k]++;
      return { out: lists[k].out, it };
    });
  } else for (let k = 0; chosen.length < n && lists.some((l) => l.items[k]); k++) for (const l of lists) if (l.items[k] && chosen.length < n) chosen.push({ out: l.out, it: l.items[k] });
  const files = [];
  // which photo each file holds (refs.json beside them): a file left by an earlier, different search is fetched again
  const refsFile = path.join(dir, 'refs.json');
  const refs = fs.existsSync(refsFile) ? JSON.parse(fs.readFileSync(refsFile, 'utf8')) : {};
  for (let i = 0; i < chosen.length; i++) {
    if (!chosen[i]) continue;
    const stem = `t${String(i + 1).padStart(2, '0')}`;
    const ref = chosen[i].it.ref;
    if (!fs.existsSync(path.join(dir, `${stem}.jpg`)) || (refs[stem] && refs[stem] !== ref)) {
      const r = run(['get', ref, '--from', chosen[i].out, '--to', dir, '--name', stem, '--width', '1280']);
      if (r.status !== 0) { console.log(`  picture ${ref}: ${(r.stderr || '').trim().split('\n').pop()}`); continue; }
      refs[stem] = ref;
    } else if (!refs[stem]) refs[stem] = ref;
    const f = fs.readdirSync(dir).find((x) => x.startsWith(`${stem}.`));
    if (f) files[i] = f; // aligned with the titles: a picture that did not come down leaves its title a poster
  }
  fs.writeFileSync(refsFile, JSON.stringify(refs, null, 1));
  return files;
};

// ------------------------------------------------------------------------------------------------ writing
const toTs = (c, date) => {
  const json = JSON.stringify(c, null, 2).replace(/"@static:([^"]+)"/g, (m, p) => `img('${p}')`);
  // the picture helper only when a picture uses it: an unused one fails tsc (noUnusedLocals) in a film with no photos
  const pics = /\bimg\('/.test(json);
  return `// The film's screen content, written by scripts/content.mjs from the brief on ${date} (seed "${c.meta.seed}", world "${c.meta.domain}").
// Keep what is true of the product and change the rest; then node scripts/content.mjs --check. Spread the parts into the
// screens of src/kit/screens: <CommentFeed {...CONTENT.comments} />, <PromptBar {...CONTENT.prompt} at={12} />.
${pics ? "import { staticFile } from 'remotion';\n" : ''}import type { FilmContent } from './kit/screens';
${pics ? '\nconst img = (p: string) => staticFile(p);\n' : ''}
export const CONTENT: FilmContent = ${json};
`;
};

const setFilmDate = (film, iso) => {
  const f = path.join(film, 'src', 'kit', 'real.ts');
  if (!fs.existsSync(f)) return false;
  const s = fs.readFileSync(f, 'utf8');
  const next = s.replace(/export const FILM_DATE = '\d{4}-\d{2}-\d{2}';/, `export const FILM_DATE = '${iso}';`);
  if (next !== s) fs.writeFileSync(f, next);
  return next !== s;
};

/** The checks of kit/screens/content.ts checkContent, in plain JS, on the written JSON. */
const check = (c) => {
  const bad = [];
  const d = dayOf(c.meta.date);
  if (WD[d.wd] !== c.meta.weekday) bad.push(`meta.weekday says ${c.meta.weekday} but ${c.meta.date} is a ${WD[d.wd]}`);
  const num = (s) => Number(String(s ?? '').replace(/[^0-9.-]/g, '')) || 0;
  if (new Set(c.people.map((p) => p.name)).size !== c.people.length) bad.push('a name repeats in the cast');
  if (new Set(c.people.map((p) => p.handle)).size !== c.people.length) bad.push('a handle repeats in the cast');
  const sum = Math.round(c.payments.items.reduce((a, r) => a + num(r.value), 0) * 100) / 100;
  if (Math.abs(sum - c.payments.header.value) > 0.005) bad.push(`the payments header says ${c.payments.header.value} but the rows sum to ${sum}`);
  if (c.comments.header.total < c.comments.comments.length) bad.push('the comment count is smaller than the comments shown');
  const ph = c.comments.comments.map((x) => x.photo).filter(Boolean);
  if (new Set(ph).size !== ph.length) bad.push('one face is two commenters');
  for (const p of c.plans.plans) if (!p.features.length) bad.push(`plan ${p.name} lists no features`);
  if (c.doc.table.rows.some((r) => r.length !== c.doc.table.head.length)) bad.push('a table row has the wrong number of cells');
  if (c.request && c.request.count < c.request.people.length) bad.push('the request count is smaller than the faces shown');
  if (c.cover && c.cover.items.some((it) => !it.title)) bad.push('a cover has no title');
  if (c.site && !c.site.headline) bad.push('the site has no headline');
  if (c.site && c.site.accentWord && !c.site.headline.toLowerCase().includes(c.site.accentWord.toLowerCase())) bad.push(`the site's accent "${c.site.accentWord}" is not in its headline`);
  // the words on screen: every string value (never a key), a picture path aside
  const values = [];
  const walk = (v) => { if (typeof v === 'string') { if (!v.startsWith('@static:')) values.push(v); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(c);
  const strings = values.join('\n');
  for (const w of ['lorem', 'ipsum', 'placeholder', 'john doe', 'jane doe', 'acme', 'example.com', 'user123']) if (strings.toLowerCase().includes(w)) bad.push(`"${w}" is in the content`);
  const slots = (strings.match(/\{\w+\}/g) ?? []).filter((x) => x !== '{n}');
  if (slots.length) bad.push(`a template slot is left: ${slots.slice(0, 3).join(', ')}`);
  return bad;
};

const readTs = (file) => {
  const s = fs.readFileSync(file, 'utf8');
  const i = s.indexOf('export const CONTENT');
  const body = s.slice(s.indexOf('=', i) + 1).trim().replace(/;\s*$/, '').replace(/img\('([^']+)'\)/g, '"@static:$1"');
  return JSON.parse(body);
};

// ------------------------------------------------------------------------------------------------ main
const main = async () => {
  if (flag('--domains')) {
    for (const [k, w] of Object.entries(WORLDS)) console.log(`${k.padEnd(10)} ${w.about}\n${''.padEnd(10)} topic "${w.topic}", thing "${w.thing}", link ${w.url.tpl}, mark ${w.logo}`);
    console.log('\nbrief keys: name, does, domain, topic, thing, items (;), price, currency, url, logo, channel, prompt, photos (,), people, date, seed, audience, headline, accent');
    return 0;
  }
  if (flag('--check')) {
    const file = argv.find((a, i) => i > argv.indexOf('--check') && !a.startsWith('--')) ?? 'src/content.ts';
    if (!fs.existsSync(file)) { console.error(`content: no ${file} (write it: node scripts/content.mjs --brief BRIEF.md)`); return 1; }
    const bad = check(readTs(file));
    if (bad.length) { console.log(`content: ${file} no longer adds up:\n  - ${bad.join('\n  - ')}`); return 1; }
    console.log(`content: ${file} adds up`);
    return 0;
  }
  const b = fromArgs();
  if (!b.name) { console.error('content: give the product: --brief BRIEF.md (a ```content block or name: lines) or --name "<Product>"'); return 2; }
  const today = new Date();
  const date = val('--date') ?? b.date ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  try { dayOf(date); } catch (e) { console.error(`content: ${e.message}`); return 2; }
  const out = path.resolve(val('--out') ?? 'src/content.ts');
  const film = path.dirname(path.dirname(out));
  if (fs.existsSync(out) && !flag('--force') && !flag('--check')) { console.error(`content: ${path.relative(process.cwd(), out)} exists (it may hold your edits); --force writes it again`); return 1; }
  const c = build(b, date);
  const cast = c._cast;
  const words = c._photos;
  const cats = c._thumbCats;
  delete c._cast;
  delete c._photos;
  delete c._thumbCats;
  if (flag('--fetch')) {
    const pub = path.resolve(val('--to') ?? path.join(film, 'public'));
    const record = [];
    console.log(`content: fetching ${cast.length} faces and 9 pictures ("${words.join('", "')}") into ${path.relative(process.cwd(), pub) || '.'}`);
    const faces = new Set(await fetchFaces(cast, path.join(pub, 'people'), record));
    const thumbs = await fetchThumbs(words, c.thumbs.length, path.join(pub, 'thumbs'), c.meta.seed, cats);
    c.thumbs.forEach((t, i) => { if (thumbs[i]) t.src = `@static:thumbs/${thumbs[i]}`; });
    const thumbSrc = (i) => (thumbs[i] ? `@static:thumbs/${thumbs[i]}` : undefined);
    if (thumbs.some(Boolean)) {
      c.steps.thumb = thumbSrc(0);
      c.products.items.forEach((it, i) => { if (thumbSrc(i + 1) && (c.meta.domain === 'creator' || c.meta.domain === 'commerce')) { it.thumb = thumbSrc(i + 1); delete it.glyph; } });
      c.doc.figure = c.meta.domain === 'creator' || c.meta.domain === 'commerce' ? thumbSrc(2) : undefined;
      if (!c.doc.figure) delete c.doc.figure;
      // the site's hero and its picture card, the covers' photos: from the same set, never one picture twice on a screen;
      // when a picture did not come down, another one that did takes its place
      const avail = c.thumbs.map((t) => t.src).filter(Boolean);
      const take = (prefer, used) => { const want = thumbSrc(prefer); return want && !used.includes(want) ? want : avail.find((s) => !used.includes(s)) ?? avail[0]; };
      const used = [];
      if (c.site) {
        c.site.hero = take(5, used);
        used.push(c.site.hero);
        const card = c.site.cards.find((k) => k.kind === 'photo');
        if (card) card.src = take(0, used);
      }
      if (c.cover) {
        const onCovers = [c.site?.hero].filter(Boolean);
        c.cover.items.forEach((it, i) => { it.photo = take(i === 0 ? 0 : i + 5, onCovers); onCovers.push(it.photo); });
      }
    }
    // a face that did not come down: that person shows the product's coloured initial disc
    const drop = (o) => { if (o && typeof o.photo === 'string' && /^@static:people\//.test(o.photo) && !faces.has(o.photo.replace(/^@static:people\/|\.jpg$/g, ''))) delete o.photo; };
    [c.profile, ...c.people, ...c.comments.comments, ...c.notices.items, ...c.payments.items, ...(c.request?.people ?? []), ...(c.site?.cards ?? []).flatMap((k) => k.faces ?? []), c.site?.notice].forEach(drop);
    const recFile = path.join(film, 'assets', 'licences.json');
    fs.mkdirSync(path.dirname(recFile), { recursive: true });
    const prev = fs.existsSync(recFile) ? JSON.parse(fs.readFileSync(recFile, 'utf8')) : [];
    const list = Array.isArray(prev) ? prev : prev.items ?? [];
    const merged = [...list.filter((r) => !record.some((x) => x.file === r.file)), ...record];
    fs.writeFileSync(recFile, JSON.stringify(Array.isArray(prev) ? merged : { ...prev, items: merged }, null, 1));
    console.log(`content: ${faces.size} faces, ${thumbs.filter(Boolean).length} pictures; licence record ${path.relative(process.cwd(), recFile)}`);
    // the real marks the screens name (the link's platform, the notifications' apps, an answer's items), through
    // scripts/logos.mjs, so a slug in content.ts resolves to the mark itself; a mark it cannot get stays a glyph tile
    const slugs = [...new Set([c.url.logo, ...c.notices.items.map((n) => n.app), ...c.reply.items.map((it) => it.logo)].filter((s) => typeof s === 'string' && s))];
    const logos = path.join(HERE, 'logos.mjs');
    const have = fs.existsSync(path.join(pub, 'logos', 'logos.json')) ? JSON.parse(fs.readFileSync(path.join(pub, 'logos', 'logos.json'), 'utf8')) : {};
    const known = new Set(Object.keys(have.logos ?? have.marks ?? have));
    for (const slug of slugs) {
      if (known.has(slug)) continue;
      const r = spawnSync(process.execPath, [logos, 'get', slug, '--film', film], { encoding: 'utf8' });
      console.log(r.status === 0 ? `  mark ${slug}: fetched` : `  mark ${slug}: not fetched (${(r.stderr || r.stdout || '').trim().split('\n').pop()}); it shows as a glyph tile`);
    }
  } else {
    // nothing fetched: no picture paths that do not exist (faces stay as paths only when public/people holds them)
    const pubPeople = path.join(film, 'public', 'people');
    const have = (o) => o && typeof o.photo === 'string' && fs.existsSync(path.join(pubPeople, o.photo.replace(/^@static:people\//, '')));
    [c.profile, ...c.people, ...c.comments.comments, ...c.notices.items, ...c.payments.items, ...(c.request?.people ?? []), ...(c.site?.cards ?? []).flatMap((k) => k.faces ?? []), c.site?.notice].forEach((o) => { if (o && o.photo && !have(o)) delete o.photo; });
  }
  const bad = check(c);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, toTs(c, date));
  if (setFilmDate(film, date)) console.log(`content: FILM_DATE set to ${date} in src/kit/real.ts`);
  console.log(`content: wrote ${path.relative(process.cwd(), out)} (world "${c.meta.domain}", ${c.people.length} people, ${c.meta.weekday} ${c.meta.date}, now ${c.meta.now})`);
  if (bad.length) { console.log(`content: check:\n  - ${bad.join('\n  - ')}`); return 1; }
  return 0;
};

main().then((code) => process.exit(code ?? 0), (e) => { console.error(`content: ${e.stack ?? e}`); process.exit(1); });
