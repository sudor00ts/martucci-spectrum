import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm font-medium select-none outline-none focus-visible:shadow-[0_0_0_2px_var(--color-bg),0_0_0_4px_var(--color-accent)] disabled:pointer-events-none disabled:opacity-40 transition-[scale,background-color,color,box-shadow,opacity] duration-150 ease-out active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:opacity-90",
        ghost: "bg-transparent text-muted hover:bg-elevated hover:text-fg",
        outline: "bg-transparent text-fg shadow-[0_0_0_1px_rgb(236_232_225/0.14)] hover:bg-elevated",
        toggle: "bg-transparent text-muted shadow-[0_0_0_1px_rgb(236_232_225/0.12)] hover:text-fg data-[on=true]:bg-accent data-[on=true]:text-accent-fg data-[on=true]:shadow-none",
        danger: "bg-transparent text-clip shadow-[0_0_0_1px_rgb(212_93_93/0.35)] hover:bg-elevated",
      },
      size: {
        sm: "h-8 min-h-8 px-2.5 text-micro",
        md: "h-10 min-h-10 px-3.5 text-sm",
        icon: "size-10 min-h-10 min-w-10",
        "icon-sm": "size-8 min-h-8 min-w-8",
      },
    },
    defaultVariants: { variant: "outline", size: "sm" },
  },
);

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
  asChild?: boolean;
  pressed?: boolean;
};

function Button({ className, variant, size, asChild = false, pressed, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp data-slot="button" data-on={pressed ? "true" : "false"} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };
