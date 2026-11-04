// A house scene of the bank (src/scenes) as one scene of the stage: the scene's own component, filled with the case's
// words (src/spine.ts `props`, else from the case, the scene's `ui`, its act's line and src/content.ts), painted in the
// film's palette on the value it was designed on (src/palette.ts), played on its own clock fitted to its slot, its
// element handed over at both ends. The handover carries the element as a patch of the scene itself (the scene clipped
// to the element's box, scaled with it like a picture), while the scene draws everything else: its surroundings fade
// out under the leaving element and in round the arriving one, and its own copy of the element is cut out of it (a hole
// at the box) while the patch flies. A scene that opens on its own picture (no element to take over) receives the
// element as its whole frame: the element grows, opens or converges into the scene. Pure in the frame.
import React from 'react';
import { staticFile } from 'remotion';
import { C, FONT } from '../brand/tokens';
import { IDENTITY } from '../brand/identity';
import * as BRAND_LOGO from '../brand/logo';
import * as CONTENT_FILE from '../content';
import { CONTENT } from '../content';
import { TYPE_FEATURES } from '../fx/TypePairs';
import { clamp, E } from '../lib/anim';
import { toOklch } from '../lib/color';
import { BANK, type Box as BankBox, onScreen } from '../bank';
import { ACCENT, lookFor, paletteOn } from '../palette';
import { CLOSE, PICTURES, SPINE } from '../spine';
import { CAST, CLOSE_CAP, EASE, FACT_AT, f60x, FPS, H, handOut, lineOf, LOCK_RATE, SCENE_DEF, SCENES, SPINE_PLAN, W } from '../timeline';
import type { ElementLook, Moment, MomentKind, SceneDef } from './scenes';
import { BarFlood, barFloodMeta, floodBox, floodInk } from '../scenes/bar-flood';
import { BlobsToMark, blobsToMarkMeta } from '../scenes/blobs-to-mark';
import { DecodeTitle, decodeTitleMeta, decodeTitleOut } from '../scenes/decode-title';
import { GlassPrompt, glassPromptMeta } from '../scenes/glass-prompt';
import { GlossOrbit, glossOrbitMeta } from '../scenes/gloss-orbit';
import { HeldProductWord, heldProductWordMeta } from '../scenes/held-product-word';
import { IrisInput, irisInputMeta } from '../scenes/iris-input';
import { KeyGlow, keyGlowMeta } from '../scenes/key-glow';
import { LineToWordmark, lineToWordmarkDur, lineToWordmarkMeta } from '../scenes/line-to-wordmark';
import { MacroType, macroTypeDur, macroTypeMeta } from '../scenes/macro-type';
import { OrbitChips, orbitChipsMeta } from '../scenes/orbit-chips';
import { PageFly, pageFlyMeta } from '../scenes/page-fly';
import { PhotoCounters, photoCountersMeta } from '../scenes/photo-counters';
import { PhotoRiver, photoRiverDur, photoRiverMeta } from '../scenes/photo-river';
import { PortholeLine, portholeLineMeta } from '../scenes/porthole-line';
import { PrismLight, prismLightMeta } from '../scenes/prism-light';
import { RingDive, ringDiveMeta } from '../scenes/ring-dive';
import { ScanGrid, scanGridMeta } from '../scenes/scan-grid';
import { ToastStack, toastStackMeta } from '../scenes/toast-stack';
import { TypeFlip, typeFlipMeta } from '../scenes/type-flip';
import { WordBuildBadge, wordBuildBadgeDur, wordBuildBadgeMeta } from '../scenes/word-build-badge';
import { WordCards, wordCardsMeta } from '../scenes/word-cards';
import { CardRivers, cardRiversMeta } from '../scenes/card-rivers';
import { PhonePullback, phonePullbackMeta } from '../scenes/phone-pullback';
import { PhotoOrbit, photoOrbitMeta } from '../scenes/photo-orbit';
import { RibbonRing, ribbonRingMeta } from '../scenes/ribbon-ring';
import { RoomPush, roomPushMeta } from '../scenes/room-push';
import { SiteFlip, siteFlipMeta } from '../scenes/site-flip';
import { StreetPoster, streetPosterDur, streetPosterMeta } from '../scenes/street-poster';
import type { SceneMeta } from '../scenes/parts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/**
 * The scenes that draw three.js on a GPU (cloud-dome, crystal-hall, object-window) load with their first frame
 * (React.lazy: the render waits for the module, as for any lazy component), so a film that never deals them never
 * loads three.js, and the node-side readers (the timeline, src/sync.ts, the tests) never import it. On software GL
 * they draw their 2D projection (fx/three/gl draws3D). Their meta numbers are copied here for the timeline's side
 * and checked against the real meta when the module loads.
 */
