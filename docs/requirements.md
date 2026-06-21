# MoodFlow Requirements

## 1. Purpose

MoodFlow is a local single-user web application for:

- mood logging;
- mood-history visualization;
- rule-based music discovery;
- embedded YouTube playback.

The system records subjective user input. It must not provide medical interpretation, diagnosis, treatment, or guaranteed mood outcomes.

## 2. Actors and External Systems

### Primary actor

- Local MoodFlow user

### External systems

- YouTube Data API v3 for public video search
- YouTube IFrame Player API for embedded playback

No Google or YouTube user login is required in version 1.

## 3. Functional Requirements

### Mood logging

**FR-01 — Create a mood entry**

The user must be able to create a mood entry containing:

- current mood;
- intensity;
- energy;
- optional note;
- music mode;
- optional target mood.

**FR-02 — Supported moods**

Version 1 must support exactly:

- `happy`
- `calm`
- `sad`
- `anxious`
- `angry`
- `tired`
- `focused`
- `overwhelmed`

**FR-03 — Numeric values**

Intensity and energy must be integers from 1 to 10.

**FR-04 — Optional note**

The note:

- may be empty;
- must not exceed 300 characters;
- must not be sent to YouTube.

**FR-05 — Music modes**

Version 1 must support:

- `match`
- `shift`

**FR-06 — Target mood rules**

- `shift` requires a target mood.
- `match` must not include a target mood.
- The target mood must differ from the current mood.

**FR-07 — Timestamp**

The backend must create the timestamp in UTC.

**FR-08 — Persistence**

Valid mood entries must be stored in SQLite.

**FR-09 — Recent history**

Recent entries must be shown newest first.

**FR-10 — Filter history**

The user must be able to request:

- one local calendar day;
- one local date range.

### Recommendation logic

**FR-11 — Create a recommendation profile**

The backend must convert a saved mood entry into a deterministic profile containing:

- mode;
- current mood;
- optional target mood;
- mood search terms;
- energy search terms;
- exclusion terms;
- a human-readable reason.

**FR-12 — Match mode**

For `match`, the profile must emphasize terms associated with the current mood and energy.

**FR-13 — Shift mode**

For `shift`, the profile must emphasize the target mood while using the current intensity and energy to choose a reasonable transition profile.

Version 1 does not need to create a multi-track gradual transition sequence.

**FR-14 — Separation from YouTube**

Recommendation logic must not call YouTube or depend on YouTube response objects.

### YouTube search

**FR-15 — Explicit search action**

A YouTube search must occur only after the user explicitly requests suggestions for a saved mood entry.

**FR-16 — Search by saved entry**

The suggestions endpoint must accept a `moodEntryId`.

The backend must:

1. load the entry;
2. build the recommendation profile;
3. build the YouTube request;
4. use cached results when available;
5. call YouTube when required.

**FR-17 — Server-side API key**

The YouTube API key must remain on the backend and must not be returned to the browser.

**FR-18 — Search request constraints**

The first version should request:

- video results only;
- relevance ordering;
- up to 10 candidates;
- embeddable videos;
- videos playable outside YouTube;
- music-category results;
- moderate safe-search filtering.

The exact request must be verified in the feasibility spike.

**FR-19 — Query exclusions**

The generated query should exclude obvious non-music content terms:

- reaction;
- review;
- interview;
- tutorial;
- podcast;
- analysis.

**FR-20 — Normalize results**

Each candidate must be converted to an internal shape:

| Field | Required | Description |
|---|---:|---|
| `videoId` | yes | YouTube video ID |
| `title` | yes | decoded display title |
| `channelTitle` | yes | source channel |
| `thumbnailUrl` | no | best available thumbnail |
| `youtubeUrl` | yes | official external link |
| `reason` | yes | MoodFlow recommendation explanation |
| `score` | internal | ranking score; not required in UI |

**FR-21 — Clean result list**

The backend must:

- hard-reject obvious non-music results;
- remove duplicate video IDs;
- rank remaining candidates;
- return up to five suggestions.

**FR-22 — Ranking preferences**

The ranker should prefer likely official results, including signals such as:

- `official audio`;
- `official video`;
- `provided to youtube`;
- `topic`;
- `vevo`.

It should deprioritize, but not necessarily reject:

- `live`;
- `cover`;
- `karaoke`;
- `remix`;
- `lyrics`.

All terms and score values must be stored in one documented configuration object.

**FR-23 — Search cache**

Successful result lists must be cached in memory for a configurable short duration.

Identical profiles within that period should return the cached result instead of calling YouTube again.

**FR-24 — YouTube failure**

If YouTube is unavailable, quota-limited, or returns no acceptable results:

- the mood entry remains saved;
- the user receives a clear message;
- mood history and charts remain available.

### Playback

**FR-25 — Embedded player**

The application must contain one YouTube IFrame player.

**FR-26 — User-initiated playback**

A video must be loaded for playback only after the user selects a suggestion.

MoodFlow must not start audio when the page opens.

**FR-27 — Change selection**

Selecting a different result must load the new video in the existing player.

**FR-28 — Player state**

The UI should show:

- which suggestion is selected;
- when the player is ready;
- a readable message when playback fails.

**FR-29 — Playback fallback**

Each result must include an external YouTube link.

If embedded playback fails, the user must be able to try another result or open the external link.

### Charts and history

**FR-30 — Daily chart**

The user must be able to view intensity and energy over time for one selected local day.

