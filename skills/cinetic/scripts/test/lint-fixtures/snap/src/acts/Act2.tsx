// Fixture: a second snap device in the same film (declared too).
import React from 'react';
import { SnapZoom } from '../fx/SnapZoom';
import { holdDrift } from '../lib/continuity';

export const Act2: React.FC<{ F: number; children: React.ReactNode }> = ({ F, children }) => (
  <div style={{ transform: `translate3d(${holdDrift(F, 0).x}px, 0, 0)` }}>
    <SnapZoom frame={F} at={200}>{children}</SnapZoom>
  </div>
);
