// LightStreak (type, enter / exit): a caption born from a horizontal streak of light the width of the word: thin
// streak lines, then the word doubled and smeared sideways, then sharp; it leaves by the reverse (a ghost to the left,
// a smeared band, the streak, gone). Stepped, like a picture tube settling.
// Numbers: in: a dim streak 3 f (3 lines 0.025 em thick, 0.06 em apart, smeared 0.3 em, fading to both ends), a bright
// streak 1 f, the word smeared 0.18 em and doubled 0.05 em lower for 3 f, sharp from 7 f; out: a ghost 0.3 em left at
// 30 % with the word at 55 % for 2 f, the smeared word 2 f, the bright streak 1 f, the dim streak 3 f, gone after 8 f.
// Caution: on dark grounds and footage; on paper the streak reads as a smudge.
// Catalogue: ../catalog/type.ts; props and recipe: references/library-type.md.
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../../fonts';
import { useTextLayout } from '../../type';
import { SmearFilter, useUid } from '../_shared';
import { WideSmear } from './_shared';

/** The streak fades out toward both ends, like a scan line. */
const TAPER = 'linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%)';

/**
 * LightStreak: from `at` the caption grows out of a streak of light (8 frames) and holds; from `leaveAt` it dies back
 * into the streak (8 frames) and is gone. `glow` tints the streak (a warm or a cool light).
 */
export const LightStreak: React.FC<{
  text: string;
  at?: number;
  leaveAt?: number;
  size?: number;
  color?: string;
  glow?: string;
  x?: number;
  y?: number;
  font?: string;
  weight?: number;
}> = ({ text, at = 0, leaveAt, size = 64, color = '#F4F4F2', glow = '#CFE3FF', x, y, font = fonts.inter, weight = 500 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const idA = useUid('streakA');
  const idB = useUid('streakB');
  const style = { fontFamily: font, fontWeight: weight, fontSize: size, letterSpacing: '-0.015em', lineHeight: 1.2 } as const;
  const L = useTextLayout(text, style);
  if (!L.ready || frame < at) return null;
  // the state: 0..7 entering, 8 sharp, then leaving 0..7 counted from leaveAt
  const inAge = frame - at;
  const outAge = leaveAt === undefined ? -1 : frame - leaveAt;
  if (outAge >= 8) return null;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const W = L.width;
  const midY = L.words[0]?.xMid ?? L.height / 2;
  const left = cx - W / 2;
  const top = cy - L.height / 2;
  const word = (dx: number, dy: number, o: number, smear: boolean, key: string) => (
    <span key={key} style={{ ...style, position: 'absolute', left: dx, top: dy, whiteSpace: 'pre', color, opacity: o, filter: smear ? `url(#${idB})` : undefined }}>
      {text}
    </span>
  );
  const streak = (o: number, k: number) => (
    <div key={`s${k}`} style={{ position: 'absolute', left: -size * 0.1, top: midY - size * 0.08, width: W + size * 0.2, height: size * 0.16, filter: `url(#${idA})`, opacity: o, WebkitMaskImage: TAPER, maskImage: TAPER }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * size * 0.06, height: Math.max(1, size * 0.025), background: i === 1 ? '#FFFFFF' : glow }} />
      ))}
    </div>
  );
  let body: React.ReactNode;
  // one state a frame: the entry counts up, the exit counts the same states down
  const s = outAge >= 0 ? 7 - outAge : inAge;
  if (s < 0) body = null;
  else if (outAge >= 0 && outAge < 2) body = [word(-size * 0.3, 0, 0.3, false, 'g'), word(0, 0, 0.55, false, 'a')];
  else if (s < 3) body = streak(0.4, 0);
  else if (s < 4) body = streak(1, 0);
  else if (s < 7) body = [word(0, 0, 0.85, true, 'a'), word(0, size * 0.05, 0.45, true, 'b')];
  else body = word(0, 0, 1, false, 'a');
  return (
    <div style={{ position: 'absolute', left, top, width: W, height: L.height }}>
      <SmearFilter id={idA} x={size * 0.3} />
      <WideSmear id={idB} x={size * 0.18} />
      {body}
    </div>
  );
};
