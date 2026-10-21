## ADDED Requirements

### Requirement: The operator names a browser editor
Fleet's settings document SHALL accept an optional `editor` object whose only key is `url`, an
absolute `http` or `https` URL without credentials, query or fragment. Any other value SHALL reject
the whole document. Without the setting, Fleet SHALL draw no editor link and rewrite no link.

#### Scenario: A valid editor address
- **WHEN** the document sets `editor.url` to an https address with a trailing slash
- **THEN** the effective settings carry that address without the trailing slash

#### Scenario: An address with credentials
- **WHEN** `editor.url` holds a user name, a password, a query or a fragment, or is not http(s)
- **THEN** the document is rejected at `editor.url`

### Requirement: Loopback links open through the editor's port proxy
With an editor set, an external link in Chat prose or the terminal mirror whose host is
`localhost`, `127.0.0.1`, `0.0.0.0` or `[::1]` and which names a port SHALL point at the editor's
`/proxy/<port>` path with the original path, query and fragment. Every other link SHALL be left
unchanged.

#### Scenario: A dev server address in Chat
- **WHEN** an agent writes `http://localhost:5173/app?x=1`
- **THEN** the link opens `<editor>/proxy/5173/app?x=1`

#### Scenario: A public address
- **WHEN** an agent writes an address on any other host, or a loopback address without a port
- **THEN** the link is unchanged

### Requirement: Files and Panes open in the editor
With an editor set, the Files view's file header SHALL offer a link that opens the file in the
editor with its root as the folder, and the `open-pane-in-editor` command SHALL open the current
Pane's working folder in the editor in a new tab. A Pane on another crew host SHALL get neither.

#### Scenario: A PDF the agent wrote
- **WHEN** the operator opens a PDF in Files
- **THEN** the header offers "Open in editor", which opens that file in the editor
