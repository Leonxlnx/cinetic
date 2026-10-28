import React from 'react';
import { ACT } from '../timeline';
import { World } from './World';

// PAYOFF - by the dealt payoff: the camera pulls back over every change at once (softened into a far plane) while
// the version swings back in front and lands on the beat; or the last change recedes out of focus and the version
// rises out of a mask in front of it: the release, whole.
export const Payoff: React.FC = () => <World from={ACT.payoff.from} />;
