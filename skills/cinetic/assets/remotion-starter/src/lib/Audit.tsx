import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useCurrentScale, useVideoConfig } from 'remotion';
import { C } from '../brand/tokens';
import { useFilm } from './film';
import { auditing, drain, setAuditing } from './registry';
import { Insets, SafeSpec, presetFor, safeInsets } from './safe';

// Layout audit, mounted only when a composition gets the prop {audit: true}
// (scripts/layout-audit.sh renders stills that way). It measures every element tagged
// data-text="<id>" on the current frame and checks it against:
// - the safe zone: `safe` is a preset ('feed9x16', 'feed9x16Strict', 'square1x1', 'portrait4x5',
//   'wide16x9', 'title'), explicit insets {top, right, bottom, left}, or the older symmetric {x, y};
//   without it, the preset for the frame's aspect (lib/safe.ts presetFor: 9:16 gets the feed zones);
// - the other text boxes (overlap) and the minimum readable size (22 px at 1080p, 32 px in 9:16);
// - anything tagged data-mover="<id>" (a chip, card, cursor or device that travels) painted OVER
//   the text: sampled with elementsFromPoint, so z-order and transforms count as rendered;
// - how much there is to read: the film words in readable boxes (effective opacity >= 0.5, at
//   least the minimum size; a box inside another tagged box counts once) must stay within the
//   pace's limit (pace.maxVisibleBuild: 8 when calm). Product strings (a typed command, code, a
//   URL, an app label) carry data-ui on their tagged element and are counted apart.
// - the type roles (warnings, never a fail unless layout-audit.sh --strict): each readable box's cap
//   height as a share of the frame height against the role bands (TYPE_BANDS: caption 2.3-4 %,
//   statement 5-9 %, hero 11-23 %, giant 40-90 %), text under the ui role (30 px at 1080p), more than
//   2 non-UI sizes at once, a statement wider than 61 % of the frame, a payoff wider than 84 %.
// It draws the boxes and the safe zone, and logs one JSON line per frame:
//   CINETIC_AUDIT {"comp":"Film","frame":120,"safe":{...},"minPx":22,"words":4,"uiWords":0,"boxes":[...],"issues":[...],"warnings":[...]}
// Each box carries its effective opacity (its own times its ancestors', times its most opaque text inside: a line
// whose words have faded on their own spans is not read); layout-audit.sh --speed pairs the boxes of frame f and
// f+1 by id to measure how fast readable text travels, and leaves out a box drawn inside an active smear
// ([data-audit-smear], fx/Defocus DirBlur): it is blurred along its motion, not a double image.
// It also logs the frame's tweens from the registry (lib/registry.ts), which audit mode switches on:
//   CINETIC_TWEENS {"comp":"Film","frame":120,"tweens":[{"from":96,"to":128,"token":"snapOut","family":"arrive"},...]}
// with spans in absolute frames (scripts/grammar-score.mjs reads them).
// Tag the element whose box IS the visible text (the line, not an oversized wrapper). Its size is the largest
// computed font size among it and its descendants that hold text (a wrapper around sized spans inherits 16 px);
// its box is cut by every overflow-clipping ancestor (a word sliding out from under a mask is measured where it
// shows) and a box clipped away entirely is not on screen. Tagged text inside [data-audit-copy] (a primitive's
// altered copies of a layer drawn underneath too, such as Glass's backdrop, Defocus's and DirBlur's blur levels) is
// not measured again, and two boxes with the same id and text over the same place are one text drawn twice (a ghost
// under its colour copy, a smear): it is measured once, at its most opaque copy, never as text overlapping itself.
// The rows of a list scrolling through the frame ([data-audit-scroll], a feed) cross the frame's edges and pass under
// the UI that floats over the list: they are not held to the safe zone or to overlap with what is outside the list.

