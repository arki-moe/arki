insert_text: Insert content before or after a target string in a file

## Parameters

- `path`: File path (relative to working directory)
- `target`: The unique string to locate in the file
- `content`: The content to insert
- `position`: Where to insert - 'before' or 'after' the target

## Behavior

- The target string must appear exactly once in the file
- Changes are staged (not written to disk immediately)
- Use `flush_changes` to write staged changes to disk
- Use `cached_read_file` to preview the file with staged changes

## Errors

- Target not found: The target string doesn't exist in the file
- Ambiguous target: The target string appears multiple times (provide more context)
