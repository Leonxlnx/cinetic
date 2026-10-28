import React from 'react';
import { ACT } from '../timeline';
import { World } from './World';

// HOOK - the name over the version, which is the set: giant numerals cropped by the frame, the set drifting; by the
// dealt hook the old version's last numeral rolls to the new one once the name is read, or the new version rises
// whole out of a mask under the name. On the act line the camera is at its fastest, whipping into the first change.
export const Hook: React.FC = () => <World from={ACT.hook.from} />;
