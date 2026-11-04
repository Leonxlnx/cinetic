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
import { splitLine } from '../deal';
import {
  DecodeTitle, decodeTitleMeta, GlassPrompt, glassPromptMeta, MacroType, macroTypeDur, macroTypeMeta, MarkPullback, markPullbackMeta, OrbitChips, orbitChipsMeta,
  PageFly, pageFlyMeta, PhotoCounters, photoCountersMeta, PhotoRiver, photoRiverMeta, PortholeLine, portholeLineMeta, type SceneMeta, ToastStack, toastStackMeta,
} from '../scenes';
import { CHANGES, END_MOMENTS30, K30, MOMENTS30, pullbackFrame, sceneDur30, sceneFrame } from '../timeline';
import { pictureOf, photosOf, rowsOf, spokenChange, UPDATE } from '../update';
import { srcOf } from '../scenes/stage1080';
import { scenePalette } from './look';

/** The scenes' own meta entries: the template's numbers (src/deal.ts SCENE_SPEC, src/timeline.ts MOMENTS30) must match them. */
const METAS: Record<string, SceneMeta> = Object.fromEntries([decodeTitleMeta, glassPromptMeta, macroTypeMeta, markPullbackMeta, orbitChipsMeta, pageFlyMeta, photoCountersMeta, photoRiverMeta, portholeLineMeta, toastStackMeta].map((m) => [m.id, m]));
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

/** The product's mark for the scenes that draw it: the brand's, or none (the scene paints the starter's mark in the film's colours). */
export const brandLogo = LOGO_SVG === SAMPLE_MARK_SVG ? undefined : LOGO;

/** Change i's scene at film frame f (absolute). */
export const SceneOf: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const plan = CHANGES[i];
  const s = plan.scene;
  const c = UPDATE.changes[i];
  const palette = scenePalette(s.id);
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
