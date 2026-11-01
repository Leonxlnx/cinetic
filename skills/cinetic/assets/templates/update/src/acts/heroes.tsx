// The hero shots: each change of the film filmed by one designed shot of the product's own screen standing in the
// film's world (src/deal.ts HERO_META says what each does; HEROES deals one per change by fit). Every shot keeps the
// house habits: one sharp plane and a graded blur ladder (fx/depth's lens), one camera move that has a job and lands
// (declared shots only: push, follow, travel, crane, rack), the world behind it soft and a little parallaxed, glass as a
// lens on the world (fx/light Glass frosts the world's own ground), light sized to its source and timed (a press blooms
// the size of the button, a band crosses the glass on a landing), real content at density (src/update.ts and
// src/content.ts: names, faces, figures, pictures), a jump in scale, a short-shutter smear only on fast moves.
//
// Each shot is a pure function of its own frame (`f`, from the change's h0) and the change's frames (src/timeline.ts
// TIMES). heroCamera(i) gives a shot's camera without React, for src/sync.ts declares() (forensics camera-wander).
import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, FONT, TYPE, U } from '../brand/tokens';
import { CONTENT } from '../content';
import { HEROES } from '../deal';
import { type Box, type CameraPath, camera, crane, type Framing, FanFocus, fanFocusCamera, focalPx, follow, frame, frameOf, macro, PageTravel, pageTravelCamera, Plane, push, rack, screenOf, Stage3D, travel, type V3 } from '../fx/depth/index';
import { Glass, GlowPool, LightSweep } from '../fx/light';
import { GlassTiles } from '../fx/three';
import { useWorld } from '../fx/world';
import { BrowserWindow, browserWindowLayout, centreOf, keyFrames, DocPage, docPageLayout, type FocusBox, type NoticeItem, NoticeStack, noticeStackLayout, PromptBar, type PromptBarProps, promptBarLayout } from '../kit/screens';
import { Card as KitCard } from '../kit/card';
import { clamp, E, hitPulse, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { type ChangeTimes, f60, FPS, H, TIMES, W } from '../timeline';
import { type Change, photosOf, rowsOf, UPDATE } from '../update';
import { ACCENT, DARK, DARK_UI, GROUND, INK, LIGHT3D, MUTE, NIGHT, pic, PICTURE, PLATE, SCREEN_TONE, THEME, WORLD, worldDrawn } from './look';
import { buttonRect, cardSize, changedRect, headOf, Moment } from './moments';

export type HeroProps = { t: ChangeTimes; f: number };

/** The film's frame and the stage's opening camera. */
const FR = frameOf(W, H);
const FILM = { fps: FPS, width: W, height: H };
const BASE = camera([], { film: FILM }).base;
/** A framing resolved against the opening camera, as the fields of an opening camera. */
const opening = (fr: Framing): Partial<typeof BASE> => {
  const t = typeof fr === 'function' ? fr(BASE, FR) : fr;
  return { target: t.target, dist: t.dist, yaw: t.yaw, pitch: t.pitch, roll: t.roll, lens: t.lens, aperture: t.aperture };
};
/** A change's frames, local to its shot (0 = h0). */
const localOf = (t: ChangeTimes) => ({ go: t.go - t.h0, hit: t.hit - t.h0, res: t.res - t.h0, res2: t.res2 - t.h0, end: t.heroEnd - t.h0, hin: t.hin - t.h0 });
const centred = (w: number, h: number, dy = 0): Box => ({ x: (W - w) / 2, y: (H - h) / 2 + dy, w, h });
const at3 = (b: { x: number; y: number; w: number; h: number }, z = 0): V3 => [b.x + b.w / 2, b.y + b.h / 2, z];

// ------------------------------------------------------------------------------------------------ shared parts
/**
 * The world as the far plane of a shot: its soft copy (a photograph's pre-blurred plate, a built field as it is), far
 * behind the product, so a push into the product moves it less (parallax) and the product stands in its place.
 */
const worldPlane = (ground: ((o?: { soft?: boolean; bare?: boolean }) => React.ReactNode) | undefined) =>
  ground ? (
    <Plane id="world" box={{ x: -0.12 * W, y: -0.12 * H, w: 1.24 * W, h: 1.24 * H }} z={-1800} fit dof={false} smear={false} res={1}>
      {ground({ soft: true })}
    </Plane>
  ) : null;

/** A glow the size of its source, turned on at a moment and fading (a press, a landing): light as an event. */
const Bloom1: React.FC<{ x: number; y: number; r: number; a: number }> = ({ x, y, r, a }) =>
  a > 0.004 ? (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: 2 * r,
        height: 2 * r,
        borderRadius: r,
        background: `radial-gradient(closest-side, ${mixColor(ACCENT, '#FFFFFF', 0.3)} 0%, ${ACCENT}99 38%, ${ACCENT}00 100%)`,
        opacity: clamp(a * (DARK ? 0.95 : 0.7)),
        mixBlendMode: DARK ? 'plus-lighter' : 'normal',
        pointerEvents: 'none',
      }}
    />
  ) : null;

