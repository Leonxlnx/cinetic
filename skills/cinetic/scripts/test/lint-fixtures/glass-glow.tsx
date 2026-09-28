// Fixture. expect: glass=2 glow=5
// (a ${C.accent} glow resolves through the tokens file; the starter test covers that case)
import React from 'react';
const C = { accent: '#1F86CD', ink: '#0D0E10' };
export const G: React.FC<{ g: number }> = ({ g }) => (
  <>
    <div style={{ backdropFilter: 'blur(20px)' }} />
    <div style={{ WebkitBackdropFilter: 'blur(12px)' }} />
    <div style={{ backdropFilter: 'none' }} />
    <div style={{ boxShadow: `0 0 40px ${C.accent}` }} />
    <div style={{ boxShadow: '0 0 40px #1F86CD' }} />
    <div style={{ textShadow: '0 0 12px rgba(255,255,255,.8)' }}>Lit.</div>
    <div style={{ filter: 'drop-shadow(0 0 16px #1F86CD)' }} />
    <div style={{ boxShadow: `0 8px ${g}px rgba(31,134,205,.4)` }} />
    <div style={{ background: 'radial-gradient(circle, rgba(31,134,205,.5), transparent 70%)' }} />
    <div style={{ boxShadow: '0 28px 90px rgba(0,0,0,.16), 0 1px 2px rgba(0,0,0,.06)' }} />
    <div style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.10)' }} />
    <div style={{ boxShadow: `0 0 0 2px ${C.ink}` }} />
    <div style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.28))' }} />
  </>
);
