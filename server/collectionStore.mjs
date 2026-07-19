import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Papa from 'papaparse'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

/** Single source of truth — repo-root spreadsheet (committed with the project). */
export const COLLECTION_CSV_NAME = 'Movie_Collection_Master_Current.csv'
export const CSV_PATH = join(ROOT, COLLECTION_CSV_NAME)

export function readCollection() {
  if (!existsSync(CSV_PATH)) {
    throw new Error(`Collection CSV not found at ${CSV_PATH}`)
  }

  const csvText = readFileSync(CSV_PATH, 'utf8')
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`)
  }

  const columns =
    parsed.meta.fields?.map((field) => field.trim()).filter(Boolean) ??
    Object.keys(parsed.data[0] ?? {})

  const rows = parsed.data.map((row) => {
    const cleaned = {}
    for (const column of columns) {
      cleaned[column] = String(row[column] ?? '').trim()
    }
    return cleaned
  })

  return { columns, rows }
}

function serializeCollection(columns, rows) {
  const normalized = rows.map((row) => {
    const out = {}
    for (const column of columns) {
      out[column] = String(row[column] ?? '').trim()
    }
    return out
  })

  return Papa.unparse({
    fields: columns,
    data: normalized,
  })
}

export function writeCollection(columns, rows) {
  mkdirSync(dirname(CSV_PATH), { recursive: true })
  const csv = serializeCollection(columns, rows)
  writeFileSync(CSV_PATH, `${csv}\n`, 'utf8')
  return { path: CSV_PATH }
}

export function nextCatalogId(rows) {
  let max = 0
  for (const row of rows) {
    const match = String(row['Catalog ID'] ?? '').trim().match(/^MC-(\d+)$/i)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `MC-${String(max + 1).padStart(4, '0')}`
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10)
}

export function emptyRow(columns) {
  const row = {}
  for (const column of columns) row[column] = ''
  return row
}