const lazyScene = (id: string, load: () => Promise<{ C: React.FC<Any>; meta: SceneMeta }>): React.FC<Any> =>
  React.lazy(() =>
    load().then(({ C: Comp, meta }) => {
      const ours = META3D[id];
      if (ours && (ours.dur !== meta.dur || ours.cues.map((q) => `${q.f}${q.kind}`).join() !== meta.cues.map((q) => `${q.f}${q.kind}`).join()))
        console.warn(`acts/bank: ${id}'s copied meta (META3D) differs from its scene's meta: copy the meta's numbers`);
      return { default: Comp };
    }),
  );
const META3D: Record<string, SceneMeta> = {
  'cloud-dome': {
    id: 'cloud-dome', does: 'the line on a pale sky; the camera tilts down through a rushing cloud onto the product under a glass dome above a cloud sea', dur: 84,
    props: ['line', 'plate', 'screen?', 'logo?', 'icons?', 'palette?', 'gl?'], handIn: { form: 'word', x: 330, y: 430, w: 1260, h: 202 }, handOut: { form: 'world', x: 0, y: 0, w: 1920, h: 1080 }, klass: 'big',
    cues: [{ f: 4, kind: 'riser', id: 'tilt', weight: 0.4 }, { f: 17, kind: 'whoosh', id: 'cloud-rush', weight: 0.9 }, { f: 27, kind: 'land', id: 'diorama', weight: 0.7 }, { f: 29, kind: 'swell', id: 'glass', weight: 0.5 }, { f: 80, kind: 'whoosh', id: 'push-cut', weight: 0.7 }],
  },
  'crystal-hall': {
    id: 'crystal-hall', does: 'a sphere flies into a dark hall of glowing grid walls and lands; a glass octahedron forms round it and fills with light', dur: 78,
    props: ['logo?', 'palette?', 'gl?'], handIn: null, handOut: { form: 'mark', x: 765, y: 338, w: 390, h: 524 }, klass: 'big',
    cues: [{ f: 0, kind: 'whoosh', id: 'sphere', weight: 0.6 }, { f: 10, kind: 'land', id: 'landing', weight: 0.6 }, { f: 12, kind: 'swell', id: 'crystal', weight: 0.5 }, { f: 18, kind: 'hit', id: 'cone', weight: 0.8 }, { f: 58, kind: 'riser', id: 'fill', weight: 0.5 }, { f: 61, kind: 'bell', id: 'flash', weight: 0.7 }],
  },
  'object-window': {
    id: 'object-window', does: 'a glass app window rises holding the mark as a solid; it turns, the camera pushes in, a pointer marks a spot and presses the confirm pill', dur: 84,
    props: ['logo?', 'done?', 'spot?', 'palette?', 'pointer?', 'gl?'], handIn: { form: 'window', x: 440, y: 311, w: 1031, h: 687, r: 82 }, handOut: { form: 'window', x: 270, y: 82, w: 1390, h: 926, r: 110 }, klass: 'big',
    cues: [{ f: 0, kind: 'whoosh', id: 'window-rises', weight: 0.4 }, { f: 12, kind: 'whoosh', id: 'turn', weight: 0.5 }, { f: 30, kind: 'swell', id: 'push', weight: 0.4 }, { f: 58, kind: 'click', id: 'mark-spot', weight: 0.7 }, { f: 59, kind: 'pop', id: 'marker', weight: 0.5 }, { f: 74, kind: 'click', id: 'done', weight: 0.7 }],
  },
};
const CloudDome = lazyScene('cloud-dome', () => import('../scenes/cloud-dome').then((m) => ({ C: m.CloudDome as React.FC<Any>, meta: m.cloudDomeMeta })));
const CrystalHall = lazyScene('crystal-hall', () => import('../scenes/crystal-hall').then((m) => ({ C: m.CrystalHall as React.FC<Any>, meta: m.crystalHallMeta })));
const ObjectWindow = lazyScene('object-window', () => import('../scenes/object-window').then((m) => ({ C: m.ObjectWindow as React.FC<Any>, meta: m.objectWindowMeta })));
/** Each bank scene's component, its meta entry, its real length for the props it plays (frames at 30 fps) and, where
 * its layout follows its words, the element it hands on for those props (`out`). */
