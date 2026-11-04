/**
 * MovesGallery: a proof sheet of fx/Moves (the signature moves at their measured numbers), one panel per part, each
 * firing on its own frame so a contact sheet shows every arrival, its tail and its landing.
 *   npx remotion studio src/gallery/index.ts          (or render: remotion render src/gallery/index.ts MovesGallery)
 * It is a test bench, never a film: the panels sit in a grid with their names left out (no text but the parts' own).
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT } from '../brand/tokens';
import { FontGate } from '../lib/FontGate';
import { BuildLine, ClickBloom, FromLens, GlyphSweep, Land, Pop, Press, RimStreak, SelectRing, Tail, WhipCut } from '../fx/Moves';

export const GALLERY = { fps: 30, width: 1920, height: 1080, frames: 120 } as const;

const ACCENT = C.accent;
const panel = (x: number, y: number, w = 600, h = 330): React.CSSProperties => ({ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', borderRadius: 18 });
const card = (w: number, h: number, fill: string = C.paper): React.CSSProperties => ({ width: w, height: h, borderRadius: 16, background: fill, boxShadow: '0 12px 40px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)' });

/** A panel with its own local stage (children positioned inside it). */
const Panel: React.FC<{ x: number; y: number; dark?: boolean; children: React.ReactNode }> = ({ x, y, dark, children }) => (
  <div style={{ ...panel(x, y), background: dark ? C.ink : C.mist }}>
    <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
  </div>
);

export const MovesGallery: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <FontGate>
      <AbsoluteFill style={{ background: C.paper, fontFamily: FONT.text }}>
        {/* row 1: the line build across the top (re-centre snap, rise, arrival tint) */}
        <div style={{ ...panel(60, 40, 1800, 300), background: C.mist }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: 'translate(-60px, -400px)' }}>
            <BuildLine frame={f} words={['Every', 'change', 'lands', 'on', 'the', 'beat.']} at={6} every={7} size={96} family={FONT.text} weight={650} tracking={-0.02} color={C.ink} accent={ACCENT} keep={2} />
          </div>
        </div>
        {/* row 2 */}
        <Panel x={60} y={370}>
          <div style={{ position: 'absolute', left: 230, top: 95 }}>
            <Pop frame={f} at={10}><div style={{ width: 140, height: 140, borderRadius: 70, background: ACCENT }} /></Pop>
          </div>
        </Panel>
        <Panel x={660} y={370}>
          <div style={{ position: 'absolute', left: 120, top: 70 }}>
            <Land frame={f} at={14} scale={1.17} offset={{ x: 80 }}><div style={card(360, 190)}><div style={{ margin: 28, height: 22, width: 220, borderRadius: 11, background: C.line }} /><div style={{ margin: '0 28px', height: 22, width: 160, borderRadius: 11, background: C.mist }} /></div></Land>
          </div>
        </Panel>
        <Panel x={1260} y={370}>
          <div style={{ position: 'absolute', left: 150, top: 60 }}>
            <FromLens frame={f} at={18}><div style={{ ...card(300, 210), background: C.accent }} /></FromLens>
          </div>
        </Panel>
        {/* row 3 */}
        <Panel x={60} y={720} dark>
          <WhipCut frame={f} cut={40} dir="left" peak={140}
            a={<div style={{ position: 'absolute', left: 160, top: 100, ...card(280, 130, C.ink2) }} />}
            b={<div style={{ position: 'absolute', left: 160, top: 100, ...card(280, 130, ACCENT) }} />} />
        </Panel>
        <Panel x={660} y={720}>
          <div style={{ position: 'absolute', left: 180, top: 120 }}>
            <Press frame={f} at={30} kind="button"><div style={{ width: 240, height: 84, borderRadius: 42, background: f >= 30 ? ACCENT : C.ink }} /></Press>
          </div>
          <ClickBloom frame={f} at={30} x={300} y={162} color={C.accent} />
          <SelectRing frame={f} at={52} box={{ x: 180, y: 120, w: 240, h: 84 }} radius={42} color={ACCENT} />
        </Panel>
        <Panel x={1260} y={720} dark>
          <div style={{ position: 'absolute', left: 80, top: 110 }}>
            <Tail frame={f} at={20} angle={0} until={110}>
              <GlyphSweep frame={f} at={56} width={440}>
                <div style={{ fontSize: 92, fontWeight: 700, color: C.mute, letterSpacing: '-0.02em', lineHeight: 1 }}>Ship it</div>
              </GlyphSweep>
            </Tail>
          </div>
          <div style={{ position: 'absolute', left: 60, top: 60, width: 480, height: 210, borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.16)' }} />
          <RimStreak frame={f} at={70} box={{ x: 60, y: 60, w: 480, h: 210 }} />
        </Panel>
      </AbsoluteFill>
    </FontGate>
  );
};
