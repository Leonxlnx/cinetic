// PromptAnswer (ui, build): a prompt typed and sent, the text travels to its bubble, an answer card grows out of the
// composer word by word.
// Numbers: typing at 17 characters a second; press 12 f after the last key; text to bubble 16 f; card grows 16 f;
// words every 2 f.
// Caution: the prompt fits the composer on one line; two or three lines of answer.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, mix, springAt, springs } from '../../motion';
import { mixColor, typingTimes, useTextWidth } from '../../type';
import { bez, Caret, InkTyped, InkWords, inkWordsEnd, type Look, MarkSlot, Paced, surfaceStyle, useUiFrame, withPace } from './_shared';
import { Pointer, pressOf } from './Pointer';

/**
 * A prompt sent and answered. A two-row composer (the typed text in fresh ink with a caret; below it a "+" disc, a
 * tools pill, a model pill, a microphone and a send disc that lights once there is text). The prompt is typed at a
 * believable pace, never in a burst; a pointer arcs in from the lower right while the last words land, decelerates onto
 * send and presses (pointer 0.84, the disc swells 1.14, a soft ring). The text then travels out of the composer into its
 * own bubble above (a neutral fill: no colour change), and the answer card grows out of the composer's top edge (16 f):
 * a header with the assistant's mark and a shimmering status, the answer word by word, then a result row (a file with
 * its size and two actions) rises in, and the status settles to the time it took. Frames relative to `at`. The composer
 * sits with its centre at (x, y).
 */
