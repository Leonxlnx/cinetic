import React from 'react';
import { ACT } from '../timeline';
import { World } from './World';

// HOOK - the name over the version, which is the set: giant numerals cropped by the frame, the camera already creeping; the last
// numeral rolls from the old value to the new one on beat 2 and the version is read in the quiet. On the act
// line the camera is at its fastest, carrying into the first change.
export const Hook: React.FC = () => <World from={ACT.hook.from} />;
