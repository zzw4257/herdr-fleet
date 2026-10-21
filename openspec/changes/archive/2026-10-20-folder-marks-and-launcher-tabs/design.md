## Context

The hierarchy model (`fleet/ui/native-navigation/model.ts`) is pure data and never ranks states; triage (`isUnseen`, `bucketOf`, `worstTriage`, `TRIAGE_STATUS`) is Collie's and lives in `web/src/lib/triage.ts`. Seen/unseen is the bridge's shared receipt (`lastActiveAt` / `lastSeenAt` on `AgentView`).

## Decisions

- **Resolve attention in the web tree, carry it through the model.** A fork-owned helper (`web/src/lib/fleet-navigation-attention.ts`) maps Agents to Collie's buckets with `bucketOf`/`worstTriage` and keys them by Space and by Tab. The shell passes the result on the model's inputs (`attention` on workspace, tab and pane inputs), the model copies it onto rows, and the tree draws it. The model therefore never re-implements the bucket order, the same convention `hostLabel` and `fault` already follow.
- **Only buckets that report an event are drawn.** `needs`, `ready` and `working` map to a mark; `recent` (resting) and an empty set map to nothing, so a folder with idle Agents stays quiet. A folder shows the mark only while collapsed.
- **Shapes are Collie's.** `ready` draws `UnseenMark`; `needs` and `working` draw `StatusDot` with `TRIAGE_STATUS`, exactly as Collie's Tab strip does, with the state's word for assistive technology.
- **Launcher tabs reuse launch-beside.** `new-tab-launcher-N` reads the current host's launcher rows through `useLaunchers` and calls `useSpaceActions().launch(command, besidePaneId)`. The beside Pane is the current Pane, or on a Space page the first Pane of that Space. A missing row or Pane is the bounded unavailable result.
- **Visible Tabs only.** Tab cycling and ordinals filter to Tabs that hold a Pane before stepping, the same predicate the model uses to omit a Tab row.

## Risks

- A folder's mark appears or clears on the next snapshot poll, not instantly; that is the same freshness every other rail mark has.
- Binding a direct `Alt+Shift` chord intercepts that chord in the composer too, as every direct chord does; it is an operator choice.
