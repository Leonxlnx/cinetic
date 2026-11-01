/**
 * cinetic:light the world's key on the hero shots: glass rims and sweeps, a page's lit edge, a porthole's rim band
 *
 * The hero shots: the shots that carry a film's production value (deal.ts HERO_META says what each is; timeline.ts
 * HERO_PLAN where it plays; src/hero/time.ts when its moments land). Each one stands in the film's world (src/world.tsx)
 * and keeps the house habits in every frame: one sharp plane and a graded blur ladder (fx/depth: the lens gives each
 * plane the defocus of its depth), one camera move that has a job, front-loaded, landing (fx/depth shots, never a
 * drift), glass as a lens on the world (fx/light Glass frosts the real ground), light sized to its source and timed (a
 * band of light as the pane lands, a glow the size of the button as it is pressed), real content in quantity (the
 * film's own src/content.ts in the kit's macro screens), a scale jump (a macro close-up, a giant word), a smear only on
 * fast frames (the stage draws it from each plane's speed). Cards face the camera; a turn is the shot's own designed
 * move. The film's seed varies each shot inside its recipe (the side the camera stands on, the way a ring turns), so two
 * films dealt the same shot still differ; the product's own content makes the rest its own.
 */
import React, { useMemo } from 'react';
import { Img, Sequence, useCurrentFrame } from 'remotion';
import { C, FONT, U } from '../brand/tokens';
import { LogoMark } from '../brand/Mark';
import * as BRAND_LOGO from '../brand/logo';
import { type Box, type Cam, camera, type Frame, crane, FanFocus, follow, frame, frameOf, type FramingFn, macro, pageTravelCamera, Plane, pull, push, PushIn, rack, restCam, Stage3D, type V3 } from '../fx/depth/index';
import { Glass, RimLight } from '../fx/light';
import { Cursor } from '../fx/Cursor';
import type { FamilyInks } from '../fx/Grounds';
import { TYPE_FEATURES } from '../fx/TypePairs';
import { DocPage, docPageLayout, Face, Icon, NoticeStack, PromptBar, promptBarLayout, type PromptBarProps, SCREEN, textW, typedAt } from '../kit/screens';
import { KIT_FONT } from '../kit/parts';
import { clamp, E, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { useFilm } from '../lib/film';
import { measureTracked } from '../lib/measure';
import { Soft } from '../acts/layer';
import { keyed, Line, LINE_TYPE, lineLayout, trackFor, weightOf } from '../acts/line';
import { copy, H, HERO_PLAN, keyWords, W } from '../timeline';
import { timingFail } from '../lib/continuity';
import { FilmWorld, SCREEN_TONE } from '../world';
import { Bloom1, ContentCard, content, cpsFor, firstFace, GlassCardContent, InputContent, inputSend, k60, LineExit, useSkin, useSpec } from './parts';
import { heroTimes } from './time';

// what a placed shot needs from the film's content: precheck names it (the ship gate fails it)
if (HERO_PLAN.some((h) => h.id === 'carousel') && content().thumbs.filter((x) => x.src).length < 3)
  timingFail('hero', "hero: the carousel rings the film's real pictures and src/content.ts has fewer than three (node scripts/content.mjs --brief BRIEF.md --fetch --force, or photos named in thumbs[].src), or swap it in launch.ts heroes.swap with the reason");

export type HeroPicProps = { id: string; f: number; dur: number; F: number; inks: FamilyInks; pair: number; seed: number; scene?: (f: number) => React.ReactNode; button?: Box; focus?: Box };
export type HeroOverProps = { id: string; f: number; dur: number; F: number; from: number; inks: FamilyInks; pair: number; seed: number; line: { id: string; raw: string } };
export type HeroLineProps = { id: string; F: number; inks: FamilyInks; pair: number; seed: number; line: { id: string; raw: string }; until: number };

/** A framing as an opening camera (the fields it sets), from the house's 1:1 camera on the design frame. */
const openOf = (fr: FramingFn): Partial<Cam> => {
  const t = fr(restCam(frameOf(W, H)), frameOf(W, H));
  return { target: t.target, dist: t.dist, lens: t.lens, yaw: t.yaw, pitch: t.pitch };
};
/** The side a shot's camera stands on, from the film's seed (two films dealt the same shot see it from either side). */
const sideOf = (seed: number) => (seed % 2 === 0 ? 1 : -1);
/**
 * The depth stage's ground: none of its own. The film's world (src/world.tsx FilmWorld, drawn once under every act, soft
 * after the opening rack) is the ground every shot stands in; a shot that drew its own full-frame copy of it carried
 * that copy through the seams with its pictures (a box of the world sliding off with a whip, a dark rectangle as the
 * shot darkened under the next line). Light that belongs to the place goes in the world (fx/world), light that belongs
 * to the shot inside its planes (fx/light).
 */
const StageGround: React.FC = () => null;

// ------------------------------------------------------------------------------------------------ glass-input (over)

/**
 * The line over the world and under it the product's input as frosted glass. The camera pushes in once (front-loaded,
 * landing as the typing ends): the line and the glass, nearer, grow more than the world behind them; the glass rises
 * into place as the line builds, a band of light crosses it as it lands; the request types once the line is read, the
 * newest word in the accent; send is pressed, a second band crosses, a glow the size of the button blooms.
 */
const GlassInput: React.FC<HeroOverProps> = ({ f, dur, F, from, inks, line }) => {
  const film = useFilm();
  const fps = film.fps;
  const spec = useSpec();
  const c = copy(line.id);
  const t = heroTimes('glass-input', dur, fps, c.resolved - from);
  const C0 = content();
  const text = C0.prompt.text;
  const m = E.glideOut(clamp((f - t.move[0]) / t.move[1]));
  const words = keyWords(line.raw).map((x) => x.word).join(' ');
  const { size, rows } = lineLayout(words, false, true);
  const lineH = rows.length * size * LINE_TYPE.lead;
  const ph = 136 * U;
  const pw = Math.min(1400 * U, Math.max(1120 * U, textW(text, ph * 0.3, 450) + ph * 3.6));
  const gap = 64 * U;
  const block = lineH + gap + ph;
  const top = H / 2 - block / 2;
  const px = (W - pw) / 2;
  const py = top + lineH + gap;
  const sd = inputSend(pw, ph);
  const cps = cpsFor(text, t.at.typeEnd - t.at.type, fps);
  return (
    <FilmWorld F={F} fps={fps} frame={f} push={{ from: t.move[0], to: t.move[0] + t.move[1], scale: 1.035, ease: E.glideOut }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${W / 2}px ${(top + block / 2).toFixed(1)}px`, transform: `scale(${(1 + 0.075 * m).toFixed(5)})` }}>
        <LineExit F={F} out={c.out} fps={fps} shadow={spec.typeShadow}>
          <Line id={line.id} raw={line.raw} F={F} inks={{ ...inks, type: spec.ink }} cy={top + lineH / 2} />
        </LineExit>
        <Glass x={px} y={py} w={pw} h={ph} at={t.at.rise} sweep={[t.at.land, t.at.send]} frame={f}>
          <InputContent w={pw} h={ph} f={f} fps={fps} text={text} placeholder={C0.prompt.placeholder} at={t.at.type} cps={cps} send={t.at.send} />
        </Glass>
        <Bloom1 f={f} at={t.at.send + k60(6, fps)} x={px + sd.x} y={py + sd.y} r={sd.r * 2.4} fps={fps} />
      </div>
    </FilmWorld>
  );
};

// ------------------------------------------------------------------------------------------------ macro-type (picture)

/**
 * The product's input at macro scale: the bar is as wide as its request, the camera pushes onto the first characters
 * (x2.2) as the first keys land and rides the caret (trailing it), the world soft behind; as the typing stops it pulls
 * back to the whole bar, so the request is read whole and sharp before anything happens to it; then a soft pointer
 * reaches send and presses it and a glow the size of the button blooms on the button.
 */
export const MACRO_TYPE = { mag: 2.2, fill: 0.86, pull: 34 } as const;
const MacroTypeShot: React.FC<HeroPicProps> = ({ f, dur, inks }) => {
  const film = useFilm();
  const fps = film.fps;
  const t = heroTimes('macro-type', dur, fps);
  const C0 = content();
  const text = C0.prompt.text;
  const pt = SCREEN.pt * U;
  const fontPx = 22 * pt;
  const wPx = clamp((66 + 16 + 24 + 16 + 52 + 8 + 36) * pt + textW(text, fontPx, 450), 520 * pt, 940 * pt);
  const p: PromptBarProps = { text, placeholder: C0.prompt.placeholder, at: t.at.type, cps: cpsFor(text, t.at.typeEnd - t.at.type, fps), send: t.at.send, tone: SCREEN_TONE, ground: inks.ground, size: 'lg', w: wPx, model: C0.prompt.model, mic: true, pt };
  const L0 = promptBarLayout(p, 0, { pt, fps });
  const box: Box = { x: (W - L0.w) / 2, y: (H - L0.h) / 2, w: L0.w, h: L0.h };
  const cam = useMemo(() => {
    const caret = (g: number): V3 => {
      const L = promptBarLayout(p, g, { pt, fps });
      const k = L.focus.caret;
      return [box.x + k.x + k.w / 2, box.y + k.y + k.h / 2, 0];
    };
    const lag = k60(24, fps);
    const fo = t.move[0] + t.move[1];
    return camera(
      [
        push(t.move[0], (from: Cam, fr: Frame) => ({ ...macro(box, { mag: MACRO_TYPE.mag, yaw: 0 })(from, fr), target: caret(fo) }), { frames: t.move[1], film, id: 'macro-push' }),
        follow(fo, caret, { frames: Math.max(lag + 1, t.at.pull - fo), lag, film, id: 'macro-follow' }),
        pull(t.at.pull, frame(box, { fill: MACRO_TYPE.fill }), { frames: k60(MACRO_TYPE.pull, fps), film, id: 'macro-read' }),
      ],
      { film, base: { ...openOf(frame(box, { fill: 0.84, anchor: [0.36, 0.5] })), yaw: 0 } },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, dur, fps, wPx]);
  const L = promptBarLayout(p, f, { pt, fps });
  const s = L.focus.send;
  const sx = box.x + s.x + s.w / 2;
  const sy = box.y + s.y + s.h / 2;
  const reach = E.strongInOut(prog(f, t.at.point - k60(20, fps), t.at.send - k60(2, fps)));
  const press = f < t.at.send ? 0 : 1 - E.buildIn(prog(f, t.at.send + k60(6, fps), t.at.send + k60(18, fps)));
  const showPointer = f >= t.at.point - k60(20, fps);
  return (
    <Stage3D camera={cam} ground={<StageGround />}>
      <Plane id="macro-bar" box={box}>
        <PromptBar {...p} frame={f} />
      </Plane>
      <Plane id="macro-glow" box={{ x: sx - s.w * 1.4, y: sy - s.w * 1.4, w: s.w * 2.8, h: s.w * 2.8 }} z={2} dof={false} smear={false}>
        <Bloom1 f={f} at={t.at.send + k60(4, fps)} x={s.w * 1.4} y={s.w * 1.4} r={s.w * 1.35} fps={fps} />
      </Plane>
      {showPointer ? (
        <Plane id="macro-pointer" box={{ x: sx - 4, y: sy - 4, w: 80 * U, h: 80 * U }} z={18} dof={false} move={() => ({ x: mix(150 * U, 0, reach), y: mix(110 * U, 0, reach), opacity: clamp((f - (t.at.point - k60(20, fps))) / k60(8, fps)) })}>
          <Cursor x={4} y={4} scale={1.25 * U} shape="pointer" fill={C.white} outline={C.ink} press={press} />
        </Plane>
      ) : null}
    </Stage3D>
  );
};

// ------------------------------------------------------------------------------------------------ black-glass (picture)

/**
 * The product's composer as a frosted pane focusing in out of the dark: its defocus clears in 9 f (half of it in the
 * first 3), a light runs along its rim, the camera's one push lands, the request types once it is sharp, its chips
 * below (the model, the file it was given), send pressed with a band of light across the pane.
 */
const BlackGlass: React.FC<HeroPicProps> = ({ f, dur }) => {
  const film = useFilm();
  const fps = film.fps;
  const spec = useSpec();
  const t = heroTimes('black-glass', dur, fps);
  const C0 = content();
  const text = C0.prompt.text;
  const w = 1180 * U;
  const h = 272 * U;
  const x = (W - w) / 2;
  const y = (H - h) / 2 + 24 * U;
  const sharp = E.glideOut(prog(f, t.at.rack, t.at.sharp));
  const sigma = 7.5 * U * (1 - sharp);
  const m = E.glideOut(clamp((f - t.move[0]) / t.move[1]));
  const s = mix(0.94, 1.06, m);
  const ink = spec.glass.text;
  const mute = mixColor(ink, spec.tone === 'dark' ? spec.base : C.white, 0.45);
  const cps = cpsFor(text, t.at.typeEnd - t.at.type, fps);
  const typed = typedAt(text, f, { at: t.at.type, cps, fps, seed: text });
  const px = 50 * U;
  const chipH = 58 * U;
  const chips = [C0.prompt.model ?? 'Auto', C0.prompt.attach?.name].filter(Boolean) as string[];
  const sendD = 72 * U;
  const press = f < t.at.send ? 0 : 1 - E.buildIn(prog(f, t.at.send + k60(8, fps), t.at.send + k60(20, fps)));
  const label = C0.prompt.placeholder;
  return (
    <div style={{ position: 'absolute', inset: 0, transformOrigin: `${W / 2}px ${(y + h / 2).toFixed(1)}px`, transform: `scale(${s.toFixed(5)})` }}>
      <Soft sigma={sigma}>
        <div data-text="black-glass-label" style={{ position: 'absolute', left: 0, top: y - 84 * U, width: W, textAlign: 'center', fontFamily: KIT_FONT, fontSize: 36 * U, fontWeight: 500, color: mute, letterSpacing: '-0.006em' }}>{label}</div>
        <Glass x={x} y={y} w={w} h={h} r={40 * U} sweep={[t.at.glint, t.at.send]} sweepKind="edge" frame={f}>
          <div data-ui data-screen="composer" style={{ position: 'absolute', inset: 0, fontFamily: KIT_FONT }}>
            <div data-text="composer" style={{ position: 'absolute', left: 44 * U, top: 46 * U, right: 44 * U, fontSize: px, fontWeight: 450, color: ink, letterSpacing: '-0.006em', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {typed.n ? typed.shown : <span style={{ color: mute }}>{label}</span>}
              <span style={{ display: 'inline-block', width: Math.max(2, 2.6 * U), height: px * 1.1, marginLeft: 3 * U, verticalAlign: 'middle', background: ink, opacity: typed.done && Math.floor((f - t.at.typeEnd) / k60(32, fps)) % 2 === 1 ? 0 : 1 }} />
            </div>
            <div style={{ position: 'absolute', left: 36 * U, bottom: 34 * U, display: 'flex', gap: 14 * U, alignItems: 'center' }}>
              <div style={{ width: chipH, height: chipH, borderRadius: '50%', boxShadow: `inset 0 0 0 ${(1.5 * U).toFixed(2)}px ${mixColor(ink, spec.base, 0.7)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={chipH * 0.5} color={mute} />
              </div>
              {chips.map((ch, i) => (
                <div key={i} style={{ height: chipH, borderRadius: chipH / 2, padding: `0 ${24 * U}px`, display: 'flex', alignItems: 'center', gap: 10 * U, boxShadow: `inset 0 0 0 ${(1.5 * U).toFixed(2)}px ${mixColor(ink, spec.base, 0.7)}`, fontSize: 36 * U, color: mute, whiteSpace: 'nowrap' }}>
                  <Icon name={i === 0 ? 'cpu' : 'clip'} size={34 * U} color={mute} />
                  {ch}
                </div>
              ))}
            </div>
            <div style={{ position: 'absolute', right: 34 * U, bottom: 26 * U, width: sendD, height: sendD, borderRadius: '50%', background: typed.n ? C.white : mixColor(ink, spec.base, 0.8), transform: `scale(${(1 - 0.12 * press).toFixed(4)})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrowUp" size={sendD * 0.46} color={typed.n ? C.ink : mute} weight="bold" />
            </div>
          </div>
        </Glass>
      </Soft>
      <Bloom1 f={f} at={t.at.send + k60(4, fps)} x={x + w - 34 * U - sendD / 2} y={y + h - 26 * U - sendD / 2} r={sendD * 1.25} fps={fps} />
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ page-fly (picture)

/**
 * The page the product makes flies in lying back in perspective (from deep and low, landing in 30 f) and the camera
 * travels it from its headline to its table (one move, the roll unwinding), the far edge soft (a defocus that varies
 * across the page), a thin light along the edge that faces the world's key.
 */
const PageFly: React.FC<HeroPicProps> = ({ dur, seed }) => {
  const film = useFilm();
  const fps = film.fps;
  const t = heroTimes('page-fly', dur, fps);
  const C0 = content();
  const side = sideOf(seed);
  const pt = SCREEN.pt * U;
  const doc = { ...C0.doc, tone: 'light' as const, pt };
  const L = docPageLayout(doc, 0, { pt });
  const ti = L.focus.title ?? { x: L.w * 0.1, y: L.h * 0.1, w: L.w * 0.8, h: 120 };
  const tb = L.focus.table ?? L.focus.para1 ?? L.focus.para0 ?? { x: L.w * 0.1, y: L.h * 0.6, w: L.w * 0.8, h: 200 };
  const plan = useMemo(
    () => pageTravelCamera({ size: [L.w, L.h], from: [ti.x + ti.w * 0.5, ti.y + ti.h * 0.65], to: [tb.x + tb.w * 0.5, tb.y + Math.min(tb.h, 260 * U) * 0.5], at: t.move[0], frames: t.move[1], look: { pitch: -44, yaw: 15 * side, roll: [-8 * side, -3 * side], mag: [1.18, 1.5] } }, film),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [L.w, L.h, dur, fps, side],
  );
  const fly = (g: number) => {
    const e = E.glideOut(clamp((g - t.at.fly) / Math.max(1, t.at.land - t.at.fly)));
    return { z: -1500 * (1 - e), y: 420 * (1 - e), opacity: clamp(e * 2.5) };
  };
  return (
    <Stage3D camera={plan.cam} ground={<StageGround />}>
      <Plane id="page" box={plan.box} dof="plane" move={fly}>
        <DocPage {...doc} frame={60 * fps} />
        <RimLight w={L.w} h={L.h} r={10 * U} />
      </Plane>
    </Stage3D>
  );
};

// ------------------------------------------------------------------------------------------------ toast-stack (picture)

/**
 * What the product sets off, as notifications: each new one drops into the front slot and pushes the others one slot
 * back (up a third of a card and away in depth), so the front one is sharp and each further back is softer: the lens
 * gives the ladder. The stack faces the camera square and centred, and the camera stands square in front of it on a
 * long lens (85 mm: a card off the axis never keystones into a tilted card) and makes one straight push that lands on
 * the front card. Each card says how long ago by its place in the stack, newest first ("now" in front, older behind it),
 * so the times always run the right way when paused, whatever order the content lists them in.
 */
export const TOAST_STACK = { lens: 85, step: 0.34, z: -260, push: 1.16, y: 0.56, pt: 1.3, ago: ['now', '1m', '3m', '6m', '9m'] } as const;
/** The time a notice shows in slot k of the stack (0 the front, the newest): content's own times when they run newest
 * first in that order, else the house ladder. */
export const toastAgo = (agos: string[], k: number): string => {
  const mins = agos.map((a) => (/^now$/i.test(a.trim()) ? 0 : Number((/(\d+)/.exec(a) ?? [])[1] ?? NaN)));
  const ordered = mins.every((m, i) => Number.isFinite(m) && (i === 0 || m <= mins[i - 1])); // arrival order: oldest first
  if (ordered && mins.length) {
    const byNewest = [...agos].reverse();
    return byNewest[Math.min(k, byNewest.length - 1)];
  }
  return TOAST_STACK.ago[Math.min(k, TOAST_STACK.ago.length - 1)];
};
const ToastStack: React.FC<HeroPicProps> = ({ dur, inks }) => {
  const film = useFilm();
  const fps = film.fps;
  const t = heroTimes('toast-stack', dur, fps);
  const C0 = content();
  const items = C0.notices.items.slice(0, (t.seq ?? []).length);
  const seq = (t.seq ?? []).slice(0, items.length);
  const agos = items.map((n) => n.ago ?? '');
  const pt = SCREEN.pt * U * TOAST_STACK.pt;
  const w = 540 * pt;
  const ch = 96 * pt;
  const y0 = H * TOAST_STACK.y;
  const step = { y: -ch * TOAST_STACK.step, z: TOAST_STACK.z };
  const cam = useMemo(
    () =>
      camera([push(t.move[0], (from: Cam) => ({ target: [W / 2, y0 - ch * 0.3, 0] as V3, dist: from.dist / TOAST_STACK.push, yaw: 0, pitch: 0, roll: 0 }), { frames: t.move[1], ease: E.glideOut, film, id: 'toast-push' })], {
        film,
        base: { target: [W / 2, y0 - ch * 0.45, 0], lens: TOAST_STACK.lens, yaw: 0, pitch: 0, roll: 0, focus: [W / 2, y0, 0] },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dur, fps],
  );
  return (
    <Stage3D camera={cam} ground={<StageGround />}>
      {items.map((it, j) => {
        // how many have arrived after it (each pushes it back one slot on a glide): its slot, and the time it shows
        const backOf = (g: number) => {
          let back = 0;
          for (let k = j + 1; k < seq.length; k++) back += E.strongInOut(clamp((g - seq[k]) / k60(18, fps)));
          return back;
        };
        const move = (g: number) => {
          const enter = E.snapOut(clamp((g - seq[j]) / k60(16, fps)));
          const s = backOf(g);
          return { y: step.y * s + (1 - enter) * ch * 0.9, z: step.z * s + (1 - enter) * 120, opacity: g < seq[j] ? 0 : clamp(enter * 2) * clamp(4.6 - s) };
        };
        // the label changes only while the card is pushed back (soft, moving): paused, the times always run newest first
        return (
          <Plane key={j} id={`toast-${j}`} box={{ x: (W - w) / 2, y: y0 - ch / 2, w, h: ch }} move={move} order={j}>
            <ToastCard item={it} ago={(g) => toastAgo(agos, Math.round(backOf(g)))} inks={inks} w={w} pt={pt} />
          </Plane>
        );
      })}
    </Stage3D>
  );
};
/** The product's own mark for its own notifications (a notice marked `own`, or from app 'self'): the brand's mark once
 * scripts/brand.py has written it; until then the notice keeps its glyph. */
export const ownMark = (BRAND_LOGO as { LOGO_STANDIN?: boolean }).LOGO_STANDIN === true ? undefined : (size: number) => <LogoMark logo={BRAND_LOGO.LOGO} size={size} />;
/** One notice of the stack, its time read from its slot at the frame the plane draws. */
const ToastCard: React.FC<{ item: ReturnType<typeof content>['notices']['items'][number]; ago: (g: number) => string; inks: FamilyInks; w: number; pt: number }> = ({ item, ago, inks, w, pt }) => {
  const g = useCurrentFrame();
  const it = item as typeof item & { own?: boolean; app?: unknown };
  const own = !!it.own || it.app === 'self';
  return <NoticeStack items={[{ ...item, app: own ? undefined : (item.app as never), own, ago: ago(g) }]} mode="list" tone="light" ground={inks.ground} w={w} pt={pt} frame={600} ownMark={ownMark} />;
};

// ------------------------------------------------------------------------------------------------ fan-focus (picture)

/** Many results as cards fanned back in depth (each a real person and what they said), the camera to one side closing on
 * the one that matters while the focus racks from the front card to it. */
const FanFocusShot: React.FC<HeroPicProps> = ({ dur, inks, seed }) => {
  const film = useFilm();
  const fps = film.fps;
  const t = heroTimes('fan-focus', dur, fps);
  const C0 = content();
  const cmts = C0.comments.comments.slice(0, 5);
  const cw = 700 * U;
  const chh = 230 * U;
  const cards = cmts.map((c, i) => (
    <div key={i} style={{ position: 'absolute', inset: 0 }}>
      <ContentCard w={cw} h={chh} inks={inks} title={c.name} sub={c.text} face={{ name: c.name, src: c.photo }} badge={c.ago} />
    </div>
  ));
  return <FanFocus cards={cards} size={[cw, chh]} focus={Math.min(2, cards.length - 1)} at={t.at.push} enter={-Math.round(k60(30, fps))} side={sideOf(seed) as 1 | -1} ground={<StageGround />} />;
};

// ------------------------------------------------------------------------------------------------ rise-behind (over)

/**
 * The line's key word giant in the middle of the frame (the rest of the line small above it), three cards of the
 * product's own content rising behind it while the camera pulls back from the word; the focus holds the word, then
 * racks to the cards as the reveal lands; the line leaves on its own at the end.
 */
const RiseBehindShot: React.FC<HeroOverProps> = ({ f, dur, F, from, inks, line }) => {
  const film = useFilm();
  const fps = film.fps;
  const spec = useSpec();
  const c = copy(line.id);
  const t = heroTimes('rise-behind', dur, fps, c.resolved - from);
  const C0 = content();
  const words = keyed(keyWords(line.raw));
  const ki = Math.max(0, words.findIndex((x) => x.key || x.strong));
  const key = words[ki]?.word ?? '';
  const rest = words.filter((_, i) => i !== ki).map((x) => x.word);
  const small = rest.length ? `${words.slice(0, ki).map((x) => x.word).join(' ')}${ki > 0 && ki < words.length - 1 ? ' … ' : ' '}${words.slice(ki + 1).map((x) => x.word).join(' ')}`.trim() : '';
  const gsize = Math.min(300 * U, (W * 0.66) / Math.max(1, key.length * 0.56));
  const gw = Math.min(W * 0.9, measureTracked(key, gsize, 760, -0.04, FONT.text, { trailing: false }) + gsize * 0.2);
  // the word stands over the cards' upper glass, their words set low in them: it crosses glass, never their words
  const wordBox: Box = { x: (W - gw) / 2, y: H * 0.39 - gsize * 0.6, w: gw, h: gsize * 1.2 };
  const plans = C0.plans.plans.slice(0, 3);
  const cw = 500 * U;
  const chh = 640 * U;
  const row = { cx: W / 2, cy: H * 0.58, gap: 44 * U };
  const cam = useMemo(() => {
    const wc: V3 = [wordBox.x + wordBox.w / 2, wordBox.y + wordBox.h / 2, 140];
    return camera([pull(t.move[0], (from: Cam) => ({ target: [W / 2, H / 2, 0] as V3, dist: from.dist * 1.3 }), { frames: t.move[1], film, id: 'rise-pull' }), rack(t.move[0] + t.move[1] * 0.55, [row.cx, row.cy, -180], { frames: k60(36, fps), film, id: 'rise-rack' })], {
      film,
      base: { target: [wc[0], wc[1] + 30, 0], focus: wc },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dur, fps, key]);
  const seq = t.seq ?? [0, 0, 0];
  const giant = (
    <div data-text={line.id} style={{ ...TYPE_FEATURES, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.text, fontSize: gsize, fontWeight: 760, letterSpacing: '-0.04em', lineHeight: 1, color: words[ki]?.key ? inks.accent : spec.ink, whiteSpace: 'nowrap' }}>
      {key}
    </div>
  );
  const enter = E.glideOut(clamp((F - c.in) / k60(26, fps)));
  return (
    <LineExit F={F} out={c.out} fps={fps}>
      <Stage3D camera={cam} ground={<StageGround />}>
        {plans.map((p, i) => {
          const box = { x: row.cx - (plans.length * cw + (plans.length - 1) * row.gap) / 2 + i * (cw + row.gap), y: row.cy - chh / 2, w: cw, h: chh };
          return (
            <Plane key={i} id={`rise-${i}`} box={box} z={-180} move={(g: number) => {
              const e = E.glideOut(clamp((g - seq[i]) / k60(40, fps)));
              return { y: 460 * (1 - e), opacity: clamp(e * 4) };
            }}>
              {/* glass cards: each frosts the world where it stands (laid out in frame px, so the frost is registered) */}
              <div style={{ position: 'absolute', left: -box.x, top: -box.y, width: W, height: H }}>
                <Glass x={box.x} y={box.y} w={cw} h={chh} r={30 * U} sweep={seq[i] + k60(34, fps)} sweepKind="edge" frame={f}>
                  <GlassCardContent w={cw} h={chh} title={p.name} value={typeof p.price === 'number' ? `${C0.plans.currency}${p.price}` : String(p.price)} sub={p.period} rows={p.features} badge={p.badge} />
                </Glass>
              </div>
            </Plane>
          );
        })}
        <Plane id="rise-word" box={wordBox} z={140} move={() => ({ opacity: enter, y: (1 - enter) * 40 })}>
          {giant}
        </Plane>
      </Stage3D>
      {small ? (
        <div data-text={`${line.id}-lead`} style={{ ...TYPE_FEATURES, position: 'absolute', left: 0, top: wordBox.y - 90 * U, width: W, textAlign: 'center', fontFamily: FONT.text, fontSize: 64 * U, fontWeight: weightOf(false), letterSpacing: `${trackFor(64 * U)}em`, color: spec.ink, opacity: E.snapOut(clamp((F - c.in) / k60(20, fps))) }}>
          {small}
        </div>
      ) : null}
    </LineExit>
  );
};

// ------------------------------------------------------------------------------------------------ porthole (line)

/**
 * The line as the film sets it; once it is read its words part and a porthole opens in the gap (a real face, the
 * product's user, or the product's mark): a soft shadow ring round it, a band of the world's light on the rim facing
 * the key; the words re-centre round it, and at the end it all goes soft into the next shot. A line of two rows parts
 * between them; one row parts before its key word.
 */
const Porthole: React.FC<HeroLineProps> = ({ F, inks, line, until }) => {
  const film = useFilm();
  const fps = film.fps;
  const spec = useSpec();
  const c = copy(line.id);
  const f = F - c.in;
  const dur = until - c.in;
  const t = heroTimes('porthole', dur, fps, c.resolved - c.in);
  const o = E.glideOut(prog(f, t.at.open, t.at.full));
  const soft = 6.4 * U * E.softIn(prog(f, dur - k60(8, fps), dur));
  if (o <= 0) return <Line id={line.id} raw={line.raw} F={F} inks={inks} />;
  const words = keyed(keyWords(line.raw));
  const text = words.map((x) => x.word).join(' ');
  const { size, rows } = lineLayout(text, false, false);
  const track = trackFor(size);
  const wt = weightOf(false);
  const wOf = (x: { strong: boolean }) => (x.strong ? Math.max(LINE_TYPE.keyWeight, wt + 100) : wt);
  const width = (ws: typeof words) => ws.reduce((a, x, i) => a + measureTracked(x.word, size, wOf(x), track, FONT.text, { trailing: false }) + (i ? measureTracked(' ', size, wt, track, FONT.text, { trailing: false }) : 0), 0);
  const D = Math.min(H * 0.34, size * 2.9);
  const face = firstFace();
  const lineH = size * LINE_TYPE.lead;
  const span = (ws: typeof words, x: number, y: number, key: string) => (
    <div key={key} data-text={line.id} style={{ ...TYPE_FEATURES, position: 'absolute', left: 0, top: 0, transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size, fontWeight: wt, letterSpacing: `${track}em`, lineHeight: LINE_TYPE.lead }}>
      {ws.map((x, i) => (
        <React.Fragment key={i}>
          {i ? ' ' : ''}
          <span style={{ fontWeight: wOf(x), color: x.key ? inks.accent : inks.type }}>{x.word}</span>
        </React.Fragment>
      ))}
    </div>
  );
  let parts: React.ReactNode[];
  let cx = W / 2;
  let cy = H / 2;
  if (rows.length > 1) {
    // two rows part vertically round the porthole
    const a = words.slice(0, rows[0]);
    const b = words.slice(rows[0]);
    const off = (lineH / 2 + (D / 2 + 18 * U) * o) * 1;
    parts = [span(a, W / 2 - width(a) / 2, H / 2 - off - lineH / 2 - lineH * 0.5 * (1 - o), 'a'), span(b, W / 2 - width(b) / 2, H / 2 + off - lineH / 2 + lineH * 0.5 * (1 - o), 'b')];
  } else {
    // one row parts before its key word (after it when the key word leads)
    const ki = Math.max(0, words.findIndex((x) => x.key || x.strong));
    const cut = ki > 0 ? ki : 1;
    const a = words.slice(0, cut);
    const b = words.slice(cut);
    const sp = measureTracked(' ', size, wt, track, FONT.text, { trailing: false });
    const half = sp / 2 + (D / 2 + 26 * U) * o;
    const total = width(a) + 2 * half + width(b);
    const left = W / 2 - total / 2;
    cx = left + width(a) + half;
    cy = H / 2;
    parts = [span(a, left, H / 2 - lineH / 2, 'a'), span(b, cx + half, H / 2 - lineH / 2, 'b')];
  }
  const d = D * mix(0.55, 1, o);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Soft sigma={soft}>
        {parts}
        <div data-imagery="" style={{ position: 'absolute', left: 0, top: 0, width: d, height: d, borderRadius: '50%', overflow: 'hidden', transform: `translate3d(${(cx - d / 2).toFixed(2)}px, ${(cy - d / 2).toFixed(2)}px, 0)`, opacity: clamp(o * 2), boxShadow: `0 ${(18 * U).toFixed(1)}px ${(60 * U).toFixed(1)}px rgba(0, 0, 0, ${spec.tone === 'dark' ? 0.4 : 0.12})`, background: spec.tone === 'dark' ? mixColor(spec.base, C.white, 0.12) : mixColor(C.white, C.accent, 0.12) }}>
          {face?.photo ? <Img src={face.photo} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <Face skin={useSkinStatic(inks)} size={d} name={face?.name ?? 'You'} />}
        </div>
        <div style={{ position: 'absolute', left: 0, top: 0, width: d, height: d, transform: `translate3d(${(cx - d / 2).toFixed(2)}px, ${(cy - d / 2).toFixed(2)}px, 0)`, opacity: clamp(o * 2) }}>
          <RimLight w={d} h={d} r={d / 2} />
        </div>
      </Soft>
    </div>
  );
};
const useSkinStatic = (inks: FamilyInks) => useSkin(inks);

// ------------------------------------------------------------------------------------------------ carousel (picture)

/**
 * A ring of the product's real pictures in depth, turning: the camera cranes down from above to eye level (one move,
 * front-loaded) while the ring's turn decays and lands the chosen picture facing the camera at the front; the cards
 * across the ring go soft and small in the lens, the far side turns away, a smear only while the ring turns fast.
 */
const Carousel: React.FC<HeroPicProps> = ({ dur, seed }) => {
  const film = useFilm();
  const fps = film.fps;
  const t = heroTimes('carousel', dur, fps);
  const C0 = content();
  // only real pictures (a card without one would be a grey stand-in): fewer than the ring holds repeat, never side by side
  const srcs = C0.thumbs.map((x) => x.src).filter((x): x is string => !!x);
  const n = srcs.length >= 8 ? Math.min(16, srcs.length) : Math.max(8, srcs.length * Math.ceil(8 / Math.max(1, srcs.length)));
  const cw = 380 * U;
  const chh = 500 * U;
  const R = (n * (cw + 46 * U)) / (2 * Math.PI);
  const dir = seed % 2 === 0 ? 1 : -1;
  const pick = seed % n;
  const turn = (g: number) => {
    const u = clamp((g - t.at.crane) / Math.max(1, t.at.land - t.at.crane));
    return -pick * (360 / n) + dir * 300 * (1 - E.settleOut(u));
  };
  const cam = useMemo(
    () =>
      camera([crane(t.move[0], (from: Cam) => ({ target: [W / 2, H / 2 + 20 * U, 0] as V3, pitch: 4, yaw: 0, dist: from.dist / 2.05 }), { frames: t.move[1], ease: E.glideOut, film, id: 'ring-crane' })], {
        film,
        base: { target: [W / 2, H / 2, -R * 0.9], pitch: 58, yaw: 0 },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dur, fps, n],
  );
  return (
    <Stage3D camera={cam} ground={<StageGround />}>
      {Array.from({ length: n }, (_, i) => {
        const src = srcs.length ? srcs[i % srcs.length] : undefined;
        const move = (g: number) => {
          const a = turn(g) + (i * 360) / n;
          const r = (a * Math.PI) / 180;
          const facing = Math.cos(r);
          return { x: R * Math.sin(r), z: R * facing - R, ry: a, opacity: clamp((facing + 0.25) / 0.35) };
        };
        return (
          <Plane key={i} id={`ring-${i}`} box={{ x: W / 2 - cw / 2, y: H / 2 + 20 * U - chh / 2, w: cw, h: chh }} move={move}>
            <div data-imagery style={{ position: 'absolute', inset: 0, borderRadius: 22 * U, overflow: 'hidden', background: mixColor(C.ink, C.white, 0.12), boxShadow: `0 ${(16 * U).toFixed(1)}px ${(40 * U).toFixed(1)}px rgba(0, 0, 0, 0.22)` }}>
              {src ? <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
            </div>
          </Plane>
        );
      })}
    </Stage3D>
  );
};

// ------------------------------------------------------------------------------------------------ push-press (picture)

/** The product's screen, then one push into its button at macro scale as a pointer reaches it and presses: a glow the
 * size of the button blooms and the screen answers (its own hits). Without a button: the push lands on its focus. */
const PushPress: React.FC<HeroPicProps> = ({ f, dur, scene, button, focus }) => {
  const film = useFilm();
  const fps = film.fps;
  const t = heroTimes('push-press', dur, fps);
  const b: Box = button ?? (focus ? { x: focus.x + focus.w * 0.35, y: focus.y + focus.h * 0.4, w: focus.w * 0.3, h: focus.h * 0.2 } : { x: W * 0.42, y: H * 0.45, w: W * 0.16, h: H * 0.1 });
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const reach = E.strongInOut(prog(f, t.at.point, t.at.press - k60(2, fps)));
  const press = f < t.at.press ? 0 : 1 - E.buildIn(prog(f, t.at.press + k60(6, fps), t.at.press + k60(18, fps)));
  return (
    <PushIn box={b} at={t.move[0]} frames={t.move[1]} mag={2.1} ground={<StageGround />} front={
      <Plane id="press-pointer" box={{ x: cx - 4, y: cy - 4, w: 90 * U, h: 90 * U }} z={24} dof={false} move={() => ({ x: mix(260 * U, 0, reach), y: mix(200 * U, 0, reach), opacity: clamp((f - t.at.point) / k60(8, fps)) })}>
        <Cursor x={4} y={4} scale={1.35 * U} shape="pointer" fill={C.white} outline={C.ink} press={press} />
      </Plane>
    }>
      <div style={{ position: 'absolute', inset: 0 }}>
        {scene?.(f)}
        <Bloom1 f={f} at={t.at.press + k60(4, fps)} x={cx} y={cy} r={Math.max(b.w, b.h) * 0.8} fps={fps} on="any" />
      </div>
    </PushIn>
  );
};

// ------------------------------------------------------------------------------------------------ the dispatch

const PICTURES: Record<string, React.FC<HeroPicProps>> = { 'macro-type': MacroTypeShot, 'black-glass': BlackGlass, 'page-fly': PageFly, 'toast-stack': ToastStack, 'fan-focus': FanFocusShot, carousel: Carousel, 'push-press': PushPress };
const OVERS: Record<string, React.FC<HeroOverProps>> = { 'glass-input': GlassInput, 'rise-behind': RiseBehindShot };
const LINES: Record<string, React.FC<HeroLineProps>> = { porthole: Porthole };

/**
 * The shot on its own clock: inside, useCurrentFrame() is the shot's frame `f` (the depth stage, the scenes of fx/depth
 * and the kit's screens read it), while the stage around it keeps the film's frame. A shot before its first frame (a seam
 * bringing it in early) holds that first frame.
 */
const OwnClock: React.FC<{ f: number; children: React.ReactNode }> = ({ f, children }) => {
  const cur = useCurrentFrame();
  const at = Math.round(cur - Math.max(0, f));
  return (
    <Sequence from={at} layout="none" name="hero">
      {children}
    </Sequence>
  );
};
/** A hero shot on a picture beat. */
export const HeroPicture: React.FC<HeroPicProps> = (p) => {
  const S = PICTURES[p.id];
  return S ? (
    <OwnClock f={p.f}>
      <S {...p} f={Math.max(0, p.f)} />
    </OwnClock>
  ) : null;
};
/** A hero shot that sets its pair's line in its own composition (one beat). */
export const HeroOver: React.FC<HeroOverProps> = (p) => {
  const S = OVERS[p.id];
  return S ? (
    <OwnClock f={p.f}>
      <S {...p} f={Math.max(0, p.f)} />
    </OwnClock>
  ) : null;
};
/** A hero shot that draws a line beat. */
export const HeroLine: React.FC<HeroLineProps> = (p) => {
  const S = LINES[p.id];
  return S ? <S {...p} /> : null;
};
