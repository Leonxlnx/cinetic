// Macro screens: dense, believable product screens built for a camera that pushes in 3-4x (references/product-ui.md §15).
// One component each, few props, the film's own content (scripts/content.mjs writes src/content.ts from the brief), and a
// layout function per screen that returns its focus boxes for any frame.
export * from './base';
export * from './typing';
export * from './PromptBar';
export * from './UrlScan';
export * from './ThumbGrid';
export * from './CommentFeed';
export * from './NoticeStack';
export * from './StepCard';
export * from './PriceCards';
export * from './ItemList';
export * from './DocPage';
export * from './CodePage';
export * from './ChatReply';
export * from './ProfileCard';
export * from './RequestPill';
export * from './CoverStack';
export * from './BrowserWindow';
export * from './content';
export * from './forms';
