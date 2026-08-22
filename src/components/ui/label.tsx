import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

/** The 10px wide-tracked micro-label that carries all structural naming. */
const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn('lbl text-ink-muted', className)} {...props} />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
