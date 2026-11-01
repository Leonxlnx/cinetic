/**
 * cinetic:light the world's own light: its key (where glass, rims and type catch it from) and the light baked into a field
 *
 * World: the place a film stands in, one per film, with its key light. It draws the ground (a graded photo or clip, or
 * a lit field baked once) full frame under its children and shares itself with the light parts: <Glass> frosts exactly
 * this ground, rims and sweeps face its key, glowing type takes its light's colour. One component, a kind and (for a
 * plate world) its picture:
 *
 *   <World kind="clouds" src={staticFile('plates/clouds.jpg')} soft={staticFile('plates/clouds-soft.jpg')}>
 *     <Glass x={460} y={560} w={1000} h={112}>...</Glass>
 *   </World>
 *   <World kind="blackField">...</World>          (built worlds need no picture: blackField, electric, deepField,
 *                                                  paleSky, nearWhite; worlds.ts says what each is)
 *
 *   src / soft   plate worlds: the picture (`node scripts/assets.mjs plate clouds --to public/plates` fetches, grades
 *                and writes both); soft is its pre-blurred copy, so glass frosts it at no cost
 *   depth        how soft the plate sits: 'near' as shot (default), 'mid', 'far' (behind UI in focus), or px
 *   push         one purposeful camera move on the world ({ from, to, scale: 1.06 }: it starts, travels, lands and
 *                holds); never a drift. The children are not moved: give them their own move
 *   accent, hue  the world's hue comes from the accent through its window (worlds.ts WORLD_HUE: a blue accent lends
 *                its hue to the electric stage, a blue or teal one to the deep field and the plate tints; any other
 *                accent gives the world's cool default, so a green or red brand never paints its ground)
 *   spec         overrides of the resolved world: { key: { x, y, ... } } to move the light, { glass: {...} }, { ink }
 *
 * The ground never cuts inside a film: put one World under the whole film (outside the shots' camera) or one per
 * scene of the same kind. A built field is baked at half size and scaled (smooth, dithered, never banding).
 */
import React from 'react';
import { Img, useCurrentFrame } from 'remotion';
import { sizeOf, useFilm } from '../../lib/film';
import type { Declares } from '../../timeline';
import { bakePixels, bakePlate } from '../Gradients';
import { litFieldPixels } from '../Grounds';
import { WorldContext, type WorldCtx } from './context';
import { Plate, type PlateDepth, type PlateMove, plateMove } from './Plate';
import { isPlateWorld, type WorldKind, type WorldSpec, worldOf } from './worlds';

export type WorldProps = {
  kind: WorldKind;
  src?: string;
  soft?: string;
  focus?: [number, number];
  depth?: PlateDepth;
  push?: PlateMove;
  accent?: string;
  hue?: number;
  spec?: Partial<WorldSpec>;
  trimBefore?: number;
  playbackRate?: number;
  frame?: number; // default the current frame
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

const ABS: React.CSSProperties = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' };

/** A built world's lit field, baked once at half size (cached data URL). */
export const fieldUrl = (spec: WorldSpec, W: number, H: number) => {
  if (!spec.field) return '';
  const w = Math.max(2, Math.round(W / 2));
  const h = Math.max(2, Math.round(H / 2));
  return bakePixels(`world|${JSON.stringify(spec.field)}|${w}|${h}`, w, h, () => litFieldPixels(spec.field as NonNullable<WorldSpec['field']>, w, h, 7));
};

/** The atmosphere toward a plate's horizon: a vertical veil of the haze colour, strongest at `y`. */
const hazeUrl = (spec: WorldSpec) => {
  const hz = spec.haze;
  if (!hz || hz.strength <= 0) return '';
  const y = Math.min(0.95, Math.max(0.05, hz.y));
  return bakePlate(
    'linear',
    [
      { at: 0, color: hz.color, alpha: hz.strength * 0.55 },
      { at: y, color: hz.color, alpha: hz.strength },
      { at: Math.min(1, y + 0.28), color: hz.color, alpha: hz.strength * 0.22 },
      { at: 1, color: hz.color, alpha: 0 },
    ],
    8,
    270,
    { vertical: true },
  );
};

/** The corners falling off: black at `v` in the corners, nothing inside the middle 45 %. */
const vignetteUrl = (v: number) =>
  v > 0
    ? bakePlate(
        'radial',
        [
          { at: 0, color: '#000000', alpha: 0 },
          { at: 0.45, color: '#000000', alpha: 0 },
          { at: 1, color: '#000000', alpha: v },
        ],
        320,
        180,
        { rx: 0.7, ry: 0.7 },
      )
    : '';

export const World: React.FC<WorldProps> = (p) => {
  const film = useFilm();
  const { width: W, height: H } = sizeOf(film);
  const cur = useCurrentFrame();
  const f = p.frame ?? cur;
  const base = worldOf(p.kind, { accent: p.accent, hue: p.hue });
  const spec: WorldSpec = { ...base, ...p.spec, key: { ...base.key, ...p.spec?.key }, glass: { ...base.glass, ...p.spec?.glass } };
  const plate = isPlateWorld(p.kind) && p.src ? p.src : null;
  const m = plateMove(f, p.push);
  const field = !plate ? fieldUrl(spec, W, H) : '';
  const haze = plate ? hazeUrl(spec) : '';
  const vig = vignetteUrl(spec.vignette);

  const ground = (o: { soft?: boolean } = {}) => {
    const useSoft = !!(o.soft && p.soft && plate);
    return (
      <div data-ground={spec.kind} style={{ ...ABS, overflow: 'hidden', background: spec.base }}>
        {plate ? (
          <div data-imagery="" style={ABS}>
            <Plate src={useSoft ? (p.soft as string) : plate} focus={p.focus ?? spec.plate?.focus} depth={useSoft ? 0 : p.depth} grade={spec.grade} move={p.push} frame={f} trimBefore={p.trimBefore} playbackRate={p.playbackRate} />
          </div>
        ) : field ? (
          <div style={{ ...ABS, transform: `translate(${m.x.toFixed(2)}px, ${m.y.toFixed(2)}px) scale(${m.s.toFixed(5)})` }}>
            <Img src={field} style={ABS} />
          </div>
        ) : null}
        {haze ? <Img src={haze} style={ABS} /> : null}
        {vig ? <Img src={vig} style={ABS} /> : null}
      </div>
    );
  };

  const ctx: WorldCtx = { spec, frame: f, ground, hasSoft: !!(p.soft && plate) };
  return (
    <WorldContext.Provider value={ctx}>
      <div style={{ ...ABS, overflow: 'hidden', ...p.style }}>
        {ground()}
        {p.children}
      </div>
    </WorldContext.Provider>
  );
};

/** A world is a place: still or one declared camera move; nothing steps or flashes. */
export const declares = (): Declares => ({ stepped: [], flashes: [], cameraBlur: [], seams: [] });
