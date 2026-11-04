// The house scenes: one per form, each drawing the element in that form with the device its act's verb asks for
// (lib/spine VERB_DEVICES), filled from the case. src/product.tsx picks one for every scene of src/spine.ts and gives it
// the product's own content; write a scene of your own (the same SceneDef shape) when the product needs another picture.
//
//   word    the line alone (the promise, the claim): built word by word, its starred word IS the element (it swells
//           into the next form while the other words part away from it)
//   prompt  macro-type: the request typed into a lit input; the camera pushes in to macro on the caret, rides it,
//           pulls back to read the request whole, a pointer presses send (a glow the size of the button)
//   site    page-fly / push-press: the page the product makes, written section by section, filmed whole with its
//           toolbar, then one push in toward the toolbar (mode 'page'); the button scene carries that push on to the
//           button, the cursor arrives once it has landed and presses right before the handover (mode 'button')
//   live    the state the press makes, a status pill in the product's own words (a line inside): a band of light
//           crosses it as it lands, its dot pings once; the world's turn floods out of it
//   notice  toast-stack: notices rise into the front slot and push the stack up and back (blur, dim, scale by slot); a line
//           around it: the giant line builds in front while the stack racks soft behind it, then lifts away
//   count   glass-counter: the many fold into one figure that climbs in cut steps, the faces beside it
//   lockup  the mark grows out of the last form large and alone, pulls back as the name slides out from behind it, the
//           fact under it, a band of light once it is whole; it keeps creeping in to the last frame
//
// Every scene: one sharp plane, cards lit (the kit's material: a sheen, a hairline, a top light, two shadows) or glass,
// facing the camera; its camera's one move lands on the scene's end (the hold is the tail of that move, never a dead
// frame); its surroundings leave on the handover's lead and arrive on its landing; its own copy of the element is drawn
// at `own` (0 while the handover carries it). Pure in the frame: any frame, any order.
import React from 'react';
import { Img } from 'remotion';
import { C, FONT, MASK } from '../brand/tokens';
import { Cursor } from '../fx/Cursor';
import { Defocus } from '../fx/Defocus';
import { TYPE_FEATURES } from '../fx/TypePairs';
import { BrowserWindow, browserWindowLayout, type BrowserWindowProps, Face, Icon, type NoticeItem, NoticeStack, noticeStackLayout, Panel, PromptBar, promptBarLayout, type PromptBarProps, type Site, type Skin, skinOf, textW, typedAt } from '../kit/screens';
import { KIT_FONT } from '../kit/parts';
import { clamp, E, mix } from '../lib/anim';
import { mixColor, toOklch } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { measureTracked } from '../lib/measure';
import { f60x, FACT_AT, FPS, GATHER, H, type LineTime, LOCK, LOCKUP_AT, NAME_AT, W } from '../timeline';
import { type Box, type Cam2, camAt, camCss, type CamKey, creep, frameBox, holdEase, REST, under, union } from './cam';
import { glyphSweep } from '../lib/moves';
import { CHIP, keyBox, LINE_SET, LineWords, setLine } from './line';
import type { Look, Tone } from '../world';


/** What a scene knows at a frame. */
export type SceneCtx = {
  i: number; // the scene's index in the plan
  f: number; // frames since the scene began (past its end on the out side of a handover)
  F: number; // the film frame
  dur: number; // its frames
  fps: number;
  tone: Tone; // the world's value here (light cards on a light stage, dark glass on a field or at night)
  look: Look;
  land: number; // frames the incoming handover takes to land (0: none)
  leadAt: number; // the frame (scene's own) the outgoing handover's lead starts (dur: none)
  inP: number; // 0..1 through the landing
  outP: number; // 0..1 through the outgoing lead
  own: number; // the opacity of the scene's own copy of the element (0 while the handover carries it)
  line?: LineTime; // the line this scene draws (alone, inside, around)
  prev?: { dur: number }; // the scene before it (a same-surface scene picks its camera up where that one left it)
};
export type ElementLook = { box: Box; r?: number; fill?: string; rim?: { color: string; a: number; w: number }; shadow?: { y: number; blur: number; a: number }; picture?: boolean };
export type MomentKind = 'tick' | 'tock' | 'hit' | 'land' | 'pop' | 'whoosh' | 'riser' | 'drop' | 'key' | 'click' | 'snap' | 'swell' | 'bell' | 'suck' | 'text';
/** A sound the scene's own action makes, frames from the scene's start. */
export type Moment = { f: number; kind: MomentKind; weight: number; action: string; id: string; dur?: number; apexFrac?: number; pan?: number };
export type MomentCtx = { dur: number; fps: number; land: number; leadAt: number; i: number; prev?: { dur: number } };
export type SceneDef = {
  form: string;
  Draw: React.FC<{ c: SceneCtx }>;
  /** the element on screen (film px) */
  el: (c: SceneCtx) => ElementLook;
  /** the element alone, laid out at w x h (the handover's content on this side) */
  Content?: React.FC<{ c: SceneCtx; w: number; h: number }>;
  /** converge: the many that collapse to the point */
  many?: (c: SceneCtx) => Box[];
  moments?: (m: MomentCtx) => Moment[];
  /** the scene's own designed cuts, frames from its start (a house scene's snaps and hits: declared, never a swap) */
  cuts?: () => number[];
};

