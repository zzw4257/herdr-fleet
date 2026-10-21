## ADDED Requirements

### Requirement: Claude and Codex pictures reach the journal
The Claude reader SHALL attach the first base64 picture of a `tool_result` to the call it answers as
`result.imageUrl`, and SHALL keep an otherwise empty orphan result that carries a picture. The Codex
reader SHALL keep every `input_image` of a user or assistant message as an image part beside the
message's text, keeping a message that holds only pictures, and SHALL attach the first `input_image`
of a tool output list to the call it answers. Every picture SHALL pass Collie's own image resolver,
so only inline `data:image/*` payloads and the host's blob route survive, and a payload above the
fork's size bound SHALL be skipped.

#### Scenario: A computer-use step returns a screenshot
- **WHEN** a Claude or Codex tool call is answered by a result holding a picture
- **THEN** the call's result carries that picture as an inline image URL

#### Scenario: A picture names a remote address
- **WHEN** a picture block carries an `http(s)` URL or a non-image `data:` payload
- **THEN** no picture is attached and the rest of the result is unchanged

#### Scenario: The operator pastes only a picture into Codex
- **WHEN** a Codex user message holds an `input_image` and no text
- **THEN** the journal keeps the message as one image part

### Requirement: Chat draws journal pictures
Chat SHALL draw a journal image part as an image, and SHALL draw a tool result's picture as an image
directly after that tool's card. The image SHALL be loaded through Collie's own image source rules
and pairing token, as History loads one, SHALL draw nothing for a reference those rules refuse, and
SHALL open full size in a new tab on activation.

#### Scenario: A screenshot follows its step
- **WHEN** a turn holds a tool call whose result carries a picture
- **THEN** Chat shows the tool's card and, right after it, the picture

#### Scenario: A refused reference
- **WHEN** a picture's reference is not one the image source rules load
- **THEN** Chat draws no image for it
