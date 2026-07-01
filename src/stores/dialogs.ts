import { create } from 'zustand';
import type { Label, Quiz, Task, Workspace } from '@/api/types';
import type { EventDraft } from '@/features/schedule/EventFormModal';

export interface ConfirmConfig {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface DialogState {
  workspaceForm: { workspace?: Workspace } | null;
  workspaceStatsId: string | null;
  quizEdit: Quiz | null;
  taskEdit: Task | null;
  labelEdit: Label | null;
  eventForm: EventDraft | null;
  addSource: { workspaceId: string } | null;
  confirm: ConfirmConfig | null;

  openWorkspaceForm: (workspace?: Workspace) => void;
  openWorkspaceStats: (id: string) => void;
  openQuizEdit: (quiz: Quiz) => void;
  openTaskEdit: (task: Task) => void;
  openLabelEdit: (label: Label) => void;
  openEventForm: (draft?: EventDraft) => void;
  openAddSource: (workspaceId: string) => void;
  openConfirm: (config: ConfirmConfig) => void;

  closeWorkspaceForm: () => void;
  closeWorkspaceStats: () => void;
  closeQuizEdit: () => void;
  closeTaskEdit: () => void;
  closeLabelEdit: () => void;
  closeEventForm: () => void;
  closeAddSource: () => void;
  closeConfirm: () => void;
}

export const useDialogs = create<DialogState>((set) => ({
  workspaceForm: null,
  workspaceStatsId: null,
  quizEdit: null,
  taskEdit: null,
  labelEdit: null,
  eventForm: null,
  addSource: null,
  confirm: null,

  openWorkspaceForm: (workspace) => set({ workspaceForm: { workspace } }),
  openWorkspaceStats: (id) => set({ workspaceStatsId: id }),
  openQuizEdit: (quiz) => set({ quizEdit: quiz }),
  openTaskEdit: (task) => set({ taskEdit: task }),
  openLabelEdit: (label) => set({ labelEdit: label }),
  openEventForm: (draft) => set({ eventForm: draft ?? {} }),
  openAddSource: (workspaceId) => set({ addSource: { workspaceId } }),
  openConfirm: (config) => set({ confirm: config }),

  closeWorkspaceForm: () => set({ workspaceForm: null }),
  closeWorkspaceStats: () => set({ workspaceStatsId: null }),
  closeQuizEdit: () => set({ quizEdit: null }),
  closeTaskEdit: () => set({ taskEdit: null }),
  closeLabelEdit: () => set({ labelEdit: null }),
  closeEventForm: () => set({ eventForm: null }),
  closeAddSource: () => set({ addSource: null }),
  closeConfirm: () => set({ confirm: null }),
}));