const SCENE: Record<string, { C: React.FC<Any>; meta: SceneMeta; dur?: (p: Any) => number; out?: (p: Any) => BankBox; inAt?: (t30: number) => BankBox }> = {
  'macro-type': { C: MacroType, meta: macroTypeMeta, dur: (p) => macroTypeDur(String(p.text ?? '')) },
  'glass-prompt': { C: GlassPrompt, meta: glassPromptMeta },
  'iris-input': { C: IrisInput, meta: irisInputMeta },
  'page-fly': { C: PageFly, meta: pageFlyMeta },
  'scan-grid': { C: ScanGrid, meta: scanGridMeta },
  'decode-title': { C: DecodeTitle, meta: decodeTitleMeta, out: (p) => decodeTitleOut(String(p.title ?? ''), String(p.cta ?? '')) as BankBox },
  'porthole-line': { C: PortholeLine, meta: portholeLineMeta },
  'gloss-orbit': { C: GlossOrbit, meta: glossOrbitMeta },
  'prism-light': { C: PrismLight, meta: prismLightMeta },
  'toast-stack': { C: ToastStack, meta: toastStackMeta },
  'key-glow': { C: KeyGlow, meta: keyGlowMeta },
  'word-cards': { C: WordCards, meta: wordCardsMeta },
  'photo-counters': { C: PhotoCounters, meta: photoCountersMeta },
  'photo-river': { C: PhotoRiver, meta: photoRiverMeta, dur: () => photoRiverDur() },
  'held-product-word': { C: HeldProductWord, meta: heldProductWordMeta },
  'ring-dive': { C: RingDive, meta: ringDiveMeta },
  'orbit-chips': { C: OrbitChips, meta: orbitChipsMeta },
  'type-flip': { C: TypeFlip, meta: typeFlipMeta },
  'cloud-dome': { C: CloudDome, meta: META3D['cloud-dome'] },
  'photo-orbit': { C: PhotoOrbit, meta: photoOrbitMeta },
  'card-rivers': { C: CardRivers, meta: cardRiversMeta },
  'site-flip': { C: SiteFlip, meta: siteFlipMeta },
  'ribbon-ring': { C: RibbonRing, meta: ribbonRingMeta },
  'phone-pullback': { C: PhonePullback, meta: phonePullbackMeta },
  'street-poster': { C: StreetPoster, meta: streetPosterMeta, dur: (p) => streetPosterDur(Array.isArray(p.plates) ? p.plates.length : 3) },
  'room-push': { C: RoomPush, meta: roomPushMeta },
  'crystal-hall': { C: CrystalHall, meta: META3D['crystal-hall'] },
  'object-window': { C: ObjectWindow, meta: META3D['object-window'] },
  'blobs-to-mark': { C: BlobsToMark, meta: blobsToMarkMeta },
  'line-to-wordmark': { C: LineToWordmark, meta: lineToWordmarkMeta, dur: (p) => lineToWordmarkDur(String(p.line ?? ''), p.tag) },
  'word-build-badge': { C: WordBuildBadge, meta: wordBuildBadgeMeta, dur: (p) => wordBuildBadgeDur(p.line) },
  // its element moves as it lands (the card shrinks to the bar, sinks, floods): the handover lands on the live box
  'bar-flood': { C: BarFlood, meta: barFloodMeta, inAt: (t) => ({ form: 'card', ...floodBox(t) }) },
};
// src/bank.ts mirrors the metas for the timeline (it may not import the scenes): a drift is a bug, said at load
for (const [id, e] of Object.entries(BANK)) {
  const m = SCENE[id]?.meta;
  if (!m) throw new Error(`acts/bank: src/bank.ts names "${id}", a scene this file does not draw`);
  const same = (a: BankBox | null, b: SceneMeta['handIn']) => (!a && !b) || (!!a && !!b && a.form === b.form && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2 && Math.abs(a.w - b.w) < 2 && Math.abs(a.h - b.h) < 2);
  if (!same(e.handIn, m.handIn) || !same(e.handOut, m.handOut) || (!e.durOf && Math.abs(e.dur - m.dur) > 1))
    console.warn(`acts/bank: src/bank.ts's "${id}" differs from its scene's meta (dur ${e.dur} / ${m.dur}, boxes): copy the meta's numbers`);
}

