// Shared by the turns and effects: a unique id for SVG filters, the progress of a move that starts ON frame a
// and lands ON frame a + d - 1, and the SVG filters the pieces use (PixelFilter mosaic, SmearFilter directional blur,
// SplitFilter channel split): put one in the tree and point a layer's `filter: url(#id)` at it.
import React from 'react';
import { clamp } from '../motion';

export const useUid = (p: string) => p + React.useId().replace(/[^a-zA-Z0-9]/g, '');

/** Progress of a move that starts ON frame a and lands ON frame a + d - 1 (1/d on its first frame, 1 on its last). */
export const t01 = (f: number, a: number, d: number) => clamp((f - a + 1) / Math.max(1, d));

/**
 * The mosaic filter: one sample patch per cell (a third of the cell, so it survives a render at half scale), dilated to the
 * whole cell; cells align to the layer's top-left. Give it a unique id per step.
 */
export const PixelFilter: React.FC<{ id: string; step: number }> = ({ id, step }) => {
  const fs = Math.max(2, Math.round(step * 0.34));
  const r = Math.max(0, (step - fs) / 2);
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feFlood x={r} y={r} height={fs} width={fs} />
        <feComposite width={step} height={step} />
        <feTile result="a" />
        <feComposite in="SourceGraphic" in2="a" operator="in" />
        <feMorphology operator="dilate" radius={r} />
      </filter>
    </svg>
  );
};

/** A directional blur (px along x and y). Edges are duplicated so a full-frame layer never shows a dark seam. */
export const SmearFilter: React.FC<{ id: string; x: number; y?: number }> = ({ id, x, y = 0 }) => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation={`${Math.max(0, x)} ${Math.max(0, y)}`} edgeMode="duplicate" />
    </filter>
  </svg>
);

/** Red, green and blue pulled apart by `d` px along `angle` (deg). Exact recombination at d = 0. */
export const SplitFilter: React.FC<{ id: string; d: number; angle?: number }> = ({ id, d, angle = 0 }) => {
  const dx = Math.cos((angle * Math.PI) / 180) * d;
  const dy = Math.sin((angle * Math.PI) / 180) * d;
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feOffset in="r" dx={-dx} dy={-dy} result="ro" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feOffset in="b" dx={dx} dy={dy} result="bo" />
        <feComposite in="ro" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg" />
        <feComposite in="rg" in2="bo" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
      </filter>
    </svg>
  );
};
