// Each change's house scene (src/scenes), filled with the change's own content (src/update.ts, src/content.ts) and painted
// in the film's colours (acts/look.tsx): the scene runs on the plan's clock (src/timeline.ts sceneFrame: its own frames,
// slower over the stretch at its rest when the film gives it more time). A scene that hands its element straight into
// the next one ends on it without its own last press (the next scene's pointer presses it); a scene whose press the scene
// before made plays its own pointer all the same: the press is the cut. Pictures and marks are the film's own files.
import React from 'react';
import { getRemotionEnvironment } from 'remotion';
import { LOGO, LOGO_SVG } from '../brand/logo';
import { SAMPLE_MARK_SVG } from '../brand/Mark';
import { CONTENT } from '../content';
import { PLATES, splitLine } from '../deal';
import {
  DecodeTitle, decodeTitleMeta, GlassPrompt, glassPromptMeta, MacroType, macroTypeDur, macroTypeMeta, MarkPullback, markPullbackMeta, OrbitChips, orbitChipsMeta,
  PageFly, pageFlyMeta, PhotoCounters, photoCountersMeta, PhotoRiver, photoRiverMeta, PortholeLine, portholeLineMeta, type SceneMeta, ToastStack, toastStackMeta,
  CardRivers, cardRiversMeta, CloudDome, cloudDomeMeta, CrystalHall, crystalHallMeta, ObjectWindow, objectWindowMeta, PhonePullback, phonePullbackMeta, PhotoOrbit, photoOrbitMeta,
  RibbonRing, ribbonRingMeta, RoomPush, roomPushMeta, SiteFlip, siteFlipMeta, StreetPoster, streetPosterMeta, type Quad, type StreetPlate,
} from '../scenes';
import { CHANGES, END_MOMENTS30, K30, MOMENTS30, pullbackFrame, sceneDur30, sceneFrame } from '../timeline';
import { pictureOf, photosOf, rowsOf, spokenChange, UPDATE } from '../update';
import { srcOf } from '../scenes/stage1080';
import { scenePalette } from './look';
import { toOklch } from '../lib/color';

/** The scenes' own meta entries: the template's numbers (src/deal.ts SCENE_SPEC, src/timeline.ts MOMENTS30) must match them. */
const METAS: Record<string, SceneMeta> = Object.fromEntries([decodeTitleMeta, glassPromptMeta, macroTypeMeta, markPullbackMeta, orbitChipsMeta, pageFlyMeta, photoCountersMeta, photoRiverMeta, portholeLineMeta, toastStackMeta, photoOrbitMeta, cardRiversMeta, siteFlipMeta, ribbonRingMeta, phonePullbackMeta, objectWindowMeta, crystalHallMeta, cloudDomeMeta, streetPosterMeta, roomPushMeta].map((m) => [m.id, m]));
/** In the Studio, a scene whose meta drifted from the template's copy of its numbers says so once. */
const checked = new Set<string>();
const checkMeta = (id: string, dur30: number) => {
  if (checked.has(id) || !getRemotionEnvironment().isStudio) return;
  checked.add(id);
  const meta = METAS[id];
  if (!meta) return;
  const ours = (id === 'mark-pullback' ? END_MOMENTS30 : MOMENTS30[id]?.(meta.dur) ?? []).map((x) => `${x.f}:${x.kind}`).join(' ');
  const theirs = meta.cues.map((x) => `${x.f}:${x.kind}`).join(' ');
  if (id !== 'macro-type' && meta.dur !== dur30) console.warn(`[update] scene ${id}: meta.dur ${meta.dur} but the template plays ${dur30} (src/deal.ts SCENE_SPEC)`);
  if (ours !== theirs) console.warn(`[update] scene ${id}: its cues ${theirs} but src/timeline.ts MOMENTS30 has ${ours}`);
};

/** A change's words without the accent marks, and its key word (or its longest word) for a scene that sets one word. */
const wordsOf = (c: (typeof UPDATE.changes)[number]) => spokenChange(c).split(/\s+/).filter(Boolean);
const keyOf = (c: (typeof UPDATE.changes)[number]) => (c.key ?? '').trim().split(/\s+/)[0] || wordsOf(c).slice().sort((a, b) => b.length - a.length)[0] || c.title;
/** cloud-dome's cloud sea when the film fetched no plate (src/deal.ts PLATES.clouds): a pale sky over a soft fractal cloud layer, drawn as an SVG. */
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

