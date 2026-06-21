import React from 'react';

export interface SidebarProps {
  /** Highlighted route key. */
  active?: 'dashboard' | 'workspaces' | 'practice' | 'schedule' | 'files' | 'tasks' | 'notes' | 'profile' | 'settings' | 'logout';
  /** Render the 58px icon-only rail (opened-workspace view). */
  collapsed?: boolean;
  /** Called with the route key when a nav item is clicked. */
  onNavigate?: (key: string) => void;
  style?: React.CSSProperties;
}

/** Evo Notes app sidebar — brand, primary + secondary nav, footer. */
export function Sidebar(props: SidebarProps): JSX.Element;
