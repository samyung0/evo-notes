/** Short, collision-resistant-enough client id with an optional prefix. Used for
 * transient rows (quiz questions, flashcards, editor blocks) before persistence. */
export const uid = (prefix = 'id') =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
