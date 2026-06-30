interface RewardHeaderProps {
  opponentName?: string;
}

export function RewardHeader({ opponentName }: RewardHeaderProps) {
  return (
    <div className="text-center mb-6">
      <div className="text-4xl lg:text-6xl mb-3">🏆</div>
      <h1 className="font-pixel text-accent text-base lg:text-lg mb-2">Victory!</h1>
      {opponentName && (
        <p className="text-text-muted text-sm">{opponentName}</p>
      )}
    </div>
  );
}
