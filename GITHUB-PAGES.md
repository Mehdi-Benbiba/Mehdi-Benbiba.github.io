# Deploy Mehdi Benbiba's portfolio to GitHub Pages

The latest website is saved in this folder. No GitHub connection is needed to prepare it.

## Ready-to-upload website

- Folder: `deployment/github-pages/`
- ZIP: `deployment/mehdi-portfolio-github-pages.zip`

The package contains Home, Portfolio, About, Blogs, Contact, and their saved content, images, icons, and fonts. All internal links are relative, so the site supports a GitHub repository URL such as `https://USERNAME.github.io/REPOSITORY/`.

### Publish the ZIP contents

1. Create a public GitHub repository. GitHub Free supports Pages in public repositories.
2. Extract `mehdi-portfolio-github-pages.zip`.
3. Upload the extracted files to the repository's root. `index.html` and `assets/` must be at the top level, with no extra containing folder. Include `.nojekyll` if your file picker shows it. It is optional for this plain HTML site.
4. Open **Settings > Pages** in the repository.
5. Under **Build and deployment**, select **Deploy from a branch**, then **main** and **/ (root)**. Save.
6. Wait for the deployment to finish, then click **Visit site** in Pages settings.

Only upload the generated public package for this method. It excludes the local editor, server, recipient email, and editing history.

## Automatic deployment from the source folder

The source includes `.github/workflows/deploy-pages.yml`. Use this option if you want GitHub to rebuild the public package each time you update your saved source.

1. Add this source folder to a repository using Git or GitHub Desktop. Keep the supplied `.gitignore`; it excludes `.local/`, research files, previews, and generated packages. Use `main` as the default branch.
2. Publish the repository to GitHub. Do not manually drag the whole workspace into GitHub's upload page: that does not apply `.gitignore`.
3. In **Settings > Pages**, set the source to **GitHub Actions**.
4. In **Actions**, choose **Deploy portfolio to GitHub Pages**, then **Run workflow** on `main`. Later pushes to `main` deploy automatically.
5. Open the successful deployment's URL, or use **Visit site** in Pages settings.

The workflow validates the pages, builds `deployment/github-pages/`, and publishes only that folder. Python uses its standard library; there are no packages to install. The editor and server remain local tools.

## Update the website later

1. Open `Start Portfolio.cmd` and make your changes in the local editor.
2. Save your changes.
3. For manual uploads, double-click `Prepare GitHub Deployment.cmd` to regenerate the folder and ZIP, then replace the hosted files. Remove obsolete public files if you have removed images or pages.
4. For automatic deployment, commit and push the changed source and assets to `main`.

The editor's **Download website** button also creates a current public ZIP.

## Contact form setup remains

Your email address stays in `.local/owner-settings.json`, which is excluded from the public package and Git. The anonymous FormSubmit ID is not configured yet, so the Contact page currently offers LinkedIn.

Before expecting email delivery, open **Profile & contact > Mailbox activation** in the local editor, request the activation email, confirm it, and save the provider's anonymous form ID. Send a test message and confirm receipt. Then rebuild and update the public website. See `README.md` for the activation steps.

## Local verification

```powershell
python scripts/check_site.py
python scripts/prepare_deployment.py
python scripts/check_site.py --root deployment/github-pages
```

GitHub's documentation: [Configure a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [Use custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
