import type { MovieRecord } from '../types/movie'
import './MovieForm.css'

/** Fields shown first when adding/editing. Remaining columns appear under “More fields”. */
export const FEATURED_FIELDS = [
  'Title',
  'Sort Title',
  'Year',
  'Director',
  'Disc Format',
  'Edition',
  'Studio/Distributor',
  'Boutique Label',
  'Franchise/Collection',
  'Runtime (min)',
  'Spoiler-Free Plot Summary',
  'Notes',
] as const

type MovieFormProps = {
  columns: string[]
  values: MovieRecord
  onChange: (field: string, value: string) => void
  lockCatalogId?: boolean
  showCatalogId?: boolean
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

export function MovieForm({
  columns,
  values,
  onChange,
  lockCatalogId = false,
  showCatalogId = true,
}: MovieFormProps) {
  const featured = FEATURED_FIELDS.filter((field) => columns.includes(field))
  const featuredSet = new Set<string>(featured)
  const rest = columns.filter((column) => {
    if (column === 'Catalog ID') return false
    if (column === 'Last Updated') return false
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
          multiline={field === 'Spoiler-Free Plot Summary' || field === 'Notes'}
          onChange={(value) => onChange(field, value)}
        />
      ))}

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
