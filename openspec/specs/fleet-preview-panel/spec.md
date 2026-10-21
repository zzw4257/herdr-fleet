# fleet-preview-panel Specification

## Purpose
TBD - created by archiving change preview-panel. Update Purpose after archive.

## Requirements

### Requirement: A preview panel follows the Pane's screen
Fleet SHALL offer a preview panel beside the route on a wide screen and over it on a narrow one,
opened and closed by `toggle-preview-panel`. Its Screen tab SHALL show the current local Pane's
newest picture from the Chat window the Pane page holds, or a picture picked from Chat until the
operator returns to the newest. A crew member's Pane SHALL have no Screen.

#### Scenario: A computer-use step
- **WHEN** the agent's newest turn carries a screenshot and the panel is open on Screen
- **THEN** the panel shows that screenshot

#### Scenario: A picture tapped in Chat
- **WHEN** the operator taps a Chat picture with the panel on the page
- **THEN** the panel opens on Screen with that picture and offers to follow the newest

### Requirement: Loopback pages open in the panel
With an editor set, a plain click on a loopback link in Chat or the mirror SHALL open the Browser
tab framing the editor's proxy of that address instead of a new tab, and the tab SHALL accept a
port or a loopback address typed by the operator. Any other address SHALL NOT be framed.

#### Scenario: A dev server link
- **WHEN** the operator clicks `http://localhost:5173/` in Chat
- **THEN** the Browser tab frames `<editor>/proxy/5173/`

### Requirement: Files previews media and runs HTML in isolation
Files SHALL play a video and an audio file and draw a PDF in place from a byte read
that runs the picture read's checks, types the file by its bytes and is bounded at 64 MiB. Files
SHALL offer to run an HTML file of a local Pane in a Gateway document whose policy sandboxes it into
an opaque origin with scripts allowed and no network connections.

#### Scenario: A renamed text file
- **WHEN** a text file is named `.mp4`
- **THEN** Files shows its own binary or source view, not a player

#### Scenario: A report with a chart script
- **WHEN** the operator runs an HTML file's scripts
- **THEN** its inline and `https:` scripts run and it cannot read Fleet's cookies or call Fleet
