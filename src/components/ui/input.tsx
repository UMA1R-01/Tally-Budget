import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The rail input: dark surface, volt focus ring. Deliberately calm at rest so
 * the volt button stays the only loud thing in the sidebar.
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full rounded-field border border-ink-line bg-ink-raised px-3.5 py-3 text-[14.5px] text-paper',
        'outline-none transition-[border-color,box-shadow] duration-150',
        // ink-faint measures ~2.9:1 against this field's background — under
        // even the 3:1 large-text floor. ink-muted (~5.6:1) is a real AA pass.
        'placeholder:text-ink-muted hover:border-ink-edge',
        'focus-visible:border-volt focus-visible:ring-3 focus-visible:ring-volt/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
