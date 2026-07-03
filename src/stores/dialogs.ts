import { CreateWorkspaceReq, UpdateWorkspaceReq } from '@/api/gen/model';
import type { Label, Task } from '@/api/types';
import type { EventDraft } from '@/features/schedule/EventFormModal';
import { createWorkspaceDefaultValues } from '@/stores/defaultValues';
import { create } from 'zustand';

export interface ConfirmConfig {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface DialogState {
  // these forms re-renders on the object change, so the initial value
  // in tanstack form changes together without any shenanigans
  // the state of this zustand store is also not tied with other states like react query
  // because its gonna cause a lot of issues, and also some dialogs like the worksapce
  // can let you add new/modify existing workspaces, and tying them to react query
  // is going to be messy
  // TLDR zustand is not synced with react query
  // flow should be:
  //      -- get: react query -> map Workspace to WorkspaceForm -> opendialog with existing
  //              -> populate tanstack form with initial values
  //      -- create: open dialog with default values -> submit -> react query mutation -> close dialog
  workspaceCreate: CreateWorkspaceReq | null;
  workspaceEdit: UpdateWorkspaceReq | null;
  workspaceId: string | null;
  workspaceStatsId: string | null;
  taskEdit: Task | null;
  labelEdit: Label | null;
  eventForm: EventDraft | null;
  addSource: { workspaceId: string } | null;
  confirm: ConfirmConfig | null;

  openWorkspaceCreate: (workspace?: CreateWorkspaceReq) => void;
  openWorkspaceEdit: (workspace: UpdateWorkspaceReq, id: string) => void;
  openWorkspaceStats: (id: string) => void;
  openTaskEdit: (task: Task) => void;
  openLabelEdit: (label: Label) => void;
  openEventForm: (draft?: EventDraft) => void;
  openAddSource: (workspaceId: string) => void;
  openConfirm: (config: ConfirmConfig) => void;

  closeWorkspaceCreate: () => void;
  closeWorkspaceEdit: () => void;
  closeWorkspaceStats: () => void;
  closeTaskEdit: () => void;
  closeLabelEdit: () => void;
  closeEventForm: () => void;
  closeAddSource: () => void;
  closeConfirm: () => void;

  isTopBarSearchOpen: boolean;
  setTopBarSearchOpen: (open: boolean) => void;
}

export const useDialogs = create<DialogState>((set) => ({
  workspaceCreate: null,
  workspaceEdit: null,
  workspaceId: null,
  isWorkspaceOpen: false,
  workspaceStatsId: null,
  taskEdit: null,
  labelEdit: null,
  eventForm: null,
  addSource: null,
  confirm: null,

  openWorkspaceCreate: (workspace?) =>
    set({
      workspaceCreate: workspace ?? createWorkspaceDefaultValues,
    }),
  openWorkspaceEdit: (workspace, id) => set({ workspaceEdit: workspace, workspaceId: id }),
  openWorkspaceStats: (id) => set({ workspaceStatsId: id }),
  openTaskEdit: (task) => set({ taskEdit: task }),
  openLabelEdit: (label) => set({ labelEdit: label }),
  openEventForm: (draft) => set({ eventForm: draft ?? {} }),
  openAddSource: (workspaceId) => set({ addSource: { workspaceId } }),
  openConfirm: (config) => set({ confirm: config }),

  closeWorkspaceCreate: () => set({ workspaceCreate: null }),
  closeWorkspaceEdit: () => set({ workspaceEdit: null }),
  closeWorkspaceStats: () => set({ workspaceStatsId: null }),
  closeTaskEdit: () => set({ taskEdit: null }),
  closeLabelEdit: () => set({ labelEdit: null }),
  closeEventForm: () => set({ eventForm: null }),
  closeAddSource: () => set({ addSource: null }),
  closeConfirm: () => set({ confirm: null }),

  isTopBarSearchOpen: false,
  setTopBarSearchOpen: (open) => set({ isTopBarSearchOpen: open }),
}));
