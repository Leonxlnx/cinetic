import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { FONT, U } from '../brand/tokens';
import { DEAL } from '../deal';
import { DirBlur } from '../fx/Defocus';
import { Lit } from '../fx/Lit';
import { StepList } from '../fx/Loaders';
import { AppIcon, Avatar, Chip, ContentTile, face, hasLogo, KIT_TYPE, MonogramTile, Surface, type TileNode } from '../kit';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { intoCut } from '../lib/handoff';
import { ACT, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { carryIn, Ground, HOLD, GROUNDS, OPEN_EXIT, themeOf, useAbs } from './stage';

// CARD - the signature: the user's input as one lit card (fx/Lit: in the film's one light, rimmed on its key
// side, casting its shadow on the ground) carried up on the promise's speed, while the film makes its one 3D turn: the
// card swings 24 degrees round to face the viewer over 108 f, the chips beside it parallaxing. Then the same card
// becomes the output in place, by the dealt device: 'flip' turns it over through edge-on (its back is the output),
// 'sheen' sweeps a lit band across it that develops the output behind it, 'slide' runs the content through the card's
// window. The output's three steps build in it while the camera leans in, and a push into the card accelerates into
// the zoom-through that opens the proof. Continuity comes from the container, never from a cut or a one-frame jump.

/** The card at film size and the turn it makes (degrees). */
export const CARD = { w: 1340 * U, h: 760 * U, r: 44 * U, turn: { from: -36, to: 0, x: 0, frames60: 108 } } as const;
const cx = W / 2;
const cy = H / 2 + 14 * U;
const pad = 64 * U;
/** The output's preview on the card (its own screen replaces it). */
const PREVIEW = { w: 380 * U, aspect: 0.86 } as const;
const OUT_NODE = { glyph: 'doc' as const, label: WALK.output.title, sub: WALK.output.sub, preview: 'doc' as const, value: WALK.output.steps[2], seed: `${WALK.name}:output` };
/** Two people of the input's world (kit/data.ts), drawn as crafted portraits beside the card. */
/** The input's people beside the card: the first two real portraits of the feed (walk.ts photos.people); none without photos. */
const PEOPLE = (WALK.photos.people as readonly string[]).slice(0, 2).map((src, i) => ({ src: staticFile(src), initials: WALK.feed.rows[i]?.initials ?? '', seed: WALK.feed.rows[i]?.who ?? String(i) }));
/** The input's initials, its own avatar fallback when its source has no mark and no picture. */
const INPUT_INITIALS = WALK.input.title.replace(/[[\]]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'A';

/** The transformation's progress 0..1 (44 f on E.strongInOut from CUE.swap). */
export const turnAt = (F: number) => prog(F, CUE.swap, CUE.swap + f60x(44), E.strongInOut);

/** The camera's scale: lean in on the rows, then the push into the card that runs into the zoom-through. */
export const cardK = (F: number) => lmix(1, 1.1, prog(F, CUE.lean, CUE.lean + f60x(72), E.settleOut)) * lmix(1, 1.6, intoCut(F, ACT.proof.from, 30, FPS));

/** The input's face of the card (the open's 'card' device shows it rising before the act). */
export const InputFace: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const t = themeOf('card');
  const nodes: TileNode[] = WALK.results.slice(0, 4).map((r, i) => ({ label: r.title, sub: r.meta, seed: `${WALK.name}:input${i}` }));
  const tile = (w - 2 * pad - 3 * 16 * U) / 4;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${pad}px, ${pad}px, 0)` }}>
        {hasLogo(WALK.input.source) ? (
          <AppIcon logo={WALK.input.source} size={150 * U} theme={t} lift={16} />
        ) : WALK.photos.input ? (
          <Img src={staticFile(WALK.photos.input)} style={{ width: 150 * U, height: 150 * U, borderRadius: 36 * U, objectFit: 'cover', display: 'block' }} />
        ) : (
          <MonogramTile theme={t} seed={WALK.input.title} initials={INPUT_INITIALS} size={150 * U} font={(px, w, c) => face(px, w, c, 0)} />
        )}
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${pad + 180 * U}px, ${pad + 22 * U}px, 0)`, display: 'flex', flexDirection: 'column', gap: 8 * U }}>
        <span data-text="card-title-in" style={face(KIT_TYPE.head * U, 650, t.text, -0.03)}>
          {WALK.input.title}
        </span>
        <span data-text="card-sub-in" style={face(KIT_TYPE.body * U, 500, t.mute)}>
          {WALK.input.handle}
        </span>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${pad}px, ${250 * U}px, 0)`, display: 'flex', gap: 18 * U }}>
        {WALK.input.stats.map((s, i) => (
          <Chip key={i} theme={t} label={s} h={64 * U} id={`card-stat-${i}`} />
        ))}
      </div>
      {/* a strip of what the input holds, drawn as content tiles (the product's own previews replace them) */}
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${pad}px, ${h - tile - pad}px, 0)`, display: 'flex', gap: 16 * U }}>
        {nodes.map((n, i) => (
          <ContentTile key={i} node={n} theme={t} w={tile} lift={8} />
        ))}
      </div>
    </div>
  );
};

