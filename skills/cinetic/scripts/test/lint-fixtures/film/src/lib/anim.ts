// Fixture motion file in the 1.2 format: snapOut retuned out of the house band, a front-loaded whip and
// a wobbly spring.
import { Easing } from 'remotion';
const bz = (a: number, b: number, c: number, d: number) => Easing.bezier(a, b, c, d);
const tagEase = (fn: (t: number) => number, family: string, token = '', deprecated?: string) => Object.assign(fn, { family, token, deprecated });
export const E = {
  snapOut: tagEase(bz(0.4, 0.2, 0.6, 0.8), 'arrive', 'snapOut'),
  glideOut: tagEase(bz(0.172, 0.687, 0.393, 0.943), 'arrive', 'glideOut'),
  strongInOut: tagEase(bz(0.673, 0.077, 0.288, 0.943), 'reposition', 'strongInOut'),
  whipFast: tagEase(bz(0.2, 0.8, 0.4, 1), 'reposition', 'whipFast'),
  buildIn: tagEase(bz(0.525, 0.079, 0.724, 0.331), 'leave', 'buildIn'),
  linear: tagEase((t: number) => t, 'linear', 'linear'),
};
export const SPR = {
  critical: { stiffness: 170, damping: 26, mass: 1 },
  landing: { stiffness: 244, damping: 18.3, mass: 1 },
  menu: { stiffness: 910, damping: 39, mass: 1 },
  containerPop: { stiffness: 4274, damping: 71, mass: 1 },
  wobbly: { stiffness: 300, damping: 8, mass: 1 },
};
export const prog = (f: number, a: number, b: number, e = E.glideOut) => e(Math.min(1, Math.max(0, (f - a) / (b - a))));
