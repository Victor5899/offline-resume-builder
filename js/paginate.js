/* Packs the rendered resume into measured A4 pages. Preview and print share this DOM. */
(function (root) {
  "use strict";

  var RB = root.ResumeBuilder = root.ResumeBuilder || {};
  var SAFETY = 1;

  function contentLimit(box) {
    var rect = box.getBoundingClientRect();
    var style = root.getComputedStyle(box);
    var pad = parseFloat(style.paddingBottom) || 0;
    var border = parseFloat(style.borderBottomWidth) || 0;
    return rect.bottom - border - pad - SAFETY;
  }

  function columnOverflows(column, which) {
    if (!column) return false;
    var box = which === "linear" ? (column.closest(".page") || column) : column;
    return overflowsBox(box);
  }

  function overflowsBox(box) {
    if (!box || !box.childElementCount) return false;
    var limit = contentLimit(box);
    var walker = root.document.createTreeWalker(box, root.NodeFilter.SHOW_ELEMENT, null);
    var node = walker.nextNode();
    while (node) {
      var style = root.getComputedStyle(node);
      var margin = parseFloat(style.marginBottom) || 0;
      if (node.getBoundingClientRect().bottom + margin > limit) return true;
      node = walker.nextNode();
    }
    return false;
  }

  function lastTextNode(element) {
    if (!element) return null;
    var walker = root.document.createTreeWalker(element, root.NodeFilter.SHOW_TEXT, null);
    var last = null;
    var node = walker.nextNode();
    while (node) {
      if (node.nodeValue) last = node;
      node = walker.nextNode();
    }
    return last;
  }

  function createLinearPage(template) {
    var page = root.document.createElement("div");
    page.className = "page";
    var article = root.document.createElement("article");
    article.className = "resume";
    article.setAttribute("data-template", template);
    page.appendChild(article);
    return { page: page, column: article };
  }

  function createCreativePage(header, cloneHeader) {
    var page = root.document.createElement("div");
    page.className = "page page-creative";
    var article = root.document.createElement("article");
    article.className = "resume";
    article.setAttribute("data-template", "creative");
    if (header) article.appendChild(cloneHeader ? header.cloneNode(true) : header);
    var columns = root.document.createElement("div");
    columns.className = "resume-columns";
    var sidebar = root.document.createElement("aside");
    sidebar.className = "resume-sidebar";
    sidebar.setAttribute("aria-label", "Contact, skills, and education");
    var main = root.document.createElement("div");
    main.className = "resume-main";
    columns.appendChild(sidebar);
    columns.appendChild(main);
    article.appendChild(columns);
    page.appendChild(article);
    return { page: page, article: article, columns: columns, sidebar: sidebar, main: main };
  }

  function lockColumns(built) {
    var height = built.columns.getBoundingClientRect().height;
    if (height < 8) return;
    var px = height + "px";
    built.sidebar.style.height = px;
    built.main.style.height = px;
  }

  function mount(parent, built, creative) {
    parent.appendChild(built.page);
    if (creative) lockColumns(built);
    return built;
  }

  function entryAtoms(entry) {
    var atoms = [];
    Array.prototype.forEach.call(entry.children, function (child) {
      if (child.classList.contains("highlights")) {
        Array.prototype.forEach.call(child.children, function (item) {
          atoms.push({ kind: "bullet", node: item, listClass: child.className });
        });
        return;
      }
      atoms.push({
        kind: "block",
        node: child,
        sticky: child.classList.contains("entry-head") || child.classList.contains("entry-primary")
      });
    });
    atoms.forEach(function (atom, index) {
      atom.keepWithNext = Boolean(atom.sticky && index < atoms.length - 1);
    });
    return atoms;
  }

  function makeBlock(node) {
    if (node.classList.contains("entry")) {
      return { type: "entry", node: node, atoms: entryAtoms(node), ai: 0, intact: true };
    }
    if (node.classList.contains("contact-list")) {
      return {
        type: "contacts",
        listClass: node.className,
        items: Array.prototype.slice.call(node.children),
        ii: 0,
        intact: true
      };
    }
    return { type: "simple", node: node };
  }

  function readSections(container) {
    var sections = [];
    if (!container) return { sections: sections, si: 0 };
    Array.prototype.forEach.call(container.children, function (child) {
      if (!child.classList.contains("resume-section")) return;
      var title = null;
      var blocks = [];
      Array.prototype.forEach.call(child.children, function (inner) {
        if (inner.classList.contains("section-title")) title = inner;
        else blocks.push(makeBlock(inner));
      });
      if (!blocks.length) return;
      sections.push({ title: title, titleUsed: false, blocks: blocks, bi: 0 });
    });
    return { sections: sections, si: 0 };
  }

  function cursorKey(headerState, state) {
    var headerKey = "x";
    if (headerState) headerKey = headerState.done ? "H" : "h" + String(headerState.pi || 0);
    if (!state || state.si >= state.sections.length) return headerKey + ":end";
    var section = state.sections[state.si];
    var block = section.blocks[section.bi];
    var inner = 0;
    var textLen = 0;
    if (block && block.type === "entry") {
      inner = block.ai;
      if (block.atoms[block.ai]) textLen = block.atoms[block.ai].node.textContent.length;
    } else if (block && block.type === "contacts") {
      inner = block.ii;
      if (block.items[block.ii]) textLen = block.items[block.ii].textContent.length;
    } else if (block && block.node) {
      textLen = block.node.textContent.length;
    }
    return headerKey + ":" + state.si + ":" + section.bi + ":" + inner + ":" + textLen;
  }

  function shellHasBody(shell) {
    var child = shell.firstElementChild;
    while (child) {
      if (!child.classList.contains("section-title")) return true;
      child = child.nextElementSibling;
    }
    return false;
  }

  function detachShell(column, state) {
    if (state.shell && state.shell.parentNode === column) column.removeChild(state.shell);
    state.shell = null;
    state.entry = null;
    state.entryBlock = null;
    state.shellIsNew = false;
  }

  function ensureShell(column, state, section) {
    if (state.shell && state.shell.parentNode === column) return state.shell;
    var shell = root.document.createElement("section");
    shell.className = "resume-section";
    if (section.title) {
      shell.appendChild(section.titleUsed ? section.title.cloneNode(true) : section.title);
    }
    column.appendChild(shell);
    state.shell = shell;
    state.shellIsNew = true;
    state.entry = null;
    state.entryBlock = null;
    return shell;
  }

  function ensureEntry(shell, state, block) {
    if (state.entry && state.entry.parentNode === shell && state.entryBlock === block) return state.entry;
    var entry = root.document.createElement("article");
    entry.className = block.ai > 0 ? "entry entry-continued" : "entry";
    shell.appendChild(entry);
    state.entry = entry;
    state.entryBlock = block;
    return entry;
  }

  function addAtom(entry, atom) {
    if (atom.kind === "bullet") {
      var list = entry.lastElementChild;
      var createdList = false;
      if (!list || list.tagName !== "UL") {
        list = root.document.createElement("ul");
        list.className = atom.listClass || "highlights";
        entry.appendChild(list);
        createdList = true;
      }
      list.appendChild(atom.node);
      return { nodes: [atom.node], list: list, createdList: createdList };
    }
    entry.appendChild(atom.node);
    return { nodes: [atom.node], list: null, createdList: false };
  }

  function undoAtom(entry, added) {
    added.nodes.forEach(function (node) {
      if (node.parentNode) node.parentNode.removeChild(node);
    });
    if (added.list && !added.list.childElementCount && added.list.parentNode) {
      added.list.parentNode.removeChild(added.list);
    }
    if (entry && entry.parentNode && !entry.childElementCount) entry.parentNode.removeChild(entry);
  }

  function fitTokens(textNode, tokens, overflows) {
    var lo = 1;
    var hi = tokens.length;
    var best = 0;
    while (lo <= hi) {
      var mid = Math.floor((lo + hi) / 2);
      textNode.nodeValue = tokens.slice(0, mid).join("");
      if (!overflows()) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (best === 0 && tokens[0] && tokens[0].trim()) {
      var word = tokens[0];
      var charLo = 1;
      var charHi = word.length;
      var charBest = 0;
      while (charLo <= charHi) {
        var charMid = Math.floor((charLo + charHi) / 2);
        textNode.nodeValue = word.slice(0, charMid);
        if (!overflows()) {
          charBest = charMid;
          charLo = charMid + 1;
        } else {
          charHi = charMid - 1;
        }
      }
      if (charBest === 0) {
        textNode.nodeValue = word.slice(0, 1);
        charBest = 1;
      } else {
        textNode.nodeValue = word.slice(0, charBest);
      }
      return { best: 1, charCut: charBest, word: word };
    }
    if (best > 0) textNode.nodeValue = tokens.slice(0, best).join("");
    return { best: best, charCut: 0, word: "" };
  }

  function remainderText(tokens, fit) {
    if (fit.charCut && fit.word) {
      var restWord = fit.word.slice(fit.charCut);
      var after = tokens.slice(1).join("");
      return (restWord + after).replace(/^\s+/, "");
    }
    return tokens.slice(fit.best).join("").replace(/^\s+/, "");
  }

  function withRemainder(node, rest) {
    var copy = node.cloneNode(true);
    var textNode = lastTextNode(copy);
    if (textNode) textNode.nodeValue = rest;
    else copy.textContent = rest;
    return copy;
  }

  function makeContext(sandbox, template, creative, header) {
    var built = creative ? createCreativePage(header, true) : createLinearPage(template);
    sandbox.appendChild(built.page);
    if (creative) lockColumns(built);
    function column(which) {
      if (which === "side") return built.sidebar;
      if (which === "main") return built.main;
      return built.column;
    }
    function overflows(which) {
      if (which === "linear") return overflowsBox(built.page);
      return overflowsBox(column(which));
    }
    return {
      column: column,
      overflows: overflows,
      reset: function (which) {
        column(which).replaceChildren();
      },
      destroy: function () {
        built.page.remove();
      }
    };
  }

  function fitsBuilt(ctx, which, build) {
    ctx.reset(which);
    build(ctx.column(which));
    var ok = !columnOverflows(ctx.column(which), which);
    ctx.reset(which);
    return ok;
  }

  function freshSection(section, fill) {
    return function (column) {
      var shell = root.document.createElement("section");
      shell.className = "resume-section";
      if (section.title) shell.appendChild(section.title.cloneNode(true));
      fill(shell);
      column.appendChild(shell);
    };
  }

  function rollbackNewShell(column, state, sectionShell, wasNew) {
    if (wasNew || (sectionShell && !shellHasBody(sectionShell))) detachShell(column, state);
  }

  function splitNodeText(node, overflows) {
    var textNode = lastTextNode(node);
    if (!textNode) return null;
    var original = textNode.nodeValue;
    var tokens = original.split(/(\s+)/);
    var fit = fitTokens(textNode, tokens, overflows);
    var fitted = (textNode.nodeValue || "").replace(/\s+$/, "");
    if (!fit.best || !fitted.trim()) {
      textNode.nodeValue = original;
      return null;
    }
    textNode.nodeValue = fitted;
    var rest = remainderText(tokens, fit);
    return { rest: rest, original: original, textNode: textNode };
  }

  function placeSimple(column, state, section, block, ctx, which) {
    var empty = !column.childElementCount;
    var shell = ensureShell(column, state, section);
    var wasNew = state.shellIsNew;
    shell.appendChild(block.node);
    if (!columnOverflows(column, which)) {
      section.titleUsed = true;
      state.shellIsNew = false;
      section.bi += 1;
      return "progress";
    }
    shell.removeChild(block.node);
    rollbackNewShell(column, state, shell, wasNew);

    var fitsFresh = fitsBuilt(ctx, which, freshSection(section, function (target) {
      target.appendChild(block.node);
    }));
    if (!empty && fitsFresh) return "defer";

    shell = ensureShell(column, state, section);
    wasNew = state.shellIsNew;
    shell.appendChild(block.node);
    var split = splitNodeText(block.node, function () {
      return columnOverflows(column, which);
    });
    if (!split || !split.rest) {
      if (columnOverflows(column, which) && !split) {
        shell.removeChild(block.node);
        rollbackNewShell(column, state, shell, wasNew);
        if (!empty) return "defer";
        shell = ensureShell(column, state, section);
        shell.appendChild(block.node);
      }
      section.titleUsed = true;
      state.shellIsNew = false;
      section.bi += 1;
      return "stop";
    }
    block.node = withRemainder(block.node, split.rest);
    section.titleUsed = true;
    state.shellIsNew = false;
    return "stop";
  }

  function contactList(block, items) {
    var list = root.document.createElement("ul");
    list.className = block.listClass || "contact-list";
    items.forEach(function (item) {
      list.appendChild(item);
    });
    return list;
  }

  function placeContacts(column, state, section, block, ctx, which) {
    if (block.intact) {
      var empty = !column.childElementCount;
      var shell = ensureShell(column, state, section);
      var wasNew = state.shellIsNew;
      var whole = contactList(block, block.items);
      shell.appendChild(whole);
      if (!columnOverflows(column, which)) {
        section.titleUsed = true;
        state.shellIsNew = false;
        section.bi += 1;
        return "progress";
      }
      block.items = Array.prototype.slice.call(whole.children);
      whole.remove();
      rollbackNewShell(column, state, shell, wasNew);
      var fitsWhole = fitsBuilt(ctx, which, freshSection(section, function (target) {
        target.appendChild(contactList(block, block.items));
      }));
      if (!empty && fitsWhole) return "defer";
      block.intact = false;
      block.ii = 0;
    }

    while (block.ii < block.items.length) {
      var columnEmpty = !column.childElementCount;
      var shell = ensureShell(column, state, section);
      var wasNew = state.shellIsNew;
      var list = shell.querySelector(":scope > .contact-list");
      if (!list) {
        list = root.document.createElement("ul");
        list.className = block.listClass || "contact-list";
        shell.appendChild(list);
      }
      var item = block.items[block.ii];
      list.appendChild(item);
      if (!columnOverflows(column, which)) {
        section.titleUsed = true;
        state.shellIsNew = false;
        block.ii += 1;
        continue;
      }
      var split = splitNodeText(item, function () {
        return columnOverflows(column, which);
      });
      var fitsItem = !split && fitsBuilt(ctx, which, freshSection(section, function (target) {
        target.appendChild(contactList(block, [item]));
      }));
      if (fitsItem || !split) {
        if (item.parentNode) item.parentNode.removeChild(item);
        if (list.parentNode && !list.childElementCount) list.remove();
        rollbackNewShell(column, state, shell, wasNew);
        if (!columnEmpty && fitsItem) return block.ii > 0 ? "stop" : "defer";
        if (!columnEmpty) return block.ii > 0 ? "stop" : "defer";
      }
      if (split && split.rest) {
        block.items.splice(block.ii + 1, 0, withRemainder(item, split.rest));
      }
      section.titleUsed = true;
      state.shellIsNew = false;
      block.ii += 1;
      return "stop";
    }
    section.bi += 1;
    return "progress";
  }

  function freshAtoms(section, atoms) {
    return freshSection(section, function (shell) {
      var entry = root.document.createElement("article");
      entry.className = "entry";
      atoms.forEach(function (atom) {
        addAtom(entry, atom);
      });
      shell.appendChild(entry);
    });
  }

  function placeEntry(column, state, section, block, ctx, which) {
    if (!block.atoms.length) {
      section.bi += 1;
      return "progress";
    }
    if (block.intact) {
      var empty = !column.childElementCount;
      var shell = ensureShell(column, state, section);
      var wasNew = state.shellIsNew;
      shell.appendChild(block.node);
      if (!columnOverflows(column, which)) {
        section.titleUsed = true;
        state.shellIsNew = false;
        section.bi += 1;
        return "progress";
      }
      shell.removeChild(block.node);
      rollbackNewShell(column, state, shell, wasNew);
      var fitsWhole = fitsBuilt(ctx, which, freshSection(section, function (target) {
        target.appendChild(block.node);
      }));
      if (!empty && fitsWhole) return "defer";
      block.intact = false;
    }
    return placeAtoms(column, state, section, block, ctx, which);
  }

  function splitAtomInPlace(column, state, section, atom, ctx, which) {
    var shell = ensureShell(column, state, section);
    var wasNew = state.shellIsNew;
    var entry = ensureEntry(shell, state, section.blocks[section.bi]);
    var added = addAtom(entry, atom);
    var split = splitNodeText(atom.node, function () {
      return columnOverflows(column, which);
    });
    if (!split) {
      undoAtom(entry, added);
      if (state.entry === entry) {
        state.entry = null;
        state.entryBlock = null;
      }
      rollbackNewShell(column, state, shell, wasNew);
      return null;
    }
    section.titleUsed = true;
    state.shellIsNew = false;
    return split;
  }

  function placeAtoms(column, state, section, block, ctx, which) {
    var placedAny = false;
    while (block.ai < block.atoms.length) {
      var empty = !column.childElementCount;
      var atom = block.atoms[block.ai];
      var partner = atom.keepWithNext ? block.atoms[block.ai + 1] : null;
      var group = partner ? [atom, partner] : [atom];
      var shell = ensureShell(column, state, section);
      var wasNew = state.shellIsNew;
      var entry = ensureEntry(shell, state, block);
      var added = group.map(function (part) {
        return addAtom(entry, part);
      });
      if (!columnOverflows(column, which)) {
        section.titleUsed = true;
        state.shellIsNew = false;
        block.ai += group.length;
        placedAny = true;
        continue;
      }
      added.slice().reverse().forEach(function (item) {
        undoAtom(entry, item);
      });
      if (state.entry === entry && !entry.isConnected) {
        state.entry = null;
        state.entryBlock = null;
      }
      rollbackNewShell(column, state, shell, wasNew);

      var fitsFresh = fitsBuilt(ctx, which, freshAtoms(section, group));
      if (!empty && fitsFresh) return placedAny ? "stop" : "defer";

      if (partner) {
        var partnerFitsFresh = fitsBuilt(ctx, which, freshAtoms(section, [partner]));
        if (!empty && partnerFitsFresh) return placedAny ? "stop" : "defer";
        shell = ensureShell(column, state, section);
        wasNew = state.shellIsNew;
        entry = ensureEntry(shell, state, block);
        var headAdd = addAtom(entry, atom);
        if (columnOverflows(column, which)) {
          undoAtom(entry, headAdd);
          if (state.entry === entry && !entry.isConnected) {
            state.entry = null;
            state.entryBlock = null;
          }
          rollbackNewShell(column, state, shell, wasNew);
          if (!empty) return placedAny ? "stop" : "defer";
          var headSplit = splitAtomInPlace(column, state, section, atom, ctx, which);
          if (!headSplit) return placedAny ? "stop" : "defer";
          if (headSplit.rest) atom.node = withRemainder(atom.node, headSplit.rest);
          else block.ai += 1;
          return "stop";
        }
        var partnerAdd = addAtom(entry, partner);
        var partnerSplit = splitNodeText(partner.node, function () {
          return columnOverflows(column, which);
        });
        if (!partnerSplit) {
          undoAtom(entry, partnerAdd);
          undoAtom(entry, headAdd);
          if (state.entry === entry && !entry.isConnected) {
            state.entry = null;
            state.entryBlock = null;
          }
          rollbackNewShell(column, state, shell, wasNew);
          if (!empty) return placedAny ? "stop" : "defer";
          return "defer";
        }
        section.titleUsed = true;
        state.shellIsNew = false;
        block.ai += 1;
        if (partnerSplit.rest) partner.node = withRemainder(partner.node, partnerSplit.rest);
        else block.ai += 1;
        return "stop";
      }

      if (!empty && fitsBuilt(ctx, which, freshAtoms(section, [atom]))) {
        return placedAny ? "stop" : "defer";
      }
      var singleSplit = splitAtomInPlace(column, state, section, atom, ctx, which);
      if (!singleSplit) return placedAny ? "stop" : "defer";
      if (singleSplit.rest) {
        block.atoms.splice(block.ai + 1, 0, {
          kind: atom.kind,
          node: withRemainder(atom.node, singleSplit.rest),
          listClass: atom.listClass,
          keepWithNext: false
        });
      }
      block.ai += 1;
      return "stop";
    }
    section.bi += 1;
    state.entry = null;
    state.entryBlock = null;
    return "progress";
  }

  function placeBlock(column, state, section, ctx, which) {
    var block = section.blocks[section.bi];
    if (!block) {
      section.bi += 1;
      return "progress";
    }
    if (block.type === "entry") return placeEntry(column, state, section, block, ctx, which);
    if (block.type === "contacts") return placeContacts(column, state, section, block, ctx, which);
    return placeSimple(column, state, section, block, ctx, which);
  }

  function fillColumn(column, flow, ctx, which) {
    flow.shell = null;
    flow.entry = null;
    flow.entryBlock = null;
    flow.shellIsNew = false;
    while (flow.si < flow.sections.length) {
      var section = flow.sections[flow.si];
      if (section.bi >= section.blocks.length) {
        flow.si += 1;
        flow.shell = null;
        flow.entry = null;
        flow.entryBlock = null;
        continue;
      }
      var outcome = placeBlock(column, flow, section, ctx, which);
      if (outcome === "defer" || outcome === "stop") return outcome;
    }
    return "done";
  }

  function headerPieces(header) {
    var pieces = [];
    var lead = [];
    Array.prototype.forEach.call(header.children, function (child) {
      if (child.classList.contains("contact-list")) {
        Array.prototype.forEach.call(child.children, function (item) {
          pieces.push({ kind: "contact", node: item, listClass: child.className });
        });
        return;
      }
      lead.push(child);
    });
    if (lead.length) pieces.unshift({ kind: "lead", nodes: lead });
    return pieces;
  }

  function placeHeader(column, headerState, ctx) {
    var header = headerState.node;
    if (headerState.intact) {
      var empty = !column.childElementCount;
      column.appendChild(header);
      if (!columnOverflows(column, "linear")) {
        headerState.done = true;
        return "progress";
      }
      column.removeChild(header);
      if (!empty) return "defer";
      headerState.intact = false;
      headerState.pieces = headerPieces(header);
      headerState.pi = 0;
    }

    var shell = column.querySelector(":scope > .resume-header");
    if (!shell) {
      shell = root.document.createElement("header");
      shell.className = "resume-header";
      column.appendChild(shell);
    }
    while (headerState.pi < headerState.pieces.length) {
      var piece = headerState.pieces[headerState.pi];
      var list = null;
      if (piece.kind === "lead") {
        piece.nodes.forEach(function (node) {
          shell.appendChild(node);
        });
      } else {
        list = shell.querySelector(":scope > .contact-list");
        if (!list) {
          list = root.document.createElement("ul");
          list.className = piece.listClass || "contact-list";
          shell.appendChild(list);
        }
        list.appendChild(piece.node);
      }
      if (!columnOverflows(column, "linear")) {
        headerState.pi += 1;
        continue;
      }
      if (piece.kind === "lead") {
        piece.nodes.forEach(function (node) {
          if (node.parentNode) node.parentNode.removeChild(node);
        });
        if (!shell.childElementCount && shell.parentNode) shell.remove();
        if (!column.childElementCount) {
          column.appendChild(header);
          headerState.done = true;
        }
        return "stop";
      }
      var split = splitNodeText(piece.node, function () {
        return columnOverflows(column, "linear");
      });
      if (!split) {
        if (piece.node.parentNode) piece.node.parentNode.removeChild(piece.node);
        if (list && !list.childElementCount && list.parentNode) list.remove();
        if (!shell.childElementCount && shell.parentNode) shell.remove();
        return "stop";
      }
      if (split.rest) {
        headerState.pieces.splice(headerState.pi + 1, 0, {
          kind: "contact",
          node: withRemainder(piece.node, split.rest),
          listClass: piece.listClass
        });
      }
      headerState.pi += 1;
      return "stop";
    }
    headerState.done = true;
    return "progress";
  }

  function dumpFlow(column, flow) {
    while (flow.si < flow.sections.length) {
      var section = flow.sections[flow.si];
      var shell = root.document.createElement("section");
      shell.className = "resume-section";
      if (section.title) shell.appendChild(section.titleUsed ? section.title.cloneNode(true) : section.title);
      while (section.bi < section.blocks.length) {
        var block = section.blocks[section.bi];
        if (block.type === "entry" && block.intact) shell.appendChild(block.node);
        else if (block.type === "entry") {
          var entry = root.document.createElement("article");
          entry.className = "entry";
          while (block.ai < block.atoms.length) {
            addAtom(entry, block.atoms[block.ai]);
            block.ai += 1;
          }
          if (entry.childElementCount) shell.appendChild(entry);
        } else if (block.type === "contacts") {
          var list = root.document.createElement("ul");
          list.className = block.listClass || "contact-list";
          while (block.ii < block.items.length) {
            list.appendChild(block.items[block.ii]);
            block.ii += 1;
          }
          if (list.childElementCount) shell.appendChild(list);
        } else if (block.node) shell.appendChild(block.node);
        section.bi += 1;
      }
      if (shell.childElementCount) column.appendChild(shell);
      flow.si += 1;
    }
  }

  function finishPages(pages, template) {
    var label = RB.templateLabel ? RB.templateLabel(template) : template;
    return pages.map(function (page, index) {
      page.setAttribute("data-page", String(index + 1));
      var article = page.querySelector(".resume");
      if (article) {
        article.setAttribute("aria-label", label + " resume preview, page " + (index + 1) + " of " + pages.length);
      }
      var sheet = root.document.createElement("div");
      sheet.className = "sheet";
      var caption = root.document.createElement("p");
      caption.className = "sheet-label";
      caption.textContent = "Page " + (index + 1) + " of " + pages.length;
      sheet.appendChild(caption);
      sheet.appendChild(page);
      return sheet;
    });
  }

  function paginateLinear(sandbox, article, template) {
    var header = article.querySelector(":scope > .resume-header");
    var flow = readSections(article);
    var headerState = header ? { node: header, done: false, intact: true, pi: 0 } : null;
    var ctx = makeContext(sandbox, template, false, null);
    var pages = [];
    var guard = 0;
    while (guard < 400 && ((headerState && !headerState.done) || flow.si < flow.sections.length)) {
      guard += 1;
      var built = mount(sandbox, createLinearPage(template), false);
      var before = cursorKey(headerState, flow);
      var headerOutcome = "done";
      if (headerState && !headerState.done) headerOutcome = placeHeader(built.column, headerState, ctx);
      if (!headerState || headerState.done || headerOutcome === "progress") {
        fillColumn(built.column, flow, ctx, "linear");
      }
      var after = cursorKey(headerState, flow);
      if (before === after) {
        if (headerState && !headerState.done) placeHeader(built.column, headerState, ctx);
        dumpFlow(built.column, flow);
        if (headerState) headerState.done = true;
        if (built.column.childElementCount) pages.push(built.page);
        else built.page.remove();
        break;
      }
      if (!built.column.childElementCount) {
        built.page.remove();
        break;
      }
      pages.push(built.page);
    }
    ctx.destroy();
    if (!pages.length) {
      var blank = mount(sandbox, createLinearPage(template), false);
      if (header) blank.column.appendChild(header);
      pages.push(blank.page);
    }
    return pages;
  }

  function paginateCreative(sandbox, article) {
    var header = article.querySelector(":scope > .resume-header");
    var side = readSections(article.querySelector(".resume-sidebar"));
    var main = readSections(article.querySelector(".resume-main"));
    var ctx = makeContext(sandbox, "creative", true, header);
    var pages = [];
    var guard = 0;
    var pending = true;
    while (pending && guard < 400) {
      guard += 1;
      pending = side.si < side.sections.length || main.si < main.sections.length;
      if (!pending) break;
      var built = mount(sandbox, createCreativePage(header, pages.length > 0), true);
      var before = cursorKey(null, side) + "|" + cursorKey(null, main);
      fillColumn(built.sidebar, side, ctx, "side");
      fillColumn(built.main, main, ctx, "main");
      var after = cursorKey(null, side) + "|" + cursorKey(null, main);
      if (before === after) {
        if (side.si < side.sections.length) dumpFlow(built.sidebar, side);
        if (main.si < main.sections.length) dumpFlow(built.main, main);
        pages.push(built.page);
        break;
      }
      pages.push(built.page);
    }
    ctx.destroy();
    if (!pages.length) {
      pages.push(mount(sandbox, createCreativePage(header, false), true).page);
    }
    return pages;
  }

  function pageCanBeMeasured(page) {
    if (!page) return false;
    var rect = page.getBoundingClientRect();
    return rect.width > 200 && rect.height > 200;
  }

  function paginate(container) {
    if (!container) return 0;
    var source = container.querySelector(":scope > .page");
    if (!source) return container.querySelectorAll(".page").length;
    var article = source.querySelector(":scope > .resume");
    if (!article) return 0;
    var template = article.getAttribute("data-template") || "classic";
    var sandbox = root.document.createElement("div");
    sandbox.className = "paginate-sandbox";
    sandbox.setAttribute("aria-hidden", "true");
    // Measure on the body. The preview panel is display:none on Settings, and a
    // hidden ancestor reports every box as 0×0, which splits the resume into a
    // page per character until the guard stops it.
    var host = root.document.body || container;
    host.appendChild(sandbox);
    try {
      sandbox.appendChild(source);
      var pages;
      if (!pageCanBeMeasured(source)) {
        pages = [source];
      } else {
        pages = template === "creative"
          ? paginateCreative(sandbox, article)
          : paginateLinear(sandbox, article, template);
      }
      var sheets = finishPages(pages, template);
      container.replaceChildren.apply(container, sheets);
      return pages.length;
    } finally {
      if (sandbox.parentNode) sandbox.remove();
    }
  }

  RB.paginate = paginate;
})(typeof window !== "undefined" ? window : globalThis);
