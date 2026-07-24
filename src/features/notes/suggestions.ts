import type { MaterialValue } from '@/features/materials/document';
import type { MaterialSuggestion } from '@/api/types';

type SuggestionDecision = 'accept' | 'reject';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function suggestionTypes(node: Record<string, unknown>): Set<string> {
  const types = new Set<string>();
  if (isRecord(node.suggestion) && typeof node.suggestion.type === 'string') {
    types.add(node.suggestion.type);
  }
  for (const [key, value] of Object.entries(node)) {
    if (!key.startsWith('suggestion_') || !isRecord(value)) continue;
    if (typeof value.type === 'string') types.add(value.type);
  }
  return types;
}

function topLevelIndexFromAnchor(anchor: unknown): number | null {
  if (!isRecord(anchor)) return null;

  const selection = isRecord(anchor.selection) ? anchor.selection : anchor;
  const point = isRecord(selection.focus)
    ? selection.focus
    : isRecord(selection.anchor)
      ? selection.anchor
      : null;
  const path = point && Array.isArray(point.path) ? point.path : null;
  const index = path?.[0];

  return typeof index === 'number' ? index : null;
}

export function suggestionAnchorTopLevelIndex(anchor: unknown): number | null {
  return topLevelIndexFromAnchor(anchor);
}

export function suggestionAnchorBlockId(suggestion: MaterialSuggestion): string | null {
  if (typeof suggestion.anchor.blockId === 'string') return suggestion.anchor.blockId;

  const index = topLevelIndexFromAnchor(suggestion.anchor);
  if (index === null) return null;
  const originalId = suggestion.originalFragment?.[index]?.id;
  if (typeof originalId === 'string') return originalId;
  const proposedId = suggestion.proposedFragment?.[index]?.id;
  return typeof proposedId === 'string' ? proposedId : null;
}

function nodeHasSuggestion(node: unknown): boolean {
  if (!isRecord(node)) return false;
  if (suggestionTypes(node).size > 0) return true;
  return Array.isArray(node.children) && node.children.some(nodeHasSuggestion);
}

/**
 * Build a durable anchor for a submitted snapshot.
 *
 * The live caret can be inside a newly inserted block that disappears when the
 * editor resets to the base document. Anchor the card to the nearest changed
 * block that still exists in the base document instead.
 */
export function buildSubmittedSuggestionAnchor({
  baseValue,
  proposedValue,
  selection,
}: {
  baseValue: MaterialValue;
  proposedValue: MaterialValue;
  selection: unknown;
}): Record<string, unknown> {
  const selectedIndex = topLevelIndexFromAnchor(selection) ?? 0;
  const baseIds = new Set(
    baseValue.flatMap((node) => (typeof node.id === 'string' ? [node.id] : []))
  );
  const changedIndexes = proposedValue.flatMap((node, index) =>
    nodeHasSuggestion(node) ? [index] : []
  );
  const stableChangedIndexes = changedIndexes.filter((index) => {
    const id = proposedValue[index]?.id;
    return typeof id === 'string' && baseIds.has(id);
  });

  const nearest = (indexes: number[]) =>
    indexes.reduce(
      (best, index) =>
        Math.abs(index - selectedIndex) < Math.abs(best - selectedIndex) ? index : best,
      indexes[0]
    );

  let anchorIndex: number;
  if (stableChangedIndexes.length > 0) {
    anchorIndex = nearest(stableChangedIndexes);
  } else if (baseValue.length > 0) {
    // For a wholly inserted block, prefer the preceding surviving block.
    anchorIndex = Math.max(0, Math.min(selectedIndex - 1, baseValue.length - 1));
  } else {
    anchorIndex = 0;
  }

  const stableNode =
    proposedValue.find((node) => typeof node.id === 'string' && node.id === baseValue[anchorIndex]?.id) ??
    baseValue[anchorIndex];
  const blockId = typeof stableNode?.id === 'string' ? stableNode.id : undefined;
  const point = { path: [anchorIndex, 0], offset: 0 };

  return {
    scope: 'document',
    selection: { anchor: point, focus: point },
    ...(blockId && { blockId }),
  };
}

