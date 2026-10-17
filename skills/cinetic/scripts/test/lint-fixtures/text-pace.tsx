// Fixture for scripts/test/lint-film.test.mjs. expect: text-pace:warn=3
// In a calm film (lint-fixtures/timeline.ts) the crisp tempo on Words and MaskRise warns; the
// pace's defaults, calm numbers and an explicit pace={PACE.crisp} do not.
import React from 'react';
import { PACE } from './anim';
import { f60, LINE } from './timeline';
import { MaskRise, Words } from './Words';

export const A: React.FC<{ f: number }> = ({ f }) => (
  <>
    <Words text={LINE} frame={f} start={0} stagger={6} />
    <MaskRise text={LINE} frame={f} start={0} dur={f60(20)} outDur={14} />
    <Words text={LINE} frame={f} start={0} stagger={11} dur={36} />
    <Words text={LINE} frame={f} start={0} stagger={6} pace={PACE.crisp} />
    <Words text={LINE} frame={f} start={0} />
  </>
);
