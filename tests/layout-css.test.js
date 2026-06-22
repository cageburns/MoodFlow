import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const css = readFileSync(new URL("../public/css/styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

function blockFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{(?<body>[^}]+)\\}`));
  return match?.groups?.body || "";
}

describe("responsive chart layout CSS", () => {
  it("bounds the chart wrapper so Chart.js cannot grow the page width", () => {
    const block = blockFor(".chart-frame");

    assert.match(block, /position:\s*relative/);
    assert.match(block, /width:\s*100%/);
    assert.match(block, /max-width:\s*100%/);
    assert.match(block, /min-width:\s*0/);
    assert.match(block, /height:\s*clamp\(/);
    assert.match(block, /overflow:\s*hidden/);
    assert.match(block, /contain:\s*layout paint/);
  });

  it("prevents the canvas from determining parent width", () => {
    const block = blockFor(".chart-frame canvas");

    assert.match(block, /position:\s*absolute/);
    assert.match(block, /inset:\s*0/);
    assert.match(block, /display:\s*block/);
    assert.match(block, /width:\s*100% !important/);
    assert.match(block, /height:\s*100% !important/);
    assert.match(block, /max-width:\s*100%/);
  });

  it("allows grid ancestors around the chart to shrink", () => {
    assert.match(css, /\.dashboard\s*\{[^}]*min-width:\s*0/s);
    assert.match(css, /\.dashboard > \*,\s*\.top-dashboard > \*,\s*\.music-column > \*,\s*\.history-grid > \*,\s*\.field-grid > \*,\s*\.date-grid > \*,\s*\.history-card-header > \*\s*\{[^}]*min-width:\s*0/s);
    assert.match(css, /\.top-dashboard\s*\{[^}]*min-width:\s*0/s);
    assert.match(css, /\.music-column\s*\{[^}]*min-width:\s*0/s);
    assert.match(css, /\.history-grid\s*\{[^}]*min-width:\s*0/s);
    assert.match(css, /\.card\s*\{[^}]*min-width:\s*0/s);
  });
});

describe("structural dashboard layout CSS", () => {
  it("uses the requested top dashboard and full-width history grids", () => {
    const topBlock = blockFor(".top-dashboard");
    const musicBlock = blockFor(".music-column");
    const historyBlock = blockFor(".history-grid");
    const moodBlock = blockFor(".mood-card");

    assert.match(topBlock, /display:\s*grid/);
    assert.match(topBlock, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(320px,\s*420px\)/);
    assert.match(topBlock, /align-items:\s*stretch/);
    assert.match(musicBlock, /display:\s*grid/);
    assert.match(musicBlock, /grid-template-rows:\s*auto minmax\(0,\s*1fr\)/);
    assert.match(musicBlock, /height:\s*var\(--top-row-height\)/);
    assert.match(musicBlock, /gap:\s*22px/);
    assert.match(moodBlock, /height:\s*var\(--top-row-height\)/);
    assert.match(moodBlock, /align-content:\s*start/);
    assert.match(historyBlock, /display:\s*grid/);
    assert.match(historyBlock, /grid-template-columns:\s*minmax\(0,\s*7fr\)\s*minmax\(280px,\s*3fr\)/);
  });

  it("keeps the suggestions card height stable while only its list scrolls", () => {
    const suggestionsCardBlock = blockFor(".suggestions-card");
    const suggestionsListBlock = blockFor(".suggestions-list");

    assert.match(css, /--top-row-height:\s*clamp\(/);
    assert.match(suggestionsCardBlock, /grid-template-rows:\s*auto minmax\(0,\s*1fr\)/);
    assert.match(suggestionsCardBlock, /min-height:\s*0/);
    assert.match(suggestionsCardBlock, /overflow:\s*hidden/);
    assert.match(suggestionsListBlock, /min-height:\s*0/);
    assert.match(suggestionsListBlock, /max-height:\s*none/);
    assert.match(suggestionsListBlock, /overflow-y:\s*auto/);
    assert.match(css, /\.suggestions-list:has\(\.empty-state:only-child\)\s*\{[^}]*place-items:\s*center/s);
  });

  it("keeps recent entries and suggestions internally scrollable", () => {
    const historyBlock = blockFor(".history-list");
    const suggestionsBlock = blockFor(".suggestions-list");

    assert.match(historyBlock, /max-height:\s*clamp\(/);
    assert.match(historyBlock, /overflow-y:\s*auto/);
    assert.match(suggestionsBlock, /max-height:\s*none/);
    assert.match(suggestionsBlock, /overflow-y:\s*auto/);
  });

  it("uses the requested mobile stacking order", () => {
    assert.match(css, /@media \(max-width:\s*860px\)[\s\S]*\.top-dashboard,\s*\.history-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it("uses the requested font families and card heading hierarchy", () => {
    assert.match(css, /Bricolage\+Grotesque/);
    assert.match(css, /Space\+Grotesk/);
    assert.match(css, /--heading-font:\s*"Bricolage Grotesque"/);
    assert.match(css, /--body-font:\s*"Space Grotesk"/);
    assert.match(html, /<p class="eyebrow">MOOD<\/p>\s*<h2 id="mood-form-title">Log a mood<\/h2>/);
    assert.match(html, /<p class="eyebrow">PLAYER<\/p>\s*<h2 id="player-title">Now playing<\/h2>/);
    assert.match(html, /<p class="eyebrow">MUSIC<\/p>\s*<h2 id="music-title">Suggestions<\/h2>/);
    assert.match(html, /<p class="eyebrow">HISTORY<\/p>\s*<h2 id="chart-title">Mood trends<\/h2>/);
    assert.match(html, /<p class="eyebrow">ENTRIES<\/p>\s*<h2 id="history-title">Recent entries<\/h2>/);
    assert.doesNotMatch(html, /<p class="eyebrow">MoodFlow<\/p>/);
  });

  it("keeps date controls in a two-column grid with visible spacing", () => {
    const headerBlock = blockFor(".history-card-header");
    const dateBlock = blockFor(".date-grid");

    assert.match(headerBlock, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(280px,\s*380px\)/);
    assert.match(headerBlock, /align-items:\s*center/);
    assert.match(dateBlock, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    assert.match(dateBlock, /gap:\s*14px/);
  });
});
