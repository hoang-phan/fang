import type { ElementType } from '../types';

export const ELEMENT_COLORS: Record<ElementType, string> = {
  normal:   '#a8a878',
  fire:     '#f08030',
  water:    '#6890f0',
  electric: '#f8d030',
  grass:    '#78c850',
  ice:      '#98d8d8',
  poison:   '#a040a0',
  earth:    '#e0c068',
  dark:     '#705848',
  psychic:  '#f85888',
};

export function getContrastColor(color: string): string {
  const rgb = color.match(/\w+/g);
  if (!rgb) return '#000000';
  const r = parseInt(rgb[0]);
  const g = parseInt(rgb[1]);
  const b = parseInt(rgb[2]);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

// Example: getTransitionColorHex('#000000', '#aaaaaa', 0.5) => '#555555'
export function getTransitionColorHex(startHex: string, endHex: string, percentage: number): string {
  const startRgba = hexToRgba(startHex);
  const endRgba = hexToRgba(endHex);
  const r = Math.round(startRgba.r + (endRgba.r - startRgba.r) * percentage);
  const g = Math.round(startRgba.g + (endRgba.g - startRgba.g) * percentage);
  const b = Math.round(startRgba.b + (endRgba.b - startRgba.b) * percentage);
  const a = Math.round(startRgba.a + (endRgba.a - startRgba.a) * percentage);
  return rgbaToHex({ r, g, b, a });
}

function hexToRgba(hexStr: string) {
  const hex = hexStr.startsWith('#') ? hexStr.slice(1) : hexStr;

  if (hex.length === 3) {
    return hexToRgba(`${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}ff`);
  }

  if (hex.length === 6) {
    return hexToRgba(`${hex}ff`);
  }

  if (hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = parseInt(hex.slice(6, 8), 16);
    return { r, g, b, a };
  }

  throw new Error(`Invalid hex color: ${hex}`);
}

function rgbaToHex(rgba: { r: number; g: number; b: number; a: number }): string {
  const displayedA = rgba.a === 255 ? '' : `${rgba.a.toString(16)}`;
  return `#${rgba.r.toString(16)}${rgba.g.toString(16)}${rgba.b.toString(16)}${displayedA}`;
}
