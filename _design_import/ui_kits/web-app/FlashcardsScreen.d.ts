import React from 'react';

export interface FlashcardsScreenProps {
  /** Route-change handler from the sidebar. */
  onNavigate?: (key: string) => void;
}

/**
 * Flashcards — deck library moved out of the former Practice screen.
 * @startingPoint section="Web App" subtitle="Flashcard deck library" viewport="1200x780"
 */
export function FlashcardsScreen(props: FlashcardsScreenProps): JSX.Element;
