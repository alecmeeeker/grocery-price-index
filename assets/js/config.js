/* ============================================================================
   Bushwick Daily — Grocery Price Index · site configuration
   ----------------------------------------------------------------------------
   Fill these two values in when the Google side is ready, then commit + push.
   Nothing here is a secret: the Apps Script URL is a public web-app endpoint
   that runs as YOU and writes to YOUR Drive. See apps-script/README.md.
   ========================================================================== */
window.BD_CONFIG = {
  // Paste the deployed Apps Script Web App URL here (…/exec). Leave "" to
  // disable "Submit to Drive" — Download + autosave keep working regardless.
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzhYc40B__cjh00wqQPPZdcJAV8Ui9FmLqje-f5iAXt255snJRj-oEus-BvEZEcQBU/exec",

  // Paste the shared Drive folder link here. It appears on the playbook as
  // the project index. Leave "" to show the "added when live" placeholder.
  DRIVE_FOLDER_URL: "https://drive.google.com/drive/folders/1DiYYsh3JNj3fgnX67iXIXCAGAmc2IMFt",

  // Shared secret: mirrors SUBMIT_TOKEN in the Apps Script. Not sensitive —
  // this file is public, so the token is only a speed-bump against bots.
  SUBMIT_TOKEN: "8191051e9da1c44c775504691a4f79dc"
};
