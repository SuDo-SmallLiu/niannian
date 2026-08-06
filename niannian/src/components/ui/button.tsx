import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 touch-manipulation',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-[#C47A3A]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-[#F0E8D8]',
        outline: 'border-2 border-border bg-background hover:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-[#A03030]',
        ghost: 'hover:bg-accent',
        wechat: 'bg-[#07C160] text-white hover:bg-[#06AD56]',
      },
      size: {
        default: 'h-12 px-6 text-base',
        lg: 'h-14 px-8 text-lg rounded-2xl',
        sm: 'h-10 px-4 text-sm',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
