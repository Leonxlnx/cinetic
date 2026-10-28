import React from 'react';
import { changeAct } from '../timeline';
import { World } from './World';

// CHANGE i - one product moment: the camera arrives on the change's surface (lit and tilted in the film's light,
// bleeding past the right edge), the product does the new thing on beat 2 (its contact frame), and one short
// sentence (2-6 words) says what was just seen, on its dealt move, in the band the surface leaves clear; it leaves
// at speed before the next move. Never a list, a changelog row or a bullet.
export const Change: React.FC<{ i: number }> = ({ i }) => <World from={changeAct(i).from} />;
