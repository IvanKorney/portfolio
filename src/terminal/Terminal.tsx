"use client";

import {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  COMMAND_MAP,
  COMMANDS,
  buildBanner,
  completePath,
  notFound,
} from "./commands";
import { cwdToString } from "./filesystem";
import type { HistoryEntry, SplitDir, ThemeId } from "./types";

const COMMANDS_WITH_PATHS = new Set(["ls", "cat", "cd"]);

function Prompt({ cwd }: { cwd: string[] }) {
  return (
    <span>
      <span style={{ color: "var(--prompt-user)" }}>ivan</span>
      <span style={{ color: "var(--prompt-symbol)" }}>@</span>
      <span style={{ color: "var(--prompt-host)" }}>korneychuk</span>
      <span style={{ color: "var(--prompt-symbol)" }}>:</span>
      <span style={{ color: "var(--prompt-path)" }}>{cwdToString(cwd)}</span>
      <span style={{ color: "var(--prompt-symbol)" }}>$</span>{" "}
    </span>
  );
}

export interface TerminalProps {
  /** Stable pane id (used for keys and focus tracking). */
  id: string;
  /** Is this the active pane? */
  focused: boolean;
  /** Called when this pane should become focused. */
  onRequestFocus: () => void;
  /** Split this pane in the given direction. */
  onSplit: (dir: SplitDir) => void;
  /** Close this pane. Returns false if it's the last one. */
  onClose: () => boolean;
  /** Move focus to the next pane in tree order. */
  onFocusNext: () => void;
  /** Whether more than one pane is on screen (controls close-button visibility). */
  hasSiblings: boolean;
  /** Current theme (shared across all panes). */
  theme: ThemeId;
  /** Theme setter (shared). */
  setTheme: (t: ThemeId) => void;
  /** Should this terminal print the boot banner on mount? */
  showBanner: boolean;
}

