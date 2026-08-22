# Tally

Tally is a private household ledger. Add income and expenses on one side, and read a live running
statement on the other. Everything stays on your machine: there is no account, no server, and no
network calls at all.

[![Leave a tip](https://img.shields.io/badge/☕-Leave_a_tip-ff69b4?style=for-the-badge)](#-leave-a-tip)

## What it does

- Add income and expense entries with a description, amount, type, and date.
- See totals update live: net position, revenue, and expenses for the current period.
- Entries are grouped by day and sorted chronologically into one running statement.
- Undo and redo for every change, including deletes, with a toast that lets you reverse a delete
  right away.
- Pick from 47 currencies. Amounts render with the correct symbol and formatting for each one.
- Export the full statement to a real vector PDF, drawn directly rather than captured as an image,
  so the text stays sharp and selectable.
- Back up the ledger to a JSON file and restore it later, on this machine or another one.
- Runs as a native Windows desktop app, built with Tauri, or in any modern browser.

## Tech stack

- [React 19](https://react.dev) and [TypeScript](https://www.typescriptlang.org)
- [Vite 8](https://vite.dev) for the dev server and bundling
- [Tailwind CSS v4](https://tailwindcss.com), configured CSS first, with no `tailwind.config.js`
- [shadcn/ui](https://ui.shadcn.com) components on [Radix UI](https://www.radix-ui.com) primitives
- [lucide-react](https://lucide.dev) for icons
- [jsPDF](https://github.com/parallax/jsPDF) for the PDF export
- [Tauri v2](https://tauri.app) (Rust) for the desktop shell
- [sonner](https://sonner.emilkowal.ski) for toast notifications

## Getting started

### Prerequisites

For the web build you only need [Node.js](https://nodejs.org) 20 or newer.

For the desktop build you also need the [Tauri v2 prerequisites](https://tauri.app/start/prerequisites/)
for your platform. On Windows that means:

- [Rust](https://rustup.rs), stable channel, MSVC toolchain
- Microsoft C++ Build Tools, including the Windows SDK
- The WebView2 runtime, which already ships with Windows 10 and 11

### Install

```bash
git clone https://github.com/UMA1R-01/tally.git
cd tally
npm install
```

### Run

```bash
npm run dev
```

```bash
npm run tauri dev
```

`npm run dev` serves the web app at `http://localhost:5173`. `npm run tauri dev` launches the
desktop window and starts Vite for you. The first desktop run compiles the full Rust dependency
tree and can take several minutes; later runs are much faster.

### Build

```bash
npm run build
```

```bash
npm run tauri build
```

`npm run build` type-checks the project with `tsc` and bundles it to `dist/`. `npm run tauri build`
produces a Windows installer under `src-tauri/target/release/bundle/`. `npm run typecheck` runs the
type checker on its own, with no bundling, and `npm run preview` serves the production build
locally.

## Data and storage

The ledger lives in the browser's `localStorage`, under the key `tally_transactions`, and is saved
automatically on every change: adding, editing, and deleting are all durable the instant they
happen.

That storage belongs to one browser, on one device. Clearing site data, opening a private window,
or moving to a different machine loses it, which is exactly what Backup and Restore are for.

**Export PDF** produces a snapshot for reading, printing, or sharing. It cannot be read back into
the app. **Backup** writes a JSON file that can be restored later and is the only way to move a
ledger between devices or recover it after clearing storage.

## Project structure

```
src/
  components/       Rail, EntryForm, StatementHero, LedgerTable, TitleBar, ui primitives
  hooks/            useTransactions (state, undo/redo history), useCurrency
  services/         PDF export, JSON backup and restore
  lib/              date, money, currency, storage, and other pure helpers
src-tauri/
  src/              Tauri app entry point and window setup
  capabilities/     permission grants for the desktop shell
  icons/            app icon, generated for every platform size
```

## License

[MIT](LICENSE) (c) Umair Aamir

## ☕ Leave a tip

💛 If you like this app, a tip is always welcome!

<div>

<img src="https://img.shields.io/badge/Bitcoin-native%20BTC%20only-555?style=flat-square&logo=bitcoin&logoColor=white&labelColor=F7931A" alt="Bitcoin: native BTC only">

```
bc1qs25pegh3232q9j58kt5dgczymcj4pg8a5un2zp
```

</div>

<div>

<img src="https://img.shields.io/badge/Base-ETH%20%2F%20USDC%20on%20Base%20only-555?style=flat-square&logo=coinbase&logoColor=white&labelColor=0052FF" alt="Base: ETH / USDC on Base only">

```
0x81F29C9Dca41cb57395BE5b56c7606653A8c2E34
```

</div>

<div>

<img src="https://img.shields.io/badge/Solana-SOL%20%2F%20SPL%20tokens%20only-555?style=flat-square&logo=solana&logoColor=white&labelColor=9945FF" alt="Solana: SOL / SPL tokens only">

```
G57VrGCbAFWSe2vPfx2ZrUUxzJeiARncKUkYMxw3wKVa
```

</div>
