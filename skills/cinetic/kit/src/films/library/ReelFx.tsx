// The reel of the motion library's finishing effects: each piece in catalogue order (src/kit/library/catalog/), at its
// catalogue frames, with its name in the corner, over real content (the licensed photographs in public/img, detailed
// panels). No sound. A new effect: one segment appended to SEGMENTS.
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { BackdropFocus, BlobKnock, Bloom, ChromaHit, CornerHunt, DotScreen, DriftField, FrostEdge, RingBurst, SliceShift, StepScan, GlowBars, GlyphSheen, GradeResolve, GRADES, LensBulge, LightSweep, MorphBox, PenMarks, ShimmerText, Stepped, TrackOverlay } from '../../kit/library';
import { Ground, Icon, fonts, softShadow, ease, mix, clamp, useTextLayout } from '../../kit';
import { Reel, reelDuration, type DemoProps, type Segment } from './reel';
import { Avatars, CORAL, COBALT, Center, IMG, INK, Label, NIGHT, ORANGE, PAPER, Photo, Pic, Prompt, Rise, SKY, SUN, say, shadowText } from './scenes';

const SweepDemo: React.FC = () => (
  <Photo src={IMG.cloud} zoom={1.05}>
    <Center style={{ gap: 56 }}>
      <LightSweep at={14} w={1000} h={150} radius={36} dur={14}>
        <Prompt w={1000} text="Plan my launch week" dark />
      </LightSweep>
      <LightSweep at={34} w={360} h={110} radius={55} color={SKY} dur={10} strength={0.9}>
        <div style={{ width: 360, height: 110, borderRadius: 55, background: COBALT, display: 'flex', alignItems: 'center', justifyContent: 'center', ...say(40, '#fff', 560) }}>Get started</div>
      </LightSweep>
    </Center>
  </Photo>
);

