# MoodFlow Project Plan

## 1. Project Goal

MoodFlow is a small educational web application that helps a user:

- record their current mood;
- rate mood intensity and energy;
- add an optional note;
- choose whether music should match the current mood or help shift it toward a different mood;
- receive playable music suggestions from YouTube;
- review mood changes over one day or several days.

The application combines mood tracking, rule-based recommendation logic, an external API, embedded media playback, SQLite persistence, charts, validation, and testing.

MoodFlow is not a medical product. It must not provide diagnosis, treatment advice, or claims about improving mental health.

## 2. Locked Version 1 Decisions

Unless a verified technical limitation requires a change, version 1 will use the following decisions:

- Application type: local single-user web application
- Frontend: HTML, CSS, and browser JavaScript
- Backend: Node.js and Express
- Database: SQLite
- Charts: Chart.js
- Music search: YouTube Data API
- Playback: YouTube IFrame Player API
- User login: not required
- API authentication: server-side YouTube API key
- Mood values:
  - `happy`
  - `calm`
  - `sad`
  - `anxious`
  - `angry`
  - `tired`
  - `focused`
  - `overwhelmed`
- Intensity scale: integer from 1 to 10
- Energy scale: integer from 1 to 10
- Optional note: maximum 300 characters
- Music modes:
  - `match`
  - `shift`
- Target mood:
  - required for `shift`
  - absent for `match`
  - different from the current mood
- Suggestions displayed: up to 5
- Search candidates requested: up to 10, then filtered and ranked
- Timestamps: stored in UTC and displayed in browser-local time
- Music search occurs only after an explicit user action
- Mood logging and charts must continue to work if YouTube is unavailable
- MoodFlow must refer to the provider as YouTube, not YouTube Music

## 3. Scope

### Included in version 1

- Mood entry creation
- Server-side validation
- SQLite persistence
- Recent mood history
- Single-day and date-range filtering
- Daily and multi-day charts
- Rule-based match and shift profiles
- YouTube music-video search
- Filtering and ranking of search results
- Embedded playback inside MoodFlow
- Player state and error handling
- In-memory search-result caching
- Loading, empty, quota, API-error, and playback-error states
- Automated tests for important backend logic
- Manual end-to-end verification
- Setup documentation and screenshots

### Excluded from version 1

- MoodFlow user accounts
- Google or YouTube login
- Access to private YouTube history, subscriptions, or playlists
- Writing data to the user's YouTube account
- Creating YouTube playlists
- Cloud deployment as a completion requirement
- Full recommendation machine learning
- Audio-feature analysis
- YouTube Music API integration
- Medical advice
- React, TypeScript, an ORM, Docker, microservices, or message queues
- Permanent storage of YouTube search results

## 4. Main User Flow

1. The user opens MoodFlow.
2. The page displays:
   - the mood-entry form;
   - recent entries;
   - the music-suggestion area;
   - the history and chart controls.
3. The user selects a current mood.
4. The user selects intensity and energy values.
5. The user optionally writes a note.
6. The user selects:
   - **Match my mood**, or
   - **Help shift my mood**.
7. If `shift` is selected, the user selects a target mood.
8. The user saves the mood entry.
9. The backend validates and stores it with a UTC timestamp.
10. The saved entry appears in recent history.
11. The user selects **Suggest music**.
12. The backend:
    - loads the saved mood entry;
    - creates a deterministic recommendation profile;
    - generates a YouTube search query;
    - checks the in-memory cache;
    - calls the YouTube Data API when no valid cached result exists;
    - filters and ranks the returned candidates;
    - returns up to five normalized suggestions.
13. The frontend displays the suggestions.
14. The user selects one suggestion.
15. MoodFlow loads the selected video into the embedded YouTube player.
16. If playback fails, the user receives a clear message and can try another result.
17. The user opens the history section and reviews daily or multi-day charts.

## 5. Proposed Modules

### 5.1 Frontend Application Module

Responsibilities:

- initialize the page;
- coordinate form, history, suggestions, and player modules;
- display page-level status messages;
- avoid containing backend business rules.

### 5.2 Mood Form Module

Responsibilities:

- render mood fields;
- show the target-mood field only for `shift`;
- perform basic client-side checks;
- submit mood entries;
- show validation feedback.