const PromptAnswerInner: React.FC<{
  L: Look;
  prompt: string;
  answer: string;
  status?: string;
  doneStatus?: string;
  at: number;
  cps?: number;
  x?: number;
  y?: number;
  w?: number;
  size?: number;
  placeholder?: string;
  pressDelay?: number;
  /** The assistant's name and its real logo. */
  name?: string;
  mark?: React.ReactNode;
  model?: string;
  /** The result row under the answer (a file); null for none. */
  result?: { title: string; sub: string; icon?: string } | null;
  speed?: number;
}> = ({
  L,
  prompt,
  answer,
  status = 'Thinking',
  doneStatus = 'Done in 2.4 s',
  at: start,
  cps = 17,
  x: xIn,
  y = 860,
  w = 1300,
  size = 34,
  placeholder = 'Ask anything',
  pressDelay = 12,
  name = 'Assistant',
  mark,
  model = 'Fast',
  result = { title: 'Launch note.md', sub: '142 words · edited just now', icon: 'FileText' },
  speed = 1,
}) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const frame = start + (useUiFrame() - start) * speed;
  const { fps } = useVideoConfig();
  const s = size;
  const times = typingTimes(prompt, start + 8, fps, cps, 5);
  const typedEnd = times[times.length - 1] ?? start;
  const press = typedEnd + pressDelay;
  const shown = times.filter((k) => frame >= k).length;
  const h = s * 5;
  const disc = s * 1.7;
  const pad = s * 0.75;
  const sendX = x + w / 2 - pad - disc / 2;
  const sendY = y + h / 2 - pad - disc / 2;
  const pr = pressOf(frame, [press]);
  const lit = shown > 0;
  const send = at(frame, press + 2, 16, bez(0.3, 0, 0.1, 1));
  const grow = at(frame, press + 10, 16, bez(0.2, 0.8, 0.2, 1));
  const thinkEnd = press + 34;
  const ansStart = thinkEnd + 2;
  const ansEnd = inkWordsEnd(answer, ansStart, 2);
  const res = at(frame, ansEnd + 2, 12, bez(0.2, 0.8, 0.2, 1));
  const done = at(frame, ansEnd + 8, 8, ease.out);
  const enter = springAt(frame, fps, start - 10, springs.ui);
  const lineH = s * 1.45;
  const cardPad = s * 1.1;
  const headH = s * 2.4;
  const answerW = useTextWidth(answer, { fontFamily: L.font, fontSize: s, letterSpacing: '-0.006em' });
  const ansLines = Math.max(1, Math.ceil((answerW * 1.08) / (w - cardPad * 2)));
  const resH = result ? s * 3.6 + s * 0.9 : 0;
  const cardH = cardPad * 2 + headH + ansLines * lineH + resH;
  const cardTop = y - h / 2 - s * 0.5 - cardH * grow;
  const bubbleY = y - h / 2 - s * 0.5 - cardH - s * 3.3;
  const shimmer = ((frame - press) * 12) % 900;
  const tw = useTextWidth(prompt, { fontFamily: L.font, fontSize: s, letterSpacing: '-0.01em' });
  const textX = x - w / 2 + pad + s * 0.2;
  const textY = y - h / 2 + pad;
  const bubX = x + w / 2 - tw - s * 0.9 * 2;
  return (
    <Paced start={start} speed={speed}>
      <div style={{ position: 'absolute', inset: 0, fontFamily: L.font, opacity: clamp(enter * 2) }}>
        {/* the sent message: the same text travels from the composer into its bubble */}
        {send > 0 && (
          <div style={{ position: 'absolute', left: mix(send, textX - s * 0.9, bubX), top: mix(send, textY - s * 0.55, bubbleY), padding: `${s * 0.55}px ${s * 0.9}px`, borderRadius: s * 1.1, background: L.dark ? `rgba(255,255,255,${0.08 * send})` : `rgba(17,19,24,${0.055 * send})`, color: L.ink, fontSize: s, lineHeight: 1.3, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{prompt}</div>
        )}
        {/* the answer card grows out of the composer */}
        {grow > 0 && (
          <div style={{ ...surfaceStyle(L, 3, s * 0.95), position: 'absolute', left: x - w / 2, top: cardTop, width: w, height: cardH * grow, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: cardPad, right: cardPad, top: cardPad, opacity: clamp(grow * 1.5 - 0.3) }}>
              <div style={{ height: headH - s * 0.5, display: 'flex', alignItems: 'center', gap: s * 0.5, marginBottom: s * 0.5 }}>
                <MarkSlot mark={mark} icon="MessageSquareText" colors={['#FF9A5C', '#EC5A2A']} size={s * 1.3} />
                <span style={{ fontSize: s * 0.92, fontWeight: 620, color: L.ink }}>{name}</span>
                <span style={{ fontSize: s * 0.86, color: L.faint }}>·</span>
                <span style={{ position: 'relative', fontSize: s * 0.86, whiteSpace: 'nowrap' }}>
                  <span style={{ opacity: 1 - done, backgroundImage: `linear-gradient(90deg, ${L.faint} ${shimmer - 120}px, ${L.ink} ${shimmer - 40}px, ${L.faint} ${shimmer + 40}px)`, WebkitBackgroundClip: 'text', color: 'transparent' }}>{status}</span>
                  <span style={{ position: 'absolute', left: 0, top: 0, color: L.faint, opacity: done }}>{doneStatus}</span>
                </span>
              </div>
              <div style={{ fontSize: s, lineHeight: 1.45, color: L.ink, letterSpacing: '-0.006em', minHeight: ansLines * lineH }}>{frame >= ansStart && <InkWords text={answer} start={ansStart} every={2} color={L.ink} born={L.accent} />}</div>
              {result && (
                <div style={{ marginTop: s * 0.9, height: s * 3.6, borderRadius: s * 0.6, border: `1px solid ${L.line}`, background: L.dark ? 'rgba(255,255,255,0.03)' : '#FAFAFB', display: 'flex', alignItems: 'center', gap: s * 0.6, padding: `0 ${s * 0.6}px`, boxSizing: 'border-box', opacity: res, transform: `translateY(${mix(res, 16, 0)}px)` }}>
                  <div style={{ width: s * 2.2, height: s * 2.2, borderRadius: s * 0.45, background: mixColor(L.surface, L.accent, 0.12), color: L.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={result.icon ?? 'FileText'} size={s * 1.1} stroke={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: s * 0.92, fontWeight: 600, color: L.ink, whiteSpace: 'nowrap' }}>{result.title}</div>
                    <div style={{ fontSize: s * 0.8, color: L.muted, whiteSpace: 'nowrap', marginTop: s * 0.08 }}>{result.sub}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.35, height: s * 1.8, padding: `0 ${s * 0.7}px`, borderRadius: s * 0.45, border: `1px solid ${L.dark ? 'rgba(255,255,255,0.12)' : 'rgba(17,19,24,0.12)'}`, fontSize: s * 0.82, fontWeight: 600, color: L.ink, whiteSpace: 'nowrap' }}>
                    <Icon name="Copy" size={s * 0.82} stroke={2.2} />
                    Copy
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.35, height: s * 1.8, padding: `0 ${s * 0.75}px`, borderRadius: s * 0.45, background: L.ink, fontSize: s * 0.82, fontWeight: 600, color: L.dark ? '#111318' : '#FFFFFF', whiteSpace: 'nowrap' }}>
                    <Icon name="CornerDownLeft" size={s * 0.82} stroke={2.2} />
                    Insert
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* the composer */}
        <div style={{ ...surfaceStyle(L, 5, s * 1.05), position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `translateY(${mix(enter, 40, 0)}px)` }}>
          <div style={{ position: 'absolute', left: pad + s * 0.2, right: pad, top: pad, height: s * 1.4, display: 'flex', alignItems: 'center', fontSize: s, whiteSpace: 'nowrap', overflow: 'hidden', letterSpacing: '-0.01em' }}>
            <span style={{ whiteSpace: 'pre' }}>
              {send <= 0 && (shown > 0 ? <InkTyped text={prompt} times={times} color={L.ink} born={L.accent} cool={6} /> : <span style={{ color: L.faint }}>{placeholder}</span>)}
              {send <= 0 && <Caret color={L.accent} height={s * 1.15} typing={frame < typedEnd + 2} since={typedEnd} hidden={frame < start + 4} />}
              {send > 0 && <span style={{ color: L.faint, opacity: send }}>{placeholder}</span>}
            </span>
          </div>
          <div style={{ position: 'absolute', left: pad, right: pad, bottom: pad, height: disc, display: 'flex', alignItems: 'center', gap: s * 0.45 }}>
            <div style={{ width: disc, height: disc, borderRadius: disc, border: `1.5px solid ${L.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: L.muted, boxSizing: 'border-box' }}>
              <Icon name="Plus" size={s * 0.85} stroke={2} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.35, height: disc, padding: `0 ${s * 0.65}px`, borderRadius: disc, border: `1.5px solid ${L.line}`, boxSizing: 'border-box', color: L.muted, fontSize: s * 0.8, fontWeight: 560, whiteSpace: 'nowrap' }}>
              <Icon name="SlidersHorizontal" size={s * 0.78} stroke={2} />
              Tools
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.25, padding: `0 ${s * 0.4}px`, color: L.muted, fontSize: s * 0.8, fontWeight: 560, whiteSpace: 'nowrap' }}>
              {model}
              <Icon name="ChevronDown" size={s * 0.75} stroke={2.2} />
            </div>
            <div style={{ width: disc, height: disc, display: 'flex', alignItems: 'center', justifyContent: 'center', color: L.muted }}>
              <Icon name="Mic" size={s * 0.88} stroke={2} />
            </div>
            <div style={{ width: disc, height: disc, borderRadius: disc, flexShrink: 0, background: lit && send < 1 ? mixColor(L.accent, '#FFFFFF', pr * 0.15) : L.fill, color: lit && send < 1 ? L.accentInk : L.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + pr * 0.14})`, boxShadow: lit && send < 1 ? `0 ${s * 0.2}px ${s * 0.6}px -${s * 0.2}px ${L.accent}` : undefined }}>
              <Icon name="ArrowUp" size={s * 0.85} stroke={2.4} />
            </div>
          </div>
        </div>
        <Pointer
          start={typedEnd - 24}
          keys={[
            { f: typedEnd - 24, x: sendX + 360, y: sendY + 300 },
            { f: press - 4, x: sendX + 4, y: sendY + 6 },
          ]}
          clicks={[press]}
          exitAt={press + 20}
          ring={mixColor(L.accent, '#FFFFFF', 0.4)}
          size={s * 2}
        />
      </div>
    </Paced>
  );
};

export const PromptAnswer = withPace(PromptAnswerInner);
