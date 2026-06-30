export type MiniGameMode = 'click' | 'words-catcher' | 'shuffle-puzzle' | 'multichoice';

export function detectMode(content: string): MiniGameMode | null {
  if (content.startsWith('(click-game')) return 'click';
  if (content.startsWith('(words-catcher')) return 'words-catcher';
  if (content.startsWith('(shuffle-puzzle')) return 'shuffle-puzzle';
  if (content.startsWith('(multichoice:')) return 'multichoice';
  return null;
}
