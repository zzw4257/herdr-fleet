## ADDED Requirements

### Requirement: Dismiss a stale typed notice without terminal input
Fleet SHALL offer Dismiss notice for an ended typed_not_submitted row wherever the held card permits actions. It SHALL delete only that held row using the existing scoped DELETE route and refresh the snapshot, without submitting, discarding, or resending terminal text.

#### Scenario: Terminal activity has moved on
- **WHEN** an ended typed_not_submitted row remains while another send is running
- **THEN** Dismiss notice remains available and uses only the row's scoped DELETE route

#### Scenario: Another client already dismissed the row
- **WHEN** the DELETE returns 404
- **THEN** the card refreshes without sending terminal input

#### Scenario: Composer actions are unavailable
- **WHEN** the card cannot act or the build is not Fleet
- **THEN** the additional button is absent
