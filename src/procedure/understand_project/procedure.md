understand_project: Systematically explore and understand the current project structure

1. Use `list_directory` on the root directory to get an overview
   - Identify key directories (src, lib, tests, docs, etc.)
   - Note configuration files (package.json, tsconfig.json, Cargo.toml, etc.)

2. Use `read_file` on the main configuration file (package.json, Cargo.toml, pyproject.toml, etc.)
   - Project name and description
   - Dependencies and their purposes
   - Scripts/commands available
   - Entry points

3. Use `read_file` on README.md if it exists
   - Project purpose and goals
   - Setup instructions
   - Usage examples

4. Use `list_directory` on the main source directory (src/, lib/, app/, etc.)
   - Identify the entry point file (index.ts, main.ts, app.ts, etc.)
   - List subdirectories to understand module organization
   - Note any patterns (MVC, feature-based, etc.)

5. Use `read_file` on 2-3 key source files to understand
   - Coding style and conventions
   - Main abstractions and patterns used
   - How modules interact with each other

6. Output the final report in this format **in user's language**:

---
<bold><cyan>Project Overview</cyan></bold>

Name: [project name]
Type: [CLI tool / Web app / Library / API server / etc.]
Language: [TypeScript / JavaScript / Python / etc.]
Package Manager: [npm / pnpm / yarn / pip / cargo / etc.]

<bold><cyan>Project Structure</cyan></bold>

[Brief description of directory structure and organization pattern]

<bold><cyan>Key Components</cyan></bold>

• [Component 1]: [brief description]
• [Component 2]: [brief description]
• [Component 3]: [brief description]
...

<bold><cyan>Entry Points</cyan></bold>

• Main: [path to main entry]
• CLI: [path to CLI entry if applicable]
• Tests: [path to test entry if applicable]

<bold><cyan>Dependencies</cyan></bold>

Core:
• [dep1]: [purpose]
• [dep2]: [purpose]

Dev:
• [dev-dep1]: [purpose]
• [dev-dep2]: [purpose]

<bold><cyan>Available Commands</cyan></bold>

• [command1]: [description]
• [command2]: [description]
...

<bold><cyan>Code Patterns</cyan></bold>

• [Pattern 1 observed in the codebase]
• [Pattern 2 observed in the codebase]
...
---
