// Motion library, ui: input and state. A prompt typed, sent and answered (the answer card grows out of the composer); a
// chat exchange in its window (typing dots that become the message, a reply typed and sent from the composer); a button
// that becomes its own progress bar and closes into a check; a toggle, a slider, a selection frame and a settings card
// driven by a pointer; a phone that drops in with weight and pushes into one control.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { accel, at, clamp, ease, logScale, mix, springAt, springs, type Ease } from '../motion';
import { mixColor, typingTimes, useTextWidth } from '../type';
import { Icon } from '../icons';
import { Phone } from '../ui';
import { Caret, Face, InkTyped, InkWords, MarkSlot, Notice, Paced, Pill, Pointer, Presence, bez, inkWordsEnd, pressOf, surfaceStyle, useUiFrame, withPace, type Look, type NoticeData } from './ui-base';

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
  x = 960,
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
                <MarkSlot mark={mark} icon="Sparkles" colors={['#FF9A5C', '#EC5A2A']} size={s * 1.3} />
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

export type ChatMsg = {
  /** The frame (relative to `at`) the message lands in the thread. */
  f: number;
  text: string;
  me?: boolean;
  /** For a received message: frames of "typing" dots before it lands (the dots bubble becomes the message). */
  typing?: number;
};

const ChatBubble: React.FC<{
  L: Look;
  m: ChatMsg;
  f0: number;
  frame: number;
  top: number;
  left: number;
  right: number;
  s: number;
  showFace: boolean;
  person: string;
  personColor?: string;
  composer: { x: number; y: number };
}> = ({ L, m, f0, frame, top, left, right, s, showFace, person, personColor, composer }) => {
  const tw = useTextWidth(m.text, { fontFamily: L.font, fontSize: s, letterSpacing: '-0.005em' });
  const bh = s * 2.3;
  const padX = s * 0.85;
  const fullW = tw + padX * 2;
  const faceS = s * 1.45;
  const recvX = left + faceS + s * 0.5;
  if (m.me) {
    // travels from the composer field into its place at the right, the fill rising to the accent as it goes
    const tr = at(frame, f0, 14, bez(0.3, 0, 0.1, 1));
    const bx = mix(tr, composer.x - padX, right - fullW);
    const by = mix(tr, composer.y - bh / 2, top);
    return (
      <div style={{ position: 'absolute', left: bx, top: by, width: fullW, height: bh, borderRadius: s * 1.15, background: mixColor(L.dark ? L.fill : '#FFFFFF', L.accent, tr), color: mixColor(L.ink, L.accentInk, tr), display: 'flex', alignItems: 'center', padding: `0 ${padX}px`, boxSizing: 'border-box', fontSize: s, whiteSpace: 'nowrap', letterSpacing: '-0.005em', boxShadow: tr > 0.2 ? `0 ${s * 0.15}px ${s * 0.5}px -${s * 0.25}px ${L.accent}` : undefined }}>
        {m.text}
      </div>
    );
  }
  const dotsAt = f0 - (m.typing ?? 0);
  const u = at(frame, dotsAt, 7, bez(0.2, 0.8, 0.2, 1));
  const landed = at(frame, f0, 9, bez(0.3, 0, 0.1, 1));
  const dotsW = s * 3.2;
  const wNow = m.typing ? mix(landed, dotsW, fullW) : fullW;
  const wash = at(frame, f0 + 2, 10, ease.out);
  const ink = at(frame, f0 + 6, 10, ease.out);
  const avatar = springAt(frame, 30, dotsAt + 2, springs.pop);
  const fill = L.dark ? L.fill : '#EEEFF2';
  return (
    <>
      {showFace && (
        <div style={{ position: 'absolute', left, top: top + bh - faceS, transform: `scale(${avatar})`, transformOrigin: '50% 100%' }}>
          <Face name={person} color={personColor} size={faceS} />
        </div>
      )}
      <div style={{ position: 'absolute', left: recvX, top: top + (bh - mix(u, s * 0.6, bh)) / 2, width: wNow, height: mix(u, s * 0.6, bh), borderRadius: s * 1.15, background: fill, filter: u < 1 ? `blur(${mix(u, 7, 0)}px)` : undefined, overflow: 'hidden', fontFamily: L.font, fontSize: s, whiteSpace: 'nowrap', letterSpacing: '-0.005em' }}>
        {m.typing && landed < 1 && (
          <div style={{ position: 'absolute', left: 0, width: dotsW, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: s * 0.28, opacity: 1 - clamp(landed * 2) }}>
            {[0, 1, 2].map((k) => {
              const ph = Math.sin((frame - dotsAt) / 3.2 - k * 0.9);
              return <div key={k} style={{ width: s * 0.4, height: s * 0.4, borderRadius: s, background: L.muted, opacity: 0.55 + 0.45 * Math.max(0, ph), transform: `translateY(${-Math.max(0, ph) * s * 0.16}px)` }} />;
            })}
          </div>
        )}
        {frame >= f0 && (
          <>
            <span style={{ position: 'absolute', left: padX, top: 0, height: bh, display: 'flex', alignItems: 'center', color: L.accent, opacity: 0.4 * (1 - ink), WebkitMaskImage: washMask(wash) }}>{m.text}</span>
            <span style={{ position: 'absolute', left: padX, top: 0, height: bh, display: 'flex', alignItems: 'center', color: L.ink, WebkitMaskImage: washMask(ink) }}>{m.text}</span>
          </>
        )}
      </div>
    </>
  );
};

