import { CreateWorkspaceReq } from '@/api/gen/model';

export const createWorkspaceDefaultValues: CreateWorkspaceReq = {
  name: '',
  privacy: 'private',
  color: 'graphite',
  tags: [],
};
