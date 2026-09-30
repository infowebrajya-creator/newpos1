import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-slate-900 border ${
              error ? 'border-rose-500/80 focus:ring-rose-500' : 'border-slate-800 focus:ring-indigo-500'
            } rounded-xl py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
              icon ? 'pl-11' : 'pl-4'
            } ${rightIcon ? 'pr-11' : 'pr-4'} ${className}`}
            {...props}
          />
          {rightIcon && <div className="absolute right-3.5 text-slate-400 flex items-center">{rightIcon}</div>}
        </div>
        {error && <p className="text-xs text-rose-400 font-medium pl-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
