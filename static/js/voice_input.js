(function () {
  if (window.TaskflowVoiceInput) {
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let activeSession = null;

  function isSupported() {
    return Boolean(SpeechRecognition);
  }

  function stopActive() {
    if (!activeSession || !activeSession.recognition) {
      return;
    }

    activeSession.cancelled = true;
    try {
      activeSession.recognition.stop();
    } catch (error) {
      activeSession = null;
    }
  }

  function start(options) {
    const settings = options || {};
    if (!SpeechRecognition) {
      if (typeof settings.onUnsupported === "function") {
        settings.onUnsupported();
      }
      return null;
    }

    stopActive();

    const recognition = new SpeechRecognition();
    recognition.lang = settings.lang || navigator.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const session = {
      recognition,
      cancelled: false,
      error: null,
      finalText: "",
      transcript: "",
    };

    activeSession = session;

    recognition.onstart = function () {
      if (typeof settings.onStart === "function") {
        settings.onStart();
      }
    };

    recognition.onresult = function (event) {
      let finalText = "";
      let interimText = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const transcript = event.results[index][0] ? event.results[index][0].transcript : "";
        if (event.results[index].isFinal) {
          finalText += `${transcript} `;
        } else {
          interimText += transcript;
        }
      }

      session.finalText = finalText.trim();
      session.transcript = `${session.finalText} ${interimText}`.trim();

      if (typeof settings.onResult === "function") {
        settings.onResult({
          finalText: session.finalText,
          interimText: interimText.trim(),
          transcript: session.transcript,
        });
      }
    };

    recognition.onerror = function (event) {
      session.error = event.error || "unknown";
      if (typeof settings.onError === "function") {
        settings.onError(session.error);
      }
    };

    recognition.onend = function () {
      if (activeSession === session) {
        activeSession = null;
      }

      const transcript = (session.finalText || session.transcript || "").trim();
      if (!session.error && transcript && !session.cancelled && typeof settings.onComplete === "function") {
        settings.onComplete(transcript);
      }

      if (typeof settings.onEnd === "function") {
        settings.onEnd({
          transcript,
          error: session.error,
          cancelled: session.cancelled,
        });
      }
    };

    try {
      recognition.start();
    } catch (error) {
      activeSession = null;
      if (typeof settings.onError === "function") {
        settings.onError("start-failed");
      }
      if (typeof settings.onEnd === "function") {
        settings.onEnd({
          transcript: "",
          error: "start-failed",
          cancelled: false,
        });
      }
      return null;
    }

    return {
      stop: stopActive,
    };
  }

  window.TaskflowVoiceInput = {
    isSupported,
    start,
    stop: stopActive,
  };
})();
