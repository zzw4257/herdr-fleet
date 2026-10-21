## Why

The hierarchy rail only marks individual Panes. A collapsed Space or Tab group says nothing, so an operator who keeps most Spaces folded cannot see where an Agent finished, is working, or is waiting without opening every one. Inside an open Space a finished-but-unseen Pane draws the same resting ring as any idle Pane, so the place that changed is still not findable.

On the keyboard side, `create-tab` opens a shell, so starting an Agent beside the current work takes the pane switcher and a launcher row; on a Space page `create-tab` reports unavailable although the command is in scope; and Tab cycling and ordinals count Tabs the rail does not draw (Tabs holding no Pane), so a key can land on nothing.

## What Changes

- A collapsed Space row and a collapsed Tab group row advertise the most urgent state among the Agents they contain, using Collie's own triage buckets: blocked (needs you), finished and unseen, working. Resting Agents add nothing. An open row draws no aggregate; its children speak for themselves.
- A Pane row whose Agent finished unseen draws Collie's unseen mark in place of its state dot.
- New catalog family `new-tab-launcher-1` … `new-tab-launcher-9`: start the Nth launcher row of the current Space's host as a new Tab beside the current Pane, through Collie's own launch-beside flow. Unbound by default.
- `create-tab` also works on a Space page, creating the Tab in that Space.
- `next-tab`, `previous-tab` and `select-tab-N` count only Tabs that hold at least one Pane, matching the rail.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `fleet-native-navigation-sidebars`: hierarchy rows carry aggregate state when collapsed and an unseen mark on Pane rows.
- `fleet-keyboard-commands`: launcher-tab commands; `create-tab` on a Space page; Tab navigation over visible Tabs.

## Impact

Baseline Collie v1.22.6. Fork-owned only: `fleet/ui/native-navigation/model.ts`, `fleet/ui/commands/catalog.ts`, `fleet/ui/commands/targets.ts`, `web/src/components/native-navigation-tree.tsx`, `web/src/components/native-navigation-shell.tsx`, `web/src/components/fleet-commands.tsx`, `fleet/README.md`, a new `web/src/lib/fleet-navigation-attention.ts`, and their tests. Upstream `web/src/lib/triage.ts`, `status-badge.tsx`, `ui/unseen-mark.tsx`, `lib/launchers.ts` and `hooks/use-spaces.ts` are imported unchanged; no new invasive path. Only the web bundle and the Gateway that serves it change, so on its own this is a PATCH (the lead alone redeploys).

Non-goals: no aggregate on Host rows; no shipped default binding for the new commands (the catalog keeps `Alt`-family and direct chords out of public defaults; operators bind them in `settings.json`); no rename of a launched Tab; no change to the right Agent rail.
