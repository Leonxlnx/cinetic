import React from 'react';
import { ACT } from '../timeline';
import { Stage } from './World';

// END CARD - the brand's mark as a solid, close up and turning, pulls back and lands exactly on the flat mark; the name
// slides out of it (beside it, or under it) and the version lands after the name on the last bar line (the track's final
// hit). Centred, held still through the tail.
export const EndCard: React.FC = () => <Stage from={ACT.end.from} />;
