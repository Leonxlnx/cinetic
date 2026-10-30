// The logo, parsed into parts for LogoMark, AssembledMark and Lockup. scripts/brand.py writes this file from
// a supplied SVG logo (or records a raster one); until then it is the starter's own mark, which keeps its
// cinetic:placeholder marker in brand/Mark.tsx.
import { type Logo, logoParts, SAMPLE_MARK_SVG } from './Mark';

export const LOGO_SVG = SAMPLE_MARK_SVG;
export const LOGO = logoParts(LOGO_SVG, { split: 'ids' });
export const LOGO_PARTS = ['A', 'B', 'D'];
export const WORDMARK_SVG: string | null = null;
export const WORDMARK: Logo | null = null;
export const LOGO_RASTER: string | null = null;
