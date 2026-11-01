/**
 * cinetic:light the world's light on the hero shots: a click blooming the size of its button, the light of a pressed key
 *
 * The parts the hero shots share: the world they stand in (its colours and key light, fx/world useWorld), a glow the size
 * of its source that blooms once and fades (a baked sprite, never an animated gradient), a line leaving on its own (it
 * lifts and softens away), the input's content inside a glass pane, a content card in the kit's one material, and the
 * film's content (src/content.ts) read safely.
 */
import React from 'react';
import { Img } from 'remotion';
import { C, U } from '../brand/tokens';
import { CONTENT } from '../content';
import { poolUrl, rgbaOf } from '../fx/light';
import { useWorld, worldOf, type WorldSpec } from '../fx/world';
import { Card as KitCard } from '../kit/card';
import { Face, Icon, skinOf, textW, typedAt, wordInk, wordsOf, caretOn, Caret } from '../kit/screens';
import { KIT_FONT } from '../kit/parts';
import { clamp, E, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { Soft } from '../acts/layer';
import { SCREEN_TONE, WORLD_KIND } from '../world';
import type { FamilyInks } from '../fx/Grounds';

/** The world a shot stands in: its colours, key and glass (the film's world outside a World). */
export const useSpec = (): WorldSpec => useWorld()?.spec ?? worldOf(WORLD_KIND);

/** f@60 to the film's rate. */
export const k60 = (n: number, fps: number) => (n * fps) / 60;

/**
 * A glow the size of its source, turned on by an event and gone: a near-white core and a falloff in the light's colour
 * (fx/light poolUrl, baked once), up in `rise` f@60, held `hold`, fading over `fall`. Light worlds take it as a soft
 * tint of the accent (a pale world cannot add light), dark ones add it. `r`: where it falls to nothing (about 2.2x the
 * source's own radius: the click blooms past the button, never across the frame).
 */
export const Bloom1: React.FC<{ f: number; at: number; x: number; y: number; r: number; fps: number; color?: string; rise?: number; hold?: number; fall?: number; peak?: number }> = ({ f, at, x, y, r, fps, color, rise = 4, hold = 3, fall = 22, peak = 1 }) => {
  const spec = useSpec();
  const dark = spec.tone === 'dark';
  const a = f < at ? 0 : f < at + k60(rise, fps) ? E.softOut(prog(f, at, at + k60(rise, fps))) : f < at + k60(rise + hold, fps) ? 1 : 1 - E.softIn(prog(f, at + k60(rise + hold, fps), at + k60(rise + hold + fall, fps)));
  if (a <= 0.001) return null;
  const col = color ?? (dark ? mixColor(C.accent, C.white, 0.45) : C.accent);
  return (
    <Img
      src={poolUrl(col, 192, 192)}
      style={{ position: 'absolute', left: 0, top: 0, width: 2 * r, height: 2 * r, transform: `translate(${(x - r).toFixed(2)}px, ${(y - r).toFixed(2)}px)`, opacity: clamp(a * peak * (dark ? 0.9 : 0.38)), mixBlendMode: dark ? 'plus-lighter' : 'normal', pointerEvents: 'none' }}
    />
  );
};

/** A line held over its shot leaving on its own once its read is over: it lifts 30 px and softens away (16 f@60). */
export const LineExit: React.FC<{ F: number; out: number; fps: number; children: React.ReactNode; shadow?: string }> = ({ F, out, fps, children, shadow }) => {
  const u = clamp((F - out) / k60(16, fps));
  const e = E.buildIn(u);
  if (u >= 1) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - E.stdInOut(u), transform: `translate3d(0, ${(-30 * e * U).toFixed(2)}px, 0)`, textShadow: shadow }}>
      <Soft sigma={11 * e}>{children}</Soft>
    </div>
  );
};

/** The typing rate that fits `text` into `frames` (a person typing: 12-30 characters a second). */
export const cpsFor = (text: string, frames: number, fps: number) => clamp(text.length / Math.max(0.4, frames / fps), 12, 30);

/**
 * The input's content inside a glass pane (w x h, px): a plus button, the request typed on a human cadence (the newest
 * word in the accent settling to ink), a caret, a mic and the round send button that wakes once there is text and is
 * pressed on `send`. Colours from the world's glass (its type colour) and the accent.
 */
