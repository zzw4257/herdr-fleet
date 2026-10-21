## MODIFIED Requirements

### Requirement: The catalog ships these commands and public defaults
The catalog SHALL contain exactly the following stable ids, English names and public default
bindings, where `Prefix` resolves to the configured prefix. A command shown with `[]` SHALL ship
unbound while remaining listed, searchable and bindable.

A command's English name SHALL name the OUTCOME an operator is after rather than the mechanism that
produces it. The name is the string command search matches on, so a name that describes the mechanism
makes the command unfindable by the word the operator would use for it.

| Command id | English name | Public default |
| --- | --- | --- |
| `open-command-bar` | Open Command Bar | `Ctrl+Shift+P`, `Prefix+?` |
| `open-pane-switcher` | Open Pane Switcher | `[]` |
| `open-fleet-settings` | Open Fleet Settings | `Prefix+S` |
| `toggle-fleet-sidebars` | Toggle Fleet Sidebars | `Prefix+B` |
| `edit-pane-tags` | Edit Pane Tags | `[]` |
| `manage-pane-tags` | Manage Tags | `[]` |
| `create-tab` | Create Tab | `Prefix+C`, `Prefix+V`, `Prefix+-` |
| `next-tab` / `previous-tab` | Next Tab / Previous Tab | `Prefix+N` / `Prefix+P` |
| `select-tab-1` … `select-tab-9` | Select Tab 1 … Select Tab 9 | `Prefix+1` … `Prefix+9` |
| `rename-tab` | Rename Tab | `Prefix+Shift+T` |
| `close-tab` | Close Tab | `Prefix+Shift+X` |
| `next-pane-in-tab` / `previous-pane-in-tab` | Next Pane in Tab / Previous Pane in Tab | `Prefix+Tab` / `Prefix+Shift+Tab` |
| `close-pane` | Close Pane | `Prefix+X` |
| `rename-pane` | Rename Pane | `Prefix+Shift+P` |
| `fit-pane-width` | Resize Pane | `Prefix+R` |
| `previous-pane` / `next-pane` | Previous Pane in Fleet / Next Pane in Fleet | `[]` |
| `last-pane` | Last Pane | `[]` |
| `previous-agent` / `next-agent` | Previous Agent / Next Agent | `[]` |
| `select-agent-1` … `select-agent-9` | Select Agent 1 … Select Agent 9 | `[]` |
| `copy-fleet-pane-link` | Copy Fleet Pane Link | `[]` |
| `toggle-type-mode` | Toggle Type Mode | `[]` |
| `send-escape` / `send-enter` | Send Escape / Send Enter | `[]` |
| `send-alt-up` | Send Alt+Up | `[]` |
| `send-up-arrow` / `send-down-arrow` | Send Up Arrow / Send Down Arrow | `[]` |
| `send-left-arrow` / `send-right-arrow` | Send Left Arrow / Send Right Arrow | `[]` |
| `send-space` | Send Space | `[]` |
| `send-ctrl-c` | Send Ctrl+C | `[]` |
| `new-tab-launcher-1` … `new-tab-launcher-9` | New Tab with Launcher 1 … New Tab with Launcher 9 | `[]` |

`Ctrl+Shift+P` SHALL be the only direct-chord default. Pane mode SHALL be reached by removing the
leading `/` from the query that chord opens, so a second entry chord is a configuration choice rather
than a shipped one. No public default SHALL bind a chord in the `Alt` family; those commands SHALL
reach the operator through the command bar or through their own configuration.

#### Scenario: A stock install loads its defaults
- **WHEN** no configuration document is present
- **THEN** every row above carries exactly its declared default and no other command is bound

#### Scenario: Three aliases create one Tab
- **WHEN** the operator completes `Prefix+C`, `Prefix+V`, or `Prefix+-`
- **THEN** each invokes the single `create-tab` command through one mutation path

#### Scenario: A default-unbound command is reached
- **WHEN** the operator searches the command bar for a command whose default is `[]`
- **THEN** it appears with its English name and an explicit "no binding" label, and activating it runs the command

#### Scenario: A command is searched for by its outcome
- **WHEN** the operator searches command mode for `resize`
- **THEN** `fit-pane-width` is listed, under the English name `Resize Pane`

