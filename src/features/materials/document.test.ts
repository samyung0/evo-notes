import { describe, expect, it } from 'vitest';

import {
  createMaterialDocument,
  isMaterialDocument,
  normalizeMaterialValue,
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
