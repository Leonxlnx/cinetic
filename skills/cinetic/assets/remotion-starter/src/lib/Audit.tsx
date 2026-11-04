import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useCurrentScale, useVideoConfig } from 'remotion';
import { C } from '../brand/tokens';
import { useFilm } from './film';
import { auditing, drain, setAuditing } from './registry';
import { BAR, DRAWN_MAX, drawnTooLarge, isTextBar, placeholderIn } from './placeholder';
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
//   height as a share of the frame height against the role bands, which hold both type families (TYPE_BANDS:
//   caption 2.3-4 %, line 4-9 %, display 9-14 %, hero 14-26 %, giant 26-90 %), text under the ui role (30 px at
//   1080p), more than 2 non-UI sizes at once, a line wider than 61 % of the frame (a calm sentence under a 6.5 % cap:
//   75 %), a display or hero line wider than 84 %.
// - resting states only: a line inside a type push in flight ([data-audit-push="moving"], fx/TypePush) is a camera
//   move, held to no safe zone, width or role band; a push landed at a bleed scale ([data-audit-push="bleed"]) is a
//   declared bleed: past the safe zone it must cross the frame's edge, never rest half in the margin. A claim on the
//   accent ([data-audit-claim], fx/TypeClaim) keeps a 2.5 % margin at its sides instead of the zone's.
// It draws the boxes and the safe zone, and logs one JSON line per frame:
//   CINETIC_AUDIT {"comp":"Film","frame":120,"safe":{...},"minPx":22,"words":4,"uiWords":0,"boxes":[...],"issues":[...],"warnings":[...]}
// Each box carries its effective opacity (its own times its ancestors', times its most opaque text inside: a line
// whose words have faded on their own spans is not read); layout-audit.sh --speed pairs the boxes of frame f and
// f+1 by id to measure how fast readable text travels, and leaves out a box drawn inside an active smear
// ([data-audit-smear], fx/Defocus DirBlur): it is blurred along its motion, not a double image.
// It logs the official marks on the frame too (the kit draws each as an <Img data-logo="<name>">): "logos":
// [{"name","x","y","w","h"}], so look-audit.py --layout can leave a mark's own colours out of the palette checks,
// and the real pictures (photos and footage: the kit and fx/Pictures, Photo, Footage, Montage, Develop, Cards tag each
// [data-imagery]): "imagery": [{"x","y","w","h"}], so a photo's skin, foliage and wood stay out of them the same way.
// And the pictures ("pictures": the outermost [data-ui], [data-imagery] and [data-picture] elements of at least 2 % of
// the frame, float taken out): layout-audit.sh's placement gate tells from them whether a line stands alone, over a picture,
// beside it, or above or below it.
// And the kit's icons ("icons": the outermost [data-icon] on screen: kit Glyph, GlyphTile, Check, Pending, a Pill's spinner,
// an AppIcon without a fetched mark, whose mark is in "logos" already): [{"name","x","y","w","h","opacity","visible","over"}],
// where they show (like the marks), a glyph by its drawn ink rather than its padded square. `visible` is the share of 9
// points over the icon where nothing opaque is painted above it (text aside); an icon under a card or a plate reads 0 and
// carries "covered". `over` lists the tagged texts whose words and the icon are drawn on each other: a word painted above
// the icon, or the icon set right on a word with nothing opaque between them (hit-tested inside each word's own box, so
// the gap a line leaves for an inline glyph and a card behind the icon's card are not over it). scripts/ui-layout.cjs
// fails a text over an icon in view, or an icon on a text, under the ship gate on 2 audited frames (a warning in dev); an
// icon beside its label (the kit's chips, rows and buttons) is a pair, never a crossing.
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
// A crop that cuts text on purpose (a wall of words as texture, a giant word cropped) declares it with [data-audit-crop]:
// its text is not held to the safe zone. Product text (data-ui) cut by the frame inside a declared bleed (a closer frame,
// a punch-in) is no such crop: scripts/ui-layout.cjs text-edge fails it, with text the camera float carries to the edge.
// Placeholders fail too (lib/placeholder.ts, the lists of scripts/placeholders.json), on every visible element, tagged
// or not: `placeholder`, text that marks itself unfinished (lorem ipsum, "Placeholder", "Label text", a generic label
// alone, "Item 1", a template slot left in brackets); `bar-text`, two or more grey bars standing in for lines of text in
// a container with no text of its own (a product's own loading skeleton shown on purpose sits in [data-audit-skeleton];
// charts and meters in [data-chart] / [data-meter]); `drawn-figure`, a figure the kit draws (data-drawn: a portrait, the
// still life) larger than a small UI avatar (person 72 px, product or place 48 px at 1080p): a real photo belongs there.

