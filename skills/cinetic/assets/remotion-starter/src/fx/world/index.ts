// Worlds: the place a film stands in (one per film, dealt), each with its key light; photographic and footage plates;
// reveals that open the world out of a shape that means something. The light parts (fx/light) read the world.
export { useWorld, WorldContext, type WorldCtx } from './context';
export { depthBlur, isVideo, Plate, PLATE_DEPTH, plateMove, type PlateDepth, type PlateMove, type PlateMoves, type PlateProps, WORLD_PATH, worldPath } from './Plate';
export { circlePoints, Reveal, REVEAL, revealState, scallopPoints, sparklePath, sparklePoints, type RevealProps, type RevealShape } from './Reveal';
export { stepsFromPlan, turnColorOf, WORLD_STEP, worldStep, worldStepDeclares, worldStepMoves, WorldSteps, type StepAt, type WorldStepState } from './Step';
export { fieldUrl, SURFACE_CELL, surfacePixels, World, type WorldProps } from './World';
export * from './worlds';
