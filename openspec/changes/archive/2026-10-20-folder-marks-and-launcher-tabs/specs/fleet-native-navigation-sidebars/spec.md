## MODIFIED Requirements

### Requirement: A hierarchy row carries its Pane's state
A hierarchy row that stands for a Pane SHALL show that Pane's state as the same dot Collie's Tab row
draws, at the row's trailing end, with the state's word available to assistive technology. The dot
MUST use the rail's own ground for a resting state's ring, and MUST NOT replace the Agent's own mark
at the row's leading end. When that Pane's Agent finished and is unseen by Collie's own triage, the
row SHALL draw Collie's unseen mark in the dot's place.

A Space row or a Tab group row SHALL carry no state of its own while it is open. While it is
collapsed it SHALL advertise the most urgent of Collie's triage buckets among the Agents it contains,
drawn the way Collie's Tab strip draws a bucket: the unseen mark for finished and unseen, the state
dot of `TRIAGE_STATUS` for blocked and for working, with the word for assistive technology. A
collapsed row whose Agents are all resting, or that contains no Agent, SHALL draw nothing. The
bucket SHALL be resolved with Collie's triage helpers, never re-ranked by the fork.

#### Scenario: An Agent row is drawn
- **WHEN** a row stands for a Pane running an Agent
- **THEN** the Agent's mark leads the row, the state's dot trails it, and both are drawn at once

#### Scenario: A finished Pane has not been opened
- **WHEN** a Pane row's Agent finished after the Pane was last seen
- **THEN** the row trails Collie's unseen mark instead of its state dot

#### Scenario: A collapsed Space holds a finished, unseen Agent
- **WHEN** a Space row is collapsed and one Agent in it is finished and unseen while another is working
- **THEN** the Space row trails the unseen mark, and opening the Space removes the row's own mark

#### Scenario: A collapsed group is busy
- **WHEN** a Tab group row is collapsed and its most urgent Agent is working
- **THEN** the row trails the working dot with its word

#### Scenario: A collapsed Space is resting
- **WHEN** a collapsed Space's Agents are all resting, or it holds no Agent
- **THEN** the row carries no mark

#### Scenario: A row stands for no Pane
- **WHEN** a row is a Host, or an open Space or group of Panes
- **THEN** it carries no state mark of its own
