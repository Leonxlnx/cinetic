// The parts a product flow is made of: an input field with its action, a result tile, a list row that can be
// chosen, a progress pill, a chip, a label/value row and a system notice. Built at film size (px at 1080p, nothing
// under TEXT_MIN), lit by the kit's key, coloured only by the theme (the brand's accent on what matters). Every
// string and every glyph comes from the caller: a part draws no glyph the film did not pick (a link glyph on a voice
// field, a bolt on a to-do is a mismatched icon), and a result tile without a picture or a file name reports kit-empty.
import React from 'react';
import { Img } from 'remotion';
import { TEXT_MIN } from '../brand/tokens';
import { clamp, mix } from '../lib/anim';
import { mixColor } from '../lib/color';
import { KitEmpty } from './gate';
import { Button, Check, face, FileThumb, fitTitle, Glyph, GlyphTile, KIT_TYPE, Photo, surfaceShadow, useKitScale } from './parts';
import type { GlyphName } from './sample';
import { type KitTheme, lit } from './theme';

/** A text size from a part's own dimensions, never under TEXT_MIN at this scale. */
const fit = (n: number, u: number) => Math.max(TEXT_MIN * u, n);

/**
 * An input field and its action: a well with a leading glyph (or `lead`: the source's real mark on an AppIcon,
 * kit/logos.tsx), the value (children: a TypeOn, or a string), and a button. `focus` 0..1 lights its rim in the accent; `button.q` is the press, `button.flash` a one-off lift of the
 * button's face after the click (0..1, decaying), `button.label` may be typed on by the caller.
 */
export const Field: React.FC<{
  theme: KitTheme;
  w: number;
  h: number;
  glyph?: GlyphName;
  /** drawn in the glyph's place (the source's mark: <AppIcon logo=... size={h * 0.68} />) */
  lead?: React.ReactNode;
  focus?: number;
  button?: { label: React.ReactNode; w: number; q?: number; flash?: number };
  scale?: number;
  children?: React.ReactNode;
}> = ({ theme: t, w, h, glyph, lead, focus = 0, button, scale, children }) => {
  const u = useKitScale(scale);
  const pad = h * 0.16;
  return (
    <div data-ui style={{ position: 'relative', width: w, height: h, borderRadius: h / 2, background: t.surface, boxShadow: `${surfaceShadow(t, 30, u)}, inset 0 0 0 ${(2.5 * u).toFixed(2)}px ${mixColor(t.line, t.accent, clamp(focus))}`, display: 'flex', alignItems: 'center', gap: pad, padding: `0 ${pad}px`, boxSizing: 'border-box' }}>
      {lead ?? (glyph ? <GlyphTile theme={t} name={glyph} size={h - 2 * pad} /> : null)}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', ...face(fit(h * 0.36, u), 500, t.text, -0.02) }}>{children}</div>
      {button && (
        <div style={{ position: 'relative', flex: 'none', filter: button.flash ? `brightness(${(1 + 0.35 * clamp(button.flash)).toFixed(3)})` : undefined }}>
          <Button theme={t} label="" w={button.w} h={h - 2 * pad} q={button.q} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...face(fit((h - 2 * pad) * 0.42, u), 600, t.accentInk, -0.01) }}>{button.label}</div>
        </div>
      )}
    </div>
  );
};

/**
 * A result: a picture (`src`, a real photograph; without it the file it is, FileThumb), a title of up to two lines and a
 * meta line. A title longer than two lines shrinks to fit them (down to 78 %), never cut with "...".
 */
export const Tile: React.FC<{ theme: KitTheme; w: number; seed?: number; src?: string; file?: { name: string; size?: string }; title: string; meta?: string; badge?: string; id?: string; scale?: number }> = ({ theme: t, w, src, file, title, meta, badge, id = 'kit-tile', scale }) => {
  const u = useKitScale(scale);
  const ph = w * 0.5625;
  // two lines' room (a little less than 2 w: a line breaks between words); past it the size gives way, never "..."
  const tf = fitTitle(title, KIT_TYPE.label * u * 1.05, 600, w * 1.8);
  return (
    <div data-ui style={{ position: 'relative', width: w, display: 'flex', flexDirection: 'column', gap: 14 * u }}>
      <div style={{ position: 'relative', width: w, height: ph, borderRadius: 18 * u, overflow: 'hidden', boxShadow: surfaceShadow(t, 18, u) }}>
        {src ? <Photo theme={t} w={w} h={ph} src={src} /> : <FileThumb theme={t} w={w} h={ph} name={file?.name} size={file?.size} scale={scale} />}
        {badge && (
          <div style={{ position: 'absolute', right: 12 * u, bottom: 12 * u, padding: `${4 * u}px ${12 * u}px`, borderRadius: 10 * u, background: mixColor(t.ground, t.text, t.dark ? 0.05 : 0.9) }}>
            <span data-text={`${id}-badge`} style={face(KIT_TYPE.label * u, 600, t.dark ? t.text : t.ground)}>
              {badge}
            </span>
          </div>
        )}
      </div>
      <span data-text={`${id}-title`} style={{ ...face(tf.px, 600, t.text, -0.02, 1.2), whiteSpace: 'normal', display: 'block', maxHeight: tf.px * 1.2 * 2, overflow: 'hidden' }}>
        {title}
      </span>
      {meta && (
        <span data-text={`${id}-meta`} style={face(KIT_TYPE.label * u, 500, t.mute)}>
          {meta}
        </span>
      )}
    </div>
  );
};

