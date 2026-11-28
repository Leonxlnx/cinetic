// The scenes the library's reels play the turns and effects in: a palette, licensed photographs from public/img, and
// detailed panels (a notice, a prompt, avatars, a day planner, a photo board), so a piece is judged the way it would be
// used. Shared by ReelTurns and ReelFx; a new reel segment takes them from here.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { Ground, fonts, softShadow, ease, mix, clamp, Icon } from '../../kit';

// palette: paper, ink, cobalt, sky, orange, coral, sun, navy
export const PAPER = '#F4F2EE';
export const WHITE = '#FAFAF8';
export const INK = '#141519';
export const NIGHT = '#0C0D10';
export const COBALT = '#2F5BFF';
export const SKY = '#9CC8FF';
export const ORANGE = '#FF6A2B';
export const CORAL = '#FF8A6B';
export const SUN = '#FFC93C';

export const IMG = {
  cloud: 'cloud-streets-over-the-bering-sea.jpg',
  delta: 'earth-observations-taken-by-expedition-26.jpg',
  shore: 'earth-observations-taken-by-the-expedition.jpg',
  tide: 'hokianga-tide-out.jpg',
  farms: 'seaweed-farms-in-south-korea.jpg',
  waves: 'waves-009.jpg',
};

export const say = (size: number, color: string, weight = 520): React.CSSProperties => ({ fontFamily: fonts.inter, fontSize: size, fontWeight: weight, color, letterSpacing: size > 100 ? '-0.03em' : '-0.015em', lineHeight: 1.04 });
export const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', ...style }}>{children}</AbsoluteFill>
);
/** A full-frame photograph with a slow drift (drift 0: still, so a plate can match it exactly). */
export const Photo: React.FC<{ src: string; zoom?: number; drift?: number; children?: React.ReactNode; dim?: number; t0?: number }> = ({ src, zoom = 1.04, drift = 0.0006, children, dim = 0, t0 = 0 }) => {
  // t0: frames already drifted (a scene that continues in a second Sequence keeps its drift: no jump at the join)
  const f = useCurrentFrame() + t0;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: NIGHT }}>
      <Img src={staticFile(`img/${src}`)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom + f * drift})` }} />
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(8,9,12,${dim})` }} />}
      {children}
    </AbsoluteFill>
  );
};
export const Pic: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={staticFile(`img/${src}`)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }} />
);
export const Label: React.FC<{ name: string }> = ({ name }) => (
  <div style={{ position: 'absolute', left: 40, bottom: 36, padding: '10px 18px', borderRadius: 999, background: 'rgba(16,17,20,0.62)', color: '#fff', fontFamily: fonts.inter, fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em', backdropFilter: 'blur(8px)' }}>
    {name}
  </div>
);
/** A line of type that rises out of a mask (a clean entrance; nothing here leaves by fading). */
export const Rise: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; dur?: number }> = ({ at: a, children, style, dur = 14 }) => {
  const f = useCurrentFrame();
  const p = ease.out(clamp((f - a) / dur));
  if (f < a) return null;
  return (
    <div style={{ overflow: 'hidden', paddingBottom: '0.12em', ...style }}>
      <div style={{ transform: `translateY(${mix(p, 110, 0)}%)` }}>{children}</div>
    </div>
  );
};
export const shadowText = '0 2px 30px rgba(0,0,0,.28)';

// panels for the scenes
export const Notice: React.FC<{ w: number; app: string; title: string; body: string; color?: string; icon?: Parameters<typeof Icon>[0]['name']; dark?: boolean; time?: string }> = ({ w, app, title, body, color = COBALT, icon = 'CalendarDays', dark, time = 'now' }) => (
  <div style={{ width: w, padding: '22px 24px', borderRadius: 30, background: dark ? 'rgba(34,36,42,0.94)' : 'rgba(255,255,255,0.95)', boxShadow: softShadow(3, dark ? NIGHT : PAPER), fontFamily: fonts.inter, color: dark ? '#fff' : INK, display: 'flex', gap: 18, alignItems: 'flex-start', boxSizing: 'border-box', textAlign: 'left' }}>
    <div style={{ width: 60, height: 60, borderRadius: 16, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <Icon name={icon} size={32} color="#fff" />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, opacity: 0.55 }}>
        <span>{app}</span>
        <span>{time}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>{title}</div>
      <div style={{ fontSize: 28, opacity: 0.72, marginTop: 2 }}>{body}</div>
    </div>
  </div>
);
export const Prompt: React.FC<{ w: number; text: string; dark?: boolean }> = ({ w, text, dark }) => (
  <div style={{ width: w, height: 150, borderRadius: 36, background: dark ? 'rgba(27,29,34,0.96)' : '#fff', boxShadow: dark ? `inset 0 1px 0 rgba(255,255,255,.08), ${softShadow(4, NIGHT)}` : softShadow(4, PAPER), fontFamily: fonts.inter, fontSize: 36, color: dark ? '#F2F3F5' : INK, padding: '28px 36px', boxSizing: 'border-box', position: 'relative', textAlign: 'left' }}>
    {text}
    <div style={{ position: 'absolute', left: 30, bottom: 22, display: 'flex', gap: 12 }}>
      {['Plus', 'Paperclip'].map((n) => (
        <div key={n} style={{ width: 50, height: 50, borderRadius: 25, border: `2px solid ${dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={n as 'Plus'} size={26} color={dark ? '#C9CCD3' : '#5B6170'} />
        </div>
      ))}
    </div>
    <div style={{ position: 'absolute', right: 24, bottom: 22, width: 56, height: 56, borderRadius: 28, background: dark ? '#fff' : INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="ArrowUp" size={30} color={dark ? INK : '#fff'} />
    </div>
  </div>
);
export const Avatars: React.FC<{ n: number; size?: number; ring?: string }> = ({ n, size = 48, ring = '#fff' }) => {
  const tones = [CORAL, SKY, SUN, ORANGE, COBALT, '#C9B8A6'];
  const ini = ['MA', 'JK', 'SO', 'RL', 'TE', 'AV'];
  return (
    <div style={{ display: 'flex' }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ width: size, height: size, borderRadius: size / 2, background: tones[i % 6], border: `3px solid ${ring}`, marginLeft: i ? -size * 0.28 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.inter, fontSize: size * 0.36, fontWeight: 600, color: INK, boxSizing: 'border-box' }}>
          {ini[i % 6]}
        </div>
      ))}
    </div>
  );
};
export const Planner: React.FC<{ dark?: boolean; w?: number }> = ({ dark, w = 820 }) => {
  const rows: Array<[string, string, string, number]> = [
    ['Design review', '9:30', COBALT, 3],
    ['Tide walk, north beach', '11:00', SKY, 2],
    ['Lunch with Sam', '12:30', ORANGE, 1],
    ['Ship the beta', '15:00', SUN, 4],
  ];
  return (
    <div style={{ width: w, padding: '32px 36px', borderRadius: 36, background: dark ? 'rgba(22,24,28,0.94)' : 'rgba(255,255,255,0.96)', boxShadow: softShadow(5, dark ? NIGHT : '#9FB6C8'), fontFamily: fonts.inter, color: dark ? '#fff' : INK, boxSizing: 'border-box', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: '-0.02em' }}>Thursday</div>
        <div style={{ fontSize: 28, opacity: 0.55 }}>4 events</div>
      </div>
      {rows.map(([t, h, c, n]) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 0', borderTop: `1px solid ${dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)'}` }}>
          <div style={{ width: 10, height: 48, borderRadius: 5, background: c }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 33, fontWeight: 550 }}>{t}</div>
            <div style={{ fontSize: 26, opacity: 0.55, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{h}</div>
          </div>
          <Avatars n={n} size={46} ring={dark ? '#16181C' : '#fff'} />
        </div>
      ))}
    </div>
  );
};

/** A photo board: a header and six photographs in a 3 x 2 grid. Tile (i, j) has its centre at gx(i), gy(j). */
export const G = { x0: 148, y0: 290, w: 520, h: 330, gap: 32, r: 28 };
export const gx = (i: number) => G.x0 + i * (G.w + G.gap) + G.w / 2;
export const gy = (j: number) => G.y0 + j * (G.h + G.gap) + G.h / 2;
export const BOARD: Array<[string, string]> = [
  [IMG.cloud, 'Cloud streets'],
  [IMG.delta, 'Delta'],
  [IMG.waves, 'Morning swell'],
  [IMG.tide, 'Low tide'],
  [IMG.farms, 'Kelp farms'],
  [IMG.shore, 'Sand bars'],
];
export const Board: React.FC = () => (
  <Ground color={PAPER} light={false}>
    <div style={{ position: 'absolute', left: G.x0, top: 128, right: G.x0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: fonts.inter, color: INK }}>
      <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: '-0.03em' }}>Field notes</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <Avatars n={4} size={54} ring={PAPER} />
        <div style={{ padding: '14px 26px', borderRadius: 999, background: INK, color: '#fff', fontSize: 28, fontWeight: 550 }}>Share</div>
      </div>
    </div>
    {BOARD.map(([src, name], k) => {
      const i = k % 3;
      const j = Math.floor(k / 3);
      return (
        <div key={src} style={{ position: 'absolute', left: gx(i) - G.w / 2, top: gy(j) - G.h / 2, width: G.w, height: G.h, borderRadius: G.r, overflow: 'hidden', boxShadow: softShadow(2, PAPER) }}>
          <Pic src={src} />
          <div style={{ position: 'absolute', left: 18, bottom: 18, padding: '8px 16px', borderRadius: 999, background: 'rgba(255,255,255,.92)', fontFamily: fonts.inter, fontSize: 26, fontWeight: 550, color: INK }}>{name}</div>
        </div>
      );
    })}
  </Ground>
);
