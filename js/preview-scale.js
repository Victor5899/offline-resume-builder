/* Fits the on-screen A4 preview to the pane. Page boxes stay 210mm by 297mm. */
(function (root) {
  "use strict";

  var RB = root.ResumeBuilder = root.ResumeBuilder || {};
  var stage = null;
  var signature = "";
  var suspended = false;
  var framePending = false;

  function contentWidth(node) {
    var style = root.getComputedStyle(node);
    var padL = parseFloat(style.paddingLeft) || 0;
    var padR = parseFloat(style.paddingRight) || 0;
    return Math.max(0, node.clientWidth - padL - padR);
  }

  function ensureFrames(node) {
    var sheets = Array.prototype.slice.call(node.querySelectorAll(":scope > .sheet"));
    sheets.forEach(function (sheet) {
      var frame = root.document.createElement("div");
      frame.className = "sheet-frame";
      var label = sheet.querySelector(":scope > .sheet-label");
      var scaler = root.document.createElement("div");
      scaler.className = "sheet-scaler";
      node.insertBefore(frame, sheet);
      if (label) frame.appendChild(label);
      frame.appendChild(scaler);
      scaler.appendChild(sheet);
    });
  }

  function clearFrameSizes(node) {
    Array.prototype.forEach.call(node.querySelectorAll(":scope > .sheet-frame"), function (frame) {
      var scaler = frame.querySelector(":scope > .sheet-scaler");
      if (!scaler) return;
      scaler.style.width = "";
      scaler.style.height = "";
    });
    signature = "";
  }

  function apply(node) {
    if (!node || suspended) return;
    if (node.clientWidth < 8) {
      signature = "";
      return;
    }
    ensureFrames(node);
    var page = node.querySelector(".sheet-scaler .page") || node.querySelector(".page");
    if (!page) return;
    var pageWidth = page.offsetWidth;
    if (pageWidth < 8) return;
    var available = contentWidth(node) - 1;
    if (available < 8) return;
    var scale = available >= pageWidth ? 1 : Math.floor((available / pageWidth) * 1000) / 1000;
    if (scale <= 0) return;
    var frames = node.querySelectorAll(":scope > .sheet-frame");
    var pending = false;
    for (var index = 0; index < frames.length; index += 1) {
      var existing = frames[index].querySelector(":scope > .sheet-scaler");
      if (!existing || !existing.style.width) pending = true;
    }
    var nextSignature = String(scale) + ":" + frames.length + ":" + String(pageWidth);
    if (!pending && nextSignature === signature) return;
    signature = nextSignature;
    node.style.setProperty("--preview-scale", String(scale));
    Array.prototype.forEach.call(frames, function (frame) {
      var scaler = frame.querySelector(":scope > .sheet-scaler");
      var sheet = scaler && scaler.querySelector(":scope > .sheet");
      if (!scaler || !sheet) return;
      var width = scale === 1 ? pageWidth : Math.max(1, Math.floor(pageWidth * scale));
      var height = Math.max(1, Math.ceil(sheet.offsetHeight * scale));
      scaler.style.width = width + "px";
      scaler.style.height = height + "px";
      frame.style.setProperty("--frame-width", width + "px");
    });
  }

  function schedule(node) {
    if (!node || framePending) return;
    framePending = true;
    var target = node;
    root.requestAnimationFrame(function () {
      framePending = false;
      apply(target);
    });
  }

  function suspend() {
    suspended = true;
    if (!stage) return;
    stage.classList.add("is-print-preview");
    clearFrameSizes(stage);
  }

  function resume() {
    if (!suspended && stage && !stage.classList.contains("is-print-preview")) return;
    suspended = false;
    if (!stage) return;
    stage.classList.remove("is-print-preview");
    signature = "";
    apply(stage);
  }

  function bind(node) {
    if (!node || node.dataset.scaleBound === "1") return;
    node.dataset.scaleBound = "1";
    stage = node;
    if (typeof root.ResizeObserver === "function") {
      var observer = new root.ResizeObserver(function () {
        schedule(node);
      });
      observer.observe(node);
      if (node.parentElement) observer.observe(node.parentElement);
    }
    root.addEventListener("resize", function () {
      schedule(node);
    });
    root.addEventListener("beforeprint", suspend);
    root.addEventListener("afterprint", resume);
  }

  function refreshPreviewScale(container) {
    var node = container || stage;
    if (!node && root.document) node = root.document.getElementById("preview-root");
    if (!node) return;
    if (node.dataset.scaleBound !== "1") bind(node);
    if (suspended) return;
    apply(node);
  }

  RB.refreshPreviewScale = refreshPreviewScale;

  if (root.document && typeof root.document.getElementById === "function") {
    var initial = root.document.getElementById("preview-root");
    if (initial) bind(initial);
  }
})(typeof window !== "undefined" ? window : globalThis);
