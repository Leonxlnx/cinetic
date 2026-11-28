// The reel of the motion library's product UI pieces: each piece in catalogue order (src/kit/library/catalog/), at its
// catalogue frames, with its name in the corner. A new UI piece: one segment appended to SEGMENTS.
import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { Brand, Ground, fonts } from '../../kit';
import { Icon } from '../../kit/icons';
import { mixColor } from '../../kit/type';
import {
  lookLight,
  lookDark,
  surfaceStyle,
  Face,
  Notice,
  Pill,
  MarkSlot,
  Pointer,
  NoticePile,
  CardFan,
  BannerPop,
  RowExpand,
  PickList,
  StepList,
  TaskRun,
  CalendarWave,
  BoardDrag,
  PromptAnswer,
  ChatThread,
  ActionMorph,
  SettingsCard,
  PhoneDrop,
  SelectFrame,
  HubPill,
  GhostFill,
  FeedRush,
  StatCount,
  HandleGather,
  DotCaret,
  ChipRoll,
  LinkPanel,
  BentoFly,
  SendLaunch,
  FileDrop,
  Cursor3D,
  BackdropSwap,
  FloodAway,
  StickyType,
  RowCool,
  SkeletonSweep,
  AppPane,
  pressOf,
  useUiFrame,
  type FeedRow,
  type GhostItem,
  type Look,
  type NoticeData,
  type MailData,
  type PersonRow,
} from '../../kit/library/ui';
import { Reel, reelDuration, type DemoProps, type Segment } from './reel';
import { IMG, Photo } from './scenes';

const BLUE: [string, string] = ['#5B86FF', '#2350E6'];
const ORANGE: [string, string] = ['#FF9A5C', '#EC5A2A'];
const AMBER: [string, string] = ['#FFCB5C', '#F29A1E'];
const SKY: [string, string] = ['#6FD0FF', '#1F90E2'];

const Label: React.FC<{ n: number; name: string; dark?: boolean }> = ({ n, name, dark }) => (
  <div style={{ position: 'absolute', left: 56, bottom: 34, fontFamily: fonts.inter, fontSize: 26, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(17,19,24,0.42)', letterSpacing: '-0.005em', zIndex: 500 }}>
    <span style={{ fontVariantNumeric: 'tabular-nums', marginRight: 12, opacity: 0.7 }}>{n}</span>
    {name}
  </div>
);

const Shot: React.FC<{ L: Look; n: number; name: string; children: React.ReactNode }> = ({ L, n, name, children }) => (
  <AbsoluteFill>
    <Ground color={L.ground} light={false} />
    {children}
    <Label n={n} name={name} dark={L.dark} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------------------------------------------

const orders: NoticeData[] = [
  { title: 'New order · $48', body: 'Maya Lin · Field kit in sand · Lisbon', time: 'now', icon: 'ShoppingBag', colors: ORANGE },
  { title: 'New order · $48', body: 'Theo Park · Field kit in slate · Leeds', time: 'now', icon: 'ShoppingBag', colors: ORANGE },
  { title: 'New order · $96', body: 'Ines Ruiz · two Field kits · Valencia', time: 'now', icon: 'ShoppingBag', colors: ORANGE },
  { title: 'New order · $48', body: 'Sam Cole · Field kit in sand · Austin', time: 'now', icon: 'ShoppingBag', colors: ORANGE },
  { title: 'New order · $48', body: 'Ava Brooks · Field kit in clay · Dublin', time: 'now', icon: 'ShoppingBag', colors: ORANGE },
  { title: 'New order · $48', body: 'Noah Kim · Field kit in slate · Busan', time: 'now', icon: 'ShoppingBag', colors: ORANGE },
  { title: 'New order · $48', body: 'Lena Vogt · Field kit in sand · Graz', time: 'now', icon: 'ShoppingBag', colors: ORANGE },
  { title: 'New order · $144', body: 'Ravi Shah · three Field kits · Pune', time: 'now', icon: 'ShoppingBag', colors: ORANGE },
  { title: 'New order · $48', body: 'Jo Adams · Field kit in slate · Perth', time: 'now', icon: 'ShoppingBag', colors: ORANGE },
].reverse();

const S1: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookDark('#FF7A3D', '#0E0F13');
  return (
    <Shot L={L} n={n} name={name}>
      <NoticePile L={{ ...L, surface: '#1D1E24' }} items={orders} at={4} hold={40} collapseAt={132} y={300} w={1080} size={40} />
    </Shot>
  );
};

const S2: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookDark('#5B86FF', '#0B0C0F');
  const Ld = { ...L, surface: '#202228' };
  const card = (n: NoticeData, k: number) => <Notice key={k} L={Ld} n={n} w={1000} size={38} />;
  return (
    <Shot L={L} n={n} name={name}>
      <CardFan
        at={4}
        w={1000}
        h={204}
        x={1060}
        y={620}
        lift={0.46}
        cards={[
          card({ title: 'Brief updated', body: 'Two new requirements from the client', time: 'now', icon: 'FileText', colors: BLUE }, 0),
          card({ title: 'File shared', body: 'Moodboard v3 is ready to review', time: '1m', icon: 'Folder', colors: AMBER }, 1),
          card({ title: 'New comment', body: 'Can we push the logo a touch left?', time: '2m', icon: 'MessageCircle', colors: SKY }, 2),
        ]}
        fanAt={26}
        foldAt={72}
        exitAt={86}
      />
    </Shot>
  );
};

const S3: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookDark('#5B86FF', '#111216');
  return (
    <Shot L={L} n={n} name={name}>
      <BannerPop L={{ ...L, surface: '#1A1C22' }} at={8} n={{ title: 'Assistant', body: 'Want me to test a lower price this week?', time: 'now', icon: 'Tag', colors: BLUE }} y={520} w={1340} size={42} />
    </Shot>
  );
};

const mail: MailData[] = [
  { from: 'Priya Natarajan', color: '#3D6BFF', time: '10:24', subject: 'Final cut for Thursday', preview: 'Attached the last export. The colour pass is done, sound is next.', unread: true, attach: true, tag: { label: 'Clients', color: '#3D6BFF' } },
  { from: 'Harbour Supplies', color: '#E8892A', time: '09:52', subject: 'Invoice 2041 for the May shoot', preview: 'Hi Dana, please find the invoice for the lighting and grip hire.', unread: true, attach: true, tag: { label: 'Finance', color: '#E8892A' } },
  { from: 'Marco Bellini', color: '#4D5666', time: '09:10', subject: 'Location scout photos', preview: 'Forty frames from the old ferry terminal, the light is great after four.', attach: true },
  { from: 'Studio calendar', color: '#D9534A', time: 'Yesterday', subject: 'Moved: grading session to 15:00', preview: 'Room 2 is booked instead of Room 4. Nothing else changes.', tag: { label: 'Urgent', color: '#D9534A' } },
  { from: 'Jonas Weber', color: '#2C9BE8', time: 'Yesterday', subject: 'Re: Music licence', preview: 'They agreed to the two-year term. Contract is on its way.' },
];

