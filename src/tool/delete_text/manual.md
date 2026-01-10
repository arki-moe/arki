delete_text: Delete a target string from a file

## Parameters

- `path`: File path (relative to working directory)
- `target`: The unique string to delete

## Behavior

- The target string must appear exactly once in the file
- Changes are staged (not written to disk immediately)
- Use `flush_changes` to write staged changes to disk
- Use `cached_read_file` to preview the file with staged changes

## Errors

- Target not found: The target string doesn't exist in the file
- Ambiguous target: The target string appears multiple times (provide more context)
