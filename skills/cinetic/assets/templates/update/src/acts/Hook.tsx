import React from 'react';
import { ACT } from '../timeline';
import { Stage } from './World';

// HOOK - the product's name and the version, centred, in the film's world: by the dealt hook the version's changed
// numerals roll on a drum from the old release to the new one once the name is read, the version rises out of a mask in
// its place beside the name, or a dot lands beside the name and grows into the pill that carries the version; the pair
// is centred from the first frame and recedes out of focus as the first change's shot arrives.
export const Hook: React.FC = () => <Stage from={ACT.hook.from} />;
