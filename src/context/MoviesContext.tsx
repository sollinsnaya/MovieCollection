import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  apiAvailable,
  createMovie as apiCreateMovie,
  deleteMovie as apiDeleteMovie,
  fetchCollection,
  updateMovie as apiUpdateMovie,
} from '../lib/api'
import { loadMoviesFromCsv, toMovie } from '../lib/spreadsheet'
import type { Movie, MovieRecord } from '../types/movie'

type MoviesContextValue = {
  status: 'loading' | 'error' | 'ready'
  message?: string
  movies: Movie[]
  columns: string[]
  canEdit: boolean
  csvPath: string | null
  reload: () => Promise<void>
  createMovie: (fields: MovieRecord) => Promise<Movie>
  updateMovie: (catalogId: string, fields: MovieRecord) => Promise<Movie>
  deleteMovie: (catalogId: string) => Promise<void>
}

const MoviesContext = createContext<MoviesContextValue | null>(null)

export function MoviesProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [message, setMessage] = useState<string | undefined>()
  const [movies, setMovies] = useState<Movie[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [canEdit, setCanEdit] = useState(false)
  const [csvPath, setCsvPath] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setStatus('loading')
    setMessage(undefined)
    try {
      const editable = await apiAvailable()
      setCanEdit(editable)

      if (editable) {
        try {
          const payload = await fetchCollection()
          setColumns(payload.columns)
          setCsvPath(payload.csvPath ?? null)
          setMovies(
            payload.rows
              .map(toMovie)
              .filter((movie) => Boolean(movie.catalogId) && Boolean(movie.title)),
          )
          setStatus('ready')
          return
        } catch {
          setCanEdit(false)
        }
      }

      const loaded = await loadMoviesFromCsv()
      setMovies(loaded)
      setColumns(loaded[0] ? Object.keys(loaded[0].fields) : [])
      setCsvPath(null)
      setStatus('ready')
    } catch (error: unknown) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Failed to load collection.')
      setMovies([])
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const createMovie = useCallback(async (fields: MovieRecord) => {
    const row = await apiCreateMovie(fields)
    const movie = toMovie(row)
    setMovies((current) => [...current, movie])
    return movie
  }, [])

  const updateMovie = useCallback(async (catalogId: string, fields: MovieRecord) => {
    const row = await apiUpdateMovie(catalogId, fields)
    const movie = toMovie(row)
    setMovies((current) =>
      current.map((item) => (item.catalogId === catalogId ? movie : item)),
    )
    return movie
  }, [])

  const deleteMovie = useCallback(async (catalogId: string) => {
    await apiDeleteMovie(catalogId)
    setMovies((current) => current.filter((item) => item.catalogId !== catalogId))
  }, [])

  const value = useMemo<MoviesContextValue>(
    () => ({
      status,
      message,
      movies,
      columns,
      canEdit,
      csvPath,
      reload,
      createMovie,
      updateMovie,
      deleteMovie,
    }),
    [
      status,
      message,
      movies,
      columns,
      canEdit,
      csvPath,
      reload,
      createMovie,
      updateMovie,
      deleteMovie,
    ],
  )

  return <MoviesContext.Provider value={value}>{children}</MoviesContext.Provider>
}

export function useMoviesContext(): MoviesContextValue {
  const value = useContext(MoviesContext)
  if (!value) {
    throw new Error('useMoviesContext must be used within MoviesProvider')
  }
  return value
}
