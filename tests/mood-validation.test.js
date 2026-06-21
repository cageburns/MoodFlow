import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateMoodInput } from "../src/services/mood.service.js";

function validationDetailsFor(input) {
  try {
    validateMoodInput(input);
  } catch (error) {
    return error.details;
  }

  return [];
}

describe("mood validation", () => {
  it("accepts a valid match entry without a target mood", () => {
    const entry = validateMoodInput({
      mood: "calm",
      intensity: 4,
      energy: 3,
      note: "",
      musicMode: "match"
    });

    assert.deepEqual(entry, {
      mood: "calm",
      intensity: 4,
      energy: 3,
      note: "",
      musicMode: "match",
      targetMood: null
    });
  });

  it("accepts a valid shift entry with a different target mood", () => {
    const entry = validateMoodInput({
      mood: "anxious",
      intensity: 8,
      energy: 7,
      note: "Busy day",
      musicMode: "shift",
      targetMood: "calm"
    });

    assert.equal(entry.targetMood, "calm");
  });

  it("rejects unsupported moods", () => {
    const details = validationDetailsFor({
      mood: "excited",
      intensity: 5,
      energy: 5,
      musicMode: "match"
    });

    assert.equal(details[0].field, "mood");
  });

  it("rejects intensity and energy outside 1 to 10", () => {
    const details = validationDetailsFor({
      mood: "happy",
      intensity: 11,
      energy: 0,
      musicMode: "match"
    });

    assert.deepEqual(details.map((detail) => detail.field), ["intensity", "energy"]);
  });

  it("rejects notes longer than 300 characters", () => {
    const details = validationDetailsFor({
      mood: "happy",
      intensity: 5,
      energy: 5,
      note: "x".repeat(301),
      musicMode: "match"
    });

    assert.equal(details[0].field, "note");
  });

  it("requires a different target mood for shift mode", () => {
    const missingTarget = validationDetailsFor({
      mood: "sad",
      intensity: 5,
      energy: 5,
      musicMode: "shift"
    });
    const sameTarget = validationDetailsFor({
      mood: "sad",
      intensity: 5,
      energy: 5,
      musicMode: "shift",
      targetMood: "sad"
    });

    assert.equal(missingTarget[0].field, "targetMood");
    assert.equal(sameTarget[0].field, "targetMood");
  });

  it("rejects a target mood for match mode", () => {
    const details = validationDetailsFor({
      mood: "focused",
      intensity: 6,
      energy: 6,
      musicMode: "match",
      targetMood: "calm"
    });

    assert.equal(details[0].field, "targetMood");
  });
});
