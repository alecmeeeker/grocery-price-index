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
      rows.push(cells); // keep empty rows so a blank download stays fillable
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

  /* ---- download as a real .docx (opens in Google Docs / Word / Pages) ---- */
  function xesc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function wPara(text, o) {
    o = o || {};
    var rpr = "";
    if (o.bold) rpr += "<w:b/>";
    if (o.size) rpr += '<w:sz w:val="' + o.size + '"/><w:szCs w:val="' + o.size + '"/>';
    if (o.color) rpr += '<w:color w:val="' + o.color + '"/>';
    var ppr = "";
    if (o.before || o.after)
      ppr = "<w:spacing" + (o.before ? ' w:before="' + o.before + '"' : "") +
            (o.after ? ' w:after="' + o.after + '"' : "") + "/>";
    var run = text === "" ? "" :
      "<w:r><w:rPr>" + rpr + '</w:rPr><w:t xml:space="preserve">' + xesc(text) + "</w:t></w:r>";
    return "<w:p><w:pPr>" + ppr + "</w:pPr>" + run + "</w:p>";
  }
  function wTable(headers, rows) {
    var borders = "<w:tblBorders>" +
      ["top", "left", "bottom", "right", "insideH", "insideV"].map(function (s) {
        return "<w:" + s + ' w:val="single" w:sz="4" w:color="CCCCCC"/>';
      }).join("") + "</w:tblBorders>";
    function cell(t, bold) {
      return '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>' +
        "<w:p><w:pPr></w:pPr><w:r><w:rPr>" + (bold ? "<w:b/>" : "") +
        '</w:rPr><w:t xml:space="preserve">' + xesc(t) + "</w:t></w:r></w:p></w:tc>";
    }
    var xml = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' + borders + "</w:tblPr>";
    if (headers && headers.length)
      xml += "<w:tr>" + headers.map(function (h) { return cell(h, true); }).join("") + "</w:tr>";
    (rows || []).forEach(function (r) {
      xml += "<w:tr>" + r.map(function (c) { return cell(c, false); }).join("") + "</w:tr>";
    });
    return xml + "</w:tbl><w:p></w:p>";
  }
  function buildDocx() {
    var sections = serialize(), by = preparedBy(), body = "";
    body += wPara("BUSHWICK DAILY · GROCERY PRICE INDEX", { bold: true, size: 16, color: "7A5300" });
    body += wPara("Phase " + PHASE + " · " + DELIVERABLE, { bold: true, size: 40, after: 40 });
    body += wPara("Prepared by " + (by || "—") + "     Folder " + FOLDER, { size: 18, color: "666666", after: 200 });
    sections.forEach(function (s) {
      if (s.heading) body += wPara(s.heading, { bold: true, size: 28, before: 280, after: 60 });
      s.items.forEach(function (it) {
        if (it.type === "field") {
          body += wPara(it.label, { bold: true, before: 140 });
          body += wPara(it.value || "", {});
        } else if (it.type === "table" && (it.rows.length || it.headers.length)) {
          if (it.caption) body += wPara(it.caption, { bold: true, before: 140 });
          body += wTable(it.headers, it.rows);
        }
      });
    });
    var docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      "<w:body>" + body + "<w:sectPr/></w:body></w:document>";
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    var enc = function (s) { return new TextEncoder().encode(s); };
    return zipStore([
      { name: "[Content_Types].xml", data: enc(ct) },
      { name: "_rels/.rels", data: enc(rels) },
      { name: "word/document.xml", data: enc(docXml) }
    ]);
  }
  // minimal store-only ZIP writer — a valid .docx container, no dependencies
  var _crc;
  function crc32(u8) {
    if (!_crc) {
      _crc = [];
      for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); _crc[n] = c >>> 0; }
    }
    var crc = -1;
    for (var i = 0; i < u8.length; i++) crc = (crc >>> 8) ^ _crc[(crc ^ u8[i]) & 0xFF];
    return (crc ^ -1) >>> 0;
  }
  function zipStore(files) {
    var u16 = function (n) { return [n & 255, (n >>> 8) & 255]; };
    var u32 = function (n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; };
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      var lh = new Uint8Array([].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(crc), u32(sz), u32(sz), u16(nm.length), u16(0)));
      parts.push(lh, nm, f.data);
      central.push(new Uint8Array([].concat(
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0x21),
        u32(crc), u32(sz), u32(sz), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset))), nm);
      offset += lh.length + nm.length + sz;
    });
    var cStart = offset, cSize = 0;
    central.forEach(function (c) { cSize += c.length; });
    var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cSize), u32(cStart), u16(0)));
    var all = parts.concat(central).concat([end]), total = 0;
    all.forEach(function (a) { total += a.length; });
    var out = new Uint8Array(total), p = 0;
    all.forEach(function (a) { out.set(a, p); p += a.length; });
    return out;
  }
  function download() {
    var by = preparedBy() || "blank";
    var fname = SLUG + "__" + by.replace(/[^\w-]+/g, "-") + ".docx";
    try {
      var bytes = buildDocx();
      var blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = fname; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      toast("Downloaded " + fname + " — opens in Google Docs, Word, or Pages.");
    } catch (e) {
      toast("Couldn't build the file: " + (e && e.message || e), true);
    }
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
    console.log("[BD submit] POST →", url, payload);
    fetch(url, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      console.log("[BD submit] HTTP", r.status, "type=" + r.type, "ok=" + r.ok);
      return r.text().then(function (txt) {
        var res = null; try { res = JSON.parse(txt); } catch (e) {}
        console.log("[BD submit] raw body (first 400):", txt.slice(0, 400));
        return { status: r.status, body: txt, json: res };
      });
    }).then(function (r) {
      if (r.json && r.json.ok) {
        // Confirmed: the backend created the Doc and returned its URL.
        toast("Submitted to Drive ✓  " + (r.json.name || ""));
        if (r.json.url) window.open(r.json.url, "_blank", "noopener");
      } else {
        var why = (r.json && r.json.error) || ("endpoint returned HTTP " + r.status);
        console.error("[BD submit] NOT saved:", why, "| body:", r.body.slice(0, 300));
        toast("NOT submitted — " + why + ". Nothing was saved; use Download instead.", true);
      }
    }).catch(function (e) {
      // Cross-origin block / 403 error page → we cannot confirm a write. Do NOT claim success.
      console.error("[BD submit] blocked (no readable response — usually a 403/CORS):", e && e.message || e);
      toast("NOT submitted — the endpoint blocked the request (deploy access). Nothing was saved; use Download.", true);
    }).finally(function () { submitBtn.disabled = false; submitBtn.textContent = old; });
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