/**
 * A row to choose: a glyph tile, a title, a meta line and a value on the right. `selected` 0..1 rings it in the
 * accent (a 3 px border and a dark halo), and turns its title to the accent.
 */
export const Row: React.FC<{ theme: KitTheme; w: number; h: number; glyph?: GlyphName; title: string; meta?: string; value?: string; selected?: number; id?: string; scale?: number }> = ({ theme: t, w, h, glyph, title, meta, value, selected = 0, id = 'kit-row', scale }) => {
  const u = useKitScale(scale);
  const s = clamp(selected);
  return (
    <div data-ui style={{ position: 'relative', width: w, height: h, borderRadius: h * 0.26, background: lit(t, t.surface, 0.04 * s), boxShadow: `${surfaceShadow(t, mix(14, 34, s), u)}, inset 0 0 0 ${(3 * u * s).toFixed(2)}px ${t.accent}, 0 0 0 ${(28 * u * s).toFixed(2)}px rgba(${t.shade.join(', ')}, ${(0.28 * s).toFixed(3)})`, display: 'flex', alignItems: 'center', gap: h * 0.2, padding: `0 ${h * 0.24}px 0 ${h * 0.18}px`, boxSizing: 'border-box' }}>
      {glyph && <GlyphTile theme={t} name={glyph} size={h * 0.62} solid={s > 0.5} />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: h * 0.04 }}>
        <span data-text={`${id}-title`} style={face(fit(h * 0.3, u), 600, mixColor(t.text, t.accent, s))}>
          {title}
        </span>
        {meta && (
          <span data-text={`${id}-meta`} style={face(fit(h * 0.22, u), 500, t.mute)}>
            {meta}
          </span>
        )}
      </div>
      {value && (
        <span data-text={`${id}-value`} style={face(fit(h * 0.3, u), 600, t.text)}>
          {value}
        </span>
      )}
    </div>
  );
};

/** A progress pill: a spinner (a ring arc turning by `spin` degrees) or a check once `done`, a label and a value (a live percentage). */
export const Pill: React.FC<{ theme: KitTheme; h: number; label: React.ReactNode; value?: string; spin?: number; done?: boolean; lead?: React.ReactNode; id?: string; scale?: number }> = ({ theme: t, h, label, value, spin = 0, done, lead, id = 'kit-pill', scale }) => {
  const u = useKitScale(scale);
  const d = h * 0.56;
  return (
    <div data-ui style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: h * 0.24, height: h, padding: `0 ${h * 0.42}px 0 ${h * 0.22}px`, borderRadius: h / 2, background: t.dark ? t.raised : t.surface, boxShadow: surfaceShadow(t, 30, u), boxSizing: 'border-box' }}>
      {lead}
      {done ? (
        <Check size={d} fill={t.accent} tick={t.accentInk} />
      ) : (
        <svg data-icon="spinner" width={d} height={d} viewBox="0 0 24 24" style={{ display: 'block', transform: `rotate(${spin.toFixed(2)}deg)` }}>
          <circle cx={12} cy={12} r={9.5} fill="none" stroke={t.well} strokeWidth={3} />
          <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" fill="none" stroke={t.accent} strokeWidth={3} strokeLinecap="round" />
        </svg>
      )}
      <span data-text={`${id}-label`} style={face(fit(h * 0.36, u), 600, t.text, -0.02)}>
        {label}
      </span>
      {value && (
        <span data-text={`${id}-value`} style={face(fit(h * 0.36, u), 600, t.accent, -0.02)}>
          {value}
        </span>
      )}
    </div>
  );
};

