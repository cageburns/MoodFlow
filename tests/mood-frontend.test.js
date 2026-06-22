import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { initializeMoodForm } from "../public/js/mood-form.js";
import { initializeHistory, localDateRange, renderHistory } from "../public/js/history.js";

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
  const submitButton = new TestElement("button");
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

    if (selector === "button[type='submit']") {
      return submitButton;
    }

    return null;
  };
  form.addEventListener = (eventName, handler) => {
    form.listeners[eventName] = handler;
  };
  form.reset = () => {
    form.mode = "match";
  };

  return { form, targetGroup, submitButton };
}

function nextTick() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
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

  it("converts same-date and multi-day inputs into inclusive UTC request ranges", () => {
    const day = localDateRange("2026-06-21", "2026-06-21");
    const range = localDateRange("2026-06-21", "2026-06-23");

    assert.equal(new Date(day.to).getTime() - new Date(day.from).getTime(), 24 * 60 * 60 * 1000);
    assert.equal(new Date(range.to).getTime() - new Date(range.from).getTime(), 3 * 24 * 60 * 60 * 1000);
  });

  it("loads a same-date range into readable history and a mixed Chart.js chart", async () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      constructor(form) {
        this.form = form;
      }

      get(name) {
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

    const form = new TestElement("form");
    form.elements = {
      historyFrom: new TestElement("input"),
      historyTo: new TestElement("input")
    };
    form.querySelector = () => null;
    const requestedPaths = [];
    globalThis.fetch = async (path) => {
      requestedPaths.push(path);
      return {
        ok: true,
        async json() {
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

    assert.equal(requestedPaths.length, 1);
    const url = new URL(requestedPaths[0], "http://moodflow.test");
    assert.equal(url.pathname, "/api/moods");
    assert.equal(new Date(url.searchParams.get("to")).getTime() - new Date(url.searchParams.get("from")).getTime(), 24 * 60 * 60 * 1000);
    assert.equal(charts.length, 1);
    assert.equal(charts[0].config.type, "bar");
    assert.deepEqual(
      charts[0].config.data.datasets.map((dataset) => dataset.label),
      ["Intensity", "Energy", "Actual mood"]
    );
    assert.deepEqual(charts[0].config.data.datasets.map((dataset) => dataset.type), ["line", "line", "bar"]);
    assert.deepEqual(charts[0].config.data.datasets[2].data.map((point) => point.mood), ["calm"]);
  });

  it("loads history automatically on initialization when autoLoad is enabled", async () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      constructor(form) {
        this.form = form;
      }

      get(name) {
        return this.form.elements[name].value;
      }
    };

    const form = new TestElement("form");
    form.elements = {
      historyFrom: new TestElement("input"),
      historyTo: new TestElement("input")
    };
    form.querySelector = () => null;
    const requestedPaths = [];
    const charts = [];
    globalThis.fetch = async (path) => {
      requestedPaths.push(path);
      return {
        ok: true,
        async json() {
          return {
            entries: [
              {
                mood: "focused",
                intensity: 6,
                energy: 7,
                note: "",
                musicMode: "match",
                targetMood: null,
                createdAt: "2026-06-21T10:00:00.000Z"
              }
            ]
          };
        }
      };
    };
    class ChartMock {
      constructor(canvas, config) {
        this.canvas = canvas;
        this.config = config;
        charts.push(this);
      }
    }

    initializeHistory({
      form,
      listElement: new TestElement("div"),
      statusElement: new TestElement("p"),
      chartCanvas: new TestElement("canvas"),
      chartStatusElement: new TestElement("p"),
      ChartConstructor: ChartMock,
      autoLoad: true
    });
    await nextTick();

    const today = new Date();
    const expectedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    assert.equal(form.elements.historyFrom.value, expectedToday);
    assert.equal(form.elements.historyTo.value, expectedToday);
    assert.equal(requestedPaths.length, 1);
    assert.match(requestedPaths[0], /^\/api\/moods\?/);
    assert.equal(charts.length, 1);
    assert.deepEqual(
      charts[0].config.data.datasets.map((dataset) => dataset.label),
      ["Intensity", "Energy", "Actual mood"]
    );
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
        return this.form.elements[name].value;
      }
    };

    const form = new TestElement("form");
    form.elements = {
      historyFrom: new TestElement("input"),
      historyTo: new TestElement("input")
    };
    form.elements.historyFrom.value = "2026-06-21";
    form.elements.historyTo.value = "2026-06-22";
    form.querySelector = () => new TestElement("div");
    globalThis.fetch = async (path) => ({
      ok: true,
      async json() {
        return { entries: [] };
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

  it("refreshes history automatically when the selected date changes", async () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      constructor(form) {
        this.form = form;
      }

      get(name) {
        return this.form.elements[name].value;
      }
    };

    const form = new TestElement("form");
    form.elements = {
      historyFrom: new TestElement("input"),
      historyTo: new TestElement("input")
    };
    form.elements.historyFrom.value = "2026-06-21";
    form.elements.historyTo.value = "2026-06-21";
    form.querySelector = () => null;
    const requestedPaths = [];
    globalThis.fetch = async (path) => {
      requestedPaths.push(path);
      return {
        ok: true,
        async json() {
          return { entries: [] };
        }
      };
    };

    initializeHistory({
      form,
      listElement: new TestElement("div"),
      statusElement: new TestElement("p"),
      chartCanvas: new TestElement("canvas"),
      chartStatusElement: new TestElement("p"),
      ChartConstructor: class {}
    });

    form.elements.historyFrom.value = "2026-06-22";
    await form.listeners.change({ target: form.elements.historyFrom });

    assert.equal(requestedPaths.length, 1);
    const url = new URL(requestedPaths[0], "http://moodflow.test");
    assert.equal(url.pathname, "/api/moods");
    assert.equal(new Date(url.searchParams.get("from")).getDate(), 22);
  });

  it("uses a multi-day inclusive range and refreshes when the to date changes", async () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      constructor(form) {
        this.form = form;
      }

      get(name) {
        return this.form.elements[name].value;
      }
    };

    const form = new TestElement("form");
    form.elements = {
      historyFrom: new TestElement("input"),
      historyTo: new TestElement("input")
    };
    form.elements.historyFrom.value = "2026-06-21";
    form.elements.historyTo.value = "2026-06-21";
    form.querySelector = () => null;
    const requestedPaths = [];
    globalThis.fetch = async (path) => {
      requestedPaths.push(path);
      return {
        ok: true,
        async json() {
          return { entries: [] };
        }
      };
    };

    initializeHistory({
      form,
      listElement: new TestElement("div"),
      statusElement: new TestElement("p"),
      chartCanvas: new TestElement("canvas"),
      chartStatusElement: new TestElement("p"),
      ChartConstructor: class {}
    });

    form.elements.historyFrom.value = "2026-06-21";
    form.elements.historyTo.value = "2026-06-23";
    await form.listeners.change({ target: form.elements.historyTo });

    assert.equal(requestedPaths.length, 1);
    const url = new URL(requestedPaths[0], "http://moodflow.test");
    assert.equal(new Date(url.searchParams.get("to")).getTime() - new Date(url.searchParams.get("from")).getTime(), 3 * 24 * 60 * 60 * 1000);
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

  it("refreshes the history chart after a mood entry is saved", async () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      constructor(form) {
        this.form = form;
      }

      get(name) {
        if (this.form.kind === "history") {
          return this.form.elements[name].value;
        }

        const values = {
          mood: "happy",
          intensity: "8",
          energy: "7",
          note: "",
          musicMode: "match",
          targetMood: ""
        };
        return values[name] || "";
      }
    };

    const historyForm = new TestElement("form");
    historyForm.kind = "history";
    historyForm.elements = {
      historyFrom: new TestElement("input"),
      historyTo: new TestElement("input")
    };
    historyForm.elements.historyFrom.value = "2026-06-21";
    historyForm.elements.historyTo.value = "2026-06-21";
    historyForm.querySelector = () => new TestElement("div");
    const charts = [];
    const requestedPaths = [];
    globalThis.fetch = async (path, options = {}) => {
      requestedPaths.push(path);
      if (path === "/api/moods" && options.method === "POST") {
        return {
          ok: true,
          async json() {
            return { entry: { id: 9, mood: "happy" } };
          }
        };
      }

      return {
        ok: true,
        async json() {
          return {
            entries: [
              {
                mood: "happy",
                intensity: 8,
                energy: 7,
                note: "",
                musicMode: "match",
                targetMood: null,
                createdAt: "2026-06-21T10:00:00.000Z"
              }
            ]
          };
        }
      };
    };
    class ChartMock {
      constructor(canvas, config) {
        this.canvas = canvas;
        this.config = config;
        charts.push(this);
      }
    }
    const historyController = initializeHistory({
      form: historyForm,
      listElement: new TestElement("div"),
      statusElement: new TestElement("p"),
      chartCanvas: new TestElement("canvas"),
      chartStatusElement: new TestElement("p"),
      ChartConstructor: ChartMock
    });

    const { form: moodForm } = createTestForm();
    moodForm.kind = "mood";
    initializeMoodForm({
      form: moodForm,
      statusElement: new TestElement("p"),
      onSaved: async () => {
        await historyController.loadSelectedPeriod();
      }
    });

    await moodForm.listeners.submit({ preventDefault() {} });

    assert.deepEqual(requestedPaths.map((path) => path.split("?")[0]), ["/api/moods", "/api/moods"]);
    assert.equal(charts.length, 1);
    assert.deepEqual(charts[0].config.data.datasets[2].data.map((point) => point.mood), ["happy"]);
  });

  it("saves a valid mood entry and waits for automatic suggestions before re-enabling submit", async () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      get(name) {
        const values = {
          mood: "calm",
          intensity: "4",
          energy: "5",
          note: "",
          musicMode: "match",
          targetMood: ""
        };
        return values[name] || "";
      }
    };

    const requests = [];
    let resolveSuggestions;
    globalThis.fetch = async (path, options) => {
      requests.push({ path, body: options?.body ? JSON.parse(options.body) : null });

      if (path === "/api/moods") {
        return {
          ok: true,
          async json() {
            return { entry: { id: 42, mood: "calm" } };
          }
        };
      }

      if (path === "/api/music/suggestions") {
        return new Promise((resolve) => {
          resolveSuggestions = () => resolve({
            ok: true,
            async json() {
              return { suggestions: [] };
            }
          });
        });
      }

      throw new Error(`Unexpected request: ${path}`);
    };

    const { form, submitButton } = createTestForm();
    const statusElement = new TestElement("p");
    initializeMoodForm({
      form,
      statusElement,
      onSaved: async (entry) => {
        await fetch("/api/music/suggestions", {
          method: "POST",
          body: JSON.stringify({ moodEntryId: entry.id })
        });
      }
    });

    const submitPromise = form.listeners.submit({ preventDefault() {} });
    await nextTick();

    assert.equal(submitButton.disabled, true);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].path, "/api/moods");
    assert.deepEqual(requests[1], {
      path: "/api/music/suggestions",
      body: { moodEntryId: 42 }
    });

    resolveSuggestions();
    await submitPromise;

    assert.equal(submitButton.disabled, false);
    assert.equal(statusElement.textContent, "Mood entry saved.");
  });

  it("does not request suggestions when mood saving fails", async () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      get(name) {
        if (name === "mood") {
          return "";
        }

        if (name === "intensity" || name === "energy") {
          return "5";
        }

        if (name === "musicMode") {
          return "match";
        }

        return "";
      }
    };

    let savedRequestCount = 0;
    let suggestionsRequestCount = 0;
    globalThis.fetch = async () => {
      savedRequestCount += 1;
      return {
        ok: false,
        status: 400,
        async json() {
          return {
            error: {
              message: "Mood is required.",
              details: []
            }
          };
        }
      };
    };

    const { form, submitButton } = createTestForm();
    const statusElement = new TestElement("p");
    initializeMoodForm({
      form,
      statusElement,
      onSaved: async () => {
        suggestionsRequestCount += 1;
      }
    });

    await form.listeners.submit({ preventDefault() {} });

    assert.equal(savedRequestCount, 1);
    assert.equal(suggestionsRequestCount, 0);
    assert.equal(submitButton.disabled, false);
    assert.equal(statusElement.textContent, "Mood is required.");
  });

  it("keeps the saved mood state when automatic suggestions fail", async () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      get(name) {
        const values = {
          mood: "calm",
          intensity: "4",
          energy: "5",
          note: "",
          musicMode: "match",
          targetMood: ""
        };
        return values[name] || "";
      }
    };

    globalThis.fetch = async () => ({
      ok: true,
      async json() {
        return { entry: { id: 42, mood: "calm" } };
      }
    });

    const { form, submitButton } = createTestForm();
    const statusElement = new TestElement("p");
    let savedEntry;
    initializeMoodForm({
      form,
      statusElement,
      onSaved: async (entry) => {
        savedEntry = entry;
        throw new Error("suggestions unavailable");
      }
    });

    await form.listeners.submit({ preventDefault() {} });

    assert.deepEqual(savedEntry, { id: 42, mood: "calm" });
    assert.equal(submitButton.disabled, false);
    assert.equal(statusElement.textContent, "Mood entry saved.");
  });

  it("prevents duplicate submissions while save and suggestions are running", async () => {
    globalThis.document = {
      createElement: (tagName) => new TestElement(tagName)
    };
    globalThis.FormData = class {
      get(name) {
        const values = {
          mood: "focused",
          intensity: "6",
          energy: "7",
          note: "",
          musicMode: "match",
          targetMood: ""
        };
        return values[name] || "";
      }
    };

    let saveCount = 0;
    let resolveSave;
    globalThis.fetch = async () => {
      saveCount += 1;
      return new Promise((resolve) => {
        resolveSave = () => resolve({
          ok: true,
          async json() {
            return { entry: { id: 7, mood: "focused" } };
          }
        });
      });
    };

    let resolveSuggestions;
    const { form, submitButton } = createTestForm();
    initializeMoodForm({
      form,
      statusElement: new TestElement("p"),
      onSaved: async () => new Promise((resolve) => {
        resolveSuggestions = resolve;
      })
    });

    const firstSubmit = form.listeners.submit({ preventDefault() {} });
    const secondSubmit = form.listeners.submit({ preventDefault() {} });

    assert.equal(saveCount, 1);
    assert.equal(submitButton.disabled, true);

    resolveSave();
    await nextTick();
    resolveSuggestions();
    await firstSubmit;
    await secondSubmit;

    assert.equal(saveCount, 1);
    assert.equal(submitButton.disabled, false);
  });
});
