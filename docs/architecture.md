# MoodFlow Architecture

## 1. Architectural Style

MoodFlow is a small client-server application:

```text
Browser
  |
  | HTTP / JSON
  v
Express Application
  |
  +--> Mood Service --> Mood Repository --> SQLite
  |
  +--> Recommendation Service
  |        |
  |        v
  |    Music Search Service --> Search Cache
  |        |
  |        v
  |    YouTube Client --> YouTube Data API
  |
  +--> Summary Service --> Mood Repository

Browser
  |
  +--> YouTube IFrame Player API
```

The browser never calls the YouTube Data API directly. It receives normalized suggestions from the backend and passes only a selected video ID to the embedded player.

No YouTube user login is required.

## 2. Current YouTube Integration Direction

### 2.1 Search

MoodFlow will use `search.list` from YouTube Data API v3.

The intended first request is:

```text
part=snippet
type=video
order=relevance
maxResults=10
videoEmbeddable=true
videoSyndicated=true
videoCategoryId=10
safeSearch=moderate
q=<generated search query>
key=<server-side API key>
```

This request should:

- return videos rather than channels or playlists;
- favor relevance;
- request more candidates than will be displayed;
- restrict results to videos that YouTube identifies as embeddable;
- restrict results to videos intended to play outside youtube.com;
- restrict results to the music category;
- apply normal content filtering.

The coding agent must verify the exact combination in Phase 0 rather than assuming every filter behaves perfectly.

### 2.2 Search query

The recommendation service produces structured terms.

The music-search service converts them into one query string.

Conceptual example:

```text
calm ambient gentle music official -reaction -review -interview -tutorial -podcast -analysis
```

The YouTube API supports Boolean NOT and OR operators in the `q` parameter. Version 1 should rely primarily on NOT terms and deterministic post-filtering.

### 2.3 Playback

The browser will use the YouTube IFrame Player API.

The player module will:

- load the player API script once;
- implement `onYouTubeIframeAPIReady`;
- create one reusable `YT.Player`;
- load a chosen video ID;
- listen for player events;
- show playback errors;
- include the `origin` parameter for the MoodFlow origin.

The embedded viewport must remain at least the platform's documented minimum size.

### 2.4 Authentication

Public search requests use a YouTube Data API key.

OAuth is not included because MoodFlow does not access private user data or perform account actions.

The API key is stored in `.env` and used only in the backend YouTube client.

## 3. Component Responsibilities

### 3.1 `public/js/app.js`

- initialize frontend modules;
- coordinate page-level state;
- request recent entries;
- connect saved mood entries to suggestion requests.

### 3.2 `public/js/api.js`

- provide centralized `fetch` helpers;
- parse success and error responses;
- avoid business logic.

### 3.3 `public/js/mood-form.js`

- read form values;
- show the target-mood control conditionally;
- perform basic browser validation;
- submit mood entries;
- display field-level errors.

### 3.4 `public/js/suggestions.js`

- request suggestions using `moodEntryId`;
- show loading state;
- render result cards;
- prevent parallel duplicate requests;
- mark the selected result;
- call the player module.

### 3.5 `public/js/player.js`

- load the IFrame Player API once;
- create the player;
- load selected video IDs;
- handle state and error events;
- expose a small interface such as:
  - `initializePlayer()`
  - `playSuggestion(suggestion)`
  - `clearPlayer()`

### 3.6 `public/js/history.js`

- request recent or filtered mood entries;
- render readable entry cards;
- coordinate date filters with chart requests.

### 3.7 `public/js/charts.js`

- create and destroy Chart.js instances safely;
- render daily values;
- render multi-day averages;
- show empty states.

### 3.8 `src/routes/moods.routes.js`

- expose mood creation and retrieval endpoints;
- parse request and query values;
- call mood and summary services;
- contain no SQL.

### 3.9 `src/routes/music.routes.js`

- accept a saved `moodEntryId`;
- call the music-search service;
- return normalized suggestions;
- map service errors to HTTP responses.

### 3.10 `src/services/mood.service.js`

- validate domain rules;
- normalize values;
- assign UTC timestamps;
- coordinate repository operations.

### 3.11 `src/services/summary.service.js`

