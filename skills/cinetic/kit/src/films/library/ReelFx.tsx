// The reel of the motion library's finishing effects: each piece in catalogue order (src/kit/library/catalog/), at its
// catalogue frames, with its name in the corner, over real content (the licensed photographs in public/img, detailed
// panels). No sound. A new effect: one segment appended to SEGMENTS.
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { Bloom, ChromaHit, DotScreen, LightSweep, MorphBox, TrackOverlay } from '../../kit/library';
import { Ground, fonts, softShadow, ease, mix, clamp, useTextLayout } from '../../kit';
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
];

export const reelFxDuration = reelDuration(SEGMENTS);
export const ReelFx: React.FC = () => <Reel film="library-fx" segments={SEGMENTS} background={NIGHT} />;
