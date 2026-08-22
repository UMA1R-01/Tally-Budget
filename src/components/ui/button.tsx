import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-field font-semibold transition-[filter,background-color,color,transform,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-55 focus-visible:outline-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** The one loud button: volt on ink. */
        volt: 'bg-volt text-ink font-display font-extrabold tracking-[-0.01em] hover:brightness-[1.06] active:translate-y-px focus-visible:ring-3 focus-visible:ring-volt/45 focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
        /** Secondary action inside the ink rail. */
        outlineVolt:
          'border border-volt text-volt hover:bg-volt hover:text-ink focus-visible:ring-3 focus-visible:ring-volt/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
        ink: 'bg-ink text-paper hover:bg-ink-raised focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        /** Quiet text button on the ink rail. */
        quiet:
          'text-ink-muted hover:text-paper hover:bg-ink-soft focus-visible:ring-2 focus-visible:ring-ink-edge',
        /** Quiet text button on paper. */
        quietPaper:
          'text-paper-muted hover:text-ink hover:bg-paper-raised focus-visible:ring-2 focus-visible:ring-ink/40',
        danger:
          'text-paper-muted hover:bg-flare hover:text-white focus-visible:ring-2 focus-visible:ring-flare',
      },
      size: {
        sm: 'h-8 px-3 text-[13px] [&_svg]:size-3.5',
        md: 'h-10 px-4 text-sm [&_svg]:size-4',
        lg: 'h-[52px] px-5 text-[15.5px] [&_svg]:size-[18px]',
        icon: 'size-[30px] rounded-lg [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'volt', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
