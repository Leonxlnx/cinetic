import React from 'react';
import { typeStyle } from '../brand/tokens';

export const Act1: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0 }}>
    <span data-text="set" style={{ ...typeStyle('giant'), opacity: 0.08, position: 'absolute', left: -200, top: 80 }}>
      beat
    </span>
  </div>
);
