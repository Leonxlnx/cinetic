import React from 'react';
import { changeAct } from '../timeline';
import { World } from './World';

// CHANGE i - one change on its own beat shape (src/deal.ts SHAPES): the product's card shows it working for 1-3.5 s
// (a tap and its new state, a list that fills, a before -> after, a count that rises) and one short sentence says the
// result, before it, after it on the colour field, or with it under the card; never over the sharp card.
export const Change: React.FC<{ i: number }> = ({ i }) => <World from={changeAct(i).from} />;
