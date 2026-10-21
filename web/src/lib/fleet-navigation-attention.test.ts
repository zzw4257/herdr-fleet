import { describe, expect, it } from "vitest";

import { attentionByPlace, paneAttention, tabAttentionKey } from "./fleet-navigation-attention";
import type { AgentStatus, AgentView } from "./types";

function agent(
  paneId: string,
  where: { workspaceId: string; tabId: string },
  status: AgentStatus,
  ts: { active?: number; seen?: number } = {},
): AgentView {
  return {
    paneId,
    workspaceId: where.workspaceId,
    workspaceLabel: "proj",
    workspaceNumber: 1,
    tabId: where.tabId,
    agent: "claude",
    status,
    cwd: "/path/to/proj",
    focused: false,
    lastActiveAt: ts.active,
    lastSeenAt: ts.seen,
  };
}

const A = { workspaceId: "w1", tabId: "t1" };
const B = { workspaceId: "w1", tabId: "t2" };
const C = { workspaceId: "w2", tabId: "t3" };

describe("paneAttention", () => {
  it("reports blocked, unseen and working, and nothing for a pane at rest", () => {
    expect(paneAttention(agent("p1", A, "blocked"))).toBe("needs");
    expect(paneAttention(agent("p2", A, "idle", { active: 2, seen: 1 }))).toBe("ready");
    expect(paneAttention(agent("p3", A, "working"))).toBe("working");
    expect(paneAttention(agent("p4", A, "idle", { active: 1, seen: 2 }))).toBeUndefined();
  });
});

describe("attentionByPlace", () => {
  it("keeps the most urgent bucket per Space and per Tab, and leaves resting places out", () => {
    const places = attentionByPlace([
      agent("p1", A, "working"),
      agent("p2", B, "done", { active: 5, seen: 1 }),
      agent("p3", C, "idle", { active: 1, seen: 9 }),
    ]);
    // Unseen outranks working, exactly as Collie's Space strip ranks them.
    expect(places.spaces.get("w1")).toBe("ready");
    expect(places.tabs.get(tabAttentionKey("w1", "t1"))).toBe("working");
    expect(places.tabs.get(tabAttentionKey("w1", "t2"))).toBe("ready");
    expect(places.spaces.has("w2")).toBe(false);
    expect(places.tabs.has(tabAttentionKey("w2", "t3"))).toBe(false);
  });

  it("files a Tab under its Space, so the same Tab id in two Spaces never merges", () => {
    const places = attentionByPlace([
      agent("p1", { workspaceId: "w1", tabId: "t1" }, "blocked"),
      agent("p2", { workspaceId: "w2", tabId: "t1" }, "working"),
    ]);
    expect(places.tabs.get(tabAttentionKey("w1", "t1"))).toBe("needs");
    expect(places.tabs.get(tabAttentionKey("w2", "t1"))).toBe("working");
  });
});
