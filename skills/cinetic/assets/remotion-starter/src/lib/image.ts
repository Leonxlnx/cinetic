// A supplied picture as content, and its slow zoom: pure and Node-safe, shared by fx/Cards (a card's picture)
// and fx/Develop (a print developing in), so a film that keeps one of them needs neither the other nor kit/.
import { clamp, mix } from './anim';

/**
 * A supplied picture as a card's content (a screenshot, a product shot, a photo): `src` from staticFile()
 * or a URL. `fit` cover fills the box and crops; `focus` (0..1 each way) is the point kept in view and the
 * centre of `zoom` (1 = the whole cover crop, 1.6 = a tighter crop of the same focus). `zoomTo` with
 * `zoomStart`/`zoomDur` pushes in slowly inside the card (a camera move over the image).
 */
export type CardImage = {
  src: string;
  fit?: 'cover' | 'contain';
  focus?: { x: number; y: number };
  zoom?: number;
  zoomTo?: number;
  zoomStart?: number;
  zoomDur?: number;
  background?: string;
};

/** The zoom an image shows at frame f (a slow linear push when zoomTo is set). */
export const imageZoom = (f: number, im: CardImage, fps: number): number => {
  const z0 = im.zoom ?? 1;
  if (im.zoomTo === undefined) return z0;
  const t = clamp((f - (im.zoomStart ?? 0)) / Math.max(1e-6, im.zoomDur ?? 4 * fps));
  return Math.exp(mix(Math.log(z0), Math.log(im.zoomTo), t));
};
