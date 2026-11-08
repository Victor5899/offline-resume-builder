(function (root) {
  "use strict";

  var RB = root.ResumeBuilder = root.ResumeBuilder || {};

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function clean(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function safeHref(value) {
    var url = clean(value);
    if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) return url;
    return "";
  }

  function displayUrl(url) {
    return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }

  function dateRange(start, end) {
    if (start && end) return start + " – " + end;
    return start || end || "";
  }

  function appendTextLink(parent, href, label) {
    var address = safeHref(href);
    if (!address) {
      if (label) parent.appendChild(document.createTextNode(label));
      return;
    }
    var link = el("a");
    link.href = address;
    link.textContent = label || displayUrl(address);
    parent.appendChild(link);
  }

  function entryHead(primary, secondary, meta) {
    var head = el("div", "entry-head");
    var titles = el("div", "entry-titles");
    if (primary) titles.appendChild(el("p", "entry-primary", primary));
    if (secondary) titles.appendChild(el("p", "entry-secondary", secondary));
    head.appendChild(titles);
    if (meta) head.appendChild(el("p", "entry-meta", meta));
    return head;
  }

  function bulletList(items) {
    var list = el("ul", "highlights");
    items.forEach(function (item) {
      var text = clean(item);
      if (!text) return;
      list.appendChild(el("li", "", text));
    });
    return list.childElementCount ? list : null;
  }

  function appendSection(parent, title, blocks) {
    var filled = blocks.filter(Boolean);
    if (!filled.length) return;
    var section = el("section", "resume-section");
    section.appendChild(el("h2", "section-title", title));
    filled.forEach(function (block) {
      section.appendChild(block);
    });
    parent.appendChild(section);
  }

  function renderPersonal(section) {
    var fields = section.fields;
    var header = el("header", "resume-header");
    var name = clean(fields.fullName) || "Untitled resume";
    header.appendChild(el("h1", "resume-name", name));
    if (clean(fields.headline)) header.appendChild(el("p", "resume-headline", clean(fields.headline)));

    var contacts = el("ul", "contact-list");
    function addContact(node) {
      if (!node) return;
      var item = el("li");
      item.appendChild(node);
      contacts.appendChild(item);
    }

    if (clean(fields.email)) {
      var email = el("span");
      appendTextLink(email, "mailto:" + clean(fields.email), clean(fields.email));
      addContact(email);
    }
    if (clean(fields.phone)) addContact(el("span", "", clean(fields.phone)));
    if (clean(fields.location)) addContact(el("span", "", clean(fields.location)));
    [
      ["Website", fields.website],
      ["LinkedIn", fields.linkedin],
      ["GitHub", fields.github]
    ].forEach(function (pair) {
      if (!safeHref(pair[1])) return;
      var holder = el("span");
      appendTextLink(holder, pair[1], pair[0]);
      addContact(holder);
    });

    if (contacts.childElementCount) header.appendChild(contacts);
    return header;
  }

  function renderSummary(section) {
    var text = clean(section.fields.text);
    if (!text) return [];
    return [el("p", "summary-text", text)];
  }

  function renderEducation(section) {
    return section.entries.map(function (entry) {
      var credential = clean(entry.credential);
      var institution = clean(entry.institution);
      var place = [institution, clean(entry.location)].filter(Boolean).join(", ");
      if (!credential && !place && !clean(entry.details)) return null;
      var block = el("article", "entry");
      block.appendChild(entryHead(credential, place, dateRange(clean(entry.start), clean(entry.end))));
      if (clean(entry.details)) block.appendChild(el("p", "entry-details", clean(entry.details)));
      return block;
    });
  }

  function renderSkills(section) {
    return section.entries.map(function (entry) {
      var category = clean(entry.category);
      var items = entry.items.map(clean).filter(Boolean);
      if (!category && !items.length) return null;
      var row = el("p", "skill-row");
      if (category) row.appendChild(el("span", "skill-category", category));
      if (category && items.length) row.appendChild(document.createTextNode(": "));
      if (items.length) row.appendChild(document.createTextNode(items.join(", ")));
      return row;
    });
  }

  function renderRole(entry) {
    var role = clean(entry.role);
    var organization = [clean(entry.organization), clean(entry.location)].filter(Boolean).join(", ");
    var highlights = bulletList(entry.highlights || []);
    if (!role && !organization && !highlights) return null;
    var block = el("article", "entry");
    block.appendChild(entryHead(role, organization, dateRange(clean(entry.start), clean(entry.end))));
    if (highlights) block.appendChild(highlights);
    return block;
  }

  function renderExperience(section) {
    return section.entries.map(renderRole);
  }

  function renderProjects(section) {
    return section.entries.map(function (entry) {
      var name = clean(entry.name);
      var technologies = clean(entry.technologies);
      var highlights = bulletList(entry.highlights || []);
      if (!name && !technologies && !highlights && !safeHref(entry.url)) return null;
      var block = el("article", "entry");
      var head = el("div", "entry-head");
      var titles = el("div", "entry-titles");
      if (name) titles.appendChild(el("p", "entry-primary", name));
      if (safeHref(entry.url)) {
        var linkLine = el("p", "entry-secondary");
        appendTextLink(linkLine, entry.url, displayUrl(clean(entry.url)));
        titles.appendChild(linkLine);
      }
      head.appendChild(titles);
      block.appendChild(head);
      if (technologies) block.appendChild(el("p", "entry-details", technologies));
      if (highlights) block.appendChild(highlights);
      return block;
    });
  }

  function renderCertifications(section) {
    return section.entries.map(function (entry) {
      var name = clean(entry.name);
      var issuer = clean(entry.issuer);
      if (!name && !issuer) return null;
      var block = el("article", "entry");
      block.appendChild(entryHead(name, issuer, clean(entry.date)));
      if (safeHref(entry.url)) {
        var linkLine = el("p", "entry-details");
        appendTextLink(linkLine, entry.url, displayUrl(clean(entry.url)));
        block.appendChild(linkLine);
      }
      return block;
    });
  }

  function renderAchievements(section) {
    return section.entries.map(function (entry) {
      var title = clean(entry.title);
      var description = clean(entry.description);
      if (!title && !description) return null;
      var block = el("article", "entry");
      if (title) block.appendChild(el("p", "entry-primary", title));
      if (description) block.appendChild(el("p", "entry-details", description));
      return block;
    });
  }

  function renderAdditional(section) {
    return section.entries.map(function (entry) {
      var label = clean(entry.label);
      var value = clean(entry.value);
      if (!label && !value) return null;
      var row = el("p", "skill-row");
      if (label) row.appendChild(el("span", "skill-category", label));
      if (label && value) row.appendChild(document.createTextNode(": "));
      if (value) row.appendChild(document.createTextNode(value));
      return row;
    });
  }

  var SECTION_RENDERERS = {
    summary: renderSummary,
    education: renderEducation,
    skills: renderSkills,
    experience: renderExperience,
    projects: renderProjects,
    certifications: renderCertifications,
    achievements: renderAchievements,
    responsibilities: renderExperience,
    additional: renderAdditional
  };

  function renderResume(container, resume) {
    if (!container) return;
    container.replaceChildren();

    var page = el("div", "page");
    var article = el("article", "resume");
    article.setAttribute("data-template", "classic");
    article.setAttribute("aria-label", "Classic resume preview");

    resume.sections.forEach(function (section) {
      if (section.type === "personal") {
        article.appendChild(renderPersonal(section));
        return;
      }
      var renderSection = SECTION_RENDERERS[section.type];
      if (!renderSection) return;
      appendSection(article, section.title, renderSection(section));
    });

    page.appendChild(article);
    container.appendChild(page);
  }

  RB.renderResume = renderResume;
})(typeof window !== "undefined" ? window : globalThis);