export const AUDIT_TAG = 'CINETIC_AUDIT';
export const TWEENS_TAG = 'CINETIC_TWEENS';
/** Smallest text a viewer must read, px at 1080p (scaled by U for other sizes). */
export const MIN_TEXT_PX = 22;
/** The same in a tall (9:16) frame, which is watched full-screen on a phone next to feed UI. */
export const MIN_TEXT_PX_TALL = 32;
/** The ui type role, px at 1080p: readable text under it gets a type-size warning (the fail floor stays MIN_TEXT_PX). */
export const UI_TEXT_PX = 30;
/**
 * Type roles by cap height (0.72 em) as a share of the frame height, after camera scale, for both type families
 * (lib/look.ts TYPE_LOOK): calm line 84 px is 5.6 % (fitted down to 66-72 px: 4.4-4.8 %), bold line 120 px 8 %; calm
 * display 160 10.7 %, calm hero and bold display 200 13.3 %; bold hero 240 16 % and a claim 16 % or more; a name re-set
 * at a quarter of the frame 25-28 %; calm giant 640 43 %, bold giant 900 60 %. The bands meet, so a role of either family
 * never falls between two; a box over the giant band, more than 2 non-UI sizes at once or a line past its width
 * (TYPE_WIDTH) gets a type-size warning (warnings never fail the audit unless layout-audit.sh --strict). `ui` is below caption.
 */
export const TYPE_BANDS: [role: string, lo: number, hi: number][] = [
  ['caption', 2.3, 4],
  ['line', 4, 9],
  ['display', 9, 14],
  ['hero', 14, 26],
  ['giant', 26, 90],
];
/** Widths as a share of the frame width: a line (a statement) 61 %, a calm sentence (a line under a 6.5 % cap) 75 %, a display or hero line 84 %. */
export const TYPE_WIDTH = { line: 0.61, sentence: 0.75, sentenceCap: 6.5, display: 0.84, hero: 0.84 } as const;
/** A claim on the accent keeps this share of the frame width at its sides (fx/TypeClaim: 3 %). */
export const CLAIM_MARGIN = 0.025;
/** The smallest picture the audit logs, as a share of the frame's area (a chip or an icon is not a picture beside a line). */
export const PICTURE_MIN = 0.02;

type Box = { id: string; text: string; words: number; ui: boolean; smear?: boolean; scroll?: boolean; push?: 'moving' | 'bleed'; claim?: boolean; crop?: boolean; crosses?: boolean; x: number; y: number; w: number; h: number; px: number; opacity: number; role?: string; cap?: number; float?: [number, number, number] };
type Issue = { kind: 'safe-area' | 'overlap' | 'small-text' | 'covered' | 'words' | 'placeholder' | 'bar-text' | 'drawn-figure'; id: string; detail: string };
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

