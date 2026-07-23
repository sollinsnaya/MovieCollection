import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { blankFields, MovieForm } from '../components/MovieForm'
import { TmdbResultPicker } from '../components/TmdbResultPicker'
import {
  WIKIPEDIA_FIELD,
  WikipediaLinkField,
} from '../components/WikipediaLinkField'
import { WikipediaResultPicker } from '../components/WikipediaResultPicker'
import { useMoviesContext } from '../context/MoviesContext'
import { coverCandidates } from '../lib/covers'
import { parseYear } from '../lib/normalize'
import {
  downloadTmdbPoster,
  fetchTmdbMovie,
  findDuplicates,
  searchTmdb,
} from '../lib/tmdbApi'
import { searchWikipedia } from '../lib/wikipediaApi'
import type { MovieRecord } from '../types/movie'
import type { DuplicateCandidate, TmdbSearchResult } from '../types/tmdb'
import type { WikipediaResult, WikipediaSource } from '../types/wikipedia'
import './AddMoviePage.css'

const MANUAL_FIELDS = new Set([
  'Catalog ID',
  'Edition',
  'Steelbook',
  'Disc Format',
  'HDR10',
  'HDR10+',
  'Dolby Vision',
  'Dolby Atmos',
  'Dolby True HD',
  'DTS:X',
  'DTS-HD  MA',
  '7.1',
  '5.1',
  'Boutique Label',
  'Rotten Tomatoes Critic Score',
  'Notes',
  WIKIPEDIA_FIELD,
])

function applyTmdbFields(current: MovieRecord, mapped: Record<string, string>): MovieRecord {
  const next = { ...current }
  for (const [key, value] of Object.entries(mapped)) {
    if (MANUAL_FIELDS.has(key)) continue
    next[key] = value
  }
  for (const key of MANUAL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      next[key] = current[key]
    }
  }
  return next
}

