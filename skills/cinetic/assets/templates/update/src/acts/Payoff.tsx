import React from 'react';
import { ACT } from '../timeline';
import { World } from './World';

// PAYOFF - the camera pulls back over every change at once (softened into a far plane) while the version
// swings back in front and lands on the beat: the release, whole.
export const Payoff: React.FC = () => <World from={ACT.payoff.from} />;
