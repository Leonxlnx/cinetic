# Library: host screens

**What it is for:** another company's product shown as its real screen, or the product's own design canvas. Reach first
for `GitHubPullRequest` (code reviewed and merged), `VSCodeWindow` (code written), `GitHubIssueColumn` (work tracked)
and `CanvasChrome` with `DotCanvas` (the product's own canvas). Not here: the product's own interface
([ui](library-ui.md)), integrations said as marks (`HubPill`, `ChipRoll`, `GhostFill` in [ui](library-ui.md)),
look-alike screens of any kind. It has no near neighbours in other categories.

Faithful rebuilds of the third-party screens a film shows most, and a design-canvas app chrome for the product's own
canvas. A film shows another company's product in one of two ways only: its real mark alone (`<Brand>`), or a faithful,
detailed rebuild of its real screen with the film's content in it. These pieces are the second way, built once so a film
never hand-rolls a rough mock. Import them from the kit (`import { GitHubPullRequest, VSCodeWindow } from '../../kit';`).
The reel `library-hosts` plays each one with its name.

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Does | About | Looks like | Reach for it for |
|---|---|---|---|---|
| [GitHubIssueColumn](#githubissuecolumn-githubissuecard) | build | 30 f | a GitHub Projects status column: cards rise in, one can be taken out and the cards below close the gap | work tracked on GitHub: issues arriving, one picked up |
| [GitHubIssueCard](#githubissuecolumn-githubissuecard) | build | 6 f | one GitHub Projects card (state glyph, repo and number, title, labels, assignees) that can lift and ride a pointer | a card carried out of its column |
| [GitHubPullRequest](#githubpullrequest) | build | 120 f | a pull request's Conversation page as GitHub draws it: checks finish one by one, the merge button turns it purple | code reviewed, checked and merged |
| [VSCodeWindow](#vscodewindow-vscodenotice) | build | 60 f | a VS Code window as it looks today, Dark Modern or Light Modern, the code written line by line and highlighted | code being written or read in an editor |
| [VSCodeNotice](#vscodewindow-vscodenotice) | enter | 10 f | VS Code's notification toast for the product's message, with its source and buttons | the product speaking inside the editor |
| [CanvasChrome](#canvaschrome-dotcanvas) | idle | 60 f | the fixed floating chrome of a design-canvas app (file pill, people, tool rail, zoom) over its moving canvas | the product's own canvas: a design tool, a whiteboard, an editor |
| [DotCanvas](#canvaschrome-dotcanvas) | idle | 60 f | a design canvas's dot grid, moved under the chrome with the camera | the ground of a design-canvas scene |

<!-- /library:pieces -->

## How they are built

- **The host's chrome stays the host's.** Layout, spacing, colours, icons and wording follow the real product's current
  screen (GitHub's Primer light colours, VS Code's Dark Modern and Light Modern themes with their syntax colours and
  coloured bracket pairs). Change the content through the props, not the chrome. GitHub and VS Code draw their UI in the
  system face (Segoe UI, San Francisco): `HOST_FONT` (Inter) stands in, `HOST_MONO` (Geist Mono) for code.
- **The host's pixels, drawn larger.** Each screen is laid out in the real product's own pixel sizes (GitHub's 14 px
  body, VS Code's 13 px UI and 14 px editor font) and drawn `scale` times (default 2: a 960 px wide page fills 1920 px),
  so its proportions stay true. At scale 2 the body text is 28 px on screen: push the camera in 1.1-1.4x on the part that
  matters so the words the viewer reads reach 30 px or more ([cards-ui.md](motion/cards-ui.md#house-rules)).
- **The film's content is the product's.** Repo, title, people, labels, files, code lines, checks: real-sounding, specific,
  different in every row. The product's own mark can sit where the host allows one (an extension in VS Code, a bot or an
  app in a check row, an attachment on a card), never as a fake host feature.
- **Marks:** each piece draws the host's real mark with `<Brand>` (`github`, `vscode`); `sfx.mjs credits` lists them
  when the film uses the piece.
- Everything is deterministic from the frame; times are film frames (pass `T` values).

## GitHub

### GitHubIssueColumn, GitHubIssueCard
A status column of a GitHub Projects board: the status circle, the name and its count, the cards (state glyph, `repo
#number`, title, labels as GitHub colours them from their hex, assignees), "Add item" at the foot. `times` brings each
card in (a rise of 8 px over 7 f; the cards below glide down to make room); `gone` takes one card out on a frame (it is
being dragged: draw it yourself with `GitHubIssueCard` riding a `Pointer`) and the cards below close the gap over 12 f,
the count following.
```tsx
<GitHubIssueColumn name="To do" items={issues} times={[4, 10, 15, 19]} gone={{ index: 0, at: T.grab }} w={340} h={480} />
<GitHubIssueCard issue={issues[0]} w={322} lift={at(f, T.grab, 6, ease.out)} />
```
- Props: `name`, `items` (`{ repo, number, title, labels: [{ name, color }], state: 'open' | 'closed' | 'pr' | 'draft' |
  'merged', assignees: [{ login, color }], thumb }`), `color` (the status circle), `count`, `times`, `gone`, `w`, `h`
  (GitHub px), `scale`. `gitHubColumnCardBox(items, i, w, scale)` gives card i's box for a pointer or a carried card;
  `gitHubIssueCardHeight(issue)` its height.
- Caution: titles fit one line at the card's width (nothing wraps); `thumb` is the product's own attachment, not part of
  GitHub's card, so use it only when the story attaches something.

### GitHubPullRequest
A pull request's Conversation page as GitHub draws it: the header (menu, the mark, `owner / repo`, search, the repo tabs
with the Pull requests tab underlined), the title with its number and the Edit and Code buttons, the Open badge and
"wants to merge n commits into main from branch", the PR tabs with counters and the diff stat, the opening comment, a
commit with Verified and its sha, the merge box (Changes reviewed, the checks finishing one by one, No conflicts, the
green Merge pull request button with its split arrow) and the sidebar. On `mergeAt` the badge, the box and its badge
turn purple: "Pull request successfully merged and closed".
```tsx
const pr = { owner: 'ledger', repo: 'web', number: 482, title: 'Add PlanPicker with a yearly toggle', author: { login: 'maya-okafor', color: '#7B5CC4' },
  branch: 'plan-picker', body: ['Builds the plan picker from the design file.', 'Closes #481'], commit: { message: 'Add PlanPicker', sha: '4e1c9a2' },
  checks: [{ name: 'ci / typecheck', time: '14s' }, { name: 'ci / test', time: '38s' }], checksAt: [T.c1, T.c2], mergeAt: T.merge };
const g = gitHubPRGeometry(pr);           // g.merge = the Merge button's centre, g.checks[i], g.height
<GitHubPullRequest {...pr} />
<Pointer keys={[{ f: T.c2, x: g.merge.x + 500, y: g.merge.y + 260 }, { f: T.merge - 4, x: g.merge.x, y: g.merge.y }]} clicks={[T.merge - 3]} />
```
- Props: `owner`, `repo`, `number`, `title`, `author` (`{ login, color, avatar }`), `branch`, `base` (main), `commits`,
  `body` (one string per line), `commit`, `checks`, `checksAt`, `mergeAt`, `pressAt` (default 3 f before `mergeAt`),
  `counts`, `diff`, `sidebar`, `repoCounts`, `header`, `w` (GitHub px, 960), `scale` (2), `start`.
- Numbers: the page is about 1300 px tall at scale 2: ride the camera down to the merge box (or crop with `header={false}`)
  while the checks finish; the press dips the button 4 % over 3 f.
- Caution: each body line fits the comment's width; the title fits beside the two buttons.

## VS Code

### VSCodeWindow, VSCodeNotice
A VS Code window as it looks today: the title bar (the mark, the menus, folding into "..." in a narrow window, the
command centre with the workspace's name, the layout controls, the window buttons), the activity bar (Explorer, Search,
Source Control, Run and Debug, Extensions, the account and the gear), the explorer with its tree, the tabs (the active
one with its top accent line, a dot for unsaved), the breadcrumb, the editor (line numbers, the active line, syntax
colours and coloured bracket pairs of the default themes, selection bands) and the status bar (the remote button, the
branch, problems, Ln and Col, the language). `theme="dark"` is Dark Modern, VS Code's default; `theme="light"` Light
Modern. `revealAt` writes the code line by line; `highlights` grow selection bands; `extension` lights the product's own
mark in the activity bar and puts its name in the status bar; `VSCodeNotice` is VS Code's notification for the product's
message.
```tsx
<VSCodeWindow theme="dark" workspace="ledger-web" files={tree} tabs={[{ name: 'PlanPicker.tsx', active: true, modified: true }]}
  breadcrumb={['src', 'components', 'PlanPicker.tsx']} code={lines} revealAt={T.write} perLine={2}
  highlights={[{ line: 2, at: T.hl }]} activeLine={9} extension={{ mark: <Mark size={20} />, label: 'Ledger UI' }}>
  <VSCodeNotice message="PlanPicker.tsx uses 4 components" source="Ledger UI" buttons={['Open pull request', 'Review']} at={T.toast} />
</VSCodeWindow>
```
- Props: `theme`, `workspace`, `tabs` (`{ name, active, modified }`), `breadcrumb`, `code` (one string per line), `lineStart`,
  `revealAt`, `perLine`, `highlights` (`{ line, at, color }`), `activeLine`, `files` (`{ name, depth, folder, open, active,
  modified }`; omit for no explorer), `status` (`{ branch, problems, right }`), `extension`, `w`, `h` (VS Code px, 960 x
  540), `scale` (2), `codeSize` (14), `children` (over the editor). `vsCodeGeometry(props)` gives the code area and a
  line's centre for the camera or a pointer; `vsTokens` and `VS_THEMES` colour code elsewhere; `VSFileIcon` draws a
  file's icon. `VSCodeNotice`: `theme`, `message`, `source`, `buttons`, `at`, `pressAt`, `mark`, `w`.
- Caution: write the code the product would write, 15-25 lines; the camera pushes in to the lines that matter (code at
  scale 2 is 28 px on screen). Lines longer than the editor are cut by it, as in VS Code: keep the lines that are read
  short.

## A design canvas

### CanvasChrome, DotCanvas
The fixed chrome of a design-canvas app (the product's own canvas: a design tool, a whiteboard, an editor) over its
moving canvas, in floating panels the way current design tools draw it: the file pill (the product's mark and name, the
path, the file), the people and an action (Synced, Share) at the top right, the tool rail at the left or a tool bar at
the bottom centre (`toolbar="bottom"`), the zoom at the bottom right. `DotCanvas` is the canvas's dot grid. Pass the
product's colours (`colours`), its mark, and move the canvas under the chrome with the camera; the chrome stays.
```tsx
<DotCanvas w={4000} h={3000} style={{ left: -2000, top: -1500 }} />
<CanvasChrome mark={<Mark size={30} />} product="Ledger" path={['web']} file="pricing.fig" people={[{ initials: 'MO', color: '#5B6B8C' }]}
  action={{ label: 'Synced', icon: <Brand name="vscode" size={22} /> }} activeTool={1} zoom={z} />
```
- Props: `mark`, `product`, `path`, `file`, `people`, `action` (`{ label, icon, dark }`), `tools` (Lucide names),
  `activeTool`, `toolbar`, `zoom`, `colours` (`{ ground, surface, ink, muted, line, accent, accentPale, font }`), `size`
  (text px, 25), `w`, `h`.
- Caution: this is the product's chrome, so its colours are the film's; for Figma itself show the real mark, or rebuild
  Figma's own screen from a current screenshot.

## In the reel

Every piece's frames in the reel (`--film library-hosts`), and the one command that shows just that piece: its frames in
one still (run it in a film project; `render --film library-hosts --range a-b` for the piece in motion).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

| Piece | Reel | Frames | Strip of just this piece |
|---|---|---|---|
| GitHubIssueColumn | `library-hosts` | 0-129 | `node scripts/frames.mjs library --strip GitHubIssueColumn` |
| GitHubIssueCard (in GitHubIssueColumn) | `library-hosts` | 50-90 | `node scripts/frames.mjs library --strip GitHubIssueCard` |
| GitHubPullRequest | `library-hosts` | 130-289 | `node scripts/frames.mjs library --strip GitHubPullRequest` |
| VSCodeWindow | `library-hosts` | 290-489 | `node scripts/frames.mjs library --strip VSCodeWindow` |
| VSCodeNotice (in VSCodeWindow) | `library-hosts` | 375-429 | `node scripts/frames.mjs library --strip VSCodeNotice` |
| CanvasChrome | `library-hosts` | 490-589 | `node scripts/frames.mjs library --strip CanvasChrome` |
| DotCanvas (in CanvasChrome) | `library-hosts` | 490-589 | `node scripts/frames.mjs library --strip DotCanvas` |

<!-- /library:reel -->
