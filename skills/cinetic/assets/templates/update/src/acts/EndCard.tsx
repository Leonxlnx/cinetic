import React from 'react';
import { ACT } from '../timeline';
import { World } from './World';

// END CARD - built from the last element: the recap's cards gather (stack or fold, dealt) and shrink into the mark; the
// name slides out of the mark and the version lands after it, apart from it, on the last bar line (the track's final
// hit). Centred, held still through the tail.
export const EndCard: React.FC = () => <World from={ACT.end.from} />;