/** A box cut by every ancestor of el that clips its overflow (null when nothing of it shows). */
const clipBox = (el: Element, r: { left: number; top: number; width: number; height: number }) => {
  let [l, t, rt, b] = [r.left, r.top, r.left + r.width, r.top + r.height];
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

/** An icon's drawn box: an <svg> glyph by the ink of its paths (its viewBox mapped onto its box), so the empty padding
 *  of the glyph's square never counts as the icon; any other icon (a tile, a badge) by its own box. */
const inkBox = (el: Element) => {
  const r = el.getBoundingClientRect();
  if (!(el instanceof SVGSVGElement)) return r;
  const vb = el.viewBox?.baseVal;
  if (!vb || !vb.width || !vb.height) return r;
  let bb: DOMRect;
  try {
    bb = el.getBBox();
  } catch {
    return r;
  }
  if (!bb.width || !bb.height) return r;
  const sx = r.width / vb.width;
  const sy = r.height / vb.height;
  return { left: r.left + (bb.x - vb.x) * sx, top: r.top + (bb.y - vb.y) * sy, width: bb.width * sx, height: bb.height * sy };
};

/** The element's own opacity times its ancestors' (no text inside to weigh). */
const chainOpacity = (el: Element | null) => {
  let o = 1;
  for (let e = el; e && e !== document.body; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity || '1');
  return o;
};

/** Whether an element paints something opaque over what lies under it: a fill of 50 % or more, a background image,
 *  a picture, or a drawn shape, at an effective opacity of 0.5 or more. */
const paints = (e: Element) => {
  if (chainOpacity(e) < 0.5) return false;
  if (/^(IMG|VIDEO|CANVAS)$/.test(e.tagName.toUpperCase())) return true;
  if (e instanceof SVGGraphicsElement && !(e instanceof SVGSVGElement)) return true;
  const cs = getComputedStyle(e);
  if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
  const m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor);
  const v = m ? m[1].split(/[\s,/]+/).filter(Boolean).map(Number) : [];
  return v.length >= 3 && (v.length > 3 ? v[3] : 1) >= 0.5;
};

/** Share of 9 points over an icon's box where it is in view: hit-tested top down, nothing opaque is painted above it
 *  (text and the audit's own overlay aside). Hit testing runs with pointer events on everywhere for the call (a device
 *  frame turns them off for its screen). */
const iconInView = (icon: Element, r: { left: number; top: number; width: number; height: number }, host: Element) => {
  let seen = 0;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let shows = true;
      for (const e of document.elementsFromPoint(r.left + (r.width * (i + 0.5)) / 3, r.top + (r.height * (j + 0.5)) / 3)) {
        if (host.contains(e)) continue;
        if (e === icon || icon.contains(e) || e.contains(icon)) break; // the icon, or what holds it: nothing above
        if (e.closest('[data-text],[data-audit-copy]')) continue; // text over the icon is the crossing itself
        if (paints(e)) {
          shows = false;
          break;
        }
      }
      if (shows) seen++;
    }
  return seen / 9;
};

/** The boxes of a tagged text's words (runs of non-space characters, each its own Range), where they are drawn. */
const wordBoxes = (el: Element) => {
  const out: DOMRect[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const txt = n.textContent || '';
    for (const m of txt.matchAll(/\S+/g)) {
      const r = document.createRange();
      r.setStart(n, m.index ?? 0);
      r.setEnd(n, (m.index ?? 0) + m[0].length);
      for (const q of Array.from(r.getClientRects())) if (q.width >= 1 && q.height >= 1) out.push(q);
    }
  }
  return out;
};

/** Whether a tagged text's words and an icon are drawn on each other: at points inside each word's box that lie over the
 *  icon, the text is hit above the icon, or under the icon itself with nothing opaque between them (a glyph set on a word
 *  hides it as surely as a word on a glyph); a card the icon sits on hides a text behind it (a depth stack). */
