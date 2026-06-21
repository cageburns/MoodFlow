# YouTube Feasibility Spike

## Phase

Phase 0: YouTube Feasibility Spike

## Status

Ready for independent testing.

A local `.env` file is present, ignored by Git, and contains a YouTube Data API v3 key. The key was loaded only into local process memory for server-side checks and was not printed, logged, committed, or returned in any command output.

## Planned Request Verified

The Phase 0 `search.list` request was run server-side with these parameters:

```text
part=snippet
type=video
order=relevance
maxResults=10
videoEmbeddable=true
videoSyndicated=true
videoCategoryId=10
safeSearch=moderate
q=calm ambient gentle music official -reaction -review -interview -tutorial -podcast -analysis
key=<server-side API key>
```

The request succeeded and returned 10 video results.

## Live Search Findings

| Check | Result |
|---|---|
| API key works from a server-side process | Passed |
| `search.list` request succeeds | Passed |
| Returned item kind is `youtube#video` | Passed |
| Returned video ID is present | Passed |
| Returned title is present | Passed |
| Returned channel title is present | Passed |
| Returned thumbnails are present | Passed: default, medium, and high thumbnail sets were present |
| `pageInfo.totalResults` is present | Passed |
| `pageInfo.resultsPerPage` is 10 | Passed |

No mood-note text was sent to YouTube. The test query used only fixed recommendation-style terms and fixed exclusion terms.

## IFrame Player Evidence

One returned video ID was selected internally and used for two checks:

1. a direct YouTube embed URL request with `enablejsapi=1` and an origin value;
2. a minimal local HTTP page loaded in headless Chrome that used the YouTube IFrame Player API to create a `YT.Player`.

| Check | Result |
|---|---|
| Selected video ID exists | Passed |
| YouTube embed URL returned HTTP 200 | Passed |
| Embed HTML was returned | Passed |
| Embed/player API markers were present in returned HTML | Passed |
| Local proof page was served from `127.0.0.1` | Passed |
| YouTube IFrame Player API loaded in a browser | Passed |
| `YT.Player` reached `player-ready` for the returned video ID | Passed |
| YouTube embed iframe appeared in the browser DOM | Passed |

This was a feasibility proof only. It did not build the MoodFlow frontend or verify later application player controls, selection changes, or playback error handling.

## Security Checks

| Check | Result |
|---|---|
| Root `.gitignore` exists | Passed |
| `.gitignore` includes `.env` | Passed |
| `.gitignore` includes `data/*.sqlite` | Passed |
| `.gitignore` includes `node_modules/` | Passed |
| `git check-ignore .env` succeeds | Passed |
| `git ls-files .env` returns no tracked file | Passed |
| `git status --ignored --short .env` reports `.env` ignored | Passed |
| Tracked files do not contain the local API key value | Passed |
| Browser source contains no API key | Passed for current repo state: no `public/` or `src/` app source exists yet |

## Quota Behaviour

The live `search.list` request completed successfully. The YouTube Data API response does not expose the remaining daily quota in the response body used by this spike.

Project architecture remains based on the documented quota strategy:

- one `search.list` call per uncached suggestion request;
- no pagination in version 1;
- request 10 candidates once, then filter locally;
- cache successful identical searches;
- mock YouTube in automated tests;
- surface quota-specific errors through controlled application error codes.

## Filter Limitations

The planned request filters are accepted by the live API and returned video results, but they are not a complete quality guarantee.

Known limitations:

- `videoCategoryId=10` narrows toward music but does not guarantee every result is an official song.
- `videoEmbeddable=true` and `videoSyndicated=true` improve embeddability odds, but a video can still fail later because of owner settings, regional restrictions, removal, privacy changes, or player policy changes.
- `safeSearch=moderate` is a broad content filter, not a music-quality filter.
- Negative query terms reduce obvious non-music results but do not replace deterministic post-filtering.
- Search quality depends on public YouTube metadata and can change over time.

Version 1 must still implement result normalization, hard rejection, deduplication, ranking, cache behaviour, controlled YouTube error handling, and player fallback behaviour in later phases.

## Command Results

```text
git check-ignore .env
.env
```

```text
git ls-files .env
<no output>
```

```text
git status --ignored --short .env
!! .env
```

```text
Test-Path public
False
```

```text
Test-Path src
False
```

```text
git diff --check
warning: in the working copy of 'docs/ai-development-log.md', LF will be replaced by CRLF the next time Git touches it
```

Sanitized live `search.list` result:

```json
{
  "apiRequest": "search.list",
  "status": "success",
  "itemCount": 10,
  "firstKind": "youtube#video",
  "firstVideoIdPresent": true,
  "firstTitlePresent": true,
  "firstChannelTitlePresent": true,
  "firstThumbnailSets": "default,medium,high",
  "pageInfoTotalResultsPresent": true,
  "pageInfoResultsPerPage": 10
}
```

Sanitized embed check result:

```json
{
  "searchStatus": 200,
  "selectedVideoIdPresent": true,
  "embedRequestStatus": 200,
  "embedHtmlReturned": true,
  "iframeApiReferencePresent": true
}
```

Minimal local browser IFrame proof:

```json
{
  "exitCode": 0,
  "localHttpProofPage": true,
  "videoIdUsed": "[returned video id present]",
  "proofState": "player-ready",
  "statusText": "player-ready:[returned video id]",
  "youtubeIframePresent": true
}
```

Tracked-file secret scan:

```json
{
  "trackedFileCount": 9,
  "secretPresentInTrackedFiles": false,
  "matchingTrackedFileCount": 0
}
```

## Acceptance Criteria

| Acceptance check | Status |
|---|---|
| The API key works from the backend | Passed: verified from a server-side local process |
| The key is absent from browser source and Git | Passed for current repo state |
| The search returns video IDs, titles, channels, and thumbnails | Passed |
| At least one returned item can be loaded in the IFrame player | Passed: a local browser proof reached `player-ready` and rendered the YouTube embed iframe for a returned video ID |
| Current quota details are documented | Passed with limitation: remaining quota is not returned by the API response |
| Known filter limitations are documented | Passed |

## Blockers

No implementer blocker remains for independent testing.
