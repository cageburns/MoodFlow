import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSummaryService } from "../src/services/summary.service.js";

function repositoryWith(entries) {
  return {
    listBetween(from, to) {
      return entries
        .filter((entry) => entry.createdAt >= from && entry.createdAt < to)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    }
  };
}

describe("summary service", () => {
  it("returns one day point for each entry in chronological order", () => {
    const service = createSummaryService(repositoryWith([
      {
        mood: "calm",
        intensity: 3,
        energy: 2,
        createdAt: "2026-06-21T09:00:00.000Z"
      },
      {
        mood: "focused",
        intensity: 7,
        energy: 8,
        createdAt: "2026-06-21T11:00:00.000Z"
      }
    ]));

    const summary = service.getMoodSummary({
      mode: "day",
      from: "2026-06-21T00:00:00.000Z",
      to: "2026-06-22T00:00:00.000Z",
      timeZone: "UTC"
    });

    assert.equal(summary.mode, "day");
    assert.deepEqual(summary.points.map((point) => point.mood), ["calm", "focused"]);
    assert.deepEqual(summary.points.map((point) => point.intensity), [3, 7]);
    assert.deepEqual(summary.points.map((point) => point.energy), [2, 8]);
  });

  it("groups range summaries by browser-local day with averages", () => {
    const service = createSummaryService(repositoryWith([
      {
        mood: "calm",
        intensity: 4,
        energy: 2,
        createdAt: "2026-06-21T22:30:00.000Z"
      },
      {
        mood: "happy",
        intensity: 8,
        energy: 6,
        createdAt: "2026-06-21T23:30:00.000Z"
      },
      {
        mood: "focused",
        intensity: 5,
        energy: 9,
        createdAt: "2026-06-22T22:30:00.000Z"
      }
    ]));

    const summary = service.getMoodSummary({
      mode: "range",
      from: "2026-06-21T00:00:00.000Z",
      to: "2026-06-23T00:00:00.000Z",
      timeZone: "Europe/Berlin"
    });

    assert.equal(summary.mode, "range");
    assert.deepEqual(summary.points.map((point) => point.date), ["2026-06-22", "2026-06-23"]);
    assert.equal(summary.points[0].averageIntensity, 6);
    assert.equal(summary.points[0].averageEnergy, 4);
    assert.equal(summary.points[0].entryCount, 2);
    assert.equal(summary.points[1].averageIntensity, 5);
    assert.equal(summary.points[1].averageEnergy, 9);
    assert.equal(summary.points[1].entryCount, 1);
  });

  it("rejects invalid summary requests with validation details", () => {
    const service = createSummaryService(repositoryWith([]));

    assert.throws(() => service.getMoodSummary({
      mode: "week",
      from: "2026-06-21T00:00:00.000Z",
      to: "2026-06-22T00:00:00.000Z",
      timeZone: "UTC"
    }), /Invalid mood entry/);

    assert.throws(() => service.getMoodSummary({
      mode: "day",
      from: "2026-06-22T00:00:00.000Z",
      to: "2026-06-21T00:00:00.000Z",
      timeZone: "UTC"
    }), /Invalid mood entry/);
  });
});
