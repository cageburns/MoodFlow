import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { initializeMoodForm } from "../public/js/mood-form.js";
import { initializeHistory, localDateRange, localDayRange, renderHistory } from "../public/js/history.js";

const originalDocument = globalThis.document;
const originalFetch = globalThis.fetch;
const originalFormData = globalThis.FormData;
const originalDateTimeFormat = Intl.DateTimeFormat;

class TestElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.hidden = false;
    this.disabled = false;
    this.required = false;
    this.textContent = "";
    this.value = "";
    this.listeners = {};
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  addEventListener(eventName, handler) {
    this.listeners[eventName] = handler;
  }
}

function createTestForm() {
  const targetGroup = new TestElement("div");
  const form = new TestElement("form");
  form.elements = {
    mood: new TestElement("select"),
    targetMood: new TestElement("select")
  };
  form.listeners = {};
  form.mode = "match";
  form.querySelector = (selector) => {
    if (selector === "[data-target-mood-group]") {
      return targetGroup;
    }

    return null;
  };
  form.addEventListener = (eventName, handler) => {
    form.listeners[eventName] = handler;
  };
  form.reset = () => {
    form.mode = "match";
  };

  return { form, targetGroup };
}

afterEach(() => {
  globalThis.document = originalDocument;
  globalThis.fetch = originalFetch;
  globalThis.FormData = originalFormData;
  Intl.DateTimeFormat = originalDateTimeFormat;
});

