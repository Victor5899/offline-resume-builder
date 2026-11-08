/* Checks a resume document before it replaces the one on screen or is restored. */
(function (root) {
  "use strict";

  var RB = root.ResumeBuilder = root.ResumeBuilder || {};
  var DOCUMENT_KEYS = Object.create(null);
  DOCUMENT_KEYS.version = true;
  DOCUMENT_KEYS.template = true;
  DOCUMENT_KEYS.sections = true;
  var URL_PATTERN = /^https?:\/\/\S+$/i;

  function fail(error) {
    return { ok: false, error: error };
  }

  function ok() {
    return { ok: true };
  }

  function ownKeys(value) {
    return Object.keys(value);
  }

  function isBlockedKey(key) {
    return key === "__proto__" || key === "prototype" || key === "constructor";
  }

  function hasBlockedKey(value) {
    return ownKeys(value).some(isBlockedKey);
  }

  function isStringList(value) {
    if (!denseArray(value)) return false;
    return value.every(function (item) {
      return typeof item === "string";
    });
  }

  function denseArray(value) {
    if (!Array.isArray(value)) return false;
    var keys = ownKeys(value);
    if (keys.length !== value.length) return false;
    for (var index = 0; index < value.length; index += 1) {
      if (keys[index] !== String(index)) return false;
    }
    return true;
  }

  function fieldKindMatches(fieldSpec, value) {
    if (fieldSpec.input === RB.LIST_INPUT) return isStringList(value);
    return typeof value === "string";
  }

  function validId(value) {
    return typeof value === "string" && value.length > 0 && value.length <= 128 && !isBlockedKey(value);
  }

  function isUrlKey(key) {
    return key === "website" || key === "linkedin" || key === "github" || key === "url";
  }

  function allowedUrl(value) {
    if (typeof value !== "string") return false;
    var text = value.trim();
    if (!text) return true;
    return URL_PATTERN.test(text);
  }

  function checkFieldsObject(sectionSpec, fields) {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      return "Section " + sectionSpec.type + " needs a fields object";
    }
    if (hasBlockedKey(fields)) return "This resume contains a field that cannot be imported.";
    var known = Object.create(null);
    var missing = sectionSpec.fields.some(function (fieldSpec) {
      known[fieldSpec.key] = true;
      return !Object.prototype.hasOwnProperty.call(fields, fieldSpec.key) ||
        !fieldKindMatches(fieldSpec, fields[fieldSpec.key]);
    });
    if (missing) return "Section " + sectionSpec.type + " has missing or invalid fields";
    var unknown = ownKeys(fields).some(function (key) {
      return !known[key];
    });
    if (unknown) return "Section " + sectionSpec.type + " has an unknown field";
    return "";
  }

  function checkEntry(sectionSpec, entry, ids) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return "An entry in " + sectionSpec.type + " is invalid";
    }
    if (hasBlockedKey(entry)) return "This resume contains a field that cannot be imported.";
    if (!validId(entry.id)) return "An entry is missing an id";
    if (ids[entry.id]) return "Duplicate id: " + entry.id;
    ids[entry.id] = true;

    var known = Object.create(null);
    known.id = true;
    var invalid = sectionSpec.fields.some(function (fieldSpec) {
      known[fieldSpec.key] = true;
      return !Object.prototype.hasOwnProperty.call(entry, fieldSpec.key) ||
        !fieldKindMatches(fieldSpec, entry[fieldSpec.key]);
    });
    if (invalid) return "Entry " + entry.id + " has missing or invalid fields";
    var unknown = ownKeys(entry).some(function (key) {
      return !known[key];
    });
    if (unknown) return "Entry " + entry.id + " has an unknown field";
    return "";
  }

  function checkUrls(document) {
    for (var index = 0; index < document.sections.length; index += 1) {
      var section = document.sections[index];
      var sectionSpec = RB.getSectionSpec(section.type);
      if (!sectionSpec) return "Unknown section type";
      var specs = sectionSpec.fields;
      for (var fieldIndex = 0; fieldIndex < specs.length; fieldIndex += 1) {
        var fieldSpec = specs[fieldIndex];
        if (!isUrlKey(fieldSpec.key)) continue;
        var urlValue = sectionSpec.kind === "fields"
          ? section.fields[fieldSpec.key]
          : null;
        if (sectionSpec.kind === "fields" && !allowedUrl(urlValue)) {
          return "A link must start with http:// or https://, or be left blank.";
        }
      }
      if (sectionSpec.kind === "entries") {
        for (var entryIndex = 0; entryIndex < section.entries.length; entryIndex += 1) {
          var entry = section.entries[entryIndex];
          for (var entryField = 0; entryField < specs.length; entryField += 1) {
            if (!isUrlKey(specs[entryField].key)) continue;
            if (!allowedUrl(entry[specs[entryField].key])) {
              return "A link must start with http:// or https://, or be left blank.";
            }
          }
        }
      }
    }
    return "";
  }

  function validateDocument(document) {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return fail("This file is not a resume document.");
    }
    if (hasBlockedKey(document)) return fail("This resume contains a field that cannot be imported.");
    var unknownDocumentKey = ownKeys(document).some(function (key) {
      return !DOCUMENT_KEYS[key];
    });
    if (unknownDocumentKey) return fail("This resume contains a field that cannot be imported.");
    if (!Object.prototype.hasOwnProperty.call(document, "version")) {
      return fail("This file is not a resume document.");
    }
    if (document.version !== RB.DOCUMENT_VERSION) return fail("Resume version is not supported.");
    if (!RB.isTemplateId(document.template)) return fail("Unknown template");
    if (!denseArray(document.sections) || document.sections.length === 0) {
      return fail("Resume needs at least the personal section");
    }

    var seenTypes = Object.create(null);
    var seenIds = Object.create(null);
    for (var index = 0; index < document.sections.length; index += 1) {
      var section = document.sections[index];
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        return fail("A section is invalid");
      }
      if (hasBlockedKey(section)) return fail("This resume contains a field that cannot be imported.");
      var sectionSpec = RB.getSectionSpec(section.type);
      if (!sectionSpec) return fail("Unknown section type");
      if (seenTypes[section.type]) return fail("Duplicate section: " + section.type);
      seenTypes[section.type] = true;
      if (!validId(section.id)) return fail("A section is missing an id");
      if (seenIds[section.id]) return fail("Duplicate id: " + section.id);
      seenIds[section.id] = true;
      if (typeof section.title !== "string" || !section.title.trim()) {
        return fail("Section " + section.type + " needs a title");
      }
      if (index === 0 && section.type !== "personal") {
        return fail("Personal information stays first");
      }

      var sectionKeys = Object.create(null);
      sectionKeys.id = true;
      sectionKeys.type = true;
      sectionKeys.title = true;
      if (sectionSpec.kind === "fields") sectionKeys.fields = true;
      else sectionKeys.entries = true;
      var unknownSectionKey = ownKeys(section).some(function (key) {
        return !sectionKeys[key];
      });
      if (unknownSectionKey) return fail("This resume contains a field that cannot be imported.");

      if (sectionSpec.kind === "fields") {
        var fieldError = checkFieldsObject(sectionSpec, section.fields);
        if (fieldError) return fail(fieldError);
      } else if (!denseArray(section.entries)) {
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

  function validateImport(document) {
    var structural = validateDocument(document);
    if (!structural.ok) return structural;
    var urlError = checkUrls(document);
    if (urlError) return fail(urlError);
    return ok();
  }

  RB.validateDocument = validateDocument;
  RB.validateImport = validateImport;
})(typeof window !== "undefined" ? window : globalThis);
