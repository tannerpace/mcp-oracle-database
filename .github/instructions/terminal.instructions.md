# Terminal Command Guidelines

## Purpose
- Provide safe, reliable guidance for running shell commands in this development environment (macOS + zsh + VS Code integrated terminal).
- Prevent terminal disconnects and lost sessions by favoring small, testable commands and file-based scripts over large inline scripts.

## Scope
- Applies to interactive use of the VS Code integrated terminal while working on this repository.
- Not meant to restrict developer workflows — follow these guidelines when an integrated terminal session is used for automation, tests, or demonstration.

## Principles (why these rules matter)
- Keep terminal interactions small and observable to avoid crashing the terminal.
- Prefer files for larger logic so the editor can provide syntax checking, diffs, and version control.
- Use explicit, reproducible commands that other contributors can run.

## Rules

### 1. Run short commands interactively
- Single-line or short multi-segment commands are allowed.
  Examples:
  - `cd src && npm run dev`
  - `git pull origin main`
  - `nvm use`

### 2. Avoid large inline scripts
- Do not paste or run multiline scripts that exceed the limits below. These often cause the VS Code terminal to disconnect.
  Limits (guidelines):
  - Inline scripting blocks: avoid > ~10 lines.
  - Command length: avoid > ~500 characters.
  - Inline scripts: avoid > ~15 lines; prefer files for anything larger.
- If you need more logic, create a script file and run it (see File-based workflow below).

### 3. Prefer file-based workflows
- Create files in the repo (for example: `scripts/`, `src/`, `tools/`) and execute them from the terminal.
  Example:
  - `echo "print('hello')" > scripts/temp_script.py && python3 scripts/temp_script.py`
- Benefits:
  - Editor and git can review changes
  - Easier to test, lint, and reuse
  - Avoids long inline execution that can disconnect the terminal

### 4. Restrict heredoc usage
- Heredocs are acceptable only for very small snippets (under ~5 lines).
- For anything larger, write the content to a file in the editor or via `echo`/`cat` with a small body.

### 5. Limit chained commands
- Keep chains short and readable. Up to 3 segments with `&&` is fine:
  - `cd src && npm run build && npm start`
- Break longer workflows into multiple steps or scripts.

## Environment and tools
- Use the current interactive shell. Do not reinitialize or re-source shell configuration files (e.g., avoid re-running `source ~/.zshrc` unnecessarily).
- Respect the repository Node version: run `nvm use` rather than setting Node manually.
- Use `python3` for Python execution.
- Use `pnpm` for package installs when available.

## Execution style — examples and patterns

### Safe single command
```bash
git checkout -b feature/x && git push --set-upstream origin feature/x
```

### Small file creation (recommended for snippets)
```bash
echo 'const config = {};' > src/config.ts
```

### Small heredoc (acceptable only for tiny files)
```bash
cat > scripts/example.sh << 'EOF'
#!/usr/bin/env bash
echo "small script"
EOF
```

### File-based for larger logic (recommended)
1. Create: `scripts/run-report.py` (use VS Code editor).
2. Run: `python3 scripts/run-report.py`

## Error handling and troubleshooting
- If the terminal prints:
  ```
  Restarting the terminal because the connection to the shell process was lost...
  ```
  — Stop. Do not continue running large or complex inline commands. Rework the steps to smaller commands or write the script to a file and run it.
- When a command fails, inspect logs or stdout/stderr before retrying extra commands.

## Quick checklist before running a non-trivial command
- Is the command under 500 characters and fewer than ~10 lines? If not, use a file.
- Can the logic be committed or reviewed? If yes, create a file.
- Will the editor help (syntax highlight, linting, tests)? Prefer that workflow.
- Is `nvm use` needed to guarantee the Node version? If so, run it first.

## Summary (best practice)
- Keep commands small and explicit.
- Favor file-based scripts for anything beyond trivial snippets.
- Use the provided toolchain (`nvm`, `pnpm`, `python3`).
- Break complex workflows into steps that are easy to review and reproduce.

If in doubt, create the file in the repo using the editor, commit or stage it if appropriate, then run it from the terminal.