- convert stored entries into daily or range chart data;
- remain deterministic;
- contain no HTTP or Chart.js code.

### 3.12 `src/services/recommendation.service.js`

Pure deterministic business logic.

Example input:

```json
{
  "mood": "anxious",
  "intensity": 8,
  "energy": 7,
  "musicMode": "shift",
  "targetMood": "calm"
}
```

Example output:

```json
{
  "mode": "shift",
  "currentMood": "anxious",
  "targetMood": "calm",
  "moodTerms": ["calm", "soothing"],
  "energyTerms": ["gentle", "ambient"],
  "excludeTerms": [
    "reaction",
    "review",
    "interview",
    "tutorial",
    "podcast",
    "analysis"
  ],
  "reason": "Selected to move from anxious toward calm."
}
```

Mappings must be stored in readable configuration objects rather than scattered nested conditions.

### 3.13 `src/services/music-search.service.js`

Orchestration layer.

Steps:

1. load the mood entry;
2. create the recommendation profile;
3. create a normalized cache key;
4. return cached results when present;
5. build the YouTube query;
6. call the YouTube client;
7. pass candidates to the ranker;
8. cache successful normalized results;
9. return the profile and best five suggestions.

### 3.14 `src/integrations/youtube.client.js`

- require configured API key;
- build request parameters;
- call `search.list`;
- apply request timeout;
- parse response status;
- normalize the minimum YouTube response shape;
- classify quota, rate-limit, unavailable, and configuration failures;
- contain no mood or title-ranking logic.

### 3.15 `src/utils/result-ranker.js`

Pure deterministic functions for:

- decoding and normalizing text;
- detecting hard-reject terms;
- calculating preference and penalty scores;
- removing duplicates;
- stable sorting;
- returning the best N items.

Suggested conceptual scoring:

| Signal | Behaviour |
|---|---|
| hard-reject term | remove result |
| `official audio` | strong bonus |
| `official video` | strong bonus |
| `provided to youtube` | strong bonus |
| channel contains `topic` | bonus |
| channel contains `vevo` | bonus |
| `live` | small penalty |
| `cover` | medium penalty |
| `karaoke` | strong penalty |
| `remix` | small penalty |
| `lyrics` | small penalty |

The implementation may adjust numbers, but all numbers must live in one exported configuration object and be covered by tests.

### 3.16 `src/utils/search-cache.js`

Simple in-memory cache.

Suggested interface:

- `get(key)`
- `set(key, value, ttlMs)`
- `delete(key)`
- `clear()`

Suggested version 1 TTL:

- 15 minutes

The cache is intentionally lost when the server restarts.

### 3.17 `src/data/mood.repository.js`

- use parameterized SQLite statements;
- insert entries;
- get entry by ID;
- retrieve recent entries;
- retrieve entries within UTC boundaries.

## 4. Database Design

```sql
CREATE TABLE IF NOT EXISTS mood_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mood TEXT NOT NULL,
  intensity INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 10),
  energy INTEGER NOT NULL CHECK (energy BETWEEN 1 AND 10),
  note TEXT NULL CHECK (note IS NULL OR length(note) <= 300),
  music_mode TEXT NOT NULL CHECK (music_mode IN ('match', 'shift')),
  target_mood TEXT NULL,
  created_at TEXT NOT NULL
);
```

Cross-field rules belong in the mood service:

- `match` has no target;
- `shift` requires a supported target;
- current mood and target mood differ.

## 5. API Behaviour

### `GET /api/health`

Example:

```json
{
  "status": "ok"
}
```

### `POST /api/moods`

Request:

```json
{
  "mood": "anxious",
  "intensity": 8,
  "energy": 7,
  "note": "Busy afternoon",
  "musicMode": "shift",
  "targetMood": "calm"
}
```

Response:

```json
{
  "entry": {
    "id": 42,
    "mood": "anxious",
    "intensity": 8,
    "energy": 7,
    "note": "Busy afternoon",
    "musicMode": "shift",
    "targetMood": "calm",
    "createdAt": "2026-06-21T14:30:00.000Z"
  }
}
```

### `GET /api/moods`

Supported query parameters:

- `limit`
- `from`
- `to`

The frontend converts local calendar boundaries to UTC instants.

