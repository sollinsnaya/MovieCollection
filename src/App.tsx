import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { MoodsProvider } from './context/MoodsContext'
import { MoviesProvider } from './context/MoviesContext'
import { AddMoviePage } from './pages/AddMoviePage'
import { BrowsePage } from './pages/BrowsePage'
import { CatalogPage } from './pages/CatalogPage'
import { HelpPage } from './pages/HelpPage'
import { MovieDetailPage } from './pages/MovieDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <MoviesProvider>
        <MoodsProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<CatalogPage />} />
              <Route path="browse" element={<BrowsePage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="add" element={<AddMoviePage />} />
              <Route path="movie/:catalogId" element={<MovieDetailPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </MoodsProvider>
      </MoviesProvider>
    </BrowserRouter>
  )
}
