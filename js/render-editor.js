(function (root) {
  "use strict";

  var RB = root.ResumeBuilder = root.ResumeBuilder || {};

  var URL_KEYS = { website: true, linkedin: true, github: true, url: true };

  var CUSTOM_LABELS = {
    personal: {
      fullName: "Full name",
      headline: "Professional headline",
      email: "Email",
      phone: "Phone",
      location: "Location",
      website: "Website",
      linkedin: "LinkedIn URL",
      github: "GitHub URL"
    },
    summary: { text: "Summary" },
    education: {
      institution: "Institution",
      credential: "Degree / credential",
      location: "Location",
      start: "Start date",
      end: "End date",
      details: "Description / details"
    },
    skills: { category: "Category name", items: "Skills" },
    experience: {
      role: "Job title",
      organization: "Organisation",
      location: "Location",
      start: "Start date",
      end: "End date",
      highlights: "Bullet points"
    },
    projects: {
      name: "Project name",
      url: "Project URL",
      technologies: "Technologies used",
      highlights: "Project highlights"
    },
    certifications: {
      name: "Certification name",
      issuer: "Issuing organisation",
      date: "Date",
      url: "Credential URL"
    },
    achievements: { title: "Achievement title", description: "Description" },
    responsibilities: {
      role: "Role",
      organization: "Organisation",
      start: "Start date",
      end: "End date",
      highlights: "Highlights"
    },
    additional: { label: "Label", value: "Value" }
  };

  var PLACEHOLDERS = {
    personal: {
      fullName: "Meera Iyer",
      headline: "Computer Science student",
      email: "name@example.com",
      phone: "+91 98220 44118",
      location: "Pune, India",
      website: "https://example.com",
      linkedin: "https://www.linkedin.com/in/username",
      github: "https://github.com/username"
    },
    summary: { text: "The kind of work you want, and what you bring to it." },
    education: {
      institution: "Rivermark Institute of Technology",
      credential: "B.Tech in Computer Science",
      location: "Pune",
      start: "2022",
      end: "2026",
      details: "Coursework, grades, or other details worth a line or two."
    },
    skills: { category: "Languages" },
    experience: {
      role: "Software Engineering Intern",
      organization: "Northwind Labs",
      location: "Pune",
      start: "May 2025",
      end: "Jul 2025"
    },
    projects: {
      name: "Study Planner",
      url: "https://example.com/study-planner",
      technologies: "HTML, CSS, JavaScript"
    },
    certifications: {
      name: "Responsive Web Design",
      issuer: "Example Learning Co-op",
      date: "Jun 2025",
      url: "https://example.com/certs/responsive-web-design"
    },
    achievements: {
      title: "Department coding contest, second place",
      description: "When it happened, and why it mattered."
    },
    responsibilities: {
      role: "Treasurer",
      organization: "Computer Science Student Association",
      start: "Jun 2024",
      end: "May 2025"
    },
    additional: { label: "Languages", value: "English, Hindi, Tamil" }
  };

  var HALF_WIDTH = {
    education: { start: true, end: true },
    experience: { start: true, end: true },
    responsibilities: { start: true, end: true }
  };

  var PRIMARY_KEY = {
    education: "institution",
    skills: "category",
    experience: "role",
    projects: "name",
    certifications: "name",
    achievements: "title",
    responsibilities: "role",
    additional: "label"
  };

  var ENTRY_FALLBACK = {
    education: "Education",
    skills: "Skill category",
    experience: "Experience",
    projects: "Project",
    certifications: "Certification",
    achievements: "Achievement",
    responsibilities: "Position",
    additional: "Detail"
  };

  var ENTRY_NOUN = {
    education: "Education entry",
    skills: "Skill category",
    experience: "Experience entry",
    projects: "Project",
    certifications: "Certification",
    achievements: "Achievement",
    responsibilities: "Position",
    additional: "Detail"
  };

  var COUNT_NOUN = {
    education: ["entry", "entries"],
    skills: ["category", "categories"],
    experience: ["role", "roles"],
    projects: ["project", "projects"],
    certifications: ["certification", "certifications"],
    achievements: ["achievement", "achievements"],
    responsibilities: ["position", "positions"],
    additional: ["detail", "details"]
  };

  var ADD_ENTRY_LABEL = {
    education: "Add education",
    skills: "Add skill category",
    experience: "Add experience",
    projects: "Add project",
    certifications: "Add certification",
    achievements: "Add achievement",
    responsibilities: "Add position",
    additional: "Add detail"
  };

  var EMPTY_COPY = {
    education: "No education yet. Add a degree, school, or other credential.",
    skills: "No skill categories yet. Group related skills, such as Languages or Tools.",
    experience: "No experience yet. Add a role to include it on the resume.",
    projects: "No projects yet. Add a project to include it on the resume.",
    certifications: "No certifications yet.",
    achievements: "No achievements yet.",
    responsibilities: "No positions yet.",
    additional: "No extra details yet. Add a label and a value, such as Languages."
  };

  var LIST_META = {
    skills: {
      items: {
        item: "Skill",
        add: "Add skill",
        remove: "Remove skill",
        placeholder: "JavaScript",
        empty: "No skills in this category yet."
      }
    },
    experience: {
      highlights: {
        item: "Bullet",
        add: "Add bullet",
        remove: "Remove bullet",
        placeholder: "What you achieved or were responsible for",
        empty: "No bullet points yet."
      }
    },
    projects: {
      highlights: {
        item: "Highlight",
        add: "Add highlight",
        remove: "Remove highlight",
        placeholder: "What the project does or what you built",
        empty: "No highlights yet."
      }
    },
    responsibilities: {
      highlights: {
        item: "Highlight",
        add: "Add highlight",
        remove: "Remove highlight",
        placeholder: "What you handled in this role",
        empty: "No highlights yet."
      }
    }
  };

  var boundRoot = null;
  var boundState = null;
  var lastStructure = "";
  var knownSectionIds = null;
  var knownEntryIds = null;
  var sectionExpanded = {};
  var nextFocus = null;
  var statusMessage = "";
  var statusTimer = 0;

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function button(className, text) {
    var node = el("button", className);
    node.type = "button";
    node.textContent = text;
    return node;
  }

  function gripIcon() {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("editor-grip");
    [[5, 3.5], [11, 3.5], [5, 8], [11, 8], [5, 12.5], [11, 12.5]].forEach(function (pair) {
      var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", String(pair[0]));
      dot.setAttribute("cy", String(pair[1]));
      dot.setAttribute("r", "1.2");
      dot.setAttribute("fill", "currentColor");
      svg.appendChild(dot);
    });
    return svg;
  }

  function refreshReorderLabels(rootNode, title) {
    if (!rootNode) return;
    var handle = rootNode.querySelector("[data-drag-handle]");
    if (handle) handle.setAttribute("aria-label", "Reorder " + title);
    var up = rootNode.querySelector("[data-move='up']");
    if (up) up.setAttribute("aria-label", "Move " + title + " up");
    var down = rootNode.querySelector("[data-move='down']");
    if (down) down.setAttribute("aria-label", "Move " + title + " down");
    var group = rootNode.querySelector(".editor-reorder");
    if (group) group.setAttribute("aria-label", "Reorder " + title);
  }

  function buildReorderControls(section, index, total) {
    var handle = button("editor-drag-handle", "");
    handle.appendChild(gripIcon());
    setAttrs(handle, {
      "data-drag-handle": "true",
      "data-section-id": section.id,
      "data-section-type": section.type,
      "aria-label": "Reorder " + section.title,
      "aria-keyshortcuts": "ArrowUp ArrowDown",
      title: "Drag to reorder. Arrow keys move this section."
    });

    var group = el("div", "editor-reorder");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Reorder " + section.title);

    var up = button("editor-button editor-move", "Up");
    setAttrs(up, {
      "data-move": "up",
      "data-section-id": section.id,
      "data-section-type": section.type,
      "aria-label": "Move " + section.title + " up"
    });
    up.disabled = index <= 1;

    var down = button("editor-button editor-move", "Down");
    setAttrs(down, {
      "data-move": "down",
      "data-section-id": section.id,
      "data-section-type": section.type,
      "aria-label": "Move " + section.title + " down"
    });
    down.disabled = index >= total - 1;

    group.appendChild(up);
    group.appendChild(down);
    return { handle: handle, group: group };
  }

  function setAttrs(node, map) {
    Object.keys(map).forEach(function (key) {
      if (map[key] === undefined || map[key] === null) return;
      node.setAttribute(key, String(map[key]));
    });
    return node;
  }

  function domId(parts) {
    return "rb-" + parts.join("-").replace(/[^A-Za-z0-9_-]/g, "");
  }

  function findSection(resume, sectionId) {
    if (!resume) return null;
    for (var index = 0; index < resume.sections.length; index += 1) {
      if (resume.sections[index].id === sectionId) return resume.sections[index];
    }
    return null;
  }

  function findEntry(section, entryId) {
    if (!section || !section.entries) return null;
    for (var index = 0; index < section.entries.length; index += 1) {
      if (section.entries[index].id === entryId) return section.entries[index];
    }
    return null;
  }

  function resumeHasSection(resume, sectionId) {
    return Boolean(findSection(resume, sectionId));
  }

  function resumeHasEntry(resume, entryId) {
    return resume.sections.some(function (section) {
      return Boolean(findEntry(section, entryId));
    });
  }

  function fieldLabel(sectionType, fieldSpec) {
    var labels = CUSTOM_LABELS[sectionType];
    if (labels && labels[fieldSpec.key]) return labels[fieldSpec.key];
    return fieldSpec.label;
  }

  function placeholderFor(sectionType, key) {
    var table = PLACEHOLDERS[sectionType];
    return table && table[key] ? table[key] : "";
  }

  function listMeta(sectionType, key) {
    var table = LIST_META[sectionType];
    if (table && table[key]) return table[key];
    return {
      item: "Item",
      add: "Add item",
      remove: "Remove item",
      placeholder: "",
      empty: "Nothing here yet."
    };
  }

  function fieldIsWide(sectionType, fieldSpec) {
    if (fieldSpec.input === RB.LIST_INPUT || fieldSpec.input === "multiline") return true;
    var half = HALF_WIDTH[sectionType];
    return !(half && half[fieldSpec.key]);
  }

  function entryHasContent(sectionType, entry) {
    var sectionSpec = RB.getSectionSpec(sectionType);
    if (!sectionSpec || !entry) return false;
    return sectionSpec.fields.some(function (fieldSpec) {
      var value = entry[fieldSpec.key];
      if (fieldSpec.input === RB.LIST_INPUT) {
        return Array.isArray(value) && value.some(function (item) {
          return typeof item === "string" && item.trim().length > 0;
        });
      }
      return typeof value === "string" && value.trim().length > 0;
    });
  }

  function entryKicker(section, entry, index) {
    var key = PRIMARY_KEY[section.type];
    var value = key && typeof entry[key] === "string" ? entry[key].trim() : "";
    if (value) return value;
    return (ENTRY_FALLBACK[section.type] || "Entry") + " " + (index + 1);
  }

  function countLabel(section) {
    if (!section.entries) return "";
    var nouns = COUNT_NOUN[section.type] || ["entry", "entries"];
    var count = section.entries.length;
    if (count === 0) return "No " + nouns[1];
    if (count === 1) return "1 " + nouns[0];
    return count + " " + nouns[1];
  }

  function addedMessage(type) {
    return (ENTRY_NOUN[type] || "Entry") + " added.";
  }

  function removedMessage(type) {
    return (ENTRY_NOUN[type] || "Entry") + " removed.";
  }

  function fieldMessage(sectionType, key, value) {
    var text = typeof value === "string" ? value.trim() : "";
    if (!text) {
      if (sectionType === "personal" && key === "fullName") {
        return { invalid: false, text: "The preview shows Untitled resume until a name is entered." };
      }
      if (sectionType === "summary" && key === "text") {
        return { invalid: false, text: "This section stays off the resume until the summary has text." };
      }
      return null;
    }
    if (key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      return { invalid: true, text: "Enter an email like name@example.com." };
    }
    if (URL_KEYS[key] && !/^https?:\/\/\S+$/i.test(text)) {
      return { invalid: true, text: "Use a full link starting with https://." };
    }
    return null;
  }

  function applyValidity(sectionType, key, value, input, message) {
    if (!message) return;
    var result = fieldMessage(sectionType, key, value);
    if (!result) {
      message.hidden = true;
      message.textContent = "";
      message.className = "editor-message";
      input.removeAttribute("aria-invalid");
      return;
    }
    message.hidden = false;
    message.textContent = result.text;
    message.className = result.invalid ? "editor-message is-error" : "editor-message is-hint";
    if (result.invalid) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  function applyTitleValidity(input, message) {
    if (!message) return;
    if (input.value.trim()) {
      message.hidden = true;
      message.textContent = "";
      message.className = "editor-message";
      input.removeAttribute("aria-invalid");
      return;
    }
    message.hidden = false;
    message.textContent = "Enter a heading. It is shown above this section on the resume.";
    message.className = "editor-message is-error";
    input.setAttribute("aria-invalid", "true");
  }

  function applyInputMode(sectionType, key, input) {
    input.setAttribute("autocomplete", "off");
    if (key === "email") {
      input.setAttribute("inputmode", "email");
      input.setAttribute("autocomplete", "email");
      input.setAttribute("autocapitalize", "none");
      input.spellcheck = false;
      return;
    }
    if (key === "phone") {
      input.setAttribute("inputmode", "tel");
      input.setAttribute("autocomplete", "tel");
      input.spellcheck = false;
      return;
    }
    if (URL_KEYS[key]) {
      input.setAttribute("inputmode", "url");
      input.setAttribute("autocapitalize", "none");
      input.spellcheck = false;
      if (key === "website") input.setAttribute("autocomplete", "url");
      return;
    }
    if (sectionType === "personal" && key === "fullName") {
      input.setAttribute("autocomplete", "name");
      return;
    }
    if (sectionType === "personal" && key === "location") {
      input.setAttribute("autocomplete", "address-level2");
    }
  }

  function structureKey(resume) {
    return resume.sections.map(function (section) {
      var entryPart = "";
      if (section.entries) {
        entryPart = section.entries.map(function (entry) {
          var lists = [];
          Object.keys(entry).sort().forEach(function (key) {
            if (Array.isArray(entry[key])) lists.push(key + "=" + entry[key].length);
          });
          return entry.id + "(" + lists.join(",") + ")";
        }).join(".");
      }
      return section.id + "/" + section.type + "/" + entryPart;
    }).join("||");
  }

  function remember(resume) {
    knownSectionIds = {};
    knownEntryIds = {};
    resume.sections.forEach(function (section) {
      knownSectionIds[section.id] = true;
      if (!section.entries) return;
      section.entries.forEach(function (entry) {
        knownEntryIds[entry.id] = section.id;
      });
    });
  }

  function sameValue(current, nextValue) {
    if (Array.isArray(current) && Array.isArray(nextValue)) {
      if (current.length !== nextValue.length) return false;
      for (var index = 0; index < current.length; index += 1) {
        if (current[index] !== nextValue[index]) return false;
      }
      return true;
    }
    return current === nextValue;
  }

  function sameAsState(sectionId, entryId, partial) {
    if (!boundState) return false;
    var section = findSection(boundState.getDocument(), sectionId);
    if (!section) return false;
    var source = entryId ? findEntry(section, entryId) : section.fields;
    if (!source) return false;
    return Object.keys(partial).every(function (key) {
      return sameValue(source[key], partial[key]);
    });
  }

  function readList(entryRoot, fieldKey) {
    var pairs = [];
    Array.prototype.forEach.call(entryRoot.querySelectorAll("[data-field-key]"), function (node) {
      if (node.getAttribute("data-field-key") !== fieldKey || !node.hasAttribute("data-list-index")) return;
      pairs.push({
        index: Number(node.getAttribute("data-list-index")),
        value: node.value
      });
    });
    pairs.sort(function (left, right) { return left.index - right.index; });
    return pairs.map(function (pair) { return pair.value; });
  }

  function listFromState(sectionId, entryId, fieldKey) {
    var section = findSection(boundState.getDocument(), sectionId);
    var entry = findEntry(section, entryId);
    if (!entry || !Array.isArray(entry[fieldKey])) return null;
    return entry[fieldKey].slice();
  }

  function armStatusTimer() {
    root.clearTimeout(statusTimer);
    if (!statusMessage) return;
    statusTimer = root.setTimeout(function () {
      statusMessage = "";
      if (!boundRoot) return;
      var statusNode = boundRoot.querySelector(".editor-status");
      if (statusNode) statusNode.textContent = "";
    }, 4200);
  }

  function writeStatus(container) {
    var statusNode = container.querySelector(".editor-status");
    if (statusNode) statusNode.textContent = statusMessage;
    armStatusTimer();
  }

  function buildTextField(section, entry, fieldSpec) {
    var source = entry || section.fields;
    var wide = fieldIsWide(section.type, fieldSpec);
    var wrap = el("div", wide ? "editor-field editor-field-span" : "editor-field");
    var inputId = domId(["field", section.id, entry ? entry.id : "fields", fieldSpec.key]);
    var label = el("label", "editor-label");
    label.htmlFor = inputId;
    label.textContent = fieldLabel(section.type, fieldSpec);

    var multiline = fieldSpec.input === "multiline";
    var input = document.createElement(multiline ? "textarea" : "input");
    if (!multiline) input.type = "text";
    if (multiline) input.rows = section.type === "summary" ? 5 : 3;
    input.id = inputId;
    input.value = source[fieldSpec.key];
    var placeholder = placeholderFor(section.type, fieldSpec.key);
    if (placeholder) input.placeholder = placeholder;
    setAttrs(input, {
      "data-section-id": section.id,
      "data-section-type": section.type,
      "data-entry-id": entry ? entry.id : null,
      "data-field-key": fieldSpec.key
    });
    applyInputMode(section.type, fieldSpec.key, input);

    var message = el("p", "editor-message");
    message.id = inputId + "-message";
    message.hidden = true;
    input.setAttribute("aria-describedby", message.id);
    applyValidity(section.type, fieldSpec.key, input.value, input, message);

    wrap.appendChild(label);
    wrap.appendChild(input);
    wrap.appendChild(message);
    return wrap;
  }

  function buildListField(section, entry, fieldSpec) {
    var meta = listMeta(section.type, fieldSpec.key);
    var items = entry[fieldSpec.key];
    var wrap = el("div", "editor-field editor-field-span");
    var label = el("span", "editor-label");
    var labelId = domId(["label", section.id, entry.id, fieldSpec.key]);
    label.id = labelId;
    label.textContent = fieldLabel(section.type, fieldSpec.key);

    var list = el("div", "editor-list");
    list.setAttribute("role", "group");
    list.setAttribute("aria-labelledby", labelId);

    if (!items.length) {
      list.appendChild(el("p", "editor-empty")).textContent = meta.empty;
    }

    items.forEach(function (item, index) {
      var row = el("div", "editor-list-row");
      var input = document.createElement("input");
      input.type = "text";
      input.value = item;
      input.placeholder = meta.placeholder;
      input.spellcheck = true;
      setAttrs(input, {
        "data-section-id": section.id,
        "data-section-type": section.type,
        "data-entry-id": entry.id,
        "data-field-key": fieldSpec.key,
        "data-list-index": String(index),
        "aria-label": meta.item + " " + (index + 1)
      });
      var remove = button("editor-button", "Remove");
      setAttrs(remove, {
        "data-remove-item": "true",
        "data-section-id": section.id,
        "data-section-type": section.type,
        "data-entry-id": entry.id,
        "data-field-key": fieldSpec.key,
        "data-list-index": String(index),
        "aria-label": meta.remove + " " + (index + 1)
      });
      row.appendChild(input);
      row.appendChild(remove);
      list.appendChild(row);
    });

    var add = button("editor-button", meta.add);
    setAttrs(add, {
      "data-add-item": "true",
      "data-section-id": section.id,
      "data-section-type": section.type,
      "data-entry-id": entry.id,
      "data-field-key": fieldSpec.key
    });
    list.appendChild(add);
    wrap.appendChild(label);
    wrap.appendChild(list);
    return wrap;
  }

  function buildField(section, entry, fieldSpec) {
    if (fieldSpec.input === RB.LIST_INPUT) return buildListField(section, entry, fieldSpec);
    return buildTextField(section, entry, fieldSpec);
  }

  function buildGrid(section, entry) {
    var sectionSpec = RB.getSectionSpec(section.type);
    var grid = el("div", "editor-grid");
    sectionSpec.fields.forEach(function (fieldSpec) {
      grid.appendChild(buildField(section, entry, fieldSpec));
    });
    return grid;
  }

  function buildHeadingField(section) {
    var sectionSpec = RB.getSectionSpec(section.type);
    var wrap = el("div", "editor-field editor-heading-field");
    var inputId = domId(["heading", section.id]);
    var label = el("label", "editor-label");
    label.htmlFor = inputId;
    label.textContent = "Section heading";
    var input = document.createElement("input");
    input.type = "text";
    input.id = inputId;
    input.value = section.title;
    input.placeholder = sectionSpec.title;
    setAttrs(input, {
      "data-section-title": "true",
      "data-section-id": section.id,
      "data-section-type": section.type
    });
    var message = el("p", "editor-message");
    message.id = inputId + "-message";
    message.hidden = true;
    input.setAttribute("aria-describedby", message.id);
    applyTitleValidity(input, message);
    wrap.appendChild(label);
    wrap.appendChild(input);
    wrap.appendChild(message);
    return wrap;
  }

  function buildConfirm(kind, yesLabel, extraAttrs) {
    var box = el("div", "editor-confirm");
    box.hidden = true;
    if (kind === "section") box.setAttribute("data-section-confirm", "true");
    else box.setAttribute("data-entry-confirm", "true");
    var copy = el("p", "editor-confirm-copy");
    copy.textContent = kind === "section"
      ? "Remove this section? You can add it again later."
      : "Delete this entry? This removes it from the resume.";
    var actions = el("div", "editor-confirm-actions");
    var yes = button("editor-button editor-button-danger", yesLabel);
    setAttrs(yes, extraAttrs);
    var no = button("editor-button", "Cancel");
    no.setAttribute("data-cancel-confirm", "true");
    actions.appendChild(yes);
    actions.appendChild(no);
    box.appendChild(copy);
    box.appendChild(actions);
    return box;
  }

  function buildEntry(section, entry, index) {
    var article = el("article", "editor-entry");
    setAttrs(article, {
      "data-entry-root": "true",
      "data-entry-id": entry.id,
      "data-section-id": section.id,
      "data-section-type": section.type,
      "data-entry-index": String(index + 1)
    });

    var top = el("div", "editor-entry-top");
    var kicker = el("p", "editor-kicker");
    kicker.textContent = entryKicker(section, entry, index);
    var remove = button("editor-button editor-button-danger", "Delete");
    setAttrs(remove, {
      "data-remove-entry": "true",
      "data-section-id": section.id,
      "data-section-type": section.type,
      "data-entry-id": entry.id,
      "aria-label": "Delete " + kicker.textContent
    });
    top.appendChild(kicker);
    top.appendChild(remove);

    var hint = el("p", "editor-help editor-entry-hint");
    hint.textContent = "This entry stays off the resume until it has text.";
    hint.hidden = entryHasContent(section.type, entry);

    article.appendChild(top);
    article.appendChild(buildConfirm("entry", "Delete", {
      "data-confirm-remove-entry": "true",
      "data-section-id": section.id,
      "data-section-type": section.type,
      "data-entry-id": entry.id
    }));
    article.appendChild(hint);
    article.appendChild(buildGrid(section, entry));
    return article;
  }

  function buildSection(section, index, total) {
    var sectionSpec = RB.getSectionSpec(section.type);
    var pinned = Boolean(sectionSpec && sectionSpec.pinned);
    var card = el("section", "editor-section");
    setAttrs(card, {
      "data-section-root": "true",
      "data-section-id": section.id,
      "data-section-type": section.type
    });

    var head = el("div", "editor-section-head");
    var titleId = domId(["section-label", section.id]);

    if (pinned) {
      var heading = el("h3", "editor-section-heading");
      heading.id = titleId;
      heading.textContent = section.title;
      var pin = el("span", "editor-pin");
      pin.textContent = "Pinned";
      var locked = buildReorderControls(section, 0, total);
      locked.handle.disabled = true;
      locked.handle.setAttribute("aria-label", "Reorder " + section.title + ", unavailable");
      locked.handle.removeAttribute("title");
      Array.prototype.forEach.call(locked.group.querySelectorAll("button"), function (control) {
        control.disabled = true;
        var direction = control.getAttribute("data-move") === "up" ? "up" : "down";
        control.setAttribute("aria-label", "Move " + section.title + " " + direction + ", unavailable");
      });
      head.appendChild(locked.handle);
      head.appendChild(heading);
      head.appendChild(locked.group);
      head.appendChild(pin);
      card.setAttribute("aria-labelledby", titleId);
      card.appendChild(head);

      var body = el("div", "editor-section-body");
      var note = el("p", "editor-help");
      note.textContent = "Always at the top of the resume. This section cannot be removed or moved.";
      body.appendChild(note);
      body.appendChild(buildGrid(section, null));
      card.appendChild(body);
      return card;
    }

    var open = sectionExpanded[section.id] !== false;
    var bodyId = domId(["body", section.id]);
    var reorder = buildReorderControls(section, index, total);
    var toggle = button("editor-collapse", "");
    toggle.textContent = "";
    setAttrs(toggle, {
      "data-toggle-section": "true",
      "data-section-id": section.id,
      "aria-expanded": open ? "true" : "false",
      "aria-controls": bodyId
    });
    var chevron = el("span", "editor-chevron");
    chevron.setAttribute("aria-hidden", "true");
    var textWrap = el("span", "editor-collapse-text");
    var title = el("span", "editor-section-title");
    title.id = titleId;
    title.textContent = section.title;
    textWrap.appendChild(title);
    if (sectionSpec && sectionSpec.kind === "entries") {
      var count = el("span", "editor-count");
      count.textContent = countLabel(section);
      textWrap.appendChild(count);
    }
    toggle.appendChild(chevron);
    toggle.appendChild(textWrap);

    var remove = button("editor-button editor-button-danger", "Remove");
    setAttrs(remove, {
      "data-remove-section": "true",
      "data-section-id": section.id,
      "data-section-type": section.type,
      "aria-label": "Remove " + section.title + " section"
    });
    head.appendChild(reorder.handle);
    head.appendChild(toggle);
    head.appendChild(reorder.group);
    head.appendChild(remove);
    card.setAttribute("aria-labelledby", titleId);
    card.appendChild(head);
    card.appendChild(buildConfirm("section", "Remove section", {
      "data-confirm-remove-section": "true",
      "data-section-id": section.id,
      "data-section-type": section.type
    }));

    var body = el("div", "editor-section-body");
    body.id = bodyId;
    body.hidden = !open;
    if (!sectionSpec.required) body.appendChild(buildHeadingField(section));

    if (sectionSpec.kind === "entries") {
      if (!section.entries.length) {
        var empty = el("p", "editor-empty");
        empty.textContent = EMPTY_COPY[section.type] || "No entries yet.";
        body.appendChild(empty);
      }
      section.entries.forEach(function (entry, index) {
        body.appendChild(buildEntry(section, entry, index));
      });
      var add = button("editor-button editor-button-primary", ADD_ENTRY_LABEL[section.type] || "Add entry");
      setAttrs(add, {
        "data-add-entry": "true",
        "data-section-id": section.id,
        "data-section-type": section.type
      });
      body.appendChild(add);
    } else {
      body.appendChild(buildGrid(section, null));
    }

    card.appendChild(body);
    return card;
  }

  function buildAddSection(resume) {
    var present = {};
    resume.sections.forEach(function (section) {
      present[section.type] = true;
    });
    var missing = RB.SECTION_TYPES.filter(function (type) {
      return type !== "personal" && !present[type];
    });

    var card = el("section", "editor-section editor-add-panel");
    var heading = el("h3", "editor-add-title");
    heading.id = "rb-add-section-title";
    heading.tabIndex = -1;
    heading.setAttribute("data-add-panel-title", "true");
    heading.textContent = "Add section";
    card.setAttribute("aria-labelledby", heading.id);
    var help = el("p", "editor-help");
    help.textContent = "Each optional section can be added once. Personal information stays on the resume.";
    card.appendChild(heading);
    card.appendChild(help);

    if (!missing.length) {
      var done = el("p", "editor-empty");
      done.textContent = "All sections are already on the resume.";
      card.appendChild(done);
      return card;
    }

    var grid = el("div", "editor-add-grid");
    missing.forEach(function (type) {
      var sectionSpec = RB.getSectionSpec(type);
      var add = button("editor-button", sectionSpec.title);
      setAttrs(add, { "data-add-section": type });
      grid.appendChild(add);
    });
    card.appendChild(grid);
    return card;
  }

  function buildEditor(resume) {
    var form = el("div", "editor-form");
    var status = el("div", "editor-status");
    status.setAttribute("role", "status");
    var note = el("p", "editor-help editor-intro");
    note.textContent = "Changes appear in the preview immediately. Blank entries and empty sections are left off the page.";
    var orderNote = el("p", "editor-help editor-intro");
    orderNote.textContent = "Drag a section by its handle, or use Move up and Move down. Personal information stays at the top.";
    form.appendChild(status);
    form.appendChild(note);
    form.appendChild(orderNote);
    resume.sections.forEach(function (section, index) {
      form.appendChild(buildSection(section, index, resume.sections.length));
    });
    form.appendChild(buildAddSection(resume));
    return form;
  }

  function captureFocus(container) {
    var active = document.activeElement;
    if (!active || active === document.body || !container.contains(active)) return null;
    return {
      sectionId: active.getAttribute("data-section-id"),
      entryId: active.getAttribute("data-entry-id"),
      fieldKey: active.getAttribute("data-field-key"),
      listIndex: active.getAttribute("data-list-index"),
      sectionTitle: active.hasAttribute("data-section-title"),
      selectionStart: typeof active.selectionStart === "number" ? active.selectionStart : null,
      selectionEnd: typeof active.selectionEnd === "number" ? active.selectionEnd : null,
      move: active.getAttribute("data-move"),
      dragHandle: active.hasAttribute("data-drag-handle")
    };
  }

  function planFocus(resume, previousFocus) {
    if (nextFocus) {
      var planned = nextFocus;
      nextFocus = null;
      return planned;
    }
    if (!knownSectionIds) return { reason: "none" };

    var newSectionId = null;
    var newEntry = null;
    resume.sections.forEach(function (section) {
      if (!knownSectionIds[section.id]) newSectionId = section.id;
      if (!section.entries || !knownEntryIds) return;
      section.entries.forEach(function (entry) {
        if (!knownEntryIds[entry.id]) newEntry = { sectionId: section.id, entryId: entry.id };
      });
    });

    if (newSectionId) {
      var created = findSection(resume, newSectionId);
      var createdSpec = created && RB.getSectionSpec(created.type);
      return {
        reason: "new",
        sectionId: newSectionId,
        prefer: createdSpec && createdSpec.kind === "fields" ? "first-field" : "title"
      };
    }
    if (newEntry) {
      return {
        reason: "new",
        sectionId: newEntry.sectionId,
        entryId: newEntry.entryId,
        prefer: "first-entry-field"
      };
    }
    if (previousFocus && previousFocus.sectionId && !resumeHasSection(resume, previousFocus.sectionId)) {
      return { reason: "new", prefer: "add-panel" };
    }
    if (previousFocus && previousFocus.entryId && !resumeHasEntry(resume, previousFocus.entryId)) {
      return {
        reason: "new",
        sectionId: knownEntryIds[previousFocus.entryId],
        prefer: "add-entry"
      };
    }
    if (previousFocus && (previousFocus.fieldKey || previousFocus.sectionTitle || previousFocus.move || previousFocus.dragHandle)) {
      previousFocus.reason = "restore";
      return previousFocus;
    }
    return { reason: "none" };
  }

  function findEntryRoot(container, entryId) {
    var nodes = container.querySelectorAll("[data-entry-root]");
    for (var index = 0; index < nodes.length; index += 1) {
      if (nodes[index].getAttribute("data-entry-id") === entryId) return nodes[index];
    }
    return null;
  }

  function findSectionRoot(container, sectionId) {
    var nodes = container.querySelectorAll("[data-section-root]");
    for (var index = 0; index < nodes.length; index += 1) {
      if (nodes[index].getAttribute("data-section-id") === sectionId) return nodes[index];
    }
    return null;
  }

  function matchesControl(node, spec) {
    if (spec.sectionId && node.getAttribute("data-section-id") !== spec.sectionId) return false;
    if (spec.entryId && node.getAttribute("data-entry-id") !== spec.entryId) return false;
    if (spec.fieldKey && node.getAttribute("data-field-key") !== spec.fieldKey) return false;
    if (spec.listIndex !== undefined && spec.listIndex !== null &&
        node.getAttribute("data-list-index") !== String(spec.listIndex)) return false;
    if (spec.sectionTitle && !node.hasAttribute("data-section-title")) return false;
    if (spec.dragHandle && !node.hasAttribute("data-drag-handle")) return false;
    if (spec.move && node.getAttribute("data-move") !== spec.move) return false;
    if (spec.addEntry && !node.hasAttribute("data-add-entry")) return false;
    if (spec.addItem && !node.hasAttribute("data-add-item")) return false;
    return true;
  }

  function findControl(container, spec) {
    var nodes = container.querySelectorAll("input, textarea, button");
    for (var index = 0; index < nodes.length; index += 1) {
      if (matchesControl(nodes[index], spec)) return nodes[index];
    }
    return null;
  }

  function locateFocus(container, plan) {
    if (!plan) return null;
    if (plan.prefer === "add-panel") {
      return container.querySelector("[data-add-panel-title]");
    }
    if (plan.prefer === "add-entry") {
      return findControl(container, { sectionId: plan.sectionId, addEntry: true });
    }
    if (plan.prefer === "add-item") {
      return findControl(container, {
        sectionId: plan.sectionId,
        entryId: plan.entryId,
        fieldKey: plan.fieldKey,
        addItem: true
      });
    }
    if (plan.prefer === "title" || plan.sectionTitle) {
      return findControl(container, { sectionId: plan.sectionId, sectionTitle: true });
    }
    if (plan.prefer === "first-field") {
      var sectionRoot = findSectionRoot(container, plan.sectionId);
      return sectionRoot ? sectionRoot.querySelector("[data-field-key]") : null;
    }
    if (plan.prefer === "first-entry-field") {
      var entryRoot = findEntryRoot(container, plan.entryId);
      return entryRoot ? entryRoot.querySelector("input, textarea") : null;
    }
    if (plan.dragHandle) {
      return findControl(container, { sectionId: plan.sectionId, dragHandle: true });
    }
    if (plan.move) {
      var moveButton = findControl(container, { sectionId: plan.sectionId, move: plan.move });
      if (moveButton && !moveButton.disabled) return moveButton;
      var otherMove = findControl(container, {
        sectionId: plan.sectionId,
        move: plan.move === "up" ? "down" : "up"
      });
      if (otherMove && !otherMove.disabled) return otherMove;
      return findControl(container, { sectionId: plan.sectionId, dragHandle: true });
    }
    if (plan.fieldKey) {
      return findControl(container, {
        sectionId: plan.sectionId,
        entryId: plan.entryId,
        fieldKey: plan.fieldKey,
        listIndex: plan.listIndex
      });
    }
    return null;
  }

  function reveal(node) {
    if (!node || !boundRoot) return;
    var scroller = boundRoot.closest(".editor-panel");
    if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) {
      var scrollerRect = scroller.getBoundingClientRect();
      var nodeRect = node.getBoundingClientRect();
      if (nodeRect.top < scrollerRect.top + 8 || nodeRect.height > scrollerRect.height) {
        scroller.scrollTop -= (scrollerRect.top + 8) - nodeRect.top;
      } else if (nodeRect.bottom > scrollerRect.bottom - 8) {
        scroller.scrollTop += nodeRect.bottom - (scrollerRect.bottom - 8);
      }
      return;
    }
    if (node.scrollIntoView) node.scrollIntoView({ block: "nearest" });
  }

  function applyFocus(container, plan, scroller, scrollTop) {
    if (!plan || plan.reason === "none") {
      if (scroller) scroller.scrollTop = scrollTop;
      return;
    }
    var node = locateFocus(container, plan);
    if (!node) {
      if (scroller) scroller.scrollTop = scrollTop;
      return;
    }
    if (typeof node.focus === "function") node.focus({ preventScroll: true });
    if (plan.reason === "restore" && node.setSelectionRange &&
        plan.selectionStart !== null && plan.selectionStart !== undefined) {
      try {
        node.setSelectionRange(plan.selectionStart, plan.selectionEnd);
      } catch (error) {
        /* Some input types do not support a selection range. */
      }
    }
    if (plan.reason === "new") reveal(node);
    else if (scroller) scroller.scrollTop = scrollTop;
  }

  function paint(container, resume) {
    var scroller = container.closest(".editor-panel");
    var scrollTop = scroller ? scroller.scrollTop : 0;
    var previousFocus = captureFocus(container);
    var plan = planFocus(resume, previousFocus);
    if (plan && plan.reason === "new" && plan.sectionId) sectionExpanded[plan.sectionId] = true;
    container.replaceChildren(buildEditor(resume));
    container.dataset.editorReady = "1";
    lastStructure = structureKey(resume);
    remember(resume);
    writeStatus(container);
    applyFocus(container, plan, scroller, scrollTop);
  }

  function commitTitle(input) {
    var message = document.getElementById(input.id + "-message");
    applyTitleValidity(input, message);
    var trimmed = input.value.trim();
    var rootNode = input.closest("[data-section-root]");
    var header = rootNode ? rootNode.querySelector(".editor-section-title") : null;
    if (!trimmed) return;
    if (header) header.textContent = trimmed;
    var remove = rootNode ? rootNode.querySelector("[data-remove-section]") : null;
    if (remove) remove.setAttribute("aria-label", "Remove " + trimmed + " section");
    refreshReorderLabels(rootNode, trimmed);
    var sectionId = input.getAttribute("data-section-id");
    var section = findSection(boundState.getDocument(), sectionId);
    if (section && section.title === trimmed) return;
    boundState.renameSection(sectionId, input.value);
  }

  function commitField(input) {
    var sectionId = input.getAttribute("data-section-id");
    var entryId = input.getAttribute("data-entry-id");
    var key = input.getAttribute("data-field-key");
    var partial = {};
    if (input.hasAttribute("data-list-index")) {
      var entryRoot = input.closest("[data-entry-root]");
      if (!entryRoot) return;
      partial[key] = readList(entryRoot, key);
    } else {
      partial[key] = input.value;
    }
    if (sameAsState(sectionId, entryId, partial)) return;
    if (entryId) boundState.updateEntry(sectionId, entryId, partial);
    else boundState.updateFields(sectionId, partial);
  }

  function entryIsEmpty(entryRoot) {
    var inputs = entryRoot.querySelectorAll("[data-field-key]");
    for (var index = 0; index < inputs.length; index += 1) {
      if (inputs[index].value.trim()) return false;
    }
    return true;
  }

  function refreshEntryChrome(input) {
    var entryRoot = input.closest("[data-entry-root]");
    if (!entryRoot) return;
    var hint = entryRoot.querySelector(".editor-entry-hint");
    if (hint) hint.hidden = !entryIsEmpty(entryRoot);
    var type = entryRoot.getAttribute("data-section-type");
    var key = input.getAttribute("data-field-key");
    if (PRIMARY_KEY[type] !== key || input.hasAttribute("data-list-index")) return;
    var kicker = entryRoot.querySelector(".editor-kicker");
    if (!kicker) return;
    var text = input.value.trim();
    var index = entryRoot.getAttribute("data-entry-index") || "1";
    kicker.textContent = text || ((ENTRY_FALLBACK[type] || "Entry") + " " + index);
    var remove = entryRoot.querySelector("[data-remove-entry]");
    if (remove) remove.setAttribute("aria-label", "Delete " + kicker.textContent);
  }

  function handleInput(event) {
    var input = event.target;
    if (!input || !boundState || !input.getAttribute) return;
    if (input.hasAttribute("data-section-title")) {
      commitTitle(input);
      return;
    }
    if (!input.hasAttribute("data-field-key")) return;
    commitField(input);
    var message = input.id ? document.getElementById(input.id + "-message") : null;
    if (message) {
      applyValidity(
        input.getAttribute("data-section-type"),
        input.getAttribute("data-field-key"),
        input.value,
        input,
        message
      );
    }
    refreshEntryChrome(input);
  }

  function handleBlur(event) {
    var input = event.target;
    if (!input || !input.hasAttribute || !input.hasAttribute("data-section-title") || !boundState) return;
    var section = findSection(boundState.getDocument(), input.getAttribute("data-section-id"));
    if (!section || input.value.trim() === section.title) return;
    input.value = section.title;
    var rootNode = input.closest("[data-section-root]");
    var header = rootNode ? rootNode.querySelector(".editor-section-title") : null;
    if (header) header.textContent = section.title;
    applyTitleValidity(input, document.getElementById(input.id + "-message"));
  }

  function closeConfirms() {
    if (!boundRoot) return;
    Array.prototype.forEach.call(boundRoot.querySelectorAll(".editor-confirm"), function (box) {
      box.hidden = true;
    });
  }

  function openConfirm(button, selector) {
    var rootNode = button.closest("[data-entry-root], [data-section-root]");
    if (!rootNode) return;
    closeConfirms();
    var box = rootNode.querySelector(selector);
    if (!box) return;
    box.hidden = false;
    var yes = box.querySelector(".editor-button-danger");
    if (yes) yes.focus({ preventScroll: true });
    reveal(box);
    return box;
  }

  function requestMove(sectionId, spec) {
    if (!boundState || !sectionId || !RB.moveSectionBy || !RB.moveSectionBefore) return;
    if (document.body.classList.contains("is-section-dragging") && spec.offset) return;
    var section = findSection(boundState.getDocument(), sectionId);
    var title = section ? section.title : "Section";
    var previousStatus = statusMessage;
    nextFocus = {
      reason: "restore",
      sectionId: sectionId,
      move: spec.offset ? (spec.offset < 0 ? "up" : "down") : null,
      dragHandle: Boolean(spec.dragHandle) || !spec.offset
    };
    statusMessage = spec.offset
      ? title + (spec.offset < 0 ? " moved up." : " moved down.")
      : title + " moved.";
    var result = spec.offset
      ? RB.moveSectionBy(boundState, sectionId, spec.offset)
      : RB.moveSectionBefore(boundState, sectionId, spec.beforeId);
    if (result && result.ok && !result.unchanged) return;
    nextFocus = null;
    if (!result || result.ok) {
      statusMessage = previousStatus;
      return;
    }
    statusMessage = result.error || "Section could not be moved.";
    if (boundRoot) writeStatus(boundRoot);
  }

  function handleClick(event) {
    var target = event.target;
    var control = target && target.closest ? target.closest("button") : null;
    if (!control || !boundRoot || !boundRoot.contains(control) || !boundState) return;

    if (control.hasAttribute("data-move")) {
      requestMove(control.getAttribute("data-section-id"), {
        offset: control.getAttribute("data-move") === "up" ? -1 : 1
      });
      return;
    }

    if (control.hasAttribute("data-toggle-section")) {
      var sectionId = control.getAttribute("data-section-id");
      var expanded = control.getAttribute("aria-expanded") === "true";
      sectionExpanded[sectionId] = !expanded;
      control.setAttribute("aria-expanded", expanded ? "false" : "true");
      var body = document.getElementById(control.getAttribute("aria-controls"));
      if (body) body.hidden = expanded;
      return;
    }

    if (control.hasAttribute("data-cancel-confirm")) {
      var box = control.closest(".editor-confirm");
      if (box) box.hidden = true;
      var parent = control.closest("[data-entry-root], [data-section-root]");
      var opener = parent && parent.querySelector("[data-remove-entry], [data-remove-section]");
      if (opener) opener.focus({ preventScroll: true });
      return;
    }

    if (control.hasAttribute("data-remove-section")) {
      var sectionBox = openConfirm(control, "[data-section-confirm]");
      if (!sectionBox) return;
      var current = findSection(boundState.getDocument(), control.getAttribute("data-section-id"));
      var title = current ? current.title : "this section";
      var sectionCopy = sectionBox.querySelector(".editor-confirm-copy");
      if (sectionCopy) {
        sectionCopy.textContent = "Remove " + title + "? You can add this section again later. Its current contents will be cleared.";
      }
      return;
    }

    if (control.hasAttribute("data-confirm-remove-section")) {
      var removedTitle = "Section";
      var removed = findSection(boundState.getDocument(), control.getAttribute("data-section-id"));
      if (removed) removedTitle = removed.title;
      statusMessage = removedTitle + " removed. You can add it again below.";
      boundState.removeSection(control.getAttribute("data-section-id"));
      return;
    }

    if (control.hasAttribute("data-remove-entry")) {
      var entrySection = findSection(boundState.getDocument(), control.getAttribute("data-section-id"));
      var entry = findEntry(entrySection, control.getAttribute("data-entry-id"));
      if (!entry) return;
      if (!entryHasContent(entrySection.type, entry)) {
        statusMessage = removedMessage(entrySection.type);
        boundState.removeEntry(entrySection.id, entry.id);
        return;
      }
      var entryBox = openConfirm(control, "[data-entry-confirm]");
      if (!entryBox) return;
      var entryRoot = control.closest("[data-entry-root]");
      var kicker = entryRoot && entryRoot.querySelector(".editor-kicker");
      var name = kicker && kicker.textContent.trim() ? kicker.textContent.trim() : "this entry";
      var entryCopy = entryBox.querySelector(".editor-confirm-copy");
      if (entryCopy) entryCopy.textContent = "Delete " + name + "? This removes it from the resume.";
      return;
    }

    if (control.hasAttribute("data-confirm-remove-entry")) {
      statusMessage = removedMessage(control.getAttribute("data-section-type"));
      boundState.removeEntry(control.getAttribute("data-section-id"), control.getAttribute("data-entry-id"));
      return;
    }

    if (control.hasAttribute("data-add-entry")) {
      statusMessage = addedMessage(control.getAttribute("data-section-type"));
      sectionExpanded[control.getAttribute("data-section-id")] = true;
      boundState.addEntry(control.getAttribute("data-section-id"));
      return;
    }

    if (control.hasAttribute("data-add-item")) {
      var items = listFromState(
        control.getAttribute("data-section-id"),
        control.getAttribute("data-entry-id"),
        control.getAttribute("data-field-key")
      );
      if (!items) return;
      items.push("");
      nextFocus = {
        reason: "new",
        sectionId: control.getAttribute("data-section-id"),
        entryId: control.getAttribute("data-entry-id"),
        fieldKey: control.getAttribute("data-field-key"),
        listIndex: String(items.length - 1),
        prefer: "control"
      };
      statusMessage = "";
      var addPartial = {};
      addPartial[control.getAttribute("data-field-key")] = items;
      var addResult = boundState.updateEntry(
        control.getAttribute("data-section-id"),
        control.getAttribute("data-entry-id"),
        addPartial
      );
      if (!addResult.ok) nextFocus = null;
      return;
    }

    if (control.hasAttribute("data-remove-item")) {
      var fieldKey = control.getAttribute("data-field-key");
      var currentItems = listFromState(
        control.getAttribute("data-section-id"),
        control.getAttribute("data-entry-id"),
        fieldKey
      );
      var itemIndex = Number(control.getAttribute("data-list-index"));
      if (!currentItems || itemIndex < 0 || itemIndex >= currentItems.length) return;
      currentItems.splice(itemIndex, 1);
      nextFocus = {
        reason: "new",
        sectionId: control.getAttribute("data-section-id"),
        entryId: control.getAttribute("data-entry-id"),
        fieldKey: fieldKey,
        listIndex: currentItems.length ? String(Math.min(itemIndex, currentItems.length - 1)) : null,
        prefer: currentItems.length ? "control" : "add-item"
      };
      statusMessage = "";
      var removePartial = {};
      removePartial[fieldKey] = currentItems;
      var removeResult = boundState.updateEntry(
        control.getAttribute("data-section-id"),
        control.getAttribute("data-entry-id"),
        removePartial
      );
      if (!removeResult.ok) nextFocus = null;
      return;
    }

    if (control.hasAttribute("data-add-section")) {
      var type = control.getAttribute("data-add-section");
      var sectionSpec = RB.getSectionSpec(type);
      if (!sectionSpec) return;
      statusMessage = sectionSpec.title + " added.";
      var added = boundState.addSection(type);
      if (!added.ok) {
        statusMessage = added.error;
        writeStatus(boundRoot);
      }
    }
  }

  function handleKeyDown(event) {
    if (!boundRoot) return;
    var handle = event.target && event.target.closest ? event.target.closest("[data-drag-handle]") : null;
    if (handle && boundRoot.contains(handle) && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      requestMove(handle.getAttribute("data-section-id"), {
        offset: event.key === "ArrowUp" ? -1 : 1,
        dragHandle: true
      });
      return;
    }
    if (event.key !== "Escape") return;
    var boxes = boundRoot.querySelectorAll(".editor-confirm");
    for (var index = boxes.length - 1; index >= 0; index -= 1) {
      if (boxes[index].hidden) continue;
      event.preventDefault();
      boxes[index].hidden = true;
      var parent = boxes[index].closest("[data-entry-root], [data-section-root]");
      var opener = parent && parent.querySelector("[data-remove-entry], [data-remove-section]");
      if (opener) opener.focus({ preventScroll: true });
      return;
    }
  }

  function ensureEvents(container) {
    if (boundRoot === container && container.dataset.editorBound === "1") {
      boundRoot = container;
      return;
    }
    boundRoot = container;
    container.dataset.editorBound = "1";
    container.addEventListener("input", handleInput);
    container.addEventListener("change", handleInput);
    container.addEventListener("click", handleClick);
    container.addEventListener("focusout", handleBlur);
    container.addEventListener("keydown", handleKeyDown);
    if (typeof RB.attachSectionDrag === "function") {
      RB.attachSectionDrag(container, {
        onDrop: function (sectionId, beforeId) {
          requestMove(sectionId, { beforeId: beforeId });
        }
      });
    }
  }

  function renderEditor(container, resume, state) {
    if (!container || !resume) return;
    if (state) boundState = state;
    ensureEvents(container);
    if (!boundState) return;
    var structure = structureKey(resume);
    // Field edits keep the same sections and entries, so the open inputs stay mounted.
    if (container.dataset.editorReady === "1" && structure === lastStructure) return;
    paint(container, resume);
  }

  RB.renderEditor = renderEditor;
})(typeof window !== "undefined" ? window : globalThis);