const FULL: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: W, height: H };
/** The kit's skin for a scene: light lit cards on a stage and on the brand's field (white on the colour reads crisp), dark glass at night. */
export const skinAt = (c: Pick<SceneCtx, 'tone' | 'look'>): Skin => skinOf(c.tone === 'light' || c.look.kind === 'field' ? 'light' : 'dark', c.look.bottom, C.accent);
const k60 = (n: number, fps: number) => f60x(n, fps);
/** Surroundings: in over the landing, out over the lead (the element itself is the handover's). */
const around = (c: SceneCtx) => E.glideOut(clamp(c.land ? c.inP : 1)) * (1 - E.buildIn(clamp(c.outP)));
const Stage: React.FC<{ cam: Cam2; children: React.ReactNode; style?: React.CSSProperties }> = ({ cam, children, style }) => (
  <div style={{ ...FULL, overflow: 'hidden', ...style }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: camCss(cam) }}>{children}</div>
  </div>
);
/** A soft light the size of its source (a press, a landing): rises in 4 f, holds 3, falls 22 (f@60). */
const Glow: React.FC<{ f: number; at: number; x: number; y: number; r: number; fps: number; color?: string; peak?: number }> = ({ f, at, x, y, r, fps, color = C.white, peak = 0.8 }) => {
  const t = f - at;
  if (t < 0 || t > k60(30, fps)) return null;
  const a = t < k60(4, fps) ? E.snapOut(t / k60(4, fps)) : t < k60(7, fps) ? 1 : 1 - E.softOut(clamp((t - k60(7, fps)) / k60(22, fps)));
  return <div style={{ position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', background: `radial-gradient(closest-side, ${withAlpha(color, 1)} 0%, ${withAlpha(color, 0)} 100%)`, opacity: a * peak, mixBlendMode: 'screen' }} />;
};

/**
 * (Drawn on the scenes' own cards, never inside a handover's carried content: there the fall-off would melt the
 * element's edge into a light stage, and the carried element must stay the crispest thing in the frame.)
 * The key's light across a card: a bright rim along its top edge and a thin shade inside its bottom edge (its
 * thickness). A kit card (kit/card Card, every kit/screens Panel) lights its own face (the key's fall-off from the upper
 * left, 6-7 L* across: look-audit card-slab passes it), so over one the rim is all this adds; `face` lays the fall-off
 * too (5-7 L* toward the far bottom corner, multiplied so the words keep their ink) on a surface the template draws
 * itself (the mark's tile).
 */
export const Lit: React.FC<{ w: number; h: number; r: number; x?: number; y?: number; dark?: boolean; k?: number; face?: boolean }> = ({ w, h, r, x = 0, y = 0, dark = false, k = 1, face = false }) => (
  <>
    {face ? <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, pointerEvents: 'none', mixBlendMode: 'multiply', background: `linear-gradient(166deg, rgba(255, 255, 255, 0) 0%, ${withAlpha(mixColor(C.ink, C.accent, 0.35), dark ? 0.22 : 0.15)} 100%)` }} /> : null}
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, pointerEvents: 'none', boxShadow: `inset 0 ${(2 * k).toFixed(2)}px 0 rgba(255, 255, 255, ${dark ? 0.28 : 1}), inset 0 ${(-2 * k).toFixed(2)}px 0 ${withAlpha(mixColor(C.ink, C.accent, 0.3), 0.08)}` }} />
  </>
);

// ------------------------------------------------------------------------------------------------ word

/** The line alone; its starred word is the element. */
export const wordScene = (): SceneDef => {
  const lay = (c: SceneCtx) => {
    const line = c.line as LineTime;
    const L = setLine(line.raw, line.claim ? LINE_SET.claim : LINE_SET.alone, H);
    const t = c.F - line.in;
    const s = 1 + 0.06 * (c.f / Math.max(1, c.dur)); // the held line creeps (a slow push), never a still frame
    // once read, the key word takes the centre as a chip (the element) while the other words part away from it; they
    // stay in sight (parting, fading) until the cut, so the chip is never alone on an empty ground
    const from = Math.min(c.leadAt - k60(GATHER.lead, c.fps), line.out - (c.F - c.f)); // once read (1.2 s at most)
    const g = c.leadAt < c.dur ? clamp((c.f - from) / k60(GATHER.dur, c.fps)) : 0;
    const part = c.leadAt < c.dur ? clamp((c.f - from) / Math.max(1, c.dur - from)) : 0;
    return { line, L, t, s, g, part };
  };
  return {
    form: 'word',
    Draw: ({ c }) => {
      if (!c.line) return null;
      const { line, L, t, s, g, part } = lay(c);
      // a chip that landed in the line stays a chip on the key word and fades to the plain word over 14 f@60
      const chipK = c.land && c.f >= c.land ? 1 - clamp((c.f - c.land) / k60(14, c.fps)) : 0;
      return <LineWords L={L} t={t} fps={c.fps} cx={W / 2} cy={H / 2} ink={c.look.ink} accent={c.look.accent} out={Math.max(c.outP, part)} keyOpacity={c.own} s={s} id={line.id} gather={g} chip={c.look.accent} chipK={chipK} />;
    },
    el: (c) => {
      if (!c.line) return { box: { x: W / 2 - 60, y: H / 2 - 40, w: 120, h: 80 } };
      const { L, t, s, g } = lay(c);
      const k = keyBox(L, t, c.fps, W / 2, H / 2, s);
      // the chip is a lit object in flight: a contact shadow on a light ground, an edge light on a dark one
      const lit = { shadow: { y: 6, blur: 30, a: c.look.tone === 'light' ? 0.3 : 0 }, rim: { color: C.white, a: c.look.tone === 'light' ? 0 : 0.32, w: 2 } };
      if (g <= 0) return c.f < c.dur / 2 && c.land ? { box: k, r: k.h / 2, fill: c.look.accent, ...lit } : { box: k, fill: 'rgba(255, 255, 255, 0)' };
      // gathered: the chip where the key word stands (it leaves from there: the handover carries it, no move of its own)
      const pad = CHIP.pad * L.size * s;
      return { box: { x: k.x - pad, y: k.y - pad * 0.4, w: k.w + 2 * pad, h: k.h + pad * 0.8 }, r: (k.h + pad) / 2, fill: c.look.accent, ...lit };
    },
    Content: ({ c, w, h }) => {
      if (!c.line) return null;
      const { L, s } = lay(c);
      const keys = L.words.filter((x) => x.key);
      const k = { word: keys.length ? keys.map((x) => x.word).join(' ') : L.words[L.words.length - 1].word };
      // white on the chip, ink on a light chip (a yellow accent, the white chip of a colour field)
      const onChip = toOklch(c.look.accent)[0] > 0.78 ? C.ink : C.white;
      return <div style={{ width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'pre', fontFamily: FONT.text, fontSize: L.size * s, fontWeight: Math.min(860, L.weight + LINE_SET.keyGain), letterSpacing: `${LINE_SET.track}em`, lineHeight: 1.12, color: onChip, ...TYPE_FEATURES }}>{k.word}</div>;
    },
  };
};

// ------------------------------------------------------------------------------------------------ prompt (macro-type)

