## Why

An agent that drives a browser or the desktop works from screenshots, and the operator following it from Fleet sees none of them. Collie's Claude and Codex readers keep only the text of a tool result and of a Codex message, so a computer-use step's screenshot never reaches History, the mirror's picture card or Chat, and Chat draws even a picture the journal does carry as the line "Image: <url>".

## What Changes

- The Claude reader attaches a `tool_result`'s base64 picture to the answered call as `result.imageUrl`.
- The Codex reader keeps a message's `input_image` blocks as image parts (an image-only message is kept) and attaches a tool output list's first `input_image` as `result.imageUrl`.
- Every picture goes through Collie's own `resolveImageUrl` (inline `data:image/*` or the blob route only) and is skipped above 8 M characters.
- Chat draws a picture part as an image, and a tool's screenshot as an image right under its call; a tap opens it full size.

## Capabilities

### New Capabilities
- `fleet-journal-pictures`: pictures from Claude and Codex logs in the journal and in Chat.

### Modified Capabilities
None.

## Impact

Baseline Collie v1.22.6. Fork-owned: `bridge/journal/fleet-journal-images.ts`, `web/src/components/fleet-chat-image.tsx`, their tests, and one Fleet string in every Fleet dictionary. Upstream ports: `bridge/journal/claude.ts`, `web/src/lib/chat-items.ts` and its test (new entry `journal-image-port`), `bridge/journal/codex.ts` (rides `codex-journal-port`), `web/src/components/chat-cards.tsx` (rides `native-chat-density-markers`). History and the mirror's picture card already read `result.imageUrl` and change no code. The bridge changes, so a MINOR release.

Non-goals: no live screen view, no remote image URLs, no change to uploads or the Files view, no picture for OpenCode tool results.
