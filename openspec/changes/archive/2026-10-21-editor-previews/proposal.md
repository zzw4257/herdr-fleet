## Why

Collie's Files view previews text, Markdown, JSON, pictures and script-less HTML, and nothing else. A PDF, a video, an HTML page that needs its script and a dev server the agent just started all end at "Binary file" or a dead `localhost` link the phone cannot reach. The operator already runs a browser-based editor beside Fleet that previews all of those and proxies loopback ports; Fleet only lacks the links into it.

## What Changes

- A Fleet setting `editor.url` names that editor. Without it nothing below appears.
- A loopback `http(s)` link in Chat prose or in the terminal mirror (`localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]`, with a port) opens through the editor's port proxy.
- The Files view's file header gains an "Open in editor" link that opens the file in the editor, in its root folder.
- A pane command, `open-pane-in-editor`, opens the current local Pane's working folder in the editor.

## Capabilities

### New Capabilities
- `fleet-editor-previews`: links from Fleet into the operator's browser editor for previews and dev servers.

### Modified Capabilities
None.

## Impact

Baseline Collie v1.22.6. Fork-owned: `fleet/settings/document.ts` (the `editor` key), `web/src/lib/fleet-settings.ts` (a shared editor-URL reader), new `web/src/lib/fleet-editor-links.ts` and `web/src/components/fleet-open-in-editor.tsx` with tests, the command catalog row and its shell adapter, `fleet/README.md`, one Fleet string per dictionary. Upstream ports: `web/src/components/markdown-text.tsx` and `web/src/components/ansi-output.tsx` (an external link's `href` passes one function), `web/src/routes/changes.tsx` (one element in the file header). Gateway and web only, so a PATCH release.

Non-goals: Fleet serves no file bytes and gains no new read route; no editor is installed, started or authenticated by Fleet; a Pane on another crew host gets no editor link; no rewrite of absolute asset paths a dev server emits under the proxy prefix.
