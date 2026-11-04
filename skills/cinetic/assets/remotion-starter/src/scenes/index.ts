// The house scenes: one moment each, 1.5-3 s, a pure function of its frame, filled with the product's own content
// (its words, screens, pictures, mark and palette). Each file exports the scene, its props type and its meta entry
// (parts.ts SceneMeta: length at 30 fps, the content it takes, the forms it takes over and hands on, big or quiet, the
// sounds its action makes). SCENES lists every meta entry; a film plays a scene in a <Sequence> of meta.dur frames
// (at 30 fps; scale by fps / 30) and lets the spine carry the element across from handOut to the next handIn.
import type { SceneMeta } from './parts';
import { blobsToMarkMeta } from './blobs-to-mark';
import { heldProductWordMeta } from './held-product-word';
import { lineToWordmarkMeta } from './line-to-wordmark';
import { markPullbackMeta } from './mark-pullback';
import { photoCountersMeta } from './photo-counters';
import { photoRiverMeta } from './photo-river';
import { portholeLineMeta } from './porthole-line';
import { wordBuildBadgeMeta } from './word-build-badge';
import { decodeTitleMeta } from './decode-title';
import { glassPromptMeta } from './glass-prompt';
import { irisInputMeta } from './iris-input';
import { macroTypeMeta } from './macro-type';
import { pageFlyMeta } from './page-fly';
import { scanGridMeta } from './scan-grid';
import { toastStackMeta } from './toast-stack';
import { wordCardsMeta } from './word-cards';
import { ringDiveMeta } from './ring-dive';
import { keyGlowMeta } from './key-glow';
import { glossOrbitMeta } from './gloss-orbit';
import { orbitChipsMeta } from './orbit-chips';
import { barFloodMeta } from './bar-flood';
import { typeFlipMeta } from './type-flip';
import { prismLightMeta } from './prism-light';
import { beatLockupMeta } from './beat-lockup';
import { cloudDomeMeta } from './cloud-dome';
import { photoOrbitMeta } from './photo-orbit';
import { cardRiversMeta } from './card-rivers';
import { siteFlipMeta } from './site-flip';
import { ribbonRingMeta } from './ribbon-ring';
import { phonePullbackMeta } from './phone-pullback';
import { streetPosterMeta } from './street-poster';
import { roomPushMeta } from './room-push';
import { crystalHallMeta } from './crystal-hall';
import { objectWindowMeta } from './object-window';

