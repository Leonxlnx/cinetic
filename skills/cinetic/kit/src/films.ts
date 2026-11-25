// The films in this project. Each registers as its own composition (and is reachable by the Sheet).
import type React from 'react';
import { BriefFilm, briefDuration } from './films/brief/Film';
import { ForgeFilm, forgeDuration } from './films/forge/Film';
import { FieldnoteFilm, fieldnoteDuration } from './films/fieldnote/Film';
import { LumenFilm, lumenDuration } from './films/lumen/Film';
import { InkwellFilm, inkwellDuration } from './films/inkwell/Film';
import { ReelType, reelTypeDuration } from './films/library/ReelType';
import { ReelTurns, reelTurnsDuration } from './films/library/ReelTurns';
import { ReelUi, reelUiDuration } from './films/library/ReelUi';
import { ReelHosts, reelHostsDuration } from './films/library/ReelHosts';

export const FILMS: Record<string, { component: React.FC; duration: number; fps: number; width?: number; height?: number }> = {
  brief: { component: BriefFilm, duration: briefDuration, fps: 30 },
  forge: { component: ForgeFilm, duration: forgeDuration, fps: 30 },
  fieldnote: { component: FieldnoteFilm, duration: fieldnoteDuration, fps: 30 },
  lumen: { component: LumenFilm, duration: lumenDuration, fps: 30 },
  inkwell: { component: InkwellFilm, duration: inkwellDuration, fps: 30 },
  // the motion library's reels: every library piece, named, one after another
  'library-type': { component: ReelType, duration: reelTypeDuration, fps: 30 },
  'library-turns': { component: ReelTurns, duration: reelTurnsDuration, fps: 30 },
  'library-ui': { component: ReelUi, duration: reelUiDuration, fps: 30 },
  'library-hosts': { component: ReelHosts, duration: reelHostsDuration, fps: 30 },
};
