// The motion library: finished animations to take whole and adapt, in nine categories (a folder each): type, turns,
// fx (finishing effects), camera (camera moves), ui (product UI), hosts (host screens), objects (objects and logos),
// grounds and designs (design presets). Every piece is deterministic by frame and takes its content, colours and
// timing as props; catalog/ lists them all (find one with `node scripts/frames.mjs library`). See references/library.md.
export { PixelFilter, SmearFilter, SplitFilter } from './_shared';
export * from './type';
export * from './turns';
export * from './fx';
export * from './camera';
export * from './ui';
export * from './hosts';
export * from './objects';
export * from './grounds';
export * from './designs';
