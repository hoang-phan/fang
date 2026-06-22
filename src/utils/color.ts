export function getContrastColor(color: string): string {
  const rgb = color.match(/\w+/g);
  if (!rgb) return '#000000';
  const r = parseInt(rgb[0]);
  const g = parseInt(rgb[1]);
  const b = parseInt(rgb[2]);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}
