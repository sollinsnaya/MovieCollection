import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CoverArt } from '../components/CoverArt'
import { CoverUploader } from '../components/CoverUploader'
import { DiscFormatBadges } from '../components/DiscFormatBadges'
import { MoodPicker } from '../components/MoodPicker'
import { MovieForm } from '../components/MovieForm'
import { RottenTomatoesBadge } from '../components/RottenTomatoesBadge'
import { useMoviesContext } from '../context/MoviesContext'
import {
  AUDIO_BOOLEAN_FIELDS,
  BOOLEAN_FIELDS,
  isBooleanField,
  isBooleanTruthy,
  VIDEO_BOOLEAN_FIELDS,
} from '../lib/booleanFields'
import { addSpreadsheetColumn } from '../lib/api'
import { displayValue } from '../lib/normalize'
import { getMovieById } from '../lib/spreadsheet'
import { isHttpUrl } from '../lib/wikipediaApi'
import type { Movie, MovieRecord } from '../types/movie'
import './MovieDetailPage.css'

const WIKIPEDIA_FIELD = 'Wikipedia Link'
const TRAILER_FIELD = 'Trailer URL'

const HERO_CREDITS_FIELDS = new Set([
  'Catalog ID',
  'Title',
  'Year',
  'Director',
  'Runtime (min)',
  'Genre',
  'Studio/Distributor',
  'Studio/Distributor – researched',
  'Edition',
  'Boutique Label',
  'Franchise',
  'Franchise/Collection',
  'Rotten Tomatoes Critic Score',
  'Spoiler Free Summary',
  'Spoiler-Free Plot Summary',
  'Disc Format',
  WIKIPEDIA_FIELD,
  TRAILER_FIELD,
  'Sort Title',
])

/** Shown above / as special UI — keep out of the Film Credits list when browsing. */
function isHiddenDetailField(field: string): boolean {
  return isBooleanField(field) || HERO_CREDITS_FIELDS.has(field)
}

function fieldEntries(movie: Movie): Array<[string, string]> {
  return Object.keys(movie.fields)
    .filter((key) => !isHiddenDetailField(key))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => [key, movie.fields[key] ?? ''])
}

function displayLabel(field: string): string {
  return field === 'DTS-HD  MA' ? 'DTS-HD MA' : field
}

const BADGE_ONLY_BOOLEAN_FIELDS = new Set([
  'Steelbook',
  ...VIDEO_BOOLEAN_FIELDS,
  ...AUDIO_BOOLEAN_FIELDS,
])

