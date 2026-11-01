// The world a shot stands in, shared with the light parts (fx/light): its resolved colours and key light, the frame,
// and its ground as drawn now, so glass can frost exactly what is behind it. <World> provides it; useWorld() reads it
// (null outside a world: the light parts then fall back to a black field and frost nothing).
import type React from 'react';
import { createContext, useContext } from 'react';
import type { WorldSpec } from './worlds';

export type WorldCtx = {
  spec: WorldSpec;
  frame: number; // the world's local frame
  /**
   * The world's ground as drawn at this frame (full frame, the world's own camera move applied). `soft`: its blurred
   * copy where one exists; `bare`: the plate or field alone, without the haze and the vignette (what glass frosts).
   */
  ground: (o?: { soft?: boolean; bare?: boolean }) => React.ReactNode;
  hasSoft: boolean; // a pre-blurred copy of the plate exists, so glass need not blur its own copy
};

export const WorldContext = createContext<WorldCtx | null>(null);

/** The enclosing world (null outside one). */
export const useWorld = (): WorldCtx | null => useContext(WorldContext);
