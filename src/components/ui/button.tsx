"use client";

import * as React from "react";
import { motion, type HTMLMotionProps, useReducedMotion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { MOTION } from "@/lib/motion";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden rounded-[var(--radius-sm)] text-sm font-medium font-[family-name:var(--font-body)] transition-[background-color,box-shadow,border-color] duration-150 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-ink shadow-[0_1px_1px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.16)] hover:shadow-[0_2px_8px_color-mix(in_srgb,var(--color-accent)_35%,transparent),inset_0_1px_0_rgba(255,255,255,0.16)]",
        secondary:
          "bg-surface border border-border-strong text-ink hover:bg-accent-wash hover:border-accent",
        ghost: "text-muted hover:text-ink hover:bg-accent-wash",
        destructive: "bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref">,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    const reduceMotion = useReducedMotion();

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: MOTION.pressScale }}
        transition={reduceMotion ? MOTION.reduced : MOTION.interaction}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
