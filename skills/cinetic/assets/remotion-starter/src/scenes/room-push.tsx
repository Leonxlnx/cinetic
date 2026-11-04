// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// room-push: a real room with a screen in it. The room appears out of a white haze from the screen outward, first as a
// render pass in the brand's colours and then resolving to the photograph material by material, darks
// first and the bright windows last; the camera creeps in, punches in twice in two frames, creeps on and then pushes
// into the screen, which carries the product's own UI, until the screen is the frame.
// Numbers (frames at 30 fps, px at 1080): the haze opens from the screen's centre in 6 f with a 200 px feather; the pass
// maps the photograph's luminance onto a ramp of the palette (shadows deep, lights pale) and resolves from f8 to f18
// (luminance under a rising threshold shows the photograph); the creep is x1.015 by f22; the punch x1.5 at f22 and
// x1.6 at f23 (no blur); the creep goes on to x1.65 by f44, accelerating late; the push into the screen runs f44-58 on
// stdInOut to the frame (the screen's corners land on the frame's, the room flying past blurred by its speed); f58-66
// the product's screen holds full frame.
// The room is the film's own photograph (scripts/assets.mjs) with the four corners of its screen in its own pixels; other
// screens in the picture (`cover`) are dimmed to glass so only the product's screen is lit.
import React, { useId } from 'react';
import { Img } from 'remotion';
import { E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { type Palette, paletteOf, ramp, type SceneMeta, span, useClock } from './parts';
import { type Quad, quadMatrix } from './phone-pullback';
import { srcOf, Stage1080 } from './stage1080';

/** A real room photograph: its size, the corners of the screen the camera pushes into, other screens to dim. */
export type RoomPlate = { src: string; w: number; h: number; screen: Quad; cover?: readonly Quad[] };

export type RoomPushProps = {
  room: RoomPlate;
  /** the product's screen: an image, or UI drawn on a 1920 x 1080 box (a kit screen); it ends as the frame */
  screen: string | React.ReactNode;
  /** false: the room appears as the photograph from the start (no render pass) */
  passes?: boolean;
  /** the pass's ramp: ink, accent, lift, paper; paper: the haze */
  palette?: Partial<Palette>;
  frame?: number;
};

export const ROOM_PUSH = {
  dur: 66,
  haze: [0, 6] as const,
  resolve: [8, 18] as const,
  punch: [22, 23] as const,
  creep: [23, 44] as const,
  push: [44, 58] as const,
  zoom: { creep: 1.015, punch1: 1.5, punch2: 1.6, creepEnd: 1.65 },
} as const;

type Pt = readonly [number, number];
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const rgbOf = (c: string): [number, number, number] => {
  const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(c);
  if (m) return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255];
  const s = c.replace('#', '');
  const f = s.length === 3 ? s.split('').map((x) => x + x).join('') : s.slice(0, 6);
  return [parseInt(f.slice(0, 2), 16) / 255, parseInt(f.slice(2, 4), 16) / 255, parseInt(f.slice(4, 6), 16) / 255];
};

/** The camera's magnification before the push into the screen (about the screen's centre). */
export const roomZoom = (t: number) => {
  const Z = ROOM_PUSH.zoom;
  if (t < ROOM_PUSH.punch[0]) return 1 + (Z.creep - 1) * E.softOut(span(t, 0, ROOM_PUSH.punch[0]));
  if (t < ROOM_PUSH.punch[1]) return Z.punch1;
  return Z.punch2 + (Z.creepEnd - Z.punch2) * E.softIn(span(t, ROOM_PUSH.creep[0], ROOM_PUSH.creep[1]));
};