function FeatureReadoutGroup({
  heading,
  fields,
  values,
}: {
  heading: string
  fields: readonly string[]
  values: MovieRecord
}) {
  const present = fields.filter(
    (field) => field in values && !BADGE_ONLY_BOOLEAN_FIELDS.has(field),
  )
  if (present.length === 0) return null

  return (
    <section className="movie-detail__booleans" aria-labelledby={`${heading}-heading`}>
      <h2 id={`${heading}-heading`}>{heading}</h2>
      <ul className="movie-detail__checkbox-grid">
        {present.map((field) => {
          const checked = isBooleanTruthy(values[field])
          return (
            <li key={field}>
              <label className="movie-detail__checkbox">
                <input type="checkbox" checked={checked} disabled readOnly tabIndex={-1} />
                <span>{displayLabel(field)}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function BooleanFeaturesReadout({ fields }: { fields: MovieRecord }) {
  const other = BOOLEAN_FIELDS.filter(
    (field) =>
      field in fields &&
      !BADGE_ONLY_BOOLEAN_FIELDS.has(field) &&
      !(VIDEO_BOOLEAN_FIELDS as readonly string[]).includes(field) &&
      !(AUDIO_BOOLEAN_FIELDS as readonly string[]).includes(field),
  )

  return (
    <>
      <FeatureReadoutGroup heading="Video features" fields={VIDEO_BOOLEAN_FIELDS} values={fields} />
      <FeatureReadoutGroup heading="Audio features" fields={AUDIO_BOOLEAN_FIELDS} values={fields} />
      {other.length > 0 ? (
        <FeatureReadoutGroup heading="Other features" fields={other} values={fields} />
      ) : null}
    </>
  )
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
    reload,
  } = useMoviesContext()

  const movie = status === 'ready' ? getMovieById(movies, catalogId) : undefined
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<MovieRecord>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coverRevision, setCoverRevision] = useState(0)
  const [addingColumn, setAddingColumn] = useState(false)

  useEffect(() => {
    if (movie) setValues({ ...movie.fields })
  }, [movie])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [catalogId])

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
  const trailerUrl = movie.fields[TRAILER_FIELD] ?? ''
  const hasTrailer = isHttpUrl(trailerUrl)
  const wikipediaUrl = movie.fields[WIKIPEDIA_FIELD] ?? ''
  const hasWikipedia = isHttpUrl(wikipediaUrl)

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

  async function onAddColumn() {
    const name = window.prompt('New spreadsheet column name:')
    if (!name?.trim()) return
    setAddingColumn(true)
    setError(null)
    try {
      const result = await addSpreadsheetColumn(name.trim())
      await reload()
      setValues((current) => ({ ...current, [result.name]: current[result.name] ?? '' }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add column.')
    } finally {
      setAddingColumn(false)
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
                Edit film page
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
        <div className="movie-detail__cover-column">
          <CoverArt
            catalogId={movie.catalogId}
            title={movie.title}
            year={movie.year}
            size="detail"
            revision={coverRevision}
          />
          {canEdit && editing ? (
            <CoverUploader
              title={movie.title}
              year={movie.year}
              catalogId={movie.catalogId}
              revision={coverRevision}
              onUploaded={() => setCoverRevision((current) => current + 1)}
            />
          ) : null}
        </div>
        <div className="movie-detail__summary">
          <p className="movie-detail__id">{movie.catalogId}</p>
          <div className="movie-detail__title-row">
            <h1>{movie.title}</h1>
            {isBooleanTruthy(movie.fields.Steelbook) ? (
              <img
                className="movie-detail__steelbook"
                src="/format-logos/steelbook.jpg"
                alt="Steelbook"
              />
            ) : null}
          </div>
          <p className="movie-detail__sub">
            {[movie.year ?? 'Year unknown', movie.director].filter(Boolean).join(' · ')}
          </p>
          {movie.edition ? <p className="movie-detail__edition">{movie.edition}</p> : null}
          {hasTrailer ? (
            <p className="movie-detail__trailer">
              <a href={trailerUrl} target="_blank" rel="noopener noreferrer">
                Watch trailer
              </a>
            </p>
          ) : null}
          {movie.plotSummary ||
          movie.fields['Rotten Tomatoes Critic Score'] ||
          movie.discFormat ||
          isBooleanTruthy(movie.fields['Dolby Digital']) ||
          isBooleanTruthy(movie.fields['Dolby Surround']) ||
          isBooleanTruthy(movie.fields['Dolby Atmos']) ||
          isBooleanTruthy(movie.fields['Dolby True HD']) ||
          isBooleanTruthy(movie.fields.Stereo) ||
          isBooleanTruthy(movie.fields.Mono) ||
          isBooleanTruthy(movie.fields['DTS:X']) ||
          isBooleanTruthy(movie.fields['DTS-HD  MA']) ||
          isBooleanTruthy(movie.fields['7.1']) ||
          isBooleanTruthy(movie.fields['5.1']) ||
          isBooleanTruthy(movie.fields['Dolby Vision']) ||
          isBooleanTruthy(movie.fields.HDR10) ||
          isBooleanTruthy(movie.fields['HDR10+']) ||
          hasWikipedia ? (
            <div className="movie-detail__plot-block">
              {movie.plotSummary ? (
                <p className="movie-detail__plot">{movie.plotSummary}</p>
              ) : movie.fields['Rotten Tomatoes Critic Score'] || hasWikipedia ? (
                <p className="movie-detail__plot movie-detail__plot--empty">No synopsis yet.</p>
              ) : null}
              {hasWikipedia ? (
                <p className="movie-detail__wikipedia">
                  <a href={wikipediaUrl} target="_blank" rel="noopener noreferrer">
                    Read more on Wikipedia
                  </a>
                </p>
              ) : null}
              {movie.fields['Rotten Tomatoes Critic Score'] ? (
                <div className="movie-detail__plot-row">
                  <RottenTomatoesBadge scoreValue={movie.fields['Rotten Tomatoes Critic Score']} />
                </div>
              ) : null}
              <DiscFormatBadges
                discFormat={movie.discFormat}
                dolbyDigital={movie.fields['Dolby Digital']}
                dolbySurround={movie.fields['Dolby Surround']}
                dolbyAtmos={movie.fields['Dolby Atmos']}
                dolbyTrueHd={movie.fields['Dolby True HD']}
                stereo={movie.fields.Stereo}
                mono={movie.fields.Mono}
                dtsX={movie.fields['DTS:X']}
                dtsHd={movie.fields['DTS-HD  MA']}
                surround71={movie.fields['7.1']}
                surround51={movie.fields['5.1']}
                dolbyVision={movie.fields['Dolby Vision']}
                hdr10={movie.fields.HDR10}
                hdr10Plus={movie.fields['HDR10+']}
              />
            </div>
          ) : null}
        </div>
      </div>

      <MoodPicker catalogId={movie.catalogId} />

      {editing ? (
        <section className="movie-detail__editor" aria-labelledby="edit-heading">
          <h2 id="edit-heading">Edit film page</h2>
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
                className="movie-detail__ghost"
                disabled={saving || addingColumn}
                onClick={() => void onAddColumn()}
              >
                {addingColumn ? 'Adding…' : 'Add section'}
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
        <>
          <BooleanFeaturesReadout fields={movie.fields} />
          {entries.length > 0 ? (
            <section className="movie-detail__sheet" aria-labelledby="metadata-heading">
              <h2 id="metadata-heading">Film Credits</h2>
              <dl className="movie-detail__fields">
                {entries.map(([label, value]) => (
                  <div key={label} className="movie-detail__field">
                    <dt>{label}</dt>
                    <dd>{displayValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </>
      )}
    </article>
  )
}