const BloomDemo: React.FC = () => {
  const f = useCurrentFrame();
  const p = ease.out(clamp((f - 14) / 14));
  return (
    <Ground color={NIGHT} light={false}>
      <Center>
        <Bloom radius={40} strength={0.42} pulse={{ at: 14, up: 3, down: 14, gain: 2.2 }}>
          <div style={{ width: 1000, borderRadius: 40, overflow: 'hidden', background: '#16181C', transform: `scale(${mix(p, 0.92, 1)})`, opacity: clamp((f - 13) / 2), fontFamily: fonts.inter, color: '#fff', textAlign: 'left' }}>
            <div style={{ height: 480, position: 'relative' }}>
              <Pic src={IMG.waves} />
              <div style={{ position: 'absolute', left: 28, top: 28, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderRadius: 999, background: ORANGE, fontSize: 28, fontWeight: 600 }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff' }} />
                Live
              </div>
            </div>
            <div style={{ padding: '28px 34px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 40, fontWeight: 600 }}>North beach, now</div>
                <div style={{ fontSize: 28, opacity: 0.55, marginTop: 4 }}>2.1 m swell, 1,204 watching</div>
              </div>
              <Avatars n={3} size={56} ring="#16181C" />
            </div>
          </div>
        </Bloom>
      </Center>
    </Ground>
  );
};

const TrackDemo: React.FC = () => {
  const f = useCurrentFrame();
  const style = say(240, '#fff', 560);
  const word = 'Launch';
  const L = useTextLayout(word, style);
  // the glyphs ride a slow arc that bends and settles
  const place = (i: number, frame: number) => {
    const g = L.chars[i];
    if (!g) return { x: 0, y: 0, rot: 0, g };
    const u = (g.cx - L.width / 2) / (L.width / 2);
    const bb = mix(ease.out(clamp(frame / 50)), 0.5, 0.18);
    const x = 960 + (g.cx - L.width / 2) * 1.08;
    const y = 520 + u * u * 220 * bb + Math.sin(frame / 14 + i) * 4;
    return { x, y, rot: u * 26 * bb, g };
  };
  return (
    <Photo src={IMG.farms} zoom={1.08} dim={0.38}>
      {L.ready &&
        word.split('').map((ch, i) => {
          const q = place(i, f);
          return (
            <div key={i} style={{ position: 'absolute', left: q.x, top: q.y, transform: `translate(-50%, -50%) rotate(${q.rot}deg)`, ...style }}>
              {ch}
            </div>
          );
        })}
      {L.ready && (
        <TrackOverlay
          at={10}
          track={(fr) =>
            word.split('').map((_, i) => {
              const q = place(i, fr);
              return { x: q.x, y: q.y, w: (q.g?.ink.width ?? 100) + 26, h: (q.g?.ink.height ?? 160) + 30, rot: q.rot };
            })
          }
        />
      )}
    </Photo>
  );
};

const DotScreenDemo: React.FC = () => {
  const f = useCurrentFrame();
  // an LED board: the word's dots shrink to nothing (6 f, ease in), then the picture lights up in the same grid as its
  // dots grow (10 f, ease out), and the grid relaxes to half over the plain picture. No flicker, no hard light change.
  const out = ease.in(clamp((f - 34) / 6));
  const up = ease.out(clamp((f - 40) / 10));
  const relax = ease.inOut(clamp((f - 54) / 14));
  return (
    <>
      <Sequence durationInFrames={40}>
        <Ground color={NIGHT} light={false}>
          <DotScreen pitch={15} dot={0.8 * (1 - out) + 0.001}>
            <Center>
              <div style={{ ...say(420, '#F2F2F2', 800), letterSpacing: '-0.02em' }}>Ready</div>
            </Center>
          </DotScreen>
        </Ground>
      </Sequence>
      <Sequence from={40}>
        <AbsoluteFill style={{ background: NIGHT }}>
          <DotScreen pitch={15} dot={mix(up, 0.05, 0.86)} amount={1 - 0.45 * relax} off="rgba(255,255,255,0.09)">
            <Photo src={IMG.waves} t0={40} />
          </DotScreen>
          <Center>
            <Rise at={14} style={say(110, '#fff', 600)}>
              <span style={{ textShadow: shadowText }}>Seen in every pixel</span>
            </Rise>
          </Center>
        </AbsoluteFill>
      </Sequence>
    </>
  );
};

const ChromaDemo: React.FC = () => {
  const f = useCurrentFrame();
  // three photo cards land on a pile, one per beat; each landing splits the channels for two frames
  const cards: Array<[number, string, string, number, number]> = [
    [14, IMG.tide, 'Low tide', -7, -220],
    [28, IMG.farms, 'Kelp farms', 5, 0],
    [42, IMG.waves, 'Morning swell', -2, 220],
  ];
  return (
    <Ground color={PAPER} light={false}>
      {cards.map(([t, src, name, rot, dx]) => {
        if (f < t) return null;
        const p = ease.out(clamp((f - t + 1) / 6));
        return (
          <ChromaHit key={src} at={t} px={14}>
            <Center>
              <div style={{ width: 620, height: 760, borderRadius: 34, background: '#fff', padding: 22, boxSizing: 'border-box', boxShadow: softShadow(4, PAPER), transform: `translateX(${dx}px) rotate(${rot}deg) scale(${mix(p, 1.22, 1)})` }}>
                <div style={{ width: '100%', height: 600, borderRadius: 20, overflow: 'hidden' }}>
                  <Pic src={src} />
                </div>
                <div style={{ ...say(44, INK, 560), marginTop: 26, textAlign: 'left', paddingLeft: 8 }}>{name}</div>
              </div>
            </Center>
          </ChromaHit>
        );
      })}
    </Ground>
  );
};

const MorphDemo: React.FC = () => {
  const f = useCurrentFrame();
  const dots = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: '#5B6170', transform: `translateY(${Math.sin(f / 4 - i) * 5}px)` }} />
      ))}
    </div>
  );
  const pill = <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...say(36, INK, 550) }}>Three things for today</div>;
  const card = (
    <div style={{ padding: '30px 36px', fontFamily: fonts.inter, color: INK, textAlign: 'left' }}>
      <div style={{ fontSize: 36, fontWeight: 600 }}>Three things for today</div>
      {['Reply to the proposal', 'Review the new layouts', 'Team sync at 3pm'].map((t, i) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 31, marginTop: 18 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, border: `2.5px solid ${[COBALT, ORANGE, SUN][i]}` }} />
          {t}
        </div>
      ))}
    </div>
  );
  const win = (
    <div style={{ fontFamily: fonts.inter, color: INK, textAlign: 'left' }}>
      <div style={{ height: 68, display: 'flex', alignItems: 'center', gap: 10, padding: '0 26px', borderBottom: '1px solid rgba(0,0,0,.07)' }}>
        {[CORAL, SUN, SKY].map((c) => (
          <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
        ))}
        <div style={{ marginLeft: 20, fontSize: 28, fontWeight: 550 }}>Today</div>
        <div style={{ marginLeft: 'auto' }}>
          <Avatars n={3} size={44} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, padding: 30 }}>
        {([['Proposal', COBALT, IMG.delta, 'Due 12:00'], ['Layouts', ORANGE, IMG.waves, '6 screens'], ['Sync', SUN, IMG.cloud, '15:00, 30 min']] as const).map(([t, c, src, d]) => (
          <div key={t} style={{ flex: 1, height: 330, borderRadius: 22, background: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{ height: 160 }}>
              <Pic src={src} />
            </div>
            <div style={{ padding: '18px 22px' }}>
              <div style={{ width: 54, height: 8, borderRadius: 4, background: c }} />
              <div style={{ fontSize: 34, fontWeight: 600, marginTop: 14 }}>{t}</div>
              <div style={{ fontSize: 26, opacity: 0.55, marginTop: 4 }}>{d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <Photo src={IMG.tide} zoom={1.06}>
      <MorphBox
        shadow={softShadow(4, '#55606B')}
        stages={[
          { at: 0, box: { x: 960, y: 560, w: 140, h: 72, r: 36 }, color: '#EEF1F6', content: dots },
          { at: 16, box: { x: 960, y: 560, w: 520, h: 84, r: 42 }, color: '#FFFFFF', content: pill, dur: 10 },
          { at: 32, box: { x: 960, y: 560, w: 720, h: 320, r: 34 }, color: '#FFFFFF', content: card, dur: 14 },
          { at: 64, box: { x: 960, y: 560, w: 1240, h: 500, r: 28 }, color: '#FFFFFF', content: win, dur: 14 },
        ]}
      />
    </Photo>
  );
};

/** A white panel of photo tiles, three groups of 2 x 3, laid on the same 6 x 3 grid the grade switches on. */
const TILES = [IMG.tide, IMG.waves, IMG.farms, IMG.cloud, IMG.delta, IMG.shore];
const GradeDemo: React.FC = () => {
  const W = 1500;
  const H = 600;
  return (
    <AbsoluteFill style={{ background: '#FBFBFA' }}>
      <div style={{ position: 'absolute', left: 210, top: 150, fontFamily: fonts.inter, fontSize: 30, fontWeight: 560, color: INK }}>Library</div>
      <div style={{ position: 'absolute', left: 190, top: 220, padding: 20, borderRadius: 30, background: '#F1F1EF' }}>
        <GradeResolve at={20} dur={9} to="grade" palette={GRADES.warm} cols={6} rows={3} w={W} h={H} seed={4}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', width: W, height: H }}>
            {Array.from({ length: 18 }, (_, i) => (
              <div key={i} style={{ padding: 7, boxSizing: 'border-box' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }}>
                  <Pic src={TILES[(i * 5 + Math.floor(i / 6)) % 6]} style={{ transform: `scale(${1.2 + (i % 4) * 0.25})`, transformOrigin: `${(i * 37) % 100}% ${(i * 61) % 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GradeResolve>
      </div>
      {['People', 'Places', 'Moments'].map((t, i) => (
        <div key={t} style={{ position: 'absolute', left: 214 + i * 500, top: 846, fontFamily: fonts.inter, fontSize: 24, color: '#6B7079' }}>{t}</div>
      ))}
    </AbsoluteFill>
  );
};

/** A collage laid by hand: three cut-outs land on held steps, a disc grows, all on threes with a hair of jitter. */
const SteppedDemo: React.FC = () => {
  const f = useCurrentFrame();
  const land = (a: number) => clamp((f - a) / 1);
  const disc = ease.out(clamp((f - 6) / 30));
  return (
    <AbsoluteFill style={{ background: '#1A1512' }}>
      <Stepped n={3} jitter={2} turn={0.8} grain={0.05}>
        <AbsoluteFill>
          <div style={{ position: 'absolute', left: 960 - 330 * disc, top: 540 - 330 * disc, width: 660 * disc, height: 660 * disc, borderRadius: '50%', background: ORANGE }} />
          {[
            { a: 12, x: 520, y: 330, r: -6, img: IMG.tide, w: 420 },
            { a: 21, x: 1340, y: 420, r: 5, img: IMG.farms, w: 380 },
            { a: 30, x: 880, y: 700, r: -2, img: IMG.waves, w: 460 },
          ].map((c) =>
            land(c.a) > 0 ? (
              <div key={c.a} style={{ position: 'absolute', left: c.x - c.w / 2, top: c.y - c.w * 0.33, width: c.w, height: c.w * 0.66, transform: `rotate(${c.r + Math.sin((f - c.a) * 0.3) * 1.2}deg)`, boxShadow: '0 18px 40px rgba(0,0,0,0.45)', border: '10px solid #F4EFE6' }}>
                <Pic src={c.img} />
              </div>
            ) : null,
          )}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 880, textAlign: 'center', ...say(64, '#F4EFE6', 560) }}>{f >= 36 ? 'Made by hand' : ''}</div>
        </AbsoluteFill>
      </Stepped>
    </AbsoluteFill>
  );
};

/** A status line under a prompt, the band crossing on a loop; the words swap between passes. */
const ShimmerDemo: React.FC = () => (
  <AbsoluteFill style={{ background: '#F6F6F4', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 1500, display: 'flex', flexDirection: 'column', gap: 50, alignItems: 'flex-start' }}>
      <div style={{ alignSelf: 'flex-end', padding: '30px 42px', borderRadius: 38, background: '#E9E9E6', fontFamily: fonts.inter, fontSize: 50, color: INK }}>Find the three slowest pages on the site</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 30, height: 30, borderRadius: 15, background: COBALT }} />
        <ShimmerText text="Reading the analytics" at={8} period={30} pass={18} color="#9BA0A8" light="#16181C" size={60} swaps={[{ at: 68, text: 'Checking load times' }]} />
      </div>
    </div>
  </AbsoluteFill>
);

/** A name set huge on a deep ground, the light passing through its letters once. */
const SheenDemo: React.FC = () => (
  <AbsoluteFill style={{ background: '#08131A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    <GlyphSheen text="Tidal" at={12} dur={26} size={560} fill="linear-gradient(180deg, #0F3440 0%, #2C7F8F 70%, #8FD3DA 100%)" style={{ fontWeight: 640, letterSpacing: '-0.045em' }} />
  </AbsoluteFill>
);

/** A glowing pen annotates one point under a caption: a loop round it, then an arrow out to the side; both retract. */
const PenDemo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#05070B' }}>
      <div style={{ position: 'absolute', left: 960 - 9, top: 470 - 9, width: 18, height: 18, borderRadius: 9, background: '#CFE3FF', boxShadow: '0 0 24px 8px rgba(110,170,255,0.55)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', ...say(44, '#F2F4F7', 520), opacity: f >= 4 ? 1 : 0 }}>every order lands here first</div>
      <PenMarks
        look="light"
        color="#5E9BFF"
        marks={[
          { kind: 'loop', x: 960, y: 470, r: 62, at: 10, dur: 5, out: 66 },
          { kind: 'arrow', x: 1040, y: 500, tx: 1330, ty: 440, bend: -0.35, at: 30, dur: 7, out: 70 },
          { kind: 'tick', x: 1390, y: 420, r: 46, at: 40, dur: 3, out: 72 },
        ]}
      />
    </AbsoluteFill>
  );
};

/** A product tour seen through one lens: a desk photograph and a panel bent as one screen, relaxing from a stronger bulge. */
const LensDemo: React.FC = () => (
  <LensBulge amount={0.16} at={4} from={0.2} dur={14} chroma={2.5} vignette={0.36} grid={4}>
    <Photo src={IMG.farms} zoom={1.02}>
      <Center>
        <Prompt w={980} text="Count the rows that need harvest" dark />
      </Center>
    </Photo>
  </LensBulge>
);

/** An export dialog held over reeded glow bars that rise from the lower left and lean as the shot goes on. */
const GlowBarsDemo: React.FC = () => (
  <GlowBars at={6} dur={34} color="#FF9A3C" rim="#D23A2A" ground="#0A0A0C" leanDur={120}>
    <Center>
      <div style={{ width: 760, padding: '34px 38px', borderRadius: 30, background: 'rgba(20,21,24,0.92)', boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)', fontFamily: fonts.inter, color: '#F3F4F6', textAlign: 'left' }}>
        <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.02em' }}>Export the cut</div>
        <div style={{ fontSize: 26, opacity: 0.55, marginTop: 8 }}>4K, 24 fps, 1 min 12 s</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 30 }}>
          {['MP4', 'ProRes', 'Stills'].map((t, i) => (
            <div key={t} style={{ padding: '14px 24px', borderRadius: 16, background: i === 0 ? '#F3F4F6' : 'rgba(255,255,255,0.08)', color: i === 0 ? INK : '#F3F4F6', fontSize: 26, fontWeight: 560 }}>{t}</div>
          ))}
        </div>
      </div>
    </Center>
  </GlowBars>
);

/** A bold line on white; a blurred blob slides in under it and the words over it turn white. */
const BlobKnockDemo: React.FC = () => (
  <AbsoluteFill style={{ background: '#FBFBFC' }}>
    <BlobKnock text="From draft to shipped" at={12} dur={10} from={0.84} to={0.56} color="#2747D9" size={96} />
  </AbsoluteFill>
);

/** A phrase held on white with a viewfinder hunting round it; it settles when the phrase is done. */
const CornerHuntDemo: React.FC = () => (
  <AbsoluteFill style={{ background: '#F7F7F5' }}>
    <Center>
      <div style={{ ...say(58, INK, 500) }}>Find the right shot</div>
    </Center>
    <CornerHunt at={6} until={52} w={520} h={70} color={INK} />
  </AbsoluteFill>
);

/** A white card: a 4 x 4 grid of cells read row by row, and the line beside it saying what is read. */
const StepScanDemo: React.FC = () => (
  <AbsoluteFill style={{ background: '#F4F4F2', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 70, padding: '70px 90px', borderRadius: 36, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 20px 60px rgba(0,0,0,0.07)' }}>
      <StepScan at={6} color="#E8492B" />
      <div style={{ ...say(56, INK, 520), textAlign: 'left' }}>
        Reading 4,200 pages
        <div style={{ ...say(32, '#7A7F88', 450), marginTop: 12 }}>row by row, every field</div>
      </div>
    </div>
  </AbsoluteFill>
);

/** A chat column scrolling up under its header: the oldest message slides under a frosted band and goes soft. */
const MESSAGES: Array<[string, boolean]> = [
  ['What do I need to get done today?', true],
  ['Three things, in this order:', false],
  ['Reply to the supplier about the June batch', false],
  ['Review the new label proofs', false],
  ['Book the sea trial for Friday', false],
  ['Move the proofs to the morning', true],
  ['Done. Proofs at 9:30, supplier at 11', false],
];
const FrostDemo: React.FC = () => {
  const f = useCurrentFrame();
  const scroll = 240 * ease.inOut(clamp((f - 10) / 40));
  return (
    <AbsoluteFill style={{ background: '#E6EEF6', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 900, height: 860, borderRadius: 44, background: '#F7FAFD', boxShadow: '0 30px 80px rgba(40,70,110,0.18)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 150 }}>
          <FrostEdge w={900} h={710} band={170}>
            <div style={{ padding: '60px 50px 0', display: 'flex', flexDirection: 'column', gap: 26, transform: `translateY(${-scroll}px)` }}>
              {MESSAGES.map(([t, me], i) => (
                // the last reply arrives once the column has scrolled up to make room for it (nothing cut at the bottom)
                <div key={i} style={{ visibility: i === MESSAGES.length - 1 && f < 36 ? 'hidden' : 'visible', alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: 640, padding: '22px 30px', borderRadius: 30, background: me ? '#CFE2FA' : '#FFFFFF', boxShadow: me ? 'none' : '0 6px 20px rgba(40,70,110,0.08)', ...say(32, INK, 480), textAlign: 'left' }}>
                  {t}
                </div>
              ))}
            </div>
          </FrostEdge>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 84, height: 84, borderRadius: 42, background: '#FFFFFF', boxShadow: '0 6px 20px rgba(40,70,110,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="Sparkles" size={40} color={COBALT} />
          </div>
          <div style={{ ...say(26, '#4B5563', 520) }}>Planner</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** A night ground: small blue lights pop on one by one and drift into a loose cloud, a line arriving under them. */
const DriftDemo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#05081A' }}>
      <DriftField at={4} count={28} rate={2.5} area={[0.18, 0.18, 0.66, 0.52]} avoid={[0.3, 0.62, 0.4, 0.12]} color="#4A6BFF" vx={0.25} vy={-0.15} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 760, textAlign: 'center', ...say(56, '#E8ECFF', 500), opacity: f >= 50 ? 1 : 0 }}>Every request finds its way</div>
    </AbsoluteFill>
  );
};

/** A record button pressed on white: the button dips and a halftone ring spreads out of it and thins. */
const RingBurstDemo: React.FC = () => {
  const f = useCurrentFrame();
  const dip = f >= 14 && f < 20 ? 0.9 : 1;
  return (
    <AbsoluteFill style={{ background: '#FAFAF9' }}>
      <RingBurst at={16} dur={16} from={70} to={420} color="#F07A2E" dim={0.12} />
      <Center>
        <div style={{ width: 150, height: 150, borderRadius: 75, background: '#F07A2E', transform: `scale(${dip})`, boxShadow: '0 16px 40px rgba(240,122,46,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="Mic" size={70} color="#fff" />
        </div>
      </Center>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 780, textAlign: 'center', ...say(48, INK, 500) }}>Say it once</div>
    </AbsoluteFill>
  );
};

/** A pricing view on dark; a confirmation arrives and the view behind it softens, grows and dims. */
const BackdropDemo: React.FC = () => (
  <BackdropFocus
    at={18}
    outAt={64}
    ground="#000000"
    front={
      <Center>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '28px 40px', borderRadius: 26, background: '#1C1E23', boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)', ...say(40, '#F3F4F6', 520) }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: '#2F5BFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="Check" size={28} color="#fff" />
          </div>
          Done building
        </div>
      </Center>
    }
  >
    <AbsoluteFill style={{ background: '#0B0C0F', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
      <div style={{ ...say(120, '#F3F4F6', 600) }}>Plans</div>
      <div style={{ display: 'flex', gap: 30 }}>
        {[['Free', '$0'], ['Team', '$12'], ['Studio', '$29']].map(([n, v]) => (
          <div key={n} style={{ width: 360, padding: '30px 34px', borderRadius: 26, background: '#15171B', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', fontFamily: fonts.inter, color: '#E9EBEF' }}>
            <div style={{ fontSize: 26, opacity: 0.6 }}>{n}</div>
            <div style={{ fontSize: 60, fontWeight: 600, marginTop: 8 }}>{v}<span style={{ fontSize: 26, opacity: 0.5 }}> / month</span></div>
            {['Unlimited drafts', 'Shared folders', 'Export to video'].map((t) => (
              <div key={t} style={{ fontSize: 24, opacity: 0.7, marginTop: 14 }}>{t}</div>
            ))}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  </BackdropFocus>
);

/** A photograph cut by hairlines that slide in from the top and bottom; the bands slip down by their own amounts. */
const SliceDemo: React.FC = () => (
  <SliceShift at={6} pairs={3} dur={30} sink={0.09}>
    <Photo src={IMG.waves} zoom={1.08} drift={0} />
  </SliceShift>
);

/** A demo and its name in the corner. */
const named = (C: React.FC): React.FC<DemoProps> => ({ name }) => (
  <>
    <C />
    <Label name={name} />
  </>
);

// the pieces in the order the reel plays them; a new piece appends its segment (from = the last from + dur) and
// gives its catalogue entry the same frames
export const SEGMENTS: Segment[] = [
  { name: 'LightSweep', from: 0, dur: 66, render: named(SweepDemo) },
  { name: 'Bloom', from: 66, dur: 64, render: named(BloomDemo) },
  { name: 'TrackOverlay', from: 130, dur: 80, render: named(TrackDemo) },
  { name: 'DotScreen', from: 210, dur: 84, render: named(DotScreenDemo) },
  { name: 'ChromaHit', from: 294, dur: 72, render: named(ChromaDemo) },
  { name: 'MorphBox', from: 366, dur: 100, render: named(MorphDemo) },
  { name: 'GradeResolve', from: 466, dur: 60, render: named(GradeDemo) },
  { name: 'Stepped', from: 526, dur: 60, render: named(SteppedDemo) },
  { name: 'ShimmerText', from: 586, dur: 100, render: named(ShimmerDemo) },
  { name: 'GlyphSheen', from: 686, dur: 50, render: named(SheenDemo) },
  { name: 'PenMarks', from: 736, dur: 84, render: named(PenDemo) },
  { name: 'LensBulge', from: 820, dur: 50, render: named(LensDemo) },
  { name: 'GlowBars', from: 870, dur: 90, render: named(GlowBarsDemo) },
  { name: 'BlobKnock', from: 960, dur: 50, render: named(BlobKnockDemo) },
  { name: 'CornerHunt', from: 1010, dur: 66, render: named(CornerHuntDemo) },
  { name: 'StepScan', from: 1076, dur: 60, render: named(StepScanDemo) },
  { name: 'FrostEdge', from: 1136, dur: 64, render: named(FrostDemo) },
  { name: 'DriftField', from: 1200, dur: 90, render: named(DriftDemo) },
  { name: 'RingBurst', from: 1290, dur: 50, render: named(RingBurstDemo) },
  { name: 'BackdropFocus', from: 1340, dur: 80, render: named(BackdropDemo) },
  { name: 'SliceShift', from: 1420, dur: 60, render: named(SliceDemo) },
];

export const reelFxDuration = reelDuration(SEGMENTS);
export const ReelFx: React.FC = () => <Reel film="library-fx" segments={SEGMENTS} background={NIGHT} />;