const S4: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#E9EBEF');
  const s = 31;
  const line = (a: string, b: string, strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: L.font, fontSize: s, color: strong ? L.ink : L.muted, fontWeight: strong ? 650 : 400, padding: `${s * 0.42}px 0`, borderTop: `1px solid ${L.line}`, fontVariantNumeric: 'tabular-nums' }}>
      <span>{a}</span>
      <span style={{ color: L.ink, fontWeight: strong ? 650 : 560 }}>{b}</span>
    </div>
  );
  return (
    <Shot L={L} n={n} name={name}>
      <RowExpand
        L={L}
        rows={mail.slice(0, 4)}
        index={1}
        at={6}
        openAt={46}
        closeAt={124}
        size={s}
        w={1680}
        h={900}
        y={538}
        toLine="to me · Tuesday 14 May, 09:52"
        detail={[
          <div key="p" style={{ fontFamily: L.font, fontSize: s, lineHeight: 1.45, color: L.ink, maxWidth: 1240 }}>Hi Dana, please find the invoice for the lighting and grip hire on the May shoot. Payment within 14 days.</div>,
          <div key="t" style={{ marginTop: s * 0.8, maxWidth: 900 }}>
            {line('Lighting kit, 3 days', '$780.00')}
            {line('Grip and dolly, 2 days', '$460.00')}
            {line('Total due 28 May', '$1,240.00', true)}
          </div>,
          <div key="a" style={{ marginTop: s * 0.9, display: 'inline-flex', alignItems: 'center', gap: s * 0.6, padding: `${s * 0.5}px ${s * 0.9}px ${s * 0.5}px ${s * 0.5}px`, borderRadius: s * 0.6, border: `1px solid ${L.line}`, fontFamily: L.font, background: '#FAFAFB' }}>
            <div style={{ width: s * 1.9, height: s * 1.9, borderRadius: s * 0.4, background: '#FDECEA', color: '#D9534A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="FileText" size={s} stroke={2} />
            </div>
            <div>
              <div style={{ fontSize: s * 0.9, fontWeight: 600, color: L.ink }}>INV-2041.pdf</div>
              <div style={{ fontSize: s * 0.78, color: L.muted }}>184 KB</div>
            </div>
          </div>,
        ]}
      />
    </Shot>
  );
};

const people: PersonRow[] = [
  ['Ada Moreno', 'Design lead', '#C8692E'],
  ['Ben Ito', 'Frontend', '#3D6BFF'],
  ['Cleo Grant', 'Product', '#4D5666'],
  ['Dev Rao', 'Backend', '#E8892A'],
  ['Eva Lund', 'Research', '#2C9BE8'],
  ['Finn Weber', 'Platform', '#D9534A'],
  ['Gia Romano', 'Design', '#C8692E'],
  ['Hugo Lam', 'Data', '#4D5666'],
  ['Iris Novak', 'Frontend', '#3D6BFF'],
  ['Jon Price', 'Security', '#E8892A'],
  ['Kai Silva', 'Mobile', '#2C9BE8'],
  ['Lea Fontaine', 'Frontend lead', '#D9534A'],
  ['Milo Hart', 'Support', '#4D5666'],
  ['Nina Berg', 'Design systems', '#C8692E'],
  ['Omar Haddad', 'Infrastructure', '#3D6BFF'],
].map(([name, role, color], i) => ({
  name,
  role,
  color,
  presence: i % 3 === 0 ? '#2FA86B' : i % 3 === 1 ? '#F2A324' : '#C4C8CF',
  status: i % 4 === 0 ? { label: 'In review', color: '#E8892A' } : i % 4 === 2 ? { label: 'Away', color: undefined } : { label: `${(i * 3) % 7 + 1} open`, color: '#3D6BFF' },
  trail: `${String(8 + ((i * 5) % 10)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
}));

const S5: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#E9EBEF');
  return (
    <Shot L={L} n={n} name={name}>
      <PickList L={L} rows={people} target={11} query="lea" at={8} dur={36} w={1320} size={30} />
    </Shot>
  );
};

const S6: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#E8572A', '#ECEBE8');
  const t = (label: string, color: string) => ({ label, color });
  const columns = [
    {
      name: 'To do',
      color: '#A3A8B0',
      cards: [
        { id: 'WEB-214', title: 'Pricing page for teams', tag: t('Web', '#3D6BFF'), who: 'Ada Moreno', whoColor: '#C8692E', due: 'May 16', comments: 4, checks: '2/5' },
        { id: 'APP-88', title: 'Offline mode for notes', tag: t('Mobile', '#E8892A'), who: 'Kai Silva', whoColor: '#2C9BE8', due: 'May 20', comments: 1, checks: '0/3' },
        { id: 'WEB-219', title: 'Invite flow copy', tag: t('Content', '#D9534A'), who: 'Cleo Grant', whoColor: '#4D5666', due: 'May 22', comments: 7 },
      ],
    },
    {
      name: 'In progress',
      color: '#F2A324',
      cards: [
        { id: 'API-301', title: 'Rate limits per workspace', tag: t('Platform', '#4D5666'), who: 'Finn Weber', whoColor: '#D9534A', due: 'May 15', comments: 12, checks: '4/6' },
        { id: 'WEB-207', title: 'Billing settings redesign', tag: t('Web', '#3D6BFF'), who: 'Gia Romano', whoColor: '#C8692E', due: 'May 17', comments: 3, checks: '1/4' },
      ],
    },
    {
      name: 'Done',
      color: '#3D6BFF',
      cards: [
        { id: 'APP-80', title: 'Push notification settings', tag: t('Mobile', '#E8892A'), who: 'Ben Ito', whoColor: '#3D6BFF', due: 'May 9', comments: 5, checks: '6/6' },
        { id: 'WEB-198', title: 'Search keyboard shortcuts', tag: t('Web', '#3D6BFF'), who: 'Iris Novak', whoColor: '#3D6BFF', due: 'May 8', comments: 2, checks: '3/3' },
        { id: 'API-290', title: 'Audit log export', tag: t('Platform', '#4D5666'), who: 'Jon Price', whoColor: '#E8892A', due: 'May 6', comments: 9 },
      ],
    },
  ];
  return (
    <Shot L={L} n={n} name={name}>
      <BoardDrag L={L} columns={columns} from={[0, 0]} to={[1, 0]} at={6} pressAt={42} dur={30} w={1680} h={900} y={538} size={30} />
    </Shot>
  );
};

const S7: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#E8572A', '#F1F0EE');
  const items = [
    { label: 'Video', icon: 'Video' },
    { label: 'Web pages', icon: 'Globe' },
    { label: 'Markdown', icon: 'FileText' },
    { label: 'Tables', icon: 'Table' },
    { label: 'Screenshots', icon: 'Camera' },
    { label: 'Images', icon: 'Image' },
    { label: 'Links', icon: 'Link' },
    { label: 'Summaries', icon: 'AlignLeft' },
    { label: 'Audio', icon: 'AudioLines' },
    { label: 'Slides', icon: 'Presentation' },
  ];
  return (
    <Shot L={L} n={n} name={name}>
      <StepList L={L} items={items} at={10} every={[10, 8, 7, 6, 5, 5, 4, 4, 4]} x={880} size={84} />
    </Shot>
  );
};

const S8: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookDark('#4F7BFF', '#0B0C10');
  return (
    <Shot L={L} n={n} name={name}>
      <TaskRun L={{ ...L, surface: '#17181D' }} at={10} working="Setting up" done="Created" doneAt={78} w={1180} size={38} title="Setting up your store" tasks={['Brand colours', 'Product page', 'Checkout', 'Order emails', 'Shipping rates', 'Tax settings', 'Domain', 'Analytics', 'Launch checklist']} />
    </Shot>
  );
};

const S9: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#E9EBEF');
  const s = 34;
  const W = 1180;
  const top = 200;
  const files = [
    ['pages/pricing.tsx', '+42', '-8'],
    ['components/PlanCard.tsx', '+118', '-0'],
    ['styles/tokens.css', '+6', '-6'],
  ];
  const pressAt = 64;
  const bx = 960;
  const by = top + 560;
  return (
    <Shot L={L} n={n} name={name}>
      <div style={{ ...surfaceStyle(L, 5, s * 1.05), position: 'absolute', left: 960 - W / 2, top, width: W, height: 660, fontFamily: L.font }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.6, padding: `${s * 1.0}px ${s * 1.2}px`, borderBottom: `1px solid ${L.line}` }}>
          <MarkSlot icon="Rocket" colors={BLUE} size={s * 1.8} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: s * 1.05, fontWeight: 650, color: L.ink, letterSpacing: '-0.015em' }}>Publish changes</div>
            <div style={{ fontSize: s * 0.78, color: L.muted, marginTop: 4 }}>3 files · to field.studio</div>
          </div>
          <Pill L={L} label="Approved" icon="Check" color={L.accent} size={s * 0.74} />
        </div>
        <div style={{ padding: `${s * 0.5}px ${s * 1.2}px` }}>
          {files.map(([f, a, d], i) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: s * 0.6, height: s * 2.4, borderTop: i ? `1px solid ${L.line}` : undefined }}>
              <Icon name="FileCode" size={s * 0.95} color={L.muted} stroke={2} />
              <span style={{ flex: 1, fontSize: s * 0.9, color: L.ink, fontFamily: fonts.mono ?? L.font }}>{f}</span>
              <span style={{ fontSize: s * 0.82, color: L.accent, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{a}</span>
              <span style={{ width: s * 1.6, textAlign: 'right', fontSize: s * 0.82, color: '#D9534A', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{d}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: s * 0.5, marginTop: s * 0.8, fontSize: s * 0.8, color: L.muted }}>
            <div style={{ display: 'flex' }}>
              <Face name="Ada Moreno" color="#C8692E" size={s * 1.3} />
              <div style={{ marginLeft: -s * 0.3, borderRadius: s, boxShadow: '0 0 0 2px #FFF' }}>
                <Face name="Ben Ito" color="#3D6BFF" size={s * 1.3} />
              </div>
            </div>
            Reviewed by Ada and Ben
          </div>
        </div>
      </div>
      <ActionMorph L={L} label="Publish" working="Publishing" doneLabel="Live on field.studio" at={8} pressAt={pressAt} hoverAt={pressAt - 9} dur={44} x={bx} y={by} size={40} w={400} trackW={W - s * 2.4} />
      <Pointer keys={[{ f: 8 + pressAt - 34, x: bx + 520, y: by + 300 }, { f: 8 + pressAt - 4, x: bx + 30, y: by + 10 }, { f: 8 + pressAt + 30, x: bx + 260, y: by + 150 }]} clicks={[8 + pressAt]} size={78} ring="#9DB6FF" exitAt={8 + pressAt + 34} />
    </Shot>
  );
};

const S10: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#E8572A', '#EFEDEA');
  return (
    <Shot L={L} n={n} name={name}>
      <PromptAnswer
        L={L}
        at={8}
        prompt="Draft a launch note for Friday"
        answer="Field kit 2 ships Friday: a lighter frame, a battery that lasts two days and free returns for thirty days. I kept it under 150 words."
        status="Writing"
        y={850}
        w={1360}
        size={34}
      />
    </Shot>
  );
};

const S11: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B7BFF', '#E9EBEF');
  return (
    <Shot L={L} n={n} name={name}>
      <ChatThread
        L={L}
        at={6}
        macro={1.9}
        size={36}
        w={1180}
        h={880}
        msgs={[
          { f: -90, text: 'Did the samples arrive?' },
          { f: -60, text: 'Yes, all six. They look great', me: true },
          { f: -30, text: 'Good. Then let us talk next steps' },
          { f: 26, text: 'Are you free tomorrow at ten?', typing: 22 },
          { f: 92, text: 'Yes, works for me. Your office?', me: true },
          { f: 146, text: 'Perfect, I will book the corner room', typing: 26 },
        ]}
      />
    </Shot>
  );
};

const S12: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#E9EBEF');
  return (
    <Shot L={L} n={n} name={name}>
      <SettingsCard
        L={L}
        at={6}
        w={1280}
        size={32}
        rows={[
          { icon: 'CloudUpload', title: 'Automatic backups', sub: 'Back up every project in the background', control: { kind: 'toggle', clickAt: 40 } },
          { icon: 'Clock', title: 'Frequency', sub: 'How often a new version is saved', control: { kind: 'segment', options: ['Hourly', 'Daily', 'Weekly'], active: 1, to: 0, clickAt: 70 } },
          { icon: 'History', title: 'Keep versions for', sub: 'Older versions are removed for good', control: { kind: 'slider', keys: [{ f: 96, v: 0.25 }, { f: 120, v: 0.72 }], format: (v) => `${Math.round(7 + v * 83)} days` } },
          { icon: 'Signal', title: 'Back up over cellular', sub: 'May use your mobile data allowance', control: { kind: 'toggle' } },
          { icon: 'Lock', title: 'Encrypt backups', sub: 'Only your devices can read them', control: { kind: 'toggle', on: true } },
        ]}
      />
    </Shot>
  );
};

const S13: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#E9EBEF');
  const C = { blue: '#3D6BFF', orange: '#E8742E', amber: '#E0A21E', red: '#D9534A', sky: '#2C9BE8', slate: '#4D5666' };
  const ev = [
    { day: 0, start: 9, len: 1, title: 'Stand-up', color: C.blue },
    { day: 0, start: 11, len: 2, title: 'Design review', color: C.orange },
    { day: 0, start: 14.5, len: 1, title: 'Hiring sync', color: C.slate },
    { day: 1, start: 10, len: 1, title: 'Hiring panel', color: C.slate },
    { day: 1, start: 13, len: 2.5, title: 'Workshop', color: C.sky },
    { day: 2, start: 9, len: 1, title: 'Stand-up', color: C.blue },
    { day: 2, start: 12, len: 1.5, title: 'Lunch talk', color: C.amber },
    { day: 2, start: 14.5, len: 2, title: 'Launch prep', color: C.red },
    { day: 3, start: 10, len: 2, title: 'Roadmap', color: C.orange },
    { day: 3, start: 14, len: 1, title: 'One to one', color: C.slate },
    { day: 4, start: 9, len: 1, title: 'Stand-up', color: C.blue },
    { day: 4, start: 11, len: 1.5, title: 'Demo day', color: C.sky },
    { day: 4, start: 15, len: 1.5, title: 'Retro', color: C.amber },
  ];
  return (
    <Shot L={L} n={n} name={name}>
      <CalendarWave L={L} events={ev} at={18} wave={24} y={538} w={1680} h={900} size={33} />
    </Shot>
  );
};

const S14: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#E6E8EC');
  return (
    <Shot L={L} n={n} name={name}>
      <PhoneDrop L={L} at={4} n={{ title: 'Rosa Diaz', body: 'Can we move it to tomorrow?', time: 'now', letter: 'R', colors: ORANGE }} reply="Sure, see you at ten" y={570} w={480} />
    </Shot>
  );
};

// a selection frame dragged open over a card on a canvas
const S15: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#E9EBEF');
  const box = { left: 660, top: 300, w: 600, h: 400 };
  return (
    <Shot L={L} n={n} name={name}>
      <div style={{ ...surfaceStyle(L, 3, 22), position: 'absolute', left: box.left, top: box.top, width: box.w, height: box.h, padding: 40, boxSizing: 'border-box', fontFamily: L.font, color: L.ink }}>
        <div style={{ fontSize: 44, fontWeight: 650, letterSpacing: '-0.02em' }}>Pro</div>
        <div style={{ marginTop: 14, fontSize: 30, color: L.muted }}>For teams that ship every week</div>
        <div style={{ marginTop: 26, fontSize: 96, fontWeight: 620, letterSpacing: '-0.045em', lineHeight: 1 }}>$24</div>
        <div style={{ position: 'absolute', left: 40, right: 40, bottom: 40, height: 64, borderRadius: 16, background: L.ink }} />
      </div>
      <SelectFrame L={L} at={14} left={box.left - 12} top={box.top - 12} w={box.w + 24} h={box.h + 24} tag="600 x 400" size={28} />
      <Pointer keys={[{ f: 4, x: box.left - 60, y: box.top - 70 }, { f: 13, x: box.left - 12, y: box.top - 12 }, { f: 26, x: box.left + box.w + 12, y: box.top + box.h + 12, bow: 0 }, { f: 52, x: box.left + box.w + 90, y: box.top + box.h + 120 }]} clicks={[13]} size={64} ring={false} />
    </Shot>
  );
};


// words append into a hub pill; each word brings a tool tile with its connector dot; the tiles fly out past the camera
const S16: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#1D1F24', '#F6F4EF');
  const t = (brand: string, dot: string, dx: number, dy: number, word: number) => ({ mark: <Brand name={brand} size={76} />, dot, dx, dy, word });
  return (
    <Shot L={L} n={n} name={name}>
      <HubPill
        L={L}
        at={6}
        words={['Works', 'inside', 'your', 'stack']}
        every={[12, 14, 9]}
        flyAt={62}
        tiles={[t('figma', '#F2B33D', -0.31, -0.21, 0), t('notion', '#E0566B', 0.03, -0.33, 1), t('slack', '#3F7FE0', -0.21, 0.29, 2), t('github', '#2B2F36', 0.2, 0.29, 3), t('google-drive', '#E0566B', 0.36, -0.12, 3)]}
      />
    </Shot>
  );
};

// ghost slots round the mark take their colours one tile at a time, faster and faster
const GF_COLORS: Array<[string, string]> = [['#FF9A5C', '#EC5A2A'], ['#6FD0FF', '#1F90E2'], ['#FF8FB1', '#E2457A'], ['#FFCB5C', '#F29A1E'], ['#5B86FF', '#2350E6'], ['#9AA3B5', '#5B6478'], ['#FF7A6B', '#D93A30'], ['#63D3C8', '#169C93']];
const GF_ICONS = ['Clapperboard', 'Layers', 'Music', 'Type', 'Video', 'Scissors', 'Film', 'Shapes', 'Palette', 'AudioLines', 'Crop', 'SlidersHorizontal', 'Captions', 'Image', 'Pen', 'Aperture'];
const GF_SLOTS: Array<[number, number]> = [[0, -2], [-2, -1], [2, -1], [-1, -1], [1, -1], [-3, 0], [-1, 0], [1, 0], [3, 0], [-2, 1], [2, 1], [-1, 2], [1, 2], [0, -3], [-3, -2], [3, 2]];
const ghostItems: GhostItem[] = GF_SLOTS.map(([c, r], i) => ({ c, r, icon: GF_ICONS[i], colors: GF_COLORS[i % GF_COLORS.length] }));

const S17: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#F7F5F0');
  return (
    <Shot L={L} n={n} name={name}>
      <GhostFill
        L={L}
        at={8}
        items={ghostItems}
        cols={5}
        rows={3}
        center={<div style={{ width: 92, height: 92, borderRadius: 26, background: '#141519', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="Hexagon" size={48} color="#FFFFFF" stroke={2.4} /></div>}
        labels={[{ item: 0, text: 'Beat sync', f: 52 }, { item: 9, text: 'Auto captions', f: 58 }, { item: 11, text: 'Colour match', f: 64 }]}
        tile={92}
      />
    </Shot>
  );
};

// a comment feed fills, rushes into a smear while the counter races, lands on one highlighted row
const feed: FeedRow[] = [
  ['Nora Field', '#3D6BFF', '2 hours ago', 'Finally a routine I can do in a small flat'],
  ['Tomas Reyes', '#E8892A', '3 hours ago', 'How long before I should add weight?'],
  ['Mila Novak', '#D9534A', '5 hours ago', 'Day 12 and my back feels so much better'],
  ['Arjun Mehta', '#2C9BE8', '6 hours ago', 'Could you make a version for mornings?'],
  ['Ellie Brandt', '#4D5666', '8 hours ago', 'The breathing cue at 4:10 changed everything'],
  ['Sven Olsen', '#C8692E', '9 hours ago', 'Shared this with my whole running club'],
  ['Hana Sato', '#3D6BFF', '11 hours ago', 'Any tips for tight hips after sitting all day?'],
  ['Luca Bianchi', '#E8892A', '12 hours ago', 'Three weeks in, zero missed sessions'],
  ['Ines Duarte', '#2C9BE8', '1 day ago', 'Please do one on mobility for desk workers'],
  ['Owen Price', '#D9534A', '1 day ago', 'Been doing this for a month. When do I go heavier?'],
  ['Zoe Laurent', '#4D5666', '1 day ago', 'My physio approved, which says a lot'],
  ['Kofi Mensah', '#C8692E', '2 days ago', 'The pacing is perfect for beginners'],
  ['Rita Gomes', '#3D6BFF', '2 days ago', 'Is there a printable plan somewhere?'],
].map(([name, color, time, text]) => ({ name, color, time, text }));

const S18: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#E9EBEF');
  return (
    <Shot L={L} n={n} name={name}>
      <FeedRush L={L} rows={feed} target={9} at={8} intro={3} every={8} dur={54} pass={24} total={3412} size={34} w={1240} />
    </Shot>
  );
};

// stat cards over a picture appear blank and count up, each at its own rate
const S19: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#1F8A8A', '#E9EBEF');
  return (
    <AbsoluteFill>
      <Photo src={IMG.tide} zoom={1.08} drift={0.0004} dim={0.12} />
      <StatCount
        L={L}
        at={6}
        cards={[
          { label: 'Onboarding cost', sub: 'Last month', from: 10, to: 1240, rate: 27, prefix: '$', pill: { label: 'Paid', color: '#1F8A8A' }, f: 0, cx: 0.3, cy: 0.64, w: 0.27 },
          { label: 'Hours trained', sub: 'This week', from: 0, to: 420, rate: 10, pill: { label: 'Logged' }, f: 11, cx: 0.2, cy: 0.25, w: 0.23 },
          { label: 'Shifts covered', sub: 'Today', from: 0, to: 64, rate: 2, pill: { label: 'Live', color: '#E8742E' }, f: 18, cx: 0.79, cy: 0.4, w: 0.23 },
        ]}
      />
      <Label n={n} name={name} dark />
    </AbsoluteFill>
  );
};


// scattered squares hop in and lock as the handles of a selection round a word typed in fresh ink
const S20: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#FFFFFF');
  return (
    <Shot L={L} n={n} name={name}>
      <HandleGather L={L} text="Your release notes" at={8} size={56} />
    </Shot>
  );
};

// a dot drops into the address field and becomes the caret; the field widens, the view pushes in, a query types
const S21: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#F0F0F0');
  return (
    <Shot L={L} n={n} name={name}>
      <DotCaret L={L} at={6} dropAt={10} text="brand assets from the spring shoot" typeAt={30} size={100} />
    </Shot>
  );
};

// an app chip inside the line rolls like a slot reel to the next tool
const S22: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#F0F0F0');
  return (
    <Shot L={L} n={n} name={name}>
      <ChipRoll
        L={L}
        at={8}
        before="find every"
        after="file you made"
        chips={[
          { name: 'Figma', mark: <Brand name="figma" size={40} /> },
          { name: 'Notion', mark: <Brand name="notion" size={40} /> },
          { name: 'Docs', mark: <Brand name="google-docs" size={40} /> },
        ]}
        steps={[22, 34]}
        stepDur={[6, 4]}
        size={64}
      />
    </Shot>
  );
};


// connectors draw from the sources into a panel, pulses run along them, rows land lit and settle, totals count
const S23: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookDark('#3D8BFF', '#08090C');
  const thumb = (src: string) => <img src={staticFile(`img/${src}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  return (
    <Shot L={{ ...L, surface: '#16181D' }} n={n} name={name}>
      <LinkPanel
        L={{ ...L, surface: '#16181D' }}
        at={6}
        size={34}
        srcX={0.12}
        panelX={0.67}
        panelW={0.5}
        sources={[
          { title: 'Ten-minute core', thumb: thumb(IMG.waves), chip: '1,204 clicks', row: { label: 'Ten-minute core', meta: '64 sales', value: '$1,402' } },
          { title: 'Desk stretch', thumb: thumb(IMG.tide), chip: '486 clicks', row: { label: 'Desk stretch', meta: '21 sales', value: '$512' } },
          { title: 'Morning mobility', thumb: thumb(IMG.shore), chip: '304 clicks', row: { label: 'Morning mobility', meta: '17 sales', value: '$398' } },
          { title: 'Run warm-up', thumb: thumb(IMG.cloud), chip: '567 clicks', row: { label: 'Run warm-up', meta: '28 sales', value: '$1,018' } },
        ]}
        totals={[
          { label: 'Revenue', from: 3330, step: 37, steps: 9, prefix: '$' },
          { label: 'Sales', from: 121, step: 1, steps: 9 },
          { label: 'Conversion', from: 4.82, step: 0.03, steps: 9, suffix: ' %', decimals: 2 },
        ]}
      />
    </Shot>
  );
};

// tiles fly in from every side and brake into a bento grid
const S24: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#1E3A5F', '#F4F1EA');
  const im = (k: keyof typeof IMG) => `img/${IMG[k]}`;
  return (
    <Shot L={L} n={n} name={name}>
      <BentoFly
        L={L}
        at={4}
        cols={4}
        rows={3}
        tiles={[
          { c: 0, r: 0, cw: 2, kind: 'photo', src: im('tide'), from: 'left' },
          { c: 2, r: 0, kind: 'disc', color: '#1E3A5F', icon: 'Briefcase', from: 'top', delay: 1 },
          { c: 3, r: 0, kind: 'photo', src: im('farms'), from: 'right', delay: 2 },
          { c: 0, r: 1, rh: 2, kind: 'photo', src: im('waves'), from: 'left', delay: 1 },
          { c: 1, r: 1, kind: 'solid', color: '#1E3A5F', from: 'bottom', delay: 0, node: (
            <div style={{ position: 'absolute', inset: 0, padding: '34px 40px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: fonts.inter, color: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 520, color: 'rgba(255,255,255,0.72)' }}>
                <Icon name="MapPin" size={28} color="rgba(255,255,255,0.72)" stroke={2} />
                Lisbon, Oslo, remote
              </div>
              <div>
                <div style={{ fontSize: 112, fontWeight: 640, letterSpacing: '-0.04em', lineHeight: 0.95, fontVariantNumeric: 'tabular-nums' }}>24</div>
                <div style={{ marginTop: 10, fontSize: 32, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>teams hiring this spring</div>
              </div>
            </div>
          ) },
          { c: 2, r: 1, cw: 2, kind: 'photo', src: im('cloud'), from: 'right', delay: 3 },
          { c: 1, r: 2, kind: 'pill', color: '#E8742E', node: <span style={{ fontFamily: fonts.inter, fontSize: 40, fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.01em' }}>Open roles</span>, from: 'bottom', delay: 4 },
          { c: 2, r: 2, kind: 'photo', src: im('shore'), from: 'bottom', delay: 5 },
          { c: 3, r: 2, kind: 'disc', src: im('delta'), from: 'right', delay: 7 },
        ]}
      />
    </Shot>
  );
};


// send: the button lifts away, the composer falls, a spark on the dark leads the app window in
const S25: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookDark('#E8E8EA', '#0F0F10');
  const Lw = { ...L, surface: '#18181A' };
  const code = [
    ['1', 'import', ' { Calendar, Pass } ', 'from', " './ui'"],
    ['2', 'import', ' { useSlots } ', 'from', " './booking'"],
    ['3', '', '', '', ''],
    ['4', 'export', ' function ', 'Wall', '() {'],
    ['5', '  const', ' slots = ', 'useSlots', "('bouldering')"],
    ['6', '  const', ' passes = ', 'usePasses', "('day')"],
    ['7', '  return', ' (', '', ''],
    ['8', '    <', 'Calendar ', 'slots', '={slots}>'],
    ['9', '      <', 'Pass ', 'price', '={passes.adult} />'],
    ['10', '      <', 'Pass ', 'price', '={passes.youth} />'],
    ['11', '    </', 'Calendar', '>', ''],
    ['12', '  );', '', '', ''],
    ['13', '}', '', '', ''],
  ];
  const steps: Array<[string, string, boolean]> = [['FilePlus2', 'Created booking.ts', true], ['FilePlus2', 'Created Wall.tsx', true], ['Ticket', 'Adding day passes', false]];
  const win = (
    <AppPane L={Lw} w={1300} h={800} title="Climb app" icon="Mountain" size={30}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 440, borderRight: `1px solid ${Lw.line}`, padding: 28, boxSizing: 'border-box', fontFamily: Lw.font }}>
        <div style={{ marginLeft: 40, padding: '16px 20px', borderRadius: 18, background: '#26272B', color: Lw.ink, fontSize: 30, lineHeight: 1.35 }}>Build a booking app for a climbing gym, with day passes</div>
        <div style={{ marginTop: 26, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 30, border: `1px solid ${Lw.line}`, color: Lw.muted, fontSize: 26 }}>Building the app…</div>
        {steps.map(([ic, label, done]) => (
          <div key={label} style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, color: done ? Lw.muted : Lw.ink }}>
            <Icon name={done ? 'Check' : ic} size={26} color={done ? '#7FB4FF' : Lw.ink} stroke={2.2} />
            {label}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 440, right: 0, top: 0, bottom: 0, padding: '28px 30px', fontFamily: fonts.mono, fontSize: 28, lineHeight: 1.62 }}>
        {code.map((c) => (
          <div key={c[0]} style={{ whiteSpace: 'pre' }}>
            <span style={{ color: '#5C5F66', display: 'inline-block', width: 52, marginRight: 14, textAlign: 'right' }}>{c[0]}</span>
            <span style={{ color: '#E08A6B' }}>{c[1]}</span>
            <span style={{ color: '#D8D9DC' }}>{c[2]}</span>
            <span style={{ color: '#7FB4FF' }}>{c[3]}</span>
            <span style={{ color: '#E9C46A' }}>{c[4]}</span>
          </div>
        ))}
      </div>
    </AppPane>
  );
  return (
    <AbsoluteFill>
      <SendLaunch L={{ ...L, surface: '#1C1C1E' }} at={24} size={36} prompt="Build a booking app for a climbing gym, with day passes" window={win} winW={1300} winH={800} />
      <Label n={n} name={name} dark />
    </AbsoluteFill>
  );
};

// the pointer carries a file in on an arc, the file swinging from its tip, and drops it into the composer
const S26: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#C4623E', '#F3F1EC');
  return (
    <Shot L={L} n={n} name={name}>
      <FileDrop L={L} at={6} size={36} file={{ name: 'Lease agreement.pdf', size: '2.4 MB · 18 pages' }} greeting="What should we look at?" />
    </Shot>
  );
};

// an extruded cursor glides onto a button and presses; the button flips to its requested state
const S27: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2F4BD8', '#E6EAF5');
  const f = useUiFrame();
  const click = 34;
  const p = pressOf(f, [click]);
  const done = f >= click + 1;
  const bx = 1166;
  const by = 720;
  return (
    <Shot L={L} n={n} name={name}>
      <div style={{ ...surfaceStyle(L, 4, 34), position: 'absolute', left: 560, top: 250, width: 800, height: 560, padding: 44, fontFamily: L.font }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Face name="Lena Ortiz" color="#C8692E" size={64} />
          <div>
            <div style={{ fontSize: 30, fontWeight: 620, color: L.ink }}>Lena Ortiz</div>
            <div style={{ fontSize: 27, color: L.muted }}>Research lead · Coastal lab</div>
          </div>
        </div>
        <div style={{ marginTop: 32, fontSize: 40, fontWeight: 640, letterSpacing: '-0.02em', color: L.ink, lineHeight: 1.15 }}>Tide data for the northern estuary</div>
        <div style={{ marginTop: 18, fontSize: 28, color: L.muted, lineHeight: 1.4 }}>Hourly readings from eleven stations since 2019, cleaned and labelled. Access on request.</div>
        <div style={{ marginTop: 26, display: 'flex', gap: 12 }}>
          <Pill L={L} label="Oceanography" color="#2C9BE8" size={22} />
          <Pill L={L} label="Open data" size={22} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: bx - 150, top: by - 6, width: 300, height: 76, borderRadius: 20, background: done ? mixColor(L.surface, L.accent, 0.12) : L.accent, color: done ? L.accent : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: L.font, fontSize: 28, fontWeight: 600, transform: `scale(${1 - p * 0.04})`, boxShadow: done ? 'none' : '0 6px 16px rgba(47,75,216,0.3)' }}>
        {done ? 'Requested' : 'Request access'}
      </div>
      <Cursor3D keys={[{ f: 10, x: bx + 260, y: by + 380 }, { f: 30, x: bx + 40, y: by + 40 }, { f: 70, x: bx + 70, y: by + 60 }]} clicks={[click]} ground="#2A2F3A" color="#F4F5F7" size={84} />
    </Shot>
  );
};

// the phone holds still while the pictures behind it cut every five frames
const S28: React.FC<DemoProps> = ({ n, name }) => {
  const im = (k: keyof typeof IMG) => `img/${IMG[k]}`;
  return (
    <AbsoluteFill>
      <BackdropSwap
        at={4}
        every={5}
        end
        h={0.82}
        ground="#E7E8EA"
        backdrops={[{ src: im('waves') }, { src: im('tide') }, { color: '#1E4E8C' }, { src: im('shore') }, { src: im('cloud') }, { color: '#0F2F57' }, { src: im('farms') }]}
      >
        <div style={{ position: 'absolute', inset: 0, background: '#F5F6F8', fontFamily: fonts.inter, padding: '70px 22px 0' }}>
          <div style={{ fontSize: 34, fontWeight: 650, color: '#111318' }}>Cards</div>
          <div style={{ marginTop: 16, height: 168, borderRadius: 18, background: 'linear-gradient(140deg, #2D6BD8, #133E8F)', boxShadow: '0 8px 20px rgba(19,62,143,0.35)', padding: 18, boxSizing: 'border-box', color: '#FFFFFF' }}>
            <div style={{ fontSize: 22, fontWeight: 600, opacity: 0.9 }}>Travel</div>
            <div style={{ marginTop: 64, fontSize: 24, letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}>•••• 4821</div>
          </div>
          {[['Contactless', 'On'], ['Spend abroad', 'No fees']].map(([a, b]) => (
            <div key={a} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, fontSize: 22, color: '#111318' }}>
              <span>{a}</span>
              <span style={{ color: '#2D6BD8', fontWeight: 600 }}>{b}</span>
            </div>
          ))}
          <div style={{ marginTop: 30, height: 56, borderRadius: 28, background: '#111318', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23, fontWeight: 600 }}>Add to wallet</div>
          <div style={{ marginTop: 34, fontSize: 20, fontWeight: 600, color: '#6B7080' }}>Recent</div>
          {[['Plane', 'Lisbon flight', '−€184'], ['Coffee', 'Café Nata', '−€4.20'], ['TrainFront', 'Airport line', '−€2.90']].map(([ic, a, b]) => (
            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, fontSize: 21, color: '#111318' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E4E8F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={ic} size={21} color="#2D6BD8" stroke={2} />
              </div>
              <span style={{ flex: 1 }}>{a}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{b}</span>
            </div>
          ))}
        </div>
      </BackdropSwap>
      <Label n={n} name={name} />
    </AbsoluteFill>
  );
};

// the cards round a line flood with colour and blow away outward
const S29: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2F45D0', '#F7F8FC');
  const mini = (title: string, body: string, icon: string, c: [string, string]) => <Notice L={L} n={{ title, body, icon, colors: c, time: 'now' }} w={557} size={30} style={{ width: '100%', height: '100%' }} />;
  const cards = [
    { node: mini('Standup notes', 'Three blockers, one owner', 'FileText', BLUE), x: 0.17, y: 0.2, w: 0.29, h: 0.13, rot: -3 },
    { node: mini('Q3 roadmap', 'Updated by Ada', 'Map', AMBER), x: 0.8, y: 0.17, w: 0.29, h: 0.13, rot: 2 },
    { node: mini('Design review', 'Moved to 15:00', 'Calendar', ORANGE), x: 0.84, y: 0.78, w: 0.29, h: 0.13, rot: -2 },
    { node: mini('Survey results', '214 new responses', 'ChartColumn', SKY), x: 0.15, y: 0.8, w: 0.29, h: 0.13, rot: 3 },
    { node: mini('Interview 12', 'Transcript ready', 'Mic', BLUE), x: 0.5, y: 0.1, w: 0.29, h: 0.13, rot: 1 },
    { node: mini('Budget sheet', '4 comments', 'Table', AMBER), x: 0.52, y: 0.9, w: 0.29, h: 0.13, rot: -1 },
  ];
  return (
    <Shot L={L} n={n} name={name}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center', fontFamily: fonts.inter, fontSize: 64, fontWeight: 560, color: L.ink, letterSpacing: '-0.025em' }}>Too many places to look</div>
      <FloodAway cards={cards} at={14} color="#2F45D0" order={[3, 1, 4, 0, 5, 2]} blowAt={6} radius={31.5 / 140} />
    </Shot>
  );
};

