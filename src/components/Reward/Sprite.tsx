import type { Sprite } from '../../types';

interface SpriteProps {
  sprite: Sprite;
}

export function Sprite({
  sprite,
}: SpriteProps) {
  return (
    <img
      src={sprite.url}
      alt=""
      style={{
        position: 'fixed',
        bottom: sprite.y ?? 0,
        left: `calc(50% + ${sprite.x ?? 0}px - ${(sprite.width ?? 0) / 2}px)`,
        width: sprite.width ?? undefined,
        height: sprite.height ?? undefined,
        objectFit: 'contain',
      }}
    />
  );
}
