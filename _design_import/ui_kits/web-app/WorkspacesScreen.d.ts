import React from 'react';

export interface WorkspaceItem {
  id: string;
  name: string;
  type: 'course' | 'workspace';
}

export interface WorkspacesScreenProps {
  /** Route-change handler from the sidebar. */
  onNavigate?: (key: string) => void;
  /** Called with the workspace when a card is opened. */
  onOpen?: (item: WorkspaceItem) => void;
}

/**
 * Workspaces grid — filterable courses + free-form workspaces.
 * @startingPoint section="Web App" subtitle="Filterable workspaces grid" viewport="1200x780"
 */
export function WorkspacesScreen(props: WorkspacesScreenProps): JSX.Element;
