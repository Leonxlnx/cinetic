// Fixture: a line snap that nothing declares, with a drift under it.
import React from 'react';
import { LineSnap } from '../fx/LineSnap';
import { holdDrift } from '../lib/continuity';

export const Act1: React.FC<{ F: number; held: string; word: string }> = ({ F, held, word }) => (
  <div style={{ transform: `translate3d(${holdDrift(F, 0).x}px, 0, 0)` }}>
    <LineSnap frame={F} held={held} word={word} mode="room" />
  </div>
);
