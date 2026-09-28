// Fixture. expect: banned-color=3
import React from 'react';
export const Named: React.FC = () => (
  <svg>
    <rect fill="orange" width={10} height={10} />
    <rect style={{ background: 'lavender', color: 'gold' }} width={10} height={10} />
    <rect fill="teal" stroke="white" width={10} height={10} />
  </svg>
);
