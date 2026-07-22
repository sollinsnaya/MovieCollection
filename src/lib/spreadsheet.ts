import * as XLSX from 'xlsx'
import type { Movie, MovieRecord } from '../types/movie'
import { cleanText, parseDate, parseRuntime, parseYear } from './normalize'

/** Browser URL for the collection spreadsheet (served from the repo-root file). */
export const COLLECTION_SPREADSHEET_PATH = `/data/${encodeURI('Master Film List.xlsx')}`
/** @deprecated Prefer COLLECTION_SPREADSHEET_PATH */
export const COLLECTION_CSV_PATH = COLLECTION_SPREADSHEET_PATH

function firstField(fields: MovieRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = fields[key]
    if (value) return value
  }
  return ''
}

export function toMovie(row: MovieRecord): Movie {
  const fields: MovieRecord = {}
  for (const [key, value] of Object.entries(row)) {
    fields[key] = cleanText(value)
  }

  const catalogId = fields['Catalog ID'] ?? ''
  const title = fields.Title ?? ''
  const sortTitle = firstField(fields, 'Sort Title') || title
  const researchedRuntime = parseRuntime(fields['Runtime (min) – researched'])
  const sheetRuntime = parseRuntime(fields['Runtime (min)'])

  return {
    fields,
    catalogId,
    title,
    sortTitle,
    year: parseYear(fields.Year),
    director: firstField(fields, 'Director (Verified/Researched)', 'Director'),
    discFormat: fields['Disc Format'] ?? '',
    edition: fields.Edition ?? '',
    boutiqueLabel: fields['Boutique Label'] ?? '',
    franchiseCollection: firstField(fields, 'Franchise', 'Franchise/Collection'),
    genre: fields.Genre ?? '',
    lastUpdated: parseDate(fields['Last Updated']),
    runtimeMinutes: researchedRuntime ?? sheetRuntime,
    plotSummary: firstField(
      fields,
      'Spoiler Free Summary',
      'Spoiler-Free Plot Summary',
    ),
  }
}

function recordsFromWorkbook(workbook: XLSX.WorkBook): MovieRecord[] {
  const sheetName = workbook.SheetNames.includes('Master Collection')
    ? 'Master Collection'
    : workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null | undefined)[]>(
    sheet,
    {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    },
  )

  if (matrix.length === 0) return []

  const columns = matrix[0].map((header) => String(header ?? '').trim()).filter(Boolean)
  const records: MovieRecord[] = []

  for (let i = 1; i < matrix.length; i += 1) {
    const cells = matrix[i] ?? []
    const record: MovieRecord = {}
    let hasData = false
    for (let c = 0; c < columns.length; c += 1) {
      const value = cleanText(cells[c])
      record[columns[c]] = value
      if (value) hasData = true
    }
    if (hasData) records.push(record)
  }

  return records
}

export async function loadMoviesFromSpreadsheet(
  path: string = COLLECTION_SPREADSHEET_PATH,
): Promise<Movie[]> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(
      `Could not load collection data (${response.status}). Expected file at ${path}.`,
    )
  }

  const buffer = await response.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  return recordsFromWorkbook(workbook)
    .map(toMovie)
    .filter((movie) => Boolean(movie.catalogId) && Boolean(movie.title))
}

/** @deprecated Prefer loadMoviesFromSpreadsheet */
export const loadMoviesFromCsv = loadMoviesFromSpreadsheet

export function getMovieById(movies: Movie[], catalogId: string): Movie | undefined {
  return movies.find((movie) => movie.catalogId === catalogId)
}