/** The pointer's scale on the screen: chunky, read at a glance in a wide and at macro scale. */
const PTR = 1.7;
/** A pointer: a chunky arrow with a soft shadow, its tip at (0, 0) of its box (72 x 92 px at 1080p), pressing when `press` > 0. */
const Pointer: React.FC<{ press: number; o: number }> = ({ press, o }) => {
  const d = 'M4 3 L4 66 L19 52 L29 76 L41 71 L31 47 L52 47 Z';
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 72, height: 92, opacity: o, transform: `scale(${(1 - 0.12 * press).toFixed(4)})`, transformOrigin: '4px 3px' }}>
      <svg width={72} height={92} viewBox="0 0 72 92" style={{ position: 'absolute', left: 6, top: 9, filter: 'blur(4px)', opacity: DARK ? 0.55 : 0.28 }}>
        <path d={d} fill="#000000" />
      </svg>
      <svg width={72} height={92} viewBox="0 0 72 92" style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={d} fill={C.white} stroke={DARK ? 'rgba(0,0,0,0.55)' : C.ink} strokeWidth={2.6} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/** A change's own screen in a kit card for this world (acts/moments.tsx), at film frame F. */
const ScreenCard: React.FC<{ c: Change; t: ChangeTimes; F: number; w: number; h: number; lift?: number }> = ({ c, t, F, w, h, lift = 0.35 }) => (
  <KitCard tone={DARK_UI ? 'dark' : 'light'} w={w} h={h} ground={GROUND} lift={lift}>
    <Moment c={c} T={t} F={F} theme={THEME} w={w} h={h} noTip />
  </KitCard>
);

/** A change's rows as notifications (the product's own news: a face for a person, the age of each). */
const AGES = ['now', '1m', '4m', '9m', '15m', '22m'];
const noticesOf = (c: Change): NoticeItem[] =>
  rowsOf(c).map((r, k, all) => ({ title: r.label, body: r.meta ?? c.sub ?? c.title, ago: AGES[all.length - 1 - k] ?? `${(all.length - k) * 5}m`, photo: r.photo, person: r.photo ? r.label : undefined, glyph: r.photo ? undefined : r.accent ? 'check' : 'bell' }));

/** Glass in a plane: fx/light Glass frosts the world at the frame position it is given, so it is drawn at its box's frame place inside the plane. */
const GlassIn: React.FC<{ box: Box; r?: number; at?: number; sweep?: number; F: number; children?: React.ReactNode }> = ({ box, r, at, sweep, F, children }) => (
  <div style={{ position: 'absolute', left: -box.x, top: -box.y, width: W, height: H }}>
    <Glass x={box.x} y={box.y} w={box.w} h={box.h} r={r} at={at} sweep={sweep} frame={F}>
      {children}
    </Glass>
  </div>
);

