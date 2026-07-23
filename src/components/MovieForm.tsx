import type { MovieRecord } from '../types/movie'
import {
  booleanFieldsInColumns,
  booleanToSpreadsheet,
  isBooleanField,
  isBooleanTruthy,
} from '../lib/booleanFields'
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
] as const

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

function BooleanFieldGroup({
  fields,
  values,
  onChange,
}: {
  fields: string[]
  values: MovieRecord
  onChange: (field: string, value: string) => void
}) {
  if (fields.length === 0) return null

  return (
    <fieldset className="movie-form__booleans">
      <legend>Disc &amp; audio features</legend>
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
                onChange={(event) =>
                  onChange(field, booleanToSpreadsheet(event.target.checked))
                }
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
  const booleanFields = booleanFieldsInColumns(columns).filter((field) => !excluded.has(field))
  const booleanSet = new Set(booleanFields)
  const featured = FEATURED_FIELDS.filter(
    (field) => columns.includes(field) && !booleanSet.has(field) && !excluded.has(field),
  )
  const featuredSet = new Set<string>(featured)
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

      <BooleanFieldGroup fields={booleanFields} values={values} onChange={onChange} />

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
