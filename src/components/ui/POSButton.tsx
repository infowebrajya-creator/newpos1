import React from 'react';

export interface POSButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'touch' | 'touch-lg';
  isLoading?: boolean;
  badge?: string | number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function POSButton({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  badge,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: POSButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-bold tracking-tight rounded-xl transition-all select-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] shadow-sm';

  const variantStyles = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500 shadow-indigo-600/25',
    accent:
      'bg-amber-400 text-slate-950 hover:bg-amber-300 focus:ring-amber-400 shadow-amber-400/20 font-extrabold',
    secondary:
      'bg-slate-800 text-slate-100 hover:bg-slate-700 focus:ring-slate-500 border border-slate-700',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500 shadow-emerald-600/20',
    warning:
      'bg-amber-600 text-white hover:bg-amber-500 focus:ring-amber-500 shadow-amber-600/20',
    danger:
      'bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-500 shadow-rose-600/20',
    outline:
      'border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 focus:ring-slate-500',
    ghost:
      'bg-transparent text-slate-300 hover:bg-slate-800/80 hover:text-white focus:ring-slate-500 shadow-none',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[36px]',
    md: 'px-4 py-2.5 text-xs sm:text-sm gap-2 min-h-[42px]',
    lg: 'px-6 py-3 text-sm sm:text-base gap-2.5 font-extrabold min-h-[48px]',
    touch: 'px-4 py-3 text-xs sm:text-sm gap-2 min-h-[44px] min-w-[44px]',
    'touch-lg': 'px-6 py-3.5 text-sm sm:text-base gap-3 min-h-[52px] min-w-[52px] font-extrabold',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Processing...</span>
        </span>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
          {badge !== undefined && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-extrabold bg-slate-950/40 rounded-md border border-white/10">
              {badge}
            </span>
          )}
        </>
      )}
    </button>
  );
}

export function PrimaryAction(props: POSButtonProps) {
  return <POSButton variant="accent" size="touch" {...props} />;
}

export function SecondaryAction(props: POSButtonProps) {
  return <POSButton variant="secondary" size="touch" {...props} />;
}
