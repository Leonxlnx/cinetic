import React from 'react';
import { C, FONT, TYPE } from '../brand/tokens';
import { clamp, fd, hitPulse } from '../lib/anim';
import { mixColor } from '../lib/color';
import { type FilmCtx, f60x, fpsOf, uOf, useFilm } from '../lib/film';
import type { Declares, SteppedRange } from '../timeline';

// Chat bubbles. A bubble CUTS ON (full opacity, full size, on its sound) some distance below its slot and
// slides up into it on an exponential: the biggest step on the first frame, each next step the same share
// of what is left. No fade, no scale, no overshoot. A reply arrives a beat after the question; a typing
// bubble's dots pulse in turn until the reply replaces it. House numbers (60 fps): tau 12 f, travel 56 px
// at 1080p, home in 50 f, reply 32 f after the message before it, gap 16 px between bubbles.

export type Message = {
  text: string;
  side?: 'out' | 'in'; // out: the user's, right-aligned, tinted; in: the product's, left, surface (default in)
  at?: number; // the frame it cuts on (default: the previous message's + replyDelay)
  kind?: 'text' | 'typing'; // typing: three pulsing dots, replaced by the next message from the same side
  travel?: number; // px below its slot on its first frame (default the house travel)
  tau?: number; // this bubble's slide time constant (default the log's)
  dur?: number;
  lift?: number; // share of its travel taken by the whole log lifting (default the log's lift share; 0 = the bubble alone slides)
};

export type BubbleOpts = {
  tau?: number; // time constant of the slide, frames (default 12 f at 60 fps)
  dur?: number; // frames to land exactly home (default 50 f at 60 fps, about 4 tau)
  travel?: number; // default 56 px at 1080p
  replyDelay?: number; // default 32 f at 60 fps
  slotGap?: number; // px between bubbles (default 16 at 1080p)
  anchor?: 'top' | 'bottom'; // top: the log grows down; bottom: new bubbles push the log up (default top)
  /**
   * The log lifts as a bubble lands: `share` of each new bubble's travel is taken by the whole log (header and
   * every earlier bubble) moving up on its own, quicker time constant `tau`, so the conversation re-centres
   * as it grows; the bubble itself slides the rest. Default none (share 0).
   */
  lift?: { share: number; tau?: number; dur?: number };
};

const HOUSE = { tau60: 12, dur60: 50, travel: 56, reply60: 32, gap: 16 } as const;

/**
 * The slide offset (px below the slot) of a bubble that cut on at `at`: travel on the first frame, then an
 * exponential with time constant `tau`, renormalised to land exactly at `dur`. Before `at` it is `travel`
 * (the bubble is not drawn yet). Pure, closed form.
 */
export const bubbleY = (f: number, at: number, o: { travel?: number; tau?: number; dur?: number; lift?: { share: number; tau?: number; dur?: number } } = {}, film?: Partial<FilmCtx>): number => {
  const fps = fpsOf(film);
  const travel = o.travel ?? HOUSE.travel;
  const share = clamp(o.lift?.share ?? 0);
  const own = expSlide(f - at, o.tau ?? f60x(HOUSE.tau60, fps), o.dur ?? f60x(HOUSE.dur60, fps));
  if (share === 0) return travel * own;
  const lift = expSlide(f - at, o.lift?.tau ?? f60x(HOUSE.tau60 / 2, fps), o.lift?.dur ?? o.dur ?? f60x(HOUSE.dur60, fps));
  return travel * ((1 - share) * own + share * lift);
};

/** A renormalised exponential: 1 at n <= 0, 0 from n >= dur, e^(-n / tau) between (rescaled to land on 0). */
export const expSlide = (n: number, tau: number, dur: number): number => {
  const t = Math.max(1e-6, tau);
  const d = Math.max(1e-6, dur);
  if (n <= 0) return 1;
  if (n >= d) return 0;
  const end = Math.exp(-d / t);
  return (Math.exp(-n / t) - end) / (1 - end);
};

/** How far the whole log has lifted at frame f (px, negative = up): the sum of every landed bubble's lift share. */
export const bubbleLog = (f: number, messages: Message[], o: BubbleOpts = {}, film?: Partial<FilmCtx>): number => {
  const fps = fpsOf(film);
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const ats = bubbleFrames(messages, o, film);
  let off = 0;
  messages.forEach((m, j) => {
    const share = clamp(m.lift ?? o.lift?.share ?? 0);
    if (share === 0 || f < ats[j]) return;
    const travel = m.travel ?? o.travel ?? HOUSE.travel * u;
    off -= share * travel * (1 - expSlide(f - ats[j], o.lift?.tau ?? f60x(HOUSE.tau60 / 2, fps), o.lift?.dur ?? m.dur ?? o.dur ?? f60x(HOUSE.dur60, fps)));
  });
  return off;
};

