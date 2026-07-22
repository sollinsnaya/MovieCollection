import { Link } from 'react-router-dom'
import { useMoods } from '../context/MoodsContext'
import { useMoviesContext } from '../context/MoviesContext'
import {
  buildBrowseGroups,
  type BrowseCategory,
} from '../lib/filters'
import './BrowsePage.css'

const CATEGORIES: Array<{ id: BrowseCategory; label: string; blurb: string }> = [
  { id: 'format', label: 'Format', blurb: 'DVD, Blu-ray, UHD 4K, and combinations' },
  { id: 'genre', label: 'Genre', blurb: 'Genre labels from the spreadsheet' },
  { id: 'studio', label: 'Studio', blurb: 'Distributor / studio labels from the sheet' },
  { id: 'edition', label: 'Edition', blurb: 'Steelbook, collector editions, and more' },
  { id: 'franchise', label: 'Franchise', blurb: 'Short franchise or collection labels' },
  { id: 'boutique', label: 'Boutique', blurb: 'Boutique labels when present in the sheet' },
  { id: 'mood', label: 'Mood', blurb: 'Moods you’ve assigned locally' },
]

function categoryQueryParam(category: BrowseCategory): string {
  switch (category) {
    case 'format':
      return 'format'
    case 'genre':
      return 'genre'
    case 'studio':
      return 'studio'
    case 'edition':
      return 'edition'
    case 'franchise':
      return 'franchise'
    case 'boutique':
      return 'boutique'
    case 'mood':
      return 'mood'
  }
}

export function BrowsePage() {
  const state = useMoviesContext()
  const { assignments } = useMoods()

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
      </div>
    )
  }

  return (
    <section className="browse-page">
      <div className="browse-page__intro">
        <h1>Browse by category</h1>
        <p>Jump into a slice of the shelf, then refine further in the catalog.</p>
      </div>

      <div className="browse-page__sections">
        {CATEGORIES.map((category) => {
          const groups = buildBrowseGroups(state.movies, category.id, assignments)
          return (
            <section key={category.id} className="browse-section">
              <header className="browse-section__header">
                <h2>{category.label}</h2>
                <p>{category.blurb}</p>
              </header>

              {groups.length === 0 ? (
                <p className="browse-section__empty">Nothing to browse here yet.</p>
              ) : (
                <ul className="browse-section__list">
                  {groups.map((group) => {
                    const params = new URLSearchParams({
                      [categoryQueryParam(category.id)]: group.key,
                    })
                    return (
                      <li key={group.key}>
                        <Link to={`/?${params.toString()}`}>
                          <span>{group.label}</span>
                          <span className="browse-section__count">{group.count}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
