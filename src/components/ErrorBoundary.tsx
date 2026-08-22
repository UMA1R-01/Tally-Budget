import { Component, type ErrorInfo, type ReactNode } from 'react'
import { clearStorage, readRawStorage, STORAGE_KEY } from '@/lib/storage'
import { saveBlob } from '@/lib/download'
import { Button } from '@/components/ui/button'
import { todayISO } from '@/lib/date'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Without this, a single bad value in storage is fatal *and permanent*: the
 * render throws, React unmounts the tree to a white screen, and because the
 * offending row was already persisted, reloading replays the crash. The user's
 * only way out would be devtools.
 *
 * So: catch the crash, and offer the two things that actually recover it —
 * take a copy of what is stored, and clear it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Tally crashed while rendering:', error, info.componentStack)
  }

  handleDownload = () => {
    const raw = readRawStorage() ?? '[]'
    void saveBlob(new Blob([raw], { type: 'application/json;charset=utf-8' }), `Tally_Recovered_${todayISO()}.json`, [
      { name: 'JSON', extensions: ['json'] },
    ])
  }

  handleReset = () => {
    clearStorage()
    globalThis.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-full items-center justify-center bg-ink px-6 py-16 text-paper">
        <div className="w-full max-w-lg">
          <p className="font-display text-mark font-extrabold">
            TALLY<span className="text-flare">.</span>
          </p>

          <h1 className="mt-6 font-display text-[40px] font-extrabold leading-[0.95] tracking-[-0.04em]">
            Something broke.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            The ledger stopped rendering, most likely because of an unreadable value in stored data.
            Nothing has been deleted. Take a copy first, then reset if the reload doesn&apos;t help.
          </p>

          <pre className="mt-5 overflow-x-auto rounded-xl border border-ink-line bg-ink-raised p-4 font-mono text-[11.5px] text-flare">
            {error.message || String(error)}
          </pre>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="volt" onClick={() => globalThis.location.reload()}>
              Reload
            </Button>
            <Button variant="outlineVolt" onClick={this.handleDownload}>
              Download stored data
            </Button>
            <Button variant="quiet" onClick={this.handleReset}>
              Reset ledger
            </Button>
          </div>

          <p className="mt-5 font-mono text-[10.5px] text-ink-muted">
            Stored under localStorage key “{STORAGE_KEY}”.
          </p>
        </div>
      </div>
    )
  }
}