export function AddMoviePage() {
  const navigate = useNavigate()
  const { status, message, columns, canEdit, createMovie, collectionPath, reload } =
    useMoviesContext()
  const [values, setValues] = useState(() => blankFields(columns))
  const [lookupTitle, setLookupTitle] = useState('')
  const [lookupYear, setLookupYear] = useState('')
  const [lookupTmdbId, setLookupTmdbId] = useState('')
  const [saving, setSaving] = useState(false)
  const [fetchPhase, setFetchPhase] = useState<
    'idle' | 'search' | 'details' | 'poster' | 'wikipedia'
  >('idle')
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [fromTmdb, setFromTmdb] = useState(false)
  const [selectedTmdbId, setSelectedTmdbId] = useState<number | null>(null)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [posterNote, setPosterNote] = useState<string | null>(null)
  const [pickerResults, setPickerResults] = useState<TmdbSearchResult[] | null>(null)
  const [pickerMessage, setPickerMessage] = useState<string | undefined>()
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(null)
  const [allowDuplicateSave, setAllowDuplicateSave] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [wikiSource, setWikiSource] = useState<WikipediaSource>(null)
  const [wikiPickerResults, setWikiPickerResults] = useState<WikipediaResult[] | null>(null)
  const [wikiPickerMessage, setWikiPickerMessage] = useState<string | undefined>()
  const [wikiNote, setWikiNote] = useState<string | null>(null)

  useEffect(() => {
    setValues(blankFields(columns))
  }, [columns])

  const busy = fetchPhase !== 'idle' || saving
  const showWikipediaField = fromTmdb || Boolean(values[WIKIPEDIA_FIELD]?.trim()) || wikiSource != null

  async function lookupWikipedia(title: string, year: string | number | null | undefined) {
    setFetchPhase('wikipedia')
    setStatusMessage('Looking up Wikipedia…')
    setWikiPickerResults(null)
    setWikiNote(null)
    try {
      const outcome = await searchWikipedia({ title, year })
      if (outcome.status === 'matched' && outcome.match?.url) {
        setValues((current) => ({ ...current, [WIKIPEDIA_FIELD]: outcome.match!.url }))
        setWikiSource('automatic')
        setStatusMessage('TMDb details and Wikipedia link loaded. Review the form, then save.')
        return
      }
      if (outcome.status === 'ambiguous' && outcome.results.length > 0) {
        setWikiPickerResults(outcome.results)
        setWikiPickerMessage(outcome.message)
        setWikiSource(null)
        setStatusMessage('Pick the correct Wikipedia article.')
        return
      }
      setWikiSource('not-found')
      setWikiNote(
        outcome.message ||
          'Wikipedia page could not be found automatically. You can add it manually.',
      )
      setStatusMessage('TMDb details loaded. Wikipedia was not found automatically.')
    } catch {
      setWikiSource('not-found')
      setWikiNote('Wikipedia page could not be found automatically. You can add it manually.')
      setStatusMessage('TMDb details loaded. Wikipedia lookup was unavailable.')
    } finally {
      setFetchPhase('idle')
    }
  }

  async function loadDetails(tmdbId: number, forcePoster = false) {
    setFetchPhase('details')
    setStatusMessage('Loading TMDb details…')
    setError(null)
    setWikiPickerResults(null)
    try {
      const payload = await fetchTmdbMovie(tmdbId, {
        downloadPoster: true,
        forcePoster,
      })
      setFetchPhase(payload.poster?.downloaded ? 'poster' : 'details')
      setValues((current) => applyTmdbFields(current, payload.fields))
      const title = payload.fields.Title || lookupTitle
      const year = payload.fields.Year || lookupYear
      setLookupTitle(title)
      if (year) setLookupYear(year)
      setLookupTmdbId(String(tmdbId))
      setSelectedTmdbId(tmdbId)
      setFromTmdb(true)
      setWarnings(payload.warnings ?? [])
      setAllowDuplicateSave(false)
      setDuplicates(null)

      if (payload.poster?.publicPath) {
        setPosterUrl(`${payload.poster.publicPath}?t=${Date.now()}`)
        setPosterNote(
          payload.poster.reused
            ? 'Using the existing local cover file.'
            : 'Poster saved to public/covers/.',
        )
      } else {
        const parsed = parseYear(payload.fields.Year)
        const local = coverCandidates(payload.fields.Title || '', parsed, '')[0]
        setPosterUrl(local ? `${local}?t=${Date.now()}` : null)
        setPosterNote(payload.poster?.message || 'No poster downloaded.')
      }

      setPickerResults(null)
      await lookupWikipedia(title, year)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load TMDb details.')
      setStatusMessage('')
      setFetchPhase('idle')
    }
  }

  async function onFetchFromTmdb() {
    setError(null)
    setWarnings([])
    setPickerResults(null)
    setDuplicates(null)
    setAllowDuplicateSave(false)
    setWikiPickerResults(null)
    setFetchPhase('search')
    setStatusMessage('Searching TMDb…')

    try {
      const outcome = await searchTmdb({
        title: lookupTitle || values.Title,
        year: lookupYear || values.Year,
        tmdbId: lookupTmdbId,
      })

      if (outcome.status === 'none') {
        setError(
          outcome.message ||
            'No TMDb matches found. Try a different title, add a year, or enter a TMDb ID.',
        )
        setStatusMessage('')
        return
      }

      if (outcome.status === 'ambiguous') {
        setPickerResults(outcome.results)
        setPickerMessage(outcome.message)
        setStatusMessage('Multiple matches — pick the correct movie.')
        return
      }

      const match = outcome.match ?? outcome.results[0]
      if (!match) {
        setError('No TMDb matches found.')
        setStatusMessage('')
        return
      }

      await loadDetails(match.tmdbId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'TMDb search failed.')
      setStatusMessage('')
    } finally {
      setFetchPhase('idle')
    }
  }

  async function onRetryPoster() {
    if (selectedTmdbId == null) return
    setFetchPhase('poster')
    setError(null)
    setStatusMessage('Downloading poster…')
    try {
      const poster = await downloadTmdbPoster(selectedTmdbId, {
        title: values.Title,
        year: values.Year,
        force: true,
      })
      if (poster.publicPath) {
        setPosterUrl(`${poster.publicPath}?t=${Date.now()}`)
        setPosterNote(poster.message || 'Poster updated.')
      } else {
        setPosterNote(poster.message || 'Poster download failed.')
      }
      setStatusMessage('Poster download finished.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Poster download failed.')
      setStatusMessage('')
    } finally {
      setFetchPhase('idle')
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (!allowDuplicateSave) {
        const matches = await findDuplicates(values.Title, values.Year)
        if (matches.length > 0) {
          setDuplicates(matches)
          setSaving(false)
          return
        }
      }

      const movie = await createMovie(values)
      await reload()
      navigate(`/movie/${movie.catalogId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save movie.')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="status-panel" role="status">
        <p>Loading collection…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="status-panel status-panel--error" role="alert">
        <h1>Could not load collection</h1>
        <p>{message}</p>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="status-panel status-panel--error" role="alert">
        <h1>Editing unavailable</h1>
        <p>
          Start the app with <code>npm start</code> (house/LAN) or <code>npm run dev</code> so the
          local save server is running.
        </p>
        <Link to="/">Back to collection</Link>
      </div>
    )
  }

  const fetchLabel =
    fetchPhase === 'search'
      ? 'Searching…'
      : fetchPhase === 'details'
        ? 'Loading details…'
        : fetchPhase === 'poster'
          ? 'Downloading poster…'
          : fetchPhase === 'wikipedia'
            ? 'Finding Wikipedia…'
            : 'Fetch from TMDb'

  return (
    <section className="add-movie-page">
      <Link className="add-movie-page__back" to="/">
        ← Back to collection
      </Link>
      <header className="add-movie-page__intro">
        <h1>Add a movie</h1>
        <p>
          Look up title details on TMDb (and Wikipedia), review the form, then save to{' '}
          <code>Master Film List.xlsx</code>. Disc format, edition, HDR flags, and Rotten Tomatoes
          stay manual.
        </p>
        {collectionPath ? <p className="add-movie-page__path">{collectionPath}</p> : null}
      </header>

      <div className="add-movie-page__tmdb" aria-labelledby="tmdb-lookup-heading">
        <h2 id="tmdb-lookup-heading">TMDb lookup</h2>
        <div className="add-movie-page__tmdb-grid">
          <label>
            <span>Movie title</span>
            <input
              type="text"
              value={lookupTitle}
              onChange={(event) => setLookupTitle(event.target.value)}
              autoComplete="off"
              disabled={busy}
            />
          </label>
          <label>
            <span>Release year (optional)</span>
            <input
              type="text"
              inputMode="numeric"
              value={lookupYear}
              onChange={(event) => setLookupYear(event.target.value)}
              placeholder="e.g. 1979"
              disabled={busy}
            />
          </label>
          <label>
            <span>TMDb ID (optional)</span>
            <input
              type="text"
              inputMode="numeric"
              value={lookupTmdbId}
              onChange={(event) => setLookupTmdbId(event.target.value)}
              placeholder="Exact match"
              disabled={busy}
            />
          </label>
        </div>
        <div className="add-movie-page__tmdb-actions">
          <button
            type="button"
            onClick={() => void onFetchFromTmdb()}
            disabled={busy || (!lookupTitle.trim() && !lookupTmdbId.trim() && !values.Title?.trim())}
          >
            {fetchLabel}
          </button>
          {selectedTmdbId != null ? (
            <button
              type="button"
              className="add-movie-page__secondary"
              onClick={() => void onRetryPoster()}
              disabled={busy}
            >
              Retry poster download
            </button>
          ) : null}
        </div>
        <p className="add-movie-page__tmdb-note" role="status" aria-live="polite">
          {statusMessage ||
            'Fetching fills movie metadata and tries to find a Wikipedia link. It does not save until you click Save movie.'}
        </p>
      </div>

      {posterUrl || fromTmdb ? (
        <div className="add-movie-page__preview">
          <div className="add-movie-page__preview-art">
            {posterUrl ? (
              <img src={posterUrl} alt={`Poster preview for ${values.Title || 'selected movie'}`} />
            ) : (
              <div className="add-movie-page__preview-missing">No poster preview</div>
            )}
          </div>
          <div>
            {fromTmdb ? (
              <p className="add-movie-page__badge">
                Fields below were filled from TMDb — review before saving.
              </p>
            ) : null}
            {posterNote ? <p className="add-movie-page__sync">{posterNote}</p> : null}
          </div>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="add-movie-page__warnings" role="status">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {wikiNote ? (
        <p className="add-movie-page__warnings" role="status">
          {wikiNote}
        </p>
      ) : null}

      {duplicates && duplicates.length > 0 ? (
        <div className="add-movie-page__duplicates" role="alert">
          <h2>Possible duplicate</h2>
          <p>
            A title with the same name{values.Year ? ` and year` : ''} is already in the collection.
            If you own another physical edition, you can still add it.
          </p>
          <ul>
            {duplicates.map((item) => (
              <li key={item.catalogId}>
                <Link to={`/movie/${item.catalogId}`}>
                  {item.title}
                  {item.year ? ` (${item.year})` : ''} — {item.catalogId}
                </Link>
                {item.discFormat || item.edition
                  ? ` · ${[item.edition, item.discFormat].filter(Boolean).join(' · ')}`
                  : null}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="add-movie-page__secondary"
            onClick={() => {
              setAllowDuplicateSave(true)
              setDuplicates(null)
            }}
          >
            Add anyway as another edition
          </button>
        </div>
      ) : null}

      <form className="add-movie-page__form" onSubmit={(event) => void onSubmit(event)}>
        <MovieForm
          columns={columns}
          values={values}
          showCatalogId
          excludeFields={showWikipediaField ? [WIKIPEDIA_FIELD] : []}
          onChange={(field, value) => {
            setValues((current) => ({ ...current, [field]: value }))
            if (field === 'Title') setLookupTitle(value)
            if (field === 'Year') setLookupYear(value)
          }}
        />

        {showWikipediaField ? (
          <WikipediaLinkField
            value={values[WIKIPEDIA_FIELD] ?? ''}
            source={wikiSource}
            busy={busy}
            onChange={(value) =>
              setValues((current) => ({ ...current, [WIKIPEDIA_FIELD]: value }))
            }
            onSourceChange={setWikiSource}
            onSearchAgain={() => {
              void lookupWikipedia(values.Title || lookupTitle, values.Year || lookupYear)
            }}
          />
        ) : null}

        {error ? (
          <p className="add-movie-page__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="add-movie-page__actions">
          <button type="submit" disabled={busy || !values.Title?.trim()}>
            {saving ? 'Saving…' : 'Save movie'}
          </button>
          <Link to="/">Cancel</Link>
        </div>
      </form>

      {pickerResults ? (
        <TmdbResultPicker
          results={pickerResults}
          message={pickerMessage}
          busy={busy}
          onCancel={() => {
            setPickerResults(null)
            setStatusMessage('')
          }}
          onSelect={(result) => {
            void loadDetails(result.tmdbId)
          }}
        />
      ) : null}

      {wikiPickerResults ? (
        <WikipediaResultPicker
          results={wikiPickerResults}
          message={wikiPickerMessage}
          busy={busy}
          onSelect={(result) => {
            setValues((current) => ({ ...current, [WIKIPEDIA_FIELD]: result.url }))
            setWikiSource('selected')
            setWikiPickerResults(null)
            setWikiNote(null)
            setStatusMessage('Wikipedia article selected. Review the form, then save.')
          }}
          onSearchAgain={() => {
            void lookupWikipedia(values.Title || lookupTitle, values.Year || lookupYear)
          }}
          onEnterManual={() => {
            setWikiPickerResults(null)
            setWikiSource('manual')
            setWikiNote(null)
            setStatusMessage('Enter the Wikipedia URL manually below.')
          }}
          onSkip={() => {
            setWikiPickerResults(null)
            setWikiSource('not-found')
            setWikiNote(null)
            setStatusMessage('Wikipedia skipped. You can still add a link later.')
          }}
        />
      ) : null}
    </section>
  )
}
