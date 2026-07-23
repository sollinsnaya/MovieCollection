# Cover artwork

Local cover images only. The catalog displays files from this folder (and never remote TMDb URLs as the cover source).

## Preferred naming (Title + Year)

```
Alien (1979).jpg
Argo (2012).jpg
The Thing (1982).jpg
```

## Fallback naming (Catalog ID)

```
MC-0001.jpg
```

Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`

## Fetch one cover (API)

With Shelf running (`npm start` / `shelf` service on port **3080**):

```bash
# 1) Search for the TMDb ID
curl -s 'http://127.0.0.1:3080/api/tmdb/search?title=Alien&year=1979'

# 2) Download that poster into this folder
curl -X POST http://127.0.0.1:3080/api/tmdb/movie/348/poster \
  -H 'Content-Type: application/json' \
  -d '{"title":"Alien","year":"1979","force":true}'
```

- `"force":true` replaces an existing `Title (Year).*` file.
- Without `force`, an existing preferred cover is left alone.

You can also use **Add cover** / **Replace cover** on a movie’s detail page in the browser.

## Fetch many covers (batch script)

Requires `TMDB_API_KEY` or `TMDB_READ_ACCESS_TOKEN` in the project `.env`.

```bash
npm run fetch-covers
```

**Existing covers are never overwritten by default.** If a title already has any local image (`Title (Year).jpg`/`.png`/`.webp`, or a catalog-ID file such as `MC-0001.jpg`), that title is skipped. This keeps manually replaced covers safe when TMDb would otherwise match the wrong poster.

Useful options:

```bash
npm run fetch-covers -- --limit 5      # only the first N spreadsheet rows
npm run fetch-covers -- --dry-run      # match only, no download
npm run fetch-covers -- --force        # overwrite existing files (use with care)
```

A summary is written to `fetch-report.json` in this folder.

The batch script reads titles from the project-root spreadsheet:

`Master Film List.xlsx`
