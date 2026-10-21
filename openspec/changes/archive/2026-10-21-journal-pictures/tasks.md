## 1. Readers

- [x] 1.1 Add `bridge/journal/fleet-journal-images.ts` (`claudeToolResultImageUrl`, `codexImageUrls`, size bound) and its suite, including parser-level cases.
- [x] 1.2 Port `claude.ts` (answered and orphan results) and `codex.ts` (message images, tool output image).

## 2. Chat

- [x] 2.1 Add the `image` ChatItem in `chat-items.ts`; draw it with the fork-owned `FleetChatImage` from `chat-cards.tsx`; add the Fleet alt string; add the suite.

## 3. Delivery

- [x] 3.1 FORK.toml (`journal-image-compat`, `journal-image-port`, widened `codex-journal-port`, `native-chat-density-markers` note); CHANGELOG; typecheck both trees, lint touched files, journal and touched web tests, `check-fork`, privacy guard, `openspec validate journal-pictures`.
