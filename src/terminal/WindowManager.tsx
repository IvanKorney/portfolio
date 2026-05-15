"use client";

import { useCallback, useEffect, useState } from "react";
import Workspace from "./Workspace";

interface WinEntry {
  id: string;
  initialPos: { x: number; y: number };
}

let winCounter = 0;

export default function WindowManager() {
  const [wins, setWins] = useState<WinEntry[]>([]);
  const [order, setOrder] = useState<string[]>([]);

  // Initialize first window after mount so we have viewport dimensions
  useEffect(() => {
    const id = `w${++winCounter}`;
    const savedSize = (() => {
      try {
        const s = window.localStorage.getItem("ivan-term-window-size");
        if (s) {
          const p = JSON.parse(s);
          if (typeof p.w === "number" && typeof p.h === "number") return p;
        }
      } catch { /* ignore */ }
      return { w: 1100, h: 720 };
    })();
    const w = Math.min(savedSize.w, window.innerWidth - 40);
    const h = Math.min(savedSize.h, window.innerHeight - 80);
    const x = Math.max(20, Math.round((window.innerWidth - w) / 2));
    const y = Math.max(20, Math.round((window.innerHeight - h) / 2));
    setWins([{ id, initialPos: { x, y } }]);
    setOrder([id]);
  }, []);

  const bringToFront = useCallback((id: string) => {
    setOrder((o) => (o[o.length - 1] === id ? o : [...o.filter((x) => x !== id), id]));
  }, []);

  const addWindow = useCallback(() => {
    const id = `w${++winCounter}`;
    setWins((prev) => {
      const offset = Math.min(prev.length * 40, 240);
      const x = Math.max(20, Math.round((window.innerWidth - 1100) / 2) + offset);
      const y = Math.max(20, Math.round((window.innerHeight - 720) / 2) + offset);
      return [...prev, { id, initialPos: { x, y } }];
    });
    setOrder((o) => [...o, id]);
  }, []);

  const removeWindow = useCallback((id: string) => {
    setWins((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((x) => x.id !== id);
    });
    setOrder((o) => o.filter((x) => x !== id));
  }, []);

  // Ctrl+Shift+N = new window
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "N" || e.key === "n")) {
        e.preventDefault();
        addWindow();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addWindow]);

  if (wins.length === 0) return null;

  return (
    <>
      {wins.map((win) => (
        <Workspace
          key={win.id}
          initialPos={win.initialPos}
          zIndex={order.indexOf(win.id) + 10}
          onBringToFront={() => bringToFront(win.id)}
          onCloseWindow={() => removeWindow(win.id)}
          onNewWindow={addWindow}
          isLastWindow={wins.length === 1}
        />
      ))}
    </>
  );
}
