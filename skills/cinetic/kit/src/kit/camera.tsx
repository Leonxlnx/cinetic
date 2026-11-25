// The camera. A shot is a 3D stage (CSS perspective) the camera moves through, so even a flat layout gets depth,
// parallax and a reason to move. Keyframe it; never leave it dead still for more than ~1 s (use `drift`).
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, logScale, mix, type Ease } from './motion';

export type Cam = {
  /** Pan in px (the world moves the other way). */
  x?: number;
  y?: number;
  /** Zoom factor (1 = framing as laid out). Interpolated in log space. */
  zoom?: number;
  /** Orbit in degrees. rx tilts the world back (looking down), ry turns it, rz rolls. */
  rx?: number;
  ry?: number;
  rz?: number;
};

/** A camera key. `cut: true` jumps to this key on its frame (a punch-in or a hard reframe) instead of travelling to it. */
export type CamKey = Cam & {
  f: number;
  curve?: Ease;
  cut?: boolean;
  /** Separate curves into this key: e.g. a dive that swings with ease.inOut and zooms with ease.in. */
  curves?: { pan?: Ease; zoom?: Ease; rot?: Ease };
};

const read = (k: Cam) => ({ x: k.x ?? 0, y: k.y ?? 0, zoom: k.zoom ?? 1, rx: k.rx ?? 0, ry: k.ry ?? 0, rz: k.rz ?? 0 });

/** The camera's state at `frame` from keyframes. The curve of the later key shapes each segment (default ease.inOut). */
export const camAt = (frame: number, keys: CamKey[]) => {
  if (!keys.length) return read({});
  if (frame <= keys[0].f) return read(keys[0]);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame <= b.f) {
      if (b.cut) return read(frame < b.f ? a : b);
      const t = (frame - a.f) / Math.max(1, b.f - a.f);
      const base = b.curve ?? ease.inOut;
      const pp = (b.curves?.pan ?? base)(t);
      const pz = (b.curves?.zoom ?? base)(t);
      const pr = (b.curves?.rot ?? base)(t);
      const A = read(a);
      const B = read(b);
      return {
        x: mix(pp, A.x, B.x),
        y: mix(pp, A.y, B.y),
        zoom: logScale(A.zoom, B.zoom, pz),
        rx: mix(pr, A.rx, B.rx),
        ry: mix(pr, A.ry, B.ry),
        rz: mix(pr, A.rz, B.rz),
      };
    }
  }
  return read(keys[keys.length - 1]);
};

/**
 * A slow, living drift so a held shot never freezes: a push of `push` (e.g. 0.04 = 4 % over the shot)
 * plus a whisper of rotation. Add it to a camera key's values.
 */
export const drift = (frame: number, dur: number, push = 0.035, turn = 0.6) => {
  const p = Math.min(1, Math.max(0, frame / dur));
  return { zoom: 1 + push * ease.glide(p), ry: turn * (p - 0.5), rx: turn * 0.4 * (p - 0.5) };
};

/**
 * A 3D stage. Children are laid out in a 1920x1080 world (use absolute positioning or AbsoluteFill) and
 * can sit at depth with `translateZ`. The camera transform is applied to the whole world.
 */
