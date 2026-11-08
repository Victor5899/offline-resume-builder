/* Downloads the resume as JSON and reads a JSON file back in. */
(function (root) {
  "use strict";

  var RB = root.ResumeBuilder = root.ResumeBuilder || {};
  var MAX_IMPORT_BYTES = 1024 * 1024;
  var URL_RELEASE_MS = 1000;

  function fail(error) {
    return { ok: false, error: error };
  }

  function isBlockedKey(key) {
    return key === "__proto__" || key === "prototype" || key === "constructor";
  }

  function blockedReviver(key, value) {
    if (isBlockedKey(key)) throw new Error("blocked-key");
    return value;
  }

  function exportDocument(document) {
    if (!document || typeof RB.validateDocument !== "function") return null;
    var check = RB.validateDocument(document);
    if (!check.ok) return null;
    try {
      return JSON.parse(JSON.stringify({
        version: document.version,
        template: document.template,
        sections: document.sections
      }), blockedReviver);
    } catch (error) {
      return null;
    }
  }

  function exportFilename(document) {
    var name = "";
    var sections = document && document.sections;
    if (Array.isArray(sections)) {
      for (var index = 0; index < sections.length; index += 1) {
        var section = sections[index];
        if (section && section.type === "personal" && section.fields && typeof section.fields.fullName === "string") {
          name = section.fields.fullName;
          break;
        }
      }
    }
    var slug = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug) return "resume.json";
    return "resume-" + slug.slice(0, 80) + ".json";
  }

  function parseResumeText(text) {
    if (typeof text !== "string" || !text.trim()) return fail("This file is empty.");
    if (text.length > MAX_IMPORT_BYTES) {
      return fail("This file is too large to import. The limit is 1 MB.");
    }
    var source = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
    var parsed;
    try {
      parsed = JSON.parse(source, blockedReviver);
    } catch (error) {
      if (error && error.message === "blocked-key") {
        return fail("This resume contains a field that cannot be imported.");
      }
      return fail("This file is not valid JSON.");
    }
    if (typeof RB.validateImport !== "function") return fail("This file could not be checked.");
    var check = RB.validateImport(parsed);
    if (!check.ok) return check;
    return { ok: true, document: parsed };
  }

  function looksLikeJson(file) {
    var name = String(file.name || "");
    var type = String(file.type || "");
    if (!name && !type) return true;
    if (/\.json$/i.test(name)) return true;
    if (type === "application/json" || type === "text/json") return true;
    return false;
  }

  function readResumeFile(file) {
    return new Promise(function (resolve) {
      if (!file) {
        resolve(fail("Choose a JSON file."));
        return;
      }
      if (!looksLikeJson(file)) {
        resolve(fail("Choose a JSON file."));
        return;
      }
      if (typeof file.size === "number" && file.size > MAX_IMPORT_BYTES) {
        resolve(fail("This file is too large to import. The limit is 1 MB."));
        return;
      }
      if (typeof root.FileReader !== "function") {
        resolve(fail("This browser cannot read a file."));
        return;
      }
      var reader = new root.FileReader();
      reader.onload = function () {
        resolve(parseResumeText(typeof reader.result === "string" ? reader.result : ""));
      };
      reader.onerror = function () {
        resolve(fail("The file could not be read."));
      };
      try {
        reader.readAsText(file);
      } catch (error) {
        resolve(fail("The file could not be read."));
      }
    });
  }

  function downloadResume(document) {
    var payload = exportDocument(document);
    if (!payload) return fail("This resume could not be downloaded.");
    var json = JSON.stringify(payload, null, 2) + "\n";
    var filename = exportFilename(payload);
    if (!root.document || typeof root.document.createElement !== "function" || !root.URL) {
      return fail("This browser cannot download a file.");
    }
    var blob;
    var objectUrl;
    try {
      blob = new root.Blob([json], { type: "application/json" });
      objectUrl = root.URL.createObjectURL(blob);
    } catch (error) {
      return fail("This resume could not be downloaded.");
    }
    var link = root.document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.rel = "noopener";
    if (!root.document.body) {
      root.URL.revokeObjectURL(objectUrl);
      return fail("This resume could not be downloaded.");
    }
    root.document.body.appendChild(link);
    try {
      link.click();
    } catch (error) {
      link.remove();
      root.URL.revokeObjectURL(objectUrl);
      return fail("This resume could not be downloaded.");
    }
    link.remove();
    root.setTimeout(function () {
      root.URL.revokeObjectURL(objectUrl);
    }, URL_RELEASE_MS);
    return { ok: true, filename: filename };
  }

  RB.MAX_IMPORT_BYTES = MAX_IMPORT_BYTES;
  RB.exportDocument = exportDocument;
  RB.exportFilename = exportFilename;
  RB.parseResumeText = parseResumeText;
  RB.readResumeFile = readResumeFile;
  RB.downloadResume = downloadResume;
})(typeof window !== "undefined" ? window : globalThis);