#### Scenario: Tag commands receive custom bindings
- **WHEN** an operator configures a direct chord or prefix binding for either tag command
- **THEN** settings accept it and the shared dispatcher invokes the command while the command bar displays its effective bindings

### Requirement: Navigation commands resolve against the current topology
Space, Tab, Pane and Agent commands SHALL resolve their target from the validated topology at the
moment of invocation and SHALL navigate through Fleet's existing canonical route.

`next-tab`, `previous-tab` and the nine Tab ordinals SHALL act only on Tabs in the current Space that
hold at least one Pane, the same Tabs the hierarchy draws, and the two cycling commands SHALL wrap. `next-pane-in-tab` and `previous-pane-in-tab` SHALL act only on
Panes in the current Tab and SHALL wrap. `previous-pane` and `next-pane` SHALL walk the complete
hierarchy order across every Host, Space, Tab and Pane. Agent cycling and the nine Agent ordinals
SHALL resolve against the shared roster order.

`last-pane` SHALL keep a two-entry, page-session history of exact Panes. It SHALL switch to the other
entry and swap the pair, so repeated invocation toggles between the two most recent Panes, and SHALL
drop an entry once the topology proves that Pane is gone.

`create-tab` SHALL derive the current Space and session, delegate the existing native create action,
and open the returned Pane through the canonical route. On a Space page with no current Pane, the
current Space SHALL be the page's Space.

`new-tab-launcher-1` … `new-tab-launcher-9` SHALL start the Nth launcher row of the current host as a
new Tab beside the current Pane, through Collie's own launch-beside action, and open the returned Pane
through the canonical route. On a Space page the beside Pane SHALL be the first Pane of that Space. A
missing row or a Space with no Pane SHALL change no route and report one bounded unavailable result.
The command SHALL carry only its id; the row is resolved from the host's launcher list at invocation.

`copy-fleet-pane-link` SHALL copy a link built from the validated current route only. It SHALL copy
no credential and SHALL leave the clipboard untouched when the current route is incomplete.

#### Scenario: Tabs wrap inside their Space
- **WHEN** the current Space holds several Tabs and the operator invokes `next-tab` on the last one
- **THEN** Fleet selects the first Tab of that same Space and does not cross into another Space

#### Scenario: Panes wrap inside their Tab
- **WHEN** the current Tab holds several Panes and the operator invokes `previous-pane-in-tab` on the first
- **THEN** Fleet selects the last Pane of that Tab and does not cross into a sibling Tab

#### Scenario: The whole hierarchy is walked
- **WHEN** the operator invokes `next-pane` repeatedly on a pack
- **THEN** Fleet visits every Pane in the hierarchy's order across all Hosts and wraps at the end

#### Scenario: An ordinal does not exist
- **WHEN** the operator invokes `select-tab-7` in a Space with three Tabs
- **THEN** Fleet changes no route and reports one bounded unavailable result

#### Scenario: The operator toggles back and forth
- **WHEN** two still-present Panes have been visited and `last-pane` is invoked twice
- **THEN** the first invocation returns to the previous Pane and the second returns to the one it came from

#### Scenario: A remembered Pane is gone
- **WHEN** `last-pane` is invoked and the remembered Pane is absent from the current topology
- **THEN** Fleet drops that entry, changes no route, and reports one bounded unavailable result

#### Scenario: The current route cannot make a link
- **WHEN** `copy-fleet-pane-link` runs with no complete current Pane route
- **THEN** the clipboard is unchanged and Fleet reports one bounded unavailable result

#### Scenario: A Tab with no Pane is skipped
- **WHEN** the current Space holds a Tab with no Pane between two Tabs that hold Panes and the operator invokes `next-tab`
- **THEN** Fleet selects the next Tab that holds a Pane, and `select-tab-2` names that same Tab

#### Scenario: A Tab is created from a Space page
- **WHEN** the operator invokes `create-tab` on a Space page
- **THEN** Fleet creates the Tab in that Space and opens its Pane

#### Scenario: A launcher row opens beside the current Pane
- **WHEN** the host lists two launcher rows and the operator invokes `new-tab-launcher-2` on a Pane
- **THEN** Fleet starts the second row as a new Tab in the current Space and opens its Pane

#### Scenario: A launcher ordinal does not exist
- **WHEN** the operator invokes `new-tab-launcher-5` and the host lists two launcher rows
- **THEN** Fleet changes no route and reports one bounded unavailable result
