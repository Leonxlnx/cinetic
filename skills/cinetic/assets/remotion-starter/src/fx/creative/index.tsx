// The creative elements: eighteen finished devices that each carry a whole beat of a film (references/catalogue.md §0).
// meta.ts lists them as data (the deal and deck.py read it); here each id meets its component and its recipe, and two
// switches draw any of them: <CreativePicture> (a picture beat around the product's scene) and <CreativeLine> (a line).
import React from 'react';
import type { Box, LineProps, PictureProps, Recipe } from './core';
import { BubbleSwarm, RECIPE as R_SWARM } from './BubbleSwarm';
import { ColourFlood, RECIPE as R_FLOOD } from './ColourFlood';
import { CursorFollow, RECIPE as R_CURSOR } from './CursorFollow';
import { type Count, DataSculpture, RECIPE as R_DATA } from './DataSculpture';
import { DotButton, RECIPE as R_DOT } from './DotButton';
import { LetterSwing, RECIPE as R_LETTER } from './LetterSwing';
import { LogoOrbit, RECIPE as R_ORBIT } from './LogoOrbit';
import { CREATIVE_META, type CreativeId, metaOf } from './meta';
import { ObjectTurn, RECIPE as R_TURN } from './ObjectTurn';
import { PhotoArc, RECIPE as R_ARC } from './PhotoArc';
import { PixelAssemble, RECIPE as R_PIXEL } from './PixelAssemble';
import { RECIPE as R_SCALE, ScaleContrast } from './ScaleContrast';
import { RECIPE as R_MORPH, ShapeMorph } from './ShapeMorph';
import { RECIPE as R_AROUND, SplitAround } from './SplitAround';
import { RECIPE as R_SPLIT, SplitCompare } from './SplitCompare';
import { RECIPE as R_OBJECT, TypeObject } from './TypeObject';
import { RECIPE as R_WINDOW, TypeWindow } from './TypeWindow';
import { RECIPE as R_SWAP, WordSwap } from './WordSwap';
import { RECIPE as R_WALL, ZoomWall } from './ZoomWall';

export { CREATIVE_META, CREATIVE_IDS, lineResolve, metaOf, type CreativeId, type CreativeMeta } from './meta';
export type { Box, LineProps, Pal, PictureProps, SceneAt, Word } from './core';
export type { Count } from './DataSculpture';

/** Every device's recipe and house parameters, by id (the catalogue quotes them; the test reads them). */
export const RECIPES: Record<CreativeId, Recipe> = {
  'word-swap': R_SWAP,
  'scale-contrast': R_SCALE,
  'type-window': R_WINDOW,
  'type-object': R_OBJECT,
  'letter-swing': R_LETTER,
  'split-around': R_AROUND,
  'pixel-assemble': R_PIXEL,
  'shape-morph': R_MORPH,
  'object-turn': R_TURN,
  'logo-orbit': R_ORBIT,
  'split-compare': R_SPLIT,
  'data-sculpture': R_DATA,
  'colour-flood': R_FLOOD,
  'zoom-wall': R_WALL,
  'photo-arc': R_ARC,
  'cursor-follow': R_CURSOR,
  'bubble-swarm': R_SWARM,
  'dot-button': R_DOT,
};

/** What a picture device may take from the script beside the product's scene (launch.ts pair fields), plus the
 * product's button (its box in scene px: dot-button grows into it, cursor-follow clicks it) and any device's house
 * numbers to override (`params`, by name: its RECIPE lists them). */
export type PictureData = { logos?: string[]; before?: string[]; count?: Count; photos?: string[]; word?: string; label?: string; button?: Box; params?: Record<string, number> };

/** A picture device by id. An id that is not a picture device draws the scene as it is. */
export const CreativePicture: React.FC<PictureProps & { id: string; data?: PictureData }> = ({ id, data = {}, ...q }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = { ...q, ...(data.params ? { params: data.params as any } : {}) };
  switch (id) {
    case 'pixel-assemble':
      return <PixelAssemble {...p} />;
    case 'shape-morph':
      return <ShapeMorph {...p} />;
    case 'object-turn':
      return <ObjectTurn {...p} />;
    case 'logo-orbit':
      return <LogoOrbit {...p} logos={data.logos ?? []} />;
    case 'split-compare':
      return <SplitCompare {...p} before={data.before ?? []} />;
    case 'data-sculpture':
      return <DataSculpture {...p} count={data.count ?? { to: 0 }} />;
    case 'colour-flood':
      return <ColourFlood {...p} word={data.word} />;
    case 'zoom-wall':
      return <ZoomWall {...p} />;
    case 'photo-arc':
      return <PhotoArc {...p} photos={data.photos} />;
    case 'dot-button':
      return <DotButton {...p} label={data.label} button={data.button} />;
    case 'cursor-follow':
      return <CursorFollow {...p} button={data.button} />;
    case 'bubble-swarm':
      return <BubbleSwarm {...p} before={data.before ?? []} />;
    default:
      return <>{p.scene(p.f)}</>;
  }
};

/** A line device by id (`cut`: the frame its picture begins, for the devices that hand over; `swap`: word-swap's
 * alternatives). Null for an id that is not a line device. */
export const CreativeLine: React.FC<LineProps & { cid: string; cut: number; swap?: string[] }> = ({ cid, cut, swap = [], ...p }) => {
  switch (cid) {
    case 'word-swap':
      return <WordSwap {...p} swap={swap} />;
    case 'scale-contrast':
      return <ScaleContrast {...p} />;
    case 'type-window':
      return <TypeWindow {...p} cut={cut} />;
    case 'type-object':
      return <TypeObject {...p} />;
    case 'split-around':
      return <SplitAround {...p} />;
    case 'letter-swing':
      return <LetterSwing {...p} />;
    default:
      return null;
  }
};

/** Whether an id is a device of this role. */
export const isRole = (id: string, role: 'line' | 'picture') => metaOf(id)?.role === role;
/** The ids of one role, in the library's order. */
export const idsOf = (role: 'line' | 'picture') => CREATIVE_META.filter((m) => m.role === role).map((m) => m.id);
