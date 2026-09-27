import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, useCurrentFrame, useCurrentScale, useVideoConfig } from 'remotion';
import { C, safeArea } from '../brand/tokens';

// Layout audit, mounted only when a composition gets the prop {audit: true}
// (scripts/layout-audit.sh renders stills that way). It measures every element tagged
// data-text="<id>" on the current frame, checks it against the title-safe area (of this
// composition's own size, or the `safe` prop for platform-specific margins), the other text
// boxes and the minimum readable size, draws the boxes, and logs one JSON line per frame:
//   BF_AUDIT {"comp":"Film","frame":120,"boxes":[...],"issues":[...]}
// Tag the element whose box IS the visible text (the line, not an oversized wrapper).

export const AUDIT_TAG = 'BF_AUDIT';
/** Smallest text a viewer must read, px at 1080p (scaled by U for other sizes). */
export const MIN_TEXT_PX = 22;

type Box = { id: string; text: string; x: number; y: number; w: number; h: number; px: number; opacity: number };
type Issue = { kind: 'safe-area' | 'overlap' | 'small-text'; id: string; detail: string };

const round = (v: number) => Math.round(v * 10) / 10;

const opacityOf = (el: Element | null) => {
  let o = 1;
  for (let e = el; e && e !== document.body; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity || '1');
  return o;
};

export const Audit: React.FC<{ safe?: { x: number; y: number } }> = ({ safe }) => {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  const zoom = useCurrentScale(); // the Studio scales the canvas; renders are 1
  const { width, height, id: comp } = useVideoConfig();
  const SAFE = safe ?? safeArea(width, height);
  const U = Math.min(width, height) / 1080;
  const [found, setFound] = useState<{ boxes: Box[]; issues: Issue[] }>({ boxes: [], issues: [] });

  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    const origin = host.getBoundingClientRect();
    const els = [...document.querySelectorAll<HTMLElement>('[data-text]')];
    const boxes: (Box & { el: HTMLElement })[] = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const opacity = opacityOf(el);
      if (r.width < 1 || r.height < 1 || opacity < 0.1) continue; // not on screen: nothing to read
      const k = el.offsetWidth > 0 ? r.width / zoom / el.offsetWidth : 1; // transform scale on the text
      boxes.push({
        el,
        id: el.dataset.text || '?',
        text: (el.textContent || '').trim().slice(0, 60),
        x: round((r.left - origin.left) / zoom),
        y: round((r.top - origin.top) / zoom),
        w: round(r.width / zoom),
        h: round(r.height / zoom),
        px: round(parseFloat(getComputedStyle(el).fontSize) * k),
        opacity: round(opacity),
      });
    }
    const issues: Issue[] = [];
    for (const b of boxes) {
      const out = [
        b.x < SAFE.x && `left ${b.x}px < ${SAFE.x}`,
        b.x + b.w > width - SAFE.x && `right ${round(b.x + b.w)}px > ${width - SAFE.x}`,
        b.y < SAFE.y && `top ${b.y}px < ${SAFE.y}`,
        b.y + b.h > height - SAFE.y && `bottom ${round(b.y + b.h)}px > ${height - SAFE.y}`,
      ].filter(Boolean);
      if (out.length) issues.push({ kind: 'safe-area', id: b.id, detail: out.join(', ') });
      if (b.px < MIN_TEXT_PX * U) issues.push({ kind: 'small-text', id: b.id, detail: `${b.px}px < ${round(MIN_TEXT_PX * U)}px` });
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue; // nested tags describe the same text
        const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) - 2; // 2 px tolerance
        const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) - 2;
        if (ix > 0 && iy > 0) issues.push({ kind: 'overlap', id: `${a.id}+${b.id}`, detail: `${round(ix)}x${round(iy)}px` });
      }
    const clean = boxes.map(({ el: _el, ...b }) => b);
    console.log(`${AUDIT_TAG} ${JSON.stringify({ comp, frame, width, height, safe: SAFE, boxes: clean, issues })}`);
    setFound({ boxes: clean, issues });
  }, [frame, zoom, width, height, comp, SAFE.x, SAFE.y, U]);

  const bad = new Set(found.issues.flatMap((i) => i.id.split('+')));
  return (
    <AbsoluteFill ref={ref} style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: SAFE.x, top: SAFE.y, right: SAFE.x, bottom: SAFE.y, outline: `2px dashed ${C.mute}` }} />
      {found.boxes.map((b, i) => (
        <div key={i} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, outline: `2px solid ${bad.has(b.id) ? C.accent : C.mute}` }} />
      ))}
    </AbsoluteFill>
  );
};
