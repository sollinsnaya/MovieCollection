import type { Movie } from '../types/movie'

export function searchMovies(movies: Movie[], query: string): Movie[] {
  const q = query.trim().toLowerCase()
  if (!q) return movies

  return movies.filter((movie) => {
    const haystack = [
      movie.title,
      movie.sortTitle,
      movie.director,
      movie.catalogId,
      movie.edition,
      movie.discFormat,
      movie.franchiseCollection,
      movie.genre,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(q)
  })
}
