const PLAYER_SCRIPT_SRC = "https://www.youtube.com/iframe_api";
const PLAYER_ERROR_MESSAGES = {
  2: "This video could not be loaded because its ID is invalid. Try another suggestion.",
  5: "This video cannot be played in this browser. Try another suggestion or open it on YouTube.",
  100: "This video is unavailable. Try another suggestion.",
  101: "This video cannot be embedded here. Try another suggestion or open it on YouTube.",
  150: "This video cannot be embedded here. Try another suggestion or open it on YouTube."
};

let apiReadyPromise;
let apiWindow;
let previousReadyCallback;

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function loadIframeApi(windowObject, documentObject) {
  if (windowObject.YT?.Player) {
    return Promise.resolve(windowObject.YT);
  }

  if (apiWindow !== windowObject) {
    apiReadyPromise = null;
    apiWindow = windowObject;
  }

  if (!apiReadyPromise) {
    apiReadyPromise = new Promise((resolve, reject) => {
      previousReadyCallback = windowObject.onYouTubeIframeAPIReady;
      windowObject.onYouTubeIframeAPIReady = () => {
        previousReadyCallback?.();
        resolve(windowObject.YT);
      };

      const existingScript = documentObject.querySelector?.(`script[src="${PLAYER_SCRIPT_SRC}"]`);
      if (!existingScript) {
        const script = documentObject.createElement("script");
        script.src = PLAYER_SCRIPT_SRC;
        script.async = true;
        script.onerror = () => {
          apiReadyPromise = null;
          reject(new Error("YouTube IFrame API failed to load."));
        };
        documentObject.head.append(script);
      }
    });
  }

  return apiReadyPromise;
}

function playerErrorMessage(code) {
  return PLAYER_ERROR_MESSAGES[code] || "The selected video could not be played. Try another suggestion.";
}

function playerStateMessage(state, windowObject) {
  const states = windowObject.YT?.PlayerState || {};

  if (state === states.PLAYING) {
    return "Playing selected suggestion.";
  }

  if (state === states.PAUSED) {
    return "Playback paused.";
  }

  if (state === states.ENDED) {
    return "Playback ended. Choose another suggestion to keep listening.";
  }

  if (state === states.BUFFERING) {
    return "Loading selected suggestion...";
  }

  if (state === states.CUED) {
    return "Player ready. Press play in the video to start.";
  }

  return null;
}

export function initializePlayer({
  container,
  statusElement,
  selectedElement,
  windowObject = globalThis.window,
  documentObject = globalThis.document
} = {}) {
  let player = null;
  let playerPromise = null;
  let playerReady = false;
  let pendingVideoId = null;
  let selectedSuggestion = null;

  async function ensurePlayer() {
    if (player) {
      return player;
    }

    if (playerPromise) {
      return playerPromise;
    }

    if (!container || !windowObject || !documentObject) {
      setText(statusElement, "The video player is not available.");
      return null;
    }

    setText(statusElement, "Loading YouTube player...");

    playerPromise = loadIframeApi(windowObject, documentObject)
      .then((yt) => {
        player = new yt.Player(container, {
          width: "100%",
          height: "100%",
          playerVars: {
            origin: windowObject.location?.origin || windowObject.location?.href || "",
            playsinline: 1
          },
          events: {
            onReady: (event) => {
              playerReady = true;

              if (pendingVideoId) {
                const videoId = pendingVideoId;
                pendingVideoId = null;
                setText(statusElement, "Loading selected suggestion...");
                (event?.target || player)?.loadVideoById(videoId);
                return;
              }

              setText(statusElement, selectedSuggestion
                ? "Player ready. Press play in the video to start."
                : "Player ready. Choose a suggestion to start playback.");
            },
            onStateChange: (event) => {
              const message = playerStateMessage(event.data, windowObject);
              if (message) {
                setText(statusElement, message);
              }
            },
            onError: (event) => {
              setText(statusElement, playerErrorMessage(event.data));
            },
            onAutoplayBlocked: () => {
              setText(statusElement, "Player ready. Press play in the video to start.");
            }
          }
        });

        return player;
      })
      .catch((error) => {
        playerPromise = null;
        throw error;
      });

    return playerPromise;
  }

  function loadSelectedVideo(activePlayer) {
    if (!pendingVideoId || !activePlayer || !playerReady) {
      return;
    }

    const videoId = pendingVideoId;
    pendingVideoId = null;
    activePlayer.loadVideoById(videoId);
  }

  return {
    async playSuggestion(suggestion) {
      if (!suggestion?.videoId) {
        setText(statusElement, "Choose a valid suggestion to play.");
        return;
      }

      selectedSuggestion = suggestion;
      pendingVideoId = suggestion.videoId;
      setText(selectedElement, `${suggestion.title} - ${suggestion.channelTitle}`);
      setText(statusElement, "Loading selected suggestion...");

      let activePlayer;
      try {
        activePlayer = await ensurePlayer();
      } catch {
        setText(statusElement, "The YouTube player could not be loaded. Try again later.");
        return;
      }

      loadSelectedVideo(activePlayer);
    },

    clearPlayer() {
      selectedSuggestion = null;
      pendingVideoId = null;
      setText(selectedElement, "");
      setText(statusElement, "Choose a suggestion to load the player.");
      player?.stopVideo?.();
    },

    _getPlayerForTests() {
      return player;
    }
  };
}
