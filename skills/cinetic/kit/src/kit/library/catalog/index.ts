// The whole catalogue: every category's entries (catalog/<category>.ts), merged. Nothing to edit here.
import type { LibraryEntry } from './types';
import { TYPE } from './type';
import { TURN } from './turn';
import { FX } from './fx';
import { CAMERA } from './camera';
import { UI } from './ui';
import { HOST } from './host';
import { OBJECT } from './object';
import { GROUND } from './ground';
import { DESIGN } from './design';

export type { Category, LibraryEntry, Mood, Purpose, Subject } from './types';
export const LIBRARY: LibraryEntry[] = [...TYPE, ...TURN, ...FX, ...CAMERA, ...UI, ...HOST, ...OBJECT, ...GROUND, ...DESIGN];
