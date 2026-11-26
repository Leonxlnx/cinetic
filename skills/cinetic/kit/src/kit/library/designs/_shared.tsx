// Shared by the design presets: the Design token type every preset is (a named look a film spreads into its own
// tokens: palette, grounds, type scale and weights, radii, shadow recipe, stroke, texture) and DesignSwatch, the card
// the designs reel shows each preset on. A preset is a piece: `export const Quiet: Design = { ... }` in designs/Quiet.ts
// with its catalogue entry; DesignSwatch is a part (no catalogue entry).
import React from 'react';
import { fonts } from '../../fonts';

/** A named look as tokens. Every colour is a CSS colour; sizes are px at 1920 x 1080. */
export type Design = {
  name: string;
  palette: { ground: string; surface: string; ink: string; muted: string; accent: string; accentInk: string; line: string };
  /** The grounds the look uses, in order of use (flat colours or a picture's role). */
  grounds: string[];
  type: {
    /** CSS font family (from fonts.ts). */
    font: string;
    /** Statement, heading, body and label sizes. */
    scale: { statement: number; heading: number; body: number; label: number };
    weights: { statement: number; heading: number; body: number };
    tracking?: string;
  };
  radii: { small: number; card: number; window: number };
  /** The shadow recipe: softShadow's level for a resting card and a hero object. */
  shadow: { card: number; hero: number };
  stroke: { width: number; color: string };
  /** A texture family, or none: 'none' | 'grain' | 'dots' | 'grid' | 'paper'. */
  texture: 'none' | 'grain' | 'dots' | 'grid' | 'paper';
};

/** A preset at a glance: its ground, a card in its surface, its type scale in its ink, its palette as chips. */
export const DesignSwatch: React.FC<{ design: Design; w?: number }> = ({ design: d, w = 1280 }) => {
  const p = d.palette;
  const h = w * 0.56;
  return (
    <div style={{ width: w, height: h, background: p.ground, borderRadius: d.radii.window, position: 'relative', overflow: 'hidden', fontFamily: d.type.font || fonts.inter, color: p.ink }}>
      <div style={{ position: 'absolute', left: w * 0.06, top: h * 0.12, fontSize: d.type.scale.statement * (w / 1920), fontWeight: d.type.weights.statement, letterSpacing: d.type.tracking, lineHeight: 1.05 }}>{d.name}</div>
      <div style={{ position: 'absolute', left: w * 0.06, bottom: h * 0.12, width: w * 0.42, padding: w * 0.025, boxSizing: 'border-box', background: p.surface, borderRadius: d.radii.card, border: `${d.stroke.width}px solid ${d.stroke.color}` }}>
        <div style={{ fontSize: d.type.scale.heading * (w / 1920), fontWeight: d.type.weights.heading }}>Heading</div>
        <div style={{ fontSize: d.type.scale.body * (w / 1920), fontWeight: d.type.weights.body, color: p.muted, marginTop: 8 }}>Body text in the look</div>
        <div style={{ display: 'inline-block', marginTop: 16, padding: '8px 18px', borderRadius: d.radii.small, background: p.accent, color: p.accentInk, fontSize: d.type.scale.label * (w / 1920), fontWeight: 600 }}>Action</div>
      </div>
      <div style={{ position: 'absolute', right: w * 0.06, bottom: h * 0.12, display: 'flex', gap: 12 }}>
        {[p.ground, p.surface, p.ink, p.muted, p.accent, p.line].map((c, i) => (
          <div key={i} style={{ width: w * 0.045, height: w * 0.045, borderRadius: d.radii.small, background: c, boxShadow: `inset 0 0 0 1px ${p.line}` }} />
        ))}
      </div>
    </div>
  );
};