const OutputFace: React.FC<{ w: number; h: number; F: number }> = ({ w, h, F }) => {
  const t = themeOf('card');
  const sub = prog(F, CUE.sub, CUE.sub + f60x(30), E.glideOut);
  const dev = prog(F, CUE.done1, CUE.done3 + f60x(20), E.stdInOut);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${pad}px, ${pad}px, 0)`, display: 'flex', flexDirection: 'column', gap: 10 * U }}>
        <span data-text="card-title-out" style={face(KIT_TYPE.head * U, 650, t.text, -0.03)}>
          {WALK.output.title}
        </span>
        <span data-text="card-sub-out" style={{ ...face(KIT_TYPE.body * U, 500, t.mute), opacity: sub, transform: `translate3d(0, ${((1 - sub) * 16 * U).toFixed(2)}px, 0)` }}>
          {WALK.output.sub}
        </span>
      </div>
      {/* the output forming beside its steps: a preview that develops from ghost to colour as each step checks */}
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(w - pad - PREVIEW.w).toFixed(2)}px, ${(h - pad - PREVIEW.w / PREVIEW.aspect).toFixed(2)}px, 0)` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, filter: 'grayscale(1) contrast(0.5) brightness(1.3)', opacity: 1 - dev }}>
          <ContentTile node={OUT_NODE} theme={t} w={PREVIEW.w} aspect={PREVIEW.aspect} lift={10} />
        </div>
        <div style={{ position: 'absolute', left: 0, top: 0, opacity: dev }}>
          <ContentTile node={OUT_NODE} theme={t} w={PREVIEW.w} aspect={PREVIEW.aspect} lift={10} />
        </div>
      </div>
      {F >= CUE.row1 - 1 && (
        <StepList
          frame={F}
          rows={[
            { at: CUE.row1, done: CUE.done1 },
            { at: CUE.row2, done: CUE.done2 },
            { at: CUE.row3, done: CUE.done3 },
          ]}
          rowH={110}
          rise={26}
          partial={0}
          labels={WALK.output.steps.map((s) => ({ verb: s }))}
          x={pad}
          y={250 * U}
          width={w - 3 * pad - PREVIEW.w}
          font={{ size: KIT_TYPE.body * U, weight: 560, family: FONT.text }}
          colors={{ ink: t.text, mute: t.mute, accent: t.accent, ground: t.raised }}
        />
      )}
    </div>
  );
};

