import { Redo2, Undo2, X } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauri } from '@tauri-apps/api/core'
import { cn } from '@/lib/utils'

// Lucide doesn't have this pair, and a plain dash + square read as nearly
// identical marks at 14px. Minimize sits low in its box — the native
// Windows position — rather than dead-centered.
function MinimizeIcon() {
  return (
    <svg aria-hidden viewBox="0 0 10 10" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.3}>
      <line x1="2" y1="8" x2="8" y2="8" strokeLinecap="round" />
    </svg>
  )
}

function MaximizeIcon() {
  return (
    <svg aria-hidden viewBox="0 0 10 10" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.3}>
      <path d="M9,4 V1 H6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1,6 V9 H4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="2" x2="5.8" y2="4.2" strokeLinecap="round" />
      <line x1="2" y1="8" x2="4.2" y2="5.8" strokeLinecap="round" />
    </svg>
  )
}

interface TitleBarProps {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

// Evaluated once at module load, not per render — whether the app is
// running inside the Tauri shell never changes over the page's lifetime.
const runningInTauri = isTauri()
const appWindow = runningInTauri ? getCurrentWindow() : null

const windowButtonClass =
  'flex w-11 items-center justify-center text-ink-muted transition-colors hover:bg-ink-soft hover:text-paper focus-visible:outline-none focus-visible:bg-ink-soft focus-visible:text-paper'

// Undo/redo read as titlebar controls, not content-area buttons: flush,
// ghost until hovered, sized down from the window-control buttons rather
// than borrowing the rounded pill treatment used on the paper side.
const railButtonClass =
  'flex h-7 w-7 items-center justify-center rounded text-ink-muted transition-colors hover:bg-ink-soft hover:text-paper disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:bg-ink-soft focus-visible:text-paper'

export function TitleBar({ onUndo, onRedo, canUndo, canRedo }: TitleBarProps) {
  return (
    <div data-tauri-drag-region className="flex h-12 w-full shrink-0 select-none items-stretch bg-ink">
      <div data-tauri-drag-region className="flex items-center gap-4 pl-8">
        <span className="pointer-events-none font-display text-[21px] font-extrabold leading-none tracking-[-0.02em] text-paper">
          TALLY<span className="text-volt">.</span>
        </span>

        <div aria-hidden className="h-5 w-px bg-ink-line" />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
            className={railButtonClass}
          >
            <Undo2 aria-hidden className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Y)"
            className={railButtonClass}
          >
            <Redo2 aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* The rest of the bar is empty drag surface above the statement pane. */}
      <div data-tauri-drag-region className="flex-1" />

      {runningInTauri && (
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={() => appWindow?.minimize()}
            aria-label="Minimize"
            className={windowButtonClass}
          >
            <MinimizeIcon />
          </button>
          <button
            type="button"
            onClick={() => appWindow?.toggleMaximize()}
            aria-label="Maximize"
            className={windowButtonClass}
          >
            <MaximizeIcon />
          </button>
          <button
            type="button"
            onClick={() => appWindow?.close()}
            aria-label="Close"
            className={cn(windowButtonClass, 'hover:bg-flare hover:text-paper focus-visible:bg-flare focus-visible:text-paper')}
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
