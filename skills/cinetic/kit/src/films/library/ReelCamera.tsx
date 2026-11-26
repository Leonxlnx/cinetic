// The reel of the motion library's camera moves (pushes, pans, dives, parallax, focus pulls).
// It plays each piece in the order of SEGMENTS, at its frames, with its name in the corner; the catalogue entries are
// in src/kit/library/catalog/camera.ts. Empty until the first piece lands (one card says so): a new piece appends one
// segment here (from = the last segment's from + dur) and its catalogue entry gives the same frames.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { fonts } from '../../kit/fonts';
import { Camera, Icon, ease, softShadow } from '../../kit';
import { CaretCam, DepthField, ExposureRamp, FloorTilt, PullReveal, PullTilt, RackFocus, RowTrack, TiltScroll, type DepthItem } from '../../kit/library';
import { useCurrentFrame } from 'remotion';
import { Reel, reelDuration, type DemoProps, type Segment } from './reel';
import { Avatars, COBALT, IMG, INK, NIGHT, ORANGE, Photo, Pic, SKY, SUN, CORAL } from './scenes';

/** The corner label every segment here draws: the piece's number and name. */
export const Label: React.FC<{ n: number; name: string; dark?: boolean }> = ({ n, name, dark }) => (
  <div style={{ position: 'absolute', left: 56, bottom: 34, fontFamily: fonts.inter, fontSize: 26, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(17,19,24,0.45)', zIndex: 500 }}>
    <span style={{ fontVariantNumeric: 'tabular-nums', marginRight: 12, opacity: 0.7 }}>{n}</span>
    {name}
  </div>
);

const CaretCamDemo: React.FC<DemoProps> = ({ n, name }) => (
  <>
    <CaretCam text="Draft a launch plan for the spring range" at={6} inAt={26} color="rgba(255,255,255,0.58)" ink={INK} accent={COBALT}>
      <Photo src={IMG.shore} zoom={1.06} />
    </CaretCam>
    <Label n={n} name={name} dark />
  </>
);

/** A feed of cards: the middle one is the one the pull starts close on. */
const FeedCard: React.FC<{ img: string; title: string; meta: string; w: number }> = ({ img, title, meta, w }) => (
  <div style={{ width: w, borderRadius: 34, overflow: 'hidden', background: '#fff', boxShadow: softShadow(4, '#2B4FD8'), fontFamily: fonts.inter, color: INK, textAlign: 'left' }}>
    <div style={{ height: w * 0.56 }}>
      <Pic src={img} />
    </div>
    <div style={{ padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.015em' }}>{title}</div>
        <div style={{ fontSize: 22, opacity: 0.55, marginTop: 4 }}>{meta}</div>
      </div>
      <Avatars n={3} size={40} />
    </div>
  </div>
);

const PullRevealDemo: React.FC<DemoProps> = ({ n, name }) => (
  <>
    <AbsoluteFill style={{ background: '#2F57E6' }}>
      <PullReveal at={18} from={2.5} fy={500}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 44 }}>
          <div style={{ opacity: 0.9, transform: 'translateY(60px)' }}>
            <FeedCard img={IMG.tide} title="Low tide walk" meta="12 min, 2.4 km" w={440} />
          </div>
          <FeedCard img={IMG.waves} title="North beach, now" meta="2.1 m swell, 1,204 watching" w={560} />
          <div style={{ opacity: 0.9, transform: 'translateY(-50px)' }}>
            <FeedCard img={IMG.farms} title="Kelp rows from above" meta="Photo set, 18 frames" w={440} />
          </div>
        </AbsoluteFill>
      </PullReveal>
    </AbsoluteFill>
    <Label n={n} name={name} dark />
  </>
);

const Chip: React.FC<{ label: string; icon: string; tone: string }> = ({ label, icon, tone }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '24px 40px 24px 26px', borderRadius: 32, background: '#1B1D22', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 30px rgba(0,0,0,0.4)', fontFamily: fonts.inter, fontSize: 50, fontWeight: 520, color: '#F2F3F5', whiteSpace: 'nowrap' }}>
    <div style={{ width: 60, height: 60, borderRadius: 18, background: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={36} color="#fff" />
    </div>
    {label}
  </div>
);

const FIELD: DepthItem[] = [
  { x: 0.5, y: 0.5, depth: 1, fixed: true, node: <div style={{ width: 170, height: 170, borderRadius: 48, background: '#16181C', boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(255,255,255,0.06)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="Sparkles" size={80} color={SKY} /></div> },
  { x: 0.25, y: 0.2, depth: 1.6, node: <Chip label="Sales" icon="TrendingUp" tone={ORANGE} /> },
  { x: 0.74, y: 0.26, depth: 0.9, node: <Chip label="Finance" icon="Landmark" tone={COBALT} /> },
  { x: 0.18, y: 0.62, depth: 1.1, node: <Chip label="Support" icon="LifeBuoy" tone={CORAL} /> },
  { x: 0.8, y: 0.72, depth: 1.35, node: <Chip label="Legal" icon="Scale" tone="#5C6370" /> },
  { x: 0.42, y: 0.84, depth: 2.1, node: <Chip label="Research" icon="FlaskConical" tone={SUN} /> },
  { x: 0.62, y: 0.12, depth: 2.4, node: <Chip label="Design" icon="PenTool" tone="#E0567A" /> },
  { x: 0.9, y: 0.45, depth: 2.0, node: <Chip label="Ops" icon="Settings2" tone="#3C8FD9" /> },
  { x: 0.08, y: 0.38, depth: 2.6, node: <Chip label="People" icon="Users" tone="#C9853B" /> },
];

const DepthFieldDemo: React.FC<DemoProps> = ({ n, name }) => (
  <>
    <AbsoluteFill style={{ background: NIGHT }}>
      <DepthField items={FIELD} at={4} dur={20} pushAt={66} pushDur={13} />
    </AbsoluteFill>
    <Label n={n} name={name} dark />
  </>
);

/** A line set on a gridded ground; the ground tilts into a floor and a block lands on it beside the line. */
const FloorTiltDemo: React.FC<DemoProps> = ({ n, name }) => {
  const f = useCurrentFrame();
  const land = Math.min(1, Math.max(0, (f - 34) / 8));
  return (
    <>
      <FloorTilt at={14} dur={13} ground="#E6E1D6" grid={180} ink="rgba(30,24,10,0.35)" to={{ tilt: 54, turn: -24, zoom: 0.9, y: 70 }}>
        <div style={{ position: 'absolute', left: 560, top: 470, fontFamily: fonts.inter, fontSize: 120, fontWeight: 540, letterSpacing: '-0.03em', color: '#17140C', whiteSpace: 'pre' }}>Every order</div>
        {land > 0 && (
          <div style={{ position: 'absolute', left: 560, top: 300 - (1 - land) * 60, width: 420, height: 150, borderRadius: 10, background: '#FFFBF0', opacity: land, boxShadow: '0 10px 0 rgba(30,24,10,0.18)', fontFamily: fonts.inter, fontSize: 30, fontWeight: 600, color: '#17140C', padding: '20px 26px', boxSizing: 'border-box' }}>
            Order 4120
            <div style={{ fontSize: 24, fontWeight: 450, opacity: 0.6, marginTop: 6 }}>Packed, leaves at 14:00</div>
          </div>
        )}
      </FloorTilt>
      <Label n={n} name={name} />
    </>
  );
};

/** A composer card on a soft ground: the camera starts on its title, pulls back and swings so the card turns away. */
const PullTiltDemo: React.FC<DemoProps> = ({ n, name }) => (
  <>
    <AbsoluteFill style={{ background: '#C9D3DC' }}>
      <PullTilt at={16} dur={11} from={2.2} fx={640} fy={420}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 1060, borderRadius: 34, background: '#FFFFFF', boxShadow: '0 2px 4px rgba(20,30,40,0.08), 0 40px 90px rgba(20,30,40,0.22)', fontFamily: fonts.inter, color: INK, padding: '30px 34px', boxSizing: 'border-box', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 30, fontWeight: 560 }}>
              <Icon name="Sparkles" size={30} color={COBALT} />
              Ask the workspace
            </div>
            <div style={{ fontSize: 34, color: '#7A808A', margin: '26px 0 70px' }}>Type a message, / for commands, @ to mention</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 24, color: '#4B515C' }}>
              <Icon name="Paperclip" size={26} color="#4B515C" />
              <div style={{ padding: '8px 16px', borderRadius: 12, background: '#EEF0F3' }}>Agent</div>
              <div style={{ flex: 1 }} />
              <div style={{ padding: '12px 24px', borderRadius: 14, background: INK, color: '#fff', fontWeight: 560 }}>Send</div>
            </div>
          </div>
        </AbsoluteFill>
      </PullTilt>
    </AbsoluteFill>
    <Label n={n} name={name} />
  </>
);

/** A dark monitor panel on a light sky: its contents arrive soft and snap sharp under a slow push. */
const RackFocusDemo: React.FC<DemoProps> = ({ n, name }) => {
  const f = useCurrentFrame();
  return (
    <>
      <Photo src={IMG.cloud} zoom={1.04 + f * 0.0006}>
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 1120, height: 640, borderRadius: 26, background: '#0E1013', boxShadow: '0 40px 100px rgba(10,20,30,0.45), inset 0 0 0 6px #23262C', overflow: 'hidden' }}>
            <RackFocus at={0} hold={6} snap={1} blur={11} push={0.02} pushDur={60}>
              <div style={{ padding: 40, boxSizing: 'border-box', fontFamily: fonts.inter, color: '#E9ECF1', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, fontWeight: 560 }}>
                  <span>Harvest window</span>
                  <span style={{ color: '#7FD0A6' }}>+12.4 %</span>
                </div>
                <svg width={1040} height={360} style={{ marginTop: 30 }}>
                  <polyline fill="none" stroke="#6FA8FF" strokeWidth={5} strokeLinejoin="round" points={Array.from({ length: 27 }, (_, i) => `${i * 40},${300 - i * 8 - Math.sin(i * 0.9) * 40 - (i % 3) * 10}`).join(' ')} />
                </svg>
                <div style={{ display: 'flex', gap: 40, fontSize: 24, opacity: 0.6 }}>
                  {['Rows 1-40', 'Ready 31', 'Next pass 06:10'].map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
            </RackFocus>
          </div>
        </AbsoluteFill>
      </Photo>
      <Label n={n} name={name} dark />
    </>
  );
};

/** A dock of lit app tiles on a slab, tracked sideways; the set brightens from graphite to soft white without a cut. */
const DOCK: Array<[string, string]> = [
  ['Music', '#FF5A36'],
  ['Map', '#2F7BFF'],
  ['Camera', '#1C1D21'],
  ['Calendar', '#FF8A2B'],
  ['MessageCircle', '#3AA0FF'],
  ['Mail', '#2F5BFF'],
  ['Image', '#E85A8A'],
];
const ExposureDemo: React.FC<DemoProps> = ({ n, name }) => (
  <>
    <ExposureRamp at={18} dur={32}>
      {(e) => (
        <Camera keys={[{ f: 0, x: -260, zoom: 1.08, rx: 16, ry: -10 }, { f: 90, x: 260, zoom: 1.0, rx: 12, ry: -6, curve: ease.linear }]} perspective={2400}>
          <div style={{ position: 'absolute', left: 120, top: 380, width: 1680, height: 320, borderRadius: 60, background: e.surface, boxShadow: `inset 0 2px 0 ${e.line}, 0 40px 80px rgba(0,0,0,${e.shadow})` }} />
          {DOCK.map(([icon, tone], i) => (
            <div key={icon} style={{ position: 'absolute', left: 190 + i * 228, top: 440, width: 200, height: 200, borderRadius: 52, background: tone, boxShadow: `0 18px 40px rgba(0,0,0,${e.shadow * 0.8}), 0 0 60px ${tone}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={icon} size={96} color="#fff" />
            </div>
          ))}
        </Camera>
      )}
    </ExposureRamp>
    <Label n={n} name={name} />
  </>
);

/** A long event page (hero, dates, three picture cards, a line-up list) scrolling on navy, rushing into the cut. */
const Page: React.FC = () => (
  <div style={{ background: '#F5F3EE', fontFamily: fonts.inter, color: INK, textAlign: 'left' }}>
    <div style={{ height: 560, position: 'relative' }}>
      <Pic src={IMG.waves} />
      <div style={{ position: 'absolute', left: 60, bottom: 50, fontSize: 150, fontWeight: 700, letterSpacing: '-0.05em', color: '#fff' }}>Tide 26</div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '40px 60px', fontSize: 34, fontWeight: 560 }}>
      <span>12-14 June, North beach</span>
      <span style={{ padding: '12px 28px', borderRadius: 999, background: INK, color: '#fff', fontSize: 28 }}>Get tickets</span>
    </div>
    <div style={{ display: 'flex', gap: 28, padding: '0 60px 50px' }}>
      {[IMG.tide, IMG.farms, IMG.shore].map((src, i) => (
        <div key={src} style={{ flex: 1, borderRadius: 24, overflow: 'hidden', background: '#fff' }}>
          <div style={{ height: 300 }}>
            <Pic src={src} />
          </div>
          <div style={{ padding: '20px 24px', fontSize: 30, fontWeight: 560 }}>{['Low tide sessions', 'Kelp walk', 'Shore lights'][i]}</div>
        </div>
      ))}
    </div>
    {['Friday, the long set', 'Saturday, sunrise swim', 'Sunday, the last light'].map((t, i) => (
      <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '34px 60px', borderTop: '1px solid rgba(0,0,0,0.1)', fontSize: 44, fontWeight: 540, letterSpacing: '-0.02em' }}>
        <span>{t}</span>
        <span style={{ opacity: 0.45 }}>{['21:00', '05:40', '20:15'][i]}</span>
      </div>
    ))}
    <div style={{ height: 600, position: 'relative' }}>
      <Pic src={IMG.cloud} />
    </div>
  </div>
);
const TiltScrollDemo: React.FC<DemoProps> = ({ n, name }) => (
  <>
    <TiltScroll at={4} speed={8} rushAt={70} tilt={8} turn={-6} ground="#0B0F18">
      <Page />
    </TiltScroll>
    <Label n={n} name={name} dark />
  </>
);

/** A light tray of rounded slots, each holding a picture, tracked along at a steady height, slowing. */
const SLOTS: Array<[string, string]> = [
  [IMG.tide, 'Low tide'],
  [IMG.waves, 'North beach'],
  [IMG.farms, 'Kelp rows'],
  [IMG.shore, 'Shoreline'],
  [IMG.cloud, 'Cloud streets'],
  [IMG.delta, 'Delta'],
];
const RowTrackDemo: React.FC<DemoProps> = ({ n, name }) => (
  <>
    <RowTrack
      at={0}
      dur={110}
      from={0.2}
      to={3.2}
      ground="#E9E9EC"
      items={SLOTS.map(([src, t]) => (
        <div key={t} style={{ height: 560, borderRadius: 64, background: '#F4F4F6', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.9), 0 30px 60px rgba(20,24,32,0.12)', padding: 40, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ flex: 1, borderRadius: 36, overflow: 'hidden' }}>
            <Pic src={src} />
          </div>
          <div style={{ fontFamily: fonts.inter, fontSize: 38, fontWeight: 560, color: INK, textAlign: 'left' }}>{t}</div>
        </div>
      ))}
    />
    <Label n={n} name={name} />
  </>
);

// the pieces in the order the reel plays them, e.g. { name: 'PushIn', from: 0, dur: 90, render: PushInDemo }
export const SEGMENTS: Segment[] = [
  { name: 'CaretCam', from: 0, dur: 120, render: CaretCamDemo },
  { name: 'PullReveal', from: 120, dur: 70, render: PullRevealDemo },
  { name: 'DepthField', from: 190, dur: 90, render: DepthFieldDemo },
  { name: 'FloorTilt', from: 280, dur: 60, render: FloorTiltDemo },
  { name: 'PullTilt', from: 340, dur: 80, render: PullTiltDemo },
  { name: 'RackFocus', from: 420, dur: 50, render: RackFocusDemo },
  { name: 'ExposureRamp', from: 470, dur: 80, render: ExposureDemo },
  { name: 'TiltScroll', from: 550, dur: 84, render: TiltScrollDemo },
  { name: 'RowTrack', from: 634, dur: 110, render: RowTrackDemo },
];

export const reelCameraDuration = reelDuration(SEGMENTS);
export const ReelCamera: React.FC = () => <Reel film="library-camera" segments={SEGMENTS} background="#E9EBEF" />;
