const configuredSecret = process.env.E2E_AUTH_SECRET;
if (!configuredSecret) {
  throw new Error('E2E_AUTH_SECRET must be set by playwright.config.ts');
}
export const E2E_SECRET = configuredSecret;

export const users = {
  owner: 'u_owner',
  editor: 'u_editor',
  viewer: 'u_viewer',
  other: 'u_other',
} as const;

export const seed = {
  privateWorkspace: {
    id: 'ws_e2e_private',
    name: 'E2E Private Workspace',
    secretTitle: 'Secret private title',
    secretFile: 'secret-notes.md',
  },
  linkWorkspace: {
    id: 'ws_e2e_link',
    name: 'E2E Link Workspace',
  },
  publicWorkspace: {
    id: 'ws_e2e_public',
    name: 'E2E Public Workspace',
  },
  mutateWorkspace: {
    id: 'ws_e2e_mutate',
    name: 'E2E Mutate Workspace',
  },
  privateQuiz: {
    id: 'qz_e2e_private',
    name: 'E2E Private Quiz',
    prompt: 'Private quiz prompt?',
  },
  linkQuiz: {
    id: 'qz_e2e_link',
    name: 'E2E Link Quiz',
    prompt: 'Link quiz prompt?',
  },
  publicQuiz: {
    id: 'qz_e2e_public',
    name: 'E2E Public Quiz',
    prompt: 'Public quiz prompt?',
  },
  mutateQuiz: {
    id: 'qz_e2e_mutate',
    name: 'E2E Mutate Quiz',
  },
  privateDeck: {
    id: 'dk_e2e_private',
    name: 'E2E Private Deck',
    front: 'Private front',
  },
  linkDeck: {
    id: 'dk_e2e_link',
    name: 'E2E Link Deck',
    front: 'Link front',
  },
  publicDeck: {
    id: 'dk_e2e_public',
    name: 'E2E Public Deck',
    front: 'Public front',
  },
  mutateDeck: {
    id: 'dk_e2e_mutate',
    name: 'E2E Mutate Deck',
  },
} as const;

export function e2eHeaders(userId: string): Record<string, string> {
  return {
    'X-E2E-User-Id': userId,
    'X-E2E-Secret': E2E_SECRET,
  };
}
