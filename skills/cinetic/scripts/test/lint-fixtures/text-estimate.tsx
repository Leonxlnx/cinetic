// text-estimate=3
// A status pill and a badge placed beside text whose width is guessed from its letter count: the dot lands on the
// pill's edge, the badge under its neighbour. A share of a list's length is not a text width.
import React from 'react';

const U = 1;
export const dotX = (label: string, size: number) => 600 - (label.length * size * 0.56 + 30) * U;
export const titleW = (title: () => string) => title().length * 62 * 0.53 * U;
export const badgeW = (label: string) => (label.length * 44 * 0.6 + 2 * 44) * U;
export const cap = (list: string[]) => Math.floor(0.45 * list.length);
export const mid = (rows: number[]) => rows.length * 0.5;
export const Pill: React.FC<{ label: string }> = ({ label }) => <div style={{ display: 'flex', gap: 12 }}>{label}</div>;
