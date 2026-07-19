import { NavLink, Outlet } from 'react-router-dom'
import './AppShell.css'

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__bar">
          <NavLink to="/" className="app-shell__brand" end>
            <span className="app-shell__brand-mark">Shelf</span>
            <span className="app-shell__brand-sub">Physical Media Library</span>
          </NavLink>
          <nav className="app-shell__nav" aria-label="Primary">
            <NavLink to="/" end>
              Collection
            </NavLink>
            <NavLink to="/browse">Browse</NavLink>
            <NavLink to="/add">Add</NavLink>
            <NavLink to="/help">Help</NavLink>
          </nav>
        </div>
      </header>
      <main className="app-shell__main">
        <Outlet />
      </main>
      <footer className="app-shell__footer">
        <p>
          Local collection browser · Cover art is only shown from files you add ·{' '}
          <NavLink to="/help">Help</NavLink>
        </p>
      </footer>
    </div>
  )
}
