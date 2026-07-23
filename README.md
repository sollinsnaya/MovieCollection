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
- **Fetch from TMDb** on the Add page: search, pick ambiguous matches, prefill metadata, download a local poster, discover Wikipedia Link
- Manual **Add / Replace cover** on movie pages
- Single-cover download via API (`curl`) without running the full batch script

### Spreadsheet notes

- Genre comes from the `Genre` column. Multiple genres in one cell are separated by `;` (e.g. `Satire; psychological horror; black comedy`) and each becomes its own filter/Browse option. Selecting several genre filters narrows to titles that include all of them.
- Boutique Label is often empty in the sheet.
- Long verification-style Franchise values are excluded from browse/filter options.
- Rotten Tomatoes and all physical-edition columns stay manual — TMDb never fills ratings or disc flags.

## Requirements

- Node.js 20+ (or current LTS)

## Setup

```bash
cd ~/Projects/movie-collection
npm install
cp .env.example .env
```

Edit `.env` and set **one** of:

- `TMDB_API_KEY` — v3 API key from https://www.themoviedb.org/settings/api  
- `TMDB_READ_ACCESS_TOKEN` — v4 Read Access Token (JWT)

The key is loaded only by the Express server. It is never exposed to the browser.

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

Use **Add** → **Fetch from TMDb** to prefill metadata and download a poster, then review and **Save movie**. Physical fields (format, edition, HDR, RT score, …) stay blank for you to fill in.

## Deploy on a Fedora home server

See **[docs/DEPLOY-FEDORA.md](docs/DEPLOY-FEDORA.md)**. Short version:

```bash
npm install
npm run build
npm start
```

Then open `http://<server-lan-ip>:3080/` from any device on the house network.

After code changes on the house server:

```bash
npm install
npm run build
sudo systemctl restart shelf
```

## Cover images

Preferred filenames (Title + Year):

```
public/covers/Alien (1979).jpg
public/covers/Argo (2012).jpg
```

Fallback: `public/covers/MC-0001.jpg`

### Fetch one poster (API, while Shelf is running)

On the house server (default port **3080**):

```bash
# Find TMDb ID
curl -s 'http://127.0.0.1:3080/api/tmdb/search?title=Alien&year=1979'

# Download / replace that poster
curl -X POST http://127.0.0.1:3080/api/tmdb/movie/348/poster \
  -H 'Content-Type: application/json' \
  -d '{"title":"Alien","year":"1979","force":true}'
```

Omit `"force":true` to keep an existing `Title (Year).jpg` unchanged.

You can also upload or replace a cover from the movie detail page in the browser (**Add cover** / **Replace cover**).

### Fetch posters in batch (optional)

```bash
npm run fetch-covers
```

By default, titles that already have any local cover are skipped (manual replacements are preserved). Options: `--limit 5` (first N spreadsheet rows only), `--dry-run`, `--force` (overwrite existing covers).  
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
