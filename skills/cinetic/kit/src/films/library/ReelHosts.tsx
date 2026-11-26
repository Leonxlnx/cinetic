// The reel of the motion library's host screens (a GitHub Projects column, a GitHub pull request, a VS Code window in
// both themes, a design canvas's chrome): each piece in catalogue order (src/kit/library/catalog/), at its catalogue
// frames, with its name in a small corner label. The product in every scene is invented demo content. A new host
// screen: one segment appended to SEGMENTS.
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { at, ease, mix } from '../../kit/motion';
import { fonts } from '../../kit/fonts';
import { Brand, Icon } from '../../kit/icons';
import { softShadow } from '../../kit/world';
import { Pointer, pointerAt } from '../../kit/library/ui';
import {
  CanvasChrome,
  DotCanvas,
  GH,
  GitHubIssueCard,
  GitHubIssueColumn,
  GitHubPullRequest,
  VSCodeNotice,
  VSCodeWindow,
  gitHubColumnCardBox,
  gitHubPRGeometry,
  type GHIssue,
  type GitHubPRProps,
} from '../../kit/library/hosts';
import { Reel, reelDuration, type DemoProps, type Segment } from './reel';

const Label: React.FC<{ n: number; name: string; dark?: boolean }> = ({ n, name, dark }) => (
  <div style={{ position: 'absolute', left: 56, bottom: 24, fontFamily: fonts.inter, fontSize: 26, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(17,19,24,0.45)', zIndex: 500 }}>
    <span style={{ fontVariantNumeric: 'tabular-nums', marginRight: 12, opacity: 0.7 }}>{n}</span>
    {name}
  </div>
);

// the product's own neutral mark (an invented tool): a rounded tile with a package glyph
const ProductMark: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.26, background: 'linear-gradient(170deg, #3D6BFF, #2350E6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' }}>
    <Icon name="Package" size={size * 0.62} color="#FFFFFF" stroke={2.2} />
  </div>
);

