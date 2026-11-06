import type { MovieRecord } from '../types/movie'
import {
  audioBooleanFieldsInColumns,
  booleanToSpreadsheet,
  isBooleanField,
  isBooleanTruthy,
  videoBooleanFieldsInColumns,
} from '../lib/booleanFields'
import { splitFormats } from '../lib/filters'
import './MovieForm.css'

/** Fields shown first when adding/editing. Remaining columns appear under “More fields”. */
export const FEATURED_FIELDS = [
  'Title',
  'Year',
  'Director',
  'Genre',
  'Disc Format',
  'Edition',
  'Studio/Distributor',
  'Boutique Label',
  'Franchise',
  'Runtime (min)',
  'Spoiler Free Summary',
  'Rotten Tomatoes Critic Score',
  'Trailer URL',
] as const

export const DISC_FORMAT_OPTIONS = ['DVD', 'Blu-ray', 'UHD 4K', 'VHS'] as const

type MovieFormProps = {
  columns: string[]
  values: MovieRecord
  onChange: (field: string, value: string) => void
  lockCatalogId?: boolean
  showCatalogId?: boolean
  /** Hide these columns from the form (handled elsewhere in the page). */
  excludeFields?: string[]
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  readOnly = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  readOnly?: boolean
}) {
  return (
    <label className="movie-form__field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          rows={4}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          type="text"
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  )
}

function DiscFormatField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const selected = new Set(splitFormats(value))

  function toggle(option: string) {
    const next = new Set(selected)
    if (next.has(option)) next.delete(option)
    else next.add(option)
    const ordered = DISC_FORMAT_OPTIONS.filter((item) => next.has(item))
    onChange(ordered.join('; '))
  }

  return (
    <fieldset className="movie-form__disc-format">
      <legend>Disc Format</legend>
      <div className="movie-form__checkbox-grid">
        {DISC_FORMAT_OPTIONS.map((option) => {
          const id = `disc-format-${option.replace(/[^a-zA-Z0-9]+/g, '-')}`
          return (
            <label key={option} className="movie-form__checkbox" htmlFor={id}>
              <input
                id={id}
                type="checkbox"
                checked={selected.has(option)}
                onChange={() => toggle(option)}
              />
              <span>{option}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Checking one clears its mutually exclusive partner. */
const BOOLEAN_EXCLUSIONS: Record<string, string> = {
  '5.1': '7.1',
  '7.1': '5.1',
  'DTS:X': 'DTS-HD  MA',
  'DTS-HD  MA': 'DTS:X',
  Stereo: 'Mono',
  Mono: 'Stereo',
}

function BooleanFieldGroup({
  legend,
  fields,
  values,
  onChange,
}: {
  legend: string
  fields: string[]
  values: MovieRecord
  onChange: (field: string, value: string) => void
}) {
  if (fields.length === 0) return null

  function setExclusive(field: string, checked: boolean) {
    onChange(field, booleanToSpreadsheet(checked))
    if (!checked) return
    const partner = BOOLEAN_EXCLUSIONS[field]
    if (partner) {
      onChange(partner, booleanToSpreadsheet(false))
    }
  }

  return (
    <fieldset className="movie-form__booleans">
      <legend>{legend}</legend>
      <div className="movie-form__checkbox-grid">
        {fields.map((field) => {
          const checked = isBooleanTruthy(values[field])
          const id = `bool-${field.replace(/[^a-zA-Z0-9]+/g, '-')}`
          return (
            <label key={field} className="movie-form__checkbox" htmlFor={id}>
              <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(event) => setExclusive(field, event.target.checked)}
              />
              <span>{field === 'DTS-HD  MA' ? 'DTS-HD MA' : field}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function MovieForm({
  columns,
  values,
  onChange,
  lockCatalogId = false,
  showCatalogId = true,
  excludeFields = [],
}: MovieFormProps) {
  const excluded = new Set(excludeFields)
  const videoFields = videoBooleanFieldsInColumns(columns).filter((field) => !excluded.has(field))
  const audioFields = audioBooleanFieldsInColumns(columns).filter((field) => !excluded.has(field))
  const otherBooleans = columns.filter(
    (column) =>
      isBooleanField(column) &&
      !excluded.has(column) &&
      !videoFields.includes(column) &&
      !audioFields.includes(column),
  )
  const featured = FEATURED_FIELDS.filter(
    (field) =>
      columns.includes(field) &&
      !isBooleanField(field) &&
      !excluded.has(field) &&
      field !== 'Disc Format',
  )
  const featuredSet = new Set<string>([...featured, 'Disc Format'])
  const rest = columns.filter((column) => {
    if (column === 'Catalog ID') return false
    if (column === 'Last Updated') return false
    if (excluded.has(column)) return false
    if (isBooleanField(column)) return false
    return !featuredSet.has(column)
  })

  return (
    <div className="movie-form">
      {showCatalogId && columns.includes('Catalog ID') ? (
        <Field
          label="Catalog ID"
          value={values['Catalog ID'] ?? ''}
          readOnly={lockCatalogId}
          onChange={(value) => onChange('Catalog ID', value)}
        />
      ) : null}

      {featured.map((field) => (
        <Field
          key={field}
          label={field}
          value={values[field] ?? ''}
          multiline={field === 'Spoiler Free Summary'}
          onChange={(value) => onChange(field, value)}
        />
      ))}

      {columns.includes('Disc Format') && !excluded.has('Disc Format') ? (
        <DiscFormatField
          value={values['Disc Format'] ?? ''}
          onChange={(value) => onChange('Disc Format', value)}
        />
      ) : null}

      <BooleanFieldGroup
        legend="Video features"
        fields={videoFields}
        values={values}
        onChange={onChange}
      />
      <BooleanFieldGroup
        legend="Audio features"
        fields={audioFields}
        values={values}
        onChange={onChange}
      />
      <BooleanFieldGroup
        legend="Other features"
        fields={otherBooleans}
        values={values}
        onChange={onChange}
      />

      {rest.length > 0 ? (
        <details className="movie-form__more">
          <summary>More spreadsheet fields</summary>
          <div className="movie-form__more-grid">
            {rest.map((field) => (
              <Field
                key={field}
                label={field}
                value={values[field] ?? ''}
                multiline={/notes|summary|source|status/i.test(field)}
                onChange={(value) => onChange(field, value)}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}

export function blankFields(columns: string[]): MovieRecord {
  const values: MovieRecord = {}
  for (const column of columns) values[column] = ''
  return values
}