**FR-31 — Multi-day chart**

The user must be able to view daily average intensity and energy for a selected date range.

**FR-32 — Text history**

Charts must not be the only representation of the data. A readable history list must remain available.

**FR-33 — Empty states**

The application must show meaningful messages for:

- no mood entries;
- no entries in a selected period;
- no acceptable YouTube results;
- YouTube unavailable;
- YouTube quota reached;
- embedded playback failure.

### Technical proof

**FR-34 — Health endpoint**

The backend must expose `GET /api/health`.

## 4. Non-Functional Requirements

**NFR-01 — Simplicity**

MoodFlow must remain one Node.js application with no unnecessary infrastructure.

**NFR-02 — Maintainability**

Routes, business rules, YouTube integration, result ranking, caching, database access, and frontend player logic must have clear responsibilities.

**NFR-03 — Security**

- The YouTube API key must remain server-side.
- The real `.env` file must be ignored.
- The key should be restricted in Google Cloud.
- SQL must use parameters.
- The backend must validate all user input.
- error responses must not expose secrets or stack traces.

**NFR-04 — Privacy**

- Mood notes must not be sent to YouTube.
- Mood data must remain in local SQLite.
- Search terms sent to YouTube must be derived from fixed recommendation mappings, not the user's note text.

**NFR-05 — Reliability**

Mood logging, history, and charts must work without YouTube.

**NFR-06 — Quota awareness**

- Search must require explicit user action.
- Repeated clicks must not start parallel duplicate requests.
- Successful identical searches should use cache.
- Automated tests must mock YouTube rather than call the live service.
- Version 1 must not paginate search results.

**NFR-07 — Accessibility**

The UI must include:

- labels associated with inputs;
- keyboard-accessible controls;
- visible focus styles;
- readable status messages;
- sufficient contrast;
- a text alternative to charts.

**NFR-08 — Responsive layout**

The application and embedded player must remain usable at common desktop and mobile widths.

**NFR-09 — Testability**

Validation, recommendation mapping, query construction, ranking, caching, summaries, and repositories must be testable independently.

**NFR-10 — Transparency**

The interface must state that:

- suggestions are rule-based;
- YouTube search quality can vary;
- MoodFlow is not medical advice;
- MoodFlow is not affiliated with YouTube.

**NFR-11 — Local setup**

A developer must be able to run the application from a fresh clone using documented commands and a local environment file.

## 5. Mood Entry Data Model

| Field | Type | Required | Rules |
|---|---|---:|---|
| `id` | integer | yes | SQLite primary key |
| `mood` | text | yes | supported mood |
| `intensity` | integer | yes | 1–10 |
| `energy` | integer | yes | 1–10 |
| `note` | text | no | max 300 characters |
| `music_mode` | text | yes | `match` or `shift` |
| `target_mood` | text | no | required for `shift` |
| `created_at` | text | yes | UTC ISO timestamp |

YouTube suggestions and API keys must not be stored in this table.

## 6. Local API Contract

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | confirm server status |
| POST | `/api/moods` | create a mood entry |
| GET | `/api/moods` | retrieve recent or filtered entries |
| GET | `/api/moods/summary` | retrieve daily or range summary |
| POST | `/api/music/suggestions` | return YouTube suggestions for one saved entry |

### `POST /api/music/suggestions`

Request:

```json
{
  "moodEntryId": 42
}
```

Successful response:

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
      "videoId": "exampleId",
      "title": "Example Official Audio",
      "channelTitle": "Example Artist",
      "thumbnailUrl": "https://example.invalid/image.jpg",
      "youtubeUrl": "https://www.youtube.com/watch?v=exampleId",
      "reason": "Selected to move from anxious toward calm."
    }
  ],
  "source": "youtube",
  "cached": false
}
```

### Required error shape

```json
{
  "error": {
    "code": "YOUTUBE_QUOTA_EXCEEDED",
    "message": "Music suggestions are temporarily unavailable because the daily search limit has been reached.",
    "details": []
  }
}
```

## 7. Minimum Controlled Error Codes

- `VALIDATION_ERROR`
- `NOT_FOUND`
- `DATABASE_ERROR`
- `YOUTUBE_CONFIGURATION_ERROR`
- `YOUTUBE_QUOTA_EXCEEDED`
- `YOUTUBE_RATE_LIMITED`
- `YOUTUBE_UNAVAILABLE`
- `NO_ACCEPTABLE_SUGGESTIONS`
- `INTERNAL_ERROR`

Frontend-only playback statuses may include:

- `PLAYER_NOT_READY`
- `PLAYBACK_ERROR`
- `VIDEO_UNAVAILABLE`

## 8. Acceptance Criteria

Version 1 is accepted when:

1. Valid mood entries are stored in SQLite.
2. Invalid entries return clear validation errors.
3. `match` and `shift` produce distinct profiles.
4. The backend searches YouTube using a server-side key.
5. Search results are filtered, ranked, deduplicated, and normalized.
6. Up to five suggestions are displayed.
7. Selecting a suggestion loads it in an embedded player.
8. Playback failure allows the user to try another item.
9. Repeated identical searches can use cache.
10. Quota or API failure does not break mood tracking.
11. Daily and multi-day charts display correct data.
12. Automated tests cover the critical rules and routes.
13. The API key, `.env`, and SQLite file are not committed.
14. README setup works from a fresh clone.
15. At least two screenshots prove the functioning system.