/** The frame each message cuts on (sound cues go here). */
export const bubbleFrames = (messages: Message[], o: BubbleOpts = {}, film?: Partial<FilmCtx>): number[] => {
  const fps = fpsOf(film);
  const reply = o.replyDelay ?? f60x(HOUSE.reply60, fps);
  const out: number[] = [];
  messages.forEach((msg, i) => out.push(msg.at ?? (i === 0 ? 0 : Math.round(out[i - 1] + reply))));
  return out;
};

export type BubbleState = { visible: boolean; at: number; dy: number; shift: number };

/**
 * Every message's state at frame f: drawn or not (whole frames, so motion-blur sub-samples agree), its own
 * slide offset `dy`, and `shift`: how far the log above it has been pushed (anchor bottom) as later
 * bubbles come in. `heights` are the bubbles' heights in px (for the push); a typing bubble disappears on
 * the frame the next message from its side cuts on.
 */
export const bubbleState = (f: number, messages: Message[], heights: number[], o: BubbleOpts = {}, film?: Partial<FilmCtx>): BubbleState[] => {
  const ats = bubbleFrames(messages, o, film);
  const u = film?.width !== undefined && film?.height !== undefined ? uOf(film) : 1;
  const gap = o.slotGap ?? HOUSE.gap * u;
  const F = fd(f);
  const gone = messages.map((m, i) => (m.kind === 'typing' ? messages.findIndex((n, j) => j > i && (n.side ?? 'in') === (m.side ?? 'in')) : -1));
  const fps = fpsOf(film);
  const travelOf = (i: number) => messages[i].travel ?? o.travel ?? HOUSE.travel * u;
  // a bubble's own slide: the part of its travel the log's lift does not take
  const slide = (i: number) => travelOf(i) * (1 - clamp(messages[i].lift ?? o.lift?.share ?? 0)) * expSlide(f - ats[i], messages[i].tau ?? o.tau ?? f60x(HOUSE.tau60, fps), messages[i].dur ?? o.dur ?? f60x(HOUSE.dur60, fps));
  const log = bubbleLog(f, messages, o, film);
  return messages.map((_m, i) => {
    const replacedAt = gone[i] >= 0 ? ats[gone[i]] : Infinity;
    const visible = F >= ats[i] && F < replacedAt;
    let shift = 0;
    if ((o.anchor ?? 'top') === 'bottom') {
      for (let j = i + 1; j < messages.length; j++) {
        if (F < ats[j]) continue;
        const t = travelOf(j) * (1 - clamp(messages[j].lift ?? o.lift?.share ?? 0));
        shift += (heights[j] + gap) * (t > 1e-6 ? 1 - slide(j) / t : 1);
      }
    }
    return { visible, at: ats[i], dy: slide(i) + log, shift };
  });
};

/** The three typing dots' lift (0..1 each) at frame f: one pulse runs through them every `period` frames. */
export const typingDots = (f: number, start: number, fps: number, period = f60x(36, fps)): number[] =>
  [0, 1, 2].map((k) => {
    const t = (((f - start - (k * period) / 6) % period) + period) % period;
    return hitPulse(t, 3, 6, fps);
  });

/**
 * A chat log. Bubbles are laid out from `y` down (anchor top: each in the slot after the one before) or
 * from `y` up (anchor bottom: the newest at `y`, the log pushed up as it lands); `width` is the column
 * width, `x` its left edge. Text in the ui or caption role at film size (the default is caption: a chat
 * that is read on screen, not glimpsed). `outFill` defaults to a light tint of the accent, `inFill` to the
 * surface; both read on paper or on a dark stage. Heights are estimated from the line count of each text
 * at the type size (one line unless the text is wider than `maxBubble` of the column).
 */
