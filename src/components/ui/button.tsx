import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-10 px-4 py-2",
        icon: "h-10 w-10",
        sm: "h-9 px-3",
      },
      variant: {
        default: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent)/0.88)]",
        ghost: "bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]",
        outline: "border border-[hsl(var(--border))] bg-[hsla(0,0%,100%,0.02)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]",
      },
    },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, variant, ...props }, ref) => {
    return <button className={cn(buttonVariants({ className, size, variant }))} ref={ref} {...props} />;
  },
);

Button.displayName = "Button";
