// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// ring-dive: a ring of the product's pictures that the camera dives through onto its name.
//
// A ring of ~96 cards stands on a circle like the fins of a rolodex (each card's plane holds the radius, long edge along
// it). The camera starts on the ring's axis, so every card is a thin radial spike tinted in the palette, and backs away
// until the photos read; it swings down to a near side view in about a third of a second (the ring collapses into a band
// across the frame, cards at its ends face the camera, the front ones are slivers), the ring spins at a constant rate,
// then the camera rises, pitches down and pushes through the ring's plane: the near half sweeps out of the bottom, the
// far half arches over the top and is gone, and the name is already lying at the centre, carried a little left as the
// camera brakes. 2.6 s. Big.
//
// Numbers (1080p px, 30 fps): cards 400 x 225, radius 30, on a circle of radius 820; a long lens (20 deg vertical field:
// the measured band, x 170-1750 and y 408-788, fits it); down the axis the fins carry a 7 deg yaw that reads as wedges;
// the swing from the axis to 7 deg takes f9-25, most of it by f16; spin 0.72 deg/f, linear, the near side flowing right to
// left; the dive (26 f) rises, pitches down and pushes through the ring plane on a hard ease-in; the name cuts on at
// f60 and brakes leftward 30, 15, 6, 4, 1 px/f. No motion blur, no shadow: depth from perspective and occlusion alone.
import React from 'react';
import { Cursor } from '../fx/Cursor';
import { FONT } from '../brand/tokens';
import { type Logo, LogoMark } from '../brand/Mark';
import { E, track, XP } from '../lib/anim';
import { mixColor } from '../lib/color';
import { paletteOf, type Palette, type SceneMeta, span, useClock } from './parts';
import { hash, Picture, Stage1080 } from './stage1080';

/** The house numbers. */
export const RING = {
  dur: 78,
  cards: 96,
  card: { w: 400, h: 225, r: 30 },
  radius: 820,
  fov: 20.4, // the measured band (x 170-1750, y 408-788 at a 7 deg elevation) fits a long lens, not the 40 deg the eye guesses
  spin: -0.72, // deg per 30 fps frame (negative: the near side flows right to left)
  // the camera as measured keys: elevation above the ring plane (deg) and the ring centre's distance behind the focal plane (px)
  phi: [[0, 90], [6, 90], [9, 80], [12, 46], [16, 20], [20, 10], [25, 7], [40, 10], [48, 20], [54, 48], [58, 76], [62, 90], [66, 90]] as const,
  T: [[0, -270], [9, 263], [12, 520], [16, 760], [25, 864], [40, 830], [48, 690], [53, 300], [57, -400], [60, -1100], [64, -1700], [66, -1900]] as const,
  yaw: { deg: 7, from: 8, to: 18 }, // the fins' slight yaw that reads as wedges down the axis, gone by the band
  tilt: { from: 9 },
  band: { from: 20 },
  dive: { from: 40, to: 66 },
  tint: { full: 4, gone: 11 }, // the duotone tint on the spikes leaves as the photos read
  name: { at: 60, size: 72, brake: [0, -30, -45, -51, -55, -56, -58, -58, -59] as const },
} as const;

export type RingDiveProps = {
  /** the product's name, revealed at the centre (the word it hands on) */
  title: string;
  /** pictures for the cards (public paths or URLs): thumbnails of what the product holds; cards cycle through them */
  images?: string[];
  /** the product's mark, set before the name */
  logo?: Logo;
  palette?: Partial<Palette>;
  cards?: number;
  /** the paper-plane cursor riding the near rim while the ring spins */
  pointer?: boolean;
  frame?: number;
  seed?: number;
};

export const ringDiveMeta: SceneMeta = {
  id: 'ring-dive',
  does: 'a ring of the product\'s pictures seen down its axis swings to a spinning band and the camera dives through it onto the name',
  dur: RING.dur,
  props: ['title', 'images', 'logo'],
  handIn: null,
  handOut: { form: 'word', x: 960 - 140, y: 503, w: 280, h: 74 },
  klass: 'big',
  cues: [
    { f: 0, kind: 'whoosh', id: 'ring-axis', weight: 0.6 },
    { f: 9, kind: 'whoosh', id: 'ring-swing', weight: 0.8 },
    { f: 34, kind: 'riser', id: 'ring-dive-swell', weight: 0.7 },
    { f: 60, kind: 'hit', id: 'ring-name', weight: 1 },
  ],
};

/** The camera at scene frame t: elevation phi (deg), ring-centre distance T (px), spin (deg), the fins' yaw (deg). */
export const ringCamera = (t: number) => ({
  phi: track(t, RING.phi),
  T: track(t, RING.T),
  spin: RING.spin * t,
  yaw: RING.yaw.deg * (1 - E.stdInOut(span(t, RING.yaw.from, RING.yaw.to))),
});

/** The name's horizontal offset (px) and visibility at scene frame t (it cuts on, then brakes leftward). */
export const ringName = (t: number) => {
  const R = RING.name;
  if (t < R.at) return { on: false, dx: 0 };
  const k = (t - R.at) * (24 / 30); // the brake was measured per 24 fps frame
  const i = Math.min(R.brake.length - 1, Math.floor(k));
  const a = R.brake[i];
  const b = R.brake[Math.min(R.brake.length - 1, i + 1)];
  return { on: true, dx: a + (b - a) * (k - i) - 0.4 * Math.max(0, k - R.brake.length) };
};

