(function (root) {
  "use strict";

  var RB = root.ResumeBuilder = root.ResumeBuilder || {};

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function textPair(label, value) {
    var row = el("div");
    var term = el("dt");
    term.textContent = label;
    var description = el("dd");
    description.textContent = value;
    row.appendChild(term);
    row.appendChild(description);
    return row;
  }

  function displayValue(fieldSpec, value) {
    if (fieldSpec.input === RB.LIST_INPUT) {
      return value.length ? value.join(", ") : "";
    }
    return typeof value === "string" ? value.trim() : "";
  }

  function appendFields(list, sectionSpec, source) {
    sectionSpec.fields.forEach(function (fieldSpec) {
      var value = displayValue(fieldSpec, source[fieldSpec.key]);
      if (!value) return;
      list.appendChild(textPair(fieldSpec.label, value));
    });
  }

  function renderDocumentOutline(container, resume) {
    if (!container) return;
    container.replaceChildren();

    var outline = el("article", "outline");
    var template = el("p", "outline-template");
    template.textContent = RB.templateLabel(resume.template);
    var note = el("p", "outline-note");
    note.textContent = "Read-only view of the resume document for this phase.";

    var sections = el("ol", "outline-sections");
    resume.sections.forEach(function (section) {
      var sectionSpec = RB.getSectionSpec(section.type);
      var item = el("li", "outline-section");
      var heading = el("h3");
      heading.textContent = section.title;
      item.appendChild(heading);

      if (sectionSpec && sectionSpec.kind === "fields") {
        var fields = el("dl");
        appendFields(fields, sectionSpec, section.fields);
        if (fields.childElementCount) item.appendChild(fields);
      } else if (sectionSpec) {
        var entries = el("ol", "outline-entries");
        section.entries.forEach(function (entry) {
          var entryItem = el("li");
          var entryFields = el("dl");
          appendFields(entryFields, sectionSpec, entry);
          if (entryFields.childElementCount) {
            entryItem.appendChild(entryFields);
            entries.appendChild(entryItem);
          }
        });
        if (entries.childElementCount) item.appendChild(entries);
      }

      sections.appendChild(item);
    });

    var templateLabel = el("p", "outline-kicker");
    templateLabel.textContent = "Template";
    outline.appendChild(templateLabel);
    outline.appendChild(template);
    outline.appendChild(note);
    outline.appendChild(sections);
    container.appendChild(outline);
  }

  RB.renderDocumentOutline = renderDocumentOutline;
})(typeof window !== "undefined" ? window : globalThis);
