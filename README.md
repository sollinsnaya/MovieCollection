# Shelf — Physical Media Library

A local web app for browsing a physical movie collection (DVD, Blu-ray, UHD 4K) from an Excel spreadsheet.

For architecture, module boundaries, and Mermaid diagrams, see **[docs/DESIGN.md](docs/DESIGN.md)**.  
For a plain-language how-to inside the running app, open the **Help** page.

## Features

- Loads `Master Film List.xlsx` (project root) as the source of truth
- Responsive card catalog with cover placeholders
- Search by title (also matches director, format, edition, genre)
- Sort by title, year, or recently added
- Filters: format, genre, edition, studio, franchise, boutique label, mood
- Browse-by-category page
- Movie detail page with every spreadsheet field
- Local mood tags (persist in the browser via `localStorage`)
- Cover images via filename convention (no app code changes)
- In-app Help page for adding movies and updating covers
- Add / edit / delete spreadsheet rows from the app (via local API)

### Spreadsheet notes

- Genre comes from the `Genre` column and is available in filters and Browse.
- Boutique Label is often empty in the sheet.
- Long verification-style Franchise values are excluded from browse/filter options.

## Requirements

- Node.js 20+ (or current LTS)

## Setup

```bash
cd ~/Projects/movie-collection
npm install
```

The collection spreadsheet lives at the project root:

```text
Master Film List.xlsx
```

Keep this file with the project so the collection stays with the code.

## Run locally

```bash
npm run dev
```

This starts both:
- the website (Vite) at `http://127.0.0.1:5173/`
- a small local API that reads/writes the root spreadsheet

Prefer **http://127.0.0.1:5173/** over `localhost` on macOS.

Use **Add** to create titles and **Edit spreadsheet row** on a movie page to change fields. Saves update the root Excel file.

## Deploy on a Fedora home server

See **[docs/DEPLOY-FEDORA.md](docs/DEPLOY-FEDORA.md)**. Short version:

```bash
npm install
npm run build
npm start
```

Then open `http://<server-lan-ip>:3080/` from any device on the house network.

## Cover images

Preferred filenames (Title + Year):

```
public/covers/Alien (1979).jpg
public/covers/Argo (2012).jpg
```

Fallback: `public/covers/MC-0001.jpg`

### Fetch posters from TMDb (one-time / occasional)

The app only displays local files. Use the helper script to download posters:

1. Get a free API key: https://www.themoviedb.org/settings/api  
2. `cp .env.example .env` and set `TMDB_API_KEY`  
3. Run:

```bash
npm run fetch-covers
```

Options: `--limit 5`, `--dry-run`, `--force`  
See `public/covers/README.md`.

## Project layout

| Path | Role |
| --- | --- |
| `Master Film List.xlsx` | Source-of-truth collection spreadsheet |
| `server/` | Local API that reads/writes the spreadsheet |
| `docs/DESIGN.md` | Architecture & design (with Mermaid diagrams) |
| `src/lib/spreadsheet.ts` | Client spreadsheet parsing helpers |
| `src/lib/normalize.ts` | Year/runtime cleanup |
| `src/lib/search.ts` | Search |
| `src/lib/sort.ts` | Sorting |
| `src/lib/filters.ts` | Filters + category groups |
| `src/lib/moods.ts` | Mood definitions + persistence helpers |
| `src/lib/covers.ts` | Cover path convention |
| `src/components/` | UI pieces |
| `src/pages/` | Catalog, browse, detail, help views |
| `public/covers/` | Optional local artwork |

## Moods

Open any movie detail page and toggle moods. Assignments are stored in this browser under the key `shelf-moods-v1` and remain after refresh or restart.
