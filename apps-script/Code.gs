/**
 * Bushwick Daily — Grocery Price Index
 * Google Apps Script Web App: receives a worksheet submission from the
 * GitHub Pages site and writes it as a Google Doc into the project's Drive.
 *
 * WHY THIS INSTEAD OF A SERVER OR SERVICE ACCOUNT:
 *   - The site is static (GitHub Pages) and can't hold a secret.
 *   - A web app deployed "Execute as: Me" runs with YOUR Drive permissions,
 *     so no service-account key, no Workspace-admin scope change, no host.
 *
 * SETUP (see apps-script/README.md for the click-by-click version):
 *   1. Make a Drive folder for the project; copy its folder ID from the URL.
 *   2. script.google.com → New project → paste this file.
 *   3. Project Settings → Script Properties, add:
 *         ROOT_FOLDER_ID   = <the folder ID from step 1>     (required)
 *         SUBMIT_TOKEN     = <any random string>             (optional gate)
 *         LOG_SHEET_ID     = <a Sheet ID>                    (optional log)
 *   4. Deploy → New deployment → Web app → Execute as: Me,
 *      Who has access: Anyone → Deploy → authorize → copy the /exec URL.
 *   5. Put that URL (and the folder link + token) in assets/js/config.js.
 */

// Fill these three in (or leave blank and set them as Script Properties under
// Project Settings → Script Properties). Baking them in needs no extra clicks.
var CONFIG = {
  ROOT_FOLDER_ID: '',   // the project Drive folder id
  SUBMIT_TOKEN:   '',   // optional shared string; must match assets/js/config.js
  LOG_SHEET_ID:   ''    // optional: a Sheet id to append a submissions log
};
var PROP = PropertiesService.getScriptProperties();
function cfg_(k) { return CONFIG[k] || PROP.getProperty(k) || ''; }

function doGet() {
  return json_({ ok: true, service: 'bd-grocery-index', ping: 'ok' });
}

/**
 * Run this ONCE from the editor (Run ▸ authorizeOnce) to grant the script
 * permission to write Docs into your Drive. Approving the consent screen here
 * is the only manual step; after that the web app works for everyone.
 */
function authorizeOnce() {
  DriveApp.getRootFolder().getName();
  var d = DocumentApp.create('BD Grocery Index — authorization test (safe to delete)');
  DriveApp.getFileById(d.getId()).setTrashed(true);
  return 'authorized';
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'empty request' });
    }
    var data = JSON.parse(e.postData.contents);

    // Optional shared-secret gate.
    var wantToken = cfg_('SUBMIT_TOKEN');
    if (wantToken && String(data.token || '') !== wantToken) {
      return json_({ ok: false, error: 'bad token' });
    }

    var folder = resolveFolder_(data.folder);
    var doc = buildDoc_(data);

    // Move the freshly-created Doc into the phase subfolder.
    var file = DriveApp.getFileById(doc.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);

    logRow_(data, doc.getUrl());

    return json_({ ok: true, url: doc.getUrl(), name: doc.getName() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---- Drive folder resolution ------------------------------------------- */
function resolveFolder_(subName) {
  var rootId = cfg_('ROOT_FOLDER_ID');
  var root = rootId
    ? DriveApp.getFolderById(rootId)
    : getOrCreateChild_(DriveApp.getRootFolder(), 'Bushwick Grocery Price Index — Submissions');
  if (!subName) return root;
  return getOrCreateChild_(root, sanitize_(subName));
}
function getOrCreateChild_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/* ---- Document rendering ------------------------------------------------- */
function buildDoc_(data) {
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/New_York', 'yyyy-MM-dd HH:mm');
  var title = 'Phase ' + (data.phase || '?') + ' — ' + (data.deliverable || 'Submission') +
              ' — ' + (data.submittedBy || 'unknown') + ' — ' + stamp;
  var doc = DocumentApp.create(title);
  var body = doc.getBody();

  // Masthead
  body.appendParagraph('BUSHWICK DAILY · GROCERY PRICE INDEX')
      .setFontFamily('Verdana').setForegroundColor('#7a5300').setFontSize(8).setBold(true);
  body.appendParagraph((data.deliverable || 'Submission'))
      .setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('Phase ' + (data.phase || '?') + '  ·  Prepared by ' + (data.submittedBy || '—') +
                       '  ·  Submitted ' + stamp + '  ·  Folder ' + (data.folder || '—'))
      .setForegroundColor('#666666').setFontSize(9);
  body.appendHorizontalRule();

  (data.sections || []).forEach(function (sec) {
    if (sec.heading) body.appendParagraph(sec.heading).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    (sec.items || []).forEach(function (item) {
      if (item.type === 'field') {
        var lab = body.appendParagraph('');
        lab.appendText(item.label || '').setBold(true);
        var val = (item.value == null || item.value === '') ? '—' : String(item.value);
        body.appendParagraph(val).setBold(false).setForegroundColor(item.value ? '#000000' : '#999999');
      } else if (item.type === 'table' && item.rows && item.rows.length) {
        if (item.caption) body.appendParagraph(item.caption).setBold(true).setFontSize(10);
        var cells = [];
        if (item.headers && item.headers.length) cells.push(item.headers);
        item.rows.forEach(function (r) { cells.push(r.map(function (c) { return String(c == null ? '' : c); })); });
        var t = body.appendTable(cells);
        if (item.headers && item.headers.length) {
          var hr = t.getRow(0);
          for (var i = 0; i < hr.getNumCells(); i++) hr.getCell(i).editAsText().setBold(true);
        }
      }
    });
  });

  doc.saveAndClose();
  return doc;
}

/* ---- Optional submissions log ------------------------------------------ */
function logRow_(data, url) {
  var id = cfg_('LOG_SHEET_ID');
  if (!id) return;
  try {
    var sh = SpreadsheetApp.openById(id).getSheets()[0];
    sh.appendRow([new Date(), data.phase, data.deliverable, data.submittedBy, data.folder, url]);
  } catch (e) { /* logging is best-effort */ }
}

/* ---- helpers ------------------------------------------------------------ */
function sanitize_(s) { return String(s).replace(/[\/\\:*?"<>|]+/g, '-').slice(0, 120); }
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
