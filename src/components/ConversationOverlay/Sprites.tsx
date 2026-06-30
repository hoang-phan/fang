import { useEffect, useRef, useState } from 'react';
import type { Sprite as SpriteType } from '../../types';
import { Sprite } from './Sprite';

interface SpritesProps {
  sprites: SpriteType[];
  /** Fade the whole sprite layer (e.g. during a background transition) */
  fading?: boolean;
}

export function Sprites({ sprites, fading = false }: SpritesProps) {
  const [visibleSprites, setVisibleSprites] = useState<SpriteType[]>(() => sprites);
  const [spriteFading, setSpriteFading] = useState(false);
  const prevKeyRef = useRef<string>('');

  useEffect(() => {
    const newKey = sprites.map(s => s.url).join('|');
    if (newKey === prevKeyRef.current) return;
    if (!prevKeyRef.current) {
      prevKeyRef.current = newKey;
      setVisibleSprites(sprites);
      return;
    }
    prevKeyRef.current = newKey;
    setSpriteFading(true);
    const t = setTimeout(() => {
      setVisibleSprites(sprites);
      setSpriteFading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [sprites]);

  return (
    <div
      className="relative flex-1 overflow-hidden transition-opacity duration-300"
      style={{ opacity: fading || spriteFading ? 0 : 1 }}
    >
      {visibleSprites.map((sprite, i) => <Sprite key={i} sprite={sprite} />)}
    </div>
  );
}
