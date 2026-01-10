cached_read_file: Read file content with staged changes applied

## Parameters

- `path`: File path (relative to working directory)

## Behavior

- Returns file content with all your staged operations (insert/replace/delete) applied
- Use this to preview changes before calling flush_changes
- If no staged changes exist, returns the original file content
