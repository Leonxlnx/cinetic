import React from 'react';
import { changeAct } from '../timeline';
import { Stage } from './World';

// CHANGE i - one change, filmed by its hero shot (src/deal.ts HEROES: a press, a typed request, a stack, a fan, a ring of
// pictures, a picture developing, a figure in glass, a page, a before and an after, the products it works with) and said
// in one short centred line: over the shot gone soft (show), alone before it (lead), or parted round its porthole (split).
export const Change: React.FC<{ i: number }> = ({ i }) => <Stage from={changeAct(i).from} />;
