import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Primary CTA: #C62828 with premium shadow
        default: "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(198,40,40,0.25)] hover:shadow-[0_6px_20px_rgba(198,40,40,0.30)] hover:-translate-y-0.5 rounded-[14px]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-[14px]",
        // Secondary CTA: White background with border
        outline: "border border-[#DDDDDD] bg-white text-[#222222] hover:bg-[#FAF7F4] hover:border-[#CCCCCC] rounded-[14px]",
        secondary: "bg-white text-[#222222] border border-[#DDDDDD] hover:bg-[#FAF7F4] rounded-[14px]",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-[14px]",
        link: "text-primary underline-offset-4 hover:underline",
        // Hero button: Extra prominent
        hero: "bg-primary text-primary-foreground shadow-[0_4px_16px_rgba(198,40,40,0.30)] hover:shadow-[0_8px_28px_rgba(198,40,40,0.35)] hover:-translate-y-1 font-bold rounded-[16px]",
        // Soft variant for less prominent actions
        soft: "bg-[#FFF1F1] text-primary border border-[#FFC5C5] hover:bg-[#FFE8E8] rounded-[12px]",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-12 px-6 py-3",
        xl: "h-14 px-8 py-4 text-base",
        icon: "h-10 w-10 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
