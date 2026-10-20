import { describe, expect, test } from "bun:test";
import { pickCodexRollout } from "./fleet-codex-rollout-name.ts";

const A = "11111111-aaaa-7bbb-8ccc-222222222222";
const B = "33333333-dddd-7eee-8fff-444444444444";
const SEG1 = "01a00000-0000-7000-8000-000000000001";
const SEG2 = "01a00000-0000-7000-8000-000000000002";

describe("pickCodexRollout", () => {
  test("a plain rollout name is found exactly as upstream finds it", () => {
    expect(pickCodexRollout([`rollout-2026-10-10T09-00-00-${A}.jsonl`], A)).toBe(`rollout-2026-10-10T09-00-00-${A}.jsonl`);
  });

  test("a Codex Desktop segment name is found when no plain one exists", () => {
    const name = `rollout-2026-10-10T09-00-00-${A}_${SEG1}.jsonl`;
    expect(pickCodexRollout([name], A)).toBe(name);
  });

  test("the plain name wins over a segment of the same session", () => {
    const plain = `rollout-2026-10-10T09-00-00-${A}.jsonl`;
    expect(pickCodexRollout([`rollout-2026-10-10T09-00-00-${A}_${SEG2}.jsonl`, plain], A)).toBe(plain);
  });

  test("of several segments the newest (last-sorting UUIDv7) is taken", () => {
    const older = `rollout-2026-10-10T09-00-00-${A}_${SEG1}.jsonl`;
    const newer = `rollout-2026-10-10T09-00-00-${A}_${SEG2}.jsonl`;
    expect(pickCodexRollout([newer, older], A)).toBe(newer);
  });

  test("another session's files, non-rollouts and other extensions are never matched", () => {
    expect(
      pickCodexRollout(
        [`rollout-2026-10-10T09-00-00-${B}_${SEG1}.jsonl`, `notes-${A}_${SEG1}.jsonl`, `rollout-2026-10-10T09-00-00-${A}_${SEG1}.json`],
        A,
      ),
    ).toBeUndefined();
  });

  test("the id is matched case-insensitively, like upstream's suffix", () => {
    const name = `rollout-2026-10-10T09-00-00-${A.toUpperCase()}_${SEG1}.jsonl`;
    expect(pickCodexRollout([name], A)).toBe(name);
  });
});
