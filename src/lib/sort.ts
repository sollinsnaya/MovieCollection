import type { Movie, SortOption } from '../types/movie'

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

export function sortMovies(movies: Movie[], sort: SortOption): Movie[] {
  const copy = [...movies]

  switch (sort) {
    case 'title-asc':
      return copy.sort((a, b) => compareText(a.sortTitle, b.sortTitle))
    case 'title-desc':
      return copy.sort((a, b) => compareText(b.sortTitle, a.sortTitle))
    case 'year-desc':
      return copy.sort((a, b) => {
        const ay = a.year ?? -Infinity
        const by = b.year ?? -Infinity
        if (by !== ay) return by - ay
        return compareText(a.sortTitle, b.sortTitle)
      })
    case 'year-asc':
      return copy.sort((a, b) => {
        const ay = a.year ?? Infinity
        const by = b.year ?? Infinity
        if (ay !== by) return ay - by
        return compareText(a.sortTitle, b.sortTitle)
      })
    case 'recent':
      return copy.sort((a, b) => {
        const at = a.lastUpdated ? Date.parse(a.lastUpdated) : 0
        const bt = b.lastUpdated ? Date.parse(b.lastUpdated) : 0
        if (bt !== at) return bt - at
        // Stable fallback: higher catalog numbers feel more recently added.
        return compareText(b.catalogId, a.catalogId)
      })
    default:
      return copy
  }
}

export const SORT_LABELS: Record<SortOption, string> = {
  'title-asc': 'Title A–Z',
  'title-desc': 'Title Z–A',
  'year-desc': 'Year (newest)',
  'year-asc': 'Year (oldest)',
  recent: 'Recently added',
}