const FULL_BOX = { form: 'world' as const, x: 0, y: 0, w: W, h: H };
const C_WHITE = C.white;
const k30 = FPS / 30;
const LOGO = (BRAND_LOGO as { LOGO_STANDIN?: boolean }).LOGO_STANDIN === true ? undefined : BRAND_LOGO.LOGO;
/** A public/ path as a URL the scenes load (a URL or a data: stays as it is). */
const pic = (v: unknown): unknown => (typeof v === 'string' && v && !/^(https?:|data:|\/)/.test(v) && /\.(jpe?g|png|webp|avif|svg)$/i.test(v) ? staticFile(v) : v);
const PIC_KEYS = ['picture', 'photo', 'plate', 'product', 'hero', 'backdrop', 'second'];
const resolvePics = (p: Record<string, unknown>) => {
  const out: Record<string, unknown> = { ...p };
  for (const k of PIC_KEYS) if (k in out) out[k] = pic(out[k]);
  for (const k of ['images', 'photos', 'plates']) if (Array.isArray(out[k])) out[k] = (out[k] as unknown[]).map(pic);
  return out;
};
const split2 = (s: string): [string, string] => {
  const w = s.replace(/\*/g, '').split(/\s+/).filter(Boolean);
  const h = Math.ceil(w.length / 2);
  return [w.slice(0, h).join(' '), w.slice(h).join(' ')];
};
const GLYPHS = ['checkCircle', 'bell', 'mail', 'receipt', 'calendar'];
/** What src/content.ts gives the newer scenes (SCENE_CONTENT; a content file written without it: the defaults below). */
type SceneContent = { phone?: { search?: string; tabs?: readonly [string, string]; menu?: readonly [string, string]; nav?: readonly [string, string, string, string]; cards?: readonly Any[] }; plates?: { clouds?: string; street?: readonly Any[]; room?: Any } };
const SC: SceneContent = (CONTENT_FILE as unknown as { SCENE_CONTENT?: SceneContent }).SCENE_CONTENT ?? {};
const words0 = (s: string) => s.replace(/\*/g, '').split(/\s+/).filter(Boolean);
/** A short line of at most n words: its first n (a long line keeps its opening words). */
const shortLine = (s: string, n: number) => words0(s).slice(0, n).join(' ');
/**
 * cloud-dome's cloud sea when the film fetched no plate (SCENE_CONTENT.plates.clouds): a pale overcast sky over a soft
 * fractal cloud layer, cool and neutral, drawn as an SVG (no file to fetch).
 */
