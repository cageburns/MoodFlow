import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const css = readFileSync(new URL("../public/css/styles.css", import.meta.url), "utf8");

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
    assert.match(css, /\.workspace\s*\{[^}]*min-width:\s*0/s);
    assert.match(css, /\.workspace > \*,\s*\.music-layout > \*,\s*\.music-header > \*,\s*\.field-grid > \*\s*\{[^}]*min-width:\s*0/s);
    assert.match(css, /\.chart-panel\s*\{[^}]*min-width:\s*0/s);
  });
});
