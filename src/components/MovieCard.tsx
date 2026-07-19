import { Link } from 'react-router-dom'
import { useMoods } from '../context/MoodsContext'
import type { Movie } from '../types/movie'
import { CoverArt } from './CoverArt'
import { displayValue } from '../lib/normalize'
import './MovieCard.css'

type MovieCardProps = {
  movie: Movie
}

export function MovieCard({ movie }: MovieCardProps) {
  const { getMoods } = useMoods()
  const moods = getMoods(movie.catalogId)

  return (
    <Link className="movie-card" to={`/movie/${movie.catalogId}`}>
      <CoverArt catalogId={movie.catalogId} title={movie.title} year={movie.year} />
      <div className="movie-card__meta">
        <h2 className="movie-card__title">{movie.title}</h2>
        <p className="movie-card__line">
          <span>{movie.year ?? 'Year unknown'}</span>
          {movie.discFormat ? <span>{movie.discFormat}</span> : null}
        </p>
        {movie.edition ? (
          <p className="movie-card__edition">{displayValue(movie.edition)}</p>
        ) : null}
        {moods.length > 0 ? (
          <p className="movie-card__moods">
            {moods.slice(0, 2).join(' · ')}
            {moods.length > 2 ? ` · +${moods.length - 2}` : ''}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
