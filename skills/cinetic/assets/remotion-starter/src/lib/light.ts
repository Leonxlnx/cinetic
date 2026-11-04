// The film's one light: a single key direction that every depth-and-light primitive reads (fx/Lit, fx/DepthStack,
// fx/Grounds), so a tilted panel's rim, its cast shadow, the ground's lit side and the drift of its light all
// agree on where the light comes from. Change FILM_LIGHT once per film (the brief's light: upper-left window, a floor
// glow from below, a raking side key); never per shot. Node-safe, no imports.
//
// Conventions (the same as fx/KeyLight, so relief scenes and lit panels share one sun):
//   the layout is a floor seen from the viewer: x right, y down, z up out of the layout toward the viewer
//   azimuth   where the key comes FROM on that layout: 0 the top of the frame, 90 the right, 180 the viewer's side
//             (light from below the frame, a floor glow), 270 the left; house 315 (from the upper left)
//   elevation degrees above the layout (toward the viewer): 90 lights a front-on panel straight on, 5-15 rakes
//             across it; house 34 (shadows fall 1.48 x the lift away from the key)
// A panel turned by CSS rotateZ(z) rotateX(x) rotateY(y) has the outward normal panelNormal(t); the light it
// catches is n . l (lighter toward the key, darker away), its rim sits on the side keyLocal() points to.

export type FilmLight = {
  azimuth: number; // deg, where the key comes from on the layout (0 top, 90 right, 180 below, 270 left)
  elevation: number; // deg above the layout, toward the viewer
  rim: number; // peak alpha of the 1 px rim highlight on the key side (house 0.8; 0.4-1)
  spill: number; // alpha of the ground-coloured bounce on the side away from the key (house 0.14; 0.08-0.22)
};

/** The film's light: one token for the whole film (house: from the upper left, 34 degrees up, like fx/KeyLight KEY). */
export const FILM_LIGHT: FilmLight = { azimuth: 315, elevation: 34, rim: 0.8, spill: 0.14 };

export type V3 = [number, number, number];
export type M3 = [number, number, number, number, number, number, number, number, number]; // row-major 3x3

/** A panel's turn, degrees, applied as CSS rotateZ(z) rotateX(x) rotateY(y) (roll outermost, so type never shears). */
export type Tilt = { x?: number; y?: number; z?: number };

const rad = (d: number) => (d * Math.PI) / 180;

/** CSS rotateX(d): positive tips the top edge away from the viewer. */
export const rotX = (d: number): M3 => {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [1, 0, 0, 0, c, -s, 0, s, c];
};
/** CSS rotateY(d): positive sends the right edge away from the viewer. */
export const rotY = (d: number): M3 => {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};
/** CSS rotateZ(d): positive turns clockwise on screen (y down). */
export const rotZ = (d: number): M3 => {
  const c = Math.cos(rad(d));
  const s = Math.sin(rad(d));
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};
export const mul3 = (a: M3, b: M3): M3 => {
  const o = new Array(9).fill(0) as M3;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return o;
};
export const apply3 = (m: M3, v: V3): V3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
export const transpose3 = (m: M3): M3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
export const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** The rotation of a panel turned by `t` (CSS order rotateZ rotateX rotateY). */
export const panelMatrix = (t: Tilt = {}): M3 => mul3(rotZ(t.z ?? 0), mul3(rotX(t.x ?? 0), rotY(t.y ?? 0)));

/** Unit vector from the layout toward the key (x right, y down, z toward the viewer): fx/KeyLight towardKey(). */
export const toKey = (l: Pick<FilmLight, 'azimuth' | 'elevation'> = FILM_LIGHT): V3 => {
  const e = rad(Math.min(90, Math.max(0.5, l.elevation)));
  const a = rad(l.azimuth);
  return [Math.cos(e) * Math.sin(a), -Math.cos(e) * Math.cos(a), Math.sin(e)];
};

/** Unit screen direction toward the key (x right, y down): where the lit side of everything is. */
export const keyDir = (l: Pick<FilmLight, 'azimuth'> = FILM_LIGHT): [number, number] => [Math.sin(rad(l.azimuth)), -Math.cos(rad(l.azimuth))];

/** The CSS gradient angle that runs away from the key (lit side first): azimuth 315 -> 135deg (kit/parts keyAngle). */
export const awayAngle = (l: Pick<FilmLight, 'azimuth'> = FILM_LIGHT) => (((l.azimuth + 180) % 360) + 360) % 360;

/** The outward normal of a panel turned by `t` (front-on: [0, 0, 1]). */
export const panelNormal = (t: Tilt = {}): V3 => apply3(panelMatrix(t), [0, 0, 1]);

/** The light a panel turned by `t` catches: max(0, n . l), 0..1 (front-on under the house key: sin 34 = 0.56). */
export const faceLight = (t: Tilt = {}, l: Pick<FilmLight, 'azimuth' | 'elevation'> = FILM_LIGHT) => Math.max(0, dot3(panelNormal(t), toKey(l)));

/** How much more (+) or less (-) light the turned panel catches than a front-on one: drives its sheen or shade. */
export const faceShift = (t: Tilt = {}, l: Pick<FilmLight, 'azimuth' | 'elevation'> = FILM_LIGHT) => faceLight(t, l) - Math.max(0, toKey(l)[2]);

/**
 * The key in the panel's own coordinates (R^T l): x and y say which of the panel's edges face the light (the rim side,
 * on the panel's own axes, so it is right however the panel is turned), z how squarely the face meets it.
 */
export const keyLocal = (t: Tilt = {}, l: Pick<FilmLight, 'azimuth' | 'elevation'> = FILM_LIGHT): V3 => apply3(transpose3(panelMatrix(t)), toKey(l));

/**
 * Where a point p (x, y on the layout, z px toward the viewer) throws its shadow on the layout plane z = 0: along
 * the light, away from the key. A point on the plane is its own shadow.
 */
export const onGround = (p: V3, l: Pick<FilmLight, 'azimuth' | 'elevation'> = FILM_LIGHT): [number, number] => {
  const k = toKey(l);
  const t = p[2] / Math.max(1e-3, k[2]);
  return [p[0] - k[0] * t, p[1] - k[1] * t];
};