export const Camera: React.FC<{
  keys?: CamKey[];
  cam?: Cam;
  perspective?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  /** Transform origin of the world (where zoom and orbit pivot). Default centre. */
  origin?: string;
}> = ({ keys, cam, perspective = 2200, children, style, origin = '50% 50%' }) => {
  const frame = useCurrentFrame();
  const c = cam ? read(cam) : camAt(frame, keys ?? []);
  return (
    <AbsoluteFill style={{ perspective, perspectiveOrigin: '50% 50%', overflow: 'hidden', ...style }}>
      <AbsoluteFill
        style={{
          transformStyle: 'preserve-3d',
          transformOrigin: origin,
          transform: `scale(${c.zoom}) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg) translate3d(${-c.x}px, ${-c.y}px, 0)`,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Place a child at a 3D point in the world (px from the frame's top-left, z toward the camera). */
export const At: React.FC<{
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  scale?: number;
  /** Anchor: the point of the child placed at (x, y). Default centre. */
  anchor?: 'center' | 'topleft';
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x = 960, y = 540, z = 0, rx = 0, ry = 0, rz = 0, scale = 1, anchor = 'center', children, style }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transformStyle: 'preserve-3d',
      transform: `${anchor === 'center' ? 'translate(-50%, -50%) ' : ''}translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${scale})`,
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * @deprecated A screen shake is never used, not even a small one on a landing: give a landing weight by the object's own
 * settle, its contact shadow and the target's reaction. Kept only so older films compile.
 */
export const shake = (frame: number, start: number, dur = 10, amp = 10) => {
  const t = frame - start;
  if (t < 0 || t > dur) return 'translate(0px, 0px)';
  const k = 1 - t / dur;
  return `translate(${Math.sin(t * 2.7) * amp * k * k}px, ${Math.cos(t * 3.3) * amp * k * k}px)`;
};

/** Hook form of the frame + config, for components that build their own transforms. */
export const useFrameInfo = () => {
  const frame = useCurrentFrame();
  const cfg = useVideoConfig();
  return { frame, ...cfg };
};

/**
 * Diving into an element whose inside is the next scene: the zoom at which a w x h box exactly covers the frame. Grow
 * the camera to it with logScale and a curve that moves from its first frame (`(t) => t * (0.35 + 0.65 * t)`; plain ease.in
 * parks the camera for its first third), cut to the inner scene at that frame, and the inside arrives at full size.
 */
export const diveZoom = (w: number, h: number, frameW = 1920, frameH = 1080) => Math.max(frameW / w, frameH / h);

/**
 * Where a world point lands on screen under a `<Camera>` (pan, zoom, tilt, turn and roll, with its perspective). Use it to
 * start screen-space things (a flying card, a flood, a pointer, a label) exactly where an object sits in the world.
 * `z` is the point's depth (translateZ); pass the Camera's `perspective` and the frame size when they are not the defaults.
 */
export const toScreen = (cam: Cam, x: number, y: number, z = 0, o: { perspective?: number; frameW?: number; frameH?: number } = {}) => {
  const c = read(cam);
  const W = o.frameW ?? 1920;
  const H = o.frameH ?? 1080;
  const d = o.perspective ?? 2200;
  const rad = Math.PI / 180;
  // the Camera's transform, applied right to left: pan, roll (Z), turn (Y), tilt (X), zoom
  let px = x - W / 2 - c.x;
  let py = y - H / 2 - c.y;
  let pz = z;
  const [sz, cz] = [Math.sin(c.rz * rad), Math.cos(c.rz * rad)];
  [px, py] = [px * cz - py * sz, px * sz + py * cz];
  const [sy, cy] = [Math.sin(c.ry * rad), Math.cos(c.ry * rad)];
  [px, pz] = [px * cy + pz * sy, -px * sy + pz * cy];
  const [sx, cx] = [Math.sin(c.rx * rad), Math.cos(c.rx * rad)];
  [py, pz] = [py * cx - pz * sx, py * sx + pz * cx];
  px *= c.zoom;
  py *= c.zoom;
  const k = d / Math.max(1, d - pz);
  return { x: W / 2 + px * k, y: H / 2 + py * k, scale: c.zoom * k };
};

/** The zoom that makes a w x h box fill `frac` of the frame (the tighter of width and height). Fill the frame with the subject. */
export const fillZoom = (w: number, h: number, frac = 0.8, frameW = 1920, frameH = 1080) => Math.min((frac * frameW) / w, (frac * frameH) / h);

/** Motion blur from the camera's own speed: px of blur for the frame (0 when it barely moves). Use on the world group. */
export const camSmear = (frame: number, keys: CamKey[], k = 0.6, max = 24) => {
  const a = camAt(frame, keys);
  const b = camAt(frame - 1, keys);
  const v = Math.hypot(a.x - b.x, a.y - b.y) + Math.abs(Math.log(a.zoom / b.zoom)) * 900 + (Math.abs(a.rx - b.rx) + Math.abs(a.ry - b.ry) + Math.abs(a.rz - b.rz)) * 8;
  const px = Math.max(0, v - 6) * k * 0.1;
  return Math.min(max, px);
};

/**
 * The safe box for type and the subject: on vertical films the platform's own UI covers the top ~12 % and the bottom
 * ~20 %; on wide films keep 5 % all round. Returns { left, top, right, bottom, width, height } in px.
 */
export const safeBox = (frameW = 1920, frameH = 1080) => {
  const vertical = frameH > frameW;
  const top = Math.round(frameH * (vertical ? 0.12 : 0.05));
  const bottom = Math.round(frameH * (vertical ? 0.2 : 0.05));
  const side = Math.round(frameW * (vertical ? 0.06 : 0.05));
  return { left: side, top, right: frameW - side, bottom: frameH - bottom, width: frameW - side * 2, height: frameH - top - bottom };
};
