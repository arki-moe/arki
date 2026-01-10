replace_text: Replace a target string with new content in a file

## Parameters

- `path`: File path (relative to working directory)
- `target`: The unique string to replace
- `new_content`: The content to replace the target with

## Behavior

- The target string must appear exactly once in the file
- Changes are staged (not written to disk immediately)
- Use `flush_changes` to write staged changes to disk
- Use `cached_read_file` to preview the file with staged changes

## Errors

- Target not found: The target string doesn't exist in the file
- Ambiguous target: The target string appears multiple times (provide more context)
