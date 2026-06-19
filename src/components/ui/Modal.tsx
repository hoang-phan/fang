import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
}

export function Modal({ title, children }: ModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--overlay-dim)' }}>
      <div className="bg-theme-surface border border-border-strong rounded-xl w-full max-w-lg shadow-2xl">
        <div className="border-b border-border-strong px-6 py-4">
          <h2 className="font-pixel text-accent text-sm">{title}</h2>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
