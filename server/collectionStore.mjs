import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

/** Single source of truth — repo-root spreadsheet (committed with the project). */
export const COLLECTION_FILE_NAME = 'Master Film List.xlsx'
export const COLLECTION_PATH = join(ROOT, COLLECTION_FILE_NAME)
/** @deprecated Prefer COLLECTION_PATH */
export const CSV_PATH = COLLECTION_PATH

const SHEET_NAME = 'Master Collection'

function cellToString(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Avoid "2019.0" style floats for whole years/runtimes.
    if (Number.isInteger(value)) return String(value)
    return String(value)
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  return String(value).trim()
}

export function readCollection() {
  if (!existsSync(COLLECTION_PATH)) {
    throw new Error(`Collection spreadsheet not found at ${COLLECTION_PATH}`)
  }

  const workbook = XLSX.read(readFileSync(COLLECTION_PATH), {
    type: 'buffer',
    cellDates: true,
  })

  const sheetName =
    workbook.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('Workbook has no sheets.')
  }

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  })

  if (matrix.length === 0) {
    return { columns: [], rows: [], sheetName }
  }

  const columns = matrix[0].map((header) => String(header ?? '').trim()).filter(Boolean)
  if (columns.length === 0) {
    throw new Error('Spreadsheet header row is empty.')
  }

  const rows = []
  for (let i = 1; i < matrix.length; i += 1) {
    const cells = matrix[i] ?? []
    const row = {}
    let hasData = false
    for (let c = 0; c < columns.length; c += 1) {
      const value = cellToString(cells[c])
      row[columns[c]] = value
      if (value) hasData = true
    }
    if (hasData) rows.push(row)
  }

  return { columns, rows, sheetName }
}

export function writeCollection(columns, rows, sheetName = SHEET_NAME) {
  mkdirSync(dirname(COLLECTION_PATH), { recursive: true })

  const normalized = rows.map((row) => {
    const out = {}
    for (const column of columns) {
      out[column] = cellToString(row[column])
    }
    return out
  })

  const aoa = [columns, ...normalized.map((row) => columns.map((column) => row[column]))]
  const sheet = XLSX.utils.aoa_to_sheet(aoa)

  // Keep column widths readable when reopening in Excel/LibreOffice.
  sheet['!cols'] = columns.map((column) => ({
    wch: Math.min(48, Math.max(12, column.length + 2)),
  }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName || SHEET_NAME)

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  writeFileSync(COLLECTION_PATH, buffer)
  return { path: COLLECTION_PATH }
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
