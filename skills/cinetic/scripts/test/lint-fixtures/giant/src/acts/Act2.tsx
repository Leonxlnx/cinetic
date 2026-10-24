import React from 'react';
import { typeStyle } from '../brand/tokens';

export const Act2: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0 }}>
    <span data-text="set2" style={{ ...typeStyle('giant'), position: 'absolute', left: -300, top: -120 }}>
      live
    </span>
  </div>
);
