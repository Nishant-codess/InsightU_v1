import * as React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, icon, ...props }, ref) => {
    return (
      <div className="w-full relative flex flex-col space-y-1.5">
        {label && (
           <label className="text-sm font-medium text-textLight">{label}</label>
        )}
        <div className="relative flex items-center">
            {icon && (
                <div className="absolute left-3 text-gray-400">
                    {icon}
                </div>
            )}
            <input
            type={type}
            className={cn(
                "flex h-11 w-full rounded-lg bg-surface/50 border border-white/10 px-3 py-2 text-white text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                icon && "pl-10",
                error && "border-red-500/50 focus-visible:ring-red-500",
                className
            )}
            ref={ref}
            {...props}
            />
        </div>
        
        {error && (
            <motion.p 
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-xs text-red-500"
            >
                {error}
            </motion.p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
