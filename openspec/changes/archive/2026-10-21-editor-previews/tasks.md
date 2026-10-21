## 1. Setting

- [x] 1.1 Parse and validate `editor.url` in `fleet/settings/document.ts`; carry it as `editorUrl`; tests.
- [x] 1.2 Add `useFleetEditorUrl` to `web/src/lib/fleet-settings.ts`, loaded once and refreshed on save.

## 2. Links

- [x] 2.1 Add `web/src/lib/fleet-editor-links.ts` (proxy, folder and file URLs) and its suite.
- [x] 2.2 Port `markdown-text.tsx` and `ansi-output.tsx` external links through `useFleetPreviewHref`.
- [x] 2.3 Add `FleetOpenInEditor` and render it in the Files file header (`routes/changes.tsx`).
- [x] 2.4 Add the `open-pane-in-editor` command and its shell adapter; document it in `fleet/README.md`.

## 3. Delivery

- [x] 3.1 FORK.toml, CHANGELOG, Fleet strings; typecheck both trees, lint, touched tests, `check-fork`, privacy guard, `openspec validate editor-previews`.
