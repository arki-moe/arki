flush_changes: Write all staged changes to disk

## Behavior

- Writes all pending changes from insert_text, replace_text, delete_text to disk
- Fails if there are conflicts (overlapping changes from different agents)
- After successful flush, all staged operations are cleared

## Usage

Call this tool after making edits with insert_text, replace_text, or delete_text to persist changes.
