// The films in this project. Each registers as its own composition (and is reachable by the Sheet).
import type React from 'react';
import { BriefFilm, briefDuration } from './films/brief/Film';
import { ForgeFilm, forgeDuration } from './films/forge/Film';
import { FieldnoteFilm, fieldnoteDuration } from './films/fieldnote/Film';
import { LumenFilm, lumenDuration } from './films/lumen/Film';
import { InkwellFilm, inkwellDuration } from './films/inkwell/Film';

export const FILMS: Record<string, { component: React.FC; duration: number; fps: number }> = {
  brief: { component: BriefFilm, duration: briefDuration, fps: 30 },
  forge: { component: ForgeFilm, duration: forgeDuration, fps: 30 },
  fieldnote: { component: FieldnoteFilm, duration: fieldnoteDuration, fps: 30 },
  lumen: { component: LumenFilm, duration: lumenDuration, fps: 30 },
  inkwell: { component: InkwellFilm, duration: inkwellDuration, fps: 30 },
};
