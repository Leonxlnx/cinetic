// Forms: which of the spine's element forms (lib/spine.ts: word, pill, chip, button, card, page, window, list, notice,
// thread, photo, count, world, mark) a screen can draw, and where each is on any frame. Every screen exports a map of its
// parts (part -> [form, focus box]) and a function that turns its props into those parts' box functions, read from the
// layout function it already has, so a form's box is always where the screen draws it:
//
//   const forms = promptBarForms(props, { pt, fps });     // { pill, send, caret, word, ... }
//   forms.send.form                                       // 'button'
//   forms.send.box(f)                                     // { x, y, w, h, r } in the screen's own px at frame f
//   placeForms(forms, x, y, k).pill.box(f)                // the same, the screen drawn at (x, y) scaled by k
//   formOf(forms, 'button')                               // the first part that draws a button
//
// A handover (lib/handover.ts) takes a side's box from here, placed in its scene and put through its scene's camera.
// Pure: no React, no clock.
import type { Form } from '../../lib/spine';
import { type FocusBox, SCREEN, type ScreenLayout } from './base';

/** A form's box in a screen's px: its rect and corner radius. */
export type FormBox = { x: number; y: number; w: number; h: number; r: number };
/** One part of a screen as a form: which form it draws, the focus box that draws it, its box at frame f. */
export type ScreenForm = { form: Form; focus: string; box: (f: number) => FormBox };
export type ScreenForms = Record<string, ScreenForm>;
/** A screen's parts: part name -> [the form it draws, its focus box's name]. */
export type FormMap = Record<string, readonly [Form, string]>;

/** The corner a form gets when its focus box gives none: round for small controls, the panel radius for surfaces (points x pt). */
export const formRadius = (form: Form, b: { w: number; h: number }, pt: number = SCREEN.pt): number => {
  const half = Math.min(b.w, b.h) / 2;
  const R = SCREEN.radius;
  const r = ({ word: half, pill: half, chip: half, button: half, count: half, mark: 0.22 * Math.min(b.w, b.h), card: R.panel * pt, page: R.panel * pt, window: R.panel * pt, thread: R.panel * pt, list: R.card * pt, notice: R.card * pt, photo: R.thumb * pt, world: 0 } as Record<Form, number>)[form];
  return Math.max(0, Math.min(half, r));
};

const toForm = (b: FocusBox | undefined, form: Form, pt: number): FormBox =>
  b ? { x: b.x, y: b.y, w: b.w, h: b.h, r: Math.min(b.r ?? formRadius(form, b, pt), Math.min(b.w, b.h) / 2) } : { x: 0, y: 0, w: 0, h: 0, r: 0 };

/**
 * A screen's forms from its layout function and its part map. A part is kept when its focus box exists on frame
 * `probe` (house 0: a model chip only when the bar has a model, a figure only when the page has one); its box is read
 * from the layout on every frame asked (a caret while it types, the newest notification).
 */
export const screenForms = (layout: (f: number) => ScreenLayout, map: FormMap, o: { pt?: number; probe?: number } = {}): ScreenForms => {
  const pt = o.pt ?? SCREEN.pt;
  const first = layout(o.probe ?? 0).focus;
  const out: ScreenForms = {};
  for (const [part, [form, focus]] of Object.entries(map)) {
    if (!first[focus]) continue;
    out[part] = { form, focus, box: (f: number) => toForm(layout(f).focus[focus], form, pt) };
  }
  return out;
};

/** A screen's forms placed in its parent: drawn at (x, y) and scaled by k about its top-left (placeFocus for forms). */
export const placeForms = (forms: ScreenForms, x: number, y: number, k = 1): ScreenForms =>
  Object.fromEntries(
    Object.entries(forms).map(([part, s]) => [
      part,
      {
        ...s,
        box: (f: number) => {
          const b = s.box(f);
          return { x: x + b.x * k, y: y + b.y * k, w: b.w * k, h: b.h * k, r: b.r * k };
        },
      },
    ]),
  );

/** The first part that draws `form` (in the map's order), or null. */
export const formOf = (forms: ScreenForms, form: Form): ScreenForm | null => Object.values(forms).find((s) => s.form === form) ?? null;
/** Every form a screen's parts draw, without repeats. */
export const formsDrawn = (map: FormMap): Form[] => [...new Set(Object.values(map).map(([form]) => form))];