// ---------------------------------------------------------------------------------------------------------------------
// 1. A Projects column fills; one card is dragged to the next column
const L1 = (n: string, c: string) => ({ name: n, color: c });
const TODO: GHIssue[] = [
  { repo: 'ledger/web', number: 481, title: 'Plan picker with yearly toggle', labels: [L1('frontend', '#1D76DB'), L1('design', '#D876E3')] },
  { repo: 'ledger/web', number: 479, title: 'Notification settings page', labels: [L1('frontend', '#1D76DB')] },
  { repo: 'ledger/web', number: 476, title: 'Invoice row, overdue state', labels: [L1('bug', '#D73A4A')] },
  { repo: 'ledger/api', number: 212, title: 'Currency rates every hour', labels: [L1('backend', '#0E8A16')] },
];
const DOING: GHIssue[] = [
  { ...TODO[0], state: 'open', assignees: [{ login: 'maya', color: '#7B5CC4' }] },
  { repo: 'ledger/web', number: 468, title: 'Billing history table', labels: [L1('frontend', '#1D76DB')], assignees: [{ login: 'theo', color: '#C4683F' }] },
  { repo: 'ledger/api', number: 209, title: 'Export to CSV', labels: [L1('backend', '#0E8A16')] },
];
const COL_A = { x: 200, y: 30 };
const COL_B = { x: 1040, y: 30 };
const S1_GRAB = 52;
const S1_DROP = 84;
const S1: React.FC<DemoProps> = ({ n, name }) => {
  const f = useCurrentFrame();
  const a0 = gitHubColumnCardBox(TODO, 0);
  const b0 = gitHubColumnCardBox(DOING, 0);
  const keys = [
    { f: 30, x: 1700, y: 1000 },
    { f: S1_GRAB - 2, x: COL_A.x + a0.x + 520, y: COL_A.y + a0.y + 120 },
    { f: S1_DROP, x: COL_B.x + b0.x + 520, y: COL_B.y + b0.y + 120, bow: 0.08 },
    { f: S1_DROP + 30, x: COL_B.x + b0.x + 580, y: COL_B.y + b0.y + 260 },
  ];
  const p = pointerAt(f, keys);
  const carrying = f >= S1_GRAB && f < S1_DROP;
  const lift = at(f, S1_GRAB, 6, ease.out);
  return (
    <AbsoluteFill style={{ background: '#E9EBEF' }}>
      <GitHubIssueColumn name="To do" items={TODO} times={[4, 10, 15, 19]} gone={{ index: 0, at: S1_GRAB }} w={340} h={480} style={{ position: 'absolute', left: COL_A.x, top: COL_A.y }} />
      <GitHubIssueColumn name="In progress" color="#BF8700" items={DOING} times={[S1_DROP, 0, 0]} w={340} h={480} style={{ position: 'absolute', left: COL_B.x, top: COL_B.y }} />
      {carrying && (
        <div style={{ position: 'absolute', left: p.x - 520, top: p.y - 120, transform: `rotate(${mix(lift, 0, -2)}deg)` }}>
          <GitHubIssueCard issue={TODO[0]} w={322} lift={lift} ground="#E9EBEF" />
        </div>
      )}
      <Pointer keys={keys} clicks={[S1_GRAB]} size={60} ring={false} />
      <Label n={n} name={name} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// 2. A pull request: the checks finish, the camera rides down to the merge box, the pointer merges it
const PR: GitHubPRProps = {
  owner: 'ledger',
  repo: 'web',
  number: 482,
  title: 'Add PlanPicker with a yearly toggle',
  author: { login: 'maya-okafor', color: '#7B5CC4' },
  branch: 'plan-picker',
  commits: 1,
  body: ['Builds the plan picker from the design file with our components:', 'Card, SegmentedControl, Price, Button. Five states, 568 to 1280 px.', 'Closes #481'],
  commit: { message: 'Add PlanPicker and its five states', sha: '4e1c9a2' },
  checks: [
    { name: 'ci / typecheck', time: '14s' },
    { name: 'ci / test', time: '38s' },
    { name: 'ci / visual', time: '51s' },
  ],
  checksAt: [40, 58, 76],
  mergeAt: 122,
  counts: { files: 6 },
  diff: [214, 9],
  start: 0,
};
const S2: React.FC<DemoProps> = ({ n, name }) => {
  const f = useCurrentFrame();
  const g = gitHubPRGeometry(PR);
  const ride = at(f, 18, 30, ease.inOut);
  const dy = mix(ride, 0, -(g.merge.y - 900));
  const btn = { x: g.merge.x, y: g.merge.y + dy };
  return (
    <AbsoluteFill style={{ background: GH.canvas }}>
      <div style={{ position: 'absolute', left: 0, top: dy }}>
        <GitHubPullRequest {...PR} />
      </div>
      <Pointer keys={[{ f: 80, x: btn.x + 560, y: btn.y + 260 }, { f: 117, x: btn.x, y: btn.y }, { f: 150, x: btn.x + 40, y: btn.y + 50 }]} clicks={[119]} size={60} ring={false} />
      <Label n={n} name={name} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// 3. VS Code, Dark Modern: the file is written line by line, four imports light up, the product's notice arrives
const CODE = [
  "import { useState } from 'react';",
  'import {',
  '  Card,',
  '  SegmentedControl,',
  '  Price,',
  '  Button,',
  "} from '@ledger/ui';",
  '',
  'export function PlanPicker({ plan, state }: Props) {',
  "  const [period, setPeriod] = useState('monthly');",
  '  return (',
  '    <Card padding="lg" elevated>',
  '      <Card.Header title={plan.name} badge="Most popular" />',
  '      <SegmentedControl value={period} onChange={setPeriod} />',
  '      <Price amount={plan.price[period]} unit="/month" />',
  '      <Button size="lg" loading={state === \'loading\'}>',
  '        Start free trial',
  '      </Button>',
  '    </Card>',
  '  );',
  '}',
];
const FILES = [
  { name: 'src', folder: true, open: true },
  { name: 'components', folder: true, open: true, depth: 1 },
  { name: 'Invoice.tsx', depth: 2 },
  { name: 'PlanPicker.tsx', depth: 2, active: true, modified: true },
  { name: 'Price.tsx', depth: 2 },
  { name: 'pages', folder: true, depth: 1 },
  { name: 'package.json' },
  { name: 'README.md' },
];
const S3: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill style={{ background: '#1F1F1F' }}>
    <VSCodeWindow
      h={500}
      theme="dark"
      workspace="ledger-web"
      files={FILES}
      tabs={[{ name: 'PlanPicker.tsx', active: true, modified: true }, { name: 'Price.tsx' }]}
      breadcrumb={['src', 'components', 'PlanPicker.tsx']}
      code={CODE}
      revealAt={4}
      perLine={2}
      highlights={[2, 3, 4, 5].map((line, i) => ({ line, at: 56 + i * 4 }))}
      activeLine={9}
      status={{ branch: 'plan-picker' }}
      extension={{ mark: <ProductMark size={20} />, label: 'Ledger UI' }}
    >
      <VSCodeNotice message="PlanPicker.tsx uses 4 components from @ledger/ui" source="Ledger UI" buttons={['Open pull request', 'Review']} at={88} mark={<ProductMark size={16} />} />
    </VSCodeWindow>
    <Label n={n} name={`${name}, Dark Modern`} dark />
  </AbsoluteFill>
);

// 4. VS Code, Light Modern: the same window in the light theme, no explorer, a JSON file
const S4: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill style={{ background: '#FFFFFF' }}>
    <VSCodeWindow
      h={500}
      theme="light"
      workspace="ledger-web"
      tabs={[{ name: 'package.json', active: true }, { name: 'PlanPicker.tsx' }]}
      breadcrumb={['package.json', 'dependencies']}
      code={['{', '  "name": "ledger-web",', '  "version": "2.4.0",', '  "private": true,', '  "dependencies": {', '    "@ledger/ui": "^4.12.0",', '    "react": "^19.1.0"', '  }', '}']}
      highlights={[{ line: 5, at: 20 }]}
      activeLine={5}
      status={{ branch: 'main', right: ['Ln 6, Col 30', 'Spaces: 2', 'UTF-8', 'JSON'] }}
    />
    <Label n={n} name={`${name}, Light Modern`} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------------------------------------------------
// 5. A design canvas's chrome: the canvas zooms under the fixed chrome, the tool changes
const S5: React.FC<DemoProps> = ({ n, name }) => {
  const f = useCurrentFrame();
  const z = mix(at(f, 20, 40, ease.inOut), 1, 1.4);
  return (
    <AbsoluteFill style={{ background: '#F4F5F7', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 960, top: 560, transform: `scale(${z})`, transformOrigin: '0 0' }}>
        <DotCanvas w={4000} h={3000} style={{ left: -2000, top: -1500 }} />
        <div style={{ position: 'absolute', left: -300, top: -230, fontFamily: fonts.inter, fontSize: 18, color: '#5D6470' }}>Pricing / Desktop</div>
        <div style={{ position: 'absolute', left: -300, top: -200, width: 600, height: 400, borderRadius: 18, background: '#FFFFFF', boxShadow: softShadow(4, '#F4F5F7'), padding: 34, boxSizing: 'border-box', fontFamily: fonts.inter, color: '#15171C' }}>
          <div style={{ fontSize: 40, fontWeight: 640, letterSpacing: '-0.02em' }}>Pro</div>
          <div style={{ marginTop: 16, height: 52, borderRadius: 26, background: '#EEF0F2' }} />
          <div style={{ marginTop: 18, fontSize: 92, fontWeight: 620, letterSpacing: '-0.045em', lineHeight: 1 }}>
            $24<span style={{ fontSize: 24, fontWeight: 500, color: '#5D6470', letterSpacing: 0 }}>/month</span>
          </div>
          <div style={{ marginTop: 26, height: 62, borderRadius: 16, background: '#15171C' }} />
        </div>
      </div>
      <CanvasChrome mark={<ProductMark size={30} />} product="Ledger" path={['web']} file="pricing.fig" people={[{ initials: 'MO', color: '#5B6B8C' }, { initials: 'LP', color: '#8C6B5B' }]} action={{ label: 'Synced', icon: <Brand name="vscode" size={22} /> }} activeTool={f < 64 ? 0 : 1} zoom={z} />
      <Label n={n} name={name} />
    </AbsoluteFill>
  );
};

// the window twice: Dark Modern, then Light Modern
const VSCODE_DARK = 140;
const VSCodeTwice: React.FC<DemoProps> = ({ n, name }) => (
  <>
    <Sequence durationInFrames={VSCODE_DARK}>
      <S3 n={n} name={name} />
    </Sequence>
    <Sequence from={VSCODE_DARK}>
      <S4 n={n} name={name} />
    </Sequence>
  </>
);

// the pieces in the order the reel plays them; a new piece appends its segment (from = the last from + dur) and
// gives its catalogue entry the same frames
export const SEGMENTS: Segment[] = [
  { name: 'GitHubIssueColumn', from: 0, dur: 130, render: S1 },
  { name: 'GitHubPullRequest', from: 130, dur: 160, render: S2 },
  { name: 'VSCodeWindow', from: 290, dur: 200, render: VSCodeTwice },
  { name: 'CanvasChrome', from: 490, dur: 100, render: S5 },
];

export const reelHostsDuration = reelDuration(SEGMENTS);
export const ReelHosts: React.FC = () => <Reel film="library-hosts" segments={SEGMENTS} background="#E9EBEF" />;
