interface GoldDisplayProps {
  gold: number;
}

export function GoldDisplay({ gold }: GoldDisplayProps) {
  return (
    <div className="flex items-center gap-2 text-accent font-mono font-bold">
      <span className="text-xl">💰</span>
      <span>{gold}g</span>
    </div>
  );
}
