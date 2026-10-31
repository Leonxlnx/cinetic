import React from 'react';
import { ACT } from '../timeline';
import { World } from './World';

// HOOK - the product's name and the version, centred: by the dealt hook the version's changed numerals roll on a drum
// from the old release to the new one once the name is read, the version rises out of a mask in its place beside the
// name, or a dot lands beside the name and grows into the pill that carries the version; the pair is centred from the
// first frame and steps back out of focus as the first change arrives.
export const Hook: React.FC = () => <World from={ACT.hook.from} />;
