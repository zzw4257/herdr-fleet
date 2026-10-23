# Dismiss stale send notices without terminal input

## Why

On Collie v1.22.6, an ended `typed_not_submitted` held row offers Submit and Discard but no way to dismiss only its notice. If the terminal has since moved on, those actions can be refused and the notice remains over the pane.

## What Changes

Fleet adds a notice-only dismissal beside the existing controls. It reuses the existing DELETE send endpoint; no terminal input or backend behavior changes. This is a PATCH: only the lead's browser bundle changes.

Non-goals: infer delivery from later activity, retry a message, clear the input box, change trust or alter upstream send verification.
