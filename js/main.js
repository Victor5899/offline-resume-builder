(function (root) {
  "use strict";

  var RB = root.ResumeBuilder;
  if (!RB || typeof RB.createState !== "function" || typeof RB.createSampleResume !== "function") {
    throw new Error("Resume Builder scripts loaded out of order");
  }

  var editorRoot = document.getElementById("editor-root");
  var previewRoot = document.getElementById("preview-root");
  if (!editorRoot || !previewRoot) throw new Error("Resume Builder shell is missing");

  var state = RB.createState(RB.createSampleResume());

  state.subscribe(function (resume) {
    var previewScroll = previewRoot.scrollTop;
    RB.renderEditor(editorRoot, resume, state);
    RB.renderResume(previewRoot, resume);
    previewRoot.scrollTop = previewScroll;
  });

  RB.state = state;
})(typeof window !== "undefined" ? window : globalThis);
