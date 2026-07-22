import './HelpPage.css'

export function HelpPage() {
  return (
    <article className="help-page">
      <header className="help-page__intro">
        <h1>How to use Shelf</h1>
        <p>
          This page is a simple guide for keeping the movie library up to date. You do not need to
          change any app code.
        </p>
      </header>

      <section className="help-page__section" aria-labelledby="spreadsheet">
        <h2 id="spreadsheet">Where the collection lives</h2>
        <p>
          The master list is the spreadsheet in this project folder:
        </p>
        <pre>Master Film List.xlsx</pre>
        <p>
          The app reads and saves that file. When you commit the project to git, include this
          spreadsheet so the collection travels with the code.
        </p>
      </section>

      <section className="help-page__section" aria-labelledby="add-movies">
        <h2 id="add-movies">Adding movies to the collection</h2>
        <p>The easiest way is right inside the app:</p>
        <ol>
          <li>
            Make sure Shelf is running (<code>npm start</code> / the <code>shelf</code> systemd
            service for the house, or <code>npm run dev</code> on a laptop).
          </li>
          <li>
            Click <strong>Add</strong> in the top menu (or <strong>Add movie</strong> on the
            Collection page).
          </li>
          <li>
            Enter the <strong>Movie title</strong> (and optionally a release year or TMDb ID), then
            click <strong>Fetch from TMDb</strong>.
          </li>
          <li>
            If several matches appear, pick the correct one. The form fills with title, year,
            director, runtime, genre, studio, franchise, and plot summary, and a poster is saved
            under <code>public/covers/</code>.
          </li>
          <li>
            Review the fields. Fill in physical-copy details yourself (disc format, edition,
            Steelbook, HDR / Atmos flags, boutique label, Rotten Tomatoes). Ratings are never
            imported from TMDb.
          </li>
          <li>
            Leave <strong>Catalog ID</strong> blank to have one created automatically (for example{' '}
            <code>MC-0141</code>).
          </li>
          <li>
            Click <strong>Save movie</strong>. Fetching does not save until you do this.
          </li>
        </ol>
        <p className="help-page__callout">
          Saves update <code>Master Film List.xlsx</code> in the project folder. If the same title
          (and year) already exists, Shelf warns you so you can open the existing entry or add
          another physical edition on purpose.
        </p>
      </section>

      <section className="help-page__section" aria-labelledby="edit-movies">
        <h2 id="edit-movies">Editing or removing a movie</h2>
        <ol>
          <li>Open the movie from the Collection.</li>
          <li>
            Click <strong>Edit spreadsheet row</strong>.
          </li>
          <li>Change any fields you need, then click <strong>Save changes</strong>.</li>
          <li>
            To remove a title, use <strong>Delete from spreadsheet</strong> while editing.
          </li>
        </ol>
      </section>

      <section className="help-page__section" aria-labelledby="update-covers">
        <h2 id="update-covers">Adding or updating cover images</h2>
        <p>
          Covers are ordinary picture files stored on this computer under{' '}
          <code>public/covers/</code>. The catalog displays those local files only — not remote
          TMDb URLs.
        </p>

        <h3>Option A — While adding a movie (recommended)</h3>
        <p>
          Use <strong>Fetch from TMDb</strong> on the Add page. When a title is selected, Shelf
          downloads the poster as <code>Title (Year).jpg</code> automatically. If that file already
          exists, it is left alone unless you use <strong>Retry poster download</strong>.
        </p>

        <h3>Option B — Batch download script</h3>
        <ol>
          <li>Save any new or edited movies first.</li>
          <li>
            Open Terminal, go to the project folder, and run:
            <pre>npm run fetch-covers</pre>
          </li>
          <li>Refresh the browser after it finishes.</li>
        </ol>
        <p>
          Both Option A and Option B need a free TMDb key in a local <code>.env</code> file (see{' '}
          <code>.env.example</code>). The key stays on the server and is never sent to the browser.
        </p>

        <h3>Option C — Add a picture by hand</h3>
        <ol>
          <li>
            Put a JPEG (or PNG) image into the <code>public/covers/</code> folder.
          </li>
          <li>
            Name it exactly like this:
            <pre>Movie Title (Year).jpg</pre>
            Examples:
            <pre>
              Alien (1979).jpg
              Argo (2012).jpg
              The Thing (1982).jpg
            </pre>
          </li>
          <li>Refresh the browser.</li>
        </ol>
        <p>
          If a title has no year, use the title alone: <code>Back to the Future Trilogy.jpg</code>.
          As a backup, you can also name a file with the catalog ID, such as{' '}
          <code>MC-0001.jpg</code>.
        </p>
        <p className="help-page__callout">
          On the Fedora house server, if posters fail to save, check that the <code>shelf</code>{' '}
          service user can write to <code>public/covers/</code> (
          <code>ls -ld public/covers</code>). Fix with ownership/permissions if needed, then retry.
        </p>
      </section>

      <section className="help-page__section" aria-labelledby="moods">
        <h2 id="moods">Moods</h2>
        <p>
          Open any movie, then tap mood labels such as Funny or Comfort movie. Those choices stay on
          this computer even after you close the browser. They are not stored in the spreadsheet.
        </p>
      </section>

      <section className="help-page__section" aria-labelledby="troubleshooting">
        <h2 id="troubleshooting">If something looks wrong</h2>
        <ul>
          <li>
            <strong>Add / Edit / Fetch missing:</strong> restart the house service (
            <code>sudo systemctl restart shelf</code>) or run <code>npm start</code> /
            <code>npm run dev</code> so the API is up.
          </li>
          <li>
            <strong>Fetch from TMDb fails with “not configured”:</strong> copy{' '}
            <code>.env.example</code> to <code>.env</code>, set <code>TMDB_API_KEY</code>, restart
            Shelf.
          </li>
          <li>
            <strong>Ambiguous search:</strong> add a release year or the numeric TMDb ID from
            themoviedb.org.
          </li>
          <li>
            <strong>Cover missing after fetch:</strong> confirm the file exists under{' '}
            <code>public/covers/Title (Year).jpg</code> and that the folder is writable.
          </li>
          <li>
            <strong>Blank page on LAN:</strong> open <code>http://&lt;server-ip&gt;:3080/</code>{' '}
            after <code>npm run build</code> and <code>npm start</code> (or systemd).
          </li>
        </ul>
      </section>

      <section className="help-page__section" aria-labelledby="tmdb-attribution">
        <h2 id="tmdb-attribution">TMDb attribution</h2>
        <p>
          This product uses the TMDb API but is not endorsed or certified by TMDb. Movie metadata
          and artwork courtesy of{' '}
          <a href="https://www.themoviedb.org/" rel="noreferrer" target="_blank">
            The Movie Database
          </a>
          .
        </p>
      </section>
    </article>
  )
}
