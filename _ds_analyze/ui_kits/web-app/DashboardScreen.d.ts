import React from 'react';

export interface DashboardScreenProps {
  /** Route-change handler from the sidebar. */
  onNavigate?: (key: string) => void;
}

/**
 * Evo Notes dashboard — the classic 3-column home view.
 * @startingPoint section="Web App" subtitle="3-column study dashboard" viewport="1200x780"
 */
export function DashboardScreen(props: DashboardScreenProps): JSX.Element;