export type PromptSpec = { text: string; placeholder?: string; model?: string; w?: number; pt?: number; mag?: number };
/** The request typed into a lit input; the camera rides the caret at macro scale, pulls back to read it whole, send is pressed. */
export const promptScene = (P: PromptSpec): SceneDef => {
  const pt = P.pt ?? 1.8;
  // as wide as the whole request needs: it is read whole once the camera pulls back (never cut by the field's edge)
  const w = P.w ?? 1400; // as wide as a request of 60 characters needs at this size (read whole once the camera pulls back); set w for a longer one
  const mag = P.mag ?? 1.85;
  const times = (dur: number, land: number, fps: number) => {
    const at = land + k60(6, fps);
    const end = Math.round(dur * 0.6);
    const cps = clamp(P.text.length / Math.max(0.4, (end - at) / fps), 16, 46);
    return { at, end, cps, pull: end + k60(6, fps), send: Math.round(dur * 0.85) };
  };
  const props = (c: Pick<SceneCtx, 'dur' | 'land' | 'fps' | 'tone' | 'look'>): PromptBarProps => {
    const t = times(c.dur, c.land, c.fps);
    return { text: P.text, placeholder: P.placeholder ?? 'Describe what you are launching', model: P.model, at: t.at, cps: t.cps, send: t.send, size: 'lg', w, pt, mic: true, seed: P.text, tone: c.tone === 'light' ? 'light' : 'dark', ground: c.look.bottom };
  };
  const barBox = (c: SceneCtx): Box => {
    const L = promptBarLayout(props(c), 0, { pt, fps: c.fps });
    return { x: (W - L.w) / 2, y: (H - L.h) / 2, w: L.w, h: L.h };
  };
  const cam = (c: SceneCtx): Cam2 => {
    const t = times(c.dur, c.land, c.fps);
    const p = props(c);
    const bb = barBox(c);
    const caretX = (g: number) => {
      const L = promptBarLayout(p, Math.max(0, g), { pt, fps: c.fps });
      return bb.x + L.focus.caret.x;
    };
    // the caret, smoothed over the last 10 f@60 (the camera rides it, never jitters with each key)
    const lag = k60(10, c.fps);
    const cx = [0, 0.25, 0.5, 0.75, 1].reduce((a, q) => a + caretX(c.f - q * lag), 0) / 5;
    const macroIn = E.snapOut(clamp((c.f - t.at) / k60(18, c.fps)));
    const macroOut = E.strongInOut(clamp((c.f - t.pull) / k60(26, c.fps)));
    const m = macroIn * (1 - macroOut);
    const tail = E.glideOut(clamp((c.f - t.pull) / Math.max(1, c.dur - t.pull)));
    const L0 = promptBarLayout(p, 0, { pt, fps: c.fps });
    const sendX = bb.x + L0.focus.send.x + L0.focus.send.w / 2;
    // the bar lands from its handover still settling (a short glide into the macro push), never a dead stop
    const settle = 0.965 + 0.035 * E.glideOut(clamp(c.f / Math.max(1, t.at + k60(12, c.fps))));
    const s = Math.exp(Math.log(mag) * m) * (1 + 0.07 * tail) * settle;
    const tx = mix(W / 2, cx - (W * 0.08) / s, m) + tail * (sendX - W / 2) * 0.2 * (1 - m);
    return { tx, ty: H / 2, s };
  };
  return {
    form: 'pill',
    Draw: ({ c }) => {
      const p = props(c);
      const bb = barBox(c);
      const t = times(c.dur, c.land, c.fps);
      const L = promptBarLayout(p, c.f, { pt, fps: c.fps });
      const sx = bb.x + L.focus.send.x + L.focus.send.w / 2;
      const sy = bb.y + L.focus.send.y + L.focus.send.h / 2;
      const reach = E.strongInOut(clamp((c.f - (t.send - k60(26, c.fps))) / k60(24, c.fps)));
      const press = c.f < t.send ? 0 : 1 - E.buildIn(clamp((c.f - t.send - k60(6, c.fps)) / k60(12, c.fps)));
      const pointer = c.f >= t.send - k60(26, c.fps);
      const cm = cam(c);
      return (
        <Stage cam={cm}>
          <div style={{ position: 'absolute', left: bb.x, top: bb.y, opacity: c.own }}>
            <PromptBar {...p} frame={c.f} />
            <Lit w={bb.w} h={bb.h} r={bb.h / 2} />
          </div>
          <Glow f={c.f} at={t.send + k60(3, c.fps)} x={sx} y={sy} r={L.focus.send.w * 1.05} fps={c.fps} color={mixColor(C.accent, C.white, 0.5)} peak={0.55} />
          {pointer && c.own > 0.5 ? (
            <div style={{ position: 'absolute', left: 0, top: 0, opacity: clamp((c.f - (t.send - k60(26, c.fps))) / k60(6, c.fps)) * around(c) }}>
              <Cursor x={sx + mix(170, 2, reach)} y={sy + mix(120, 4, reach)} scale={1.25} shape="pointer" fill={C.white} outline={C.ink} press={press} />
            </div>
          ) : null}
        </Stage>
      );
    },
    el: (c) => {
      const bb = barBox(c);
      const cm = cam(c);
      const sk = skinAt(c);
      return { box: under(cm, bb), r: (bb.h / 2) * cm.s, fill: sk.face, shadow: { y: 14, blur: 40, a: c.tone === 'light' ? 0.14 : 0.4 } };
    },
    Content: ({ c, w: bw }) => {
      const p = props(c);
      const L = promptBarLayout(p, 0, { pt, fps: c.fps });
      const k = bw / L.w;
      return (
        <div style={{ position: 'relative', width: L.w * k, height: L.h * k }}>
          <PromptBar {...p} w={L.w * k} pt={pt * k} frame={Math.max(0, c.f)} style={{ boxShadow: 'none' }} />
        </div>
      );
    },
    moments: (m) => {
      const t = times(m.dur, m.land, m.fps);
      const ty = typedAt(P.text, 1e9, { at: t.at, cps: t.cps, fps: m.fps, seed: P.text });
      const keys = ty.keys.filter((_, i) => i % 2 === 0).map((k, i): Moment => ({ f: Math.round(t.at + k), kind: 'key', weight: 0.16, action: 'key', id: `key${i + 1}`, pan: ((i % 5) - 2) * 0.06 }));
      return [...keys, { f: t.send, kind: 'click', weight: 0.7, action: 'press', id: 'send' }];
    },
  };
};

// ------------------------------------------------------------------------------------------------ site (page-fly, push-press)

