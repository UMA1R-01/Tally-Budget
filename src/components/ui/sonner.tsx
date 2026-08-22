import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Toasts are the app's safety net: undo after a delete, and a warning when
 * stored data had to be repaired. Styled as ink slabs so they read as part of
 * the rail rather than as browser chrome.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      // Bottom-right keeps ink toasts on the paper side; bottom-left would
      // put them on the ink rail, ink on ink.
      position="bottom-right"
      offset={24}
      duration={7000}
      toastOptions={{
        classNames: {
          toast:
            'font-sans rounded-xl border border-ink-line shadow-[0_12px_30px_rgba(11,11,12,0.28)]',
          title: 'text-[13.5px] font-medium',
          // ink-muted read as genuinely dim in practice, and sonner sets its
          // own description colour via an inline style — a plain Tailwind
          // class loses that fight, so this needs `!important` to actually
          // win, same as the button overrides below.
          description: 'text-[12.5px]! text-paper/85!',
          actionButton: 'bg-volt! text-ink! font-extrabold! rounded-lg! text-[12.5px]!',
          cancelButton: 'bg-ink-soft! text-ink-muted!',
        },
        style: {
          '--normal-bg': 'var(--color-ink)',
          '--normal-text': 'var(--color-paper)',
          '--normal-border': 'var(--color-ink-line)',
        } as React.CSSProperties,
      }}
      {...props}
    />
  )
}