Server-side validation remains authoritative.

### 5.3 Mood API and Service Module

Responsibilities:

- validate mood data;
- assign timestamps;
- create and retrieve mood entries;
- calculate chart summaries;
- return consistent responses.

### 5.4 SQLite Data Module

Responsibilities:

- initialize the database;
- create the schema;
- execute parameterized SQL;
- insert and retrieve mood entries;
- remain independent from Express request objects.

### 5.5 Recommendation Module

Responsibilities:

- map mood, intensity, energy, mode, and target mood into a structured search profile;
- keep mapping rules explicit and testable;
- generate a plain-language explanation;
- perform no network requests.

### 5.6 YouTube Search Module

Responsibilities:

- convert the recommendation profile into a search request;
- call the YouTube Data API with the server-side key;
- request only video results that are intended to be embeddable and playable outside YouTube;
- normalize external data;
- classify API, quota, and empty-result failures.

### 5.7 Search Cleaning and Ranking Module

Responsibilities:

- reject obvious non-music results;
- score candidate titles and channels;
- prefer likely official audio or official video results;
- remove duplicates;
- return the best five results;
- remain deterministic and independently testable.

### 5.8 Search Cache Module

Responsibilities:

- cache normalized result lists in memory;
- use a normalized recommendation-profile key;
- expire entries after a short time;
- prevent repeated identical searches from consuming unnecessary quota;
- expose simple hit/miss behaviour for tests.

### 5.9 YouTube Player Module

Responsibilities:

- load the YouTube IFrame Player API;
- create one embedded player;
- cue or load a selected video;
- show the current selection;
- react to ready, state-change, and error events;
- avoid automatic playback before a user selects a result.

### 5.10 History and Chart Module

Responsibilities:

- request recent or filtered data;
- render a readable text history;
- create daily charts;
- create multi-day averages;
- handle empty date ranges.

### 5.11 Testing Module

Responsibilities:

- test validation;
- test recommendation rules;
- test query construction;
- test result filtering and ranking;
- test cache behaviour;
- test API routes and SQLite operations;
- mock YouTube responses.

## 6. Suggested Repository Structure

