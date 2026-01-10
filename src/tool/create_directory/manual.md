create_directory: Create a directory at the specified path

## Parameters

- `path`: Directory path (relative to working directory)
- `recursive`: (optional) Create parent directories if they don't exist (default: false)

## Behavior

- Creates a new directory at the specified path
- If recursive is true, creates all necessary parent directories
- Returns error if directory already exists (unless recursive is true)