/** A chip: a glyph and a label on a soft pill (a source, an integration, a format). */
export const Chip: React.FC<{ theme: KitTheme; label: string; glyph?: GlyphName; h: number; on?: boolean; id?: string; scale?: number }> = ({ theme: t, label, glyph, h, on, id = 'kit-chip', scale }) => {
  const u = useKitScale(scale);
  return (
    <div data-ui style={{ display: 'inline-flex', alignItems: 'center', gap: h * 0.22, height: h, padding: `0 ${h * 0.4}px 0 ${glyph ? h * 0.2 : h * 0.4}px`, borderRadius: h / 2, background: on ? t.accent : t.surface, boxShadow: surfaceShadow(t, 16, u), boxSizing: 'border-box' }}>
      {glyph && <Glyph name={glyph} size={h * 0.52} color={on ? t.accentInk : t.accent} weight={2.4} />}
      <span data-text={id} style={face(fit(h * 0.4, u), 600, on ? t.accentInk : t.text, -0.015)}>
        {label}
      </span>
    </div>
  );
};

/** A label and its value on one line, a hairline under it (a record's field). */
export const DataRow: React.FC<{ theme: KitTheme; w: number; h: number; label: string; value: string; accent?: boolean; id?: string; scale?: number }> = ({ theme: t, w, h, label, value, accent, id = 'kit-data', scale }) => {
  const u = useKitScale(scale);
  return (
    <div data-ui style={{ position: 'relative', width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: `inset 0 -${(1.5 * u).toFixed(2)}px 0 ${t.line}` }}>
      <span data-text={`${id}-label`} style={face(fit(h * 0.42, u), 500, t.mute)}>
        {label}
      </span>
      <span data-text={`${id}-value`} style={face(fit(h * 0.42, u), 600, accent ? t.accent : t.text)}>
        {value}
      </span>
    </div>
  );
};

/** A system notice: the app's glyph tile, a title, one line of body and a time on the right (the proof stack's toast). */
export const Notice: React.FC<{ theme: KitTheme; w: number; h: number; glyph?: GlyphName; title: string; body?: string; meta?: string; id?: string; scale?: number; photo?: string }> = ({ theme: t, w, h, glyph, title, body, meta, id = 'kit-notice', scale, photo }) => {
  const u = useKitScale(scale);
  return (
    <div data-ui style={{ position: 'relative', width: w, height: h, borderRadius: h * 0.28, background: t.dark ? t.raised : t.surface, boxShadow: surfaceShadow(t, 36, u), display: 'flex', alignItems: 'center', gap: h * 0.18, padding: `0 ${h * 0.24}px 0 ${h * 0.2}px`, boxSizing: 'border-box' }}>
      {photo ? <Img data-imagery="" src={photo} style={{ width: h * 0.64, height: h * 0.64, borderRadius: h * 0.16, objectFit: 'cover', display: 'block', flex: 'none' }} /> : glyph ? <GlyphTile theme={t} name={glyph} size={h * 0.56} solid /> : null}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: h * 0.04 }}>
        <span data-text={`${id}-title`} style={face(fit(h * 0.25, u), 600, t.text)}>
          {title}
        </span>
        {body && (
          <span data-text={`${id}-body`} style={face(fit(h * 0.22, u), 500, t.mute)}>
            {body}
          </span>
        )}
      </div>
      {meta && (
        <span data-text={`${id}-meta`} style={{ ...face(fit(h * 0.2, u), 500, t.mute), alignSelf: 'flex-start', marginTop: h * 0.2 }}>
          {meta}
        </span>
      )}
    </div>
  );
};

/**
 * A prompt composer: a rounded box with the request (children: a TypeOn) at the top, and a row of controls along
 * the bottom: an add button, the model chip (`chip`), and the round send button in the accent, which a click swells
 * (`send.scale`, `send.fill` from fx/MicroUI swellState). `focus` lights the rim in the accent. Pass the product's own
 * placeholder and chip label (and `chipGlyph` when the chip has one).
 */