const CLOUD_SEA =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">' +
      '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d6e2"/><stop offset=".45" stop-color="#e6edf3"/><stop offset="1" stop-color="#f4f7fa"/></linearGradient>' +
      '<filter id="c" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".0026 .0068" numOctaves="5" seed="7"/>' +
      '<feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.1 1.55"/><feGaussianBlur stdDeviation="3"/></filter>' +
      '<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset=".3" stop-color="#000"/><stop offset=".55" stop-color="#fff"/></linearGradient><mask id="k"><rect width="1920" height="1080" fill="url(#m)"/></mask></defs>' +
      '<rect width="1920" height="1080" fill="url(#s)"/><g mask="url(#k)"><rect width="1920" height="1080" filter="url(#c)"/></g></svg>',
  );

/** A scene's content when its script gives none (or only some): the case, its strings, its act's line, the content. */
const fillOf = (i: number, id: string): Record<string, unknown> => {
  const def = SCENE_DEF[i];
  const ui = def?.ui ?? [];
  const cs = SPINE.case;
  const line = lineOf(i)?.text ?? SPINE.acts[SCENES[i].act]?.line?.text?.replace(/\*/g, '');
  const name = IDENTITY.name;
  const pics = (def?.props?.photos as string[] | undefined) ?? [];
  const allPics = pics.length ? pics : (def?.props?.images as string[] | undefined) ?? PICTURES;
  switch (id) {
    case 'macro-type':
      return { placeholder: ui[1] ?? CONTENT.prompt.placeholder, text: ui[0] ?? cs.request, click: true };
    case 'glass-prompt':
      return { label: name, placeholder: ui[1] ?? CONTENT.prompt.placeholder, prompt: ui[0] ?? cs.request, model: CONTENT.prompt.model };
    case 'iris-input':
      return { headline: line ?? ui[0] ?? cs.request, placeholders: [ui[0] ?? cs.request, ...ui.slice(1)], logo: LOGO };
    case 'page-fly':
      return { page: { ...CONTENT.doc, brand: name, title: ui[0] ?? CONTENT.doc.title } };
    case 'scan-grid':
      return { url: CONTENT.url.url, action: CONTENT.url.action, busy: CONTENT.url.busy, logo: CONTENT.url.logo };
    case 'decode-title':
      return { title: ui[0] ?? line ?? cs.result ?? name, cta: ui[1] ?? CONTENT.site?.cta ?? 'Get started', pointer: true };
    case 'porthole-line': {
      const [top, bottom] = ui.length >= 2 ? [ui[0], ui[1]] : split2(line ?? cs.result ?? name);
      return { top, bottom };
    }
    case 'toast-stack':
      return { items: CONTENT.notices.items.slice(0, 5).map((n, j) => ({ title: n.title, body: n.body, ago: n.ago, glyph: n.glyph ?? GLYPHS[j % GLYPHS.length] })) };
    case 'key-glow':
      return { items: (ui.length ? ui : CONTENT.steps.steps.map((s) => s.label)).slice(0, 3).map((label, j) => ({ label, glyph: GLYPHS[j % GLYPHS.length] })) };
    case 'word-cards':
      return { word: ui[0] ?? 'Plans', plans: CONTENT.plans.plans.slice(0, 3) };
    case 'photo-river':
      return { photos: pics };
    case 'ring-dive':
      return { title: name, images: pics, logo: LOGO };
    case 'type-flip': {
      const w = (line ?? ui[0] ?? name).split(/\s+/).filter(Boolean);
      return { word: w[0] ?? name, line: w.slice(1).join(' '), call: ui[1] ?? CONTENT.site?.cta ?? 'Get started', labels: ui.slice(2, 5) };
    }
    case 'cloud-dome': {
      const shot = def?.props?.screen as string | undefined;
      return { line: line ?? ui[0] ?? cs.result ?? name, plate: pic(SC.plates?.clouds) || CLOUD_SEA, screen: shot ? pic(shot) : undefined, logo: LOGO, gl: 'auto' };
    }
    case 'photo-orbit':
      return { line: shortLine(ui[0] ?? line ?? name, 4), images: allPics.map(pic) };
    case 'card-rivers': {
      const w = words0(line ?? cs.result ?? name);
      const second = ui[1] ?? w.filter((x) => x.length > 3).pop() ?? w[w.length - 1];
      return { words: second ? [ui[0] ?? name, second] : [ui[0] ?? name], images: allPics.map(pic) };
    }
    case 'site-flip':
      return CONTENT.site ? { site: { ...CONTENT.site, brand: name } } : {};
    case 'ribbon-ring': {
      if (ui.length >= 2) return { first: ui[0], second: ui[1] };
      const w = words0(line ?? cs.result ?? name);
      const k = w.length <= 2 ? 1 : Math.min(3, Math.ceil(w.length / 3));
      return w.length >= 2 ? { first: w.slice(0, w.length - k).join(' '), second: w.slice(w.length - k).join(' ') } : { first: name, second: w[0] ?? name };
    }
    case 'phone-pullback': {
      const ph = SC.phone ?? {};
      const cards = (ph.cards?.length ? ph.cards : [{ who: cs.names?.[0] ?? name, meta: 'now', title: cs.result ?? ui[0] ?? name }]).map((c: Any) => ({ ...c, photo: c.photo ? pic(c.photo) : undefined }));
      return { name, logo: LOGO, search: ph.search, tabs: ph.tabs, nav: ph.nav, menu: ui.length >= 2 ? [ui[0], ui[1]] : ph.menu ?? [ui[0] ?? 'New', 'Import'], cards };
    }
    case 'street-poster':
      return { plates: (SC.plates?.street ?? []).map((p: Any) => ({ ...p, src: pic(p.src) })), output: pic(allPics[0]) };
    case 'room-push':
      return SC.plates?.room ? { room: { ...SC.plates.room, src: pic(SC.plates.room.src) }, screen: pic(allPics[0]) } : {};
    case 'crystal-hall':
      return { logo: LOGO, gl: 'auto' };
    case 'object-window':
      return { logo: LOGO, done: ui[0] ?? 'Save', gl: 'auto' };
    case 'blobs-to-mark':
      return { name, logo: LOGO };
    case 'line-to-wordmark':
      return { line: line ?? CLOSE, name };
    case 'word-build-badge':
      return { line, name, logo: LOGO };
    case 'bar-flood':
      // the template sets the fact under the lockup itself (CLOSE, at CLOSE_CAP): the scene's own kicker stays empty
      return { name, logo: LOGO, kicker: '', cellAccent: true }; // the chip it is handed is already the accent
    default:
      return {};
  }
};

