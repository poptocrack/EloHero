import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-[#667eea] via-[#764ba2] to-[#667eea] text-white shadow-lg shadow-primary/40 hover:scale-[1.01]',
        secondary:
          'bg-white text-slate-800 border border-slate-200 shadow-sm hover:bg-slate-50',
        outline:
          'border border-slate-300 bg-transparent text-slate-700 hover:bg-white',
        ghost: 'text-slate-600 hover:bg-slate-100',
        soft: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      },
      size: {
        default: 'h-12 px-6 py-2',
        lg: 'h-14 px-8 text-base',
        sm: 'h-10 px-4 text-sm',
        icon: 'h-10 w-10 p-0',
      },
      asChild: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };

