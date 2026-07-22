/** Raw spreadsheet row — original column names preserved. */
export type MovieRecord = Record<string, string>

export type Movie = {
  /** Original spreadsheet cells (column name → value). */
  fields: MovieRecord
  catalogId: string
  title: string
  sortTitle: string
  year: number | null
  director: string
  discFormat: string
  edition: string
  boutiqueLabel: string
  franchiseCollection: string
  genre: string
  lastUpdated: string | null
  runtimeMinutes: number | null
  plotSummary: string
}

export type SortOption = 'title-asc' | 'title-desc' | 'year-desc' | 'year-asc' | 'recent'
