import type { MaterialValue } from '@/features/materials/document';

type SuggestionDecision = 'accept' | 'reject';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function suggestionTypes(node: Record<string, unknown>): Set<string> {
  const types = new Set<string>();
  for (const [key, value] of Object.entries(node)) {
    if (!key.startsWith('suggestion_') || !isRecord(value)) continue;
    if (typeof value.type === 'string') types.add(value.type);
  }
  return types;
}

function cleanNode(node: unknown, decision: SuggestionDecision): Record<string, unknown> | null {
  if (!isRecord(node)) return null;

  if (typeof node.text === 'string') {
    const types = suggestionTypes(node);
    if (decision === 'accept' && types.has('remove')) return null;
    if (decision === 'reject' && types.has('insert')) return null;

    return Object.fromEntries(
      Object.entries(node).filter(([key]) => key !== 'suggestion' && !key.startsWith('suggestion_'))
    );
  }

  const children = Array.isArray(node.children)
    ? node.children
        .map((child) => cleanNode(child, decision))
        .filter((child): child is Record<string, unknown> => child !== null)
    : [];

  return {
    ...node,
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
