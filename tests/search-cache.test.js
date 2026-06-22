import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSearchCache, DEFAULT_SEARCH_CACHE_TTL_MS } from "../src/utils/search-cache.js";

describe("search cache", () => {
  it("returns cached values before the 15-minute default TTL expires", () => {
    let now = 1000;
    const cache = createSearchCache(() => now);
    const value = [{ videoId: "abc123" }];

    cache.set("profile", value);
    now += DEFAULT_SEARCH_CACHE_TTL_MS - 1;

    assert.deepEqual(cache.get("profile"), value);
  });

  it("expires cached values after their TTL", () => {
    let now = 1000;
    const cache = createSearchCache(() => now);

    cache.set("profile", [{ videoId: "abc123" }], 10);
    now += 11;

    assert.equal(cache.get("profile"), null);
  });

  it("returns clones so callers cannot mutate cached entries", () => {
    const cache = createSearchCache(() => 1000);
    cache.set("profile", [{ videoId: "abc123", title: "Original" }], 10);

    const first = cache.get("profile");
    first[0].title = "Changed";

    assert.equal(cache.get("profile")[0].title, "Original");
  });
});
