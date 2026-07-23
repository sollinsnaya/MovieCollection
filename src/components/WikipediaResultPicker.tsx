import type { WikipediaResult } from '../types/wikipedia'
import './WikipediaResultPicker.css'

type WikipediaResultPickerProps = {
  results: WikipediaResult[]
  message?: string
  busy?: boolean
  onSelect: (result: WikipediaResult) => void
  onSearchAgain: () => void
  onEnterManual: () => void
  onSkip: () => void
}

export function WikipediaResultPicker({
  results,
  message,
  busy = false,
  onSelect,
  onSearchAgain,
  onEnterManual,
  onSkip,
}: WikipediaResultPickerProps) {
  return (
    <div
      className="wiki-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wiki-picker-title"
    >
      <div className="wiki-picker__panel">
        <header className="wiki-picker__header">
          <h2 id="wiki-picker-title">Choose the Wikipedia article</h2>
          <p>{message ?? 'Several articles look plausible. Select the correct one.'}</p>
        </header>

        <ul className="wiki-picker__list">
          {results.map((result) => (
            <li key={result.url}>
              <button
                type="button"
                className="wiki-picker__option"
                disabled={busy}
                onClick={() => onSelect(result)}
              >
                <strong>{result.title}</strong>
                {result.snippet ? <p>{result.snippet}</p> : null}
                <span className="wiki-picker__url">{result.url}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="wiki-picker__actions">
          <button type="button" disabled={busy} onClick={onSearchAgain}>
            Search again
          </button>
          <button type="button" disabled={busy} onClick={onEnterManual}>
            Enter URL manually
          </button>
          <button type="button" className="wiki-picker__skip" disabled={busy} onClick={onSkip}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
