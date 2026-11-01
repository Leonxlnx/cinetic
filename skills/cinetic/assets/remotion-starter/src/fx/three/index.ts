// fx/three: 3D hero objects on three.js (@react-three/fiber through @remotion/three), each one component with a few
// props, a pure function of the frame, lit by the film's world light (light.ts) and rendered like a film camera (motion
// blur, depth of field, clean edges: stage.tsx). Without hardware WebGL every part draws its clean 2D fallback.
// Recipes and costs: references/three.md.
export { Logo3D, FlatMark, logo3DEnd, logoPose, LOGO3D, RECIPE as LOGO3D_RECIPE } from './Logo3D';
export type { Logo3DProps, Lockup } from './Logo3D';
export { GlassTiles, makeTile, tilePlaces, tileGlass, TILES, RECIPE as TILES_RECIPE } from './GlassTiles';
export type { GlassTilesProps, TileMove, TileLayout, TilePlace } from './GlassTiles';
export { GlassDome, domePose, domeTilePlaces, laptopSolid, DOME, RECIPE as DOME_RECIPE } from './GlassDome';
export type { GlassDomeProps, DomeMove, DomeInside } from './GlassDome';
export { HeroObject, heroSolid, heroPose, HERO, RECIPE as HERO_RECIPE } from './HeroObject';
export type { HeroObjectProps, HeroKind, HeroMove } from './HeroObject';
export { markSolid, markShapes, slabGeometry, roundedRect, thinGlass, FINISH } from './geo';
export type { Finish, MarkSolid } from './geo';
export { Stage3D, useSampler, useStageCamera, useTextures, filmLit, planeDistance, FOV } from './stage';
export type { Lens, Applier, Backdrop } from './stage';
export { STAGES, lightOf, dirOf } from './light';
export type { Light3D, LightStage } from './light';
export { glTier, draws3D } from './gl';
export type { GlTier, GlMode } from './gl';
