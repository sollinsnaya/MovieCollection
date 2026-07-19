import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { blankFields, MovieForm } from '../components/MovieForm'
import { useMoviesContext } from '../context/MoviesContext'
import './AddMoviePage.css'

export function AddMoviePage() {
  const navigate = useNavigate()
  const { status, message, columns, canEdit, createMovie, csvPath } = useMoviesContext()
  const [values, setValues] = useState(() => blankFields(columns))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValues(blankFields(columns))
  }, [columns])

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
          Start the app with <code>npm run dev</code> so the local save server is running. Opening
          only the static site cannot update the spreadsheet.
        </p>
        <Link to="/">Back to collection</Link>
      </div>
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const movie = await createMovie(values)
      navigate(`/movie/${movie.catalogId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save movie.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="add-movie-page">
      <Link className="add-movie-page__back" to="/">
        ← Back to collection
      </Link>
      <header className="add-movie-page__intro">
        <h1>Add a movie</h1>
        <p>
          New rows are saved to <code>Movie_Collection_Master_Current.csv</code> in this project.
          Catalog ID is created automatically if you leave it blank.
        </p>
        {csvPath ? <p className="add-movie-page__path">{csvPath}</p> : null}
      </header>

      <form className="add-movie-page__form" onSubmit={onSubmit}>
        <MovieForm
          columns={columns}
          values={values}
          showCatalogId
          onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        />

        {error ? (
          <p className="add-movie-page__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="add-movie-page__actions">
          <button type="submit" disabled={saving || !values.Title?.trim()}>
            {saving ? 'Saving…' : 'Save movie'}
          </button>
          <Link to="/">Cancel</Link>
        </div>
      </form>
    </section>
  )
}
