import React from 'react';

export interface QuizScreenProps {
  /** Route-change handler from the sidebar. */
  onNavigate?: (key: string) => void;
}

/**
 * Quiz — workspace-style inset surface with All quizzes (quiz cards) and
 * Past attempts (data table with row actions) tabs.
 * @startingPoint section="Web App" subtitle="Quiz library & past attempts" viewport="1200x780"
 */
export function QuizScreen(props: QuizScreenProps): JSX.Element;
