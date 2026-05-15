import type { ReactNode } from "react";

export type ThemeId = "modern" | "green" | "amber";

export interface FsFile {
  type: "file";
  content: string;
}
export interface FsDir {
  type: "dir";
  children: Record<string, FsNode>;
}
export type FsNode = FsFile | FsDir;

export interface HistoryEntry {
  /** 'input' is what user typed (echoed with prompt), 'output' is command result */
  kind: "input" | "output";
  /** Path at time of input (only used when kind === 'input') */
  cwd?: string[];
  /** Raw input string (for kind === 'input') */
  input?: string;
  /** Output lines (for kind === 'output') */
  lines?: ReactNode[];
}

export interface CommandContext {
  args: string[];
  raw: string;
  cwd: string[];
  setCwd: (next: string[]) => void;
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  clear: () => void;
  history: string[];
  commandNames: string[];
  /** Split the current pane in the given direction. */
  splitPane: (dir: SplitDir) => void;
  /** Close the current pane. Returns false if it's the last one. */
  closePane: () => boolean;
  /** Cycle focus to the next pane. */
  focusNext: () => void;
}

/* ─── pane tree ─────────────────────────────────────────────── */
export type PaneId = string;

/** "horizontal" = panes laid out side-by-side (split divider is vertical) */
export type SplitDir = "horizontal" | "vertical";

export interface LeafPane {
  kind: "leaf";
  id: PaneId;
}
export interface SplitPane {
  kind: "split";
  id: PaneId;
  direction: SplitDir;
  /** Fraction of space given to child `a` (0..1). */
  ratio: number;
  a: PaneNode;
  b: PaneNode;
}
export type PaneNode = LeafPane | SplitPane;

export type CommandResult = ReactNode[] | ReactNode | void;

export interface Command {
  name: string;
  summary: string;
  usage?: string;
  hidden?: boolean;
  run: (ctx: CommandContext) => CommandResult | Promise<CommandResult>;
}
