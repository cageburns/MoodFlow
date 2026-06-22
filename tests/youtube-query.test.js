import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildYouTubeSearchParams,
  buildYouTubeSearchQuery,
  createYouTubeClient,
  normalizeYouTubeSearchResponse
} from "../src/integrations/youtube.client.js";
import { createRecommendationProfile } from "../src/services/recommendation.service.js";

function sampleProfile() {
  return createRecommendationProfile({
    mood: "anxious",
    intensity: 8,
    energy: 7,
    note: "private note should never be searched",
    musicMode: "shift",
    targetMood: "calm"
  });
}

function response(body, options = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    async json() {
      return body;
    }
  };
}

describe("YouTube query and client", () => {
  it("builds the documented search parameters without note text", () => {
    const profile = sampleProfile();
    const params = buildYouTubeSearchParams(profile, {
      regionCode: "DE",
      relevanceLanguage: "en"
    });
    const query = params.get("q");

    assert.equal(params.get("part"), "snippet");
    assert.equal(params.get("type"), "video");
    assert.equal(params.get("order"), "relevance");
    assert.equal(params.get("maxResults"), "10");
    assert.equal(params.get("videoEmbeddable"), "true");
    assert.equal(params.get("videoSyndicated"), "true");
    assert.equal(params.get("videoCategoryId"), "10");
    assert.equal(params.get("safeSearch"), "moderate");
    assert.equal(params.get("regionCode"), "DE");
    assert.equal(params.get("relevanceLanguage"), "en");
    assert.match(query, /-reaction/);
    assert.match(query, /-review/);
    assert.equal(query.includes("private note"), false);
  });

  it("normalizes YouTube search results into internal candidates", () => {
    const normalized = normalizeYouTubeSearchResponse({
      items: [
        {
          id: { videoId: "abc123" },
          snippet: {
            title: "Example &amp; Song",
            channelTitle: "Example Vevo",
            thumbnails: {
              default: { url: "https://example.invalid/default.jpg" },
              high: { url: "https://example.invalid/high.jpg" }
            }
          }
        }
      ]
    });

    assert.deepEqual(normalized, [
      {
        videoId: "abc123",
        title: "Example &amp; Song",
        channelTitle: "Example Vevo",
        thumbnailUrl: "https://example.invalid/high.jpg",
        youtubeUrl: "https://www.youtube.com/watch?v=abc123"
      }
    ]);
  });

  it("calls search.list once with 10 candidates for one client search", async () => {
    const seenUrls = [];
    const client = createYouTubeClient({
      apiKey: "test-key",
      fetchImpl: async (url) => {
        seenUrls.push(url);
        return response({ items: [] });
      }
    });

    await client.search(sampleProfile());

    assert.equal(seenUrls.length, 1);
    const url = new URL(seenUrls[0]);
    assert.equal(url.hostname, "www.googleapis.com");
    assert.equal(url.pathname, "/youtube/v3/search");
    assert.equal(url.searchParams.get("maxResults"), "10");
    assert.equal(url.searchParams.get("key"), "test-key");
  });

  it("maps configuration, quota, rate-limit, unavailable, and invalid response errors", async () => {
    let missingConfigFetchCalls = 0;

    await assert.rejects(
      () => createYouTubeClient({
        apiKey: "",
        fetchImpl: async () => {
          missingConfigFetchCalls += 1;
          return response({ items: [] });
        }
      }).search(sampleProfile()),
      { code: "YOUTUBE_CONFIGURATION_ERROR", statusCode: 503 }
    );
    assert.equal(missingConfigFetchCalls, 0);

    await assert.rejects(
      () => createYouTubeClient({
        apiKey: "test-key",
        fetchImpl: async () => response({
          error: { errors: [{ reason: "quotaExceeded" }] }
        }, { ok: false, status: 403 })
      }).search(sampleProfile()),
      { code: "YOUTUBE_QUOTA_EXCEEDED", statusCode: 503 }
    );

    await assert.rejects(
      () => createYouTubeClient({
        apiKey: "test-key",
        fetchImpl: async () => response({
          error: { errors: [{ reason: "rateLimitExceeded" }] }
        }, { ok: false, status: 429 })
      }).search(sampleProfile()),
      { code: "YOUTUBE_RATE_LIMITED", statusCode: 503 }
    );

    await assert.rejects(
      () => createYouTubeClient({
        apiKey: "test-key",
        fetchImpl: async () => response({ error: {} }, { ok: false, status: 500 })
      }).search(sampleProfile()),
      { code: "YOUTUBE_UNAVAILABLE", statusCode: 503 }
    );

    await assert.rejects(
      () => createYouTubeClient({
        apiKey: "test-key",
        fetchImpl: async () => response({ kind: "unexpected" })
      }).search(sampleProfile()),
      { code: "YOUTUBE_INVALID_RESPONSE", statusCode: 502 }
    );
  });

  it("creates deterministic query strings", () => {
    assert.equal(
      buildYouTubeSearchQuery(sampleProfile()),
      buildYouTubeSearchQuery(sampleProfile())
    );
  });

  it("uses curated match query descriptors for anxious, tired, and angry", () => {
    const anxiousQuery = buildYouTubeSearchQuery(createRecommendationProfile({
      mood: "anxious",
      intensity: 5,
      energy: 5,
      musicMode: "match",
      note: "private note should never be searched"
    }));
    const tiredQuery = buildYouTubeSearchQuery(createRecommendationProfile({
      mood: "tired",
      intensity: 5,
      energy: 5,
      musicMode: "match"
    }));
    const angryQuery = buildYouTubeSearchQuery(createRecommendationProfile({
      mood: "angry",
      intensity: 5,
      energy: 5,
      musicMode: "match"
    }));

    assert.match(anxiousQuery, /anxious/);
    assert.match(anxiousQuery, /tense|dark ambient|anxious instrumental/);
    assert.match(tiredQuery, /tired/);
    assert.match(tiredQuery, /slow|low-energy|tired mood music/);
    assert.match(angryQuery, /angry/);
    assert.match(angryQuery, /intense|heavy|hard rock|metal/);
    assert.equal(anxiousQuery.includes("private note"), false);
  });
});
