// The tween registry: in audit mode every tween that goes through tw()/prog() (lib/anim.ts) is
// recorded with its curve's token and family, and the layout audit (lib/Audit.tsx) logs the tweens
// of each audited frame as one `CINETIC_TWEENS {...}` line. scripts/grammar-score.mjs reads those
// lines for its curve-role, duration and overlap dimensions; dimensions it can also measure on the
// rendered frames use the render instead.
//
// Audit mode is mandatory for the registry: it is on whenever the composition was rendered with the
// prop {audit: true} (scripts/layout-audit.sh passes it) or an <Audit> is mounted, and off otherwise,
// so a normal render pays nothing. Recording never changes what is drawn. Node-safe.
import { getInputProps } from 'remotion';

export type TweenRecord = {
  frame: number; // the frame the tween was evaluated at, in the caller's own frames (local or absolute)
  from: number; // the tween's span, in the same frames
  to: number;
  token: string; // the curve's token name ('snapOut', 'M.rise', ...) or '' for an untagged function
  family: string; // 'arrive' | 'reposition' | 'leave' | 'linear', or '' when untagged
};

const CAP = 4096; // records kept per frame before the oldest are dropped (a runaway loop never grows memory)
let forced: boolean | null = null;
let fromProps: boolean | null = null;
const list: TweenRecord[] = [];

const propsSayAudit = (): boolean => {
  if (fromProps !== null) return fromProps;
  try {
    fromProps = typeof window !== 'undefined' && (getInputProps() as { audit?: unknown })?.audit === true;
  } catch {
    fromProps = false;
  }
  return fromProps;
};

/** True while tweens are being recorded. */
export const auditing = (): boolean => forced ?? propsSayAudit();

/** Turn recording on or off explicitly (the Audit component turns it on; tests use it); null returns to the props. */
export const setAuditing = (on: boolean | null) => {
  forced = on;
  list.length = 0;
};

/** Record one tween evaluation (a no-op unless auditing). */
export const record = (r: TweenRecord) => {
  if (!auditing()) return;
  if (list.length >= CAP) list.shift();
  list.push(r);
};

/** Every record since the last drain, deduplicated (same span and curve at the same frame), and clear. */
export const drain = (): TweenRecord[] => {
  const seen = new Set<string>();
  const out: TweenRecord[] = [];
  for (const r of list.splice(0)) {
    const k = `${r.frame}|${r.from}|${r.to}|${r.token}|${r.family}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
    }
  }
  return out;
};