export const InputContent: React.FC<{ w: number; h: number; f: number; fps: number; text: string; placeholder: string; at: number; cps: number; send: number }> = ({ w, h, f, fps, text, placeholder, at, cps, send }) => {
  const spec = useSpec();
  const ink = spec.glass.text;
  const mute = mixColor(ink, spec.tone === 'dark' ? spec.base : C.white, 0.42);
  const px = h * 0.3;
  const typed = typedAt(text, f, { at, cps, fps, seed: text });
  const words = wordsOf(typed.shown);
  const left = h * 1.02;
  const right = w - h * 2.05;
  const areaW = Math.max(40, right - left);
  const tw = textW(typed.shown, px, 450);
  const scroll = Math.max(0, tw + px * 0.4 - areaW);
  const wake = typed.n > 0 ? prog(f - at, typed.keys[0], typed.keys[0] + k60(10, fps), E.snapOut) : 0;
  const press = f < send ? 0 : f < send + k60(8, fps) ? E.snapOut(prog(f, send, send + k60(8, fps))) : 1 - E.buildIn(prog(f, send + k60(10, fps), send + k60(22, fps)));
  const sendD = h * 0.62;
  const plusD = h * 0.56;
  const accentInk = C.white;
  return (
    <div data-ui data-screen="glass-input" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, fontFamily: KIT_FONT }}>
      <div style={{ position: 'absolute', left: (h - plusD) / 2 + h * 0.06, top: (h - plusD) / 2, width: plusD, height: plusD, borderRadius: '50%', boxShadow: `inset 0 0 0 ${Math.max(1, 1.5 * U).toFixed(2)}px ${rgbaOf(ink, 0.28)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={plusD * 0.5} color={mute} />
      </div>
      <div style={{ position: 'absolute', left, top: 0, width: areaW, height: h, overflow: 'hidden', WebkitMaskImage: scroll > 0 ? `linear-gradient(90deg, transparent 0, black ${(px * 1.2).toFixed(1)}px)` : undefined, maskImage: scroll > 0 ? `linear-gradient(90deg, transparent 0, black ${(px * 1.2).toFixed(1)}px)` : undefined }}>
        <div data-text="glass-input" style={{ position: 'absolute', left: -scroll, top: 0, height: h, display: 'flex', alignItems: 'center', whiteSpace: 'pre', fontSize: px, fontWeight: 450, letterSpacing: '-0.004em', color: ink }}>
          {typed.n === 0 ? (
            <>
              <Caret h={px * 1.16} w={Math.max(2, 2.4 * U)} color={ink} on={caretOn(typed.since, fps)} style={{ marginRight: 3 * U }} />
              <span style={{ color: mute }}>{placeholder}</span>
            </>
          ) : (
            <>
              {words.map((wd, i) => {
                const k = wordInk(words[i + 1] ? typed.keys[words[i + 1].start] : undefined, f - at, fps);
                return (
                  <span key={i} style={{ color: mixColor(spec.tone === 'dark' ? mixColor(C.accent, C.white, 0.35) : C.accent, ink, k) }}>
                    {wd.text}
                  </span>
                );
              })}
              <Caret h={px * 1.16} w={Math.max(2, 2.4 * U)} color={ink} on={caretOn(typed.since, fps)} style={{ marginLeft: 2 * U }} />
            </>
          )}
        </div>
      </div>
      <div style={{ position: 'absolute', left: w - h * 1.68, top: (h - px * 1.1) / 2 }}>
        <Icon name="mic" size={px * 1.1} color={mute} />
      </div>
      <div style={{ position: 'absolute', left: w - h * 0.19 - sendD, top: (h - sendD) / 2, width: sendD, height: sendD, borderRadius: '50%', background: wake > 0.02 ? mixColor(spec.tone === 'dark' ? spec.base : C.white, C.accent, 0.25 + 0.75 * wake) : rgbaOf(ink, 0.14), transform: `scale(${(1 - 0.12 * press).toFixed(4)})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: wake > 0.02 ? `0 ${(4 * U).toFixed(1)}px ${(14 * U).toFixed(1)}px rgba(0, 0, 0, ${(0.18 * wake).toFixed(3)})` : undefined }}>
        <Icon name="arrowUp" size={sendD * 0.48} color={mixColor(mute, accentInk, wake)} weight="bold" />
      </div>
    </div>
  );
};
/** Where the send button's centre sits inside an InputContent of w x h. */
export const inputSend = (w: number, h: number) => ({ x: w - h * 0.19 - (h * 0.62) / 2, y: h / 2, r: (h * 0.62) / 2 });

/** The skin of the kit's screens in this world (their inks over the world's ground). */
export const useSkin = (inks: FamilyInks) => skinOf(SCREEN_TONE, inks.ground);

/**
 * A card of the product's own content in the kit's one material (kit/card.tsx: a face lit from above, a hairline, a top
 * highlight, two shadows), facing the camera: a picture or a face, a title, a big value and up to three rows.
 */
