# VORQEN

Smart desktop workspace for folder-focused script execution and intelligent file management built with **Electron**, **Vite**, **React**, and **TypeScript**.

---

## Features

- **Folder Selection & Inspection**:
  - Native OS directory picker with instant file counts, subfolder counts, and directory size calculation.
  - Interactive file list with file types, extensions, and sizes.
  - Native Explorer/Finder integration to open selected directories with one click.
- **Script Runner Engine**:
  - Run **PowerShell**, **Windows CMD**, **Bash**, **Node.js**, or **Python** commands directly targeting any selected folder.
  - Streaming real-time terminal output with colored log separation (`stdout`, `stderr`, and `system`).
  - Execution tracking with duration timers and exit code status pills.
  - Immediate stop/cancellation support for long-running scripts.
  - Automatic directory re-indexing after scripts complete.
- **Script Library & Custom Runner**:
  - Built-in presets: Find 10 Largest Files, File Type Breakdown, Find Empty Subfolders, Directory Tree Map, and Node.js Package Audit.
  - Custom script console to write and execute arbitrary commands in the selected folder.

---

## Architecture & Security

- **Main Process** (`src/main/`): Handles Node.js system calls (`child_process`, `fs/promises`), window lifecycle, and OS dialogs.
- **Preload Bridge** (`src/preload/`): Implements `contextBridge.exposeInMainWorld` with `contextIsolation: true` and `nodeIntegration: false`.
- **Renderer** (`src/renderer/`): Modern React UI with dark theme, responsive grid, and live terminal console.
- **Shared Contracts** (`src/shared/`): Strictly typed IPC channels and message payloads shared across main, preload, and renderer.

---

## Getting Started

### Development
Start the app with live hot module replacement (HMR):
```bash
npm run dev
```

### Type Checking
Validate TypeScript across main, preload, and renderer:
```bash
npm run typecheck
```

### Production Build
Bundle the app for distribution:
```bash
npm run build
```
