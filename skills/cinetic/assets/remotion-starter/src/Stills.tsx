import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Mark, placeMark } from './brand/Mark';
import { C, TYPE, U, typeStyle } from './brand/tokens';
import { AppIcon, BrandLogo, InlineLogo, kitTheme, LogoChip, type LogoRef, LogoRing, LogoWall } from './kit';
import { FontGate } from './lib/FontGate';
import { LOGOS } from './logos';
import { baselineOf, inkBox, measureTracked } from './lib/measure';
import { copy } from './timeline';

// Style frames: rendered with `npm run stills` and looked at before any animation is built.
// The mark must hold up at favicon size and at full screen, on paper and on ink.

export const MarkStill: React.FC<{ size: number; surface: 'paper' | 'ink' }> = ({ size, surface }) => (
  <AbsoluteFill style={{ background: surface === 'ink' ? C.ink : C.paper, alignItems: 'center', justifyContent: 'center' }}>
    <Mark size={size} ink={surface === 'ink' ? C.paper : C.ink} />
  </AbsoluteFill>
);

const SIZES = [16, 24, 32, 48, 64, 128, 256];

/** The mark at every working size on both surfaces: gaps must stay open and the dot must read. */
export const MarkSizes: React.FC = () => (
  <AbsoluteFill style={{ background: C.paper }}>
    {(['paper', 'ink'] as const).map((surface) => (
      <div
        key={surface}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 64 * U, background: surface === 'ink' ? C.ink : C.paper }}
      >
        {SIZES.map((s) => (
          <Mark key={s} size={s * U} ink={surface === 'ink' ? C.paper : C.ink} />
        ))}
      </div>
    ))}
  </AbsoluteFill>
);

// ---- Brand kit: rendered by scripts/brand-kit.sh (transparent PNGs unless a ground colour is set) ----
type Ground = 'light' | 'dark' | 'accent';
const inkOn = (g: Ground) => (g === 'light' ? C.ink : C.paper);
const groundOf = (g: Ground) => (g === 'light' ? C.paper : g === 'dark' ? C.ink : C.accent);

/** The lockup as the film ends on it: the mark as tall as the name's ink ascent, a 0.3 gap, one baseline, centred. */
const Lockup: React.FC<{ nameSize: number; ink: string; cx: number; cy: number }> = ({ nameSize, ink, cx, cy }) => {
  const name = copy('wordmark').text;
  const { weight, track } = TYPE.display;
  const M = inkBox(name, nameSize, weight).ascent;
  const nameW = measureTracked(name, nameSize, weight, track);
  const gap = 0.3 * M;
  const x = cx - (M + gap + nameW) / 2;
  const base = cy + M / 2;
  return (
    <>
      <Mark size={M} ink={ink} style={placeMark(x, base - M)} />
      <span style={{ ...typeStyle('display', nameSize), lineHeight: 1, color: ink, position: 'absolute', left: 0, top: 0, transform: `translate(${x + M + gap}px, ${base - baselineOf(nameSize, weight, 1)}px)` }}>
        {name}
      </span>
    </>
  );
};

export const BrandMark: React.FC<{ size: number; ground: Ground }> = ({ size, ground }) => (
  <AbsoluteFill>
    <Mark size={size} ink={inkOn(ground)} />
  </AbsoluteFill>
);

export const BrandLockup: React.FC<{ ground: Ground }> = ({ ground }) => (
  <FontGate>
    <AbsoluteFill>
      <Lockup nameSize={240} ink={inkOn(ground)} cx={1200} cy={400} />
    </AbsoluteFill>
  </FontGate>
);

/** A social avatar: the platform crops it to a circle, so the mark stays inside 55% of the width. */
export const BrandAvatar: React.FC<{ ground: Ground }> = ({ ground }) => (
  <AbsoluteFill style={{ background: groundOf(ground), alignItems: 'center', justifyContent: 'center' }}>
    <Mark size={220} ink={inkOn(ground)} dot={ground === 'accent' ? C.paper : C.accent} />
  </AbsoluteFill>
);