export const Bubbles: React.FC<{
  frame: number;
  messages: Message[];
  x?: number;
  y?: number;
  width?: number;
  role?: 'ui' | 'caption';
  outFill?: string;
  inFill?: string;
  ink?: string;
  maxBubble?: number; // the widest a bubble gets, share of the column (default 0.78)
  header?: React.ReactNode; // drawn above the log (an avatar, a title): it moves with the log's lift
  style?: React.CSSProperties;
} & BubbleOpts> = ({ frame, messages, x = 0, y = 0, width, role = 'caption', outFill, inFill, ink = C.ink, maxBubble = 0.78, header, style, ...o }) => {
  const film = useFilm();
  const u = uOf(film);
  const W = width ?? 900 * u;
  const size = TYPE[role].size * u;
  const padX = size * 0.62;
  const padY = size * 0.42;
  const lineH = size * 1.25;
  const charW = size * 0.5;
  const maxW = W * maxBubble;
  const lines = (m: Message) => (m.kind === 'typing' ? 1 : Math.max(1, Math.ceil((m.text.length * charW + 2 * padX) / maxW)));
  const heights = messages.map((m) => lines(m) * lineH + 2 * padY);
  const st = bubbleState(frame, messages, heights, o, film);
  const gap = o.slotGap ?? HOUSE.gap * u;
  const anchor = o.anchor ?? 'top';
  const out = outFill ?? mixColor(C.white, C.accent, 0.16);
  const inn = inFill ?? C.white;
  // slots: anchor top stacks down from y; anchor bottom stacks up so the newest sits at y
  const slotY: number[] = [];
  if (anchor === 'top') {
    let acc = y;
    messages.forEach((m, i) => {
      slotY.push(acc);
      const replaced = m.kind === 'typing' && messages.some((n, j) => j > i && (n.side ?? 'in') === (m.side ?? 'in'));
      if (!replaced) acc += heights[i] + gap;
    });
  } else {
    messages.forEach((_, i) => slotY.push(y - heights[i]));
  }
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', ...style }}>
      {header !== undefined && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', transform: `translate3d(0px, ${bubbleLog(frame, messages, o, film).toFixed(3)}px, 0)`, willChange: 'transform' }}>{header}</div>
      )}
      {messages.map((m, i) => {
        const s = st[i];
        if (!s.visible) return null;
        const side = m.side ?? 'in';
        const n = lines(m);
        const w = m.kind === 'typing' ? size * 3.2 : Math.min(maxW, m.text.length * charW + 2 * padX);
        const left = side === 'out' ? x + W - w : x;
        const top = slotY[i] + s.dy - s.shift;
        const dots = m.kind === 'typing' ? typingDots(frame, s.at, film.fps) : [];
        return (
          <div
            key={i}
            data-text={m.kind === 'typing' ? undefined : `bubble-${i}`}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: w,
              height: heights[i],
              transform: `translate3d(${left.toFixed(3)}px, ${top.toFixed(3)}px, 0)`,
              willChange: 'transform', // its own composited layer: text slides sub-pixel instead of in 1 px ticks
              borderRadius: Math.min(heights[i] / 2, size * 0.9),
              background: side === 'out' ? out : inn,
              boxShadow: `0 ${(6 * u).toFixed(2)}px ${(20 * u).toFixed(2)}px rgba(0, 0, 0, 0.07)`,
              color: ink,
              fontFamily: FONT.text,
              fontSize: size,
              fontWeight: TYPE[role].weight,
              letterSpacing: `${TYPE[role].track}em`,
              lineHeight: `${lineH}px`,
              padding: `${padY}px ${padX}px`,
              boxSizing: 'border-box',
              whiteSpace: n > 1 ? 'normal' : 'pre',
            }}
          >
            {m.kind === 'typing'
              ? dots.map((d, k) => (
                  <span
                    key={k}
                    style={{
                      display: 'inline-block',
                      width: size * 0.32,
                      height: size * 0.32,
                      marginRight: k < 2 ? size * 0.22 : 0,
                      borderRadius: '50%',
                      background: ink,
                      opacity: 0.35 + 0.5 * clamp(d),
                      transform: `translateY(${(-size * 0.18 * clamp(d)).toFixed(3)}px)`,
                    }}
                  />
                ))
              : m.text}
          </div>
        );
      })}
    </div>
  );
};

/**
 * What a Bubbles instance does on purpose: each bubble cuts on in one frame (and a typing bubble is replaced in
 * one), declared as one-frame steps so the checks read them as craft, not pops. Pass the instance's `messages`
 * (and `replyDelay` when it is not the house one); without them nothing is declared.
 */
export const declares = (props?: { messages?: Message[]; replyDelay?: number; id?: string }, film?: Partial<FilmCtx>): Declares => {
  if (!props?.messages?.length) return { stepped: [], flashes: [], cameraBlur: [], seams: [] };
  const ats = bubbleFrames(props.messages, { replyDelay: props.replyDelay }, film);
  const stepped: SteppedRange[] = [...new Set(ats.map((a) => Math.round(a)))].sort((a, b) => a - b).map((a, i) => ({ from: a, to: a + 1, id: `${props.id ?? 'bubble'}-${i}` }));
  return { stepped, flashes: [], cameraBlur: [], seams: [] };
};