export type SiteSpec = { site: Site; toolbar?: { status: string; action: string }; w?: number };
/** The page the product makes, built section by section, then one push in toward its toolbar (mode 'page'); the same surface pushed on to its button and pressed (mode 'button'). */
export const siteScene = (S: SiteSpec, mode: 'page' | 'button'): SceneDef => {
  const ww = S.w ?? 1180;
  const pt = ww / 1024;
  const tb = S.toolbar ?? { status: 'Draft', action: 'Publish' };
  const geo = () => {
    const p: BrowserWindowProps = { ...S.site, w: 1024, pt, tone: 'light' };
    const L = browserWindowLayout(p, 0, { pt });
    const x = (W - L.w) / 2;
    const y = (H - L.h) / 2 + 46;
    // the product's own toolbar above the page's top right: its state and the button the act presses
    const th = 92;
    const bw = Math.max(170, textW(tb.action, 40, 620) + 72);
    const sw = textW(tb.status, 40, 520) + 86;
    const tw = 10 + sw + 10 + bw + 10;
    const tbox = { x: x + L.w - tw, y: y - th - 18, w: tw, h: th };
    const btn = { x: tbox.x + tbox.w - 10 - bw, y: tbox.y + 8, w: bw, h: th - 16 };
    return { p, L, win: { x, y, w: L.w, h: L.h }, tbox, btn, sw };
  };
  // the page writes itself from the cut: its chrome and headline are there while it grows out of the request, the rest
  // section by section under the camera's travel
  const pageTimes = (dur: number, _land: number) => ({ at: -Math.round(dur * 0.08), every: Math.max(2, (dur * 0.55) / 9) });
  // ONE move: the page and its toolbar whole while the page writes itself, then a front-loaded push in toward the
  // toolbar that keeps travelling to the scene's end; the button scene picks it up and lands on the button. It never
  // goes there and back, and the toolbar never leaves the frame.
  const pageKeys = (dur: number, land: number, fps: number): CamKey[] => {
    const g = geo();
    const whole = frameBox(union(g.win, g.tbox), 0.8, 0.86);
    const tc = { x: g.tbox.x + g.tbox.w / 2, y: g.tbox.y + g.tbox.h / 2 };
    const toward = { tx: whole.tx + (tc.x - whole.tx) * 0.24, ty: whole.ty + (tc.y - whole.ty) * 0.24, s: whole.s * 1.16 };
    return [
      { f: 0, c: whole },
      { f: Math.max(land + k60(6, fps), Math.round(dur * 0.34)), c: whole },
      { f: dur, c: toward, e: holdEase(E.liftOut, 0.25) },
    ];
  };
  const cam = (c: SceneCtx): Cam2 => {
    if (mode === 'page') return camAt(pageKeys(c.dur, c.land, c.fps), c.f);
    const g = geo();
    const from = c.prev ? camAt(pageKeys(c.prev.dur, 0, c.fps), c.prev.dur) : frameBox(g.win, 0.7);
    const btn = { tx: g.btn.x + g.btn.w / 2 - 30, ty: g.btn.y + g.btn.h / 2 + 40, s: 2.3 };
    return camAt([{ f: 0, c: from }, { f: k60(38, c.fps), c: btn, e: E.liftOut }, { f: c.dur, c: { ...btn, s: 2.5 }, e: holdEase(E.glideOut) }], c.f);
  };
  // the press comes right before the handover's lead: the press IS the cause of what follows (never a cursor parked on
  // the button); the cursor glides in once the push has landed
  const press = (dur: number, leadAt: number, fps: number) => Math.min(dur - k60(6, fps), Math.max(Math.round(dur * 0.42), k60(52, fps), Math.round(leadAt - k60(12, fps))));
  return {
    form: mode === 'page' ? 'page' : 'button',
    Draw: ({ c }) => {
      const g = geo();
      const cm = cam(c);
      const sk = skinAt(c);
      const bt = pageTimes(c.prev && mode === 'button' ? c.prev.dur : c.dur, mode === 'button' ? 0 : c.land);
      const pf = mode === 'button' ? 1e5 : c.f;
      const pr = press(c.dur, c.leadAt, c.fps);
      const q = mode === 'button' && c.f >= pr ? 1 - E.buildIn(clamp((c.f - pr - k60(6, c.fps)) / k60(12, c.fps))) : 0;
      const pressed = mode === 'button' && c.f >= pr;
      // the cursor arrives on a decelerating jump once the push has landed (most of the way in its first frames) and
      // settles on the button just before the press
      const cIn = Math.max(k60(34, c.fps), pr - k60(40, c.fps));
      const reach = E.out(clamp((c.f - cIn) / Math.max(1, pr - k60(4, c.fps) - cIn)));
      const winA = mode === 'page' ? c.own : around(c) * 0.999 + 0.001;
      return (
        <Stage cam={cm}>
          <div style={{ position: 'absolute', left: g.win.x, top: g.win.y, opacity: mode === 'page' ? winA : 1 }}>
            <BrowserWindow {...g.p} build={{ at: bt.at, every: bt.every }} frame={pf} />
            <Lit w={g.win.w} h={g.win.h} r={28 * pt} />
            {/* each card on the page catches the key too (never a flat slab inside the page) */}
            {['chrome', 'card0', 'card1', 'card2', 'notice'].map((n) => {
              const b = g.L.focus[n];
              return b ? <Lit key={n} x={b.x} y={b.y} w={b.w} h={b.h} r={b.r ?? 16 * pt} k={pt} /> : null;
            })}
          </div>
          {/* the product's toolbar: its state chip and the button */}
          <div style={{ position: 'absolute', left: g.tbox.x, top: g.tbox.y, opacity: mode === 'page' ? E.glideOut(clamp((c.f - c.land) / k60(20, c.fps))) * (1 - c.outP) : 1 }}>
            <Panel skin={sk} w={g.tbox.w} h={g.tbox.h} r={g.tbox.h / 2} lift={0.4}>
              <div style={{ position: 'absolute', left: 22, top: 0, height: g.tbox.h, display: 'flex', alignItems: 'center', gap: 12, fontFamily: KIT_FONT, fontSize: 40, fontWeight: 520, color: sk.mute, whiteSpace: 'pre' }}>
                <div style={{ width: 16, height: 16, borderRadius: 8, background: pressed ? C.accent : mixColor(sk.mute, sk.face, 0.4) }} />
                <span data-text="toolbar-status">{tb.status}</span>
              </div>
            </Panel>
            <Lit w={g.tbox.w} h={g.tbox.h} r={g.tbox.h / 2} />
            <div data-focus="publish" style={{ position: 'absolute', left: g.btn.x - g.tbox.x, top: g.btn.y - g.tbox.y, width: g.btn.w, height: g.btn.h, borderRadius: g.btn.h / 2, opacity: mode === 'button' ? c.own : 1, transform: `scale(${(1 - 0.08 * q).toFixed(4)})`, background: `linear-gradient(180deg, ${mixColor(C.accent, C.white, 0.16)} 0%, ${C.accent} 100%)`, boxShadow: `0 6px 16px -6px ${mixColor(C.accent, MASK, 0.4)}, inset 0 1px 0 rgba(255,255,255,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KIT_FONT, fontSize: 40, fontWeight: 620, color: C.white, whiteSpace: 'pre' }}>
              <span data-text="toolbar-action">{tb.action}</span>
            </div>
          </div>
          {mode === 'button' ? <Glow f={c.f} at={pr + k60(4, c.fps)} x={g.btn.x + g.btn.w / 2} y={g.btn.y + g.btn.h / 2} r={g.btn.w * 0.62} fps={c.fps} color={mixColor(C.accent, C.white, 0.55)} peak={0.5} /> : null}
          {mode === 'button' && c.f >= cIn && c.own > 0.5 ? (
            <div style={{ position: 'absolute', left: 0, top: 0, opacity: clamp((c.f - cIn) / k60(4, c.fps)) }}>
              <Cursor x={g.btn.x + g.btn.w * 0.6 + mix(250, 0, reach)} y={g.btn.y + g.btn.h * 0.6 + mix(190, 0, reach)} scale={0.62} shape="pointer" fill={C.white} outline={C.ink} press={q} />
            </div>
          ) : null}
        </Stage>
      );
    },
    el: (c) => {
      const g = geo();
      const cm = cam(c);
      const sk = skinAt(c);
      if (mode === 'page') return { box: under(cm, g.win), r: 28 * pt * cm.s, fill: sk.face, shadow: { y: 18, blur: 48, a: 0.14 } };
      return { box: under(cm, g.btn), r: (g.btn.h / 2) * cm.s, fill: C.accent };
    },
    Content: ({ c, w: bw }) => {
      const g = geo();
      if (mode === 'button') {
        const k = bw / g.btn.w;
        return <div style={{ width: g.btn.w * k, height: g.btn.h * k, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: KIT_FONT, fontSize: 40 * k, fontWeight: 620, color: C.white, whiteSpace: 'pre' }}>{tb.action}</div>;
      }
      const k = bw / g.win.w;
      const bt = pageTimes(c.dur, c.land);
      return (
        <div style={{ position: 'relative', width: g.win.w * k, height: g.win.h * k }}>
          <BrowserWindow {...g.p} pt={pt * k} build={{ at: bt.at, every: bt.every }} frame={c.f} style={{ boxShadow: 'none' }} />
        </div>
      );
    },
    moments: (m) => {
      if (mode === 'button') return [{ f: press(m.dur, m.leadAt, m.fps), kind: 'click', weight: 0.85, action: 'touch', id: 'press' }, { f: k60(2, m.fps), kind: 'swell', weight: 0.3, action: 'shape', id: 'push-in', dur: k60(36, m.fps), apexFrac: 0.7 }];
      const bt = pageTimes(m.dur, m.land);
      return [1, 3, 4, 6, 8].map((k, i): Moment => ({ f: Math.round(bt.at + k * bt.every), kind: 'pop', weight: 0.22 + 0.04 * i, action: 'card-land', id: `section${k}`, pan: (i % 2 ? 0.12 : -0.12) }));
    },
  };
};

// ------------------------------------------------------------------------------------------------ live (a status pill: a line inside)

export type LiveSpec = { words: string; strong?: string; w?: number; h?: number };
/** The state the press makes, in the product's own words; a band of light crosses it as it lands, its dot pings once. */
export const liveScene = (P: LiveSpec): SceneDef => {
  const h = P.h ?? 150;
  const font = h * 0.36;
  const parts = P.words.split(/\s+/).filter(Boolean);
  const strong = P.strong ?? parts[0];
  const geo = () => {
    const tw = textW(P.words, font, 560) + parts.length * font * 0.04;
    const w = P.w ?? Math.round(h * 0.42 + 26 + 20 + tw + 30 + font * 0.9 + h * 0.36);
    return { box: { x: (W - w) / 2, y: (H - h) / 2, w, h } };
  };
  const cam = (c: SceneCtx): Cam2 => creep(camAt([{ f: 0, c: REST }, { f: c.dur, c: { ...REST, s: 1.1 }, e: holdEase(E.glideOut) }], c.f), c.f, c.land, c.fps, 0.1);
  const Pill: React.FC<{ c: SceneCtx; k?: number }> = ({ c, k = 1 }) => {
    const sk = skinOf('light', c.look.bottom, C.accent);
    const g = geo();
    const sweep = clamp((c.f - c.land - k60(2, c.fps)) / k60(26, c.fps));
    const ping = clamp((c.f - c.land) / k60(34, c.fps));
    return (
      <div style={{ position: 'relative', width: g.box.w * k, height: h * k, display: 'flex', alignItems: 'center', paddingLeft: h * 0.42 * k, gap: 20 * k, boxSizing: 'border-box', fontFamily: KIT_FONT, fontSize: font * k, whiteSpace: 'pre', overflow: 'hidden', borderRadius: (h / 2) * k }}>
        <div style={{ position: 'relative', width: 26 * k, height: 26 * k, flex: 'none' }}>
          {ping > 0 && ping < 1 ? <div style={{ position: 'absolute', inset: -ping * 26 * k, borderRadius: '50%', border: `${2 * k}px solid ${C.accent}`, opacity: 1 - ping }} /> : null}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: C.accent, boxShadow: `0 0 ${12 * k}px ${mixColor(C.accent, C.white, 0.4)}` }} />
        </div>
        <span data-text="live" style={{ display: 'flex', gap: font * 0.28 * k }}>
          {parts.map((wd, i) => (
            <span key={i} style={{ fontWeight: wd === strong ? 680 : i > 0 && /\./.test(wd) ? 560 : 460, color: wd === strong || /\./.test(wd) ? sk.text : sk.mute }}>{wd}</span>
          ))}
        </span>
        <Icon name="link" size={font * 0.9 * k} color={sk.mute} style={{ marginLeft: 8 * k }} />
        {sweep > 0 && sweep < 1 ? <div style={{ position: 'absolute', top: 0, bottom: 0, left: mix(-200, g.box.w + 40, E.strongInOut(sweep)) * k, width: 160 * k, background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%)', mixBlendMode: 'screen' }} /> : null}
      </div>
    );
  };
  return {
    form: 'pill',
    Draw: ({ c }) => {
      const g = geo();
      const sk = skinOf('light', c.look.bottom, C.accent);
      return (
        <Stage cam={cam(c)}>
          <div style={{ position: 'absolute', left: g.box.x, top: g.box.y, opacity: c.own }}>
            <Panel skin={sk} w={g.box.w} h={h} r={h / 2} lift={0.6}>
              <Pill c={c} />
            </Panel>
            <Lit w={g.box.w} h={h} r={h / 2} />
          </div>
        </Stage>
      );
    },
    el: (c) => {
      const cm = cam(c);
      return { box: under(cm, geo().box), r: (h / 2) * cm.s, fill: skinOf('light', c.look.bottom, C.accent).face, shadow: { y: 16, blur: 44, a: 0.22 } };
    },
    Content: ({ c, w }) => {
      const k = w / geo().box.w;
      return (
        <div style={{ position: 'relative', width: w, height: h * k }}>
          <Pill c={c} k={k} />
        </div>
      );
    },
    moments: (m) => [{ f: m.land + Math.round(k60(2, m.fps)), kind: 'swell', weight: 0.35, action: 'shape', id: 'sweep', dur: Math.round(k60(26, m.fps)), apexFrac: 0.6 }, { f: m.land, kind: 'bell', weight: 0.4, action: 'success', id: 'live' }],
  };
};

// ------------------------------------------------------------------------------------------------ notice (toast-stack, a line around)

export type NoticeSpec = { items: NoticeItem[]; w?: number; pt?: number; ownMark?: (size: number) => React.ReactNode };
/** The depth ladder by slot: blur (px), brightness, scale step. */
export const LADDER = { blur: [0, 2.5, 3, 3.5, 9, 12], bright: [1, 0.92, 0.85, 0.78, 0.7, 0.62], scale: 0.943, step: 0.36 } as const;
const ladder = (arr: readonly number[], s: number) => {
  const i = Math.min(arr.length - 2, Math.floor(s));
  return mix(arr[i], arr[i + 1], clamp(s - i));
};
/** Notices drop into the front slot and push the stack back; the line around builds in front while the stack racks soft, then lifts away. */
export const noticeScene = (P: NoticeSpec): SceneDef => {
  const w = P.w ?? 1040;
  const pt = P.pt ?? 2.05;
  const cardH = (c: Pick<SceneCtx, 'fps'>) => noticeStackLayout({ items: [P.items[0]], mode: 'list', w, pt }, 600, { pt, fps: c.fps }).h;
  const arrivals = (land: number, fps: number) => P.items.map((_, j) => (j === 0 ? 0 : land + k60(12, fps) + (j - 1) * k60(13, fps)));
  const rack = (c: SceneCtx) => {
    if (!c.line) return 0;
    const a = E.strongInOut(clamp((c.F - c.line.in + k60(4, c.fps)) / k60(16, c.fps)));
    const b = E.strongInOut(clamp((c.F - c.line.out) / k60(18, c.fps)));
    return a * (1 - b);
  };
  const cy = H * 0.5;
  const state = (c: SceneCtx, j: number) => {
    const arr = arrivals(c.land, c.fps);
    let back = 0;
    for (let k = j + 1; k < arr.length; k++) back += E.strongInOut(clamp((c.f - arr[k]) / k60(16, c.fps)));
    const enter = j === 0 ? 1 : E.snapOut(clamp((c.f - arr[j]) / k60(14, c.fps)));
    const ch = cardH(c);
    const r = rack(c);
    const s = LADDER.scale ** back * (1 - 0.12 * r);
    // older notices recede up and back (smaller, softer, dimmer) behind the front card: the stack faces the camera
    const y = cy - ch / 2 - back * ch * LADDER.step * 0.62 + (1 - enter) * ch * 0.85 + r * H * 0.27;
    return { back, enter, s, y, ch, blur: ladder(LADDER.blur, back) + 2.5 * r, bright: ladder(LADDER.bright, back) * (1 - 0.12 * r), o: c.f < arr[j] ? 0 : clamp(enter * 1.6) * clamp(4.8 - back) };
  };
  const boxOf = (c: SceneCtx, j: number): Box => {
    const st = state(c, j);
    const ws = w * st.s;
    return { x: W / 2 - ws / 2, y: st.y + (st.ch - st.ch * st.s) / 2, w: ws, h: st.ch * st.s };
  };
  const front = (c: SceneCtx) => {
    const arr = arrivals(c.land, c.fps);
    let j = 0;
    arr.forEach((a, k) => (c.f >= a ? (j = k) : null));
    return j;
  };
  const cam = (c: SceneCtx): Cam2 => camAt([{ f: 0, c: { ...REST, s: 1.04 } }, { f: c.dur, c: { ...REST, ty: H / 2 + 20, s: 0.95 }, e: holdEase(E.glideOut) }], c.f);
  const NoticeCard: React.FC<{ c: SceneCtx; j: number; k?: number }> = ({ c, j, k = 1 }) => {
    const sk = skinAt(c);
    const it = P.items[j];
    const ch = noticeStackLayout({ items: [it], mode: 'list', w: w * k, pt: pt * k }, 600, { pt: pt * k, fps: c.fps }).h;
    return (
      <div style={{ position: 'relative', width: w * k, height: ch }}>
        <NoticeStack items={[it]} mode="list" tone={sk.tone === 'light' ? 'light' : 'dark'} ground={c.look.bottom} w={w * k} pt={pt * k} frame={600} ownMark={P.ownMark} />
        <Lit w={w * k} h={ch} r={22 * pt * k} dark={sk.dark} k={k} />
      </div>
    );
  };
  return {
    form: 'notice',
    Draw: ({ c }) => {
      const cm = cam(c);
      const fr = front(c);
      const L = c.line ? setLine(c.line.raw, LINE_SET.around, H) : null;
      const lt = c.line ? c.F - c.line.in : -1;
      const lineOut = c.line ? clamp((c.F - c.line.out) / k60(16, c.fps)) : 0;
      return (
        <>
          <Stage cam={cm}>
            {P.items.map((_, j) => {
              const st = state(c, j);
              if (st.o <= 0.002) return null;
              const own = j === 0 ? c.own : 1;
              const b = { x: W / 2 - w / 2, y: st.y };
              return (
                <div key={j} style={{ position: 'absolute', left: b.x, top: b.y, width: w, height: st.ch, transformOrigin: '50% 50%', transform: `scale(${st.s.toFixed(4)})`, opacity: st.o * own * (j === fr ? 1 : around(c) * 0.2 + 0.8), zIndex: 100 - Math.round(st.back * 10), filter: st.bright < 0.995 ? `brightness(${st.bright.toFixed(3)})` : undefined }}>
                  <Defocus sigma={st.blur}>
                    <NoticeCard c={c} j={j} />
                  </Defocus>
                </div>
              );
            })}
          </Stage>
          {L && lt >= 0 && lineOut < 1 ? <LineWords L={L} t={lt} fps={c.fps} cx={W / 2} cy={H * 0.4} ink={c.look.ink} accent={c.look.tone === 'dark' ? C.white : c.look.accent} out={lineOut} lift s={1 + 0.03 * clamp(lt / Math.max(1, c.dur))} id={c.line?.id} /> : null}
        </>
      );
    },
    el: (c) => {
      const sk = skinAt(c);
      return { box: under(cam(c), boxOf(c, front(c))), r: 22 * pt * cam(c).s, fill: sk.face, shadow: { y: 12, blur: 36, a: 0.3 } };
    },
    many: (c) => P.items.map((_, j) => j).filter((j) => state(c, j).o > 0.05).map((j) => under(cam(c), boxOf(c, j))),
    Content: ({ c, w: bw }) => <NoticeCard c={c} j={front(c)} k={bw / w} />,
    moments: (m) => arrivals(m.land, m.fps).slice(1).map((a, i): Moment => ({ f: Math.round(a), kind: 'pop', weight: 0.42 + 0.05 * i, action: 'notify', id: `notice${i + 2}`, pan: (i % 2 ? 0.15 : -0.15) })),
  };
};

// ------------------------------------------------------------------------------------------------ count (glass-counter)

export type CountSpec = { title: string; label: string; from: number; to: number; faces: { name: string; photo?: string }[]; chip?: string };
/** The many folded into one figure that climbs in cut steps, the faces beside it. */
export const countScene = (P: CountSpec): SceneDef => {
  const CZ = 1.22; // the card's scale over its base layout (900 x 360 at 1080p)
  const cw = 900 * CZ;
  const chh = 360 * CZ;
  const box: Box = { x: (W - cw) / 2, y: (H - chh) / 2, w: cw, h: chh };
  const cam = (c: SceneCtx): Cam2 => creep(camAt([{ f: 0, c: REST }, { f: c.dur, c: { ...REST, s: 1.08 }, e: holdEase(E.glideOut) }], c.f), c.f, c.land, c.fps, 0.08);
  const value = (c: SceneCtx) => {
    const a = c.land;
    const b = Math.max(a + 2, Math.round(c.dur * 0.62));
    const step = Math.max(1, Math.round(k60(4, c.fps))); // cut steps: a new figure every 4 f@60 (never a blur of digits)
    const fq = Math.floor(c.f / step) * step;
    return Math.round(mix(P.from, P.to, E.snapOut(clamp((fq - a) / (b - a)))));
  };
  // centred: the figure in the middle of the card (a converge grows it from its centre outward), its words under it
  const Body: React.FC<{ c: SceneCtx; k?: number }> = ({ c, k: k0 = 1 }) => {
    const sk = skinAt(c);
    const v = value(c);
    const k = k0 * CZ;
    return (
      <div style={{ position: 'relative', width: cw * k0, height: chh * k0, fontFamily: KIT_FONT, whiteSpace: 'pre', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginTop: 30 * k, display: 'flex', alignItems: 'center', gap: 14 * k, fontSize: 40 * k, fontWeight: 560, color: sk.mute }}>
          <span data-text="count-title">{P.title}</span>
          {P.chip ? <span style={{ fontSize: 40 * k * 0.62, fontWeight: 620, color: sk.accentText, background: sk.accentSoft, padding: `${4 * k}px ${14 * k}px`, borderRadius: 22 * k }}>{P.chip}</span> : null}
        </div>
        <div data-text="count" style={{ marginTop: 4 * k, fontSize: 150 * k, fontWeight: 720, letterSpacing: '-0.04em', color: sk.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{String(v)}</div>
        <div style={{ marginTop: 16 * k, display: 'flex', alignItems: 'center', gap: 18 * k }}>
          <div style={{ display: 'flex' }}>
            {P.faces.slice(0, 5).map((p, i) => {
              const at = c.land + i * k60(5, c.fps);
              const a = E.snapOut(clamp((c.f - at) / k60(14, c.fps)));
              return (
                <div key={i} style={{ marginLeft: i ? -16 * k : 0, opacity: a, transform: `translateY(${((1 - a) * 14 * k).toFixed(2)}px)`, borderRadius: '50%', boxShadow: `0 0 0 ${3 * k}px ${sk.face}` }}>
                  <Face skin={sk} size={54 * k} name={p.name} src={p.photo} />
                </div>
              );
            })}
          </div>
          <span style={{ fontSize: 40 * k, fontWeight: 500, color: sk.mute }}>{P.label}</span>
        </div>
      </div>
    );
  };
  return {
    form: 'count',
    Draw: ({ c }) => {
      const sk = skinAt(c);
      return (
        <Stage cam={cam(c)}>
          <div style={{ position: 'absolute', left: box.x, top: box.y, opacity: c.own }}>
            <Panel skin={sk} w={cw} h={chh} r={40} lift={0.6}>
              <Body c={c} />
            </Panel>
            <Lit w={cw} h={chh} r={40} />
          </div>
        </Stage>
      );
    },
    el: (c) => {
      const cm = cam(c);
      return { box: under(cm, box), r: 40 * cm.s, fill: skinAt(c).face, shadow: { y: 18, blur: 48, a: 0.3 } };
    },
    Content: ({ c, w }) => (
      <div style={{ position: 'relative', width: w, height: (chh * w) / cw }}>
        <Body c={c} k={w / cw} />
      </div>
    ),
    moments: (m) => {
      const out: Moment[] = [];
      const b = Math.round(m.dur * 0.62);
      for (let f = m.land, i = 0; f < b; f += Math.round(k60(8, m.fps)), i++) out.push({ f, kind: 'tick', weight: 0.12 + 0.02 * Math.min(6, i), action: 'tick', id: `count${i + 1}` });
      out.push({ f: b, kind: 'land', weight: 0.55, action: 'card-land', id: 'count-lands' });
      return out;
    },
  };
};

// ------------------------------------------------------------------------------------------------ lockup

export type LockupSpec = { name: string; fact: string; mark: (size: number, color: string) => React.ReactNode; markRatio?: number; tile?: boolean };
/**
 * The mark grown out of the last form, large and alone (LOCK.solo); it pulls back into the lockup as the name slides
 * out from behind it; the fact under it; a band of light crosses the lockup once the name is whole; the whole keeps
 * creeping in (front-loaded, LOCK.creep) to the last frame, so the end card is never a frozen frame.
 */
export const lockupScene = (P: LockupSpec): SceneDef => {
  const cap = 0.098 * H;
  const fs = cap / 0.72;
  const mk = Math.round(cap * 1.35);
  const gap = cap * 0.42;
  const nameW = () => (typeof document === 'undefined' ? textW(P.name, fs, 720, -0.035) : measureTracked(P.name, fs, 720, -0.035, FONT.text, { trailing: false }));
  const geo = (F: number) => {
    const nw = nameW();
    const total = mk + gap + nw;
    const n = E.glideOut(clamp((F - NAME_AT) / f60x(LOCK.slide)));
    const markX = mix(W / 2 - mk / 2, W / 2 - total / 2, n);
    const y = H / 2 - mk / 2 - 24;
    // alone the mark stands LOCK.solo x its lockup size; it pulls back to 1 on a snap as the name starts to slide
    const z = mix(LOCK.solo, 1, E.snapOut(clamp((F - NAME_AT) / f60x(LOCK.slide * 0.8))));
    return { n, markX, y, nw, total, z, mb: { x: markX + (mk * (1 - z)) / 2, y: y + (mk * (1 - z)) / 2, w: mk * z, h: mk * z } };
  };
  // front-loaded and never still: a short exponential start, then the house hold rate to the last frame
  const creep = (F: number) => {
    const t = (Math.max(0, F - LOCKUP_AT) * 30) / FPS;
    return 1 + LOCK.creep.start * (1 - Math.exp(-t / LOCK.creep.tau30)) + (LOCK.creep.pct / 100) * t;
  };
  const SWEEP_AT = NAME_AT + f60x(LOCK.slide + 6);
  // the mark on its lit tile (house): the element the last form converges into stays a crisp object on any world
  const tile = P.tile !== false;
  return {
    form: 'mark',
    Draw: ({ c }) => {
      const g = geo(c.F);
      const s = creep(c.F);
      const ink = c.look.ink;
      const fact = E.glideOut(clamp((c.F - FACT_AT) / f60x(18)));
      const span = g.total + mk;
      const sw = glyphSweep(c.F, SWEEP_AT, span, { fps: c.fps, width: W, height: H }, { band: 150, peak: 0.42 });
      const dark = c.look.tone === 'dark';
      const lockLeft = W / 2 - g.total / 2 - mk / 2;
      return (
        <div style={{ ...FULL, transformOrigin: `${W / 2}px ${H / 2}px`, transform: `scale(${s.toFixed(5)})` }}>
          {/* the light that marks the lockup whole: a slanted band crossing it once, in the world's own light */}
          {sw ? <div style={{ position: 'absolute', left: lockLeft + sw.x - sw.band / 2, top: g.y - mk * 0.9, width: sw.band, height: mk * 2.8, transform: `skewX(${(-sw.angle).toFixed(1)}deg)`, background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${dark ? 'rgba(255,255,255,1)' : withAlpha(mixColor(C.accent, C.white, 0.7), 1)} 50%, rgba(255,255,255,0) 100%)`, opacity: sw.opacity * (dark ? 0.55 : 0.8), mixBlendMode: dark ? 'screen' : 'multiply', filter: 'blur(18px)' }} /> : null}
          {/* the name slides out from BEHIND the mark: clipped at the mark's right edge and drawn under it */}
          <div style={{ position: 'absolute', left: g.markX + mk + gap * 0.3, top: g.y - mk, width: g.nw + gap * 2, height: mk * 3, overflow: 'hidden' }}>
            <div data-text="name" style={{ position: 'absolute', left: gap * 0.7 - (1 - g.n) * (g.nw + gap), top: mk + mk / 2 - fs * 0.56, fontFamily: FONT.text, fontSize: fs, fontWeight: 720, letterSpacing: '-0.035em', color: ink, whiteSpace: 'pre', lineHeight: 1.12, opacity: clamp(g.n * 3), ...TYPE_FEATURES }}>{P.name}</div>
          </div>
          <div data-logo="" style={{ position: 'absolute', left: g.markX, top: g.y, width: mk, height: mk, opacity: c.own, transformOrigin: '50% 50%', transform: `scale(${g.z.toFixed(4)})` }}>
            {tile ? (
              <>
                <div style={{ position: 'absolute', inset: 0, borderRadius: mk * 0.24, background: C.white, boxShadow: `0 ${mk * 0.08}px ${mk * 0.24}px ${withAlpha(MASK, 0.22)}` }} />
                <div style={{ position: 'absolute', left: mk * 0.19, top: mk * 0.19 }}>{P.mark(mk * 0.62, C.accent)}</div>
                <Lit w={mk} h={mk} r={mk * 0.24} face />
              </>
            ) : (
              P.mark(mk, ink)
            )}
          </div>
          <div data-text="close" style={{ position: 'absolute', left: 0, width: W, top: g.y + mk + 54 + (1 - fact) * 18, textAlign: 'center', fontFamily: FONT.text, fontSize: 46, fontWeight: 480, color: c.look.mute, opacity: fact, whiteSpace: 'pre', ...TYPE_FEATURES }}>{P.fact}</div>
        </div>
      );
    },
    el: (c) => {
      const g = geo(c.F);
      const s = creep(c.F);
      const b = g.mb;
      return { box: { x: W / 2 + (b.x - W / 2) * s, y: H / 2 + (b.y - H / 2) * s, w: b.w * s, h: b.h * s }, r: mk * g.z * (tile ? 0.24 : 0.22) * s, fill: tile ? C.white : 'rgba(255, 255, 255, 0)', ...(tile ? { shadow: { y: 10, blur: 30, a: 0.22 } } : {}) };
    },
    Content: ({ c, w }) => (tile ? <div style={{ width: w, height: w, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{P.mark(w * 0.62, C.accent)}</div> : <div style={{ width: w, height: w }}>{P.mark(w, c.look.ink)}</div>),
    // the mark pulling back into the lockup as the name starts out (the lockup's own hit is sync.ts's)
    moments: () => [],
  };
};

/** A photograph as a page's or a card's picture (public/ path), for product.tsx. */
export const Photo: React.FC<{ src: string; w: number; h: number; r?: number }> = ({ src, w, h, r = 18 }) => <Img src={src} data-imagery="" style={{ width: w, height: h, objectFit: 'cover', borderRadius: r }} />;