function cleanNode(node: unknown, decision: SuggestionDecision): Record<string, unknown> | null {
  if (!isRecord(node)) return null;
  const types = suggestionTypes(node);
  if (decision === 'accept' && types.has('remove')) return null;
  if (decision === 'reject' && types.has('insert')) return null;

  const cleanProperties = Object.fromEntries(
    Object.entries(node).filter(([key]) => key !== 'suggestion' && !key.startsWith('suggestion_'))
  );

  if (typeof node.text === 'string') {
    return cleanProperties;
  }

  const children = Array.isArray(node.children)
    ? node.children
        .map((child) => cleanNode(child, decision))
        .filter((child): child is Record<string, unknown> => child !== null)
    : [];

  return {
    ...cleanProperties,
    children: children.length ? children : [{ text: '' }],
  };
}

/** Convert a marked Plate suggestion snapshot into its accepted/rejected value. */
export function finalizeSuggestionValue(
  value: MaterialValue,
  decision: SuggestionDecision
): MaterialValue {
  return value
    .map((node) => cleanNode(node, decision))
    .filter((node): node is MaterialValue[number] => node !== null) as MaterialValue;
}

export function materialValueText(value: MaterialValue | null): string {
  if (!value) return '';
  const text = (node: unknown): string => {
    if (!isRecord(node)) return '';
    if (typeof node.text === 'string') return node.text;
    return Array.isArray(node.children) ? node.children.map(text).join('') : '';
  };
  return value.map(text).join('\n').trim();
}

export interface SuggestionChangeItem {
  type: 'insert' | 'remove';
  text: string;
}

function nodeText(node: unknown): string {
  if (!isRecord(node)) return '';
  if (typeof node.text === 'string') return node.text;
  return Array.isArray(node.children) ? node.children.map(nodeText).join('') : '';
}

/**
 * Derive the discrete "Add …" / "Delete …" line items shown on a suggestion
 * card from a marked suggestion snapshot (the Plate demo card format).
 * Adjacent same-type runs inside one block merge into a single item.
 */
export function suggestionChangeItems(value: MaterialValue | null): SuggestionChangeItem[] {
  if (!value) return [];
  const items: SuggestionChangeItem[] = [];

  const push = (type: SuggestionChangeItem['type'], text: string, merge: boolean) => {
    if (!text) return;
    const last = items[items.length - 1];
    if (merge && last && last.type === type) {
      last.text += text;
    } else {
      items.push({ type, text });
    }
  };

  const walkBlock = (node: unknown) => {
    if (!isRecord(node)) return;
    const types = suggestionTypes(node);
    const isLineBreak = isRecord(node.suggestion) && node.suggestion.isLineBreak === true;

    // A fully suggested block (insert or remove) is one item; its leaves
    // carry the same suggestion data and must not double-report.
    if (!isLineBreak && (types.has('insert') || types.has('remove'))) {
      const type = types.has('remove') ? 'remove' : 'insert';
      push(type, nodeText(node) || '(empty block)', false);
      return;
    }
    if (isLineBreak) {
      push(types.has('remove') ? 'remove' : 'insert', '(line break)', false);
      return;
    }

    if (!Array.isArray(node.children)) return;
    let merging = false;
    for (const child of node.children) {
      if (!isRecord(child)) continue;
      if (typeof child.text === 'string') {
        const childTypes = suggestionTypes(child);
        if (childTypes.has('insert')) {
          push('insert', child.text, merging);
          merging = true;
        } else if (childTypes.has('remove')) {
          push('remove', child.text, merging);
          merging = true;
        } else {
          merging = false;
        }
      } else {
        walkBlock(child);
        merging = false;
      }
    }
  };

  for (const node of value) walkBlock(node);
  return items;
}
