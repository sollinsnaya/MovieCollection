import Papa from 'papaparse'
import type { Movie, MovieRecord } from '../types/movie'
import { cleanText, parseDate, parseRuntime, parseYear } from './normalize'

/** Browser URL for the collection CSV (served from the repo-root spreadsheet). */
export const COLLECTION_CSV_PATH = '/data/Movie_Collection_Master_Current.csv'

export function toMovie(row: MovieRecord): Movie {
  const fields: MovieRecord = {}
  for (const [key, value] of Object.entries(row)) {
    fields[key] = cleanText(value)
  }

  const catalogId = fields['Catalog ID'] ?? ''
  const title = fields.Title ?? ''
  const sortTitle = fields['Sort Title'] || title
  const researchedRuntime = parseRuntime(fields['Runtime (min) – researched'])
  const sheetRuntime = parseRuntime(fields['Runtime (min)'])

  return {
    fields,
    catalogId,
    title,
    sortTitle,
    year: parseYear(fields.Year),
    director:
      fields['Director (Verified/Researched)'] || fields.Director || '',
    discFormat: fields['Disc Format'] ?? '',
    edition: fields.Edition ?? '',
    boutiqueLabel: fields['Boutique Label'] ?? '',
    franchiseCollection: fields['Franchise/Collection'] ?? '',
    lastUpdated: parseDate(fields['Last Updated']),
    runtimeMinutes: researchedRuntime ?? sheetRuntime,
    plotSummary: fields['Spoiler-Free Plot Summary'] ?? '',
  }
}

export async function loadMoviesFromCsv(
  path: string = COLLECTION_CSV_PATH,
): Promise<Movie[]> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(
      `Could not load collection data (${response.status}). Expected file at ${path}.`,
    )
  }

  const csvText = await response.text()
  const parsed = Papa.parse<MovieRecord>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  if (parsed.errors.length > 0) {
    const first = parsed.errors[0]
    throw new Error(`CSV parse error: ${first.message}`)
  }

  return parsed.data
    .map(toMovie)
    .filter((movie) => Boolean(movie.catalogId) && Boolean(movie.title))
}

export function getMovieById(movies: Movie[], catalogId: string): Movie | undefined {
  return movies.find((movie) => movie.catalogId === catalogId)
}
