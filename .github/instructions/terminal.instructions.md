# 🧠 Copilot Terminal Command Guidelines

These rules are designed for this development environment (macOS + zsh + VS Code integrated terminal).  
You **may execute shell commands**, but follow these rules to prevent terminal resets or lost sessions.

---

## ⚙️ General Behavior

- ✅ You **can run short shell commands** directly in the integrated terminal.
  Examples:
  ```bash
  cd src && npm run dev
  git pull origin main
  nvm use
  ```

- 🚫 **Do not generate or execute giant multiline terminal commands** (such as heredocs using `<<EOF` or long Python scripts inline).
  These cause the VS Code terminal to disconnect.
  Instead, write files explicitly and then run them. Example:
  ```bash
  echo "print('hello')" > temp_script.py && python3 temp_script.py
  ```

- 🚫 **Avoid inline scripting blocks** longer than ~10 lines or commands over ~500 characters total length.
  If a script or command exceeds these limits, create a file in the appropriate directory (`src/`, `scripts/`, etc.) instead.

---

## 🪄 Environment & Tools

- Always use the current shell session. Don't reinitialize the terminal or re-source `.zshrc`.

- Assume Node version is managed by `.nvmrc`. Use:
  ```bash
  nvm use
  ```
  instead of manually setting Node versions.

- Use `python3` for Python scripts, not system Python.

- Use `pnpm` for Node package installs when available.

---

## 🧩 Execution Style

- When creating or modifying files, prefer commands like:
  ```bash
  echo 'const config = {};' > src/config.ts
  ```
  For slightly larger content (under 5 lines), you can use heredocs:
  ```bash
  cat > src/config.ts << 'EOF'
  // small file content
  EOF
  ```
  but only for **small snippets**.

- If Copilot suggests writing more than ~15 lines of content, split it into two steps:
  1. Create the file via VS Code's editor.
  2. Run terminal commands to test or execute it.

- Avoid chain commands longer than 3 segments with `&&`. Example:
  ```bash
  cd src && npm run build && npm start
  ```
  is okay.
  Anything longer should be broken up.

---

## ⚠️ Error Handling

If a command fails or prints:
```
Restarting the terminal because the connection to the shell process was lost...
```
Then **stop** and rewrite the workflow to use smaller chunks or file-based execution.

---

## ✨ Goal

Keep terminal commands **small, readable, and reliable** — never so large that they crash or disconnect the integrated terminal.
**When in doubt: write code to a file, then execute it.**