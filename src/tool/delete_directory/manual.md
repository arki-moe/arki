delete_directory: Delete a directory at the specified path

## Parameters

- `path`: Directory path (relative to working directory)
- `recursive`: (optional) Delete directory and all contents (default: false)

## Behavior

- Deletes the directory at the specified path
- If recursive is false, only empty directories can be deleted
- If recursive is true, deletes directory and all its contents
