# Mehdi Benbiba — BI Developer Portfolio

Your personalized five-page portfolio and a local editor for maintaining it without editing code. It includes your supplied profile, three GitHub projects and dashboard screenshots, and four Medium articles.

## Open the app

Double-click **Start Portfolio.cmd** in this folder. Keep its window open while using the website or editor. Python 3 is required and is already installed on this computer.

- Website: http://127.0.0.1:4174/index.html
- Editor: http://127.0.0.1:4174/editor.html

If the app is already running, use those links directly. Stop it with Ctrl+C in its terminal window. Opening the HTML files directly also displays the saved public content, but the editor needs the local server.

## Add and edit without code

1. Open **Portfolio editor** in the footer, or use **Add new project / Add new blog** on the collection pages.
2. Choose **Projects** or **Blogs**, then click the add button.
3. Fill in the title, category, summary, and link. Projects also support tools and case-study sections.
4. Upload a PNG, JPEG, or WebP cover, or use an image URL. Covers are optional. Choose whether to feature the entry on the homepage.
5. Click **Save**. Changes are written into this folder and appear when the public page reloads.

Use **Edit**, the up/down arrows, or **Remove** to manage existing entries. The first three featured projects and first three featured blogs appear on the homepage. The full collection pages show all entries.

**Profile & contact** lets you edit your biography, work, tools, education, certificates, and social links. No GitHub connection is needed for these local edits.

## Contact form: one activation step remains

Your recipient email is kept in `.local/owner-settings.json`, not in the public website content or downloadable website ZIP. It is only shown in your local editor.

To receive contact form messages:

1. In **Profile & contact**, scroll to **Mailbox activation**.
2. Click **Request activation email**. Complete the provider's verification in the tab it opens.
3. Confirm the activation email sent by FormSubmit. The confirmation provides an anonymous form ID that can replace your address.
4. Paste the ID into **Anonymous FormSubmit ID** and click **Save profile & contact settings**.
5. Send a test message from the Contact page and confirm receipt in your inbox.

The Contact page currently offers a LinkedIn contact link, with no email notice or visible email address. If you later enable the optional email form using an anonymous FormSubmit ID, it submits directly through FormSubmit with its default spam protection. Email delivery would need activation and a test message.

Provider documentation: https://formsubmit.co/documentation

## Backups and hosting

- **Backup content** downloads a JSON backup of your profile, projects, blogs, and form ID. Keep your image files with the folder; JSON does not embed uploaded image bytes.
- **Import backup** validates the selected file and asks before replacing current content.
- **Download website** packages the five public pages, all saved content, and images into a ZIP ready for static hosting. It excludes the editor, private owner settings, and local history.
- Every content save retains a copy of the previous JSON in `.local/history/`. These are recovery files; the JSON backups can be imported through the editor. The `.local` folder is excluded from Git.

The editor runs on your computer. Visitors to a hosted static site cannot use it to edit your portfolio. After future edits, download a new website package and update the hosted files. A hosted editor with sign-in would require a separate authenticated backend.

The latest deployment package is in **deployment/github-pages/** and **deployment/mehdi-portfolio-github-pages.zip**. Double-click **Prepare GitHub Deployment.cmd** after future edits to rebuild these from the saved website.

See **GITHUB-PAGES.md** for manual upload and automatic deployment instructions. The source includes a GitHub Pages workflow in **.github/workflows/deploy-pages.yml**. GitHub is not connected or used by this editor.

## Files

- `index.html`, `portfolio.html`, `about.html`, `blogs.html`, `contact.html`: public pages.
- `editor.html`: local portfolio studio.
- `server.py`, `Start Portfolio.cmd`: local server and launcher; no third-party packages required.
- `assets/data/content.json`: saved public content.
- `assets/js/content-data.js`: matching browser-readable content for static/file previews.
- `assets/js/main.js`, `assets/js/editor.js`: public page and editing interactions.
- `assets/css/styles.css`: responsive design.
- `assets/images/`, `assets/uploads/`: project screenshots and uploaded covers.
- `.local/`: private recipient settings and automatic content history.
- `scripts/check_site.py`, `scripts/test_editor.py`: link checks and file-saving integration tests.
- `scripts/prepare_deployment.py`, `Prepare GitHub Deployment.cmd`: generate the public deployment folder and ZIP.
- `.github/workflows/deploy-pages.yml`: validate, build, and publish through GitHub Actions when enabled.

The public site uses a locally bundled Montserrat font, with navy (#001E5C), dark text (#001033), and white from the BBB Techs reference. Its font license is included in assets/fonts/. Screenshots are copied from your public project READMEs. Article cards link to the original Medium posts instead of reproducing the articles.

## Verification

```powershell
python scripts/check_site.py
python scripts/test_editor.py
node --check assets/js/main.js
node --check assets/js/editor.js
```

Integration tests use temporary folders and local servers, leaving your saved portfolio content intact.