export const RoomPush: React.FC<RoomPushProps> = ({ room, screen, passes = true, palette, frame }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf(palette);
  const fid = `roompass${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  // the photograph covering the stage; the screen's corners and centre on the stage
  const c = Math.max(1920 / room.w, 1080 / room.h);
  const ox = (1920 - room.w * c) / 2;
  const oy = (1080 - room.h * c) / 2;
  const onStage = (p: Pt): Pt => [ox + p[0] * c, oy + p[1] * c];
  const sq = room.screen.map(onStage) as unknown as Pt[];
  const sc: Pt = [(sq[0][0] + sq[1][0] + sq[2][0] + sq[3][0]) / 4, (sq[0][1] + sq[1][1] + sq[2][1] + sq[3][1]) / 4];
  const sw = (Math.hypot(sq[1][0] - sq[0][0], sq[1][1] - sq[0][1]) + Math.hypot(sq[2][0] - sq[3][0], sq[2][1] - sq[3][1])) / 2;
  const sh = (Math.hypot(sq[3][0] - sq[0][0], sq[3][1] - sq[0][1]) + Math.hypot(sq[2][0] - sq[1][0], sq[2][1] - sq[1][1])) / 2;
  // the camera: the creep and punches about the screen's centre, which drifts to the frame's centre as it closes in;
  // then the push, whose end magnification makes the screen as big as the frame
  const pushP = E.stdInOut(span(t, ROOM_PUSH.push[0], ROOM_PUSH.push[1]));
  const zEnd = Math.max(1920 / sw, 1080 / sh);
  const z0 = roomZoom(t);
  const z = Math.exp(lerp(Math.log(z0), Math.log(zEnd), pushP));
  const toward = 0.18 * span(t, 0, ROOM_PUSH.push[0]) + 0.82 * pushP;
  const fx = lerp(sc[0], 960, toward);
  const fy = lerp(sc[1], 540, toward);
  const cam = (p: Pt): Pt => [fx + z * (p[0] - sc[0]), fy + z * (p[1] - sc[1])];
  // the screen's corners: on the photograph, then landing on the frame's corners as the push ends
  const frameQ: Pt[] = [[0, 0], [1920, 0], [1920, 1080], [0, 1080]];
  const land = E.softIn(span(t, ROOM_PUSH.push[0] + 4, ROOM_PUSH.push[1]));
  const q = sq.map((p, i) => {
    const m = cam(p);
    return [lerp(m[0], frameQ[i][0], land), lerp(m[1], frameQ[i][1], land)] as const;
  }) as unknown as Quad;
  // the content box drawn into the screen: a crop of the 1920 x 1080 UI at the screen's own aspect, opening to all of it
  const aspect = sw / sh;
  const cw0 = aspect < 16 / 9 ? 1080 * aspect : 1920;
  const ch0 = aspect < 16 / 9 ? 1080 : 1920 / aspect;
  const cw = lerp(cw0, 1920, land);
  const ch = lerp(ch0, 1080, land);
  // the speed of the push (room blur) and the haze / pass
  const speed = Math.abs(Math.log(Math.exp(lerp(Math.log(z0), Math.log(zEnd), E.stdInOut(span(t + 0.5, ROOM_PUSH.push[0], ROOM_PUSH.push[1])))) / Math.exp(lerp(Math.log(z0), Math.log(zEnd), E.stdInOut(span(t - 0.5, ROOM_PUSH.push[0], ROOM_PUSH.push[1]))))));
  const roomBlur = Math.min(14, speed * 60);
  const hazeR = 2600 * E.softOut(span(t, ROOM_PUSH.haze[0], ROOM_PUSH.haze[1]));
  const thr = passes ? 1.15 * span(t, ROOM_PUSH.resolve[0], ROOM_PUSH.resolve[1]) : 2;
  const stops = [mixColor(P.ink, P.accent, 0.25), P.accent, P.lift, mixColor(P.lift, P.paper, 0.6), P.paper, P.lift, P.accent, mixColor(P.ink, P.accent, 0.25)];
  const off = 0.15;
  const table = (chan: 0 | 1 | 2) => Array.from({ length: 17 }, (_, i) => rgbOf(ramp(stops, (((0.08 + 0.84 * (i / 16) + off) % 1) + 1) % 1))[chan].toFixed(3)).join(' ');
  const K = 6;
  const tf = cam([ox, oy]);
  const photo = (pass: boolean) => (
    <div style={{ position: 'absolute', left: 0, top: 0, width: room.w, height: room.h, transformOrigin: '0 0', transform: `translate(${tf[0].toFixed(2)}px, ${tf[1].toFixed(2)}px) scale(${(c * z).toFixed(6)})`, filter: pass ? `url(#${fid})` : roomBlur > 0.3 ? `blur(${(roomBlur / (c * z)).toFixed(3)}px)` : undefined }}>
      <Img src={srcOf(room.src)} style={{ width: room.w, height: room.h, display: 'block' }} />
    </div>
  );
  const content = typeof screen === 'string' ? <Img src={srcOf(screen)} style={{ width: 1920, height: 1080, objectFit: 'cover', display: 'block' }} /> : screen;
  return (
    <Stage1080 W={W} H={H} ground={P.ink}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={fid} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix in="SourceGraphic" type="matrix" values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0" result="lum" />
          <feComponentTransfer in="lum" result="map">
            <feFuncR type="table" tableValues={table(0)} />
            <feFuncG type="table" tableValues={table(1)} />
            <feFuncB type="table" tableValues={table(2)} />
          </feComponentTransfer>
          <feColorMatrix in="SourceGraphic" type="matrix" values={`0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${(K * 0.2126).toFixed(4)} ${(K * 0.7152).toFixed(4)} ${(K * 0.0722).toFixed(4)} 0 ${(-K * thr).toFixed(4)}`} result="keep" />
          <feComposite in="map" in2="keep" operator="in" />
        </filter>
      </svg>
      {photo(false)}
      {passes && thr < 1.15 ? photo(true) : null}
      {/* the other screens in the picture, dimmed to glass */}
      {(room.cover ?? []).map((cq, i) => {
        const qq = cq.map((p) => cam(onStage(p))) as unknown as Quad;
        return <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: 400, height: 300, transformOrigin: '0 0', transform: quadMatrix(400, 300, qq), background: `linear-gradient(160deg, ${mixColor(P.ink, P.paper, 0.14)}, ${P.ink} 60%)`, filter: roomBlur > 0.3 ? `blur(${(roomBlur / 6).toFixed(2)}px)` : undefined }} />;
      })}
      {/* the product's screen in the room's screen */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: cw, height: ch, overflow: 'hidden', transformOrigin: '0 0', transform: quadMatrix(cw, ch, q) }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${((cw - 1920) / 2).toFixed(2)}px, ${((ch - 1080) / 2).toFixed(2)}px)`, width: 1920, height: 1080 }}>{content}</div>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(155deg, ${withAlpha(P.paper, 0.1 * (1 - land))}, ${withAlpha(P.paper, 0)} 45%)` }} />
      </div>
      {/* the white haze opening from the screen outward */}
      {hazeR < 2600 ? <div style={{ position: 'absolute', inset: 0, background: P.paper, WebkitMaskImage: `radial-gradient(circle at ${sc[0].toFixed(1)}px ${sc[1].toFixed(1)}px, transparent ${Math.max(0, hazeR - 200).toFixed(1)}px, black ${hazeR.toFixed(1)}px)`, maskImage: `radial-gradient(circle at ${sc[0].toFixed(1)}px ${sc[1].toFixed(1)}px, transparent ${Math.max(0, hazeR - 200).toFixed(1)}px, black ${hazeR.toFixed(1)}px)` }} /> : null}
    </Stage1080>
  );
};

export const roomPushMeta: SceneMeta = {
  id: 'room-push',
  does: 'a real room appears as a render pass in the brand\'s colours and resolves to the photograph; the camera punches in and pushes into its screen until the product\'s UI is the frame',
  dur: ROOM_PUSH.dur,
  props: ['room', 'screen', 'passes?', 'palette?'],
  handIn: null,
  handOut: { form: 'window', x: 0, y: 0, w: 1920, h: 1080 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'whoosh', id: 'haze', weight: 0.5 },
    { f: 4, kind: 'tick', id: 'pass', weight: 0.3 },
    { f: ROOM_PUSH.punch[0], kind: 'hit', id: 'punch', weight: 0.7 },
    { f: ROOM_PUSH.push[0], kind: 'riser', id: 'push', weight: 0.5 },
    { f: ROOM_PUSH.push[1], kind: 'land', id: 'screen', weight: 0.6 },
  ],
};
