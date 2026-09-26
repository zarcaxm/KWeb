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

The last opened vault path is remembered in `%APPDATA%\KWeb\settings.json` on Windows or `${XDG_CONFIG_HOME:-~/.config}/KWeb/settings.json` on Linux. That file is app settings, not your knowledge.

## Requirements

- Node.js 18+
- Rust (https://rustup.rs)
- Windows: Microsoft C++ build tools and WebView2 (already present on current Windows 10/11)
- Linux: WebKitGTK 4.1 and GTK 3 development packages, plus the normal Tauri Linux prerequisites

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

Updater artifacts are signed when `TAURI_SIGNING_PRIVATE_KEY` or `TAURI_SIGNING_PRIVATE_KEY_PATH` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` are present in the build environment. The private key stays outside this repository.

### Linux

Build the native Linux release binary with:

```bash
npm run desktop:build:linux
```

Install it for the current user with:

```bash
npm run install:linux
```

The installer copies KWeb into `~/.local/bin` and creates a desktop entry whose `Exec` value is the absolute installed path. This is intentional: graphical launchers do not always inherit a shell `PATH` containing `~/.local/bin`. An alternate prefix or binary can be supplied with `--prefix` and `--binary`.

Build distributable AppImages on an older-glibc Linux CI image. Tauri's bundled `linuxdeploy` symbol-stripper cannot process the RELR sections in current Arch Linux system libraries, so AppImage packaging on current Arch fails even though the application binary builds successfully.

## Updates

Installed copies check [the latest GitHub release](https://github.com/zarcaxm/KWeb/releases/latest) on startup. When a newer signed version exists, a banner offers **Update and restart**. The vault folder is not part of the app install, so an update does not change your notes.

The first installer that includes the updater still has to be installed once. Later versions update in place.

To publish a version:

1. Raise `version` in `package.json` and `src-tauri/tauri.conf.json` to the same value.
2. Run `npm run desktop:build`.
3. Create a GitHub release and upload `latest.json` plus each supported platform's installer and signed updater artifacts. Windows output is under `src-tauri/target/release/bundle/nsis`; Linux AppImage output is under `src-tauri/target/release/bundle/appimage`. The app downloads `latest.json` from that release.

## Keyboard

- **Cmd/Ctrl + K** — global search

## Stack

- Tauri (desktop filesystem)
- Next.js (App Router, static export)
- TypeScript, React, Tailwind CSS
- TipTap (markdown), Lucide icons