export * from './parts';
export { BlobsToMark, blobsToMarkMeta, type BlobsToMarkProps } from './blobs-to-mark';
export { HeldProductWord, heldProductWordMeta, type HeldProductWordProps } from './held-product-word';
export { LineToWordmark, lineToWordmarkMeta, lineToWordmarkDur, type LineToWordmarkProps } from './line-to-wordmark';
export { MarkPullback, markPullbackMeta, type MarkPullbackProps } from './mark-pullback';
export { PhotoCounters, photoCountersMeta, type CounterCard, type PhotoCountersProps } from './photo-counters';
export { PhotoRiver, photoRiverMeta, photoRiverDur, type PhotoRiverProps } from './photo-river';
export { PortholeLine, portholeLineMeta, type PortholeLineProps } from './porthole-line';
export { WordBuildBadge, wordBuildBadgeMeta, wordBuildBadgeDur, type WordBuildBadgeProps } from './word-build-badge';
export { DecodeTitle, decodeTitleMeta, type DecodeTitleProps } from './decode-title';
export { GlassPrompt, glassPromptMeta, type GlassPromptProps } from './glass-prompt';
export { IrisInput, irisInputMeta, type IrisInputProps } from './iris-input';
export { MacroType, macroTypeMeta, macroTypeDur, type MacroTypeProps } from './macro-type';
export { PageFly, pageFlyMeta, type PageFlyProps } from './page-fly';
export { ScanGrid, scanGridMeta, type ScanGridProps } from './scan-grid';
export { ToastStack, toastStackMeta, type ToastStackProps } from './toast-stack';
export { WordCards, wordCardsMeta, type WordCardsProps } from './word-cards';
export { RingDive, ringDiveMeta, type RingDiveProps } from './ring-dive';
export { KeyGlow, keyGlowMeta, type KeyItem, type KeyGlowProps } from './key-glow';
export { GlossOrbit, glossOrbitMeta, type GlossOrbitProps } from './gloss-orbit';
export { OrbitChips, orbitChipsMeta, type OrbitChip, type OrbitChipsProps } from './orbit-chips';
export { BarFlood, barFloodMeta, type BarFloodProps } from './bar-flood';
export { TypeFlip, typeFlipMeta, type TypeFlipProps } from './type-flip';
export { PrismLight, prismLightMeta, type PrismLightProps } from './prism-light';
export { BeatLockup, beatLockupMeta, beatLockupDur, type BeatLockupProps } from './beat-lockup';
export { CloudDome, cloudDomeMeta, type CloudDomeProps } from './cloud-dome';
export { PhotoOrbit, photoOrbitMeta, type PhotoOrbitProps } from './photo-orbit';
export { CardRivers, cardRiversMeta, type CardRiversProps } from './card-rivers';
export { SiteFlip, siteFlipMeta, type SiteFlipProps } from './site-flip';
export { RibbonRing, ribbonRingMeta, type RibbonRingProps } from './ribbon-ring';
export { PhonePullback, phonePullbackMeta, phoneCamera, phonePoint, quadMatrix, PHONE_PULLBACK, type PhoneCard, type PhonePullbackProps, type Quad } from './phone-pullback';
export { StreetPoster, streetPosterMeta, streetPosterDur, plateAt, plateView, STREET_POSTER, type StreetPlate, type StreetPosterProps } from './street-poster';
export { RoomPush, roomPushMeta, roomZoom, ROOM_PUSH, type RoomPlate, type RoomPushProps } from './room-push';
export { CrystalHall, crystalHallMeta, crystalCamera, crystalFaces, CRYSTAL_HALL, type CrystalHallProps } from './crystal-hall';
export { ObjectWindow, objectWindowMeta, windowPose, OBJECT_WINDOW, type ObjectWindowProps } from './object-window';

/** Every house scene's meta entry, by id. */
export const SCENES: Record<string, SceneMeta> = {
  [blobsToMarkMeta.id]: blobsToMarkMeta,
  [heldProductWordMeta.id]: heldProductWordMeta,
  [lineToWordmarkMeta.id]: lineToWordmarkMeta,
  [markPullbackMeta.id]: markPullbackMeta,
  [photoCountersMeta.id]: photoCountersMeta,
  [photoRiverMeta.id]: photoRiverMeta,
  [portholeLineMeta.id]: portholeLineMeta,
  [wordBuildBadgeMeta.id]: wordBuildBadgeMeta,
  [decodeTitleMeta.id]: decodeTitleMeta,
  [glassPromptMeta.id]: glassPromptMeta,
  [irisInputMeta.id]: irisInputMeta,
  [macroTypeMeta.id]: macroTypeMeta,
  [pageFlyMeta.id]: pageFlyMeta,
  [scanGridMeta.id]: scanGridMeta,
  [toastStackMeta.id]: toastStackMeta,
  [wordCardsMeta.id]: wordCardsMeta,
  [ringDiveMeta.id]: ringDiveMeta,
  [keyGlowMeta.id]: keyGlowMeta,
  [glossOrbitMeta.id]: glossOrbitMeta,
  [orbitChipsMeta.id]: orbitChipsMeta,
  [barFloodMeta.id]: barFloodMeta,
  [typeFlipMeta.id]: typeFlipMeta,
  [prismLightMeta.id]: prismLightMeta,
  [beatLockupMeta.id]: beatLockupMeta,
  [cloudDomeMeta.id]: cloudDomeMeta,
  [photoOrbitMeta.id]: photoOrbitMeta,
  [cardRiversMeta.id]: cardRiversMeta,
  [siteFlipMeta.id]: siteFlipMeta,
  [ribbonRingMeta.id]: ribbonRingMeta,
  [phonePullbackMeta.id]: phonePullbackMeta,
  [streetPosterMeta.id]: streetPosterMeta,
  [roomPushMeta.id]: roomPushMeta,
  [crystalHallMeta.id]: crystalHallMeta,
  [objectWindowMeta.id]: objectWindowMeta,
};
