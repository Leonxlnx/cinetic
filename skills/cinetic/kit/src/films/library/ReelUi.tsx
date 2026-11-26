// The reel of the motion library's product UI pieces: each piece in catalogue order (src/kit/library/catalog/), at its
// catalogue frames, with its name in the corner. A new UI piece: one segment appended to SEGMENTS.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Ground, fonts } from '../../kit';
import { Icon } from '../../kit/icons';
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
  type Look,
  type NoticeData,
  type MailData,
  type PersonRow,
} from '../../kit/library/ui';
import { Reel, reelDuration, type DemoProps, type Segment } from './reel';

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
      <BannerPop L={{ ...L, surface: '#1A1C22' }} at={8} n={{ title: 'Assistant', body: 'Want me to test a lower price this week?', time: 'now', icon: 'Sparkles', colors: BLUE }} y={520} w={1340} size={42} />
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
];

export const reelUiDuration = reelDuration(SEGMENTS);
export const ReelUi: React.FC = () => <Reel film="library-ui" segments={SEGMENTS} background="#E9EBEF" />;
