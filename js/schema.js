(function (root) {
  "use strict";

  var RB = root.ResumeBuilder = root.ResumeBuilder || {};

  var TEXT = "text";
  var MULTILINE = "multiline";
  var LIST = "list";

  function field(key, label, input) {
    return Object.freeze({ key: key, label: label, input: input || TEXT });
  }

  function spec(type, title, kind, options, fields) {
    return Object.freeze({
      type: type,
      title: title,
      kind: kind,
      required: Boolean(options.required),
      pinned: Boolean(options.pinned),
      repeatable: false,
      fields: Object.freeze(fields)
    });
  }

  var SECTION_CATALOG = Object.freeze({
    personal: spec("personal", "Personal information", "fields", { required: true, pinned: true }, [
      field("fullName", "Full name"),
      field("headline", "Headline"),
      field("email", "Email"),
      field("phone", "Phone"),
      field("location", "Location"),
      field("website", "Website"),
      field("linkedin", "LinkedIn"),
      field("github", "GitHub")
    ]),
    summary: spec("summary", "Professional summary", "fields", {}, [
      field("text", "Summary", MULTILINE)
    ]),
    education: spec("education", "Education", "entries", {}, [
      field("institution", "Institution"),
      field("credential", "Credential"),
      field("location", "Location"),
      field("start", "Start"),
      field("end", "End"),
      field("details", "Details", MULTILINE)
    ]),
    skills: spec("skills", "Technical skills", "entries", {}, [
      field("category", "Category"),
      field("items", "Skills", LIST)
    ]),
    experience: spec("experience", "Work experience", "entries", {}, [
      field("role", "Role"),
      field("organization", "Organization"),
      field("location", "Location"),
      field("start", "Start"),
      field("end", "End"),
      field("highlights", "Highlights", LIST)
    ]),
    projects: spec("projects", "Projects", "entries", {}, [
      field("name", "Name"),
      field("url", "URL"),
      field("technologies", "Technologies"),
      field("highlights", "Highlights", LIST)
    ]),
    certifications: spec("certifications", "Certifications", "entries", {}, [
      field("name", "Name"),
      field("issuer", "Issuer"),
      field("date", "Date"),
      field("url", "URL")
    ]),
    achievements: spec("achievements", "Achievements", "entries", {}, [
      field("title", "Title"),
      field("description", "Description", MULTILINE)
    ]),
    responsibilities: spec("responsibilities", "Positions of responsibility", "entries", {}, [
      field("role", "Role"),
      field("organization", "Organization"),
      field("start", "Start"),
      field("end", "End"),
      field("highlights", "Highlights", LIST)
    ]),
    additional: spec("additional", "Additional information", "entries", {}, [
      field("label", "Label"),
      field("value", "Value")
    ])
  });

  var SECTION_TYPES = Object.freeze(Object.keys(SECTION_CATALOG));
  var TEMPLATE_IDS = Object.freeze(["classic", "modern", "creative"]);
  var TEMPLATE_LABELS = Object.freeze({
    classic: "Classic",
    modern: "Modern",
    creative: "Creative"
  });

  function createId() {
    if (root.crypto && typeof root.crypto.randomUUID === "function") {
      return root.crypto.randomUUID();
    }
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function emptyValue(fieldSpec) {
    return fieldSpec.input === LIST ? [] : "";
  }

  function getSectionSpec(type) {
    return SECTION_CATALOG[type] || null;
  }

  function isTemplateId(templateId) {
    return TEMPLATE_IDS.indexOf(templateId) !== -1;
  }

  function templateLabel(templateId) {
    return TEMPLATE_LABELS[templateId] || TEMPLATE_LABELS.classic;
  }

  function createSection(type) {
    var sectionSpec = getSectionSpec(type);
    if (!sectionSpec) {
      throw new Error("Unknown section type: " + type);
    }

    var section = {
      id: createId(),
      type: sectionSpec.type,
      title: sectionSpec.title
    };

    if (sectionSpec.kind === "fields") {
      section.fields = {};
      sectionSpec.fields.forEach(function (fieldSpec) {
        section.fields[fieldSpec.key] = emptyValue(fieldSpec);
      });
    } else {
      section.entries = [];
    }

    return section;
  }

  function createEntry(type) {
    var sectionSpec = getSectionSpec(type);
    if (!sectionSpec || sectionSpec.kind !== "entries") {
      throw new Error("Section type has no entries: " + type);
    }

    var entry = { id: createId() };
    sectionSpec.fields.forEach(function (fieldSpec) {
      entry[fieldSpec.key] = emptyValue(fieldSpec);
    });
    return entry;
  }

  function createEmptyDocument() {
    return {
      version: RB.DOCUMENT_VERSION,
      template: "classic",
      sections: [createSection("personal")]
    };
  }

  RB.DOCUMENT_VERSION = 1;
  RB.LIST_INPUT = LIST;
  RB.SECTION_CATALOG = SECTION_CATALOG;
  RB.SECTION_TYPES = SECTION_TYPES;
  RB.TEMPLATE_IDS = TEMPLATE_IDS;
  RB.getSectionSpec = getSectionSpec;
  RB.isTemplateId = isTemplateId;
  RB.templateLabel = templateLabel;
  RB.createId = createId;
  RB.createSection = createSection;
  RB.createEntry = createEntry;
  RB.createEmptyDocument = createEmptyDocument;
})(typeof window !== "undefined" ? window : globalThis);
