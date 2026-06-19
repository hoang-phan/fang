import type { ReactNode } from 'react';

interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

const VARIANTS = {
  primary: 'bg-accent hover:bg-accent-hover text-accent-text font-bold disabled:bg-theme-raised disabled:text-text-faint',
  secondary: 'bg-theme-raised hover:bg-theme-hover text-text-bright disabled:opacity-40',
  danger: 'bg-red-700 hover:bg-red-600 text-white disabled:opacity-40',
  ghost: 'bg-transparent hover:bg-theme-raised text-text-normal border border-border-strong disabled:opacity-40',
};

export function Button({ onClick, disabled, variant = 'primary', children, className = '', fullWidth }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded transition-colors duration-150 cursor-pointer
        disabled:cursor-not-allowed text-sm
        ${VARIANTS[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
