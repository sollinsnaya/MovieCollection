/** Spreadsheet columns stored as Yes / blank (and occasional lowercase "yes"). */
export const BOOLEAN_FIELDS = [
  'Steelbook',
  'HDR10',
  'HDR10+',
  'Dolby Vision',
  'Dolby Atmos',
  'Dolby True HD',
  'DTS:X',
  'DTS-HD  MA',
  '7.1',
  '5.1',
] as const

export type BooleanField = (typeof BOOLEAN_FIELDS)[number]

const BOOLEAN_FIELD_SET = new Set<string>(BOOLEAN_FIELDS)

/** Canonical value written back to the spreadsheet when checked. */
export const BOOLEAN_TRUE = 'Yes'

export function isBooleanField(field: string): boolean {
  return BOOLEAN_FIELD_SET.has(field)
}

export function isBooleanTruthy(value: unknown): boolean {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return false
  return text === 'yes' || text === 'y' || text === 'true' || text === '1' || text === 'x'
}

export function booleanToSpreadsheet(checked: boolean): string {
  return checked ? BOOLEAN_TRUE : ''
}

export function booleanFieldsInColumns(columns: string[]): string[] {
  return BOOLEAN_FIELDS.filter((field) => columns.includes(field))
}