/**
 * A chat exchange in its window. A panel with a header (the person's avatar with a presence dot, name, "Active now", call
 * icons), a day divider, the thread, and a composer. A received message is announced by a "typing" bubble whose dots
 * bounce; the same bubble then widens into the message (a shared object), its words washing in left to right behind a
 * soft front (a ghost in the accent, then the ink). A sent message is typed into the composer at a believable pace, the
 * send disc lights and presses, and the text travels out of the field into its bubble at the right, its fill rising to
 * the accent on the way; "Read" and the time settle under the last. The thread rises to make room (10 f ease-out).
 * Optionally starts as a macro on the first message and pulls back (`macro` = the start zoom, 22 f, log-space).
 */
const ChatThreadInner: React.FC<{
  L: Look;
  msgs: ChatMsg[];
  at: number;
  person?: string;
  personColor?: string;
  status?: string;
  day?: string;
  read?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  size?: number;
  macro?: number;
  cps?: number;
  /** The messaging app's real logo, shown small beside the header's icons. */
  mark?: React.ReactNode;
  speed?: number;
}> = ({ L, msgs, at: start, person = 'Rosa Diaz', personColor = '#C8692E', status = 'Active now', day = 'Today 9:41', read = 'Read 9:42', x = 960, y = 540, w = 1180, h = 940, size = 36, macro = 1, cps = 15, mark, speed = 1 }) => {
  const frame = start + (useUiFrame() - start) * speed;
  const { fps } = useVideoConfig();
  const s = size;
  const left = x - w / 2;
  const top = y - h / 2;
  const headH = s * 3.4;
  const compH = s * 3.4;
  const pad = s * 1.0;
  const bh = s * 2.3;
  const gap = s * 0.42;
  const enter = springAt(frame, 30, start - 12, springs.ui);
  // the sent messages' typing in the composer
  const typed = msgs.map((m) => {
    if (!m.me) return null;
    const raw = typingTimes(m.text, 0, fps, cps, 7 + m.f);
    const shift = start + m.f - 10 - (raw[raw.length - 1] ?? 0);
    return raw.map((k) => k + shift);
  });
  let compText: { text: string; times: number[]; end: number; sendAt: number } | null = null;
  msgs.forEach((m, i) => {
    const tt = typed[i];
    if (!tt) return;
    const sendAt = start + m.f;
    if (frame >= tt[0] - 4 && frame < sendAt) compText = { text: m.text, times: tt, end: tt[tt.length - 1], sendAt };
  });
  const arrive = (m: ChatMsg) => start + m.f - (m.me ? 0 : m.typing ?? 0);
  const bottom = top + h - compH - pad * 0.6;
  const fieldX = left + pad + s * 1.7 + s * 0.5 + s * 0.8;
  const fieldY = top + h - compH / 2;
  const nodes: React.ReactNode[] = [];
  const lastMe = msgs[msgs.length - 1].me;
  const readP = lastMe ? at(frame, start + msgs[msgs.length - 1].f + 20, 8, ease.out) : 0;
  const readH = readP > 0 ? s * 1.3 * readP : 0;
  msgs.forEach((m, i) => {
    if (frame < arrive(m)) return;
    let lift = readH;
    for (let j = i + 1; j < msgs.length; j++) lift += (bh + gap) * at(frame, arrive(msgs[j]), 10, ease.out);
    const tp = bottom - bh - lift;
    const next = msgs[i + 1];
    const showFace = !m.me && (!next || next.me || frame < arrive(next));
    nodes.push(<ChatBubble key={i} L={L} m={m} f0={start + m.f} frame={frame} top={tp} left={left + pad} right={left + w - pad} s={s} showFace={showFace} person={person} personColor={personColor} composer={{ x: fieldX, y: fieldY }} />);
  });
  // the day divider rides at the top of the thread
  let dl = readH;
  for (let j = 0; j < msgs.length; j++) dl += (bh + gap) * at(frame, arrive(msgs[j]), 10, ease.out);
  const dividerY = bottom - dl - s * 1.6;
  const firstNew = msgs.find((m) => m.f >= 0) ?? msgs[0];
  const firstTop = bottom - bh - s * 0.2;
  const zoom = macro !== 1 ? logScale(macro, 1, at(frame, start + firstNew.f + 10, 22, bez(0.5, 0, 0.1, 1))) : 1;
  void firstTop;
  const ct = compText as { text: string; times: number[]; end: number; sendAt: number } | null;
  const compShown = ct ? ct.times.filter((k) => frame >= k).length : 0;
  const sendPress = ct ? pressOf(frame, [ct.sendAt - 3]) : 0;
  const iconBtn = (name: string) => (
    <div style={{ width: s * 1.9, height: s * 1.9, borderRadius: s, display: 'flex', alignItems: 'center', justifyContent: 'center', color: L.muted }}>
      <Icon name={name} size={s * 0.95} stroke={2} />
    </div>
  );
  return (
    <Paced start={start} speed={speed}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${left + pad + s * 6}px ${bottom - bh / 2}px`, transform: `scale(${zoom})` }}>
        <div style={{ ...surfaceStyle(L, 5, s * 1.1), position: 'absolute', left, top, width: w, height: h, overflow: 'hidden', opacity: clamp(enter * 2), fontFamily: L.font }}>
          {/* header */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: headH, borderBottom: `1px solid ${L.line}`, display: 'flex', alignItems: 'center', gap: s * 0.6, padding: `0 ${pad}px`, boxSizing: 'border-box' }}>
            <Icon name="ChevronLeft" size={s * 1.1} color={L.accent} stroke={2.4} />
            <div style={{ position: 'relative' }}>
              <Face name={person} color={personColor} size={s * 1.9} />
              <Presence L={L} color="#2FA86B" size={s * 1.9} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: s * 0.95, fontWeight: 620, color: L.ink, whiteSpace: 'nowrap' }}>{person}</div>
              <div style={{ fontSize: s * 0.74, color: L.muted, whiteSpace: 'nowrap', marginTop: s * 0.05 }}>{status}</div>
            </div>
            {iconBtn('Phone')}
            {iconBtn('Video')}
            {mark ? <div style={{ marginLeft: s * 0.3, display: 'flex' }}>{mark}</div> : iconBtn('Info')}
          </div>
          {/* composer */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: compH, borderTop: `1px solid ${L.line}`, display: 'flex', alignItems: 'center', gap: s * 0.5, padding: `0 ${pad}px`, boxSizing: 'border-box' }}>
            <div style={{ width: s * 1.7, height: s * 1.7, borderRadius: s, background: L.fill, display: 'flex', alignItems: 'center', justifyContent: 'center', color: L.muted, flexShrink: 0 }}>
              <Icon name="Plus" size={s * 0.85} stroke={2.2} />
            </div>
            <div style={{ flex: 1, height: s * 2.1, borderRadius: s * 1.05, border: `1.5px solid ${L.line}`, display: 'flex', alignItems: 'center', padding: `0 ${s * 0.3}px 0 ${s * 0.8}px`, boxSizing: 'border-box', fontSize: s * 0.95, whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <span style={{ flex: 1 }}>
                {ct && compShown > 0 ? <InkTyped text={ct.text} times={ct.times} color={L.ink} born={L.accent} /> : <span style={{ color: L.faint }}>Message</span>}
                {ct && <Caret color={L.accent} height={s * 1.1} typing={frame < ct.end + 2} since={ct.end} />}
              </span>
              <div style={{ width: s * 1.6, height: s * 1.6, borderRadius: s, background: ct && compShown > 0 ? mixColor(L.accent, '#FFFFFF', sendPress * 0.15) : 'transparent', color: ct && compShown > 0 ? L.accentInk : L.faint, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - sendPress * 0.1})`, flexShrink: 0 }}>
                <Icon name="ArrowUp" size={s * 0.85} stroke={2.4} />
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: headH, bottom: 0, overflow: 'hidden', WebkitMaskImage: `linear-gradient(to bottom, transparent 0, #000 ${s * 1.4}px)` }}>
            <div style={{ position: 'absolute', left: -left, top: -top - headH, width: 1920, height: 1080 }}>
              <div style={{ position: 'absolute', left: left + pad, right: 1920 - left - w + pad, top: dividerY, height: s * 1.2, display: 'flex', alignItems: 'center', gap: s * 0.6, fontSize: s * 0.74, color: L.faint, whiteSpace: 'nowrap' }}>
                <div style={{ flex: 1, height: 1, background: L.line }} />
                {day}
                <div style={{ flex: 1, height: 1, background: L.line }} />
              </div>
              {nodes}
              {readP > 0 && <div style={{ position: 'absolute', left, width: w - pad, top: bottom - readH + s * 0.25, textAlign: 'right', fontSize: s * 0.74, color: L.faint, opacity: readP, whiteSpace: 'nowrap' }}>{read}</div>}
            </div>
          </div>
        </div>
      </div>
    </Paced>
  );
};
export const ChatThread = withPace(ChatThreadInner);
const washMask = (p: number) => `linear-gradient(90deg, #000 ${mix(p, -30, 100)}%, transparent ${mix(p, 0, 130)}%)`;