export const Card: React.FC = () => {
  const F = useAbs('card');
  const t = themeOf('card');
  const g = GROUNDS.card.base;
  const carried = carryIn('card', F, OPEN_EXIT.vCut); // the whole frame arrives on the promise's speed
  const cv = carried - carryIn('card', F - 1, OPEN_EXIT.vCut);
  const d = HOLD; // the hold rests between moves (no drift)
  // the film's one 3D turn: the card swings round and lands face-on to the viewer (a declared object move, never a resting tilt)
  const swing = prog(F, CUE.rise + f60x(4), CUE.rise + f60x(4 + CARD.turn.frames60), E.strongInOut);
  const yaw = mix(CARD.turn.from, CARD.turn.to, swing);
  const p = turnAt(F);
  const k = cardK(F);
  // the transformation's tilt and faces
  let tiltX = mix(18, CARD.turn.x, swing);
  let face: 'in' | 'out' | 'both' = F < CUE.swap ? 'in' : p >= 1 ? 'out' : 'both';
  if (DEAL.turn === 'flip' && F >= CUE.swap && p < 1) {
    tiltX = p < 0.5 ? mix(CARD.turn.x, 90, p / 0.5) : mix(-90, CARD.turn.x, (p - 0.5) / 0.5);
    face = p < 0.5 ? 'in' : 'out';
  }
  const band = mix(-0.2, 1.2, p); // 'sheen': the band's centre across the card (share of its width)
  const slide = DEAL.turn === 'slide' ? p : 0;
  const slideV = DEAL.turn === 'slide' ? (turnAt(F) - turnAt(F - 1)) * CARD.w : 0;
  // the chips beside the card parallax with the turn (near plane: they slide furthest)
  const near = (yaw - CARD.turn.to) * 7 * U;
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <DirBlur v={cv / U} axis="y" id="card-carry">
        <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${d.x.toFixed(3)}px, ${(carried + d.y).toFixed(3)}px, 0)` }}>
          <Ground act="card" F={F} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${cx}px ${cy + 60 * U}px`, transform: `scale(${k.toFixed(5)})` }}>
            <Lit frame={F} x={cx} y={cy} w={CARD.w} h={CARD.h} r={CARD.r} tilt={{ x: tiltX, y: yaw }} ground={g} id="card">
              <Surface theme={t} w={CARD.w} h={CARD.h} tone="raised" lift={4} r={CARD.r}>
                {DEAL.turn === 'slide' && face === 'both' ? (
                  <DirBlur v={slideV / U} axis="x" id="card-slide">
                    <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${(-slide * CARD.w).toFixed(2)}px, 0, 0)` }}>
                      <InputFace w={CARD.w} h={CARD.h} />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${((1 - slide) * CARD.w).toFixed(2)}px, 0, 0)` }}>
                      <OutputFace w={CARD.w} h={CARD.h} F={F} />
                    </div>
                  </DirBlur>
                ) : DEAL.turn === 'sheen' && face === 'both' ? (
                  <>
                    <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${(clamp(band) * 100).toFixed(2)}%)` }}>
                      <InputFace w={CARD.w} h={CARD.h} />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${((1 - clamp(band)) * 100).toFixed(2)}% 0 0)` }}>
                      <OutputFace w={CARD.w} h={CARD.h} F={F} />
                    </div>
                    {/* the lit band that develops the output: one soft bar of the key's light crossing the face */}
                    <div style={{ position: 'absolute', left: 0, top: 0, width: CARD.w * 0.34, height: CARD.h, transform: `translate3d(${((band - 0.17) * CARD.w).toFixed(2)}px, 0, 0)`, background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${(0.34 * Math.sin(Math.PI * p)).toFixed(3)}) 50%, rgba(255,255,255,0) 100%)` }} />
                  </>
                ) : face === 'out' ? (
                  <OutputFace w={CARD.w} h={CARD.h} F={F} />
                ) : (
                  <InputFace w={CARD.w} h={CARD.h} />
                )}
              </Surface>
            </Lit>
            {/* the input's people as portraits in the near plane, parallaxing with the turn and dropping away once it is the output */}
            {PEOPLE.map((p, i) => {
              const out = prog(F, CUE.swap, CUE.swap + f60x(30), E.buildIn);
              if (out >= 1) return null;
              const x = (i ? cx + CARD.w * 0.6 : cx - CARD.w * 0.62) + near * (i ? 1.1 : 1.35);
              const y = (i ? cy - CARD.h * 0.4 : cy + CARD.h * 0.34) + out * 60 * U;
              return (
                <div key={i} style={{ position: 'absolute', left: 0, top: 0, opacity: 1 - out, transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%)` }}>
                  <Avatar theme={t} i={i} initials={p.initials} seed={p.seed} src={p.src} size={(i ? 120 : 150) * U} ring={t.surface} />
                </div>
              );
            })}
          </div>
        </div>
      </DirBlur>
    </AbsoluteFill>
  );
};
