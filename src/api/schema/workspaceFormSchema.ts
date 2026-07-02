import { USER_COLORS } from '@/lib/userColor';
import { z } from 'zod';

const workspaceFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(100, { message: 'Name must be less than 100 characters' }),
  color: z.enum(USER_COLORS).optional(),
  tags: z
    .array(
      z.object({
        value: z
          .string()
          .min(1, { message: 'Tag is required' })
          .max(50, { message: 'Tag must be less than 50 characters' }),
      })
    )
    .max(10, { message: 'You can add up to 10 tags' })
    .optional(),
  privacy: z.enum(['private', 'link', 'public'], {
    error: (issue) =>
      issue.input === undefined ? 'You need to set the visibility of the workspace.' : undefined,
  }),
});

type WorkspaceForm = z.infer<typeof workspaceFormSchema>;

const workspaceFormDefaultValues: WorkspaceForm = {
  name: '',
  color: 'graphite',
  tags: [],
  privacy: 'private',
};

export { workspaceFormDefaultValues, workspaceFormSchema, type WorkspaceForm };
