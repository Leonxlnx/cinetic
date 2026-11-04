// Fixture primitive that reads the starter's timeline constants instead of the film context.
import type { Declares } from '../timeline';
import { COPY, FPS } from '../timeline';
export const clockState = (f: number) => ({ s: f / FPS, n: COPY.length });
export const declares = (): Declares => ({});
