/* Saves the resume document in this browser and restores it on the next visit. */
(function (root) {
  "use strict";

  var RB = root.ResumeBuilder = root.ResumeBuilder || {};
  var STORAGE_KEY = "resume-builder:v1";
  var SAVE_DELAY_MS = 400;

  function isBlockedKey(key) {
    return key === "__proto__" || key === "prototype" || key === "constructor";
  }

  function blockedReviver(key, value) {
    if (isBlockedKey(key)) throw new Error("blocked-key");
    return value;
  }

  function storageError(error) {
    var name = error && error.name;
    var quota = name === "QuotaExceededError" ||
      name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      (error && error.code === 22);
    return {
      ok: false,
      quota: Boolean(quota),
      message: quota
        ? "This browser ran out of space for the saved resume."
        : "This browser blocked saving on this device."
    };
  }

  function unavailable(message) {
    return {
      ok: false,
      status: "unavailable",
      document: null,
      savedAt: "",
      message: message || "This browser cannot save on this device."
    };
  }

  function corrupt() {
    return {
      ok: false,
      status: "corrupt",
      document: null,
      savedAt: "",
      message: "The saved resume on this device could not be read, so the sample resume was loaded."
    };
  }

  function readStore() {
    try {
      if (!root.localStorage) return { ok: false, store: null };
      return { ok: true, store: root.localStorage };
    } catch (error) {
      return { ok: false, store: null, error: error };
    }
  }

  function documentFromStored(parsed) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (
      Object.prototype.hasOwnProperty.call(parsed, "document") &&
      Object.prototype.hasOwnProperty.call(parsed, "savedAt") &&
      !Object.prototype.hasOwnProperty.call(parsed, "sections")
    ) {
      return {
        document: parsed.document,
        savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : ""
      };
    }
    return { document: parsed, savedAt: "" };
  }

  function loadResume() {
    var access = readStore();
    if (!access.ok) return unavailable();
    var raw;
    try {
      raw = access.store.getItem(STORAGE_KEY);
    } catch (error) {
      return unavailable(storageError(error).message);
    }
    if (raw == null || raw === "") {
      return { ok: true, status: "empty", document: null, savedAt: "", message: "" };
    }
    var parsed;
    try {
      parsed = JSON.parse(raw, blockedReviver);
    } catch (error) {
      return corrupt();
    }
    var stored = documentFromStored(parsed);
    if (!stored || typeof RB.validateDocument !== "function") return corrupt();
    var check = RB.validateDocument(stored.document);
    if (!check.ok) return corrupt();
    return {
      ok: true,
      status: "saved",
      document: stored.document,
      savedAt: stored.savedAt,
      message: ""
    };
  }

  function saveDocument(document) {
    if (typeof RB.validateDocument !== "function" || typeof RB.exportDocument !== "function") {
      return { ok: false, message: "Save failed" };
    }
    var check = RB.validateDocument(document);
    if (!check.ok) return { ok: false, message: "Save failed" };
    var payload = RB.exportDocument(document);
    if (!payload) return { ok: false, message: "Save failed" };
    var access = readStore();
    if (!access.ok) return { ok: false, message: "This browser cannot save on this device." };
    var savedAt = new Date().toISOString();
    try {
      access.store.setItem(STORAGE_KEY, JSON.stringify({
        savedAt: savedAt,
        document: payload
      }));
    } catch (error) {
      return storageError(error);
    }
    var confirmed;
    try {
      confirmed = access.store.getItem(STORAGE_KEY);
    } catch (error) {
      return storageError(error);
    }
    if (confirmed == null) return { ok: false, message: "Save failed" };
    return { ok: true, savedAt: savedAt };
  }

  function clearSavedResume() {
    var access = readStore();
    if (!access.ok) return { ok: false, message: "This browser cannot clear saved data." };
    try {
      access.store.removeItem(STORAGE_KEY);
    } catch (error) {
      return { ok: false, message: storageError(error).message };
    }
    return { ok: true };
  }

  function installAutosave(state, notify) {
    var timer = null;
    var dirty = false;
    var enabled = false;
    var token = 0;

    function emit(status) {
      if (typeof notify === "function") {
        try {
          notify(status);
        } catch (error) {
          if (root.console && typeof root.console.error === "function") root.console.error(error);
        }
      }
    }

    function writeNow() {
      var current = token;
      var result = saveDocument(state.getDocument());
      if (current !== token) return result;
      if (result.ok) {
        dirty = false;
        emit({ state: "saved", savedAt: result.savedAt });
      } else {
        dirty = true;
        emit({ state: "failed", message: result.message || "Save failed" });
      }
      return result;
    }

    function schedule() {
      if (!enabled) return;
      dirty = true;
      if (timer) root.clearTimeout(timer);
      emit({ state: "saving" });
      var scheduled = token;
      timer = root.setTimeout(function () {
        timer = null;
        if (scheduled !== token) return;
        writeNow();
      }, SAVE_DELAY_MS);
    }

    state.subscribe(function () {
      schedule();
    });

    function flush() {
      if (!enabled || !dirty) return;
      if (timer) {
        root.clearTimeout(timer);
        timer = null;
      }
      writeNow();
    }

    function onHide() {
      flush();
    }

    if (typeof root.addEventListener === "function") {
      root.addEventListener("pagehide", onHide);
      root.addEventListener("beforeunload", onHide);
      root.addEventListener("visibilitychange", function () {
        if (root.document && root.document.visibilityState === "hidden") flush();
      });
    }

    return {
      start: function () {
        enabled = true;
      },
      flush: flush,
      cancelPending: function () {
        token += 1;
        dirty = false;
        if (timer) {
          root.clearTimeout(timer);
          timer = null;
        }
      }
    };
  }

  RB.STORAGE_KEY = STORAGE_KEY;
  RB.SAVE_DELAY_MS = SAVE_DELAY_MS;
  RB.loadResume = loadResume;
  RB.saveDocument = saveDocument;
  RB.clearSavedResume = clearSavedResume;
  RB.installAutosave = installAutosave;
})(typeof window !== "undefined" ? window : globalThis);