// a sticky label stretches while it types and draws its connector to the heading
const S30: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#E8742E', '#ECECEE');
  return (
    <Shot L={L} n={n} name={name}>
      <div style={{ ...surfaceStyle(L, 3, 20), position: 'absolute', left: 560, top: 230, width: 800, height: 600, padding: 56, fontFamily: L.font }}>
        <div style={{ fontSize: 26, color: L.muted, fontWeight: 560 }}>Spring menu · draft 3</div>
        <div style={{ marginTop: 18, fontSize: 64, fontWeight: 660, letterSpacing: '-0.03em', color: L.ink, lineHeight: 1.04 }}>Wild garlic and new potatoes</div>
        <div style={{ marginTop: 24, fontSize: 30, color: L.muted, lineHeight: 1.4 }}>Served with brown butter, capers and a soft egg. Available from Thursday.</div>
        <div style={{ marginTop: 40, width: '100%', height: 190, borderRadius: 14, overflow: 'hidden' }}>
          <img src={staticFile(`img/${IMG.farms}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      </div>
      <StickyType L={L} text="Make the title shorter" at={10} x={1160} y={150} to={{ x: 1200, y: 335 }} color="#FFD8BC" ink="#4A2A14" line="#4A2A14" size={30} />
    </Shot>
  );
};

// a progress log: each verb lands in its icon's colour and cools to the ink as the next arrives
const S31: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#2B5BFF', '#EEF0F3');
  return (
    <Shot L={L} n={n} name={name}>
      <RowCool
        L={L}
        card
        at={4}
        x={960}
        y={540}
        w={780}
        size={42}
        title="Working"
        rows={[
          { icon: 'Search', color: '#2B6BE8', verb: 'Searching', detail: '42 shots across three shoot days' },
          { icon: 'FileText', color: '#E0782E', verb: 'Reading', detail: 'The brief and the client notes' },
          { icon: 'Columns2', color: '#1E9CB8', verb: 'Comparing', detail: 'Takes 3, 7 and 12 of the opening' },
          { icon: 'PenLine', color: '#D9A21E', verb: 'Drafting', detail: 'A 30 second cut with captions' },
          { icon: 'ShieldCheck', color: '#D9534A', verb: 'Checking', detail: 'Music rights and logo clearance' },
        ]}
      />
    </Shot>
  );
};

// skeleton bars cascade in, then a warm band sweeps across and turns them into the answer
const S32: React.FC<DemoProps> = ({ n, name }) => {
  const L = lookLight('#E07A2E', '#FFFFFF');
  return (
    <Shot L={L} n={n} name={name}>
      <div style={{ position: 'absolute', right: 520, top: 170, padding: '18px 26px', borderRadius: 22, background: '#F0F1EC', fontFamily: L.font, fontSize: 32, color: L.ink, maxWidth: 760, lineHeight: 1.35 }}>Turn these notes into a brief for the next shoot</div>
      <div style={{ position: 'absolute', left: 340, top: 318, display: 'flex', alignItems: 'center', gap: 14, fontFamily: L.font, fontSize: 30, fontWeight: 600, color: L.ink }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: L.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="PenLine" size={26} color="#FFFFFF" stroke={2.2} />
        </div>
        Assistant
        <span style={{ fontWeight: 450, color: L.muted }}>· drafting the brief</span>
      </div>
      <SkeletonSweep
        L={L}
        at={8}
        y={610}
        w={1240}
        size={36}
        lines={[
          { text: 'Brief: spring campaign, second shoot', scale: 1.3, weight: 640, gap: 0 },
          { text: 'One take per scene, the camera at eye level', gap: 0.9 },
          { text: 'Open on the product in use, no logo before 0:04', gap: 0.35 },
          { text: 'Natural light only', bullet: true, gap: 0.9 },
          { text: 'Two people, never more', bullet: true, gap: 0.35 },
          { text: 'End on the sound of the door', bullet: true, gap: 0.35 },
        ]}
      />
    </Shot>
  );
};

// the pieces in the order the reel plays them; a new piece appends its segment (from = the last from + dur) and
// gives its catalogue entry the same frames
export const SEGMENTS: Segment[] = [
  { name: 'NoticePile', from: 0, dur: 170, render: S1 },
  { name: 'CardFan', from: 170, dur: 112, render: S2 },
  { name: 'BannerPop', from: 282, dur: 84, render: S3 },
  { name: 'RowExpand', from: 366, dur: 156, render: S4 },
  { name: 'PickList', from: 522, dur: 112, render: S5 },
  { name: 'BoardDrag', from: 634, dur: 132, render: S6 },
  { name: 'StepList', from: 766, dur: 90, render: S7 },
  { name: 'TaskRun', from: 856, dur: 100, render: S8 },
  { name: 'ActionMorph', from: 956, dur: 150, render: S9 },
  { name: 'PromptAnswer', from: 1106, dur: 190, render: S10 },
  { name: 'ChatThread', from: 1296, dur: 200, render: S11 },
  { name: 'SettingsCard', from: 1496, dur: 150, render: S12 },
  { name: 'CalendarWave', from: 1646, dur: 100, render: S13 },
  { name: 'PhoneDrop', from: 1746, dur: 150, render: S14 },
  { name: 'SelectFrame', from: 1896, dur: 60, render: S15 },
  { name: 'HubPill', from: 1956, dur: 90, render: S16 },
  { name: 'GhostFill', from: 2046, dur: 90, render: S17 },
  { name: 'FeedRush', from: 2136, dur: 130, render: S18 },
  { name: 'StatCount', from: 2266, dur: 80, render: S19 },
  { name: 'HandleGather', from: 2346, dur: 50, render: S20 },
  { name: 'DotCaret', from: 2396, dur: 90, render: S21 },
  { name: 'ChipRoll', from: 2486, dur: 70, render: S22 },
  { name: 'LinkPanel', from: 2556, dur: 100, render: S23 },
  { name: 'BentoFly', from: 2656, dur: 40, render: S24 },
  { name: 'SendLaunch', from: 2696, dur: 60, render: S25 },
  { name: 'FileDrop', from: 2756, dur: 70, render: S26 },
  { name: 'Cursor3D', from: 2826, dur: 70, render: S27 },
  { name: 'BackdropSwap', from: 2896, dur: 50, render: S28 },
  { name: 'FloodAway', from: 2946, dur: 60, render: S29 },
  { name: 'StickyType', from: 3006, dur: 45, render: S30 },
  { name: 'RowCool', from: 3051, dur: 85, render: S31 },
  { name: 'SkeletonSweep', from: 3136, dur: 50, render: S32 },
];

export const reelUiDuration = reelDuration(SEGMENTS);
export const ReelUi: React.FC = () => <Reel film="library-ui" segments={SEGMENTS} background="#E9EBEF" />;
