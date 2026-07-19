import { useEffect, useState } from 'react'
import { loadMoviesFromCsv } from '../lib/spreadsheet'
import type { Movie } from '../types/movie'

type MoviesState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; movies: Movie[] }

export function useMovies(): MoviesState {
  const [state, setState] = useState<MoviesState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    loadMoviesFromCsv()
      .then((movies) => {
        if (!cancelled) setState({ status: 'ready', movies })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'Failed to load collection.'
          setState({ status: 'error', message })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
