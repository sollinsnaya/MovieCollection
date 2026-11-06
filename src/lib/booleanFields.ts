/** Spreadsheet columns stored as Yes / blank (and occasional lowercase "yes"). */
export const BOOLEAN_FIELDS = [
  'Steelbook',
  'HDR10',
  'HDR10+',
  'Dolby Vision',
  'Dolby Atmos',
  'Dolby True HD',
  'Dolby Digital',
  'Dolby Surround',
  'DTS:X',
  'DTS-HD  MA',
  '7.1',
  '5.1',
  'Stereo',
  'Mono',
] as const

export type BooleanField = (typeof BOOLEAN_FIELDS)[number]

/** Video / HDR feature checkboxes. */
export const VIDEO_BOOLEAN_FIELDS = ['HDR10', 'HDR10+', 'Dolby Vision'] as const

/** Audio feature checkboxes. */
export const AUDIO_BOOLEAN_FIELDS = [
  'Dolby Atmos',
  'Dolby True HD',
  'Dolby Digital',
  'Dolby Surround',
  'DTS:X',
  'DTS-HD  MA',
  '7.1',
  '5.1',
  'Stereo',
  'Mono',
] as const

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

export function videoBooleanFieldsInColumns(columns: string[]): string[] {
  return VIDEO_BOOLEAN_FIELDS.filter((field) => columns.includes(field))
}

export function audioBooleanFieldsInColumns(columns: string[]): string[] {
  return AUDIO_BOOLEAN_FIELDS.filter((field) => columns.includes(field))
}
