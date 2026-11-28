// Motion library: host screens. Faithful rebuilds of the third-party screens films show most. See
// references/library-hosts.md.
// One file a piece, named after it; parts and helpers in _shared.tsx. A new piece adds its line here.
export { GitHubIssueCard, gitHubIssueCardHeight } from './GitHubIssueCard';
export { GitHubIssueColumn, gitHubColumnCardBox } from './GitHubIssueColumn';
export { gitHubPRGeometry, GitHubPullRequest } from './GitHubPullRequest';
export type { GHCheck, GitHubPRProps } from './GitHubPullRequest';
export { vsTokens, vsCodeGeometry, VSCodeWindow } from './VSCodeWindow';
export type { VSFile, VSTab, VSCodeProps } from './VSCodeWindow';
export { VSCodeNotice } from './VSCodeNotice';
export { DotCanvas } from './DotCanvas';
export { CanvasChrome } from './CanvasChrome';
export type { CanvasColours } from './CanvasChrome';
// shared parts and helpers
export { HOST_FONT, HOST_MONO, GH, VS_THEMES, VSFileIcon } from './_shared';
export type { GHLabel, GHPerson, GHState, GHIssue } from './_shared';
