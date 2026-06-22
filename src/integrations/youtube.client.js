const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const DEFAULT_TIMEOUT_MS = 8000;

function createPublicError(code, statusCode, publicMessage, details = []) {
  const error = new Error(publicMessage);
  error.code = code;
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  error.details = details;
  return error;
}

export function createYouTubeError(code, details = []) {
  const messages = {
    YOUTUBE_CONFIGURATION_ERROR: "Music suggestions are not configured yet.",
    YOUTUBE_QUOTA_EXCEEDED: "Music suggestions are temporarily unavailable because the daily search limit has been reached.",
    YOUTUBE_RATE_LIMITED: "Music suggestions are temporarily unavailable because YouTube is rate limiting requests.",
    YOUTUBE_UNAVAILABLE: "Music suggestions are temporarily unavailable.",
    YOUTUBE_INVALID_RESPONSE: "Music suggestions are temporarily unavailable because YouTube returned an unexpected response."
  };
  const statuses = {
    YOUTUBE_CONFIGURATION_ERROR: 503,
    YOUTUBE_QUOTA_EXCEEDED: 503,
    YOUTUBE_RATE_LIMITED: 503,
    YOUTUBE_UNAVAILABLE: 503,
    YOUTUBE_INVALID_RESPONSE: 502
  };

  return createPublicError(
    code,
    statuses[code] || 503,
    messages[code] || messages.YOUTUBE_UNAVAILABLE,
    details
  );
}

function uniqueTerms(terms) {
  return [...new Set(terms.map((term) => String(term).trim()).filter(Boolean))];
}

export function buildYouTubeSearchQuery(profile) {
  const positiveTerms = uniqueTerms([
    ...profile.moodTerms,
    ...profile.intensityTerms,
    ...profile.energyTerms,
    ...profile.styleTerms,
    "official"
  ]);
  const negativeTerms = uniqueTerms(profile.excludeTerms).map((term) => `-${term}`);

  return [...positiveTerms, ...negativeTerms].join(" ");
}

export function buildYouTubeSearchParams(profile, options = {}) {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    order: "relevance",
    maxResults: "10",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    videoCategoryId: "10",
    safeSearch: "moderate",
    q: buildYouTubeSearchQuery(profile)
  });

  if (options.regionCode) {
    params.set("regionCode", options.regionCode);
  }

  if (options.relevanceLanguage) {
    params.set("relevanceLanguage", options.relevanceLanguage);
  }

  return params;
}

function bestThumbnail(snippet) {
  return snippet?.thumbnails?.maxres?.url
    || snippet?.thumbnails?.standard?.url
    || snippet?.thumbnails?.high?.url
    || snippet?.thumbnails?.medium?.url
    || snippet?.thumbnails?.default?.url
    || null;
}

export function normalizeYouTubeSearchResponse(body) {
  if (!body || !Array.isArray(body.items)) {
    throw createYouTubeError("YOUTUBE_INVALID_RESPONSE");
  }

  return body.items.map((item) => {
    const videoId = item?.id?.videoId;
    const snippet = item?.snippet;

    if (!videoId || !snippet?.title || !snippet?.channelTitle) {
      return null;
    }

    return {
      videoId,
      title: snippet.title,
      channelTitle: snippet.channelTitle,
      thumbnailUrl: bestThumbnail(snippet),
      youtubeUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
    };
  }).filter(Boolean);
}

function classifyYouTubeFailure(status, body) {
  const reasons = Array.isArray(body?.error?.errors)
    ? body.error.errors.map((item) => item.reason)
    : [];
  const reasonText = reasons.join(" ");

  if (status === 403 && /quota|dailyLimitExceeded|quotaExceeded/i.test(reasonText)) {
    return createYouTubeError("YOUTUBE_QUOTA_EXCEEDED");
  }

  if (status === 429 || /rateLimitExceeded|userRateLimitExceeded/i.test(reasonText)) {
    return createYouTubeError("YOUTUBE_RATE_LIMITED");
  }

  return createYouTubeError("YOUTUBE_UNAVAILABLE");
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    throw createYouTubeError("YOUTUBE_INVALID_RESPONSE");
  }
}

export function createYouTubeClient({
  apiKey,
  regionCode,
  relevanceLanguage,
  requestTimeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch
} = {}) {
  return {
    async search(profile) {
      if (!apiKey || String(apiKey).trim() === "") {
        throw createYouTubeError("YOUTUBE_CONFIGURATION_ERROR");
      }

      const params = buildYouTubeSearchParams(profile, { regionCode, relevanceLanguage });
      params.set("key", apiKey);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

      try {
        const response = await fetchImpl(`${YOUTUBE_SEARCH_URL}?${params.toString()}`, {
          method: "GET",
          signal: controller.signal
        });
        const body = await safeJson(response);

        if (!response.ok) {
          throw classifyYouTubeFailure(response.status, body);
        }

        return normalizeYouTubeSearchResponse(body);
      } catch (error) {
        if (error.code?.startsWith("YOUTUBE_")) {
          throw error;
        }

        throw createYouTubeError("YOUTUBE_UNAVAILABLE");
      } finally {
        clearTimeout(timeout);
      }
    }
  };
}