/** The product's mark for the scenes that draw it: the brand's, or none (the scene paints the starter's mark in the film's colours). */
export const brandLogo = LOGO_SVG === SAMPLE_MARK_SVG ? undefined : LOGO;

/** Change i's scene at film frame f (absolute). */
export const SceneOf: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const plan = CHANGES[i];
  const s = plan.scene;
  const c = UPDATE.changes[i];
  const pal0 = scenePalette(s.id);
  // the hall and the glass window mix their dark field from the ink: on a dark ground (where the ink is the light) they take the ground's dark
  const palette = (s.id === 'crystal-hall' || s.id === 'object-window') && toOklch(pal0.ink)[0] > toOklch(pal0.ground)[0] ? { ...pal0, ink: pal0.ground } : pal0;
  const frame = sceneFrame(s, f) * K30;
  checkMeta(s.id, sceneDur30(s.id, c));
  const show = c.show;
  switch (s.id) {
    case 'porthole-line': {
      const [top, bottom] = splitLine(c);
      const key = (c.key ?? '').trim();
      return <PortholeLine top={top} bottom={bottom} accent={key && bottom.includes(key) ? key : undefined} picture={srcOf(pictureOf(c) as string)} palette={palette} pointer frame={frame} />;
    }
    case 'decode-title':
      return <DecodeTitle title={spokenChange(c)} cta={show.kind === 'tap' ? show.action : c.title} palette={palette} pointer frame={frame} />;
    case 'macro-type':
      return <MacroType placeholder={show.kind === 'type' ? show.placeholder ?? 'Message' : 'Message'} text={show.kind === 'type' ? show.text : c.title} palette={palette} click={!s.endless} frame={frame} />;
    case 'glass-prompt':
      return <GlassPrompt label={c.title} placeholder={show.kind === 'type' ? show.placeholder ?? 'Ask anything' : 'Ask anything'} prompt={show.kind === 'type' ? show.text : spokenChange(c)} model={show.kind === 'type' ? show.model : undefined} palette={palette} frame={frame} />;
    case 'toast-stack': {
      const rows = rowsOf(c).slice(0, 5);
      const ago = ['now', '1m', '2m', '4m', '9m'];
      // each toast its row's real face or picture when it has one (a person who paid, the place booked), else a bell
      const items = rows.map((r, k) => ({ title: r.label, body: r.meta ?? c.title, ago: ago[rows.length - 1 - k] ?? 'now', glyph: 'bell' as const, photo: r.photo ? srcOf(r.photo) : undefined }));
      return <ToastStack items={items} palette={palette} frame={frame} />;
    }
    case 'page-fly': {
      const doc = CONTENT.doc;
      const heading = show.kind === 'page' ? show.heading ?? c.title : c.title;
      return <PageFly page={{ ...doc, title: heading, accentWord: show.kind === 'page' ? show.accentWord ?? doc.accentWord : doc.accentWord, brand: UPDATE.name }} palette={palette} frame={frame} />;
    }
    case 'photo-river':
      return <PhotoRiver photos={photosOf(c).slice(0, 14).map(srcOf)} palette={palette} frame={frame} />;
    case 'photo-counters': {
      const unit = show.kind === 'count' ? show.unit ?? '' : '';
      // a currency sign leads the figure ("£1,180"), any other unit follows it ("46 hours")
      const lead = /^[$£€¥₹₩]$/.test(unit);
      const card = show.kind === 'count' ? { title: show.label, sub: show.sub ?? c.title, from: show.from, to: show.to, format: (v: number) => `${lead ? unit : ''}${Math.round(v).toLocaleString('en-US')}${unit && !lead ? ` ${unit}` : ''}` } : { title: c.title, sub: c.sub ?? '', from: 0, to: 1 };
      // one card, large and centred on the picture (scenes/photo-counters cardLayout): the figure is the frame's subject
      return <PhotoCounters photo={srcOf(pictureOf(c) as string)} cards={[card]} place="centre" palette={palette} frame={frame} />;
    }
    case 'orbit-chips':
      return <OrbitChips line={spokenChange(c)} chips={(c.logos ?? []).map((logo) => ({ logo }))} palette={palette} frame={frame} />;
    case 'photo-orbit':
      return <PhotoOrbit line={wordsOf(c).slice(0, 4).join(' ')} images={photosOf(c).slice(0, 6).map(srcOf)} palette={palette} frame={frame} />;
    case 'card-rivers':
      return <CardRivers words={[c.title.split(/\s+/)[0] || UPDATE.name, keyOf(c)]} images={photosOf(c).slice(0, 14).map(srcOf)} palette={palette} frame={frame} />;
    case 'site-flip': {
      const site = CONTENT.site;
      const heading = show.kind === 'page' ? show.heading ?? c.title : c.title;
      return site ? <SiteFlip site={{ ...site, brand: UPDATE.name, headline: heading, accentWord: show.kind === 'page' ? show.accentWord ?? site.accentWord : site.accentWord }} palette={palette} frame={frame} /> : null;
    }
    case 'ribbon-ring': {
      const w = wordsOf(c);
      const k = w.length <= 2 ? 1 : Math.min(3, Math.ceil(w.length / 3));
      const key = (c.key ?? '').trim();
      const second = w.slice(w.length - k).join(' ');
      return <RibbonRing first={w.slice(0, w.length - k).join(' ') || UPDATE.name} second={second} accent={key && second.includes(key) ? key : undefined} palette={palette} frame={frame} />;
    }
    case 'phone-pullback': {
      const rows = show.kind === 'tap' ? show.result ?? [] : rowsOf(c);
      const cards = (rows.length ? rows : [{ label: UPDATE.case.who ?? UPDATE.case.names?.[0] ?? UPDATE.name, meta: 'now' }]).slice(0, 2).map((r) => ({ who: r.label, meta: r.meta, photo: r.photo ? srcOf(r.photo) : undefined, title: c.title, body: c.sub }));
      return <PhonePullback name={UPDATE.name} logo={brandLogo} search={UPDATE.case.request} cards={cards} menu={[show.kind === 'tap' ? show.action : c.title, show.kind === 'tap' ? show.done : c.sub ?? UPDATE.name]} palette={palette} pointer frame={frame} />;
    }
    case 'object-window':
      return <ObjectWindow logo={brandLogo} done={show.kind === 'tap' ? show.action : 'Save'} palette={palette} pointer={!s.endless} frame={frame} />;
    case 'crystal-hall':
      return <CrystalHall logo={brandLogo} palette={palette} frame={frame} />;
    case 'cloud-dome': {
      const key = (c.key ?? '').trim();
      const shot = pictureOf(c);
      return <CloudDome line={spokenChange(c)} accent={key || undefined} plate={PLATES.clouds ? srcOf(PLATES.clouds) : CLOUD_SEA} screen={shot ? srcOf(shot) : undefined} logo={brandLogo} icons={c.logos ?? []} palette={palette} frame={frame} />;
    }
    case 'street-poster':
      return <StreetPoster plates={PLATES.street.map((p) => ({ ...p, src: srcOf(p.src) })) as unknown as StreetPlate[]} output={srcOf(pictureOf(c) as string)} palette={palette} frame={frame} />;
    case 'room-push':
      return PLATES.room ? <RoomPush room={{ ...PLATES.room, src: srcOf(PLATES.room.src), screen: PLATES.room.screen as Quad }} screen={srcOf(pictureOf(c) as string)} palette={palette} frame={frame} /> : null;
    default:
      return null;
  }
};

/** The lockup: the mark's solid pulling back, the one snap to the lockup, played from the mark's cut in to the last frame (it keeps pushing). */
export const EndScene: React.FC<{ f: number }> = ({ f }) => {
  checkMeta('mark-pullback', markPullbackMeta.dur);
  return <MarkPullback name={UPDATE.name} logo={brandLogo} palette={scenePalette('mark-pullback')} frame={Math.max(0, pullbackFrame(f)) * K30} />;
};
void macroTypeDur;
