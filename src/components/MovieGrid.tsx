import type { Movie } from '../types/movie'
import { MovieCard } from './MovieCard'
import './MovieGrid.css'

type MovieGridProps = {
  movies: Movie[]
}

export function MovieGrid({ movies }: MovieGridProps) {
  if (movies.length === 0) {
    return (
      <div className="empty-state" role="status">
        <h2>No titles match</h2>
        <p>Try a different search or sort option.</p>
      </div>
    )
  }

  return (
    <div className="movie-grid">
      {movies.map((movie) => (
        <MovieCard key={movie.catalogId} movie={movie} />
      ))}
    </div>
  )
}
