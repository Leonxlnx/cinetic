import React from 'react';
import { ACT } from '../timeline';
import { World } from './World';

// END CARD - by the dealt end: the version steps back, smaller and quieter, above the lockup while the mark's parts
// and the name are set centred under it; or the version settles at the name's size after it, one centred lockup.
// The film's own device makes the lockup (never one faded in from nowhere over a radial plate). It holds about a
// second and a half with the tail.
export const EndCard: React.FC = () => <World from={ACT.end.from} />;
