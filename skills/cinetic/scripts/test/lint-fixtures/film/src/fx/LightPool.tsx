// cinetic:light a one-hue pool of stage light that wanders over the ground
import React from 'react';
export const LightPool: React.FC<{ x: number }> = ({ x }) => (
  <div style={{ transform: `translateX(${x}px)`, background: 'radial-gradient(circle, rgba(8,150,90,.5), transparent 70%)' }} />
);
