get_pending_changes: List pending operations not yet written to disk

## Parameters

- `path`: (optional) File path to filter operations for a specific file

## Behavior

- Returns a list of all staged operations (insert/replace/delete)
- If path is provided, only shows operations for that file
- Use this to review changes before calling flush_changes