export const Composer: React.FC<{
  theme: KitTheme;
  w: number;
  h: number;
  chip?: string;
  chipGlyph?: GlyphName;
  focus?: number;
  send?: { scale?: number; fill?: string };
  id?: string;
  scale?: number;
  children?: React.ReactNode;
}> = ({ theme: t, w, h, chip, chipGlyph, focus = 0, send = {}, id = 'kit-composer', scale, children }) => {
  const u = useKitScale(scale);
  const pad = Math.min(h * 0.19, 44 * u);
  const ctl = Math.min(h * 0.3, 68 * u);
  const r = Math.min(h * 0.22, 44 * u);
  return (
    <div data-ui style={{ position: 'relative', width: w, height: h, borderRadius: r, background: t.surface, boxShadow: `${surfaceShadow(t, 34, u)}, inset 0 0 0 ${(2.5 * u).toFixed(2)}px ${mixColor(t.line, t.accent, clamp(focus))}`, boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', left: pad, top: pad * 0.85, right: pad, height: h - ctl - pad * 2, overflow: 'hidden', ...face(fit(Math.min(h * 0.19, 44 * u), u), 450, t.text, -0.015) }}>{children}</div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: pad * 0.75, height: ctl, display: 'flex', alignItems: 'center', gap: ctl * 0.25 }}>
        <div style={{ width: ctl, height: ctl, borderRadius: ctl * 0.3, background: t.well, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Glyph name="plus" size={ctl * 0.5} color={t.mute} />
        </div>
        {chip && (
          <div style={{ height: ctl, padding: `0 ${ctl * 0.35}px`, borderRadius: ctl * 0.3, background: t.well, display: 'flex', alignItems: 'center', gap: ctl * 0.18 }}>
            {chipGlyph && <Glyph name={chipGlyph} size={ctl * 0.42} color={t.accent} />}
            <span data-text={`${id}-chip`} style={face(fit(ctl * 0.36, u), 550, t.text, -0.01)}>
              {chip}
            </span>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ width: ctl, height: ctl, borderRadius: ctl / 2, background: send.fill ?? t.accent, transform: `scale(${(send.scale ?? 1).toFixed(4)})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Glyph name="send" size={ctl * 0.46} color={t.accentInk} weight={2.4} />
        </div>
      </div>
    </div>
  );
};

/** One token of a code line: its kind sets its colour from the theme (one hue family: keywords in the accent). */
export type CodeToken = { k: 'kw' | 'fn' | 'str' | 'num' | 'txt' | 'com'; s: string };
const codeColour = (t: KitTheme, k: CodeToken['k']) =>
  k === 'kw' ? t.accent : k === 'str' ? mixColor(t.accent, t.text, 0.45) : k === 'num' ? mixColor(t.accent, t.text, 0.25) : k === 'com' ? t.mute : k === 'fn' ? t.text : mixColor(t.text, t.mute, 0.35);

/**
 * A code panel that streams: a numbered gutter, full from the first frame (up to `gutter` rows, never past the code's own last line: no numbers over nothing), and rows of tokens arriving by line cadence
 * (`rows` shown, fractional: the current row typing through its characters). Product code reads as code in one hue
 * family (keywords in the accent, strings and numbers in its tints, comments muted). Pass the product's own code: a
 * panel given no lines draws its empty state (kit-empty), never a gutter of line numbers over nothing.
 */
export const CodePanel: React.FC<{ theme: KitTheme; w: number; lines: CodeToken[][]; rows: number; size?: number; gutter?: number; family?: string; id?: string; scale?: number }> = ({ theme: t, w, lines, rows, size, gutter = 40, family = 'ui-monospace, monospace', id = 'kit-code', scale }) => {
  const u = useKitScale(scale);
  const fs = fit(size ?? 30 * u, u);
  const lh = fs * 1.5;
  const shown = Math.floor(rows);
  const part = rows - shown;
  if (!Array.isArray(lines) || !lines.some((l) => Array.isArray(l) && l.length)) return <KitEmpty part="CodePanel" need="lines (the product's own code)" theme={t} w={w} h={Math.min(gutter, 12) * lh} r={fs * 0.4} inline />;
  return (
    <div data-ui style={{ position: 'relative', width: w, display: 'flex', gap: fs * 0.9, fontFamily: family, fontSize: fs, lineHeight: `${lh}px`, whiteSpace: 'pre' }}>
      <div style={{ flex: 'none', textAlign: 'right', color: t.mute, opacity: 0.6, minWidth: fs * 1.6 }}>
        {Array.from({ length: Math.min(gutter, lines.length) }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <div data-text={id} style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {lines.slice(0, Math.min(lines.length, shown + (part > 0 ? 1 : 0))).map((line, i) => {
          const total = line.reduce((n, tk) => n + tk.s.length, 0);
          let budget = i < shown ? total : Math.floor(part * total);
          return (
            <div key={i} style={{ height: lh }}>
              {line.map((tk, j) => {
                const s = tk.s.slice(0, Math.max(0, budget));
                budget -= tk.s.length;
                return s ? (
                  <span key={j} style={{ color: codeColour(t, tk.k), fontStyle: 'normal' }}>
                    {s}
                  </span>
                ) : null;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** A chat message from the user: a rounded bubble, right-aligned by the caller, its text from the product's own words. */
export const Bubble: React.FC<{ theme: KitTheme; text: React.ReactNode; size?: number; maxW?: number; id?: string; scale?: number }> = ({ theme: t, text, size, maxW, id = 'kit-bubble', scale }) => {
  const u = useKitScale(scale);
  const fs = fit(size ?? 38 * u, u);
  return (
    <div data-ui style={{ display: 'inline-block', maxWidth: maxW, padding: `${fs * 0.6}px ${fs * 0.8}px`, borderRadius: fs * 0.66, background: t.dark ? t.raised : t.surface, boxShadow: surfaceShadow(t, 20, u) }}>
      <span data-text={id} style={face(fs, 450, t.text, -0.01)}>
        {text}
      </span>
    </div>
  );
};
