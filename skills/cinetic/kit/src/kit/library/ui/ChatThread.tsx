// ChatThread (ui, build): a chat in its window: typing dots widen into messages, a reply typed and sent from the
// composer, Read settles.
// Numbers: dots bubble 7 f, bounce on a 20 f cycle; widen 9 f; washes 10 f; typing 15 characters a second; sent text
// travels 14 f.
// Caution: one line per message; three to six messages.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { at, clamp, ease, logScale, mix, springAt, springs } from '../../motion';
import { mixColor, typingTimes, useTextWidth } from '../../type';
import { bez, Caret, Face, InkTyped, type Look, Paced, Presence, surfaceStyle, useUiFrame, withPace } from './_shared';
import { pressOf } from './Pointer';

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
}> = ({ L, msgs, at: start, person = 'Rosa Diaz', personColor = '#C8692E', status = 'Active now', day = 'Today 9:41', read = 'Read 9:42', x: xIn, y: yIn, w = 1180, h = 940, size = 36, macro = 1, cps = 15, mark, speed = 1 }) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
  const y = yIn ?? frameH / 2;
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
            <div style={{ position: 'absolute', left: -left, top: -top - headH, width: frameW, height: frameH }}>
              <div style={{ position: 'absolute', left: left + pad, right: frameW - left - w + pad, top: dividerY, height: s * 1.2, display: 'flex', alignItems: 'center', gap: s * 0.6, fontSize: s * 0.74, color: L.faint, whiteSpace: 'nowrap' }}>
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
