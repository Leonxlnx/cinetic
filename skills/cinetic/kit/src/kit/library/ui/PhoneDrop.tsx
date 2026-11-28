// PhoneDrop (ui, enter / build / exit): a phone drops in with weight, a notice settles, the camera pushes into its
// reply field, a reply is sent, it leaves.
// Numbers: drop 18 f from 12 deg back; notice 8 f from +20 f; push x2 over 22 f from +36 f; typing from +56 f; leave
// at +122 f.
// Caution: the wallpaper is a solid colour or a real picture, never a faint gradient.
// Catalogue: ../catalog/ui.ts; props and recipe: references/library-ui.md.
import React from 'react';
import { useVideoConfig } from 'remotion';
import { Icon } from '../../icons';
import { accel, at, ease, logScale, mix } from '../../motion';
import { mixColor, typingTimes } from '../../type';
import { Phone } from '../../ui';
import { bez, Caret, InkTyped, type Look, Notice, type NoticeData, Paced, useUiFrame, withPace } from './_shared';
import { pressOf } from './Pointer';

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
  x: xIn,
  y = 560,
  w = 500,
  screen = '#1B1D22',
  speed = 1,
}) => {
  // the frame's centre by default, in a composition of any size
  const { width: frameW, height: frameH } = useVideoConfig();
  const x = xIn ?? frameW / 2;
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
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${x}px ${focusY}px`, transform: `translate(${(frameW / 2 - x) * zIn * (1 - zOut)}px, ${(frameH / 2 - focusY) * zIn * (1 - zOut)}px) scale(${zoom})` }}>
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