### `GET /api/moods/summary`

Supported modes:

- `mode=day`
- `mode=range`

### `POST /api/music/suggestions`

Request:

```json
{
  "moodEntryId": 42
}
```

Response:

```json
{
  "profile": {
    "mode": "shift",
    "currentMood": "anxious",
    "targetMood": "calm",
    "reason": "Selected to move from anxious toward calm."
  },
  "suggestions": [
    {
      "videoId": "abc123",
      "title": "Example Official Audio",
      "channelTitle": "Example Artist",
      "thumbnailUrl": "https://example.invalid/thumbnail.jpg",
      "youtubeUrl": "https://www.youtube.com/watch?v=abc123",
      "reason": "Selected to move from anxious toward calm."
    }
  ],
  "cached": false
}
```

## 6. Error Handling

Required JSON shape:

```json
{
  "error": {
    "code": "YOUTUBE_UNAVAILABLE",
    "message": "Music suggestions are temporarily unavailable.",
    "details": []
  }
}
```

Minimum backend codes:

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `DATABASE_ERROR`
- `YOUTUBE_CONFIGURATION_ERROR`
- `YOUTUBE_QUOTA_EXCEEDED`
- `YOUTUBE_RATE_LIMITED`
- `YOUTUBE_UNAVAILABLE`
- `NO_ACCEPTABLE_SUGGESTIONS`
- `INTERNAL_ERROR`

The backend must not send the API key, complete upstream response bodies, or stack traces to the browser.

## 7. Configuration

Expected `.env.example`:

```text
PORT=3000
DATABASE_PATH=./data/moodflow.sqlite
YOUTUBE_API_KEY=
YOUTUBE_REGION_CODE=DE
YOUTUBE_RELEVANCE_LANGUAGE=en
YOUTUBE_CACHE_TTL_MS=900000
YOUTUBE_REQUEST_TIMEOUT_MS=8000
```

Region and language values may be adjusted by the project owner.

## 8. Dependency Guidance

Prefer:

- `express`
- `dotenv`
- one maintained SQLite package compatible with the installed Node.js version
- native `fetch` when supported
- Node's built-in test runner
- one lightweight HTTP test helper if needed
- Chart.js in the frontend

Do not add:

- a Google client library unless direct REST calls become unclear;
- a cache package for a single in-memory `Map`;
- a validation library unless manual validation becomes difficult to read.

## 9. Quota Strategy

As documented by Google in June 2026:

- `search.list` has a default limit of 100 calls per day;
- each call uses one search call from that specific daily bucket;
- retrieving another results page uses another call;
- even invalid requests consume quota.

Version 1 therefore:

- performs one search request per uncached suggestion request;
- does not paginate;
- requests 10 results in one call;
- displays up to 5;
- caches successful results;
- mocks all automated-test requests;
- provides a quota-specific error message.

## 10. Player Design

The player module must:

- load `https://www.youtube.com/iframe_api` once;
- expose the required global ready callback;
- create one `YT.Player`;
- include the MoodFlow origin;
- keep a responsive 16:9 container;
- be at least 200 by 200 pixels;
- prefer user-triggered playback;
- handle state changes and errors;
- retain an external YouTube link.

Player failures must not alter or delete mood data.

## 11. Test Boundaries

### Pure unit tests

- mood validation;
- recommendation mappings;
- query construction;
- title normalization;
- hard rejection;
- scoring;
- stable ordering;
- duplicate removal;
- cache expiration;
- summary calculations.

### Integration tests

- mood routes with temporary SQLite;
- suggestions route with mocked YouTube client;
- cached and uncached paths;
- quota error mapping;
- unavailable error mapping;
- shared error format.

### Manual live tests

- one real YouTube search during the spike;
- one embedded playback test;
- final end-to-end verification.

## 12. Official References

- YouTube Data API overview: https://developers.google.com/youtube/v3/getting-started
- Search endpoint: https://developers.google.com/youtube/v3/docs/search/list
- Quota calculator: https://developers.google.com/youtube/v3/determine_quota_cost
- IFrame Player API: https://developers.google.com/youtube/iframe_api_reference
- Embedded player parameters: https://developers.google.com/youtube/player_parameters
