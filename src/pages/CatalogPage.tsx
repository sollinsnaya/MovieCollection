import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CatalogToolbar } from '../components/CatalogToolbar'
import { FilterPanel } from '../components/FilterPanel'
import { MovieGrid } from '../components/MovieGrid'
import { useMoods } from '../context/MoodsContext'
import { useMoviesContext } from '../context/MoviesContext'
import {
  EMPTY_FILTERS,
  filterMovies,
  hasActiveFilters,
  type CatalogFilters,
} from '../lib/filters'
import { isMood } from '../lib/moods'
import { searchMovies } from '../lib/search'
import { sortMovies } from '../lib/sort'
import type { SortOption } from '../types/movie'
import './CatalogPage.css'

function readList(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).map((value) => value.trim()).filter(Boolean)
}

function filtersFromParams(params: URLSearchParams): CatalogFilters {
  const moods = readList(params, 'mood').filter(isMood)
  return {
    formats: readList(params, 'format'),
    editions: readList(params, 'edition'),
    boutiques: readList(params, 'boutique'),
    franchises: readList(params, 'franchise'),
    studios: readList(params, 'studio'),
    moods,
  }
}

function paramsFromFilters(filters: CatalogFilters, query: string, sort: SortOption) {
  const params = new URLSearchParams()
  if (query.trim()) params.set('q', query.trim())
  if (sort !== 'title-asc') params.set('sort', sort)
  for (const format of filters.formats) params.append('format', format)
  for (const edition of filters.editions) params.append('edition', edition)
  for (const boutique of filters.boutiques) params.append('boutique', boutique)
  for (const franchise of filters.franchises) params.append('franchise', franchise)
  for (const studio of filters.studios) params.append('studio', studio)
  for (const mood of filters.moods) params.append('mood', mood)
  return params
}

export function CatalogPage() {
  const state = useMoviesContext()
  const { assignments } = useMoods()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [sort, setSort] = useState<SortOption>(
    () => (searchParams.get('sort') as SortOption) || 'title-asc',
  )
  const [filters, setFilters] = useState<CatalogFilters>(() => filtersFromParams(searchParams))
  const [filtersOpen, setFiltersOpen] = useState(() => hasActiveFilters(filtersFromParams(searchParams)))

  useEffect(() => {
    setSearchParams(paramsFromFilters(filters, query, sort), { replace: true })
  }, [filters, query, sort, setSearchParams])

  const visibleMovies = useMemo(() => {
    if (state.status !== 'ready') return []
    const filtered = filterMovies({
      movies: state.movies,
      filters,
      moodMap: assignments,
    })
    return sortMovies(searchMovies(filtered, query), sort)
  }, [state, query, sort, filters, assignments])

  if (state.status === 'loading') {
    return (
      <div className="status-panel" role="status">
        <p>Loading collection…</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="status-panel status-panel--error" role="alert">
        <h1>Could not load collection</h1>
        <p>{state.message}</p>
        <p className="status-panel__hint">
          Place the CSV at <code>Movie_Collection_Master_Current.csv</code> in the project root and
          refresh.
        </p>
      </div>
    )
  }

  return (
    <section className="catalog-page">
      <div className="catalog-page__intro">
        <div>
          <h1>Collection</h1>
          <p>Browse physical editions across DVD, Blu-ray, and UHD 4K.</p>
        </div>
        <div className="catalog-page__actions">
          <Link className="catalog-page__add" to="/add">
            Add movie
          </Link>
          <Link className="catalog-page__help" to="/help">
            Help
          </Link>
        </div>
      </div>
      {!state.canEdit ? (
        <p className="catalog-page__readonly" role="status">
          Spreadsheet editing is off on this server. In Terminal run{' '}
          <code>cd ~/Projects/movie-collection && npm run dev</code>, then open the new address it
          prints (and close old tabs).
        </p>
      ) : null}

      <CatalogToolbar
        query={query}
        sort={sort}
        resultCount={visibleMovies.length}
        totalCount={state.movies.length}
        onQueryChange={setQuery}
        onSortChange={setSort}
        filtersActive={hasActiveFilters(filters)}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((open) => !open)}
        onClearFilters={() => setFilters(EMPTY_FILTERS)}
      />

      <div className={`catalog-page__layout ${filtersOpen ? 'is-filters-open' : ''}`}>
        <div className="catalog-page__filters">
          <FilterPanel
            movies={state.movies}
            filters={filters}
            onChange={(next) => {
              setFilters(next)
              setFiltersOpen(true)
            }}
          />
        </div>
        <MovieGrid movies={visibleMovies} />
      </div>
    </section>
  )
}
