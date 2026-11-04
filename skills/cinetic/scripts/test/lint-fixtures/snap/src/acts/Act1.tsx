// Fixture: the film's declared hard list, with a drift under it.
import React from 'react';
import { HardStep } from '../fx/HardStep';
import { holdDrift } from '../lib/continuity';

export const Act1: React.FC<{ F: number; rows: React.ReactNode }> = ({ F, rows }) => (
  <div style={{ transform: `translate3d(${holdDrift(F, 0).x}px, 0, 0)` }}>
    <HardStep frame={F} jump={96} start={30} every={20} count={4} width={800} height={400}>{rows}</HardStep>
  </div>
);
