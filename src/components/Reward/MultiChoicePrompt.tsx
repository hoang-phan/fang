import { useCallback, useEffect, useState } from 'react';

type MultiChoice = { label: string; correct: boolean };

function parseMultiChoice(content: string): MultiChoice[] | null {
  const match = content.match(/^\(multichoice:([^)]+)\)$/);
  if (!match) return null;
  const parts = match[1].split(':');
  const opts: MultiChoice[] = parts.map((label, i) => ({ label, correct: i === 0 }));
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

interface MultiChoicePromptProps {
  content: string;
  onAdvance: () => void;
  registerSelectByIndex: (fn: (index: number) => void) => void;
}

export function MultiChoicePrompt({ content, onAdvance, registerSelectByIndex }: MultiChoicePromptProps) {
  const [options] = useState<MultiChoice[]>(() => parseMultiChoice(content) ?? []);
  const [selected, setSelected] = useState<MultiChoice | null>(null);

  const handleSelect = useCallback((choice: MultiChoice) => {
    if (selected) return;
    setSelected(choice);
    setTimeout(onAdvance, 900);
  }, [selected, onAdvance]);

  useEffect(() => {
    registerSelectByIndex((index: number) => {
      if (selected || !options[index]) return;
      handleSelect(options[index]);
    });
  });

  return (
    <div className="relative shrink-0 pb-4 px-4 flex flex-col gap-3 mx-auto w-full">
      {options.map((choice, i) => {
        const isSelected = selected?.label === choice.label;
        const revealed = !!selected;
        let bg = 'bg-theme-surface border-border-mid';
        if (isSelected) bg = choice.correct ? 'bg-green-800 border-green-500' : 'bg-red-900 border-red-500';
        else if (revealed && choice.correct) bg = 'bg-green-900/50 border-green-700';
        return (
          <button
            key={choice.label}
            onClick={() => handleSelect(choice)}
            disabled={!!selected}
            className={`w-full rounded-xl border p-4 text-left text-lg font-bold transition-colors ${bg}`}
            style={{ color: '#ffe0ee' }}
          >
            <span className="text-text-faint text-sm mr-2">{i + 1}.</span>
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}