const textOverIcon = (text: Element, icon: Element, r: { left: number; top: number; width: number; height: number }, host: Element) => {
  for (const w of wordBoxes(text)) {
    const l = Math.max(w.left, r.left), t = Math.max(w.top, r.top), rt = Math.min(w.right, r.left + r.width), b = Math.min(w.bottom, r.top + r.height);
    if (rt - l < 2 || b - t < 2) continue;
    for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.3], [0.75, 0.3], [0.25, 0.7], [0.75, 0.7]]) {
      for (const e of document.elementsFromPoint(l + (rt - l) * fx, t + (b - t) * fy)) {
        if (host.contains(e)) continue;
        if (e === icon || icon.contains(e)) continue; // the icon drawn on the word here: is the word right under it?
        if (text === e || text.contains(e)) return true; // the word above the icon, or the icon set right on it
        if (e.contains(icon) && paints(e)) break; // the icon's own card above the word: the word is behind it
        if (e.contains(icon)) continue; // a transparent holder of the icon (a row, a wrapper)
        if (e.closest('[data-audit-copy]') || e.closest('[data-text]')) continue; // another text: neither covers
        if (paints(e)) break; // something opaque between them
      }
    }
  }
  return false;
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
      const push = el.closest('[data-audit-push]')?.getAttribute('data-audit-push');
      const fl = (full.left - origin.left) / zoom, ft = (full.top - origin.top) / zoom;
      // the film's camera float (fx/Float) is a breath of the camera round the layout: boxes are judged where the
      // layout puts them and at the size it sets, with the float taken out (data-float on the act's float: x, y, k about
      // the frame's centre); `float` keeps it, so a reader of the pixels (look-audit.py) finds the box on screen
      const fa = el.closest('[data-float]')?.getAttribute('data-float')?.split(',').map(Number);
      const [fx, fy, fk] = fa && fa.length === 3 && fa.every(Number.isFinite) && fa[2] > 0 ? fa : [0, 0, 1];
      const floated = fx !== 0 || fy !== 0 || fk !== 1;
      const ux = (x: number) => width / 2 + (x - width / 2 - fx) / fk;
      const uy = (y: number) => height / 2 + (y - height / 2 - fy) / fk;
      boxes.push({
        el,
        id: el.dataset.text || '?',
        text: (el.textContent || '').trim().slice(0, 60),
        words: (el.textContent || '').split(/\s+/).filter(Boolean).length,
        ui: el.closest('[data-ui]') !== null,
        scroll: el.closest('[data-audit-scroll]') !== null || undefined, // a row of a list scrolling through the frame (a feed): it crosses the edges and passes under the UI floating over it
        smear: el.closest('[data-audit-smear]') !== null || undefined, // drawn inside an active smear (fx/Defocus DirBlur): blurred along its motion
        push: push === 'moving' || push === 'bleed' ? push : undefined, // inside a type push (fx/TypePush): in flight, or landed as a declared bleed
        claim: el.closest('[data-audit-claim]') !== null || undefined, // a claim on the accent (fx/TypeClaim): 2.5 % side margins
        crop: el.closest('[data-audit-crop]') !== null || undefined, // a declared crop that cuts text on purpose (a wall of words as texture): no safe zone
        crosses: fl < -1 || ft < -1 || fl + full.width / zoom > width + 1 || ft + full.height / zoom > height + 1 || undefined, // the unclipped box runs past the frame's edge
        x: round(ux((r.left - origin.left) / zoom)),
        y: round(uy((r.top - origin.top) / zoom)),
        w: round(r.width / zoom / fk),
        h: round(r.height / zoom / fk),
        px: round((fontPxOf(el) * k) / fk),
        opacity: Math.round(opacity * 100) / 100,
        ...(floated ? { float: [round(fx), round(fy), Math.round(fk * 10000) / 10000] as [number, number, number] } : {}),
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
      const left = b.claim ? Math.min(SAFE.left, Math.round(CLAIM_MARGIN * width)) : SAFE.left;
      const right = b.claim ? Math.min(SAFE.right, Math.round(CLAIM_MARGIN * width)) : SAFE.right;
      const out = [
        b.x < left && `left ${b.x}px < ${left}`,
        b.x + b.w > width - right && `right ${round(b.x + b.w)}px > ${width - right}`,
        b.y < SAFE.top && `top ${b.y}px < ${SAFE.top}`,
        b.y + b.h > height - SAFE.bottom && `bottom ${round(b.y + b.h)}px > ${height - SAFE.bottom}`,
      ].filter(Boolean);
      // resting states only: a push in flight is a camera move; a landed push is a declared bleed that must cross the frame's edge
      if (out.length && !b.scroll && !b.crop && b.push !== 'moving' && !(b.push === 'bleed' && b.crosses))
        issues.push({ kind: 'safe-area', id: b.id, detail: `${out.join(', ')} (${zone})${b.push === 'bleed' ? ': a pushed line rests half in the margin; push it on until it crosses the frame edge, or land it inside the safe zone' : ''}` });
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
        // an inline chip (kit/inline.tsx, tagged `<line>-chip`) sits in its own line's slot, often drawn as a layer over
        // the line's slot run rather than inside its element: that is the line's word, not a box laid over the line
        if (b.id === `${a.id}-chip` || a.id === `${b.id}-chip`) continue;
        const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) - 2; // 2 px tolerance
        const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) - 2;
        if (ix > 0 && iy > 0) issues.push({ kind: 'overlap', id: `${a.id}+${b.id}`, detail: `${round(ix)}x${round(iy)}px` });
      }
    // Placeholders on the frame, tagged or not: unfinished text, grey bars for text, figures drawn where a photo belongs.
    const seenText = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      const txt = (n.textContent || '').trim();
      if (!el || !txt || host.contains(el) || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) || el.closest('[data-audit-copy]')) continue;
      const hit = placeholderIn(txt, { slots: true });
      if (!hit || !visibleRect(el) || opacityOf(el) < 0.1) continue;
      const id = el.closest('[data-text]')?.getAttribute('data-text') || txt.slice(0, 24);
      if (seenText.has(`${id}|${hit}`)) continue;
      seenText.add(`${id}|${hit}`);
      issues.push({ kind: 'placeholder', id, detail: `"${txt.slice(0, 40)}" is placeholder text ("${hit}"): show the product's real words` });
    }
    const bars = new Map<Element, number>();
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('div, span'))) {
      if (el.childElementCount || (el.textContent || '').trim() || host.contains(el)) continue;
      const cs = getComputedStyle(el);
      const m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor);
      if (!m || cs.backgroundImage !== 'none') continue;
      const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      const r = el.getBoundingClientRect();
      const w = r.width / zoom;
      const h = r.height / zoom;
      const rad = cs.borderTopLeftRadius.trim().endsWith('%') ? (parseFloat(cs.borderTopLeftRadius) / 100) * Math.min(w, h) : parseFloat(cs.borderTopLeftRadius) || 0;
      if (!isTextBar({ w, h, radius: rad, rgb: [v[0], v[1], v[2]], alpha: v.length > 3 ? v[3] : 1 }, U)) continue;
      if (el.closest('[data-chart],[data-meter],[data-audit-skeleton],[data-audit-copy]') || !visibleRect(el) || opacityOf(el) < 0.1) continue;
      const parent = el.parentElement;
      if (parent) bars.set(parent, (bars.get(parent) ?? 0) + 1);
    }
    for (const [parent, n] of bars)
      if (n >= BAR.cluster && !(parent.textContent || '').trim()) {
        const id = parent.closest('[data-text],[data-ui],[data-mover]')?.getAttribute('data-text') ?? parent.closest('[data-mover]')?.getAttribute('data-mover') ?? 'bars';
        issues.push({ kind: 'bar-text', id, detail: `${n} grey bars standing in for lines of text: set the real strings at film size (a loading skeleton shown on purpose goes in [data-audit-skeleton])` });
      }
    const drawn = new Map<string, { n: number; max: number }>();
    for (const el of Array.from(document.querySelectorAll('[data-drawn]'))) {
      if (el.closest('[data-audit-copy]')) continue;
      const r = visibleRect(el);
      if (!r || opacityOf(el) < 0.1) continue;
      const kind = el.getAttribute('data-drawn') || 'product';
      if (!drawnTooLarge(kind, r.width / zoom, r.height / zoom, U)) continue;
      const d = drawn.get(kind) ?? { n: 0, max: 0 };
      drawn.set(kind, { n: d.n + 1, max: Math.max(d.max, Math.max(r.width, r.height) / zoom / U) });
    }
    for (const [kind, d] of drawn)
      issues.push({ kind: 'drawn-figure', id: kind, detail: `${d.n} ${kind === 'person' ? 'portrait' : kind}${d.n === 1 ? '' : 's'} drawn in code, up to ${Math.round(d.max)} px (over ${DRAWN_MAX[kind as keyof typeof DRAWN_MAX] ?? DRAWN_MAX.product} at 1080p): a real photo belongs here (scripts/assets.mjs, fx/Pictures, kit Avatar src), or the product's own UI` });
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
    const top = TYPE_BANDS[TYPE_BANDS.length - 1][2];
    for (const b of readable) {
      const cap = Math.round(((0.72 * b.px) / height) * 1000) / 10;
      b.cap = cap;
      b.role = b.ui ? 'ui' : (TYPE_BANDS.find(([, lo, hi]) => cap >= lo && cap <= hi)?.[0] ?? (cap < TYPE_BANDS[0][1] ? 'ui' : 'over'));
      if (b.push === 'moving') continue; // a size passing through a push is the camera's, not a role
      const share = round((b.w / width) * 100);
      if (b.px < UI_TEXT_PX * U) warnings.push({ kind: 'type-size', id: b.id, detail: `${b.px}px is under the ui role (${round(UI_TEXT_PX * U)}px)` });
      if (b.role === 'over') warnings.push({ kind: 'type-size', id: b.id, detail: `cap height ${cap}% of the frame is over the giant band (<= ${top}%)` });
      const wide = b.push === 'bleed' || b.claim ? null : b.role === 'line' ? (cap < TYPE_WIDTH.sentenceCap ? TYPE_WIDTH.sentence : TYPE_WIDTH.line) : b.role === 'display' || b.role === 'hero' ? TYPE_WIDTH[b.role] : null;
      if (wide !== null && b.w > wide * width)
        warnings.push({ kind: 'type-size', id: b.id, detail: `a ${b.role === 'line' ? (cap < TYPE_WIDTH.sentenceCap ? 'sentence' : 'line') : `${b.role} line`} ${share}% of the frame wide (<= ${Math.round(wide * 100)}%; cap ${cap}%)` });
      if (!b.ui && !sizes.some((s) => Math.abs(s - b.px) <= 0.08 * s)) sizes.push(b.px);
    }
    if (sizes.length > 2) warnings.push({ kind: 'type-size', id: readable.filter((b) => !b.ui && b.push !== 'moving').map((b) => b.id).join('+'), detail: `${sizes.length} non-UI type sizes at once: one size per scene, change size through the camera` });
    const clean = boxes.map(({ el: _el, ...b }) => b);
    // the official marks on screen, where they are drawn this frame (they move: a ring, a sentence, a card)
    const logos = [...document.querySelectorAll<HTMLElement>('[data-logo]')].flatMap((el) => {
      const r = visibleRect(el);
      return r && opacityOf(el) >= 0.05
        ? [{ name: el.dataset.logo || '?', x: round((r.left - origin.left) / zoom), y: round((r.top - origin.top) / zoom), w: round(r.width / zoom), h: round(r.height / zoom) }]
        : [];
    });
    // the real pictures on screen (photos and footage in their own colours), where they show this frame
    const imagery = [...document.querySelectorAll<HTMLElement>('[data-imagery]')].flatMap((el) => {
      const r = visibleRect(el);
      return r && opacityOf(el) >= 0.05 ? [{ x: round((r.left - origin.left) / zoom), y: round((r.top - origin.top) / zoom), w: round(r.width / zoom), h: round(r.height / zoom) }] : [];
    });
    // the kit's icons on screen (outermost [data-icon]; an icon holding a fetched mark is logged with the marks), where they
    // show, a glyph by its ink, with the share of it in view (nothing opaque painted above it)
    const pe = document.createElement('style');
    pe.textContent = '* { pointer-events: auto !important; }';
    document.head.appendChild(pe);
    let icons: { name: string; x: number; y: number; w: number; h: number; opacity: number; visible: number; over: string[]; covered?: true }[] = [];
    try {
      icons = [...document.querySelectorAll('[data-icon]')].flatMap((el) => {
        if (el.parentElement?.closest('[data-icon]') || el.closest('[data-audit-copy]') || host.contains(el) || el.querySelector('[data-logo]')) return [];
        const o = chainOpacity(el);
        const r = o >= 0.05 ? clipBox(el, inkBox(el)) : null;
        if (!r) return [];
        const visible = Math.round(iconInView(el, r, host) * 100) / 100;
        // the tagged texts whose words are drawn above this icon (each id once)
        const over = [...new Set(boxes.filter((b) => {
          const q = b.el.getBoundingClientRect();
          return q.left < r.left + r.width && r.left < q.right && q.top < r.top + r.height && r.top < q.bottom && textOverIcon(b.el, el, r, host);
        }).map((b) => b.id))];
        return [{ name: el.getAttribute('data-icon') || 'icon', x: round((r.left - origin.left) / zoom), y: round((r.top - origin.top) / zoom), w: round(r.width / zoom), h: round(r.height / zoom), opacity: Math.round(o * 100) / 100, visible, over, ...(visible === 0 ? { covered: true as const } : {}) }];
      });
    } finally {
      pe.remove();
    }
    // the pictures on screen: the product's surfaces, cards and screens ([data-ui]), photos and footage ([data-imagery])
    // and anything else drawn as a picture ([data-picture]); the outermost of each, at least PICTURE_MIN of the frame,
    // where it shows, the camera float taken out like the boxes'. A mark or chip set inside a line of type is part of the
    // line. layout-audit.sh's placement gate reads them: a line alone, over a picture, beside it, above or below it.
    const PIC = '[data-ui],[data-imagery],[data-picture]';
    const pictures = [...document.querySelectorAll<HTMLElement>(PIC)].flatMap((el) => {
      if (el.parentElement?.closest(PIC) || el.closest('[data-text],[data-audit-copy]') || host.contains(el)) return [];
      const r = visibleRect(el);
      let o = 1;
      for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity || '1');
      if (!r || o < 0.25) return [];
      const fa = el.closest('[data-float]')?.getAttribute('data-float')?.split(',').map(Number);
      const [fx, fy, fk] = fa && fa.length === 3 && fa.every(Number.isFinite) && fa[2] > 0 ? fa : [0, 0, 1];
      const w = r.width / zoom / fk;
      const h = r.height / zoom / fk;
      if (w * h < PICTURE_MIN * width * height) return [];
      const x = width / 2 + ((r.left - origin.left) / zoom - width / 2 - fx) / fk;
      const y = height / 2 + ((r.top - origin.top) / zoom - height / 2 - fy) / fk;
      return [{ x: round(x), y: round(y), w: round(w), h: round(h), opacity: Math.round(o * 100) / 100 }];
    });
    console.log(`${AUDIT_TAG} ${JSON.stringify({ comp, frame, width, height, zone, safe: SAFE, minPx: round(minPx), words, uiWords, boxes: clean, logos, imagery, icons, pictures, issues, warnings, bands: TYPE_BANDS, widths: TYPE_WIDTH })}`);
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
