import type { OpponentDef, OpponentCinematic } from '../../types';

interface CinematicCardProps {
  opponent: OpponentDef;
  cinematic: OpponentCinematic;
  onClick: () => void;
}

export function CinematicCard({ opponent, cinematic, onClick }: CinematicCardProps) {
  const firstConversation = cinematic.conversations?.[0];
  const backgroundUrl = firstConversation?.backgroundUrl;
  const backgroundColor = firstConversation?.backgroundColor ?? '#1a232c';

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col overflow-hidden rounded border border-border-mid hover:border-yellow-500 transition-colors group aspect-[3/4]"
      style={{ background: backgroundColor }}
    >
      {backgroundUrl && (
        <img
          src={backgroundUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
        />
      )}
      <div className="relative flex-1 flex items-center justify-center">
        <span className="text-4xl">{opponent.sprite}</span>
      </div>
      <div className="relative px-2 py-2 bg-black/60">
        <p className="font-pixel text-text-bright text-xs truncate">{opponent.name}</p>
        {cinematic.description && (
          <p className="font-pixel text-text-muted text-xs mt-1 line-clamp-2 leading-loose">
            {cinematic.description}
          </p>
        )}
      </div>
    </button>
  );
}
