import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { initializeMoodForm } from "../public/js/mood-form.js";
import { renderHistory } from "../public/js/history.js";

const originalDocument = globalThis.document;
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
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
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
});
