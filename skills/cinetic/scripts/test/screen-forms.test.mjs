#!/usr/bin/env node
/**
 * screen-forms.test.mjs: every macro screen (src/kit/screens) says which of the spine's forms it draws and where each
 * one is on any frame (kit/screens/forms.ts), from the layout function it already has.
 *
 *   1. Each screen exports its part map (PROMPT_BAR_FORMS ...) and its forms function (promptBarForms ...); every part
 *      names a form of lib/spine FORMS and a focus box its layout draws.
 *   2. Each part's box on frames 0, 30 and 90 is its focus box at that frame (a caret while it types moves with it),
 *      its corner the focus box's own or the form's (round for a pill, a chip, a button).
 *   3. A part whose focus box the screen does not draw is left out (a model chip only when the bar has a model); a
 *      picked row, card or cell follows the screen's pick or highlight.
 *   4. placeForms places them as the screen is drawn in its scene (at x, y, scaled by k); formOf finds the first part
 *      that draws a form; the forms the list the screens draw cover the element's vocabulary a scene needs.
 *
 * It runs src through the starter's own tsx (npm install in assets/remotion-starter first).
 * Usage (from the skill root):  node scripts/test/screen-forms.test.mjs [--verbose]
 * Exit codes: 0 all pass, 1 a test failed (or the starter is not installed).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, '..', '..');
const STARTER = join(SKILL, 'assets', 'remotion-starter');
const SRC = join(STARTER, 'src');
const TSX = join(STARTER, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const verbose = process.argv.includes('--verbose');
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node scripts/test/screen-forms.test.mjs [--verbose]   (needs npm install in assets/remotion-starter)');
  process.exit(0);
}

let failed = 0;
const result = (ok, name, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${detail && (verbose || !ok) ? `  (${detail})` : ''}`);
};
if (!existsSync(TSX)) {
  console.log('FAIL  the Remotion starter is not installed: run npm install in assets/remotion-starter');
  process.exit(1);
}

const url = (p) => pathToFileURL(join(SRC, p)).href;
const PROBE = `
import * as K from '${url('kit/screens/index.ts')}';
import { FORMS } from '${url('lib/spine.ts')}';
const ctx = { pt: 2, fps: 30 };
const notices = [0, 1, 2].map((i) => ({ title: ['Noor joined', 'Mei joined', 'Ana joined'][i], body: 'Saturday Ceramics waitlist', ago: 'now' }));
const items = [0, 1, 2, 3].map((i) => ({ title: ['Wheel class', 'Glaze night', 'Kiln day', 'Open studio'][i], value: '$' + (20 + i * 5) }));
const S: Record<string, { map: any; fn: any; layout: any; props: any }> = {
  PromptBar: { map: K.PROMPT_BAR_FORMS, fn: K.promptBarForms, layout: K.promptBarLayout, props: { text: 'A waitlist page for my Saturday ceramics class', at: 0 } },
  UrlScan: { map: K.URL_SCAN_FORMS, fn: K.urlScanForms, layout: K.urlScanLayout, props: { url: 'pennant.page/ceramics', action: 'Publish', at: 0 } },
  RequestPill: { map: K.REQUEST_PILL_FORMS, fn: K.requestPillForms, layout: K.requestPillLayout, props: { text: 'A Saturday class', label: 'Asked by 12 people', people: [{ name: 'Noor Novak' }, { name: 'Mei Okafor' }] } },
  StepCard: { map: K.STEP_CARD_FORMS, fn: K.stepCardForms, layout: K.stepCardLayout, props: { title: 'Writing your page', steps: [{ label: 'Hero', at: 10 }, { label: 'Schedule', at: 40 }, { label: 'Sign-up form', at: 70 }] } },
  ProgressPill: { map: K.PROGRESS_PILL_FORMS, fn: K.progressPillForms, layout: K.progressPillLayout, props: { label: '{n} on the waitlist', to: 128 } },
  NoticeStack: { map: K.NOTICE_STACK_FORMS, fn: K.noticeStackForms, layout: K.noticeStackLayout, props: { items: notices, at: 0, every: 20 } },
  DocPage: { map: K.DOC_PAGE_FORMS, fn: K.docPageForms, layout: K.docPageLayout, props: { title: 'Saturday Ceramics', lead: 'A morning at the wheel', body: ['Saturdays 10 to 12, eight places.'], number: '128' } },
  BrowserWindow: { map: K.BROWSER_WINDOW_FORMS, fn: K.browserWindowForms, layout: K.browserWindowLayout, props: { url: 'pennant.page/ceramics', brand: 'Saturday Ceramics', cta: 'Join the waitlist', headline: 'Learn the wheel on Saturdays' } },
  ProfileCard: { map: K.PROFILE_CARD_FORMS, fn: K.profileCardForms, layout: K.profileCardLayout, props: { name: 'Noor Novak', stats: ['128 students'], action: 'Join' } },
  ChatReply: { map: K.CHAT_REPLY_FORMS, fn: K.chatReplyForms, layout: K.chatReplyLayout, props: { ask: 'Make me a waitlist page', text: 'Here is your page.', who: { name: 'Pennant' } } },
  CodePage: { map: K.CODE_PAGE_FORMS, fn: K.codePageForms, layout: K.codePageLayout, props: { code: 'export const page = 1;\\nexport const live = true;', file: 'page.ts', at: 0 } },
  CommentFeed: { map: K.COMMENT_FEED_FORMS, fn: K.commentFeedForms, layout: K.commentFeedLayout, props: { comments: notices.map((n) => ({ name: n.title.split(' ')[0], ago: '2m', text: 'When is the next Saturday class?' })), highlight: 1, header: { label: 'Comments', total: 3 } } },
  CoverStack: { map: K.COVER_STACK_FORMS, fn: K.coverStackForms, layout: K.coverStackLayout, props: { items: [{ title: 'Saturday Ceramics' }, { title: 'Glaze night' }] } },
  ItemList: { map: K.ITEM_LIST_FORMS, fn: K.itemListForms, layout: K.itemListLayout, props: { items, pick: { at: 0, index: 2 }, header: { title: 'Classes' } } },
  PriceCards: { map: K.PRICE_CARDS_FORMS, fn: K.priceCardsForms, layout: K.priceCardsLayout, props: { plans: [{ name: 'Drop-in', price: 25, features: ['One class'] }, { name: 'Term', price: 160, features: ['Eight classes'] }], pick: { at: 0, index: 1 } } },
  ThumbGrid: { map: K.THUMB_GRID_FORMS, fn: K.thumbGridForms, layout: K.thumbGridLayout, props: { items: items.map((i) => ({ title: i.title })), pick: { at: 0, index: 3 } } },
};
const out: any = {};
for (const [name, s] of Object.entries(S)) {
  const forms = s.fn(s.props, ctx);
  const parts: any = {};
  for (const [part, f] of Object.entries(forms) as any) {
    parts[part] = { form: f.form, focus: f.focus, at: [0, 30, 90].map((t) => ({ t, box: f.box(t), focus: s.layout(s.props, t, ctx).focus[f.focus] ?? null })) };
  }
  out[name] = { map: s.map, parts };
}
const withModel = K.promptBarForms({ text: 'Plan my week', at: 0, model: 'GPT-5.3' }, ctx);
const noModel = K.promptBarForms({ text: 'Plan my week', at: 0 }, ctx);
const placed = K.placeForms(noModel, 300, 200, 1.5);
const fb = noModel.send.box(30), pb = placed.send.box(30);
console.log(JSON.stringify({ out, FORMS, model: [Object.keys(withModel), Object.keys(noModel)], placed: { fb, pb }, formOf: [K.formOf(noModel, 'button')?.focus, K.formOf(noModel, 'mark')], drawn: K.formsDrawn(K.BROWSER_WINDOW_FORMS), radius: [K.formRadius('pill', { w: 300, h: 60 }), K.formRadius('card', { w: 600, h: 400 }, 2), K.formRadius('world', { w: 10, h: 10 })] }));
`;

const TMP = mkdtempSync(join(tmpdir(), 'cinetic-forms-'));
writeFileSync(join(TMP, 'probe.ts'), PROBE);
const r = spawnSync(process.execPath, [TSX, join(TMP, 'probe.ts')], { encoding: 'utf8', cwd: STARTER, maxBuffer: 64 * 1024 * 1024 });
rmSync(TMP, { recursive: true, force: true });
if (r.status !== 0) {
  console.log(`FAIL  the probe did not run: ${(r.stderr || r.stdout).trim().split('\n').slice(0, 8).join(' | ')}`);
  process.exit(1);
}
const P = JSON.parse(r.stdout.trim().split('\n').pop());
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// 1-2. maps, parts and boxes
const seen = new Set();
for (const [name, s] of Object.entries(P.out)) {
  const entries = Object.entries(s.map);
  result(entries.length > 0 && entries.every(([, v]) => Array.isArray(v) && P.FORMS.includes(v[0]) && typeof v[1] === 'string'), `${name}: its part map names forms of the spine (${entries.map(([k, v]) => `${k}=${v[0]}`).join(', ')})`);
  const parts = Object.entries(s.parts);
  result(parts.length > 0, `${name}: draws ${parts.length} parts as forms`);
  let ok = true;
  let detail = '';
  for (const [part, p] of parts) {
    seen.add(p.form);
    for (const a of p.at) {
      if (!a.focus) {
        if (a.box.w !== 0 || a.box.h !== 0) { ok = false; detail = `${part} at ${a.t}: a box without its focus box`; }
        continue;
      }
      const r0 = a.focus.r ?? null;
      const same = near(a.box.x, a.focus.x) && near(a.box.y, a.focus.y) && near(a.box.w, a.focus.w) && near(a.box.h, a.focus.h);
      const rOk = a.box.r >= 0 && a.box.r <= Math.min(a.box.w, a.box.h) / 2 + 1e-9 && (r0 === null || near(a.box.r, Math.min(r0, Math.min(a.box.w, a.box.h) / 2)));
      if (!same || !rOk) { ok = false; detail = `${part} at ${a.t}: ${JSON.stringify(a.box)} vs ${JSON.stringify(a.focus)}`; }
    }
  }
  result(ok, `${name}: every part's box is its focus box on frames 0, 30 and 90, with its corner`, detail);
}
{
  const caret = P.out.PromptBar.parts.caret.at;
  result(caret[2].box.x > caret[0].box.x, 'PromptBar: the caret part moves with the typing', JSON.stringify(caret.map((a) => Math.round(a.box.x))));
  const pill = P.out.PromptBar.parts.pill.at[0].box;
  result(near(pill.r, pill.h / 2), 'PromptBar: the pill is round (its corner half its height)');
}

// 3. optional and picked parts
result(P.model[0].includes('model') && !P.model[1].includes('model'), 'a part the screen does not draw is left out (the model chip only with a model)', JSON.stringify(P.model));
result(P.out.ItemList.parts.row.focus === 'row2' && P.out.PriceCards.parts.card.focus === 'card1' && P.out.ThumbGrid.parts.thumb.focus === 'thumb3' && P.out.CommentFeed.parts.row.focus === 'row1', 'a picked row, card or cell follows the pick (or the highlight)', JSON.stringify([P.out.ItemList.parts.row.focus, P.out.PriceCards.parts.card.focus, P.out.ThumbGrid.parts.thumb.focus, P.out.CommentFeed.parts.row.focus]));

// 4. placement and lookups
{
  const { fb, pb } = P.placed;
  result(near(pb.x, 300 + fb.x * 1.5) && near(pb.y, 200 + fb.y * 1.5) && near(pb.w, fb.w * 1.5) && near(pb.r, fb.r * 1.5), 'placeForms places a form as its screen is drawn (at x, y, scaled by k)', JSON.stringify(P.placed));
  result(P.formOf[0] === 'send' && P.formOf[1] === null, 'formOf finds the first part drawing a form (the send button), or none', JSON.stringify(P.formOf));
  result(P.drawn.includes('window') && P.drawn.includes('button') && P.drawn.includes('photo'), 'formsDrawn lists the forms a screen draws', P.drawn.join(' '));
  result(P.radius[0] === 30 && P.radius[1] === 56 && P.radius[2] === 0, 'formRadius: a pill is round, a card takes the panel corner, a world none', JSON.stringify(P.radius));
  const need = ['word', 'pill', 'chip', 'button', 'card', 'page', 'window', 'list', 'notice', 'thread', 'photo', 'count'];
  result(need.every((f) => seen.has(f)), `the screens draw every form a scene shows (${need.filter((f) => seen.has(f)).length} of ${need.length}: world and mark come from fx/world and the lockup)`, need.filter((f) => !seen.has(f)).join(' '));
}

console.log(failed ? `\n${failed} test(s) failed` : '\nall screen-forms tests passed');
process.exit(failed ? 1 : 0);