```text
MoodFlow/
├── docs/
│   ├── project-plan.md
│   ├── requirements.md
│   ├── architecture.md
│   ├── ai-development-log.md
│   └── youtube-spike.md              # created during Phase 0
├── public/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── api.js
│       ├── mood-form.js
│       ├── suggestions.js
│       ├── player.js
│       ├── history.js
│       ├── charts.js
│       └── app.js
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config.js
│   ├── routes/
│   │   ├── moods.routes.js
│   │   └── music.routes.js
│   ├── services/
│   │   ├── mood.service.js
│   │   ├── recommendation.service.js
│   │   ├── music-search.service.js
│   │   └── summary.service.js
│   ├── integrations/
│   │   └── youtube.client.js
│   ├── data/
│   │   ├── db.js
│   │   ├── schema.sql
│   │   └── mood.repository.js
│   ├── utils/
│   │   ├── result-ranker.js
│   │   └── search-cache.js
│   └── middleware/
│       └── error-handler.js
├── tests/
│   ├── mood-validation.test.js
│   ├── mood-api.test.js
│   ├── mood-repository.test.js
│   ├── recommendation.test.js
│   ├── youtube-query.test.js
│   ├── result-ranker.test.js
│   ├── search-cache.test.js
│   └── music-api.test.js
├── data/
│   └── .gitkeep
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

The coding agent must not add extra architectural layers unless an actual implementation problem requires them.

## 7. Coding-Agent Execution Rules

For every implementation phase, the coding agent must:

1. Read the current planning documents before making changes.
2. Work on one phase only.
3. List the files it plans to create or edit.
4. Reuse the approved stack.
5. Avoid adding frameworks or infrastructure without approval.
6. Keep recommendation logic separate from YouTube integration.
7. Keep the API key out of frontend code.
8. Add or update tests in the same phase.
9. Run the relevant tests.
10. Report the exact commands and results.
11. Update `docs/ai-development-log.md`.
12. Stop when the current phase acceptance criteria pass.
13. Wait for a new instruction before starting the next phase.

## 8. Implementation Phases

### Phase 0: YouTube Feasibility Spike

**Goal:** verify the external service before building the full music feature.

Tasks:

- create or select a Google Cloud project;
- enable the YouTube Data API v3;
- create an API key;
- apply appropriate API restrictions;
- place the key in a local `.env` file;
- confirm a server-side `search.list` request works;
- test the planned request filters;
- confirm at least one returned result plays in an embedded IFrame player;
- record current quota behaviour and returned fields;
- create `docs/youtube-spike.md`.

Planned search parameters:

- `part=snippet`
- `type=video`
- `order=relevance`
- `maxResults=10`
- `videoEmbeddable=true`
- `videoSyndicated=true`
- `videoCategoryId=10`
- `safeSearch=moderate`
- `q=<generated query>`

Acceptance checks:

- the API key works from the backend;
- the key is absent from browser source and Git;
- the search returns video IDs, titles, channels, and thumbnails;
- at least one returned item can be loaded in the IFrame player;
- current quota details are documented;
- known filter limitations are documented.

Stop condition:

- if the key, API access, search filters, or embedded playback cannot be demonstrated, stop and document the failure before implementing later music phases.

### Phase 1: Application Foundation

Tasks:

- initialize the Node.js package;
- use ES modules;
- add Express;
- add environment configuration;
- serve the `public` directory;
- add `GET /api/health`;
- add the shared JSON error format;
- add `.env.example` and `.gitignore`;
- configure the test runner.

Acceptance checks:

- one documented command starts the server;
- the home page loads;
- `/api/health` returns HTTP 200;
- the initial test command passes;
- missing required environment configuration produces a clear startup message.

### Phase 2: Mood Persistence and Form

Tasks:

- create the SQLite schema;
- implement repository functions;
- implement server-side validation;
- create `POST /api/moods`;
- create `GET /api/moods`;
- build the mood form;
- show the target-mood field conditionally;
- show recent entries.

Acceptance checks:

- valid entries are saved;
- invalid mood values are rejected;
- intensity and energy outside 1–10 are rejected;
- notes longer than 300 characters are rejected;
- `shift` requires a different target mood;
- `match` rejects a target mood;
- recent entries appear newest first.

### Phase 3: Recommendation Rules

Tasks:

- define explicit mapping tables for all supported moods;
- define match-mode behaviour;
- define shift-mode behaviour;
- include intensity and energy in query selection;
- generate:
  - mood terms;
  - energy terms;
  - optional style terms;
  - exclusion terms;
  - a human-readable reason;
- add table-driven unit tests.

Acceptance checks:

- all supported moods are covered;
- identical input produces identical output;
- `match` and `shift` produce meaningfully different profiles;
- high and low energy affect the profile;
- no network request occurs in this module.

### Phase 4: YouTube Search, Cleaning, and Caching

Tasks:

- implement the YouTube client;
- build search parameters from a recommendation profile;
- request 10 candidates;
- normalize results;
- implement deterministic filtering and ranking;
- remove duplicate video IDs;
- cache successful result lists in memory;
- create `POST /api/music/suggestions`;
- accept a saved `moodEntryId`;
- return up to five suggestions.

Initial title-cleaning strategy:

Hard reject titles containing obvious non-music terms such as:

- `reaction`
- `review`
- `interview`
- `tutorial`
- `podcast`
- `analysis`

Deprioritize, but do not automatically reject:

- `live`
- `cover`
- `karaoke`
- `remix`
- `lyrics`

Prefer titles or channels containing indicators such as:

- `official audio`
- `official video`
- `provided to youtube`
- `topic`
- `vevo`

The exact scoring values belong in one documented mapping object.

Acceptance checks:

- API key remains server-side;
- identical cached requests do not call YouTube again during the cache period;
- obvious non-music results are removed;
- results are unique;
- up to five normalized suggestions are returned;
- quota and unavailable errors use controlled error codes;
- tests use mocked YouTube responses.

### Phase 5: Embedded Playback

Tasks:

- load the YouTube IFrame Player API;
- create one reusable player;
- load a video only after the user selects a suggestion;
- show title and channel for the selected item;
- handle player ready, state-change, and error events;
- allow selecting a different suggestion after a failure;
- provide an external YouTube link as fallback.

Acceptance checks:

- selecting a result loads it into the player;
- no automatic sound starts when the page opens;
- changing the selection changes the loaded video;
- player errors show a useful message;
- the user can try another suggestion;
- the player fits the responsive layout.

### Phase 6: Mood History and Charts

Tasks:

- add selected-day filtering;
- add date-range filtering;
- create summary logic;
- render daily intensity and energy lines;
- render multi-day average intensity and energy;
- keep readable text history beside or below the charts.

Acceptance checks:

- one day shows entries chronologically;
- a date range shows one aggregate point per day containing data;
- UTC storage converts correctly to local display time;
- an empty period displays a message rather than a broken chart;
- charts are not the only way to access the data.

### Phase 7: Final Verification and Documentation

Tasks:

- run the complete test suite;
- complete manual end-to-end testing;
- verify quota-conscious behaviour;
- improve labels, keyboard access, focus states, contrast, and responsive layout;
- update README setup instructions;
- verify secrets and the SQLite file are ignored;
- capture at least two screenshots;
- finish the AI development log;
- prepare the assignment document and repository link.

Acceptance checks:

- a fresh clone can be set up using README instructions;
- all tests pass;
- the complete flow works;
- the application still logs moods when YouTube fails;
- no secret appears in Git history;
- screenshots show:
  - the working mood and suggestion UI;
  - a chart, test result, API response, or player proof.

## 9. Testing Strategy

### Unit tests

- mood validation;
- target-mood rules;
- recommendation-profile mapping;
- query construction;
- title filtering;
- result scoring;
- duplicate removal;
- cache expiration;
- chart summary calculation.

### Integration tests

- mood routes with a temporary SQLite database;
- suggestions route with a mocked YouTube client;
- cache hit and miss paths;
- YouTube quota and unavailable errors;
- shared error responses.

### Manual tests

- valid and invalid mood entries;
- match suggestions;
- shift suggestions;
- repeated identical suggestion request;
- quota failure display;
- no-result display;
- selecting and changing videos;
- player error handling;
- daily chart;
- multi-day chart;
- mobile-width layout.

## 10. Main Risks and Controls

### Search quality

Risk:

- YouTube results may include reactions, reviews, interviews, covers, live performances, or non-music content.

Controls:

- use music-category and embeddable filters;
- include negative query terms;
- request more candidates than are displayed;
- apply deterministic title filtering and ranking;
- provide a fallback external link;
- document that result quality depends on public YouTube metadata.

### Search quota

Risk:

- YouTube applies a daily limit to `search.list`.

Controls:

- search only after an explicit user action;
- disable duplicate clicks while a request is pending;
- cache identical successful searches;
- avoid pagination in version 1;
- mock YouTube in automated tests;
- display a clear quota message.

### Embedded playback changes

Risk:

- a video can later become private, removed, or non-embeddable.

Controls:

- handle player errors;
- let the user select another suggestion;
- provide the external YouTube link;
- do not treat one failed video as an application failure.

### API-key exposure

Risk:

- a key committed or delivered to the browser can be misused.

Controls:

- store the key in `.env`;
- call YouTube from the backend;
- restrict the key in Google Cloud;
- ignore `.env`;
- inspect Git history before submission.

### Recommendation limitations

Risk:

- MoodFlow does not analyse audio or guarantee a psychological effect.

Controls:

- use transparent rule-based mappings;
- explain why each result was requested;
- label suggestions as discovery support, not therapy.

### Timezones

Risk:

- UTC timestamps and local calendar filters can produce off-by-one-day errors.

Controls:

- store UTC;
- convert selected local day boundaries before API requests;
- test around midnight.

## 11. Definition of Done

MoodFlow version 1 is complete when:

- mood entries are validated and stored;
- match and shift profiles are different and tested;
- a server-side YouTube search returns cleaned suggestions;
- the API key is not exposed;
- selected suggestions play inside an embedded YouTube player;
- player and API failures are handled;
- daily and multi-day charts work;
- mood tracking remains usable when YouTube fails;
- automated tests pass;
- README setup works from a fresh clone;
- screenshots and the AI development log support the final assignment report.