/**
 * A button that becomes its own progress bar and closes into a check: one object throughout, one hue, always fully lit.
 * The pointer's arrival darkens the whole pill 10 % (`hoverAt`); pressed (dips 4 %, 3 f), the pill widens into a bar
 * (14 f) and a lighter sweep (white at 24 %) runs inside it from the left with small plateaus (the work happens in steps) while the
 * label becomes the live status in white; at 100 % the bar contracts into a disc (12 f), a check draws and the done
 * label slides out beside it. Frames relative to `at`.
 */
const ActionMorphInner: React.FC<{
  L: Look;
  label: string;
  working: string;
  doneLabel: string;
  at: number;
  pressAt?: number;
  /** Frame (relative) the pointer reaches the button: the whole pill darkens 10 % and its shadow grows. */
  hoverAt?: number;
  dur?: number;
  x?: number;
  y?: number;
  w?: number;
  trackW?: number;
  size?: number;
  /** Playback speed: 1 is the measured timing, 2 twice as fast. */
  speed?: number;
}> = ({ L, label, working, doneLabel, at: start, pressAt = 20, hoverAt, dur = 46, x = 960, y = 540, w = 380, trackW = 760, size = 36 , speed = 1 }) => {
  const frame = start + (useUiFrame() - start) * speed;
  const t = frame - start;
  if (t < -12) return null;
  const h = size * 2.7;
  const P = start + pressAt;
  const dip = at(frame, P - 2, 3, ease.out) - at(frame, P + 1, 8, ease.out);
  const widen = at(frame, P + 2, 14, bez(0.3, 0, 0.1, 1));
  const runT = clamp((frame - (P + 6)) / dur);
  // progress with plateaus: a smooth base plus a few small holds
  const prog = clamp(ease.inOut(runT) + 0.04 * Math.sin(runT * 9) * (1 - runT) * runT * 4);
  const fin = P + 6 + dur;
  const shut = at(frame, fin + 4, 12, bez(0.6, 0, 0.2, 1));
  const tick = at(frame, fin + 14, 7, ease.out);
  const doneP = at(frame, fin + 18, 14, bez(0.2, 0.8, 0.2, 1));
  const pop = springAt(frame, 30, fin + 14, springs.pop);
  const width = mix(shut, mix(widen, w, trackW), h);
  const fillFrac = mix(widen, 1, Math.max(prog, 0.04));
  const enter = springAt(frame, 30, start - 12, springs.ui);
  const hv = (hoverAt !== undefined ? at(frame, start + hoverAt, 4, ease.out) : 0) * (1 - widen);
  const pct = Math.round(prog * 100);
  const lab = widen < 0.5 ? label : `${working} ${pct}%`;
  const labOp = widen < 0.5 ? 1 - widen * 2 : clamp(widen * 2 - 1) * (1 - clamp(shut * 3));
  const labelStyle: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: L.font, fontSize: size, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', opacity: labOp };
  const fillW = width * fillFrac;
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: clamp(enter * 2) }}>
      <div style={{ position: 'absolute', left: -width / 2 - doneP * size * 3.2, top: -h / 2, width, height: h, borderRadius: h / 2, overflow: 'hidden', transform: `scale(${(1 - dip * 0.04) * mix(shut, 1, 1) * (shut > 0.99 ? mix(pop, 0.9, 1) : 1)})`, background: mixColor(L.accent, '#000000', hv * 0.1), boxShadow: `0 ${size * mix(hv, 0.35, 0.5)}px ${size * mix(hv, 1, 1.4)}px -${size * 0.4}px ${L.accent}${hv > 0.5 ? '88' : '66'}` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: shut > 0 ? mix(shut, fillW, width) : fillW, borderRadius: h / 2, background: `rgba(255,255,255,${0.24 * widen * (1 - shut)})` }} />
        <div style={{ ...labelStyle, color: L.accentInk }}>{lab}</div>
        {shut > 0.6 && (
          <svg width={h} height={h} viewBox="0 0 24 24" style={{ position: 'absolute', left: width / 2 - h / 2, top: 0 }}>
            <path d="M7.2 12.4 L10.6 15.6 L16.8 9" fill="none" stroke={L.accentInk} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={15} strokeDashoffset={15 * (1 - tick)} />
          </svg>
        )}
      </div>
      {doneP > 0 && (
        <div style={{ position: 'absolute', left: -width / 2 - doneP * size * 3.2 + h + size * 0.6, top: -h / 2, height: h, display: 'flex', alignItems: 'center', fontFamily: L.font, fontSize: size * 1.05, fontWeight: 600, color: L.ink, whiteSpace: 'nowrap', opacity: doneP, transform: `translateX(${mix(doneP, -30, 0)}px)` }}>{doneLabel}</div>
      )}
    </div>
  );
};

