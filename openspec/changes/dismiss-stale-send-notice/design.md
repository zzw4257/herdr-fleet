# Design

A fork-owned FleetHeldDismiss component supplies a translated Dismiss notice button only in a Fleet build. One import and render slot in composer-held.tsx connect it to the card's existing act/release flow, which deletes an ended row and refreshes the snapshot.

The same permission and in-flight guards apply. Dismissal remains available while another send is running because it cannot type. The existing backend refuses removal of an in-flight row. Record both the owned files and the upstream render port in FORK.toml; leave upstream ADRs and suites unchanged.

A notice must not disappear merely because the agent becomes active: another message could have caused that activity. Explicit dismissal avoids falsely declaring delivery.
