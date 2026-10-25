import React from 'react';
import { C, MASK } from '../brand/tokens';
import { clamp, E } from '../lib/anim';
import { type FilmCtx, f60x, fpsOf, useFilm } from '../lib/film';
import type { Declares, SeamKind } from '../timeline';

/**
 * Grades used as transitions: the outgoing shot is graded toward one state, the cut lands on the peak, and the
 * incoming shot comes back out of the same state. The grade is a fixed-filter copy cross-faded by opacity, plus a
 * flat layer for the last part, so nothing animates a filter.
 *
 *   drain   colour drains to grey (26 f into the cut on E.buildIn) and the next shot regains colour (34 f)
 *   wash    an exposure push: highlights clip first (a copy at 1.7x brightness), then everything washes to white
 *           on the cut; the next shot develops down out of white (18 f in, 30 f out)
 *   crush   the picture crushes to black through a contrasty dark copy (14 f in, 24 f out)
 *   tint    the hue gives way to one colour (`color`, colour blend keeps the luminance), then a flat flood
 *
 * gradeState(f) says which side of the cut is showing and the grade amount (0..1). <GradeCut> draws the two
 * shots; <Grade> grades one node at an explicit amount. declares() names the cut as a light or colour seam.
 */

export const GRADES = {
  drain: { pre60: 26, post60: 34 },
  wash: { pre60: 18, post60: 30 },
  crush: { pre60: 14, post60: 24 },
  tint: { pre60: 16, post60: 26 },
} as const;

export type GradeKind = keyof typeof GRADES;
export type GradeCutProps = { kind: GradeKind; at: number; pre60?: number; post60?: number; hold60?: number; color?: string; id?: string };

/** Side and amount at frame f: rising into the cut on E.buildIn, held `hold60` after it, falling on E.softOut. Pure. */
export const gradeState = (f: number, p: GradeCutProps, film: Partial<FilmCtx>) => {
  const fps = fpsOf(film);
  const G = GRADES[p.kind];
  const pre = f60x(p.pre60 ?? G.pre60, fps);
  const hold = f60x(p.hold60 ?? 0, fps);
  const post = f60x(p.post60 ?? G.post60, fps);
  if (f < p.at) return { side: 'out' as const, amount: E.buildIn(clamp((f - (p.at - pre)) / pre)) };
  return { side: 'in' as const, amount: 1 - E.softOut(clamp((f - p.at - hold) / post)) };
};

/** Layer opacities for a grade amount: the fixed-filter copy and the flat flood. Pure. */
export const gradeLayers = (kind: GradeKind, a: number) => {
  if (kind === 'drain') return { copy: a, flood: 0 };
  if (kind === 'wash') return { copy: clamp(a * 1.4), flood: clamp((a - 0.35) / 0.65) };
  if (kind === 'crush') return { copy: clamp(a * 1.4), flood: clamp((a - 0.4) / 0.6) };
  return { copy: a, flood: clamp((a - 0.6) / 0.4) };
};

const FILTER: Record<GradeKind, string> = {
  drain: 'saturate(0) contrast(0.94) brightness(1.02)',
  wash: 'brightness(1.7) saturate(0.6) contrast(0.85)',
  crush: 'brightness(0.45) contrast(1.35) saturate(0.8)',
  tint: 'none',
};

/** One node graded at amount `amount`. */
export const Grade: React.FC<{ kind: GradeKind; amount: number; color?: string; children: React.ReactNode }> = (p) => {
  const L = gradeLayers(p.kind, p.amount);
  const full: React.CSSProperties = { position: 'absolute', inset: 0 };
  const flood = p.kind === 'wash' ? C.white : p.kind === 'crush' ? MASK : p.kind === 'tint' ? (p.color ?? C.accent) : 'transparent';
  return (
    <div style={{ ...full, isolation: 'isolate' }}>
      <div style={full}>{p.children}</div>
      {L.copy > 0.001 && p.kind !== 'tint' ? <div style={{ ...full, filter: FILTER[p.kind], opacity: L.copy }}>{p.children}</div> : null}
      {L.copy > 0.001 && p.kind === 'tint' ? <div style={{ ...full, background: flood, mixBlendMode: 'color', opacity: L.copy }} /> : null}
      {L.flood > 0.001 ? <div style={{ ...full, background: flood, opacity: L.flood }} /> : null}
    </div>
  );
};

/** The outgoing shot before `at`, the incoming from `at`, each graded by gradeState(). */
export const GradeCut: React.FC<GradeCutProps & { frame: number; outgoing: React.ReactNode; incoming: React.ReactNode }> = (p) => {
  const film = useFilm();
  const s = gradeState(p.frame, p, film);
  return (
    <Grade kind={p.kind} amount={s.amount} color={p.color}>
      {s.side === 'out' ? p.outgoing : p.incoming}
    </Grade>
  );
};

/** The cut on the grade's peak is a seam: a light seam for wash and crush, a colour seam for drain and tint. */
export const declares = (p?: Partial<GradeCutProps>, _film?: Partial<FilmCtx>): Declares => {
  const none: Declares = { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  if (p?.at === undefined || !p.kind) return none;
  const kind: SeamKind = p.kind === 'wash' || p.kind === 'crush' ? 'light' : 'colour';
  return { ...none, seams: [{ at: p.at, kind, carry: 'colour', id: p.id ?? `grade-${p.kind}` }] };
};
