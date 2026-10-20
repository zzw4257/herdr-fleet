// DOWNSTREAM (FORK.toml codex-segment-rollout-compat). Which file in one date directory is a Codex
// session's rollout.
//
// Collie matches only `rollout-<ts>-<uuid>.jsonl`. Codex Desktop's paginated threads write
// `rollout-<ts>-<uuid>_<segment-uuid>.jsonl` instead — same JSONL grammar, one extra id — so those
// sessions read as "no transcript yet". A plain name still wins; otherwise the newest segment is
// taken, and segment ids are UUIDv7, so the name that sorts last is the latest one.

/** The rollout for `sessionId` among `names` (one directory's entries), or undefined. */
export function pickCodexRollout(names: readonly string[], sessionId: string): string | undefined {
  const id = sessionId.toLowerCase();
  const plain = `-${id}.jsonl`;
  const segment = `-${id}_`;
  const rollouts = names.filter((n) => n.startsWith("rollout-") && n.toLowerCase().endsWith(".jsonl"));
  return (
    rollouts.find((n) => n.toLowerCase().endsWith(plain)) ??
    rollouts.filter((n) => n.toLowerCase().includes(segment)).toSorted().at(-1)
  );
}
