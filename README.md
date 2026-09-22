# PDF Lock

A static, front-end-only PDF password protection app designed for GitHub Pages.

## What it does

- Select or drag in a PDF from the user's device.
- Encrypt it locally with PDF 2.0 AES-256 password protection.
- Download the protected PDF.
- The PDF and password are never uploaded by the app.
- No backend, database, accounts, analytics, or API calls are used.

## Deploy to GitHub Pages

1. Put `index.html`, `styles.css` and `app.js` in the root of a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Set the deployment source to the branch/folder containing these files (usually `main` and `/root`).
4. Open the GitHub Pages URL once deployment completes.

No build step is required.

## Dependencies

The page loads two pinned JavaScript libraries from jsDelivr:

- `pdf-lib` 1.17.1 — parses and rewrites the source PDF in the browser.
- `@pdfsmaller/pdf-encrypt` 1.2.0 — applies PDF 2.0 AES-256 encryption using the Web Crypto API.

These requests download application code only. The app's Content Security Policy blocks `fetch`, XHR, WebSockets and beacon connections (`connect-src 'none'`). The selected PDF and password are never posted or uploaded.

If you want a deployment with zero third-party runtime requests, download those two exact JavaScript files into a local `vendor/` folder and change the two `<script>` paths in `index.html` to the local files.

## Security notes

- AES-256 requires a secure browser context. GitHub Pages is served over HTTPS and therefore supports it.
- Use a strong, unique password. There is no password recovery.
- Always open the downloaded PDF and verify the password before deleting the original.
- Applying encryption rewrites the PDF, so existing cryptographic/digital signatures may no longer validate.
- Very large PDFs can consume significant browser memory because the whole document is processed locally.

## Licence notes

This project code can be used or adapted as needed. Third-party libraries retain their own licences; check their respective projects when redistributing their code.
