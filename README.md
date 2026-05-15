# ivan@korneychuk — terminal portfolio

A terminal-style personal site for Ivan Korneychuk.
Built with **Next.js 14 (App Router)**, **TypeScript**, and **Tailwind**.

> Type `help` once it's running.

## Features

- **Fully interactive shell** — commands, arguments, command history (↑/↓),
  tab autocomplete (commands *and* paths), Ctrl+L to clear, Ctrl+C to cancel.
- **Resizable window** — drag the bottom-right corner of the terminal card to
  resize it. Size persists in localStorage.
- **Split panes (tmux-style)** — every pane can split horizontally or vertically
  into a new independent terminal. Drag the dividers between panes to rebalance
  them. Each pane has its own cwd, history, and prompt. The pane with a cyan
  outline is focused; click any pane to switch.
- **Modern dark macOS-ish chrome** by default, with two extra themes:
  `green` (phosphor CRT) and `amber` (retro CRT) — switchable via the
  `theme` command or the buttons in the title bar. Choice is persisted in
  localStorage.
- **Fake filesystem** under `~` with `ls`, `cat`, `cd`, `pwd`. The CV content
  lives as text files (`about.txt`, `experience/*.md`, `projects/*.md`,
  `skills.txt`, `contact.md`, `README.md`, `education.txt`).
- **Live GitHub stats** — `github` fetches the public GitHub API and prints
  followers, public repos, and your top recently-updated repos.
- **Resume download** — `resume` (or `open resume`) triggers a download of
  `public/Ivan_Korneychuk_CV.pdf`.
- **Easter eggs** — `sudo`, `exit`, `neofetch`, `banner`.

## Available commands

```
about      whoami     experience   projects     skills       education
contact    resume     github       ls [path]    cat <file>   cd [path]
pwd        clear      theme [id]   history      date         echo <text>
open <t>   neofetch   banner       help         split right  split down
close
```

## Keyboard shortcuts

```
Tab               autocomplete (commands and paths)
↑ / ↓             cycle command history
Enter             run the command
Ctrl+L            clear the screen
Ctrl+C            cancel current input
Ctrl+Shift+D      split focused pane → right
Ctrl+Shift+E      split focused pane → down
Ctrl+Shift+W      close focused pane
Ctrl+Shift+→/↓    move focus to next pane
```

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

## Build & deploy

```bash
npm run build
npm start
```

The repo deploys as-is on **Vercel** — push to GitHub, import the repo in
the Vercel dashboard, no env vars required. Replace your current
`ivan-korneychuk.vercel.app` deployment by pointing the project at this
repo, or set a new domain.

## File map

```
portfolio/
├── public/
│   └── Ivan_Korneychuk_CV.pdf       ← served at /Ivan_Korneychuk_CV.pdf
├── src/
│   ├── app/
│   │   ├── layout.tsx               ← html shell + metadata
│   │   ├── page.tsx                 ← mounts <Terminal />
│   │   └── globals.css              ← theme CSS variables + scanlines
│   └── terminal/
│       ├── Workspace.tsx            ← outer chrome, pane tree, resize, dividers
│       ├── Terminal.tsx             ← single pane: input, history, tab complete
│       ├── panes.ts                 ← pane-tree helpers (split / close / ratio)
│       ├── commands.tsx             ← every command + banner + path complete
│       ├── filesystem.ts            ← virtual fs + path utilities
│       ├── themes.ts                ← theme metadata
│       └── types.ts                 ← shared types
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
└── tsconfig.json
```

## Customizing

- **Bio / experience / projects** — edit `src/terminal/filesystem.ts`.
  The richer "section" commands (`about`, `experience`, `projects`) live
  in `src/terminal/commands.tsx`; update them there in tandem.
- **Add a command** — add a `Command` object in `commands.tsx` and push it
  into the `COMMANDS` array. Add the name to `COMMANDS_WITH_PATHS` in
  `Terminal.tsx` if it should tab-complete filesystem paths.
- **Add a theme** — extend `ThemeId` in `types.ts`, add the `[data-theme="..."]`
  block in `globals.css`, and add an entry to `THEMES` in `themes.ts`.
- **Replace the CV** — drop a new PDF at `public/Ivan_Korneychuk_CV.pdf`
  (keep the filename) or update the path in the `resume` command.

## Notes

- All keyboard input goes through one invisible `<input>` overlaid on the
  prompt — this keeps mobile keyboards working without giving up the
  custom caret look.
- `localStorage` is used for the picked theme and the last 100 commands
  (used for ↑/↓ history across reloads).
- The site is 100% client-side after the initial render — no backend
  required.