export default function Terminal({
  id,
  focused,
  onRequestFocus,
  onSplit,
  onClose,
  onFocusNext,
  hasSiblings,
  theme,
  setTheme,
  showBanner,
}: TerminalProps) {
  /* ─── state (per-pane) ─────────────────────────────────────── */
  const [cwd, setCwd] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [booted, setBooted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* ─── boot banner (only on the first pane) ────────────────── */
  useEffect(() => {
    if (booted) return;
    if (showBanner) {
      setHistory([{ kind: "output", lines: buildBanner(theme) }]);
    } else {
      // Spawned pane: print a tiny header so it doesn't feel empty.
      setHistory([
        {
          kind: "output",
          lines: [
            <div key="hdr" style={{ color: "var(--text-dim)" }}>
              new pane — type{" "}
              <span style={{ color: "var(--accent)" }}>help</span>
            </div>,
          ],
        },
      ]);
    }
    setBooted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  /* ─── autoscroll ──────────────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [history]);

  /* ─── focus management ────────────────────────────────────── */
  useEffect(() => {
    if (focused) inputRef.current?.focus({ preventScroll: true });
  }, [focused]);

  const commandNames = useMemo(
    () => COMMANDS.filter((c) => !c.hidden).map((c) => c.name),
    [],
  );

  const clearScreen = useCallback(() => setHistory([]), []);

  const pushOutput = useCallback((lines: ReactNode[] | ReactNode) => {
    setHistory((h) => [
      ...h,
      { kind: "output", lines: Array.isArray(lines) ? lines : [lines] },
    ]);
  }, []);

  const run = useCallback(
    async (raw: string, snapshotCwd: string[]) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setHistory((h) => [
          ...h,
          { kind: "input", cwd: snapshotCwd, input: "" },
        ]);
        return;
      }
      const parts = trimmed.split(/\s+/);
      const name = parts[0];
      const args = parts.slice(1);
      const cmd = COMMAND_MAP[name];

      setHistory((h) => [
        ...h,
        { kind: "input", cwd: snapshotCwd, input: raw },
      ]);

      if (!cmd) {
        pushOutput(notFound(name));
        return;
      }

      try {
        const result = await cmd.run({
          args,
          raw,
          cwd: snapshotCwd,
          setCwd,
          theme,
          setTheme,
          clear: clearScreen,
          history: cmdHistory,
          commandNames,
          splitPane: onSplit,
          closePane: onClose,
          focusNext: onFocusNext,
        });
        if (result == null) return;
        pushOutput(result as ReactNode | ReactNode[]);
      } catch (err) {
        pushOutput(
          <span style={{ color: "var(--error)" }}>
            error: {err instanceof Error ? err.message : String(err)}
          </span>,
        );
      }
    },
    [
      cmdHistory,
      commandNames,
      clearScreen,
      onClose,
      onFocusNext,
      onSplit,
      pushOutput,
      setTheme,
      theme,
    ],
  );

  const completeAtCursor = useCallback(
    (value: string): { next: string; suggestions?: string[] } => {
      const tokens = value.split(/\s+/);
      if (tokens.length <= 1) {
        const frag = tokens[0] ?? "";
        if (!frag) return { next: value };
        const matches = commandNames.filter((c) => c.startsWith(frag));
        if (matches.length === 0) return { next: value };
        if (matches.length === 1) return { next: matches[0] + " " };
        const common = longestCommonPrefix(matches);
        return {
          next: common.length > frag.length ? common : value,
          suggestions: matches,
        };
      }
      const head = tokens[0];
      if (!COMMANDS_WITH_PATHS.has(head)) return { next: value };
      const last = tokens[tokens.length - 1];
      const candidates = completePath(cwd, last);
      if (candidates.length === 0) return { next: value };
      if (candidates.length === 1) {
        return {
          next: tokens.slice(0, -1).join(" ") + " " + candidates[0],
        };
      }
      const common = longestCommonPrefix(candidates);
      return {
        next:
          tokens.slice(0, -1).join(" ") +
          " " +
          (common.length > last.length ? common : last),
        suggestions: candidates,
      };
    },
    [cwd, commandNames],
  );

  /* ─── key handler ─────────────────────────────────────────── */
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // Pane shortcuts (also handled at workspace level for unfocused panes)
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        onSplit("horizontal");
        return;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        onSplit("vertical");
        return;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "W" || e.key === "w")) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        clearScreen();
        return;
      }
      if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setHistory((h) => [
          ...h,
          { kind: "input", cwd, input: input + "^C" },
        ]);
        setInput("");
        setHistoryCursor(null);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const value = input;
        setInput("");
        setHistoryCursor(null);
        if (value.trim()) setCmdHistory((h) => [...h, value]);
        void run(value, cwd);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (cmdHistory.length === 0) return;
        const next =
          historyCursor === null
            ? cmdHistory.length - 1
            : Math.max(0, historyCursor - 1);
        setHistoryCursor(next);
        setInput(cmdHistory[next]);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyCursor === null) return;
        const next = historyCursor + 1;
        if (next >= cmdHistory.length) {
          setHistoryCursor(null);
          setInput("");
        } else {
          setHistoryCursor(next);
          setInput(cmdHistory[next]);
        }
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const { next, suggestions } = completeAtCursor(input);
        setInput(next);
        if (suggestions && suggestions.length > 1) {
          pushOutput(
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: "0 1.5em" }}
            >
              {suggestions.map((s) => (
                <span key={s} style={{ color: "var(--accent)" }}>
                  {s}
                </span>
              ))}
            </div>,
          );
        }
        return;
      }
    },
    [
      clearScreen,
      cmdHistory,
      completeAtCursor,
      cwd,
      historyCursor,
      input,
      onClose,
      onSplit,
      pushOutput,
      run,
    ],
  );

  const focusInput = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) return;
    onRequestFocus();
    inputRef.current?.focus({ preventScroll: true });
  }, [onRequestFocus]);

  /* ─── render ───────────────────────────────────────────────── */
  return (
    <div
      ref={scrollRef}
      onMouseDown={onRequestFocus}
      onClick={focusInput}
      data-pane-id={id}
      className={`term relative h-full w-full px-3 sm:px-4 py-3 text-[13px] sm:text-sm leading-relaxed overflow-y-auto overflow-x-hidden ${
        theme === "modern" ? "" : "scanlines"
      }`}
      style={{
        color: "var(--text)",
        cursor: "text",
        boxShadow: focused
          ? "inset 0 0 0 1px var(--accent)"
          : "inset 0 0 0 1px transparent",
        transition: "box-shadow 120ms ease",
      }}
    >
      {/* tiny pane toolbar (only with siblings) */}
      {hasSiblings && (
        <div
          className="absolute top-1 right-2 flex items-center gap-1 text-[11px] z-10"
          style={{ color: "var(--text-dim)" }}
        >
          <PaneBtn
            title="split right (Ctrl+Shift+D)"
            onClick={(e) => {
              e.stopPropagation();
              onSplit("horizontal");
            }}
          >
            ⇥
          </PaneBtn>
          <PaneBtn
            title="split down (Ctrl+Shift+E)"
            onClick={(e) => {
              e.stopPropagation();
              onSplit("vertical");
            }}
          >
            ⤓
          </PaneBtn>
          <PaneBtn
            title="close pane (Ctrl+Shift+W)"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            ×
          </PaneBtn>
        </div>
      )}

      {history.map((entry, idx) => (
        <div key={idx} className="mb-1">
          {entry.kind === "input" ? (
            <div>
              <Prompt cwd={entry.cwd ?? []} />
              <span>{entry.input}</span>
            </div>
          ) : (
            <div>{entry.lines}</div>
          )}
        </div>
      ))}

      <div className="flex items-center">
        <Prompt cwd={cwd} />
        <span className="relative inline-flex items-center flex-1 min-w-0">
          <span aria-hidden="true" className="whitespace-pre break-all">
            {input}
          </span>
          {focused && <span className="caret" aria-hidden="true" />}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onRequestFocus}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label={`terminal input ${id}`}
            className="absolute inset-0 w-full bg-transparent outline-none border-0 text-transparent"
            style={{ caretColor: "transparent" }}
          />
        </span>
      </div>
      <div ref={bottomRef} />
    </div>
  );
}

function PaneBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className="rounded px-1.5 leading-none hover:opacity-100 opacity-60"
      style={{
        background: "transparent",
        color: "var(--text-dim)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </button>
  );
}

function longestCommonPrefix(strs: string[]): string {
  if (strs.length === 0) return "";
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (strs[i].indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
}
