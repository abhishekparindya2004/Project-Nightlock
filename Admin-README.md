# NightLock · Website and admin

Use Python 3.10 or newer. No extra packages are needed.

## Start in VS Code

Extract the ZIP, open its `nightlock` folder and start a terminal in that folder.

```powershell
py server.py --set-password
py server.py
```

On macOS or Linux, use `python3` in place of `py`. Open [NightLock](http://127.0.0.1:8010/) and [the admin panel](http://127.0.0.1:8010/admin/). Sign in with `admin@space.lk.nasa` and the password you just set. To change that address, set `NIGHTLOCK_ADMIN_EMAIL` before starting the server. Run the Python server, not VS Code Live Server or an HTML file opened directly, to use the database, AI, and forms.

## Enable AI and subscriber email

Copy `.env.example` to `.env` in the same directory as `server.py`. Restart the Python server after changing it.

- **AI and web search** — Set `NIGHTLOCK_OPENAI_API_KEY` to your own OpenAI API key. The server sends relevant published NightLock content to the model and uses the Responses API web search tool for questions about SPHEREx or current astronomy. Click source numbers in a reply to open its links. No key is in the browser or in this ZIP. Without a key the assistant stays in Quick Guide mode, unless you configure an installed local Ollama model. Ollama uses published NightLock content but does not search the web. Never commit your `.env`.
- **Subscriber email** — Set `NIGHTLOCK_PUBLIC_URL` to the deployed HTTPS origin (no path), and fill in the SMTP settings and your provider-verified sender address. Use port 587 and `starttls` or port 465 and `ssl`, as required by your provider. Subscriptions and outgoing jobs are stored even if SMTP is not set up yet. The Newsletter tab shows waiting, sent, and failed mail. Each email includes an unsubscribe link. Verify delivery by subscribing your own test address and publishing a test article.

## Edit and publish

- **Page text & links** — Pick the page, then search its headings, body text, image file names, or links. Use *Shared navigation* for menu labels, destinations and logos. Use *Site settings* for shared footer and newsletter copy. Use *New page blocks* to add a themed section without editing HTML.
- **Articles & details** — Add a title, category, summary and full body. Add an image, video, source links, or an attachment if needed. Select where it appears. New articles default to Home, Blog’s Recent and Popular sections, and Gallery’s Latest articles. The three homepage cards link to their own Details entries. Home displays up to three selected stories.
- **Events** — Add the event date (distinct from the release time), location, description and sources. Control whether published events appear in the Observatory schedule or Gallery’s Our events list. The Events page retains its themed calendar, search, and List, Month, and Day views.
- **Publish now or later** — Select *Schedule for later* to enter a Sri Lanka date and time. Turn on *Show as an upcoming release* to show the title and release time before publication. Until that time the public site and assistant cannot access the full record. Click *Publish changes* to save the schedule. The Python server publishes automatically and queues subscriber mail at release. Open pages check for published updates every few seconds and reload with the latest content.
- **Gallery** — Upload images and captions. Visitor comments with public-display consent appear under Community Feedback. In *Feedback review*, hide, restore, or delete a comment. *Gallery notes* controls the editorial slides independently.
- **Profiles and videos** — The profile editor sets individual portraits, bios, and education institutes and logos. *Video sections* updates the URLs and cover images behind existing play buttons. YouTube, Vimeo, and uploaded MP4/WebM videos can play in the site's lightbox. A third-party video must permit embedding.

`details.html` is the display template. SQLite is the database. Uploaded files are capped at 30 MiB each. Supported formats include JPG, PNG, WebP, GIF, MP4, WebM, PDF, UTF-8 text, CSV, JSON, and standard FITS files. Enter detail text separately from file attachments.

## Keep or deploy your data

This ZIP contains the public content but no subscriber records, passwords, or sessions. **To keep any existing subscribers, feedback and changes**, point `NIGHTLOCK_DATA_DIR` at your original private `instance/` directory, or stop the old server, back up that directory, and copy it into the new project before first start. The upgraded server can use the same database and uploaded media. Never put `instance/` into a public repository.

Run the server on a Python-capable host with persistent storage so scheduling, subscriptions, and email survive restarts. If running under a production WSGI server such as Gunicorn with `backend.server:app`, initialize once with `python server.py --set-password`, and use one scheduled job to run `python server.py --mail-once` every minute. The built-in `server.py` runner runs the queue itself. A static host such as GitHub Pages cannot run the editor or delivery jobs.

## Verification

```text
python -m unittest discover -s tests
python -m unittest discover -s nightlock_ai/tests
node tests/public-smoke.cjs
node nightlock_ai/tests/widget-smoke.cjs
```

Tests use local SMTP and simulated AI responses. They do not send real email or use an OpenAI API key.