/** An X header (1500 x 500): the lockup centred; the avatar covers the bottom-left, so nothing lives there. */
export const BrandHeader: React.FC<{ ground: Ground }> = ({ ground }) => (
  <FontGate>
    <AbsoluteFill style={{ background: groundOf(ground) }}>
      <Lockup nameSize={120} ink={inkOn(ground)} cx={750} cy={230} />
    </AbsoluteFill>
  </FontGate>
);

// ---- Real marks: the kit's logo parts on paper and on ink (npx remotion still KitLogos; KitLogoWall --props='{"frame":40}') ----
/** The marks to show: given ones, else every mark the film fetched (src/logos.ts). */
const marksOf = (logos?: LogoRef[]) => (logos && logos.length ? logos : Object.keys(LOGOS));

/** Every logo part at film size on a light and a dark stage: tiles, chips, wordmarks and an inline mark in a line (`frame`: a mark every 30 f, frame 33 is mid-roll); `zoom` pushes in on the top left (the marks must hold under a camera push). */
export const LogoSheet: React.FC<{ logos?: LogoRef[]; zoom?: number; frame?: number }> = ({ logos, zoom = 1, frame = 0 }) => {
  const marks = marksOf(logos).slice(0, 10);
  const paper = kitTheme('tintedPaper', C.accent);
  const ink = kitTheme('inkStage', C.accent);
  const line = TYPE.line.size * U;
  return (
    <FontGate>
      <AbsoluteFill style={{ background: paper.ground, transformOrigin: '0 0', transform: `scale(${zoom})` }}>
        {([paper, ink] as const).map((t, half) => (
          <div key={half} style={{ position: 'absolute', left: 0, top: half * 540 * U, width: 1920 * U, height: 540 * U, background: t.ground, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 44 * U, padding: `0 ${96 * U}px`, boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', gap: 34 * U, alignItems: 'center' }}>
              {marks.map((m, i) => <AppIcon key={i} logo={m} size={132 * U} theme={t} tone={half === 1 && i % 2 ? 'dark' : 'light'} />)}
            </div>
            <div style={{ display: 'flex', gap: 22 * U, alignItems: 'center', flexWrap: 'nowrap' }}>
              {marks.slice(0, 5).map((m, i) => <LogoChip key={i} theme={t} logo={m} h={76 * U} id={`sheet-chip-${half}-${i}`} tile={i === 4} />)}
            </div>
            <div style={{ display: 'flex', gap: 64 * U, alignItems: 'center' }}>
              <span data-text={`sheet-line-${half}`} style={{ ...typeStyle('line', line), color: t.text }}>
                {'Works with '}<InlineLogo logos={marks} size={line} frame={frame} ground={half ? 'dark' : 'light'} />{' and more'}
              </span>
              {marks.slice(0, 3).map((m, i) => <BrandLogo key={i} logo={m} kind="wordmark" h={58 * U} ground={half ? 'dark' : 'light'} />)}
            </div>
          </div>
        ))}
      </AbsoluteFill>
    </FontGate>
  );
};

/** A wall of marks at one frame of its arrival (frame 0 = the first tile's start), round a clear centre. */
export const LogoWallStill: React.FC<{ logos?: LogoRef[]; frame?: number; ground?: 'light' | 'dark'; ring?: boolean }> = ({ logos, frame = 120, ground = 'light', ring = false }) => {
  const t = kitTheme(ground === 'dark' ? 'inkStage' : 'tintedPaper', C.accent);
  const marks = marksOf(logos);
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      {ring ? <LogoRing logos={marks} frame={frame} theme={t} /> : <LogoWall logos={marks} frame={frame} theme={t} clear={{ w: 760 * U, h: 300 * U }} />}
    </AbsoluteFill>
  );
};