export const ActionMorph = withPace(ActionMorphInner);

/**
 * A toggle that switches: the knob travels with a stretch (it widens 30 % mid-way and settles with a small overshoot,
 * 8 f), the track blends from its rest grey to the accent over 6 f, a soft glow in the accent breathes out once.
 */
export const ToggleSwitch: React.FC<{ L: Look; onAt: number; offAt?: number; size?: number; style?: React.CSSProperties }> = ({ L, onAt, offAt, size = 80, style }) => {
  const frame = useUiFrame();
  const curve = bez(0.3, 1.35, 0.45, 1);
  const p = at(frame, onAt, 9, curve) - (offAt !== undefined ? at(frame, offAt, 9, curve) : 0);
  const mid = Math.sin(clamp(p) * Math.PI);
  const W = size * 1.75;
  const g = Math.max(3, size * 0.07);
  const k = size - g * 2;
  const kw = k * (1 + 0.3 * mid);
  const col = clamp(at(frame, onAt, 6, ease.out) - (offAt !== undefined ? at(frame, offAt, 6, ease.out) : 0));
  const glow = at(frame, onAt + 2, 14, ease.out);
  return (
    <div style={{ position: 'relative', width: W, height: size, flexShrink: 0, borderRadius: size, background: mixColor(L.dark ? '#3A3C43' : '#DCDFE4', L.accent, col), boxShadow: `inset 0 1px 2px rgba(0,0,0,0.08), 0 0 ${glow * 40}px ${(1 - glow) * 12}px ${L.accent}${Math.round((1 - glow) * 80).toString(16).padStart(2, '0')}`, ...style }}>
      <div style={{ position: 'absolute', top: g, left: g + p * (W - g * 2 - k) - (kw - k) * clamp(p), width: kw, height: k, borderRadius: k, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.12)' }} />
    </div>
  );
};

/**
 * A slider: the fill and thumb follow `keys` ([{ f, v }], 0..1, eased). While it is dragged (from 3 f before the first
 * key to the last) the thumb swells 10 % and a soft halo in the accent sits under it. `pill` shows the value above the
 * thumb in a dark pill (off when the value is printed beside it).
 */
export const ValueSlider: React.FC<{ L: Look; keys: Array<{ f: number; v: number }>; w?: number; size?: number; format?: (v: number) => string; pill?: boolean; style?: React.CSSProperties }> = ({ L, keys, w = 700, size = 34, format = (v) => `${Math.round(v * 100)}%`, pill = true, style }) => {
  const frame = useUiFrame();
  let v = keys[0].v;
  for (let i = 1; i < keys.length; i++) v = mix(at(frame, keys[i - 1].f, keys[i].f - keys[i - 1].f, bez(0.45, 0, 0.15, 1)), v, keys[i].v);
  const th = size * 1.3;
  const tr = size * 0.32;
  const held = keys.length > 1 ? at(frame, keys[0].f - 3, 4, ease.out) - at(frame, keys[keys.length - 1].f + 1, 6, ease.out) : 0;
  return (
    <div style={{ position: 'relative', width: w, height: th, flexShrink: 0, ...style }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: (th - tr) / 2, height: tr, borderRadius: tr, background: L.dark ? '#33353B' : '#E3E5E9' }} />
      <div style={{ position: 'absolute', left: 0, width: v * w, top: (th - tr) / 2, height: tr, borderRadius: tr, background: L.accent }} />
      <div style={{ position: 'absolute', left: v * w - th, top: -th / 2, width: th * 2, height: th * 2, borderRadius: th * 2, background: L.accent, opacity: held * 0.16 }} />
      <div style={{ position: 'absolute', left: v * w - th / 2, top: 0, width: th, height: th, borderRadius: th, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.14), 0 6px 16px rgba(0,0,0,0.14)', transform: `scale(${1 + held * 0.1})` }} />
      {pill && <div style={{ position: 'absolute', left: v * w, top: -size * 1.9, transform: 'translateX(-50%)', padding: `${size * 0.2}px ${size * 0.5}px`, borderRadius: size, background: L.ink, color: L.dark ? '#111' : '#FFF', fontFamily: L.font, fontSize: size * 0.9, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{format(v)}</div>}
    </div>
  );
};

/**
 * A selection frame dragged open: from `at` a 2 px accent rectangle grows from its top-left corner to its full size
 * (12 f, decelerating, the drag), its four square handles pop on as it lands (2 f apart), and a size tag in the accent
 * rises under it. Place it over the thing it selects (left, top, w, h in the parent).
 */
export const SelectFrame: React.FC<{ L: Look; at: number; left: number; top: number; w: number; h: number; tag?: string; size?: number }> = ({ L, at: a, left, top, w, h, tag, size = 30 }) => {
  const frame = useUiFrame();
  if (frame < a) return null;
  const d = at(frame, a, 12, bez(0.25, 0.1, 0.1, 1));
  const cw = w * d;
  const ch = h * d;
  const hs = size * 0.55;
  const tg = at(frame, a + 12, 8, ease.out);
  const handle = (hx: number, hy: number, k: number) => {
    const q = springAt(frame, 30, a + 9 + k * 2, springs.pop);
    return <div key={k} style={{ position: 'absolute', left: hx - hs / 2, top: hy - hs / 2, width: hs, height: hs, background: '#FFFFFF', border: `2px solid ${L.accent}`, boxSizing: 'border-box', transform: `scale(${q})` }} />;
  };
  return (
    <div style={{ position: 'absolute', left, top, width: cw, height: ch }}>
      <div style={{ position: 'absolute', inset: 0, border: `2px solid ${L.accent}`, background: `${L.accent}0D` }} />
      {[handle(0, 0, 0), handle(cw, 0, 1), handle(cw, ch, 2), handle(0, ch, 3)]}
      {tag && tg > 0 && (
        <div style={{ position: 'absolute', left: cw / 2, top: ch + size * 0.8 + mix(tg, 14, 0), transform: 'translateX(-50%)', padding: `${size * 0.18}px ${size * 0.45}px`, borderRadius: size * 0.3, background: L.accent, color: L.accentInk, fontFamily: L.font, fontSize: size, fontWeight: 600, whiteSpace: 'nowrap', opacity: tg, fontVariantNumeric: 'tabular-nums' }}>{tag}</div>
      )}
    </div>
  );
};

/**
 * A phone that drops in with weight and pushes into one control. The phone falls from above the frame (18 f, a long
 * decelerating landing, tipped back 12 degrees and levelling) onto a lock screen (status icons, the date, the time, a
 * stack of two older notices, the torch and camera buttons, the home bar); a new notice slides down into the screen
 * blurred and settles on top of the stack (8 f); the camera pushes into its reply field (log-space, `pushAt`, 22 f)
 * where a reply is typed at a believable pace and sent (the send disc lights and presses); it pulls back and the phone
 * leaves upward, accelerating (`leaveAt`). Frames relative to `at`. `screen` is the wallpaper: a solid colour or a
 * real picture, never a faint gradient.
 */
const PhoneDropInner: React.FC<{
  L: Look;
  n: NoticeData;
  reply: string;
  at: number;
  /** Older notices under the new one (titles of the stack's lips). */
  older?: NoticeData[];
  date?: string;
  time?: string;
  noticeAt?: number;
  pushAt?: number;
  push?: number;
  backAt?: number;
  leaveAt?: number;
  x?: number;
  y?: number;
  w?: number;
  screen?: string;
  speed?: number;
}> = ({
  L,
  n,
  reply,
  at: start,
  older = [
    { title: 'Calendar', body: 'Design review in 15 minutes', time: '9:30', icon: 'Calendar', colors: ['#FF7A6B', '#E2392E'] },
    { title: 'Bank', body: 'You received $240.00', time: '8:12', icon: 'Landmark', colors: ['#6E7787', '#2F3542'] },
  ],
  date = 'Tuesday, 14 May',
  time = '9:41',
  noticeAt = 20,
  pushAt = 36,
  push = 2.0,
  backAt = 100,
  leaveAt = 122,
  x = 960,
  y = 560,
  w = 500,
  screen = '#1B1D22',
  speed = 1,
}) => {
  const frame = start + (useUiFrame() - start) * speed;
  const { fps } = useVideoConfig();
  const t = frame - start;
  if (t < 0) return null;
  const drop = at(frame, start, 18, bez(0.15, 0.7, 0.1, 1));
  const out = accel(frame, start + leaveAt, 12, 1.45);
  const b = Math.round(w * 0.028);
  const sw = w - b * 2;
  const sh = Math.round(sw * 2.167);
  const ph = sh + b * 2;
  const py = mix(drop, -ph - 200, 0) - out * 1500;
  const np = at(frame, start + noticeAt, 8, bez(0.2, 0.8, 0.2, 1));
  const zIn = at(frame, start + pushAt, 22, bez(0.6, 0, 0.1, 1));
  const zOut = at(frame, start + backAt, 16, bez(0.5, 0, 0.2, 1));
  const zoom = logScale(1, push, zIn * (1 - zOut));
  const side = sw * 0.045;
  const nW = sw - side * 2;
  const size = nW / 19;
  const stackTop = sh * 0.36;
  const nH = size * 0.85 * 2 + size * 2.35;
  const typeAt = start + pushAt + 20;
  const times = typingTimes(reply, typeAt, fps, 14, 9);
  const typedEnd = times[times.length - 1] ?? typeAt;
  const typed = times.filter((k) => frame >= k).length;
  const sendAt = typedEnd + 10;
  const pr = pressOf(frame, [sendAt]);
  const sent = at(frame, sendAt + 2, 8, ease.out);
  const fieldTop = stackTop + nH + size * 0.4;
  const focusY = y - ph / 2 + b + fieldTop + size * 1.2;
  const glass: Look = { ...L, dark: false, surface: 'rgba(246,246,248,0.94)', ground: '#000000', line: 'rgba(255,255,255,0.5)' };
  const fieldP = at(frame, start + pushAt + 6, 8, ease.out);
  const iconW = 'rgba(255,255,255,0.92)';
  return (
    <Paced start={start} speed={speed}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${x}px ${focusY}px`, transform: `translate(${(960 - x) * zIn * (1 - zOut)}px, ${(540 - focusY) * zIn * (1 - zOut)}px) scale(${zoom})` }}>
        <div style={{ position: 'absolute', left: x - w / 2, top: y - ph / 2 + py, perspective: 2400, filter: out > 0.05 ? `blur(${out * 10}px)` : undefined }}>
          <div style={{ transform: `rotateX(${mix(drop, 12, 0)}deg)`, transformOrigin: '50% 0%' }}>
            <Phone w={w} screen="#000" ground={L.ground}>
              <div style={{ position: 'absolute', inset: 0, background: screen }} />
              {/* status bar */}
              <div style={{ position: 'absolute', left: sw * 0.09, right: sw * 0.08, top: sw * 0.045, height: sw * 0.07, display: 'flex', alignItems: 'center', fontFamily: L.font, color: iconW, fontSize: sw * 0.036, fontWeight: 600 }}>
                <span style={{ flex: 1 }}>Carrier</span>
                <div style={{ display: 'flex', gap: sw * 0.014, alignItems: 'center' }}>
                  <Icon name="Signal" size={sw * 0.045} color={iconW} stroke={2.4} />
                  <Icon name="Wifi" size={sw * 0.045} color={iconW} stroke={2.4} />
                  <Icon name="BatteryFull" size={sw * 0.055} color={iconW} stroke={2} />
                </div>
              </div>
              <div style={{ position: 'absolute', top: sw * 0.15, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Icon name="Lock" size={sw * 0.05} color={iconW} stroke={2.4} />
              </div>
              <div style={{ position: 'absolute', top: sw * 0.22, width: '100%', textAlign: 'center', fontFamily: L.font, color: 'rgba(255,255,255,0.85)', fontSize: sw * 0.045, fontWeight: 560 }}>{date}</div>
              <div style={{ position: 'absolute', top: sw * 0.26, width: '100%', textAlign: 'center', fontFamily: L.font, color: '#FFFFFF', fontSize: sw * 0.22, fontWeight: 650, letterSpacing: '-0.04em', lineHeight: 1.1 }}>{time}</div>
              {/* the older notices: lips under the stack, then the new one slides in on top */}
              {older.slice(0, 2).map((o, k) => {
                const slot = k + np;
                return (
                  <div key={k} style={{ position: 'absolute', left: side, top: stackTop + slot * size * 0.6, width: nW, transformOrigin: '50% 100%', transform: `scale(${1 - slot * 0.05})`, opacity: slot > 1.5 ? 0.7 : 1, zIndex: 5 - k }}>
                    <Notice L={glass} n={o} w={nW} size={size} style={{ boxShadow: 'none', border: 'none', filter: slot > 0.5 ? `brightness(${1 - slot * 0.06})` : undefined }} />
                  </div>
                );
              })}
              <div style={{ position: 'absolute', left: side, top: stackTop + mix(np, -sw * 0.3, 0), opacity: np, filter: np < 1 ? `blur(${mix(np, 10, 0)}px)` : undefined, zIndex: 10, width: nW }}>
                <Notice L={glass} n={n} w={nW} size={size} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.25)', border: 'none' }} />
                <div style={{ marginTop: size * 0.4, height: size * 2.4, borderRadius: size * 1.2, background: 'rgba(246,246,248,0.94)', display: 'flex', alignItems: 'center', padding: `0 ${size * 0.35}px 0 ${size * 0.9}px`, fontFamily: L.font, fontSize: size, opacity: fieldP, transform: `translateY(${mix(fieldP, -10, 0)}px)` }}>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', color: typed && sent < 1 ? L.ink : '#8C9098' }}>
                    {sent > 0 ? <span style={{ opacity: sent }}>Sent</span> : typed ? <InkTyped text={reply} times={times} color={L.ink} born={L.accent} /> : 'Reply'}
                    {sent <= 0 && <Caret color={L.accent} height={size * 1.1} typing={frame < typedEnd + 2} since={typedEnd} hidden={frame < typeAt - 6} />}
                  </span>
                  <div style={{ width: size * 1.7, height: size * 1.7, borderRadius: size, background: typed ? mixColor(L.accent, '#FFFFFF', pr * 0.15) : '#DCDDE1', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - pr * 0.1})` }}>
                    {sent > 0.5 ? <Icon name="Check" size={size * 0.95} stroke={2.6} /> : <Icon name="ArrowUp" size={size * 0.95} stroke={2.4} />}
                  </div>
                </div>
              </div>
              {/* torch, camera, home bar */}
              {[
                ['Flashlight', sw * 0.12],
                ['Camera', sw * 0.88],
              ].map(([ic, cx]) => (
                <div key={ic as string} style={{ position: 'absolute', left: (cx as number) - sw * 0.075, top: sh - sw * 0.25, width: sw * 0.15, height: sw * 0.15, borderRadius: sw, background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={ic as string} size={sw * 0.06} color="#FFFFFF" stroke={2} />
                </div>
              ))}
              <div style={{ position: 'absolute', left: sw * 0.33, width: sw * 0.34, top: sh - sw * 0.04, height: sw * 0.012, borderRadius: sw, background: 'rgba(255,255,255,0.85)' }} />
            </Phone>
          </div>
        </div>
      </div>
    </Paced>
  );
};
export const PhoneDrop = withPace(PhoneDropInner);

export type SettingControl =
  | { kind: 'toggle'; on?: boolean; clickAt?: number }
  | { kind: 'slider'; keys: Array<{ f: number; v: number }>; format?: (v: number) => string }
  | { kind: 'segment'; options: string[]; active: number; to?: number; clickAt?: number };

export type SettingRow = { icon: string; title: string; sub: string; control: SettingControl };

/** A slider's value on a frame (keys eased like ValueSlider). */
export const sliderValue = (frame: number, keys: Array<{ f: number; v: number }>) => {
  let v = keys[0].v;
  for (let i = 1; i < keys.length; i++) v = mix(at(frame, keys[i - 1].f, keys[i].f - keys[i - 1].f, SLIDE), v, keys[i].v);
  return v;
};
const SLIDE = bez(0.45, 0, 0.15, 1);

/**
 * A settings card driven by a pointer. A header (the app's mark, a title, a status line) over rows of icon tile, title,
 * one line of description and a control: a toggle, a slider with its value in figures, or a segmented control. The
 * pointer arcs from control to control in time order and presses each: the toggle's knob stretches across and its track
 * takes the accent (its state), the segment's white indicator slides to the clicked option, the slider's thumb is
 * pressed and dragged through its keys with the pointer on it. Frames in the controls are relative to `at`.
 */
const SettingsCardInner: React.FC<{
  L: Look;
  rows: SettingRow[];
  at: number;
  title?: string;
  sub?: string;
  mark?: React.ReactNode;
  x?: number;
  y?: number;
  w?: number;
  size?: number;
  pointer?: boolean;
  speed?: number;
}> = ({ L, rows, at: start, title = 'Backups', sub = 'Last backup 2 minutes ago', mark, x = 960, y = 540, w = 1280, size = 32, pointer = true, speed = 1 }) => {
  const frame = start + (useUiFrame() - start) * speed;
  const s = size;
  const headH = s * 4.2;
  const rowH = s * 4.0;
  const padX = s * 1.3;
  const H = headH + rows.length * rowH + s * 0.4;
  const left = x - w / 2;
  const top = y - H / 2;
  const enter = springAt(frame, 30, start - 12, springs.ui);
  const ctrlRight = left + w - padX;
  const sliderW = s * 10;
  const tg = s * 1.55;
  // pointer stops, in time order
  const stops: Array<{ f: number; x: number; y: number; click?: boolean; curve?: Ease; bow?: number }> = [];
  rows.forEach((r, i) => {
    const cy = top + headH + i * rowH + rowH / 2;
    const c = r.control;
    if (c.kind === 'toggle' && c.clickAt !== undefined) stops.push({ f: start + c.clickAt, x: ctrlRight - tg * 1.75 * 0.5, y: cy, click: true });
    if (c.kind === 'segment' && c.clickAt !== undefined && c.to !== undefined) {
      const segW = s * 4.2;
      const x0 = ctrlRight - segW * c.options.length;
      stops.push({ f: start + c.clickAt, x: x0 + segW * (c.to + 0.5), y: cy, click: true });
    }
    if (c.kind === 'slider') {
      const sx = ctrlRight - s * 3.2 - sliderW;
      c.keys.forEach((k, j) => stops.push({ f: start + k.f - (j === 0 ? 2 : 0), x: sx + k.v * sliderW, y: cy, click: j === 0, curve: j === 0 ? undefined : SLIDE, bow: j === 0 ? undefined : 0 }));
    }
  });
  stops.sort((a, b) => a.f - b.f);
  const keys = stops.length
    ? [{ f: stops[0].f - 26, x: stops[0].x + 380, y: stops[0].y + 320 }, ...stops.map((p, i) => ({ f: i === 0 || p.click ? p.f - 3 : p.f, x: p.x, y: p.y + s * 0.15, curve: p.curve, bow: p.bow }))]
    : [];
  const clicks = stops.filter((p) => p.click).map((p) => p.f);
  return (
    <Paced start={start} speed={speed}>
      <div style={{ position: 'absolute', inset: 0, opacity: clamp(enter * 2), transform: `translateY(${mix(enter, 36, 0)}px)` }}>
        <div style={{ ...surfaceStyle(L, 5, s * 1.1), position: 'absolute', left, top, width: w, height: H, fontFamily: L.font }}>
          <div style={{ position: 'absolute', left: padX, right: padX, top: 0, height: headH, display: 'flex', alignItems: 'center', gap: s * 0.7, borderBottom: `1px solid ${L.line}` }}>
            <MarkSlot mark={mark} icon="HardDrive" colors={['#5B86FF', '#2350E6']} size={s * 2} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: s * 1.1, fontWeight: 650, color: L.ink, letterSpacing: '-0.015em', whiteSpace: 'nowrap' }}>{title}</div>
              <div style={{ fontSize: s * 0.8, color: L.muted, marginTop: s * 0.1, whiteSpace: 'nowrap' }}>{sub}</div>
            </div>
            <Pill L={L} label="Synced" icon="Check" color={L.accent} size={s * 0.74} />
          </div>
          {rows.map((r, i) => {
            const c = r.control;
            const ry = headH + i * rowH;
            let ctrl: React.ReactNode = null;
            if (c.kind === 'toggle') {
              const onAt = c.on ? -1e6 : c.clickAt !== undefined ? start + c.clickAt + 1 : 1e9;
              ctrl = <ToggleSwitch L={L} onAt={onAt} size={tg} />;
            } else if (c.kind === 'slider') {
              const v = sliderValue(frame, c.keys.map((k) => ({ f: start + k.f, v: k.v })));
              ctrl = (
                <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.8 }}>
                  <ValueSlider L={L} keys={c.keys.map((k) => ({ f: start + k.f, v: k.v }))} w={sliderW} size={s * 0.85} pill={false} />
                  <div style={{ width: s * 2.4, textAlign: 'right', fontSize: s * 0.9, fontWeight: 600, color: L.ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{(c.format ?? ((q: number) => `${Math.round(q * 100)}%`))(v)}</div>
                </div>
              );
            } else {
              const segW = s * 4.2;
              const p = c.to !== undefined && c.clickAt !== undefined ? at(frame, start + c.clickAt + 1, 9, bez(0.3, 0, 0.1, 1)) : 0;
              const pos = mix(p, c.active, c.to ?? c.active);
              ctrl = (
                <div style={{ position: 'relative', width: segW * c.options.length, height: s * 1.9, borderRadius: s * 0.55, background: L.fill, padding: s * 0.18, boxSizing: 'border-box' }}>
                  <div style={{ position: 'absolute', left: s * 0.18 + pos * segW, top: s * 0.18, width: segW - s * 0.36, height: s * 1.9 - s * 0.36, borderRadius: s * 0.42, background: L.dark ? '#3A3C43' : '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.1), 0 3px 8px rgba(0,0,0,0.06)' }} />
                  {c.options.map((o, k) => (
                    <div key={o} style={{ position: 'absolute', left: k * segW, width: segW, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s * 0.8, fontWeight: 600, color: mixColor(L.muted, L.ink, clamp(1 - Math.abs(pos - k))), whiteSpace: 'nowrap' }}>
                      {o}
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div key={i} style={{ position: 'absolute', left: padX, right: padX, top: ry, height: rowH, display: 'flex', alignItems: 'center', gap: s * 0.7, borderTop: i > 0 ? `1px solid ${L.line}` : undefined, boxSizing: 'border-box' }}>
                <div style={{ width: s * 1.9, height: s * 1.9, borderRadius: s * 0.5, background: L.fill, color: L.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={r.icon} size={s * 0.95} stroke={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: s * 0.95, fontWeight: 600, color: L.ink, whiteSpace: 'nowrap' }}>{r.title}</div>
                  <div style={{ fontSize: s * 0.78, color: L.muted, marginTop: s * 0.1, whiteSpace: 'nowrap' }}>{r.sub}</div>
                </div>
                {ctrl}
              </div>
            );
          })}
        </div>
        {pointer && keys.length > 0 && <Pointer keys={keys} clicks={clicks} size={s * 2.2} ring={mixColor(L.accent, '#FFFFFF', 0.45)} />}
      </div>
    </Paced>
  );
};
export const SettingsCard = withPace(SettingsCardInner);
