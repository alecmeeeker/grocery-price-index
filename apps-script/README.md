# Drive submission backend (Google Apps Script)

The site is static (GitHub Pages), so it can't hold a secret or run a server.
This backend is a **Google Apps Script Web App**: it runs as *you*, writes to
*your* Drive, and exposes one public URL the worksheets POST to. No service
account, no Workspace-admin change, no hosting.

> Why not the existing `smartprocessing3` service account? It's authorized for
> **Gmail** scopes via domain-wide delegation only. Writing to Drive from it
> would need a Workspace admin to add the Drive scope **and** a server to hold
> the JSON key — neither of which a static site can do. Apps Script sidesteps
> both. (If you ever want the service-account path instead, say so and I'll
> wire a small hosted endpoint.)

## One-time setup (~5 minutes)

1. **Make the project folder in Drive.** Create the folder that will be the
   project index (the interns' phases save into subfolders under it). Open it
   and copy the ID from the URL: `drive.google.com/drive/folders/<THIS_ID>`.
   Optionally pre-create the phase subfolders — the script also creates them on
   demand, matching the `data-folder` on each page:
   `01_Research`, `02_Pitch`, `03_Methodology_and_Plan`, `04_Data_Collection`,
   `05_Analysis_and_Findings`, `06_Reporting_and_Interviews`, `07_Writing`,
   `08_Social_and_Promotion`, `09_Publish_and_Handoff`.

2. **Create the script.** Go to <https://script.google.com> → **New project**.
   Delete the stub, paste the contents of `Code.gs`, and save.

3. **Set Script Properties.** Project **Settings** (gear) →
   *Script Properties* → add:
   | Property | Value | Required |
   |---|---|---|
   | `ROOT_FOLDER_ID` | the folder ID from step 1 | yes |
   | `SUBMIT_TOKEN` | any random string (e.g. from a password generator) | optional, recommended |
   | `LOG_SHEET_ID` | a Google Sheet ID to append a submissions log | optional |

4. **Deploy.** **Deploy** → **New deployment** → gear → **Web app**.
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   - **Deploy**, then **Authorize access** and allow the Drive/Docs scopes.
   - Copy the **Web app URL** (ends in `/exec`).

5. **Wire the site.** Open `assets/js/config.js` and fill in:
   ```js
   APPS_SCRIPT_URL: "https://script.google.com/macros/s/……/exec",
   DRIVE_FOLDER_URL: "https://drive.google.com/drive/folders/……",
   SUBMIT_TOKEN: "the same string you set as SUBMIT_TOKEN"  // or "" if none
   ```
   Commit and push. "Submit to Drive" lights up; the Drive link appears on the
   playbook.

## Test it

- Visit the deployed `/exec` URL in a browser — you should see
  `{"ok":true,"service":"bd-grocery-index","ping":"ok"}`.
- On any phase page, fill **Prepared by**, click **Submit to Drive**. A new
  Google Doc should appear in the matching phase subfolder and open in a tab.

## Redeploying after you edit `Code.gs`

Apps Script pins a deployment to a version. After editing, do
**Deploy → Manage deployments → (edit, the pencil) → Version: New version →
Deploy**. The `/exec` URL stays the same.

## Notes / limits

- **CORS:** the worksheet posts as a "simple request" (`text/plain`) so the
  browser doesn't send a preflight Apps Script can't answer; the response comes
  back via Google's redirect with permissive CORS, so the site can read the
  created doc URL. If a browser ever blocks reading the response, the doc is
  still written — the UI tells the user to fall back to **Download**.
- **No data is lost if the backend is down.** Every worksheet autosaves to the
  browser and can **Download a .doc** to upload by hand. The backend is a
  convenience, not a single point of failure.
- The token is not sensitive — it only gates who can write into your folder.
  Keep `ROOT_FOLDER_ID` pointed at a dedicated folder, not your Drive root.
