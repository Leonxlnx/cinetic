// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// page-fly: a long white page lies on a plane in 3D, tilted back and rolled a little, on a dark void with a light
// hugging its edge. It comes in rising, seen from very close with its headline on screen from the first frame (never a
// blank sheet), the camera dives in on the headline
// and then travels down it in one front-loaded move (fast first, slowing), pulling back to a steady distance while the
// page's paragraphs and table rows write on as they come into view; the far (upper) part of the page stays a little
// soft. At the end the travel speeds up again and the page leaves upward.
// Numbers (frames at 30 fps, px at 1080): the plane tilted 22 deg with a roll from -5.7 to -1 deg; on the first frame
// the page's top edge stands 260 px down and its headline 1010; the camera is steered by where the headline sits on
// screen (AIM: its centre 1010 px down on the first frame, 760 by f3, 230 a third of the way, 150 by the middle,
// creeping to 20), the plane's scroll solved
// through the perspective, so the headline reads big on the dive and settles near 1x; far blur 2.5 px over the top 40 %
// of the frame; edge light 2 px near-white plus a 30 px falloff; the exit accelerates 40 -> 180 px/f in 6 f.
import React from 'react';
import { C } from '../brand/tokens';
import { GlowPool } from '../fx/light';
import { DocPage, docPageLayout, type DocPageProps } from '../kit/screens/DocPage';
import { E, track } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { paletteOf, type Palette, perFrame, type SceneMeta, span, tab, useClock } from './parts';
import { Stage1080 } from './stage1080';

export type PageFlyProps = {
  /** the page: a real document the product makes (kit DocPage: number, brand, title, accentWord, lead, section, body, table, figure) */
  page: Omit<DocPageProps, 'write' | 'frame' | 'tone' | 'pt' | 'view' | 'backdrop' | 'style'>;
  /** ground: the void; accent: the page's accent and the edge light; paper: the page */
  palette?: Partial<Palette>;
  /** false: the page holds at the end instead of leaving upward */
  exit?: boolean;
  frame?: number;
};

export const PAGE_FLY = {
  dur: 72,
  rise: [0, 9] as const,
  travel: [6, 60] as const,
  exit: [64, 72] as const,
  tilt: 22,
  pt: 2.9,
} as const;

// where the headline's centre sits on screen (px) frame by frame: it comes in on the first frame with the page rising, then the
// camera's front-loaded travel down the page carries it up and slows (the dive's magnification holds 1.4, eases to 1.02);
// the headline's cap reads ~130 px on the dive, ~100 a third of the way and ~70 from the middle on
const AIM: [number, number][] = [[0, 1010], [1, 915], [2, 832], [3, 760], [4, 696], [5, 640], [7, 548], [9, 476], [12, 390], [16, 302], [21, 232], [26, 182], [31, 146], [36, 116], [42, 97], [47, 84], [52, 60], [60, 20]];
const ZOOM: [number, number][] = [[0, 1.4], [0.3, 1.38], [0.5, 1.1], [1, 1.02]];
const PERSP = 1600;
const FOCUS_Y = 400; // the plane's origin on screen

/** The camera at frame t for a page whose headline centre is `from` px down it: the plane's scroll, magnification and roll. */
export const pageFlyCamera = (t: number, from: number) => {
  const tq = span(t, PAGE_FLY.travel[0], PAGE_FLY.travel[1]); // the measured zoom table shapes it
  const m = track(tq, ZOOM);
  const a = (PAGE_FLY.tilt * Math.PI) / 180;
  // solve the plane offset that puts the headline at AIM on screen: y = T d / (m (d cos a + T sin a))
  const T = track(t, AIM) - FOCUS_Y;
  const y1 = (T * PERSP) / (m * (PERSP * Math.cos(a) + T * Math.sin(a)));
  return { scroll: from - y1, m, z: PERSP * (1 - 1 / m), roll: -5.7 + 4.7 * E.glideOut(span(tq, 0, 0.45)) };
};
/** Screen y of a point `yp` px down the page (roll ignored) for a camera from pageFlyCamera. */
export const pageFlyScreenY = (yp: number, cam: ReturnType<typeof pageFlyCamera>) => {
  const a = (PAGE_FLY.tilt * Math.PI) / 180;
  const y1 = yp - cam.scroll;
  return FOCUS_Y + (y1 * Math.cos(a) * PERSP) / (PERSP - cam.z - y1 * Math.sin(a));
};
const EXIT_V = perFrame(PAGE_FLY.exit[0], [0, 40, 100, 190, 320, 500, 680, 860, 1040]);

