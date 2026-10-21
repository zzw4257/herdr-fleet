## Why

Fleet's previews still leave the conversation: a dev server, a PDF, a video or an HTML page opens another tab, and a computer-use run's screenshots scroll away inside Chat. The operator asked for previews in place, as a desktop agent app shows them beside the thread.

## What Changes

- A preview panel beside the route on a wide screen and over it on a phone, with two tabs: **Screen** (the current Pane's newest screenshot, or one picked from Chat) and **Browser** (a loopback address through the operator's editor's port proxy).
- A plain click on a loopback link in Chat or the mirror, and on a Chat screenshot, opens the panel instead of a new tab; a command `toggle-preview-panel` opens and closes it.
- Files draws a PDF (with PDF.js), a video and an audio file inline, from a bounded byte read of the bridge's own Files rules.
- Files can run an HTML file's scripts, served by the Gateway as a sandboxed document that cannot reach Fleet.
- The Gateway widens Collie's page policy just enough: `blob:` media and frames, same-origin frames, and the editor's origin as a frame.

## Capabilities

### New Capabilities
- `fleet-preview-panel`: in-place previews for screens, loopback pages and files.

### Modified Capabilities
None.

## Impact

Baseline Collie v1.22.6. Bridge: the Files picture read answers `?as=media` through a fork-owned reader (`bridge/fleet-files-media.ts`), which needs three Files internals exported. Gateway (fork-owned): a page-policy widening and the sandboxed HTML route. Web: fork-owned panel, store, media and HTML previews; ports in `markdown-text.tsx`, `ansi-output.tsx`, `agent-chat.tsx` and `file-preview.tsx`. The bridge changes, so a MINOR release.

Non-goals: no live video of a screen; no embedding of sites other than this machine's ports and the editor; no relative assets for a scripted HTML file; no streaming of media past the read bound; nothing for a crew member's Pane.
