/* Reorders resume sections through the document. Personal information stays first. */
(function (root) {
  "use strict";

  var RB = root.ResumeBuilder = root.ResumeBuilder || {};

  function fail(error) {
    return { ok: false, error: error };
  }

  function sectionIds(state) {
    return state.getDocument().sections.map(function (section) {
      return section.id;
    });
  }

  function sameIds(left, right) {
    if (left.length !== right.length) return false;
    for (var index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return false;
    }
    return true;
  }

  function commit(state, current, next) {
    if (sameIds(current, next)) return { ok: true, unchanged: true };
    var result = state.reorderSections(next);
    if (result.ok) result.unchanged = false;
    return result;
  }

  function moveSectionBy(state, sectionId, offset) {
    if (!state || typeof state.getDocument !== "function") return fail("Resume is not ready");
    if (offset !== -1 && offset !== 1) return fail("Move offset must be -1 or 1");
    var ids = sectionIds(state);
    var index = ids.indexOf(sectionId);
    if (index < 0) return fail("Section not found");
    if (index === 0) return fail("Personal information stays first");
    var nextIndex = index + offset;
    if (nextIndex <= 0 || nextIndex >= ids.length) return fail("Section is already at the edge");
    var next = ids.slice();
    var moved = next.splice(index, 1)[0];
    next.splice(nextIndex, 0, moved);
    return commit(state, ids, next);
  }

  function moveSectionBefore(state, sectionId, beforeId) {
    if (!state || typeof state.getDocument !== "function") return fail("Resume is not ready");
    var ids = sectionIds(state);
    var from = ids.indexOf(sectionId);
    if (from < 0) return fail("Section not found");
    if (from === 0) return fail("Personal information stays first");
    if (beforeId === sectionId) return { ok: true, unchanged: true };
    var next = ids.filter(function (id) {
      return id !== sectionId;
    });
    var to = next.length;
    if (beforeId) {
      to = next.indexOf(beforeId);
      if (to < 0) return fail("Section not found");
    }
    if (to < 1) to = 1;
    next.splice(to, 0, sectionId);
    return commit(state, ids, next);
  }

  function attachSectionDrag(container, options) {
    if (!container || container.dataset.dragBound === "1") return;
    container.dataset.dragBound = "1";
    var drag = null;
    var line = null;
    var lastY = 0;
    var scrollDelta = 0;
    var frame = 0;

    function editorForm() {
      return container.querySelector(".editor-form");
    }

    function sectionNodes() {
      return Array.prototype.slice.call(container.querySelectorAll(".editor-form > [data-section-root]"));
    }

    function clearLine() {
      if (line && line.parentNode) line.parentNode.removeChild(line);
      line = null;
    }

    function stopScroll() {
      scrollDelta = 0;
      if (!frame) return;
      root.cancelAnimationFrame(frame);
      frame = 0;
    }

    function endDrag(commitDrop) {
      var current = drag;
      drag = null;
      stopScroll();
      if (root.document && root.document.body) {
        root.document.body.classList.remove("is-section-dragging");
      }
      if (current && current.card && current.card.classList) current.card.classList.remove("is-dragging");
      var beforeId = current ? current.beforeId : null;
      var active = Boolean(current && current.active);
      clearLine();
      if (commitDrop && active && options && typeof options.onDrop === "function") {
        options.onDrop(current.id, beforeId);
      }
    }

    function beforeIdAt(clientY, dragId) {
      var nodes = sectionNodes();
      for (var index = 0; index < nodes.length; index += 1) {
        var id = nodes[index].getAttribute("data-section-id");
        if (!id || id === dragId) continue;
        if (nodes[index].getAttribute("data-section-type") === "personal") continue;
        var rect = nodes[index].getBoundingClientRect();
        if (clientY < rect.top + (rect.height / 2)) return id;
      }
      return null;
    }

    function showLine(beforeId) {
      var parent = editorForm();
      if (!parent) return;
      if (!line) {
        line = root.document.createElement("div");
        line.className = "editor-drop-line";
        line.setAttribute("data-drop-indicator", "true");
        line.setAttribute("aria-hidden", "true");
      }
      var anchor = null;
      if (beforeId) {
        var nodes = sectionNodes();
        for (var index = 0; index < nodes.length; index += 1) {
          if (nodes[index].getAttribute("data-section-id") === beforeId) {
            anchor = nodes[index];
            break;
          }
        }
      }
      if (!anchor) anchor = parent.querySelector(".editor-add-panel");
      if (!anchor) return;
      var parentRect = parent.getBoundingClientRect();
      var anchorRect = anchor.getBoundingClientRect();
      line.style.top = Math.max(0, anchorRect.top - parentRect.top - 8) + "px";
      if (line.parentNode !== parent) parent.appendChild(line);
    }

    function updateFromPointer(clientY) {
      if (!drag) return;
      drag.beforeId = beforeIdAt(clientY, drag.id);
      showLine(drag.beforeId);
      var scroller = container.closest ? container.closest(".editor-panel") : null;
      scrollDelta = 0;
      if (!scroller) return;
      var rect = scroller.getBoundingClientRect();
      if (clientY < rect.top + 40) scrollDelta = -14;
      else if (clientY > rect.bottom - 40) scrollDelta = 14;
    }

    function tick() {
      frame = 0;
      if (!drag || !drag.active || !scrollDelta) return;
      var scroller = container.closest ? container.closest(".editor-panel") : null;
      if (scroller) scroller.scrollTop += scrollDelta;
      updateFromPointer(lastY);
      frame = root.requestAnimationFrame(tick);
    }

    container.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || !event.target || !event.target.closest) return;
      var handle = event.target.closest("[data-drag-handle]");
      if (!handle || !container.contains(handle)) return;
      var card = handle.closest("[data-section-root]");
      if (!card || card.getAttribute("data-section-type") === "personal") return;
      drag = {
        pointerId: event.pointerId,
        id: card.getAttribute("data-section-id"),
        card: card,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        beforeId: null
      };
      try {
        if (handle.setPointerCapture) handle.setPointerCapture(event.pointerId);
      } catch (error) {
        /* Untrusted events cannot capture a pointer. The move still bubbles. */
      }
    });

    container.addEventListener("pointermove", function (event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      var dx = event.clientX - drag.startX;
      var dy = event.clientY - drag.startY;
      if (!drag.active) {
        if ((dx * dx) + (dy * dy) < 25) return;
        drag.active = true;
        drag.card.classList.add("is-dragging");
        if (root.document && root.document.body) root.document.body.classList.add("is-section-dragging");
      }
      if (event.cancelable) event.preventDefault();
      lastY = event.clientY;
      updateFromPointer(event.clientY);
      if (scrollDelta && !frame) frame = root.requestAnimationFrame(tick);
    }, { passive: false });

    container.addEventListener("pointerup", function (event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (!drag.active) {
        var dx = event.clientX - drag.startX;
        var dy = event.clientY - drag.startY;
        if ((dx * dx) + (dy * dy) >= 25) {
          drag.active = true;
          lastY = event.clientY;
          updateFromPointer(event.clientY);
        }
      }
      endDrag(true);
    });

    container.addEventListener("pointercancel", function (event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      endDrag(false);
    });

    container.addEventListener("keydown", function (event) {
      if (!drag || !drag.active || event.key !== "Escape") return;
      event.preventDefault();
      endDrag(false);
    });
  }

  RB.moveSectionBy = moveSectionBy;
  RB.moveSectionBefore = moveSectionBefore;
  RB.attachSectionDrag = attachSectionDrag;
})(typeof window !== "undefined" ? window : globalThis);
