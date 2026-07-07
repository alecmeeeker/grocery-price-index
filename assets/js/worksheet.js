/* ============================================================================
   Bushwick Daily — Grocery Price Index · worksheet engine
   ----------------------------------------------------------------------------
   Drop-in for every phase page. Zero dependencies. Responsibilities:
     1. Autosave every field to localStorage; restore on load.
     2. Serialize the worksheet into a structured object (sections → fields/tables).
     3. Download a Word-openable copy (works with no backend).
     4. Submit to the Google Drive Apps Script endpoint when configured.
   Contract with the page: sections are <section class="ws-section" data-heading>,
   fields are [data-field][data-label] wrappers, tables are table[data-table].
   ========================================================================== */
(function () {
  "use strict";

  var form = document.querySelector("[data-worksheet]");
  if (!form) return;

  var SLUG = form.getAttribute("data-slug") || location.pathname;
  var PHASE = form.getAttribute("data-phase") || "";
  var DELIVERABLE = form.getAttribute("data-deliverable") || document.title;
  var FOLDER = form.getAttribute("data-folder") || "";
  var STORAGE_KEY = "bdgpi:" + SLUG;
  var CFG = window.BD_CONFIG || {};

  var statusEl = document.querySelector("[data-status]");
  var toastEl = document.querySelector("[data-toast]");
  var submitBtn = document.querySelector("[data-action=submit]");
  var downloadBtn = document.querySelector("[data-action=download]");
  var clearBtn = document.querySelector("[data-action=clear]");

  /* ---- helpers ---------------------------------------------------------- */
  function fields() {
    return Array.prototype.slice.call(
      form.querySelectorAll("input, textarea, select")
    ).filter(function (el) { return el.name; });
  }
  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
  function toast(msg, isErr) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.toggle("err", !!isErr);
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove("show"); }, 4200);
  }
  function setStatus(txt, saved) {
    if (!statusEl) return;
    statusEl.innerHTML = saved ? "<b>" + txt + "</b>" : txt;
  }

  /* ---- autosave --------------------------------------------------------- */
  function collectValues() {
    var data = {};
    fields().forEach(function (el) {
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked) { (data[el.name] = data[el.name] || []).push(el.value); }
      } else {
        data[el.name] = el.value;
      }
    });
    return data;
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        t: new Date().toISOString(), v: collectValues()
      }));
      setStatus("Saved to this browser", true);
    } catch (e) { setStatus("Couldn't autosave (storage full/blocked)", false); }
  }
  function restore() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw).v || {}; } catch (e) { return; }
    fields().forEach(function (el) {
      if (!(el.name in data)) return;
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = (data[el.name] || []).indexOf(el.value) !== -1;
      } else {
        el.value = data[el.name];
      }
      autoGrow(el);
    });
    setStatus("Restored your saved work", true);
  }
  function autoGrow(el) {
    if (el.tagName === "TEXTAREA") {
      el.style.height = "auto";
      el.style.height = Math.max(el.scrollHeight, el.offsetHeight) + "px";
    }
  }

  /* ---- serialization: DOM → structured object --------------------------- */
  function readField(wrap) {
    var label = wrap.getAttribute("data-label") || "";
    var inputs = wrap.querySelectorAll("input, textarea, select");
    var vals = [];
    Array.prototype.forEach.call(inputs, function (el) {
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked) vals.push(el.getAttribute("data-optlabel") || el.value);
      } else if (el.value && el.value.trim()) {
        vals.push(el.value.trim());
      }
    });
    return { type: "field", label: label, value: vals.join("  ·  ") };
  }
  function readTable(tbl) {
    var caption = tbl.getAttribute("data-caption") || "";
    var headers = Array.prototype.map.call(
      tbl.querySelectorAll("thead th"), function (th) { return th.textContent.trim(); }
    );
    var rows = [];
    Array.prototype.forEach.call(tbl.querySelectorAll("tbody tr"), function (tr) {
      var cells = Array.prototype.map.call(tr.children, function (td) {
        var inp = td.querySelector("input, textarea, select");
        return inp ? (inp.value || "").trim() : td.textContent.trim();
      });
      if (cells.some(function (c) { return c; })) rows.push(cells);
    });
    return { type: "table", caption: caption, headers: headers, rows: rows };
  }
  function serialize() {
    var sections = [];
    Array.prototype.forEach.call(form.querySelectorAll(".ws-section"), function (sec) {
      var items = [];
      Array.prototype.forEach.call(sec.children, function (child) { walk(child, items); });
      // also catch nested fields/tables not direct children
      if (!items.length) {
        Array.prototype.forEach.call(sec.querySelectorAll("[data-field],[data-table]"), function (n) {
          walk(n, items);
        });
      }
      sections.push({ heading: sec.getAttribute("data-heading") || "", items: items });
    });
    return sections;
    function walk(node, items) {
      if (node.nodeType !== 1) return;
      if (node.hasAttribute && node.hasAttribute("data-field")) { items.push(readField(node)); return; }
      if (node.matches && node.matches("table[data-table]")) { items.push(readTable(node)); return; }
      Array.prototype.forEach.call(node.children || [], function (c) { walk(c, items); });
    }
  }
  function preparedBy() {
    var el = form.querySelector("[data-preparedby]") ||
             form.querySelector("input[name*='prepared']");
    return el && el.value.trim() ? el.value.trim() : "";
  }

  /* ---- download (Word-openable HTML) ------------------------------------ */
  function docHtml() {
    var sections = serialize();
    var by = preparedBy();
    var esc = function (s) { return (s || "").replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); };
    var body = "";
    sections.forEach(function (s) {
      if (s.heading) body += "<h2>" + esc(s.heading) + "</h2>";
      s.items.forEach(function (it) {
        if (it.type === "field") {
          body += "<p><b>" + esc(it.label) + "</b><br>" +
                  (esc(it.value) || "<i>(blank)</i>") + "</p>";
        } else if (it.type === "table" && it.rows.length) {
          body += "<p><b>" + esc(it.caption) + "</b></p><table border=1 cellspacing=0 cellpadding=6 style='border-collapse:collapse'><tr>" +
                  it.headers.map(function (h) { return "<th align=left>" + esc(h) + "</th>"; }).join("") + "</tr>";
          it.rows.forEach(function (r) {
            body += "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>";
          });
          body += "</table>";
        }
      });
    });
    return "<html><head><meta charset='utf-8'><title>" + esc(DELIVERABLE) + "</title></head>" +
      "<body style='font-family:Georgia,serif;max-width:7in;margin:auto'>" +
      "<div style='border-bottom:3px solid #f5ab07;padding-bottom:8px;margin-bottom:16px'>" +
      "<div style='font-family:Arial;letter-spacing:3px;font-size:11px;color:#555'>BUSHWICK DAILY · GROCERY PRICE INDEX</div>" +
      "<h1 style='margin:4px 0'>Phase " + esc(PHASE) + " · " + esc(DELIVERABLE) + "</h1>" +
      "<div style='font-family:Arial;font-size:12px;color:#555'>Prepared by " + (esc(by) || "—") +
      " · Folder " + esc(FOLDER) + "</div></div>" + body + "</body></html>";
  }
  function download() {
    var by = preparedBy() || "draft";
    var blob = new Blob([docHtml()], { type: "application/msword" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = SLUG + "__" + by.replace(/[^\w-]+/g, "-") + ".doc";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("Downloaded a Word copy — upload it to the phase's Drive folder.");
  }

  /* ---- submit to Drive (Apps Script) ------------------------------------ */
  function submit() {
    var url = CFG.APPS_SCRIPT_URL;
    if (!url) { toast("Drive submission isn't set up yet — use Download instead.", true); return; }
    var by = preparedBy();
    if (!by) { toast("Add your name in “Prepared by” before submitting.", true);
      var pb = form.querySelector("[data-preparedby]"); if (pb) pb.focus(); return; }
    var payload = {
      token: CFG.SUBMIT_TOKEN || "",
      slug: SLUG, phase: PHASE, deliverable: DELIVERABLE, folder: FOLDER,
      submittedBy: by, submittedAt: new Date().toISOString(),
      sections: serialize()
    };
    submitBtn.disabled = true;
    var old = submitBtn.textContent; submitBtn.textContent = "Submitting…";
    // Simple request (text/plain) avoids a CORS preflight Apps Script can't answer.
    fetch(url, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) {
          toast("Submitted to Drive ✓  " + (res.name || ""));
          if (res.url) window.open(res.url, "_blank", "noopener");
        } else { toast("Drive rejected it: " + ((res && res.error) || "unknown"), true); }
      })
      .catch(function () {
        // Opaque/redirect failures still usually write the doc; tell the truth.
        toast("Sent — if it doesn't appear in Drive shortly, use Download as a backup.", true);
      })
      .finally(function () { submitBtn.disabled = false; submitBtn.textContent = old; });
  }

  /* ---- wire up ---------------------------------------------------------- */
  var debSave = debounce(save, 500);
  form.addEventListener("input", function (e) {
    setStatus("Editing…", false);
    autoGrow(e.target);
    debSave();
  });
  if (downloadBtn) downloadBtn.addEventListener("click", download);
  if (submitBtn) submitBtn.addEventListener("click", submit);
  if (clearBtn) clearBtn.addEventListener("click", function () {
    if (!confirm("Clear this worksheet on this browser? Downloaded/submitted copies are unaffected.")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    location.reload();
  });

  // Backend availability → button state
  if (submitBtn && !CFG.APPS_SCRIPT_URL) {
    submitBtn.disabled = true;
    submitBtn.title = "Drive submission not configured yet — Download works now.";
  }

  restore();
  fields().forEach(autoGrow);
  window.addEventListener("beforeunload", save);
})();
