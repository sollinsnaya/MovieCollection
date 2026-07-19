import { SORT_LABELS } from '../lib/sort'
import type { SortOption } from '../types/movie'
import './CatalogToolbar.css'

type CatalogToolbarProps = {
  query: string
  sort: SortOption
  resultCount: number
  totalCount: number
  filtersActive: boolean
  filtersOpen: boolean
  onQueryChange: (value: string) => void
  onSortChange: (value: SortOption) => void
  onToggleFilters: () => void
  onClearFilters: () => void
}

const SORT_OPTIONS = Object.keys(SORT_LABELS) as SortOption[]

export function CatalogToolbar({
  query,
  sort,
  resultCount,
  totalCount,
  filtersActive,
  filtersOpen,
  onQueryChange,
  onSortChange,
  onToggleFilters,
  onClearFilters,
}: CatalogToolbarProps) {
  return (
    <div className="catalog-toolbar">
      <label className="catalog-toolbar__search">
        <span className="visually-hidden">Search by title</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search titles, directors, formats…"
          autoComplete="off"
        />
      </label>

      <label className="catalog-toolbar__sort">
        <span>Sort</span>
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </label>

      <div className="catalog-toolbar__actions">
        <button
          type="button"
          className={`catalog-toolbar__filters-btn ${filtersOpen || filtersActive ? 'is-active' : ''}`}
          aria-pressed={filtersOpen}
          onClick={onToggleFilters}
        >
          Filters{filtersActive ? ' · on' : ''}
        </button>
        {filtersActive ? (
          <button type="button" className="catalog-toolbar__clear" onClick={onClearFilters}>
            Clear
          </button>
        ) : null}
      </div>

      <p className="catalog-toolbar__count" aria-live="polite">
        Showing {resultCount} of {totalCount}
      </p>
    </div>
  )
}