describe("Phase 2 frontend behavior", () => {
  it("shows the target mood field only when shift mode is selected", () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      constructor(form) {
        this.form = form;
      }

      get(name) {
        if (name === "musicMode") {
          return this.form.mode;
        }

        return "";
      }
    };

    const { form, targetGroup } = createTestForm();
    initializeMoodForm({ form, statusElement: new TestElement("p") });

    assert.equal(targetGroup.hidden, true);
    assert.equal(form.elements.targetMood.disabled, true);
    assert.equal(form.elements.targetMood.required, false);

    form.mode = "shift";
    form.listeners.change({ target: { name: "musicMode" } });

    assert.equal(targetGroup.hidden, false);
    assert.equal(form.elements.targetMood.disabled, false);
    assert.equal(form.elements.targetMood.required, true);

    form.mode = "match";
    form.elements.targetMood.value = "calm";
    form.listeners.change({ target: { name: "musicMode" } });

    assert.equal(targetGroup.hidden, true);
    assert.equal(form.elements.targetMood.disabled, true);
    assert.equal(form.elements.targetMood.value, "");
  });

  it("renders recent entries with browser-local timestamp formatting", () => {
    let formattedDate;
    Intl.DateTimeFormat = function DateTimeFormat() {
      return {
        format(date) {
          formattedDate = date;
          return "LOCAL TIME";
        }
      };
    };
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };

    const container = new TestElement("div");
    renderHistory([
      {
        mood: "calm",
        intensity: 4,
        energy: 3,
        note: "Quiet evening",
        musicMode: "match",
        targetMood: null,
        createdAt: "2026-06-21T18:30:00.000Z"
      }
    ], container);

    const item = container.children[0];
    const title = item.children[0];
    const meta = item.children[1];
    const note = item.children[2];

    assert.equal(title.textContent, "calm (4/10)");
    assert.match(meta.textContent, /LOCAL TIME/);
    assert.match(meta.textContent, /energy 3\/10/);
    assert.match(meta.textContent, /match current mood/);
    assert.equal(note.textContent, "Quiet evening");
    assert.equal(formattedDate.toISOString(), "2026-06-21T18:30:00.000Z");
  });

  it("converts local date inputs into UTC request ranges", () => {
    const day = localDayRange("2026-06-21");
    const range = localDateRange("2026-06-21", "2026-06-23");

    assert.equal(new Date(day.to).getTime() - new Date(day.from).getTime(), 24 * 60 * 60 * 1000);
    assert.equal(new Date(range.to).getTime() - new Date(range.from).getTime(), 3 * 24 * 60 * 60 * 1000);
  });

  it("loads a selected day into readable history and a Chart.js line chart", async () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      constructor(form) {
        this.form = form;
      }

      get(name) {
        if (name === "historyMode") {
          return this.form.mode;
        }

        return this.form.elements[name].value;
      }
    };
    Intl.DateTimeFormat = function DateTimeFormat() {
      return {
        resolvedOptions() {
          return { timeZone: "Europe/Berlin" };
        },
        format(date) {
          return date.toISOString();
        }
      };
    };

    const dayGroup = new TestElement("div");
    const rangeGroup = new TestElement("div");
    const form = new TestElement("form");
    form.mode = "day";
    form.elements = {
      historyDay: new TestElement("input"),
      historyFrom: new TestElement("input"),
      historyTo: new TestElement("input")
    };
    form.elements.historyDay.value = "2026-06-21";
    form.elements.historyFrom.value = "2026-06-21";
    form.elements.historyTo.value = "2026-06-21";
    form.querySelector = (selector) => {
      if (selector === "[data-history-day]") {
        return dayGroup;
      }

      if (selector === "[data-history-range]") {
        return rangeGroup;
      }

      return null;
    };
    const requestedPaths = [];
    globalThis.fetch = async (path) => {
      requestedPaths.push(path);
      return {
        ok: true,
        async json() {
          if (path.startsWith("/api/moods/summary")) {
            return {
              mode: "day",
              points: [
                { label: "10:00", intensity: 4, energy: 5 }
              ]
            };
          }

          return {
            entries: [
              {
                mood: "calm",
                intensity: 4,
                energy: 5,
                note: "",
                musicMode: "match",
                targetMood: null,
                createdAt: "2026-06-21T08:00:00.000Z"
              }
            ]
          };
        }
      };
    };
    const charts = [];
    class ChartMock {
      constructor(canvas, config) {
        this.canvas = canvas;
        this.config = config;
        charts.push(this);
      }
    }

    const controller = initializeHistory({
      form,
      listElement: new TestElement("div"),
      statusElement: new TestElement("p"),
      chartCanvas: new TestElement("canvas"),
      chartStatusElement: new TestElement("p"),
      ChartConstructor: ChartMock
    });

    await controller.loadSelectedPeriod();

    assert.equal(requestedPaths.length, 2);
    assert.match(requestedPaths[0], /^\/api\/moods\?/);
    assert.match(requestedPaths[1], /^\/api\/moods\/summary\?/);
    assert.match(requestedPaths[1], /mode=day/);
    assert.match(requestedPaths[1], /timeZone=Europe%2FBerlin/);
    assert.equal(charts.length, 1);
    assert.equal(charts[0].config.type, "line");
    assert.deepEqual(charts[0].config.data.datasets.map((dataset) => dataset.label), ["Intensity", "Energy"]);
  });

  it("shows an empty state instead of drawing a chart for empty periods", async () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      constructor(form) {
        this.form = form;
      }

      get(name) {
        if (name === "historyMode") {
          return "range";
        }

        return this.form.elements[name].value;
      }
    };

    const form = new TestElement("form");
    form.elements = {
      historyDay: new TestElement("input"),
      historyFrom: new TestElement("input"),
      historyTo: new TestElement("input")
    };
    form.elements.historyFrom.value = "2026-06-21";
    form.elements.historyTo.value = "2026-06-22";
    form.querySelector = () => new TestElement("div");
    globalThis.fetch = async (path) => ({
      ok: true,
      async json() {
        return path.startsWith("/api/moods/summary")
          ? { mode: "range", points: [] }
          : { entries: [] };
      }
    });
    let chartCreated = false;
    class ChartMock {
      constructor() {
        chartCreated = true;
      }
    }
    const listElement = new TestElement("div");
    const statusElement = new TestElement("p");
    const chartStatusElement = new TestElement("p");
    const controller = initializeHistory({
      form,
      listElement,
      statusElement,
      chartCanvas: new TestElement("canvas"),
      chartStatusElement,
      ChartConstructor: ChartMock
    });

    await controller.loadSelectedPeriod();

    assert.equal(statusElement.textContent, "No mood entries in this period.");
    assert.equal(listElement.children[0].textContent, "No mood entries in this period.");
    assert.equal(chartStatusElement.textContent, "No chart data for this period.");
    assert.equal(chartCreated, false);
  });

  it("shows a validation message for invalid date ranges without requesting history", async () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      constructor(form) {
        this.form = form;
      }

      get(name) {
        if (name === "historyMode") {
          return "range";
        }

        return this.form.elements[name].value;
      }
    };
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount += 1;
      throw new Error("fetch should not be called");
    };

    const form = new TestElement("form");
    form.elements = {
      historyDay: new TestElement("input"),
      historyFrom: new TestElement("input"),
      historyTo: new TestElement("input")
    };
    form.elements.historyFrom.value = "2026-06-23";
    form.elements.historyTo.value = "2026-06-21";
    form.querySelector = () => new TestElement("div");
    const listElement = new TestElement("div");
    const statusElement = new TestElement("p");
    const chartStatusElement = new TestElement("p");
    const controller = initializeHistory({
      form,
      listElement,
      statusElement,
      chartCanvas: new TestElement("canvas"),
      chartStatusElement,
      ChartConstructor: class {}
    });
    form.elements.historyFrom.value = "2026-06-23";
    form.elements.historyTo.value = "2026-06-21";

    await controller.loadSelectedPeriod();

    assert.equal(fetchCount, 0);
    assert.equal(statusElement.textContent, "Start date must be before or equal to end date.");
    assert.equal(listElement.children[0].textContent, "Start date must be before or equal to end date.");
    assert.equal(chartStatusElement.textContent, "Choose a history period to draw a chart.");
  });
});