/** The sound action each of a scene's own cues voices (scripts/audio/actions.py). */
// lint-ok: sound action names (kinds to actions), never copy on screen
const ACTION: Record<string, string> = { tick: 'detent', tock: 'detent', key: 'type', click: 'press', whoosh: 'swipe', pop: 'appear', land: 'card-land', hit: 'reveal', swell: 'swell', riser: 'build', drop: 'thud', snap: 'lock', bell: 'chime', suck: 'shape', text: 'text' };

/** The scenes whose dark field is mixed from the palette's ink (crystal-hall's hall, object-window's field and pill). */
const INK_FIELD = new Set(['crystal-hall', 'object-window']);

/** The lockup's hold: it keeps creeping in once its own move is done, front-loaded, then the house rate (never a frozen end card). */
const creep = (t30: number) => (t30 <= 0 ? 1 : 1 + 0.035 * (1 - Math.exp(-t30 / 14)) + 0.001 * t30);

/** Plan scene i drawn by its house scene (CAST[i].bank). */
export const bankScene = (i: number): SceneDef => {
  const id = CAST[i].bank as string;
  const S = SCENE[id];
  if (!S) throw new Error(`acts/bank: no house scene "${id}" for scene ${i + 1}`);
  const sc = SCENES[i];
  const last = i === SCENES.length - 1;
  const raw = { ...fillOf(i, id), ...resolvePics(CAST[i].props) };
  // a colour flood floods with the brand's own accent (never the lifted one a dark ground reads its accents in)
  const pal0 = { ...paletteOn(CAST[i].design, CAST[i].ground), ...(id === 'bar-flood' ? { accent: ACCENT } : {}) };
  // the hall and the glass window mix their dark field from the ink: on a dark ground (where the ink is the light) they take the ground's dark
  const field = INK_FIELD.has(id) && toOklch(pal0.ink)[0] > toOklch(pal0.ground)[0] ? { ink: pal0.ground } : {};
  const pal = { ...pal0, ...field, ...((CAST[i].props.palette as object) ?? {}) };
  const props = { ...raw, palette: pal };
  const D = Math.max(2, Math.round((S.dur ? S.dur(raw) : S.meta.dur) * k30));
  const ho = handOut(i);
  const lead = ho && ho.kind !== 'cut' && ho.kind !== 'entry' && ho.draws === 'handover' ? ho.at - ho.span[0] : 0;
  const slot = sc.to - sc.from;
  // the clock: the whole scene inside its slot less the leaving element's lead, eased at most 1.2 x (slower than that
  // it plays at 1/1.2 and holds its last frame, creeping); the lockup at its own speed (timeline LOCK_RATE), then held
  const rate = last ? LOCK_RATE : Math.max(EASE[0], D / Math.max(1, slot - lead));
  const local = (f: number) => clamp(f * rate, 0, D - 1);
  const inBox = onScreen(S.meta.handIn) ? (S.meta.handIn as BankBox) : FULL_BOX;
  const outBox = (S.out ? S.out(raw) : S.meta.handOut) as BankBox;
  const look = lookFor(CAST[i].ground);
  const C0 = S.C;
  const holdT30 = (f: number) => Math.max(0, f - (D - 1) / rate) / k30;
  const scaleBox = (b: { x: number; y: number; w: number; h: number }, s: number) => ({ x: W / 2 + (b.x - W / 2) * s, y: H / 2 + (b.y - H / 2) * s, w: b.w * s, h: b.h * s });
  const side = (f: number): 'in' | 'out' => (f < slot / 2 ? 'in' : 'out');
  const boxAt = (f: number) => {
    if (side(f) === 'in' && S.inAt && inBox !== FULL_BOX) {
      const live = S.inAt(local(f) / k30);
      return { x: live.x, y: live.y, w: live.w, h: live.h };
    }
    const b = side(f) === 'in' ? inBox : outBox;
    return side(f) === 'out' && holdT30(f) > 0 ? scaleBox(b, creep(holdT30(f))) : { x: b.x, y: b.y, w: b.w, h: b.h };
  };
  const radius = (b: BankBox) => b.r ?? (b.form === 'world' ? 0 : Math.min(28, Math.min(b.w, b.h) * 0.12));
  /** The scene at a frame of its own clock, full frame (the patch translates it under its box). */
  const Frame: React.FC<{ fr: number }> = ({ fr }) => <C0 {...props} frame={fr} />;

  const el = (c: { f: number }): ElementLook => {
    const b = boxAt(c.f);
    const src = side(c.f) === 'in' ? inBox : outBox;
    const dark = look.tone === 'dark';
    const r0 = radius(src);
    const round = r0 >= 0.45 * Math.min(src.w, src.h);
    return {
      box: b,
      r: round ? 0.26 * Math.min(src.w, src.h) : r0,
      // no face of its own: the patch is the face (a chip arriving keeps its colour under the patch as it fades in)
      fill: undefined,
      rim: { color: C_WHITE, a: dark ? 0.32 : 0, w: 2 },
      shadow: { y: 6, blur: 30, a: dark ? 0 : 0.3 },
      picture: true,
    };
  };
  return {
    form: sc.form,
    Draw: ({ c }) => {
      const fr = local(c.f);
      const b = boxAt(c.f);
      const whole = b.x <= 1 && b.y <= 1 && b.w >= W - 2 && b.h >= H - 2;
      if (c.own < 0.999 && whole) return null; // the element is the whole frame: the handover draws all of it
      // the surroundings arrive round the landing element and leave under the leaving one (the ground stays): they
      // arrive fast (most of the way in the first third of the landing) and leave late, so the two overlap at the cut
      // and the element is never a speck alone on an empty ground
      const op = (c.land ? E.glideOut(clamp(c.inP * 1.6)) : 1) * (1 - E.buildIn(clamp(c.outP)));
      const hole =
        c.own < 0.999
          ? `path(evenodd, "M0 0H${W}V${H}H0Z M${b.x.toFixed(1)} ${b.y.toFixed(1)}h${b.w.toFixed(1)}v${b.h.toFixed(1)}h${(-b.w).toFixed(1)}Z")`
          : undefined;
      const s = holdT30(c.f) > 0 ? creep(holdT30(c.f)) : 1;
      const fact = last ? E.glideOut(clamp((c.F - FACT_AT) / f60x(18))) : 0;
      return (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: op, clipPath: hole, transformOrigin: `${W / 2}px ${H / 2}px`, transform: s !== 1 ? `scale(${s.toFixed(5)})` : undefined }}>
            <Frame fr={fr} />
          </div>
          {fact > 0.001 ? (
            <div data-text="close" style={{ position: 'absolute', left: 0, width: W, top: scaleBox(outBox, s).y + outBox.h * s + 54 + (1 - fact) * 16, textAlign: 'center', fontFamily: FONT.text, fontSize: Math.round((CLOSE_CAP * H) / 0.72), fontWeight: 520, color: id === 'bar-flood' ? floodInk(pal) : look.mute, opacity: fact, whiteSpace: 'pre', ...TYPE_FEATURES }}>
              {CLOSE}
            </div>
          ) : null}
        </div>
      );
    },
    el,
    Content: ({ c, w, h }) => {
      const out = side(c.f) === 'out';
      const b = out ? outBox : S.inAt && inBox !== FULL_BOX ? S.inAt(local(c.f) / k30) : inBox;
      const fr = out ? D - 1 : local(c.f);
      return (
        <div style={{ position: 'relative', width: w, height: h, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: (-b.x * w) / Math.max(1, b.w), top: (-b.y * h) / Math.max(1, b.h), width: (W * w) / Math.max(1, b.w), height: (H * h) / Math.max(1, b.h) }}>
            <div style={{ width: W, height: H, transformOrigin: '0 0', transform: `scale(${(w / Math.max(1, b.w)).toFixed(5)}, ${(h / Math.max(1, b.h)).toFixed(5)})` }}>
              <Frame fr={fr} />
            </div>
          </div>
        </div>
      );
    },
    // the scene's own designed cuts (its snaps, drops and hits); the lockup's hit is the film's one sound, never a cut
    cuts: () => S.meta.cues.filter((q) => q.kind === 'snap' || q.kind === 'drop' || (q.kind === 'hit' && !last)).map((q) => Math.round((q.f * k30) / rate)),
    // the scene's own sounds (its meta's cues) on its fitted clock; the lockup's hit is the film's one (src/sync.ts)
    moments: () =>
      S.meta.cues
        .filter((q) => !(last && q.kind === 'hit'))
        .map((q): Moment => ({ f: Math.round((q.f * k30) / rate), kind: q.kind as MomentKind, weight: Math.min(0.8, q.weight), action: ACTION[q.kind] ?? 'appear', id: `${id}-${q.id}` })),
  };
};

/** What the bank plays, for a print: each scene's house scene, its ground, its clock's rate. */
export const BANK_PRINT = () =>
  SCENES.map((s, i) => (CAST[i].bank ? `${s.name}: ${CAST[i].bank} on ${CAST[i].ground}${CAST[i].ff ? ' (opens on its own picture)' : ''}` : `${s.name}: a line on ${CAST[i].ground}`)).join('\n') + `\n${SPINE_PLAN.sentence}`;
