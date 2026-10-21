## 1. Bridge

- [x] 1.1 Export the Files checks; add `bridge/fleet-files-media.ts` (sniff, read, response) and its suite; answer `?as=media` in `filesImage`.

## 2. Gateway

- [x] 2.1 `fleet/preview/policy.ts` (page policy widening) and `fleet/preview/html-route.ts` (sandboxed HTML), wired into the Gateway, with unit and wired suites.

## 3. Web

- [x] 3.1 `web/src/lib/fleet-preview.ts` store and screen feed; the Pane page publishes its Chat window's newest picture.
- [x] 3.2 `FleetPreviewPanel` (Screen, Browser) in the shell; `toggle-preview-panel` (`Prefix+O`); loopback links and Chat pictures open it.
- [x] 3.3 `FleetFileMedia` and `FleetHtmlPreview` in Files; `FleetPdfView` (PDF.js, lazy) for PDFs; `.mjs` served as JavaScript.
- [x] 3.4 AGENTS.md › Linting: the Browser frame's owner-approved `react/iframe-missing-sandbox` exception.

## 4. Delivery

- [x] 4.1 FORK.toml, CHANGELOG, `fleet/README.md`, Fleet strings; typecheck both trees, lint, suites, `check-fork`, privacy guard, `openspec validate preview-panel`.
