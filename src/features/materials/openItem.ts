/** What the center content pane is currently showing. A source file or a
 * persisted study material (markdown: mindmap, diagram, quiz, flashcards). */
export type OpenItem = { kind: 'file'; id: string } | { kind: 'material'; id: string };
