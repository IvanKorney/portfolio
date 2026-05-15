"use client";

import {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Terminal from "./Terminal";
import { cwdToString } from "./filesystem";
import {
  collectLeafIds,
  findFirstLeafId,
  makeInitialTree,
  nextId,
  nextLeafId,
  removeLeaf,
  setSplitRatio,
  splitLeaf,
} from "./panes";
import { DEFAULT_THEME, isThemeId, THEMES } from "./themes";
import type { PaneId, PaneNode, SplitDir, ThemeId } from "./types";

const STORAGE_THEME = "ivan-term-theme";
const STORAGE_SIZE = "ivan-term-window-size";

const MIN_W = 480;
const MIN_H = 360;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/* ─── props ──────────────────────────────────────────────────── */

export interface WorkspaceProps {
  initialPos: { x: number; y: number };
  zIndex: number;
  onBringToFront: () => void;
  onCloseWindow: () => void;
  onNewWindow: () => void;
  isLastWindow: boolean;
}

/* ─── workspace ──────────────────────────────────────────────── */

export default function Workspace({
  initialPos,
  zIndex,
  onBringToFront,
  onCloseWindow,
  onNewWindow,
  isLastWindow,
}: WorkspaceProps) {
  /* theme */
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    try { window.localStorage.setItem(STORAGE_THEME, t); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const t = window.localStorage.getItem(STORAGE_THEME);
      if (t && isThemeId(t)) setThemeState(t);
      const sz = window.localStorage.getItem(STORAGE_SIZE);
      if (sz) {
        const p = JSON.parse(sz);
        if (p && typeof p.w === "number" && typeof p.h === "number") {
          setSize({
            w: clamp(p.w, MIN_W, window.innerWidth - 32),
            h: clamp(p.h, MIN_H, window.innerHeight - 64),
          });
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  /* pane tree */
  const initialLeafId = useMemo(() => nextId("p"), []);
  const [tree, setTree] = useState<PaneNode>(() => makeInitialTree(initialLeafId));
  const [focusedId, setFocusedId] = useState<PaneId>(initialLeafId);

  const leafIds = useMemo(() => collectLeafIds(tree), [tree]);
  const hasSiblings = leafIds.length > 1;

  const splitPane = useCallback((targetLeafId: PaneId, dir: SplitDir) => {
    const newId = nextId("p");
    setTree((t) => splitLeaf(t, targetLeafId, newId, dir));
    setFocusedId(newId);
  }, []);

  const closePane = useCallback((targetLeafId: PaneId): boolean => {
    const next = removeLeaf(tree, targetLeafId);
    if (next == null) return false;
    setTree(next);
    setFocusedId(findFirstLeafId(next));
    return true;
  }, [tree]);

  const focusNext = useCallback((fromId: PaneId) => {
    setFocusedId(nextLeafId(tree, fromId));
  }, [tree]);

  /* window size */
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 1100, h: 720 });
  const sizeRef = useRef(size);
  useEffect(() => { sizeRef.current = size; }, [size]);

  useEffect(() => {
    const onResize = () => {
      setSize((s) => ({
        w: clamp(s.w, MIN_W, window.innerWidth - 32),
        h: clamp(s.h, MIN_H, window.innerHeight - 64),
      }));
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_SIZE, JSON.stringify(size)); } catch { /* ignore */ }
  }, [size]);

  /* window position */
  const [pos, setPos] = useState(initialPos);
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);

  /* title bar drag to move window */
  const startWindowDrag = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startPosX = posRef.current.x;
    const startPosY = posRef.current.y;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => {
      setPos({
        x: clamp(startPosX + (ev.clientX - startMouseX), 0, window.innerWidth - sizeRef.current.w),
        y: clamp(startPosY + (ev.clientY - startMouseY), 0, window.innerHeight - 36),
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  /* corner resize */
  const startCornerResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startW = sizeRef.current.w;
    const startH = sizeRef.current.h;
    document.body.style.cursor = "nwse-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => {
      setSize({
        w: clamp(startW + (ev.clientX - startMouseX), MIN_W, window.innerWidth - 16),
        h: clamp(startH + (ev.clientY - startMouseY), MIN_H, window.innerHeight - 32),
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  /* divider drag */
  const startDividerDrag = useCallback(
    (splitId: PaneId, direction: SplitDir, containerEl: HTMLElement, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = containerEl.getBoundingClientRect();
      const isHorizontal = direction === "horizontal";
      document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      const onMove = (ev: MouseEvent) => {
        const ratio = isHorizontal
          ? (ev.clientX - rect.left) / rect.width
          : (ev.clientY - rect.top) / rect.height;
        setTree((t) => setSplitRatio(t, splitId, ratio));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [],
  );

  /* pane focus cycling */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedId((id) => nextLeafId(tree, id));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tree]);

  /* render */
  void cwdToString;

  return (
    <div
      style={{ position: "fixed", left: pos.x, top: pos.y, width: size.w, zIndex }}
      onMouseDown={onBringToFront}
    >
      <div
        className="relative rounded-xl border shadow-2xl overflow-hidden"
        style={{
          background: "var(--bg-window)",
          borderColor: "var(--border)",
          boxShadow:
            "0 30px 60px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset",
          height: size.h,
        }}
      >
        {/* title bar */}
        <div
          onMouseDown={startWindowDrag}
          className="flex items-center px-3 py-2 border-b select-none h-9"
          style={{
            background: "var(--bg-titlebar)",
            borderColor: "var(--border)",
            cursor: "grab",
          }}
        >
          <div className="flex gap-2">
            <button
              type="button"
              title={isLastWindow ? "last window" : "close window"}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={isLastWindow ? undefined : onCloseWindow}
              className="inline-block w-3 h-3 rounded-full transition-opacity"
              style={{
                background: isLastWindow ? "var(--text-dim)" : "#ff5f57",
                opacity: isLastWindow ? 0.3 : 1,
                cursor: isLastWindow ? "default" : "pointer",
                border: "none",
                padding: 0,
              }}
            />
            <span className="inline-block w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="inline-block w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div
            className="flex-1 text-center text-xs truncate px-3"
            style={{ color: "var(--text-dim)" }}
          >
            ivan@korneychuk — zsh — {leafIds.length}{" "}
            {leafIds.length === 1 ? "pane" : "panes"}
          </div>
          <div
            className="hidden sm:flex items-center gap-1.5 text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            <button
              type="button"
              title="new window (Ctrl+Shift+N)"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onNewWindow}
              className="rounded px-1.5 py-0.5 hover:opacity-100 opacity-70"
              style={{ border: "1px solid var(--border)" }}
            >
              + window
            </button>
            <button
              type="button"
              title="split right (Ctrl+Shift+D)"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => splitPane(focusedId, "horizontal")}
              className="rounded px-1.5 py-0.5 hover:opacity-100 opacity-70"
              style={{ border: "1px solid var(--border)" }}
            >
              ⇥ split
            </button>
            <span style={{ opacity: 0.3 }}>·</span>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setTheme(t.id)}
                title={`${t.label} — ${t.description}`}
                className="rounded px-1.5 py-0.5 transition-colors"
                style={{
                  background: theme === t.id ? "var(--border)" : "transparent",
                  color: theme === t.id ? "var(--accent)" : "var(--text-dim)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* pane area */}
        <div className="relative" style={{ height: "calc(100% - 2.25rem)" }}>
          <PaneRenderer
            node={tree}
            firstLeafId={initialLeafId}
            focusedId={focusedId}
            setFocusedId={setFocusedId}
            splitPane={splitPane}
            closePane={closePane}
            focusNext={focusNext}
            hasSiblings={hasSiblings}
            theme={theme}
            setTheme={setTheme}
            startDividerDrag={startDividerDrag}
          />
        </div>

        {/* corner resize handle */}
        <div
          onMouseDown={startCornerResize}
          title="drag to resize window"
          className="absolute bottom-0 right-0 z-20"
          style={{
            width: 14,
            height: 14,
            cursor: "nwse-resize",
            background:
              "linear-gradient(135deg, transparent 50%, var(--text-dim) 50%, var(--text-dim) 60%, transparent 60%, transparent 70%, var(--text-dim) 70%, var(--text-dim) 80%, transparent 80%)",
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}

/* ─── recursive pane renderer ────────────────────────────────── */

interface PaneRendererProps {
  node: PaneNode;
  firstLeafId: PaneId;
  focusedId: PaneId;
  setFocusedId: (id: PaneId) => void;
  splitPane: (id: PaneId, dir: SplitDir) => void;
  closePane: (id: PaneId) => boolean;
  focusNext: (id: PaneId) => void;
  hasSiblings: boolean;
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  startDividerDrag: (
    splitId: PaneId,
    dir: SplitDir,
    el: HTMLElement,
    e: React.MouseEvent,
  ) => void;
}

function PaneRenderer(props: PaneRendererProps) {
  const { node } = props;

  if (node.kind === "leaf") {
    return (
      <div className="h-full w-full">
        <Terminal
          id={node.id}
          focused={props.focusedId === node.id}
          onRequestFocus={() => props.setFocusedId(node.id)}
          onSplit={(dir) => props.splitPane(node.id, dir)}
          onClose={() => props.closePane(node.id)}
          onFocusNext={() => props.focusNext(node.id)}
          hasSiblings={props.hasSiblings}
          theme={props.theme}
          setTheme={props.setTheme}
          showBanner={node.id === props.firstLeafId}
        />
      </div>
    );
  }

  const isHorizontal = node.direction === "horizontal";
  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: isHorizontal ? "row" : "column",
    width: "100%",
    height: "100%",
  };
  const aStyle: CSSProperties = isHorizontal
    ? { width: `${node.ratio * 100}%`, height: "100%" }
    : { height: `${node.ratio * 100}%`, width: "100%" };
  const bStyle: CSSProperties = isHorizontal
    ? { width: `${(1 - node.ratio) * 100}%`, height: "100%" }
    : { height: `${(1 - node.ratio) * 100}%`, width: "100%" };

  return (
    <SplitContainer
      style={containerStyle}
      onDividerMouseDown={(el, e) =>
        props.startDividerDrag(node.id, node.direction, el, e)
      }
      direction={node.direction}
    >
      <div style={aStyle} className="relative overflow-hidden">
        <PaneRenderer {...props} node={node.a} />
      </div>
      <Divider direction={node.direction} />
      <div style={bStyle} className="relative overflow-hidden">
        <PaneRenderer {...props} node={node.b} />
      </div>
    </SplitContainer>
  );
}

function SplitContainer({
  style,
  direction,
  children,
  onDividerMouseDown,
}: {
  style: CSSProperties;
  direction: SplitDir;
  children: ReactNode;
  onDividerMouseDown: (el: HTMLElement, e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.divider && ref.current) {
      onDividerMouseDown(ref.current, e);
    }
  };
  void direction;

  return (
    <div ref={ref} style={style} onMouseDown={onMouseDown}>
      {children}
    </div>
  );
}

function Divider({ direction }: { direction: SplitDir }) {
  const isHorizontal = direction === "horizontal";
  return (
    <div
      data-divider="1"
      className="group relative shrink-0"
      style={{
        background: "var(--border)",
        width: isHorizontal ? 4 : "100%",
        height: isHorizontal ? "100%" : 4,
        cursor: isHorizontal ? "col-resize" : "row-resize",
        flexShrink: 0,
      }}
      title="drag to resize"
    >
      <div
        data-divider="1"
        style={{
          position: "absolute",
          inset: isHorizontal ? "0 -3px" : "-3px 0",
          cursor: isHorizontal ? "col-resize" : "row-resize",
        }}
      />
    </div>
  );
}
