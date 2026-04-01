(function () {
  if (window.TaskflowVoiceOutput) {
    return;
  }

  const synthesis = window.speechSynthesis || null;
  let activeUtterance = null;

  function isSupported() {
    return Boolean(synthesis && window.SpeechSynthesisUtterance);
  }

  function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function stop() {
    if (!isSupported()) {
      return;
    }
    synthesis.cancel();
    activeUtterance = null;
  }

  function speak(text, options) {
    const settings = options || {};
    const normalized = normalizeText(text);

    if (!isSupported() || !normalized) {
      if (typeof settings.onUnsupported === "function" && !isSupported()) {
        settings.onUnsupported();
      }
      return false;
    }

    stop();

    const utterance = new SpeechSynthesisUtterance(normalized);
    utterance.lang = settings.lang || navigator.language || "en-US";
    utterance.rate = typeof settings.rate === "number" ? settings.rate : 1;
    utterance.pitch = typeof settings.pitch === "number" ? settings.pitch : 1;
    utterance.volume = typeof settings.volume === "number" ? settings.volume : 1;

    utterance.onstart = function () {
      if (typeof settings.onStart === "function") {
        settings.onStart();
      }
    };

    utterance.onend = function () {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      if (typeof settings.onEnd === "function") {
        settings.onEnd();
      }
    };

    utterance.onerror = function (event) {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      if (typeof settings.onError === "function") {
        settings.onError(event && event.error ? event.error : "speak-failed");
      }
    };

    activeUtterance = utterance;
    synthesis.speak(utterance);
    return true;
  }

  function isSpeaking() {
    return Boolean(isSupported() && (synthesis.speaking || synthesis.pending));
  }

  window.addEventListener("beforeunload", stop);

  window.TaskflowVoiceOutput = {
    isSupported,
    speak,
    stop,
    isSpeaking,
  };
})();
