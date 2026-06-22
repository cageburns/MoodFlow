import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clearHistoryChart, renderHistoryChart } from "../public/js/charts.js";

class TestElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.textContent = "";
  }
}

describe("Phase 6 chart frontend behavior", () => {
  it("renders range summaries with average intensity and energy datasets", () => {
    const statusElement = new TestElement("p");
    const charts = [];
    class ChartMock {
      constructor(canvas, config) {
        this.canvas = canvas;
        this.config = config;
        charts.push(this);
      }
    }

    const chart = renderHistoryChart({
      summary: {
        mode: "range",
        points: [
          {
            label: "Jun 21, 2026",
            averageIntensity: 4.5,
            averageEnergy: 6.25
          },
          {
            label: "Jun 22, 2026",
            averageIntensity: 7,
            averageEnergy: 3
          }
        ]
      },
      canvas: new TestElement("canvas"),
      statusElement,
      ChartConstructor: ChartMock
    });

    assert.equal(chart, charts[0]);
    assert.equal(statusElement.textContent, "Daily average mood trend");
    assert.equal(charts[0].config.type, "line");
    assert.deepEqual(charts[0].config.data.labels, ["Jun 21, 2026", "Jun 22, 2026"]);
    assert.deepEqual(
      charts[0].config.data.datasets.map((dataset) => dataset.label),
      ["Average intensity", "Average energy"]
    );
    assert.deepEqual(charts[0].config.data.datasets[0].data, [4.5, 7]);
    assert.deepEqual(charts[0].config.data.datasets[1].data, [6.25, 3]);
  });

  it("destroys the previous chart before drawing a replacement", () => {
    let destroyCount = 0;
    class ChartMock {
      constructor() {
        this.destroy = () => {
          destroyCount += 1;
        };
      }
    }

    renderHistoryChart({
      summary: {
        mode: "day",
        points: [{ label: "10:00", intensity: 4, energy: 5 }]
      },
      canvas: new TestElement("canvas"),
      statusElement: new TestElement("p"),
      ChartConstructor: ChartMock
    });
    renderHistoryChart({
      summary: {
        mode: "day",
        points: [{ label: "11:00", intensity: 8, energy: 7 }]
      },
      canvas: new TestElement("canvas"),
      statusElement: new TestElement("p"),
      ChartConstructor: ChartMock
    });

    assert.equal(destroyCount, 1);
  });

  it("clears chart state and reports text fallback when Chart.js is unavailable", () => {
    const statusElement = new TestElement("p");

    const chart = renderHistoryChart({
      summary: {
        mode: "day",
        points: [{ label: "10:00", intensity: 4, energy: 5 }]
      },
      canvas: new TestElement("canvas"),
      statusElement,
      ChartConstructor: null
    });

    assert.equal(chart, null);
    assert.equal(statusElement.textContent, "Chart library is unavailable. Text history is still shown.");

    clearHistoryChart(statusElement);
    assert.equal(statusElement.textContent, "Choose a history period to draw a chart.");
  });
});
