// Fixture. expect: tight-tracking:warn=2
// Tracking so tight the letters touch (an r and an n read as an m): -0.08em on a name and -0.06em in CSS warn; giant
// type at -0.05em and a line at -0.02em are silent.
import React from 'react';
export const Name: React.FC = () => (
  <>
    <div style={{ fontSize: 160, letterSpacing: '-0.08em' }}>Cairnly</div>
    <div style={{ fontSize: 400, letterSpacing: '-0.05em' }}>Fern</div>
    <div style={{ fontSize: 72, letterSpacing: '-0.02em' }}>Plans that hold.</div>
    <style>{'.name { letter-spacing: -0.06em; }'}</style>
  </>
);
