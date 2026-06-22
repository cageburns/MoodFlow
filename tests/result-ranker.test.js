import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanRankAndLimitResults,
  RESULT_RANKING_CONFIG,
  scoreCandidate
} from "../src/utils/result-ranker.js";

function candidate(videoId, title, channelTitle = "Example Artist") {
  return {
    videoId,
    title,
    channelTitle,
    thumbnailUrl: null,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`
  };
}

describe("result ranker", () => {
  it("stores all score values in one documented config object", () => {
    assert.equal(RESULT_RANKING_CONFIG.preferenceSignals["official audio"], 40);
    assert.equal(RESULT_RANKING_CONFIG.penaltySignals.karaoke, -30);
    assert.equal(RESULT_RANKING_CONFIG.hardRejectTerms.reaction, -Infinity);
  });

  it("hard-rejects obvious non-music content", () => {
    const results = cleanRankAndLimitResults([
      candidate("a", "Great Song Official Audio"),
      candidate("b", "Great Song Reaction"),
      candidate("c", "Artist Interview About Album"),
      candidate("d", "Music Production Tutorial")
    ]);

    assert.deepEqual(results.map((result) => result.videoId), ["a"]);
  });

  it("deduplicates videos before returning up to five results", () => {
    const results = cleanRankAndLimitResults([
      candidate("a", "Song Official Audio"),
      candidate("a", "Song Official Video"),
      candidate("b", "Song Official Video"),
      candidate("c", "Song Official Video"),
      candidate("d", "Song Official Video"),
      candidate("e", "Song Official Video"),
      candidate("f", "Song Official Video")
    ]);

    assert.equal(results.length, 5);
    assert.deepEqual(new Set(results.map((result) => result.videoId)).size, 5);
    assert.equal(results.filter((result) => result.videoId === "a").length, 1);
  });

  it("prefers official Topic and Vevo-style sources while lowering weaker matches", () => {
    const official = candidate("official", "Song Official Video", "ArtistVEVO");
    const topic = candidate("topic", "Song Provided to YouTube", "Artist - Topic");
    const karaoke = candidate("karaoke", "Song Karaoke Version");

    assert.ok(scoreCandidate(official) > scoreCandidate(karaoke));
    assert.ok(scoreCandidate(topic) > scoreCandidate(karaoke));
  });

  it("uses deterministic stable ranking for equal scores", () => {
    const input = [
      candidate("a", "Song"),
      candidate("b", "Song"),
      candidate("c", "Song")
    ];

    assert.deepEqual(
      cleanRankAndLimitResults(input).map((result) => result.videoId),
      ["a", "b", "c"]
    );
    assert.deepEqual(cleanRankAndLimitResults(input), cleanRankAndLimitResults(input));
  });

  it("decodes titles and channel names for display", () => {
    const results = cleanRankAndLimitResults([
      candidate("a", "Song &amp; Sound Official Audio", "Artist &amp; Friends")
    ]);

    assert.equal(results[0].title, "Song & Sound Official Audio");
    assert.equal(results[0].channelTitle, "Artist & Friends");
  });
});
