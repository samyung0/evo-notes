import { describe, expect, it } from 'vitest';

import { plateAiCommandUrl, plateAiCopilotUrl, sanitizePlateAiBody } from './plateAiTransport';

describe('Plate AI transport', () => {
  it('scopes command and copilot routes to the encoded workspace', () => {
    expect(plateAiCommandUrl('workspace/one')).toContain('/workspaces/workspace%2Fone/ai/command');
    expect(plateAiCopilotUrl('workspace/one')).toContain('/workspaces/workspace%2Fone/ai/copilot');
  });

  it('recursively removes browser-controlled provider credentials', () => {
    const sanitized = sanitizePlateAiBody(
      JSON.stringify({
        prompt: 'Improve this',
        apiKey: 'secret',
        providerOptions: {
          provider: 'demo',
          model: 'unsafe-model',
          nested: [{ key: 'secret', keep: true }],
        },
      })
    );

    expect(JSON.parse(String(sanitized))).toEqual({
      prompt: 'Improve this',
      providerOptions: { nested: [{ keep: true }] },
    });
  });

  it('leaves non-JSON streaming bodies unchanged', () => {
    expect(sanitizePlateAiBody('raw body')).toBe('raw body');
  });
});