export const AUDIT_TAG = 'CINETIC_AUDIT';
export const TWEENS_TAG = 'CINETIC_TWEENS';
/** Smallest text a viewer must read, px at 1080p (scaled by U for other sizes). */
export const MIN_TEXT_PX = 22;
/** The same in a tall (9:16) frame, which is watched full-screen on a phone next to feed UI. */
export const MIN_TEXT_PX_TALL = 32;
/** The ui type role, px at 1080p: readable text under it gets a type-size warning (the fail floor stays MIN_TEXT_PX). */
export const UI_TEXT_PX = 30;
/**
 * Type roles by cap height (0.72 em) as a share of the frame height, after camera scale: a box whose
 * cap height falls between bands, more than 2 non-UI sizes at once, a statement wider than 61 % of the
 * frame or a payoff wider than 84 % get a type-size warning (warnings never fail the audit unless
 * layout-audit.sh --strict). `ui` is below caption.
 */
export const TYPE_BANDS: [role: string, lo: number, hi: number][] = [
  ['caption', 2.3, 4],
  ['statement', 5, 9],
  ['hero', 11, 23],
  ['giant', 40, 90],
];

type Box = { id: string; text: string; words: number; ui: boolean; smear?: boolean; scroll?: boolean; x: number; y: number; w: number; h: number; px: number; opacity: number; role?: string; cap?: number };
type Issue = { kind: 'safe-area' | 'overlap' | 'small-text' | 'covered' | 'words'; id: string; detail: string };
type Warning = { kind: 'type-size'; id: string; detail: string };

const round = (v: number) => Math.round(v * 10) / 10;

const opacityOf = (el: Element | null) => {
  let o = 1;
  for (let e = el; e && e !== document.body; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity || '1');
  return o * innerOpacityOf(el);
};

/** The most opaque text inside a tagged box, relative to it: a line whose words fade on their own spans (fx/Words)
 *  reads only as much as its most visible word; a box with no text descendants is itself (1). */
const innerOpacityOf = (el: Element | null) => {
  if (!el) return 1;
  let best = -1;
  const walk = (e: Element, o: number) => {
    if (Array.from(e.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim())) best = Math.max(best, o);
    for (const c of Array.from(e.children)) walk(c, o * parseFloat(getComputedStyle(c).opacity || '1'));
  };
  walk(el, 1);
  return best < 0 ? 1 : best;
};

/** The font size of the visible text: the largest among the element and its descendants that hold text. */
const fontPxOf = (el: Element) => {
  let px = 0;
  const walk = (e: Element) => {
    if (Array.from(e.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent || '').trim())) px = Math.max(px, parseFloat(getComputedStyle(e).fontSize) || 0);
    for (const c of Array.from(e.children)) walk(c);
  };
  walk(el);
  return px || parseFloat(getComputedStyle(el).fontSize);
};

/** The element's box cut by every ancestor that clips its overflow (null when nothing of it shows). */
const visibleRect = (el: Element) => {
  const r = el.getBoundingClientRect();
  let [l, t, rt, b] = [r.left, r.top, r.right, r.bottom];
  for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
    const cs = getComputedStyle(e);
    const cx = cs.overflowX !== 'visible';
    const cy = cs.overflowY !== 'visible';
    if (!cx && !cy) continue;
    const a = e.getBoundingClientRect();
    if (cx) [l, rt] = [Math.max(l, a.left), Math.min(rt, a.right)];
    if (cy) [t, b] = [Math.max(t, a.top), Math.min(b, a.bottom)];
  }
  return rt - l >= 1 && b - t >= 1 ? { left: l, top: t, width: rt - l, height: b - t } : null;
};

/** Share of a 5 x 3 grid of points inside the text where a tagged mover is painted above the text. */
const coverOf = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  let hits = 0;
  const by = new Set<string>();
  for (let i = 1; i <= 5; i++)
    for (let j = 1; j <= 3; j++) {
      for (const hit of document.elementsFromPoint(r.left + (r.width * i) / 6, r.top + (r.height * j) / 4)) {
        if (hit === el || el.contains(hit)) break; // the text is on top at this point
        const m = hit.closest('[data-mover]');
        if (m && !m.contains(el) && opacityOf(m) >= 0.1) {
          hits++;
          by.add(m.getAttribute('data-mover') || '?');
          break;
        }
      }
    }
  return { hits, by: [...by] };
};

