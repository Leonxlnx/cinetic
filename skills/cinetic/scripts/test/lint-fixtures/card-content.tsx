// Fixture for scripts/test/lint-film.test.mjs. expect: card-content=3
// A card with no content (self-closing), an empty card and a bento tile with no content are empty slabs; a card
// with built UI, one with a picture, one blank on purpose and tiles with content or a picture are fine.
import React from 'react';
import { Bento, Card } from './Cards';

const BOX = { x: 120, y: 200, w: 900, h: 560, r: 60 };
const SMALL = { x: 0, y: 0, w: 300, h: 200, r: 30 };

export const Bad: React.FC<{ f: number }> = ({ f }) => (
  <>
    <Card frame={f} box={BOX} />
    <Card frame={f} box={BOX} enter={{ start: 10 }}></Card>
    <Bento frame={f} start={20} tiles={[{ A: SMALL, B: BOX }]} />
  </>
);

export const Good: React.FC<{ f: number; shot: string }> = ({ f, shot }) => (
  <>
    <Card frame={f} box={BOX}>
      <span data-text="total">48 of 48 approved</span>
    </Card>
    <Card frame={f} box={BOX} image={{ src: shot }} />
    <Card frame={f} box={BOX} blank />
    <Bento frame={f} start={20} tiles={[{ A: SMALL, B: BOX, content: <span data-text="t">Q3</span> }, { A: SMALL, B: BOX, image: { src: shot } }]} />
  </>
);
