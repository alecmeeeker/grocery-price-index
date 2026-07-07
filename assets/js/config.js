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
  APPS_SCRIPT_URL: "",

  // Paste the shared Drive folder link here. It appears on the playbook as
  // the project index. Leave "" to show the "added when live" placeholder.
  DRIVE_FOLDER_URL: "https://drive.google.com/drive/folders/1DiYYsh3JNj3fgnX67iXIXCAGAmc2IMFt",

  // Shared secret (optional): if you set TOKEN in the Apps Script, mirror it
  // here so submissions are accepted. Not sensitive — only gates writes.
  SUBMIT_TOKEN: ""
};