export const Audit: React.FC<{ safe?: SafeSpec }> = ({ safe }) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const zoom = useCurrentScale(); // the Studio scales the canvas; renders are 1
  const { width, height, id: comp } = useVideoConfig();
  const { copy: COPY, pace } = useFilm(); // the film's copy and pace (lib/film.ts)
  const SAFE: Insets = safeInsets(safe, width, height);
  const zone = typeof safe === 'string' ? safe : safe ? 'custom' : presetFor(width, height);
  const U = Math.min(width, height) / 1080;
  const minPx = (height / width > 1.5 ? MIN_TEXT_PX_TALL : MIN_TEXT_PX) * U;
  const [found, setFound] = useState<{ boxes: Box[]; issues: Issue[] }>({ boxes: [], issues: [] });
  if (!auditing()) setAuditing(true); // the registry is on whenever the audit is mounted

  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    const origin = host.getBoundingClientRect();
    const els = [...document.querySelectorAll<HTMLElement>('[data-text]')];
    const boxes: (Box & { el: HTMLElement })[] = [];
    for (const el of els) {
      if (el.closest('[data-audit-copy]')) continue; // a copy of a layer measured where it is drawn underneath
      const full = el.getBoundingClientRect();
      const r = visibleRect(el);
      const opacity = opacityOf(el);
      if (!r || opacity < 0.1) continue; // not on screen: nothing to read
      const k = el.offsetWidth > 0 ? full.width / zoom / el.offsetWidth : 1; // transform scale on the text
      boxes.push({
        el,
        id: el.dataset.text || '?',
        text: (el.textContent || '').trim().slice(0, 60),
        words: (el.textContent || '').split(/\s+/).filter(Boolean).length,
        ui: el.closest('[data-ui]') !== null,
        scroll: el.closest('[data-audit-scroll]') !== null || undefined, // a row of a list scrolling through the frame (a feed): it crosses the edges and passes under the UI floating over it
        smear: el.closest('[data-audit-smear]') !== null || undefined, // drawn inside an active smear (fx/Defocus DirBlur): blurred along its motion
        x: round((r.left - origin.left) / zoom),
        y: round((r.top - origin.top) / zoom),
        w: round(r.width / zoom),
        h: round(r.height / zoom),
        px: round(fontPxOf(el) * k),
        opacity: Math.round(opacity * 100) / 100,
      });
    }
    // one text drawn twice (a ghost under its colour copy, a blur level, a smear copy): measured once, its most opaque copy
    const area = (b: Box) => Math.max(1, b.w * b.h);
    const shared = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    for (let i = boxes.length - 1; i >= 0; i--) {
      const a = boxes[i];
      const twin = boxes.findIndex((b, j) => j !== i && b.id === a.id && b.text === a.text && !b.el.contains(a.el) && !a.el.contains(b.el) && shared(a, b) > 0.5 * Math.min(area(a), area(b)));
      if (twin >= 0 && (boxes[twin].opacity > a.opacity || (boxes[twin].opacity === a.opacity && twin < i))) boxes.splice(i, 1);
    }
    const issues: Issue[] = [];
    for (const b of boxes) {
      const out = [
        b.x < SAFE.left && `left ${b.x}px < ${SAFE.left}`,
        b.x + b.w > width - SAFE.right && `right ${round(b.x + b.w)}px > ${width - SAFE.right}`,
        b.y < SAFE.top && `top ${b.y}px < ${SAFE.top}`,
        b.y + b.h > height - SAFE.bottom && `bottom ${round(b.y + b.h)}px > ${height - SAFE.bottom}`,
      ].filter(Boolean);
      if (out.length && !b.scroll) issues.push({ kind: 'safe-area', id: b.id, detail: `${out.join(', ')} (${zone})` });
      if (b.px < minPx) issues.push({ kind: 'small-text', id: b.id, detail: `${b.px}px < ${round(minPx)}px` });
      const cov = coverOf(b.el);
      if (cov.hits) issues.push({ kind: 'covered', id: b.id, detail: `${cov.hits}/15 sample points under ${cov.by.join(', ')}` });
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue; // nested tags describe the same text
        if (a.scroll !== b.scroll) continue; // a scrolling list's rows pass under the UI floating over the list
        const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) - 2; // 2 px tolerance
        const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) - 2;
        if (ix > 0 && iy > 0) issues.push({ kind: 'overlap', id: `${a.id}+${b.id}`, detail: `${round(ix)}x${round(iy)}px` });
      }
    // Words to read on this frame: readable boxes only, each counted once (not again inside an outer tagged box).
    const readable = boxes.filter((b) => b.opacity >= 0.5 && b.px >= minPx);
    const outer = readable.filter((b) => !readable.some((a) => a !== b && a.el.contains(b.el)));
    const words = outer.filter((b) => !b.ui).reduce((n, b) => n + b.words, 0);
    const uiWords = outer.filter((b) => b.ui).reduce((n, b) => n + b.words, 0);
    // A frame whose film text all belongs to replace chains (COPY mode) has the tighter cap, as in grid-check.
    const film = outer.filter((b) => !b.ui);
    const replace = film.length > 0 && film.every((b) => COPY.find((c) => c.id === b.id)?.mode === 'replace');
    const cap = replace ? pace.maxVisibleReplace : pace.maxVisibleBuild;
    if (words > cap)
      issues.push({ kind: 'words', id: film.map((b) => b.id).join('+'), detail: `${words} film words readable at once > ${cap}${replace ? ' (replace chain)' : ''}: one fragment at a time` });
    // Type roles: each readable box's cap height against the role bands (warnings only).
    const warnings: Warning[] = [];
    const sizes: number[] = [];
    for (const b of readable) {
      const cap = Math.round(((0.72 * b.px) / height) * 1000) / 10;
      b.cap = cap;
      b.role = b.ui ? 'ui' : (TYPE_BANDS.find(([, lo, hi]) => cap >= lo && cap <= hi)?.[0] ?? (cap < TYPE_BANDS[0][1] ? 'ui' : 'between'));
      if (b.px < UI_TEXT_PX * U) warnings.push({ kind: 'type-size', id: b.id, detail: `${b.px}px is under the ui role (${round(UI_TEXT_PX * U)}px)` });
      if (b.role === 'between') warnings.push({ kind: 'type-size', id: b.id, detail: `cap height ${cap}% of the frame sits between roles (caption 2.3-4, statement 5-9, hero 11-23, giant 40-90)` });
      if (b.role === 'statement' && b.w > 0.61 * width) warnings.push({ kind: 'type-size', id: b.id, detail: `a statement ${round((b.w / width) * 100)}% of the frame wide (<= 61%)` });
      if (b.role === 'hero' && b.w > 0.84 * width) warnings.push({ kind: 'type-size', id: b.id, detail: `a payoff ${round((b.w / width) * 100)}% of the frame wide (<= 84%)` });
      if (!b.ui && !sizes.some((s) => Math.abs(s - b.px) <= 0.08 * s)) sizes.push(b.px);
    }
    if (sizes.length > 2) warnings.push({ kind: 'type-size', id: readable.filter((b) => !b.ui).map((b) => b.id).join('+'), detail: `${sizes.length} non-UI type sizes at once: one size per scene, change size through the camera` });
    const clean = boxes.map(({ el: _el, ...b }) => b);
    console.log(`${AUDIT_TAG} ${JSON.stringify({ comp, frame, width, height, zone, safe: SAFE, minPx: round(minPx), words, uiWords, boxes: clean, issues, warnings })}`);
    // the tweens evaluated for this frame, their spans moved into absolute frames (a caller's frame argument is its own clock)
    const tweens = drain().map((r) => ({ from: r.from + (frame - r.frame), to: r.to + (frame - r.frame), token: r.token, family: r.family }));
    console.log(`${TWEENS_TAG} ${JSON.stringify({ comp, frame, tweens })}`);
    setFound({ boxes: clean, issues });
  }, [frame, zoom, width, height, comp, zone, SAFE.top, SAFE.right, SAFE.bottom, SAFE.left, minPx, COPY, pace]);

  const bad = new Set(found.issues.flatMap((i) => i.id.split('+')));
  return (
    <AbsoluteFill ref={ref} style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: SAFE.left, top: SAFE.top, right: SAFE.right, bottom: SAFE.bottom, outline: `2px dashed ${C.mute}` }} />
      {found.boxes.map((b, i) => (
        <div key={i} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, outline: `2px solid ${bad.has(b.id) ? C.accent : C.mute}` }} />
      ))}
    </AbsoluteFill>
  );
};
