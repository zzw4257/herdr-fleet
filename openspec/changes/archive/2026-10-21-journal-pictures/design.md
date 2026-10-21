## Decisions

- **Readers carry, views draw.** The journal already has a slot for a tool's picture (`result.imageUrl`) that pi, omp and muse fill and that History and the mirror's picture card read. Filling it for Claude and Codex makes those two surfaces work with no web change; only Chat, which never drew a picture, needs a card.
- **Upstream's resolver is the only gate.** `resolveImageUrl` already refuses remote URLs and non-image data; the fork helper calls it rather than re-deciding, and adds only a size bound so one huge payload cannot ride a journal window to a phone.
- **Chat places a screenshot under its call.** A computer-use run then reads as steps and what each step saw. The image item breaks a tool run's grouping, which is accepted: the picture is the point of the step.
- **Codex grammar list unchanged.** Adding `input_image` to the known-block list would rewrite upstream's unknowns fixture; the list is diagnostics only, so it is left alone.

## Risks

- A long computer-use session puts many pictures in a journal window; the window's own bounds and the per-image bound cap the cost.
