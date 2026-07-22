import type { TmdbSearchResult } from '../types/tmdb'
import './TmdbResultPicker.css'

type TmdbResultPickerProps = {
  results: TmdbSearchResult[]
  message?: string
  onSelect: (result: TmdbSearchResult) => void
  onCancel: () => void
  busy?: boolean
}

export function TmdbResultPicker({
  results,
  message,
  onSelect,
  onCancel,
  busy = false,
}: TmdbResultPickerProps) {
  return (
    <div
      className="tmdb-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tmdb-picker-title"
    >
      <div className="tmdb-picker__panel">
        <header className="tmdb-picker__header">
          <h2 id="tmdb-picker-title">Choose the correct movie</h2>
          <p>
            {message ??
              'Several TMDb matches look similar. Select the right one, or cancel and add a year / TMDb ID.'}
          </p>
        </header>

        <ul className="tmdb-picker__list">
          {results.map((result) => (
            <li key={result.tmdbId}>
              <button
                type="button"
                className="tmdb-picker__option"
                disabled={busy}
                onClick={() => onSelect(result)}
              >
                <div className="tmdb-picker__poster">
                  {result.posterThumbUrl ? (
                    <img
                      src={result.posterThumbUrl}
                      alt=""
                      loading="lazy"
                      width={64}
                      height={96}
                    />
                  ) : (
                    <span className="tmdb-picker__poster-fallback" aria-hidden="true">
                      No art
                    </span>
                  )}
                </div>
                <div className="tmdb-picker__meta">
                  <strong>
                    {result.title}
                    {result.year != null ? ` (${result.year})` : ''}
                  </strong>
                  {result.originalTitle ? (
                    <span className="tmdb-picker__original">Original: {result.originalTitle}</span>
                  ) : null}
                  <span className="tmdb-picker__date">
                    {result.releaseDate || 'Release date unknown'} · TMDb #{result.tmdbId}
                  </span>
                  <p>{result.overview || 'No overview available.'}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>

        <div className="tmdb-picker__actions">
          <button type="button" className="tmdb-picker__cancel" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
