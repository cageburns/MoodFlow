import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initializePlayer } from "../public/js/player.js";

class TestElement {
  constructor(tagName = "div") {
    this.tagName = tagName;
    this.children = [];
    this.textContent = "";
    this.src = "";
    this.async = false;
  }

  append(...children) {
    this.children.push(...children);
  }
}

function createDocument() {
  const scripts = [];
  return {
    head: {
      append(script) {
        scripts.push(script);
      }
    },
    createElement(tagName) {
      return new TestElement(tagName);
    },
    querySelector() {
      return null;
    },
    scripts
  };
}

function createReadyWindow(loadedVideos) {
  return {
    location: { origin: "http://moodflow.test" },
    YT: {
      PlayerState: {
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        ENDED: 0
      },
      Player: class {
        constructor(container, options) {
          this.container = container;
          this.options = options;
          this.loadedVideos = loadedVideos;
          options.events.onReady();
        }

        loadVideoById(videoId) {
          this.loadedVideos.push(videoId);
        }

        stopVideo() {
          this.stopped = true;
        }
      }
    }
  };
}

describe("Phase 5 player frontend behavior", () => {
  it("does not load the YouTube API or a video before a suggestion is selected", () => {
    const documentObject = createDocument();
    const windowObject = { location: { origin: "http://moodflow.test" } };
    const player = initializePlayer({
      container: new TestElement("div"),
      statusElement: new TestElement("p"),
      selectedElement: new TestElement("p"),
      windowObject,
      documentObject
    });

    assert.equal(documentObject.scripts.length, 0);
    assert.equal(player._getPlayerForTests(), null);
  });

  it("loads the IFrame API once and plays the selected suggestion", async () => {
    const documentObject = createDocument();
    const windowObject = { location: { origin: "http://moodflow.test" } };
    const loadedVideos = [];
    const statusElement = new TestElement("p");
    const selectedElement = new TestElement("p");
    const player = initializePlayer({
      container: new TestElement("div"),
      statusElement,
      selectedElement,
      windowObject,
      documentObject
    });

    const playPromise = player.playSuggestion({
      videoId: "abc123",
      title: "Example Official Video",
      channelTitle: "ExampleVEVO"
    });

    assert.equal(documentObject.scripts.length, 1);
    assert.equal(documentObject.scripts[0].src, "https://www.youtube.com/iframe_api");

    windowObject.YT = createReadyWindow(loadedVideos).YT;
    windowObject.onYouTubeIframeAPIReady();
    await playPromise;

    assert.deepEqual(loadedVideos, ["abc123"]);
    assert.equal(selectedElement.textContent, "Example Official Video - ExampleVEVO");
    assert.equal(player._getPlayerForTests().options.playerVars.origin, "http://moodflow.test");
  });

  it("reuses one player when switching suggestions", async () => {
    const loadedVideos = [];
    const windowObject = createReadyWindow(loadedVideos);
    const player = initializePlayer({
      container: new TestElement("div"),
      statusElement: new TestElement("p"),
      selectedElement: new TestElement("p"),
      windowObject,
      documentObject: createDocument()
    });

    await player.playSuggestion({
      videoId: "first",
      title: "First Song",
      channelTitle: "Artist"
    });
    const firstPlayerInstance = player._getPlayerForTests();
    await player.playSuggestion({
      videoId: "second",
      title: "Second Song",
      channelTitle: "Artist"
    });

    assert.equal(player._getPlayerForTests(), firstPlayerInstance);
    assert.deepEqual(loadedVideos, ["first", "second"]);
  });

  it("shows player errors and still allows another suggestion to be tried", async () => {
    const loadedVideos = [];
    const statusElement = new TestElement("p");
    const windowObject = createReadyWindow(loadedVideos);
    const player = initializePlayer({
      container: new TestElement("div"),
      statusElement,
      selectedElement: new TestElement("p"),
      windowObject,
      documentObject: createDocument()
    });

    await player.playSuggestion({
      videoId: "unavailable",
      title: "Unavailable Song",
      channelTitle: "Artist"
    });
    player._getPlayerForTests().options.events.onError({ data: 100 });
    assert.equal(statusElement.textContent, "This video is unavailable. Try another suggestion.");

    await player.playSuggestion({
      videoId: "fallback",
      title: "Fallback Song",
      channelTitle: "Artist"
    });

    assert.deepEqual(loadedVideos, ["unavailable", "fallback"]);
  });

  it("reports player state changes and stops playback when cleared", async () => {
    const loadedVideos = [];
    const statusElement = new TestElement("p");
    const selectedElement = new TestElement("p");
    const windowObject = createReadyWindow(loadedVideos);
    const player = initializePlayer({
      container: new TestElement("div"),
      statusElement,
      selectedElement,
      windowObject,
      documentObject: createDocument()
    });

    await player.playSuggestion({
      videoId: "abc123",
      title: "Example Song",
      channelTitle: "ArtistVEVO"
    });

    const playerInstance = player._getPlayerForTests();
    playerInstance.options.events.onStateChange({ data: windowObject.YT.PlayerState.BUFFERING });
    assert.equal(statusElement.textContent, "Loading selected suggestion...");
    playerInstance.options.events.onStateChange({ data: windowObject.YT.PlayerState.PLAYING });
    assert.equal(statusElement.textContent, "Playing selected suggestion.");
    playerInstance.options.events.onStateChange({ data: windowObject.YT.PlayerState.ENDED });
    assert.equal(statusElement.textContent, "Playback ended. Choose another suggestion to keep listening.");

    player.clearPlayer();

    assert.equal(selectedElement.textContent, "");
    assert.equal(statusElement.textContent, "Choose a suggestion to load the player.");
    assert.equal(playerInstance.stopped, true);
  });

  it("shows a controlled message when the IFrame API cannot initialize", async () => {
    const documentObject = createDocument();
    const statusElement = new TestElement("p");
    const player = initializePlayer({
      container: new TestElement("div"),
      statusElement,
      selectedElement: new TestElement("p"),
      windowObject: { location: { origin: "http://moodflow.test" } },
      documentObject
    });

    const playPromise = player.playSuggestion({
      videoId: "abc123",
      title: "Example Song",
      channelTitle: "Artist"
    });
    documentObject.scripts[0].onerror();
    await playPromise;

    assert.equal(statusElement.textContent, "The YouTube player could not be loaded. Try again later.");
    assert.equal(player._getPlayerForTests(), null);
  });
});
