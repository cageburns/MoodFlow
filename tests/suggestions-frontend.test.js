import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { initializeSuggestions } from "../public/js/suggestions.js";

const originalDocument = globalThis.document;
const originalFetch = globalThis.fetch;

class TestElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.disabled = false;
    this.href = "";
    this.target = "";
    this.rel = "";
    this.type = "";
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

  click() {
    this.listeners.click?.();
  }
}

function createSuggestion(videoId, title = "Song Official Video") {
  return {
    videoId,
    title,
    channelTitle: "ArtistVEVO",
    thumbnailUrl: null,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    reason: "Selected to match calm with medium intensity and medium energy."
  };
}

function installDocument() {
  globalThis.document = {
    createElement(tagName) {
      return new TestElement(tagName);
    }
  };
}

function successResponse(body) {
  return {
    ok: true,
    async json() {
      return body;
    }
  };
}

afterEach(() => {
  globalThis.document = originalDocument;
  globalThis.fetch = originalFetch;
});

describe("Phase 5 suggestions frontend behavior", () => {
  it("requires an explicit click before requesting suggestions", async () => {
    installDocument();
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount += 1;
      return successResponse({ suggestions: [createSuggestion("abc123")] });
    };
    const button = new TestElement("button");
    const listElement = new TestElement("div");

    initializeSuggestions({
      button,
      listElement,
      statusElement: new TestElement("p"),
      player: { clearPlayer() {}, playSuggestion() {} }
    });

    assert.equal(button.disabled, true);
    assert.equal(fetchCount, 0);
  });

  it("requests suggestions for the saved mood entry and plays a selected result", async () => {
    installDocument();
    let requestedBody;
    const played = [];
    globalThis.fetch = async (path, options) => {
      requestedBody = JSON.parse(options.body);
      assert.equal(path, "/api/music/suggestions");
      return successResponse({
        suggestions: [
          createSuggestion("first", "First Official Video"),
          createSuggestion("second", "Second Official Audio")
        ]
      });
    };
    const button = new TestElement("button");
    const listElement = new TestElement("div");
    const statusElement = new TestElement("p");
    const controller = initializeSuggestions({
      button,
      listElement,
      statusElement,
      player: {
        clearPlayer() {},
        playSuggestion(suggestion) {
          played.push(suggestion.videoId);
        }
      }
    });

    controller.setMoodEntry({ id: 42 });
    assert.equal(button.disabled, false);

    await button.listeners.click();
    assert.deepEqual(requestedBody, { moodEntryId: 42 });
    assert.equal(listElement.children.length, 2);
    assert.equal(statusElement.textContent, "Choose a suggestion to play.");

    const firstCard = listElement.children[0];
    const playButton = firstCard.children[3];
    playButton.click();

    assert.deepEqual(played, ["first"]);
    assert.match(listElement.children[0].className, /is-selected/);
  });

  it("switches selected suggestions and clears the player when new results arrive", async () => {
    installDocument();
    let requestNumber = 0;
    const played = [];
    let clearCount = 0;
    globalThis.fetch = async () => {
      requestNumber += 1;
      return successResponse({
        suggestions: requestNumber === 1
          ? [
              createSuggestion("first", "First Official Video"),
              createSuggestion("second", "Second Official Audio")
            ]
          : [createSuggestion("third", "Third Official Video")]
      });
    };
    const button = new TestElement("button");
    const listElement = new TestElement("div");
    const controller = initializeSuggestions({
      button,
      listElement,
      statusElement: new TestElement("p"),
      player: {
        clearPlayer() {
          clearCount += 1;
        },
        playSuggestion(suggestion) {
          played.push(suggestion.videoId);
        }
      }
    });

    controller.setMoodEntry({ id: 9 });
    await button.listeners.click();
    listElement.children[0].children[3].click();
    listElement.children[1].children[3].click();

    assert.deepEqual(played, ["first", "second"]);
    assert.doesNotMatch(listElement.children[0].className, /is-selected/);
    assert.match(listElement.children[1].className, /is-selected/);

    await button.listeners.click();

    assert.equal(clearCount, 3);
    assert.equal(listElement.children.length, 1);
    assert.doesNotMatch(listElement.children[0].className, /is-selected/);
  });

  it("prevents parallel duplicate suggestion requests", async () => {
    installDocument();
    let fetchCount = 0;
    let resolveFetch;
    globalThis.fetch = async () => {
      fetchCount += 1;
      return new Promise((resolve) => {
        resolveFetch = () => resolve(successResponse({ suggestions: [createSuggestion("abc123")] }));
      });
    };
    const button = new TestElement("button");
    const controller = initializeSuggestions({
      button,
      listElement: new TestElement("div"),
      statusElement: new TestElement("p"),
      player: { clearPlayer() {}, playSuggestion() {} }
    });

    controller.setMoodEntry({ id: 7 });
    const firstRequest = button.listeners.click();
    const secondRequest = button.listeners.click();

    assert.equal(fetchCount, 1);
    resolveFetch();
    await firstRequest;
    await secondRequest;
  });

  it("renders controlled errors and fallback links", async () => {
    installDocument();
    globalThis.fetch = async () => ({
      ok: false,
      status: 503,
      async json() {
        return {
          error: {
            code: "YOUTUBE_UNAVAILABLE",
            message: "Music suggestions are temporarily unavailable.",
            details: []
          }
        };
      }
    });
    const button = new TestElement("button");
    const listElement = new TestElement("div");
    const statusElement = new TestElement("p");
    const controller = initializeSuggestions({
      button,
      listElement,
      statusElement,
      player: { clearPlayer() {}, playSuggestion() {} }
    });

    controller.setMoodEntry({ id: 7 });
    await button.listeners.click();

    assert.equal(statusElement.textContent, "Music suggestions are temporarily unavailable.");
    assert.equal(listElement.children[0].textContent, "Music suggestions are temporarily unavailable.");
  });

  it("renders an external YouTube fallback link for each suggestion", async () => {
    installDocument();
    globalThis.fetch = async () => successResponse({
      suggestions: [createSuggestion("abc123")]
    });
    const button = new TestElement("button");
    const listElement = new TestElement("div");
    const controller = initializeSuggestions({
      button,
      listElement,
      statusElement: new TestElement("p"),
      player: { clearPlayer() {}, playSuggestion() {} }
    });

    controller.setMoodEntry({ id: 7 });
    await button.listeners.click();

    const link = listElement.children[0].children[4];
    assert.equal(link.href, "https://www.youtube.com/watch?v=abc123");
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
  });
});
