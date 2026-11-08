(function (root) {
  "use strict";

  var RB = root.ResumeBuilder = root.ResumeBuilder || {};
  var BLOCKED_KEYS = { __proto__: true, prototype: true, constructor: true };

  function clone(value) {
    if (Array.isArray(value)) {
      return value.map(clone);
    }
    if (value && typeof value === "object") {
      var copy = {};
      Object.keys(value).forEach(function (key) {
        if (BLOCKED_KEYS[key]) return;
        copy[key] = clone(value[key]);
      });
      return copy;
    }
    return value;
  }

  function freezeDeep(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      freezeDeep(value[key]);
    });
    return Object.freeze(value);
  }

  function ok(extra) {
    var result = { ok: true };
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        result[key] = extra[key];
      });
    }
    return result;
  }

  function fail(error) {
    return { ok: false, error: error };
  }

  function isStringList(value) {
    return Array.isArray(value) && value.every(function (item) {
      return typeof item === "string";
    });
  }

  function fieldKindMatches(fieldSpec, value) {
    if (fieldSpec.input === RB.LIST_INPUT) return isStringList(value);
    return typeof value === "string";
  }

  function checkFieldsObject(sectionSpec, fields) {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      return "Section " + sectionSpec.type + " needs a fields object";
    }
    var known = {};
    var missing = sectionSpec.fields.some(function (fieldSpec) {
      known[fieldSpec.key] = true;
      return !Object.prototype.hasOwnProperty.call(fields, fieldSpec.key) ||
        !fieldKindMatches(fieldSpec, fields[fieldSpec.key]);
    });
    if (missing) return "Section " + sectionSpec.type + " has missing or invalid fields";
    var unknown = Object.keys(fields).some(function (key) {
      return !known[key];
    });
    if (unknown) return "Section " + sectionSpec.type + " has an unknown field";
    return "";
  }

  function checkEntry(sectionSpec, entry, ids) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return "An entry in " + sectionSpec.type + " is invalid";
    }
    if (typeof entry.id !== "string" || !entry.id) return "An entry is missing an id";
    if (ids[entry.id]) return "Duplicate id: " + entry.id;
    ids[entry.id] = true;

    var known = { id: true };
    var invalid = sectionSpec.fields.some(function (fieldSpec) {
      known[fieldSpec.key] = true;
      return !Object.prototype.hasOwnProperty.call(entry, fieldSpec.key) ||
        !fieldKindMatches(fieldSpec, entry[fieldSpec.key]);
    });
    if (invalid) return "Entry " + entry.id + " has missing or invalid fields";
    var unknown = Object.keys(entry).some(function (key) {
      return !known[key];
    });
    if (unknown) return "Entry " + entry.id + " has an unknown field";
    return "";
  }

  function checkDocument(document) {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return fail("Resume document must be an object");
    }
    if (document.version !== RB.DOCUMENT_VERSION) {
      return fail("Resume version is not supported");
    }
    if (!RB.isTemplateId(document.template)) return fail("Unknown template");
    if (!Array.isArray(document.sections) || document.sections.length === 0) {
      return fail("Resume needs at least the personal section");
    }

    var seenTypes = {};
    var seenIds = {};
    for (var index = 0; index < document.sections.length; index += 1) {
      var section = document.sections[index];
      if (!section || typeof section !== "object") return fail("A section is invalid");
      var sectionSpec = RB.getSectionSpec(section.type);
      if (!sectionSpec) return fail("Unknown section type");
      if (seenTypes[section.type]) return fail("Duplicate section: " + section.type);
      seenTypes[section.type] = true;
      if (typeof section.id !== "string" || !section.id) return fail("A section is missing an id");
      if (seenIds[section.id]) return fail("Duplicate id: " + section.id);
      seenIds[section.id] = true;
      if (typeof section.title !== "string" || !section.title.trim()) {
        return fail("Section " + section.type + " needs a title");
      }
      if (index === 0 && section.type !== "personal") {
        return fail("Personal information stays first");
      }
      if (sectionSpec.kind === "fields") {
        var fieldError = checkFieldsObject(sectionSpec, section.fields);
        if (fieldError) return fail(fieldError);
      } else if (!Array.isArray(section.entries)) {
        return fail("Section " + section.type + " needs entries");
      } else {
        for (var entryIndex = 0; entryIndex < section.entries.length; entryIndex += 1) {
          var entryError = checkEntry(sectionSpec, section.entries[entryIndex], seenIds);
          if (entryError) return fail(entryError);
        }
      }
    }

    if (!seenTypes.personal) return fail("Personal information is required");
    return ok();
  }

  function findSection(document, sectionId) {
    for (var index = 0; index < document.sections.length; index += 1) {
      if (document.sections[index].id === sectionId) {
        return { section: document.sections[index], index: index };
      }
    }
    return null;
  }

  function findEntry(section, entryId) {
    for (var index = 0; index < section.entries.length; index += 1) {
      if (section.entries[index].id === entryId) {
        return { entry: section.entries[index], index: index };
      }
    }
    return null;
  }

  function readPatch(sectionSpec, partial) {
    if (!partial || typeof partial !== "object" || Array.isArray(partial)) {
      return fail("Update must be an object");
    }
    var known = {};
    sectionSpec.fields.forEach(function (fieldSpec) {
      known[fieldSpec.key] = fieldSpec;
    });
    var keys = Object.keys(partial);
    if (!keys.length) return fail("Update is empty");
    var next = {};
    for (var index = 0; index < keys.length; index += 1) {
      var key = keys[index];
      if (BLOCKED_KEYS[key] || !known[key]) return fail("Unknown field: " + key);
      var value = partial[key];
      if (!fieldKindMatches(known[key], value)) {
        return fail(known[key].label + " has an invalid value");
      }
      next[key] = known[key].input === RB.LIST_INPUT ? value.slice() : value;
    }
    return ok({ value: next });
  }

  function createState(initialDocument) {
    var source = initialDocument || RB.createEmptyDocument();
    var document = clone(source);
    var initialCheck = checkDocument(document);
    if (!initialCheck.ok) throw new Error(initialCheck.error);

    var listeners = [];

    function snapshot() {
      return freezeDeep(clone(document));
    }

    function notify() {
      var current = snapshot();
      listeners.slice().forEach(function (listener) {
        try {
          listener(current);
        } catch (error) {
          if (root.console && typeof root.console.error === "function") {
            root.console.error(error);
          }
        }
      });
    }

    function subscribe(listener) {
      if (typeof listener !== "function") throw new Error("Listener must be a function");
      listeners.push(listener);
      listener(snapshot());
      return function unsubscribe() {
        var index = listeners.indexOf(listener);
        if (index !== -1) listeners.splice(index, 1);
      };
    }

    function updateFields(sectionId, partial) {
      var found = findSection(document, sectionId);
      if (!found) return fail("Section not found");
      var sectionSpec = RB.getSectionSpec(found.section.type);
      if (sectionSpec.kind !== "fields") return fail("This section stores entries");
      var patch = readPatch(sectionSpec, partial);
      if (!patch.ok) return patch;
      Object.keys(patch.value).forEach(function (key) {
        found.section.fields[key] = patch.value[key];
      });
      notify();
      return ok();
    }

    function updateEntry(sectionId, entryId, partial) {
      var found = findSection(document, sectionId);
      if (!found) return fail("Section not found");
      var sectionSpec = RB.getSectionSpec(found.section.type);
      if (sectionSpec.kind !== "entries") return fail("This section has no entries");
      var entryFound = findEntry(found.section, entryId);
      if (!entryFound) return fail("Entry not found");
      var patch = readPatch(sectionSpec, partial);
      if (!patch.ok) return patch;
      Object.keys(patch.value).forEach(function (key) {
        entryFound.entry[key] = patch.value[key];
      });
      notify();
      return ok();
    }

    function addEntry(sectionId) {
      var found = findSection(document, sectionId);
      if (!found) return fail("Section not found");
      var sectionSpec = RB.getSectionSpec(found.section.type);
      if (sectionSpec.kind !== "entries") return fail("This section has no entries");
      var entry = RB.createEntry(found.section.type);
      found.section.entries.push(entry);
      notify();
      return ok({ id: entry.id });
    }

    function removeEntry(sectionId, entryId) {
      var found = findSection(document, sectionId);
      if (!found) return fail("Section not found");
      if (!Array.isArray(found.section.entries)) return fail("This section has no entries");
      var entryFound = findEntry(found.section, entryId);
      if (!entryFound) return fail("Entry not found");
      found.section.entries.splice(entryFound.index, 1);
      notify();
      return ok();
    }

    function addSection(type) {
      var sectionSpec = RB.getSectionSpec(type);
      if (!sectionSpec) return fail("Unknown section type");
      var exists = document.sections.some(function (section) {
        return section.type === type;
      });
      if (exists) return fail("This section is already in the document");
      var section = RB.createSection(type);
      document.sections.push(section);
      notify();
      return ok({ id: section.id });
    }

    function removeSection(sectionId) {
      var found = findSection(document, sectionId);
      if (!found) return fail("Section not found");
      var sectionSpec = RB.getSectionSpec(found.section.type);
      if (sectionSpec.required) return fail("Personal information stays in the document");
      document.sections.splice(found.index, 1);
      notify();
      return ok();
    }

    function renameSection(sectionId, title) {
      var found = findSection(document, sectionId);
      if (!found) return fail("Section not found");
      if (typeof title !== "string" || !title.trim()) return fail("Title is required");
      found.section.title = title.trim();
      notify();
      return ok();
    }

    function moveSection(sectionId, offset) {
      if (offset !== -1 && offset !== 1) return fail("Move offset must be -1 or 1");
      var found = findSection(document, sectionId);
      if (!found) return fail("Section not found");
      var sectionSpec = RB.getSectionSpec(found.section.type);
      if (sectionSpec.pinned) return fail("Personal information stays first");
      var nextIndex = found.index + offset;
      if (nextIndex <= 0 || nextIndex >= document.sections.length) {
        return fail("Section is already at the edge");
      }
      var removed = document.sections.splice(found.index, 1)[0];
      document.sections.splice(nextIndex, 0, removed);
      notify();
      return ok();
    }

    function reorderSections(orderedIds) {
      if (!Array.isArray(orderedIds)) return fail("Section order must be a list of ids");
      var currentIds = document.sections.map(function (section) {
        return section.id;
      });
      if (orderedIds.length !== currentIds.length || orderedIds[0] !== currentIds[0]) {
        return fail("Personal information stays first");
      }
      var seen = {};
      for (var index = 0; index < orderedIds.length; index += 1) {
        var id = orderedIds[index];
        if (seen[id] || currentIds.indexOf(id) === -1) {
          return fail("Section order must include each section once");
        }
        seen[id] = true;
      }
      var byId = {};
      document.sections.forEach(function (section) {
        byId[section.id] = section;
      });
      document.sections = orderedIds.map(function (id) {
        return byId[id];
      });
      notify();
      return ok();
    }

    function setTemplate(templateId) {
      if (!RB.isTemplateId(templateId)) return fail("Unknown template");
      document.template = templateId;
      notify();
      return ok();
    }

    function replaceDocument(nextDocument) {
      var copy = clone(nextDocument);
      var check = checkDocument(copy);
      if (!check.ok) return check;
      document = copy;
      notify();
      return ok();
    }

    return Object.freeze({
      getDocument: snapshot,
      subscribe: subscribe,
      updateFields: updateFields,
      updateEntry: updateEntry,
      addEntry: addEntry,
      removeEntry: removeEntry,
      addSection: addSection,
      removeSection: removeSection,
      renameSection: renameSection,
      moveSection: moveSection,
      reorderSections: reorderSections,
      setTemplate: setTemplate,
      replaceDocument: replaceDocument
    });
  }

  RB.createState = createState;
})(typeof window !== "undefined" ? window : globalThis);
