(function (root) {
  "use strict";

  var RB = root.ResumeBuilder;
  if (!RB || !RB.state) return;

  var workspace = document.getElementById("workspace");
  var templateNode = document.getElementById("overview-template");
  var sectionsNode = document.getElementById("overview-sections");
  var pagesNode = document.getElementById("overview-pages");
  var savedNode = document.getElementById("overview-saved");
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
    if (savedNode) savedNode.textContent = "Not saved on this device";
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
})(typeof window !== "undefined" ? window : globalThis);
