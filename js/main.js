(function (root) {
  "use strict";

  var RB = root.ResumeBuilder;
  if (!RB || typeof RB.createState !== "function" || typeof RB.createSampleResume !== "function") {
    throw new Error("Resume Builder scripts loaded out of order");
  }

  var editorRoot = document.getElementById("editor-root");
  var previewRoot = document.getElementById("preview-root");
  if (!editorRoot || !previewRoot) throw new Error("Resume Builder shell is missing");

  var boot = typeof RB.loadResume === "function" ? RB.loadResume() : { status: "empty", document: null, savedAt: "", message: "" };
  var notice = "";
  var initial = boot.document;
  if (!initial) {
    initial = RB.createSampleResume();
    if (boot.status === "corrupt" || boot.status === "unavailable") notice = boot.message;
  }

  var state;
  try {
    state = RB.createState(initial);
  } catch (error) {
    state = RB.createState(RB.createSampleResume());
    notice = "The saved resume on this device could not be read, so the sample resume was loaded.";
    boot = { status: "corrupt", document: null, savedAt: "", message: notice };
  }

  state.subscribe(function (resume) {
    var previewScroll = previewRoot.scrollTop;
    RB.renderEditor(editorRoot, resume, state);
    RB.renderResume(previewRoot, resume);
    previewRoot.scrollTop = previewScroll;
  });

  RB.state = state;
  RB.boot = {
    status: boot.status || "empty",
    savedAt: boot.savedAt || "",
    notice: notice
  };
  if (typeof RB.installAutosave === "function") {
    RB.autosave = RB.installAutosave(state, function (status) {
      if (typeof RB.applySaveStatus === "function") RB.applySaveStatus(status);
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