const focal = (fov: number) => 540 / Math.tan((fov * Math.PI) / 360);

export const RingDive: React.FC<RingDiveProps> = ({ title, images = [], logo, palette, cards = RING.cards, pointer = true, frame, seed = 7 }) => {
  const { t, W, H } = useClock(frame);
  const pal = paletteOf(palette);
  const cam = ringCamera(t);
  const P = focal(RING.fov);
  const tint = 1 - E.stdInOut(span(t, RING.tint.full, RING.tint.gone));
  const name = ringName(t);
  const { w: cw, h: ch, r: cr } = RING.card;
  const n = Math.max(12, Math.round(cards));
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => hash(seed, a) - hash(seed, b));
  // the cards go once the camera is through them (and never draw behind the lens)
  const cardsOn = t < RING.dive.to;
  const tintAt = (i: number) => {
    const a = (i / n) * Math.PI * 2;
    return mixColor(pal.accent, pal.lift, 0.5 + 0.5 * Math.sin(a * 2 + 0.6));
  };
  // the plane cursor rides the near rim while the band spins, then is swept out to the right by the dive
  const cur = (() => {
    if (!pointer || t < RING.band.from - 2 || t > RING.dive.from + 16) return null;
    const ride = XP.travel(span(t, RING.band.from - 2, RING.band.from + 8));
    const sweep = Math.pow(span(t, RING.dive.from + 2, RING.dive.from + 16), 2);
    return { x: 1530 - 46 * ride + 640 * sweep, y: 668 + 20 * sweep - 80 * sweep * sweep, o: span(t, RING.band.from - 2, RING.band.from + 1) };
  })();
  return (
    <Stage1080 W={W} H={H} ground={pal.ground}>
      {cardsOn && (
        <div style={{ position: 'absolute', inset: 0, perspective: `${P}px`, perspectiveOrigin: '960px 540px' }}>
          <div
            style={{
              position: 'absolute',
              left: 960,
              top: 540,
              width: 0,
              height: 0,
              transformStyle: 'preserve-3d',
              transform: `translateZ(${-cam.T}px) rotateX(${-cam.phi}deg) rotateY(${cam.spin}deg)`,
            }}
          >
            {order.map((img, i) => {
              const deg = (i / n) * 360;
              const src = images.length ? images[img % images.length] : null;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: -cw / 2,
                    top: -ch / 2,
                    width: cw,
                    height: ch,
                    borderRadius: cr,
                    overflow: 'hidden',
                    background: src ? '#D9DBDF' : mixColor(pal.paper, pal.ink, 0.06 + 0.1 * hash(seed + 3, i)),
                    transform: `rotateY(${-deg}deg) translateX(${RING.radius}px) rotateY(${cam.yaw}deg)`,
                  }}
                >
                  {src ? <Picture src={src} /> : <EmptyThumb pal={pal} i={i} seed={seed} />}
                  {tint > 0 && <div style={{ position: 'absolute', inset: 0, background: tintAt(i), opacity: tint }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {cur && <Cursor x={cur.x} y={cur.y} scale={2.5} shape="plane" opacity={cur.o} rim={pal.accent} />}
      {name.on && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: RING.name.size * 0.32,
            transform: `translate(${name.dx}px, ${540 - RING.name.size * 0.62}px)`,
          }}
        >
          {logo && <LogoMark logo={logo} size={RING.name.size * 1.2} />}
          <div data-text="scene-title" style={{ fontFamily: FONT.text, fontWeight: 500, fontSize: RING.name.size, letterSpacing: '-0.02em', color: pal.ink, lineHeight: 1.24, whiteSpace: 'nowrap' }}>
            {title}
          </div>
        </div>
      )}
    </Stage1080>
  );
};

/** A card with no picture: a quiet panel with a few soft bars (the ring still reads as many things held). */
const EmptyThumb: React.FC<{ pal: Palette; i: number; seed: number }> = ({ pal, i, seed }) => {
  const h = (k: number) => hash(seed + 11 * k, i);
  return (
    <div style={{ position: 'absolute', inset: 0, background: mixColor(pal.paper, pal.accent, 0.08 + 0.22 * h(1)) }}>
      <div style={{ position: 'absolute', left: 34, top: 34, width: 120 + 140 * h(2), height: 22, borderRadius: 11, background: mixColor(pal.ink, pal.paper, 0.55) }} />
      <div style={{ position: 'absolute', left: 34, top: 72, width: 80 + 160 * h(3), height: 16, borderRadius: 8, background: mixColor(pal.ink, pal.paper, 0.78) }} />
      <div style={{ position: 'absolute', right: 30, bottom: 30, width: 90, height: 90, borderRadius: 24, background: mixColor(pal.accent, pal.paper, 0.2 + 0.4 * h(4)) }} />
    </div>
  );
};

// the frame the dive's cards cover half the picture and the name cuts on, for a template's sound plan
export const RING_EVENTS = { swing: RING.tilt.from, dive: RING.dive.from, name: RING.name.at } as const;
