import React from 'react';

export interface WorkspaceOpenScreenProps {
  /** Route-change handler from the collapsed sidebar rail. */
  onNavigate?: (key: string) => void;
  /** Called when the user clicks "← Workspaces". */
  onBack?: () => void;
  /** Which AI panel mode to start in. Default 'Chat'. */
  initialMode?: 'Chat' | 'Generate';
}

/**
 * Opened workspace — NotebookLM-style 3-column view with a docked Chat / Generate panel.
 * @startingPoint section="Web App" subtitle="NotebookLM-style sources · file · AI" viewport="1200x780"
 */
export function WorkspaceOpenScreen(props: WorkspaceOpenScreenProps): JSX.Element;
