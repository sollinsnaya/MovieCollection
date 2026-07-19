import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CoverArt } from '../components/CoverArt'
import { MoodPicker } from '../components/MoodPicker'
import { MovieForm } from '../components/MovieForm'
import { useMoviesContext } from '../context/MoviesContext'
import { displayValue } from '../lib/normalize'
import { getMovieById } from '../lib/spreadsheet'
import type { Movie, MovieRecord } from '../types/movie'
import './MovieDetailPage.css'

const PRIMARY_FIELDS = [
  'Catalog ID',
  'Title',
  'Sort Title',
  'Year',
  'Director',
  'Director (Verified/Researched)',
  'Runtime (min)',
  'Runtime (min) – researched',
  'Studio/Distributor',
  'Studio/Distributor – researched',
  'Edition',
  'Disc Format',
  'Disc Count',
  'Resolution',
  'Aspect Ratio',
  'Boutique Label',
  'Franchise/Collection',
  'Cut',
  'Country',
  'Audio',
  'Subtitles',
  'HDR10',
  'HDR10+',
  'Dolby Vision',
  'Dolby Atmos',
  'DTS:X',
  'HDR10 – normalized',
  'HDR10+ – normalized',
  'Dolby Vision – normalized',
  'Dolby Atmos – normalized',
  'DTS:X – normalized',
  '5.1 Audio – normalized',
  'Rotten Tomatoes – critics %',
  'RT status/date',
  'Spoiler-Free Plot Summary',
  'Wikipedia Source',
  'Notes',
  'Verification Status',
  'Source Reference',
  'Last Updated',
] as const

function fieldEntries(movie: Movie): Array<[string, string]> {
  const seen = new Set<string>()
  const ordered: Array<[string, string]> = []

  for (const key of PRIMARY_FIELDS) {
    if (key in movie.fields) {
      ordered.push([key, movie.fields[key] ?? ''])
      seen.add(key)
    }
  }

  const remaining = Object.keys(movie.fields)
    .filter((key) => !seen.has(key))
    .sort((a, b) => a.localeCompare(b))

  for (const key of remaining) {
    ordered.push([key, movie.fields[key] ?? ''])
  }

  return ordered
}

export function MovieDetailPage() {
  const { catalogId = '' } = useParams()
  const navigate = useNavigate()
  const {
    status,
    message,
    movies,
    columns,
    canEdit,
    updateMovie,
    deleteMovie,
  } = useMoviesContext()

  const movie = status === 'ready' ? getMovieById(movies, catalogId) : undefined
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<MovieRecord>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (movie) setValues({ ...movie.fields })
  }, [movie])

  if (status === 'loading') {
    return (
      <div className="status-panel" role="status">
        <p>Loading title…</p>
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

  if (!movie) {
    return (
      <div className="status-panel status-panel--error" role="alert">
        <h1>Title not found</h1>
        <p>
          No movie with catalog ID <code>{catalogId}</code> was found in the spreadsheet.
        </p>
        <Link to="/">Back to collection</Link>
      </div>
    )
  }

  const entries = fieldEntries(movie)

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await updateMovie(movie!.catalogId, values)
      setEditing(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!movie) return
    const confirmed = window.confirm(
      `Remove “${movie.title}” from the spreadsheet? This cannot be undone from the app.`,
    )
    if (!confirmed) return
    setSaving(true)
    setError(null)
    try {
      await deleteMovie(movie.catalogId)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete movie.')
      setSaving(false)
    }
  }

  return (
    <article className="movie-detail">
      <div className="movie-detail__top">
        <Link className="movie-detail__back" to="/">
          ← Back to collection
        </Link>
        {canEdit ? (
          <div className="movie-detail__toolbar">
            {!editing ? (
              <button type="button" onClick={() => setEditing(true)}>
                Edit spreadsheet row
              </button>
            ) : (
              <button type="button" className="movie-detail__ghost" onClick={() => setEditing(false)}>
                Cancel edit
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className="movie-detail__hero">
        <CoverArt
          catalogId={movie.catalogId}
          title={movie.title}
          year={movie.year}
          size="detail"
        />
        <div className="movie-detail__summary">
          <p className="movie-detail__id">{movie.catalogId}</p>
          <h1>{movie.title}</h1>
          <p className="movie-detail__sub">
            {[movie.year ?? 'Year unknown', movie.director, movie.discFormat]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {movie.edition ? <p className="movie-detail__edition">{movie.edition}</p> : null}
          {movie.plotSummary ? (
            <p className="movie-detail__plot">{movie.plotSummary}</p>
          ) : null}
        </div>
      </div>

      <MoodPicker catalogId={movie.catalogId} />

      {editing ? (
        <section className="movie-detail__editor" aria-labelledby="edit-heading">
          <h2 id="edit-heading">Edit spreadsheet fields</h2>
          <form onSubmit={onSave}>
            <MovieForm
              columns={columns}
              values={values}
              lockCatalogId
              showCatalogId
              onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
            />

            {error ? (
              <p className="movie-detail__error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="movie-detail__edit-actions">
              <button type="submit" disabled={saving || !values.Title?.trim()}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                className="movie-detail__danger"
                disabled={saving}
                onClick={() => void onDelete()}
              >
                Delete from spreadsheet
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="movie-detail__sheet" aria-labelledby="metadata-heading">
          <h2 id="metadata-heading">All spreadsheet fields</h2>
          <dl className="movie-detail__fields">
            {entries.map(([label, value]) => (
              <div key={label} className="movie-detail__field">
                <dt>{label}</dt>
                <dd>{displayValue(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </article>
  )
}
