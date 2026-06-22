import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SUPPORTED_MOODS } from "../src/services/mood.service.js";
import {
  createRecommendationProfile,
  RECOMMENDATION_RULES,
  validateRecommendationInput
} from "../src/services/recommendation.service.js";

function detailsFor(input) {
  try {
    validateRecommendationInput(input);
  } catch (error) {
    return {
      code: error.code,
      details: error.details
    };
  }

  return {
    code: null,
    details: []
  };
}

describe("recommendation rules", () => {
  it("covers every supported mood with explicit match rules", () => {
    assert.deepEqual(
      Object.keys(RECOMMENDATION_RULES.moods).sort(),
      [...SUPPORTED_MOODS].sort()
    );

    for (const mood of SUPPORTED_MOODS) {
      const profile = createRecommendationProfile({
        mood,
        intensity: 5,
        energy: 5,
        musicMode: "match",
        note: "This private note must not affect output."
      });

      assert.equal(profile.mode, "match");
      assert.equal(profile.currentMood, mood);
      assert.equal(profile.targetMood, null);
      assert.deepEqual(profile.moodTerms, RECOMMENDATION_RULES.moods[mood].moodTerms);
      assert.ok(profile.energyTerms.length > 0);
      assert.ok(profile.styleTerms.includes("music"));
      assert.ok(profile.excludeTerms.includes("reaction"));
      assert.match(profile.reason, new RegExp(`match ${mood}`));

      const deterministicProfile = createRecommendationProfile({
        mood,
        intensity: 5,
        energy: 5,
        musicMode: "match",
        note: "A different note must still produce identical output."
      });
      assert.deepEqual(deterministicProfile, profile);
    }
  });

  it("creates deterministic profiles for every valid shift pair", () => {
    for (const mood of SUPPORTED_MOODS) {
      for (const targetMood of SUPPORTED_MOODS.filter((candidate) => candidate !== mood)) {
        const input = {
          mood,
          intensity: 8,
          energy: 2,
          musicMode: "shift",
          targetMood,
          note: "Do not leak this note."
        };
        const firstProfile = createRecommendationProfile(input);
        const secondProfile = createRecommendationProfile(input);

        assert.deepEqual(secondProfile, firstProfile);
        assert.equal(firstProfile.mode, "shift");
        assert.equal(firstProfile.currentMood, mood);
        assert.equal(firstProfile.targetMood, targetMood);
        assert.equal(firstProfile.intensityBand, "high");
        assert.equal(firstProfile.energyBand, "low");
        assert.ok(firstProfile.moodTerms.some((term) => (
          RECOMMENDATION_RULES.moods[targetMood].moodTerms.includes(term)
        )));
        assert.match(firstProfile.reason, new RegExp(`from ${mood} toward ${targetMood}`));
      }
    }
  });

  it("makes match and shift profiles meaningfully different", () => {
    const matchProfile = createRecommendationProfile({
      mood: "anxious",
      intensity: 6,
      energy: 6,
      musicMode: "match"
    });
    const shiftProfile = createRecommendationProfile({
      mood: "anxious",
      intensity: 6,
      energy: 6,
      musicMode: "shift",
      targetMood: "calm"
    });

    assert.notDeepEqual(shiftProfile.moodTerms, matchProfile.moodTerms);
    assert.notEqual(shiftProfile.reason, matchProfile.reason);
    assert.equal(shiftProfile.targetMood, "calm");
  });

  it("uses intensity and energy bands deterministically", () => {
    const lowProfile = createRecommendationProfile({
      mood: "focused",
      intensity: 2,
      energy: 2,
      musicMode: "match"
    });
    const highProfile = createRecommendationProfile({
      mood: "focused",
      intensity: 9,
      energy: 9,
      musicMode: "match"
    });

    assert.equal(lowProfile.intensityBand, "low");
    assert.equal(lowProfile.energyBand, "low");
    assert.ok(lowProfile.intensityTerms.includes("soft"));
    assert.ok(lowProfile.energyTerms.includes("low tempo"));

    assert.equal(highProfile.intensityBand, "high");
    assert.equal(highProfile.energyBand, "high");
    assert.ok(highProfile.intensityTerms.includes("strong"));
    assert.ok(highProfile.energyTerms.includes("upbeat"));
    assert.notDeepEqual(highProfile.energyTerms, lowProfile.energyTerms);
  });

  it("maps intensity and energy boundaries exactly to configured bands", () => {
    const cases = [
      { intensity: 1, expectedIntensityBand: "low", intensityTerm: "soft" },
      { intensity: 3, expectedIntensityBand: "low", intensityTerm: "soft" },
      { intensity: 4, expectedIntensityBand: "medium", intensityTerm: "balanced" },
      { intensity: 7, expectedIntensityBand: "medium", intensityTerm: "balanced" },
      { intensity: 8, expectedIntensityBand: "high", intensityTerm: "strong" },
      { intensity: 10, expectedIntensityBand: "high", intensityTerm: "strong" }
    ];
    const energyCases = [
      { energy: 1, expectedEnergyBand: "low", energyTerm: "low tempo" },
      { energy: 3, expectedEnergyBand: "low", energyTerm: "low tempo" },
      { energy: 4, expectedEnergyBand: "medium", energyTerm: "mid tempo" },
      { energy: 7, expectedEnergyBand: "medium", energyTerm: "mid tempo" },
      { energy: 8, expectedEnergyBand: "high", energyTerm: "upbeat" },
      { energy: 10, expectedEnergyBand: "high", energyTerm: "upbeat" }
    ];

    for (const intensityCase of cases) {
      const profile = createRecommendationProfile({
        mood: "calm",
        intensity: intensityCase.intensity,
        energy: 5,
        musicMode: "match"
      });

      assert.equal(profile.intensityBand, intensityCase.expectedIntensityBand);
      assert.ok(profile.intensityTerms.includes(intensityCase.intensityTerm));
    }

    for (const energyCase of energyCases) {
      const profile = createRecommendationProfile({
        mood: "calm",
        intensity: 5,
        energy: energyCase.energy,
        musicMode: "match"
      });

      assert.equal(profile.energyBand, energyCase.expectedEnergyBand);
      assert.ok(profile.energyTerms.includes(energyCase.energyTerm));
    }
  });

  it("keeps shift searches focused on the target mood instead of transition descriptors", () => {
    const shiftProfile = createRecommendationProfile({
      mood: "overwhelmed",
      intensity: 5,
      energy: 5,
      musicMode: "shift",
      targetMood: "focused"
    });
    const focusedMatchProfile = createRecommendationProfile({
      mood: "focused",
      intensity: 5,
      energy: 5,
      musicMode: "match"
    });

    assert.deepEqual(shiftProfile.moodTerms, focusedMatchProfile.moodTerms);
    assert.deepEqual(shiftProfile.styleTerms, focusedMatchProfile.styleTerms);
    assert.deepEqual(shiftProfile.intensityTerms, focusedMatchProfile.intensityTerms);
    assert.equal(shiftProfile.moodTerms.includes("spacious"), false);
    assert.equal(shiftProfile.moodTerms.includes("uncluttered"), false);
    assert.equal(shiftProfile.intensityTerms.includes("gradual transition"), false);
    assert.match(shiftProfile.reason, /from overwhelmed toward focused/);
  });

  it("does not include mood-note text anywhere in the profile", () => {
    const privateNote = "private dentist appointment at noon";
    const profile = createRecommendationProfile({
      mood: "sad",
      intensity: 4,
      energy: 4,
      note: privateNote,
      musicMode: "shift",
      targetMood: "calm"
    });

    assert.equal(JSON.stringify(profile).includes(privateNote), false);
    assert.equal(profile.reason.includes(privateNote), false);

    const lowerNote = privateNote.toLowerCase();
    for (const term of profile.moodTerms) {
      assert.equal(term.toLowerCase().includes(lowerNote), false);
    }
    for (const term of profile.intensityTerms) {
      assert.equal(term.toLowerCase().includes(lowerNote), false);
    }
    for (const term of profile.energyTerms) {
      assert.equal(term.toLowerCase().includes(lowerNote), false);
    }
    for (const term of profile.styleTerms) {
      assert.equal(term.toLowerCase().includes(lowerNote), false);
    }
    for (const term of profile.queryTerms || []) {
      assert.equal(term.toLowerCase().includes(lowerNote), false);
    }
    for (const term of profile.excludeTerms) {
      assert.equal(term.toLowerCase().includes(lowerNote), false);
    }
    for (const term of profile.rankingHints.prefer) {
      assert.equal(term.toLowerCase().includes(lowerNote), false);
    }
    for (const term of profile.rankingHints.deprioritize) {
      assert.equal(term.toLowerCase().includes(lowerNote), false);
    }
  });

  it("uses mood-congruent descriptors for anxious, tired, and angry match profiles", () => {
    const anxious = createRecommendationProfile({
      mood: "anxious",
      intensity: 5,
      energy: 5,
      musicMode: "match"
    });
    const tired = createRecommendationProfile({
      mood: "tired",
      intensity: 5,
      energy: 5,
      musicMode: "match"
    });
    const angry = createRecommendationProfile({
      mood: "angry",
      intensity: 5,
      energy: 5,
      musicMode: "match"
    });

    assert.ok(anxious.moodTerms.some((term) => ["anxious", "tense", "uneasy", "nervous", "restless"].includes(term)));
    assert.ok(anxious.queryTerms.some((term) => ["anxious", "tense", "dark ambient", "anxious instrumental"].includes(term)));
    assert.ok(tired.moodTerms.some((term) => ["tired", "slow", "low-energy", "sleepy"].includes(term)));
    assert.ok(tired.queryTerms.some((term) => ["tired", "slow", "low-energy", "tired mood music"].includes(term)));
    assert.ok(angry.moodTerms.some((term) => ["angry", "intense", "heavy", "aggressive"].includes(term)));
    assert.ok(angry.queryTerms.some((term) => ["angry", "intense", "heavy", "hard rock", "metal"].includes(term)));
  });

  it("keeps shift mode focused on the selected target mood query terms", () => {
    const shiftProfile = createRecommendationProfile({
      mood: "angry",
      intensity: 5,
      energy: 5,
      musicMode: "shift",
      targetMood: "calm"
    });

    assert.equal(shiftProfile.targetMood, "calm");
    assert.equal(shiftProfile.queryTerms, null);
    assert.deepEqual(shiftProfile.moodTerms, RECOMMENDATION_RULES.moods.calm.moodTerms);
    assert.deepEqual(shiftProfile.styleTerms, [...RECOMMENDATION_RULES.moods.calm.styleTerms, "music"]);
  });

  it("returns search-ready terms and ranking hints without external calls", () => {
    const originalFetch = globalThis.fetch;
    let fetchWasCalled = false;

    globalThis.fetch = (...args) => {
      fetchWasCalled = true;
      throw new Error(`Unexpected network call from recommendation module: ${args[0]}`);
    };

    try {
      const profile = createRecommendationProfile({
        mood: "happy",
        intensity: 5,
        energy: 8,
        musicMode: "match"
      });

      assert.ok(profile.moodTerms.length > 0);
      assert.ok(profile.energyTerms.length > 0);
      assert.ok(profile.styleTerms.length > 0);
      assert.deepEqual(profile.excludeTerms, [
        "reaction",
        "review",
        "interview",
        "tutorial",
        "podcast",
        "analysis"
      ]);
      assert.ok(profile.rankingHints.prefer.includes("official audio"));
      assert.ok(profile.rankingHints.deprioritize.includes("karaoke"));
      assert.equal(fetchWasCalled, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects invalid recommendation input predictably", () => {
    const invalid = detailsFor({
      mood: "excited",
      intensity: 11,
      energy: 0,
      musicMode: "match",
      targetMood: "calm"
    });
    const missingTarget = detailsFor({
      mood: "sad",
      intensity: 5,
      energy: 5,
      musicMode: "shift"
    });
    const sameTarget = detailsFor({
      mood: "sad",
      intensity: 5,
      energy: 5,
      musicMode: "shift",
      targetMood: "sad"
    });
    const invalidMode = detailsFor({
      mood: "sad",
      intensity: 5,
      energy: 5,
      musicMode: "blend"
    });
    const unsupportedTarget = detailsFor({
      mood: "sad",
      intensity: 5,
      energy: 5,
      musicMode: "shift",
      targetMood: "excited"
    });

    assert.equal(invalid.code, "VALIDATION_ERROR");
    assert.deepEqual(
      invalid.details.map((detail) => detail.field),
      ["mood", "intensity", "energy", "targetMood"]
    );
    assert.equal(missingTarget.details[0].field, "targetMood");
    assert.equal(sameTarget.details[0].field, "targetMood");
    assert.equal(invalidMode.code, "VALIDATION_ERROR");
    assert.equal(invalidMode.details[0].field, "musicMode");
    assert.equal(unsupportedTarget.code, "VALIDATION_ERROR");
    assert.equal(unsupportedTarget.details[0].field, "targetMood");
  });
});
