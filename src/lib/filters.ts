import type { Movie } from '../types/movie'
import type { Mood } from './moods'

export type CatalogFilters = {
  formats: string[]
  editions: string[]
  boutiques: string[]
  franchises: string[]
  studios: string[]
  genres: string[]
  moods: Mood[]
}

export const EMPTY_FILTERS: CatalogFilters = {
  formats: [],
  editions: [],
  boutiques: [],
  franchises: [],
  studios: [],
  genres: [],
  moods: [],
}

/** Split compound disc formats like "UHD 4K / Blu-ray". */
export function splitFormats(discFormat: string): string[] {
  if (!discFormat.trim()) return []
  return discFormat
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
}

/**
 * Franchise currently mixes real franchise names with verification notes.
 * Keep short, label-like values for browsing/filters.
 */
export function isBrowseableFranchise(value: string): boolean {
  const text = value.trim()
  if (!text) return false
  if (text.length > 48) return false
  const lower = text.toLowerCase()
  if (lower.startsWith('back cover')) return false
  if (lower.startsWith('new photo')) return false
  if (lower.startsWith('standard ')) return false
  if (lower.startsWith('three-disc')) return false
  if (lower.includes('confirms')) return false
  return true
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  )
}

export function studioLabel(movie: Movie): string {
  return (
    movie.fields['Studio/Distributor – researched'] ||
    movie.fields['Studio/Distributor'] ||
    ''
  )
}

export function collectFilterOptions(movies: Movie[]) {
  const formats = uniqueSorted(movies.flatMap((movie) => splitFormats(movie.discFormat)))
  const editions = uniqueSorted(movies.map((movie) => movie.edition).filter(Boolean))
  const boutiques = uniqueSorted(movies.map((movie) => movie.boutiqueLabel).filter(Boolean))
  const franchises = uniqueSorted(
    movies
      .map((movie) => movie.franchiseCollection)
      .filter((value) => isBrowseableFranchise(value)),
  )
  const studios = uniqueSorted(movies.map((movie) => studioLabel(movie)).filter(Boolean))
  const genres = uniqueSorted(movies.map((movie) => movie.genre).filter(Boolean))

  return { formats, editions, boutiques, franchises, studios, genres }
}

export function hasActiveFilters(filters: CatalogFilters): boolean {
  return (
    filters.formats.length > 0 ||
    filters.editions.length > 0 ||
    filters.boutiques.length > 0 ||
    filters.franchises.length > 0 ||
    filters.studios.length > 0 ||
    filters.genres.length > 0 ||
    filters.moods.length > 0
  )
}

export function activeFilterCount(filters: CatalogFilters): number {
  return (
    filters.formats.length +
    filters.editions.length +
    filters.boutiques.length +
    filters.franchises.length +
    filters.studios.length +
    filters.genres.length +
    filters.moods.length
  )
}

type FilterMoviesArgs = {
  movies: Movie[]
  filters: CatalogFilters
  moodMap: Record<string, Mood[]>
}

export function filterMovies({ movies, filters, moodMap }: FilterMoviesArgs): Movie[] {
  return movies.filter((movie) => {
    if (filters.formats.length > 0) {
      const tokens = splitFormats(movie.discFormat)
      if (!filters.formats.some((format) => tokens.includes(format))) return false
    }

    if (filters.editions.length > 0) {
      if (!filters.editions.includes(movie.edition)) return false
    }

    if (filters.boutiques.length > 0) {
      if (!filters.boutiques.includes(movie.boutiqueLabel)) return false
    }

    if (filters.franchises.length > 0) {
      if (!filters.franchises.includes(movie.franchiseCollection)) return false
    }

    if (filters.studios.length > 0) {
      if (!filters.studios.includes(studioLabel(movie))) return false
    }

    if (filters.genres.length > 0) {
      if (!filters.genres.includes(movie.genre)) return false
    }

    if (filters.moods.length > 0) {
      const moods = moodMap[movie.catalogId] ?? []
      if (!filters.moods.some((mood) => moods.includes(mood))) return false
    }

    return true
  })
}

export type BrowseCategory =
  | 'format'
  | 'studio'
  | 'edition'
  | 'franchise'
  | 'genre'
  | 'mood'
  | 'boutique'

export type BrowseGroup = {
  key: string
  label: string
  count: number
}

export function buildBrowseGroups(
  movies: Movie[],
  category: BrowseCategory,
  moodMap: Record<string, Mood[]>,
): BrowseGroup[] {
  const counts = new Map<string, number>()

  const bump = (label: string) => {
    if (!label) return
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  for (const movie of movies) {
    switch (category) {
      case 'format':
        for (const format of splitFormats(movie.discFormat)) bump(format)
        break
      case 'studio':
        bump(studioLabel(movie))
        break
      case 'edition':
        bump(movie.edition)
        break
      case 'franchise':
        if (isBrowseableFranchise(movie.franchiseCollection)) {
          bump(movie.franchiseCollection)
        }
        break
      case 'genre':
        bump(movie.genre)
        break
      case 'boutique':
        bump(movie.boutiqueLabel)
        break
      case 'mood':
        for (const mood of moodMap[movie.catalogId] ?? []) bump(mood)
        break
    }
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function filtersFromBrowse(
  category: BrowseCategory,
  value: string,
): CatalogFilters {
  const filters = {
    ...EMPTY_FILTERS,
    formats: [] as string[],
    editions: [] as string[],
    boutiques: [] as string[],
    franchises: [] as string[],
    studios: [] as string[],
    genres: [] as string[],
    moods: [] as Mood[],
  }

  switch (category) {
    case 'format':
      return { ...filters, formats: [value] }
    case 'edition':
      return { ...filters, editions: [value] }
    case 'boutique':
      return { ...filters, boutiques: [value] }
    case 'franchise':
      return { ...filters, franchises: [value] }
    case 'studio':
      return { ...filters, studios: [value] }
    case 'genre':
      return { ...filters, genres: [value] }
    case 'mood':
      return { ...filters, moods: [value as Mood] }
  }
}
