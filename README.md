# MoodFlow

MoodFlow is a local single-user web app for mood logging, rule-based music discovery, embedded YouTube playback, and mood-history charts.

It is an educational project. MoodFlow does not provide medical advice, diagnosis, treatment, or guaranteed mood outcomes.

## Requirements

- Node.js 20 or newer
- npm
- A YouTube Data API v3 key for live music suggestions

The app uses SQLite locally. No separate database server is required.

## Fresh Clone Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Open `.env` and set at least:

   ```text
   DATABASE_PATH=./data/moodflow.sqlite
   YOUTUBE_API_KEY=your_server_side_youtube_data_api_key
   ```

   `YOUTUBE_API_KEY` may be left blank while testing mood logging, history, and charts. Music suggestions will show a controlled configuration message until a key is provided.

4. Start the app:

   ```bash
   npm start
   ```

5. Open:

   ```text
   http://localhost:3000
   ```

## Test Command

Run the full automated test suite:

```bash
npm test
```

The tests mock YouTube responses and do not consume YouTube quota.

## Local Files

The repository intentionally ignores local runtime files:

- `.env`
- `node_modules/`
- `data/*.sqlite`

Keep the real YouTube API key in `.env` only. Do not paste it into frontend files, docs, tests, screenshots, commits, or issue comments.

## YouTube Setup Notes

Use a restricted YouTube Data API v3 key in Google Cloud. MoodFlow sends search requests only from the backend and only after the user clicks **Suggest music** for a saved mood entry.

Version 1 performs one `search.list` request for an uncached suggestion request, requests up to 10 candidates, filters locally, returns up to 5 suggestions, and caches successful identical searches in memory for 15 minutes by default.

## Manual Verification Checklist

Before submission, verify:

- Create a valid `match` mood entry.
- Create a valid `shift` mood entry with a different target mood.
- Invalid mood values, out-of-range intensity or energy, long notes, and invalid target mood rules show validation errors.
- Recent entries appear newest first.
- A saved entry can request YouTube suggestions when `YOUTUBE_API_KEY` is configured.
- Repeating an identical suggestion request can use the cache and does not require another YouTube call during the cache window.
- Selecting a suggestion loads the embedded player.
- Selecting a different suggestion changes the loaded video.
- Player errors show a useful message and another suggestion can still be tried.
- Mood logging, history, and charts still work when YouTube is unavailable or not configured.
- Day history and range history render readable text plus charts.
- Empty date ranges show a message rather than a broken chart.
- Keyboard navigation reaches form fields, buttons, suggestion controls, links, and history controls.
- Focus states are visible.
- The layout remains usable at mobile width.

## API Endpoints

- `GET /api/health`
- `POST /api/moods`
- `GET /api/moods`
- `GET /api/moods/summary`
- `POST /api/music/suggestions`

## Screenshots

Final evidence screenshots are kept in `docs/screenshots/` when captured for assignment submission.
