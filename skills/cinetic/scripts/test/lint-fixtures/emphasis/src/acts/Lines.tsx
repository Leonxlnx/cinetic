import React from 'react';
import { TypeLine } from '../fx/TypePresets';
import { copy } from '../timeline';

export const Lines: React.FC<{ F: number }> = ({ F }) => (
  <>
    <TypeLine spec={{ preset: 'mask', text: copy('a').text, at: 0, emph: 'marker' }} frame={F} />
    <TypeLine spec={{ preset: 'mask', text: copy('b').text, at: 60, emph: 'weight' }} frame={F} />
    <TypeLine spec={{ preset: 'mask', text: copy('c').text, at: 120, emph: 'box' }} frame={F} />
    <TypeLine spec={{ preset: 'mask', text: copy('d').text, at: 180, emph: 'accent' }} frame={F} />
  </>
);
