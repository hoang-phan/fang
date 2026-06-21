import type { OpponentCinematic } from '../../types';
import { Button } from '../ui/Button';
import { ConversationOverlay } from './ConversationOverlay';

interface CinematicsModalProps {
  cinematic: OpponentCinematic | null;
  opponentAvatarUrl?: string;
  opponentSprite?: string;
  opponentName: string;
  onClose: () => void;
}

export function CinematicsModal({ cinematic, opponentAvatarUrl, opponentSprite, opponentName, onClose }: CinematicsModalProps) {
  if (!cinematic) return null;

  const conversations = cinematic.conversations ?? [];

  if (conversations.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none" style={{ background: 'rgba(10,2,8,0.92)' }}>
        <div className="flex-1 flex items-center justify-center w-full p-6 min-h-0">
          {opponentAvatarUrl ? (
            <img src={opponentAvatarUrl} alt={opponentName} className="max-h-full max-w-full object-contain rounded-lg" style={{ maxHeight: '80vh' }} />
          ) : (
            <span className="text-8xl">{opponentSprite ?? '❓'}</span>
          )}
        </div>
        <div className="shrink-0 mb-6">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  // key resets ConversationOverlay state when a different cinematic is opened
  return (
    <ConversationOverlay
      key={cinematic.level}
      conversations={conversations}
      opponentAvatarUrl={opponentAvatarUrl}
      opponentSprite={opponentSprite}
      opponentName={opponentName}
      onComplete={onClose}
    />
  );
}
