import { defineConfig } from 'orval';

/**
 * Input is always the local ./openapi.yaml.
 * - One-shot: `pnpm gen:api:msw` regenerates the spec from source then runs orval.
 * - Live: `air` regenerates ./openapi.yaml on each rebuild (server/.air.toml) and
 *   `pnpm gen:api:watch` (orval --watch) picks up the file change.
 */
const input = './openapi.yaml';

export default defineConfig({
  // TypeScript model interfaces. orval v8 requires a target per project, so a
  // thin fetch "endpoints" file is emitted alongside — it is intentionally
  // unused; the hand-written src/api/client.ts + hooks.ts stay the source of
  // truth. The value we consume lives in src/api/gen/model/*.
  models: {
    input,
    output: {
      mode: 'single',
      client: 'fetch',
      target: 'src/api/gen/endpoints.ts',
      schemas: 'src/api/gen/model',
    },
    hooks: { afterAllFilesWrite: 'prettier --write' },
  },
  // Standalone zod validators for request/response bodies, in a single file.
  zod: {
    input,
    output: {
      mode: 'single',
      client: 'zod',
      target: 'src/api/gen/validators.ts',
    },
    hooks: { afterAllFilesWrite: 'prettier --write' },
  },
});