export const ContentCard: React.FC<{ w: number; h: number; inks: FamilyInks; title: string; value?: string; sub?: string; rows?: string[]; photo?: string; face?: { name: string; src?: string }; badge?: string }> = ({ w, h, inks, title, value, sub, rows = [], photo, face, badge }) => {
  const skin = skinOf('light', inks.ground);
  const pad = 30 * U;
  const tsize = 38 * U;
  const vsize = 66 * U;
  const rsize = 30 * U;
  return (
    <KitCard tone="light" w={w} h={h} ground={inks.ground} u={U}>
      <div data-ui style={{ position: 'absolute', inset: 0, padding: pad, boxSizing: 'border-box', fontFamily: KIT_FONT, display: 'flex', flexDirection: 'column', gap: 14 * U }}>
        {photo ? (
          <div data-imagery style={{ width: '100%', height: h * 0.42, borderRadius: 18 * U, overflow: 'hidden', flex: 'none' }}>
            <Img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 * U }}>
          {face ? <Face skin={skin} size={56 * U} name={face.name} src={face.src} /> : null}
          <div style={{ fontSize: tsize, fontWeight: 620, color: skin.text, letterSpacing: '-0.012em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden' }}>{title}</div>
          {/* lint-ok: a time or plan tag in the card's corner, read with the card it labels */}
          {badge ? <div style={{ marginLeft: 'auto', fontSize: 26 * U, fontWeight: 600, color: skin.accentText, background: skin.accentSoft, padding: `${6 * U}px ${14 * U}px`, borderRadius: 999 }}>{badge}</div> : null}
        </div>
        {value ? <div style={{ fontSize: vsize, fontWeight: 650, color: skin.text, letterSpacing: '-0.025em', lineHeight: 1 }}>{value}{sub ? <span style={{ fontSize: rsize, fontWeight: 500, color: skin.mute, letterSpacing: 0 }}>{` ${sub}`}</span> : null}</div> : sub ? <div style={{ fontSize: rsize, color: skin.mute, lineHeight: 1.3 }}>{sub}</div> : null}
        {rows.slice(0, 3).map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 * U, fontSize: rsize, color: skin.text, lineHeight: 1.25 }}>
            <Icon name="check" size={rsize * 0.95} color={skin.accent} weight="bold" />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{r}</span>
          </div>
        ))}
      </div>
    </KitCard>
  );
};

/**
 * A card's content on glass (fx/light Glass draws the pane): the world's glass type colour, a title, a big value and up to
 * three rows with checks; the badge in the accent; set in the card's lower part, so a word in front of the cards (a
 * giant word with cards rising behind it) crosses frosted glass, never the card's words.
 */
export const GlassCardContent: React.FC<{ w: number; h: number; title: string; value?: string; sub?: string; rows?: string[]; badge?: string }> = ({ w, h, title, value, sub, rows = [], badge }) => {
  const spec = useSpec();
  const ink = spec.glass.text;
  const mute = mixColor(ink, spec.tone === 'dark' ? spec.base : C.white, 0.38);
  const accent = spec.tone === 'dark' ? mixColor(C.accent, C.white, 0.3) : C.accent;
  return (
    <div data-ui style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, padding: 34 * U, boxSizing: 'border-box', fontFamily: KIT_FONT, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 16 * U }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 * U }}>
        <div style={{ fontSize: 40 * U, fontWeight: 620, color: ink, letterSpacing: '-0.012em', whiteSpace: 'nowrap' }}>{title}</div>
        {/* lint-ok: a plan tag in the card's corner, read with the card it labels */}
        {badge ? <div style={{ marginLeft: 'auto', fontSize: 26 * U, fontWeight: 600, color: accent, boxShadow: `inset 0 0 0 ${(1.5 * U).toFixed(2)}px ${accent}`, padding: `${5 * U}px ${14 * U}px`, borderRadius: 999 }}>{badge}</div> : null}
      </div>
      {value ? <div style={{ fontSize: 76 * U, fontWeight: 650, color: ink, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}{sub ? <span style={{ fontSize: 36 * U, fontWeight: 500, color: mute, letterSpacing: 0 }}>{` ${sub}`}</span> : null}</div> : null}
      {rows.slice(0, 3).map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 * U, fontSize: 36 * U, color: ink, lineHeight: 1.2 }}>
          <Icon name="check" size={32 * U} color={accent} weight="bold" />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{r}</span>
        </div>
      ))}
    </div>
  );
};

/** The film's content (src/content.ts), with the lists the shots draw on never empty. */
export const content = () => CONTENT;
/** The cast's first face (the product's user), if fetched. */
export const firstFace = () => CONTENT.people.find((p) => p.photo) ?? CONTENT.people[0];
