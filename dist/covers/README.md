# Cover artwork

Local cover images only. The web app never downloads posters itself.

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

## Fetch from TMDb

1. Create a free API key: https://www.themoviedb.org/settings/api
2. Copy `.env.example` to `.env` and set `TMDB_API_KEY`
3. From the project root:

```bash
npm run fetch-covers
```

Useful options:

```bash
npm run fetch-covers -- --limit 5      # test a few titles
npm run fetch-covers -- --dry-run      # match only, no download
npm run fetch-covers -- --force        # overwrite existing files
```

A summary is written to `fetch-report.json` in this folder.

The fetch script reads titles from the project-root spreadsheet:

`Master Film List.xlsx`

