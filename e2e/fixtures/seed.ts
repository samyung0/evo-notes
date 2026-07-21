const configuredSecret = process.env.E2E_AUTH_SECRET;
if (!configuredSecret) {
  throw new Error('E2E_AUTH_SECRET must be set by playwright.config.ts');
}
export const E2E_SECRET = configuredSecret;

export const users = {
  owner: 'u_owner',
  editor: 'u_editor',
  commenter: 'u_commenter',
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
  editableWorkspace: {
    id: 'ws_e2e_edit',
    name: 'E2E Editable Link Workspace',
  },
  inviteWorkspace: {
    id: 'ws_e2e_invite',
    name: 'E2E Invite Only Workspace',
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
  viewerNote: {
    id: 'note_e2e_link',
    name: 'E2E Viewer Note',
    body: 'Static viewer content',
  },
  commenterNote: {
    id: 'note_e2e_public',
    name: 'E2E Commenter Note',
    body: 'Suggest a clearer sentence',
  },
  editableNote: {
    id: 'note_e2e_edit',
    name: 'E2E Editable Note',
    body: 'Signed-in editors can change this text',
  },
  reviewNote: {
    id: 'note_e2e_review',
    name: 'E2E Suggestion Review Note',
    body: 'Original review sentence',
  },
} as const;

export function e2eHeaders(userId: string): Record<string, string> {
  return {
    'X-E2E-User-Id': userId,
    'X-E2E-Secret': E2E_SECRET,
  };
}
