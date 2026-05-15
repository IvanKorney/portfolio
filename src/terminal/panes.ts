import type { LeafPane, PaneId, PaneNode, SplitDir, SplitPane } from "./types";

/* ─── ID generator ───────────────────────────────────────────── */
let counter = 0;
export function nextId(prefix: string = "p"): PaneId {
  counter += 1;
  return `${prefix}${counter}`;
}

/* ─── tree queries ───────────────────────────────────────────── */

export function findFirstLeafId(node: PaneNode): PaneId {
  return node.kind === "leaf" ? node.id : findFirstLeafId(node.a);
}

export function collectLeafIds(node: PaneNode, out: PaneId[] = []): PaneId[] {
  if (node.kind === "leaf") {
    out.push(node.id);
  } else {
    collectLeafIds(node.a, out);
    collectLeafIds(node.b, out);
  }
  return out;
}

/* ─── mutations (return new trees) ──────────────────────────── */

/** Replace the leaf with `leafId` with a split containing the leaf + a new leaf. */
export function splitLeaf(
  tree: PaneNode,
  targetLeafId: PaneId,
  newLeafId: PaneId,
  direction: SplitDir,
): PaneNode {
  if (tree.kind === "leaf") {
    if (tree.id !== targetLeafId) return tree;
    const split: SplitPane = {
      kind: "split",
      id: nextId("s"),
      direction,
      ratio: 0.5,
      a: tree,
      b: { kind: "leaf", id: newLeafId },
    };
    return split;
  }
  return {
    ...tree,
    a: splitLeaf(tree.a, targetLeafId, newLeafId, direction),
    b: splitLeaf(tree.b, targetLeafId, newLeafId, direction),
  };
}

/**
 * Remove the leaf with `leafId`. Replaces its parent split with the sibling
 * subtree. Returns null if the leaf can't be found or if it's the only leaf.
 */
export function removeLeaf(
  tree: PaneNode,
  targetLeafId: PaneId,
): PaneNode | null {
  if (tree.kind === "leaf") {
    return tree.id === targetLeafId ? null : tree;
  }
  // If either direct child is the target leaf, collapse.
  if (tree.a.kind === "leaf" && tree.a.id === targetLeafId) return tree.b;
  if (tree.b.kind === "leaf" && tree.b.id === targetLeafId) return tree.a;
  const newA = removeLeaf(tree.a, targetLeafId);
  if (newA && newA !== tree.a) return { ...tree, a: newA };
  const newB = removeLeaf(tree.b, targetLeafId);
  if (newB && newB !== tree.b) return { ...tree, b: newB };
  return tree;
}

/** Adjust the ratio of a SplitPane by id. */
export function setSplitRatio(
  tree: PaneNode,
  splitId: PaneId,
  ratio: number,
): PaneNode {
  if (tree.kind === "leaf") return tree;
  if (tree.id === splitId) {
    return { ...tree, ratio: clamp(ratio, 0.1, 0.9) };
  }
  return {
    ...tree,
    a: setSplitRatio(tree.a, splitId, ratio),
    b: setSplitRatio(tree.b, splitId, ratio),
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Get the id of the next leaf after `currentId` (wraps around). */
export function nextLeafId(tree: PaneNode, currentId: PaneId): PaneId {
  const ids = collectLeafIds(tree);
  if (ids.length === 0) return currentId;
  const i = ids.indexOf(currentId);
  return ids[(i + 1) % ids.length];
}

/** Factory for an initial tree containing a single leaf. */
export function makeInitialTree(firstId: PaneId): PaneNode {
  const leaf: LeafPane = { kind: "leaf", id: firstId };
  return leaf;
}
