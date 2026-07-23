import type { WikipediaSource } from '../types/wikipedia'
import { isHttpUrl } from '../lib/wikipediaApi'
import './WikipediaLinkField.css'

export const WIKIPEDIA_FIELD = 'Wikipedia Link'

const SOURCE_LABEL: Record<Exclude<WikipediaSource, null>, string> = {
  automatic: 'Found automatically',
  selected: 'Selected by you',
  manual: 'Entered manually',
  'not-found': 'Not found — add manually if you like',
}

type WikipediaLinkFieldProps = {
  value: string
  source: WikipediaSource
  busy?: boolean
  onChange: (value: string) => void
  onSearchAgain?: () => void
  onSourceChange?: (source: WikipediaSource) => void
}

export function WikipediaLinkField({
  value,
  source,
  busy = false,
  onChange,
  onSearchAgain,
  onSourceChange,
}: WikipediaLinkFieldProps) {
  const trimmed = value.trim()
  const valid = trimmed ? isHttpUrl(trimmed) : false

  return (
    <section className="wiki-field" aria-labelledby="wiki-field-heading">
      <div className="wiki-field__header">
        <h2 id="wiki-field-heading">Wikipedia Link</h2>
        {source ? <span className="wiki-field__source">{SOURCE_LABEL[source]}</span> : null}
      </div>

      <label className="wiki-field__input-label">
        <span className="visually-hidden">Wikipedia URL</span>
        <input
          type="url"
          value={value}
          placeholder="https://en.wikipedia.org/wiki/…"
          disabled={busy}
          onChange={(event) => {
            onChange(event.target.value)
            onSourceChange?.('manual')
          }}
        />
      </label>

      <div className="wiki-field__actions">
        {valid ? (
          <a href={trimmed} target="_blank" rel="noopener noreferrer">
            Open Wikipedia
          </a>
        ) : (
          <span className="wiki-field__disabled-link">Open Wikipedia</span>
        )}
        {onSearchAgain ? (
          <button type="button" disabled={busy} onClick={onSearchAgain}>
            {busy ? 'Searching…' : 'Search again'}
          </button>
        ) : null}
      </div>
    </section>
  )
}
