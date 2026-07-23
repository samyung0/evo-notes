import { describe, expect, it } from 'vitest';

import {
  createMaterialDocument,
  createMaterialDocumentWithMetrics,
  isMaterialDocument,
  normalizeMaterialValue,
  normalizeMaterialValueWithMetrics,
  parseMaterialDocumentWithMetrics,
  parseMaterialDocument,
} from './document';

describe('Universal Plate material documents', () => {
  it('adds stable ids to every element while preserving existing ids', () => {
    const value = normalizeMaterialValue([
      {
        type: 'blockquote',
        id: 'existing',
        children: [{ type: 'p', children: [{ text: 'Annotatable child' }] }],
      },
    ]);

    expect(value[0].id).toBe('existing');
    expect(value[0].children[0]).toMatchObject({ type: 'p', id: expect.any(String) });
  });

  it('round-trips a versioned Plate document', () => {
    const document = createMaterialDocument([
      { type: 'p', children: [{ text: 'Hello', bold: true }] },
    ]);

    expect(isMaterialDocument(document)).toBe(true);
    expect(parseMaterialDocument(JSON.stringify(document))).toEqual(document);
  });

  it('collects normalized node count and depth without a second metrics walk', () => {
    const result = createMaterialDocumentWithMetrics([
      {
        type: 'blockquote',
        children: [{ type: 'p', children: [{ text: 'Nested' }] }],
      },
    ]);

    expect(result.metrics).toEqual({ nodeCount: 3, maxDepth: 2 });
    expect(result.document.value[0].id).toEqual(expect.any(String));
    expect(createMaterialDocument(result.document.value)).toEqual(result.document);
    expect(parseMaterialDocument(result.document)).toEqual(result.document);
  });

  it('normalized values never alias the input nodes', () => {
    const source = [
      {
        type: 'code_block',
        children: [{ type: 'code_line', children: [{ text: 'const answer = 42;' }] }],
      },
    ];

    const result = normalizeMaterialValueWithMetrics(source as never);

    expect(result.metrics).toEqual({ nodeCount: 3, maxDepth: 2 });
    expect(result.value[0]).not.toBe(source[0]);
    expect(result.value[0].children[0]).not.toBe(source[0].children[0]);
    expect(result.value[0].children[0]).toMatchObject({
      type: 'code_line',
      id: expect.any(String),
    });
  });

  it('returns metrics when parsing a persisted document', () => {
    const source = createMaterialDocument([{ type: 'p', children: [{ text: 'Persisted' }] }]);

    const parsed = parseMaterialDocumentWithMetrics(source);

    expect(parsed?.document).toEqual(source);
    expect(parsed?.metrics).toEqual({ nodeCount: 2, maxDepth: 1 });
  });

  it('validates deeply nested documents in linear time', () => {
    // Regression: validation used to recurse into children from both
    // isElementNode and isMaterialNode, doubling the work per nesting level
    // (~2^depth). At this depth the old validator would effectively hang.
    let node = { type: 'p', children: [{ text: 'leaf' }] } as never;
    for (let depth = 0; depth < 40; depth += 1) {
      node = { type: 'blockquote', children: [node] } as never;
    }

    const start = performance.now();
    expect(isMaterialDocument({ schemaVersion: 1, value: [node] })).toBe(true);
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it('rejects media URLs and requires a persistent asset id', () => {
    const document = {
      schemaVersion: 1,
      value: [
        {
          type: 'img',
          id: 'image-1',
          assetId: 'asset-1',
          url: 'https://signed.example/temporary',
          children: [{ text: '' }],
        },
      ],
    };

    expect(isMaterialDocument(document)).toBe(false);
    expect(
      isMaterialDocument({
        ...document,
        value: [{ ...document.value[0], url: undefined }],
      })
    ).toBe(true);
  });
});
