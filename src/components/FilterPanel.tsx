import {
  activeFilterCount,
  collectFilterOptions,
  EMPTY_FILTERS,
  type CatalogFilters,
} from '../lib/filters'
import { MOOD_OPTIONS, type Mood } from '../lib/moods'
import type { Movie } from '../types/movie'
import './FilterPanel.css'

type FilterPanelProps = {
  movies: Movie[]
  filters: CatalogFilters
  onChange: (filters: CatalogFilters) => void
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
  emptyHint,
}: {
  title: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  emptyHint?: string
}) {
  return (
    <fieldset className="filter-group">
      <legend>{title}</legend>
      {options.length === 0 ? (
        <p className="filter-group__empty">{emptyHint ?? 'No values in spreadsheet yet.'}</p>
      ) : (
        <div className="filter-group__options">
          {options.map((option) => {
            const checked = selected.includes(option)
            return (
              <label key={option} className={`filter-chip ${checked ? 'is-active' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(option)}
                />
                <span>{option}</span>
              </label>
            )
          })}
        </div>
      )}
    </fieldset>
  )
}

export function FilterPanel({ movies, filters, onChange }: FilterPanelProps) {
  const options = collectFilterOptions(movies)
  const count = activeFilterCount(filters)

  return (
    <aside className="filter-panel" aria-label="Collection filters">
      <div className="filter-panel__header">
        <h2>Filters {count > 0 ? <span>({count})</span> : null}</h2>
        {count > 0 ? (
          <button type="button" className="filter-panel__clear" onClick={() => onChange(EMPTY_FILTERS)}>
            Clear all
          </button>
        ) : null}
      </div>

      <FilterGroup
        title="Format"
        options={options.formats}
        selected={filters.formats}
        onToggle={(value) =>
          onChange({ ...filters, formats: toggleValue(filters.formats, value) })
        }
      />

      <FilterGroup
        title="Genre"
        options={options.genres}
        selected={filters.genres}
        onToggle={(value) =>
          onChange({ ...filters, genres: toggleValue(filters.genres, value) })
        }
      />

      <FilterGroup
        title="Edition"
        options={options.editions}
        selected={filters.editions}
        onToggle={(value) =>
          onChange({ ...filters, editions: toggleValue(filters.editions, value) })
        }
      />

      <FilterGroup
        title="Studio"
        options={options.studios}
        selected={filters.studios}
        onToggle={(value) =>
          onChange({ ...filters, studios: toggleValue(filters.studios, value) })
        }
      />

      <FilterGroup
        title="Franchise"
        options={options.franchises}
        selected={filters.franchises}
        onToggle={(value) =>
          onChange({ ...filters, franchises: toggleValue(filters.franchises, value) })
        }
        emptyHint="No short franchise labels found yet."
      />

      <FilterGroup
        title="Boutique label"
        options={options.boutiques}
        selected={filters.boutiques}
        onToggle={(value) =>
          onChange({ ...filters, boutiques: toggleValue(filters.boutiques, value) })
        }
        emptyHint="Boutique Label column is empty in the spreadsheet."
      />

      <FilterGroup
        title="Mood"
        options={[...MOOD_OPTIONS]}
        selected={filters.moods}
        onToggle={(value) =>
          onChange({
            ...filters,
            moods: toggleValue(filters.moods, value) as Mood[],
          })
        }
      />

      <p className="filter-panel__note">
        Moods are stored locally in this browser and are not part of the spreadsheet.
      </p>
    </aside>
  )
}
