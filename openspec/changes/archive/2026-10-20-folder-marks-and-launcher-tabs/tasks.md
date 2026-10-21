## 1. Folder marks

- [x] 1.1 Add `NavigationAttention` and optional `attention` on workspace, tab and pane inputs and on rows in `fleet/ui/native-navigation/model.ts`; extend `model.test.ts`.
- [x] 1.2 Add `web/src/lib/fleet-navigation-attention.ts` (Collie triage → attention by Space and Tab) with its test; wire it in `native-navigation-shell.tsx`.
- [x] 1.3 Draw the collapsed-folder mark and the Pane unseen mark in `native-navigation-tree.tsx`; extend `native-navigation-tree.test.tsx`.

## 2. Keyboard

- [x] 2.1 Add `new-tab-launcher-1..9` to the catalog and its README table; adapters in the shell; extend catalog/docs tests.
- [x] 2.2 Register `create-tab` on a Space page; filter Tab cycling and ordinals to Tabs with a Pane in `fleet/ui/commands/targets.ts`; extend `targets.test.ts`.

## 3. Delivery

- [x] 3.1 FORK.toml owned paths for the new helper and test; CHANGELOG lines; verify root and web typecheck, lint of touched files, fleet and web tests for touched files, `check-fork`, privacy guard and `openspec validate folder-marks-and-launcher-tabs`.
