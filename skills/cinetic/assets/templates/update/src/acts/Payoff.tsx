import React from 'react';
import { ACT } from '../timeline';
import { World } from './World';

// RECAP - the carried card shrinks into its place in a row while the other changes' cards join it (sliding out from
// behind it, or rising into place: src/deal.ts recap): every change
// at once, each in a few words (its title and the state it ends in), readable for at least a second before the fold.
export const Payoff: React.FC = () => <World from={ACT.payoff.from} />;