// ------------------------------------------------------------------------------------------------ push-press
/** push-press: the card centred, the pointer from the card's middle to its button, the camera following it in. */
const pressPlan = (t: ChangeTimes) => {
  const c = UPDATE.changes[t.i];
  const { w, h } = cardSize(c);
  const box = centred(w, h);
  const b = buttonRect(c, w, h) ?? { x: w * 0.3, y: h * 0.78, w: w * 0.4, h: 104 * U, r: 52 * U };
  const L = localOf(t);
  const tip0: V3 = [box.x + 0.58 * w, box.y + 0.5 * h, 0];
  const tip1: V3 = [box.x + b.x + 0.56 * b.w, box.y + b.y + 0.58 * b.h, 0];
  const glide = (g: number): V3 => {
    const e = E.strongInOut(clamp((g - L.go) / Math.max(1, L.hit - f60(6) - L.go)));
    return [mix(tip0[0], tip1[0], e), mix(tip0[1], tip1[1], e), 0];
  };
  // the camera rides the pointer, held toward the screen's answer (the result row above the button) so the press and
  // what it adds land in frame together, the header's words above the frame edge
  const mag = Math.min(1.55, (0.97 * FR.W) / w);
  const top = box.y + headOf(c) * U - 12 * U; // just under the header's rule: no word cut by the frame's top edge
  const ac: V3 = [box.x + w / 2, top + FR.H / mag / 2, 0];
  // early in the move the camera leans toward the pointer; it lands framing the answer whole
  const subject = (g: number): V3 => {
    const p = glide(g);
    const k = mix(0.45, 1, E.stdInOut(clamp((g - L.go) / Math.max(1, 0.6 * (L.hit - L.go)))));
    return [mix(p[0], ac[0], k), mix(p[1], ac[1], k), 0];
  };
  const cam = camera(
    [follow(L.go, subject, { frames: Math.max(f60(30), L.hit - L.go), lag: f60(14), to: { dist: focalPx(FR, 50) / mag, yaw: -5, pitch: 3 }, film: FILM, id: 'press-follow' })],
    { film: FILM, base: opening(frame(box, { fill: 0.8, yaw: -9, pitch: 5 })) },
  );
  return { c, w, h, box, b, glide, cam, L };
};
const PushPress: React.FC<HeroProps> = ({ t, f }) => {
  const world = useWorld();
  const P = React.useMemo(() => pressPlan(t), [t]);
  const { c, w, h, box, b, L } = P;
  const F = t.h0 + f;
  const press = prog(f, L.hit - f60(5), L.hit, E.stdInOut) * (1 - prog(f, L.hit, L.hit + f60(10), E.glideOut));
  const po = prog(f, L.go - f60(14), L.go, E.glideOut) * (1 - prog(f, L.hit + f60(16), L.hit + f60(34), E.softIn));
  return (
    <Stage3D camera={P.cam} frame={f}>
      {worldPlane(world?.ground)}
      <Plane id="card" box={box}>
        <ScreenCard c={c} t={t} F={F} w={w} h={h} />
        <Bloom1 x={b.x + b.w / 2} y={b.y + b.h / 2} r={0.5 * b.w} a={hitPulse(f - L.hit, 3, 16)} />
        <LightSweep x={0} y={0} w={w} h={h} at={t.hin} kind="edge" frame={F} />
      </Plane>
      <Plane id="pointer" box={{ x: 0, y: 0, w: 72 * PTR, h: 92 * PTR }} z={24} move={(g) => ({ x: P.glide(g)[0] - 4 * PTR, y: P.glide(g)[1] - 3 * PTR })} opacity={po}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${PTR})`, transformOrigin: '0 0' }}>
          <Pointer press={press} o={1} />
        </div>
      </Plane>
    </Stage3D>
  );
};

// ------------------------------------------------------------------------------------------------ macro-type
/** The typing's rate: about 18 characters a second, faster when the request's real cadence would run past its window. */
const cpsFor = (t: ChangeTimes, text: string) => {
  const L = localOf(t);
  const keys = keyFrames(text, FPS, 18, `${UPDATE.changes[t.i].id}-type`);
  const span = keys[keys.length - 1] ?? 0;
  const room = Math.max(f60(20), L.hit - L.go - f60(30));
  return 18 * Math.max(1, span / room);
};
const typeProps = (t: ChangeTimes, f: number): PromptBarProps => {
  const c = UPDATE.changes[t.i];
  const s = c.show;
  const L = localOf(t);
  const text = s.kind === 'type' ? s.text : c.title;
  return {
    text,
    placeholder: s.kind === 'type' ? s.placeholder ?? CONTENT.prompt.placeholder : CONTENT.prompt.placeholder,
    model: s.kind === 'type' ? s.model ?? CONTENT.prompt.model : CONTENT.prompt.model,
    at: L.go,
    send: L.hit,
    cps: cpsFor(t, text),
    seed: `${c.id}-type`,
    size: 'lg',
    tone: PLATE ? 'glass' : SCREEN_TONE,
    ground: GROUND,
    frame: f,
  };
};
const typePlan = (t: ChangeTimes) => {
  const L = localOf(t);
  const p0 = typeProps(t, 0);
  const lay = promptBarLayout(p0, 0, { fps: FPS });
  const box = centred(lay.w, lay.h, 30);
  const at = (b: FocusBox): V3 => [box.x + b.x + b.w / 2, box.y + b.y + b.h / 2, 0];
  const end = promptBarLayout(p0, 1e9, { fps: FPS });
  const lastKey = L.go + (end.typed.keys[end.typed.keys.length - 1] ?? 0);
  const mag = 2.6;
  const lead = (0.1 * FR.W) / mag;
  const caret = (g: number): V3 => {
    const q = at(promptBarLayout(p0, g, { fps: FPS }).focus.caret);
    return [q[0] - lead, q[1], 0];
  };
  const text0 = promptBarLayout(p0, L.go, { fps: FPS }).focus.text;
  const send = end.focus.send;
  const tf = Math.max(f60(12), lastKey + f60(4) - (L.go + f60(2)));
  const cam = camera(
    [
      push(Math.max(0, L.go - f60(28)), (from, fr) => ({ ...macro({ x: box.x + text0.x, y: box.y + text0.y, w: Math.max(text0.w, 200), h: text0.h }, { mag, yaw: -3, anchor: [0.04, 0.5] })(from, fr) }), { frames: f60(30), film: FILM, id: 'type-push' }),
      follow(L.go + f60(2), caret, { frames: tf, lag: f60(14), film: FILM, id: 'type-follow' }),
      travel(L.go + f60(2) + tf + f60(2), { target: [box.x + send.x + send.w / 2 - lead * 0.6, box.y + send.y + send.h / 2, 0] }, { frames: Math.max(f60(12), L.hit - (L.go + f60(4) + tf) - 1), film: FILM, id: 'type-send' }),
    ],
    { film: FILM, base: opening(frame(box, { fill: 0.84, yaw: -6, pitch: 3 })) },
  );
  return { box, cam, send, L };
};
const MacroType: React.FC<HeroProps> = ({ t, f }) => {
  const world = useWorld();
  const P = React.useMemo(() => typePlan(t), [t]);
  const { box, send, L } = P;
  const d = worldDrawn();
  const p = typeProps(t, f);
  const backdrop = PLATE && d.soft ? <Img src={d.soft} style={{ position: 'absolute', left: -box.x, top: -box.y, width: W, height: H }} /> : undefined;
  return (
    <Stage3D camera={P.cam} frame={f}>
      {worldPlane(world?.ground)}
      <Plane id="input" box={box}>
        <PromptBar {...p} tone={backdrop ? 'glass' : SCREEN_TONE} backdrop={backdrop} />
        <Bloom1 x={send.x + send.w / 2} y={send.y + send.h / 2} r={1.3 * send.w} a={hitPulse(f - L.hit, 3, 18)} />
        <LightSweep x={0} y={0} w={box.w} h={box.h} at={t.hin} kind="band" frame={t.h0 + f} />
      </Plane>
    </Stage3D>
  );
};

// ------------------------------------------------------------------------------------------------ toast-stack
/** The stack's slots: the front card high in frame, each older one lower, further back and softer (the lens's ladder). */
const SLOTS = [
  { cy: 0.3, z: 0 },
  { cy: 0.47, z: -130 },
  { cy: 0.61, z: -270 },
  { cy: 0.72, z: -410 },
  { cy: 0.81, z: -560 },
  { cy: 0.88, z: -710 },
];
/** The stack's UI scale (film px per UI point): its cards read at a glance, 70 % of the frame wide. */
const STACK_PT = 2.55 * U;
const slotAt = (s: number) => {
  if (s <= 0) return { cy: SLOTS[0].cy * H + s * 90, z: -s * 60 }; // the newest drops in from above and a little nearer
  const k = Math.min(SLOTS.length - 2, Math.floor(s));
  const u = Math.min(1, s - k);
  return { cy: mix(SLOTS[k].cy, SLOTS[k + 1].cy, u) * H, z: mix(SLOTS[k].z, SLOTS[k + 1].z, u) };
};
const stackPlan = (t: ChangeTimes) => {
  const c = UPDATE.changes[t.i];
  const items = noticesOf(c);
  const L = localOf(t);
  const n = items.length;
  const step = Math.max(f60(10), Math.round((L.hit - f60(12) - L.go) / Math.max(1, n - 1)));
  const arrive = items.map((_, k) => (k === 0 ? -f60(30) : k === n - 1 ? L.hit - f60(12) : L.go + k * step));
  const cw = 520 * STACK_PT;
  const lay = noticeStackLayout({ items: [items[0]], w: cw, pt: STACK_PT }, 1e6, { fps: FPS, pt: STACK_PT });
  const ch = lay.cards[0]?.h ?? lay.h;
  const cam = camera([push(L.go, { target: [W / 2, 0.42 * H, -120], dist: focalPx(FR, 50) / 1.08 }, { frames: Math.max(f60(30), L.hit - L.go + f60(6)), film: FILM, id: 'stack-push' })], {
    film: FILM,
    base: { target: [W / 2, 0.47 * H, -200], dist: focalPx(FR, 50) / 0.94, pitch: 4 },
  });
  return { c, items, arrive, cw, ch, cam, L };
};
const ToastStack: React.FC<HeroProps> = ({ t, f }) => {
  const world = useWorld();
  const P = React.useMemo(() => stackPlan(t), [t]);
  const { items, arrive, cw, ch } = P;
  const F = t.h0 + f;
  // each card's slot: how many have arrived after it (each new one pushes it back one slot on a glide)
  const slotOf = (k: number, g: number) => {
    const own = E.glideOut(clamp((g - arrive[k]) / f60(18)));
    let s = own - 1;
    for (let j = k + 1; j < items.length; j++) s += E.glideOut(clamp((g - arrive[j]) / f60(18)));
    return s;
  };
  return (
    <Stage3D camera={P.cam} frame={f}>
      {worldPlane(world?.ground)}
      {items.map((it, k) => (
        <Plane
          key={k}
          id={`toast${k}`}
          box={{ x: (W - cw) / 2, y: 0, w: cw, h: ch }}
          move={(g) => {
            const s = slotOf(k, g);
            const p = slotAt(s);
            const o = clamp((g - arrive[k]) / f60(6)) * clamp((5.2 - s) * 1.5);
            return { y: p.cy - ch / 2, z: p.z, opacity: o };
          }}
          opacity={f >= arrive[k] ? 1 : 0}
        >
          <NoticeStack items={[it]} at={-100} w={cw} pt={STACK_PT} tone={SCREEN_TONE} ground={GROUND} frame={f} />
          {k === items.length - 1 && <LightSweep x={0} y={0} w={cw} h={ch} at={t.h0 + arrive[k] + f60(12)} kind="edge" frame={F} />}
        </Plane>
      ))}
      {NIGHT && <GlowPool x={W / 2} y={H * 1.02} r={760} ry={220} at={t.hin} frame={F} />}
    </Stage3D>
  );
};

// ------------------------------------------------------------------------------------------------ fan-focus
const fanPlan = (t: ChangeTimes) => {
  const c = UPDATE.changes[t.i];
  const all = noticesOf(c);
  const L = localOf(t);
  const cw = 780 * U;
  const ch = noticeStackLayout({ items: [all[0]], w: cw }, 1e6, { fps: FPS }).cards[0]?.h ?? 150 * U;
  // the card that matters (the accent row) goes third from the front: the camera closes past the front cards onto it
  const accent = Math.max(0, rowsOf(c).findIndex((r) => r.accent));
  const focus = Math.min(all.length - 1, 2);
  const rest = all.filter((_, k) => k !== accent);
  const items = [...rest.slice(0, focus), all[accent], ...rest.slice(focus)];
  const props = { size: [cw, ch] as [number, number], focus, at: Math.max(f60(36), L.hit - f60(84)), enter: 0, side: 1 as const, centre: [W / 2 + 120, H / 2 + 80] as [number, number] };
  return { c, items, props, cw, ch };
};
const FanFocusShot: React.FC<HeroProps> = ({ t, f }) => {
  const P = React.useMemo(() => fanPlan(t), [t]);
  const cards = P.items.map((it, k) => <NoticeStack key={k} items={[it]} at={-100} w={P.cw} tone={SCREEN_TONE} ground={GROUND} frame={f} />);
  return <FanFocus cards={cards} {...P.props} />;
};

// ------------------------------------------------------------------------------------------------ carousel
const RING = { n: 12, cw: 360, ch: 480, gap: 64, turns: 0.9 } as const;
const ringR = (RING.n * (RING.cw + RING.gap)) / (2 * Math.PI);
const carouselPlan = (t: ChangeTimes) => {
  const c = UPDATE.changes[t.i];
  const photos = photosOf(c);
  const L = localOf(t);
  const R = ringR;
  const D = focalPx(FR, 35);
  const cam = camera([crane(0, { target: [W / 2, H / 2 + 16, -30], dist: D * 0.9, pitch: 4, yaw: 0, lens: 35 }, { frames: Math.max(f60(60), L.hit - f60(4)), film: FILM, id: 'ring-crane' }), rack(L.hit + f60(4), [W / 2, H / 2, 230], { frames: f60(26), film: FILM, id: 'ring-rack' })], {
    film: FILM,
    base: { target: [W / 2, H / 2, -R], dist: D * 1.25, pitch: 58, yaw: 0, lens: 35 },
  });
  const turn = (g: number) => -RING.turns * 2 * Math.PI * (1 - E.glideOut(clamp(g / Math.max(1, L.hit))));
  return { c, photos, R, cam, turn, L };
};
const Carousel: React.FC<HeroProps> = ({ t, f }) => {
  const P = React.useMemo(() => carouselPlan(t), [t]);
  const { photos, R, L } = P;
  const open = prog(f, L.hit, L.hit + f60(30), E.strongInOut);
  return (
    <Stage3D camera={P.cam} frame={f}>
      {Array.from({ length: RING.n }, (_, i) => {
        const src = photos[i % photos.length];
        return (
          <Plane
            key={i}
            id={`ring${i}`}
            box={{ x: W / 2 - RING.cw / 2, y: H / 2 - RING.ch / 2, w: RING.cw, h: RING.ch }}
            move={(g) => {
              const th = (i * 2 * Math.PI) / RING.n + P.turn(g);
              const near = i === 0 ? prog(g, L.hit, L.hit + f60(30), E.strongInOut) : 0;
              return { x: R * Math.sin(th), z: -R + R * Math.cos(th) + 260 * near, ry: (th * 180) / Math.PI, s: 1 + 0.18 * near };
            }}
          >
            <div data-imagery style={{ position: 'absolute', inset: 0, borderRadius: PICTURE.r, overflow: 'hidden', background: GROUND, boxShadow: DARK ? '0 0 0 1px rgba(255,255,255,0.14)' : '0 18px 40px rgba(0,0,0,0.16)' }}>
              <Img src={pic(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: PICTURE.filter }} />
              {i !== 0 && <div style={{ position: 'absolute', inset: 0, background: DARK ? '#000000' : GROUND, opacity: 0.35 * open }} />}
            </div>
          </Plane>
        );
      })}
    </Stage3D>
  );
};

// ------------------------------------------------------------------------------------------------ photo-develop
const developPlan = (t: ChangeTimes) => {
  const c = UPDATE.changes[t.i];
  const photos = photosOf(c);
  const L = localOf(t);
  const photo = centred(1120 * U, 720 * U, -30);
  const card: Box = { x: photo.x - 90 * U, y: photo.y + photo.h - 170 * U, w: 560 * U, h: 228 * U, z: 190 } as Box;
  const cam = camera(
    [push(Math.max(0, L.go - f60(6)), frame({ x: card.x - 30 * U, y: photo.y + 60 * U, w: photo.w * 0.86, h: card.y + card.h + 36 * U - (photo.y + 60 * U) }, { fill: 0.97, yaw: 6, pitch: 2 }), { frames: Math.max(f60(40), L.hit + f60(10) - L.go), film: FILM, id: 'develop-push' }), rack(L.go + f60(18), at3(card, 190), { frames: f60(30), film: FILM, id: 'develop-rack' })],
    { film: FILM, base: opening(frame(photo, { fill: 0.86, yaw: -4, pitch: 2 })) },
  );
  const row = rowsOf(c).find((r) => r.accent) ?? rowsOf(c)[0];
  return { c, photos, L, photo, card, cam, row };
};
const PhotoDevelop: React.FC<HeroProps> = ({ t, f }) => {
  const world = useWorld();
  const P = React.useMemo(() => developPlan(t), [t]);
  const { photos, L, photo, card, row, c } = P;
  const F = t.h0 + f;
  const dev = prog(f, L.go, L.go + f60(16), E.stdInOut); // the duotone develops to full colour
  const tick = prog(f, L.hit - f60(8), L.hit + f60(6), E.snapOut);
  const sides = photos.slice(1, 3);
  return (
    <Stage3D camera={P.cam} frame={f}>
      {worldPlane(world?.ground)}
      {sides.map((src, k) => (
        <Plane key={k} id={`side${k}`} box={{ x: k ? photo.x + photo.w - 160 * U : photo.x - 300 * U, y: photo.y + (k ? -90 : 160) * U, w: 460 * U, h: 300 * U }} z={-520}>
          <div data-imagery style={{ position: 'absolute', inset: 0, borderRadius: PICTURE.r, overflow: 'hidden' }}>
            <Img src={pic(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: PICTURE.filter }} />
          </div>
        </Plane>
      ))}
      <Plane id="photo" box={photo}>
        <div data-imagery style={{ position: 'absolute', inset: 0, borderRadius: PICTURE.r * 1.3, overflow: 'hidden', boxShadow: DARK ? '0 30px 90px rgba(0,0,0,0.5)' : '0 30px 80px rgba(0,0,0,0.22)' }}>
          {photos[0] && <Img src={pic(photos[0])} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: PICTURE.filter }} />}
          {dev < 1 && photos[0] && (
            <div style={{ position: 'absolute', inset: 0, opacity: 1 - dev }}>
              <Img src={pic(photos[0])} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) contrast(1.18) brightness(0.92)' }} />
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${WORLD.glow}, ${mixColor(WORLD.base, '#000000', 0.45)})`, mixBlendMode: 'color' }} />
            </div>
          )}
        </div>
      </Plane>
      <Plane id="glass" box={card} z={190}>
        <GlassIn box={card} r={32 * U} at={t.h0 + L.go + f60(10)} sweep={t.h0 + L.hit} F={F}>
          <div style={{ position: 'absolute', left: 40 * U, top: 36 * U, display: 'flex', alignItems: 'center', gap: 22 * U }}>
            <div style={{ width: 64 * U, height: 64 * U, borderRadius: 32 * U, background: mixColor(ACCENT, '#FFFFFF', DARK ? 0.1 : 0), display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${mix(0.6, 1, tick).toFixed(4)})`, opacity: clamp(tick * 2) }}>
              <svg width={34 * U} height={34 * U} viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7.5" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={24} strokeDashoffset={24 * (1 - tick)} /></svg>
            </div>
            <span data-text={`${c.id}-photo-title`} style={{ fontFamily: FONT.text, fontSize: TYPE.caption.size * U, fontWeight: 620, letterSpacing: '-0.015em', color: DARK || PLATE ? C.white : INK, whiteSpace: 'pre' }}>{row?.label ?? c.title}</span>
          </div>
          <div style={{ position: 'absolute', left: 40 * U, top: 128 * U }}>
            <span data-text={`${c.id}-photo-meta`} style={{ fontFamily: FONT.text, fontSize: TYPE.ui.size * U, fontWeight: 480, color: DARK || PLATE ? 'rgba(255,255,255,0.78)' : MUTE, whiteSpace: 'pre' }}>{row?.meta ?? c.sub ?? ''}</span>
          </div>
        </GlassIn>
      </Plane>
    </Stage3D>
  );
};

// ------------------------------------------------------------------------------------------------ glass-counter
const counterPlan = (t: ChangeTimes) => {
  const c = UPDATE.changes[t.i];
  const L = localOf(t);
  const slab = centred(1240 * U, 600 * U, 10);
  // the label, the figure and its note under it: what the push lands on (no word cut by the frame's edge)
  const fig: Box = { x: slab.x + 44 * U, y: slab.y + 30 * U, w: 720 * U, h: 470 * U };
  const cam = camera([push(L.go, frame(fig, { fill: 0.86, yaw: 5, pitch: -2, anchor: [0.48, 0.52] }), { frames: Math.max(f60(40), L.hit - L.go), film: FILM, id: 'counter-push' })], {
    film: FILM,
    base: opening(frame(slab, { fill: 0.84, yaw: -7, pitch: -4 })),
  });
  return { c, L, slab, fig, cam };
};
const fmtNum = (n: number) => Math.round(n).toLocaleString('en-US');
const GlassCounter: React.FC<HeroProps> = ({ t, f }) => {
  const world = useWorld();
  const P = React.useMemo(() => counterPlan(t), [t]);
  const { c, L, slab } = P;
  const s = c.show.kind === 'count' ? c.show : { label: c.title, from: 0, to: 100, unit: '', sub: c.sub, bars: undefined as number[] | undefined };
  const F = t.h0 + f;
  const p = prog(f, L.go, L.hit, E.glideOut);
  const v = mix(s.from, s.to, p);
  const bars = s.bars?.length ? s.bars : [0.3, 0.38, 0.35, 0.5, 0.58, 0.72, 1];
  const top = Math.max(...bars);
  const ink = DARK || PLATE ? C.white : INK;
  const mute = DARK || PLATE ? 'rgba(255,255,255,0.72)' : MUTE;
  const unitW = s.unit ? measureTracked(s.unit, TYPE.line.size * 0.8 * U, 560, -0.02, FONT.text) : 0;
  const bw = 46 * U;
  return (
    <Stage3D camera={P.cam} frame={f}>
      {worldPlane(world?.ground)}
      <Plane id="slab" box={slab}>
        <GlassIn box={slab} r={44 * U} at={t.hin - f60(24)} sweep={t.hit} F={F}>
          <div style={{ position: 'absolute', left: 64 * U, top: 58 * U }}>
            <span data-text={`${c.id}-count-label`} style={{ fontFamily: FONT.text, fontSize: TYPE.ui.size * U, fontWeight: 520, color: mute, whiteSpace: 'pre' }}>{s.label}</span>
          </div>
          <div style={{ position: 'absolute', left: 58 * U, top: 128 * U, display: 'flex', alignItems: 'baseline', gap: 16 * U }}>
            <span data-text={`${c.id}-count-figure`} style={{ fontFamily: FONT.text, fontSize: TYPE.hero.size * U, fontWeight: 640, letterSpacing: '-0.035em', lineHeight: 1.05, color: ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'pre' }}>{fmtNum(v)}</span>
            {s.unit && <span data-text={`${c.id}-count-unit`} style={{ fontFamily: FONT.text, fontSize: TYPE.line.size * 0.8 * U, fontWeight: 560, letterSpacing: '-0.02em', color: mute, width: unitW, whiteSpace: 'pre' }}>{s.unit}</span>}
          </div>
          {s.sub && (
            <div style={{ position: 'absolute', left: 66 * U, top: (128 + TYPE.hero.size * 1.08 + 8) * U, opacity: prog(f, L.res, L.res + f60(14), E.snapOut) }}>
              <span data-text={`${c.id}-count-sub`} style={{ fontFamily: FONT.text, fontSize: TYPE.ui.size * U, fontWeight: 560, color: ACCENT, whiteSpace: 'pre' }}>{s.sub}</span>
            </div>
          )}
          <div data-chart style={{ position: 'absolute', right: 64 * U, bottom: 64 * U, width: bars.length * bw + (bars.length - 1) * 18 * U, height: 320 * U }}>
            {bars.map((bb, k) => {
              const g = prog(f, L.go + (k / bars.length) * 0.45 * (L.hit - L.go), L.hit, E.stdInOut);
              const last = k === bars.length - 1;
              return <div key={k} style={{ position: 'absolute', left: k * (bw + 18 * U), bottom: 0, width: bw, height: Math.max(8 * U, (bb / top) * 320 * U * g), borderRadius: 12 * U, background: last ? ACCENT : DARK || PLATE ? 'rgba(255,255,255,0.22)' : mixColor(INK, '#FFFFFF', 0.86) }} />;
            })}
          </div>
        </GlassIn>
      </Plane>
      {NIGHT && <GlowPool x={W / 2} y={H * 1.04} r={820} ry={240} at={t.hin} frame={F} />}
    </Stage3D>
  );
};

// ------------------------------------------------------------------------------------------------ page-fly
type PageSpec = { size: [number, number]; from: [number, number]; to: [number, number]; node: (F: number, f: number) => React.ReactNode };
const pageSpec = (t: ChangeTimes): PageSpec => {
  const c = UPDATE.changes[t.i];
  const s = c.show;
  if (s.kind === 'fill' && s.layout === 'week') {
    const { w, h } = cardSize(c);
    const r = changedRect(c, w, h);
    return { size: [w, h], from: [0.36 * w, 0.16 * h], to: [r.x + r.w / 2, r.y + r.h / 2], node: (F) => <ScreenCard c={c} t={t} F={F} w={w} h={h} lift={0} /> };
  }
  if (s.kind === 'page' && s.page === 'site' && CONTENT.site) {
    const site = CONTENT.site;
    const lay = browserWindowLayout({ ...site }, 0, {});
    const head = lay.focus.headline;
    const to = lay.focus.cards ?? lay.focus.picture ?? head;
    return { size: [lay.w, lay.h], from: [head.x + head.w * 0.4, head.y + head.h / 2], to: [to.x + to.w / 2, to.y + to.h / 2], node: (_F, f) => <BrowserWindow {...site} tone={SCREEN_TONE} ground={GROUND} frame={f} build={{ at: 0 }} /> };
  }
  const doc = { ...CONTENT.doc, title: s.kind === 'page' ? s.heading ?? c.title : c.title, accentWord: s.kind === 'page' ? s.accentWord ?? CONTENT.doc.accentWord : CONTENT.doc.accentWord };
  const lay = docPageLayout(doc, 0, {});
  const title = lay.focus.title;
  const to = lay.focus.table ?? lay.focus.lead ?? title;
  return { size: [lay.w, lay.h], from: [title.x + title.w * 0.42, title.y + title.h / 2], to: [to.x + to.w / 2, to.y + to.h * 0.4], node: (_F, f) => <DocPage {...doc} tone={DARK_UI ? 'dark' : 'light'} ground={GROUND} frame={f} /> };
};
const pagePlan = (t: ChangeTimes) => {
  const L = localOf(t);
  const spec = pageSpec(t);
  const props = { size: spec.size, from: spec.from, to: spec.to, at: Math.max(0, L.go - f60(4)), frames: Math.max(f60(60), L.hit - Math.max(0, L.go - f60(4))) };
  return { spec, props };
};
const PageFly: React.FC<HeroProps> = ({ t, f }) => {
  const P = React.useMemo(() => pagePlan(t), [t]);
  const F = t.h0 + f;
  const [pw] = P.spec.size;
  return (
    <PageTravel {...P.props}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 18 * U, boxShadow: DARK ? `0 0 0 1px rgba(255,255,255,0.18), 0 0 34px ${mixColor(ACCENT, '#FFFFFF', 0.5)}55` : '0 40px 120px rgba(0,0,0,0.26)' }} />
      {P.spec.node(F, f)}
      <div style={{ position: 'absolute', left: 0, top: 0, width: pw, height: 3 * U, background: `linear-gradient(90deg, transparent, rgba(255,255,255,${DARK ? 0.8 : 0.9}) 30%, rgba(255,255,255,${DARK ? 0.8 : 0.9}) 70%, transparent)`, opacity: 0.85 }} />
    </PageTravel>
  );
};

// ------------------------------------------------------------------------------------------------ focus-swap
const swapPlan = (t: ChangeTimes) => {
  const c = UPDATE.changes[t.i];
  const { w, h } = cardSize(c);
  const L = localOf(t);
  const a = centred(w, h, -20);
  const bb = centred(w, h, 30);
  const cam = camera([push(L.hit - f60(24), frame({ ...bb, z: 210 } as Box, { fill: 0.82, yaw: 4, pitch: 3 }), { frames: f60(48), film: FILM, id: 'swap-push' }), rack(L.hit - f60(22), at3(bb, 210), { frames: f60(30), film: FILM, id: 'swap-rack' })], {
    film: FILM,
    base: opening(frame(a, { fill: 0.78, yaw: -6, pitch: 3 })),
  });
  return { c, w, h, a, bb, cam, L };
};
const FocusSwap: React.FC<HeroProps> = ({ t, f }) => {
  const world = useWorld();
  const P = React.useMemo(() => swapPlan(t), [t]);
  const { c, w, h, a, bb, L } = P;
  const up = prog(f, L.hit - f60(24), L.hit + f60(12), E.glideOut);
  const dim = prog(f, L.hit - f60(20), L.hit + f60(10), E.stdInOut);
  const before = t.go - f60(2);
  const after = Math.max(t.h0 + f, t.hit + f60(40));
  return (
    <Stage3D camera={P.cam} frame={f}>
      {worldPlane(world?.ground)}
      <Plane id="before" box={a} move={() => ({ z: -300 * dim, y: -60 * dim, opacity: 1 - 0.45 * dim })}>
        <ScreenCard c={c} t={t} F={before} w={w} h={h} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 30 * U, background: DARK ? '#000000' : GROUND, opacity: 0.5 * dim }} />
      </Plane>
      {up > 0 && (
        <Plane id="after" box={bb} z={210} move={() => ({ y: (1 - up) * 380, opacity: clamp(up * 3) })}>
          <ScreenCard c={c} t={t} F={after} w={w} h={h} lift={0.8} />
          <LightSweep x={0} y={0} w={w} h={h} at={t.hit + f60(6)} kind="edge" frame={t.h0 + f} />
        </Plane>
      )}
    </Stage3D>
  );
};

// ------------------------------------------------------------------------------------------------ glass-tiles
const GlassTilesShot: React.FC<HeroProps> = ({ t }) => {
  const c = UPDATE.changes[t.i];
  const L = localOf(t);
  const icons = (c.logos ?? []).map((p) => pic(p));
  const d = worldDrawn();
  return <GlassTiles icons={icons} at={Math.max(0, L.go - f60(10))} dur={Math.round(((L.hit - Math.max(0, L.go - f60(10))) * 60) / FPS)} move="arrive" light={LIGHT3D} backdrop={d.src ?? undefined} seed={c.id} />;
};

// ------------------------------------------------------------------------------------------------ the shots, by id
const SHOTS: Record<string, React.FC<HeroProps>> = {
  'push-press': PushPress,
  'macro-type': MacroType,
  'toast-stack': ToastStack,
  'fan-focus': FanFocusShot,
  carousel: Carousel,
  'photo-develop': PhotoDevelop,
  'glass-counter': GlassCounter,
  'page-fly': PageFly,
  'focus-swap': FocusSwap,
  'glass-tiles': GlassTilesShot,
};

/** Change i's hero shot at its own frame `f` (0 = the change's h0). */
export const HeroShot: React.FC<HeroProps> = (p) => {
  const S = SHOTS[HEROES[p.t.i]] ?? PushPress;
  return <S {...p} />;
};

/**
 * Change i's shot camera (its own frames), or null for a shot whose camera lives elsewhere (the glass tiles' 3D stage):
 * src/sync.ts declares() hands these to the render checks (forensics camera-wander) with the shot's offset.
 */
export const heroCamera = (i: number): CameraPath | null => {
  const t = TIMES[i];
  switch (HEROES[i]) {
    case 'push-press':
      return pressPlan(t).cam;
    case 'macro-type':
      return typePlan(t).cam;
    case 'toast-stack':
      return stackPlan(t).cam;
    case 'fan-focus': {
      const P = fanPlan(t);
      return fanFocusCamera({ ...P.props, count: P.items.length }, FILM).cam;
    }
    case 'carousel':
      return carouselPlan(t).cam;
    case 'photo-develop':
      return developPlan(t).cam;
    case 'glass-counter':
      return counterPlan(t).cam;
    case 'page-fly': {
      const P = pagePlan(t);
      return pageTravelCamera(P.props, FILM).cam;
    }
    case 'focus-swap':
      return swapPlan(t).cam;
    default:
      return null;
  }
};
/** Each shot's subject on its stage (a world point): what a porthole into the shot frames. */
const heroSubject = (i: number): V3 | null => {
  const t = TIMES[i];
  switch (HEROES[i]) {
    case 'push-press': {
      const P = pressPlan(t);
      return at3({ x: P.box.x + P.b.x, y: P.box.y + P.b.y, w: P.b.w, h: P.b.h });
    }
    case 'carousel': {
      const P = carouselPlan(t);
      const th = P.turn(0);
      return [W / 2 + P.R * Math.sin(th), H / 2, -P.R + P.R * Math.cos(th)];
    }
    case 'toast-stack':
      return [W / 2, SLOTS[0].cy * H, 0];
    case 'photo-develop':
      return at3(developPlan(t).photo);
    case 'glass-counter':
      return at3(counterPlan(t).fig);
    case 'macro-type': {
      const P = typePlan(t);
      return [P.box.x + P.box.w * 0.3, P.box.y + P.box.h / 2, 0];
    }
    case 'focus-swap':
      return at3(swapPlan(t).a);
    default:
      return null;
  }
};
/** Where change i's shot shows its subject on its opening frame (frame px): a porthole into the shot is centred there. */
export const heroFocus = (i: number): [number, number] => {
  const cam = heroCamera(i);
  const p = heroSubject(i);
  const q = cam && p ? screenOf(cam, 0, p) : null;
  return q ? [q.x, q.y] : [W / 2, H / 2];
};
void centreOf;
void staticFile;
