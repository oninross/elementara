import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 backdrop-blur-md border shadow-lg hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default: "glass-button-primary",
        destructive:
          "bg-red-500/20 border-red-400/30 text-white hover:bg-red-500/30 hover:border-red-400/40 hover:shadow-red-500/20",
        outline: "glass-button",
        secondary: "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30",
        ghost: "bg-transparent border-transparent text-white hover:bg-white/10 hover:border-white/20",
        link: "text-white underline-offset-4 hover:underline bg-transparent border-transparent hover:bg-white/5",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
