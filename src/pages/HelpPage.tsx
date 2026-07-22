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
            Make sure you started the app with <code>npm run dev</code> (this turns on saving).
          </li>
          <li>
            Click <strong>Add</strong> in the top menu (or <strong>Add movie</strong> on the
            Collection page).
          </li>
          <li>
            Fill in at least the <strong>Title</strong>. Year and disc format are helpful too.
          </li>
          <li>
            Leave <strong>Catalog ID</strong> blank to have one created automatically (for example{' '}
            <code>MC-0113</code>).
          </li>
          <li>
            Click <strong>Save movie</strong>.
          </li>
        </ol>
        <p className="help-page__callout">
          Saves update <code>Master Film List.xlsx</code> in the project folder.
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
          Covers are ordinary picture files stored on this computer. The app only displays what is
          already in the covers folder — it does not download artwork while you browse.
        </p>

        <h3>Option A — Automatic download (recommended)</h3>
        <ol>
          <li>Save any new or edited movies first.</li>
          <li>
            Open Terminal, go to the project folder, and run:
            <pre>npm run fetch-covers</pre>
          </li>
          <li>
            Wait until it finishes. It looks up each movie online and saves posters into{' '}
            <code>public/covers/</code>.
          </li>
          <li>Refresh the browser. New posters should show on the cards.</li>
        </ol>
        <p>
          The first time only, a free TMDb API key must be saved in a local <code>.env</code> file.
          If that is already set up on this computer, you can ignore this step.
        </p>

        <h3>Option B — Add a picture by hand</h3>
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
          To replace a cover, overwrite the old file with a new image that uses the same filename,
          then refresh the page.
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
            <strong>Add / Edit missing:</strong> restart with <code>npm run dev</code> so the save
            server is running.
          </li>
          <li>
            <strong>Blank page:</strong> open <code>http://127.0.0.1:5173/</code> (not only
            localhost) after a fresh <code>npm run dev</code>.
          </li>
          <li>
            <strong>Cover missing:</strong> check the filename matches the title and year, or run{' '}
            <code>npm run fetch-covers</code> again.
          </li>
        </ul>
      </section>
    </article>
  )
}
