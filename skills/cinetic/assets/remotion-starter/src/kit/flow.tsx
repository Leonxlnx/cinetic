// The parts a product flow is made of: an input field with its action, a result tile, a list row that can be
// chosen, a progress pill, a chip, a label/value row and a system notice. Built at film size (px at 1080p, nothing
// under TEXT_MIN), lit by the kit's key, coloured only by the theme (the brand's accent on what matters). Every
// string comes from the caller: pass the product's own words and data, never the slots' stand-ins in a finished film.
import React from 'react';
import { TEXT_MIN } from '../brand/tokens';
import { clamp, mix } from '../lib/anim';
import { mixColor } from '../lib/color';
import { Button, Check, face, Glyph, GlyphTile, KIT_TYPE, Photo, surfaceShadow, useKitScale } from './parts';
import type { GlyphName } from './sample';
import { type KitTheme, lit } from './theme';

/** A text size from a part's own dimensions, never under TEXT_MIN at this scale. */
const fit = (n: number, u: number) => Math.max(TEXT_MIN * u, n);

/**
 * An input field and its action: a well with a leading glyph, the value (children: a TypeOn, or a string), and a
 * button. `focus` 0..1 lights its rim in the accent; `button.q` is the press, `button.flash` a one-off lift of the
 * button's face after the click (0..1, decaying), `button.label` may be typed on by the caller.
 */
export const Field: React.FC<{
  theme: KitTheme;
  w: number;
  h: number;
  glyph?: GlyphName;
  focus?: number;
  button?: { label: React.ReactNode; w: number; q?: number; flash?: number };
  scale?: number;
  children?: React.ReactNode;
}> = ({ theme: t, w, h, glyph = 'link', focus = 0, button, scale, children }) => {
  const u = useKitScale(scale);
  const pad = h * 0.16;
  return (
    <div data-ui style={{ position: 'relative', width: w, height: h, borderRadius: h / 2, background: t.surface, boxShadow: `${surfaceShadow(t, 30, u)}, inset 0 0 0 ${(2.5 * u).toFixed(2)}px ${mixColor(t.line, t.accent, clamp(focus))}`, display: 'flex', alignItems: 'center', gap: pad, padding: `0 ${pad}px`, boxSizing: 'border-box' }}>
      <GlyphTile theme={t} name={glyph} size={h - 2 * pad} />
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

/** A result: a picture (the kit's still life, or `src`), a title of up to two lines and a meta line. */
export const Tile: React.FC<{ theme: KitTheme; w: number; seed?: number; src?: string; title: string; meta?: string; badge?: string; id?: string; scale?: number }> = ({ theme: t, w, seed = 1, src, title, meta, badge, id = 'kit-tile', scale }) => {
  const u = useKitScale(scale);
  const ph = w * 0.5625;
  return (
    <div data-ui style={{ position: 'relative', width: w, display: 'flex', flexDirection: 'column', gap: 14 * u }}>
      <div style={{ position: 'relative', width: w, height: ph, borderRadius: 18 * u, overflow: 'hidden', boxShadow: surfaceShadow(t, 18, u) }}>
        <Photo theme={t} w={w} h={ph} seed={seed} src={src} />
        {badge && (
          <div style={{ position: 'absolute', right: 12 * u, bottom: 12 * u, padding: `${4 * u}px ${12 * u}px`, borderRadius: 10 * u, background: mixColor(t.ground, t.text, t.dark ? 0.05 : 0.9) }}>
            <span data-text={`${id}-badge`} style={face(KIT_TYPE.label * u, 600, t.dark ? t.text : t.ground)}>
              {badge}
            </span>
          </div>
        )}
      </div>
      <span data-text={`${id}-title`} style={{ ...face(KIT_TYPE.label * u * 1.05, 600, t.text, -0.02, 1.2), whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
export const Row: React.FC<{ theme: KitTheme; w: number; h: number; glyph?: GlyphName; title: string; meta?: string; value?: string; selected?: number; id?: string; scale?: number }> = ({ theme: t, w, h, glyph = 'grid', title, meta, value, selected = 0, id = 'kit-row', scale }) => {
  const u = useKitScale(scale);
  const s = clamp(selected);
  return (
    <div data-ui style={{ position: 'relative', width: w, height: h, borderRadius: h * 0.26, background: lit(t, t.surface, 0.04 * s), boxShadow: `${surfaceShadow(t, mix(14, 34, s), u)}, inset 0 0 0 ${(3 * u * s).toFixed(2)}px ${t.accent}, 0 0 0 ${(28 * u * s).toFixed(2)}px rgba(${t.shade.join(', ')}, ${(0.28 * s).toFixed(3)})`, display: 'flex', alignItems: 'center', gap: h * 0.2, padding: `0 ${h * 0.24}px 0 ${h * 0.18}px`, boxSizing: 'border-box' }}>
      <GlyphTile theme={t} name={glyph} size={h * 0.62} solid={s > 0.5} />
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
        <svg width={d} height={d} viewBox="0 0 24 24" style={{ display: 'block', transform: `rotate(${spin.toFixed(2)}deg)` }}>
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
export const Notice: React.FC<{ theme: KitTheme; w: number; h: number; glyph?: GlyphName; title: string; body?: string; meta?: string; id?: string; scale?: number }> = ({ theme: t, w, h, glyph = 'bolt', title, body, meta, id = 'kit-notice', scale }) => {
  const u = useKitScale(scale);
  return (
    <div data-ui style={{ position: 'relative', width: w, height: h, borderRadius: h * 0.28, background: t.dark ? t.raised : t.surface, boxShadow: surfaceShadow(t, 36, u), display: 'flex', alignItems: 'center', gap: h * 0.18, padding: `0 ${h * 0.24}px 0 ${h * 0.2}px`, boxSizing: 'border-box' }}>
      <GlyphTile theme={t} name={glyph} size={h * 0.56} solid />
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