export const PageFly: React.FC<PageFlyProps> = ({ page, palette, exit = true, frame }) => {
  const { t, k, W, H } = useClock(frame);
  const P = paletteOf({ ground: mixColor(C.ink, palette?.accent ?? C.accent, 0.08), ...palette });
  const pt = PAGE_FLY.pt;
  const lay = docPageLayout(page, 0, { pt });
  const pw = lay.w;
  // the travel: steered by the headline's place on screen; the table rows come up from below as it slows
  const from = (lay.focus.title?.y ?? 0) + (lay.focus.title?.h ?? 0) * 0.5;
  const { scroll, z, roll } = pageFlyCamera(t, from);
  const exitDy = exit ? tab(t, EXIT_V) : 0;
  const exitBlur = exit ? Math.min(8, exitDy / 60) : 0;
  const focusY = FOCUS_Y;
  const rim = palette?.lift ?? mixColor(C.white, P.accent, 0.25); // the world's light on the page's edge
  // the page is there; its table rows drop in one after another as the camera comes down to them
  const write = { at: 0, wps: 3000 };
  const plane = (blurred: boolean) => (
    <div style={{ position: 'absolute', inset: 0, perspective: PERSP, perspectiveOrigin: `960px ${focusY}px` }}>
      <div
        style={{
          position: 'absolute',
          left: 960 - pw / 2,
          top: focusY,
          width: pw,
          height: lay.h,
          transformOrigin: `${pw / 2}px 0px`,
          transform: `translateY(${(-exitDy).toFixed(2)}px) translateZ(${z.toFixed(2)}px) rotateX(${PAGE_FLY.tilt}deg) rotateZ(${roll.toFixed(3)}deg) translateY(${(-scroll).toFixed(2)}px)`,
          borderRadius: 6 * pt,
          boxShadow: blurred ? undefined : `0 0 0 3px ${mixColor(rim, C.white, 0.6)}, 0 0 26px 8px ${withAlpha(rim, 0.75)}, 0 0 110px 30px ${withAlpha(rim, 0.3)}`,
        }}
      >
        <DocPage {...page} pt={pt} tone="light" ground={P.paper} accent={P.accent} frame={frame ?? t * k} write={write} style={{ position: 'absolute', left: 0, top: 0 }} />
      </div>
    </div>
  );
  const far = 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 22%, rgba(0,0,0,0) 46%)';
  return (
    <Stage1080 W={W} H={H} ground={P.ground}>
      {/* the haze in the far corner, lit by the page */}
      <GlowPool x={1820} y={1000} r={620} ry={460} color={mixColor(P.ground, rim, 0.6)} strength={0.4 * span(t, 18, 40)} />
      <div style={{ position: 'absolute', inset: 0, filter: exitBlur > 0.2 ? `blur(${exitBlur.toFixed(2)}px)` : undefined }}>
        {plane(false)}
        {/* the far part of the page a little soft: a blurred copy over the top of the frame */}
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(2.5px)', WebkitMaskImage: far, maskImage: far }}>{plane(true)}</div>
      </div>
    </Stage1080>
  );
};

export const pageFlyMeta: SceneMeta = {
  id: 'page-fly',
  does: 'a long page on a tilted plane rises in on a dark void; the camera dives onto its headline and travels down it in one front-loaded move while the rows write on',
  dur: PAGE_FLY.dur,
  props: ['page', 'palette?', 'exit?'],
  handIn: { form: 'page', x: 288, y: 260, w: 1344, h: 1740, r: 14 },
  handOut: { form: 'page', x: 288, y: -900, w: 1344, h: 1740, r: 14 },
  klass: 'big',
  cues: [
    { f: 2, kind: 'whoosh', id: 'page-rises', weight: 0.6 },
    { f: 12, kind: 'land', id: 'headline', weight: 0.6 },
    { f: 24, kind: 'tick', id: 'rows', weight: 0.3 },
    { f: 36, kind: 'tick', id: 'rows-2', weight: 0.3 },
    { f: PAGE_FLY.exit[0] + 1, kind: 'whoosh', id: 'exit', weight: 0.5 },
  ],
};
