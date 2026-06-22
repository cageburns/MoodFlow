import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chartDataForEntries,
  clearHistoryChart,
  MOOD_CHART_VALUES,
  renderHistoryChart
} from "../public/js/charts.js";

class TestElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.textContent = "";
  }
}

function alphaFromRgba(value) {
  return Number(value.match(/,\s*([0-9.]+)\)$/)?.[1]);
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

  it("renders actual mood values beside intensity and energy without replacing mood names", () => {
    const entries = [
      {
        mood: "sad",
        intensity: 3,
        energy: 2,
        createdAt: "2026-06-21T11:00:00.000Z"
      },
      {
        mood: "happy",
        intensity: 8,
        energy: 7,
        createdAt: "2026-06-21T09:00:00.000Z"
      }
    ];
    const data = chartDataForEntries(entries);

    assert.equal(MOOD_CHART_VALUES.happy, 8);
    assert.equal(MOOD_CHART_VALUES.sad, 1);
    assert.deepEqual(
      data.datasets.map((dataset) => dataset.label),
      ["Intensity", "Energy", "Actual mood"]
    );
    assert.deepEqual(data.datasets.map((dataset) => dataset.type), ["line", "line", "bar"]);
    assert.deepEqual(data.datasets[0].data, [8, 3]);
    assert.deepEqual(data.datasets[1].data, [7, 2]);
    assert.deepEqual(data.datasets[2].data.map((point) => point.y), [8, 1]);
    assert.deepEqual(data.datasets[2].data.map((point) => point.mood), ["happy", "sad"]);
    assert.equal(data.datasets[2].minBarLength, 6);
    assert.equal(data.datasets[2].barPercentage, 0.42);
    assert.equal(data.datasets[2].backgroundColor, "rgba(88, 188, 179, 0.58)");
    assert.notEqual(data.datasets[2].data[1].y, null);
  });

  it("uses stronger mood bars behind softer intensity and energy lines", () => {
    const data = chartDataForEntries([
      {
        mood: "calm",
        intensity: 7,
        energy: 6,
        createdAt: "2026-06-21T10:00:00.000Z"
      }
    ]);
    const [intensity, energy, mood] = data.datasets;

    assert.equal(intensity.type, "line");
    assert.equal(energy.type, "line");
    assert.equal(mood.type, "bar");
    assert.equal(mood.order > energy.order, true);
    assert.equal(energy.order > intensity.order, true);
    assert.equal(alphaFromRgba(mood.backgroundColor) > alphaFromRgba(intensity.backgroundColor), true);
    assert.equal(alphaFromRgba(mood.backgroundColor) > alphaFromRgba(energy.backgroundColor), true);
    assert.equal(alphaFromRgba(mood.borderColor) > alphaFromRgba(intensity.borderColor), true);
    assert.equal(mood.backgroundColor, "rgba(88, 188, 179, 0.58)");
    assert.equal(mood.borderColor, "rgba(88, 188, 179, 0.94)");
    assert.equal(intensity.borderColor, "rgba(102, 84, 198, 0.9)");
    assert.equal(energy.borderColor, "rgba(176, 93, 150, 0.88)");
    assert.equal(intensity.pointRadius, 2);
    assert.equal(energy.pointRadius, 2);
  });

  it("applies Space Grotesk typography to chart defaults and chart text options", () => {
    const statusElement = new TestElement("p");
    const charts = [];
    class ChartMock {
      constructor(canvas, config) {
        this.canvas = canvas;
        this.config = config;
        charts.push(this);
      }
    }
    ChartMock.defaults = {
      font: {
        family: "Arial"
      },
      color: "#000"
    };

    renderHistoryChart({
      entries: [
        {
          mood: "focused",
          intensity: 6,
          energy: 7,
          createdAt: "2026-06-21T10:00:00.000Z"
        }
      ],
      canvas: new TestElement("canvas"),
      statusElement,
      ChartConstructor: ChartMock
    });

    const options = charts[0].config.options;
    assert.equal(ChartMock.defaults.font.family, "\"Space Grotesk\", \"Segoe UI\", Arial, sans-serif");
    assert.equal(options.plugins.legend.labels.font.family, "\"Space Grotesk\", \"Segoe UI\", Arial, sans-serif");
    assert.equal(options.scales.x.ticks.font.family, "\"Space Grotesk\", \"Segoe UI\", Arial, sans-serif");
    assert.equal(options.scales.y.ticks.font.family, "\"Space Grotesk\", \"Segoe UI\", Arial, sans-serif");
    assert.equal(options.scales.mood.ticks.font.family, "\"Space Grotesk\", \"Segoe UI\", Arial, sans-serif");
    assert.equal(options.plugins.tooltip.titleFont.family, "\"Space Grotesk\", \"Segoe UI\", Arial, sans-serif");
    assert.equal(options.plugins.tooltip.bodyFont.family, "\"Space Grotesk\", \"Segoe UI\", Arial, sans-serif");
  });

  it("renders mood names on the mood axis and in tooltips", () => {
    const statusElement = new TestElement("p");
    const charts = [];
    class ChartMock {
      constructor(canvas, config) {
        this.canvas = canvas;
        this.config = config;
        charts.push(this);
      }
    }

    renderHistoryChart({
      entries: [
        {
          mood: "focused",
          intensity: 6,
          energy: 7,
          createdAt: "2026-06-21T10:00:00.000Z"
        }
      ],
      canvas: new TestElement("canvas"),
      statusElement,
      ChartConstructor: ChartMock
    });

    const config = charts[0].config;
    assert.equal(statusElement.textContent, "Mood, intensity, and energy trend for selected period.");
    assert.equal(config.type, "bar");
    assert.deepEqual(config.data.datasets.map((dataset) => dataset.type), ["line", "line", "bar"]);
    assert.equal(config.options.scales.y.min, 0);
    assert.equal(config.options.scales.y.max, 10);
    assert.equal(config.data.datasets[2].yAxisID, "mood");
    assert.equal(config.options.scales.mood.min, 0);
    assert.equal(config.options.scales.mood.max, 8);
    assert.equal(config.options.scales.mood.ticks.callback(0), "");
    assert.equal(config.options.scales.mood.ticks.callback(1), "sad");
    assert.equal(config.options.scales.mood.ticks.callback(6), "focused");
    assert.equal(config.options.scales.mood.ticks.callback(4), "anxious");
    assert.equal(
      config.options.plugins.tooltip.callbacks.label({
        dataset: { label: "Actual mood" },
        dataIndex: 0
      }),
      "Mood: focused"
    );
    assert.equal(
      config.options.plugins.tooltip.callbacks.label({
        dataset: { label: "Intensity" },
        dataIndex: 0
      }),
      "Intensity: 6/10"
    );
    assert.equal(
      config.options.plugins.tooltip.callbacks.label({
        dataset: { label: "Energy" },
        dataIndex: 0
      }),
      "Energy: 7/10"
    );
  });

  it("keeps the lowest recorded mood distinguishable from missing data", () => {
    const statusElement = new TestElement("p");
    const charts = [];
    class ChartMock {
      constructor(canvas, config) {
        this.canvas = canvas;
        this.config = config;
        charts.push(this);
      }
    }

    renderHistoryChart({
      entries: [
        {
          mood: "sad",
          intensity: 2,
          energy: 3,
          createdAt: "2026-06-21T10:00:00.000Z"
        }
      ],
      canvas: new TestElement("canvas"),
      statusElement,
      ChartConstructor: ChartMock
    });

    const moodDataset = charts[0].config.data.datasets[2];
    assert.equal(moodDataset.minBarLength, 6);
    assert.equal(MOOD_CHART_VALUES.sad, 1);
    assert.equal(moodDataset.data[0].y, MOOD_CHART_VALUES.sad);
    assert.equal(moodDataset.data[0].mood, "sad");
    assert.notEqual(moodDataset.data[0].y, null);
    assert.equal(charts[0].config.options.scales.mood.min, 0);
    assert.equal(charts[0].config.options.scales.mood.max, 8);
    assert.equal(charts[0].config.options.scales.mood.ticks.callback(MOOD_CHART_VALUES.sad), "sad");
    assert.equal(
      charts[0].config.options.plugins.tooltip.callbacks.label({
        dataset: { label: "Actual mood" },
        dataIndex: 0
      }),
      "Mood: sad"
    );
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

  it("keeps the chart area available and reports an empty state when there are no entries", () => {
    const statusElement = new TestElement("p");
    const chart = renderHistoryChart({
      entries: [],
      canvas: new TestElement("canvas"),
      statusElement,
      ChartConstructor: class {}
    });

    assert.equal(chart, null);
    assert.equal(statusElement.textContent, "No chart data for this period.");
  });
});
