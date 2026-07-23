/** Deterministic large-document fixtures for the editor performance harness
 * (e2e/perf). Seeded into the mock db only when VITE_PERF_SEED=true so normal
 * dev sessions stay clean. Kept free of runtime imports: the perf specs also
 * import this module for the ids, and type-only imports are erased by both
 * Vite and Playwright's transpiler. */

export const PERF_WORKSPACE_ID = 'ws_bio';
export const PERF_LARGE_NOTE = {
  id: 'mat_perf_large',
  title: 'Perf probe — near-limit note',
  readyText: 'Section 1',
} as const;
export const PERF_SMALL_NOTE = {
  id: 'mat_perf_small',
  title: 'Perf probe — baseline note',
  readyText: 'Baseline note for typing latency.',
} as const;

interface PerfNode {
  type?: string;
  text?: string;
  id?: string;
  children?: PerfNode[];
  [key: string]: unknown;
}

export interface PerfDocument {
  schemaVersion: 1;
  value: PerfNode[];
}

let counter = 0;
const id = () => `perf_${++counter}`;

// Plain words only: no autoformat triggers (quotes, arrows, fractions) and no
// slash-command trigger, so typing-adjacent plugins stay in their idle path.
const WORDS =
  'mitochondria synthesize adenosine molecules across the inner membrane while enzymes regulate gradient flow during aerobic respiration cycles'.split(
    ' '
  );

function sentence(seed: number, words: number): string {
  const parts: string[] = [];
  for (let i = 0; i < words; i += 1) parts.push(WORDS[(seed + i * 7) % WORDS.length]);
  return parts.join(' ');
}

function paragraph(seed: number): PerfNode {
  // Multiple leaves with marks: closer to real documents than one text run.
  return {
    type: 'p',
    id: id(),
    children: [
      { text: sentence(seed, 12) + ' ' },
      { text: sentence(seed + 3, 4), bold: true },
      { text: ' ' + sentence(seed + 5, 8) + '.' },
    ],
  };
}

function heading(index: number): PerfNode {
  return { type: 'h2', id: id(), children: [{ text: `Section ${index}` }] };
}

function listItem(seed: number): PerfNode {
  return {
    type: 'p',
    id: id(),
    listStyleType: 'disc',
    indent: 1,
    children: [{ text: sentence(seed, 9) }],
  };
}

function codeBlock(seed: number, lines: number): PerfNode {
  return {
    type: 'code_block',
    id: id(),
    lang: 'javascript',
    children: Array.from({ length: lines }, (_, i) => ({
      type: 'code_line',
      id: id(),
      children: [{ text: `const value${i} = compute(${seed + i});` }],
    })),
  };
}

function table(rows: number, cols: number): PerfNode {
  return {
    type: 'table',
    id: id(),
    children: Array.from({ length: rows }, (_, r) => ({
      type: 'tr',
      id: id(),
      children: Array.from({ length: cols }, (_, c) => ({
        type: r === 0 ? 'th' : 'td',
        id: id(),
        children: [{ type: 'p', id: id(), children: [{ text: sentence(r * cols + c, 3) }] }],
      })),
    })),
  };
}

function countNodes(node: PerfNode): number {
  if (!node.children) return 1;
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

export function countPerfNodes(document: PerfDocument): number {
  return document.value.reduce((sum, node) => sum + countNodes(node), 0);
}

/** A realistic mixed document close to (but under) the 10k node limit. */
export function buildLargePerfDocument(targetNodes = 8000): PerfDocument {
  counter = 0;
  const value: PerfNode[] = [];
  let nodes = 0;
  let block = 0;
  const push = (node: PerfNode) => {
    value.push(node);
    nodes += countNodes(node);
  };

  while (nodes < targetNodes) {
    if (block % 40 === 0) push(heading(block / 40 + 1));
    else if (block % 40 === 10) push(codeBlock(block, 6));
    else if (block % 40 === 25) push(table(4, 3));
    else if (block % 8 < 3) push(listItem(block));
    else push(paragraph(block));
    block += 1;
  }

  return { schemaVersion: 1, value };
}

export function buildSmallPerfDocument(): PerfDocument {
  counter = 0;
  return {
    schemaVersion: 1,
    value: [{ type: 'p', id: id(), children: [{ text: PERF_SMALL_NOTE.readyText }] }],
  };
}
