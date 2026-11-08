(function (root) {
  "use strict";

  var RB = root.ResumeBuilder;
  if (!RB || !RB.state) return;

  var workspace = document.getElementById("workspace");
  var templateNode = document.getElementById("overview-template");
  var sectionsNode = document.getElementById("overview-sections");
  var pagesNode = document.getElementById("overview-pages");
  var savedNode = document.getElementById("overview-saved");
  var noticeNode = document.getElementById("overview-notice");
  var settingsSaved = document.getElementById("settings-saved");
  var settingsFeedback = document.getElementById("settings-feedback");
  var fileInput = document.getElementById("resume-file");
  var confirmDialog = document.getElementById("confirm-dialog");
  var confirmTitle = document.getElementById("confirm-dialog-title");
  var confirmCopy = document.getElementById("confirm-dialog-copy");
  var confirmCancel = document.getElementById("confirm-dialog-cancel");
  var confirmAccept = document.getElementById("confirm-dialog-accept");
  var navButtons = Array.prototype.slice.call(document.querySelectorAll(".nav-pill [data-view]"));
  var templateCards = Array.prototype.slice.call(document.querySelectorAll("[data-template-choice]"));
  var headings = {
    editor: "editor-heading",
    templates: "templates-heading",
    preview: "preview-heading",
    settings: "settings-heading"
  };

  function prefersReducedMotion() {
    return root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function hasText(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function fieldFilled(fieldSpec, value) {
    if (fieldSpec.input === RB.LIST_INPUT) {
      return Array.isArray(value) && value.some(hasText);
    }
    return hasText(value);
  }

  function sectionFilled(section) {
    var sectionSpec = RB.getSectionSpec(section.type);
    if (!sectionSpec) return false;
    if (sectionSpec.kind === "fields") {
      return sectionSpec.fields.some(function (fieldSpec) {
        return fieldFilled(fieldSpec, section.fields[fieldSpec.key]);
      });
    }
    return section.entries.some(function (entry) {
      return sectionSpec.fields.some(function (fieldSpec) {
        return fieldFilled(fieldSpec, entry[fieldSpec.key]);
      });
    });
  }

  var lastPageCount = 1;

  function pageCount() {
    var pages = document.querySelectorAll("#preview-root .page");
    if (!pages.length) return lastPageCount;
    lastPageCount = pages.length;
    return lastPageCount;
  }

  function updatePages() {
    if (pagesNode) pagesNode.textContent = String(pageCount());
  }

  function updateOverview(resume) {
    var completed = resume.sections.filter(sectionFilled).length;
    if (templateNode) templateNode.textContent = RB.templateLabel(resume.template);
    if (sectionsNode) sectionsNode.textContent = completed + " of " + resume.sections.length;
    templateCards.forEach(function (card) {
      var selected = card.getAttribute("data-template-choice") === resume.template;
      card.classList.toggle("is-selected", selected);
      if (!card.disabled) card.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    updatePages();
  }

  function showView(view, options) {
    if (!workspace || !headings[view]) return;
    workspace.setAttribute("data-view", view);
    navButtons.forEach(function (button) {
      if (button.getAttribute("data-view") === view) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (!prefersReducedMotion()) {
      workspace.classList.remove("is-entering");
      root.requestAnimationFrame(function () {
        workspace.classList.add("is-entering");
      });
    }
    if (options && options.scroll) {
      workspace.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start"
      });
    }
    if (options && options.focus) {
      var heading = document.getElementById(headings[view]);
      if (heading) heading.focus({ preventScroll: true });
    }
    root.requestAnimationFrame(function () {
      updatePages();
      if (typeof RB.refreshPreviewScale === "function") RB.refreshPreviewScale();
    });
  }

  var printDialog = document.getElementById("print-dialog");

  function exportPdf() {
    if (!printDialog || typeof printDialog.showModal !== "function") {
      root.print();
      return;
    }
    if (printDialog.open) return;
    printDialog.showModal();
  }

  if (printDialog) {
    printDialog.addEventListener("close", function () {
      if (printDialog.returnValue === "confirm") root.print();
    });
  }

  navButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      showView(button.getAttribute("data-view"), { scroll: true, focus: true });
    });
  });

  document.querySelectorAll("[data-open-view]").forEach(function (button) {
    button.addEventListener("click", function () {
      showView(button.getAttribute("data-open-view"), { scroll: true, focus: true });
    });
  });

  document.querySelectorAll("[data-export='pdf']").forEach(function (button) {
    button.addEventListener("click", exportPdf);
  });

  templateCards.forEach(function (card) {
    card.addEventListener("click", function () {
      if (card.disabled) return;
      var choice = card.getAttribute("data-template-choice");
      if (RB.state.getDocument().template === choice) return;
      RB.state.setTemplate(choice);
    });
  });

  RB.state.subscribe(function (resume) {
    updateOverview(resume);
    root.requestAnimationFrame(updatePages);
  });

  root.addEventListener("resize", function () {
    root.requestAnimationFrame(updatePages);
  });

  function showNotice(text, kind) {
    [noticeNode, settingsFeedback].forEach(function (node) {
      if (!node) return;
      var base = node === noticeNode ? "overview-notice" : "settings-feedback";
      if (!text) {
        node.hidden = true;
        node.textContent = "";
        node.className = base;
        delete node.dataset.kind;
        return;
      }
      node.hidden = false;
      node.textContent = text;
      node.className = base + (kind === "error" || kind === "storage" ? " is-error" : kind === "success" ? " is-success" : "");
      node.dataset.kind = kind || "success";
    });
  }

  function formatWhen(iso) {
    if (!iso) return "";
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    try {
      return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch (error) {
      return date.toLocaleString();
    }
  }

  function settingsSaveText(key, status) {
    if (key === "saving") return "Saving...";
    if (key === "saved") {
      var when = formatWhen(status && status.savedAt);
      return when ? "Last saved " + when + "." : "Saved on this device.";
    }
    if (key === "failed") {
      return status && status.message ? status.message : "Save failed. The resume on screen was kept.";
    }
    return "Not saved on this device.";
  }

  function applySaveStatus(status) {
    var labels = {
      saving: "Saving...",
      saved: "Saved on this device",
      unsaved: "Not saved on this device",
      failed: "Save failed"
    };
    var key = status && labels[status.state] ? status.state : "unsaved";
    if (savedNode) {
      savedNode.textContent = labels[key];
      savedNode.setAttribute("data-save-state", key);
    }
    if (settingsSaved) settingsSaved.textContent = settingsSaveText(key, status);
    if (key === "saved" && noticeNode && noticeNode.dataset.kind === "storage") showNotice("");
  }

  function askDialog(options) {
    return new Promise(function (resolve) {
      if (!confirmDialog || typeof confirmDialog.showModal !== "function") {
        if (options.hideCancel) {
          if (typeof root.alert === "function") root.alert(options.copy);
          resolve(true);
          return;
        }
        resolve(typeof root.confirm === "function" ? root.confirm(options.copy) : false);
        return;
      }
      if (confirmDialog.open) {
        resolve(false);
        return;
      }
      if (confirmTitle) confirmTitle.textContent = options.title;
      if (confirmCopy) confirmCopy.textContent = options.copy;
      if (confirmAccept) confirmAccept.textContent = options.confirmLabel || "Continue";
      if (confirmCancel) confirmCancel.hidden = Boolean(options.hideCancel);
      function finish() {
        confirmDialog.removeEventListener("close", finish);
        resolve(confirmDialog.returnValue === "confirm");
      }
      confirmDialog.returnValue = "";
      confirmDialog.addEventListener("close", finish);
      confirmDialog.showModal();
    });
  }

  function reportProblem(title, message) {
    showNotice(message, "error");
    askDialog({
      title: title,
      copy: message,
      confirmLabel: "OK",
      hideCancel: true
    });
  }

  function downloadJson() {
    if (typeof RB.downloadResume !== "function") return;
    var result = RB.downloadResume(RB.state.getDocument());
    if (!result.ok) {
      reportProblem("Download failed", result.error || "This resume could not be downloaded.");
      return;
    }
    showNotice("Downloaded " + result.filename + ".", "success");
  }

  function importFile(file) {
    if (typeof RB.readResumeFile !== "function") return;
    RB.readResumeFile(file).then(function (result) {
      if (!result.ok) {
        reportProblem("Could not load resume", result.error || "This file could not be loaded.");
        return;
      }
      var label = file.name || "this file";
      askDialog({
        title: "Replace the current resume?",
        copy: "The resume on screen will be replaced with " + label + ". Cancel keeps the current resume.",
        confirmLabel: "Replace resume"
      }).then(function (yes) {
        if (!yes) {
          showNotice("Import cancelled. The current resume was kept.", "info");
          return;
        }
        var replaced = RB.state.replaceDocument(result.document);
        if (!replaced.ok) {
          reportProblem("Could not load resume", replaced.error || "This file could not be loaded.");
          return;
        }
        showNotice("Loaded " + label + ".", "success");
        askDialog({
          title: "Resume loaded",
          copy: "The editor and preview now show the imported resume.",
          confirmLabel: "OK",
          hideCancel: true
        });
        root.requestAnimationFrame(function () {
          updatePages();
          if (typeof RB.refreshPreviewScale === "function") RB.refreshPreviewScale();
        });
      });
    });
  }

  function clearSaved() {
    askDialog({
      title: "Clear saved data?",
      copy: "This removes the resume stored in this browser. The resume on screen stays. After a refresh, the sample resume loads until you edit again.",
      confirmLabel: "Clear saved data"
    }).then(function (yes) {
      if (!yes) return;
      if (RB.autosave && typeof RB.autosave.cancelPending === "function") RB.autosave.cancelPending();
      var cleared = typeof RB.clearSavedResume === "function" ? RB.clearSavedResume() : { ok: false, message: "Saved data could not be cleared." };
      if (!cleared.ok) {
        applySaveStatus({ state: "failed", message: cleared.message });
        showNotice(cleared.message, "error");
        return;
      }
      applySaveStatus({ state: "unsaved" });
      showNotice("Saved data was cleared from this browser.", "success");
    });
  }

  document.querySelectorAll("[data-export='json']").forEach(function (button) {
    button.addEventListener("click", downloadJson);
  });

  document.querySelectorAll("[data-import='json']").forEach(function (button) {
    button.addEventListener("click", function () {
      if (fileInput) fileInput.click();
    });
  });

  document.querySelectorAll("[data-clear-storage]").forEach(function (button) {
    button.addEventListener("click", clearSaved);
  });

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (file) importFile(file);
    });
  }

  RB.applySaveStatus = applySaveStatus;
  var boot = RB.boot || { status: "empty", savedAt: "", notice: "" };
  if (boot.status === "saved") applySaveStatus({ state: "saved", savedAt: boot.savedAt });
  else applySaveStatus({ state: "unsaved" });
  if (boot.notice) {
    showNotice(boot.notice, "storage");
    askDialog({
      title: "Saved resume was not used",
      copy: boot.notice,
      confirmLabel: "OK",
      hideCancel: true
    });
  }
  if (RB.autosave && typeof RB.autosave.start === "function") RB.autosave.start();
})(typeof window !== "undefined" ? window : globalThis);
