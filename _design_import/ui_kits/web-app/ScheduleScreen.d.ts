import React from 'react';

export interface ScheduleScreenProps {
  /** Route-change handler from the sidebar. */
  onNavigate?: (key: string) => void;
}

/**
 * Schedule — month calendar with event dots + a day agenda panel.
 * @startingPoint section="Web App" subtitle="Calendar + day agenda" viewport="1200x780"
 */
export function ScheduleScreen(props: ScheduleScreenProps): JSX.Element;
