import React from 'react';
import { ACT } from '../timeline';
import { World } from './World';

// END CARD - the version recedes into the set and slides right to make room; the mark's parts and the name
// are set before it, lower left. The film's own device makes the lockup: no centred mark, name and tagline
// over a radial plate.
export const EndCard: React.FC = () => <World from={ACT.end.from} />;
