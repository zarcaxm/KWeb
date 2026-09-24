# KWeb

Structured topic knowledge workspace. Organize knowledge in folders, write topic pages, and connect related subjects.

Knowledge lives in a **vault**: a normal folder on your computer, similar to an Obsidian vault. The desktop app reads and writes those files. Nothing is stored in a remote database.

## Vault layout

```
My Vault/
  .kweb/vault.json                 vault marker
  Programming/.kweb.json           stable folder id
  Programming/Machine Learning.md  topic (JSON frontmatter + markdown)
```

- Folders are directories.
- Topics are Markdown files. The title, description, favorite flag, dates, and outgoing connections sit in a JSON frontmatter block. The body is what you know about the subject.
- A topic can relate to topics in other folders. The folder path and the connection are independent.
- A later cloud sync can synchronize this folder. Each topic file can sync on its own.

The last opened vault path is remembered in `%APPDATA%\KWeb\settings.json` (or your home directory). That file is app settings, not your knowledge.

## Requirements

- Node.js 18+
- Rust (https://rustup.rs) and the Microsoft C++ build tools, for the desktop shell
- WebView2 (already present on current Windows 10/11)

## Desktop app

```bash
npm install
npm run desktop
```

On first launch, choose a folder. An existing folder is adopted as a vault: subfolders become folders, and Markdown files inside them become topics.

Optional sample data, after a vault is open: visit `/?dev=1` and click **Load sample data**.

## Web dev server

```bash
npm run dev
```

The browser build cannot access a vault folder. Use `npm run desktop` to work with your files.

## Production build

```bash
npm run desktop:build
```

The installer is written under `src-tauri/target/release/bundle`.

## Keyboard

- **Cmd/Ctrl + K** — global search

## Stack

- Tauri (desktop filesystem)
- Next.js (App Router, static export)
- TypeScript, React, Tailwind CSS
- TipTap (markdown), Lucide icons
