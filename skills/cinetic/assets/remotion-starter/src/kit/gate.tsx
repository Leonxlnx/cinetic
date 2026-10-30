// The kit's content gate: a kit part shows the film's own content or nothing. A part given no content of the film's own
// (no world, no data, no rows, no label) draws an empty state, never the kit's sample products, and reports it:
//   kitEmpty    warns once per part in dev and records it in kitEmpties() (scripts/precheck.mjs lists them); under the
//               ship gate (CINETIC_GATE=ship, or REMOTION_CINETIC_GATE=ship for a render) it throws, so a film with an
//               empty kit part never ships
//   KitEmpty    the empty state: the part's box on a quiet dashed rim, no string, no number, no chart, no person,
//               marked data-kit-empty="<Part>" and data-kit-need="<prop>" for the layout audit and lint ("kit-empty")
// Sample content stays behind one explicit door, sample() in kit/sample.ts, for the kit's own gallery and tests.
import React from 'react';
import { mixColor } from '../lib/color';
import { gateMode } from '../lib/continuity';
import { type KitTheme, kitTheme } from './theme';

/** One kit part that rendered without the film's content: the part and the prop it needs. */
export type KitEmptyIssue = { part: string; need: string; message: string };

const KEY = '__cineticKitEmpty';
/** The kit parts that rendered empty in this process so far (one entry per part and prop). */
export const kitEmpties = (): KitEmptyIssue[] => {
  const g = globalThis as unknown as Record<string, KitEmptyIssue[] | undefined>;
  return (g[KEY] ??= []);
};

/**
 * Report a kit part with no content of the film's own: a warning once in dev (recorded in kitEmpties()), an error under
 * the ship gate. `need` names what to pass ("world: filmWorld({...})", "data", "nodes").
 */
export const kitEmpty = (part: string, need: string): void => {
  const message = `kit-empty: ${part} has no content of the film's own (pass ${need}); it draws an empty state, never sample data. sample() is for the kit's gallery and tests only.`;
  if (gateMode() === 'ship') throw new Error(message);
  const list = kitEmpties();
  if (list.some((x) => x.part === part && x.need === need)) return;
  list.push({ part, need, message });
  console.warn(`warn ${message}`);
};

/**
 * Report a call to sample() (the kit's gallery and tests only): a warning once in dev (recorded in kitEmpties() as part
 * 'sample()', which scripts/precheck.mjs fails as kit-sample when a film module calls it at load), an error under the
 * ship gate, so a film that shows the kit's sample products, people, rows or files never ships, however it imports them.
 */
export const kitSampleUsed = (): void => {
  const message = "kit-sample: sample() is the kit's gallery and tests only (its sample products, people, rows and files); a film shows its own content: filmWorld({ ... }), a panel's data, a tile's own lines.";
  if (gateMode() === 'ship') throw new Error(message);
  const list = kitEmpties();
  if (list.some((x) => x.part === 'sample()')) return;
  list.push({ part: 'sample()', need: "the film's own content", message });
  console.warn(`warn ${message}`);
};

/**
 * The empty state of a kit part: its box (w x h, at x, y; `inline` keeps it in the flow) as a quiet surface on a dashed
 * rim, with nothing in it. It calls kitEmpty(part, need) as it draws.
 */
export const KitEmpty: React.FC<{ part: string; need: string; theme?: KitTheme; w: number; h: number; x?: number; y?: number; r?: number; inline?: boolean; style?: React.CSSProperties }> = ({
  part,
  need,
  theme,
  w,
  h,
  x = 0,
  y = 0,
  r,
  inline,
  style,
}) => {
  kitEmpty(part, need);
  const t = theme ?? kitTheme();
  const rim = Math.max(1.5, Math.min(w, h) * 0.006);
  return (
    <div
      data-ui
      data-kit-empty={part}
      data-kit-need={need}
      style={{
        position: inline ? 'relative' : 'absolute',
        left: inline ? undefined : 0,
        top: inline ? undefined : 0,
        transform: inline ? undefined : `translate(${x}px, ${y}px)`,
        width: w,
        height: h,
        borderRadius: r ?? Math.min(w, h) * 0.06,
        background: mixColor(t.surface, t.ground, 0.35),
        border: `${rim.toFixed(2)}px dashed ${mixColor(t.line, t.mute, 0.45)}`,
        boxSizing: 'border-box',
        flex: 'none',
        ...style,
      }}
    />
  );
};
