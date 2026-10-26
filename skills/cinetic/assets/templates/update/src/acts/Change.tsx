import React from 'react';
import { changeAct } from '../timeline';
import { World } from './World';

// CHANGE i - one product moment: the camera arrives on the change's surface (it bleeds past the frame), the
// product does the new thing on beat 2 (its contact frame), and one short sentence (3-6 words) says what was
// just seen; the words launch left into the next move. Never a list, a changelog row or a bullet.
export const Change: React.FC<{ i: number }> = ({ i }) => <World from={changeAct(i).from} />;
