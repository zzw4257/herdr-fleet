// DOWNSTREAM (FORK.toml fleet-runtime). What a hierarchy row advertises, resolved with Collie's own
// triage so the rail cannot disagree with Collie's Tab and Space strips about what needs looking at.
//
// The model (fleet/ui/native-navigation/model.ts) carries the answer and never ranks one. Only the
// buckets that report an event become a mark: blocked on the operator, finished and unseen, working.
// A resting set and an empty set are both "nothing to say".
import type { NavigationAttention } from "../../../fleet/ui/native-navigation/model.ts";
import { bucketOf, worstTriage, type TriageKey } from "@/lib/triage";
import type { AgentView } from "@/lib/types";

function toAttention(bucket: TriageKey | null): NavigationAttention | undefined {
  return bucket === "needs" || bucket === "ready" || bucket === "working" ? bucket : undefined;
}

/** One Pane's own bucket, as its row draws it. */
export function paneAttention(agent: AgentView): NavigationAttention | undefined {
  return toAttention(bucketOf(agent));
}

/** The key {@link attentionByPlace} files a Tab under: Tab ids are only unique inside one Space. */
export function tabAttentionKey(workspaceId: string, tabId: string): string {
  return `${workspaceId}\u0000${tabId}`;
}

export interface PlaceAttention {
  spaces: ReadonlyMap<string, NavigationAttention>;
  tabs: ReadonlyMap<string, NavigationAttention>;
}

/**
 * The most urgent bucket per Space and per Tab among `agents`, which the caller has already narrowed
 * to ONE host — workspace and tab ids repeat across members, so mixing hosts here would let one
 * machine's finished Agent light another machine's folder.
 */
export function attentionByPlace(agents: readonly AgentView[]): PlaceAttention {
  const bySpace = new Map<string, AgentView[]>();
  const byTab = new Map<string, AgentView[]>();
  for (const agent of agents) {
    bySpace.set(agent.workspaceId, [...(bySpace.get(agent.workspaceId) ?? []), agent]);
    const key = tabAttentionKey(agent.workspaceId, agent.tabId);
    byTab.set(key, [...(byTab.get(key) ?? []), agent]);
  }
  const resolve = (groups: Map<string, AgentView[]>) => {
    const out = new Map<string, NavigationAttention>();
    for (const [key, group] of groups) {
      const attention = toAttention(worstTriage(group));
      if (attention !== undefined) out.set(key, attention);
    }
    return out;
  };
  return { spaces: resolve(bySpace), tabs: resolve(byTab) };
}
